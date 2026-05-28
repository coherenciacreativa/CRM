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

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
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
  miniLaunchCrmWriteApprovalPacket: null,
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

    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-28.json");
    expect(parsed.controlRoom).toContain("mailerlite-launch-os-v0-control-room.md");
    expect(parsed.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(parsed.finalizationPreflight).toContain("mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json");
    expect(parsed.requestBundle).toContain("mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json");
    expect(parsed.responseWatcher).toContain("mailerlite_mini_launch_department_review_response_watcher_inteligencia_descansar_2026-05-27.json");
    expect(parsed.onboardingTrunkMap).toContain("mailerlite_onboarding_trunk_map_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsCreateDryRun).toContain("mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json");
    expect(parsed.onboardingV2FirstEmailMap).toContain("mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.miniLaunchEmailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchLocalEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildScopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailRenderQa).toContain("mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailManualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchCrmWriteApprovalPacket).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.brujulaEmailStyleQa).toContain("mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(parsed.brujulaEmailStyleCorrection).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.brujulaEmailRenderQa).toContain("mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(parsed.brujulaEmailManualUiBuildReceipt).toContain("mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json");
    expect(parsed.validationReceipt).toContain("mailerlite_launch_os_validation_receipt_2026-05-28.json");
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
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).toContain("four mini-launch drafts already exist in MailerLite Drafts");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).toContain("CRM write approval packet exists as the current boundary");
    expect(byId.prepare_frequent_mini_launch_infrastructure.remaining.join(" ")).not.toContain("no MailerLite creation is authorized yet");
    expect(audit.executiveSummary.nextBestMove).toContain("four mini-launch email assets are now represented as MailerLite UI drafts");
    expect(audit.executiveSummary.nextBestMove).toContain("CRM write approval packet is the current CRM boundary");
    expect(audit.executiveSummary.nextBestMove).not.toContain("exact asset-build approval is still required");
    expect(audit.nextMoves.join(" ")).toContain("Do not rerun mini-launch empty-group creation");
    expect(audit.nextMoves.join(" ")).not.toContain("If the mini-launch empty-group approval packet is ready");
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
