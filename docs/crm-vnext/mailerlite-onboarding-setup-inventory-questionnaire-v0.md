# MailerLite Onboarding Setup Inventory Questionnaire v0

Date: 2026-06-29
Status: lane-local no-run questionnaire, reconciled with local MailerLite history

## Purpose

Give Alejandro a CEO-friendly, no-secret questionnaire for the MailerLite
onboarding setup inventory.

This questionnaire prepares the next setup decision only. It does not authorize
MailerLite API calls, MailerLite UI use, subscriber mutation, group assignment,
field creation, automation mutation, campaign send, Gmail access, Instagram
access, Meta Business Suite access, DMs, welcome audio, candidate queue
generation, CRM/source writes, private artifact inspection, Launch OS work, or
use of `/Users/alejandrogomez/CRM`.

## How To Answer

Use only:

- `yes`
- `no`
- `unknown`
- redacted/non-secret labels

Do not provide:

- API keys
- tokens
- headers
- cookies
- env values
- authorization codes
- credentials
- secrets
- subscriber IDs
- private subscriber content
- private dashboard screenshots
- emails, names, or phone numbers tied to real subscribers
- sensitive group or automation IDs

If an answer would require a private value, answer with `unknown` or a redacted
label.

## History Reconciliation - 2026-07-01

Alejandro does not need to answer this questionnaire from zero. CRM Core local
history already resolves several setup facts from prior MailerLite onboarding
work. Treat the facts below as prefilled unless a later read-only verification
shows drift.

### Prefilled From CRM Local History

- MailerLite is the intended email/onboarding system for Instagram/email
  handoff contacts: `yes`.
- The current MailerLite onboarding setup is production-sensitive: `yes`.
- A known production onboarding path exists: `Onboarding flow`.
- Active onboarding v1 should remain live and untouched while v2 is designed,
  drafted, seed-tested, and separately approved.
- The live v1 trigger group is `leads_instagram.csv`; do not rename, repurpose,
  or route new architecture assumptions through it.
- `Onboarding complete` is both the historical journey completion marker and
  the practical general newsletter audience marker.
- Historical labels such as `will get first email`,
  `Se le envió el primer boletín`, and `Received second email` are legacy
  journey/position markers, not clean reusable content receipts.
- Preferred migration posture is Option B-light: clone/build onboarding v2 and
  switch entry later, instead of casually patching active v1.
- The v2 trigger candidate is
  `CC · Journey · Editorial onboarding · Eligible`.
- The Instagram source assignment candidate is
  `CC · Source · IG onboarding`.
- Existing canonical supporting groups include
  `CC · Journey · Editorial onboarding · Eligible`,
  `CC · Audience · General newsletter · Eligible`, and
  `CC · Sent · Article · Sobre el amor`.
- Five canonical empty `CC · ...` groups were previously created after explicit
  approval. Their IDs must stay out of chat and redacted receipts; the groups
  must remain unused until a separate use/migration gate approves exact routing.
- The previous read-only onboarding v1 audit observed groups, automations,
  fields, segments, and forms in aggregate only; it did not print or read
  subscriber rows.
- The first onboarding email should be treated as welcome/orientation unless
  Brand later promotes it into a reusable content item through a separate
  content-id decision.
- CRM Core already has a no-write API design: no onboarding from story views
  alone, Instagram follows alone, or email engagement alone; email evidence,
  consent/context, identity confidence, and suppression safety are required.

### Still Unknown Or Drift-Prone

These are the only areas worth asking Alejandro or verifying later:

- whether current MailerLite setup still matches the May/June local history;
- whether current groups/automations/fields have drifted since the last scans;
- whether the v2 draft exists now;
- whether any of the remaining candidate v2 groups now exist;
- whether group membership triggers the intended onboarding automation today;
- whether re-adding an existing subscriber retriggers automation today;
- whether required custom fields already exist by the current labels;
- whether current subscriber suppression/status behavior blocks future
  onboarding as expected;
- whether Alejandro still wants group IDs, automation IDs, and private
  MailerLite references excluded from chat and redacted receipts.

### Reduced CEO Questions

If answering manually, Alejandro only needs to answer these reduced questions:

1. `[required]` Confirm that active v1 should stay live and untouched while v2
   is prepared.
   - Recommended answer: `yes`.
2. `[required]` Confirm that group IDs, automation IDs, subscriber IDs, and
   private MailerLite references should stay out of chat and redacted receipts.
   - Recommended answer: `yes`.
3. `[required]` Confirm whether CRM Core may later run a read-only no-secret
   API verification to refresh groups, automations, fields, segments, forms, and
   blockers.
   - Answer: `yes`, `no`, or `later`.
   - This does not authorize API execution by itself.
4. `[optional]` If there is a newer business decision that replaces Option
   B-light, provide a safe non-secret label for that decision.
   - Otherwise answer: `no_change`.

### Read-Only API Verification Boundary

