# Language coverage

Translate lists 45 text languages through `/api/source_languages/` and `/api/target_languages/`. The page reads those lists from the Worker. Google Translate's web RPC is the default provider for every listed pair. Automatic detection uses the same RPC and can be wrong for short or related-language text. The menu describes intended coverage, not a quality guarantee for every language pair.

## South African languages

The menu now includes English (`en`), Afrikaans (`af`), Zulu (`zu`), Xhosa (`xh`), South Ndebele (`nr`), Northern Sotho or Sepedi (`nso`), Swati (`ss`), Southern Sotho (`st`), Setswana (`tn`), Tsonga (`ts`), and Venda (`ve`). South Ndebele is distinct from Northern Ndebele. The five newly available choices are South Ndebele, Northern Sotho, Swati, Tsonga, and Venda.

In a Swati to English test, the RPC returned a translation but labeled its inferred source as Zulu. Translate now exposes a source mismatch instead of silently relabeling the user's choice. Related languages and regional speech still need fluent review.

## Other African languages

| Language | API code | Language | API code |
| --- | --- | --- | --- |
| Amharic | `am` | Hausa | `ha` |
| Igbo | `ig` | Kinyarwanda | `rw` |
| Lingala | `ln` | Luganda | `lg` |
| Malagasy | `mg` | Nyanja | `ny` |
| Oromo | `om` | Shona | `sn` |
| Somali | `so` | Swahili | `sw` |
| Wolof | `wo` | Yoruba | `yo` |

The Google web RPC returned Wolof text in our checks, but Wolof is absent from [Google Cloud Translation's published language list](https://docs.cloud.google.com/translate/docs/languages). The private RPC result does not establish official API support. A three-sentence comparison found significant errors for Igbo, Luganda, and Wolof. Treat important results as unverified until a fluent speaker reviews them.

## International additions

These 15 additions follow the [OBDILCI 2025 V6 internet-user estimates](https://www.obdilci.org/proyectos/principal/), skipping languages Translate already offered. That dataset estimates connected first- and second-language speakers and reports uncertainty around 20%. The order is about estimated internet use, not translation quality.

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

Malay (`ms`) does not include Indonesian (`id`). Chinese (`zh`) and Arabic (`ar`) cover broad language groups. Regional varieties and writing systems still need review. English, French, German, Italian, Portuguese, and Spanish remain available from the original list.

## Optional OpenAI route

A Worker with `OPENAI_API_KEY` can also accept `engine=openai` through the API. It uses GPT-5 nano for detection and translation. The page and requests without that parameter continue to use Google. The OpenAI route has contextual hints for a few Zulu phrases, but neither route has been validated across every listed language or dialect. Speech currently covers English, French, and Spanish only.
