import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

function request(path, init) {
  return new Request(`https://translate.example${path}`, init);
}

function googleFrame(translation, source = "en") {
  const entry = [];
  entry[5] = [[translation]];
  const payload = [null, [[entry]], source];
  const outer = [["wrb.fr", "MkEWBc", JSON.stringify(payload), null]];
  const frame = JSON.stringify(outer);
  return new Response(`)]}'\n\n${frame.length}\n${frame}\n100\n[["extra"]]`, {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function mockGoogle(t, answer = "Bonjour", source = "en") {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    return googleFrame(answer, source);
  });
  return calls;
}

test("form requests use the Google RPC and retain the translated-text API field", async (t) => {
  const calls = mockGoogle(t);
  const response = await handleRequest(request("/api/translate/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ engine: "google", text: "Hello", from: "English", to: "fr" }),
  }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    "translated-text": "Bonjour", source: "en", target: "fr", engine: "google",
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /translate\.google\.com\/.*batchexecute/);
  assert.equal(calls[0].options.method, "POST");
  const encoded = new URLSearchParams(calls[0].options.body).get("f.req");
  const rpc = JSON.parse(encoded);
  assert.equal(rpc[0][0][0], "MkEWBc");
  assert.deepEqual(JSON.parse(rpc[0][0][1])[0], ["Hello", "en", "fr", true]);
});

test("automatic detection uses one Google request and returns its source", async (t) => {
  const calls = mockGoogle(t, "Hello, how are you?", "fr");
  const response = await handleRequest(request("/api/translate/?text=Bonjour%2C%20comment%20allez-vous%3F&from=auto&to=en"));
  assert.deepEqual(await response.json(), {
    "translated-text": "Hello, how are you?", source: "fr", target: "en", engine: "google",
  });
  assert.equal(calls.length, 1);
  const rpc = JSON.parse(new URLSearchParams(calls[0].options.body).get("f.req"));
  assert.equal(JSON.parse(rpc[0][0][1])[0][1], "auto");
});

test("JSON and multipart clients keep the translation contract", async (t) => {
  const calls = mockGoogle(t, "Hola", "en");
  const jsonResponse = await handleRequest(request("/api/translate/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello", from: "en", to: "es" }),
  }));
  assert.equal(jsonResponse.status, 200);
  assert.equal((await jsonResponse.json())["translated-text"], "Hola");

  const form = new FormData();
  form.set("text", "Hello");
  form.set("from", "en");
  form.set("to", "es");
  const multipartResponse = await handleRequest(request("/api/translate/", { method: "POST", body: form }));
  assert.equal(multipartResponse.status, 200);
  assert.equal((await multipartResponse.json()).engine, "google");
  assert.equal(calls.length, 2);
});

test("explicit Swati stays selected when Google interprets the text as Zulu", async (t) => {
  mockGoogle(t, "An investigation has been launched.", "zu");
  const response = await handleRequest(request("/api/translate/?text=Kusungulwe%20luphenyo&from=ss&to=en"));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    "translated-text": "An investigation has been launched.", source: "ss", target: "en", engine: "google", provider_source: "zu",
  });
});

test("a supported language mismatch reports what Google inferred", async (t) => {
  mockGoogle(t, "Hello", "zu");
  const response = await handleRequest(request("/api/translate/?text=Molo&from=xh&to=en"));
  assert.deepEqual(await response.json(), {
    "translated-text": "Hello", source: "xh", target: "en", engine: "google", provider_source: "zu",
  });
});

test("an unsupported automatic detection asks for manual source selection", async (t) => {
  mockGoogle(t, "Hello", "und");
  const response = await handleRequest(request("/api/translate/?text=Bonjour&from=auto&to=en"));
  assert.equal(response.status, 422);
  assert.equal((await response.json()).error, "language_not_detected");
});

test("language aliases from Google map to existing menu codes", async (t) => {
  mockGoogle(t, "Hello", "fil");
  const response = await handleRequest(request("/api/translate/?text=Kumusta&from=auto&to=en"));
  assert.equal((await response.json()).source, "tl");
});

test("all retained language choices remain in the discovery routes", async () => {
  const sources = await (await handleRequest(request("/api/source_languages/"))).text();
  const targets = await (await handleRequest(request("/api/target_languages/"))).text();
  for (const [name, code] of [["Zulu", "zu"], ["Xhosa", "xh"], ["Wolof", "wo"], ["Igbo", "ig"], ["Luganda", "lg"], ["Northern Sotho", "nso"], ["Swati", "ss"], ["Venda", "ve"], ["Tsonga", "ts"], ["South Ndebele", "nr"], ["Arabic", "ar"], ["Japanese", "ja"]]) {
    assert.match(sources, new RegExp(`\\n${name}\\n${code}\\n`));
    assert.match(targets, new RegExp(`\\n${name}\\n${code}\\n`));
  }
  assert.match(sources, /Detect language\nauto\n/);
  assert.doesNotMatch(targets, /\nauto\n/);
});

test("same-language input returns unchanged without calling an external provider", async (t) => {
  const calls = mockGoogle(t);
  const response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=en"));
  assert.deepEqual(await response.json(), {
    "translated-text": "Hello", source: "en", target: "en", engine: "google",
  });
  assert.equal(calls.length, 0);
});

