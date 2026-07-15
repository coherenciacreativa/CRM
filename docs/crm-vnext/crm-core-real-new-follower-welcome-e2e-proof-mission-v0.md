# CRM Core Real New Follower Welcome E2E Proof Mission Contract 2026-07-15 v0.1

Date prepared: 2026-07-15
Mission ID: `crm_core_real_new_follower_welcome_e2e_proof_v0_2026_07_15`
Mode: `proof`
Status: `chief_architect_amended_backlog_canary_contract_execution_not_approved_no_live`
Drafting baseline commit: `2fcdf302baf550dcb2bd7e5028b73f471a6486a8`
Amendment baseline commit: `44bff5a61eff7c8d7eae78aed0d7584c4e1cc12d`
Runtime execution base: fresh canonical post-integration SHA, owner-only and
bound in the later explicit execution approval

## Mission Operator Contract Schema

```yaml
mission_id: crm_core_real_new_follower_welcome_e2e_proof_v0_2026_07_15
business_outcome: >-
  Demostrar, únicamente en una futura ejecución con aprobación owner-only separada, que CRM Core puede operar de forma autónoma y segura un canary escalonado sobre el backlog real y acotado de seguidores de una campaña pausada: inspeccionar como máximo ocho registros sellados, confirmar elegibilidad exacta y enviar audios de bienvenida verificables a como máximo tres identidades, una vez por identidad. La prueba de entrega de audio es independiente de cualquier respuesta o conversión; cada envío confirmado conserva un estado privado y acotado para respuestas opcionales y activa la rama directa de MailerLite solo cuando la misma persona entrega voluntariamente un correo exacto. Este paquete únicamente enmienda el contrato de planificación; no autoriza ni ejecuta acceso live, envío, mutación, reactivación de campaña ni otro efecto.
observable_success:
  - "packet_status=planning_only_amendment; approval_gate.execution_explicitly_approved=false; live_effects_executed=0; live_effects_authorized_by_this_packet=0"
  - "sealed_backlog_manifest_records<=8; inspected_records<=8; records_outside_manifest=0; campaign_surfaces_touched=0"
  - "cada identidad elegible prueba: manifest_membership=true, still_follows_at_action_time=true, exact_identity_thread_binding=true, prior_welcome_absent=true, prior_audio_absent=true, prior_claim_absent=true, genuine_message_control=true y genuine_attachment_control=true"
  - "not_messageable y otros estados inequívocamente ineligibles cierran sin efecto, no cuentan como fallo y nunca habilitan fallback de texto"
  - "stage_1_audio_attempts<=1; Stage 1 solo queda confirmada mediante audio/mensaje saliente visible o marcador explícito equivalente, identidad correcta, claim persistido y cero anomalías; composer_reset_is_not_success_evidence"
  - "stage_2_unlocked solo por Stage 1 confirmada; total_eligible_identities<=3; total_audio_attempts<=3; audio_attempts_per_identity<=1; ejecución estrictamente secuencial"
  - "audio_delivery_proof_pass_fail_is_independent_of_reply_or_email=true; no_reply_or_no_email_is_expected_behavior_and_never_invalidates_confirmed_audio"
  - "cada envío confirmado entra en awaiting_optional_reply; observación solo del hilo ligado durante <=72 horas por identidad; closeout agregado del cohort <=7 días sin tratar la ventana como deadline humano"
  - "si hay correo exacto voluntario e inequívoco dentro de la ventana: byte_for_byte_preserved=true; direct_subscriber_POST_attempts_per_identity<=1; global_POST_attempts<=3; payload_group_count=2; add_only_semantics=true; ambos grupos y preservación de grupos previos verificados"
  - "todo send o POST attempted con outcome ambiguous, uncertain, timed_out o unknown es terminal para la misión, bloquea expansión y nunca se reintenta"
  - "si no existe ninguna identidad elegible dentro de los ocho registros, cerrar no_effect y outcome_not_verified sin convertir seguridad correcta en prueba de producto"
  - "technical_progress, controlled_product_proof y production_readiness se reportan por separado"
  - "future_daily_capacity_planning_note=approximately_12_per_24h; future_daily_capacity_authorized=0; campaign_reactivation_requires_separate_CEO_decision"
mode: proof
approval_gate:
  contract_version: v0_1_paused_campaign_backlog_staged_canary_2026_07_15
  execution_explicitly_approved: false
  exact_targets_sources_private_reads_effects_and_stop_rules:
    - "este paquete es una enmienda de planificación docs-only; no autoriza lectura live, lectura privada, UI, envío, write, mutación, integración central ni campaña"
    - "se requiere una nueva aprobación explícita owner-only del CEO después de integrar esta versión, vinculada al mission_id, contract_version, HEAD canónico post-integración igual al remote, manifiesto sellado exacto, intervalo de campaña sellado, asset exacto, efectos, caps y stop rules"
    - "drafting_baseline_commit y amendment_baseline_commit son provenance histórica y no transfieren autoridad runtime"
    - "la futura aprobación puede cubrir Stage 1 y Stage 2 en una sola decisión; Stage 2 no requiere handoff rutinario, pero solo se desbloquea por la evidencia determinista de Stage 1 definida aquí"
    - "la futura aprobación debe limitar inspección a <=8 registros ordenados del manifiesto, audio a <=3 intentos totales y uno por identidad, y MailerLite a <=3 POST condicionales totales y uno por identidad"
    - "la campaña permanece pausada y fuera de autoridad; inspección, edición, reactivación, lanzamiento o Ads requieren otra decisión explícita"
    - "ninguna fuente se abre antes de que todos los gates pre-source estén inequívocamente green"
    - "todo efecto ambiguous, uncertain, timed_out o unknown es terminal, sin retry ni sustitución de identidad"
approved_effects:
  repo_reads:
    - "solo tras aprobación futura: verificar <crm_core_authoritative_repo_path>, branch codex/crm-core-reentry, HEAD exacto igual al remote, contexto limpio, registros centrales vigentes y skill repo-local crm-core-mission-operator"
    - "leer únicamente los artifacts tracked necesarios para validar este contrato, sus caps, la allowlist y el active next action"
  live_source_reads:
    - "solo tras aprobación futura: inspeccionar privadamente, en orden y sin descubrimiento amplio, como máximo ocho registros de <sealed_paused_campaign_backlog_manifest_private> mediante <approved_backlog_follower_source_private>"
    - "para cada registro inspeccionado: comprobar still-follows, identidad exacta, hilo exacto, ausencia de bienvenida/audio/claim previos y presencia genuina de controles de mensaje y adjunto"
    - "tras cada audio confirmado: observar únicamente <bound_instagram_thread_private> durante <=72 horas mediante <approved_bound_thread_reply_observer_private>, con scheduler/eventos acotados y sin abrir hilos no ligados"
    - "solo ante correo exacto voluntario e inequívoco: ejecutar preflight MailerLite de cero efecto y verificación read-only inmediata posterior"
  private_artifact_reads:
    - "<fresh_owner_only_execution_approval_record>"
    - "<sealed_paused_campaign_backlog_manifest_private>"
    - "<sealed_campaign_interval_private>"
    - "<sealed_manifest_digest_private>"
    - "<exact_backlog_identity_anchor_private>"
    - "<welcome_history_and_global_dedupe_state_private>"
    - "<approved_welcome_audio_asset_private>"
    - "<safari_actuator_provenance_and_timing_evidence_private>"
    - "<owner_only_claim_emitter_state_private>"
    - "<durable_optional_reply_state_private>"
    - "<owner_only_effect_verification_evidence_bundle_private>"
    - "<voluntarily_supplied_exact_email_bytes_private_conditional>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
    - "<mailerlite_auth_endpoint_and_add_only_semantics_private_conditional>"
  repo_or_source_writes:
    - "como máximo tres claims permanentes owner-only de audio, uno por identidad, emitidos inmediatamente antes del límite UI y sujetos a dedupe y caps globales"
    - "estado operativo owner-only, no CRM, para como máximo tres hilos: audio_confirmed, awaiting_optional_reply, reply_window_closed_no_email, voluntary_exact_email_seen, mailerlite_verified o terminal_unknown_effect"
    - "como máximo tres claims permanentes owner-only de MailerLite, uno por identidad y solo inmediatamente antes del límite de red"
    - "recibos privados por operación, un recibo agregado redactado, un único closeout final del cohort y una sola integración central no privada"
  sends:
    - "como máximo tres envíos de <approved_welcome_audio_asset_private>, estrictamente secuenciales, a como máximo tres identidades elegibles del manifiesto, con un único intento por identidad, usando Safari y sin texto alternativo"
  mutations:
    - "solo para una identidad con correo exacto voluntario e inequívoco dentro de su ventana: como máximo un POST directo protegido de suscriptor para esa identidad, hasta tres POST totales, preservando el correo byte-for-byte y enviando exactamente dos group_ids aprobados con semántica add-only y sin campos adicionales"
  permission_changes: []
  irreversible_actions:
    - "hasta tres intentos de envío de audio, uno por identidad, únicamente tras aprobación futura, preflight individual y claim permanente"
    - "hasta tres POST directos condicionales de MailerLite, uno por identidad, únicamente tras preflight individual de cero efecto y claim permanente"
  UI_actions:
    - "Safari solamente: abrir la fuente aprobada, inspeccionar hasta ocho registros ordenados, abrir únicamente hilos ligados, comprobar controles, adjuntar el asset exacto, intentar hasta tres envíos secuenciales y verificar cada resultado explícitamente"
    - "Safari o el observer aprobado solamente: observar los hilos ligados confirmados dentro de sus ventanas; ninguna acción en perfiles, hilos o superficies no vinculadas"
  recipients_or_targets:
    - "<sealed_paused_campaign_backlog_manifest_private_max_8>"
    - "<eligible_backlog_identity_private_max_3>"
    - "<same_identity_exact_email_private_conditional_max_3>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
forbidden_scope:
  - "cualquier ejecución, fuente live, lectura privada, UI, envío, write, mutación, integración o campaña causada por este paquete de diseño"
  - "inspeccionar registros fuera del manifiesto sellado, inspeccionar más de ocho registros, enviar a más de tres identidades, hacer más de tres intentos de audio o más de un intento por identidad"
  - "desbloquear Stage 2 sin evidencia explícita y completa de Stage 1, ejecutar envíos en paralelo o sustituir una identidad tras un efecto posible"
  - "tratar not_messageable como fallo, convertirlo en permiso para texto alternativo o ampliar la búsqueda a perfiles/hilos no ligados"
  - "texto alternativo o fallback, follow-back, likes, comentarios, reacciones, respuestas salientes, solicitudes de correo o cualquier outreach adicional"
  - "Chrome, rail híbrido, cambio de browser o cualquier rail distinto de Safari para Welcome Audio"
  - "inspección, edición, reactivación, lanzamiento, presupuesto, audiencia, creatividad, campaña o Ads; la capacidad aproximada de doce por día es planificación no autorizada"
  - "MailerLite UI, imports, campañas, workflows, automatizaciones, resubscribe, status updates, field updates, group removal, group replacement o grupos distintos de los dos aprobados"
  - "CRM writes, cards, Fact Store, ledgers, scoring, next-best-action writes, proxy legacy o uso de <legacy_non_crm_core_repo_path>"
  - "perfiles, seguidores, DMs, threads, mensajes o fuentes no ligados a los registros inspeccionados"
  - "normalizar, trim, lowercase, corregir, inferir o transformar aliases, puntos, +tag, local-part, dominio o cualquier byte del correo"
  - "inventar, solicitar, presionar o forzar respuesta, consentimiento o correo"
  - "retry tras click, submit, request dispatch, timeout, crash, respuesta parcial o cualquier posibilidad de que el efecto ya haya ocurrido"
  - "actuar sobre respuestas recibidas fuera de la ventana de 72 horas; requieren otra misión y aprobación"
  - "imprimir o integrar identidades, handles, nombres, URLs, capturas, mensajes, correos, membresía del manifiesto, intervalos privados, group_ids, digests, payloads, subscriber rows, tokens, headers, env values, credentials o private artifact contents"
source_private_boundaries:
  authoritative_repo: "<crm_core_authoritative_repo_path>"
  target_branch: codex/crm-core-reentry
  expected_base_commit: "<fresh_canonical_post_integration_SHA_equal_to_remote_bound_in_owner_only_execution_approval>"
  drafting_baseline_commit: 2fcdf302baf550dcb2bd7e5028b73f471a6486a8
  amendment_baseline_commit: 44bff5a61eff7c8d7eae78aed0d7584c4e1cc12d
  execution_base_binding:
    - "resolver HEAD canónico y remote inmediatamente antes de la aprobación de ejecución"
    - "registrar el SHA exacto post-integración y la contract_version en el approval record owner-only"
    - "exigir branch, HEAD, remote y contexto limpio coincidentes antes de abrir la fuente y antes de cada efecto"
    - "verificar que el manifiesto owner-only siga sellado, ordenado, con <=8 registros y ligado al intervalo de campaña aprobado"
    - "nunca reutilizar drafting_baseline_commit, amendment_baseline_commit, commits de integración ni receipts como autoridad runtime"
  approved_live_sources:
    - "<approved_backlog_follower_source_private>"
    - "<still_follows_signal_private>"
    - "<bound_instagram_thread_private_max_3>"
    - "<owner_only_claim_emitter_private>"
    - "<approved_bound_thread_reply_observer_private>"
    - "<mailerlite_direct_subscriber_API_private_conditional>"
  approved_private_input_labels:
    - "<fresh_owner_only_execution_approval_record>"
    - "<sealed_paused_campaign_backlog_manifest_private>"
    - "<sealed_campaign_interval_private>"
    - "<sealed_manifest_digest_private>"
    - "<exact_backlog_identity_anchor_private>"
    - "<welcome_history_and_global_dedupe_state_private>"
    - "<approved_welcome_audio_asset_private>"
    - "<safari_actuator_provenance_and_timing_evidence_private>"
    - "<owner_only_claim_emitter_state_private>"
    - "<durable_optional_reply_state_private>"
    - "<owner_only_effect_verification_evidence_bundle_private>"
    - "<voluntarily_supplied_exact_email_bytes_private_conditional>"
    - "<approved_onboarding_group_one_private>"
    - "<approved_onboarding_group_two_private>"
    - "<mailerlite_auth_endpoint_and_add_only_semantics_private_conditional>"
  prohibited_output_classes:
    - secrets
    - raw_identities
    - private_values
    - source_payloads
    - raw_target_urls
    - handles_or_names
    - emails_or_subscriber_rows
    - messages_or_screenshots
    - manifest_membership_or_campaign_interval
    - group_ids_or_digests
    - tokens_headers_env_values_or_credentials
autonomy_budget:
  max_elapsed_minutes: 10080
  max_active_execution_minutes: 120
  max_repair_cycles: 3
  max_new_targets_people_sources_or_effects: 0
  routine_CEO_interruptions: 0
  max_backlog_records_inspected: 8
  max_eligible_identities: 3
  stage_1_max_audio_attempts: 1
  stage_2_max_total_audio_attempts: 3
  max_audio_attempts_per_identity: 1
  max_conditional_mailerlite_POST_attempts: 3
  max_conditional_mailerlite_POST_attempts_per_identity: 1
  max_bound_thread_observation_hours_per_identity: 72
  max_post_send_observation_reads_per_thread: 3
  max_total_post_send_observation_reads: 9
  max_cohort_closeout_wall_clock_hours: 168
  max_manual_interventions: 1
  max_exception_escalations: 1
  max_human_copy_paste_handoffs: 0
  max_CEO_touches: 2
  max_central_integrations: 1
  future_daily_capacity_planning_only: "approximately_12_per_24h"
  future_daily_capacity_authorized: 0
self_repair_budget:
  allowed:
    - mechanical_schema_repair
    - safe_test_repair
    - pre_mutation_route_repair
    - receipt_format_repair
    - atomic_snapshot_refresh
    - "reversible Safari focus or selector recovery before any attempted effect, without changing identity, order, asset, permission or effect"
    - "repair of durable observer scheduling or state serialization before it can trigger a source read or mutation"
  forbidden:
    - scope_broadening
    - new_real_effect
    - privacy_boundary_change
    - retry_after_possible_mutation_without_known_state
    - "modificar, reordenar o ampliar el manifiesto sellado o el intervalo de campaña"
    - "tracked code or file-scope expansion outside the central allowlist"
    - "browser switching, text fallback, target substitution, identity reinterpretation or email transformation"
    - "repair after a send click or MailerLite request may have crossed the effect boundary"
    - "ampliar la ventana de observación, el número de lecturas o los caps de audio/MailerLite"
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
  may_select_or_replace_identity: false
  may_resolve_identity_ambiguity: false
  may_modify_manifest_order_or_campaign_state: false
  may_switch_browser_or_enable_text_fallback: false
  must_finish_before_any_attempted_or_uncertain_effect: true
leverage_filter:
  passes_if_any:
    - unlocks_current_milestone
    - expected_reuse_at_least_three_times
    - removes_recurring_human_labor
    - prevents_material_harm
    - required_for_autonomous_operation
  result: "pass: el canary de hasta tres identidades convierte la capacidad técnica ya demostrada en evidencia operativa real, se reutiliza sobre un backlog acotado, reduce trabajo humano recurrente y mantiene dedupe, identidad y efectos bajo caps; no construir generalización de campaña ni capacidad diaria hasta cerrar este canary y aplicar un nuevo leverage review"
atomicity_freshness_requirements:
  required_sequence:
    - fresh_check
    - preflight
    - approved_real_action
    - immediate_verification
    - redacted_receipt
    - one_closeout
  maximum_snapshot_age: "manifest_and_campaign_interval=immutable_owner_only_binding; source_identity_thread_asset<=5_minutes; still_follows_final_dedupe_claim_and_zero_effect_preflight<=60_seconds; MailerLite_preflight<=60_seconds"
  no_handoff_inside_sequence: true
  active_phase_and_observation_clock:
    - "la ejecución activa acumulada entre inspección, audio, wakes de observación y ramas MailerLite consume <=120 minutos"
    - "la misión puede permanecer abierta hasta 7 días solo por observación pasiva/acotada y closeout; no autoriza worker continuo, polling ilimitado ni efectos nuevos"
    - "cada hilo se observa durante <=72 horas desde su audio confirmado; el closeout agregado usa estados durables y no abre fuentes solo para completar el día siete"
  effect_serialization:
    - "audio, observación accionable y MailerLite comparten un único rail de efectos serializado"
    - "un evento entrante durante otra secuencia atómica se conserva en estado durable y se procesa solo después de cerrar la secuencia vigente"
    - "cualquier estado post-efecto desconocido bloquea todo efecto posterior"
  sealed_manifest_rule:
    - "solo son candidatos registros que pertenezcan exactamente al manifiesto owner-only sellado y al intervalo sellado de la campaña pausada"
    - "edad >24 horas es admisible únicamente por esa membresía; no crea una regla general de recentness ni incluye seguidores posteriores"
    - "la inspección respeta el orden sellado y termina al alcanzar tres intentos de audio, agotar ocho registros o encontrar un stop terminal"
  eligibility_rule:
    - "manifest_member=true"
    - "follow_timestamp_within_sealed_campaign_interval=true"
    - "still_follows_at_action_time=true"
    - "exact_identity_thread_binding=true"
    - "prior_welcome_absent=true"
    - "prior_audio_absent=true"
    - "prior_claim_absent=true"
    - "genuine_message_control=true"
    - "genuine_attachment_control=true"
  pre_source_fail_closed_gate:
    - "HEAD canónico post-integración exacto=SHA ligado en approval record owner-only; remote idéntico; branch exacta; contexto central limpio; mission branch fresca"
    - "drafting_baseline_commit y amendment_baseline_commit son provenance histórica, no autoridad runtime"
    - "aprobación owner-only nueva coincide con este contrato, manifiesto, intervalo, asset, caps, efectos y stop rules"
    - "claim emitter owner-only live, dedupe global, durable optional-reply state y caps de inspección/audio/MailerLite inequívocamente green"
    - "actuador Safari browser-bound y observer de hilos ligados con provenance, timing y límites comprobables inequívocamente green"
    - "si cualquier gate no está green, parar antes de abrir la fuente"
  record_classification:
    - "already_welcomed, prior_audio_present, prior_claim_present, no_longer_follows y not_messageable son clasificaciones no-effect; continuar al siguiente registro si los controles sistémicos siguen green"
    - "un binding no probado puede clasificarse ineligible_without_effect solo si no existe conflicto de identidad; cualquier conflicto que pueda dirigir un efecto a la persona incorrecta es terminal y se escala"
    - "una ausencia local de evidencia de dedupe bloquea ese registro; una falla sistémica del dedupe o claim emitter termina la misión"
  stage_1_atomic_sequence:
    - "inspeccionar registros ordenados hasta encontrar la primera identidad elegible o agotar el manifiesto/cap"
    - "revalidar still-follows, identidad, hilo, ausencia de efectos previos, controles y asset dentro de freshness"
    - "ejecutar preflight de cero efecto y emitir claim permanente de audio dentro de los 60 segundos previos al límite UI"
    - "adjuntar <approved_welcome_audio_asset_private> y hacer un único intento para esa identidad"
    - "verificar inmediatamente audio/mensaje saliente visible o marcador explícito equivalente, identidad correcta, claim persistido y cero anomalías"
    - "si no hay evidencia explícita o el outcome es ambiguous, uncertain, timed_out o unknown, terminar sin retry y no desbloquear Stage 2"
  stage_2_unlock:
    - "stage_1_audio_confirmed=true"
    - "stage_1_identity_match=true"
    - "stage_1_claim_persisted=true"
    - "stage_1_anomaly_count=0"
    - "global_dedupe_claim_and_caps_still_green=true"
  stage_2_atomic_sequence:
    - "continuar por los registros restantes en orden, saltando solo clasificaciones no-effect inequívocas"
    - "repetir fresh check, preflight, claim, único intento y verificación para cada identidad"
    - "detener al alcanzar tres intentos totales, agotar ocho registros o encontrar un stop terminal"
    - "ningún reply o correo es requisito para el segundo o tercer audio"
  optional_reply_observation_sequence:
    - "después de cada audio confirmado, persistir awaiting_optional_reply con thread binding y deadline privado"
    - "observar solo el hilo ligado mediante eventos o como máximo tres lecturas post-send por hilo, terminando no más tarde de 72 horas"
    - "sin respuesta o sin correo, cerrar reply_window_closed_no_email; esto es comportamiento esperado y conserva audio_proof_complete=true"
    - "respuestas posteriores a 72 horas quedan fuera de esta misión y no se leen ni accionan bajo este contrato"
  conditional_email_atomic_sequence:
    - "activar solo cuando la misma identidad entrega voluntariamente un único token de correo exacto e inequívoco dentro de su ventana"
    - "si hay múltiples correos, ambigüedad, contexto no voluntario o imposibilidad de preservar bytes, cerrar email_ambiguous_no_effect para esa identidad"
    - "preservar y reutilizar el correo byte-for-byte; no normalizar ningún byte"
    - "preflight MailerLite de cero efecto: identidad exacta, status/suppression safe, endpoint y auth green, no claim previo, semántica add-only probada y payload con email exacto y exactamente dos group_ids aprobados sin fields/status"
    - "si no se puede probar preservación de grupos preexistentes y ausencia de efectos colaterales, parar antes del POST"
    - "emitir claim permanente de MailerLite dentro de los 60 segundos previos al límite de red"
    - "hacer un solo POST para esa identidad y verificar inmediatamente ambos grupos, preservación observable de grupos previos y estado conocido"
    - "si el request fue dispatched y el outcome es ambiguous, uncertain, timed_out o unknown, terminar la misión sin retry ni POST para otra identidad"
  cohort_closeout_sequence:
    - "cerrar no más tarde de 7 días desde el inicio con un único receipt agregado y redactado basado en estados durables"
    - "reportar inspeccionados, ineligibles por clase, audios intentados/confirmados, awaiting_optional_reply, replies, exact-email branches y POST verificados sin valores privados"
    - "separar audio delivery proof de organic conversion; no response y no email nunca degradan un audio confirmado"
    - "campaign_status=untouched_paused; future_capacity_authorized=0; cualquier reactivación o escala posterior requiere otra decisión CEO"
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
    - "exact_branch_fresh_HEAD_equal_remote_and_owner_only_approval_binding"
    - "sealed_manifest_max_8_and_no_campaign_surface_access"
    - "Stage_1_explicit_visible_proof_before_autonomous_Stage_2"
    - "max_3_sequential_audio_attempts_and_one_per_identity"
    - "not_messageable_is_no_effect_and_no_text_fallback"
    - "audio_proof_independent_from_reply_email_or_conversion"
    - "bounded_72h_thread_observation_and_7d_aggregate_closeout_without_unbounded_polling"
    - "exact_email_byte_for_byte_one_POST_per_identity_global_cap_3_exact_two_groups_add_only"
    - "terminal_no_retry_for_any_ambiguous_uncertain_timed_out_or_unknown_effect"
    - "campaign_reactivation_and_daily_capacity_remain_unauthorized"
    - "all_private_evidence_owner-only_and_only_aggregate_redacted_receipts_integrated"
  reviewer_effect_authority: none
  reviewer_verdict_required_before_integration: green_to_self_integrate
escalation_conditions:
  - genuine_business_ambiguity
  - ambiguous_identity_with_wrong_person_risk
  - uncertain_privacy_or_source_boundary
  - additional_unapproved_real_effect_required
  - possible_duplicate_mutation
  - unknown_post_mutation_state
  - repair_budget_exhausted
  - user_owned_dirty_work_at_risk
  - unapproved_irreversible_action
  - required_human_authentication_or_security_confirmation
  - required_global_Safari_or_observer_control_unavailable
  - "sealed_manifest_missing_changed_unordered_over_cap_or_not_bound_to_approval"
  - "campaign_access_reactivation_or_campaign_state_change_requested"
  - "branch_or_HEAD_differs_from_owner_only_execution_binding_or_central_context_is_not_clean"
  - "claim_emitter_dedupe_caps_or_durable_reply_state_not_systemically_green"
  - "Stage_1_send_or_any_later_send_may_have_crossed_effect_boundary_without_known_result"
  - "MailerLite_POST_may_have_crossed_effect_boundary_without_known_result"
  - "daily_capacity_or_recipient_expansion_beyond_the_sealed_canary_is_requested"
central_integration_plan:
  target_branch: codex/crm-core-reentry
  source_branches:
    - codex/crm-core-real-follower-backlog-canary-amendment-2026-07-15
  source_commits:
    - "<future_reviewed_backlog_canary_amendment_commit_SHA>"
  exact_changed_file_allowlist:
    - docs/crm-vnext/crm-core-real-new-follower-welcome-e2e-proof-mission-v0.md
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/workstreams/integration.md
  deterministic_checks:
    - exact_amendment_baseline_44bff5a61eff7c8d7eae78aed0d7584c4e1cc12d
    - canonical_branch_and_remote_HEAD_match
    - central_and_amendment_worktree_clean_check
    - contract_exact_17_roots_and_canonical_order_check
    - approval_false_and_live_effects_zero_check
    - sealed_manifest_inspection_cap_8_check
    - Stage_1_before_Stage_2_and_total_audio_cap_3_check
    - one_audio_attempt_per_identity_check
    - bounded_observation_72h_and_closeout_7d_check
    - conditional_MailerLite_per_identity_1_global_3_exact_two_groups_add_only_check
    - no_duplicate_active_action_or_mission_checkpoint_check
    - exact_five_file_allowlist_check
    - repo_local_crm_core_mission_operator_validation
    - git_diff_check
    - private_artifact_and_redaction_scan
    - raw_target_URL_secret_token_header_env_credential_scan
    - no_campaign_authority_or_daily_capacity_authorization_check
  central_coordination_files:
    - docs/crm-vnext/crm-core-next-action.md
    - docs/crm-vnext/crm-core-workstream-board-v0.md
    - docs/crm-vnext/crm-core-integration-queue-v0.md
    - docs/crm-vnext/workstreams/integration.md
  integration_packet_id: "<redacted_backlog_canary_amendment_integration_packet_id>"
  reviewer_verdict_required: green_to_self_integrate
  one_lock_for_all_sources: true
  integration_count: 1
  synchronize_clean_canonical_lanes: true
final_ceo_brief_fields:
  - mission_id
  - business_outcome
  - observable_success_status
  - technical_progress_vs_product_outcome
  - controlled_proof_vs_production_readiness
  - approved_effects_executed
  - source_private_boundary_confirmation
  - repair_and_manual_intervention_metrics
  - exceptions
  - final_central_commit
  - synchronized_lanes
  - remaining_risk_or_blocker
  - next_highest_leverage_decision
  - all_mission_metrics
  - backlog_records_inspected
  - ineligible_counts_by_redacted_class
  - stage_1_status
  - stage_2_status
  - audio_attempt_count
  - audio_confirmed_count
  - unknown_audio_effect_count
  - awaiting_optional_reply_count
  - replies_within_72h_count
  - voluntary_exact_email_count
  - mailerlite_POST_attempt_count
  - mailerlite_verified_count
  - no_reply_or_email_count
  - cohort_closeout_status
  - campaign_untouched_confirmation
  - future_daily_capacity_authorized
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

This tracked artifact is an amended planning contract only. It does not
authorize source reads, UI actions, sends, mutations, MailerLite effects,
campaign actions, or any other live effect. The campaign remains paused by the
CEO's report and outside CRM Core authority. A later execution approval must
identify this exact amended contract version, the fresh canonical
post-integration SHA, outcome, recipient scope, effects, and stop rules.
