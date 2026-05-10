# Hito 35: First Controlled Merge Resolution v0

Date: 2026-05-10

## What Happened

Alejandro explicitly authorized the local CRM vNext merge resolution for Juan Jose Trujillo after the resolver preview showed:

- target card: `email:juanjotru@gmail.com`
- staged review: `merge_review_437313f33910fe21`
- supplemental evidence: MailerLite subscriber `152595767566009988`
- restricted service context present: therapy consultations
- required acknowledgement: accepted by Alejandro for this local card update

The merge was committed through:

`POST /api/crm-vnext/card-merge-review-resolver`

## Result

Local vNext card store after commit:

- cards: 734
- merge review queue: 0
- store generated at: `2026-05-10T09:17:19.389Z`

Juan Jose card now has:

- person id: `email:juanjotru@gmail.com`
- email: `juanjotru@gmail.com`
- phone: `+573136579879`
- city: `Medellin`
- email status: `active`
- yoga classes signal: 1
- retreats attended signal: 1
- purchase/client count signal: 1
- active client: true
- evidence records: 5

## Audit Trail

Backup created before write:

- `.crm-vnext/backups/card-merge-review-resolver/20260510T0917193.store.person-cards-vnext.json.bak`

Ledger entry:

- `card_merge_review_ledger_92f4b3d58e3938bf`

Ledger safety flags:

- outbound executed: false
- Fact Store write executed: false
- live API calls executed: false
- credential read executed: false
- restricted service acknowledged: true

## Verification

Verified after commit:

```bash
npm run crm:vnext:card-merge-review-resolver
```

returned:

- merge reviews: 0
- selected reviews: 0
- operations executed: 0
- commit blocked: false

API smoke checks:

- `GET /api/crm-vnext/person-card?personId=email%3Ajuanjotru%40gmail.com`
- `GET /api/crm-vnext/community-insights?topLimit=1`
- `GET /api/crm-vnext/readiness`

All read from `vnext-person-card-store`; readiness stayed `ready`.

## Safety

No outbound messages were sent.

No MailerLite, Instagram, ManyChat, Gmail, Google Drive, WhatsApp, Telegram, or credential mutation happened.

This was a local card-store write only.

## Next Build Step

Run the next controlled batch through the same pattern:

```text
evidence -> review -> approval -> local card write/merge -> dashboard verification
```

The next leverage point is letting Mantis prepare richer evidence packets for several known students/clients so CRM vNext can materialize more high-confidence cards with less manual stitching.
