export interface LanguageResult {
  code: string;
  name: string;
  confidence: number;
}

const LANGUAGE_PATTERNS: Array<{ pattern: RegExp; code: string; name: string }> = [
  // CJK
  { pattern: /[\u4e00-\u9fff]/, code: 'zh', name: 'Chinese' },
  { pattern: /[\u3040-\u309f\u30a0-\u30ff]/, code: 'ja', name: 'Japanese' },
  { pattern: /[\uac00-\ud7af]/, code: 'ko', name: 'Korean' },
  // Arabic
  { pattern: /[\u0600-\u06ff]/, code: 'ar', name: 'Arabic' },
  // Devanagari
  { pattern: /[\u0900-\u097f]/, code: 'hi', name: 'Hindi' },
  // Cyrillic
  { pattern: /[\u0400-\u04ff]/, code: 'ru', name: 'Russian' },
  // Thai
  { pattern: /[\u0e00-\u0e7f]/, code: 'th', name: 'Thai' },
  // Hebrew
  { pattern: /[\u0590-\u05ff]/, code: 'he', name: 'Hebrew' },
  // Bengali
  { pattern: /[\u0980-\u09ff]/, code: 'bn', name: 'Bengali' },
  // Tamil
  { pattern: /[\u0b80-\u0bff]/, code: 'ta', name: 'Tamil' },
];

const COMMON_WORDS: Record<string, string[]> = {
  en: ['the', 'is', 'and', 'you', 'that', 'have', 'for', 'not', 'with', 'this', 'but', 'are', 'from', 'they', 'was'],
  es: ['el', 'la', 'los', 'las', 'que', 'de', 'en', 'y', 'por', 'con', 'para', 'no', 'una', 'es', 'se'],
  fr: ['le', 'la', 'les', 'de', 'des', 'en', 'et', 'que', 'pour', 'dans', 'un', 'une', 'est', 'pas', 'sur'],
  de: ['der', 'die', 'das', 'und', 'ist', 'ein', 'eine', 'nicht', 'mit', 'auf', 'für', 'von', 'es', 'sich', 'auch'],
  pt: ['o', 'a', 'os', 'as', 'de', 'em', 'que', 'e', 'para', 'com', 'um', 'uma', 'não', 'por', 'mais'],
  it: ['il', 'la', 'lo', 'le', 'gli', 'di', 'in', 'che', 'e', 'per', 'un', 'una', 'è', 'non', 'con'],
  nl: ['de', 'het', 'een', 'van', 'en', 'in', 'dat', 'voor', 'met', 'op', 'zijn', 'niet', 'aan', 'ook', 'als'],
};

export function detectLanguage(text: string): LanguageResult {
  // Check for non-Latin scripts first
  for (const { pattern, code, name } of LANGUAGE_PATTERNS) {
    const matches = text.match(new RegExp(pattern.source, 'g'));
    if (matches && matches.length >= 2) {
      return { code, name, confidence: 0.9 };
    }
  }

  // For Latin script, use common word matching
  const lowerWords = text.toLowerCase().split(/\s+/);
  let bestLang = 'en';
  let bestScore = 0;

  for (const [lang, words] of Object.entries(COMMON_WORDS)) {
    let score = 0;
    for (const word of words) {
      if (lowerWords.includes(word)) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  const langNames: Record<string, string> = {
    en: 'English', es: 'Spanish', fr: 'French', de: 'German',
    pt: 'Portuguese', it: 'Italian', nl: 'Dutch',
  };

  return {
    code: bestLang,
    name: langNames[bestLang] || bestLang,
    confidence: Math.min(bestScore / 5, 1),
  };
}

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'it', name: 'Italian' },
  { code: 'nl', name: 'Dutch' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'th', name: 'Thai' },
  { code: 'bn', name: 'Bengali' },
  { code: 'ta', name: 'Tamil' },
  { code: 'he', name: 'Hebrew' },
];
