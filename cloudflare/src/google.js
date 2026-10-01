const TRANSLATE_URL = "https://translate.google.com/_/TranslateWebserverUi/data/batchexecute?rpcids=MkEWBc&rt=c";
const SPEECH_URL = "https://translate.google.com/translate_tts";

export class GoogleResponseError extends Error {}

export async function translateWithGoogle(text, source, target) {
  const inner = JSON.stringify([[text, source, target, true], [null]]);
  const request = [[['MkEWBc', inner, null, 'generic']]];
  const response = await fetch(TRANSLATE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `f.req=${encodeURIComponent(JSON.stringify(request))}`,
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`Google translation returned HTTP ${response.status}`);

  const raw = await response.text();
  const frame = /\n\d+\n/.exec(raw);
  if (!frame) throw new GoogleResponseError("Google translation returned an invalid frame");
  const line = raw.slice(frame.index + frame[0].length).split("\n", 1)[0];
  let payload;
  try {
    const outer = JSON.parse(line);
    if (outer?.[0]?.[1] !== "MkEWBc") throw new Error("Unexpected RPC identifier");
    payload = JSON.parse(outer[0][2]);
  } catch {
    throw new GoogleResponseError("Google translation returned an invalid payload");
  }

  const segments = payload?.[1]?.[0]?.[0]?.[5];
  const detectedSource = payload?.[2];
  if (!Array.isArray(segments) || !segments.length || segments.some((segment) => typeof segment?.[0] !== "string") || typeof detectedSource !== "string") {
    throw new GoogleResponseError("Google translation returned no usable text");
  }
  const translation = segments.map((segment) => segment[0]).join(target === "zh" || target === "ja" ? "" : " ");
  if (!translation.trim()) throw new GoogleResponseError("Google translation returned no usable text");
  return { translation, detectedSource };
}

function speechChunks(text) {
  const words = text.trim().split(/\s+/u);
  const chunks = [];
  let chunk = "";
  for (const word of words) {
    for (let offset = 0; offset < word.length; offset += 180) {
      const part = word.slice(offset, offset + 180);
      const next = chunk ? `${chunk} ${part}` : part;
      if (next.length > 180) {
        chunks.push(chunk);
        chunk = part;
      } else {
        chunk = next;
      }
    }
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export async function speechWithGoogle(text, language) {
  const parts = [];
  let size = 0;
  for (const chunk of speechChunks(text)) {
    const url = new URL(SPEECH_URL);
    url.search = new URLSearchParams({ tl: language, q: chunk, client: "tw-ob" });
    const response = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    if (!response.ok) throw new Error(`Google speech returned HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length < 3 || (bytes[0] !== 0xff || (bytes[1] & 0xe0) !== 0xe0) && String.fromCharCode(...bytes.slice(0, 3)) !== "ID3") {
      throw new GoogleResponseError("Google speech returned invalid audio");
    }
    parts.push(bytes);
    size += bytes.length;
  }
  const audio = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) {
    audio.set(part, offset);
    offset += part.length;
  }
  return audio;
}
