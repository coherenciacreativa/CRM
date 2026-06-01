import { describe, expect, test } from "vitest";

import {
  buildGoalAudit,
  buildRequirementChecks,
  parseArgs,
  renderMarkdown,
  summarizeCompletion,
} from "../scripts/crm-vnext-mailerlite-launch-os-goal-audit.mjs";

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  commandCatalog: [
    { name: "crm:vnext:mailerlite-launch-os-operator-runbook" },
    { name: "crm:vnext:mailerlite-onboarding-v2-event-contract" },
  ],
  operatingScenarios: [{ id: "current_pilot_department_reviews" }],
  approvalMatrix: [{ action: "create_mailerlite_groups" }],
  currentState: {
    liveGates: { openLiveGateCount: 0 },
    onboarding: {
      trunkMapStatus: "onboarding_trunk_map_ready_no_live_changes",
      trunkMapSequenceItems: 11,
      trunkMapFutureHandoffTarget: "CC · Journey · Editorial onboarding · Eligible",
      trunkMapRecommendationIsRouting: false,
      v2EmptyGroupsPacketStatus: "ready_for_exact_human_approval_to_create_empty_groups",
      v2EmptyGroupsTargetCount: 12,
      v2EmptyGroupsLiveGroupsRead: 75,
      v2EmptyGroupsLiveAutomationsRead: 13,
      v2EmptyGroupsCanAskApproval: true,
      v2EmptyGroupsBlockerCount: 0,
      v2EmptyGroupsCreateDryRunStatus: "dry_run_ready_for_exact_approval",
      v2EmptyGroupsCreateDryRunCreatedCount: 0,
      v2EmptyGroupsCreateDryRunBlockerCount: 0,
    },
    miniLaunch: {
      cadenceNow: "weekly",
      safeToIntakeOneMoreNoLiveIdea: true,
      packetCount: 3,
      responseWorkspaceStatus: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
      readyForResponseIntake: false,
      responseWatcherStatus: "department_review_response_watcher_waiting_final_responses_no_live_changes",
      responseWatcherMissingFinalCount: 3,
      responseWatcherFinalFilePresentCount: 0,
      responseWatcherNextBestMove: "Keep collecting final response files for: brand, web_design, crm.",
      publicSendPreflightDecisionPacketStatus: "public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes",
      publicSendPreflightRecommendedAudienceScopeId: "keep_null_audience_no_public_send",
      publicSendPreflightRecommendedAudienceKnownActiveCount: 0,
      publicSendPreflightRecommendedDistributionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_send",
      publicSendPreflightMassSubscriberSendRecommendedNow: false,
      publicSendPreflightExistingActiveSubscriberAudienceFutureOptionOnly: true,
      publicSendPreflightExistingActiveSubscriberAudienceKnownActiveCount: 933,
      publicSendPreflightAudienceStrategyGateRequiredBeforeMassSend: true,
      publicSendPreflightCanAskExactApprovalNow: false,
    },
  },
  safety: {
    mailerLiteApiCalled: false,
    mutationsPerformed: false,
    sendsPerformed: false,
  },
};

const readinessBoard = {
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 8,
    liveMutationGateOpenCount: 0,
  },
  lanes: [
    {
      id: "mailerlite_group_dry_run",
      sourceStatus: "blocked_until_brand_dictionary_candidates",
    },
  ],
};

const readinessBoardAfterBrandCandidateDecision = {
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
    readyNoLiveLaneCount: 12,
    liveMutationGateOpenCount: 0,
  },
  lanes: [
    {
      id: "brand_candidate_groups",
      sourceStatus: "brand_candidate_decision_closed_ready_no_live_changes",
      readyNow: true,
      blockedBy: [],
      readiness: {
        acceptedGroupCount: 2,
        missingCandidateCount: 0,
        brandStatusBlockedCount: 0,
      },
    },
    {
      id: "mailerlite_group_dry_run",
      sourceStatus: "mini_launch_group_dry_run_ready_for_future_empty_group_decision",
      readyNow: true,
      blockedBy: [],
      readiness: {
        brandDictionaryHasTargets: true,
        brandApprovedForEmptyCreate: true,
        canAssignSubscribersNow: false,
        canSendNow: false,
        canAttachWorkflowNow: false,
      },
    },
    {
      id: "email_sequence",
      sourceStatus: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
      readyNow: true,
      blockedBy: [
        "exact_mailerlite_asset_build_scope",
        "builder_render_qa_before_seed_send",
        "exact_seed_send_approval",
      ],
      readiness: {
        readyForLocalAssetPlanNow: true,
        readyForMailerLiteAssetBuildNow: false,
        readyForSeedSendNow: false,
        hardBlockerCount: 0,
        yellowCheckCount: 5,
      },
    },
  ],
};

const reconciliationBoard = {
  status: "blocked_until_department_reviews_accepted_no_live_changes",
  responseState: {
    pendingDepartments: ["brand", "web_design", "crm"],
  },
  liveGateSummary: {
    openLiveGateCount: 0,
  },
};

const reconciliationBoardAfterResponses = {
  status: "department_reviews_reconciled_ready_for_next_no_live_moves",
  responseState: {
    pendingDepartments: [],
  },
  actionPlan: {
    actions: [
      { id: "rerun_group_dry_run" },
      { id: "prepare_scoped_shopify_local_build_request" },
      { id: "signal_boundaries_ready_for_future_no_live_projection_packet" },
    ],
  },
  liveGateSummary: {
    openLiveGateCount: 0,
  },
};

const responseWorkspace = {
  status: "department_review_response_workspace_ready_awaiting_final_responses_no_live_changes",
  readyForIntake: false,
  pendingDepartments: ["brand", "web_design", "crm"],
};

const responseWorkspaceAfterResponses = {
  status: "department_review_response_workspace_ready_for_intake_no_live_changes",
  readyForIntake: true,
  pendingDepartments: [],
};

const finalizationPreflight = {
  status: "department_finalization_preflight_waiting_department_responses_no_live_changes",
  readyForIntake: false,
  acceptedDepartments: [],
  pendingReadyDepartments: [],
  draftAssistDepartments: ["brand", "web_design", "crm"],
  awaitingDepartments: ["brand", "web_design", "crm"],
};

const finalizationPreflightAfterResponses = {
  status: "department_final_responses_ready_for_intake_no_live_changes",
  readyForIntake: true,
  acceptedDepartments: ["brand", "web_design", "crm"],
  pendingReadyDepartments: [],
  draftAssistDepartments: [],
  awaitingDepartments: [],
};

