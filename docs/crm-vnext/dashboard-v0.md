# CRM vNext Dashboard v0

Date: 2026-05-08
Status: Implemented local SSR page

## Route

- `/crm-vnext`
- `/crm-vnext/daily-brief`
- `/crm-vnext/queues`
- `/crm-vnext/people`
- `/crm-vnext/person/[personId]`
- `/crm-vnext/identity-stitching-research`
- `/crm-vnext/deep-local-stitching`
- `/crm-vnext/multi-service-card-proposal`

## Purpose

Provide the first internal dashboard surface for Alejandro and Mantis using the local vNext contracts already built:

`Person Cards V1 artifact -> legacy adapter -> Person Card vNext -> Community Insights -> dashboard`

## Current Sections

Dashboard:

- Community totals.
- Email / Instagram / omnichannel coverage.
- Lifecycle distribution.
- Identity gaps.
- Mantis next-action queues.
- Average scores.
- Top priority people.
- Links to Mantis queues and the people explorer.

Daily brief:

- Local read-only operating summary for Mantis/Alejandro.
- Community totals, queue status, highlights, safe next steps, and focus queues.
- Person rows are bounded and link to exact person detail pages.
- Mirrors `GET /api/crm-vnext/community-daily-brief` in browser form.

Mantis queues:

- Saved internal views for recurring operator work.
- Current queues: `IG without email`, `Email engaged`, `Human review required`, `Identity stitching`, and `Commercial follow-up`.
- Each queue links into the people explorer with the matching filters already applied.

People explorer:

- Text search over local identity fields.
- Filters by lifecycle stage, next action, channel gap, product fit, and minimum priority.
- Links every result to the exact vNext person-card detail page.

Person detail:

- Identity and channel presence.
- Lifecycle, priority, commercial warmth, community depth, engagement, and data confidence.
- Product-fit scores across yoga, mentorship, therapy, digital products, and retreats.
- Known product/customer history fields.
- Next-action recommendation with human-review guardrail.
- Reasons, risks, and evidence attached to the vNext card.

Identity stitching research:

- Paste unmatched names, handles, or service clues.
- Searches local person cards and local MailerLite bridge exports.
- Returns candidate identities, confidence, and a recommendation.
- Read-only: no merge, no card creation, no live API calls.

Deep local stitching:

- Searches configured local evidence before accepting a new-card recommendation.
- Can include memory, local CSVs, retreat tables, downloaded files, and contact exports.
- Can ingest supplied connected evidence packets from Gmail/contact investigations.
- Returns local evidence snippets, confidence, source category, and whether card creation should be deferred.
- Read-only: no card mutation, no Fact Store write, no live API calls, and no absolute path leaks.

Multi-service card proposal:

- Converts identity research plus service facts into a proposed card target.
- Preserves parallel relationships like yoga, retreats, therapy consultations, mentorship, digital products, and community events.
- Keeps friend, ally, consultant, and family context as review-only nuance.
- Read-only: no card mutation, no Fact Store write, no live API calls.

## Safety

- Local server-side rendering.
- Reads the local Person Cards V1 artifact.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- Non-localhost requests are disabled by default unless `CRM_VNEXT_DASHBOARD_ENABLED=1`.
- Person detail lookup is exact by `personId`; search/listing is local over vNext cards and does not call enrichment services.
- Queue views are read-only lists; they do not send, sync, enrich, or mutate contact records.
- Queue counts and status are also available through `GET /api/crm-vnext/community-queues` for Mantis/OpenClaw.
- Queue snapshots can be persisted by explicit local jobs; the API does not write files by itself.
- Readiness is available through `GET /api/crm-vnext/readiness` before running operator jobs.
- Readiness can also be checked locally with `npm run crm:vnext:readiness`.
- Daily operator briefs are available through `GET /api/crm-vnext/community-daily-brief` and `/crm-vnext/daily-brief`.
- Daily operator briefs can also be exported locally with `npm run crm:vnext:daily-brief`.
- Exact person-card reads are available through `GET /api/crm-vnext/person-card?personId=<personId>`.
- The safe operator map is available through `GET /api/crm-vnext/operator-capabilities`.
- No-send decision briefs are available through `GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>`.
- No-send decision briefs can also be exported locally with `npm run crm:vnext:decision-brief -- --queue-id <queueId>`.
- Identity stitching research is available through `POST /api/crm-vnext/identity-stitching-research` and `/crm-vnext/identity-stitching-research`.
- Identity stitching research can also be run locally with `npm run crm:vnext:identity-stitching-research -- --text <text>`.
- Gmail evidence planning is available through `POST /api/crm-vnext/gmail-evidence-helper`.
- Gmail evidence planning can also be run locally with `npm run crm:vnext:gmail-evidence -- --text <text>`.
- Supplied Gmail search results can be converted into connected evidence packets with `npm run crm:vnext:gmail-evidence -- --search-results-file <json> --text <text>`.
- Deep local stitching is available through `POST /api/crm-vnext/deep-local-stitching` and `/crm-vnext/deep-local-stitching`.
- Deep local stitching can also be run locally with `npm run crm:vnext:deep-local-stitching -- --text <text>`.
- Expanded local evidence search can be run with `npm run crm:vnext:deep-local-stitching -- --include-expanded-sources --text <text>`.
- Connected evidence packets can be supplied with `npm run crm:vnext:deep-local-stitching -- --evidence-file <json> --text <text>`.
- Multi-service card proposals are available through `POST /api/crm-vnext/multi-service-card-proposal` and `/crm-vnext/multi-service-card-proposal`.
- Multi-service card proposals can also be run locally with `npm run crm:vnext:multi-service-card-proposal -- --text <text>`.
- Card write/merge policy is available through `POST /api/crm-vnext/card-write-merge-policy`.
- Card write/merge policy can also be run locally with `npm run crm:vnext:card-write-merge-policy -- --text <text>`.
- The policy accepts Mantis Chrome/Gmail as a read-only evidence route when already authenticated, and recommends consulting MailerLite before final card creation/merge.
- Card apply preview is available through `POST /api/crm-vnext/card-apply-preview`.
- Card apply preview can also be run locally with `npm run crm:vnext:card-apply-preview -- --text <text>`.
- Apply preview emits exact hypothetical operations with `executed=false`; it does not implement a write command.

## Local Preview

Run the app and open:

`http://localhost:3000/crm-vnext`

If port `3000` is occupied, use the alternate port chosen by Next.

## Next Build Step

Review Card Apply Preview on a slightly larger real batch, then design Card Apply Staging v0 as a separate local staging ledger.

Track OpenClaw/gog Gmail/Contacts OAuth stability separately in `gmail-openclaw-auth-stability-backlog.md`; it matters for Mantis autonomy, but should not block the CRM evidence contract.
