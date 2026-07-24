# CRM Core Welcome Audio Notification Relationship Precedence — No-Live v1

Date: 2026-07-24
Status: assigned repo-only reconciliation; no source or live authority

## Mission

```text
mission_id:
crm_core_welcome_audio_notification_relationship_precedence_contract_reconciliation_no_live_v1_20260724

mode:
proof_contract_reconciliation

policy:
temporary_historical_catchup_1_to_30_days
```

## Business Outcome

Make the already-integrated notification relationship rule unambiguous for
fresh starts, resumptions, compactions, and lower-effort operators. A worker
must not discard an exactly bound recent-follower notification merely because
Instagram desktop omits the current follows-owner badge or the direct Message
action.

This mission reconciles central documentation and hydration only. It creates no
source observation, candidate, thread opening, authority, claim, `PRECLAIM`,
`PENDING`, upload, Send, downstream write, or production-readiness claim.

## Verified Incident

The manual/UI source route correctly used ordered native Notifications rows
carrying the exact visible started-following event and activated the exact
profile link from each row. The later profile eligibility decision applied only
the stronger current-visible relationship mode. It treated the absent badge as
fatal and stopped before inspecting the already-documented `Options -> Send
message` fallback.

That decision contradicted the integrated dual-relationship evidence rule. The
affected owner-only ordinal dispositions are not canonical ineligibility
results. They remain:

```text
evaluation_incomplete_due_to_obsolete_badge_only_gate
```

This repo-only mission does not reopen the source or rewrite the underlying
private observations.

## Authoritative Precedence

Hydrate and apply these contracts in this order:

1. native notification-to-profile binding;
2. UI-attested follower-source evidence;
3. dual relationship-evidence modes;
4. Safari profile-to-thread and effect adapter;
5. live admission and claim/host ordering.

The relationship contracts determine whether one exact profile has an approved
relationship-evidence mode. The Safari adapter may inspect messageability only
after that decision. It cannot narrow relationship eligibility back to the
stronger current-visible mode.

## Relationship Modes

Mode A remains the stronger proof:

```text
follows_owner=confirmed
follows_owner_evidence=explicit_visible_follows_owner_signal
```

Mode B is allowed only inside an explicitly approved bounded Proof:

```text
follows_owner=recent_follow_event_no_explicit_contradiction
follows_owner_evidence=exact_started_following_notification_profile_binding
```

Mode B requires all of:

- one exact visible started-following notification;
- the complete visible relative-time label preserved byte-for-byte;
- exact notification-to-profile identity;
- exact owner binding;
- no visible explicit negative relationship evidence;
- fresh private dedupe; and
- the remaining thread checks required by the later approved mission.

Badge absence and absence of the direct Message action are not explicit
relationship contradictions. Mode B does not prove current follower-list
membership, campaign causality, permission to send, or an exact timestamp.

## Temporary Catch-Up Grammar

The temporary Proof policy accepts one complete label only. It performs no
trim, case folding, Unicode normalization, inferred conversion, or substring
match.

Day forms use integer `N=1..30`:

```text
Nd
N d
1 day
N days
1 día
N días
hace 1 día
hace N días
```

Plural forms require `N=2..30`.

Coarse-week forms use integer `W=1..4`:

```text
Ww
W w
W sem
1 week
W weeks
1 semana
W semanas
hace 1 semana
hace W semanas
```

Plural forms require `W=2..4`. Every accepted week form preserves:

```text
precision=coarse_week
```

It never yields an exact day count. Reject zero; 31 or more days; 5 or more
weeks; unaccented `dia` or `dias`; decimals; signs; inequalities; ranges; mixed
units; dates; months; `about`; `last week`; generic `weeks ago`; truncation;
prefixes; suffixes; unenumerated whitespace; missing labels; and every other
form.

## Bound Message Fallback

For an exact profile admitted under Mode A or Mode B:

```text
visible exact Message
  OR, only when Message is absent,
Options -> exactly one unambiguous enabled Send message action
```

The Options inspection occurs at most once. Missing, duplicated, disabled,
differently labelled, or ambiguous output blocks without substitution. The
fallback proves only bounded profile-to-thread messageability. It does not
prove current follower membership and permits no follow, relationship change,
profile browsing, text, picker, attachment, upload, audio, or Send.

## One-Candidate Stop Boundary

```text
one_candidate_maximum
```

The temporary policy is consumed at the first of:

- `candidate_handoff_ready` for one exact candidate;
- exhaustion of the same approved ordered cohort with no eligible candidate;
- identity, privacy, relationship, unread, thread, dedupe, or source
  ambiguity; or
- mission closeout.

It cannot be reused for a second candidate and does not create Send admission.
A later effect mission must independently revalidate freshness, identity,
thread, dedupe, asset, claim, `PENDING`, UI state, and its own exact authority.

## Truthful Non-Claims

Every Mode B receipt keeps:

```text
follows_owner_confirmed=false
current_follower_list_membership_claimed=false
exact_follow_timestamp_claimed=false
actual_elapsed_age_claimed=false
provider_event_id_claimed=false
campaign_membership_claimed=false
source_capability_created=false
claim_created=false
preclaim_created=false
pending_created=false
send_authority=false
production_ready=false
```

## Exact Tracked-File Allowlist

1. `docs/crm-vnext/crm-core-codex-profile.md`
2. `docs/crm-vnext/instagram-welcome-audio-safari-action-adapter-v1.md`
3. `__tests__/crm-vnext-welcome-audio-operator-hydration.spec.ts`
4. `docs/crm-vnext/missions/crm-core-welcome-audio-notification-relationship-precedence-no-live-v1.md`

Do not modify productive scripts, schemas, validators, completed historical
mission text, authority code, browser selection, source families, capability
families, emitters, bridges, runtimes, or backends.

## Validation

- the hydration read order places both relationship contracts before the Safari
  adapter;
- both relationship modes remain explicit;
- badge absence remains a non-contradiction under exact Mode B;
- the Options fallback is available under either approved mode;
- the complete 1-to-30-day and 1-to-4-week grammar is present;
- one-candidate and non-claim boundaries are explicit;
- no production or Send authority is created; and
- focused static tests and independent review are green before integration.

## Later Boundary

After green central integration, a separately approved read-only mission may
reevaluate only the incomplete ordinal dispositions in original order. That
later mission must use one all-at-once CEO approval and may not infer source,
thread, unread, dedupe, or relationship evidence from this document.

```text
source_actions=0
browser_actions=0
external_effects=0
send_authority=false
production_ready=false
```
