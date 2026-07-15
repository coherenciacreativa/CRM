# Instagram welcome-audio Safari live host v1

Status: implementation rail for an owner-only, one-shot Safari actuation. This
module is not a source reader, candidate selector, campaign controller, or
MailerLite client.

## Purpose

The live host is the low-level owner of only the final, already-bound Instagram
DM attachment and Send sequence. It consumes opaque same-process trust
capabilities from preflight and independently reads the fixed owner-only claim
store to prove the exact durable `PENDING` record before any upload-capable
picker action. It never creates, edits, replaces, or finalizes claim records.
There is no exported live driver mint or raw live-host constructor in this
slice. The final composite live entrypoint belongs in this same Safari host module; it
orders the claim issuer's trust and durable-state transitions around the host's
private preparation and post-`PENDING` actuation closures. Stage C must expose
that composite as the only live entrypoint and prune the raw low-level effect
exports. The host never accepts generic command arrays, callbacks, arbitrary
selectors, coordinates, URLs, or scripts.

The deterministic deferred rendezvous remains an optional no-live oracle. Its
100 ms window is never used as a live transport, claim, upload, or Send
authority.

## Fixed order

1. The composite caller validates the opaque operation context against the
   exact mission, approval, central commit, canonical operation, candidate,
   owner, thread, manifest, campaign interval, and approved audio binding.
2. The host requires an opaque branded Safari driver. No caller may supply Sky,
   a driver object, live branding, or a live execution mode. The internal Stage
   C binder reads only the canonically bootstrapped Computer Use client from
   both `globalThis[Symbol.for('openai.computer-use.runtime')]` and
   `globalThis.sky`; both global properties must be data descriptors, their
   values must be the same frozen non-Proxy object, and each required method
   must be an own data-descriptor function. The binder and live host mint are
   private to this module. The only exported host factory is explicitly
   synthetic and test-only.
3. Consume an opaque one-use target-binding capability that binds the raw
   private target to the exact candidate and thread anchors. Only then acquire
   fresh Safari state and require one standard, non-private, isolated Instagram
   DM surface with that exact target, message composer, and one attachment
   control. Live parsing preserves accessibility indentation and parent-child
   structure. Binding requires exactly one role-bearing active/current/selected
   conversation container whose label binds the exact target, exactly one
   exact case-sensitive target heading below it, and exactly one role-bearing
   message-history container below it. The composer, attachment control,
   preview, and Send control must all be descendants of that same active thread
   subtree. Outgoing audio counts only role-bearing message/bubble descendants
   of that exact history subtree; the bubble need not repeat the private target.
   A sidebar row, static text, case variant, dedented sibling, malformed
   hierarchy, unrelated page-text occurrence, or ambiguity fails closed. The
   composer must be explicitly empty, no prior outgoing audio may be present,
   and no attachment preview may already exist. A raw target string or visual
   match alone is never authority.
4. Open the native attachment chooser and reacquire fresh state. Preparation
   stops here. It does not type a path, select a file, upload bytes, or expose a
   Send permit outside the current process.
5. The composite caller revalidates the exact durable claim binding and
   publishes/fsyncs the durable `PENDING` attempt. Only then may it call the
   host's post-`PENDING` execution entrypoint. The host independently opens the
   exact identity-derived record with no-follow semantics and verifies its
   exact schema and mission, operation, identity, thread, audio, owner-process,
   attempt-nonce, freshness, permission, link, inode, and device bindings. It
   also consumes the separate opaque host-`PENDING` capability minted by the
   claim issuer and matches the independent full snapshot, bytes, metadata,
   store identity, and path against the issuer's hidden state. The actuation
   capability remains untouched for Stage C terminal finalization. The host
   rejects any fabricated record, terminal record, or temporary sibling.
   The post-`PENDING` input envelope is descriptor-inspected without invoking
   accessors. Whole-envelope Proxies, including revoked Proxies, are rejected
   before any trap. For any non-Proxy envelope where the valid prepared permit
   is safely located as an own data descriptor, the permit is burned before
   later shape or value validation; every later failure returns opaque UNKNOWN
   attempt evidence and permanently forbids retry.
6. Immediately before picker selection, the host validates the raw private
   audio path directly against the opaque approved-asset capability, then
   reopens and revalidates the same `PENDING` bytes and metadata. A filename,
   caller-supplied hash, stale record, or process-restart artifact is not
   sufficient.
