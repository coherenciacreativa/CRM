# Hito 24 - Current Yoga Students Batch Hardening v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Hardened

The first real current-students batch exposed two useful parser and approval-boundary issues:

- `@handle se llama ...` sentences could be polluted by later comma clauses such as `vive en Medellin`.
- Location/family-name clauses could create false people or weak identity approvals.

Fixes:

- Fact Intake now keeps `@cadavid_eli se llama Eliana...` scoped to `Eliana`.
- Fact Intake now recognizes `ha asistido`, `asiste`, `entra`, and `mis clases` patterns.
- Fact Intake no longer turns `Cundinamarca` or `vive en Rosal` into people.
- Card Apply Preview now filters evidence full-name candidates with stricter raw-name compatibility.
- Stitch Batch Review keeps the reported raw name visible even when a candidate display name differs.
- Card Write Approval Packet blocks low/insufficient deferred candidates or mismatched display names instead of marking them approval-ready.

## Real Batch Result

Alejandro's current yoga students batch now parses as:

- 7 people,
- 20 facts,
- 7 yoga participation facts,
- 6 retreat facts,
- 1 Mi Encuentro Feliz attendance fact,
- 0 operations executed.

Approval packet result:

- ready for human approval: 2
- blocked by open evidence questions: 1
- blocked needing stronger identity: 4

Current best candidates:

- Santiago Bernal: likely `santiagobernal676@gmail.com`, yoga + retreats, needs human merge/create approval.
- Eliana / `@cadavid_eli`: stable IG handle, yoga + Mi Encuentro Feliz, missing email/phone.

Needs more evidence:

- Adriana Bernal: candidate emails found, but ownership is unresolved.
- Amalia de Bedud/Bedout: likely spelling/evidence issue; needs stronger identity from MailerLite/Gmail/Contacts/Drive.
- Lina Maria Bernal: candidate email/display name mismatch with Lina Maria Gonzalez; needs confirmation.
- Natalia Cardenas de Bedut: candidate Natalia Prato mismatch; needs confirmation.
- Luis Enrique Lopera: weak false candidate blocked; needs better identity evidence.

## Verification

```bash
npm test
npm run build
```

Result:

```text
74 test files passed / 230 tests passed
Next build compiled successfully
```

Dev server was restarted and readiness returned `status=ready`.

## Next Step

Run targeted read-only evidence hunts for the blocked people, prioritizing MailerLite cursor scan, Gmail/Chrome evidence, Contacts, and Google Drive retreat tables. Do not write cards until the approved write path exists.
