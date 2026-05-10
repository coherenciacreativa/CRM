# Hito 26 - Evidence-Derived Candidate Target v0

Date: 2026-05-10
Status: Implemented and verified locally

## What This Unlocks

Before this hito, if Alejandro reported a person without a stable identifier, the CRM often stopped at:

```text
ask_more_identity
```

That was safe, but low leverage. If Drive, Gmail, Contacts, or another read-only source had already found a clean matching email, Mantis still had to ask Alejandro for information the system had effectively found.

Now the policy can promote that evidence into a review-only target.

## Behavior

The new path activates only when:

- the reported person has no email, phone, or Instagram handle in Alejandro's message,
- the normal person-card/MailerLite candidate path did not already settle a stronger target,
- Deep Local Stitching found a compatible full-name candidate,
- exactly one non-family-review stable identifier is available,
- and the evidence stays read-only.

Then Card Write / Merge Policy creates a target like:

```text
targetPersonId: email:amaliadbg@hotmail.com
displayName: Amalia De Bedout
action: defer_write_prepare_review_packet
sourceSignal: evidence_derived_identity_candidate
```

The target is useful for review, not final truth.

## Safety

Evidence Review Packet now asks an explicit ownership question for these unique evidence-derived emails. Example:

```text
candidateEmail: amaliadbg@hotmail.com
recommendedOptionId: confirm_email_for_subject
priority: high
```

Card Write Approval Packet therefore blocks the item as `blocked_open_evidence_questions` until the ownership decision is stored and a later card-write approval exists.

No cards are written. No Fact Store writes. No external messages. No live connector mutations.

## Real Batch Impact

Rerunning the current yoga-students batch with selected Contacts/Gmail/Drive evidence changed Amalia:

Before:

```text
Amalia de Bedud -> ask_more_identity / targetPersonId=null
```

After:

```text
Amalia De Bedout -> targetPersonId=email:amaliadbg@hotmail.com
status=blocked_open_evidence_questions
openQuestion=amaliadbg@hotmail.com
```

This is exactly the intended posture: Mantis can bring Alejandro a concrete stitch candidate, while the system refuses to write until the ownership decision is approved.

## Verification

```bash
npm test
npm run build
npm run crm:vnext:readiness
```

Result:

```text
75 test files passed / 239 tests passed
Next build compiled successfully
Readiness returned status=ready
```

## Next Step

Use this same pattern to improve false-candidate replacement:

- Natalia should prefer `natis1000@hotmail.com` / `ncardenadb@gmail.com` over suspicious `nataliaprato@gmail.com`.
- Luis should prefer `luis.e.lopera@gmail.com` over suspicious `lazaretas@gmail.com`.

That next hito should let strong connected evidence outrank weak existing candidates, still behind review and approval gates.
