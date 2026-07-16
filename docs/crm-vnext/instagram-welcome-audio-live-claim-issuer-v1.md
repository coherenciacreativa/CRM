# Instagram welcome-audio live claim issuer

Status: integrated issuer/host contract v2. The allowlisted filename remains
`v1`. The incompatible claim, cancellation, PENDING, terminal, and attempt
schemas are coordinated v2. Newly introduced observation schemas start at v1;
unchanged inspection, state, and claim-receipt schemas retain their existing v1
versions.

## Authority

The claim issuer is the sole durable authority for welcome-audio identity
dedupe, mission-wide effect accounting, sequential mission slots, PENDING, and
terminal outcomes. It performs no Safari, Instagram, campaign, MailerLite,
CRM-write, network, upload, or Send action. Its capabilities are opaque,
same-process, one-use, non-serializable objects backed only by private WeakMaps.

The Safari host's sole live composite issues and consumes these capabilities
internally. Callers cannot supply a pre-issued live claim, durable store root,
PENDING record, attempt outcome, terminal facts, verifier module, or clock.

## Coordinated schema versions

The issuer uses coordinated v2 schemas for:

- pre-effect claim;
- zero-effect reservation cancellation;
- durable PENDING attempt;
- durable terminal (`CONFIRMED` or `UNKNOWN`);
- attempt receipt.

The append-only reply observation claim and observation receipt are newly
introduced v1 schemas. The pre-existing inspection record, inspection result,
state receipt, and claim receipt remain v1 schemas; their issuer contract
binding is still the coordinated v2 contract.

Files are owner-only regular files in an owner-only store. Publication uses a
private temporary file, file fsync, exclusive hard-link publication, exact
inode/bytes/schema verification, temporary unlink, directory fsync, and final
reread. Symlinks, extra links, mode drift, device drift, inode replacement,
malformed UTF-8, malformed JSON, extra fields, temporaries, or ambiguous
evidence fail closed.

Cleanup never performs a mutable-path read followed by a raw unlink. Claim,
PENDING, mutex, and reconciled publication-temporary cleanup first atomically
renames the exact fixed path into a same-directory owner-only quarantine,
fsyncs the directory, rereads the quarantined inode/bytes, and deletes only
that proven object. A substituted inode, a second quarantine, or newly appeared
attempt evidence is retained and blocks the lane. Mutex release is the end of
the old critical section: a legitimate next owner that publishes the fixed
mutex after the old inode is quarantined is left completely untouched.

Legacy v1 artifacts in the schema families bumped to v2 (claim, cancellation,
PENDING, terminal, and attempt) are not migrated or dual-read. Their presence
blocks the mission lane until separately resolved under a new approved
contract. Legitimate unchanged or newly introduced v1 families remain accepted
under the issuer v2 contract. Preflight and operation-guard versions are
unchanged.

## Claims, dedupe, and slots

Identity uses the exact private anchor produced by the approved preflight. No
email or Instagram alias normalization occurs here. A claim is possible only
after the corresponding ordered manifest inspection has a durable eligible
result and all contextual bindings are fresh and exact.

The mission has three slots. Claim records persist `mission_slot` on the claim,
PENDING, terminal, and cancellation lineage.

- Slot 1 is the first valid claim.
- Slot N can be issued only if every earlier slot has an exact durable
  `CONFIRMED` terminal.
- Active claims, live owners, PENDING, temporary evidence, `UNKNOWN`, corrupt
  evidence, missing slots, or mismatched lineage block the next slot.
- A proven zero-network cancellation removes the active claim and reuses the
  same slot.
- Mission-wide exact-identity dedupe and the cap are evaluated while holding
  the global durable mutex.

An expired owner is not presumed dead. Reclaim is possible only for an
explicitly cancelled zero-effect claim or an owner process proven dead. A live
expired owner stays fail-closed.

## Zero-effect cancellation boundary

Cancellation is valid only before PENDING and only when the exact claim
capability, store, mission, operation, identity, thread, owner, manifest,
audio, ordinal, and slot bindings still match. The cancellation record states
zero upload, zero Send, and zero network effect.

The composite may cancel after preparation only when a valid host receipt
proves chooser-only, no preview, no upload, zero Send, and zero external effect.
A throw, invalid receipt, consumed claim, ambiguous durable state, or any
possible PENDING publication is not cancellable. Such a state remains
fail-closed and no-retry.

Cancellation publication and claim removal are separately durable. A single
exact linked cancellation-publication temporary is reconciled through atomic
quarantine only when its inode, bytes, schema, claim lineage, and final path all
match. Multiple or mismatched temporaries are retained. Claim removal likewise
quarantines and revalidates the exact claim against the durable cancellation;
it rechecks that no PENDING, terminal, or related temporary appeared before
deletion. If a durable exact cancellation is found before PENDING, the issuer
removes only the matching claim, consumes the old capability, and emits an
explicit zero-effect-cancellation fact so the composite may safely report the
slot reusable. Absence of that proof is never inferred as cancellation.

