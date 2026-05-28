import { describe, expect, test } from "vitest";

import {
  buildApprovalMatrix,
  buildCurrentState,
  buildImmediateNextMoves,
  buildOperatingPrinciples,
  buildOperatingScenarios,
  buildReportMap,
  buildRunbook,
  commandCatalogFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-operator-runbook.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const cadenceBoard = {
  currentPilot: { launch },
  operatingRhythm: {
    activeCadenceNow: "weekly",
    every3DaysStatus: "designed_but_not_active",
  },
};

const readinessBoard = {
  launch,
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 8,
    liveGateOpenCount: 2,
    liveMutationGateOpenCount: 0,
  },
};

const backlogBoard = {
  wipSnapshot: {
    safeToIntakeOneMoreNoLiveIdea: true,
  },
  gateDefaults: [
    { id: "audience_launch", status: "closed_by_default" },
  ],
};

const reconciliationBoard = {
  launch,
  status: "blocked_until_department_reviews_accepted_no_live_changes",
  responseState: {
    pendingDepartments: ["brand", "web_design", "crm"],
  },
};

const packetsIndex = {
  packetCount: 3,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const responseWorkspace = {
  status: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
  readyForIntake: false,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const finalizationPreflight = {
  status: "department_finalization_preflight_waiting_department_responses_no_live_changes",
  readyForIntake: false,
  acceptedDepartments: [],
  pendingReadyDepartments: [],
  draftAssistDepartments: ["brand", "web_design", "crm"],
  awaitingDepartments: ["brand", "web_design", "crm"],
  departments: [
    {
      department: "brand",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      codexDraftAvailable: true,
    },
    {
      department: "web_design",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      codexDraftAvailable: true,
    },
    {
      department: "crm",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      codexDraftAvailable: true,
    },
  ],
};

const operatorQueue = {
  status: "department_review_operator_queue_waiting_final_responses_no_live_changes",
  summary: {
    awaitingFinalCount: 3,
    nextBestMove: "Use each row messageBlock plus codexDraftPath as a review aid; collect clean final response files only.",
  },
};

const requestBundle = {
  status: "department_review_request_bundle_ready_to_collect_final_responses_no_live_changes",
  requestsDir: "/tmp/mailerlite_mini_launch_department_review_requests_inteligencia_descansar_2026-05-27",
  summary: {
    requestCount: 3,
    awaitingFinalCount: 3,
    nextBestMove: "Send or route these local request texts to Brand, Web Design and CRM; collect clean final JSON responses only.",
  },
};

const responseWatcher = {
  status: "department_review_response_watcher_waiting_final_responses_no_live_changes",
  summary: {
    missingFinalCount: 3,
    finalFilePresentCount: 0,
    nextBestMove: "Keep collecting final response files for: brand, web_design, crm.",
  },
};

const acceptedReconciliationBoard = {
  ...reconciliationBoard,
  status: "department_review_reconciliation_ready_no_live_changes",
  responseState: {
    pendingDepartments: [],
  },
};

const acceptedPacketsIndex = {
  ...packetsIndex,
  pendingDepartments: [],
};

const acceptedResponseWorkspace = {
  ...responseWorkspace,
  status: "department_review_response_workspace_ready_final_responses_accepted_no_live_changes",
  readyForIntake: true,
  pendingDepartments: [],
};

const acceptedFinalizationPreflight = {
  ...finalizationPreflight,
  status: "department_finalization_preflight_ready_for_intake_no_live_changes",
  readyForIntake: true,
  acceptedDepartments: ["brand", "web_design", "crm"],
  pendingReadyDepartments: [],
  draftAssistDepartments: [],
  awaitingDepartments: [],
  departments: finalizationPreflight.departments.map((department) => ({
    ...department,
    state: "final_response_accepted",
    acceptedFinalResponse: true,
    pendingCanBecomeFinal: false,
    codexDraftAvailable: false,
  })),
};

const acceptedOperatorQueue = {
  ...operatorQueue,
  status: "department_review_operator_queue_final_responses_accepted_no_live_changes",
  summary: {
    awaitingFinalCount: 0,
    nextBestMove: "Department finals accepted; use approval queue for the next human boundary.",
  },
};

const acceptedRequestBundle = {
  ...requestBundle,
  status: "department_review_request_bundle_historical_no_live_changes",
  summary: {
    ...requestBundle.summary,
    awaitingFinalCount: 0,
    nextBestMove: "Historical request bundle only; do not collect duplicate final responses.",
  },
};

const acceptedResponseWatcher = {
  ...responseWatcher,
  status: "department_review_response_watcher_final_responses_present_no_live_changes",
  summary: {
    missingFinalCount: 0,
    finalFilePresentCount: 3,
    nextBestMove: "Final responses are present; proceed through approval queue only.",
  },
};

const validationReceipt = {
  status: "mailerlite_launch_os_validation_receipt_ready_no_live_changes",
  validationStatus: "passed",
  validationSummary: "47 MailerLite files / 269 tests passed",
  testScope: {
    testFiles: 47,
    testCount: 269,
  },
  evidence: {
    liveGatesClosed: true,
  },
};

const approvalQueue = {
  status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
  executiveSummary: {
    readyApprovalRequestCount: 5,
    blockedApprovalRequestCount: 2,
    openLiveMutationGateCount: 0,
    nextBestHumanBoundary: "mini_launch_empty_group_creation",
    readyApprovalIds: [
      "mini_launch_empty_group_creation",
      "onboarding_v2_empty_group_creation",
      "mini_launch_email_asset_build",
      "shopify_no_live_local_build",
      "brujula_email1_builder_draft",
    ],
    blockedApprovalIds: [
      "mini_launch_seed_send",
      "crm_signal_writes",
    ],
  },
};

const approvalIntake = {
  status: "waiting_for_exact_approval_text_no_live_changes",
  executiveSummary: {
    approvalTextProvided: false,
    matchedApprovalCount: 0,
    matchedApprovalId: null,
    canProceedToFreshEvidence: false,
    executionAllowedNow: false,
    openLiveMutationGateCount: 0,
  },
};

const blockedGateHandoff = {
  status: "blocked_gate_handoff_ready_no_live_changes",
  executiveSummary: {
    readyApprovalCount: 0,
    blockedGateCount: 2,
    canAskApprovalNow: false,
    inputNeededCount: 5,
    openLiveMutationGateCount: 0,
    safeToIntakeOneMoreNoLiveIdea: true,
    nextBestHumanAction: "supply_missing_inputs_before_any_new_approval_phrase",
  },
  blockedGates: [
    { id: "mini_launch_seed_send" },
    { id: "crm_signal_writes" },
  ],
  inputNeededNow: [
    { id: "exact_seed_recipient", gateId: "mini_launch_seed_send" },
    { id: "real_observed_events_file", gateId: "crm_signal_writes" },
    { id: "exact_people", gateId: "crm_signal_writes" },
    { id: "writable_event_screen", gateId: "crm_signal_writes" },
    { id: "fact_store_market_review", gateId: "crm_signal_writes" },
  ],
};

const missingInputsKit = {
  status: "missing_inputs_kit_ready_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    seedInputCount: 1,
    crmInputCount: 4,
    privateInputCount: 3,
    canAskApprovalNow: false,
    kitCreatesPrivateFiles: false,
    kitAsksApproval: false,
    openLiveMutationGateCount: 0,
    nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
  },
  inputRequests: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
  postInputCommands: [
    "seed",
    "crm",
    "handoff",
    "runbook",
    "audit",
    "validation",
  ],
};

const missingInputsIntake = {
  status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    presentInputCount: 0,
    readyInputCount: 0,
    blockerIds: [
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
    ],
    readyForSeedApprovalPacket: false,
    readyForCrmWritePacketRegeneration: false,
    readyForCrmApprovalRequest: false,
    factStoreReviewReady: false,
    fullPrivateValuesStoredInReport: false,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
    nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
  },
  inputStates: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
};

const missingInputsRequestBundle = {
  status: "missing_inputs_request_bundle_ready_no_live_changes",
  executiveSummary: {
    requestCount: 5,
    inputCount: 5,
    readyInputCount: 0,
    requestIds: [
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
    ],
    copyBlocksReady: true,
    createsPrivateFiles: false,
    asksApproval: false,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
    nextHumanAction: "supply_requested_inputs_only_not_approval",
    nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
  },
  requests: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
};

const privateInputTemplatePack = {
  status: "private_input_template_pack_ready_no_live_changes",
  executiveSummary: {
    templateCount: 5,
    exampleFileCount: 2,
    writeExamples: true,
    examplesDir: "/tmp/examples",
    activePathCollisionCount: 0,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
    nextSafeAction: "copy_real_values_into_active_private_paths_only_when_they_exist",
  },
  templateRows: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
  safety: {
    createsActivePrivateInputFiles: false,
    writesRealPrivateValues: false,
  },
};

