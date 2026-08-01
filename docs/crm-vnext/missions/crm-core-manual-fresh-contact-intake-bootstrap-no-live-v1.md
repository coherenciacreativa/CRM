# CRM Core Manual Fresh Contact Intake Bootstrap — No Live v1

## Mission identity

- `mission_id`: `crm_core_manual_fresh_contact_intake_bootstrap_no_live_v1_20260731`
- `mode`: `proof`
- `canonical_base`: `fb490a5e5aaee5edee46cb79affdc1eb9374fdef`
- `strict_secret_mode`: `true`
- `product_transition_before`: `technical_foundation`
- `product_transition_after_if_green`: `bootstrap_ready_manual_intake_only`

## Business outcome

Prepare CRM Core to receive one manually maintained, owner-only Community
Intake Register with at most ten people and to produce dry-run signal,
identity, enrichment, minimal-card and MailerLite-candidate outputs. The
mission creates no real card, fact, ledger, subscriber, source or outbound
effect.

## Problem Reality Gate

- `claimed_blocker`: CRM Core has individual signal, identity, enrichment,
  card-approval and MailerLite final-check components, but no single current
  route accepts evolving `Personas` plus `Eventos`, preserves exact raw
  identity values and emits only the delta.
- `evidence_level`: `repo_verified`
- `canonical_state_verified`: exact central base and clean context were
  verified before the proof.
- `expected_behavior`: an enriched second version emits only new or changed
  records, does not duplicate the prior follow, preserves raw identity values
  byte-for-byte and grants no write authority.
- `observed_behavior`: the existing Instagram signal adapter emitted the old
  follow again when given the enriched version and transformed the supplied
  handle. Its behavior is correct for a stateless observation adapter, but it
  is not the required evolving-register boundary.
- `first_divergence`: no existing entrypoint owns stable person revisions,
  stable event IDs, prior-register comparison and explicit consent provenance
  together.
- `existing_solution_search`: Person Card Store, Instagram signal events,
  Signal Event Ledger/Projection/Pipeline, human enrichment, card-write
  approval/apply, identity resolution, signal-packet inbox and MailerLite final
  checks were inspected before proposing code.
- `existing_component_loaded_and_invoked`: the existing Instagram signal
  event adapter was invoked against two secret-free register versions.
- `alternative_explanations_tested`: the issue is not a missing event alias,
  source outage or private-data dependency; it occurs locally with synthetic
  data because the component is intentionally stateless.
- `minimal_reproduction`: initial register produced one event; enriched
  register produced both old and new events, and exact raw handle preservation
  was false.
- `causal_link_to_proposed_fix`: a pure format/delta adapter supplies only the
  missing revision, event-id, identity-provenance and consent boundary. It
  invokes the existing Contact Identity Resolver and Instagram Signal Events
  adapter rather than replacing either component.
- `no_build_option`: manually prepare separate payloads for every existing
  component and manually suppress all previously seen events. Rejected because
  it loses deterministic delta and creates CEO-dependent duplicate risk.
- `new_engineering_indispensable`: `true`, limited to one pure local adapter,
  one CLI and focused tests; no new engine, store, backend, runtime or source.
- `remaining_uncertainty`: first real private batch has not been processed;
  therefore `source_qualified=false`.
- `diagnosis_verdict`: `verified_problem`
- `boundary_owner`: `repo_owned`

## Input contract

The owner-only register has two logical collections:

- `persons`: stable `person_record_id`, monotonically increasing `revision`,
  optional raw display name, Instagram handle, email and phone, plus explicit
  email provenance and `receive_notes` consent evidence;
- `events`: stable `event_id`, linked `person_record_id`, event kind,
  observation time and required closed `inbound | outbound` direction.
  An `email_handoff | email_provided` event must also carry the deterministic
  SHA-256 digest of the exact email bytes represented by that evidence. The
  builder requires that digest to match the person's current exact email and
  requires provenance `observed_at` to equal the bound event's observation
  time; changed email or timestamp drift fails closed.
  Outbound welcome-audio evidence also requires a closed-format asset-version
  label; the adapter derives its durable dedupe key mechanically from person,
  event class and asset version.

Raw handle, email and phone values are retained exactly. Lowercase/digit-only
comparison keys are derived separately and never replace raw values.
No two person records in one register may claim the same derived handle, email
or phone identity.

MailerLite candidacy requires two same-person inbound evidence links: an
`email_handoff | email_provided` event whose exact-email digest and observation
time match the current person provenance, and a separate
`email_consent` event with explicit `receive_notes` consent and capture time.
Neither evidence link grants mutation authority.

## Allowed scope

- Process one synthetic batch of at most ten people.
- Compare an initial and enriched version of the same batch.
- Use compact synthetic existing-card identities to exercise matching and
  collision behavior.
- Prepare non-actionable signal observations, enrichment proposals, minimal
  card proposals and MailerLite candidates.
- Write one explicitly requested owner-only local dry-run artifact with mode
  `0600`, outside the repository. Owner-only inputs are likewise rejected when
  placed inside any registered worktree, when group/other-readable or when
  reached through a symbolic or hard link. Output may not alias or overwrite
  any input; file identity is compared by device and inode before writing.

## Forbidden scope

- Real private register reads or real identities.
- Instagram, browsers, source reads or source mutation.
- CRM cards, Fact Store, Signal Event Ledger or score writes.
- MailerLite reads or mutations.
- Audio, text, follow-back, outbound actions or automation.
- Scheduler, watcher, backend, runtime, store, bridge, emitter, new source
  family, capability family or authority.
- Treating an email cell as consent.

## Observable success

1. Initial synthetic batch prepares dry-run outputs with zero operations.
2. Enriched version emits only changed people and new events.
3. Duplicate event IDs and stale revisions fail closed.
4. Prior follow is skipped; reply remains a separate signal.
5. Outgoing welcome audio does not become an engagement signal.
6. Exact-handle matching prepares an enrichment proposal; a new handle
   prepares a minimal-card proposal; cross-card identifiers block.
7. MailerLite candidacy requires exact email, voluntary provenance and
   explicit `receive_notes` consent, and still requires suppression and
   idempotency checks.
8. CLI stdout is aggregate-only and the private artifact is owner-only.
9. Zero source, browser, network, CRM, MailerLite or outbound effects occur.

## Product-state boundary

If all focused validation and independent review are green:

- `technical_foundation=true`
- `bootstrap_ready=true` only for manual intake
- `source_qualified=false`
- `candidate_handoff_ready=false`
- `send_ready=false`
- `canary_confirmed=false` for this intake route
- `production_ready=false`

This contract grants no integration or live authority.
