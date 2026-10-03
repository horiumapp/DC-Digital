import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// FIX: Origens permitidas — suporta variável de ambiente ALLOWED_ORIGINS, domínios de desenvolvimento e previews oficiais do Vercel.
const ENV_ALLOWED_ORIGINS = Deno.env.get("ALLOWED_ORIGINS");
const STATIC_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "https://ddigital-lbr.vercel.app",
  "https://dc-digital.vercel.app",
];
const ALLOWED_ORIGINS = ENV_ALLOWED_ORIGINS
  ? ENV_ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : STATIC_ALLOWED_ORIGINS;

// Subdomínios oficiais na Vercel (produção e branch previews legítimos deste projeto)
const ALLOWED_VERCEL_REGEX = /^https:\/\/(dc-digital|ddigital-lbr)(-[a-z0-9-]+)?\.vercel\.app$/;

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin") || "";
  const isAllowed = ALLOWED_ORIGINS.includes(origin) || ALLOWED_VERCEL_REGEX.test(origin);

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

  // Limpar entradas expiradas sob demanda (evita timers de fundo que causam 503 no runtime serverless)
  if (rateLimitMap.size > 50) {
    for (const [key, entry] of rateLimitMap.entries()) {
      if ((now - entry.windowStart) > RATE_LIMIT_WINDOW_MS * 2) {
        rateLimitMap.delete(key);
      }
    }
  }

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

    // Verificar role do chamador — primeiro via app_metadata (JWT seguro do backend), com fallback seguro
    let effectiveRole = (callerUser.app_metadata?.role as string | undefined)?.toUpperCase();
    if (!effectiveRole) {
      const { data: actorProfile } = await supabaseAdmin
        .from("usuarios")
        .select("cargo")
        .eq("id", callerUser.id)
        .maybeSingle();
      effectiveRole = actorProfile?.cargo?.toUpperCase();
    }
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

    // 2.1 Redefinição segura de senha de aluno
    if (bodyRecord.action === "reset-student-password") {
      if (!["ADMIN", "GESTOR", "SECRETARIO"].includes(effectiveRole as string)) {
        return new Response(JSON.stringify({ error: "Sem permissão para redefinir senhas." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const targetEmail = typeof bodyRecord.email === "string" ? bodyRecord.email.trim().toLowerCase() : "";
      const novaSenha = typeof bodyRecord.senha === "string" ? bodyRecord.senha : "";
      if (!EMAIL_REGEX.test(targetEmail) || novaSenha.length < 10) {
        return new Response(JSON.stringify({ error: "Dados inválidos para redefinição." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: target } = await supabaseAdmin.from("usuarios").select("id,cargo,escola_id").eq("email", targetEmail).maybeSingle();
      if (!target || target.cargo !== "ALUNO") {
        return new Response(JSON.stringify({ error: "Conta de aluno não encontrada." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (effectiveRole !== "ADMIN") {
        const { data: caller } = await supabaseAdmin.from("usuarios").select("escola_id").eq("id", callerUser.id).maybeSingle();
        if (!caller?.escola_id || caller.escola_id !== target.escola_id) {
          return new Response(JSON.stringify({ error: "Você só pode redefinir senhas de alunos da própria escola." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(target.id, { password: novaSenha });
      if (passwordError) throw passwordError;
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // 2.2 Redefinição segura de senha de professor
    if (bodyRecord.action === "reset-professor-password") {
      if (!["ADMIN", "GESTOR", "SECRETARIO"].includes(effectiveRole as string)) {
        return new Response(JSON.stringify({ error: "Sem permissão para redefinir senhas." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const targetEmail = typeof bodyRecord.email === "string" ? bodyRecord.email.trim().toLowerCase() : "";
      const novaSenha = typeof bodyRecord.senha === "string" ? bodyRecord.senha : "";
      const hasLetter = /[a-zA-Z]/.test(novaSenha);
      const hasDigit = /\d/.test(novaSenha);
      if (!EMAIL_REGEX.test(targetEmail) || novaSenha.length < 8 || !hasLetter || !hasDigit) {
        return new Response(JSON.stringify({ error: "A senha deve ter no mínimo 8 caracteres, incluindo letras e números." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const { data: target } = await supabaseAdmin.from("usuarios").select("id,cargo,escola_id").eq("email", targetEmail).maybeSingle();
      if (!target || target.cargo !== "PROFESSOR") {
        return new Response(JSON.stringify({ error: "Conta de professor não encontrada." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (effectiveRole !== "ADMIN") {
        const { data: caller } = await supabaseAdmin.from("usuarios").select("escola_id").eq("id", callerUser.id).maybeSingle();
        if (!caller?.escola_id || caller.escola_id !== target.escola_id) {
          return new Response(JSON.stringify({ error: "Você só pode redefinir senhas de professores da própria escola." }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
      const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(target.id, { password: novaSenha });
      if (passwordError) throw passwordError;
      // Garante sincronia relacional em professores caso usuario_id estivesse nulo
      await supabaseAdmin.from("professores").update({ usuario_id: target.id }).ilike("email", targetEmail);
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // 2.1 Ação de exclusão / revogação de usuário
    if (bodyRecord.action === "delete-user") {
      // SEC-01 FIX: Apenas papéis administrativos podem excluir usuários.
      // Antes, qualquer ALUNO/PROFESSOR autenticado da mesma escola podia
      // invocar este endpoint e deletar contas de colegas permanentemente.
      if (!["ADMIN", "GESTOR", "SECRETARIO"].includes(effectiveRole as string)) {
        return new Response(
          JSON.stringify({ error: "Seu perfil não possui permissão para excluir contas de usuários." }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

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

        // SEGURANÇA: Não-admin NÃO pode excluir usuário inexistente ou não mapeado na tabela usuarios
        if (!targetUserData) {
          return new Response(
            JSON.stringify({ error: "Usuário não encontrado na base institucional" }),
            { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Não-admin só pode deletar PROFESSOR ou ALUNO da sua própria escola
        if (
          targetUserData.escola_id !== callerData.escola_id ||
          !["PROFESSOR", "ALUNO"].includes(targetUserData.cargo)
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

      if (!authUserId) {
        return new Response(
          JSON.stringify({ error: "Usuário não encontrado para exclusão" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error: delAuthErr } = await supabaseAdmin.auth.admin.deleteUser(authUserId);
      if (delAuthErr) throw delAuthErr;
      const { error: deleteProfileError } = await supabaseAdmin.from("usuarios").delete().eq("id", authUserId);
      if (deleteProfileError) {
        return new Response(JSON.stringify({ error: "Credenciais revogadas, mas o cadastro possui vínculos que impedem sua remoção. Solicite revisão administrativa." }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    // 7. Criar ou recuperar o usuário usando service_role
    let targetUserId = "";
    let isNewlyCreated = false;

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: emailTrimmed,
      password: senha,
      email_confirm: true,
      user_metadata: {
        full_name: nomeTrimmed,
      },
      app_metadata: {
        role: "PENDENTE",
      },
    });

    if (!createError && newUser?.user) {
      targetUserId = newUser.user.id;
      isNewlyCreated = true;
    } else if (
      createError?.message?.includes("already been registered") ||
      createError?.message?.includes("already exists")
    ) {
      // Se a conta já existe no Auth, verificar se foi deixada pendente/incompleta por falha anterior
      const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
      const existingAuth = listData?.users?.find(
        (u: { email?: string }) => u.email?.toLowerCase() === emailTrimmed
      );

      if (existingAuth) {
        const { data: existingProfile } = await supabaseAdmin
          .from("usuarios")
          .select("id, cargo, escola_id")
          .eq("id", existingAuth.id)
          .maybeSingle();

        // Se o usuário não tem perfil na tabela usuarios ou seu cargo está PENDENTE, completar o cadastro
        const isOrphanOrPending =
          !existingProfile || existingAuth.app_metadata?.role === "PENDENTE";

        if (isOrphanOrPending) {
          targetUserId = existingAuth.id;
          await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
            password: senha,
            user_metadata: { full_name: nomeTrimmed },
          });
        } else {
          return new Response(
            JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }),
            { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: "Este e-mail já está cadastrado no sistema" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } else {
      console.error("Erro ao criar usuário:", createError);
      return new Response(
        JSON.stringify({ error: "Não foi possível criar a conta. Tente novamente em instantes." }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Provisionamento institucional:
    // Tenta primeiro via RPC transacional finalize_provisioned_user se ela existir no banco
    const { error: provisionError } = await supabaseAdmin.rpc("finalize_provisioned_user", {
      p_actor: callerUser.id,
      p_user: targetUserId,
      p_email: emailTrimmed,
      p_nome: nomeTrimmed,
      p_cargo: cargoTrimmed,
      p_escola: escolaIdTrimmed,
    });

    if (provisionError) {
      const isMissingRpc =
        provisionError.code === "PGRST202" ||
        provisionError.message?.includes("Could not find the function") ||
        provisionError.message?.includes("não encontrada");

      if (isMissingRpc) {
        // Fallback gracioso quando a migração da RPC ainda não foi aplicada ao banco remoto
        console.warn("[admin-create-user] RPC finalize_provisioned_user ausente no banco. Executando provisionamento direto institucional.");

        const { error: upsertError } = await supabaseAdmin
          .from("usuarios")
          .upsert(
            {
              id: targetUserId,
              email: emailTrimmed,
              nome_completo: nomeTrimmed,
              cargo: cargoTrimmed,
              escola_id: escolaIdTrimmed,
            },
            { onConflict: "id" }
          );

        if (upsertError) {
          console.error("Erro ao fazer upsert em usuarios:", upsertError);
          if (isNewlyCreated) {
            await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          }
          return new Response(
            JSON.stringify({ error: "Erro ao criar perfil de usuário institucional." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        // Promover role no app_metadata do Auth
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          app_metadata: { role: cargoTrimmed },
        });

        // Vincular ao professor ou aluno
        if (cargoTrimmed === "PROFESSOR") {
          const { error: linkProfError } = await supabaseAdmin
            .from("professores")
            .update({ usuario_id: targetUserId })
            .ilike("email", emailTrimmed);
          if (linkProfError) {
            console.warn("[admin-create-user] Aviso ao vincular usuario_id em professores:", linkProfError.message);
          }
        } else if (cargoTrimmed === "ALUNO" && emailTrimmed.endsWith("@aluno.dcdigital.local")) {
          const cpfDigits = emailTrimmed.split("@")[0];
          const cpfFormatted = cpfDigits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
          const { error: linkAlunoError } = await supabaseAdmin
            .from("alunos")
            .update({ usuario_id: targetUserId })
            .or(`cpf.eq.${cpfDigits},cpf.eq.${cpfFormatted}`);
          if (linkAlunoError) {
            console.warn("[admin-create-user] Aviso ao vincular usuario_id em alunos:", linkAlunoError.message);
          }
        }
      } else {
        // Erro legítimo de validação da RPC (ex: 42501 falta de autorização, aluno de outra escola, etc.)
        if (isNewlyCreated) {
          const { error: rollbackError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
          if (!rollbackError) {
            await supabaseAdmin.from("usuarios").delete().eq("id", targetUserId);
          }
        }
        console.error("Falha de provisionamento via RPC", { code: provisionError.code });
        return new Response(
          JSON.stringify({
            error: "Não foi possível vincular a conta institucional. Verifique permissões, escola e vínculos.",
            details: provisionError.message,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 9. Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: targetUserId,
          email: emailTrimmed,
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
