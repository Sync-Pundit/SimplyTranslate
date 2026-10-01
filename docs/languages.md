# Language coverage

Translate accepts the language codes returned by `/api/source_languages/` and `/api/target_languages/`. The browser reads these lists from the Worker. Automatic detection can choose from the same source languages, and returns an error when it cannot identify one reliably.

## International additions

These 15 additions follow the [OBDILCI 2025 V6 internet-user estimates](https://www.obdilci.org/proyectos/principal/), skipping languages Translate already offered. The order below follows that dataset, not a claim about translation quality. OBDILCI estimates connected first- and second-language speakers and reports a margin of uncertainty around 20%.

| Language | API code |
| --- | --- |
| Chinese | `zh` |
| Arabic | `ar` |
| Hindi | `hi` |
| Russian | `ru` |
| Malay | `ms` |
| Bengali | `bn` |
| Japanese | `ja` |
| Urdu | `ur` |
| Turkish | `tr` |
| Tagalog | `tl` |
| Persian | `fa` |
| Vietnamese | `vi` |
| Thai | `th` |
| Korean | `ko` |
| Marathi | `mr` |

The ranking dataset groups Malay and Indonesian under a broader Malay category. The `ms` option here means **Malay only**; Indonesian (`id`) is a separate model language and is not listed yet. Chinese (`zh`) and Arabic (`ar`) are also broad model codes. Do not assume every regional variety or writing system has been tested.

Translation for these additions uses Cloudflare's [Qwen3 model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/) except when translating into Zulu. Short live comparisons found errors from [M2M100](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/) and the existing Llama route for several international pairs. Translation into Zulu uses Llama because the Qwen3 output was worse in a cross-language check. A few examples do not establish translation quality; native-speaker review remains open, especially for Zulu. Speech remains available for English, French, and Spanish only.
