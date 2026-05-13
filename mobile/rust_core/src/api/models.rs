//! Model information and registry

use serde::{Deserialize, Serialize};

/// Information about an AI model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelInfo {
    pub id: String,
    pub name: String,
    pub provider: String,
    pub description: Option<String>,
    pub context_length: Option<u32>,
    pub pricing: Option<PricingInfo>,
    pub capabilities: ModelCapabilities,
}

/// Pricing information for a model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PricingInfo {
    pub prompt_per_million: f64,
    pub completion_per_million: f64,
}

/// What a model can do
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModelCapabilities {
    pub chat: bool,
    pub vision: bool,
    pub streaming: bool,
    pub function_calling: bool,
}

/// Provider configuration
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProviderConfig {
    pub id: String,
    pub name: String,
    pub base_url: String,
    pub api_key_prefix: Option<String>,
    pub supports_streaming: bool,
    pub supports_vision: bool,
    pub auth_type: AuthType,
}

/// Authentication type for a provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AuthType {
    Bearer,
    ApiKey,
    QueryParam,
    CustomHeader(String),
}

/// All supported providers with their configurations
pub fn get_provider_configs() -> Vec<ProviderConfig> {
    vec![
        ProviderConfig {
            id: "openrouter".into(),
            name: "OpenRouter".into(),
            base_url: "https://openrouter.ai/api/v1".into(),
            api_key_prefix: Some("sk-or-".into()),
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "nvidia".into(),
            name: "NVIDIA NIM".into(),
            base_url: "https://integrate.api.nvidia.com/v1".into(),
            api_key_prefix: Some("nvapi-".into()),
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "openai".into(),
            name: "OpenAI".into(),
            base_url: "https://api.openai.com/v1".into(),
            api_key_prefix: Some("sk-".into()),
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "anthropic".into(),
            name: "Anthropic".into(),
            base_url: "https://api.anthropic.com/v1".into(),
            api_key_prefix: Some("sk-ant-".into()),
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::CustomHeader("x-api-key".into()),
        },
        ProviderConfig {
            id: "google".into(),
            name: "Google AI".into(),
            base_url: "https://generativelanguage.googleapis.com/v1beta".into(),
            api_key_prefix: Some("AI".into()),
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::QueryParam,
        },
        ProviderConfig {
            id: "groq".into(),
            name: "Groq".into(),
            base_url: "https://api.groq.com/openai/v1".into(),
            api_key_prefix: Some("gsk_".into()),
            supports_streaming: true,
            supports_vision: false,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "together".into(),
            name: "Together AI".into(),
            base_url: "https://api.together.xyz/v1".into(),
            api_key_prefix: None,
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "ollama".into(),
            name: "Ollama (Local)".into(),
            base_url: "http://localhost:11434".into(),
            api_key_prefix: None,
            supports_streaming: true,
            supports_vision: true,
            auth_type: AuthType::Bearer,
        },
        ProviderConfig {
            id: "custom".into(),
            name: "Custom Provider".into(),
            base_url: "http://localhost:8080/v1".into(),
            api_key_prefix: None,
            supports_streaming: true,
            supports_vision: false,
            auth_type: AuthType::Bearer,
        },
    ]
}
