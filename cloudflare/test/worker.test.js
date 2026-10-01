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

function africanAi(result = "Molo") {
  const model = ai({ response: { translation: "Hello" } });
  const containerCalls = [];
  model.env.AFRICAN_TRANSLATOR = {
    idFromName(name) {
      assert.equal(name, "shared");
      return name;
    },
    get() {
      return {
        async fetch(request) {
          const body = await request.json();
          containerCalls.push({ url: request.url, body });
          return Response.json({ choices: [{ message: { content: result } }] });
        },
      };
    },
  };
  return { ...model, containerCalls };
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
  assert.match(model.calls[0].values.messages[0].content, /kanti = but or so/);
});

test("Zulu slang and city-life terms reach the model with local context", async () => {
  const examples = [
    ["cava wenzani?", ["cava = look or see", "wenzani = what are you doing"]],
    ["ushuni wenkabi", ["ushuni = tune or song", "wenkabi = of the bull"]],
    ["wazini ngempilo yaseGoli wena?", ["wazini = what do you know", "ngempilo = about life", "yaseGoli = in Johannesburg"]],
  ];

  for (const [text, terms] of examples) {
    const model = ai({ response: { translation: "Example" } });
    const response = await handleRequest(request("/api/translate/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, from: "zu", to: "en" }),
    }), model.env);
    assert.equal(response.status, 200);
    assert.equal(model.calls.length, 1);
    const prompt = model.calls[0].values.messages[0].content;
    for (const term of terms) assert.ok(prompt.includes(term), `${text}: missing ${term}`);
    assert.match(prompt, /Preserve conjunctions and discourse markers/);
    assert.match(prompt, /sentence-final emphatic wena/);
    assert.equal(model.calls[0].values.messages[1].content, text);
  }

  const unrelated = ai({ response: { translation: "Hello" } });
  await handleRequest(request("/api/translate/?text=Sawubona&from=zu&to=en"), unrelated.env);
  assert.doesNotMatch(unrelated.calls[0].values.messages[0].content, /ushuni|cava|yaseGoli/);
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

test("African language choices reach the specialist container", async () => {
  const added = new Map([
    ["xh", "Xhosa"], ["st", "Southern Sotho"], ["tn", "Setswana"],
    ["am", "Amharic"], ["ha", "Hausa"], ["ig", "Igbo"],
    ["rw", "Kinyarwanda"], ["ln", "Lingala"], ["lg", "Luganda"],
    ["mg", "Malagasy"], ["ny", "Nyanja"], ["om", "Oromo"],
    ["sn", "Shona"], ["so", "Somali"], ["sw", "Swahili"],
    ["wo", "Wolof"], ["yo", "Yoruba"],
  ]);
  const sourceList = await (await handleRequest(request("/api/source_languages/"))).text();
  const targetList = await (await handleRequest(request("/api/target_languages/"))).text();
  for (const [code, name] of added) {
    assert.match(sourceList, new RegExp(`\\n${name}\\n${code}\\n`));
    assert.match(targetList, new RegExp(`\\n${name}\\n${code}\\n`));
  }

  const model = africanAi("Molo");
  const response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=xh"), model.env);
  assert.equal(response.status, 200);
  assert.equal((await response.json())["translated-text"], "Molo");
  assert.equal(model.containerCalls.length, 1);
  assert.equal(new URL(model.containerCalls[0].url).pathname, "/v1/chat/completions");
  assert.match(model.containerCalls[0].body.messages[0].content, /English to Xhosa/);
  assert.equal(model.calls.length, 0);
});

test("African to African translation pivots through English", async () => {
  const model = africanAi("Hello");
  const response = await handleRequest(request("/api/translate/?text=Molo&from=xh&to=sw"), model.env);
  assert.equal(response.status, 200);
  assert.equal(model.containerCalls.length, 2);
  assert.match(model.containerCalls[0].body.messages[0].content, /Xhosa to English/);
  assert.match(model.containerCalls[1].body.messages[0].content, /English to Swahili/);
  assert.match(model.containerCalls[1].body.messages[1].content, /Hello/);
});

test("African translation fails clearly without a container or with empty model output", async () => {
  const missing = await handleRequest(request("/api/translate/?text=Hello&from=en&to=xh"), ai().env);
  assert.equal(missing.status, 503);
  const empty = await handleRequest(request("/api/translate/?text=Hello&from=en&to=xh"), africanAi("").env);
  assert.equal(empty.status, 502);
  const long = await handleRequest(request(`/api/translate/?text=${"a".repeat(1801)}&from=en&to=xh`), africanAi().env);
  assert.equal(long.status, 413);
});

test("African translation retries a container that is still starting", async () => {
  const model = africanAi("Molo");
  let calls = 0;
  model.env.AFRICAN_TRANSLATOR.get = () => ({
    async fetch() {
      calls++;
      return calls === 1
        ? new Response("Container starting", { status: 503 })
        : Response.json({ choices: [{ finish_reason: "stop", message: { content: "Molo" } }] });
    },
  });
  const response = await handleRequest(request("/api/translate/?text=Hello&from=en&to=xh"), model.env);
  assert.equal(response.status, 200);
  assert.equal(calls, 2);
});

test("an OpenAI secret routes translation and detection through GPT-5 nano", async (t) => {
  const calls = [];
  t.mock.method(globalThis, "fetch", async (url, options) => {
    calls.push({ url, options });
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ source: "xh", translation: "Hello" }) }] }],
    });
  });
  const response = await handleRequest(request("/api/translate/?text=Molo&from=auto&to=en"), {
    OPENAI_API_KEY: "test-key",
  });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    "translated-text": "Hello", source: "xh", target: "en", engine: "cloudflare",
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
  assert.equal(calls[0].options.headers.Authorization, "Bearer test-key");
  const body = JSON.parse(calls[0].options.body);
  assert.equal(body.model, "gpt-5-nano");
  assert.equal(body.store, false);
  assert.equal(body.reasoning.effort, "minimal");
  assert.equal(body.text.format.type, "json_schema");
  assert.doesNotMatch(body.instructions, /contextual clues/);
  const health = await (await handleRequest(request("/api/health/"), { OPENAI_API_KEY: "test-key" })).json();
  assert.equal(health.translation_provider, "openai");
  assert.equal(health.openai_model, "gpt-5-nano");
});

