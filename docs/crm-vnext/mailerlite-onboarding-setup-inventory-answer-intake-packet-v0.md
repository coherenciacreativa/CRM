# MailerLite Onboarding Setup Inventory Answer Intake Packet v0

Date: 2026-07-03
Status: lane-local no-run design

## Purpose

Define how Alejandro may later provide no-secret MailerLite onboarding setup
answers without exposing credentials, private subscriber content, dashboard
exports, source data, or live-system state.

This packet is an intake design only. It does not collect setup answers, call
the MailerLite API, use the MailerLite UI, prepare MailerLite payloads, mutate
subscribers, assign groups, create fields, edit automations, send campaigns,
generate candidate queues, send welcome audio, inspect private artifacts, write
CRM/source state, touch Launch OS docs, or use `/Users/alejandrogomez/CRM`.

## Relationship To Existing MailerLite Onboarding Artifacts

Existing lane artifacts:

- `docs/crm-vnext/mailerlite-onboarding-api-no-write-design-v0.md`
- `docs/crm-vnext/mailerlite-onboarding-setup-inventory-packet-v0.md`
- `docs/crm-vnext/mailerlite-onboarding-setup-inventory-questionnaire-v0.md`

This packet sits between the questionnaire and any future setup inventory
summary. It defines the answer boundary and validation model before Alejandro
provides answers. It does not replace the questionnaire and does not authorize
the optional future read-only setup verification.

## Current Known Facts

- The setup inventory packet and CEO-friendly questionnaire already exist.
- The questionnaire has been reconciled with local MailerLite onboarding
  history so Alejandro does not need to answer already-known facts from zero.
- Active onboarding v1 remains protected and should stay live and untouched
  while v2 is designed, drafted, seed-tested, and separately approved.
- Future onboarding requires email evidence, consent/context, identity
  confidence, and suppression/safety checks.
- Setup inventory collection remains unexecuted.
- Read-only API verification remains unexecuted and requires exact future
  approval.
- MailerLite mutation remains unapproved.

## Unknowns And Blockers

Open setup facts may include:

- whether current groups, automations, fields, segments, and forms have drifted
  since prior local history;
- whether required custom fields currently exist by approved labels;
- whether group membership triggers the intended onboarding automation today;
- whether re-adding an existing subscriber retriggers automation;
- whether current suppression/status behavior blocks future onboarding as
  expected;
- whether Alejandro wants all group IDs, automation IDs, subscriber IDs, and
  private MailerLite references excluded from chat and redacted receipts.

Blockers:

- do not collect private subscriber content;
- do not accept secrets or credential material;
- do not accept raw subscriber rows, dashboard exports, screenshots, IDs, or
  raw payloads;
- do not prepare payloads from real private evidence in this task;
- do not run read-only API verification without its exact future approval.

## Allowed Answer Types

Future setup answers may use only:

- `yes`
- `no`
- `unknown`
- `[LATER]`
- redacted/non-secret labels
- aggregate counts, if already known without opening private systems
- safe policy choices such as `block`, `allow_after_review`, or
  `requires_future_approval`

Examples of safe labels:

- `[GROUP_NAME_ONLY]`
- `[FIELD_NAME_ONLY]`
- `[AUTOMATION_LABEL_ONLY]`
- `[SAFE_TEXT_ONLY]`
- `[YES/NO/UNKNOWN]`

If a fact would require opening MailerLite, inspecting subscriber data, copying
dashboard content, reading credentials, or sharing private source content,
Alejandro should answer `unknown` or `[LATER]`.

## Forbidden Answer Types

Future setup answers must not include:

- API keys;
- tokens;
- headers;
- cookies;
- env values;
- authorization codes;
- credentials;
- secrets;
- credential metadata;
- subscriber IDs;
- group IDs Alejandro considers sensitive;
- automation IDs Alejandro considers sensitive;
- raw payloads;
- raw subscriber rows or lists;
- private dashboard screenshots;
- private subscriber content;
- real subscriber emails;
- real subscriber names;
- real phone numbers;
- Instagram handles tied to real people;
- message bodies;
- purchase details;
- CRM lead records;
- private artifact contents.

If Alejandro accidentally includes forbidden material, the intake must stop and
the material must not be copied into tracked docs, Mantis-Reports, or chat.

## CEO-Safe Answer Format

Use this format later when Alejandro explicitly approves setup inventory
collection:

```text
MailerLite onboarding setup inventory answers

1. Active v1 stays live and untouched while v2 is prepared:
Answer: [YES/NO/UNKNOWN]

2. Group IDs, automation IDs, subscriber IDs, and private MailerLite references
stay out of chat and redacted receipts:
Answer: [YES/NO/UNKNOWN]

3. Current onboarding group or safe redacted group label:
Answer: [GROUP_NAME_ONLY] or [UNKNOWN] or [LATER]

4. Current onboarding automation or safe redacted automation label:
Answer: [AUTOMATION_LABEL_ONLY] or [UNKNOWN] or [LATER]

5. Group membership trigger behavior:
Answer: [YES/NO/UNKNOWN]

6. Re-add/retrigger behavior:
Answer: [YES/NO/UNKNOWN]

7. Required field labels believed to exist:
Answer: [FIELD_NAME_ONLY list] or [UNKNOWN] or [LATER]

8. Suppression/status blockers:
Answer: [SAFE_TEXT_ONLY labels] or [UNKNOWN] or [LATER]

9. Preferred next route:
Answer: [manual_no_secret_summary_only] | [future_readonly_api_verification_after_exact_approval] | [hold]
```

The answer format must stay policy/label-only. It must not include private
subscriber examples, private identities, dashboard screenshots, exports, IDs, or
source content.

