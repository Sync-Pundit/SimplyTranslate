# Translate on Cloudflare

This directory contains the Cloudflare Worker version of Translate. It serves a new Sync_Pundit interface from Workers Static Assets and uses Workers AI for translation, source language detection, and speech. Libre is disabled. The original Quart application remains in the repository during migration.

## Run and check

```sh
cd cloudflare
npm ci
npm test
npm run check
npm run dev
```

`npm run check` makes a deployment bundle without publishing it. Local `wrangler dev` cannot run the AI binding. Use `npx wrangler dev --remote` for a temporary hosted preview when live inference is needed. That preview sends text to Workers AI and can incur charges.

## Deploy from GitHub

The [Translate Cloudflare workflow](../.github/workflows/translate-cloudflare.yml) runs tests and a Wrangler dry run on pull requests that change `cloudflare/`, `static/`, or the workflow. A manual **Run workflow** action on GitHub repeats those checks and then deploys the Worker named `simplytranslate-preview`. Pushes do not publish it automatically while launch work is still open.

Set these repository Actions secrets before the first manual run:

- `CLOUDFLARE_ACCOUNT_ID`: the account ID for the Sync_Pundit Cloudflare account.
- `CLOUDFLARE_API_TOKEN`: a token scoped to that account with the **Edit Cloudflare Workers** permission. Keep the token in GitHub Actions secrets, not in the repository.

After the workflow is on the repository's default branch, open **Actions > Translate Cloudflare > Run workflow**. Select the branch you want to deploy. The job uses the lockfile in `cloudflare/`, tests the code, checks the deployment bundle, and runs Wrangler from that directory. The Wrangler configuration serves the sibling `static/` directory as assets. Check the job log for the resulting `workers.dev` URL and verify `/api/health/` there.

This publishes the preview Worker only. It does not route `public domain` to the Worker. Review the Worker name, route, launch gaps, and account-level inference controls before connecting the public domain.

## Current behavior

- The text interface supports English, French, German, Italian, Portuguese, Spanish, and Zulu. The Worker runs [M2M100](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/) for explicit source and target languages.
- `from=auto` uses [Llama 3.3 70B](https://developers.cloudflare.com/workers-ai/models/llama-3.3-70b-instruct-fp8-fast/) with [JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/) to identify one of those seven languages. It asks for manual selection when the language cannot be identified. An invalid model answer is an error, never an English fallback.
- `/api/translate/` accepts query, form, or JSON parameters and returns the existing `translated-text` field plus source, target, and engine. Detection examines the first 1,000 characters; the full text goes to the translation model.
- `/api/tts/` uses [MeloTTS](https://developers.cloudflare.com/workers-ai/models/melotts/) for English, French, and Spanish. It returns WAV or MP3 according to the actual audio bytes. The interface enables Listen only when the chosen language is supported.
- `/api/capabilities/` tells the browser whether detection is available and which languages can be spoken. Source and target language endpoints retain the old two-line name/code format.
- The browser has separate light and dark themes. It starts with the system preference, remembers a manual choice in local storage, and keeps the source and result panes visually distinct in both themes.
- Shared links include the source text in the URL. The page states this beside the share control. The browser uses POST for translation and returns no stored translation history.

## Validation status

Unit tests and a Wrangler dry run pass. A hosted preview returned text for English to Spanish and automatic French to English. A hosted French speech request returned valid 44.1 kHz mono WAV audio. The browser completed a live automatic French to Spanish translation and exposed source and result Listen controls. Browser playback failed in the in-app preview with a media source error, so audible playback still needs confirmation in a regular browser before launch.

## Before production

- Compare output and latency for every listed language pair, especially Zulu, and test ambiguous or mixed-language detection.
- Confirm speech playback in normal browsers. MeloTTS does not cover German, Italian, Portuguese, or Zulu here; decide whether those languages need another speech provider for launch.
- Add account-level cost and abuse controls before exposing public billable inference.
- Check existing API consumers and the old `/translate/...` route before switching the domain. The Worker does not implement that route or server-side preferences.
- Review the production Worker name and route, then deploy after acceptance. This preview has not replaced the existing domain.