const taxonomyConsolidationAudit = {
  status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
  executiveSummary: {
    liveEvidenceGroupCount: 19,
    brandPromotionNeededCount: 14,
    crmManifestRefreshNeededCount: 14,
    allLiveEvidencePromotedInBrandDictionary: false,
    allLiveEvidenceHasCrmLiveIds: false,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
    nextSafeAction: "prepare_local_dictionary_and_manifest_refresh_from_live_execution_receipts",
  },
};

const taxonomyRefreshHandoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  executiveSummary: {
    brandPromotionDecisionCount: 14,
    crmManifestPatchCount: 14,
    handoffItemCount: 28,
    canAskApprovalNow: false,
    canApplyBrandDictionaryPatchNow: false,
    canApplyCrmManifestPatchNow: false,
    openLiveMutationGateCount: 0,
    nextSafeAction: "route_taxonomy_handoff_to_brand_and_crm_for_semantic_decision_no_live_changes",
  },
};

const continuationGuard = {
  status: "mailerlite_launch_os_continuation_guard_ready_no_live_changes",
  executiveSummary: {
    allTrackedBoundariesClosed: true,
    closedBoundaryCount: 8,
    trackedBoundaryCount: 8,
    oldUiWorkClosed: true,
    activeInputCount: 5,
    recycledActionBlockCount: 5,
    openLiveMutationGateCount: 0,
    nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
    uiWorkAction: "do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch",
  },
  closedBoundaries: [
    { id: "mini_launch_manual_ui_draft_build", closed: true },
    { id: "mini_launch_manual_ui_draft_repair", closed: true },
    { id: "brujula_email1_manual_ui_draft_build", closed: true },
    { id: "brujula_real_mailerlite_render_qa", closed: true },
    { id: "mini_launch_empty_group_creation", closed: true },
    { id: "onboarding_v2_empty_group_creation", closed: true },
    { id: "shopify_no_live_local_build", closed: true },
    { id: "department_final_response_collection", closed: true },
  ],
  activeInputs: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
  recycledActionBlocks: [
    { id: "do_not_reopen_closed_mailerlite_ui_drafts" },
    { id: "do_not_rerun_empty_group_execute_for_existing_targets" },
    { id: "do_not_request_seed_send_approval_without_seed_recipient" },
    { id: "do_not_request_crm_write_approval_without_real_events_and_people" },
    { id: "do_not_treat_approval_packets_as_execution" },
  ],
};

const miniLaunchEmptyGroupCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  mode: "dry_run",
  freshScan: {
    groupsRead: 75,
    targetGroupsExistingCount: 0,
    targetGroupsMissingCount: 2,
  },
  decision: {
    canExecute: false,
  },
  createdGroups: [],
};

const onboardingHandoffPolicy = {
  status: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
};

const onboardingV2Execution = {
  status: "ready_for_human_decision_or_non_live_continuation",
};

const onboardingV2EventContract = {
  status: "onboarding_v2_event_contract_ready_no_ledger_write",
};

const onboardingV2EmptyGroupsPacket = {
  status: "ready_for_exact_human_approval_to_create_empty_groups",
  sourceEvidence: {
    targetGroupCount: 12,
    liveGroupsRead: 75,
    liveAutomationsRead: 13,
  },
  approvalGate: {
    canAskAlejandroForApproval: true,
  },
  blockers: [],
};

const onboardingV2EmptyGroupsCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  packetSummary: {
    targetCount: 12,
    liveGroupsRead: 75,
    liveAutomationsRead: 13,
    blockers: [],
  },
  createdGroups: [],
};

const onboardingV2EmptyGroupsExecution = {
  status: "executed_onboarding_v2_empty_group_creation",
  mode: "execute_requested",
  decision: {
    approval: {
      status: "exact_approval_phrase_matched",
    },
  },
  createdGroups: Array.from({ length: 12 }, (_value, index) => ({
    name: `CC · Onboarding v2 group ${index + 1}`,
  })),
  safety: {
    groupMutationType: "create_empty_groups_only",
    workflowMutationsPerformed: false,
    subscriberRowsRead: false,
    subscriberAssignmentsPerformed: false,
    sendsPerformed: false,
  },
};

const onboardingV2EmptyGroupsPostExecutionVerify = {
  status: "dry_run_blocked",
  mode: "dry_run",
  packetSummary: {
    targetCount: 12,
    liveGroupsRead: 89,
    liveAutomationsRead: 13,
    blockers: Array.from({ length: 12 }, (_value, index) =>
      `CC · Onboarding v2 group ${index + 1}:already_exists_in_fresh_scan`),
  },
  decision: {
    targetPlan: Array.from({ length: 12 }, (_value, index) => ({
      name: `CC · Onboarding v2 group ${index + 1}`,
      existsInFreshScan: true,
    })),
  },
  createdGroups: [],
  safety: {
    mode: "dry_run_only",
    groupMutationsPerformed: false,
    workflowMutationsPerformed: false,
    subscriberRowsRead: false,
    sendsPerformed: false,
  },
};

const onboardingV2FirstEmailMap = {
  status: "first_email_mapping_ready_no_sent_receipt",
  firstEmail: {
    subject: "{$name}, Tu primera nota de mi parte ✍🏻",
  },
  decision: {
    recommendedPosture: "welcome_orientation_no_sent_receipt",
    recommendedMailerLiteSentGroup: null,
    createNewSentGroup: false,
  },
  v2ImplementationGuidance: {
    crmSignals: [
      {
        event: "journey_welcome_sent",
      },
    ],
  },
};

const onboardingV1Audit = {
  workflow: {
    id: "154049547088167956",
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
    emailsCount: 11,
  },
  migrationRecommendation: {
    option: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
};

const onboardingTrunkMap = {
  status: "onboarding_trunk_map_ready_no_live_changes",
  executiveSummary: {
    sequenceItems: 11,
    futureHandoffTarget: "CC · Journey · Editorial onboarding · Eligible",
    recommendationIsRouting: false,
  },
};

const brujulaPlan = {
  localEvidence: {
    emailStyle: {
      brujulaCurrentAntiEvidence: true,
    },
    brujulaState: {
      currentWorkflowOffOrIncomplete: true,
    },
  },
};

const brujulaApply = {
  assignedGroups: [
    { name: "CC · Source · Resource · Brújula" },
    { name: "CC · Delivered · Guide · Brújula" },
  ],
};

const brujulaEmailStyleQa = {
  status: "brujula_email_style_qa_yellow_no_live_changes",
  executiveSummary: {
    functionalStatus: "green_test_delivery_verified",
    creativeStatus: "yellow_needs_email_style_alignment",
    blockerCount: 4,
    publicUseReady: false,
  },
};

const brujulaEmailStyleCorrection = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  executiveSummary: {
    publicUseReady: false,
    testSendReady: false,
  },
  outputs: {
    htmlPath: "/tmp/mailerlite_brujula_email1_corrected_draft_2026-05-27.html",
  },
};

const brujulaEmailRenderQa = {
  status: "brujula_email1_local_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    renderPreviewNonEmpty: true,
    publicUseReady: false,
    testSendReady: false,
  },
  renderPreview: {
    path: "/tmp/render/mailerlite_brujula_email1_corrected_draft_2026-05-27.html.png",
    status: "rendered",
    fileSizeBytes: 56000,
  },
};

const brujulaEmailManualUiBuildReceipt = {
  status: "brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends",
  ok: true,
  scope: {
    approvedScopeId: "brujula_email1_builder_draft",
    exactApprovalMatched: true,
    stillClosed: [
      "send_email_or_test_email",
      "cards_scoring_or_fact_store_writes",
    ],
  },
  campaign: {
    id: "188677585118430654",
    name: "Brújula · Email 1 corregido · Aquí está La Brújula de Claridad",
    status: "draft",
    subject: "Aquí está La Brújula de Claridad",
    preheader: "Una práctica breve para mirar una decisión con más calma.",
    recipientsSelected: false,
    groupsOrSegmentsSelected: false,
    scheduled: false,
    sent: false,
  },
  verification: {
    postExecutionApiVerify: {
      status: "post_ui_paste_verify_green",
      targetInDraft: true,
      targetInReadyOutbox: false,
      targetInSent: false,
      readyOutboxCampaignsRead: 0,
      contentChecks: {
        hasTitle: true,
        hasGreeting: true,
      },
    },
  },
  safety: {
    sendsPerformed: false,
    schedulesPerformed: false,
    publicCampaignPublished: false,
    subscriberMutationsPerformed: false,
    groupsCreated: false,
    groupAssignmentsPerformed: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const miniLaunchEmailStyleQaPacket = {
  status: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
  executiveSummary: {
    hardBlockerCount: 0,
    yellowCheckCount: 4,
  },
  approvalGate: {
    readyForLocalAssetPlanNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
};

const miniLaunchLocalEmailAssetPlan = {
  status: "mini_launch_local_email_asset_plan_ready_no_live_changes",
  executiveSummary: {
    assetCount: 4,
    placeholderCount: 4,
  },
  approvalBoundary: {
    readyForExactAssetBuildScopeRequestNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
  },
};

const miniLaunchEmailAssetBuildScopePacket = {
  status: "email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    assetCount: 4,
    inertUrlPlaceholderCount: 3,
    replyCtaCount: 1,
    readyForSeedSendNow: false,
  },
  requestedFutureScope: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteBuildNow: false,
  },
};

const miniLaunchEmailBuilderPayloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  executiveSummary: {
    payloadCount: 4,
    contentBlockCount: 32,
    inertUrlPlaceholderCount: 3,
    replyCtaCount: 1,
    canExecuteBuilderNow: false,
  },
  approvalBoundary: {
    canSendNow: false,
    manifestIsApprovalByItself: false,
  },
};

const miniLaunchEmailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    emailCount: 4,
    htmlWrittenCount: 4,
    renderPreviewNonEmptyCount: 4,
    localRenderReady: true,
    publicUseReady: false,
    mailerLiteBuilderReady: false,
    seedSendReady: false,
  },
};

const miniLaunchEmailManualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  draftReceipts: [
    { status: "draft_visible_in_mailerlite_drafts", uiVisibleInDrafts: true },
    { status: "draft_visible_in_mailerlite_drafts", uiVisibleInDrafts: true },
    { status: "draft_visible_in_mailerlite_drafts", uiVisibleInDrafts: true },
    { status: "draft_visible_in_mailerlite_drafts", uiVisibleInDrafts: true },
  ],
  uiEvidence: {
    mailerLiteAccountPlanObserved: "Growing Business",
    editorRoute: {
      usedEditor: "new_simple_editor",
      customHtmlEditorStatus: "premium_upgrade_locked_on_growing_business",
    },
    futurePolicy: {
      currentRoute: "manual_ui_for_mailerlite_draft_creation",
    },
  },
  safety: {
    sendsPerformed: false,
    schedulesCreated: false,
    subscribersReadOrAssigned: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
  stillClosedAfterThisReceipt: ["seed_send_or_test_send"],
};

const miniLaunchCrmWriteApprovalPacket = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    exactEventCountReady: 0,
    exactPersonCountReady: 0,
    candidateWriteFamilyCount: 4,
    writePolicyPacketReady: true,
    operationsExecuted: 0,
  },
  policyEffect: {
    consumedPolicyPacket: true,
    resolvedPolicyBlockers: [
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
    ],
    policyBlockersStillOpen: [],
  },
  approvalBoundary: {
    canAskAlejandroForApproval: false,
    blockersBeforeApprovalRequest: [
      "real_observed_event_file_missing",
      "exact_person_identity_missing",
    ],
  },
};

const miniLaunchShopifyLocalBuildReceipt = {
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  shopifyRepo: {
    localFilesCreatedOrUpdated: 5,
  },
  placeholders: {
    present: true,
    inert: true,
  },
  validation: {
    jsonTemplatesParsed: true,
    noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles: true,
    noMailerLiteScriptsFoundInNewFiles: true,
    noShopifyAdminApiOrPublishCommandRun: true,
    noRealFormAction: true,
    noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles: true,
  },
  safety: {
    shopifyApiCalled: false,
    shopifyPublishPerformed: false,
    realFormsCreated: false,
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
  },
};

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-mini-launch-path-packet": "node scripts/path.mjs",
    "crm:vnext:mailerlite-mini-launch-v0-packet": "node scripts/os.mjs",
    "crm:vnext:mailerlite-mini-launch-rehearsal-packet": "node scripts/rehearsal.mjs",
    "crm:vnext:mailerlite-mini-launch-event-contract": "node scripts/event.mjs",
    "crm:vnext:mailerlite-mini-launch-onboarding-handoff-policy": "node scripts/handoff.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-test-qa-packet": "node scripts/seed.mjs",
    "crm:vnext:mailerlite-mini-launch-group-dry-run": "node scripts/group.mjs",
    "crm:vnext:mailerlite-mini-launch-empty-group-creation-packet": "node scripts/empty-group-approval.mjs",
    "crm:vnext:mailerlite-mini-launch-email-style-qa-packet": "node scripts/email-style-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-local-email-asset-plan": "node scripts/local-email-asset-plan.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet": "node scripts/email-asset-build-scope.mjs",
    "crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest": "node scripts/email-builder-payload-manifest.mjs",
    "crm:vnext:mailerlite-mini-launch-email-render-qa-packet": "node scripts/email-render-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-builder-packet": "node scripts/email-manual-ui-builder-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-execution-kit": "node scripts/email-manual-ui-execution-kit.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-build-receipt": "node scripts/email-manual-ui-build-receipt.mjs",
    "crm:vnext:mailerlite-mini-launch-crm-write-approval-packet": "node scripts/crm-write-approval.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-packets": "node scripts/packets.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-intake": "node scripts/intake.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-reconciliation": "node scripts/reconciliation.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-delivery-pack": "node scripts/delivery.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-response-workspace": "node scripts/response-workspace.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-draft-assist": "node scripts/draft-assist.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-operator-queue": "node scripts/operator-queue.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-request-bundle": "node scripts/request-bundle.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-response-watcher": "node scripts/response-watcher.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-finalization-preflight": "node scripts/finalization-preflight.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-finalize-pending": "node scripts/finalize-pending.mjs",
    "crm:vnext:mailerlite-mini-launch-backlog-board": "node scripts/backlog.mjs",
    "crm:vnext:mailerlite-launch-os-approval-queue": "node scripts/approval-queue.mjs",
    "crm:vnext:mailerlite-launch-os-approval-intake": "node scripts/approval-intake.mjs",
    "crm:vnext:mailerlite-launch-os-blocked-gate-handoff": "node scripts/blocked-gate-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-kit": "node scripts/missing-inputs-kit.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-intake": "node scripts/missing-inputs-intake.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle": "node scripts/missing-inputs-request-bundle.mjs",
    "crm:vnext:mailerlite-launch-os-private-input-template-pack": "node scripts/private-input-template-pack.mjs",
    "crm:vnext:mailerlite-launch-os-post-input-orchestrator": "node scripts/post-input-orchestrator.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit": "node scripts/taxonomy-consolidation-audit.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-handoff": "node scripts/taxonomy-refresh-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-continuation-guard": "node scripts/continuation-guard.mjs",
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-launch-os-validation-receipt": "node scripts/validation-receipt.mjs",
    "crm:vnext:mailerlite-onboarding-v1-audit": "node scripts/v1.mjs",
    "crm:vnext:mailerlite-onboarding-v2-design-packet": "node scripts/v2-design.mjs",
    "crm:vnext:mailerlite-onboarding-v2-empty-groups-packet": "node scripts/v2-groups.mjs",
    "crm:vnext:mailerlite-onboarding-v2-empty-groups-create": "node scripts/v2-groups-create.mjs",
    "crm:vnext:mailerlite-onboarding-v2-execution-packet": "node scripts/v2-exec.mjs",
    "crm:vnext:mailerlite-onboarding-v2-event-contract": "node scripts/v2-event.mjs",
    "crm:vnext:mailerlite-onboarding-trunk-map": "node scripts/onboarding-trunk-map.mjs",
    "crm:vnext:mailerlite-brujula-test-lane-plan": "node scripts/brujula-plan.mjs",
    "crm:vnext:mailerlite-brujula-test-lane-apply": "node scripts/brujula-apply.mjs",
    "crm:vnext:mailerlite-brujula-email-style-qa-packet": "node scripts/brujula-email-style-qa.mjs",
    "crm:vnext:mailerlite-brujula-email-style-correction-packet": "node scripts/brujula-email-style-correction.mjs",
    "crm:vnext:mailerlite-brujula-email-render-qa-packet": "node scripts/brujula-email-render-qa.mjs",
    "test": "vitest run",
  },
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite-launch-os-v0-control-room.md",
    present: true,
    chars: 1000,
    consultedFor: "current operator state and gate map",
  },
];