The local program does have MailerLite credential plumbing, but API use should
still be a separate exact approval because it touches a live source. A future
safe approval phrase should be:

```text
I approve CRM Core MailerLite onboarding lane to run one read-only no-secret MailerLite setup verification using existing internal credentials only. Do not print, inspect, rotate, or expose credentials; do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings; do not print subscriber rows, emails, names, subscriber IDs, group IDs, automation IDs, headers, tokens, cookies, env values, private subscriber content, or raw payloads. Return only aggregate/redacted setup facts for onboarding groups, automations, fields, segments, forms, blockers, and next safe step.
```

Until Alejandro gives that exact future approval, the sections below remain a
complete fallback questionnaire but should not be treated as all-new manual
work.

## 1. MailerLite Account / Setup Assumptions

1. `[required]` Is MailerLite still the intended onboarding email system for
   Instagram/email handoff contacts?
   - Answer: `yes`, `no`, or `unknown`.

2. `[required]` Should CRM Core treat the current MailerLite onboarding setup as
   production-sensitive?
   - Answer: `yes`, `no`, or `unknown`.

3. `[required]` Is there a known MailerLite onboarding path that should receive
   future approved email handoff contacts?
   - Answer: `yes`, `no`, or `unknown`.

4. `[optional]` Provide a redacted/non-secret label for the intended onboarding
   path, if one is safe to share.
   - Do not provide private dashboard screenshots or IDs you consider
     sensitive.

5. `[later]` Should CRM Core design a no-write MailerLite API healthcheck after
   this inventory is reviewed?
   - Answer: `yes`, `no`, or `unknown`.
   - This does not authorize any API call.

## 2. Groups / Tags / Segments

1. `[required]` Does an existing onboarding group, tag, or equivalent audience
   marker exist?
   - Answer: `yes`, `no`, or `unknown`.

2. `[required]` If it exists, can you provide a redacted/non-secret group or tag
   label?
   - Do not provide group IDs if you consider them sensitive.

3. `[required]` Should CRM Core treat group IDs as sensitive and keep them out
   of chat and redacted receipts?
   - Answer: `yes`, `no`, or `unknown`.

4. `[required]` Does adding a subscriber to the onboarding group/tag trigger
   the onboarding automation?
   - Answer: `yes`, `no`, or `unknown`.

5. `[required]` Does re-adding an existing subscriber to that group/tag
   retrigger the automation?
   - Answer: `yes`, `no`, or `unknown`.

6. `[required]` Are there statuses or suppression categories that should block
   onboarding?
   - Answer: `yes`, `no`, or `unknown`.
   - If yes, provide only redacted category labels such as `unsubscribed`,
     `bounced`, `complained`, or `suppressed`.

7. `[optional]` Are there tags or segments that should be checked before any
   future onboarding packet?
   - Answer with redacted labels only, or `unknown`.

8. `[later]` Should CRM Core prepare a separate setup decision packet if the
   group/tag structure is missing or unclear?
   - Answer: `yes`, `no`, or `unknown`.

## 3. Custom Fields

For each field, answer whether it already exists: `yes`, `no`, or `unknown`.
Do not create fields and do not provide private subscriber values.

1. `[required]` `email`
2. `[optional]` `name`
3. `[optional]` `last_name`
4. `[optional]` `country`
5. `[optional]` `city`
6. `[optional]` `phone`
7. `[required]` Instagram handle or Instagram private label field
8. `[required]` `source_channel`
9. `[required]` `source_context`
10. `[optional]` `onboarding_started_at`
11. `[required]` CRM Core private anchor label field
12. `[required]` `consent_or_context`
13. `[optional]` `language`
14. `[optional]` `timezone`
15. `[optional]` tags or custom fields that should be used instead

Additional field questions:

16. `[required]` Should CRM Core block future payload preparation if required
    fields do not already exist?
    - Answer: `yes`, `no`, or `unknown`.

17. `[later]` If a required field is missing, should CRM Core prepare a field
    creation approval packet later?
    - Answer: `yes`, `no`, or `unknown`.
    - This does not authorize field creation.

## 4. Automation Assumptions

1. `[required]` Does an onboarding automation exist?
   - Answer: `yes`, `no`, or `unknown`.

2. `[required]` If it exists, can you provide a redacted/non-secret automation
   label?
   - Do not provide automation IDs if you consider them sensitive.

3. `[required]` Is the automation active?
   - Answer: `yes`, `no`, or `unknown`.

4. `[required]` Is the automation triggered by group/tag membership?
   - Answer: `yes`, `no`, or `unknown`.

5. `[required]` Are entry restrictions known?
   - Answer: `yes`, `no`, or `unknown`.

6. `[required]` Are suppression/status rules known?
   - Answer: `yes`, `no`, or `unknown`.

7. `[required]` Should future mutation be blocked if automation trigger
   behavior is unknown?
   - Recommended answer: `yes`.

