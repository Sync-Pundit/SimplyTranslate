export function renderDocsPage(languages) {
  const languageItems = Object.entries(languages)
    .map(([code, name]) => `<li><span>${name}</span><code>${code}</code></li>`)
    .join("");

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101816" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#edf4ee" media="(prefers-color-scheme: light)">
  <meta name="description" content="How to use Sync_Pundit Translate, supported languages, privacy, and API routes.">
  <title>Docs / Translate / Sync_Pundit</title>
  <link rel="icon" href="/translate-mark.svg?v=20261001.3" type="image/svg+xml">
  <script src="/theme.js?v=20261001.1"></script>
  <link rel="stylesheet" href="/translate.css?v=20261001.15">
  <link rel="stylesheet" href="/docs.css?v=20261001.2">
</head>
<body>
  <a class="skip-link" href="#docs-content">Skip to docs</a>
  <div class="site-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Sync Pundit Translate home">
        <img class="brand-mark" src="/translate-mark.svg?v=20261001.3" alt="">
        <span class="brand-name">SYNC<span>_</span>PUNDIT</span>
        <span class="brand-divider" aria-hidden="true"></span>
        <span class="brand-tool">TRANSLATE</span>
      </a>
      <div class="topbar-actions">
        <a class="topbar-link" href="/">Translate</a>
        <a class="topbar-link" href="/docs" aria-current="page">Docs</a>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme">
          <svg class="icon-sun" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.9A8.5 8.5 0 0 1 8.1 3.8 8.5 8.5 0 1 0 20.2 15.9Z"/></svg>
        </button>
      </div>
    </header>

    <main id="docs-content" class="docs-main">
      <section class="docs-hero" aria-labelledby="docs-title">
        <div class="docs-folio" aria-hidden="true"><span>SP / 02</span><span>THE FIELD GUIDE</span></div>
        <div class="docs-hero-copy">
          <p class="overline">A language tool, explained</p>
          <h1 id="docs-title">Translate,<br><span>explained.</span></h1>
          <p class="docs-lede">How to use the tool, what happens to your text, and what the API returns.</p>
        </div>
        <div class="docs-hero-mark" aria-hidden="true"><span>Aa</span><i></i><span>Ñ</span></div>
      </section>

      <div class="docs-layout">
        <nav class="docs-nav" aria-label="On this page">
          <p>On this page</p>
          <a href="#use">01 <span>Use Translate</span></a>
          <a href="#languages">02 <span>Languages</span></a>
          <a href="#privacy">03 <span>Your text</span></a>
          <a href="#models">04 <span>Models and speech</span></a>
          <a href="#api">05 <span>API</span></a>
          <a href="#limits">06 <span>Limits</span></a>
        </nav>

        <div class="docs-sections">
          <section id="use" class="docs-section">
            <p class="section-index">01 / USE</p>
            <h2>From a thought to another language.</h2>
            <ol class="docs-steps">
              <li><span>01</span><div><h3>Choose the source.</h3><p>Pick a language, or leave <strong>Detect language</strong> selected. Detection uses the first 1,000 characters and asks you to choose manually if it cannot identify the language.</p></div></li>
              <li><span>02</span><div><h3>Choose the destination.</h3><p>Pick the language you want to read. Use the swap button after detection or translation to reverse the direction.</p></div></li>
              <li><span>03</span><div><h3>Translate.</h3><p>Enter text and select <strong>Translate</strong>. On a keyboard, press Ctrl or Command plus Enter.</p></div></li>
            </ol>
            <p class="docs-small">Use <strong>Copy text</strong> for the result. <strong>Copy share link</strong> copies a link that contains your original text and language choices.</p>
          </section>

          <section id="languages" class="docs-section">
            <p class="section-index">02 / LANGUAGES</p>
            <h2>${Object.keys(languages).length} languages for text.</h2>
            <p>The source and target menus use the same list. Automatic detection is a source option, not a target language. These codes also work in the API.</p>
            <ul class="docs-languages">${languageItems}</ul>
            <p class="docs-small">Malay (<code>ms</code>) does not include Indonesian (<code>id</code>). Chinese and Arabic use broad model codes; regional varieties and writing systems still need review.</p>
          </section>

          <section id="privacy" class="docs-section">
            <p class="section-index">03 / YOUR TEXT</p>
            <h2>Know where the words go.</h2>
            <div class="docs-flow" aria-label="Text flow"><span>Browser</span><span>Translate Worker</span><span>Workers AI</span><span>Result</span></div>
            <p>The Worker sends your text to Cloudflare Workers AI for detection or translation. Translate does not keep a server-side translation history. Its API responses ask browsers and intermediaries not to cache them.</p>
            <div class="docs-callout"><strong>Shared links include the original text.</strong><p>The text sits in the URL query string. Anyone with the link can read it, and the URL may appear in browser history. Share only text you are comfortable putting in a link.</p></div>
            <p>Speech requests also place the spoken text in a request URL. Select <strong>Listen</strong> only when you want to send that text for speech generation.</p>
          </section>

          <section id="models" class="docs-section">
            <p class="section-index">04 / MODELS AND SPEECH</p>
            <h2>Different routes for different words.</h2>
            <div class="docs-table-wrap"><table><thead><tr><th>Task</th><th>Cloudflare model</th><th>Coverage</th></tr></thead><tbody>
              <tr><td>Source detection</td><td>Llama 3.3</td><td>All listed languages</td></tr>
              <tr><td>International translation</td><td>Qwen3</td><td>Pairs with one of the 15 new languages, except when translating into Zulu</td></tr>
              <tr><td>Zulu and Afrikaans</td><td>Llama 3.3</td><td>Zulu to English; translation into Zulu; Afrikaans pairs without a new international language</td></tr>
              <tr><td>Other translation</td><td>M2M100</td><td>Other pairs from the original language set</td></tr>
              <tr><td>Speech</td><td>MeloTTS</td><td>English, French, and Spanish</td></tr>
            </tbody></table></div>
            <p class="docs-small">The Listen button is unavailable for languages without speech support. If the source and target match, Translate returns the input without a translation model call.</p>
          </section>

          <section id="api" class="docs-section">
            <p class="section-index">05 / API</p>
            <h2>Use the same path as the page.</h2>
            <p>Send a GET query, a form POST, or a JSON POST to <code>/api/translate/</code>. Omit <code>from</code> or set it to <code>auto</code> to detect the source.</p>
            <div class="docs-code-label">JSON request</div>
            <pre><code>POST /api/translate/
Content-Type: application/json

{
  "text": "Hello",
  "from": "en",
  "to": "es"
}</code></pre>
            <div class="docs-code-label">Response</div>
            <pre><code>{
  "translated-text": "Hola",
  "source": "en",
  "target": "es",
  "engine": "cloudflare"
}</code></pre>
            <div class="docs-table-wrap"><table><thead><tr><th>Route</th><th>Returns</th></tr></thead><tbody>
              <tr><td><code>GET /api/source_languages/</code></td><td>Names and codes, including <code>auto</code></td></tr>
              <tr><td><code>GET /api/target_languages/</code></td><td>Names and codes, without <code>auto</code></td></tr>
              <tr><td><code>GET /api/capabilities/</code></td><td>Detection and speech support</td></tr>
              <tr><td><code>GET /api/health/</code></td><td>AI binding status and model names</td></tr>
              <tr><td><code>GET /api/tts/?text=Hello&amp;lang=en</code></td><td>Audio for supported languages</td></tr>
            </tbody></table></div>
            <p class="docs-small">Errors return a JSON object with <code>error</code> and <code>message</code>. An unknown source language returns 422. A model outage returns 503.</p>
          </section>

          <section id="limits" class="docs-section">
            <p class="section-index">06 / LIMITS</p>
            <h2>Where to use judgment.</h2>
            <p>Short, ambiguous, and mixed-language text can confuse detection. Translation quality also varies by language and sentence. The new languages passed short live checks, but native-speaker review remains open, especially for Zulu and regional varieties.</p>
            <p>Libre is disabled while its Cloudflare-native version is being built. Speech currently covers English, French, and Spanish.</p>
            <a class="docs-return" href="/">Open Translate <span aria-hidden="true">↗</span></a>
          </section>
        </div>
      </div>
    </main>

    <footer class="site-footer"><span>SYNC_PUNDIT <span class="footer-divider">/</span> TRANSLATE DOCS</span><span>Words should be able to travel.</span></footer>
  </div>
</body>
</html>`;
}
