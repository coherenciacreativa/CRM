# CRM vNext Evidence Review Packet

Date: 2026-05-10
Status: v0 read-only decision packet

## Purpose

Evidence Review Packet turns Card Apply Preview output into focused human/operator decisions.

It exists for cases where evidence is useful but not yet safe to write:

```text
Drive/Gmail/MailerLite/Contacts evidence -> Card Apply Preview -> Evidence Review Packet -> human decision
```

It does not apply anything.

## Surfaces

- API: `POST /api/crm-vnext/evidence-review-packet`
- CLI:

```bash
npm run crm:vnext:evidence-review-packet -- --text "CRM: @mayuyis2626 es Mayerli..."
npm run crm:vnext:evidence-review-packet -- --include-expanded-sources --evidence-file ./evidence.json --text "CRM: @mayuyis2626 es Mayerli..."
npm run crm:vnext:evidence-review-packet -- --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl --evidence-file ./evidence.json --text "CRM: @mayuyis2626 es Mayerli..."
```

## What It Produces

For each ambiguous item, the packet includes:

- target person,
- proposed review-only updates,
- ambiguous email candidates,
- evidence snippets and source kinds,
- possible related people,
- decision questions,
- recommended default option,
- proof that no operations executed.

The key design rule:

```text
candidate evidence is not card truth until ownership is confirmed
```

The packet now reads Card Apply Preview's `evidenceDecisionSummary`. If Alejandro already approved a decision for a candidate email, the packet does not ask the same ownership question again. This keeps the review queue focused on unresolved ambiguity.

The packet also asks for approval when a unique email was derived from connected evidence. Even if the evidence looks clean, the packet records it as an ownership question first:

```text
Does amaliadbg@hotmail.com belong to Amalia De Bedout?
Recommended option: confirm_email_for_subject
```

That confirmation still does not write a card by itself; it only authorizes the later reviewed card-write path to use the email.

The same pause applies when connected evidence replaces a weak candidate selected by the older matcher. For example, if a weak name-only candidate points to `lazaretas@gmail.com`, but Gmail/Contacts evidence points to `Luis Enrique Lopera <luis.e.lopera@gmail.com>`, the packet asks Alejandro to confirm the stronger email instead of silently accepting either candidate.

Replacement questions carry:

```text
reviewReason: weak_candidate_replacement
recommendedOption: confirm_email_for_subject
priority: high
```

This keeps false-candidate cleanup inside the same approval gate as normal evidence-derived identity.

## Mayerli / Ariana Pattern

Drive/Sheets found rows that support:

- `Gladys Mayerli Garcia Ortegon`
- phone `3115381341`
- retreat/program attendance

It also found:

- `mayariana@hotmail.com`
- `mayaariana@hotmail.com`

Because the email may belong to Ariana/family, the packet asks:

```text
Does this email belong to Mayerli, or should it stay as family/companion evidence?
```

Default recommendation:

```text
keep_email_unassigned_family_or_companion
```

Possible actions after review:

- confirm email for subject,
- keep email unassigned,
- prepare a related-person candidate,
- ask for more evidence,
- ignore candidate.

None of those options is a write approval by itself.

## Safety

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound messages.
- No live Gmail/Drive/MailerLite/Instagram/ManyChat/WhatsApp calls.
- No credential read.
- Local paths redacted.

## Operator Rule

Use this after `card-apply-preview` when:

- email ownership is ambiguous,
- a family/companion may share contact data,
- evidence suggests a possible related person,
- Mantis needs a crisp question for Alejandro instead of more raw search output.

The packet is the pause point before any future write implementation.

When Alejandro selects an option, store the answer in the local decision ledger:

```bash
npm run crm:vnext:evidence-review-decisions -- --packet-file ./packet.json --select-email email@example.com=keep_email_unassigned_family_or_companion --write --approved-by Alejandro
```

Do not store the recommended option unless Alejandro actually approves it.

After storing a decision, rerun the packet with the same decision ledger. Resolved emails should disappear from open review questions while remaining visible in the preview's decision summary.
