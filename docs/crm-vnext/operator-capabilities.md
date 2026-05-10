# CRM vNext Operator Capabilities

Date: 2026-05-11
Status: Implemented local read-only endpoint

## Route

`GET /api/crm-vnext/operator-capabilities`

## Purpose

Give Mantis/OpenClaw one stable map of the safe CRM vNext surfaces that already exist:

- internal APIs,
- browser routes,
- local commands,
- guardrails,
- escalation triggers,
- recommended operating flow.

This is a navigation contract. It does not read person-card artifacts, does not mutate CRM records, and does not send messages.

## Recommended Flow

1. Read `GET /api/crm-vnext/operator-capabilities`.
2. Read `GET /api/crm-vnext/readiness`.
3. Read `GET /api/crm-vnext/source-ledger`.
4. Preview new human/source reports with `POST /api/crm-vnext/fact-intake`.
5. Store approved facts with `POST /api/crm-vnext/fact-store`.
6. Run a safe full preview with `POST /api/crm-vnext/activation-run`.
7. Research unmatched or name-only clues with `POST /api/crm-vnext/identity-stitching-research`.
8. Plan Gmail evidence and convert supplied read-only results with `POST /api/crm-vnext/gmail-evidence-helper`.
9. Plan Contacts evidence and convert read-only results with `POST /api/crm-vnext/contacts-evidence-helper`.
10. Plan MailerLite evidence and convert read-only subscriber results with `POST /api/crm-vnext/mailerlite-evidence-helper`.
11. Plan Google Drive/Docs/Sheets evidence and convert supplied read-only rows with `POST /api/crm-vnext/google-drive-evidence-helper`.
12. Plan lead-capture evidence from ManyChat/CRM webhook/Vercel/WhatsApp traces with `POST /api/crm-vnext/lead-capture-evidence-helper`.
13. Search safe local and connected evidence with `POST /api/crm-vnext/deep-local-stitching`.
14. Build a multi-service card proposal with `POST /api/crm-vnext/multi-service-card-proposal`.
15. Evaluate create/enrich/merge/defer policy with `POST /api/crm-vnext/card-write-merge-policy`.
16. Preview exact hypothetical card operations with `POST /api/crm-vnext/card-apply-preview`, including already-approved evidence decisions when a ledger is supplied.
17. Prepare focused evidence questions with `POST /api/crm-vnext/evidence-review-packet`, skipping questions already resolved in the decision ledger.
18. Queue unresolved evidence questions with `POST /api/crm-vnext/evidence-approval-workbench`.
19. Store Alejandro-approved evidence answers with `POST /api/crm-vnext/evidence-review-decisions`.
20. Apply approved evidence decisions and rerun before/after approval packets with `POST /api/crm-vnext/evidence-approval-application`.
21. Run one standard batch loop with `POST /api/crm-vnext/batch-operating-loop`.
22. Review multiple stitching candidates with `POST /api/crm-vnext/stitch-batch-review`.
23. Prepare explicit write approval items with `POST /api/crm-vnext/card-write-approval-packet`.
24. Apply explicitly approved items with `POST /api/crm-vnext/card-write-apply`, backup, and provenance.
25. Preview supplied engagement signals with `POST /api/crm-vnext/engagement-signal-preview`.
26. Resolve explicitly approved staged merges with `POST /api/crm-vnext/card-merge-review-resolver`.
27. Review stored facts with `GET /api/crm-vnext/identity-review`.
28. Preview exact card changes with `GET /api/crm-vnext/card-rebuild-diff`.
29. Read `GET /api/crm-vnext/community-daily-brief`.
30. If needed, read `GET /api/crm-vnext/community-queues`.
31. Inspect a bounded queue with `GET /api/crm-vnext/community-queue-brief?queueId=<queueId>&limit=<n>`.
32. Prepare a no-send decision brief with `GET /api/crm-vnext/community-decision-brief?queueId=<queueId>&limit=<n>`.
33. Inspect one exact person with `GET /api/crm-vnext/person-card?personId=<personId>`.
34. Ask for approval if the next move would touch an external channel.