7. Mark the opaque attempt evidence as upload-entered before the first picker
   action that can select or upload the approved file. Reacquire fresh state
   before every fixed keyboard or click action. The host does not mutate the
   durable record; the composite publishes the terminal accounting afterward.
   Live attempt time is captured internally at this boundary and is never
   supplied by the caller; only the synthetic test mode accepts an injected
   clock value.
8. Require exactly one total attachment preview, bind it to the exact approved
   basename in the same explicit preview node, reprove an empty composer and an
   unchanged zero-audio baseline, and require one composer-bound Send control.
   Set the opaque attempt evidence to one Send actuation before clicking Send
   exactly once.
9. Reacquire fresh state. Mint one opaque, one-use attempt-evidence capability
   for every post-`PENDING` outcome, including no-upload, upload-unknown, and
   Send-unknown. Additionally mint one opaque visual-confirmation evidence
   capability only when the exact bound thread has a new outgoing audio bubble
   attributable to this current attempt inside the explicit exact-thread history
   scope compared with its zero pre-upload baseline.
   The evidence is bound to the thread, durable attempt nonce, bubble delta,
   and confirmation time. A Sent/Seen marker by itself, a compose reset,
   absence of an error, timeout, mismatch, or ambiguous UI cannot mint it.
10. Return those opaque capabilities to the composite caller; public receipt
    booleans are never authority. The composite consumes the attempt evidence
    and finalizes/fsyncs one terminal outcome. `CONFIRMED` additionally requires
    consuming that exact visual-confirmation capability. Any upload-entered,
    attempted, timed-out, mismatched, or unknown result is permanent no-retry.
    A confirmed outcome is also terminal and cannot be replayed.

## Computer Use boundary

The unexported installed-runtime binder stores the validated Computer Use
client only behind a private `WeakMap`. Every call hardcodes the application
identifier `com.apple.Safari`. The driver exposes no methods or serializable
state. The host allows only these internal stages:

- read a fresh full Safari state;
- activate the single exact attachment control;
- open the native Go-to-folder sheet;
- type the sealed private audio path;
- resolve and choose that file;
- activate the single exact Send control.

No stage accepts a caller-selected key, element index, callback, action name,
coordinate, URL, or private payload. Element indices are derived again from
the immediately preceding fresh accessibility state and are never reused.

This repository-level binding is operational confinement, not a retroactive
cryptographic plugin brand. It assumes the canonical Computer Use bootstrap
has installed the frozen client in a trusted process before Stage C is invoked.
The plugin currently installs replaceable globals, so a hostile actor already
controlling that process could preseed a lookalike. Stronger provenance would
require a plugin-owned private registry or verifier. Within this repository,
parameter injection and public live factories are eliminated rather than
misrepresented as cryptographic provenance.

## Privacy and receipts

The target, audio path, operation identifiers, anchors, screenshots,
accessibility text, element indices, and claim capabilities remain private and
same-process. Public receipts contain only fixed enums, booleans, bounded
counts, and redacted blocker codes. The receipts never include hashes, paths,
identities, thread references, raw UI state, payloads, or provider responses.

## Tests and live boundary

Unit tests use only `createSyntheticSafariDriverForTest` and
`createSyntheticWelcomeAudioSafariLiveHostCapabilityForTest` with enumerated
scenarios and the claim issuer's temporary owner-only synthetic store. The
boolean-only `inspectInstalledComputerUseRuntimeBindingForTest` exposes no
runtime, driver, capability, or live mint. Every
positive upload/Send path enters the real issuer boundary and consumes its
separate host-`PENDING` capability; a handcrafted JSON record appears only in
explicit rejection tests. The matrix covers exact five-minute preupload
expiry, metadata and full-binding tamper, capability burn/replay, Proxy and
accessor no-throw envelopes, hierarchical active-thread parsing and lexical
decoys, duplicate roots, exact-target substring rejection, roleless/static,
incoming, outgoing-text, and role-bearing outgoing-voice bubble classes,
out-of-subtree controls, same-index and unindexed control ambiguity, prior audio
without a repeated target label, draft text, multiple attachments, picker/Send
unknowns, strong exact-thread `+1` confirmation, receipt coherence, and
exactly-once Send accounting. The constructors have no network, Safari,
Instagram, campaign, or MailerLite authority.

This slice performs no live action during development or tests. A later live
run still requires the mission contract, private artifacts, action-time policy,
and the already-approved bounded canary scope.
