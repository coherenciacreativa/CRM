# Instagram Welcome Audio UI-Attested PRECLAIM Builder and Live Canary Runner v1

Date: 2026-07-18
Status: `completed_repo_only_no_live_formal_review_green_centrally_integrated`

The status above describes the integrated Safari PRECLAIM/actuation rail. The
2026-07-19 source-provenance closure below is
`approved_repo_only_implementation_in_progress_no_live` and is not centrally
integrated.

## Purpose

Close the production orchestration gap between one already prepared private
UI-attested canary draft and the existing fixed authority, operation-context,
claim, Safari, PENDING, upload, one-Send, and strong-confirmation rail.

This boundary adds no second effect implementation. It supplies only:

- one zero-action Safari observation of the already bound thread;
- one opaque, one-use observation capability;
- one effect-free PRECLAIM builder that closes the canonical-digest cycle; and
- one fixed one-shot runner that chains the existing publisher, authority
  loader, operation-context validator, and Safari composite.

The repo-only mission tests these surfaces with synthetic inputs only. It does
not invoke the live entrypoint.

## Public Live Boundary

`runFixedWelcomeAudioUiAttestedSingleRecipientCanaryOnce` accepts exactly:

- `draft_admission_capability`; and
- `private_authorization_seed`.

The capability is the only productive bridge from the IAB semantic source
chain. The runner burns it once and obtains the validated v2 private draft
internally. A raw `private_draft`, v1 compatibility draft, legacy materializer
output or caller-supplied identity/thread/owner/evidence field is rejected
before any Safari read.

The live caller cannot provide a browser driver, Computer Use runtime, root,
claim store, clock, selector, coordinate, callback, outcome, confirmation,
fault scenario, prebuilt operation snapshot, publisher authorization, or
actuation result.

The authorization seed is closed data bound to the exact central HEAD, tracked
mission and active-next-action digests, approval reference and interval,
canonical draft and projection digests, operation and authorization ids,
source-evidence digest, candidate/thread/owner/dedupe anchors, and approved
audio path and digest. It also carries a unique nonce digest.

Before any source read, the runner structurally recognizes and atomically burns
that exact seed, then exact-binds it to the draft. A cross-draft or
cross-recipient mismatch burns the recognized seed without preserving it for
the originally bound draft. Successful exact binding issues one module-private
opaque admission capability, which remains unconsumed through observation and
is consumed exactly once by the builder afterward.
Candidate, claim, PENDING, upload, and Send caps remain fixed at one; retry
remains zero after any possible effect.

## Zero-Action Safari Observation

`observeWelcomeAudioSafariUiAttestedPreclaimOnce` owns the production clock,
installed Computer Use runtime, fixed authority and claim-store locations, and
central-repository location. Before its sole Safari read it validates the
exact approved audio capability/path/digest, clean central HEAD and upstream,
tracked mission digest, active-next-action id and digest, empty owner-only
fixed authority root, and valid fixed claim-store boundary. Any failed start
gate returns a redacted blocker with `state_read_count=0`.

Only after every production start gate is green does it perform exactly one
fresh Safari state read. It performs zero clicks, keypresses, typing,
navigation, chooser actions, uploads, or sends.

The observation is READY only when that one read proves all of the following:

- one standard non-private isolated Safari source surface;
- the byte-exact target, thread, and owner binding;
- a visible and explicitly empty composer;
- one unambiguous usable attachment control;
- no attachment preview;
- proven absence of prior outgoing audio in the exact thread scope; and
- no visible challenge or error.

Success mints one opaque capability held only in module-private state. The
capability is exact-target/thread/owner/audio-path bound, strictly fresh, and
consumable once. A recognized fresh capability is burned before binding and
freshness checks, so wrong binding, stale use, replay, or a second use cannot
preserve it for later work.

The consumer returns only `observed_at`, `audio_validated_at`, and
`central_context_checked_at`. It never returns identity, thread, owner, path,
digest, raw state, or receipt payload. These three timestamps are used only for
their narrow corresponding attestations.

The public observer receipt is aggregate-only. It contains no target, thread,
owner, path, digest, timestamp, UI state, screenshot, accessibility text, or
payload.

The only injectable observation sibling ends in `ForTest`. It accepts a
synthetic owner-only temporary root, synthetic store capability/root, fake
driver, and deterministic clock. It cannot select production mode and never
opens a fixed root or installed browser runtime.

## Audio Validation and PRECLAIM Builder

