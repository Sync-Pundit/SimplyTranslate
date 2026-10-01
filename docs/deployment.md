# Deploy Translate through Cloudflare Builds

[Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) reads this GitHub repository and deploys the `translate` Worker. The GitHub repository needs no deployment workflow or Cloudflare secret. Cloudflare manages authorization for its own build integration.

## Check the Worker locally

From the repository root, run:

```sh
cd cloudflare
npm ci
npm test
npm run check
```

`npm run check` builds the deployment bundle with `wrangler deploy --dry-run`. It does not publish the Worker. For interface work, run `npm run dev`. Local Wrangler development does not run the Workers AI binding in this project. To test live inference, use `npx wrangler dev --remote`; remote requests can incur Workers AI charges.

## Connect the GitHub repository

After the migration branch is ready to become the production source and has been merged into `master`, connect the repository in Cloudflare:

1. Open **Workers & Pages** and select the existing Worker named `translate`.
2. Open **Settings > Builds > Connect** and select GitHub.
3. Select `Sync-Pundit/SimplyTranslate` and enter the settings below.
4. Save the connection. Push a commit to `master` to start a build.

| Setting | Value |
| --- | --- |
| Production branch | `master` |
| Root directory | `/cloudflare/` |
| Build command | `npm ci && npm test && npm run check` |
| Deploy command | `npx wrangler deploy` |
| Preview command, if preview builds are enabled | `npx wrangler preview` |

The Worker name must match `"name": "translate"` in `cloudflare/wrangler.jsonc`. The root directory places the build commands beside the lockfile and Wrangler config. That config points to `../static`, so the Worker deploys the interface assets with its code. Cloudflare runs the build command before the deploy command. A failed test or dry run stops the build before deployment.

If you enable branch Preview builds, use the Preview command above. `cloudflare/wrangler.jsonc` declares the `AI` binding in `previews.ai`; [Previews do not inherit production bindings](https://developers.cloudflare.com/workers/previews/configuration/). Cloudflare provides a Preview URL for the branch.

## Check a Cloudflare build

Open the Worker's **Deployments** tab and inspect the build history. A successful production build creates an active deployment. Verify these paths on the URL reported by Cloudflare:

- `/` serves the Translate interface and its CSS and JavaScript.
- `/api/health/` returns HTTP 200 with `"ok": true` when the AI binding is available.
- `/api/source_languages/` lists the supported source languages.
- A short English to Spanish translation returns text through `/api/translate/`.
- **Copy share link** opens the same source text and language choices in a new tab.

Run a speech request in a regular browser before public launch. The model returned valid WAV bytes during development, but audio playback in the in-app preview failed.

Connecting Builds deploys the Worker on pushes to the selected production branch. It does not connect `translate.syncpundit.io`. Add the public domain only after the [launch gaps](architecture.md#launch-gaps) and API compatibility checks are resolved.
