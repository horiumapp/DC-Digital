import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// FIX: Origens permitidas — domínios explícitos (sem fallback para localhost em produção).
// Adicione a URL exata do seu deploy de produção aqui.
const ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://dc-digital.vercel.app",
];

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin") || "";
  if (!ALLOWED_ORIGINS.includes(origin)) {
    return null; // Origem não permitida — será rejeitada
  }
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

// Validação de formato de e-mail
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_CARGOS = ["ADMIN", "GESTOR", "SECRETARIO", "PROFESSOR", "ALUNO"];

// FIX #3: Rate limiting em memória por usuário (reseta em cold start, mas protege contra abuso)
const RATE_LIMIT_WINDOW_MS = 60_000; // 60 segundos
const RATE_LIMIT_MAX_REQUESTS = 10;   // Máximo 10 criações por janela

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW_MS) {
    // Nova janela
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false; // Limite excedido
  }

  entry.count++;
  return true;
}

// Limpar entradas expiradas periodicamente (a cada 5 minutos) para evitar leak de memória
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if ((now - entry.windowStart) > RATE_LIMIT_WINDOW_MS * 2) {
      rateLimitMap.delete(key);
    }
  }
}, 5 * 60_000);

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // FIX: Rejeitar origens não permitidas com 403
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: "Origem não permitida" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Retornar status HTTP correto para método não permitido
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

    // Verificar role do chamador — SOMENTE via app_metadata (JWT assinado pelo backend)
    // FIX #4: Removido fallback para tabela `usuarios` que poderia ser manipulada via RLS.
    const effectiveRole = callerUser.app_metadata?.role;
    if (!effectiveRole) {
      return new Response(
        JSON.stringify({ error: "Seu perfil não possui permissão configurada (role ausente no JWT). Contate o administrador." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // FIX #3: Verificar rate limit antes de processar a requisição
    if (!checkRateLimit(callerUser.id)) {
      return new Response(
        JSON.stringify({ error: "Limite de requisições excedido. Aguarde 60 segundos antes de criar mais contas." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" } }
      );
    }

    // 2. Ler e validar tipos do body da requisição
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Body da requisição inválido (JSON malformado)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { nome, email, senha, cargo, escola_id } = body as Record<string, unknown>;

    // FIX: Validação de tipos para evitar injeção de objetos/arrays
    if (
      typeof nome !== "string" || typeof email !== "string" ||
      typeof senha !== "string" || typeof cargo !== "string" ||
      typeof escola_id !== "string"
    ) {
      return new Response(
        JSON.stringify({ error: "Todos os campos devem ser strings válidas" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Validar campos obrigatórios e formatos
    const nomeTrimmed = nome.trim();
    const emailTrimmed = email.trim().toLowerCase();
    const cargoTrimmed = cargo.trim().toUpperCase();
    const escolaIdTrimmed = escola_id.trim();

    if (!nomeTrimmed || !emailTrimmed || !senha || !cargoTrimmed || !escolaIdTrimmed) {
      return new Response(
        JSON.stringify({ error: "Campos obrigatórios: nome, email, senha, cargo, escola_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limites de tamanho para segurança
    if (nomeTrimmed.length > 200 || emailTrimmed.length > 254 || senha.length > 128) {
      return new Response(
        JSON.stringify({ error: "Um ou mais campos excedem o tamanho máximo permitido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!EMAIL_REGEX.test(emailTrimmed)) {
      return new Response(
        JSON.stringify({ error: "Formato de e-mail inválido" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 6 caracteres" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_CARGOS.includes(cargoTrimmed)) {
      return new Response(
        JSON.stringify({ error: `Cargo inválido. Valores permitidos: ${VALID_CARGOS.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 4. Validar permissões baseadas na hierarquia
    const allowedCargos: Record<string, string[]> = {
      ADMIN: ["ADMIN", "GESTOR", "SECRETARIO", "PROFESSOR", "ALUNO"],
      GESTOR: ["PROFESSOR", "ALUNO"],
      SECRETARIO: ["PROFESSOR", "ALUNO"],
    };

    const allowed = allowedCargos[effectiveRole as string];
    if (!allowed || !allowed.includes(cargoTrimmed)) {
      return new Response(
        JSON.stringify({
          error: `Seu perfil (${effectiveRole}) não tem permissão para criar contas do tipo ${cargoTrimmed}`,
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. FIX: Verificar se escola_id existe no banco de dados
    const { data: escolaData, error: escolaError } = await supabaseAdmin
      .from("escolas")
      .select("id")
      .eq("id", escolaIdTrimmed)
      .maybeSingle();

    if (escolaError || !escolaData) {
      return new Response(
        JSON.stringify({ error: "Escola não encontrada. Verifique o ID da escola informado." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. FIX: Verificar se o chamador (GESTOR/SECRETARIO) tem vínculo com a escola
    if (effectiveRole !== "ADMIN") {
      const { data: callerData } = await supabaseAdmin
        .from("usuarios")
        .select("escola_id")
        .eq("id", callerUser.id)
        .maybeSingle();

      if (callerData?.escola_id && callerData.escola_id !== escolaIdTrimmed) {
        return new Response(
          JSON.stringify({ error: "Você só pode criar usuários vinculados à sua própria escola." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 7. Criar o usuário usando service_role
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrimmed,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: nomeTrimmed,
      },
      app_metadata: {
        role: cargoTrimmed,
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

    // 8. Atualizar ou Inserir na tabela public.usuarios com cargo e escola_id
    const { error: updateError } = await supabaseAdmin
      .from("usuarios")
      .upsert({
        id: newUser.user.id,
        email: emailTrimmed,
        nome_completo: nomeTrimmed,
        cargo: cargoTrimmed,
        escola_id: escolaIdTrimmed,
      }, { onConflict: 'id' });

    if (updateError) {
      console.error("Erro ao fazer upsert em usuarios:", updateError);
    }

    // 9. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: newUser.user.id,
          email: newUser.user.email,
          nome: nomeTrimmed,
          cargo: cargoTrimmed,
          escola_id: escolaIdTrimmed,
        },
      }),
      {
        status: 201,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("Erro inesperado:", errMsg);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", "Vary": "Origin" } }
    );
  }
});
