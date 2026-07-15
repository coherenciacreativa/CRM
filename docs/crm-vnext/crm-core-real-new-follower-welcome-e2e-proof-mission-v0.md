# CRM Core Real New Follower Welcome E2E Proof Mission Contract 2026-07-15 v0

Date prepared: 2026-07-15
Mission ID: `crm_core_real_new_follower_welcome_e2e_proof_v0_2026_07_15`
Mode: `proof`
Status: `drafted_by_chief_architect_execution_not_approved`
Expected base commit: `2fcdf302baf550dcb2bd7e5028b73f471a6486a8`

## Mission Operator Contract Schema

```yaml
mission_id: crm_core_real_new_follower_welcome_e2e_proof_v0_2026_07_15
business_outcome: >-
  Demostrar, únicamente en una futura ejecución separadamente aprobada, que CRM Core puede completar con una sola persona realmente nueva y reciente el flujo seguro desde detección y dedupe privado hasta un único audio de bienvenida verificable y, solo si esa misma persona entrega voluntariamente un correo exacto dentro de la ventana, un único POST directo protegido de MailerLite con exactamente los dos grupos de onboarding aprobados. Este paquete solo redacta el contrato: no autoriza ni ejecuta ningún efecto live.
observable_success:
  - "packet_status=contract_only; live_effects_executed=0; live_effects_authorized_by_this_packet=0"
  - "pre_source_gates=green; candidate_count<=1; candidate_newness=proven; candidate_recentness_hours<=24"
  - "identity_link=exact_private; dedupe=passed; prior_welcome_absent=proven; prior_audio_absent_in_exact_thread=proven"
  - "exact_thread_opened=true; attachment_control_available=true; message_control_available=true; unrelated_profiles_or_threads_opened=0"
  - "audio_send_attempt_count<=1; success solo con burbuja saliente visible o marcador explícito equivalente; composer_reset_is_not_success_evidence"
  - "linked_thread_only_monitoring=true durante una ventana máxima de 60 minutos"
  - "si correo exacto voluntario: byte_for_byte_preserved=true; mailerlite_direct_subscriber_POST_count=1; payload_group_count=2; ambos grupos aprobados verificados"
  - "si no hay candidato, respuesta o correo: no se inventa ni fuerza; la rama aplicable cierra honestamente con cero efecto adicional"
  - "technical_progress_vs_product_outcome se reporta explícitamente; una ruta técnica verde sin evidencia observable no cuenta como outcome"
mode: proof
approval_gate:
  contract_version: v0_2026_07_15
  execution_explicitly_approved: false
  exact_targets_sources_private_reads_effects_and_stop_rules:
    - "este paquete es solo diseño y no autoriza lectura live, lectura privada, UI, envío, write, mutación ni integración"
    - "se requiere una nueva aprobación explícita owner-only del CEO inmediatamente antes de ejecutar, vinculada a este mission_id, esta contract_version y el contrato exacto"
    - "la misión anterior está cerrada; ninguna aprobación, claim, destinatario ni autoridad previa se transfiere"
    - "la futura aprobación debe cubrir la fuente exacta, la regla determinista de selección de un solo candidato, Safari, el asset exacto, la ventana de 60 minutos, el envío único y la rama MailerLite condicional"
    - "la futura aprobación debe limitar efectos a un candidato, un intento de audio y un POST directo condicional de suscriptor con exactamente dos grupos aprobados"
    - "todo efecto attempted, uncertain, timed_out o unknown es terminal, sin retry y con closeout honesto"
approved_effects:
  repo_reads:
    - "solo tras aprobación futura: verificar <crm_core_authoritative_repo_path>, branch codex/crm-core-reentry, HEAD exacto, limpieza y skill repo-local crm-core-mission-operator"
  live_source_reads:
    - "solo tras aprobación futura: exploración acotada de <approved_recent_followers_source_private> hasta seleccionar como máximo el primer candidato elegible por orden de fuente"
    - "lectura exclusiva de <exact_instagram_thread_private> para identidad, dedupe, ausencia de bienvenida/audio previo y disponibilidad de adjunto/mensaje"
    - "tras audio verificablemente confirmado: vigilar únicamente <exact_instagram_thread_private> durante como máximo 60 minutos"
    - "solo si aparece correo exacto voluntario: preflight MailerLite de cero efecto y verificación read-only inmediata posterior"
  private_artifact_reads:
    - "<fresh_owner_only_execution_approval_record>"
    - "<exact_new_follower_identity_anchor_private>"
    - "<welcome_history_and_global_dedupe_state_private>"
    - "<approved_welcome_audio_asset_private>"
    - "<safari_actuator_provenance_and_timing_evidence_private>"
    - "<owner_only_claim_emitter_state_private>"
    - "<owner_only_effect_verification_evidence_bundle_private>"
    - "<voluntarily_supplied_exact_email_bytes_private_conditional>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
    - "<mailerlite_auth_and_endpoint_binding_private_conditional>"
  repo_or_source_writes:
    - "un claim permanente owner-only para el intento de audio, emitido inmediatamente antes del límite UI y sujeto a dedupe y caps globales"
    - "un claim permanente owner-only para el POST de MailerLite, solo condicionalmente e inmediatamente antes del límite de red"
    - "un recibo agregado y redactado, un único closeout y una integración central final no privada"
  sends:
    - "como máximo un envío de <approved_welcome_audio_asset_private> a <single_deterministically_selected_eligible_new_follower_private>, por Safari y sin texto alternativo"
  mutations:
    - "solo si la misma persona entrega voluntariamente <exact_email_bytes_private> dentro de la ventana: exactamente un POST directo protegido de suscriptor con el correo byte-for-byte y exactamente dos group_ids aprobados, sin campos ni grupos adicionales"
  permission_changes: []
  irreversible_actions:
    - "un único intento de envío de audio, solo tras aprobación futura, preflight y claim permanente"
    - "un único POST directo condicional de MailerLite, solo tras aprobación futura, preflight de cero efecto y claim permanente"
  UI_actions:
    - "Safari solamente: abrir fuente aprobada, seleccionar un candidato, abrir hilo exacto, comprobar controles, adjuntar asset exacto, enviar una vez y verificar burbuja o marcador explícito"
    - "Safari solamente: observar el hilo exacto durante la ventana; ninguna acción en perfiles, hilos o superficies no vinculadas"
  recipients_or_targets:
    - "<single_deterministically_selected_eligible_new_follower_private>"
    - "<same_person_exact_email_private_conditional>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
forbidden_scope:
  - "cualquier ejecución, fuente live, lectura privada, UI, envío, write, mutación o integración causada por este paquete de diseño"
  - "más de un candidato, destinatario, persona, hilo, fuente, audio, envío o POST de MailerLite"
  - "texto alternativo o fallback, follow-back, likes, comentarios, reacciones, campaña, automatización, Ads o inspección de estado publicitario"
  - "Chrome, rail híbrido, cambio de browser o cualquier rail distinto de Safari para Welcome Audio"
  - "MailerLite UI, imports, campañas, workflows, automatizaciones, resubscribe, status updates, field updates, group removal, group replacement o grupos distintos de los dos aprobados"
  - "CRM writes, cards, Fact Store, ledgers, scoring, next-best-action writes, proxy legacy o uso de <legacy_non_crm_core_repo_path>"
  - "perfiles, DMs, threads, mensajes, seguidores o fuentes no relacionados con la persona exacta"
  - "retry tras click, submit, request dispatch, timeout, crash, respuesta parcial o cualquier posibilidad de que el efecto ya haya ocurrido"
  - "normalizar, trim, lowercase, corregir, inferir o transformar alias, puntos, +tag, local-part, dominio o cualquier byte del correo"
  - "inventar, solicitar, presionar o forzar una respuesta o un correo"
  - "imprimir o integrar identidades, handles, nombres, URLs, capturas, mensajes, correos, group_ids, digests, payloads, subscriber rows, tokens, headers, env values, credentials o private artifact contents"
source_private_boundaries:
  authoritative_repo: "<crm_core_authoritative_repo_path>"
  target_branch: codex/crm-core-reentry
  expected_base_commit: 2fcdf302baf550dcb2bd7e5028b73f471a6486a8
  approved_live_sources:
    - "<approved_recent_followers_source_private>"
    - "<exact_instagram_thread_private>"
    - "<owner_only_claim_emitter_private>"
    - "<mailerlite_direct_subscriber_API_private_conditional>"
  approved_private_input_labels:
    - "<fresh_owner_only_execution_approval_record>"
    - "<exact_new_follower_identity_anchor_private>"
    - "<welcome_history_and_global_dedupe_state_private>"
    - "<approved_welcome_audio_asset_private>"
    - "<safari_actuator_provenance_and_timing_evidence_private>"
    - "<owner_only_effect_verification_evidence_bundle_private>"
    - "<voluntarily_supplied_exact_email_bytes_private_conditional>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
    - "<mailerlite_auth_and_endpoint_binding_private_conditional>"
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - raw_target_urls
    - handles_or_names
    - emails_or_subscriber_rows
    - messages_or_screenshots
    - group_ids_or_digests
    - tokens_headers_env_values_or_credentials
autonomy_budget:
  max_elapsed_minutes: 120
  max_repair_cycles: 3
  max_new_targets_people_sources_or_effects: 0
  routine_CEO_interruptions: 0
  max_candidates: 1
  max_audio_send_attempts: 1
  max_mailerlite_subscriber_POST_attempts: 1
  max_linked_thread_monitor_minutes: 60
  max_manual_interventions: 1
  max_exception_escalations: 1
  max_human_copy_paste_handoffs: 0
  max_CEO_touches: 2
  max_central_integrations: 1
self_repair_budget:
  allowed:
    - mechanical_schema_repair
    - safe_test_repair
    - pre_mutation_route_repair
    - receipt_format_repair
    - atomic_snapshot_refresh
    - "reversible Safari focus or selector recovery before any attempted effect, without changing target, identity, asset, permission or effect"
  forbidden:
    - scope_broadening
    - new_real_effect
    - privacy_boundary_change
    - retry_after_possible_mutation_without_known_state
    - "tracked code or file-scope expansion outside the central allowlist"
    - "browser switching, text fallback, target substitution, identity reinterpretation or email transformation"
    - "repair after a send click or MailerLite request may have crossed the effect boundary"
manual_intervention_policy:
  allowed_in_proof_mode: true
  max_minutes: 10
  must_be_reversible_or_low_risk: true
  must_be_privacy_safe: true
  may_expand_recipients_or_permissions: false
  may_hide_production_critical_issue: false
  manual_intervention_used: false
  hardening_candidate: false
  max_count: 1
  may_perform_send_or_mailerlite_POST: false
  may_resolve_identity_ambiguity: false
  must_finish_before_any_attempted_or_uncertain_effect: true
leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - expected_reuse_at_least_three_times
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomous_operation
  result: "pass: desbloquea el primer proof real end-to-end y evita daño material por duplicados; usar rails existentes y un workaround manual acotado para anomalías únicas, dejando hardening reusable en backlog salvo nuevo pase del filtro"
atomicity_freshness_requirements:
  required_sequence:
    - fresh_check
    - preflight
    - approved_real_action
    - immediate_verification
    - redacted_receipt
    - one_closeout
  maximum_snapshot_age: "source_identity_thread_asset<=5_minutes; final_dedupe_claim_and_zero_effect_preflight<=60_seconds"
  no_handoff_inside_sequence: true
  candidate_recentness_max_hours: 24
  candidate_selection_rule: "primer registro por orden de la fuente que pruebe newness, recentness, identidad exacta, hilo exacto, ausencia de bienvenida/audio previo y ausencia de claim; si ninguno califica, closeout no_candidate"
  pre_source_fail_closed_gate:
    - "HEAD exacto=2fcdf302baf550dcb2bd7e5028b73f471a6486a8; branch exacta; contexto central limpio; mission branch fresca"
    - "aprobación owner-only nueva coincide con el contrato exacto; execution_explicitly_approved solo puede ser true en el paquete futuro de ejecución"
    - "claim emitter owner-only live, dedupe global y caps de candidato/audio/MailerLite inequívocamente green"
    - "actuador Safari browser-bound con provenance y timing comprobables inequívocamente green"
    - "ruta de fuente aprobada, asset exacto y bindings privados requeridos disponibles y frescos"
    - "si cualquier gate no está green, parar antes de abrir la fuente"
  post_source_pre_effect_fail_closed_gate:
    - "candidate newness y recentness probadas desde la fuente aprobada"
    - "identidad exacta, hilo exacto y asset exacto ligados con provenance fresca"
    - "ausencia de bienvenida previa, audio previo y claim previo inequívocamente green"
    - "si cualquier gate falla, parar antes de claim, adjunto o envío"
  audio_atomic_sequence:
    - "abrir únicamente <approved_recent_followers_source_private> en Safari"
    - "seleccionar como máximo un candidato por la regla determinista; vincular identidad e hilo exactos y ejecutar dedupe privado"
    - "probar ausencia de bienvenida y audio previos; confirmar controles de adjunto y mensaje"
    - "ejecutar preflight de cero efecto y emitir claim permanente de audio dentro de los 60 segundos previos al límite UI"
    - "adjuntar <approved_welcome_audio_asset_private> y hacer un solo intento de envío"
    - "verificar inmediatamente burbuja saliente visible o marcador explícito equivalente; reinicio del compositor no prueba éxito"
    - "si el outcome es attempted, uncertain, timed_out o unknown, parar terminalmente sin retry"
  conditional_email_atomic_sequence:
    - "vigilar solo el hilo vinculado durante un máximo de 60 minutos"
    - "activar únicamente si la misma persona entrega voluntariamente un token de correo exacto e inequívoco dentro de la ventana"
    - "preservar y reutilizar el token byte-for-byte; no normalizar ningún byte"
    - "preflight MailerLite de cero efecto: identidad exacta, suppression/status safe, endpoint exacto, auth green, no claim previo y payload con email exacto y exactamente dos group_ids aprobados"
    - "si las semánticas no garantizan add-only o preservación de grupos preexistentes, parar antes del POST"
    - "emitir claim permanente de MailerLite dentro de los 60 segundos previos al límite de red"
    - "hacer exactamente un POST directo protegido y verificar inmediatamente ambos grupos, preservación observable de grupos previos y estado conocido"
    - "si el request fue dispatched o su outcome es attempted, uncertain, timed_out o unknown, parar terminalmente sin retry"
  no_reply_or_email_path:
    - "cerrar con audio_proof_complete=true y downstream_branch_status=not_activated"
    - "respuesta o correo posterior a la ventana queda fuera de esta misión y requiere nueva misión y aprobación"
reviewer_plan:
  executor: "<codex_mission_executor_owner_only>"
  adversarial_reviewer: "<independent_codex_adversarial_reviewer_owner_only>"
  review_checks:
    - observable_outcome
    - bureaucracy_and_copy_paste_loops
    - scope_and_effect_allowlists
    - privacy_and_identity_boundaries
    - proof_mode_manual_intervention
    - narrow_escalations
    - one_central_integration
    - "exact_base_branch_cleanliness_and_fresh_approval"
    - "one_candidate_one_audio_attempt_and_conditional_one_POST_caps"
    - "explicit_outgoing_bubble_or_equivalent_marker; composer reset rejected"
    - "thread_only_monitoring_and_no_unrelated_surface_access"
    - "email_byte_for_byte_and_exactly_two_groups_in_single_direct_POST"
    - "terminal_no_retry_for_any_attempted_uncertain_timed_out_or_unknown_effect"
    - "all_private_evidence_owner-only; only aggregate redacted receipts integrated"
  reviewer_effect_authority: none
  reviewer_verdict_required_before_integration: green_to_self_integrate
escalation_conditions:
  - genuine_business_ambiguity
  - ambiguous_identity
  - uncertain_privacy_or_source_boundary
  - additional_unapproved_real_effect_required
  - possible_duplicate_mutation
  - unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - unapproved_irreversible_action
  - required_human_authentication_or_security_confirmation
  - required_UI_control_unavailable
  - "branch_or_HEAD_differs_from_exact_expected_base_or_central_context_is_not_clean"
  - "newness_recentness_exact_thread_or_prior_welcome_audio_absence_cannot_be_proven"
  - "Safari_actuator_provenance_timing_or_claim_emitter_dedupe_caps_not_green"
  - "voluntary_email_token_is_ambiguous_or_cannot_be_preserved_byte_for_byte"
  - "MailerLite_preflight_is_not_zero_effect_or_single_POST_cannot_carry_exactly_two_approved_groups_add-only"
  - "send_or_POST_may_have_crossed_effect_boundary; terminal_stop_without_retry"
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches:
    - codex/crm-core-real-new-follower-welcome-e2e-proof-2026-07-15
  source_commits:
    - "<future_reviewed_mission_closeout_commit_SHA>"
  exact_changed_file_allowlist:
    - docs/crm-vnext/crm-core-real-new-follower-welcome-e2e-proof-mission-v0.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/workstreams/integration.md
  deterministic_checks:
    - branch_and_exact_base_check
    - central_and_mission_worktree_clean_check
    - owner_only_contract_binding_check_without_digest_output
    - repo_local_crm_core_mission_operator_validation
    - claim_dedupe_and_global_caps_validation
    - Safari_actuator_provenance_timing_and_explicit_bubble_verification_check
    - MailerLite_single_POST_exact_email_bytes_exact_two_groups_guard_check
    - effect_count_and_terminal_no_retry_assertions
    - git_diff_check
    - private_artifact_and_redaction_scan
    - raw_target_URL_secret_token_header_env_credential_scan
  central_coordination_files:
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/workstreams/integration.md
  integration_packet_id: "<redacted_mission_integration_packet_id>"
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
  synchronize_clean_canonical_lanes: true
final_ceo_brief_fields:
  - mission_id
  - business_outcome
  - observable_success_status
  - technical_progress_vs_product_outcome
  - approved_effects_executed
  - source_private_boundary_confirmation
  - repair_and_manual_intervention_metrics
  - exceptions
  - final_central_commit
  - synchronized_lanes
  - remaining_risk_or_blocker
  - next_highest_leverage_decision
  - all_mission_metrics
  - time_to_verified_outcome
  - CEO_touch_count
  - human_copy_paste_handoffs
  - exception_escalation_count
  - repair_cycle_count
  - manual_intervention_count
  - source_action_count
  - real_effect_count
  - central_integration_count
  - leverage_filter_result
```

## Approval state

This tracked artifact is a planning contract only. It does not authorize source
reads, UI actions, sends, mutations, MailerLite effects, or any other live
effect. A later execution approval must identify this exact contract version,
outcome, recipient scope, effects, and stop rules.