## Validation Rules

Before accepting future answers into a redacted setup inventory summary:

1. Confirm every answer is `yes`, `no`, `unknown`, `[LATER]`, a redacted label,
   or an aggregate-only policy choice.
2. Confirm no secrets, credentials, IDs, raw payloads, screenshots, private
   subscriber content, or source data are present.
3. Confirm any unknown setup fact remains a blocker for mutation.
4. Confirm no answer is treated as MailerLite API/UI approval.
5. Confirm no answer is treated as MailerLite mutation approval.
6. Confirm no answer is treated as CRM/source write approval.
7. Confirm active v1 remains protected unless a separate future packet says
   otherwise.

If validation fails, the inventory summary must not be produced until Alejandro
provides a safe corrected answer set.

## Decision Rules

- If setup facts are sufficient and safe, the next lane step may be a no-write
  setup inventory summary.
- If setup facts remain unknown, the next lane step may be a future read-only
  no-secret setup verification plan or approval packet.
- If group-trigger behavior is unknown, future mutation remains blocked.
- If re-add/retrigger behavior is unknown, future mutation remains blocked for
  existing subscribers.
- If required fields are missing or unknown, no real payload should be prepared.
- If suppression/status rules are unknown, future mutation remains blocked.
- If any private identity or subscriber data appears, stop and redact/escalate.

No decision rule authorizes MailerLite API access, MailerLite UI use, group
assignment, field creation, automation mutation, campaign send, CRM/source
writes, candidate queue generation, welcome audio, or source mutation.

## Redacted Receipt Behavior

Future answer-intake receipts may include:

- `answerIntakeStatus`
- `answeredRequiredCount`
- `unknownRequiredCount`
- `laterRequiredCount`
- `redactedLabelCount`
- `forbiddenMaterialDetected`
- `blockedByUnknownSetupFacts`
- `blockedByForbiddenMaterial`
- `setupSummaryEligible`
- `recommendedNextStep`
- `closedGates`

Receipts must live outside the repo under:

```text
/Users/alejandrogomez/Documents/Mantis-Reports/
```

Receipts must not include raw answers if those answers contain private values.
They must never include secrets, credentials, IDs, raw payloads, private
subscriber content, dashboard screenshots, private artifact contents, or source
data.

## Future Approval Phrases

### Setup Inventory Collection

```text
I approve CRM Core to collect a no-secret MailerLite onboarding setup inventory. I will provide only non-secret group labels, field labels, automation labels, and yes/no/unknown setup facts; do not ask for or record API keys, tokens, subscriber IDs, group IDs I consider sensitive, private dashboard screenshots, credentials, headers, cookies, env values, authorization codes, secrets, or private subscriber content.
```

### Future Read-Only API Verification

```text
I approve CRM Core MailerLite onboarding lane to run one read-only no-secret MailerLite setup verification using existing internal credentials only. Do not print, inspect, rotate, or expose credentials; do not mutate subscribers, groups, fields, automations, campaigns, segments, forms, webhooks, or account settings; do not print subscriber rows, emails, names, subscriber IDs, group IDs, automation IDs, headers, tokens, cookies, env values, private subscriber content, or raw payloads. Return only aggregate/redacted setup facts for onboarding groups, automations, fields, segments, forms, blockers, and next safe step.
```

### Future MailerLite Mutation

```text
I approve CRM Core to execute the approved MailerLite onboarding mutation for the explicitly approved private onboarding packet only. Use the approved field mapping and onboarding group, perform final idempotency and suppression checks immediately before mutation, do not modify automations or campaigns, do not print private identities, and write only redacted aggregate receipts.
```

This packet grants none of these approvals.

## Stop Conditions

Stop future answer intake on:

- API key, token, cookie, header, env value, authorization code, credential, or
  secret exposure;
- raw subscriber row/list exposure;
- real subscriber email/name/phone exposure;
- private dashboard screenshot or export exposure;
- private subscriber content exposure;
- subscriber ID, sensitive group ID, or sensitive automation ID exposure;
- request to open MailerLite UI;
- request to call MailerLite API without exact approval;
- request to prepare real MailerLite payloads;
- request to mutate subscribers, groups, fields, automations, campaigns,
  segments, forms, webhooks, or account settings;
- request to generate a candidate queue;
- request to send welcome audio;
- request to write CRM/source state;
- request to touch Launch OS docs or `/Users/alejandrogomez/CRM`.

## Closed Gates

- no MailerLite API calls;
- no MailerLite UI;
- no Gmail;
- no Instagram;
- no Meta Business Suite;
- no subscriber mutation;
- no group assignment;
- no field creation;
- no automation mutation;
- no campaign send;
- no private artifact inspection;
- no candidate queue generation;
- no welcome audio;
- no CRM/source writes;
- no source mutation;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.

## Proposed Integration Note

No central file change is required for this lane artifact. Integration may later
record that the MailerLite onboarding lane now has a no-run answer-intake packet
that defines safe answer types, forbidden content, validation, redacted receipt
behavior, stop conditions, and future approval phrases before setup inventory
collection.

## Next Safe Step

If Alejandro wants to continue manually, ask for the exact setup inventory
collection approval phrase and then collect only no-secret answers using the
CEO-safe answer format.

If Alejandro wants Codex to save more manual work, ask for the exact future
read-only API verification approval phrase. Do not run API verification from
this packet.

## Completion Boundary

Complete when CRM Core has a lane-local no-run answer-intake packet that defines
how Alejandro may later provide safe MailerLite setup answers, what content is
forbidden, how answers are validated, how redacted receipts behave, which gates
remain closed, and what exact future approvals are required before collection,
verification, payload preparation, or mutation.
