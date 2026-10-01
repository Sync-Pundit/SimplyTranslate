# Translate

Translate is Sync_Pundit's translation app on a Cloudflare Worker. It is a fork of [SimplyTranslate Web](https://codeberg.org/SimpleWeb/SimplyTranslate-Web). The Worker sends text to Google Translate's web RPC for translation and automatic source detection. **Listen** sends text to Google's speech endpoint for English, French, or Spanish. Neither path needs a Workers AI binding or a model Container.

GPT-5 nano remains an optional API provider when `OPENAI_API_KEY` is configured. Google stays the default even when that secret exists. Libre remains disabled while its Cloudflare version is in progress. The original Quart app stays in the repository as a legacy reference.

The app has a public `/docs` guide. The files below cover implementation and deployment in more detail.

| Read | For |
| --- | --- |
| [Architecture](docs/architecture.md) | Worker routes, provider boundaries, privacy, and launch gaps |
| [Languages](docs/languages.md) | The 45 text choices and quality limits |
| [Deployment](docs/deployment.md) | Cloudflare Builds setup and release checks |
| [API](docs/api.md) | Routes, parameters, and responses |
| [Legacy Quart app](docs/legacy-app.md) | Running the original Python app |
| [Legacy API](api.md) | Routes documented for the original app |

## Repository layout

- `cloudflare/src/` contains the Worker, Google RPC adapter, optional OpenAI adapter, and page markup.
- `static/` contains the Worker interface and legacy app assets.
- `cloudflare/test/` tests the Worker contract and provider response handling.
- `cloudflare/wrangler.jsonc` configures the Worker and static assets.
- `main.py`, `templates/`, `requirements.txt`, and `config.conf` belong to the original Quart app.

## Provider status

The Google web RPC and speech endpoint are private web interfaces. We tested them through a remote Worker, but Google can change or restrict them. An upstream failure is shown as an error; Translate does not silently replace the provider's answer. [Google Cloud Translation's documented REST API](https://docs.cloud.google.com/translate/docs/reference/rest/v2/translate) is a separate integration to assess for a supported production path.

The original SimplyTranslate Web project is maintained by [Simple Web](https://simple-web.org/projects/simplytranslate.html). Provider names and trademarks belong to their owners. This fork is not affiliated with Google or OpenAI. The project is licensed under the [GNU Affero General Public License, version 3 or later](LICENSE).
