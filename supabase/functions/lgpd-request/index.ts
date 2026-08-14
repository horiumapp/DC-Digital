import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// ============================================================
// CORS — mesmo padrão do admin-create-user
// ============================================================
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
  const isAllowed =
    ALLOWED_ORIGINS.includes(origin) ||
    /^https:\/\/.*\.vercel\.app$/.test(origin);

  if (!isAllowed && origin) {
    return null;
  }
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    Vary: "Origin",
  };
}

// ============================================================
// Rate Limiting por IP — sliding window (5 req / 15 min)
// ============================================================
const RATE_LIMIT_WINDOW_MS = 15 * 60_000; // 15 minutos
const RATE_LIMIT_MAX_REQUESTS = 5;

interface RateLimitEntry {
  timestamps: number[];
}

const rateLimitMap = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  retryAfterSecs: number;
} {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);

  if (!entry) {
    rateLimitMap.set(ip, { timestamps: [now] });
    return { allowed: true, remaining: RATE_LIMIT_MAX_REQUESTS - 1, retryAfterSecs: 0 };
  }

  // Remover timestamps fora da janela
  entry.timestamps = entry.timestamps.filter(
    (ts) => now - ts < RATE_LIMIT_WINDOW_MS
  );

  if (entry.timestamps.length >= RATE_LIMIT_MAX_REQUESTS) {
    const oldestInWindow = entry.timestamps[0];
    const retryAfterSecs = Math.ceil(
      (RATE_LIMIT_WINDOW_MS - (now - oldestInWindow)) / 1000
    );
    return { allowed: false, remaining: 0, retryAfterSecs };
  }

  entry.timestamps.push(now);
  return {
    allowed: true,
    remaining: RATE_LIMIT_MAX_REQUESTS - entry.timestamps.length,
    retryAfterSecs: 0,
  };
}

// Limpeza periódica de entradas expiradas (a cada 5 minutos)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    // Remover se todas as timestamps já expiraram
    const recent = entry.timestamps.filter(
      (ts) => now - ts < RATE_LIMIT_WINDOW_MS
    );
    if (recent.length === 0) {
      rateLimitMap.delete(key);
    } else {
      entry.timestamps = recent;
    }
  }
}, 5 * 60_000);

// ============================================================
// Validação de input
// ============================================================
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIPOS_VALIDOS = [
  "acesso",
  "correcao",
  "exclusao",
  "revogacao",
  "compartilhamento",
  "outro",
];

interface LgpdRequestBody {
  nome: string;
  email: string;
  tipo: string;
  mensagem: string;
}

function validateInput(body: unknown): {
  valid: true;
  data: LgpdRequestBody;
} | { valid: false; error: string } {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Body da requisição inválido." };
  }

  const { nome, email, tipo, mensagem } = body as Record<string, unknown>;

  // Verificar tipos
  if (
    typeof nome !== "string" ||
    typeof email !== "string" ||
    typeof tipo !== "string" ||
    typeof mensagem !== "string"
  ) {
    return {
      valid: false,
      error: "Todos os campos (nome, email, tipo, mensagem) devem ser strings.",
    };
  }

  const nomeTrimmed = nome.trim();
  const emailTrimmed = email.trim().toLowerCase();
  const mensagemTrimmed = mensagem.trim();
  const tipoTrimmed = tipo.trim();

  if (!nomeTrimmed || nomeTrimmed.length < 2 || nomeTrimmed.length > 200) {
    return { valid: false, error: "Nome inválido (2-200 caracteres)." };
  }

  if (
    !emailTrimmed ||
    !EMAIL_REGEX.test(emailTrimmed) ||
    emailTrimmed.length > 254
  ) {
    return { valid: false, error: "E-mail inválido." };
  }

  if (
    !mensagemTrimmed ||
    mensagemTrimmed.length < 10 ||
    mensagemTrimmed.length > 5000
  ) {
    return {
      valid: false,
      error: "Mensagem inválida (10-5000 caracteres).",
    };
  }

  if (!TIPOS_VALIDOS.includes(tipoTrimmed)) {
    return { valid: false, error: "Tipo de solicitação inválido." };
  }

  return {
    valid: true,
    data: {
      nome: nomeTrimmed,
      email: emailTrimmed,
      tipo: tipoTrimmed,
      mensagem: mensagemTrimmed,
    },
  };
}

// ============================================================
// Handler principal
// ============================================================
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Rejeitar origens não permitidas
  if (!corsHeaders) {
    return new Response(
      JSON.stringify({ error: "Origem não permitida" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Apenas POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // 1. Extrair IP do client (Supabase Edge Functions usa o header x-forwarded-for)
    const forwarded = req.headers.get("x-forwarded-for");
    const clientIp = forwarded
      ? forwarded.split(",")[0].trim()
      : req.headers.get("x-real-ip") || "unknown";

    // 2. Rate limiting por IP
    const rateResult = checkRateLimit(clientIp);

    const rateLimitHeaders: Record<string, string> = {
      "X-RateLimit-Limit": String(RATE_LIMIT_MAX_REQUESTS),
      "X-RateLimit-Remaining": String(rateResult.remaining),
    };

    if (!rateResult.allowed) {
      return new Response(
        JSON.stringify({
          error:
            "Muitas solicitações em pouco tempo. Aguarde antes de enviar outra.",
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            ...rateLimitHeaders,
            "Content-Type": "application/json",
            "Retry-After": String(rateResult.retryAfterSecs),
          },
        }
      );
    }

    // 3. Parsear e validar body
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Body da requisição inválido (JSON malformado)" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const validation = validateInput(body);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({ error: validation.error }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { nome, email, tipo, mensagem } = validation.data;

    // 4. Inserir no banco via service_role (bypassa RLS)
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabaseAdmin
      .from("lgpd_requests")
      .insert({
        nome,
        email,
        tipo,
        mensagem,
        status: "recebida",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select("id, created_at")
      .single();

    if (error) {
      // A trigger trg_lgpd_rate_limit pode rejeitar (rate limit por email)
      if (error.message?.includes("RATE_LIMIT_EXCEEDED")) {
        return new Response(
          JSON.stringify({
            error:
              "Muitas solicitações do mesmo e-mail. Aguarde 15 minutos antes de enviar outra.",
          }),
          {
            status: 429,
            headers: {
              ...corsHeaders,
              ...rateLimitHeaders,
              "Content-Type": "application/json",
              "Retry-After": "900",
            },
          }
        );
      }

      console.error("[lgpd-request] Erro ao inserir:", error.message);
      return new Response(
        JSON.stringify({
          error: "Não foi possível processar a solicitação. Tente novamente.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // 5. Sucesso
    return new Response(
      JSON.stringify({
        success: true,
        id: data.id,
        created_at: data.created_at,
      }),
      {
        status: 201,
        headers: {
          ...corsHeaders,
          ...rateLimitHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[lgpd-request] Erro inesperado:", errMsg);
    const errorHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      Vary: "Origin",
      ...(corsHeaders || {}),
    };
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: errorHeaders }
    );
  }
});
