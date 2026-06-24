# Launch OS Spanish Editorial + Semantic Coherence Gate v0

Purpose: prevent a microproduct from reaching CEO/Web QA with public Spanish
copy that is technically functional but semantically weak, ambiguous or not yet
ready as a public-facing experience.

This gate applies before Shopify CEO/Web QA for Spanish public copy in Launch
OS microproducts.

## Authority Order

Use this order when resolving copy disputes:

1. Current explicit Alejandro decision.
2. Primary founder canon.
3. Approved Brand canon.
4. Operational protocols.
5. Pilot evidence.
6. Drafts / hypotheses.
7. Generated reports.

Generated reports can record state and evidence. They do not define brand
intention by themselves.

## Phase 1 - Product Semantic Contract

Before rewriting, define the product in plain language:

- `public_product_noun`: stable noun used in public copy.
- `interaction_mechanism`: how the person interacts with the product.
- `central_user_situation`: what the person arrives with.
- `exact_value_promise`: what small value the person can honestly receive.
- `what_the_person_receives`: concrete output of the experience.
- `core_relationships`: how the main concepts relate to each other.
- `result_family_meanings`: what A-E or equivalent results mean.
- `question_purpose_per_screen`: what each question is trying to learn.
- `stable_vocabulary`: terms that must not drift across screens.
- `metaphor_policy`: metaphors allowed only with explicit anchors.

For `Mapa breve de energia y foco`, the stable formulation is:

- Product: a map implemented through five questions.
- Mechanism: five public questions leading to one result family.
- Situation: the person brings a concrete matter that is taking energy,
  scattering focus or asking for a decision.
- Value: the map helps name what to care for today and gives one small next
  gesture.
- Receives: one result, one small gesture, one phrase to return to the matter
  and an optional way to conserve the result.
- Energy: availability, rhythm and internal load.
- Focus: direction of attention.
- Decision: a concrete matter or choice the person brings; never an assumed
  invisible object.

## Phase 2 - Blind Reader Test

Use a fresh review context that did not author the copy.

Give it only:

- The semantic contract.
- The complete public copy.

The blind reviewer must return:

- Paraphrase of the product promise.
- What the person receives.
- Paraphrase of every question and option.
- Explicit referent of every pronoun and abstract phrase.
- Lines with two plausible interpretations.
- Options that are not understandable when read alone.
- Whether landing -> questions -> results uses one coherent model.
- Findings as `critical`, `major`, `minor`.

This review is green only if:

- `critical_findings = 0`.
- `major_findings = 0`.
- Every answer option is independently comprehensible.
- Product naming is stable.
- All referents are explicit or immediately inferable from the same screen.
- The reviewer can explain the product promise without inventing context.

## Phase 3 - Independent Senior Spanish Editorial Review

Use a separate fresh-context reviewer.

The reviewer must report findings before rewriting. It must evaluate:

- Natural professional Spanish.
- Semantic completeness.
- Referential integrity.
- Lexical precision.
- Stable product naming.
- Coherence across screens.
- Unnecessary abstraction.
- Unsupported metaphors.
- LLM cadence, symmetry and template rhythm.
- Repetitions and cliches.
- Affirmative Brand voice.
- Read-aloud naturalness.
- Claims safety.

Hard fail examples:

- Missing object or referent: `una frase para retomar`.
- Unsupported metaphor: `demasiadas piezas abiertas`.
- Assumed hidden object: `la decision todavia necesita asentarse` when no
  decision has been established.
- Incomplete relation: `puede mostrar que se sostiene` without naming what.
- Visible prototype/system language in public copy.

## Phase 4 - Authoring Repair

The authoring context may repair the complete copy once after both reviews.

Repair rules:

- Do not fix only the examples named by Alejandro.
- Do not change product strategy or quiz logic unless the semantic contract
  requires a small naming clarification.
- Preserve visual design unless copy length forces minor layout changes.
- Prefer concrete nouns and verbs over vague abstractions.
- Do not use dangling pronouns when the object is not immediate.
- Keep public copy affirmative and declarative.
- Keep claims safety: no diagnosis, no therapy, no cure, no guarantee, no false
  urgency.

## Phase 5 - Independent Re-review

Run the blind reader and senior editorial checks again on the repaired copy.

The gate is green only if:

- `semantic_contract = green`.
- `blind_reader_comprehension = green`.
- `spanish_editorial_gate = green`.
- `semantic_completeness = green`.
- `referential_integrity = green`.
- `product_naming_consistency = green`.
- `cross_screen_coherence = green`.
- `independent_editorial_review = green`.
- `critical_findings = 0`.
- `major_findings = 0`.
- `internal_labels_absent = true`.

Do not report green merely because the examples Alejandro named were fixed.

## Phase 6 - Preview Eligibility

Only after this gate is green:

- Update the existing noindex/unlisted Shopify preview.
- Do not publish.
- Do not touch public navigation.
- Do not distribute the URL.
- Do not advance to MailerLite, CRM, sends or audience work.
- Run desktop/mobile technical and creative QA.
- Generate a concise receipt with redacted URL posture.

## Receipt Minimum

The receipt should include:

- Root cause of the previous false green.
- Stable product definition.
- Findings before repair.
- Findings after repair.
- Representative fixes, max 8.
- Files changed.
- Preview updated: true/false.
- Noindex and no-navigation status.
- MailerLite/CRM/audience/send status.
- Final semaforo.
- Exact next CEO decision.

