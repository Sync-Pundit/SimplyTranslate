import assert from "node:assert/strict";
import test from "node:test";

import { handleRequest } from "../src/index.js";

function request(path, init) {
  return new Request(`https://translate.example${path}`, init);
}

function ai(result = { translated_text: "Bonjour" }) {
  const calls = [];
  return {
    calls,
    env: {
      AI: {
        async run(model, values, options) {
          calls.push({ model, values, options });
          if (result instanceof Error) throw result;
          return typeof result === "function" ? result(model, values, options) : result;
        },
      },
    },
  };
}

test("form translation uses the Cloudflare model and keeps the legacy text field", async () => {
  const model = ai();
  const response = await handleRequest(request("/api/translate/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ engine: "cloudflare", text: "Hello", from: "English", to: "fr" }),
  }), model.env);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await response.json(), {
    "translated-text": "Bonjour", source: "en", target: "fr", engine: "cloudflare",
  });
  assert.deepEqual(model.calls, [{ model: "@cf/meta/m2m100-1.2b", values: { text: "Hello", source_lang: "en", target_lang: "fr" }, options: undefined }]);
});

test("GET and JSON POST accept explicit source languages, including Zulu", async () => {
  const model = ai({ translated_text: "Sawubona" });
  const get = await handleRequest(request("/api/translate/?text=Hello&from=en&to=zu"), model.env);
  assert.equal(get.status, 200);
  assert.equal((await get.json())["translated-text"], "Sawubona");

  const post = await handleRequest(request("/api/translate/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Hello", from: "en", to: "zu" }),
  }), model.env);
  assert.equal(post.status, 200);
  assert.equal(model.calls.length, 2);
  assert.equal(model.calls[1].values.target_lang, "zu");
});

test("automatic source detection chooses a supported language before translation", async () => {
  const model = ai((name) => name.includes("llama") ? { response: { language: "fr" } } : { translated_text: "Hello" });
  const response = await handleRequest(request("/api/translate/?text=Bonjour&from=auto&to=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).source, "fr");
  assert.equal(model.calls.length, 2);
  assert.equal(model.calls[0].values.response_format.type, "json_schema");
  assert.equal(model.calls[1].values.source_lang, "fr");
});

test("automatic detection refuses unsupported, malformed, and unavailable results", async () => {
  for (const [result, status, error] of [
    [{ response: { language: "und" } }, 422, "language_not_detected"],
    [{ response: { language: "ja" } }, 502, "invalid_detection_response"],
    [new Error("private"), 503, "detection_unavailable"],
  ]) {
    const model = ai(result);
    const response = await handleRequest(request("/api/translate/?text=Bonjour&to=en"), model.env);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, error);
    assert.equal(model.calls.length, 1);
  }
});

test("disabled Libre and unknown engines cannot fall through to Cloudflare AI", async () => {
  const model = ai();
  const libre = await handleRequest(request("/api/translate/?engine=libre&text=Hello&from=en&to=fr"), model.env);
  assert.equal(libre.status, 503);
  assert.equal((await libre.json()).error, "engine_unavailable");
  const unknown = await handleRequest(request("/api/translate/?engine=google&text=Hello&from=en&to=fr"), model.env);
  assert.equal(unknown.status, 400);
  assert.equal((await unknown.json()).error, "unsupported_engine");
  assert.equal(model.calls.length, 0);
});

test("unsupported or empty input is rejected before inference", async () => {
  const model = ai();
  for (const [path, status, error] of [
    ["/api/translate/?text=%20&from=en&to=fr", 400, "invalid_text"],
    ["/api/translate/?text=hello&from=constructor&to=fr", 422, "unsupported_language"],
    ["/api/translate/?text=hello&from=en&to=auto", 422, "unsupported_language"],
  ]) {
    const response = await handleRequest(request(path), model.env);
    assert.equal(response.status, status);
    assert.equal((await response.json()).error, error);
  }
  assert.equal(model.calls.length, 0);
});

test("same-language text is returned without billable model inference", async () => {
  const model = ai();
  const response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json())["translated-text"], "Hello");
  assert.equal(model.calls.length, 0);
});

test("model failures and empty output are not reported as successful translations", async () => {
  const unavailable = await handleRequest(request("/api/translate/?text=Hello&from=en&to=fr"), ai(new Error("secret model detail")).env);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "engine_unavailable");
  const empty = await handleRequest(request("/api/translate/?text=Hello&from=en&to=fr"), ai({ translated_text: "" }).env);
  assert.equal(empty.status, 502);
  assert.equal((await empty.json()).error, "invalid_engine_response");
});

test("health and capabilities report configured features", async () => {
  const bad = await handleRequest(request("/api/health/"));
  assert.equal(bad.status, 503);
  assert.equal((await bad.json()).ok, false);
  const good = await handleRequest(request("/api/health/"), ai().env);
  assert.equal(good.status, 200);
  assert.equal((await good.json()).ok, true);
  const languages = await handleRequest(request("/api/source_languages/"));
  assert.equal(languages.status, 200);
  const body = await languages.text();
  assert.match(body, /Zulu\nzu\n/);
  assert.match(body, /Detect language\nauto\n/);
  const targets = await (await handleRequest(request("/api/target_languages/"))).text();
  assert.doesNotMatch(targets, /auto/i);
  const capabilities = await (await handleRequest(request("/api/capabilities/"))).json();
  assert.equal(capabilities.automatic_source_detection, true);
  assert.deepEqual(capabilities.speech_languages, ["en", "es", "fr"]);
});

test("homepage is a same-origin browser flow with the new design", async () => {
  const homepage = await handleRequest(request("/"));
  assert.equal(homepage.status, 200);
  assert.match(homepage.headers.get("Content-Security-Policy"), /connect-src 'self'/);
  const html = await homepage.text();
  assert.match(html, /cloudflare.js/);
  assert.match(html, /Sync_Pundit/);
  assert.match(html, /translate.css/);
});

test("speech uses Cloudflare audio and rejects unsupported languages before inference", async () => {
  const model = ai(() => new Response(new Uint8Array([73, 68, 51, 0]), { headers: { "Content-Type": "audio/mpeg" } }));
  const speech = await handleRequest(request("/api/tts/?text=Bonjour&lang=fr"), model.env);
  assert.equal(speech.status, 200);
  assert.equal(speech.headers.get("Content-Type"), "audio/mpeg");
  assert.deepEqual([...new Uint8Array(await speech.arrayBuffer())], [73, 68, 51, 0]);
  assert.equal(model.calls[0].model, "@cf/myshell-ai/melotts");
  assert.deepEqual(model.calls[0].values, { prompt: "Bonjour", lang: "fr" });
  assert.deepEqual(model.calls[0].options, { returnRawResponse: true });

  const unsupported = await handleRequest(request("/api/tts/?text=Hallo&lang=de"), model.env);
  assert.equal(unsupported.status, 422);
  assert.equal((await unsupported.json()).error, "speech_language_unavailable");
  assert.equal(model.calls.length, 1);
});

test("speech labels a WAV payload by its bytes even when the model says MPEG", async () => {
  const header = new TextEncoder().encode("RIFFxxxxWAVEdata");
  const model = ai(() => new Response(header, { headers: { "Content-Type": "audio/mpeg" } }));
  const response = await handleRequest(request("/api/tts/?text=Hello&lang=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Content-Type"), "audio/wav");
});
