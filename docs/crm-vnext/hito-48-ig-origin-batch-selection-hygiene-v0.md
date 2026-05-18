# Hito 48 - IG-Origin Batch Selection Hygiene v0

Date: 2026-05-14
Status: shipped locally

## Why This Exists

After the first context-fact apply, the next automatic IG-origin prompt selected some useful people but also pulled in weak fallback cards: generic IG handles with only `lead-state` or `ig-ui-signals-state`, and even an internal/owned handle.

That is not the kind of batch Mantis should spend attention on. A batch should feel like a short list a good operator would actually investigate, not a random row sample.

## What Changed

`crm:vnext:ig-origin-batch-prompt` now applies stronger selection hygiene:

- explicit `--person-id` contacts are kept ahead of fallback candidates,
- generic IG-only signal cards are excluded from fallback batches,
- owned/internal handles are excluded from fallback batches,
- richer evidence cards get a priority boost,
- low-signal IG-only cards can still be included when explicitly requested.
- optional recent-touch exclusion can now remove fallback contacts that were already touched in the card-write or context-fact ledgers within a configured window.

For net-new batches, use:

```bash
npm run crm:vnext:ig-origin-batch-prompt -- \
  --exclude-recently-touched-days 7 \
  --limit 8 \
  --out ~/Documents/Mantis-Reports/<slug>.json \
  --markdown-out ~/Documents/Mantis-Reports/<slug>.md
```

Explicit `--person-id` and `--latest-writes` seeds still override this behavior; the exclusion is only for fallback auto-selection.

## Real Output

The high-potential pending prompt now selects the intended six contacts:

- Edwin Velasquez,
- Luz Estella / `@luzestellariatizabal`,
- Viviana Rozo Maldonado / `@lavivirozo`,
- Gabriel / `@gabrielrojas_r`,
- Mayerli / `@mayuyis2626`,
- Cielo Gómez / `@cielo_gom_g`.

Prompt files:

```text
~/Documents/Mantis-Reports/crm_vnext_high_potential_pending_batch_prompt_2026-05-14.json
~/Documents/Mantis-Reports/crm_vnext_high_potential_pending_batch_prompt_2026-05-14.md
```

## Safety

This hito is prompt generation only:

- no card writes,
- no Fact Store writes,
- no live APIs,
- no ManyChat LIVE,
- no outbound,
- no credentials.

## Next Step

Give the generated Markdown prompt to Mantis in the CRM Telegram group. Mantis should run the evidence hunt read-only, save a contact-keyed JSON under `~/Documents/Mantis-Reports`, and return the file path plus blockers. Then Codex can import it and continue the standard review/apply loop.
