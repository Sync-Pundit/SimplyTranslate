import { page } from "./page.js";
import { renderDocsPage } from "./docs.js";
import { OPENAI_MODEL, translateWithOpenAI } from "./openai.js";
import { GoogleResponseError, speechWithGoogle, translateWithGoogle } from "./google.js";

const SPEECH_LANGUAGES = new Set(["en", "es", "fr"]);
const ZULU_ENGLISH_GLOSSARY = [
  { word: /\bmoni\b/i, source: "moni", target: "sinner" },
  { word: /\bcava\s+wenzani\b/i, source: "cava wenzani?", target: "So, what are you doing? (neutral reading without wider context)" },
  { word: /\bcava\b/i, source: "cava", target: "so (a Kasi Tali cue when opening a short question)" },
  { word: /\bkanti\b/i, source: "kanti", target: "but or so (discourse marker; keep it in the translation)" },
  { word: /\bwenzani\b/i, source: "wenzani", target: "what are you doing" },
  { word: /\bbafo\b/i, source: "bafo", target: "brother (informal address)" },
  { word: /\bushuni\s+wenkabi\b/i, source: "ushuni wenkabi", target: "the hitman's style (colloquial phrase; do not render it as the hitman's tune)" },
  { word: /\bushuni\b/i, source: "ushuni", target: "a tune; also a style, rhythm, or vibe in context" },
  { word: /\bwenkabi\b/i, source: "wenkabi", target: "of the ox literally; of the hitman in slang" },
  { word: /\bwazini\b/i, source: "wazini", target: "what do you know" },
  { word: /\bngempilo\b/i, source: "ngempilo", target: "about life or health (life when followed by a place)" },
  { word: /\byaseGoli\b/i, source: "yaseGoli", target: "in Goli (keep the colloquial place name Goli)" },
];
const HITMAN_STYLE_PHRASE = /\bushuni\s+wenkabi\b/i;

function zuluHints(text) {
  const matches = ZULU_ENGLISH_GLOSSARY.filter(({ word }) => word.test(text));
  return HITMAN_STYLE_PHRASE.test(text)
    ? matches.filter(({ source }) => source !== "ushuni" && source !== "wenkabi")
    : matches;
}

const LANGUAGES = Object.freeze({
  en: "English",
  af: "Afrikaans",
  zu: "Zulu",
  xh: "Xhosa",
  nr: "South Ndebele",
  nso: "Northern Sotho",
  ss: "Swati",
  st: "Southern Sotho",
  tn: "Setswana",
  ts: "Tsonga",
  ve: "Venda",
  am: "Amharic",
  ha: "Hausa",
  ig: "Igbo",
  rw: "Kinyarwanda",
  ln: "Lingala",
  lg: "Luganda",
  mg: "Malagasy",
  ny: "Nyanja",
  om: "Oromo",
  sn: "Shona",
  so: "Somali",
  sw: "Swahili",
  wo: "Wolof",
  yo: "Yoruba",
  ar: "Arabic",
  bn: "Bengali",
  zh: "Chinese",
  fr: "French",
  de: "German",
  hi: "Hindi",
  it: "Italian",
  ja: "Japanese",
  ko: "Korean",
  ms: "Malay",
  mr: "Marathi",
  fa: "Persian",
  pt: "Portuguese",
  ru: "Russian",
  es: "Spanish",
  tl: "Tagalog",
  th: "Thai",
  tr: "Turkish",
  ur: "Urdu",
  vi: "Vietnamese",
});
const CODES = Object.keys(LANGUAGES);

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function html(markup) {
  return new Response(markup, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function fail(error, message, status) {
  return json({ error, message }, status);
}

function normalizeLanguage(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().toLowerCase();
  if (Object.hasOwn(LANGUAGES, candidate)) return candidate;
  return CODES.find((code) => LANGUAGES[code].toLowerCase() === candidate) || null;
}

function normalizeEngine(value) {
  if (value == null || value === "" || value === "google" || value === "cloudflare") return "google";
  return value === "openai" ? "openai" : null;
}

function normalizeGoogleSource(value) {
  if (typeof value !== "string") return null;
  const aliases = { "zh-cn": "zh", "zh-tw": "zh", fil: "tl", "pt-br": "pt", "pt-pt": "pt" };
  return normalizeLanguage(aliases[value.toLowerCase()] || value);
}

async function parameters(request) {
  if (request.method === "GET") return new URL(request.url).searchParams;
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.startsWith("application/x-www-form-urlencoded") || contentType.startsWith("multipart/form-data")) {
    return await request.formData();
  }
  if (contentType.startsWith("application/json")) {
    const value = await request.json();
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return { get: (key) => value[key] };
    }
  }
  return null;
}