## Response Shape

```json
{
  "ok": true,
  "capabilities": {
    "schemaVersion": "crm-vnext-operator-capabilities-2026-05-11",
    "mode": "read_only_operator_capabilities",
    "operatingModel": {
      "dayToDayOperator": "Mantis via OpenClaw",
      "builderRole": "repository contracts, code, docs, and local verification",
      "humanDecisionOwner": "Alejandro"
    },
    "apiEndpoints": [],
    "browserRoutes": [],
    "localCommands": [],
    "guardrails": [],
    "escalationTriggers": [],
    "safety": {
      "outboundProhibited": true,
      "recordMutationRequiresExplicitApproval": true
    }
  }
}
```

The response excludes local filesystem paths and secret values.

Local commands currently include activation run, identity stitching research, Gmail evidence helper, Contacts evidence helper, MailerLite evidence helper, Google Drive evidence helper, lead-capture evidence helper, Mantis evidence import, deep local stitching with optional expanded local evidence and connected evidence packets, multi-service card proposal, card write/merge policy, card apply preview, evidence review packet, evidence review decisions ledger, evidence approval workbench, evidence approval application, stitch batch review, card write approval packet, batch operating loop, engagement signal preview, card write apply, card merge review resolver, queue monitor, daily brief export, and decision brief export. `GET /api/crm-vnext/readiness` is the quick preflight before those commands.

## Safety

- `GET` only.
- Uses the shared CRM vNext internal API guard.
- Loopback localhost can run without copying tokens into shell history.
- Non-loopback production requests require the configured internal read token.
- No person-card artifact read.
- No local source path exposure.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite mutation. The MailerLite evidence helper API does not call live MailerLite; the optional CLI route can use an existing read-only connector, cursor-paginate subscribers, filter locally, and report auth blockers without exposing credentials.
- No Google Drive mutation. The Google Drive evidence helper API only converts supplied read-only rows and keeps family/companion email ambiguity under review.
- No person-card mutation from evidence approvals. The evidence approval application may write only the local evidence decision ledger with explicit commit and approver, then rerun preview packets.
- Batch Operating Loop is read-only and is now the preferred natural-language operator surface for "probemos un batch nuevo": it returns evidence questions, blocked identity prompts, ready approval items, and dry-run write plans without mutating anything.
- Mantis Natural Batch Protocol (`docs/crm-vnext/mantis-natural-batch-protocol.md`) is the canonical way for Mantis to turn natural CRM requests into contact-keyed evidence hunts before import and batch review.
- Engagement Signal Preview is read-only and consumes supplied MailerLite/Gmail/Instagram/manual engagement snapshots to show scoring deltas and internal queues. It does not call live APIs, mutate cards, change MailerLite, or authorize outbound follow-up.
- Card Write Apply may commit approved create/enrich items and may stage merge-review items. It is dry-run by default and may commit only local vNext card-store/ledger files after `approvedBy`, explicit item selection/all-ready, and backup. It does not merge automatically or touch outbound/live sources.
- Card Merge Review Resolver may resolve staged merge-review items only after explicit review selection, `approvedBy`, backup, and restricted-service acknowledgement when applicable. It can consume supplied read-only `evidenceSources` before resolving so MailerLite/Gmail/Drive findings fill missing contact fields without live API calls. It writes only the local vNext card store and merge-review ledger.
- No outbound messages.
- No record mutation.

## Hard Stops

Mantis must stop and ask for human approval before:

- touching ManyChat LIVE,
- changing Instagram credentials, tokens, permissions, or API setup,
- changing MailerLite credentials,
- sending Telegram, Instagram, WhatsApp, email, or public messages,
- mutating CRM records without explicit approved local write scope,
- using a `nextAction` as permission to contact someone.

## Mantis Operating Rule

Use this endpoint as the first map before operating CRM vNext. It is the equivalent of checking the instrument panel before flying: it does not move the plane, but it tells the operator which levers exist and which ones are still locked.
