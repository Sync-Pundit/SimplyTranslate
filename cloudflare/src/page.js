export const page = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#101816" media="(prefers-color-scheme: dark)">
  <meta name="theme-color" content="#edf4ee" media="(prefers-color-scheme: light)">
  <meta name="description" content="Translate words across languages with Sync_Pundit.">
  <title>Translate / Sync_Pundit</title>
  <link rel="icon" href="/translate-mark.svg?v=20261001.3" type="image/svg+xml">
  <script src="/theme.js?v=20261001.1"></script>
  <link rel="stylesheet" href="/translate.css?v=20261001.7">
  <script src="/cloudflare.js?v=20261001.3" defer></script>
</head>
<body>
  <a class="skip-link" href="#input">Skip to text</a>
  <div class="site-shell">
    <header class="topbar">
      <a class="brand" href="/" aria-label="Sync Pundit Translate home">
        <img class="brand-mark" src="/translate-mark.svg?v=20261001.3" alt="">
        <span class="brand-name">SYNC<span>_</span>PUNDIT</span>
        <span class="brand-divider" aria-hidden="true"></span>
        <span class="brand-tool">TRANSLATE</span>
      </a>
      <div class="topbar-actions">
        <span class="topbar-end"><span class="status-dot" aria-hidden="true"></span> A language tool</span>
        <button id="theme-toggle" class="theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme">
          <svg class="icon-sun" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>
          <svg class="icon-moon" viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.9A8.5 8.5 0 0 1 8.1 3.8 8.5 8.5 0 1 0 20.2 15.9Z"/></svg>
        </button>
      </div>
    </header>

    <main>
      <section class="intro" aria-labelledby="page-title">
        <div class="intro-index" aria-hidden="true"><span>SP / 01</span><span class="index-rule"></span><span>WORDS</span></div>
        <div class="intro-copy">
          <p class="overline">Language moves</p>
          <h1 id="page-title">Translate<span class="title-stop">.</span></h1>
          <p class="intro-deck">Write in one language. Read in another.</p>
        </div>
        <div class="intro-art" aria-hidden="true"><span class="art-word art-word-a">Aa</span><span class="art-path"></span><span class="art-word art-word-b">Ñ</span></div>
      </section>

      <form id="translation-form" class="workspace" novalidate>
        <div class="workspace-topline"><span>01 / TEXT</span><span>CLOUDFLARE AI</span></div>
        <div class="language-strip">
          <div class="language-control">
            <label for="from_language">From</label>
            <select name="from_language" id="from_language"><option value="">Loading languages</option></select>
          </div>
          <button id="switchbutton" class="swap-button" aria-label="Swap languages" type="button" title="Swap languages">
            <svg viewBox="0 0 28 28" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" aria-hidden="true"><path d="M4 10h18m-5-5 5 5-5 5M24 18H6m5-5-5 5 5 5"/></svg>
          </button>
          <div class="language-control language-control-target">
            <label for="to_language">To</label>
            <select name="to_language" id="to_language"><option value="">Choose a language</option></select>
          </div>
        </div>

        <div class="editor-grid">
          <section class="editor editor-source" aria-labelledby="source-title">
            <div class="editor-heading"><h2 id="source-title">Your words</h2><span id="from-label" class="language-code">AUTO</span></div>
            <label class="visually-hidden" for="input">Text to translate</label>
            <textarea id="input" name="input" dir="auto" spellcheck="true" placeholder="Start typing, or paste something here."></textarea>
            <div class="editor-footer"><span id="character-count">0 characters</span><div class="result-actions"><button id="listen-source" type="button" class="text-button" disabled>Listen</button><button id="clear-input" type="button" class="text-button" disabled>Clear</button></div></div>
          </section>
          <section class="editor editor-result" aria-labelledby="result-title">
            <div class="editor-heading"><h2 id="result-title">Over there</h2><span id="to-label" class="language-code">ES</span></div>
            <label class="visually-hidden" for="output">Translated text</label>
            <textarea id="output" class="translation" dir="auto" placeholder="Your translation will land here." readonly></textarea>
            <div class="editor-footer"><span id="result-note">Ready when you are</span><div class="result-actions"><button id="listen-result" type="button" class="text-button" disabled>Listen</button><button id="copy-result" type="button" class="text-button" disabled>Copy text</button></div></div>
          </section>
        </div>

        <div class="workspace-bottom">
          <div id="translation-status" class="message" role="status" aria-live="polite">Enter text to begin.</div>
          <div class="share-action">
            <button id="copy-share" type="button" class="share-button" aria-describedby="share-note" disabled>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2.1-2.1a5 5 0 0 0-7.1-7.1L10.8 5"/><path d="M14 11a5 5 0 0 0-7.1 0l-2.1 2.1a5 5 0 0 0 7.1 7.1l1.3-1.3"/></svg>
              <span>Copy share link</span>
            </button>
            <span id="share-note" class="share-note">Includes your original text</span>
          </div>
          <button class="translate-button" type="submit"><span>Translate</span><span aria-hidden="true">↗</span></button>
        </div>
      </form>

      <div class="under-workspace"><span>Ctrl / ⌘ + Enter to translate</span></div>
      <input id="share-url" type="hidden">
    </main>

    <footer class="site-footer"><span>SYNC_PUNDIT <span class="footer-divider">/</span> TRANSLATE</span><span>Words should be able to travel.</span></footer>
  </div>
</body>
</html>`;