test("Libre, unknown engines, and invalid input never call Google", async (t) => {
  const calls = mockGoogle(t);
  for (const [path, status, error] of [
    ["/api/translate/?engine=libre&text=Hello&from=en&to=fr", 503, "engine_unavailable"],
    ["/api/translate/?engine=bing&text=Hello&from=en&to=fr", 400, "unsupported_engine"],
    ["/api/translate/?text=%20&from=en&to=fr", 400, "invalid_text"],
    ["/api/translate/?text=Hello&from=constructor&to=fr", 422, "unsupported_language"],
    ["/api/translate/?text=Hello&from=en&to=auto", 422, "unsupported_language"],
  ]) {
    const response = await handleRequest(request(path));
    assert.equal(response.status, status, path);
    assert.equal((await response.json()).error, error, path);
  }
  assert.equal(calls.length, 0);
});

test("the former cloudflare engine remains a compatibility alias for Google", async (t) => {
  mockGoogle(t);
  const response = await handleRequest(request("/api/translate/?engine=cloudflare&text=Hello&from=en&to=fr"));
  assert.equal((await response.json()).engine, "google");
});

test("malformed or empty RPC payloads are errors, never successful translations", async (t) => {
  let next = new Response("<html>blocked</html>");
  t.mock.method(globalThis, "fetch", async () => next);
  let response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=fr"));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "invalid_engine_response");

  next = googleFrame(" ");
  response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=fr"));
  assert.equal(response.status, 502);
  next = new Response("unavailable", { status: 429 });
  response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=fr"));
  assert.equal(response.status, 503);
  assert.doesNotMatch(JSON.stringify(await response.json()), /Google translation returned HTTP/);
});

test("OpenAI is optional and only used when explicitly requested", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("translate.google.com")) return googleFrame("Hello", "zu");
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ source: "zu", translation: "What are you doing?" }) }] }],
    });
  });
  const env = { OPENAI_API_KEY: "test-key" };
  const defaultResponse = await handleRequest(request("/api/translate/?text=Sawubona&from=zu&to=en"), env);
  assert.equal((await defaultResponse.json()).engine, "google");
  assert.equal(calls[0].url.includes("translate.google.com"), true);

  const optional = await handleRequest(request("/api/translate/?engine=openai&text=cava%20wenzani%3F&from=auto&to=en"), env);
  assert.equal(optional.status, 200);
  assert.equal((await optional.json()).engine, "openai");
  assert.equal(calls[1].url, "https://api.openai.com/v1/responses");
  assert.equal(calls[1].options.headers.Authorization, "Bearer test-key");
  const body = JSON.parse(calls[1].options.body);
  assert.equal(body.model, "gpt-5-nano");
  assert.equal(body.store, false);
  assert.match(body.instructions, /cava wenzani\? = So, what are you doing\?/);

  const missing = await handleRequest(request("/api/translate/?engine=openai&text=Hello&from=en&to=fr"));
  assert.equal(missing.status, 503);
  assert.equal(calls.length, 2);
});

test("health and capabilities describe the available paths without a model binding", async () => {
  const health = await (await handleRequest(request("/api/health/"), { OPENAI_API_KEY: "test-key" })).json();
  assert.deepEqual(health, {
    ok: true, engine: "google", translation_provider: "google-rpc", speech_provider: "google-tts", openai_available: true, openai_model: "gpt-5-nano",
  });
  const capabilities = await (await handleRequest(request("/api/capabilities/"))).json();
  assert.deepEqual(capabilities, { automatic_source_detection: true, speech_languages: ["en", "es", "fr"] });
});

test("speech stays behind a request and returns Google MP3 audio", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(String(url));
    return new Response(new Uint8Array([0xff, 0xf3, 0x84, 0xc4]));
  });
  const response = await handleRequest(request("/api/tts/?text=Bonjour&lang=fr"));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/mpeg");
  assert.deepEqual([...new Uint8Array(await response.arrayBuffer())], [0xff, 0xf3, 0x84, 0xc4]);
  assert.equal(new URL(calls[0]).searchParams.get("q"), "Bonjour");
  assert.equal(new URL(calls[0]).searchParams.get("tl"), "fr");

  const unsupported = await handleRequest(request("/api/tts/?text=Hallo&lang=de"));
  assert.equal(unsupported.status, 422);
  assert.equal(calls.length, 1);
});

test("long speech is split into playable-sized provider requests", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url) => {
    calls.push(new URL(url).searchParams.get("q"));
    return new Response(new Uint8Array([0xff, 0xf3, 0x84, 0xc4]));
  });
  const text = Array(80).fill("Hello world.").join(" ");
  const response = await handleRequest(request(`/api/tts/?lang=en&text=${encodeURIComponent(text)}`));
  assert.equal(response.status, 200);
  assert.ok(calls.length > 1);
  assert.ok(calls.every((chunk) => chunk.length <= 180));
  assert.equal((await response.arrayBuffer()).byteLength, calls.length * 4);
});

test("speech rejects invalid audio without exposing upstream content", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("not audio"));
  const response = await handleRequest(request("/api/tts/?text=Hello&lang=en"));
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "invalid_engine_response");
});

test("home and docs contain the provider and retain the same-origin app flow", async () => {
  const home = await handleRequest(request("/"));
  assert.equal(home.status, 200);
  assert.match(home.headers.get("Content-Security-Policy"), /connect-src 'self'/);
  assert.match(home.headers.get("Content-Security-Policy"), /media-src blob:/);
  assert.match(await home.text(), /GOOGLE TRANSLATE/);
  for (const path of ["/docs", "/docs/"]) {
    const docs = await handleRequest(request(path));
    assert.equal(docs.status, 200);
    assert.match((await docs.text()), /Google Translate/);
  }
});
