/**
 * ClipForge AI — Lightweight language detection for transcripts.
 * Uses Unicode ranges + common-word frequency. No external dependency.
 */
import { SUPPORTED_LANGS } from "./terms.js";

const COMMON_WORDS = {
  en: ["the", "and", "is", "to", "of", "you", "that", "it", "in", "for"],
  ar: ["في", "من", "على", "إلى", "أن", "هذا", "هذه", "التي", "الذي", "كان"],
  es: ["el", "la", "de", "que", "y", "en", "un", "es", "por", "con"],
  fr: ["le", "la", "de", "et", "est", "un", "une", "que", "pour", "dans"],
};

export function detectLanguage(text) {
  if (!text || !text.trim()) return "en";

  const sample = text.slice(0, 4000).toLowerCase();
  const total = sample.length || 1;

  // 1) Strong signal: Arabic script ratio.
  const arabicChars = (sample.match(/[\u0600-\u06FF]/g) || []).length;
  if (arabicChars / total > 0.3) return "ar";

  // 2) Latin languages: score by common-word hits.
  const words = sample.split(/\s+/).filter(Boolean);
  const scores = {};
  for (const lang of SUPPORTED_LANGS) {
    if (lang === "ar") continue;
    const list = COMMON_WORDS[lang] || [];
    let hits = 0;
    for (const w of words) if (list.includes(w)) hits++;
    scores[lang] = hits / Math.max(1, words.length);
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  // Require a minimal signal; otherwise fall back to English.
  if (best && best[1] > 0.03) return best[0];
  return "en";
}

export function getTermsFor(lang) {
  return SUPPORTED_LANGS.includes(lang) ? lang : null;
}
