# Translate Worker

This directory contains the Worker, provider adapters, Wrangler configuration, and tests. Google Translate's web RPC handles text and detection by default. Google's speech endpoint handles English, French, and Spanish when a user selects **Listen**. `OPENAI_API_KEY` enables GPT-5 nano only for requests that explicitly set `engine=openai`.

Run `npm ci`, `npm test`, and `npm run check` here. `npm run dev` serves the app locally and makes outbound Google requests for translation and speech. The Google path needs no secret. Use `cloudflare/.env` for an optional local OpenAI key; it is gitignored.

Read the [repository README](../README.md), [architecture](../docs/architecture.md), [deployment guide](../docs/deployment.md), and [API reference](../docs/api.md).
