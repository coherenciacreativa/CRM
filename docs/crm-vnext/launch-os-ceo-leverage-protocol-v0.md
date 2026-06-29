# Launch OS CEO Leverage Protocol v0

Purpose: give Alejandro a compact CEO control surface for Launch OS while
allowing Codex/Mantis to operate with more autonomy, fewer repeated approvals
and fewer duplicate artifacts.

## What Alejandro Should See
Every meaningful phase should end with a CEO-facing packet that shows:

- Current microproduct / capability.
- Current phase and gate color: green, yellow or red.
- What was achieved since the last checkpoint.
- What is blocked and why it matters.
- Evidence paths, not raw logs.
- What was not touched.
- Recommended next move, clearly labeled as recommendation.
- Exact CEO decision phrases.

## What Alejandro Should Not See By Default
- Long terminal logs.
- Raw IDs, tokens, secrets, exact private URLs or credential metadata.
- Repeated low-level receipts unless they change the decision.
- Micro-approval requests for every safe internal step.
- Infrastructure built only to route around a human decision.

## Gate Colors
Green gates can proceed autonomously with receipts:

- Local docs, packets, rubrics, QA reports and prototypes.
- Read-only repo or report inspection.
- No-network static prototypes.
- Scoped commits/pushes for the active hito when approved by policy.
- Local synthesis from existing receipts and Control Room.

Yellow gates may proceed under delegation or consultant review:

- Shopify noindex/unlisted preview work with no public navigation.
- MailerLite Null Audience draft create/update/readback/delete.
- MailerLite API spikes inside disposable or Null Audience scope.
- Seed/test sends only to documented seed inboxes after QA is green.
- Rollback, delete or quarantine of objects created by this lane.
- Consultant bridge review for ambiguous yellow gates.

Red gates stop for Alejandro:

- Public/audience sends or URL distribution.
- Public navigation or launch surfaces.
- Real audience/subscriber mutation outside seed/safety context.
- CRM production writes.
- Ledgers, cards, scoring or Fact Store.
- CRM Core work.
- Brand Hub canon changes.
- Credential rotation, secret use or security-sensitive access changes.
- Destructive cleanup outside objects created by this lane.

## Autonomous Operating Rule
Codex/Mantis should advance by phase decisions, not infinite micro-approvals.

A phase decision should authorize a bounded class of work, expected evidence and
hard stops. Inside that boundary, the operator should proceed, generate
receipts and stop only when the next phase decision or a red gate appears.

Do not create infrastructure around human blockers. If Alejandro is the real
blocker, name the decision plainly and stop.

## Consultant Bridge
Use consultant bridge when a yellow gate needs another review surface and it can
be done without secrets or private data.

Consultant requests must be compact:

- Under 900 characters.
- Include request_id, active next_action_id, proposed action, safety status,
  artifact paths and exact GREEN/YELLOW/RED ask.
- Put long detail in a local artifact and paste only the path.

Consultant bridge cannot approve red gates.

## If Consultant Bridge Fails
- Preserve unsent text if possible.
- Refresh once or open one fresh Safari window if safe.
- If still unavailable, mark `consultant_bridge_unavailable`.
- Continue green work.
- Continue yellow work only when the pilot/standing delegation already covers
  it and receipts are strong.
- Stop at red gates.

## Artifact Consolidation
Do not split Static UX Review Pack and Static Local Prototype when both are
HTML review experiences.

Default package: `Interactive Static UX Prototype Pack`. It should include:

- CEO summary.
- Local HTML experience.
- Mobile/desktop QA.
- Copy-in-context readout.
- No-network/no-send safety scan.
- Decision brief.

## Preview Eligibility Gate
A microproduct may not enter CEO/Web Shopify Preview QA unless the public copy
is mature enough for Alejandro to review as a public-facing experience.

Required gate values:

- `copy_maturity = public_candidate`.
- `semantic_contract = green`.
- `blind_reader_comprehension = green`.
- `orthography_editorial_gate = green`.
- `spanish_editorial_gate = green`.
- `semantic_completeness_gate = green`.
- `referential_integrity_gate = green`.
- `product_naming_consistency_gate = green`.
- `cross_screen_coherence = green`.
- `lexical_repetition_gate = green`.
- `brand_voice_gate = green`.
- `preview_microcopy_context_gate = green`.
- `product_value_gate = green`.
- `visual_design_gate = green`.
- `visual_polish_gate = green`.
- `perceived_value_gate = green`.
- `claims_gate = green`.
- `independent_editorial_review = green`.
- `critical_findings = 0`.
- `major_findings = 0`.
- `internal_labels_absent = true`.

For Spanish public-copy experiences, apply
`docs/crm-vnext/launch-os-spanish-editorial-semantic-coherence-gate-v0.md`
before CEO/Web QA. This is a semantic/editorial gate, not a mechanical
spellcheck. It must verify that the product has a stable public noun, every
question and option can be understood on its own, abstract language has explicit
referents, and independent review finds zero critical and zero major findings.

This gate is separate from technical Shopify QA. A preview can be noindex,
unlisted and technically functional while still being blocked at the creative
or visual/perceived-value gate. Do not advance that state to CEO/Web QA as if
it were ready.

`preview_microcopy_context_gate` requires that public-facing microcopy has
explicit subjects and objects: no dangling nouns such as `primera versión`
without saying what the version is, no unclear subject in safety/trust lines,
no nearby repetition that weakens voice, and a coherent relationship between
product framing, main question and concrete output.

`visual_polish_gate` requires the key hero modules to look deliberate on
desktop and mobile: numbered or icon modules align cleanly with their text,
primary hierarchy is readable at first glance, and small visual defects do not
make the preview feel like a rough prototype.

## CEO Decision Packet Format
Use this shape:

1. What decision is needed.
2. Why now.
3. Options, each with pros/cons.
4. Recommendation.
5. Gates still closed.
6. Evidence paths.
7. Exact approval phrases.

Keep it short enough for Alejandro to decide without reconstructing the whole
thread.

## End-of-run Handoff Format
End autonomous runs with:

- Branch and latest commit.
- Active next_action_id.
- Green / yellow / red state.
- What changed.
- What was not touched.
- Receipts/artifacts.
- Current blocker or next decision.
- Exact next CEO phrases.
