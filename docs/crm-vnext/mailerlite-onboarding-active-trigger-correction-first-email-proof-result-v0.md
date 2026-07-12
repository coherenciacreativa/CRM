# MailerLite Active-Trigger Correction And First-Email Proof Result v0

Date: 2026-07-11
Status: Mission Contract v2 complete; trigger-group effect verified; first-email delivery unverified

## Mission Contract 2026-07-11.v2 Final Closeout

Alejandro supplied the exact v2 approval and the lane completed the one
authorized end-to-end Proof Mode execution.

- exact automation reference: matched;
- automation state: active, complete, and not broken;
- exact active-trigger mapping: verified;
- first-email locator: verified privately;
- controlled Gmail baseline at global ordinal `4/8`: zero matches;
- controlled subscriber: found, active, and identity-verified;
- active trigger membership before: absent;
- mutation endpoint calls: exactly one;
- mutation class: add-only assignment to the exact active trigger group;
- mutation outcome: acknowledged and immediately verified;
- active trigger membership after: present;
- all prior groups: preserved;
- exact group transition: passed;
- post-correction verification: passed;
- v2 pre-effect attempt budget: `1/1` consumed;
- global mailbox evidence budget: `8/8` consumed;
- post-action Gmail evidence: zero new matches;
- first automatic email delivery: unverified;
- direct send, resend, or retrigger: none.

The acceptance criterion is met for the MailerLite effect: the exact controlled
subscriber was added once to the exact active trigger group and the complete
group reread verified the add-only transition. This does not claim that the
automatic email was sent or delivered.

After the bounded Gmail budget closed, Alejandro requested one additional
read-only MailerLite corroboration against the same subscriber. It verified
that MailerLite stores the exact approved private recipient and preserves its
single `+tag` Gmail shape. At the time of that bounded read, the subscriber's
sent counter remained zero and no `automation_email_sent` activity was
present. The corroboration made two bounded GET reads, followed no pagination,
performed zero mutations, and exposed no private values.

Private packet, bridge, lock, budget, and result artifacts remain owner-only.
The redacted receipts passed the private-pattern scan. Independent adversarial
review returned GREEN for closeout and one bounded central integration, with
the email-evidence gap explicitly preserved and no authority for any retry,
resend, retrigger, or additional Gmail check.

## Mission Contract v1 Executive Result

The approved `Mission Contract 2026-07-11.v1` stopped safely without reading
the controlled subscriber, assigning any group, or causing any email.

- exact automation reference: matched;
- automation state: active, complete, and not broken;
- exact active-trigger mapping: verified;
- first-email locator: verified privately;
- controlled mailbox baseline: not verified;
- subscriber lookup: not run;
- correction attempted: false;
- correction executed: false;
- mutation endpoint call count: 0;
- automatic email caused by this mission: 0;
- terminal effect lock: absent;
- redaction scan: passed.

The active-trigger correction and first-email proof therefore remain incomplete.

## Controlled Mailbox Clarification

The apparent connector-account mismatch was a false mismatch between:

- the exact controlled Gmail recipient carrying one `+tag`; and
- the already-connected authenticated base Gmail mailbox.

The guard now recognizes only that narrow relationship. It keeps the exact
`+tag` recipient in the Gmail query and uses only the corresponding base
`gmail.com` account for authenticated profile binding. It does not normalize
dots, accept `googlemail.com`, accept another domain, accept a tagged profile,
or accept empty or multiple tags.

This was reviewed as a refinement of the same third pre-effect route repair,
not a new person, source, recipient, mailbox, permission, or effect.

## Attempt Ledger

### Attempt 1

- stopped before mailbox or subscriber access;
- exact trigger mapping was not verified because a private group label had
  been supplied where the exact group identifier was required;
- mutation endpoint call count: 0.

### Attempt 2

- exact automation and trigger mapping passed;
- the available local Gmail route could not bind to the controlled mailbox;
- stopped before subscriber access or mutation;
- mutation endpoint call count: 0.

