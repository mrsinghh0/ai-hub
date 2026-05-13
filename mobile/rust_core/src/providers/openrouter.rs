//! OpenRouter provider adapter

use anyhow::Result;
use crate::api::{ChatRequest, ChatResponse, KeyValidationResult};
use crate::api::models::{ModelInfo, ModelCapabilities, PricingInfo};
use crate::providers::{build_openai_messages, parse_openai_response};

pub async fn chat(req: &ChatRequest) -> Result<ChatResponse> {
    let client = reqwest::Client::new();
    let messages = build_openai_messages(&req.messages);

    let mut body = serde_json::json!({
        "model": req.model,
        "messages": messages,
    });
    if let Some(temp) = req.temperature {
        body["temperature"] = serde_json::Value::from(temp);
    }
    if let Some(max) = req.max_tokens {
        body["max_tokens"] = serde_json::Value::from(max);
    }

    let response = client
        .post("https://openrouter.ai/api/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", req.api_key))
        .header("HTTP-Referer", "https://aihub.app")
        .header("Content-Type", "application/json")
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        anyhow::bail!("OpenRouter error ({}): {}", status, text);
    }

    let data: serde_json::Value = response.json().await?;
    parse_openai_response(&data, "openrouter")
}

pub async fn validate_key(api_key: &str) -> Result<KeyValidationResult> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let data: serde_json::Value = resp.json().await.unwrap_or_default();
            let count = data["data"].as_array().map(|a| a.len() as u32);
            Ok(KeyValidationResult {
                valid: true,
                provider: "openrouter".into(),
                models_count: count,
                error: None,
            })
        }
        Ok(resp) => {
            let status = resp.status();
            Ok(KeyValidationResult {
                valid: false,
                provider: "openrouter".into(),
                models_count: None,
                error: Some(format!("HTTP {}", status)),
            })
        }
        Err(e) => Ok(KeyValidationResult {
            valid: false,
            provider: "openrouter".into(),
            models_count: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn fetch_models(api_key: &str) -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://openrouter.ai/api/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await?;

    let data: serde_json::Value = response.json().await?;
    let models = data["data"].as_array()
        .map(|arr| {
            arr.iter().filter_map(|m| {
                let id = m["id"].as_str()?;
                Some(ModelInfo {
                    id: id.to_string(),
                    name: m["name"].as_str().unwrap_or(id).to_string(),
                    provider: "openrouter".into(),
                    description: m["description"].as_str().map(String::from),
                    context_length: m["context_length"].as_u64().map(|v| v as u32),
                    pricing: Some(PricingInfo {
                        prompt_per_million: m["pricing"]["prompt"].as_str()
                            .and_then(|s| s.parse().ok()).unwrap_or(0.0),
                        completion_per_million: m["pricing"]["completion"].as_str()
                            .and_then(|s| s.parse().ok()).unwrap_or(0.0),
                    }),
                    capabilities: ModelCapabilities {
                        chat: true,
                        vision: m["modality"].as_str().map_or(false, |s| s.contains("image")),
                        streaming: true,
                        function_calling: false,
                    },
                })
            }).collect())
        })
        .unwrap_or_default();
    Ok(models)
}