test("OpenAI gets relevant Zulu context for colloquial text", async (t) => {
  let instructions;
  t.mock.method(globalThis, "fetch", async (_url, options) => {
    instructions = JSON.parse(options.body).instructions;
    return Response.json({
      status: "completed",
      output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ source: "zu", translation: "What are you doing?" }) }] }],
    });
  });
  const response = await handleRequest(request("/api/translate/?text=cava%20wenzani%3F&from=auto&to=en"), { OPENAI_API_KEY: "test-key" });
  assert.equal(response.status, 200);
  assert.match(instructions, /cava = look or see/);
  assert.match(instructions, /wenzani = what are you doing/);
  assert.match(instructions, /The source language is Zulu \(zu\)/);
  assert.doesNotMatch(instructions, /ushuni =/);
});

test("OpenAI cannot relabel a source inferred from known Zulu phrases", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ source: "af", translation: "What are you doing?" }) }] }],
  }));
  const response = await handleRequest(request("/api/translate/?text=cava%20wenzani%3F&from=auto&to=en"), { OPENAI_API_KEY: "test-key" });
  assert.equal(response.status, 502);
  assert.equal((await response.json()).error, "invalid_detection_response");
});

test("OpenAI detection errors and provider failures cannot fall through to the container", async (t) => {
  let output = { source: "und", translation: "" };
  const providerFetch = t.mock.method(globalThis, "fetch", async () => Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify(output) }] }],
  }));
  const env = { OPENAI_API_KEY: "test-key" };
  const unknown = await handleRequest(request("/api/translate/?text=Hi&from=auto&to=en"), env);
  assert.equal(unknown.status, 422);
  assert.equal((await unknown.json()).error, "language_not_detected");
  output = { source: "xh", translation: "" };
  const empty = await handleRequest(request("/api/translate/?text=Molo&from=xh&to=en"), env);
  assert.equal(empty.status, 502);
  assert.equal((await empty.json()).error, "invalid_engine_response");
  providerFetch.mock.mockImplementation(async () => new Response("private provider error", { status: 401 }));
  const unavailable = await handleRequest(request("/api/translate/?text=Molo&from=xh&to=en"), env);
  assert.equal(unavailable.status, 503);
  const body = await unavailable.text();
  assert.equal(JSON.parse(body).error, "engine_unavailable");
  assert.doesNotMatch(body, /private provider error|test-key/);
});

test("OpenAI detection preserves source text when the detected language is the target", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({
    status: "completed",
    output: [{ type: "message", content: [{ type: "output_text", text: JSON.stringify({ source: "en", translation: "Hi" }) }] }],
  }));
  const response = await handleRequest(request("/api/translate/?text=Hello&from=auto&to=en"), { OPENAI_API_KEY: "test-key" });
  assert.equal(response.status, 200);
  assert.equal((await response.json())["translated-text"], "Hello");
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
    assert.match(html, /40 languages for text/);
    assert.match(html, /<span>Marathi<\/span><code>mr<\/code>/);
    assert.match(html, /Shared links include the original text/);
    assert.match(html, /POST \/api\/translate\//);
    assert.match(html, /href="\/docs" aria-current="page"/);
    assert.doesNotMatch(html, /workers\.dev|translate\.syncpundit\.io/);
  }
  const openAIDocs = await (await handleRequest(request("/docs"), { OPENAI_API_KEY: "test-key" })).text();
  assert.match(openAIDocs, /This deployment sends text to OpenAI/);
  assert.doesNotMatch(openAIDocs, /This deployment uses Cloudflare Workers AI for detection/);
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
