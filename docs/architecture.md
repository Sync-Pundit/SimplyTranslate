# Cloudflare architecture

## Request path

`cloudflare/src/index.js` handles the page, `/docs`, and API routes. The app markup lives in `cloudflare/src/page.js`; `cloudflare/src/docs.js` renders the public guide from the Worker's current language list. Wrangler uploads the files in `static/` as Workers Static Assets, and both pages load their CSS and JavaScript from the same origin. The Worker does not store translations or user history.

The browser sends text to `/api/translate/`. A selected source language goes straight to translation. For `from=auto`, the Worker first asks Workers AI to identify one of its supported languages from the first 1,000 characters. It returns an error when detection is uncertain or unavailable. It never silently assumes English.

Translation uses Cloudflare's M2M100 model for the original language pairs. Zulu to English, translation into Zulu, and Afrikaans pairs within the original language set use the Cloudflare-hosted Llama model. The [15 international additions](languages.md) use Cloudflare-hosted Qwen3 for other directions after short live comparisons exposed errors from M2M100 and Llama. If the source and target languages match, the Worker returns the input without a model call. The browser sends text to `/api/tts/` only when a user selects **Listen**. Speech uses MeloTTS and is available for English, French, and Spanish.

The Zulu to English prompt includes a small glossary only when a known term appears in the source. It covers a few colloquial words, music terms, and place names alongside common forms such as `wenzani`. It gives context to the model without replacing the source text. Short phrases can still be ambiguous, especially when a phrase is also a title. Broader Zulu quality needs native-speaker evaluation.

| Function | Model or resource | Current coverage |
| --- | --- | --- |
| Translation | `@cf/meta/m2m100-1.2b` | Original language pairs not covered by the routes below |
| International translation | `@cf/qwen/qwen3-30b-a3b-fp8` | Pairs involving any of the 15 new languages, except into Zulu |
| Zulu translation | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Translation into Zulu; Zulu to English uses a relevant glossary hint when available |
| Afrikaans pairs | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | Translation to and from Afrikaans within the original language set |
| Source detection | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` | The same 23 languages; `und` means no supported language was identified |
| Speech | `@cf/myshell-ai/melotts` | English, French, and Spanish |
| Interface files | Workers Static Assets | `static/`, configured by `cloudflare/wrangler.jsonc` |

The production and branch Preview configurations both declare the `AI` binding. The assets directory stays at the top level of the Wrangler config because Previews use the branch's asset files.

## Browser behavior

The interface and `/docs` have light and dark themes. They start with the system preference and share a manual choice in the browser's local storage. The source and result panes use different surfaces in both themes.

The browser uses a POST request for translation. **Copy share link** creates a URL with the source text and language choices, then copies it to the clipboard. Opening that URL loads and translates the source text again. Anyone with the link can read the original text in its query string.

## Migration boundary

The original Quart application remains in `main.py`. Its [legacy API documentation](../api.md) describes provider engines and routes that the Worker does not implement. The Worker accepts the `cloudflare` engine or an omitted engine. Requests for `libre` return a service-unavailable error while Libre is disabled. Requests for other engine names return an unsupported-engine error.

The Cloudflare Worker does not implement the legacy `/api/get_languages/` endpoint, the old `/translate/...` route, or server-side preferences. Check existing consumers before moving the public domain. The [Cloudflare API reference](api.md) lists the current routes.

## Launch gaps

- Confirm audible speech playback in a regular browser. A hosted speech request returned a valid WAV file, but playback in the in-app preview failed with a media source error.
- Decide how to handle speech for German, Italian, Portuguese, and Zulu. MeloTTS is not enabled for those languages in this Worker.
- Compare translation quality and latency across supported language pairs, especially Zulu. Check ambiguous and mixed-language detection.
- Evaluate the [international additions](languages.md) with native speakers and varied text lengths; model coverage and smoke checks do not establish linguistic accuracy.
- Evaluate the remaining South African written languages before listing them; short live checks exposed wrong speaker or tense in Xhosa and Swati output and confused related languages during automatic detection.
- Measure the cost and latency of the Zulu to English language-model path at production load.
- Add account-level cost and abuse controls before exposing public billable inference.
- Review consumers of legacy routes and the public domain cutover.

As of 2026-10-01, Worker unit tests and a Wrangler dry run pass. Hosted text and speech requests were exercised during development. These checks do not close the launch gaps above.
