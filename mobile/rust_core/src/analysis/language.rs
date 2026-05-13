//! Language detection using whatlang

use serde::{Deserialize, Serialize};
use whatlang::Lang;

/// Language detection result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LanguageResult {
    pub language: String,
    pub code: String,
    pub confidence: f64,
    pub script: String,
}

/// Detect the language of the given text
pub fn detect(text: &str) -> LanguageResult {
    let info = whatlang::detect(text);

    match info {
        Some(info) => {
            let lang_name = lang_to_name(info.lang());
            let code = lang_to_code(info.lang());
            let script = format!("{:?}", info.script());
            LanguageResult {
                language: lang_name,
                code,
                confidence: info.confidence() as f64 / 100.0,
                script,
            }
        }
        None => LanguageResult {
            language: "Unknown".into(),
            code: "un".into(),
            confidence: 0.0,
            script: "Unknown".into(),
        },
    }
}

/// Detect language and return only the code
pub fn detect_code(text: &str) -> String {
    detect(text).code
}

fn lang_to_name(lang: Lang) -> String {
    match lang {
        Lang::Eng => "English",
        Lang::Rus => "Russian",
        Lang::Cmn => "Chinese",
        Lang::Spa => "Spanish",
        Lang::Por => "Portuguese",
        Lang::Fra => "French",
        Lang::Deu => "German",
        Lang::Jpn => "Japanese",
        Lang::Kor => "Korean",
        Lang::Hin => "Hindi",
        Lang::Ara => "Arabic",
        Lang::Tur => "Turkish",
        Lang::Vie => "Vietnamese",
        Lang::Ita => "Italian",
        Lang::Tha => "Thai",
        Lang::Nld => "Dutch",
        Lang::Pol => "Polish",
        Lang::Ukr => "Ukrainian",
        Lang::Ben => "Bengali",
        Lang::Tam => "Tamil",
        _ => "Other",
    }.into()
}

fn lang_to_code(lang: Lang) -> String {
    match lang {
        Lang::Eng => "en",
        Lang::Rus => "ru",
        Lang::Cmn => "zh",
        Lang::Spa => "es",
        Lang::Port => "pt",
        Lang::Fra => "fr",
        Lang::Deu => "de",
        Lang::Jpn => "ja",
        Lang::Kor => "ko",
        Lang::Hin => "hi",
        Lang::Ara => "ar",
        Lang::Tur => "tr",
        Lang::Vie => "vi",
        Lang::Ita => "it",
        Lang::Tha => "th",
        Lang::Nld => "nl",
        Lang::Pol => "pl",
        Lang::Ukr => "uk",
        Lang::Ben => "bn",
        Lang::Tam => "ta",
        _ => "un",
    }.into()
}
