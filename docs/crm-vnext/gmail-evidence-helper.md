# CRM vNext Gmail Evidence Helper

Date: 2026-05-10
Status: v0 read-only evidence helper

## Purpose

Gmail Evidence Helper turns CRM person clues into safe Gmail search plans and converts supplied Gmail search results into `evidenceSources` packets for Deep Local Stitching.

It exists for cases like Mayerli:

```text
CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros.
```

The CRM should be able to ask:

```text
What Gmail evidence might help stitch this identity before we create a new card?
```

But the CRM should not own live Gmail credentials or mutate Gmail.

## Surfaces

- API: `POST /api/crm-vnext/gmail-evidence-helper`
- CLI:

```bash
npm run crm:vnext:gmail-evidence -- --text "CRM: @mayuyis2626 es Mayerli, estudiante de yoga."
npm run crm:vnext:gmail-evidence -- --text-file ./batch.txt
npm run crm:vnext:gmail-evidence -- --search-results-file ./gmail-results.json --text "CRM: @mayuyis2626 es Mayerli."
npm run crm:vnext:gmail-evidence -- --use-gog --account saludoalsol@gmail.com --text "CRM: @mayuyis2626 es Mayerli."
```

## Operating Modes

Planning only:

- receives a CRM report,
- runs Identity Stitching Research locally,
- emits Gmail query plans,
- returns no evidence packets until results are supplied.

Supplied results:

- receives Gmail connector/export results through `gmailSearchResults`,
- matches them against identity clues,
- redacts sensitive snippets,
- emits `evidenceSources` packets with `sourceKind: gmail_export`.

Optional local `gog` search:

- the CLI can run `gog gmail search` read-only for planned primary queries,
- if OAuth is blocked, the helper reports the blocker,
- it does not refresh tokens or read credentials inside the CRM app.

## API Shape

```json
{
  "text": "CRM: @mayuyis2626 es Mayerli...",
  "sourceKind": "alejandro_conversation",
  "reporter": "Alejandro",
  "channel": "codex",
  "gmailSearchResults": {
    "emails": [
      {
        "id": "gmail-message-id",
        "from_": "Zoom <no-reply@zoom.us>",
        "subject": "Mayerli has joined your meeting - Yoga Colombia",
        "snippet": "Mayerli has joined your meeting: Topic Yoga Colombia."
      }
    ]
  }
}
```

Response includes:

- local identity research,
- Gmail query plans,
- redacted `evidenceSources`,
- auth blocker status,
- safety contract.

## Output to Deep Local Stitching

The important bridge is:

```json
{
  "evidenceSources": [
    {
      "sourceKind": "gmail_export",
      "sourceId": "gmail:message:gmail-message-id",
      "subject": "Mayerli has joined your meeting - Yoga Colombia",
      "sender": "Zoom <no-reply@zoom.us>",
      "snippet": "Mayerli has joined your meeting: Topic Yoga Colombia.",
      "text": "Matched clue: @mayuyis2626"
    }
  ]
}
```

Then run:

```bash
npm run crm:vnext:deep-local-stitching -- --evidence-file ./gmail-evidence.json --text "CRM: @mayuyis2626 es Mayerli."
```

## Redaction

The helper redacts:

- absolute local paths,
- private OpenClaw workspace names,
- money amounts,
- obvious bank account fragments.

Evidence snippets are still review context, not final truth.

## Safety

- Read-only.
- No email send.
- No Gmail archive, label, delete, or modify.
- No person-card mutation.
- No Fact Store write.
- No credential/token read.
- No live Gmail call from the API.
- Optional CLI `--use-gog` is read-only and reports auth blockers instead of fixing them inside CRM.

## Operator Rule

Use this after Identity Stitching Research and before Deep Local Stitching when Gmail may contain evidence.

If Gmail auth is blocked, keep the CRM path alive:

```text
auth blocker -> report exact unblock -> continue with local evidence and supplied packets when available
```

Track long-term stability in `gmail-openclaw-auth-stability-backlog.md`.
