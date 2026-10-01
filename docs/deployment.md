# Deploy Translate through Cloudflare Builds

[Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) reads this GitHub repository and deploys the `translate` Worker. The GitHub repository needs no deployment workflow or API token. Cloudflare manages authorization for its own build integration. Add `OPENAI_API_KEY` as a Worker secret to try GPT-5 nano for text detection and translation.

## Check the Worker locally

From the repository root, run:

```sh
cd cloudflare
npm ci
npm test
npm run check
```

For local OpenAI translation, copy `cloudflare/.env.example` to `cloudflare/.env`, replace the placeholder with your key, then run `npm run dev` from `cloudflare/`. Wrangler loads that file for local development. The file is gitignored; never commit the key. `npm run check` runs `wrangler deploy --dry-run --containers-rollout=none`. It checks the Worker bundle without rebuilding the model image or publishing anything. Without a key, local Wrangler development does not run the Workers AI binding in this project. To test live Cloudflare inference, use `npx wrangler dev --remote`; remote requests can incur Workers AI and Container charges. To verify the image locally, run `docker build -f Dockerfile.african -t translate-african .` from `cloudflare/` with Docker running.

The African model runs in [Cloudflare Containers](https://developers.cloudflare.com/containers/). The Cloudflare account needs a paid Workers plan with Containers available. The Dockerfile downloads a pinned model by checksum during the image build; the model file is not committed to Git.

For production, add `OPENAI_API_KEY` under the Worker's **Settings > Variables and Secrets** as a secret. The Worker reads it at runtime; Cloudflare Builds does not need the key as a build variable. With the secret, text detection and translation use GPT-5 nano. Without it, the existing Cloudflare models handle text. Speech still uses Workers AI. Never put the key in `wrangler.jsonc`, GitHub, or a public build variable. [Cloudflare's secret guide](https://developers.cloudflare.com/workers/configuration/secrets/) describes dashboard setup and local `.env` loading.

## Connect the GitHub repository

After the chosen production branch contains the Worker, connect the repository in Cloudflare:

1. Open **Workers & Pages** and select the Worker for this app.
2. Open **Settings > Builds > Connect** and select GitHub.
3. Select this repository and enter the settings below.
4. Save the connection. Push a commit to the selected production branch to start a build.

| Setting | Value |
| --- | --- |
| Production branch | The branch selected for production |
| Root directory | `/cloudflare/` |
| Build command | `npm ci && npm test && npm run check` |
| Deploy command | `npx wrangler deploy` |
| Preview command, if preview builds are enabled | `npx wrangler preview` |

The Worker name must match the `name` in `cloudflare/wrangler.jsonc`. The root directory places the build commands beside the lockfile and Wrangler config. That config points to `../static`, so the Worker deploys the interface assets with its code. Cloudflare runs the build command before the deploy command. A failed test or dry run stops the build before deployment.

If you enable branch Preview builds, use the Preview command above. `cloudflare/wrangler.jsonc` declares the AI, Durable Object, and Container configuration under `previews`; [Previews do not inherit production bindings](https://developers.cloudflare.com/workers/previews/configuration/). A Preview provisions its own container app and instances. Cloudflare provides a Preview URL for the branch.

Cloudflare builds and publishes the container image during the production deploy, then rolls out container instances. [The Worker update and image rollout are not transactional](https://developers.cloudflare.com/containers/guides/deploy/): the Worker can briefly be live before the container is ready. Check a translation involving a new African language after the rollout, not just the Worker build result. The first request after an idle period can take longer while the container starts.

## Check a Cloudflare build

Open the Worker's **Deployments** tab and inspect the build history. A successful production build creates an active deployment. Verify these paths on the URL reported by Cloudflare:

- `/` serves the Translate interface and its CSS and JavaScript.
- `/docs` serves the guide and shows the current language list.
- `/api/health/` reports the active text provider. It returns HTTP 200 when either the AI binding or OpenAI key is configured.
- `/api/source_languages/` lists the supported source languages.
- A short English to Spanish translation returns text through `/api/translate/`.
- A short English to Xhosa translation returns text. Without the OpenAI secret, allow time for the model container to start.
- **Copy share link** opens the same source text and language choices in a new tab.

Run a speech request in a regular browser before public launch. The model returned valid WAV bytes during development, but audio playback in the in-app preview failed.

Connecting Builds deploys the Worker on pushes to the selected production branch. Connect a public domain only after the [launch gaps](architecture.md#launch-gaps) and API compatibility checks are resolved.
