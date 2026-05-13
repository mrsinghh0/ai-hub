//! OpenAI provider adapter

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
        .post("https://api.openai.com/v1/chat/completions")
        .header("Authorization", format!("Bearer {}", req.api_key))
        .json(&body)
        .send()
        .await?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        anyhow::bail!("OpenAI error ({}): {}", status, text);
    }

    let data: serde_json::Value = response.json().await?;
    parse_openai_response(&data, "openai")
}

pub async fn validate_key(api_key: &str) -> Result<KeyValidationResult> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.openai.com/v1/models")
        .header("Authorization", format!("Bearer {}", api_key))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let data: serde_json::Value = resp.json().await.unwrap_or_default();
            let count = data["data"].as_array().map(|a| a.len() as u32);
            Ok(KeyValidationResult {
                valid: true,
                provider: "openai".into(),
                models_count: count,
                error: None,
            })
        }
        Ok(resp) => Ok(KeyValidationResult {
            valid: false,
            provider: "openai".into(),
            models_count: None,
            error: Some(format!("HTTP {}", resp.status())),
        }),
        Err(e) => Ok(KeyValidationResult {
            valid: false,
            provider: "openai".into(),
            models_count: None,
            error: Some(e.to_string()),
        }),
    }
}

pub async fn fetch_models(api_key: &str) -> Result<Vec<ModelInfo>> {
    let client = reqwest::Client::new();
    let response = client
        .get("https://api.openai.com/v1/models")
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
                    name: id.to_string(),
                    provider: "openai".into(),
                    description: None,
                    context_length: None,
                    pricing: None,
                    capabilities: ModelCapabilities {
                        chat: true,
                        vision: id.contains("vision") || id.contains("gpt-4"),
                        streaming: true,
                        function_calling: id.contains("gpt-4") || id.contains("gpt-3.5"),
                    },
                })
            }).collect())
        })
        .unwrap_or_default();
    Ok(models)
}
