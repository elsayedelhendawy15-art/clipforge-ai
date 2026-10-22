/**
 * ClipForge AI — Multilingual keyword sets for heuristic scoring.
 * Add new languages by extending the `terms` object below.
 */
export const SUPPORTED_LANGS = ["en", "ar", "es", "fr"];

export const terms = {
  en: {
    question: /\?|\b(what|why|how|who|when|where|which|ever wondered|ask yourself)\b/i,
    emotion: /\b(shocking|surprising|scary|crazy|love|hate|fear|mistake|fail|win|changed|secret|worst|best|amazing|terrible|never|nobody|everyone|finally|breakthrough)\b/i,
    hook: /\b(here'?s|this is|the truth|the biggest|one thing|let me tell you|listen|stop|if you|most people|nobody tells you|the reason)\b/i,
    payoff: /\b(because|so|that means|the result|which is why|in the end|here'?s why|that'?s how|lesson|changed)\b/i,
    number: /\b\d+\b/,
  },
  ar: {
    question: /\?|؟|\b(ما|ماذا|لماذا|كيف|من|متى|أين|أي|هل تعلم|اسأل نفسك)\b/,
    emotion: /\b(صادم|مفاجئ|مخيف|جنون|حب|كره|خوف|خطأ|فشل|فوز|تغيير|سر|أسوأ|أفضل|مذهل|فظيع|أبداً|لا أحد|الجميع|أخيراً|اختراق)\b/,
    hook: /\b(إليك|هذا هو|الحقيقة|أكبر|شيء واحد|دعني أخبرك|اسمع|توقف|إذا كنت|معظم الناس|لا أحد يخبرك|السبب)\b/,
    payoff: /\b(لأن|لذلك|هذا يعني|النتيجة|وهذا لماذا|في النهاية|إليك لماذا|هكذا|الدرس|تغيّر)\b/,
    number: /[\d٠-٩]+/,
  },
  es: {
    question: /\?|¿|\b(qué|por qué|cómo|quién|cuándo|dónde|cuál|alguna vez|pregúntate)\b/i,
    emotion: /\b(impactante|sorprendente|aterrador|loco|amor|odio|miedo|error|fracaso|ganar|cambió|secreto|peor|mejor|increíble|terrible|nunca|nadie|todos|finalmente|avance)\b/i,
    hook: /\b(aquí está|esto es|la verdad|el mayor|una cosa|déjame decirte|escucha|para|si tú|la mayoría de la gente|nadie te dice|la razón)\b/i,
    payoff: /\b(porque|así que|eso significa|el resultado|por eso|al final|aquí está por qué|así es como|lección|cambió)\b/i,
    number: /\b\d+\b/,
  },
  fr: {
    question: /\?|\b(quoi|pourquoi|comment|qui|quand|où|quel|tu t'es déjà demandé|demande-toi)\b/i,
    emotion: /\b(choquant|surprenant|effrayant|fou|amour|haine|peur|erreur|échec|gagner|changé|secret|pire|meilleur|incroyable|terrible|jamais|personne|tout le monde|enfin|percée)\b/i,
    hook: /\b(voici|voilà|la vérité|le plus grand|une chose|laisse-moi te dire|écoute|arrête|si tu|la plupart des gens|personne ne te dit|la raison)\b/i,
    payoff: /\b(parce que|donc|ça veut dire|le résultat|ce qui explique|à la fin|voici pourquoi|c'est comme ça|leçon|changé)\b/i,
    number: /\b\d+\b/,
  },
};

/** Fallback: generic patterns that work for any language. */
export const genericTerms = {
  question: /\?|؟/,
  emotion: null,
  hook: null,
  payoff: null,
  number: /[\d٠-٩]+/,
};
