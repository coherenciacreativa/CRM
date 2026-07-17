# CRM Core Safari Real AX Compatibility No-Live Mission v1

Date: 2026-07-17

```yaml
mission_id: crm_core_safari_real_ax_ui_attested_compat_no_live_v1_20260717
contract_version: v1_20260717_repo_only_no_live
implementation_status: implemented_repo_only_no_live_independent_review_green
business_outcome: >-
  Remove the parser-only mismatch between the integrated UI-attested welcome
  rail and the real flat Computer Use Safari serialization without weakening
  the legacy strict route or crossing a live boundary.
observable_success:
  - sealed_manifest_strict_hierarchy_parser_unchanged=true
  - ui_attested_flat_tree_parser_family_only=true
  - native_tab_isPinned_isActive_metadata_required=true
  - page_level_instagram_tabs_ignored=true
  - active_unpinned_source_plus_inactive_neutral_regular_tabs_only=true
  - shared_pinned_tabs_inactive_only=true
  - exact_browser_address_field_thread_binding_required=true
  - ordered_authenticated_navigation_owner_binding_required=true
  - unique_target_header_cluster_required=true
  - exact_target_instagram_text_and_profile_value_required=true
  - indexed_structured_empty_settable_entry_area_required=true
  - unique_post_composer_add_photo_or_video_control_required=true
  - preview_and_send_post_composer_only=true
  - outgoing_audio_post_header_pre_composer_only=true
  - generic_non_audio_history_allowed=true
  - ambiguous_audio_or_voice_blocks=true
  - historical_status_never_promoted_to_marker=true
  - fresh_post_send_same_binding_plus_one_delta_required=true
  - browser_used=false
  - network_used=false
  - external_effect_invoked=false
mode: hardening
approved_effects:
  repo_reads:
    - exact CRM Core host tests and admitted documentation
  repo_or_source_writes:
    - scripts/crm-vnext-instagram-welcome-audio-safari-live-host.mjs
    - __tests__/crm-vnext-instagram-welcome-audio-safari-live-host.spec.ts
    - docs/crm-vnext/instagram-welcome-audio-safari-live-host-v1.md
    - docs/crm-vnext/instagram-welcome-audio-ui-attested-single-recipient-live-admission-v1.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/missions/crm-core-safari-real-ax-compat-no-live-v1.md
  sends: []
  UI_actions: []
forbidden_scope:
  - real Safari Computer Use Instagram OCR screenshots or accessibility reads
  - private identities references artifacts messages or audio contents
  - fixed live roots authority claim PENDING upload attachment Send or retry
  - text follow-back MailerLite CRM campaign Ads proxy or network
  - any file outside the exact six-file allowlist
source_private_boundaries:
  authoritative_repo: CRM Core isolated worktree
  target_branch: codex/safari-real-ax-compat
  expected_base_commit: f6c76b7f0ac1f61dc5d65c1e3bf44d43f734574a
  approved_live_sources: []
  approved_private_input_labels: []
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - raw_target_urls
atomicity_freshness_requirements:
  - each UI action still requires a fresh state
  - same private binding must survive chooser preview Send and confirmation
  - post-Send evidence must be fresh and plus one inside the same pane
  - absent or ambiguous evidence remains fail-closed and no-retry
reviewer_plan:
  required_checks:
    - legacy_parser_regression
    - exact_binding_and_surface_isolation
    - pane_local_evidence_only
    - ambiguity_and_private_browsing_fail_closed
    - no_live_or_network_surface
validation:
  focused_suite: 137/137_green
  complete_welcome_audio_13_suite_boundary: 700/700_green
  node_syntax: green
  git_diff_check: green
integration:
  independent_review: green_no_unresolved_p0_p2
  lane_commit_authorized: true
  integration_status: ready_for_lane_commit_then_chief_architect_review
```

This mission changes parser compatibility only. It is not execution authority
and creates no claim, PENDING, upload, Send, or other real effect.
