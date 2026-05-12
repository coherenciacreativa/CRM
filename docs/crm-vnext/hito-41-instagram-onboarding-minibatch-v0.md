# Hito 41 - Instagram Onboarding Mini-Batch v0

Date: 2026-05-12

## Why

Alejandro wanted to test whether CRM vNext could use the Instagram onboarding trail as a repeatable enrichment lane, not just one-off human memory. Eliana proved the pattern; this hito turns it into a small batch path.

The source class is:

- Instagram or organic-content lead.
- Email/phone/city/country captured through MailerLite, ManyChat, Vercel proxy, CRM webhook, or related onboarding traces.
- No live channel mutation and no outbound.

## What Changed

- Built a read-only mini-batch from local evidence already produced by Mantis/MailerLite scans.
- Confirmed the lead-capture helper can convert selected onboarding rows into `lead_capture_export` packets.
- Hardened Deep Local Stitching so structured connected evidence keeps enough text to extract useful identity fields after the primary match term.
- Hardened Card Apply Preview so email-only onboarding leads can still inherit structured `Name`, `City`, `Country`, and a unique Instagram handle from trusted lead-capture evidence.

## Mini-Batch Result

Input files:

- `tmp/crm-vnext/ig_onboarding_minibatch_20260512.txt`
- `tmp/crm-vnext/ig_onboarding_minibatch_20260512_search_results.json`
- `tmp/crm-vnext/ig_onboarding_minibatch_20260512_evidence.json`
- `tmp/crm-vnext/ig_onboarding_minibatch_20260512_loop.json`

Batch Operating Loop result:

- 5 items processed.
- 0 evidence questions.
- 0 identity blockers.
- 5 ready approval items.
- 5 ready write preview items.
- 5 operations planned in dry-run.
- 0 operations executed.

Previewed candidates:

- Katy Giraldo Aristizabal — `arquitectura.kmga@gmail.com`, Medellin/Colombia.
- Edwin Velasquez — `edwclaros1998@gmail.com`, `+573108010473`, Bogota/Colombia.
- Martha Otremba — `martha.otremba@icloud.com`, Alemania.
- Rocio Martinez Jaime — `r_mart803@hotmail.com`, Mexico.
- Angelica Castro — `ultravioletastyle@gmail.com`, `@angelica_alma_cele`, `+573016347540`, Bogota/Colombia.

All five are still `review_deferred_write`: Alejandro must explicitly approve any local card write.

## Safety

No writes were executed.

No Fact Store write, no outbound message, no live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram call, no credential read, and no ManyChat LIVE change.

## Operator Note

This is the pattern Mantis should use when Alejandro says something natural like:

> Mantis, arma un batch de leads recientes de Instagram/onboarding.

Mantis should gather selected read-only rows, save a contact-keyed report or lead-capture records, and let CRM vNext run:

1. `crm:vnext:lead-capture-evidence`
2. `crm:vnext:batch-operating-loop`
3. human approval before `crm:vnext:card-write-apply --write`

