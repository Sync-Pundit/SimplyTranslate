# Deploy Translate through Cloudflare Builds

[Cloudflare Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/) can build and deploy this repository from GitHub. The repository needs no deployment workflow or Cloudflare API token. The default Google path needs no secret or model binding. Add `OPENAI_API_KEY` as a Worker secret only if you want the optional `engine=openai` API route.

## Check locally

From the repository root:

```sh
cd cloudflare
npm ci
npm test
npm run check
npm run dev
```

`npm run check` performs a Wrangler dry run. `npm run dev` serves the UI and makes outbound Google requests when you translate or select **Listen**. For optional local OpenAI requests, copy `cloudflare/.env.example` to `cloudflare/.env`, add your key, and keep the file outside Git. Wrangler reads it for local development. The UI still uses Google when a key exists.

The test suite uses recorded response shapes and does not call Google. Before release, make a small live translation and speech request against the branch Preview. Do not treat a dry run as proof that Google's private endpoints are reachable.

## Connect GitHub

In the Cloudflare dashboard, connect the repository under the Worker's **Settings > Builds**. Use:

| Setting | Value |
| --- | --- |
| Production branch | The branch selected for production |
| Root directory | `/cloudflare/` |
| Build command | `npm ci && npm test && npm run check` |
| Deploy command | `npx wrangler deploy` |
| Preview command, if enabled | `npx wrangler preview` |

The Worker name comes from `cloudflare/wrangler.jsonc`. Its static assets directory points to `../static`, so code and interface files deploy together. A failed test or dry run stops the build before deployment. Cloudflare authorizes the GitHub connection in its dashboard.

If using OpenAI, add `OPENAI_API_KEY` under the Worker's **Settings > Variables and Secrets** as a runtime secret. Do not put it in GitHub, `wrangler.jsonc`, or a public build variable. [Cloudflare's secret guide](https://developers.cloudflare.com/workers/configuration/secrets/) describes the dashboard setup.

## Verify a release

Check the URL supplied by Cloudflare, without adding it to this repository:

- `/` loads the app, both themes, and the current language menus.
- `/docs` describes Google as the default provider and lists 45 text choices.
- `/api/health/` reports `google-rpc` and optional OpenAI availability. It does not probe Google.
- A source-selected English to Spanish request returns text through `/api/translate/`.
- An automatic-source Zulu request displays its detected language beside the source menu.
- A Swati request can display Google's differing source interpretation without changing the selected language.
- **Listen** plays English, French, and Spanish audio in a regular browser. Check a passage long enough to use multiple audio chunks.
- **Copy share link** opens the same source text and language choices in a new tab.

## Retire previous resources

This branch removes the Workers AI, Durable Object, and Container bindings used by the old translation path. It adds no Durable Object deletion migration, so deploying this code is not a request to delete the old namespace and its data. [Cloudflare's Container guide](https://developers.cloudflare.com/containers/guides/migrate-to-durable-object-scheduling-policy/) notes that removing a Container entry from Wrangler does not delete an existing application. After verifying the new route, inspect the account's old Container application and remove it through Cloudflare's resource controls when it is no longer needed. Durable Object deletion is a separate, irreversible operation; review any stored data and other bindings first.

The Google web RPC and speech endpoint are unofficial. They can change or restrict requests. Check live errors and traffic before moving a public domain. The [architecture guide](architecture.md#launch-checks) lists the remaining quality work.
