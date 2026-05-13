//! Anthropic (Claude) provider adapter

use anyhow::Result;
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult, TokenUsage};
use crate::api::models::{ModelInfo, ModelCapabilities};
use crate::providers::build_openai_messages;

pub async fn chat(req: &ChatRequest) -> Result<ChatResponse> {
    let client = reqwest::Client::new();
    let messages = build_openai_messages(&req.messages);

    let mut body = serde_json::json!({
        "model": req.model,
        "messages": messages,
        "max_tokens": req.max_tokens.unwrap_or(4096),
    });
    if let Some(temp) = req.temperature {
        body["temperature"] = serde_json::Value::from(temp);
    }

    let response = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", &req.api_key)
        .header("anthropic-version", "2023-06-01")
        .header("content-type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        anyhow::bail!("Anthropic error ({}): {}", status, text);
    }

    let data: serde_json::Value = response.json().await?;
    let content = data["content"][0]["text"].as_str().unwrap_or("").to_string();
    let model = data["model"].as_str().unwrap_or("unknown").to_string();
    let usage = data.get("usage").and_then(|u| Some(TokenUsage {
        prompt_tokens: u["input_tokens"].as_u64()? as u32,
        completion_tokens: u["output_tokens"].as_u64()? as u32,
        total_tokens: u["input_tokens"].as_u64()? as u32 + u["output_tokens"].as_u64()? as u32,
    }));

    Ok(ChatResponse {
        id: uuid::Uuid::new_v4().to_string(),
        content,
        model,
        provider: "anthropic".into(),
        usage,
        finish_reason: data["stop_reason"].as_str().map(String::from),
    })
}

pub async fn validate_key(api_key: &str) -> Result<KeyValidationResult> {
    let client = reqwest::Client::new();
    let resp = client
        .post("https://api.anthropic.com/v1/messages")
        .header("x-api-key", api_key)
        .header("anthropic-version", "2023-06-01")
        .json(&serde_json::json!({
            "model": "claude-3-haiku-20240307",
            "messages": [{"role": "user", "content": "hi"}],
            "max_tokens": 1
        }))
        .send()
        .await;

    match resp {
        Ok(r) if r.status().is_success() || r.status().as_u16() == 400 => {
            // 400 means the key is valid but request might be malformed
            Ok(KeyValidationResult {
                valid: true, provider: "anthropic".into(), models_count: None, error: None,
            })
        }
        Ok(r) => Ok(KeyValidationResult {
            valid: false, provider: "anthropic".into(), models_count: None,
            error: Some(format!("HTTP {}", r.status())),
        }),
        Err(e) => Ok(KeyValidationResult {
            valid: false, provider: "anthropic".into(), models_count: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn fetch_models(_api_key: &str) -> Result<Vec<ModelInfo>> {
    let models = vec![
        ModelInfo {
            id: "claude-3-5-sonnet-20241022".into(), name: "Claude 3.5 Sonnet".into(),
            provider: "anthropic".into(), description: Some("Most intelligent model".into()),
            context_length: Some(200000), pricing: None,
            capabilities: ModelCapabilities { chat: true, vision: true, streaming: true, function_calling: true },
        },
        ModelInfo {
            id: "claude-3-haiku-20240307".into(), name: "Claude 3 Haiku".into(),
            provider: "anthropic".into(), description: Some("Fastest model".into()),
            context_length: Some(200000), pricing: None,
            capabilities: ModelCapabilities { chat: true, vision: true, streaming: true, function_calling: true },
        },
    ];
    Ok(models)
}
