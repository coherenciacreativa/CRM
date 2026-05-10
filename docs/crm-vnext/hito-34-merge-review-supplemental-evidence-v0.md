# Hito 34: Merge Review Supplemental Evidence v0

Date: 2026-05-10

## What Changed

`card-merge-review-resolver` can now accept supplemental read-only evidence packets before resolving a staged merge.

New behavior:

- API accepts `evidenceSources` in the request body.
- CLI accepts `--evidence-file <json>`.
- Resolver matches supplemental evidence to a staged review by stable identity:
  - target email,
  - draft email,
  - evidence text containing the target/draft email,
  - exact Instagram handle where present.
- Matched evidence can fill missing contact fields in the proposed resolved card:
  - email,
  - Instagram handle,
  - phone,
  - city,
  - country,
  - email/subscriber status.
- The report exposes `supplementalEvidence` per review item and summary counts.

## Why It Matters

After Hito 33, the real dry-run for Juan Jose showed the staged merge was structurally ready but still lacked phone/city, even though Mantis had already found those fields in MailerLite.

This hito prevents that kind of partial card from slipping through just because the first staged draft was thinner than later evidence. Mantis can now bring a selected MailerLite subscriber packet into the resolver and preview the richer card before any local write.

## Example

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id merge_review_437313f33910fe21 \
  --evidence-file ./selected-mailerlite-evidence.json
```

Commit still requires explicit approval:

```bash
npm run crm:vnext:card-merge-review-resolver -- \
  --review-id merge_review_437313f33910fe21 \
  --evidence-file ./selected-mailerlite-evidence.json \
  --write \
  --approved-by Alejandro \
  --ack-restricted-service
```

## Safety

Still prohibited:

- outbound messages,
- Fact Store writes,
- live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp/Telegram API calls,
- credential reads or rotations,
- automatic merges,
- restricted-service merge without acknowledgement.

The resolver only consumes evidence packets already supplied to it. It does not fetch fresh evidence itself.

## Verification

Passed focal tests:

```bash
npm test -- --run __tests__/crm-vnext-card-merge-review-resolver.spec.ts __tests__/crm-vnext-card-merge-review-resolver-api.spec.ts
```

The tests verify that supplemental MailerLite-style evidence fills missing phone/city/status fields in preview and committed temp-store fixtures without path leaks or live API calls.

Real local dry-run against Juan Jose's staged review, using the MailerLite subscriber evidence Mantis had already found:

- review id: `merge_review_437313f33910fe21`
- target: `email:juanjotru@gmail.com`
- supplemental evidence sources supplied: 1
- supplemental evidence matched: 1
- fields applied: `email`, `phone`, `city`, `emailStatus`
- proposed phone: `+573136579879`
- proposed city: `Medellin`
- proposed email status: `active`
- operations executed: 0
- card store written: false
- remaining commit blocker: `restricted_service_ack_required`

## Next Build Step

Use Mantis' read-only MailerLite result for Juan Jose to produce a small evidence JSON packet, then run the real resolver dry-run with that packet. If Alejandro approves the restricted-service boundary, commit the enriched merge locally.
