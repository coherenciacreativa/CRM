# Instagram welcome-audio Safari live host

Status: integrated host/issuer contract v2 plus repo-only UI-attested
zero-action PRECLAIM observer v1 validation and independent rereview GREEN;
formal Chief Architect integration review remains pending.
The filename remains `v1`
because it is the mission allowlisted documentation path. Only the schema
families explicitly coordinated below were bumped to v2.

## Public boundary

`runWelcomeAudioSafariLiveCompositeOnce` and its separately versioned
UI-attested sibling remain the sole host-level public live effectful
entrypoints. They accept already-approved opaque preflight capabilities and
private exact bindings, then own the whole one-shot sequence from claim
issuance through durable terminal publication. They do not accept a claim,
PENDING record, host capability, Computer Use client, driver, clock, callback,
URL, selector, coordinate, command list, or caller-selected verifier.

The UI-attested family additionally exposes
`observeWelcomeAudioSafariUiAttestedPreclaimOnce`. That function is
read-only and non-effectful: it first validates every fixed production start
gate, then performs exactly one fresh state read and zero UI actions. A failed
start gate performs no source read. A successful read returns one opaque
one-use observation capability or a redacted blocker. It is consumed only by
the separate PRECLAIM builder and is not a second execution or Send surface.

The raw prepare, post-PENDING execute, driver mint, host mint, and effect
evidence consumer functions are private. Synthetic-only wrappers end in
`ForTest` and cannot select live mode. The PRECLAIM capability consumer is a
narrow exact-binding function used only by the builder; it burns a recognized
capability before binding or freshness rejection and exposes only three narrow
timestamps, never a driver, identity, path, digest, element index, action, or
raw state. The remaining unsuffixed evidence function
is the narrow one-use terminal-evidence verifier consumed by the claim issuer
through the canonical dynamic import.

## Exact order

1. Revalidate the operation context, contextual authority, sealed manifest,
   exact identity/thread/owner bindings, exact approved audio capability, clean
   integrated commit, and eligible ordered inspection.
2. Issue the next durable claim itself. Mission slots are `1..3`; slot `N` is
   possible only after every earlier slot has a valid durable `CONFIRMED`
   terminal. Active claims, PENDING, temporary evidence, `UNKNOWN`, corruption,
   or a gap block the next slot.
3. Capture the installed Computer Use runtime through the private binder and
   prepare the exact bound Instagram thread. Preparation may open the native
   chooser only. It may not type the path, select/upload bytes, or actuate Send.
4. Only a valid preparation receipt that proves chooser-only, no preview, no
   upload, zero Send, and zero external effect permits a zero-effect claim
   cancellation. A thrown or invalid preparation result leaves the durable
   claim fail-closed and no-retry; it is never inferred to be cancelled.
5. Publish, fsync, and reread the exact v2 `PENDING` record. After the boundary
   is invoked, thrown, malformed, consumed, or ambiguous results are treated as
   post-boundary `UNKNOWN`, never as a cancellable zero-effect result. If the
   issuer can recover the private terminal capability, it publishes durable
   `UNKNOWN` immediately.
   If the issuer itself proves and durably publishes a pre-PENDING zero-effect
   cancellation during final authority/asset/freshness revalidation, the
   attempt receipt carries that explicit fact. Only that proof lets the
   composite report cancellation and a reusable slot; it never infers
   cancellation from missing PENDING evidence.
6. The host consumes the one-use host-PENDING capability, independently opens
   the exact identity-derived file with no-follow semantics, and checks the
   complete lineage, mission slot, attempt nonce, bytes, metadata, inode,
   device, owner, mode, link count, and strict freshness. Reads use fatal UTF-8
   decoding and compare the open handle with a fresh path `lstat`.
7. Immediately before upload, repeat the full PENDING read and exact approved
   asset-path capability check. Any difference is permanent no-retry.
8. Mark upload-entered before the first file-selection action. Reacquire fresh
   Safari state before every fixed action. Require exactly one attachment
   preview, an empty composer, an unchanged zero-audio baseline, and exactly one
   Send control in the exact active thread subtree.
9. Mark one Send actuation before clicking Send exactly once. No resend or
   ambiguous retry exists.
10. `CONFIRMED` requires a fresh post-Send observation with the same private
    thread/owner/target binding and a same-attempt, same-pane,
    strict-under-five-minute `+1` outgoing audio record with an approved strong
    marker. Sent/Seen alone, compose reset, no error, timeout, evidence outside
    the pane, or equality at five minutes is not confirmation.
