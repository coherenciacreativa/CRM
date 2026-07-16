# Instagram welcome-audio Safari live host

Status: integrated host/issuer contract v2. The filename remains `v1` because
it is the mission allowlisted documentation path. Only the schema families
explicitly coordinated below were bumped to v2.

## Public boundary

`runWelcomeAudioSafariLiveCompositeOnce` is the sole public live effectful
entrypoint. It accepts the already-approved opaque preflight capabilities and
private exact bindings, then owns the whole one-shot sequence from claim
issuance through durable terminal publication. It does not accept a claim,
PENDING record, host capability, Computer Use client, driver, clock, callback,
URL, selector, coordinate, command list, or caller-selected verifier.

The raw prepare, post-PENDING execute, driver mint, host mint, and evidence
consumer functions are private. Synthetic-only wrappers end in `ForTest` and
cannot select live mode. The only other unsuffixed cross-module function is the
narrow one-use terminal-evidence verifier consumed by the claim issuer through
the canonical dynamic import.

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
10. `CONFIRMED` requires a same-attempt, same-thread, strict-under-five-minute
    `+1` outgoing audio bubble with an approved strong marker. Sent/Seen alone,
    compose reset, no error, timeout, or equality at five minutes is not
    confirmation.
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

## Exact thread semantics

The active/current/selected conversation root must be unique and bind the
private target exactly and case-sensitively. The target heading, message
history, empty composer, attachment control, preview, Send control, and outgoing
audio bubble must all be descendants of that same role-bearing root. Sidebar
rows, static text, lexical substrings, case variants, dedented siblings,
duplicate roots, controls outside the subtree, incoming voice, outgoing text,
and ambiguous controls fail closed.

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

The synthetic matrix covers the sole-export namespace, confirmed composite,
prepare throw/invalid receipt fail-closed claims, crash after durable PENDING,
durable UNKNOWN, fatal UTF-8, metadata/path/inode/link tamper, strict five-minute
boundaries, capability burn/replay, extra/class/accessor/Symbol/Proxy/revoked
envelopes, wrong attempt/visual pairing, mode mismatch, stale clocks, exact
thread parsing, no-prior-audio, empty composer, preview ambiguity, Send throw,
and redacted receipt validation. Live execution remains separately gated by the
mission contract and private owner-only artifacts.
It also covers proven pre-PENDING cancellation followed by a fresh confirmed
retry, and terminal cleanup under an adversarial PENDING replacement.