Before observation, the runner calls the existing approved-audio validator.
The validator must issue its opaque asset capability for the exact canonical
path and draft digest. The production observer validates that capability and
the fixed start gates before the sole source read. The builder then
independently verifies the same capability against the same path and digest
before consuming the observation capability.

`buildWelcomeAudioUiAttestedPreclaimBundle` is data-only and effect-free. Its
live entry accepts only:

- the validated private draft;
- the opaque private authorization-seed admission capability;
- the opaque approved-audio capability; and
- the opaque one-use Safari observation capability.

The live builder owns its clock. Only its `ForTest` sibling accepts a
deterministic clock.

It creates the complete UI-attested operation snapshot with an initially empty
digest position, computes the canonical operation digest with the existing
operation-guard function, binds the same digest into the seven required digest
positions, recomputes it, and requires equality. It then runs the existing guard
and succeeds only at exact PRECLAIM:

- `decision=eligible_for_atomic_claim`;
- `claim_allowed=true`;
- `send_ready=false`;
- `send_allowed=false`; and
- no blocker or terminal state.

The same canonical digest is placed in the exact private publisher
authorization, closing the prior circular caller-construction gap without
copying a synthetic test fixture or fabricating UI facts.

The builder does not open Safari, publish authority, access a fixed root, issue
a claim, open a chooser, upload bytes, or invoke Send.

## Fixed Runner Order

The live runner owns the following uninterrupted order:

1. atomically consume the one-use draft-admission capability, validate the
   exact v2 draft, structurally recognize and atomically burn the authorization
   seed, exact-bind it, and issue the existing module-private seed-admission
   capability;
2. validate the approved audio bytes and mint the opaque audio capability;
3. validate all fixed production start gates, then perform the single
   zero-action Safari observation;
4. consume the admission and observation capabilities and build the exact
   PRECLAIM snapshot plus publisher authorization;
5. call the existing fixed UI-attested authority publisher;
6. open the existing fixed authority/source/audio capability set;
7. validate the existing UI-attested live operation context;
8. pass only the resulting opaque capabilities and exact bound values to
   `runWelcomeAudioSafariUiAttestedLiveCompositeOnce`; and
9. accept success only from the existing composite's strong same-thread
   confirmation.

The runner does not implement file selection, claim issuance, PENDING, upload,
Send, or confirmation itself. Those remain owned by the previously integrated
composite. There is no fallback, alternate action adapter, direct click, second
Send, resend, or ambiguous retry path.

A failure before authority publication is attempted is a blocked pre-effect
result. Once publication is called, even a thrown, malformed, or lost
publication result becomes `terminal_zero_external_effect_permanent_no_retry`:
the authority root may be occupied, so replay is forbidden even when no
external effect occurred. A later open/context failure or a composite blocked
zero-effect result after publication is the same terminal zero-effect state.
After the composite may have crossed an external boundary, a throw, malformed
result, timeout, or unproven confirmation becomes terminal UNKNOWN with
permanent no-retry. CONFIRMED requires the composite's exact new same-thread
audio evidence.

## Synthetic Test Boundary

`runSyntheticWelcomeAudioUiAttestedSingleRecipientCanaryOnceForTest` is the
only injectable sibling. Its additional root, store, driver, clock, and fault
fields exist only on the `ForTest` export. Tests use owner-only temporary roots,
a fake driver, deterministic clocks, and synthetic fault scenarios.

The synthetic entry cannot select live mode. The live entry cannot accept any
synthetic field. Importing either module is inert and does not read Safari,
open a fixed root, validate a real private artifact, issue a claim, or perform
an external effect. The inertness regression imports the production module in
a fresh Node process with a poisoned runtime getter, isolated HOME, and
constrained PATH; it proves zero runtime getter reads and no filesystem
creation.

No package or test registry edit is required. Vitest discovers or directly
executes the two new specification files, and production callers import the
module by its exact path.

## Privacy and Non-Claims

All public receipts contain only fixed decisions, booleans, bounded counts,
and allowlisted blocker codes. They exclude identities, handles, private
references, paths, anchors, digests, operation or approval identifiers,
timestamps, screenshots, accessibility text, messages, payloads, and raw
URLs.

The existing UI-attested non-claims remain false:

- `exact_follow_timestamp_claimed=false`;
- `provider_event_id_claimed=false`; and
- `campaign_membership_claimed=false`.

The runner has no text, follow-back, MailerLite, CRM, campaign, Ads, proxy,
delete, resend, retrigger, or multi-recipient authority.

## Current Mission Boundary

