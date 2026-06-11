import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// FIX #2: Origens permitidas — substituir '*' por domínios específicos.
// Adicione a URL do seu deploy de produção aqui.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  // Adicione aqui o domínio de produção, ex:
  // "https://dc-digital.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // FIX #3: Retornar status HTTP correto para método não permitido
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Validar que o chamador tem permissão via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização ausente" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Não foi possível verificar sua identidade", details: callerError }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verificar role do chamador
    let effectiveRole = callerUser.app_metadata?.role;
    if (!effectiveRole) {
      const { data: userData } = await supabaseAdmin
        .from("usuarios")
        .select("cargo")
        .eq("id", callerUser.id)
        .maybeSingle();
      effectiveRole = userData?.cargo;
    }

    // 2. Ler o body da requisição
    const { nome, email, senha, cargo, escola_id } = await req.json();

    // 3. Validar permissões baseadas na hierarquia
    const allowedCargos: Record<string, string[]> = {
      ADMIN: ["ADMIN", "GESTOR", "SECRETARIO", "PROFESSOR", "ALUNO"],
      GESTOR: ["PROFESSOR", "ALUNO"],
      SECRETARIO: ["ALUNO"],
    };

    const allowed = allowedCargos[effectiveRole as string];
    if (!allowed || !allowed.includes(cargo)) {
      return new Response(
        JSON.stringify({
          error: `Seu perfil (${effectiveRole}) não tem permissão para criar contas do tipo ${cargo}`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validar campos obrigatórios
    if (!nome || !email || !senha || !cargo || !escola_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, email, senha, cargo, escola_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Criar o usuário usando service_role
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: nome,
      },
      app_metadata: {
        role: cargo,
      },
    });

    if (createError) {
      if (createError.message?.includes("already been registered") || createError.message?.includes("already exists")) {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta: " + createError.message }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Atualizar ou Inserir na tabela public.usuarios com cargo e escola_id
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .upsert({
        id: newUser.user.id,
        email: email,
        nome_completo: nome,
        cargo: cargo,
        escola_id: escola_id,
      }, { onConflict: 'id' });

    if (updateError) {
      console.error("Erro ao fazer upsert em usuarios:", updateError);
    }

    // 7. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          nome: nome,
          cargo: cargo,
          escola_id: escola_id,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: err?.message }),
      { status: 500, headers: { ...getCorsHeaders(req), "Content-Type": "application/json" } }
    );
  }
});