## PENDING boundary

Immediately before any upload-capable action, the issuer revalidates the claim,
authority, exact approved audio capability/path, freshness, lineage, and store.
It then publishes and rereads a v2 PENDING containing the exact claim lineage,
mission slot, owner, entered time, and a new random attempt nonce.

Only after durable PENDING does it mint:

- one private host-PENDING capability for the Safari host's independent read;
- one private terminal capability retained by the issuer/composite.

If an error occurs after PENDING publication, the issuer returns the recovered
terminal capability whenever the stable PENDING can be exactly rebound. The
composite uses it to publish durable `UNKNOWN`. No post-boundary error may be
reported as a cancellable zero-effect result.

## Terminal verifier and publication

The finalizer first safely locates and burns the terminal capability using own
data descriptors. For non-Proxy objects, the capability is burned before later
prototype, key, Symbol, accessor, binding, freshness, or replay validation.
An accessor is never invoked. Whole-envelope Proxy and revoked Proxy values are
rejected without traps and cannot locate or burn a hidden capability.

The finalizer dynamically imports the exact canonical Safari host module with
a literal module URL and requires the exact v2 host contract plus its narrow
terminal verifier. Live callers cannot select a module or verifier. Synthetic
fault injection exists only through enumerated `ForTest` hooks on a synthetic
terminal capability.

The host verifier derives all attempt and visual facts from private WeakMaps.
The caller supplies no outcome. Missing, stale, wrong, replayed, malformed,
mode-mismatched, or import/verifier evidence becomes `UNKNOWN`.

`CONFIRMED` requires:

- upload entered exactly true;
- exactly one Send actuation;
- attempt time not before PENDING;
- a same-attempt exact-thread `+1` outgoing audio bubble;
- an approved strong confirmation marker;
- confirmation at or after attempt and strictly under five minutes;
- finalization at or after all evidence times.

The terminal is published, fsynced, reread, and compared to the exact projected
bytes/digest before PENDING is atomically quarantined, reread, and deleted. Any
mismatch keeps the substituted or residual PENDING evidence and fails closed.
A valid terminal plus residual exact PENDING is cleanup-only for both
`CONFIRMED` and `UNKNOWN`; mismatched or temporary evidence is never deleted.

Dead-owner recovery may create only durable `UNKNOWN`. It validates the request
against both PENDING and any terminal before cleanup, and applies the same exact
terminal byte/digest check before unlinking PENDING.

## Reply observation ledger

Reply monitoring is a separate append-only ledger available only after an
exact `CONFIRMED` terminal. It does not authorize a Send, resend, reaction,
profile action, or unrelated DM read.

- The observation window ends exactly 72 hours after the confirmed observation
  time; equality is expired.
- Each thread is capped at 3 observations.
- The mission is capped at 9 observations.
- A claim is durably published before the thread read is allowed.
- Crash after publication consumes the ordinal. A single exact post-link
  temporary hard link is reconciled only when inode, bytes, schema, filename,
  and final path all match; the next ordinal may then proceed.
- Multiple, mismatched, orphaned, or malformed temporaries block fail-closed.

The private observation capability is one-use, bound to the exact terminal,
thread, identity, operation, attempt nonce, and mission slot. It must be
consumed before both the 72-hour deadline and its private strict five-minute
capability TTL. Live time is internal; synthetic time is accepted only in the
test-only store mode. Wrong binding burns the capability; replay is invalid.
Extra/class/Symbol/accessor envelopes and Proxy/revoked Proxy envelopes follow
the same safe extraction rules as the terminal finalizer.

## Receipts and privacy

Receipts contain only version strings, fixed decisions, fixed blocker codes,
booleans, bounded aggregate counts, and retry disposition. They never contain
paths, identities, targets, operation IDs, thread references, anchors, digests,
timestamps, PIDs, nonces, raw records, UI state, payloads, or provider data.
Claim retry dispositions distinguish an active reclaimable reservation, a
prior unconfirmed mission slot, a mission cap, a permanent/unknown claim, and
the absence of a current claim. Attempt receipts include a true cancellation
fact only after exact durable zero-effect cancellation proof.

## Verification matrix

The synthetic tests cover sequential slots, exact identity dedupe, cap
enforcement, cancellation/reuse, v1 fail-closed behavior, PENDING-before-upload,
post-link crashes, dynamic import/module/verifier failures, durable UNKNOWN,
confirmed terminal, backward clocks, exact five-minute equality, terminal plus
residual PENDING cleanup, dead-owner recovery, exact byte/digest verification,
observation 3/9/72h caps, crash ordinal reconciliation, wrong binding burn,
replay, expiry, and descriptor/Proxy adversarial envelopes. Tests use only
owner-only temporary stores and perform no browser or network action.
The matrix also covers claim/PENDING substitution during cleanup, exact and
ambiguous cancellation-temporary reconciliation, pre-PENDING cancellation
proof and slot reuse, mutex substitution before quarantine, and a legitimate
next mutex owner winning after normal release or dead-owner recovery.
