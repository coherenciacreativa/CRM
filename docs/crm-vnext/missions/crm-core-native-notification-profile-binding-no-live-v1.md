# CRM Core Native Notification-to-Profile Binding No-Live Mission v1

Date: 2026-07-18

```yaml
mission_id: crm_core_native_notification_profile_binding_no_live_v1_20260718
contract_version: v1_20260718_repo_only_no_live
status: implemented_repo_only_no_live_independent_review_green_ready_for_lane_commit
approved_baseline: 1093364cb17bd55879cc2e97fa68a16a7fc90d81
source_branch: codex/crm-core-native-notification-profile-binding-v1-20260718
business_outcome: >-
  Replace the caller-supplied notification-to-profile exactness boolean with a
  deterministic activate-then-confirm native-link proof that can be consumed
  exactly once by the existing owner-only follower-source artifact materializer.
observable_success:
  - notification_state_read_by_caller_only=true
  - selected_row_ordinal_cap=8
  - follower_row_semantics_required=true
  - one_indexed_native_instagram_profile_link_required=true
  - exact_identity_prebound_from_unique_native_link_label=true
  - flattened_link_url_or_value_metadata_never_used_as_identity=true
  - prebound_identity_confirmed_after_unique_native_link_activation=true
  - typed_identity_or_constructed_url_allowed=false
  - exact_same_surface_profile_confirmation_required=true
  - exact_profile_address_and_visible_identity_match_required=true
  - activation_and_binding_capabilities_one_use=true
  - legacy_boolean_only_materialization_blocked=true
  - legacy_v1_artifact_reuse_as_native_provenance_blocked=true
  - receipts_aggregate_allowlist_only=true
  - browser_used=false
  - network_used=false
  - external_effect_invoked=false
mode: repo_only_hardening
approved_effects:
  repo_reads:
    - CRM Core source tests and admitted documentation
  repo_or_source_writes:
    - scripts/crm-vnext-instagram-welcome-audio-native-notification-profile-binder.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-native-notification-profile-binder.spec.ts
    - scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.spec.ts
    - docs/crm-vnext/missions/crm-core-native-notification-profile-binding-no-live-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/workstreams/welcome-audio-send-boundary.md
  sends: []
  UI_actions: []
forbidden_scope:
  - Safari Instagram Computer Use OCR screenshots or accessibility reads
  - private identities URLs messages artifacts payloads or audio contents
  - runtime authority claim PENDING upload attachment Send or retry
  - text follow-back MailerLite CRM campaign Ads proxy API or network
  - any file outside the exact seven-file allowlist
architecture_boundary:
  - add one pure sibling binder; do not widen the zero-action PRECLAIM observer
  - the binder plans one indexed native activation but never performs it
  - preparation binds one exact handle-shaped native link label and never parses flattened URL or Value metadata
  - confirmation requires that same byte-exact identity in the canonical loaded profile address and positive profile header
  - the materializer consumes only the confirmed opaque binding capability
  - the complete source observation still requires separate thread owner relationship and dedupe proof
  - version the materializer artifact root and schema so legacy v1 bytes cannot be reused as native provenance
freshness_and_atomicity:
  - preparation and confirmation must be ordered and no more than five minutes apart
  - failed or ambiguous confirmation consumes the activation capability and permits no retry
  - confirmed binding capability can be consumed by the materializer exactly once
  - identity matching is byte-exact and Unicode or case normalization is forbidden
ambiguity_policy:
  - zero or multiple matching row links block
  - non-profile reserved query fragment or multi-segment loaded addresses block
  - flattened link URL or Value metadata cannot override the exact native link label
  - duplicate element indices or duplicate selected-row evidence block
  - address-only identity profile mismatch challenge login or surface drift block
review_and_integration:
  - focused and full welcome-audio compatibility tests must be green
  - import inertness hostile-input receipt-redaction and no-live tests must be green
  - independent adversarial review must have no unresolved P0-P2 findings
  - source lane commit and push must be clean
  - formal Chief Architect integration verdict must be green_to_self_integrate
  - safe_to_self_integrate_now=true and ceo_decision_needed=false are required
  - one serialized Central Integration Lock run only after all gates are green
current_validation:
  - focused_four_suite_289_of_289_green=true
  - full_seventeen_suite_824_of_824_green=true
  - syntax_and_diff_checks_green=true
  - dual_independent_review_green_no_unresolved_p0_p1_p2=true
  - live_or_external_effect_invoked=false
later_gate: >-
  Stop after central repo-only integration. A new one-recipient live canary must
  be bound to the exact integrated commit and retains its separate live-effect
  authorization, one-click, one-Send, visible-confirmation and no-retry rules.
```

This mission codifies the native link path that was first proven operationally
without an effect. It does not itself read Instagram, click the planned link,
open a profile, create a private artifact, or authorize an audio send.
