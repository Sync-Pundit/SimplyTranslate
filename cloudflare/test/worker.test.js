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
  const model = ai({ response: { translation: "Sawubona" } });
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
  assert.equal(model.calls[1].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.match(model.calls[1].values.messages[0].content, /English into natural Zulu/);
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

test("international languages are listed and routed through the multilingual model", async () => {
  const added = new Map([
    ["ar", "Arabic"], ["bn", "Bengali"], ["zh", "Chinese"],
    ["hi", "Hindi"], ["ja", "Japanese"], ["ko", "Korean"],
    ["ms", "Malay"], ["mr", "Marathi"], ["fa", "Persian"],
    ["ru", "Russian"], ["tl", "Tagalog"], ["th", "Thai"],
    ["tr", "Turkish"], ["ur", "Urdu"], ["vi", "Vietnamese"],
  ]);
  const sourceList = await (await handleRequest(request("/api/source_languages/"))).text();
  const targetList = await (await handleRequest(request("/api/target_languages/"))).text();
  const model = ai((name) => name.includes("qwen")
    ? { response: { translation: "Hello" } }
    : { translated_text: "Hello" });

  for (const [code, name] of added) {
    assert.match(sourceList, new RegExp(`\\n${name}\\n${code}\\n`));
    assert.match(targetList, new RegExp(`\\n${name}\\n${code}\\n`));
    const response = await handleRequest(request(`/api/translate/?text=Hello&from=en&to=${code}`), model.env);
    assert.equal(response.status, 200, code);
    const englishToTarget = model.calls.at(-1);
    assert.equal(englishToTarget.model, "@cf/qwen/qwen3-30b-a3b-fp8");
    assert.match(englishToTarget.values.messages[0].content, new RegExp(`English into natural ${name}`));

    const reverse = await handleRequest(request(`/api/translate/?text=Sample&from=${code}&to=en`), model.env);
    assert.equal(reverse.status, 200, code);
    assert.equal(model.calls.at(-1).model, "@cf/qwen/qwen3-30b-a3b-fp8");
  }
  assert.equal(model.calls.length, added.size * 2);

  const detected = ai((name) => name.includes("llama")
    ? { response: { language: "ja" } }
    : { response: { translation: "Hello" } });
  const response = await handleRequest(request("/api/translate/?text=%E3%81%93%E3%82%93%E3%81%AB%E3%81%A1%E3%81%AF&from=auto&to=en"), detected.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).source, "ja");
  assert.equal(detected.calls[1].model, "@cf/qwen/qwen3-30b-a3b-fp8");
  assert.match(detected.calls[1].values.messages[0].content, /Japanese into natural English/);
});

test("translations into Zulu avoid the multilingual route", async () => {
  const model = ai({ response: { translation: "Sawubona" } });
  for (const from of ["en", "ar"]) {
    const response = await handleRequest(request(`/api/translate/?text=Hello&from=${from}&to=zu`), model.env);
    assert.equal(response.status, 200);
    assert.equal(model.calls.at(-1).model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  }
});

test("detected Zulu uses a glossary for moni without losing the term", async () => {
  const model = ai((name, values) => values.response_format?.json_schema?.properties?.language
    ? { response: { language: "zu" } }
    : { response: { translation: "Come, sinner, come to Jesus" } });
  const response = await handleRequest(request("/api/translate/?text=Woza%20moni%2C%20woza%20kuJesu&from=auto&to=en"), model.env);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    "translated-text": "Come, sinner, come to Jesus", source: "zu", target: "en", engine: "cloudflare",
  });
  assert.equal(model.calls.length, 2);
  assert.equal(model.calls[1].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.match(model.calls[1].values.messages[0].content, /moni = sinner/);
  assert.equal(model.calls[1].values.messages[1].content, "Woza moni, woza kuJesu");
});

test("ordinary Zulu to English uses the language model without an unrelated glossary", async () => {
  const model = ai({ response: { translation: "Hello" } });
  const response = await handleRequest(request("/api/translate/?text=Sawubona&from=zu&to=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json())["translated-text"], "Hello");
  assert.equal(model.calls[0].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.doesNotMatch(model.calls[0].values.messages[0].content, /moni = sinner/);
});

test("Zulu question keeps its person and form of address in the language-model request", async () => {
  const model = ai({ response: { translation: "But what are you doing there, brother?" } });
  const response = await handleRequest(request("/api/translate/?text=Kanti%20wenzani%20lapho%20bafo%3F&from=zu&to=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json())["translated-text"], "But what are you doing there, brother?");
  assert.match(model.calls[0].values.messages[0].content, /wenzani = what are you doing/);
  assert.match(model.calls[0].values.messages[0].content, /bafo = brother \(informal address\)/);
});

test("Afrikaans is listed and uses the language model in either direction", async () => {
  const model = ai({ response: { translation: "Good morning" } });
  const response = await handleRequest(request("/api/translate/?text=Goeiem%C3%B4re&from=af&to=en"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).source, "af");
  assert.equal(model.calls[0].model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.match(model.calls[0].values.messages[0].content, /Afrikaans into natural English/);

  const list = await handleRequest(request("/api/source_languages/"), model.env);
  assert.match(await list.text(), /Afrikaans\naf\n/);
  const reverse = await handleRequest(request("/api/translate/?text=Good%20morning&from=en&to=af"), model.env);
  assert.equal(reverse.status, 200);
  assert.match(model.calls[1].values.messages[0].content, /English into natural Afrikaans/);
});

test("an empty Zulu translation is not reported as success", async () => {
  const model = ai({ response: { translation: "" } });
  const response = await handleRequest(request("/api/translate/?text=Woza%20moni&from=zu&to=en"), model.env);
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "invalid_engine_response");

  const unavailable = await handleRequest(request("/api/translate/?text=Sawubona&from=zu&to=en"), ai(new Error("private")).env);
  assert.equal(unavailable.status, 503);
  assert.equal((await unavailable.json()).error, "engine_unavailable");
});

test("automatic detection refuses unsupported, malformed, and unavailable results", async () => {
  for (const [result, status, error] of [
    [{ response: { language: "und" } }, 422, "language_not_detected"],
    [{ response: { language: "xx" } }, 502, "invalid_detection_response"],
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
  const health = await good.json();
  assert.equal(health.ok, true);
  assert.equal(health.zulu_english_model, "@cf/meta/llama-3.3-70b-instruct-fp8-fast");
  assert.equal(health.international_model, "@cf/qwen/qwen3-30b-a3b-fp8");
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
  assert.match(html, /id="detected-language"/);
  assert.match(html, /href="\/docs">Docs<\/a>/);
});

test("public docs render the current language list and the product limits", async () => {
  for (const path of ["/docs", "/docs/"]) {
    const response = await handleRequest(request(path));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
    assert.match(response.headers.get("Content-Security-Policy"), /style-src 'self'/);
    const html = await response.text();
    assert.match(html, /<title>Docs \/ Translate \/ Sync_Pundit<\/title>/);
    assert.match(html, /23 languages for text/);
    assert.match(html, /<span>Marathi<\/span><code>mr<\/code>/);
    assert.match(html, /Shared links include the original text/);
    assert.match(html, /POST \/api\/translate\//);
    assert.match(html, /href="\/docs" aria-current="page"/);
    assert.doesNotMatch(html, /workers\.dev|translate\.syncpundit\.io/);
  }
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
