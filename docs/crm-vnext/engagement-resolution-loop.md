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
2. Ask Alejandro the listed people one by one, or send the Markdown for him to answer.
3. Save answers under each `Respuesta libre` section.
4. Parse answers:

```bash
npm run crm:vnext:human-enrichment-response-evidence -- \
  --answers-md <answered-resolution-loop.md> \
  --questions-file <engagement-resolution-loop.json> \
  --out <response-evidence.json> \
  --markdown-out <response-evidence.md>
```

5. Feed response evidence into `context-fact-proposals`.
6. Apply only explicitly approved facts later.

## Safety

This loop is read-only/local:

- no outbound,
- no CRM card writes,
- no Fact Store writes,
- no score mutation,
- no live APIs,
- no credentials.

Alejandro's answer is context evidence, not approval for contact or mutation.