11. The claim issuer consumes the opaque attempt and visual capabilities,
    dynamically verifies them through this exact v2 module, publishes/fsyncs/
    rereads one v2 terminal, then atomically quarantines, revalidates, and
    removes only the exact PENDING inode. Substitution or residual ambiguity is
    retained and reported fail-closed. All other outcomes are durable `UNKNOWN`
    and permanent no-retry.

## Installed Computer Use binder

The binder reads the two global property descriptors exactly once:

- `globalThis[Symbol.for('openai.computer-use.runtime')]`
- `globalThis.sky`

Both must be own data descriptors whose values are the same frozen non-Proxy
object. `get_app_state`, `click`, `press_key`, and `type_text` must be own data
descriptor functions. The binder captures that exact object and bound method
references in private WeakMap state and never rereads either global between
validation and use. All calls hardcode `com.apple.Safari`.

The live path exposes no runtime object, driver, host capability, element
index, or generic action surface. Test inspectors return only booleans or
redacted deterministic state and restore any temporary test-only globals.

## Zero-Action UI-Attested PRECLAIM Observer

The production observer owns the clock, installed runtime, fixed authority and
claim-store locations, and central repository location. It hardcodes Safari.
Before any `get_app_state` call it validates the exact approved-audio
capability/path/digest; clean central HEAD, upstream, and tracked status; exact
tracked live-admission mission digest; exact active-next-action id and digest;
an empty owner-only fixed UI-authority root; and the fixed claim-store
boundary. Failure returns `START_GATES_INVALID`, zero state reads, and zero UI
actions.

Only after those gates are green does it take the exact private target, thread,
owner, and approved-audio path already present in the closed caller boundary
and perform one `get_app_state` read. It performs no click, keypress, text,
navigation, chooser, upload, or Send action.

The one read must prove a standard non-private isolated Safari surface, exact
target/thread/owner binding, a visible explicitly empty composer, one
unambiguous attachment control, no attachment preview, proven absence of prior
outgoing audio in the exact thread scope, and no challenge or error. Missing,
duplicate, stale, mixed-window, ambiguous-audio, prior-audio, preview, or
control evidence blocks before authority publication or claim.

A READY result mints one opaque capability in module-private WeakMap state.
The capability stores the closed observation privately, is bound to the exact
target/thread/owner/audio path, and expires strictly under the existing
five-minute freshness boundary. A recognized fresh capability is burned before
binding and freshness checks. Wrong binding, stale use, replay, or a second
consumption therefore returns no observation and cannot preserve authority.

The consumer returns only `observed_at`, `audio_validated_at`, and
`central_context_checked_at`. Those timestamps are derived from their distinct
validated gates and are not interchangeable. No raw identity, thread, owner,
path, digest, state, or receipt field crosses the consumer boundary.

The injectable `ForTest` observer and consumer accept only a synthetic
owner-only temporary authority root, synthetic store capability/root, fake
driver, and deterministic clock. They never select live mode, bind the
installed runtime, or access fixed roots.

Its public receipt is aggregate-only: one state-read count, zero action count,
fixed booleans, a fixed decision, and allowlisted blocker codes. It contains no
identity, thread or owner reference, path, digest, timestamp, UI state,
screenshot, accessibility text, or payload.

## Exact thread semantics

The sealed-manifest route keeps its original strict hierarchy parser unchanged.
Its active/current/selected conversation root must be unique and bind the
private target exactly and case-sensitively. The target heading, message
history, empty composer, attachment control, preview, Send control, and outgoing
audio bubble must all be descendants of that same role-bearing root. Sidebar
rows, static text, lexical substrings, case variants, dedented siblings,
duplicate roots, controls outside the subtree, incoming voice, outgoing text,
and ambiguous controls fail closed.

The UI-attested sibling may additionally consume the real Computer Use flat
Safari serialization. That compatibility path is family-specific and requires
all of the following on every fresh observation:

- native Safari tab records are recognized only by their internal
  `isPinned`/`isActive` metadata; page-level Instagram tabs do not count. There
  must be exactly one active unpinned source tab and one inactive unpinned
  `Neutral UI Preflight` tab. Shared pinned tabs may remain inactive;
- exactly one indexed Safari address field must use the exact
  `(settable, string)` shape, `smart search field` description, browser address
  field ID, and byte-exact bound thread value;
- the byte-exact owner reference must occupy the profile slot in one unique,
  ordered authenticated top-navigation cluster, between `Professional
  dashboard` and `Settings`, as the byte-exact primary segment
  `instagram.com/<owner>/`; that cluster must precede the DM pane;
- one and only one current-header cluster contains a heading followed at pane
  depth by exact `<target> · Instagram` text and then a `View profile` link
  whose structured `Value` is byte-exactly `instagram.com/<target>/`, before
  the composer. The heading child is display-name text and is not an identity
  anchor;
