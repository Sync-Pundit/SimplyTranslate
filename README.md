# Translate

Translate is Sync_Pundit's Cloudflare-native translation app. This repository is a fork of [SimplyTranslate Web](https://codeberg.org/SimpleWeb/SimplyTranslate-Web). The Cloudflare Worker uses Workers AI for translation, source language detection, and supported speech. The original Quart app remains in the repository during the migration.

Libre is disabled while its Cloudflare-native implementation is in progress.

## Documentation

| Read | For |
| --- | --- |
| [Architecture](docs/architecture.md) | Worker components, model choices, browser behavior, and launch gaps |
| [Deploy through Cloudflare Builds](docs/deployment.md) | Local checks, GitHub connection settings in Cloudflare, and release checks |
| [Cloudflare API](docs/api.md) | Current routes, parameters, responses, and errors |
| [Legacy Quart app](docs/legacy-app.md) | Run and configure the original app during migration |
| [Legacy API](api.md) | Routes and engines documented for the original Quart app |

## Repository layout

- `cloudflare/src/` contains the Worker and the page it serves.
- `static/` contains the Cloudflare interface assets and files retained for the Quart app.
- `cloudflare/test/` contains Worker tests.
- `cloudflare/wrangler.jsonc` names the Worker `translate` and configures its bindings.
- `main.py`, `templates/`, `requirements.txt`, and `config.conf` belong to the legacy Quart app.

## Upstream and license

The original SimplyTranslate Web project and its instance list are maintained by [Simple Web](https://simple-web.org/projects/simplytranslate.html). The legacy app can relay third-party translation providers; the Cloudflare Worker uses Workers AI instead. Provider names and trademarks belong to their owners. This fork is not affiliated with those providers.

This project is licensed under the [GNU Affero General Public License, version 3 or later](LICENSE).