The implementation is currently repo-only and no-live on baseline
`feed2788fa0400b63483dd4b4e851a45f94b7bda`. Focused validation is `166/166`
green and the exact sixteen-suite compatibility boundary is `759/759` green.
Node syntax, replay, privacy, hostile-input, ambiguity, fresh-process inert
import, exact twelve-file allowlist, and diff checks are green.

No live/browser/network/private-artifact/fixed-root effect occurred. Independent
adversarial rereview is GREEN with no unresolved P0-P3 finding. Formal Chief
Architect integration review returned `green_to_self_integrate`,
`safe_to_self_integrate_now=true`, and `ceo_decision_needed=false`. The exact
source commit was fast-forwarded under the Central Integration Lock, and the
focused `166/166` plus exact sixteen-suite `759/759` validation remained green
on central. Because this result is repo-only,
`canary_ready=false`, `production_ready=false`, `live_authority=false`,
`claim_issued=false`, `send_allowed=false`, `browser_used=false`,
`network_used=false`, and `external_effect_invoked=false` remain controlling.

A later live invocation still requires its own exact, fresh execution authority
bound to the resulting central commit and private one-recipient inputs.

## 2026-07-19 Source-Provenance Closure

This runner remains the existing Safari actuation orchestrator; it is not a
second source implementation. Its production namespace is now closed to raw
drafts and consumes only the one-use `draft_admission_capability` emitted by the
IAB semantic source-to-artifact-to-v2-draft chain, together with the existing
closed authorization seed. Its runner contract and aggregate receipt labels
advance to v2 so a legacy raw-draft-era receipt cannot be mistaken for this
source-authenticated boundary. The synthetic export keeps its existing name,
but now consumes a capability from a separate `ForTest` registry rather than a
raw draft.

Production and test admission registries are disjoint. Offering a synthetic
capability to the fixed runner burns it and fails closed before Safari; it
cannot then be replayed through the test consumer. Conversely, the test
consumer cannot turn a production capability into a synthetic admission.

The next proof mission uses IAB only for read-only discovery and Safari only
for actuation. Chrome, Safari-as-source, OCR/screenshot/coordinate navigation,
runtime fallback and caller-selected driver, URL, selector, identity, thread,
owner, clock or evidence booleans are forbidden.

Before any canary can be described as ready, Stage 2 must complete two distinct
notification-to-profile traversals with zero thread opens and zero capability
issuance, and Stage 3 must qualify one complete source candidate with no upload,
preview or Send. Those real read-only stages need fresh exact approval and must
run on the frozen implementation commit. Repo-only tests do not satisfy them.

This amendment starts from central
`efddb21ef6c598e1452ea2a9912235dea431e2ef`. Commit
`e9545637c88e6e1cab8ac7be34d9725410a363ec` remains outside central and is
excluded, rather than silently folded into this lane. No source access, Safari
action, claim, upload or Send is authorized by this document.

## 2026-07-19 Atomic Runner Receipt Truthfulness Closure

The runner v2 receipt validator now accepts only lifecycle states that the
fixed orchestrator can actually produce. Early blockers — input, draft
admission, draft contract, authorization seed, and audio — require every
reported execution milestone false. In particular,
`DRAFT_ADMISSION_INVALID` cannot claim audio validation, PRECLAIM work,
authority publication, composite entry, possible external effect, or permanent
no-retry.

The remaining blockers use exact reachable prefixes:

- observation invalid: audio true, with start gates either false or true;
- builder invalid: audio, start gates, and observation true;
- publication invalid: built plus publication-attempted and permanent no-retry;
- authority open invalid: additionally publication known true;
- operation context invalid: additionally authority opened;
- composite blocked-zero-effect: additionally context and composite invoked;
- confirmed: every milestone including strong confirmation, external-effect
  possibility, and permanent no-retry true, with no blocker; and
- unknown: the same terminal prefix without confirmation, with no blocker.

A blocker from an earlier phase cannot be paired with a later prefix. A
post-publication blocker cannot be downgraded to an ordinary pre-effect block.
CONFIRMED or UNKNOWN cannot carry a blocker, and terminal zero-effect cannot
carry an early blocker. This is receipt-validation hardening only; the runner's
productive input, capability chain, Safari-only actuator, effect implementation
and no-retry boundary are unchanged.

This work is one part of the single repo-only atomic truthfulness closure. It
authorizes no production invocation, source observation, Stage 2/3, central
integration, claim, upload, preview, Send, or other external effect. Any such
step still requires its separately controlling approval after formal review.
