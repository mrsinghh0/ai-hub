//! Chat API — route requests to the correct provider

use anyhow::{Result, Context, bail};
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult};
use crate::providers;

/// Send a non-streaming chat request to the specified provider
pub async fn send_chat(req: ChatRequest) -> Result<ChatResponse> {
    match req.provider.as_str() {
        "openrouter" => providers::openrouter::chat(&req).await,
        "nvidia" => providers::nvidia::chat(&req).await,
        "openai" => providers::openai::chat(&req).await,
        "anthropic" => providers::anthropic::chat(&req).await,
        "google" => providers::google::chat(&req).await,
        "groq" => providers::groq::chat(&req).await,
        "together" => providers::together::chat(&req).await,
        "ollama" => providers::ollama::chat(&req).await,
        "custom" => providers::custom::chat(&req).await,
        other => bail!("Unsupported provider: {}", other),
    }
}

/// Validate an API key for a given provider
pub async fn validate_key(provider: &str, api_key: &str, base_url: Option<&str>) -> Result<KeyValidationResult> {
    match provider {
        "openrouter" => providers::openrouter::validate_key(api_key).await,
        "nvidia" => providers::nvidia::validate_key(api_key).await,
        "openai" => providers::openai::validate_key(api_key).await,
        "anthropic" => providers::anthropic::validate_key(api_key).await,
        "google" => providers::google::validate_key(api_key).await,
        "groq" => providers::groq::validate_key(api_key).await,
        "together" => providers::together::validate_key(api_key).await,
        "ollama" => providers::ollama::validate_key(api_key).await,
        "custom" => providers::custom::validate_key(api_key, base_url).await,
        other => bail!("Unsupported provider: {}", other),
    }
}

/// Fetch available models for a provider
pub async fn fetch_models(provider: &str, api_key: &str, base_url: Option<&str>) -> Result<Vec<crate::api::models::ModelInfo>> {
    match provider {
        "openrouter" => providers::openrouter::fetch_models(api_key).await,
        "nvidia" => providers::nvidia::fetch_models(api_key).await,
        "openai" => providers::openai::fetch_models(api_key).await,
        "anthropic" => providers::anthropic::fetch_models(api_key).await,
        "google" => providers::google::fetch_models(api_key).await,
        "groq" => providers::groq::fetch_models(api_key).await,
        "together" => providers::together::fetch_models(api_key).await,
        "ollama" => providers::ollama::fetch_models(api_key).await,
        "custom" => providers::custom::fetch_models(api_key, base_url).await,
        other => bail!("Unsupported provider: {}", other),
    }
}
