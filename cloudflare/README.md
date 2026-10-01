# Cloudflare Worker

This directory contains the `translate` Worker, its Wrangler configuration, a model Container, and tests. It serves the Sync_Pundit interface from `../static/`. When `OPENAI_API_KEY` is set, GPT-5 nano handles text detection and translation. Without the key, Workers AI handles detection and most translation, and AfriSLM handles 17 additional African languages through a Durable Object. Speech uses Workers AI in both cases.

Start with the [repository README](../README.md). The detailed docs are organized by task:

- [Architecture and migration status](../docs/architecture.md)
- [Local checks and Cloudflare Builds deployment](../docs/deployment.md)
- [Cloudflare API reference](../docs/api.md)
