export function renderDocsPage(languages, openAIAvailable = false) {
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
  <link rel="stylesheet" href="/translate.css?v=20261002.1">
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
          <a href="#models">04 <span>Providers and speech</span></a>
          <a href="#api">05 <span>API</span></a>
          <a href="#limits">06 <span>Limits</span></a>
        </nav>

        <div class="docs-sections">
          <section id="use" class="docs-section">
            <p class="section-index">01 / USE</p>
            <h2>From a thought to another language.</h2>
            <ol class="docs-steps">
              <li><span>01</span><div><h3>Choose the source.</h3><p>Pick a language, or leave <strong>Detect language</strong> selected. Detection asks you to choose manually if it cannot identify the language.</p></div></li>
              <li><span>02</span><div><h3>Choose the destination.</h3><p>Pick the language you want to read. Use the swap button after detection or translation to reverse the direction.</p></div></li>
              <li><span>03</span><div><h3>Translate.</h3><p>Enter text and select <strong>Translate</strong>. On a keyboard, press Ctrl or Command plus Enter.</p></div></li>
            </ol>
            <p class="docs-small">Use <strong>Copy text</strong> for the result. <strong>Copy share link</strong> copies a link that contains your original text and language choices.</p>
          </section>

          <section id="languages" class="docs-section">
            <p class="section-index">02 / LANGUAGES</p>
            <h2>${Object.keys(languages).length} languages for text.</h2>
            <p>The source and target menus use the same list. Automatic detection is a source option, not a target language. These codes also work in the API.</p>
            <p>Google Translate handles the listed codes through the Worker. Northern Sotho, Swati, Venda, Tsonga, and South Ndebele are now choices. This is language access, not a quality guarantee. Choose the source yourself when detection confuses short or related-language text.</p>
            <ul class="docs-languages">${languageItems}</ul>
            <p class="docs-small">Malay (<code>ms</code>) does not include Indonesian (<code>id</code>). South Ndebele (<code>nr</code>) is distinct from Northern Ndebele. Wolof returned text in our RPC checks but is not listed in Google Cloud Translation's language list. Regional varieties and writing systems still need review.</p>
          </section>

          <section id="privacy" class="docs-section">
            <p class="section-index">03 / YOUR TEXT</p>
            <h2>Know where the words go.</h2>
            <div class="docs-flow" aria-label="Text flow"><span>Browser</span><span>Translate Worker</span><span>Google Translate</span><span>Result</span></div>
            <p>The page sends text to Google Translate through this Worker for detection and translation. ${openAIAvailable ? "The API can use GPT-5 nano instead when you explicitly send engine=openai; that request goes to OpenAI with response storage disabled." : "An optional OpenAI route is available only when the Worker has an OpenAI key."} Translate does not keep a server-side translation history. Its API responses ask browsers and intermediaries not to cache them.</p>
            <div class="docs-callout"><strong>Shared links include the original text.</strong><p>The text sits in the URL query string. Anyone with the link can read it, and the URL may appear in browser history. Share only text you are comfortable putting in a link.</p></div>
            <p>Select <strong>Listen</strong> only when you want to send that text to Google for speech. The spoken text appears in the request URL.</p>
          </section>

          <section id="models" class="docs-section">
            <p class="section-index">04 / PROVIDERS AND SPEECH</p>
            <h2>One default route, one optional route.</h2>
            <div class="docs-table-wrap"><table><thead><tr><th>Task</th><th>Provider</th><th>Coverage</th></tr></thead><tbody>
              <tr><td>Text and detection</td><td>Google Translate web RPC</td><td>Default for the page and API</td></tr>
              <tr><td>Optional API text</td><td>GPT-5 nano</td><td><code>engine=openai</code> when an OpenAI key is configured</td></tr>
              <tr><td>Speech</td><td>Google Translate speech</td><td>English, French, and Spanish</td></tr>
            </tbody></table></div>
            <p class="docs-small">The Google web endpoints are unofficial and can change or restrict requests. The Listen button is unavailable for languages without speech support. If the source and target match, Translate returns the input without a provider call.</p>
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
  "engine": "google"
}</code></pre>
            <div class="docs-table-wrap"><table><thead><tr><th>Route</th><th>Returns</th></tr></thead><tbody>
              <tr><td><code>GET /api/source_languages/</code></td><td>Names and codes, including <code>auto</code></td></tr>
              <tr><td><code>GET /api/target_languages/</code></td><td>Names and codes, without <code>auto</code></td></tr>
              <tr><td><code>GET /api/capabilities/</code></td><td>Detection and speech support</td></tr>
              <tr><td><code>GET /api/health/</code></td><td>Default provider and optional OpenAI availability</td></tr>
              <tr><td><code>GET /api/tts/?text=Hello&amp;lang=en</code></td><td>Audio for supported languages</td></tr>
            </tbody></table></div>
            <p class="docs-small">Omit <code>engine</code> or set it to <code>google</code> for the default. The old <code>cloudflare</code> value remains an alias. If Google interprets an explicitly selected language as a different supported language, the response also has <code>provider_source</code>. Errors include <code>error</code> and <code>message</code>; upstream failures return 503.</p>
          </section>

          <section id="limits" class="docs-section">
            <p class="section-index">06 / LIMITS</p>
            <h2>Where to use judgment.</h2>
            <p>Short, ambiguous, and mixed-language text can confuse detection. Google read a Swati example as Zulu even with Swati selected; the page shows a note when that happens. Translation quality varies by language and sentence. Our comparison found errors for Igbo, Luganda, Wolof, and colloquial Zulu. Native-speaker review remains open.</p>
            <p>The Google web RPC and speech endpoint have no stability promise. If a provider fails, Translate reports the failure instead of substituting a different translation. The optional OpenAI path retains a small Zulu glossary, but the Google RPC has no glossary control.</p>
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
