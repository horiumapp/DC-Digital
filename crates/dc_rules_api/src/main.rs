//! API HTTP opcional (Fase 3) para consolidar pendências docentes.
//!
//! Segurança:
//! - Não acessa Postgres / Supabase.
//! - Só processa JSON já buscado pelo cliente com RLS (ou RPC).
//! - JWT do Supabase é validado quando `DC_RULES_API_REQUIRE_AUTH=1`.
//!
//! Endpoints:
//! - GET  /health
//! - POST /v1/pendencias/consolidar
//!
//! Env:
//! - `DC_RULES_API_HOST` (default 127.0.0.1)
//! - `DC_RULES_API_PORT` (default 8787)
//! - `DC_RULES_API_REQUIRE_AUTH` (`1`/`true` para exigir Bearer JWT)
//! - `SUPABASE_JWT_SECRET` (obrigatório se auth ligado)

use axum::extract::Request;
use axum::http::{header, StatusCode};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use dc_rules::{consolidar_pendencias, ConsolidarPendenciasInput, PendenciaDocente};
use jsonwebtoken::{decode, Algorithm, DecodingKey, Validation};
use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::TraceLayer;

#[derive(Debug, Serialize)]
struct HealthResponse {
    ok: bool,
    service: &'static str,
    version: &'static str,
}

#[derive(Debug, Serialize)]
struct ConsolidarResponse {
    data: Vec<PendenciaDocente>,
    total: usize,
}

#[derive(Debug, Deserialize)]
struct SupabaseClaims {
    sub: String,
    #[serde(default)]
    role: Option<String>,
}

#[derive(Clone)]
struct AppState {
    require_auth: bool,
    jwt_secret: Option<String>,
}

async fn health() -> Json<HealthResponse> {
    Json(HealthResponse {
        ok: true,
        service: "dc_rules_api",
        version: env!("CARGO_PKG_VERSION"),
    })
}

async fn consolidar(
    Json(input): Json<ConsolidarPendenciasInput>,
) -> Result<Json<ConsolidarResponse>, (StatusCode, String)> {
    if input.groups.len() > 20_000 {
        return Err((
            StatusCode::PAYLOAD_TOO_LARGE,
            "Demasiados grupos na consolidação (limite 20000).".into(),
        ));
    }
    let data = consolidar_pendencias(input);
    let total = data.len();
    Ok(Json(ConsolidarResponse { data, total }))
}

async fn auth_middleware(
    axum::extract::State(state): axum::extract::State<AppState>,
    req: Request,
    next: Next,
) -> Response {
    if !state.require_auth {
        return next.run(req).await;
    }

    let path = req.uri().path();
    if path == "/health" {
        return next.run(req).await;
    }

    let Some(secret) = state.jwt_secret.as_deref() else {
        return (
            StatusCode::INTERNAL_SERVER_ERROR,
            "SUPABASE_JWT_SECRET não configurado",
        )
            .into_response();
    };

    let auth = req
        .headers()
        .get(header::AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");

    let token = match auth.strip_prefix("Bearer ") {
        Some(t) if !t.is_empty() => t,
        _ => {
            return (StatusCode::UNAUTHORIZED, "Bearer JWT ausente").into_response();
        }
    };

    let mut validation = Validation::new(Algorithm::HS256);
    validation.validate_exp = true;
    // Supabase usa audience "authenticated" em access tokens; aceitar sem aud estrito.
    validation.validate_aud = false;

    match decode::<SupabaseClaims>(
        token,
        &DecodingKey::from_secret(secret.as_bytes()),
        &validation,
    ) {
        Ok(data) => {
            tracing::debug!(sub = %data.claims.sub, role = ?data.claims.role, "jwt ok");
            next.run(req).await
        }
        Err(err) => {
            tracing::warn!(error = %err, "jwt inválido");
            (StatusCode::UNAUTHORIZED, "JWT inválido ou expirado").into_response()
        }
    }
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "dc_rules_api=info,tower_http=info".into()),
        )
        .init();

    let require_auth = matches!(
        std::env::var("DC_RULES_API_REQUIRE_AUTH")
            .unwrap_or_default()
            .to_lowercase()
            .as_str(),
        "1" | "true" | "yes"
    );
    let jwt_secret = std::env::var("SUPABASE_JWT_SECRET").ok().filter(|s| !s.is_empty());

    if require_auth && jwt_secret.is_none() {
        tracing::error!("DC_RULES_API_REQUIRE_AUTH=1 exige SUPABASE_JWT_SECRET");
        std::process::exit(1);
    }

    let state = AppState {
        require_auth,
        jwt_secret,
    };

    let app = Router::new()
        .route("/health", get(health))
        .route("/v1/pendencias/consolidar", post(consolidar))
        .layer(middleware::from_fn_with_state(state.clone(), auth_middleware))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let host = std::env::var("DC_RULES_API_HOST").unwrap_or_else(|_| "127.0.0.1".into());
    let port: u16 = std::env::var("DC_RULES_API_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(8787);
    let addr: SocketAddr = format!("{host}:{port}")
        .parse()
        .expect("DC_RULES_API_HOST/PORT inválidos");

    tracing::info!(
        %addr,
        require_auth,
        "dc_rules_api ouvindo (sem acesso a banco — só consolidação)"
    );

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("falha ao bind");
    axum::serve(listener, app).await.expect("servidor encerrou");
}
