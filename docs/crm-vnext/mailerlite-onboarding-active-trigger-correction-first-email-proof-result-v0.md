# MailerLite Active-Trigger Correction And First-Email Proof Result v0

Date: 2026-07-11
Status: blocked pre-effect; Mission Contract attempt budget exhausted

## Executive Result

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
