# Hito 25 - Current Students Evidence Precision v0

Date: 2026-05-10
Status: Implemented and verified locally

## Why This Hito Exists

The first real yoga-students batch became useful enough to expose a harder problem:
the CRM can now find scattered evidence, but it must be very strict about when evidence
becomes identity.

This hito hardens the stitching layer before any card write exists.

## What Changed

- Added a shared conservative name-matching helper.
- Recognizes known surname variants:
  - `Bedud` / `Bedut`
  - `Bedout` / `Bedouth`
- Uses token-based name matching so weak substring collisions are less likely.
- Allows long names to match shorter but compatible evidence when the first name and a real surname agree, e.g. `Natalia Cardenas de Bedut` -> `Natalia Cardenas`.
- Card Write Approval Packet now checks identity mismatch before open evidence questions, so a bad target cannot hide behind a normal email-ownership question.
- Explicitly ambiguous evidence snippets no longer promote full names, emails, phones, or handles into identity fields.
- Contacts evidence assignment now prefers the strongest identity clue and filters oversized/noisy Contacts rows.

## Read-Only Evidence Found

No cards were written. No Fact Store writes. No outbound messages. No live channel mutation.

Evidence found for the current-students batch:

- Adriana Bernal: Contacts + Gmail evidence found; possible emails include `adriana.bernal@epm.com.co` and `adrianabv86@hotmail.com`; needs primary-email decision.
- Amalia de Bedud/Bedout: Gmail/Drive evidence supports `Amalia De Bedout/Bedouth` and `amaliadbg@hotmail.com`; surname variant is now recognized; still needs approval before becoming a target.
- Santiago Bernal: Contacts/Drive evidence supports `santiagobernal676@gmail.com`; `sbernal@proteccion.com.co` remains a candidate.
- Lina Maria Bernal: Contacts/Gmail/Drive evidence found several plausible emails; needs primary-email decision and false-candidate rejection.
- Natalia Cardenas de Bedut: Drive/Gmail/Contacts evidence supports `Natalia Cardenas De Bedout`, `natis1000@hotmail.com`, and `ncardenadb@gmail.com`; suspicious bridge candidate remains blocked, not approved.
- Eliana / `@cadavid_eli`: IG-only candidate remains safe; ambiguous `Eliana Ortegon` Drive row is not promoted.
- Luis Enrique Lopera: Gmail/Drive evidence supports `luis.e.lopera@gmail.com`; weak false candidate remains blocked.

## Latest Batch Result

Approval packet rerun with selected Contacts, Gmail, and Drive evidence:

- items: 7
- ready for human approval: 1
- blocked by open evidence questions: 5
- blocked needing stronger identity: 1
- open evidence questions: 16
- operations previewed: 28
- operations executed: 0
- card mutation ready: false

The single ready item is the IG-only Eliana candidate. All email-bearing candidates remain review-only.

## Verification

```bash
npm test
npm run build
npm run crm:vnext:readiness
```

Result:

```text
75 test files passed / 235 tests passed
Next build compiled successfully
Readiness returned status=ready
```

## Next Step

Implement Evidence-Derived Candidate Target v0:

- when a person has no email/phone/handle in Alejandro's text,
- but read-only evidence finds exactly one compatible email or phone,
- prepare a review-only target candidate instead of staying at `ask_more_identity`,
- still require an explicit evidence decision and card-write approval before any mutation.

This is the bridge from "we found scattered evidence" to "Mantis can present useful stitch candidates for approval."
