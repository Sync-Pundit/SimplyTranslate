# Cloudflare API reference

This page describes the routes in `cloudflare/src/index.js`. The [legacy Quart API](../api.md) has different engines and routes. All paths below are relative to the `translate` Worker.

## Common rules

The Worker accepts `cloudflare` or an omitted `engine` value. `engine=libre` returns HTTP 503 while Libre is disabled. Other engine values return HTTP 400.

Language values accept a code or name without regard to case: `en` or `English`, for example. Use the language-list routes below to get the current supported codes; [Language coverage](languages.md) explains the international additions. Automatic detection is valid only for the translation source language.

JSON responses include `Content-Type: application/json; charset=utf-8` and `Cache-Control: no-store`. Errors use this shape:

```json
{"error":"invalid_text","message":"Enter text to translate."}
```

## Routes

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Translate HTML page |
| `GET` | `/api/health/` | AI binding status and translation model |
| `GET` | `/api/capabilities/` | Detection support flag and speech language codes |
| `GET` | `/api/source_languages/` | Plain-text language name and code pairs, including `auto` |
| `GET` | `/api/target_languages/` | Plain-text language name and code pairs, excluding `auto` |
| `GET`, `POST` | `/api/translate/` | Translated text and resolved language codes |
| `GET` | `/api/tts/` | WAV or MP3 audio, based on the returned bytes |

`/api/get_languages/` and `/translate/...` are not Worker routes. Unknown paths return HTTP 404 with `error: "not_found"`.

## Translation

`GET` reads query parameters. `POST` accepts `application/x-www-form-urlencoded`, `multipart/form-data`, or a JSON object. The browser uses a form-encoded `POST`.

| Parameter | Required | Behavior |
| --- | --- | --- |
| `text` | Yes | Non-empty source text |
| `from` | No | Source language; omitted, empty, or `auto` starts detection |
| `to` | No | Target language; defaults to `en` |
| `engine` | No | Omitted or `cloudflare` |

For example, send `{"text":"Hello","from":"en","to":"fr"}` as JSON to `/api/translate/`. A successful response has this shape:

```json
{"translated-text":"Bonjour","source":"en","target":"fr","engine":"cloudflare"}
```

When `from=auto`, detection examines the first 1,000 characters. An uncertain or unsupported language produces an error that asks the caller to choose a source language. When source and target match, the Worker returns the source text without a translation model call.

Zulu to English uses a Cloudflare-hosted language model, with a glossary hint when the source contains a known term. Translation into Zulu and Afrikaans pairs within the original language set use that model too. Pairs involving the 15 international additions use Cloudflare-hosted Qwen3, except when the target is Zulu. The remaining pairs use M2M100. The API response shape stays the same.

## Speech

`GET /api/tts/` requires `text` and `lang` query parameters. `lang` accepts English (`en`), French (`fr`), or Spanish (`es`). A successful response contains audio bytes with `Content-Type: audio/wav` or `audio/mpeg`. The Worker chooses the type from the bytes returned by the model.

The text is part of the request URL for speech. Avoid putting private text into a speech URL that you plan to share or retain.

## Discovery and health

`GET /api/source_languages/` and `GET /api/target_languages/` return plain text in alternating name and code lines. For example, the source list starts with:

```text
Detect language
auto
English
en
```

`GET /api/capabilities/` currently returns `automatic_source_detection: true` and `speech_languages: ["en", "es", "fr"]`. This reports supported features, not whether the AI binding is working. `GET /api/health/` returns HTTP 200 with `ok: true` when the AI binding is available, and includes `model`, `zulu_english_model`, and `international_model`. Without the binding it returns HTTP 503 with `ok: false`.

## Error codes

| HTTP status | `error` | Cause |
| --- | --- | --- |
| 400 | `invalid_request` | Translation request body cannot be read or has an unsupported format |
| 400 | `invalid_text` | Translation or speech text is empty |
| 400 | `unsupported_engine` | Engine is neither omitted nor `cloudflare` |
| 404 | `not_found` | Path or method has no handler |
| 422 | `unsupported_language` | Source, target, or speech language is unknown |
| 422 | `language_not_detected` | Automatic detection did not identify a supported language |
| 422 | `speech_language_unavailable` | Speech language is known but not available in MeloTTS here |
| 502 | `invalid_detection_response` | Detection returned an unexpected language code |
| 502 | `invalid_engine_response` | Translation or speech returned invalid or empty output |
| 503 | `detection_unavailable` | Detection call failed or its response could not be read |
| 503 | `engine_unavailable` | Libre is disabled, AI is not bound, or a model call failed |
