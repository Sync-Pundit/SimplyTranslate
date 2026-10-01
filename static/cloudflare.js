(function () {
  const form = document.getElementById("translation-form");
  const source = document.getElementById("from_language");
  const target = document.getElementById("to_language");
  const input = document.getElementById("input");
  const output = document.getElementById("output");
  const status = document.getElementById("translation-status");
  const detectedLanguage = document.getElementById("detected-language");
  const submit = form.querySelector(".translate-button");
  const clear = document.getElementById("clear-input");
  const copyResult = document.getElementById("copy-result");
  const listen = document.getElementById("listen-result");
  const listenSource = document.getElementById("listen-source");
  const share = document.getElementById("share-url");
  const copyShare = document.getElementById("copy-share");
  const copyLabels = new Map([
    [copyResult, { element: copyResult, defaultText: "Copy text", copiedText: "✓ Copied" }],
    [copyShare, { element: copyShare.querySelector("span"), defaultText: "Copy share link", copiedText: "✓ Link copied" }],
  ]);
  const copyTimers = new Map();
  const characterCount = document.getElementById("character-count");
  const resultNote = document.getElementById("result-note");
  const params = new URL(location.href).searchParams;
  let currentRequest;
  let detectedSource;
  let audio;
  let speechLanguages = new Set();

  function setStatus(message, kind = "") {
    status.textContent = message;
    status.className = `message${kind ? ` is-${kind}` : ""}`;
  }

  function updateCount() {
    const count = [...input.value].length;
    characterCount.textContent = `${count.toLocaleString()} character${count === 1 ? "" : "s"}`;
    clear.disabled = !count;
  }

  function updateLabels() {
    document.getElementById("from-label").textContent = source.value === "auto" ? (detectedSource?.toUpperCase() || "AUTO") : source.value.toUpperCase();
    document.getElementById("to-label").textContent = target.value.toUpperCase() || "—";
    const detectedName = [...source.options].find((choice) => choice.value === detectedSource)?.textContent;
    detectedLanguage.textContent = source.value === "auto" && detectedName ? `${detectedName} detected` : "";
    detectedLanguage.hidden = !detectedLanguage.textContent;
  }

  function updateSpeechActions() {
    const sourceLanguage = source.value === "auto" ? detectedSource : source.value;
    listenSource.disabled = !input.value.trim() || !speechLanguages.has(sourceLanguage);
    listen.disabled = !output.value || !speechLanguages.has(target.value);
    listenSource.title = listenSource.disabled ? "Speech is available for English, French, and Spanish after the source language is known." : "Listen to source text";
    listen.title = listen.disabled ? "Speech is available for English, French, and Spanish." : "Listen to translation";
  }

  function resetCopyButton(button) {
    clearTimeout(copyTimers.get(button));
    copyTimers.delete(button);
    copyLabels.get(button).element.textContent = copyLabels.get(button).defaultText;
    button.classList.remove("is-copied");
  }

  function showCopied(button) {
    resetCopyButton(button);
    button.classList.add("is-copied");
    copyLabels.get(button).element.textContent = copyLabels.get(button).copiedText;
    copyTimers.set(button, setTimeout(() => resetCopyButton(button), 3000));
  }

  function clearResult() {
    currentRequest?.abort();
    resetCopyButton(copyResult);
    resetCopyButton(copyShare);
    output.value = "";
    resultNote.textContent = "Ready when you are";
    copyResult.disabled = true;
    updateSpeechActions();
    share.value = "";
    copyShare.disabled = true;
    detectedSource = undefined;
    audio?.pause();
    audio = undefined;
    updateLabels();
  }

  function option(select, name, code) {
    const item = document.createElement("option");
    item.value = code;
    item.textContent = name;
    select.appendChild(item);
  }

  async function loadLanguages() {
    const [response, capabilitiesResponse] = await Promise.all([
      fetch("/api/source_languages/", { cache: "no-store" }),
      fetch("/api/capabilities/", { cache: "no-store" }),
    ]);
    if (!response.ok || !capabilitiesResponse.ok) throw new Error("Language choices are unavailable.");
    const capabilities = await capabilitiesResponse.json();
    speechLanguages = new Set(capabilities.speech_languages || []);
    const lines = (await response.text()).trim().split("\n");
    if (lines.length < 2 || lines.length % 2) throw new Error("Language choices are invalid.");
    source.replaceChildren();
    target.replaceChildren();
    for (let index = 0; index < lines.length; index += 2) {
      option(source, lines[index], lines[index + 1]);
      if (lines[index + 1] !== "auto") option(target, lines[index], lines[index + 1]);
    }

    source.value = (params.get("sl") || "auto").toLowerCase();
    target.value = (params.get("tl") || "es").toLowerCase();
    input.value = params.get("text") || "";
    updateCount();
    updateLabels();
    updateSpeechActions();
    if (!source.value || !target.value) {
      setStatus("Choose supported source and target languages.", "error");
      return;
    }
    if (input.value.trim()) await translate();
  }

  async function translate() {
    clearResult();
    if (!source.value || !target.value) {
      setStatus("Choose supported source and target languages.", "error");
      return;
    }
    if (!input.value.trim()) {
      setStatus("Enter text to translate.", "error");
      input.focus();
      return;
    }

    const controller = new AbortController();
    currentRequest = controller;
    submit.disabled = true;
    submit.firstElementChild.textContent = "Translating";
    setStatus("Translating…");
    try {
      const body = new URLSearchParams({ engine: "cloudflare", text: input.value, from: source.value, to: target.value });
      const response = await fetch("/api/translate/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        cache: "no-store",
        signal: controller.signal,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Translation is unavailable.");
      if (controller !== currentRequest) return;
      output.value = result["translated-text"];
      detectedSource = result.source;
      updateLabels();
      resultNote.textContent = "Translation ready";
      copyResult.disabled = false;
      updateSpeechActions();
      setStatus("Translation ready.", "success");

      const link = new URL("/", location.origin);
      link.searchParams.set("sl", source.value);
      link.searchParams.set("tl", target.value);
      link.searchParams.set("text", input.value);
      share.value = link.toString();
      copyShare.disabled = false;
    } catch (error) {
      if (error.name !== "AbortError") setStatus(error.message || "Translation is unavailable.", "error");
    } finally {
      if (controller === currentRequest) {
        currentRequest = undefined;
        submit.disabled = false;
        submit.firstElementChild.textContent = "Translate";
      }
    }
  }

  async function copyText(value, button, success) {
    const isCurrent = () => !button.disabled && (button === copyShare ? share.value : output.value) === value;
    try {
      await navigator.clipboard.writeText(value);
      if (!isCurrent()) return;
      showCopied(button);
      setStatus(success, "success");
    } catch {
      if (!isCurrent()) return;
      setStatus(button === copyShare
        ? "Could not copy the link. Check clipboard access and try again."
        : "Could not copy. Select the translation and copy it manually.", "error");
    }
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    translate();
  });
  input.addEventListener("input", () => {
    clearResult();
    updateCount();
    updateSpeechActions();
    setStatus(input.value.trim() ? "Ready to translate." : "Enter text to begin.");
  });
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  clear.addEventListener("click", () => {
    input.value = "";
    input.dispatchEvent(new Event("input"));
    input.focus();
  });
  for (const select of [source, target]) {
    select.addEventListener("change", () => {
      clearResult();
      setStatus("Ready to translate.");
    });
  }
  document.getElementById("switchbutton").addEventListener("click", () => {
    const nextTarget = source.value === "auto" ? detectedSource : source.value;
    if (!nextTarget) {
      setStatus("Translate once to detect the source before swapping languages.", "error");
      return;
    }
    source.value = target.value;
    target.value = nextTarget;
    if (output.value) input.value = output.value;
    clearResult();
    updateCount();
    setStatus("Languages swapped. Ready to translate.");
  });
  copyResult.addEventListener("click", () => copyText(output.value, copyResult, "Translation copied."));
  copyShare.addEventListener("click", () => copyText(share.value, copyShare, "Link copied."));
  async function playSpeech(button, text, language) {
    if (!text || !speechLanguages.has(language)) return;
    button.disabled = true;
    setStatus("Preparing speech…");
    try {
      const url = new URL("/api/tts/", location.origin);
      url.searchParams.set("text", text);
      url.searchParams.set("lang", language);
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) {
        const detail = await response.json();
        throw new Error(detail.message || "Speech is unavailable.");
      }
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      audio?.pause();
      audio = new Audio(objectUrl);
      audio.addEventListener("ended", () => URL.revokeObjectURL(objectUrl), { once: true });
      audio.addEventListener("error", () => URL.revokeObjectURL(objectUrl), { once: true });
      await audio.play();
      setStatus("Playing translation.", "success");
    } catch (error) {
      setStatus(error.message || "Speech is unavailable.", "error");
    } finally {
      updateSpeechActions();
    }
  }
  listen.addEventListener("click", () => playSpeech(listen, output.value, target.value));
  listenSource.addEventListener("click", () => playSpeech(listenSource, input.value, source.value === "auto" ? detectedSource : source.value));

  loadLanguages().catch((error) => {
    submit.disabled = true;
    setStatus(error.message || "Language choices are unavailable.", "error");
  });
})();
