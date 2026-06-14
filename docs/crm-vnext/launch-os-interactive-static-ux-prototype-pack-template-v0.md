# Launch OS Interactive Static UX Prototype Pack Template v0

Purpose:

This template consolidates two artifacts that should not be split by default
when a microproduct needs CEO review as a real local experience:

- Static UX Review Pack.
- Static Local Prototype.

Use this for future Launch OS microproducts when Alejandro needs to judge
landing copy, question flow, result states, mobile readability and value
perception before Shopify, MailerLite, CRM or public distribution.

This template is local-only. It does not approve build, Shopify preview/live,
MailerLite drafts, sends, audience assignment, CRM writes, ledgers, cards,
scoring, Fact Store or Brand Hub changes.

## When To Use

Use an Interactive Static UX Prototype Pack when:

- The microproduct has enough copy and logic to test as an experience.
- CEO review would be stronger with an actual HTML interaction.
- The main questions are UX, comprehension, mobile readability, result value or
  email-capture posture.
- The team should avoid repeating separate static review and prototype passes.

Do not use it when:

- The concept itself is not approved enough for copy/prototype.
- Brand authority or claims safety is still unresolved.
- A live-system preflight is the actual next gate.
- The user only needs a short copy review.

## Required Inputs

- Microproduct title.
- Current copy candidate.
- Product Value Gate notes.
- Brand/voice constraints.
- Claims/safety constraints.
- Result or state logic.
- Intended funnel hypothesis.
- Known non-approvals.

## Output Folder

Default report folder:

`/Users/alejandrogomez/Documents/Mantis-Reports/<microproduct_slug>_interactive_static_ux_prototype_pack_v0_<date>/`

Recommended files:

- `index.html`
- `qa_report.md`
- `desktop_check.png`
- `mobile_check.png`
- `prototype_receipt.json`

## Prototype Requirements

The prototype must:

- Run locally as HTML/CSS/JS.
- Make no network calls.
- Persist no data.
- Send no email.
- Use no MailerLite.
- Use no Shopify.
- Write no CRM.
- Add no analytics or tracking.
- Avoid external URLs unless explicitly approved and redacted in reports.
- Keep internal labels out of public-facing copy.

## UX Review Coverage

The pack should let Alejandro review:

- Landing/entry state.
- Main interaction flow.
- Question or step sequence.
- Selection states.
- Tie-break or scoring logic, if any.
- Result states.
- Email capture or save-result posture, simulated only.
- Confirmation state, simulated only.
- Mobile readability.
- Value perception.
- CTA clarity.

## QA Checklist

Green checks required:

- No network calls.
- No form action.
- No external tracking.
- No MailerLite scripts, snippets or forms.
- No Shopify dependencies.
- No CRM writes.
- No local persistence.
- No visible placeholders, tokens, redacted labels or internal notes.
- Mobile viewport readable.
- Desktop viewport readable.
- Primary CTA is clear.
- Result state feels complete before email capture.
- Claims safety preserved.

## CEO Decision Brief

Every pack should end with:

1. What the person sees.
2. What value the person receives.
3. What felt strong.
4. What felt weak.
5. What is green/yellow/red.
6. What should not be repeated locally.
7. Exact next decision requested from Alejandro.

## Safety Language

Always state explicitly:

- This is local-only.
- This is not publication.
- This is not Shopify preview/live.
- This is not MailerLite draft creation.
- This is not a send.
- This is not audience assignment.
- This is not CRM write.
- This is not market evidence.

## Reusable Learning From Test Claridad

- Result pages should feel complete before asking for email.
- Avoid expandable CTAs when the expansion adds little perceived value.
- Increase value perception first with specificity, a useful small step and a
  conservable result summary before adding animation or visual complexity.
- Static UX Review Pack and Static Local Prototype should be one artifact when
  both are HTML local experiences.

## Completion Standard

The pack is complete when:

- Local prototype exists.
- QA report exists.
- Desktop and mobile checks exist when practical.
- CEO decision brief exists.
- All live gates remain closed.
