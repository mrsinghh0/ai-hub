//! AFINN-based sentiment analysis engine
//!
//! Scores text from -5 (very negative) to +5 (very positive)

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// Sentiment analysis result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SentimentResult {
    pub score: f64,
    pub magnitude: f64,
    pub label: SentimentLabel,
    pub positive_words: Vec<String>,
    pub negative_words: Vec<String>,
}

/// Sentiment classification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum SentimentLabel {
    VeryNegative,
    Negative,
    Neutral,
    Positive,
    VeryPositive,
}

/// AFINN-165 word list (subset — extend for production)
fn get_afinn_lexicon() -> HashMap<&'static str, f64> {
    let mut map = HashMap::new();
    // Positive words
    for word in &["good", "great", "excellent", "amazing", "wonderful", "fantastic",
        "love", "happy", "joy", "beautiful", "awesome", "perfect", "best", "brilliant",
        "superb", "outstanding", "magnificent", "delightful", "pleasant", "nice",
        "positive", "success", "win", "hope", "agree", "like", "enjoy", "fun",
        "helpful", "friendly", "kind", "generous", "clever", "smart", "innovative",
        "impressive", "remarkable", "incredible", "exceptional", "marvelous"] {
        map.insert(*word, 3.0);
    }
    // Stronger positive
    for word in &["love", "amazing", "excellent", "outstanding", "magnificent"] {
        map.insert(*word, 4.0);
    }
    // Negative words
    for word in &["bad", "terrible", "horrible", "awful", "poor", "hate", "angry",
        "sad", "ugly", "worse", "worst", "disgusting", "dreadful", "miserable",
        "unpleasant", "negative", "fail", "lose", "fear", "disagree", "dislike",
        "boring", "annoying", "stupid", "wrong", "error", "problem", "issue",
        "broken", "useless", "waste", "disappointing", "frustrating", "painful"] {
        map.insert(*word, -3.0);
    }
    // Stronger negative
    for word in &["terrible", "horrible", "awful", "disgusting", "dreadful"] {
        map.insert(*word, -4.0);
    }
    // Mild
    map.insert("okay", 0.5);
    map.insert("fine", 0.5);
    map.insert("maybe", 0.0);
    map
}

/// Analyze sentiment of text
pub fn analyze(text: &str) -> SentimentResult {
    let lexicon = get_afinn_lexicon();
    let words: Vec<&str> = text.to_lowercase()
        .split_whitespace()
        .map(|w| w.trim_matches(|c: char| !c.is_alphanumeric()))
        .collect();

    let mut total_score = 0.0;
    let mut positive_words = Vec::new();
    let mut negative_words = Vec::new();

    for word in &words {
        if let Some(&score) = lexicon.get(word) {
            total_score += score;
            if score > 0.0 {
                positive_words.push(word.to_string());
            } else if score < 0.0 {
                negative_words.push(word.to_string());
            }
        }
    }

    let word_count = words.len().max(1) as f64;
    let normalized_score = (total_score / word_count) * 5.0; // Scale to -5..+5
    let magnitude = total_score.abs();

    let label = match normalized_score {
        s if s <= -3.0 => SentimentLabel::VeryNegative,
        s if s <= -1.0 => SentimentLabel::Negative,
        s if s < 1.0 => SentimentLabel::Neutral,
        s if s < 3.0 => SentimentLabel::Positive,
        _ => SentimentLabel::VeryPositive,
    };

    SentimentResult {
        score: normalized_score.clamp(-5.0, 5.0),
        magnitude,
        label,
        positive_words,
        negative_words,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_positive_sentiment() {
        let result = analyze("This is an amazing and wonderful experience");
        assert!(result.score > 0.0);
        assert!(result.label == SentimentLabel::Positive || result.label == SentimentLabel::VeryPositive);
    }

    #[test]
    fn test_negative_sentiment() {
        let result = analyze("This is terrible and awful");
        assert!(result.score < 0.0);
        assert!(result.label == SentimentLabel::Negative || result.label == SentimentLabel::VeryNegative);
    }

    #[test]
    fn test_neutral_sentiment() {
        let result = analyze("The sky is blue");
        assert_eq!(result.label, SentimentLabel::Neutral);
    }
}