8. `[later]` Should CRM Core prepare a no-write automation behavior check later
   if the trigger/retrigger behavior is unknown?
   - Answer: `yes`, `no`, or `unknown`.
   - This does not authorize API or UI access.

## 5. Onboarding Policy

1. `[required]` Should CRM Core block onboarding if email evidence source is
   ambiguous?
   - Recommended answer: `yes`.

2. `[required]` Should CRM Core block onboarding if consent/context is unclear?
   - Recommended answer: `yes`.

3. `[required]` Should CRM Core block onboarding if identity confidence is below
   `likely`?
   - Recommended answer: `yes`.

4. `[required]` Should CRM Core block onboarding if the person is already in the
   onboarding group and retrigger behavior is unknown?
   - Recommended answer: `yes`.

5. `[required]` Should CRM Core ever onboard from story views alone?
   - Recommended answer: `no`.

6. `[required]` Should CRM Core ever onboard from Instagram follow alone?
   - Recommended answer: `no`.

7. `[required]` Should CRM Core ever onboard from email engagement alone?
   - Recommended answer: `no`.

8. `[optional]` Are there special cases where Alejandro wants manual review
   before MailerLite onboarding even when email evidence exists?
   - Answer with a redacted category label or `unknown`.

## 6. Idempotency

1. `[required]` Should every future onboarding packet require a final
   idempotency check immediately before execution?
   - Recommended answer: `yes`.

2. `[required]` Should every future packet require a redacted preview before
   any MailerLite mutation approval?
   - Recommended answer: `yes`.

3. `[required]` Should any future mutation approval be one-packet-only rather
   than standing authorization?
   - Recommended answer: `yes`.

4. `[required]` Should CRM Core block if already-onboarded status is unknown?
   - Recommended answer: `yes`.

5. `[required]` Should CRM Core block if subscriber status is unsubscribed,
   bounced, complained, junk, suppressed, or unknown?
   - Recommended answer: `yes`, unless Alejandro later gives a separate
     explicit override.

6. `[later]` Should CRM Core maintain a private onboarding idempotency artifact
   outside the repo in a later approved step?
   - Answer: `yes`, `no`, or `unknown`.
   - This does not authorize creating that artifact.

## 7. Redacted Receipts

1. `[required]` Should setup inventory receipts include aggregate status only?
   - Recommended answer: `yes`.

2. `[required]` Should receipts exclude emails, names, phone numbers, subscriber
   IDs, private subscriber content, private artifact contents, sensitive group
   IDs, and sensitive automation IDs?
   - Required answer: `yes`.

3. `[required]` Should receipts include these aggregate fields?
   - `inventoryStatus`
   - `groupLabelStatus`
   - `automationLabelStatus`
   - `groupTriggerStatus`
   - `automationActiveStatus`
   - `fieldMappingStatusCounts`
   - `suppressionRulesStatus`
   - `blockingStatuses`
   - `preferredFutureOperation`
   - `idempotencyRequired`
   - `packetPreviewRequired`
   - `onePacketOnlyApprovalRequired`
   - `blockers`
   - `recommendedNextStep`

4. `[optional]` Are there other aggregate-only receipt fields Alejandro wants?
   - Provide labels only, no private content.

## 8. Future Approval Boundary

1. `[required]` Confirm that setup inventory collection does not authorize
   MailerLite API calls, MailerLite UI use, subscriber mutation, group
   assignment, field creation, automation mutation, campaign send, CRM writes,
   or source mutation.
   - Required answer: `yes`.

2. `[required]` Confirm that no future MailerLite mutation can occur without
   this exact packet-specific approval language:

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

3. `[required]` Preferred future operation, if all setup facts are sufficient:
   - `subscriber_upsert`
   - `subscriber_add_to_group`
   - `subscriber_upsert_then_add_to_group`
   - `unknown`

4. `[later]` If setup facts are insufficient, should CRM Core prepare
   `crm_core_mailerlite_onboarding_setup_decision_packet_v0`?
   - Answer: `yes`, `no`, or `unknown`.

5. `[later]` If setup facts are sufficient, should CRM Core prepare
   `crm_core_mailerlite_onboarding_no_write_payload_packet_awaiting_approval_v0`
   after approved private email-handoff evidence exists?
   - Answer: `yes`, `no`, or `unknown`.

## Closeout Rules

The next setup inventory collection may summarize only:

- counts of answered questions;
- counts of unknowns;
- redacted labels;
- blockers;
- recommended next step.

It must not include secrets, credential metadata, private subscriber content,
private artifact content, raw subscriber lists, MailerLite dashboard
screenshots, or private identities.

## Proposed Integration Note

The MailerLite onboarding lane now has a CEO-friendly no-secret setup inventory
questionnaire based on the setup inventory packet. No central file change is
required. Integration may later record that the questionnaire exists and that
inventory collection remains unexecuted until Alejandro provides the exact
no-secret setup inventory collection approval.
