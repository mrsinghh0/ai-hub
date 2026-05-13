//! Streaming support — SSE-based chunk delivery

use anyhow::Result;
use futures_core::Stream;
use std::pin::Pin;

use crate::api::{ChatRequest, StreamChunk};

/// Type alias for a boxed stream of chunks
pub type ChunkStream = Pin<Box<dyn Stream<Item = Result<StreamChunk>> + Send>>;

/// Create a streaming connection for a chat request.
/// Returns a stream of `StreamChunk` items that can be iterated asynchronously.
pub async fn create_stream(req: ChatRequest) -> Result<ChunkStream> {
    let client = reqwest::Client::new();

    let (url, headers, body) = build_stream_request(&req)?;

    let response = client
        .post(&url)
        .headers(headers)
        .json(&body)
        .send()
        .await?;

    if !response.status().is_success() {
        let status = response.status();
        let text = response.text().await.unwrap_or_default();
        anyhow::bail!("Stream request failed ({}): {}", status, text);
    }

    // Convert the SSE response into a stream of StreamChunk
    let stream = response_to_chunks(response);
    Ok(Box::pin(stream))
}

fn build_stream_request(
    req: &ChatRequest,
) -> Result<(String, reqwest::header::HeaderMap, serde_json::Value)> {
    let mut headers = reqwest::header::HeaderMap::new();
    let mut body = serde_json::Map::new();

    let url = match req.provider.as_str() {
        "openrouter" => {
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            headers.insert("HTTP-Referer", "https://aihub.app".parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://openrouter.ai/api/v1/chat/completions".to_string()
        }
        "openai" => {
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://api.openai.com/v1/chat/completions".to_string()
        }
        "groq" => {
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://api.groq.com/openai/v1/chat/completions".to_string()
        }
        "together" => {
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://api.together.xyz/v1/chat/completions".to_string()
        }
        "anthropic" => {
            headers.insert("x-api-key", req.api_key.parse()?);
            headers.insert("anthropic-version", "2023-06-01".parse()?);
            headers.insert("content-type", "application/json".parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://api.anthropic.com/v1/messages".to_string()
        }
        "google" => {
            let url = format!(
                "https://generativelanguage.googleapis.com/v1beta/models/{}:streamGenerateContent?key={}&alt=sse",
                req.model, req.api_key
            );
            return Ok((url, headers, serde_json::Value::Object(body)));
        }
        "nvidia" => {
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            "https://integrate.api.nvidia.com/v1/chat/completions".to_string()
        }
        "ollama" => {
            let base = req.base_url.as_deref().unwrap_or("http://localhost:11434");
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            format!("{}/api/chat", base)
        }
        "custom" => {
            let base = req.base_url.as_deref().unwrap_or("http://localhost:8080");
            headers.insert("Authorization", format!("Bearer {}", req.api_key).parse()?);
            body.insert("model".into(), serde_json::Value::String(req.model.clone()));
            body.insert("stream".into(), serde_json::Value::Bool(true));
            format!("{}/v1/chat/completions", base)
        }
        other => anyhow::bail!("Unsupported provider for streaming: {}", other),
    };

    // Build messages array
    let messages: Vec<serde_json::Value> = req.messages.iter().map(|m| {
        let mut msg = serde_json::Map::new();
        msg.insert("role".into(), serde_json::Value::String(m.role.clone()));
        if let Some(ref img) = m.image_url {
            let mut content = serde_json::Map::new();
            content.insert("type".into(), serde_json::Value::String("text".into()));
            content.insert("text".into(), serde_json::Value::String(m.content.clone()));
            let mut image_content = serde_json::Map::new();
            image_content.insert("type".into(), serde_json::Value::String("image_url".into()));
            let mut image_url = serde_json::Map::new();
            image_url.insert("url".into(), serde_json::Value::String(img.clone()));
            image_content.insert("image_url".into(), serde_json::Value::Object(image_url));
            msg.insert("content".into(), serde_json::Value::Array(vec![
                serde_json::Value::Object(content),
                serde_json::Value::Object(image_content),
            ]));
        } else {
            msg.insert("content".into(), serde_json::Value::String(m.content.clone()));
        }
        serde_json::Value::Object(msg)
    }).collect();
    body.insert("messages".into(), serde_json::Value::Array(messages));

    if let Some(temp) = req.temperature {
        body.insert("temperature".into(), serde_json::Value::from(temp));
    }
    if let Some(max) = req.max_tokens {
        body.insert("max_tokens".into(), serde_json::Value::from(max));
    }

    Ok((url, headers, serde_json::Value::Object(body)))
}

/// Convert an SSE HTTP response into a stream of parsed chunks
fn response_to_chunks(
    response: reqwest::Response,
) -> impl Stream<Item = Result<StreamChunk>> {
    use futures_util::StreamExt;
    use tokio::io::AsyncBufReadExt;
    use tokio::io::BufReader;

    let stream = response.bytes_stream();

    async_stream::stream! {
        let mut buffer = String::new();
        let mut stream = stream;

        while let Some(chunk_result) = stream.next().await {
            match chunk_result {
                Ok(bytes) => {
                    buffer.push_str(&String::from_utf8_lossy(&bytes));
                    let lines: Vec<&str> = buffer.split('\n').collect();
                    buffer = lines.last().unwrap_or(&"").to_string();

                    for line in &lines[..lines.len().saturating_sub(1)] {
                        let line = line.trim();
                        if line.starts_with("data: ") {
                            let data = &line[6..];
                            if data == "[DONE]" {
                                yield Ok(StreamChunk {
                                    delta: String::new(),
                                    done: true,
                                    usage: None,
                                });
                                return;
                            }
                            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(data) {
                                let delta = parsed["choices"][0]["delta"]["content"]
                                    .as_str()
                                    .unwrap_or("")
                                    .to_string();
                                yield Ok(StreamChunk {
                                    delta,
                                    done: false,
                                    usage: None,
                                });
                            }
                        }
                    }
                }
                Err(e) => {
                    yield Err(anyhow::anyhow!("Stream error: {}", e));
                    return;
                }
            }
        }
    }
}
