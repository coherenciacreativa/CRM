# Hito 29 - Evidence Approval Workbench v0

Date: 2026-05-10
Status: implemented

## Why

Evidence Approval Application can apply confirmed decisions, but Mantis still needed a better way to ask Alejandro for those decisions in a compact batch.

The workbench is the operator-facing queue:

```text
unresolved evidence questions -> compact decision list -> approved selections -> application
```

## What Changed

Added Evidence Approval Workbench:

- `lib/crm/crm-vnext-evidence-approval-workbench.ts`
- `POST /api/crm-vnext/evidence-approval-workbench`
- `npm run crm:vnext:evidence-approval-workbench`
- module and API tests

The workbench combines Evidence Review Packet and Card Write Approval Packet to return:

- unresolved email ownership questions,
- recommended defaults,
- evidence snippets/source kinds,
- CLI fragments for the next Evidence Approval Application step,
- already ready card-write approval items.

## Example Queue Item

```json
{
  "candidateEmail": "mayaariana@hotmail.com",
  "recommendedOptionId": "keep_email_unassigned_family_or_companion",
  "recommendedDecisionCli": "--select-email mayaariana@hotmail.com=keep_email_unassigned_family_or_companion"
}
```

## Safety

- No decision ledger write.
- No person-card writes.
- No Fact Store writes.
- No outbound messages.
- No live connector calls from the CRM API.
- No credential reads or refreshes.

## Verification

Targeted tests:

```bash
npm test -- --run __tests__/crm-vnext-evidence-approval-workbench.spec.ts __tests__/crm-vnext-evidence-approval-workbench-api.spec.ts __tests__/operator-capabilities.spec.ts __tests__/operator-capabilities-api.spec.ts
```

Passed: 4 files / 10 tests.

Full verification:

```bash
npm test
npm run build
npm run crm:vnext:readiness
```

Passed:

- 79 test files / 251 tests
- Next.js production build
- readiness `status=ready`

Additional hardening: a structured contact row for another person is no longer assigned to the subject just because the subject is mentioned in context. Example: `Name: Natalia Cardenas De Bedout ... Context: daughter of Amalia` must not propose Natalia's email as Amalia's.

## Next

Next useful hito: Card Write Path v0, but only in a very conservative local-file apply path with backup/provenance and explicit approval. Until Alejandro approves that boundary, keep operating through workbench, application, and approval packets.
