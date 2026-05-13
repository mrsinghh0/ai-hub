//! Ollama (local) provider adapter

use anyhow::Result;
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult, TokenUsage};
use crate::api::models::{ModelInfo, ModelCapabilities};

pub async fn chat(req: &ChatRequest) -> Result<ChatResponse> {
    let client = reqwest::Client::new();
    let base = req.base_url.as_deref().unwrap_or("http://localhost:11434");
    let messages: Vec<serde_json::Value> = req.messages.iter().map(|m| {
        serde_json::json!({"role": m.role, "content": m.content})
    }).collect();

    let body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "stream": false,
    });

    let response = client
        .post(&format!("{}/api/chat", base))
        .json(&body)
        .send().await?;

    let data: serde_json::Value = response.json().await?;
    let content = data["message"]["content"].as_str().unwrap_or("").to_string();

    Ok(ChatResponse {
        id: uuid::Uuid::new_v4().to_string(),
        content,
        model: req.model.clone(),
        provider: "ollama".into(),
        usage: None,
        finish_reason: Some("stop".into()),
    })
}

pub async fn validate_key(_api_key: &str) -> Result<KeyValidationResult> {
    // Ollama doesn't require API keys
    let client = reqwest::Client::new();
    let resp = client.get("http://localhost:11434/api/tags").send().await;
    match resp {
        Ok(r) if r.status().is_success() => Ok(KeyValidationResult {
            valid: true, provider: "ollama".into(), models_count: None, error: None,
        }),
        _ => Ok(KeyValidationResult {
            valid: false, provider: "ollama".into(), models_count: None,
            error: Some("Cannot connect to Ollama server".into()),
        }),
    }
}

pub async fn fetch_models(_api_key: &str) -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let response = client.get("http://localhost:11434/api/tags").send().await?;
    let data: serde_json::Value = response.json().await?;
    let models = data["models"].as_array()
        .map(|arr| arr.iter().filter_map(|m| {
            let name = m["name"].as_str()?;
            Some(ModelInfo {
                id: name.to_string(), name: name.to_string(), provider: "ollama".into(),
                description: None, context_length: None, pricing: None,
                capabilities: ModelCapabilities { chat: true, vision: false, streaming: true, function_calling: false },
            })
        }).collect())
        .unwrap_or_default();
    Ok(models)
}
