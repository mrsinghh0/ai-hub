//! NVIDIA NIM provider adapter

use anyhow::Result;
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult};
use crate::api::models::{ModelInfo, ModelCapabilities};
use crate::providers::{build_openai_messages, parse_openai_response};

pub async fn chat(req: &ChatRequest) -> Result<ChatResponse> {
    let client = reqwest::Client::new();
    let messages = build_openai_messages(&req.messages);

    let body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "temperature": req.temperature.unwrap_or(0.6),
        "max_tokens": req.max_tokens.unwrap_or(1024),
    });

    let response = client
        .post("https://integrate.api.nvidia.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&body)
        .send()
        .await?;

    let data: serde_json::Value = response.json().await?;
    parse_openai_response(&data, "nvidia")
}

pub async fn validate_key(api_key: &str) -> Result<KeyValidationResult> {
    let client = reqwest::Client::new();
    let resp = client
        .get("https://integrate.api.nvidia.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() => Ok(KeyValidationResult {
            valid: true, provider: "nvidia".into(), models_count: None, error: None,
        }),
        Ok(r) => Ok(KeyValidationResult {
            valid: false, provider: "nvidia".into(), models_count: None,
            error: Some(format!("HTTP {}", r.status())),
        }),
        Err(e) => Ok(KeyValidationResult {
            valid: false, provider: "nvidia".into(), models_count: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn fetch_models(api_key: &str) -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://integrate.api.nvidia.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await?;

    let data: serde_json::Value = response.json().await?;
    let models = data["data"].as_array()
        .map(|arr| arr.iter().filter_map(|m| {
            let id = m["id"].as_str()?;
            Some(ModelInfo {
                id: id.to_string(),
                name: m["name"].as_str().unwrap_or(id).to_string(),
                provider: "nvidia".into(),
                description: None,
                context_length: None,
                pricing: None,
                capabilities: ModelCapabilities {
                    chat: true, vision: false, streaming: true, function_calling: false,
                },
            })
        }).collect())
        .unwrap_or_default();
    Ok(models)
}
