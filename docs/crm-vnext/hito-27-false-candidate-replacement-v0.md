# Hito 27 - False-Candidate Replacement v0

Date: 2026-05-10
Status: implemented, read-only

## Why

The current yoga-students batch exposed a subtle failure mode:

- the matcher could find a weak existing candidate from name overlap,
- connected evidence could contain a stronger identity,
- but the approval packet still inherited the weak target.

That was visible in cases like Natalia and Luis, where the system had enough Gmail/Drive/Contacts evidence to prefer `natis1000@hotmail.com` or `luis.e.lopera@gmail.com`, while older name matching could still point toward unrelated or weak emails.

## What Changed

Card Write / Merge Policy now detects weak candidate targets and can replace them with stronger connected/read-only evidence when:

- the current target came from a low-confidence or review-only candidate,
- connected evidence has a compatible name signal,
- the stronger email is stable and not marked as family/companion-only,
- the replacement remains review-only.

The policy emits two source signals:

```text
evidence_derived_identity_candidate
evidence_replaces_weak_identity_candidate
```

Evidence Review Packet now turns that signal into a high-priority ownership question:

```text
reviewReason: weak_candidate_replacement
recommendedOption: confirm_email_for_subject
```

Card Write Approval Packet blocks the item until Alejandro explicitly confirms the evidence ownership.

## Real Batch Smoke

Input batch: current yoga students reported by Alejandro.

Result:

```json
{
  "items": 7,
  "readyForHumanApproval": 1,
  "blockedOpenEvidenceQuestions": 6,
  "blockedNeedsMoreIdentity": 0,
  "openEvidenceQuestions": 12,
  "operationsPreviewed": 28,
  "operationsExecuted": 0,
  "cardMutationReady": false
}
```

Notable targets:

- Adriana Bernal Velez -> `email:adrianabv86@hotmail.com`, still asks between `adrianabv86@hotmail.com` and `adriana.bernal@epm.com.co`
- Amalia De Bedout -> `email:amaliadbg@hotmail.com`, still asks ownership confirmation
- Natalia Cardenas De Bedout -> `email:natis1000@hotmail.com`, asks between `natis1000@hotmail.com` and `ncardenadb@gmail.com`
- Luis Enrique Lopera -> `email:luis.e.lopera@gmail.com`, asks ownership confirmation
- Eliana -> `ig:cadavid_eli`, ready for human approval because no conflicting evidence questions are open

The key improvement: Natalia and Luis no longer remain tied to weaker false candidates. The system now prefers stronger connected evidence while keeping the approval gate closed.

## Safety

- No person-card mutations.
- No Fact Store writes.
- No MailerLite/Instagram/ManyChat/WhatsApp mutations.
- No outbound messages.
- No credential reads or refreshes.
- Evidence remains review-only until explicitly approved.

## Files

- `lib/crm/crm-vnext-card-write-merge-policy.ts`
- `lib/crm/crm-vnext-evidence-review-packet.ts`
- `__tests__/crm-vnext-card-write-merge-policy.spec.ts`
- `__tests__/crm-vnext-evidence-review-packet.spec.ts`
- `__tests__/crm-vnext-card-write-approval-packet.spec.ts`

## Verification

Targeted tests:

```bash
npm test -- --run __tests__/crm-vnext-card-write-merge-policy.spec.ts __tests__/crm-vnext-evidence-review-packet.spec.ts __tests__/crm-vnext-card-write-approval-packet.spec.ts __tests__/crm-vnext-card-apply-preview.spec.ts
```

Passed: 22 tests.

Full verification:

```bash
npm test
npm run build
npm run crm:vnext:readiness
```

Passed:

- 75 test files / 242 tests
- Next.js production build
- readiness `status=ready`

## Next

Next useful hito: Evidence Approval Application v0.

That should let Alejandro approve decisions like:

```text
natis1000@hotmail.com belongs to Natalia Cardenas De Bedout
luis.e.lopera@gmail.com belongs to Luis Enrique Lopera
```

and then re-run the packet so those cards become ready for a later reviewed write path.
