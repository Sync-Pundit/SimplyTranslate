# Cloudflare Worker

This directory contains the `translate` Worker, its Wrangler configuration, a model Container, and tests. It serves the Sync_Pundit interface from `../static/`, uses Workers AI for most language tasks, and routes 17 additional African languages to AfriSLM through a Durable Object.

Start with the [repository README](../README.md). The detailed docs are organized by task:

- [Architecture and migration status](../docs/architecture.md)
- [Local checks and Cloudflare Builds deployment](../docs/deployment.md)
- [Cloudflare API reference](../docs/api.md)
