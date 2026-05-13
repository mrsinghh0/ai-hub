//! Provider adapters — each provider has its own request/response mapping

pub mod openrouter;
pub mod nvidia;
pub mod openai;
pub mod anthropic;
pub mod google;
pub mod groq;
pub mod together;
pub mod ollama;
pub mod custom;

use crate::api::{ChatRequest, ChatResponse, ChatMessage, KeyValidationResult, TokenUsage};
use crate::api::models::{ModelInfo, PricingInfo, ModelCapabilities};
use anyhow::Result;

/// Helper: build the messages JSON array for OpenAI-compatible APIs
pub fn build_openai_messages(messages: &[ChatMessage]) -> Vec<serde_json::Value> {
    messages.iter().map(|m| {
        let mut msg = serde_json::Map::new();
        msg.insert("role".into(), serde_json::Value::String(m.role.clone()));
        if let Some(ref img) = m.image_url {
            let text_part = serde_json::json!({"type": "text", "text": m.content});
            let image_part = serde_json::json!({"type": "image_url", "image_url": {"url": img}});
            msg.insert("content".into(), serde_json::Value::Array(vec![text_part, image_part]));
        } else {
            msg.insert("content".into(), serde_json::Value::String(m.content.clone()));
        }
        serde_json::Value::Object(msg)
    }).collect()
}

/// Helper: parse OpenAI-compatible response
pub fn parse_openai_response(data: &serde_json::Value, provider: &str) -> Result<ChatResponse> {
    let choice = &data["choices"][0];
    let content = choice["message"]["content"]
        .as_str()
        .unwrap_or("")
        .to_string();
    let model = data["model"].as_str().unwrap_or("unknown").to_string();
    let usage = data.get("usage").and_then(|u| {
        Some(TokenUsage {
            prompt_tokens: u["prompt_tokens"].as_u64()? as u32,
            completion_tokens: u["completion_tokens"].as_u64()? as u32,
            total_tokens: u["total_tokens"].as_u64()? as u32,
        })
    });
    let finish_reason = choice["finish_reason"].as_str().map(String::from);

    Ok(ChatResponse {
        id: uuid::Uuid::new_v4().to_string(),
        content,
        model,
        provider: provider.to_string(),
        usage,
        finish_reason,
    })
}