- that pane contains one indexed `entry area (settable, string)` whose exact
  Message placeholder has a structured empty `Value`, followed by one indexed
  `Add Photo or Video` attachment control; and
- another regular tab, an active pinned source, a duplicate binding, or private
  browsing fails closed.

Attachment, preview, and Send controls count only after that exact composer;
pre-composer decoys fail closed. Outgoing-audio evidence counts only in the
post-header, pre-composer history segment. Generic prior thread text is allowed,
but an existing recognized outgoing welcome/audio blocks through the existing
zero-baseline gate, and any unrecognized pane-local audio/voice evidence makes
scope unknown and blocks. A historical Sent/Delivered/Seen label is never
promoted to a marker; a fresh same-pane `+1` outgoing-audio delta may use the
existing no-marker confirmation variant. The private thread/owner/target
binding digest is retained only in ephemeral host state and must remain
identical before chooser, preview, Send, and confirmation.

Fresh accessibility state is required before every UI action. Private visual
state, OCR, paths, targets, screenshots, anchors, and element indices are never
returned or persisted in public receipts.

## Terminal evidence

Attempt and visual capabilities are opaque, one-use, attempt-nonce bound, and
mode bound. The verifier burns every safely located fresh capability before
pairing or later validation. Wrong binding, stale evidence, replay, a missing
attempt, an already-consumed attempt, or a module/verifier error cannot preserve
a visual capability for a second try.

The verifier derives execution mode, upload state, Send count, attempt time,
marker, observation time, and bubble delta only from private WeakMaps. Callers
cannot submit an outcome or visual facts. It returns either an immutable exact
evidence envelope or a fixed invalid status.

## Version and migration policy

The live-host contract, host receipt, composite receipt, PENDING, terminal,
attempt receipt, claim, and cancellation records used by this integration are
v2. A legacy v1 artifact in any family bumped to v2 is not migrated or
dual-read; it blocks fail-closed. Legitimate unchanged and newly introduced v1
families, including inspection/state/claim receipts and observation records,
remain accepted under the coordinated v2 contracts. The preflight and
operation guard contracts remain unchanged.

## Privacy and scope

Composite receipts contain only fixed enums, booleans, bounded counts, and
redacted blocker codes. They contain no identity, handle, thread reference,
path, anchor, digest, timestamp, payload, screenshot, accessibility text, or
provider response.

The module has no campaign, advertising, follower-source, profile-browsing,
MailerLite, CRM-write, legacy proxy, resend, delete, or retrigger authority.
Development and synthetic tests perform no Safari, Instagram, network, or
provider action.

## Verification matrix

The synthetic matrix covers the live-effect namespace, confirmed composite,
prepare throw/invalid receipt fail-closed claims, crash after durable PENDING,
durable UNKNOWN, fatal UTF-8, metadata/path/inode/link tamper, strict five-minute
boundaries, capability burn/replay, extra/class/accessor/Symbol/Proxy/revoked
envelopes, wrong attempt/visual pairing, mode mismatch, stale clocks, exact
thread parsing, the real flat-tree UI sibling, native-metadata two-regular-tab
plus pinned isolation, exact address/thread and ordered-navigation owner
binding, unique target-header selection, structured-empty entry-area evidence,
post-composer attachment/preview/Send scoping, history-scoped outgoing audio,
audio ambiguity, generic non-audio history, no-prior-audio, preview ambiguity,
Send throw, and redacted receipt validation.
The PRECLAIM observer extension additionally covers production start gates
before the sole state read, zero reads on failed gates, exactly one state read,
zero UI actions, installed-runtime binding, one-use burn-before-rejection
semantics, expiry, binding mismatch, preview/prior-audio/challenge rejection,
ambiguous attachment control, three-timestamp-only consumption, receipt
privacy, and a synthetic-only fake-driver/temp-root wrapper.
Live execution remains separately gated by the mission contract and private
owner-only artifacts.
It also covers proven pre-PENDING cancellation followed by a fresh confirmed
retry, and terminal cleanup under an adversarial PENDING replacement.

The current repo-only mission's focused builder/runner/host validation is
`166/166` green and the exact sixteen-suite welcome-audio compatibility
boundary is `759/759` green. A fresh-process inert-import test proves no
installed-runtime getter read or filesystem creation at import. No real
Safari, browser, network, private artifact, fixed root, claim, PENDING, upload,
Send, or external effect occurred. Independent rereview is GREEN with no
unresolved P0-P3 finding; formal Chief Architect integration review and central
integration remain pending.
