# Translate Worker API

All routes below are relative to the `translate` Worker. The [legacy Quart API](../api.md) has different routes and engines.

## Common rules

The default engine is `google`, including when `engine` is omitted. `engine=cloudflare` remains a compatibility alias and also uses Google. `engine=openai` is optional and requires `OPENAI_API_KEY`; it never becomes the default merely because the key exists. `engine=libre` returns HTTP 503 while Libre is disabled. Other names return HTTP 400.

Language values accept a code or name without regard to case. Fetch current choices from the language-list routes. `auto` is valid only for the translation source. JSON responses have `Cache-Control: no-store` and errors use this shape:

```json
{"error":"invalid_text","message":"Enter text to translate."}
```

## Routes

| Method | Path | Response |
| --- | --- | --- |
| `GET` | `/` | Translate page |
| `GET` | `/docs`, `/docs/` | Public guide and language list |
| `GET` | `/api/health/` | Default provider and optional OpenAI availability |
| `GET` | `/api/capabilities/` | Detection support and speech language codes |
| `GET` | `/api/source_languages/` | Plain-text language name and code pairs, including `auto` |
| `GET` | `/api/target_languages/` | Plain-text language name and code pairs, excluding `auto` |
| `GET`, `POST` | `/api/translate/` | Translation and source language |
| `GET` | `/api/tts/` | MP3 audio for English, French, or Spanish |

`/api/get_languages/` and `/translate/...` belong to the old app and are not Worker routes. Unknown paths return HTTP 404.

## Translate

`GET` reads query parameters. `POST` accepts form data or a JSON object. The page uses a form-encoded POST.

| Parameter | Required | Behavior |
| --- | --- | --- |
| `text` | Yes | Non-empty source text |
| `from` | No | Source language; omitted, empty, or `auto` asks Google to detect it |
| `to` | No | Target language; defaults to `en` |
| `engine` | No | `google` by default; `openai` is explicit and requires a secret |

Example request:

```json
{"text":"Hello","from":"en","to":"es"}
```

Example response:

```json
{"translated-text":"Hola","source":"en","target":"es","engine":"google"}
```

Google returns its inferred source in the same RPC response as the translation. When `from=auto`, Translate maps that code to a listed language or returns HTTP 422 and asks the user to choose manually. When a selected source differs from Google's inferred source, the Worker keeps the selection in `source` and adds `provider_source`:

```json
{"translated-text":"Hello","source":"ss","target":"en","engine":"google","provider_source":"zu"}
```

The page shows that difference beside the source menu. It does not imply the translation is correct. Short phrases can be misidentified. When an explicit source equals the target, the Worker returns the source text without a provider call. Google does not receive contextual glossary hints. The optional OpenAI route does retain hints for a few Zulu phrases.

## Speech

`GET /api/tts/` requires `text` and `lang`. The Worker accepts English (`en`), French (`fr`), and Spanish (`es`), fetches Google speech audio, and returns `audio/mpeg`. Long text is divided into provider-sized requests and joined in order. A failed or invalid chunk fails the whole request.

Speech text is in both the incoming request URL and the outbound Google URL. Avoid putting private text in a speech URL you plan to share or retain.

## Discovery and health

The language routes return alternating name and code lines. The source list begins:

```text
Detect language
auto
English
en
```

`/api/capabilities/` returns `automatic_source_detection: true` and `speech_languages: ["en", "es", "fr"]`. `/api/health/` reports `translation_provider: "google-rpc"`, `speech_provider: "google-tts"`, and whether OpenAI is available. HTTP 200 means these routes are configured in the Worker; it does not mean a live Google request succeeded.

## Errors

| HTTP status | `error` | Cause |
| --- | --- | --- |
| 400 | `invalid_request` | Unreadable or unsupported translation request format |
| 400 | `invalid_text` | Empty translation or speech text |
| 400 | `unsupported_engine` | Unknown engine name |
| 404 | `not_found` | No route or method handler |
| 422 | `unsupported_language` | Unknown source, target, or speech language |
| 422 | `language_not_detected` | Automatic detection returned no listed language |
| 422 | `speech_language_unavailable` | Known language outside the current speech set |
| 502 | `invalid_detection_response` | Optional OpenAI detection returned a conflicting or invalid source |
| 502 | `invalid_engine_response` | Provider returned invalid or empty text or audio |
| 503 | `engine_unavailable` | Libre or OpenAI unavailable, or a provider request failed |

The Google RPC and speech endpoint are private web interfaces. Google can change their format or access rules. The Worker reports an error instead of substituting a different provider or silently changing a selected source.
