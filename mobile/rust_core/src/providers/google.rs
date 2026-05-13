//! Google AI (Gemini) provider adapter

use anyhow::Result;
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult, TokenUsage};
use crate::api::models::{ModelInfo, ModelCapabilities};

pub async fn chat(req: &ChatRequest) -> Result<ChatResponse> {
    let client = reqwest::Client::new();
    let contents: Vec<serde_json::Value> = req.messages.iter().map(|m| {
        let role = if m.role == "assistant" { "model" } else { "user" };
        serde_json::json!({
            "role": role,
            "parts": [{"text": m.content}]
        })
    }).collect();

    let mut body = serde_json::json!({ "contents": contents });
    if let Some(temp) = req.temperature {
        body["generationConfig"]["temperature"] = serde_json::Value::from(temp);
    }
    if let Some(max) = req.max_tokens {
        body["generationConfig"]["maxOutputTokens"] = serde_json::Value::from(max);
    }

    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        req.model, req.api_key
    );

    let response = client.post(&url).json(&body).send().await?;
    let data: serde_json::Value = response.json().await?;

    let content = data["candidates"][0]["content"]["parts"][0]["text"]
        .as_str().unwrap_or("").to_string();
    let usage = data.get("usageMetadata").and_then(|u| Some(TokenUsage {
        prompt_tokens: u["promptTokenCount"].as_u64()? as u32,
        completion_tokens: u["candidatesTokenCount"].as_u64()? as u32,
        total_tokens: u["totalTokenCount"].as_u64()? as u32,
    }));

    Ok(ChatResponse {
        id: uuid::Uuid::new_v4().to_string(),
        content,
        model: req.model.clone(),
        provider: "google".into(),
        usage,
        finish_reason: data["candidates"][0]["finishReason"].as_str().map(String::from),
    })
}

pub async fn validate_key(api_key: &str) -> Result<KeyValidationResult> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );
    let resp = client.get(&url).send().await;
    match resp {
        Ok(r) if r.status().is_success() => Ok(KeyValidationResult {
            valid: true, provider: "google".into(), models_count: None, error: None,
        }),
        Ok(r) => Ok(KeyValidationResult {
            valid: false, provider: "google".into(), models_count: None,
            error: Some(format!("HTTP {}", r.status())),
        }),
        Err(e) => Ok(KeyValidationResult {
            valid: false, provider: "google".into(), models_count: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn fetch_models(api_key: &str) -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models?key={}",
        api_key
    );
    let response = client.get(&url).send().await?;
    let data: serde_json::Value = response.json().await?;
    let models = data["models"].as_array()
        .map(|arr| arr.iter().filter_map(|m| {
            let name = m["name"].as_str()?.strip_prefix("models/")?.to_string();
            Some(ModelInfo {
                id: name.clone(),
                name: m["displayName"].as_str().unwrap_or(&name).to_string(),
                provider: "google".into(),
                description: m["description"].as_str().map(String::from),
                context_length: m["inputTokenLimit"].as_u64().map(|v| v as u32),
                pricing: None,
                capabilities: ModelCapabilities {
                    chat: true,
                    vision: name.contains("vision") || name.contains("pro"),
                    streaming: true,
                    function_calling: name.contains("pro"),
                },
            })
        }).collect())
        .unwrap_or_default();
    Ok(models)
}
