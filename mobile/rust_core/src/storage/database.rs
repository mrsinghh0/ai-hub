//! SQLite database management for AI Hub

use anyhow::Result;
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use once_cell::sync::Lazy;

static DB: Lazy<Mutex<Connection>> = Lazy::new(|| {
    let conn = Connection::open("aihub.db").expect("Failed to open database");
    Mutex::new(conn)
});

/// Initialize database tables
pub fn init_db() -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("DB lock error: {}", e))?;

    conn.execute_batch("
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            message_count INTEGER DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            conversation_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            image_url TEXT,
            sentiment_score REAL,
            language TEXT,
            tokens_used INTEGER DEFAULT 0,
            cost REAL DEFAULT 0.0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS memory_notes (
            id TEXT PRIMARY KEY,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL,
            category TEXT DEFAULT 'general',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS knowledge_documents (
            id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            source TEXT,
            tags TEXT,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS api_keys (
            provider TEXT PRIMARY KEY,
            encrypted_key TEXT NOT NULL,
            is_valid INTEGER DEFAULT 0,
            last_validated TEXT,
            added_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS user_preferences (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS usage_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            prompt_tokens INTEGER DEFAULT 0,
            completion_tokens INTEGER DEFAULT 0,
            total_tokens INTEGER DEFAULT 0,
            cost REAL DEFAULT 0.0,
            latency_ms INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        );
    ")?;

    Ok(())
}

// ---- Conversation CRUD ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub provider: String,
    pub model: String,
    pub created_at: String,
    pub updated_at: String,
    pub message_count: i32,
}

pub fn create_conversation(id: &str, title: &str, provider: &str, model: &str) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO conversations (id, title, provider, model, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, title, provider, model, now, now],
    )?;
    Ok(())
}

pub fn get_conversations() -> Result<Vec<Conversation>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, provider, model, created_at, updated_at, message_count FROM conversations ORDER BY updated_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(Conversation {
            id: row.get(0)?,
            title: row.get(1)?,
            provider: row.get(2)?,
            model: row.get(3)?,
            created_at: row.get(4)?,
            updated_at: row.get(5)?,
            message_count: row.get(6)?,
        })
    })?;
    let mut convs = Vec::new();
    for row in rows { convs.push(row?); }
    Ok(convs)
}

pub fn delete_conversation(id: &str) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    conn.execute("DELETE FROM messages WHERE conversation_id = ?1", [id])?;
    conn.execute("DELETE FROM conversations WHERE id = ?1", [id])?;
    Ok(())
}

// ---- Message CRUD ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub id: String,
    pub conversation_id: String,
    pub role: String,
    pub content: String,
    pub image_url: Option<String>,
    pub sentiment_score: Option<f64>,
    pub language: Option<String>,
    pub tokens_used: i32,
    pub cost: f64,
    pub created_at: String,
}

pub fn save_message(
    id: &str, conversation_id: &str, role: &str, content: &str,
    image_url: Option<&str>, sentiment_score: Option<f64>,
    language: Option<&str>, tokens_used: i32, cost: f64,
) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO messages (id, conversation_id, role, content, image_url, sentiment_score, language, tokens_used, cost, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
        rusqlite::params![id, conversation_id, role, content, image_url, sentiment_score, language, tokens_used, cost, now],
    )?;
    conn.execute(
        "UPDATE conversations SET updated_at = ?1, message_count = message_count + 1 WHERE id = ?2",
        rusqlite::params![now, conversation_id],
    )?;
    Ok(())
}

pub fn get_messages(conversation_id: &str) -> Result<Vec<Message>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, conversation_id, role, content, image_url, sentiment_score, language, tokens_used, cost, created_at
         FROM messages WHERE conversation_id = ?1 ORDER BY created_at ASC"
    )?;
    let rows = stmt.query_map([conversation_id], |row| {
        Ok(Message {
            id: row.get(0)?, conversation_id: row.get(1)?, role: row.get(2)?,
            content: row.get(3)?, image_url: row.get(4)?, sentiment_score: row.get(5)?,
            language: row.get(6)?, tokens_used: row.get(7)?, cost: row.get(8)?,
            created_at: row.get(9)?,
        })
    })?;
    let mut msgs = Vec::new();
    for row in rows { msgs.push(row?); }
    Ok(msgs)
}

// ---- Memory CRUD ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryNote {
    pub id: String,
    pub key: String,
    pub value: String,
    pub category: String,
    pub created_at: String,
    pub updated_at: String,
}

