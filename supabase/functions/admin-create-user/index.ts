import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    // 1. Validar que o chamador tem permissão via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorização ausente" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: { user: callerUser }, error: callerError } = await supabaseAdmin.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (callerError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Não foi possível verificar sua identidade", details: callerError }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validar campos obrigatórios
    if (!nome || !email || !senha || !cargo || !escola_id) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, email, senha, cargo, escola_id" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "Erro ao criar conta: " + createError.message }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Atualizar a tabela public.usuarios com cargo e escola_id
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .update({
        cargo: cargo,
        escola_id: escola_id,
        nome_completo: nome,
      })
      .eq("id", newUser.user.id);

    if (updateError) {
      console.error("Erro ao atualizar usuarios:", updateError);
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
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("Erro inesperado:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor", details: err?.message }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
