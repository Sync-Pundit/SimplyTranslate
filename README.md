# Translate

Translate is Sync_Pundit's Cloudflare-native translation app. This repository is a fork of [SimplyTranslate Web](https://codeberg.org/SimpleWeb/SimplyTranslate-Web). The Worker uses Workers AI for speech. Text detection and translation can use GPT-5 nano when `OPENAI_API_KEY` is configured; otherwise they use Workers AI and a Cloudflare Container for 17 additional African languages. The original Quart app remains in the repository during the migration.

Libre is disabled while its Cloudflare-native implementation is in progress.

The Worker serves a public guide at `/docs`. The files in [`docs/`](docs/) hold the fuller repository references.

## Documentation

| Read | For |
| --- | --- |
| [Architecture](docs/architecture.md) | Worker components, model choices, browser behavior, and launch gaps |
| [Languages](docs/languages.md) | Supported choices, African and international additions, and coverage limits |
| [Deploy through Cloudflare Builds](docs/deployment.md) | Local checks, GitHub connection settings in Cloudflare, and release checks |
| [Cloudflare API](docs/api.md) | Current routes, parameters, responses, and errors |
| [Legacy Quart app](docs/legacy-app.md) | Run and configure the original app during migration |
| [Legacy API](api.md) | Routes and engines documented for the original Quart app |

## Repository layout

- `cloudflare/src/` contains the Worker and the page it serves.
- `cloudflare/Dockerfile.african` pins the African translation model used by the Container.
- `static/` contains the Cloudflare interface assets and files retained for the Quart app.
- `cloudflare/test/` contains Worker tests.
- `cloudflare/wrangler.jsonc` names the Worker `translate` and configures its bindings.
- `main.py`, `templates/`, `requirements.txt`, and `config.conf` belong to the legacy Quart app.

## Upstream and license

The original SimplyTranslate Web project and its instance list are maintained by [Simple Web](https://simple-web.org/projects/simplytranslate.html). The legacy app can relay third-party translation providers; the Worker uses the model routes described in [Architecture](docs/architecture.md). Provider names and trademarks belong to their owners. This fork is not affiliated with those providers.

This project is licensed under the [GNU Affero General Public License, version 3 or later](LICENSE).