pub fn save_memory(id: &str, key: &str, value: &str, category: &str) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO memory_notes (id, key, value, category, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        rusqlite::params![id, key, value, category, now, now],
    )?;
    Ok(())
}

pub fn get_memories() -> Result<Vec<MemoryNote>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, key, value, category, created_at, updated_at FROM memory_notes ORDER BY updated_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(MemoryNote {
            id: row.get(0)?, key: row.get(1)?, value: row.get(2)?,
            category: row.get(3)?, created_at: row.get(4)?, updated_at: row.get(5)?,
        })
    })?;
    let mut notes = Vec::new();
    for row in rows { notes.push(row?); }
    Ok(notes)
}

pub fn delete_memory(id: &str) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    conn.execute("DELETE FROM memory_notes WHERE id = ?1", [id])?;
    Ok(())
}

// ---- Knowledge CRUD ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KnowledgeDocument {
    pub id: String,
    pub title: String,
    pub content: String,
    pub source: Option<String>,
    pub tags: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

pub fn save_knowledge(id: &str, title: &str, content: &str, source: Option<&str>, tags: Option<&str>) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT OR REPLACE INTO knowledge_documents (id, title, content, source, tags, created_at, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        rusqlite::params![id, title, content, source, tags, now, now],
    )?;
    Ok(())
}

pub fn get_knowledge_documents() -> Result<Vec<KnowledgeDocument>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, title, content, source, tags, created_at, updated_at FROM knowledge_documents ORDER BY updated_at DESC"
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(KnowledgeDocument {
            id: row.get(0)?, title: row.get(1)?, content: row.get(2)?,
            source: row.get(3)?, tags: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
        })
    })?;
    let mut docs = Vec::new();
    for row in rows { docs.push(row?); }
    Ok(docs)
}

pub fn delete_knowledge(id: &str) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    conn.execute("DELETE FROM knowledge_documents WHERE id = ?1", [id])?;
    Ok(())
}

/// RAG: search knowledge base by keywords
pub fn search_knowledge(query: &str, limit: usize) -> Result<Vec<KnowledgeDocument>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let pattern = format!("%{}%", query.to_lowercase());
    let mut stmt = conn.prepare(
        "SELECT id, title, content, source, tags, created_at, updated_at FROM knowledge_documents
         WHERE LOWER(title) LIKE ?1 OR LOWER(content) LIKE ?1 OR LOWER(tags) LIKE ?1
         ORDER BY updated_at DESC LIMIT ?2"
    )?;
    let rows = stmt.query_map(rusqlite::params![pattern, limit as i64], |row| {
        Ok(KnowledgeDocument {
            id: row.get(0)?, title: row.get(1)?, content: row.get(2)?,
            source: row.get(3)?, tags: row.get(4)?, created_at: row.get(5)?, updated_at: row.get(6)?,
        })
    })?;
    let mut docs = Vec::new();
    for row in rows { docs.push(row?); }
    Ok(docs)
}

// ---- Usage Stats ----

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsageStat {
    pub id: i64,
    pub provider: String,
    pub model: String,
    pub prompt_tokens: i32,
    pub completion_tokens: i32,
    pub total_tokens: i32,
    pub cost: f64,
    pub latency_ms: i32,
    pub created_at: String,
}

pub fn record_usage(provider: &str, model: &str, prompt_tokens: i32, completion_tokens: i32, cost: f64, latency_ms: i32) -> Result<()> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let now = chrono::Utc::now().to_rfc3339();
    conn.execute(
        "INSERT INTO usage_stats (provider, model, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, created_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        rusqlite::params![provider, model, prompt_tokens, completion_tokens, prompt_tokens + completion_tokens, cost, latency_ms, now],
    )?;
    Ok(())
}

pub fn get_usage_stats(limit: usize) -> Result<Vec<UsageStat>> {
    let conn = DB.lock().map_err(|e| anyhow::anyhow!("{}", e))?;
    let mut stmt = conn.prepare(
        "SELECT id, provider, model, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, created_at
         FROM usage_stats ORDER BY created_at DESC LIMIT ?1"
    )?;
    let rows = stmt.query_map([limit as i64], |row| {
        Ok(UsageStat {
            id: row.get(0)?, provider: row.get(1)?, model: row.get(2)?,
            prompt_tokens: row.get(3)?, completion_tokens: row.get(4)?,
            total_tokens: row.get(5)?, cost: row.get(6)?, latency_ms: row.get(7)?,
            created_at: row.get(8)?,
        })
    })?;
    let mut stats = Vec::new();
    for row in rows { stats.push(row?); }
    Ok(stats)
}
