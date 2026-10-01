# Language coverage

Translate accepts the language codes returned by `/api/source_languages/` and `/api/target_languages/`. The browser reads these lists from the Worker. Automatic detection can choose from the same source languages, and returns an error when it cannot identify one reliably.

## African model coverage

The [AfriSLM model](https://huggingface.co/qvac/TranslatePsy-AfriSLM-0.8B-Q4-GGUF) names 19 African languages. Afrikaans (`af`) and Zulu (`zu`) were already in Translate. This release adds the other 17:

| Language | API code | Language | API code |
| --- | --- | --- | --- |
| Amharic | `am` | Hausa | `ha` |
| Igbo | `ig` | Kinyarwanda | `rw` |
| Lingala | `ln` | Luganda | `lg` |
| Malagasy | `mg` | Nyanja | `ny` |
| Oromo | `om` | Shona | `sn` |
| Somali | `so` | Southern Sotho | `st` |
| Swahili | `sw` | Tswana | `tn` |
| Wolof | `wo` | Xhosa | `xh` |
| Yoruba | `yo` |  |  |

When `OPENAI_API_KEY` is set, GPT-5 nano handles detection and translation for all listed text languages. Its accuracy for these languages has not yet been verified. Without the key, these additions use AfriSLM in a Cloudflare Container for English to African translation and back. A pair without English passes through English. Zulu and Afrikaans retain their existing Cloudflare routes, and automatic detection uses Workers AI. The specialist model's license is Apache 2.0; its weights are pinned by revision and checksum in `cloudflare/Dockerfile.african`.

This is **model coverage, not a claim of accurate translation for every language or dialect**. Short live checks showed incorrect output for some Igbo, Luganda, and Wolof sentences; colloquial Zulu also remains difficult. Related languages can confuse automatic detection. Check important text with a fluent speaker. Without the OpenAI key, requests involving the 17 additions are limited to 1,800 characters, and a sleeping model container can add latency.

Northern Sotho (Sepedi), Swati, Venda, Tsonga, and South Ndebele are among the South African languages still missing. Many more African languages are outside this model. Add them only with a suitable model and meaningful quality checks.

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

With the OpenAI key, GPT-5 nano handles these pairs. Otherwise, translation uses Cloudflare's [Qwen3 model](https://developers.cloudflare.com/workers-ai/models/qwen3-30b-a3b-fp8/) except when translating into Zulu. Short live comparisons found errors from [M2M100](https://developers.cloudflare.com/workers-ai/models/m2m100-1.2b/) and the existing Llama route for several international pairs. Translation into Zulu uses Llama because the Qwen3 output was worse in a cross-language check. A few examples do not establish translation quality; native-speaker review remains open, especially for Zulu. Speech remains available for English, French, and Spanish only.
