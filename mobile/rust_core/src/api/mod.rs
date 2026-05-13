//! API module — unified chat interface across all providers

pub mod chat;
pub mod stream;
pub mod models;

use serde::{Deserialize, Serialize};
use anyhow::Result;

/// Unified request format sent from Flutter to Rust
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatRequest {
    pub provider: String,
    pub model: String,
    pub api_key: String,
    pub base_url: Option<String>,
    pub messages: Vec<ChatMessage>,
    pub temperature: Option<f64>,
    pub max_tokens: Option<u32>,
    pub stream: bool,
}

/// A single message in the conversation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
    pub image_url: Option<String>,
}

/// Unified response from any provider
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatResponse {
    pub id: String,
    pub content: String,
    pub model: String,
    pub provider: String,
    pub usage: Option<TokenUsage>,
    pub finish_reason: Option<String>,
}

/// Token usage metrics
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TokenUsage {
    pub prompt_tokens: u32,
    pub completion_tokens: u32,
    pub total_tokens: u32,
}

/// Streaming chunk
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StreamChunk {
    pub delta: String,
    pub done: bool,
    pub usage: Option<TokenUsage>,
}

/// API key validation result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeyValidationResult {
    pub valid: bool,
    pub provider: String,
    pub models_count: Option<u32>,
    pub error: Option<String>,
}