describe("CRM vNext MailerLite Launch OS operator runbook", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/runbook.json",
      "--markdown-out",
      "/tmp/runbook.md",
    ]);

    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.readinessBoard).toContain("mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.cadenceBoard).toContain("mailerlite_mini_launch_cadence_board_2026-05-27.json");
    expect(parsed.backlogBoard).toContain("mailerlite_mini_launch_backlog_board_2026-05-28.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.reconciliationBoard).toContain("mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json");
    expect(parsed.deliveryPack).toContain("mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWorkspace).toContain("mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(parsed.finalizationPreflight).toContain("mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(parsed.operatorQueue).toContain("mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json");
    expect(parsed.requestBundle).toContain("mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWatcher).toContain("mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json");
    expect(parsed.brujulaEmailStyleQa).toContain("mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(parsed.brujulaEmailStyleCorrection).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.brujulaEmailRenderQa).toContain("mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(parsed.approvalQueue).toContain("mailerlite_launch_os_approval_queue_2026-05-28.json");
    expect(parsed.blockedGateHandoff).toContain("mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json");
    expect(parsed.missingInputsKit).toContain("mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(parsed.missingInputsIntake).toContain("mailerlite_launch_os_missing_inputs_intake_2026-05-28.json");
    expect(parsed.missingInputsRequestBundle).toContain("mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json");
    expect(parsed.privateInputTemplatePack).toContain("mailerlite_launch_os_private_input_template_pack_2026-05-28.json");
    expect(parsed.taxonomyConsolidationAudit).toContain("mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json");
    expect(parsed.taxonomyRefreshHandoff).toContain("mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json");
    expect(parsed.continuationGuard).toContain("mailerlite_launch_os_continuation_guard_2026-05-28.json");
    expect(parsed.validationReceipt).toContain("mailerlite_launch_os_validation_receipt_2026-05-28.json");
    expect(parsed.onboardingTrunkMap).toContain("mailerlite_onboarding_trunk_map_2026-05-27.json");
    expect(parsed.onboardingV2EventContract).toContain("mailerlite_onboarding_v2_event_contract_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsExecution).toContain("mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json");
    expect(parsed.onboardingV2EmptyGroupsCreateDryRun).toContain("mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json");
    expect(parsed.onboardingV2FirstEmailMap).toContain("mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(parsed.miniLaunchEmailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchLocalEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildScopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailRenderQa).toContain("mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailManualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchCrmWriteApprovalPacket).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyLocalBuildReceipt).toContain("mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/runbook.json");
    expect(parsed.markdownOut).toBe("/tmp/runbook.md");
  });

  test("builds command catalog from package scripts", () => {
    const catalog = commandCatalogFrom(packageJson);

    expect(catalog.map((entry) => entry.name)).toContain("crm:vnext:mailerlite-mini-launch-department-review-reconciliation");
    expect(catalog.map((entry) => entry.name)).toContain("crm:vnext:mailerlite-onboarding-trunk-map");
    expect(catalog.find((entry) => entry.name === "crm:vnext:mailerlite-brujula-test-lane-apply")).toMatchObject({
      liveRisk: "guarded_live_or_live_adjacent_requires_exact_approval",
    });
    expect(catalog.every((entry) => entry.name.startsWith("crm:vnext:mailerlite"))).toBe(true);
  });

  test("summarizes current state with onboarding protected and live gates closed", () => {
    const state = buildCurrentState({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailManualUiBuildReceipt,
      miniLaunchCrmWriteApprovalPacket,
      miniLaunchShopifyLocalBuildReceipt,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      blockedGateHandoff,
      missingInputsKit,
      missingInputsIntake,
      missingInputsRequestBundle,
      privateInputTemplatePack,
      taxonomyConsolidationAudit,
      taxonomyRefreshHandoff,
      continuationGuard,
      validationReceipt,
      responseWorkspace,
      finalizationPreflight,
      operatorQueue,
      requestBundle,
      responseWatcher,
    });

    expect(state.onboarding.productionV1Protected).toBe(true);
    expect(state.onboarding.productionV1Workflow.name).toBe("Onboarding flow");
    expect(state.onboarding.v2EventContractStatus).toBe("onboarding_v2_event_contract_ready_no_ledger_write");
    expect(state.onboarding.v2EmptyGroupsPacketStatus).toBe("ready_for_exact_human_approval_to_create_empty_groups");
    expect(state.onboarding.v2EmptyGroupsTargetCount).toBe(12);
    expect(state.onboarding.v2EmptyGroupsLiveGroupsRead).toBe(75);
    expect(state.onboarding.v2EmptyGroupsLiveAutomationsRead).toBe(13);
    expect(state.onboarding.v2EmptyGroupsCanAskApproval).toBe(true);
    expect(state.onboarding.v2EmptyGroupsBlockerCount).toBe(0);
    expect(state.onboarding.v2EmptyGroupsCreateDryRunStatus).toBe("dry_run_ready_for_exact_approval");
    expect(state.onboarding.v2EmptyGroupsCreateDryRunCreatedCount).toBe(0);
    expect(state.onboarding.v2EmptyGroupsCreateDryRunBlockerCount).toBe(0);
    expect(state.onboarding.v2FirstEmailMapStatus).toBe("first_email_mapping_ready_no_sent_receipt");
    expect(state.onboarding.v2FirstEmailRecommendedPosture).toBe("welcome_orientation_no_sent_receipt");
    expect(state.onboarding.v2FirstEmailRecommendedSentGroup).toBe(null);
    expect(state.onboarding.v2FirstEmailCreateNewSentGroup).toBe(false);
    expect(state.onboarding.v2FirstEmailCrmSignal).toBe("journey_welcome_sent");
    expect(state.onboarding.trunkMapStatus).toBe("onboarding_trunk_map_ready_no_live_changes");
    expect(state.onboarding.trunkMapSequenceItems).toBe(11);
    expect(state.onboarding.trunkMapFutureHandoffTarget).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(state.onboarding.trunkMapRecommendationIsRouting).toBe(false);
    expect(state.brujulaPilot.functionalStatus).toBe("test_delivery_verified_creative_qa_pending");
    expect(state.brujulaPilot.emailStyleQaStatus).toBe("brujula_email_style_qa_yellow_no_live_changes");
    expect(state.brujulaPilot.emailStyleQaBlockerCount).toBe(4);
    expect(state.brujulaPilot.emailStyleQaPublicUseReady).toBe(false);
    expect(state.brujulaPilot.emailStyleCorrectionStatus).toBe("brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes");
    expect(state.brujulaPilot.correctedDraftHtmlPath).toContain("corrected_draft");
    expect(state.brujulaPilot.correctedDraftTestSendReady).toBe(false);
    expect(state.brujulaPilot.emailRenderQaStatus).toBe("brujula_email1_local_render_qa_green_no_live_changes");
    expect(state.brujulaPilot.localRenderReady).toBe(true);
    expect(state.brujulaPilot.localRenderPreviewNonEmpty).toBe(true);
    expect(state.brujulaPilot.localRenderPreviewPath).toContain("render");
    expect(state.brujulaPilot.localRenderPreviewSize).toBe(56000);
    expect(state.miniLaunch.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(state.miniLaunch.emailStyleQaPacketStatus).toBe("mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes");
    expect(state.miniLaunch.emailStyleQaReadyForLocalAssetPlan).toBe(true);
    expect(state.miniLaunch.emailStyleQaReadyForMailerLiteBuild).toBe(false);
    expect(state.miniLaunch.emailStyleQaReadyForSeedSend).toBe(false);
    expect(state.miniLaunch.emailStyleQaHardBlockerCount).toBe(0);
    expect(state.miniLaunch.emailStyleQaYellowCheckCount).toBe(4);
    expect(state.miniLaunch.localEmailAssetPlanStatus).toBe("mini_launch_local_email_asset_plan_ready_no_live_changes");
    expect(state.miniLaunch.localEmailAssetPlanReady).toBe(true);
    expect(state.miniLaunch.localEmailAssetPlanAssetCount).toBe(4);
    expect(state.miniLaunch.localEmailAssetPlanPlaceholderCount).toBe(4);
    expect(state.miniLaunch.localEmailAssetPlanReadyForExactBuildScopeRequest).toBe(true);
    expect(state.miniLaunch.localEmailAssetPlanReadyForMailerLiteBuild).toBe(false);
    expect(state.miniLaunch.localEmailAssetPlanReadyForSeedSend).toBe(false);
    expect(state.miniLaunch.emailAssetBuildScopePacketStatus).toBe("email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes");
    expect(state.miniLaunch.emailAssetBuildScopePacketReady).toBe(true);
    expect(state.miniLaunch.emailAssetBuildScopeAssetCount).toBe(4);
    expect(state.miniLaunch.emailAssetBuildScopePlaceholderCount).toBe(3);
    expect(state.miniLaunch.emailAssetBuildScopeReplyCtaCount).toBe(1);
    expect(state.miniLaunch.emailAssetBuildScopeCanAskApproval).toBe(true);
    expect(state.miniLaunch.emailAssetBuildScopePacketIsApprovalByItself).toBe(false);
    expect(state.miniLaunch.emailAssetBuildScopeCanExecuteBuildNow).toBe(false);
    expect(state.miniLaunch.emailBuilderPayloadManifestStatus).toBe("email_builder_payload_manifest_ready_no_live_changes");
    expect(state.miniLaunch.emailBuilderPayloadManifestReady).toBe(true);
    expect(state.miniLaunch.emailBuilderPayloadManifestPayloadCount).toBe(4);
    expect(state.miniLaunch.emailBuilderPayloadManifestContentBlockCount).toBe(32);
    expect(state.miniLaunch.emailBuilderPayloadManifestPlaceholderCount).toBe(3);
    expect(state.miniLaunch.emailBuilderPayloadManifestReplyCtaCount).toBe(1);
    expect(state.miniLaunch.emailBuilderPayloadManifestCanExecuteBuilderNow).toBe(false);
    expect(state.miniLaunch.emailRenderQaStatus).toBe("mini_launch_email_render_qa_green_no_live_changes");
    expect(state.miniLaunch.emailRenderQaLocalRenderReady).toBe(true);
    expect(state.miniLaunch.emailRenderQaEmailCount).toBe(4);
    expect(state.miniLaunch.emailRenderQaRenderPreviewNonEmptyCount).toBe(4);
    expect(state.miniLaunch.emailManualUiBuildReceiptStatus).toBe("manual_ui_build_receipt_executed_drafts_created_no_sends");
    expect(state.miniLaunch.emailManualUiDraftVisibleCount).toBe(4);
    expect(state.miniLaunch.emailManualUiBuildClosed).toBe(true);
    expect(state.miniLaunch.emailManualUiPlanObserved).toBe("Growing Business");
    expect(state.miniLaunch.emailManualUiUsedEditor).toBe("new_simple_editor");
    expect(state.miniLaunch.emailManualUiCustomHtmlStatus).toBe("premium_upgrade_locked_on_growing_business");
    expect(state.miniLaunch.emailManualUiCurrentRoute).toBe("manual_ui_for_mailerlite_draft_creation");
    expect(state.miniLaunch.emailManualUiSeedSendStillClosed).toBe(true);
    expect(state.miniLaunch.crmWriteApprovalPacketStatus).toBe("crm_write_approval_packet_blocked_missing_observed_events_no_live_changes");
    expect(state.miniLaunch.crmWriteApprovalCanAskApproval).toBe(false);
    expect(state.miniLaunch.crmWriteApprovalExactEventCount).toBe(0);
    expect(state.miniLaunch.crmWriteApprovalExactPersonCount).toBe(0);
    expect(state.miniLaunch.crmWriteApprovalCandidateFamilyCount).toBe(4);
    expect(state.miniLaunch.crmWriteApprovalBlockers).toContain("real_observed_event_file_missing");
    expect(state.miniLaunch.crmWritePolicyPacketReady).toBe(true);
    expect(state.miniLaunch.crmWritePolicyPacketConsumed).toBe(true);
    expect(state.miniLaunch.crmWritePolicyResolvedBlockers).toContain("card_write_policy_packet_missing");
    expect(state.miniLaunch.crmWritePolicyOpenBlockers).toEqual([]);
    expect(state.miniLaunch.shopifyLocalBuildReceiptStatus).toBe("shopify_local_build_receipt_executed_files_created_no_live_changes");
    expect(state.miniLaunch.shopifyLocalBuildFileCount).toBe(5);
    expect(state.miniLaunch.shopifyLocalBuildClosed).toBe(true);
    expect(state.miniLaunch.shopifyLocalBuildNoPublish).toBe(true);
    expect(state.miniLaunch.shopifyLocalBuildNoApi).toBe(true);
    expect(state.miniLaunch.shopifyLocalBuildNoRealForms).toBe(true);
    expect(state.miniLaunch.onboardingHandoffPolicyStatus).toBe("mini_launch_onboarding_handoff_policy_ready_no_live_changes");
    expect(state.miniLaunch.onboardingHandoffTargetGroup).toBe("CC · Journey · Editorial onboarding · Eligible");
    expect(state.miniLaunch.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(state.miniLaunch.responseWorkspaceStatus).toBe("department_review_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(state.miniLaunch.readyForResponseIntake).toBe(false);
    expect(state.miniLaunch.finalizationPreflightStatus).toBe("department_finalization_preflight_waiting_department_responses_no_live_changes");
    expect(state.miniLaunch.finalizationReadyForIntake).toBe(false);
    expect(state.miniLaunch.acceptedFinalDepartments).toEqual([]);
    expect(state.miniLaunch.draftAssistDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(state.miniLaunch.awaitingFinalDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(state.miniLaunch.operatorQueueStatus).toBe("department_review_operator_queue_waiting_final_responses_no_live_changes");
    expect(state.miniLaunch.operatorQueueAwaitingFinalCount).toBe(3);
    expect(state.miniLaunch.operatorQueueNextBestMove).toContain("collect clean final response files");
    expect(state.miniLaunch.requestBundleStatus).toBe("department_review_request_bundle_ready_to_collect_final_responses_no_live_changes");
    expect(state.miniLaunch.requestBundleRequestCount).toBe(3);
    expect(state.miniLaunch.requestBundleRequestsDir).toContain("department_review_requests");
    expect(state.miniLaunch.responseWatcherStatus).toBe("department_review_response_watcher_waiting_final_responses_no_live_changes");
    expect(state.miniLaunch.responseWatcherMissingFinalCount).toBe(3);
    expect(state.miniLaunch.responseWatcherFinalFilePresentCount).toBe(0);
    expect(state.miniLaunch.responseWatcherNextBestMove).toContain("brand, web_design, crm");
    expect(state.miniLaunch.departmentResponseStates).toContainEqual({
      department: "brand",
      state: "draft_assist_available_needs_department_review",
      acceptedFinalResponse: false,
      pendingCanBecomeFinal: false,
      codexDraftAvailable: true,
    });
    expect(state.validation).toMatchObject({
      receiptStatus: "mailerlite_launch_os_validation_receipt_ready_no_live_changes",
      validationStatus: "passed",
      testFiles: 47,
      testCount: 269,
      liveGatesClosed: true,
    });
    expect(state.liveGates).toMatchObject({
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
    });
    expect(state.blockedGateHandoff).toMatchObject({
      status: "blocked_gate_handoff_ready_no_live_changes",
      readyApprovalCount: 0,
      blockedGateCount: 2,
      canAskApprovalNow: false,
      inputNeededCount: 5,
      inputNeededIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
      blockedGateIds: ["mini_launch_seed_send", "crm_signal_writes"],
      openLiveMutationGateCount: 0,
    });
    expect(state.missingInputsKit).toMatchObject({
      status: "missing_inputs_kit_ready_no_live_changes",
      inputCount: 5,
      seedInputCount: 1,
      crmInputCount: 4,
      privateInputCount: 3,
      canAskApprovalNow: false,
      kitCreatesPrivateFiles: false,
      kitAsksApproval: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
      inputIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
      postInputCommandCount: 6,
    });
    expect(state.missingInputsIntake).toMatchObject({
      status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
      inputCount: 5,
      presentInputCount: 0,
      readyInputCount: 0,
      readyForSeedApprovalPacket: false,
      readyForCrmWritePacketRegeneration: false,
      readyForCrmApprovalRequest: false,
      factStoreReviewReady: false,
      fullPrivateValuesStoredInReport: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
      inputIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
      blockerIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
    });
    expect(state.missingInputsRequestBundle).toMatchObject({
      status: "missing_inputs_request_bundle_ready_no_live_changes",
      requestCount: 5,
      inputCount: 5,
      readyInputCount: 0,
      requestIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
      copyBlocksReady: true,
      createsPrivateFiles: false,
      asksApproval: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextHumanAction: "supply_requested_inputs_only_not_approval",
    });
    expect(state.privateInputTemplatePack).toMatchObject({
      status: "private_input_template_pack_ready_no_live_changes",
      templateCount: 5,
      exampleFileCount: 2,
      activePathCollisionCount: 0,
      createsActivePrivateInputFiles: false,
      writesRealPrivateValues: false,
    });
    expect(state.taxonomyConsolidationAudit).toMatchObject({
      status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
      liveEvidenceGroupCount: 19,
      brandPromotionNeededCount: 14,
      crmManifestRefreshNeededCount: 14,
      allLiveEvidencePromotedInBrandDictionary: false,
      allLiveEvidenceHasCrmLiveIds: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(state.taxonomyRefreshHandoff).toMatchObject({
      status: "taxonomy_refresh_handoff_ready_no_live_changes",
      brandPromotionDecisionCount: 14,
      crmManifestPatchCount: 14,
      handoffItemCount: 28,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
    });
    expect(state.continuationGuard).toMatchObject({
      status: "mailerlite_launch_os_continuation_guard_ready_no_live_changes",
      allTrackedBoundariesClosed: true,
      closedBoundaryCount: 8,
      trackedBoundaryCount: 8,
      oldUiWorkClosed: true,
      activeInputCount: 5,
      recycledActionBlockCount: 5,
      openLiveMutationGateCount: 0,
      nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
      uiWorkAction: "do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch",
      activeInputIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
        "exact_people",
        "writable_event_screen",
        "fact_store_market_review",
      ],
    });
  });

  test("closes Onboarding v2 empty-groups approval once execution and post-verify exist", () => {
    const state = buildCurrentState({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsExecution,
      onboardingV2EmptyGroupsCreateDryRun: onboardingV2EmptyGroupsPostExecutionVerify,
      onboardingV2FirstEmailMap,
    });

    expect(state.onboarding.v2EmptyGroupsLifecycleStatus).toBe("executed_and_verified_all_targets_exist_no_live_followup");
    expect(state.onboarding.v2EmptyGroupsExecutionStatus).toBe("executed_onboarding_v2_empty_group_creation");
    expect(state.onboarding.v2EmptyGroupsExecutedCount).toBe(12);
    expect(state.onboarding.v2EmptyGroupsExecutionApproved).toBe(true);
    expect(state.onboarding.v2EmptyGroupsPostExecutionAllExist).toBe(true);
    expect(state.onboarding.v2EmptyGroupsExistingTargetCount).toBe(12);
    expect(state.onboarding.v2EmptyGroupsLiveGroupsRead).toBe(89);
    expect(state.onboarding.v2EmptyGroupsCanAskApproval).toBe(false);
    expect(state.onboarding.v2EmptyGroupsBlockerCount).toBe(0);
    expect(state.onboarding.v2EmptyGroupsCreateDryRunStatus).toBe("dry_run_blocked");
    expect(state.onboarding.v2EmptyGroupsCreateDryRunBlockerCount).toBe(12);
    expect(state.onboarding.v2EmptyGroupsPostExecutionVerifyAlreadyExistsBlockerCount).toBe(12);
  });

  test("uses Brújula manual UI build receipt as current draft evidence", () => {
    const state = buildCurrentState({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      responseWorkspace,
      finalizationPreflight,
      operatorQueue,
      requestBundle,
      responseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailManualUiBuildReceipt,
      miniLaunchShopifyLocalBuildReceipt,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      brujulaEmailManualUiBuildReceipt,
      approvalQueue,
      validationReceipt,
    });

    expect(state.brujulaPilot.manualUiBuildReceiptStatus).toBe("brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends");
    expect(state.brujulaPilot.manualUiBuildClosed).toBe(true);
    expect(state.brujulaPilot.manualUiCampaignId).toBe("188677585118430654");
    expect(state.brujulaPilot.manualUiSubject).toBe("Aquí está La Brújula de Claridad");
    expect(state.brujulaPilot.manualUiOutboxCount).toBe(0);
  });

  test("approval matrix keeps all live operations behind explicit gates", () => {
    const matrix = buildApprovalMatrix();

    expect(matrix.find((gate) => gate.action === "create_mailerlite_groups")?.status).toBe("closed_until_exact_alejandro_approval");
    expect(matrix.find((gate) => gate.action === "mailerlite_email_asset_build")?.status).toBe("closed_until_exact_asset_build_scope_approval");
    expect(matrix.find((gate) => gate.action === "mailerlite_email_manual_ui_build")?.status).toBe("closed_after_approved_execution_reference_only");
    expect(matrix.find((gate) => gate.action === "mailerlite_email_builder_payload_manifest")?.status).toBe("allowed_no_live_local_payloads_only");
    expect(matrix.find((gate) => gate.action === "department_review_requests")?.status).toBe("allowed_no_live_review_only");
    expect(matrix.find((gate) => gate.action === "crm_signal_ledger_card_scoring_fact_store")?.status).toBe("closed_until_separate_crm_approval_packet");
  });

  test("codifies the onboarding trunk and mini-launch tributary contract", () => {
    const principles = buildOperatingPrinciples();

    expect(principles.map((principle) => principle.id)).toEqual([
      "protected_editorial_onboarding_trunk",
      "mini_launches_as_marked_entry_points",
      "deliberate_handoff_to_onboarding",
      "separate_delivery_identity_and_voice",
    ]);
    expect(principles.find((principle) => principle.id === "protected_editorial_onboarding_trunk")?.operatorRule).toContain("spaced article sequence");
    expect(principles.find((principle) => principle.id === "deliberate_handoff_to_onboarding")?.operatorRule).toContain("CC · Journey · Editorial onboarding · Eligible");
  });

  test("builds scenarios for current reviews, new ideas and onboarding", () => {
    const catalog = commandCatalogFrom(packageJson);
    const scenarios = buildOperatingScenarios({ commandCatalog: catalog });

    expect(scenarios.map((scenario) => scenario.id)).toEqual([
      "backlog_intake",
      "department_review_delivery",
      "department_response_workspace",
      "current_pilot_department_reviews",
      "after_brand_response",
      "approval_queue_review",
      "new_mini_launch_idea",
      "onboarding_v2_lane",
      "brujula_test_lane",
    ]);
    expect(scenarios.find((scenario) => scenario.id === "backlog_intake")?.commands.join(" ")).toContain("mini-launch-backlog-board");
    expect(scenarios.find((scenario) => scenario.id === "department_review_delivery")?.commands.join(" ")).toContain("department-review-delivery-pack");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-response-workspace");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-draft-assist");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-operator-queue");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-request-bundle");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-response-watcher");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-finalization-preflight");
    expect(scenarios.find((scenario) => scenario.id === "department_response_workspace")?.commands.join(" ")).toContain("department-review-finalize-pending");
    expect(scenarios.find((scenario) => scenario.id === "current_pilot_department_reviews")?.commands.join(" ")).toContain("department-review-reconciliation");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-empty-group-creation-packet");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-style-qa-packet");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-local-email-asset-plan");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-asset-build-scope-packet");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-builder-payload-manifest");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-manual-ui-builder-packet");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-manual-ui-execution-kit");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-email-manual-ui-build-receipt");
    expect(scenarios.find((scenario) => scenario.id === "after_brand_response")?.commands.join(" ")).toContain("mini-launch-crm-write-approval-packet");
    expect(scenarios.find((scenario) => scenario.id === "approval_queue_review")?.commands.join(" ")).toContain("launch-os-approval-queue");
    expect(scenarios.find((scenario) => scenario.id === "new_mini_launch_idea")?.commands.join(" ")).toContain("onboarding-handoff-policy");
    expect(scenarios.find((scenario) => scenario.id === "onboarding_v2_lane")?.commands.join(" ")).toContain("onboarding-v2-event-contract");
    expect(scenarios.find((scenario) => scenario.id === "onboarding_v2_lane")?.commands.join(" ")).toContain("onboarding-v2-empty-groups-create");
    expect(scenarios.find((scenario) => scenario.id === "onboarding_v2_lane")?.liveGatesRemainClosed).toContain("v1 edit");
    expect(scenarios.find((scenario) => scenario.id === "brujula_test_lane")?.commands.join(" ")).toContain("brujula-email-style-qa-packet");
    expect(scenarios.find((scenario) => scenario.id === "brujula_test_lane")?.commands.join(" ")).toContain("brujula-email-style-correction-packet");
    expect(scenarios.find((scenario) => scenario.id === "brujula_test_lane")?.commands.join(" ")).toContain("brujula-email-render-qa-packet");
  });

  test("builds runbook with command/scenario catalog and no live operations", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      responseWorkspace,
      finalizationPreflight,
      operatorQueue,
      requestBundle,
      responseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(runbook.status).toBe("mailerlite_launch_os_operator_runbook_ready_no_live_changes");
    expect(runbook.schemaVersion).toContain("trunk-contract");
    expect(runbook.commandCatalog.length).toBeGreaterThan(10);
    expect(runbook.operatingPrinciples).toHaveLength(4);
    expect(runbook.operatingScenarios).toHaveLength(9);
    expect(runbook.currentState.liveGates.openLiveGateCount).toBe(0);
    expect(runbook.currentState.approvalQueue.readyApprovalRequestCount).toBe(5);
    expect(runbook.currentState.approvalQueue.openLiveMutationGateCount).toBe(0);
    expect(runbook.immediateNextMoves[0]).toBe("Run no-live department reviews from the individual packets.");
    expect(runbook.reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(runbook.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("switches next moves to approval intake after final department responses are accepted", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard: acceptedReconciliationBoard,
      packetsIndex: acceptedPacketsIndex,
      responseWorkspace: acceptedResponseWorkspace,
      finalizationPreflight: acceptedFinalizationPreflight,
      operatorQueue: acceptedOperatorQueue,
      requestBundle: acceptedRequestBundle,
      responseWatcher: acceptedResponseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      approvalIntake,
      blockedGateHandoff,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    const movesText = runbook.immediateNextMoves.join("\n");

    expect(runbook.currentState.miniLaunch.pendingDepartments).toEqual([]);
    expect(runbook.currentState.miniLaunch.finalizationReadyForIntake).toBe(true);
    expect(runbook.currentState.miniLaunch.acceptedFinalDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(runbook.immediateNextMoves).toEqual(buildImmediateNextMoves({ currentState: runbook.currentState }));
    expect(movesText).toContain("Launch OS approval queue");
    expect(movesText).toContain("Launch OS approval intake");
    expect(movesText).toContain("Launch OS blocked-gate handoff");
    expect(movesText).toContain("exact_seed_recipient");
    expect(movesText).toContain("createdCount remains 0");
    expect(movesText).not.toContain("Run no-live department reviews");
    expect(movesText).not.toContain("Create the response workspace");
    expect(movesText).not.toContain("Collect final responses through the response workspace");
  });

  test("uses manual UI draft receipt as current mini-launch asset state", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard: acceptedReconciliationBoard,
      packetsIndex: acceptedPacketsIndex,
      responseWorkspace: acceptedResponseWorkspace,
      finalizationPreflight: acceptedFinalizationPreflight,
      operatorQueue: acceptedOperatorQueue,
      requestBundle: acceptedRequestBundle,
      responseWatcher: acceptedResponseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailManualUiBuildReceipt,
      miniLaunchShopifyLocalBuildReceipt,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      approvalIntake,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    const movesText = runbook.immediateNextMoves.join("\n");

    expect(runbook.currentState.miniLaunch.emailManualUiBuildClosed).toBe(true);
    expect(runbook.currentState.miniLaunch.emailManualUiDraftVisibleCount).toBe(4);
    expect(movesText).toContain("manual UI draft build is complete");
    expect(movesText).toContain("use the receipt as current asset evidence");
    expect(movesText).toContain("requires real MailerLite render QA");
    expect(movesText).toContain("manual UI build receipt as the current draft state");
    expect(movesText).toContain("Shopify no-live local build is complete");
    expect(movesText).toContain("Shopify local build receipt as current Web surface evidence");
    expect(movesText).not.toContain("email builder payload manifest only as local implementation input");
    expect(movesText).not.toContain("local email asset plan only to request exact build scope");
  });

  test("does not request mini-launch group execution after groups already exist", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard: acceptedReconciliationBoard,
      packetsIndex: acceptedPacketsIndex,
      responseWorkspace: acceptedResponseWorkspace,
      finalizationPreflight: acceptedFinalizationPreflight,
      operatorQueue: acceptedOperatorQueue,
      requestBundle: acceptedRequestBundle,
      responseWatcher: acceptedResponseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmptyGroupCreateDryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "dry_run_no_create_needed_targets_already_exist",
        freshScan: {
          groupsRead: 77,
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
      },
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      approvalIntake,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    const movesText = runbook.immediateNextMoves.join("\n");

    expect(movesText).toContain("Mini-launch empty groups already exist");
    expect(movesText).toContain("do not rerun --execute");
    expect(movesText).not.toContain("createdCount remains 0");
  });

  test("uses reference-only approval items to suppress closed group creation prompts", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard: acceptedReconciliationBoard,
      packetsIndex: acceptedPacketsIndex,
      responseWorkspace: acceptedResponseWorkspace,
      finalizationPreflight: acceptedFinalizationPreflight,
      operatorQueue: acceptedOperatorQueue,
      requestBundle: acceptedRequestBundle,
      responseWatcher: acceptedResponseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmptyGroupCreateDryRun,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue: {
        ...approvalQueue,
        approvalItems: [
          { id: "mini_launch_empty_group_creation", status: "reference_only_no_approval_request_now" },
          { id: "onboarding_v2_empty_group_creation", status: "reference_only_no_approval_request_now" },
        ],
      },
      approvalIntake,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    const movesText = runbook.immediateNextMoves.join("\n");

    expect(runbook.currentState.approvalQueue.referenceOnlyApprovalIds).toEqual([
      "mini_launch_empty_group_creation",
      "onboarding_v2_empty_group_creation",
    ]);
    expect(movesText).toContain("Mini-launch empty groups already exist");
    expect(movesText).toContain("Treat Onboarding v2 empty-group creation as closed evidence");
    expect(movesText).not.toContain("Use the fresh Onboarding v2 empty-groups packet and create dry-run before asking");
    expect(movesText).not.toContain("Hold at the mini-launch empty-group create runner dry-run");
  });

  test("builds report map from consulted source paths", () => {
    const reportMap = buildReportMap([
      ...sourceDigests,
      {
        path: "/tmp/mailerlite_mini_launch_backlog_board_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch idea queue and intake capacity",
      },
      {
        path: "/tmp/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch to onboarding handoff boundary and closed gates",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "safe department review delivery blocks and response paths",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "pending response workspace and final response readiness",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "department final response readiness and draft/pending distinction",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "operator queue for department final response collection",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "copy-ready department request texts for final responses",
      },
      {
        path: "/tmp/mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "file-existence watcher for final Brand/Web/CRM responses",
      },
      {
        path: "/tmp/mailerlite_onboarding_trunk_map_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "single operator map for current onboarding, v2 and mini-launch handoff",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_event_contract_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 CRM event contract and projection boundary",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 empty-groups approval packet from fresh read-only scan",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 empty-groups execution receipt for already-created empty groups",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 empty-groups create runner dry-run with zero mutations",
      },
      {
        path: "/tmp/mailerlite_onboarding_v2_first_email_map_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "onboarding v2 first-email mapping to prevent unnecessary Sent receipts",
      },
      {
        path: "/tmp/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch exact approval scope packet for future MailerLite draft email asset build; no execution",
      },
      {
        path: "/tmp/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch local builder payload manifest with exact payloads and closed execution/send gates",
      },
      {
        path: "/tmp/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch local email render QA with HTML and non-empty PNG preview evidence",
      },
      {
        path: "/tmp/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch manual UI draft build receipt and closed send/subscriber/workflow gates",
      },
      {
        path: "/tmp/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch Shopify local build receipt and closed publish/form/API gates",
      },
      {
        path: "/tmp/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "mini-launch CRM write approval packet with exact events/people/fields boundary",
      },
      {
        path: "/tmp/mailerlite_brujula_email_style_qa_packet_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "Brújula email style QA blockers and green criteria",
      },
      {
        path: "/tmp/mailerlite_brujula_email_style_correction_packet_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "Brújula Email 1 corrected local draft and builder inputs",
      },
      {
        path: "/tmp/mailerlite_brujula_email_render_qa_packet_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "Brújula Email 1 local render QA and preview evidence",
      },
      {
        path: "/tmp/mailerlite_launch_os_approval_queue_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "single exact approval queue for current MailerLite Launch OS gates",
      },
      {
        path: "/tmp/mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "current blocked gates and missing inputs before any new approval request",
      },
      {
        path: "/tmp/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS missing-inputs kit with capture specs and post-input commands",
      },
      {
        path: "/tmp/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS missing-inputs intake with redacted private input status",
      },
      {
        path: "/tmp/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS copy-ready missing-input request bundle with no approval or private file creation",
      },
      {
        path: "/tmp/mailerlite_launch_os_private_input_template_pack_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS inert private-input template pack with example files ignored by active intake",
      },
      {
        path: "/tmp/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS taxonomy consolidation audit across Brand dictionary, CRM manifest and approved empty-group receipts",
      },
      {
        path: "/tmp/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS Brand/CRM taxonomy refresh handoff prepared from consolidation drift",
      },
      {
        path: "/tmp/mailerlite_launch_os_continuation_guard_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "Launch OS continuation guard with closed hito and do-not-recycle state",
      },
      {
        path: "/tmp/mailerlite_launch_os_validation_receipt_2026-05-28.json",
        present: true,
        chars: 2000,
        consultedFor: "persistent Launch OS validation receipt",
      },
    ]);

    expect(reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(reportMap.backlogBoard).toBe("/tmp/mailerlite_mini_launch_backlog_board_2026-05-28.json");
    expect(reportMap.onboardingHandoffPolicy).toBe("/tmp/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewDeliveryPack).toBe("/tmp/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewResponseWorkspace).toBe("/tmp/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewFinalizationPreflight).toBe("/tmp/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewOperatorQueue).toBe("/tmp/mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewRequestBundle).toBe("/tmp/mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.departmentReviewResponseWatcher).toBe("/tmp/mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json");
    expect(reportMap.onboardingTrunkMap).toBe("/tmp/mailerlite_onboarding_trunk_map_2026-05-27.json");
    expect(reportMap.onboardingV2EventContract).toBe("/tmp/mailerlite_onboarding_v2_event_contract_2026-05-27.json");
    expect(reportMap.onboardingV2EmptyGroupsPacket).toBe("/tmp/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(reportMap.onboardingV2EmptyGroupsExecution).toBe("/tmp/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json");
    expect(reportMap.onboardingV2EmptyGroupsCreateDryRun).toBe("/tmp/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json");
    expect(reportMap.onboardingV2FirstEmailMap).toBe("/tmp/mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(reportMap.miniLaunchEmailAssetBuildScopePacket).toBe("/tmp/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchEmailBuilderPayloadManifest).toBe("/tmp/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchEmailRenderQa).toBe("/tmp/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchEmailManualUiBuildReceipt).toBe("/tmp/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchShopifyLocalBuildReceipt).toBe("/tmp/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchCrmWriteApprovalPacket).toBe("/tmp/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.brujulaEmailStyleQa).toBe("/tmp/mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(reportMap.brujulaEmailStyleCorrection).toBe("/tmp/mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(reportMap.brujulaEmailRenderQa).toBe("/tmp/mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(reportMap.approvalQueue).toBe("/tmp/mailerlite_launch_os_approval_queue_2026-05-28.json");
    expect(reportMap.blockedGateHandoff).toBe("/tmp/mailerlite_launch_os_blocked_gate_handoff_2026-05-28.json");
    expect(reportMap.missingInputsKit).toBe("/tmp/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(reportMap.missingInputsIntake).toBe("/tmp/mailerlite_launch_os_missing_inputs_intake_2026-05-28.json");
    expect(reportMap.missingInputsRequestBundle).toBe("/tmp/mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json");
    expect(reportMap.privateInputTemplatePack).toBe("/tmp/mailerlite_launch_os_private_input_template_pack_2026-05-28.json");
    expect(reportMap.taxonomyConsolidationAudit).toBe("/tmp/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json");
    expect(reportMap.taxonomyRefreshHandoff).toBe("/tmp/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json");
    expect(reportMap.continuationGuard).toBe("/tmp/mailerlite_launch_os_continuation_guard_2026-05-28.json");
    expect(reportMap.validationReceipt).toBe("/tmp/mailerlite_launch_os_validation_receipt_2026-05-28.json");
  });

  test("renders operator runbook with next moves and approval matrix", () => {
    const runbook = buildRunbook({
      readinessBoard,
      cadenceBoard,
      backlogBoard,
      onboardingHandoffPolicy,
      reconciliationBoard,
      packetsIndex,
      responseWorkspace,
      finalizationPreflight,
      operatorQueue,
      requestBundle,
      responseWatcher,
      onboardingV1Audit,
      onboardingTrunkMap,
      onboardingV2Execution,
      onboardingV2EventContract,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      onboardingV2FirstEmailMap,
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      approvalQueue,
      blockedGateHandoff,
      missingInputsKit,
      missingInputsIntake,
      missingInputsRequestBundle,
      privateInputTemplatePack,
      taxonomyConsolidationAudit,
      taxonomyRefreshHandoff,
      continuationGuard,
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(runbook);

    expect(markdown).toContain("Operator Runbook");
    expect(markdown).toContain("Operating Principles");
    expect(markdown).toContain("protected_editorial_onboarding_trunk");
    expect(markdown).toContain("market-learning tributaries");
    expect(markdown).toContain("current_pilot_department_reviews");
    expect(markdown).toContain("backlog_intake");
    expect(markdown).toContain("department_review_delivery");
    expect(markdown).toContain("approval_queue_review");
    expect(markdown).toContain("department_response_workspace");
    expect(markdown).toContain("draft-assist");
    expect(markdown).toContain("operator-queue");
    expect(markdown).toContain("request-bundle");
    expect(markdown).toContain("response-watcher");
    expect(markdown).toContain("finalization-preflight");
    expect(markdown).toContain("finalize-pending");
    expect(markdown).toContain("Ready for response intake: false");
    expect(markdown).toContain("Finalization preflight");
    expect(markdown).toContain("Operator queue");
    expect(markdown).toContain("Operator queue awaiting final count: 3");
    expect(markdown).toContain("Request bundle");
    expect(markdown).toContain("Request bundle request count: 3");
    expect(markdown).toContain("Response watcher");
    expect(markdown).toContain("Response watcher missing final count: 3");
    expect(markdown).toContain("Response watcher final file present count: 0");
    expect(markdown).toContain("Approval queue ready requests: 5");
    expect(markdown).toContain("Blocked-gate handoff: blocked_gate_handoff_ready_no_live_changes");
    expect(markdown).toContain("Blocked-gate inputs needed: exact_seed_recipient");
    expect(markdown).toContain("Missing-inputs kit: missing_inputs_kit_ready_no_live_changes");
    expect(markdown).toContain("Missing-inputs count: 5");
    expect(markdown).toContain("Missing-inputs ids: exact_seed_recipient");
    expect(markdown).toContain("Missing-inputs next safe action: collect_missing_inputs_without_approval_or_execution");
    expect(markdown).toContain("Missing-inputs intake: missing_inputs_intake_waiting_for_inputs_no_live_changes");
    expect(markdown).toContain("Missing-inputs intake ready: 0/5");
    expect(markdown).toContain("Missing-inputs intake full private values stored: false");
    expect(markdown).toContain("Missing-inputs request bundle: missing_inputs_request_bundle_ready_no_live_changes");
    expect(markdown).toContain("Missing-inputs request count: 5");
    expect(markdown).toContain("Missing-inputs request asks approval: false");
    expect(markdown).toContain("Private-input template pack: private_input_template_pack_ready_no_live_changes");
    expect(markdown).toContain("Private-input example file count: 2");
    expect(markdown).toContain("Private-input writes real values: false");
    expect(markdown).toContain("Taxonomy consolidation audit: taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes");
    expect(markdown).toContain("Taxonomy Brand promotions needed: 14");
    expect(markdown).toContain("Taxonomy refresh handoff: taxonomy_refresh_handoff_ready_no_live_changes");
    expect(markdown).toContain("Taxonomy refresh CRM patch rows: 14");
    expect(markdown).toContain("Taxonomy refresh can apply CRM patch now: false");
    expect(markdown).toContain("Continuation guard: mailerlite_launch_os_continuation_guard_ready_no_live_changes");
    expect(markdown).toContain("Continuation guard old UI work closed: true");
    expect(markdown).toContain("Continuation guard UI action: do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch");
    expect(markdown).toContain("Validation receipt: mailerlite_launch_os_validation_receipt_ready_no_live_changes");
    expect(markdown).toContain("Validation tests: 269");
    expect(markdown).toContain("Brújula email style QA: brujula_email_style_qa_yellow_no_live_changes");
    expect(markdown).toContain("Brújula email style QA blockers: 4");
    expect(markdown).toContain("Brújula Email 1 correction: brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes");
    expect(markdown).toContain("Brújula Email 1 render QA: brujula_email1_local_render_qa_green_no_live_changes");
    expect(markdown).toContain("Brújula local render ready: true");
    expect(markdown).toContain("Brújula local render non-empty: true");
    expect(markdown).toContain("Brújula local render preview size: 56000");
    expect(markdown).toContain("Draft assist departments: brand, web_design, crm");
    expect(markdown).toContain("Awaiting final departments: brand, web_design, crm");
    expect(markdown).toContain("Onboarding v2 event contract");
    expect(markdown).toContain("Onboarding v2 empty-groups packet: ready_for_exact_human_approval_to_create_empty_groups");
    expect(markdown).toContain("Onboarding v2 empty-groups target count: 12");
    expect(markdown).toContain("Onboarding v2 empty-groups can ask approval: true");
    expect(markdown).toContain("Onboarding v2 create dry-run: dry_run_ready_for_exact_approval");
    expect(markdown).toContain("Onboarding v2 create dry-run created count: 0");
    expect(markdown).toContain("Onboarding v2 first email map: first_email_mapping_ready_no_sent_receipt");
    expect(markdown).toContain("Onboarding v2 first email posture: welcome_orientation_no_sent_receipt");
    expect(markdown).toContain("Onboarding v2 first email Sent group: none");
    expect(markdown).toContain("Onboarding v2 first email create new Sent group: false");
    expect(markdown).toContain("Onboarding v2 first email CRM signal: journey_welcome_sent");
    expect(markdown).toContain("Onboarding trunk map: onboarding_trunk_map_ready_no_live_changes");
    expect(markdown).toContain("Onboarding trunk sequence items: 11");
    expect(markdown).toContain("Onboarding trunk recommendation is routing: false");
    expect(markdown).toContain("Onboarding handoff policy");
    expect(markdown).toContain("CC · Journey · Editorial onboarding · Eligible");
    expect(markdown).toContain("Approval Matrix");
    expect(markdown).toContain("Report Map");
    expect(markdown).toContain("Open live gates: 0");
    expect(markdown).toContain("Sin MailerLite API calls");
  });
});
