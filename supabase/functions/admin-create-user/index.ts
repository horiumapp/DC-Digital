import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// FIX: Origens permitidas — suporta variável de ambiente ALLOWED_ORIGINS, domínios de desenvolvimento e previews do Vercel.
const ENV_ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS");
const STATIC_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://dc-digital.vercel.app",
];
const ALLOWED_ORIGINS = ENV_ALLOWED_ORIGINS
  ? ENV_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : STATIC_ALLOWED_ORIGINS;

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || /^https:\/\/.*\.vercel\.app$/.test(origin);

  if (!isAllowed && origin) {
    return null; // Origem não permitida — será rejeitada
  }
  return {
    "Access-Control-Allow-Origin": origin || "*",
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

    const bodyRecord = (body && typeof body === "object") ? (body as Record<string, unknown>) : {};

    // 2.1 Ação de exclusão / revogação de usuário
    if (bodyRecord.action === "delete-user") {
      const targetEmail = typeof bodyRecord.email === "string" ? bodyRecord.email.trim().toLowerCase() : "";
      const targetUserId = typeof bodyRecord.userId === "string" ? bodyRecord.userId.trim() : "";

      if (!targetEmail && !targetUserId) {
        return new Response(
          JSON.stringify({ error: "Informe email ou userId para exclusão" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Buscar usuário alvo na tabela usuarios
      let targetUserQuery = supabaseAdmin.from("usuarios").select("id, email, cargo, escola_id");
      if (targetUserId) {
        targetUserQuery = targetUserQuery.eq("id", targetUserId);
      } else {
        targetUserQuery = targetUserQuery.eq("email", targetEmail);
      }
      const { data: targetUserData } = await targetUserQuery.maybeSingle();

      // Se for não-ADMIN, verificar se tem permissão para deletar este usuário
      if (effectiveRole !== "ADMIN") {
        const { data: callerData } = await supabaseAdmin
          .from("usuarios")
          .select("escola_id")
          .eq("id", callerUser.id)
          .maybeSingle();

        if (!callerData?.escola_id) {
          return new Response(
            JSON.stringify({ error: "Seu usuário não possui escola vinculada" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Não-admin só pode deletar PROFESSOR ou ALUNO da sua própria escola
        if (
          targetUserData &&
          (targetUserData.escola_id !== callerData.escola_id ||
           !["PROFESSOR", "ALUNO"].includes(targetUserData.cargo))
        ) {
          return new Response(
            JSON.stringify({ error: "Você não tem permissão para excluir este usuário" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Resolver ID do Auth
      let authUserId = targetUserData?.id || targetUserId;
      if (!authUserId && targetEmail) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const found = listData?.users?.find((u: { email?: string }) => u.email?.toLowerCase() === targetEmail);
        if (found) authUserId = found.id;
      }

      if (authUserId) {
        const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
        if (delAuthErr) {
          console.error("Erro ao deletar de auth.users:", delAuthErr);
        }
        await supabaseAdmin.from("usuarios").delete().eq("id", authUserId);
      }

      return new Response(
        JSON.stringify({ success: true, message: "Conta e credenciais removidas com sucesso" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { nome, email, senha, cargo, escola_id } = bodyRecord;

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

    // FIX M1: Exigir senha forte — mínimo 8 caracteres, com letra e número.
    // Antes aceitava 6 caracteres sem regra de complexidade, permitindo senhas
    // triviais como "123456". Alinhado com o minLength={8} da tela de login.
    const hasLetter = /[a-zA-Z]/.test(senha);
    const hasDigit = /\d/.test(senha);
    if (senha.length < 8 || !hasLetter || !hasDigit) {
      return new Response(
        JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres, incluindo letras e números" }),
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

    // 6. FIX: Verificar se o chamador (GESTOR/SECRETARIO) tem vínculo com a escola.
    // FIX C2: Antes, se callerData.escola_id fosse NULL (usuário sem escola
    // vinculada), o check era pulado e o chamador podia criar contas em QUALQUER
    // escola. Agora, não-ADMIN só cria usuários da própria escola vinculada.
    if (effectiveRole !== "ADMIN") {
      const { data: callerData } = await supabaseAdmin
        .from("usuarios")
        .select("escola_id")
        .eq("id", callerUser.id)
        .maybeSingle();

      if (!callerData?.escola_id) {
        return new Response(
          JSON.stringify({ error: "Seu usuário não possui uma escola vinculada. Contate o administrador." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (callerData.escola_id !== escolaIdTrimmed) {
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
      console.error("Erro ao criar usuário:", createError);
      // FIX: Não vazar detalhes internos do servidor/banco para o cliente.
      return new Response(
        JSON.stringify({ error: "Não foi possível criar a conta. Tente novamente em instantes." }),
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
    // FIX #4: Incluir CORS headers mesmo no catch para o navegador não bloquear a resposta
    const errorHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "Vary": "Origin",
      ...(corsHeaders || {}),
    };
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: errorHeaders }
    );
  }
});
