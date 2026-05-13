//! AI Hub Core Engine
//!
//! This library provides the backend logic for the AI Hub mobile app,
//! including multi-provider AI API integration, sentiment analysis,
//! language detection, and persistent storage.

pub mod api;
pub mod providers;
pub mod analysis;
pub mod storage;

use anyhow::Result;

/// Initialize the core engine — call once at app startup.
pub fn init() -> Result<()> {
    storage::init_db()?;
    log::info!("AI Hub Core Engine initialized");
    Ok(())
}

/// Health check for the core engine.
pub fn health_check() -> String {
    format!("AI Hub Core v{} — OK", env!("CARGO_PKG_VERSION"))
}