### Attempt 3

- exact automation and trigger mapping passed;
- the exact Gmail baseline search was claimed one-shot and executed through
  the connected mailbox boundary;
- local atomic publication of the connector result failed before a verified
  bridge response or ready marker existed;
- the one-shot rule prohibited repeating the search;
- the guard timed out and stopped before subscriber access or mutation;
- mutation endpoint call count: 0.

Postmortem root cause: the non-TTY publisher process received immediate stdin
EOF and exited before accepting the already-held connector result. The request
and durable consumed marker existed, but no response or ready marker was
published. The original result is no longer held and its freshness window has
expired, so neither republication nor a repeated search is permitted.

Final durable budget state:

- pre-effect live attempts: `3/3`;
- mailbox evidence checks: `3/8`;
- terminal effect lock: absent.

## Evidence And Privacy

Redacted attempt-03 receipts:

- `crm_core_active_trigger_correction_first_email_proof_attempt_03_2026-07-11.json`;
- `crm_core_active_trigger_correction_first_email_proof_attempt_03_2026-07-11.md`.

Private result artifacts and the approval/packet remain owner-only `0600`.
The redaction scan found no private lookup values in the redacted receipts.
No Gmail body, snippet, thread, raw message identifier, query, address, token,
header, or credential is recorded here.

## Independent Review

Independent adversarial review returned GREEN for the stop behavior and
privacy posture:

- subscriber lookup was never run;
- no assignment was attempted;
- no send, resend, or retrigger route was used;
- no fourth attempt is allowed under the current contract;
- the mission outcome is safe but incomplete.

## Required Next Decision

Stop under `Mission Contract 2026-07-11.v1`. Its attempt budget is exhausted.

Any future retry requires a newly versioned contract and fresh CEO approval
that explicitly:

1. binds the exact `+tag` recipient to the exact authenticated base Gmail
   mailbox using only the narrow rule already implemented;
2. authorizes exactly one additional pre-effect live attempt;
3. continues mailbox evidence accounting from `3/8`, preserving the global
   ceiling of eight;
4. preserves the same person, subscriber, group, automation, recipient,
   source, add-only effect, no-op rule, and forbidden scope;
5. requires a synthetic end-to-end publisher handshake before any new live
   mailbox search.

The minimum future publisher fix is to pre-arm an echo-disabled interactive
input session, verify that it is waiting, and only then create the one-shot
consumption marker and call the Gmail connector. A no-session test must prove
zero marker creation and zero connector calls.

Until that new contract is approved, no retry, assignment, resend, retrigger,
central claim of success, or active-onboarding claim is authorized.

## Offline V2 Preparation

The required offline remediation is now prepared on the MailerLite lane:

- a dedicated publisher requires a real interactive TTY and disables echo
  before reporting that it is waiting;
- no waiting session produces zero consumption marker and zero connector calls;
- consumption must be claimed before a connector call;
- raw message IDs are validated, hashed immediately, never persisted raw, and
  never printed;
- response is published before the ready commit marker, with an exact
  response-byte digest and owner-only `0600` permissions;
- EOF or failure after a durable marker preserves the one-shot stop rule;
- the synthetic publisher handshake is compatible end-to-end with the guard;
- v2 requires the exact v1 budget lineage at `3/3` and `3/8`, permits only one
  additional attempt, and limits future mailbox ordinals to `4..8`;
- v1 remains available for audit validation but is rejected for live use;
- the exact Gmail tagged-recipient/base-account relationship is now a mandatory
  v2 packet gate.

The proposed contract is:

`docs/crm-vnext/crm-core-controlled-welcome-flow-mission-contract-2026-07-11-v2.md`

This preparation used synthetic fixtures only. It did not read Gmail or
MailerLite live, did not create a private v2 execution packet, did not claim the
v2 attempt, and did not authorize itself. Live work still requires Alejandro's
exact v2 approval after independent review.