const requestBundle = {
  status: "department_review_request_bundle_ready_to_collect_final_responses_no_live_changes",
  summary: {
    requestCount: 3,
    awaitingFinalCount: 3,
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

const onboardingV1Audit = {
  workflow: {
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
  },
  migrationRecommendation: {
    option: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
};

const onboardingV2Design = {
  status: "ready_for_human_architecture_review",
};

const onboardingTrunkMap = {
  status: "onboarding_trunk_map_ready_no_live_changes",
  executiveSummary: {
    sequenceItems: 11,
    futureHandoffTarget: "CC · Journey · Editorial onboarding · Eligible",
    recommendationIsRouting: false,
  },
};

const onboardingV2Execution = {
  status: "ready_for_human_decision_or_non_live_continuation",
};

const onboardingV2EventContract = {
  status: "onboarding_v2_event_contract_ready_no_ledger_write",
  normalizationProof: {
    eventsGenerated: 12,
  },
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
  safety: {
    readOnly: true,
    mailerLiteApiCalled: true,
    groupMutationsPerformed: false,
    workflowMutationsPerformed: false,
    subscriberRowsRead: false,
    sendsPerformed: false,
  },
};

const onboardingV2EmptyGroupsCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  mode: "dry_run",
  packetSummary: {
    targetCount: 12,
    liveGroupsRead: 75,
    liveAutomationsRead: 13,
    blockers: [],
  },
  decision: {
    canExecute: false,
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
  safety: {
    mailerLiteApiCalled: false,
    brandHubMutationsPerformed: false,
    crmCardMutationsPerformed: false,
    subscriberRowsRead: false,
    workflowMutationsPerformed: false,
    sendsPerformed: false,
  },
};

const onboardingHandoffPolicy = {
  status: "mini_launch_onboarding_handoff_policy_ready_no_live_changes",
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
  v1Protection: {
    productionV1Protected: true,
  },
  contractCoverage: {
    handoffEventProjectionPosture: "store_only; recommendation is not routing and not contact permission",
  },
  handoffLadder: [
    {
      action: "recommend_onboarding_handoff",
      currentAllowedState: "store_only_event_contract",
    },
  ],
  approvalBoundary: {
    closedNow: [
      "Assign any subscriber to onboarding eligibility.",
      "Attach mini-launch participants to active onboarding v1.",
    ],
  },
  operatorRule: "Recommendation is not routing. Routing requires a later exact approval and a fresh protected workflow/subscriber scan.",
  safety: {
    mailerLiteApiCalled: false,
    subscriberMutationsPerformed: false,
    workflowMutationsPerformed: false,
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    sendsPerformed: false,
  },
};

const brujulaPlan = {
  localEvidence: {
    brujulaState: {
      currentWorkflowOffOrIncomplete: true,
    },
    emailStyle: {
      brujulaCurrentAntiEvidence: true,
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
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
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
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
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
    fileSizeBytes: 56000,
  },
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
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
    status: "draft",
    subject: "Aquí está La Brújula de Claridad",
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
    brandSequenceApprovedNoLive: true,
    readyForLocalAssetPlanNow: true,
    hardBlockerCount: 0,
    yellowCheckCount: 5,
    publicUseReady: false,
    mailerLiteBuildReady: false,
    seedSendReady: false,
  },
  approvalGate: {
    readyForLocalAssetPlanNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    readyForReceiptSeedTestNow: false,
    readyForAudienceLaunchNow: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
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
  safety: {
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
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
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const miniLaunchEmailBuilderPayloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  executiveSummary: {
    payloadCount: 4,
    contentBlockCount: 32,
    canExecuteBuilderNow: false,
  },
  approvalBoundary: {
    canSendNow: false,
    manifestIsApprovalByItself: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const validationReceipt = {
  status: "mailerlite_launch_os_validation_receipt_ready_no_live_changes",
  validationStatus: "passed",
  validationSummary: "node --check plus broad MailerLite Vitest suite passed",
  testScope: {
    testFiles: 46,
    testCount: 260,
  },
  evidence: {
    liveGatesClosed: true,
  },
  safety: {
    mailerLiteApiCalled: false,
    shopifyApiCalled: false,
    crmLiveApiCalled: false,
    subscribersRead: false,
    groupMutationsPerformed: false,
    workflowMutationsPerformed: false,
    sendsPerformed: false,
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    crmScoreMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const miniLaunchEmailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    emailCount: 4,
    renderPreviewNonEmptyCount: 4,
    localRenderReady: true,
    publicUseReady: false,
    seedSendReady: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
    crmLiveApiCalled: false,
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
    preferredBrowserUsed: "Safari",
    mailerLiteAccountPlanObserved: "Growing Business",
    editorRoute: {
      usedEditor: "new_simple_editor",
      customHtmlEditorStatus: "premium_upgrade_locked_on_growing_business",
    },
  },
  safety: {
    mailerLiteUiDraftMutationsRecorded: true,
    sendsPerformed: false,
    schedulesCreated: false,
    subscribersReadOrAssigned: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    crmLiveApiCalledByThisReceipt: false,
    factStoreWritePerformed: false,
  },
  stillClosedAfterThisReceipt: [
    "seed_send_or_test_send",
    "workflow_or_automation_attachment",
    "subscriber_read_assignment_or_import",
  ],
};

const miniLaunchSeedTestQaPacket = {
  status: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
  readiness: {
    manualUiDraftsBuilt: true,
    localRenderReady: true,
    targetGroupsExist: true,
    realMailerLiteRenderQaReady: true,
    canAskSeedSendApprovalNow: false,
    readyForAudienceLaunchNow: false,
    machineBlockersBeforeSeedSendApprovalRequest: [
      "exact_seed_recipient_missing",
    ],
  },
  seedIdentity: {
    supplied: false,
  },
  safety: {
    sendsPerformed: false,
    subscriberRowsRead: false,
    mailerLiteMutationsPerformed: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const miniLaunchSeedInboxQa = {
  status: "seed_inbox_qa_completed_correction_recommended_before_public_launch_no_live_changes",
  executiveSummary: {
    deliveryStatus: "green",
    readerFacingPublicReadiness: "yellow_needs_minor_footer_and_link_cleanup",
    correctionRecommendedBeforePublicLaunch: true,
    openCorrectionCount: 4,
    canAskPublicSendApprovalNow: false,
  },
  recommendedCorrectionsBeforePublic: [
    { id: "footer_sender_name_consistency" },
    { id: "spanish_subscription_reason_consistency" },
    { id: "feedback_reply_cta_cleanup" },
    { id: "replace_inert_placeholders_before_public" },
  ],
};

const miniLaunchNullAudienceSeedInboxQa = {
  ok: false,
  status: "mailerlite_null_audience_seed_inbox_qa_partial_blocked_e04_not_delivered_to_seed",
  deliverySummary: {
    seedInboxQaGreen: false,
    deliveredToApprovedSeed: 3,
    expectedSeedMessages: 4,
    newCorrectedMessagesFoundOutsideApprovedSeed: 1,
  },
  decision: {
    needsHumanApprovalBeforeAnyAdditionalSend: true,
    recommendedNextBoundary: "approve_resending_only_E04_test_to_exact_seed_after_fresh_rescan",
  },
};

const miniLaunchSeedInboxCorrectionPlan = {
  status: "seed_inbox_correction_plan_ready_no_live_changes",
  executiveSummary: {
    correctionCount: 4,
    requiredInputCount: 2,
    canAskMailerLiteUiEditApprovalNow: false,
    canAskPublicSendApprovalNow: false,
  },
  requiredInputsBeforeUiEditApproval: [
    { id: "final_public_links" },
    { id: "subscription_reason_policy" },
  ],
  blockersBeforeAnyMailerLiteUiEditApproval: [
    "public_readiness_yellow",
    "final_public_links_missing",
    "subscription_reason_policy_missing",
    "exact_mailerlite_ui_edit_approval_missing",
    "fresh_post_correction_qa_missing",
  ],
};

const miniLaunchShopifyPreviewRouteDecision = {
  status: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
  executiveSummary: {
    recommendedVisibilityTier: "unlisted_noindex_preview",
    decisionExplanationReady: true,
    exactApprovalPhraseAvailable: false,
    exactApprovalPhrasePrinted: false,
    canAskApprovalNow: false,
    canPublishNow: false,
    publicAudienceSendUrlGateReady: false,
  },
  safety: {
    shopifyApiCalled: false,
    shopifyRepoFilesWritten: false,
    mailerLiteApiCalled: false,
    sendsPerformed: false,
    exactApprovalPhrasePrinted: false,
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

const miniLaunchCrmWriteApprovalPacket = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    approvalRequestReady: false,
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
      "exact_observed_events_missing",
      "exact_person_identity_missing",
    ],
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
};

const missingInputsRequestBundle = {
  status: "missing_inputs_request_bundle_ready_no_live_changes",
  executiveSummary: {
    requestCount: 5,
    inputCount: 5,
    readyInputCount: 0,
    copyBlocksReady: true,
    createsPrivateFiles: false,
    asksApproval: false,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
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
    activePathCollisionCount: 0,
    canAskApprovalNow: false,
    openLiveMutationGateCount: 0,
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
  },
};

const taxonomyRefreshHandoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  executiveSummary: {
    brandPromotionDecisionCount: 14,
    crmManifestPatchCount: 14,
    canApplyCrmManifestPatchNow: false,
    openLiveMutationGateCount: 0,
  },
};

const taxonomyRefreshResponseWorkspace = {
  status: "taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes",
  executiveSummary: {
    brandDecisionRowCount: 14,
    crmManifestPatchRowCount: 14,
    acceptedActorCount: 0,
    pendingActorCount: 2,
    readyPendingActorCount: 0,
    readyForIntake: false,
    canAskApprovalNow: false,
    canApplyBrandDictionaryPatchNow: false,
    canApplyCrmManifestPatchNow: false,
    openLiveMutationGateCount: 0,
  },
};

const taxonomyRefreshDecisionIntake = {
  status: "taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes",
  executiveSummary: {
    brandDecisionStatus: "missing_no_live_changes",
    crmDecisionStatus: "missing_no_live_changes",
    brandDecisionRowsNeeded: 14,
    brandDecisionRowsPresent: 0,
    crmManifestPatchRowsNeeded: 14,
    crmManifestPatchRowsAccepted: 0,
    readyForLocalPatchPreview: false,
    canAskApprovalNow: false,
    canApplyCrmManifestPatchNow: false,
    openLiveMutationGateCount: 0,
  },
};

const taxonomyRefreshResponseRequestBundle = {
  status: "taxonomy_refresh_response_request_bundle_ready_no_live_changes",
  executiveSummary: {
    requestCount: 2,
    pendingActorCount: 2,
    missingFinalResponseCount: 2,
    copyBlocksReady: true,
    asksLiveApproval: false,
    createsFinalResponseFiles: false,
    canApplyCrmManifestPatchNow: false,
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
  activeInputs: [
    { id: "exact_seed_recipient" },
    { id: "real_observed_events_file" },
    { id: "exact_people" },
    { id: "writable_event_screen" },
    { id: "fact_store_market_review" },
  ],
};

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-launch-os-blocked-gate-handoff": "node scripts/blocked-gate-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-continuation-guard": "node scripts/continuation-guard.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle": "node scripts/missing-inputs-request-bundle.mjs",
    "crm:vnext:mailerlite-launch-os-private-input-template-pack": "node scripts/private-input-template-pack.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit": "node scripts/taxonomy-consolidation-audit.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-handoff": "node scripts/taxonomy-refresh-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace": "node scripts/taxonomy-refresh-response-workspace.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-decision-intake": "node scripts/taxonomy-refresh-decision-intake.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-request-bundle": "node scripts/taxonomy-refresh-response-request-bundle.mjs",
    "crm:vnext:mailerlite-onboarding-v2-event-contract": "node scripts/event.mjs",
    "crm:vnext:mailerlite-onboarding-v2-empty-groups-packet": "node scripts/empty-groups-packet.mjs",
    "crm:vnext:mailerlite-onboarding-v2-empty-groups-create": "node scripts/empty-groups-create.mjs",
    "crm:vnext:mailerlite-mini-launch-cadence-board": "node scripts/cadence.mjs",
    "crm:vnext:mailerlite-mini-launch-empty-group-creation-packet": "node scripts/empty-group-approval.mjs",
    "crm:vnext:mailerlite-mini-launch-email-style-qa-packet": "node scripts/email-style-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-local-email-asset-plan": "node scripts/local-email-asset-plan.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet": "node scripts/email-asset-build-scope.mjs",
    "crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest": "node scripts/email-builder-payload-manifest.mjs",
    "crm:vnext:mailerlite-mini-launch-email-render-qa-packet": "node scripts/email-render-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-crm-write-approval-packet": "node scripts/crm-write-approval-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-build-receipt": "node scripts/manual-ui-build-receipt.mjs",
    "crm:vnext:mailerlite-mini-launch-shopify-preview-route-decision-packet": "node scripts/shopify-preview-route-decision.mjs",
    "crm:vnext:mailerlite-brujula-email-style-qa-packet": "node scripts/brujula-email-style-qa.mjs",
    "crm:vnext:mailerlite-brujula-email-style-correction-packet": "node scripts/brujula-email-style-correction.mjs",
    "crm:vnext:mailerlite-launch-os-validation-receipt": "node scripts/validation-receipt.mjs",
  },
};

const values = {
  runbook,
  readinessBoard,
  reconciliationBoard,
  responseWorkspace,
  finalizationPreflight,
  requestBundle,
  responseWatcher,
  onboardingV1Audit,
  onboardingTrunkMap,
  onboardingV2Design,
  onboardingV2Execution,
  onboardingV2EventContract,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  onboardingV2FirstEmailMap,
  onboardingHandoffPolicy,
  brujulaPlan,
  brujulaApply,
  brujulaEmailStyleQa,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa: null,
  miniLaunchEmailStyleQaPacket: null,
  miniLaunchLocalEmailAssetPlan: null,
  miniLaunchEmailAssetBuildScopePacket: null,
  miniLaunchEmailBuilderPayloadManifest: null,
  miniLaunchEmailRenderQa: null,
  miniLaunchEmailManualUiBuildReceipt: null,
  miniLaunchSeedTestQaPacket: null,
  miniLaunchSeedTestExecutionReceipt: null,
  miniLaunchSeedInboxQa: null,
  miniLaunchNullAudienceSeedInboxQa: null,
  miniLaunchSeedInboxCorrectionPlan: null,
  miniLaunchShopifyLocalBuildReceipt: null,
  miniLaunchShopifyPreviewRouteDecision: null,
  miniLaunchCrmWriteApprovalPacket: null,
  blockedGateHandoff: null,
  missingInputsKit: null,
  missingInputsIntake: null,
  missingInputsRequestBundle: null,
  privateInputTemplatePack: null,
  taxonomyConsolidationAudit: null,
  taxonomyRefreshHandoff: null,
  taxonomyRefreshResponseWorkspace: null,
  taxonomyRefreshDecisionIntake: null,
  taxonomyRefreshResponseRequestBundle: null,
  continuationGuard: null,
  validationReceipt: null,
  brandTaxonomy: "CC · Source\nCC · Delivered\nCC · Sent\n",
  brandDictionary: "CC · Source · Resource · Brújula\n",
  packageJson,
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite_launch_os_operator_runbook_2026-05-28.json",
    present: true,
    chars: 1000,
    consultedFor: "operator runbook state",
  },
];

describe("CRM vNext MailerLite Launch OS goal audit", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/audit.json",
      "--markdown-out",
      "/tmp/audit.md",
    ]);

    expect(parsed.runbook).toMatch(/mailerlite_launch_os_operator_runbook_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(parsed.finalizationPreflight).toContain("mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(parsed.requestBundle).toContain("mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWatcher).toContain("mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json");
    expect(parsed.onboardingTrunkMap).toContain("mailerlite_onboarding_trunk_map_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsExecution).toContain("mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json");
    expect(parsed.onboardingV2EmptyGroupsCreateDryRun).toContain("mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json");
    expect(parsed.onboardingV2FirstEmailMap).toContain("mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.miniLaunchEmailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchLocalEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildScopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailRenderQa).toContain("mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchEmailManualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchSeedInboxCorrectionPlan).toContain("mailerlite_mini_launch_seed_inbox_correction_plan_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchCrmWriteApprovalPacket).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyPreviewRouteDecision).toContain("mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchShopifyPreviewRouteExecutionReceipt).toContain("mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.brujulaEmailStyleQa).toContain("mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(parsed.brujulaEmailStyleCorrection).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.brujulaEmailRenderQa).toContain("mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(parsed.brujulaEmailManualUiBuildReceipt).toContain("mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json");
    expect(parsed.approvalQueue).toMatch(/mailerlite_launch_os_approval_queue_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.approvalIntake).toMatch(/mailerlite_launch_os_approval_intake_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.blockedGateHandoff).toMatch(/mailerlite_launch_os_blocked_gate_handoff_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.missingInputsKit).toMatch(/mailerlite_launch_os_missing_inputs_kit_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.missingInputsIntake).toMatch(/mailerlite_launch_os_missing_inputs_intake_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.missingInputsRequestBundle).toMatch(/mailerlite_launch_os_missing_inputs_request_bundle_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.privateInputTemplatePack).toMatch(/mailerlite_launch_os_private_input_template_pack_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.taxonomyConsolidationAudit).toContain("mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json");
    expect(parsed.taxonomyRefreshHandoff).toContain("mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json");
    expect(parsed.taxonomyRefreshResponseWorkspace).toContain("mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json");
    expect(parsed.taxonomyRefreshDecisionIntake).toContain("mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json");
    expect(parsed.taxonomyRefreshResponseRequestBundle).toMatch(/mailerlite_launch_os_taxonomy_refresh_response_request_bundle_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.continuationGuard).toMatch(/mailerlite_launch_os_continuation_guard_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.validationReceipt).toMatch(/mailerlite_launch_os_validation_receipt_current_\d{4}-\d{2}-\d{2}\.json$/u);
    expect(parsed.out).toBe("/tmp/audit.json");
    expect(parsed.markdownOut).toBe("/tmp/audit.md");
  });

  test("builds requirement checks from current evidence", () => {
    const checks = buildRequirementChecks(values);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.protect_productive_onboarding_v1.status).toBe("proven");
    expect(byId.protect_productive_onboarding_v1.evidence).toContain("trunkMapStatus=onboarding_trunk_map_ready_no_live_changes");
    expect(byId.protect_productive_onboarding_v1.evidence).toContain("trunkSequenceItems=11");
    expect(byId.design_onboarding_v2.status).toBe("proven");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsPacketStatus=ready_for_exact_human_approval_to_create_empty_groups");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsTargetCount=12");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsLiveGroupsRead=75");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsLiveAutomationsRead=13");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsCanAskApproval=true");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsCreateDryRunStatus=dry_run_ready_for_exact_approval");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsCreateDryRunCreatedCount=0");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsPacketReady=true");
    expect(byId.design_onboarding_v2.evidence).toContain("emptyGroupsCreateDryRunReady=true");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailMapStatus=first_email_mapping_ready_no_sent_receipt");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailPosture=welcome_orientation_no_sent_receipt");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailSentGroup=none");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailCreateNewSentGroup=false");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailCrmSignal=journey_welcome_sent");
    expect(byId.design_onboarding_v2.evidence).toContain("firstEmailMapped=true");
    expect(byId.coordinate_brand_web_crm.status).toBe("blocked_waiting_department_final_responses");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("readyForResponseIntake=false");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("workspacePendingDepartments=brand,web_design,crm");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("finalizationReadyForIntake=false");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("requestBundleStatus=department_review_request_bundle_ready_to_collect_final_responses_no_live_changes");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("requestBundleRequestCount=3");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("responseWatcherStatus=department_review_response_watcher_waiting_final_responses_no_live_changes");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("responseWatcherMissingFinalCount=3");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("responseWatcherFinalFilePresentCount=0");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("draftAssistDepartments=brand,web_design,crm");
    expect(byId.coordinate_brand_web_crm.evidence).toContain("awaitingFinalDepartments=brand,web_design,crm");
    expect(byId.define_mini_launch_to_onboarding_handoff.status).toBe("proven");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("handoffTargetGroup=CC · Journey · Editorial onboarding · Eligible");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("trunkHandoffTarget=CC · Journey · Editorial onboarding · Eligible");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("trunkRecommendationIsRouting=false");
    expect(byId.define_mini_launch_to_onboarding_handoff.evidence).toContain("recommendationIsNotRouting=true");
    expect(byId.enforce_live_change_approval_boundary.status).toBe("proven");
    expect(byId.brujula_test_pilot_status.status).toBe("partial_functional_green_corrected_draft_ready_needs_render_qa");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailStyleQaStatus=brujula_email_style_qa_yellow_no_live_changes");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailStyleQaPublicUseReady=false");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailStyleCorrectionStatus=brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailStyleCorrectionTestSendReady=false");
  });

  test("marks Onboarding v2 empty groups as closed after execution and fresh all-exist verify", () => {
    const checks = buildRequirementChecks({
      ...values,
      runbook: {
        currentState: {
          onboarding: {
            v2EmptyGroupsLifecycleStatus: "executed_and_verified_all_targets_exist_no_live_followup",
          },
        },
      },
      onboardingV2EmptyGroupsExecution,
      onboardingV2EmptyGroupsCreateDryRun: onboardingV2EmptyGroupsPostExecutionVerify,
    });
    const item = checks.find((check) => check.id === "design_onboarding_v2");

    expect(item.status).toBe("proven");
    expect(item.evidence).toContain("emptyGroupsLifecycleStatus=executed_and_verified_all_targets_exist_no_live_followup");
    expect(item.evidence).toContain("emptyGroupsLiveGroupsRead=89");
    expect(item.evidence).toContain("emptyGroupsCanAskApproval=false");
    expect(item.evidence).toContain("emptyGroupsBlockerCount=0");
    expect(item.evidence).toContain("emptyGroupsExecutionStatus=executed_onboarding_v2_empty_group_creation");
    expect(item.evidence).toContain("emptyGroupsExecutedCount=12");
    expect(item.evidence).toContain("emptyGroupsExecutionCompleted=true");
    expect(item.evidence).toContain("emptyGroupsCreateDryRunStatus=dry_run_blocked");
    expect(item.evidence).toContain("emptyGroupsPostExecutionAllExist=true");
    expect(item.evidence).toContain("emptyGroupsBoundaryClosed=true");
    expect(item.remaining).toContain("The 12 empty v2 groups now exist; do not rerun group creation for this boundary.");
  });

  test("closes stale Brand candidate instructions after promoted local group dry-run", () => {
    const checks = buildRequirementChecks({
      ...values,
      readinessBoard: readinessBoardAfterBrandCandidateDecision,
      reconciliationBoard: reconciliationBoardAfterResponses,
      responseWorkspace: responseWorkspaceAfterResponses,
      finalizationPreflight: finalizationPreflightAfterResponses,
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchShopifyLocalBuildReceipt,
      miniLaunchShopifyPreviewRouteDecision,
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.consolidate_taxonomy_receipts.status).toBe("partial_ready_no_live");
    expect(byId.consolidate_taxonomy_receipts.evidence).toContain("brandCandidateDecisionClosed=true");
    expect(byId.consolidate_taxonomy_receipts.evidence).toContain("groupDryRunReadyForFutureEmptyGroupDecision=true");
    expect(byId.consolidate_taxonomy_receipts.remaining.join(" ")).toContain("live empty-group creation remains a separate exact approval boundary");
    expect(byId.consolidate_taxonomy_receipts.remaining.join(" ")).not.toContain("Represent the Brand-accepted launch candidates");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailStyleQaStatus=mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailStyleQaReadyForLocalAssetPlan=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailStyleQaReadyForMailerLiteBuild=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailStyleQaReadyForSeedSend=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchLocalEmailAssetPlanStatus=mini_launch_local_email_asset_plan_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchLocalEmailAssetPlanReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchLocalEmailAssetPlanAssetCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchLocalEmailAssetPlanPlaceholderCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailAssetBuildScopePacketStatus=email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailAssetBuildScopePacketReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailAssetBuildScopeAssetCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailAssetBuildScopePlaceholderCount=3");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailAssetBuildScopeReplyCtaCount=1");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailBuilderPayloadManifestStatus=email_builder_payload_manifest_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailBuilderPayloadManifestReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailBuilderPayloadManifestPayloadCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailBuilderPayloadManifestContentBlockCount=32");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailRenderQaStatus=mini_launch_email_render_qa_green_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailRenderQaReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailRenderQaEmailCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmailRenderQaRenderPreviewNonEmptyCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("shopifyPreviewRouteDecisionStatus=shopify_preview_route_decision_ready_for_human_explanation_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("shopifyPreviewRouteDecisionReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("shopifyPreviewRouteExactApprovalPhraseAvailable=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("shopifyPreviewRouteCanPublishNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).toContain("Email builder payload manifest");
  });

  test("treats mini-launch empty-group creation as closed after target groups exist", () => {
    const readinessBoardAfterGroupCreation = {
      ...readinessBoardAfterBrandCandidateDecision,
      lanes: readinessBoardAfterBrandCandidateDecision.lanes.map((lane) =>
        lane.id === "mailerlite_group_dry_run"
          ? {
            ...lane,
            sourceStatus: "mini_launch_groups_already_exist_no_create_needed",
            readiness: {
              ...lane.readiness,
              canCreateNamedEmptyGroupsAfterExplicitApproval: false,
            },
          }
          : lane),
    };
    const checks = buildRequirementChecks({
      ...values,
      readinessBoard: readinessBoardAfterGroupCreation,
      reconciliationBoard: reconciliationBoardAfterResponses,
      responseWorkspace: responseWorkspaceAfterResponses,
      finalizationPreflight: finalizationPreflightAfterResponses,
      miniLaunchEmptyGroupCreateDryRun: {
        status: "dry_run_no_create_needed_targets_already_exist",
        mode: "dry_run",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
        decision: {
          canExecute: false,
        },
        createdGroups: [],
        safety: {
          mailerLiteMutationsPerformed: false,
        },
      },
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.consolidate_taxonomy_receipts.evidence).toContain("launchGroupsAlreadyExist=true");
    expect(byId.consolidate_taxonomy_receipts.remaining.join(" ")).toContain("creation boundary is closed");
    expect(byId.consolidate_taxonomy_receipts.remaining.join(" ")).not.toContain("live empty-group creation remains a separate exact approval boundary");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmptyGroupCreateDryRunNoCreateNeeded=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmptyGroupCreateDryRunTargetExistingCount=2");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchEmptyGroupCreateDryRunTargetMissingCount=0");
    expect(byId.validate_with_dry_runs_and_tests.evidence).toContain("emptyGroupCreateDryRunNoCreateNeeded=true");
  });

  test("surfaces taxonomy consolidation drift from approved live receipts", () => {
    const checks = buildRequirementChecks({
      ...values,
      taxonomyConsolidationAudit,
      taxonomyRefreshHandoff,
      taxonomyRefreshResponseWorkspace,
      taxonomyRefreshDecisionIntake,
      taxonomyRefreshResponseRequestBundle,
    });
    const item = checks.find((check) => check.id === "consolidate_taxonomy_receipts");

    expect(item.status).toBe("partial_ready_no_live");
    expect(item.evidence).toContain("taxonomyConsolidationAuditStatus=taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes");
    expect(item.evidence).toContain("taxonomyConsolidationLiveEvidenceGroupCount=19");
    expect(item.evidence).toContain("taxonomyConsolidationBrandPromotionNeededCount=14");
    expect(item.evidence).toContain("taxonomyConsolidationCrmManifestRefreshNeededCount=14");
    expect(item.evidence).toContain("taxonomyConsolidationAllBrandPromoted=false");
    expect(item.evidence).toContain("taxonomyConsolidationAllCrmLiveIds=false");
    expect(item.evidence).toContain("taxonomyConsolidationCanAskApprovalNow=false");
    expect(item.evidence).toContain("taxonomyConsolidationOpenLiveGateCount=0");
    expect(item.evidence).toContain("taxonomyRefreshHandoffStatus=taxonomy_refresh_handoff_ready_no_live_changes");
    expect(item.evidence).toContain("taxonomyRefreshBrandPromotionDecisionCount=14");
    expect(item.evidence).toContain("taxonomyRefreshCrmManifestPatchCount=14");
    expect(item.evidence).toContain("taxonomyRefreshCanApplyCrmManifestPatchNow=false");
    expect(item.evidence).toContain("taxonomyRefreshOpenLiveGateCount=0");
    expect(item.evidence).toContain("taxonomyRefreshResponseWorkspaceStatus=taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(item.evidence).toContain("taxonomyRefreshResponsePendingActorCount=2");
    expect(item.evidence).toContain("taxonomyRefreshResponseReadyForIntake=false");
    expect(item.evidence).toContain("taxonomyRefreshDecisionIntakeStatus=taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes");
    expect(item.evidence).toContain("taxonomyRefreshDecisionRowsPresent=0");
    expect(item.evidence).toContain("taxonomyRefreshDecisionRowsNeeded=14");
    expect(item.evidence).toContain("taxonomyRefreshDecisionReadyForLocalPatchPreview=false");
    expect(item.evidence).toContain("taxonomyRefreshResponseRequestBundleStatus=taxonomy_refresh_response_request_bundle_ready_no_live_changes");
    expect(item.evidence).toContain("taxonomyRefreshResponseRequestCount=2");
    expect(item.evidence).toContain("taxonomyRefreshResponseRequestPendingActorCount=2");
    expect(item.evidence).toContain("taxonomyRefreshResponseRequestMissingFinalResponseCount=2");
    expect(item.evidence).toContain("taxonomyRefreshResponseRequestAsksLiveApproval=false");
    expect(item.remaining.join(" ")).toContain("19 groups proven");
    expect(item.remaining.join(" ")).toContain("Taxonomy refresh handoff prepared 14 Brand decisions and 14 CRM manifest patch rows");
    expect(item.remaining.join(" ")).toContain("Taxonomy decision intake status");
    expect(item.remaining.join(" ")).toContain("Taxonomy response request bundle status");
    expect(item.remaining.join(" ")).toContain("Brand promotions needed 14");
    expect(item.remaining.join(" ")).toContain("CRM manifest refresh needed 14");
    expect(item.remaining.join(" ")).toContain("no live action or UI work is open");
  });

  test("treats approved manual UI draft build as the current asset-build state", () => {
    const readinessBoardAfterGroupCreation = {
      ...readinessBoardAfterBrandCandidateDecision,
      lanes: readinessBoardAfterBrandCandidateDecision.lanes.map((lane) =>
        lane.id === "mailerlite_group_dry_run"
          ? {
            ...lane,
            sourceStatus: "mini_launch_groups_already_exist_no_create_needed",
            readiness: {
              ...lane.readiness,
              canCreateNamedEmptyGroupsAfterExplicitApproval: false,
            },
          }
          : lane),
    };
    const valuesWithManualUiBuild = {
      ...values,
      readinessBoard: readinessBoardAfterGroupCreation,
      reconciliationBoard: reconciliationBoardAfterResponses,
      responseWorkspace: responseWorkspaceAfterResponses,
      finalizationPreflight: finalizationPreflightAfterResponses,
      miniLaunchEmptyGroupCreateDryRun: {
        status: "dry_run_no_create_needed_targets_already_exist",
        mode: "dry_run",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
        decision: {
          canExecute: false,
        },
        createdGroups: [],
        safety: {
          mailerLiteMutationsPerformed: false,
        },
      },
      miniLaunchEmailStyleQaPacket,
      miniLaunchLocalEmailAssetPlan,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailManualUiBuildReceipt,
      miniLaunchSeedTestQaPacket,
      miniLaunchCrmWriteApprovalPacket,
      approvalQueue: {
        status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
        executiveSummary: {
          readyApprovalRequestCount: 2,
          blockedApprovalRequestCount: 3,
          openLiveMutationGateCount: 0,
          nextBestHumanBoundary: "shopify_no_live_local_build",
        },
        approvalItems: [
          { id: "mini_launch_email_manual_ui_builder", status: "reference_only_no_approval_request_now" },
          { id: "onboarding_v2_empty_group_creation", status: "reference_only_no_approval_request_now" },
        ],
      },
      approvalIntake: {
        status: "approval_text_present_but_no_exact_phrase_no_live_changes",
        executiveSummary: {
          executionAllowedNow: false,
          openLiveMutationGateCount: 0,
        },
      },
      blockedGateHandoff,
      missingInputsKit,
      missingInputsIntake,
      missingInputsRequestBundle,
      privateInputTemplatePack,
      taxonomyConsolidationAudit,
      taxonomyRefreshHandoff,
      taxonomyRefreshResponseWorkspace,
      taxonomyRefreshDecisionIntake,
      taxonomyRefreshResponseRequestBundle,
      continuationGuard,
    };
    const checks = buildRequirementChecks(valuesWithManualUiBuild);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));
    const audit = buildGoalAudit({
      values: valuesWithManualUiBuild,
      sourceDigests,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchManualUiBuildReceiptStatus=manual_ui_build_receipt_executed_drafts_created_no_sends");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchManualUiDraftVisibleCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchManualUiBuildClosed=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchManualUiEditor=new_simple_editor");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalPacketStatus=crm_write_approval_packet_blocked_missing_observed_events_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalCanAskApproval=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalExactEventCount=0");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalExactPersonCount=0");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalCandidateFamilyCount=4");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalOperationsExecuted=0");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWriteApprovalBlockers=real_observed_event_file_missing|exact_observed_events_missing|exact_person_identity_missing");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWritePolicyPacketReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWritePolicyResolvedBlockers=card_write_policy_packet_missing|identity_stitching_packet_missing");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("miniLaunchCrmWritePolicyOpenBlockers=none");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("blockedGateHandoffStatus=blocked_gate_handoff_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("blockedGateHandoffCanAskApprovalNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("blockedGateHandoffInputIds=exact_seed_recipient|real_observed_events_file|exact_people|writable_event_screen|fact_store_market_review");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitStatus=missing_inputs_kit_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitInputCount=5");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitCanAskApprovalNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitCreatesPrivateFiles=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitAsksApproval=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsKitInputIds=exact_seed_recipient|real_observed_events_file|exact_people|writable_event_screen|fact_store_market_review");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsIntakeStatus=missing_inputs_intake_waiting_for_inputs_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsIntakeReadyInputCount=0");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsIntakeCanAskApprovalNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsIntakeFullPrivateValuesStored=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleStatus=missing_inputs_request_bundle_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleRequestCount=5");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleCopyBlocksReady=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleCreatesPrivateFiles=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleAsksApproval=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("missingInputsRequestBundleCanAskApprovalNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("privateInputTemplatePackStatus=private_input_template_pack_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("privateInputTemplatePackExampleFileCount=2");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("privateInputTemplatePackCreatesActivePrivateInputFiles=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("privateInputTemplatePackWritesRealPrivateValues=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("privateInputTemplatePackCanAskApprovalNow=false");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("continuationGuardStatus=mailerlite_launch_os_continuation_guard_ready_no_live_changes");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("continuationGuardOldUiWorkClosed=true");
    expect(byId.prepare_frequent_mini_launch_infrastructure.evidence).toContain("continuationGuardUiWorkAction=do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).toContain("four mini-launch drafts already exist in MailerLite Drafts");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).toContain("CRM write approval packet exists as the current boundary");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).not.toContain("no MailerLite creation is authorized yet");
    expect(audit.executiveSummary.nextBestMove).toContain("four mini-launch email assets are now represented as MailerLite UI drafts");
    expect(audit.executiveSummary.nextBestMove).toContain("exact seed recipient");
    expect(audit.executiveSummary.nextBestMove).toContain("no UI repair is pending");
    expect(audit.executiveSummary.nextBestMove).toContain("CRM write approval packet is the current CRM boundary");
    expect(audit.executiveSummary.nextBestMove).toContain("blocked-gate handoff");
    expect(audit.executiveSummary.nextBestMove).toContain("missing-inputs kit");
    expect(audit.executiveSummary.nextBestMove).toContain("missing-inputs intake");
    expect(audit.executiveSummary.nextBestMove).toContain("missing-inputs request bundle");
    expect(audit.executiveSummary.nextBestMove).toContain("private-input template pack");
    expect(audit.executiveSummary.nextBestMove).toContain("taxonomy consolidation audit");
    expect(audit.executiveSummary.nextBestMove).toContain("taxonomy refresh handoff");
    expect(audit.executiveSummary.nextBestMove).toContain("taxonomy response workspace");
    expect(audit.executiveSummary.nextBestMove).toContain("taxonomy decision intake");
    expect(audit.executiveSummary.nextBestMove).toContain("taxonomy response request bundle");
    expect(audit.executiveSummary.nextBestMove).toContain("continuation guard");
    expect(audit.executiveSummary.taxonomyConsolidationAuditStatus).toBe("taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes");
    expect(audit.executiveSummary.taxonomyConsolidationLiveEvidenceGroupCount).toBe(19);
    expect(audit.executiveSummary.taxonomyConsolidationBrandPromotionNeededCount).toBe(14);
    expect(audit.executiveSummary.taxonomyConsolidationCrmManifestRefreshNeededCount).toBe(14);
    expect(audit.executiveSummary.taxonomyConsolidationCanAskApprovalNow).toBe(false);
    expect(audit.executiveSummary.taxonomyRefreshHandoffStatus).toBe("taxonomy_refresh_handoff_ready_no_live_changes");
    expect(audit.executiveSummary.taxonomyRefreshBrandPromotionDecisionCount).toBe(14);
    expect(audit.executiveSummary.taxonomyRefreshCrmManifestPatchCount).toBe(14);
    expect(audit.executiveSummary.taxonomyRefreshCanApplyCrmManifestPatchNow).toBe(false);
    expect(audit.executiveSummary.taxonomyRefreshResponseWorkspaceStatus).toBe("taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(audit.executiveSummary.taxonomyRefreshResponsePendingActorCount).toBe(2);
    expect(audit.executiveSummary.taxonomyRefreshResponseReadyForIntake).toBe(false);
    expect(audit.executiveSummary.taxonomyRefreshDecisionIntakeStatus).toBe("taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes");
    expect(audit.executiveSummary.taxonomyRefreshDecisionRowsPresent).toBe(0);
    expect(audit.executiveSummary.taxonomyRefreshDecisionRowsNeeded).toBe(14);
    expect(audit.executiveSummary.taxonomyRefreshDecisionReadyForLocalPatchPreview).toBe(false);
    expect(audit.executiveSummary.taxonomyRefreshResponseRequestBundleStatus).toBe("taxonomy_refresh_response_request_bundle_ready_no_live_changes");
    expect(audit.executiveSummary.taxonomyRefreshResponseRequestCount).toBe(2);
    expect(audit.executiveSummary.taxonomyRefreshResponseRequestMissingFinalResponseCount).toBe(2);
    expect(audit.executiveSummary.taxonomyRefreshResponseRequestAsksLiveApproval).toBe(false);
    expect(audit.executiveSummary.taxonomyRefreshResponseRequestCreatesFinalResponseFiles).toBe(false);
    expect(audit.executiveSummary.missingInputsIntakeStatus).toBe("missing_inputs_intake_waiting_for_inputs_no_live_changes");
    expect(audit.executiveSummary.missingInputsIntakeReadyInputCount).toBe(0);
    expect(audit.executiveSummary.missingInputsIntakeCanAskApprovalNow).toBe(false);
    expect(audit.executiveSummary.missingInputsRequestBundleStatus).toBe("missing_inputs_request_bundle_ready_no_live_changes");
    expect(audit.executiveSummary.missingInputsRequestBundleRequestCount).toBe(5);
    expect(audit.executiveSummary.missingInputsRequestBundleCopyBlocksReady).toBe(true);
    expect(audit.executiveSummary.missingInputsRequestBundleAsksApproval).toBe(false);
    expect(audit.executiveSummary.privateInputTemplatePackStatus).toBe("private_input_template_pack_ready_no_live_changes");
    expect(audit.executiveSummary.privateInputTemplatePackExampleFileCount).toBe(2);
    expect(audit.executiveSummary.privateInputTemplatePackCreatesActivePrivateInputFiles).toBe(false);
    expect(audit.executiveSummary.privateInputTemplatePackWritesRealPrivateValues).toBe(false);
    expect(audit.executiveSummary.continuationGuardOldUiWorkClosed).toBe(true);
    expect(audit.executiveSummary.nextBestMove).not.toContain("exact asset-build approval is still required");
    expect(audit.nextMoves.join(" ")).toContain("Do not rerun mini-launch empty-group creation");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS approval intake");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS blocked-gate handoff");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS missing-inputs kit");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS missing-inputs intake");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS missing-inputs request bundle");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS taxonomy consolidation audit");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS taxonomy response request bundle");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS private-input template pack");
    expect(audit.nextMoves.join(" ")).toContain("Use the Launch OS continuation guard");
    expect(audit.nextMoves.join(" ")).toContain("canAskApprovalNow=false");
    expect(audit.nextMoves.join(" ")).toContain("collect only the private seed email");
    expect(audit.nextMoves.join(" ")).not.toContain("Generate the Launch OS approval intake");
    expect(audit.nextMoves.join(" ")).not.toContain("If the mini-launch empty-group approval packet is ready");
    expect(new Set(audit.nextMoves).size).toBe(audit.nextMoves.length);
  });

  test("surfaces seed inbox correction plan as current no-live boundary", () => {
    const audit = buildGoalAudit({
      values: {
        ...values,
        miniLaunchSeedInboxQa,
        miniLaunchSeedInboxCorrectionPlan,
      },
      sourceDigests,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const infrastructureRequirement = audit.requirements.find(
      (requirement) => requirement.id === "prepare_frequent_mini_launch_infrastructure",
    );

    expect(audit.executiveSummary.seedInboxCorrectionPlanStatus).toBe("seed_inbox_correction_plan_ready_no_live_changes");
    expect(audit.executiveSummary.seedInboxCorrectionPlanRequiredInputIds).toEqual([
      "final_public_links",
      "subscription_reason_policy",
    ]);
    expect(audit.executiveSummary.seedInboxCorrectionPlanCanAskUiEditApprovalNow).toBe(false);
    expect(audit.executiveSummary.seedInboxCorrectionPlanCanAskPublicSendApprovalNow).toBe(false);
    expect(audit.nextMoves.join("\n")).toContain("Seed inbox correction plan is ready after Gmail QA");
    expect(infrastructureRequirement?.evidence.join("\n")).toContain("miniLaunchSeedInboxCorrectionPlanCorrectionCount=4");
    expect(infrastructureRequirement?.evidence.join("\n")).toContain("miniLaunchSeedInboxCorrectionPlanBlockers=public_readiness_yellow|final_public_links_missing|subscription_reason_policy_missing|exact_mailerlite_ui_edit_approval_missing|fresh_post_correction_qa_missing");
  });

  test("prioritizes partial Null Audience seed inbox QA over older UI-edit boundaries", () => {
    const audit = buildGoalAudit({
      values: {
        ...values,
        reconciliationBoard: reconciliationBoardAfterResponses,
        responseWorkspace: responseWorkspaceAfterResponses,
        finalizationPreflight: finalizationPreflightAfterResponses,
        miniLaunchEmailStyleQaPacket,
        miniLaunchLocalEmailAssetPlan,
        miniLaunchEmailAssetBuildScopePacket,
        miniLaunchEmailBuilderPayloadManifest,
        miniLaunchEmailRenderQa,
        miniLaunchEmailManualUiBuildReceipt,
        miniLaunchSeedTestQaPacket,
        miniLaunchSeedInboxQa,
        miniLaunchNullAudienceSeedInboxQa,
        miniLaunchSeedInboxCorrectionPlan,
      },
      sourceDigests,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const infrastructureRequirement = audit.requirements.find(
      (requirement) => requirement.id === "prepare_frequent_mini_launch_infrastructure",
    );

    expect(audit.executiveSummary.nullAudienceSeedInboxQaPartialE04).toBe(true);
    expect(audit.executiveSummary.nullAudienceSeedInboxQaDeliveredToApprovedSeed).toBe(3);
    expect(audit.executiveSummary.nullAudienceSeedInboxQaExpectedSeedMessages).toBe(4);
    expect(audit.executiveSummary.nextBestMove).toContain("Null Audience seed inbox QA is partial");
    expect(audit.executiveSummary.nextBestMove).toContain("exact E04-only resend phrase");
    expect(infrastructureRequirement?.evidence.join("\n")).toContain(
      "miniLaunchNullAudienceSeedInboxQaStatus=mailerlite_null_audience_seed_inbox_qa_partial_blocked_e04_not_delivered_to_seed",
    );
  });

  test("keeps mini-launch distribution anchored to pilot strategy evidence", () => {
    const audit = buildGoalAudit({
      values: {
        ...values,
        reconciliationBoard: reconciliationBoardAfterResponses,
        responseWorkspace: responseWorkspaceAfterResponses,
        finalizationPreflight: finalizationPreflightAfterResponses,
        runbook: {
          ...runbook,
          currentState: {
            ...runbook.currentState,
            miniLaunch: {
              ...runbook.currentState.miniLaunch,
              publicLaunchReadinessPacketStatus: "mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes",
              publicLaunchReadinessReadyForExactApproval: false,
              publicLaunchReadinessPublicAudienceSendUrlGateReady: false,
              publicLaunchReadinessPublicAudienceScopeReady: false,
              publicLaunchReadinessCrmObservedEventsReady: false,
              publicLaunchReadinessBlockerCount: 3,
            },
          },
        },
      },
      sourceDigests,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(audit.executiveSummary.publicSendPreflightRecommendedAudienceScopeId).toBe("keep_null_audience_no_public_send");
    expect(audit.executiveSummary.publicSendPreflightRecommendedAudienceKnownActiveCount).toBe(0);
    expect(audit.executiveSummary.publicSendPreflightMassSubscriberSendRecommendedNow).toBe(false);
    expect(audit.executiveSummary.publicSendPreflightAudienceStrategyGateRequiredBeforeMassSend).toBe(true);
    expect(audit.executiveSummary.nextBestMove).toContain("Public-send preflight is strategy evidence only");
    expect(audit.executiveSummary.nextBestMove).toContain("canAskExactApprovalNow=false");
    expect(audit.executiveSummary.nextBestMove).toContain("postLaunchCrmObservedEventsReady=false");
    expect(audit.executiveSummary.nextBestMove).not.toContain("crmObservedEventsReady=false, blockers=3");
    expect(audit.executiveSummary.nextBestMove.match(/Public-send preflight is strategy evidence only/g)).toHaveLength(1);
    expect(audit.nextMoves.join("\n")).toContain("Public-send preflight is strategy evidence only");
  });

  test("promotes Brújula status when local render QA is green but keeps public gates closed", () => {
    const checks = buildRequirementChecks({
      ...values,
      brujulaEmailRenderQa,
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.brujula_test_pilot_status.status).toBe("partial_functional_green_corrected_draft_render_checked_needs_mailerlite_builder_qa");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailRenderQaStatus=brujula_email1_local_render_qa_green_no_live_changes");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailRenderQaLocalRenderReady=true");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailRenderQaPreviewNonEmpty=true");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailRenderQaPreviewSize=56000");
    expect(byId.brujula_test_pilot_status.evidence).toContain("emailRenderQaPublicUseReady=false");
  });

  test("treats Brújula manual UI draft build receipt as a closed builder boundary", () => {
    const checks = buildRequirementChecks({
      ...values,
      brujulaEmailRenderQa,
      brujulaEmailManualUiBuildReceipt,
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.brujula_test_pilot_status.status).toBe("partial_functional_green_corrected_draft_built_in_mailerlite_needs_render_qa_and_test_send_approval");
    expect(byId.brujula_test_pilot_status.evidence).toContain("manualUiBuildReceiptStatus=brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends");
    expect(byId.brujula_test_pilot_status.evidence).toContain("manualUiCampaignId=188677585118430654");
    expect(byId.brujula_test_pilot_status.evidence).toContain("manualUiOutboxCount=0");
    expect(byId.brujula_test_pilot_status.evidence).toContain("manualUiBuildClosed=true");
    expect(byId.brujula_test_pilot_status.remaining.join(" ")).toContain("manual UI build receipt as current draft evidence");
  });

  test("uses the persistent validation receipt when explicit validation flags are absent", () => {
    const checks = buildRequirementChecks({
      ...values,
      validationReceipt,
    });
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.validate_with_dry_runs_and_tests.status).toBe("proven");
    expect(byId.validate_with_dry_runs_and_tests.evidence).toContain("validationStatus=passed");
    expect(byId.validate_with_dry_runs_and_tests.evidence).toContain("validationReceiptStatus=mailerlite_launch_os_validation_receipt_ready_no_live_changes");
    expect(byId.validate_with_dry_runs_and_tests.evidence).toContain("validationReceiptTestFiles=46");
    expect(byId.validate_with_dry_runs_and_tests.evidence).toContain("validationReceiptTestCount=260");
  });

  test("summarizes incomplete goal without opening live gates", () => {
    const checks = buildRequirementChecks(values);
    const summary = summarizeCompletion(checks);

    expect(summary.readyForLiveOperation).toBe(false);
    expect(summary.overallStatus).toBe("goal_active_not_ready_for_live_operation");
    expect(summary.blockedCount).toBe(1);
    expect(summary.provenCount).toBeGreaterThan(2);
  });

  test("builds an audit with explicit next moves and safety flags", () => {
    const audit = buildGoalAudit({
      values,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(audit.status).toBe("goal_active_not_ready_for_live_operation");
    expect(audit.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(audit.executiveSummary.nextBestMove).toContain("request bundle");
    expect(audit.executiveSummary.nextBestMove).toContain("response watcher");
    expect(audit.nextMoves.join(" ")).toContain("local email asset plan");
    expect(audit.nextMoves.join(" ")).toContain("final response files only");
    expect(audit.nextMoves.join(" ")).toContain("response watcher");
    expect(audit.nextMoves.join(" ")).toContain("onboarding trunk map");
    expect(audit.nextMoves.join(" ")).toContain("Brújula Email 1 correction packet");
    expect(audit.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      groupMutationsPerformed: false,
      sendsPerformed: false,
    });
  });

  test("renders operator-readable markdown", () => {
    const audit = buildGoalAudit({
      values,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(audit);

    expect(markdown).toContain("# MailerLite Launch OS v0 - Goal Audit");
    expect(markdown).toContain("Status: goal_active_not_ready_for_live_operation");
    expect(markdown).toContain("### define_mini_launch_to_onboarding_handoff");
    expect(markdown).toContain("### coordinate_brand_web_crm");
    expect(markdown).toContain("blocked_waiting_department_final_responses");
    expect(markdown).toContain("No MailerLite, Shopify or CRM live API calls");
  });
});
