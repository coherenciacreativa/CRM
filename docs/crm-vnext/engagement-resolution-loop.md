# CRM vNext Engagement Resolution Loop

`engagement-resolution-loop` closes the first living-CRM loop:

```text
stored engagement movement
-> no-send decision brief
-> compact questions for Alejandro
-> human-enrichment-response evidence
-> context/fact proposals
-> later explicit write approval
```

## Surfaces

```text
GET /api/crm-vnext/engagement-resolution-loop?limit=5
npm run crm:vnext:engagement-resolution-loop
```

Useful export:

```bash
npm run crm:vnext:engagement-resolution-loop -- \
  --out ~/Documents/Mantis-Reports/crm_vnext_engagement_resolution_loop.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_engagement_resolution_loop.md
```

## How Mantis Should Use It

1. Generate the packet.
2. Read `contextCoveredItems` first. If an item is marked `context_already_covered`, do not ask Alejandro a broad memory question; review the new engagement signal internally and escalate only a minimal decision if needed.
3. Ask Alejandro only the listed `questions`, one by one, or send the Markdown for him to answer.
4. Save answers under each `Respuesta libre` section.
5. Parse answers:

```bash
npm run crm:vnext:human-enrichment-response-evidence -- \
  --answers-md <answered-resolution-loop.md> \
  --questions-file <engagement-resolution-loop.json> \
  --out <response-evidence.json> \
  --markdown-out <response-evidence.md>
```

6. Feed response evidence into `context-fact-proposals`.
7. Apply only explicitly approved facts later.

## Anti-Redundancy Guard

The loop builds a local context index from:

- `.crm-vnext/person-card-store/person-cards-vnext.json`,
- `.crm-vnext/fact-store/facts.jsonl`,
- `.crm-vnext/context-fact-apply/ledger.jsonl`.

When a candidate already has several Alejandro/human-context evidence items, the loop suppresses the broad prompt and moves the item to `contextCoveredItems`.

This keeps the living CRM from asking Alejandro to repeat context already captured for people like Cielo, Aida, or Maria Isabel. The signal is not ignored; it becomes an internal signal-review item.

## Safety

This loop is read-only/local:

- no outbound,
- no CRM card writes,
- no Fact Store writes,
- no score mutation,
- no live APIs,
- no credentials.

Alejandro's answer is context evidence, not approval for contact or mutation.