async function translate(request, env) {
  let values;
  try {
    values = await parameters(request);
  } catch {
    return fail("invalid_request", "Could not read the translation request.", 400);
  }
  if (!values) return fail("invalid_request", "Send query, form, or JSON parameters.", 400);

  const engineValue = values.get("engine");
  if (engineValue === "libre") {
    return fail("engine_unavailable", "Libre is disabled in this preview.", 503);
  }
  const engine = normalizeEngine(engineValue);
  if (!engine) return fail("unsupported_engine", "Choose Google Translate or OpenAI.", 400);
  const openAIKey = typeof env.OPENAI_API_KEY === "string" ? env.OPENAI_API_KEY.trim() : "";
  if (engine === "openai" && !openAIKey) return fail("engine_unavailable", "OpenAI is not configured.", 503);

  const input = values.get("text");
  if (typeof input !== "string" || !input.trim()) {
    return fail("invalid_text", "Enter text to translate.", 400);
  }

  const sourceValue = values.get("from");
  const automatic = sourceValue == null || sourceValue === "" || String(sourceValue).toLowerCase() === "auto";
  let source = automatic ? null : normalizeLanguage(sourceValue);
  const target = normalizeLanguage(values.get("to") ?? "en");
  if ((!automatic && !source) || !target) {
    return fail("unsupported_language", "Choose a language listed by this preview.", 422);
  }
  if (source === target) {
    return json({ "translated-text": input, source, target, engine });
  }

  let result;
  let providerSource;
  try {
    if (engine === "openai") {
      const matches = zuluHints(input);
      const modelSource = automatic && (matches.length >= 2 || HITMAN_STYLE_PHRASE.test(input)) ? "zu" : source;
      const hints = target === "en" && (modelSource === "zu" || automatic) ? matches : [];
      const openAIResult = await translateWithOpenAI(input, modelSource, target, LANGUAGES, openAIKey, hints);
      if (automatic) {
        source = openAIResult?.source;
        if (modelSource && source !== modelSource) {
          return fail("invalid_detection_response", "Could not detect the language. Choose it manually and try again.", 502);
        }
        if (source === "und") {
          return fail("language_not_detected", "Could not identify a supported language. Choose the source language manually.", 422);
        }
        if (!CODES.includes(source)) {
          return fail("invalid_detection_response", "Could not detect the language. Choose it manually and try again.", 502);
        }
      } else if (openAIResult?.source !== source) {
        return fail("invalid_engine_response", "The translation engine returned an unexpected source language.", 502);
      }
      result = source === target ? input : openAIResult?.translation;
    } else {
      const google = await translateWithGoogle(input, automatic ? "auto" : source, target);
      result = google.translation;
      providerSource = normalizeGoogleSource(google.detectedSource);
      if (automatic) {
        if (!providerSource) {
          return fail("language_not_detected", "Could not identify a supported language. Choose the source language manually.", 422);
        }
        source = providerSource;
      }
    }
  } catch (error) {
    if (error instanceof GoogleResponseError) return fail("invalid_engine_response", "The translation engine returned invalid text.", 502);
    return fail("engine_unavailable", "Translation is unavailable. Try again later.", 503);
  }

  if (typeof result !== "string" || !result.trim()) {
    return fail("invalid_engine_response", "The translation engine returned no text.", 502);
  }

  const answer = { "translated-text": result, source, target, engine };
  if (engine === "google" && !automatic && providerSource && providerSource !== source) {
    answer.provider_source = providerSource;
  }
  return json(answer);
}

async function speech(request) {
  const url = new URL(request.url);
  const text = url.searchParams.get("text");
  const language = normalizeLanguage(url.searchParams.get("lang"));
  if (!text?.trim()) return fail("invalid_text", "Enter text to hear.", 400);
  if (!language) return fail("unsupported_language", "Choose a supported language.", 422);
  if (!SPEECH_LANGUAGES.has(language)) {
    return fail("speech_language_unavailable", "Speech is available for English, French, and Spanish.", 422);
  }
  try {
    return audioResponse(await speechWithGoogle(text, language));
  } catch (error) {
    if (error instanceof GoogleResponseError) return fail("invalid_engine_response", "The speech engine returned invalid audio.", 502);
    return fail("engine_unavailable", "Speech is unavailable. Try again later.", 503);
  }
}

function audioResponse(bytes) {
  const wav = bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WAVE";
  const mp3 = bytes.length >= 3 && (String.fromCharCode(...bytes.slice(0, 3)) === "ID3" || (bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0));
  if (!wav && !mp3) return fail("invalid_engine_response", "The speech engine returned invalid audio.", 502);
  return new Response(bytes, { headers: { "Content-Type": wav ? "audio/wav" : "audio/mpeg", "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
}

export async function handleRequest(request, env = {}) {
  const url = new URL(request.url);

  if (url.pathname === "/" && request.method === "GET") {
    return html(page);
  }

  if ((url.pathname === "/docs" || url.pathname === "/docs/") && request.method === "GET") {
    return html(renderDocsPage(LANGUAGES, typeof env.OPENAI_API_KEY === "string" && Boolean(env.OPENAI_API_KEY.trim())));
  }

  if (url.pathname === "/api/health/" && request.method === "GET") {
    const openAIConfigured = typeof env.OPENAI_API_KEY === "string" && Boolean(env.OPENAI_API_KEY.trim());
    return json({ ok: true, engine: "google", translation_provider: "google-rpc", speech_provider: "google-tts", openai_available: openAIConfigured, openai_model: openAIConfigured ? OPENAI_MODEL : null });
  }

  if (url.pathname === "/api/capabilities/" && request.method === "GET") {
    return json({ automatic_source_detection: true, speech_languages: [...SPEECH_LANGUAGES] });
  }

  if ((url.pathname === "/api/source_languages/" || url.pathname === "/api/target_languages/") && request.method === "GET") {
    const engine = url.searchParams.get("engine");
    if (engine === "libre") return fail("engine_unavailable", "Libre is disabled in this preview.", 503);
    if (!normalizeEngine(engine)) return fail("unsupported_engine", "Choose Google Translate or OpenAI.", 400);
    const codes = url.pathname === "/api/source_languages/" ? ["auto", ...CODES] : CODES;
    return new Response(codes.map((code) => `${code === "auto" ? "Detect language" : LANGUAGES[code]}\n${code}\n`).join(""), {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }

  if (url.pathname === "/api/translate/" && (request.method === "GET" || request.method === "POST")) {
    return translate(request, env);
  }

  if (url.pathname === "/api/tts/" && request.method === "GET") return speech(request);

  return fail("not_found", "Route not found.", 404);
}

export default { fetch: handleRequest };
