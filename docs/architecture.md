# Translate architecture

The Cloudflare Worker serves the interface and `/docs` from the repository's static assets. It owns `/api/translate/`, language discovery, `/api/tts/`, capabilities, and health. The browser sends translation text to the Worker with a form POST. The Worker sends one request to Google Translate's web RPC for translation and automatic detection. The response is parsed inside the Worker and returned as JSON.

The page always uses Google. The optional `engine=openai` API path sends text to GPT-5 nano when `OPENAI_API_KEY` is configured. A configured key does not change the page or default API provider. The OpenAI path retains contextual hints for a few Zulu phrases. Google's RPC has no glossary or prompt control.

The **Listen** button calls the Worker only after a click. The Worker fetches MP3 audio from Google's speech endpoint for English, French, or Spanish. Long text is divided into provider-sized requests and the MP3 data is joined in order. The Worker no longer binds Workers AI or routes any translation to a Container.

## Source detection and language choices

The source menu has 45 text languages plus **Detect language**. A Google RPC response includes the language it inferred. For automatic detection, Translate reports that code when it maps to a listed language. An unsupported or uncertain code asks the user to select the source manually. Short phrases can be misidentified; selecting the source is the more reliable path.

If a user explicitly selects a language and Google reports another listed language, Translate keeps the selected source in the API response and adds `provider_source`. The page shows the difference beside the source menu. It does not hide the upstream interpretation. When source and target are explicitly the same, the Worker returns the input without an external request.

The old `engine=cloudflare` parameter is accepted as an alias for the Google default while existing clients migrate. `engine=libre` still returns HTTP 503. Other unknown engines return HTTP 400. See the [API reference](api.md) for the full contract.

## Privacy and failure behavior

Text is sent to Google for translation and detection. OpenAI receives text only on an explicit `engine=openai` request. Speech text is sent to Google in a URL after the user selects **Listen**. Translate keeps no server-side translation history and sends `Cache-Control: no-store` on API responses. A copied share link contains the original text in its query string.

The Google RPC and speech URL are private web interfaces. Their format, access rules, and behavior may change without notice. Network or upstream failures return HTTP 503. A malformed translation or audio response returns HTTP 502. Neither is presented as a successful translation. `/api/health/` reports configured routes; it does not call Google.

## Migration status

The original Quart app remains in `main.py`, with a different API and engine list. The Worker does not implement its `/api/get_languages/` or `/translate/...` routes. Check external consumers before moving a public domain.

The former African model Container, Durable Object, and Workers AI bindings have been removed from the Worker config. There is no deletion migration, so this code does not intentionally delete the old namespace or data. Retiring old Cloudflare resources is an account operation after the new route is live and verified. See [Deployment](deployment.md).

## Launch checks

- Review African-language and colloquial translations with fluent speakers. A small set of Igbo, Luganda, Wolof, and Zulu examples exposed errors in multiple providers.
- Test short and mixed-language detection; Google can misidentify a short phrase even when longer text is correct.
- Check speech playback, including text that needs more than one audio chunk, in regular browsers.
- Observe Google RPC failures and rate limits under real traffic. The endpoint has no public service contract.
- Decide whether to move the default to the supported Google Cloud Translation REST API after measuring its quality, coverage, and cost separately.
- Check existing clients of the legacy Quart routes before public cutover.
