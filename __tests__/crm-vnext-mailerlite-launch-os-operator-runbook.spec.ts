import { describe, expect, test } from "vitest";

import {
  buildApprovalMatrix,
  buildCurrentState,
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
    expect(parsed.backlogBoard).toContain("mailerlite_mini_launch_backlog_board_2026-05-27.json");
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
    expect(parsed.validationReceipt).toContain("mailerlite_launch_os_validation_receipt_2026-05-27.json");
    expect(parsed.onboardingTrunkMap).toContain("mailerlite_onboarding_trunk_map_2026-05-27.json");
    expect(parsed.onboardingV2EventContract).toContain("mailerlite_onboarding_v2_event_contract_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsCreateDryRun).toContain("mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json");
    expect(parsed.onboardingV2FirstEmailMap).toContain("mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(parsed.miniLaunchEmailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchLocalEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildScopePacket).toContain("mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
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
      brujulaPlan,
      brujulaApply,
      brujulaEmailStyleQa,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
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
  });

  test("approval matrix keeps all live operations behind explicit gates", () => {
    const matrix = buildApprovalMatrix();

    expect(matrix.find((gate) => gate.action === "create_mailerlite_groups")?.status).toBe("closed_until_exact_alejandro_approval");
    expect(matrix.find((gate) => gate.action === "mailerlite_email_asset_build")?.status).toBe("closed_until_exact_asset_build_scope_approval");
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
      validationReceipt,
      packageJson,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(runbook.status).toBe("mailerlite_launch_os_operator_runbook_ready_no_live_changes");
    expect(runbook.schemaVersion).toContain("trunk-contract");
    expect(runbook.commandCatalog.length).toBeGreaterThan(10);
    expect(runbook.operatingPrinciples).toHaveLength(4);
    expect(runbook.operatingScenarios).toHaveLength(8);
    expect(runbook.currentState.liveGates.openLiveGateCount).toBe(0);
    expect(runbook.reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(runbook.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("builds report map from consulted source paths", () => {
    const reportMap = buildReportMap([
      ...sourceDigests,
      {
        path: "/tmp/mailerlite_mini_launch_backlog_board_2026-05-27.json",
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
        path: "/tmp/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json",
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
        path: "/tmp/mailerlite_launch_os_validation_receipt_2026-05-27.json",
        present: true,
        chars: 2000,
        consultedFor: "persistent Launch OS validation receipt",
      },
    ]);

    expect(reportMap.controlRoom).toBe("/tmp/mailerlite-launch-os-v0-control-room.md");
    expect(reportMap.backlogBoard).toBe("/tmp/mailerlite_mini_launch_backlog_board_2026-05-27.json");
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
    expect(reportMap.onboardingV2EmptyGroupsCreateDryRun).toBe("/tmp/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json");
    expect(reportMap.onboardingV2FirstEmailMap).toBe("/tmp/mailerlite_onboarding_v2_first_email_map_2026-05-27.json");
    expect(reportMap.miniLaunchEmailAssetBuildScopePacket).toBe("/tmp/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.miniLaunchEmailBuilderPayloadManifest).toBe("/tmp/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(reportMap.brujulaEmailStyleQa).toBe("/tmp/mailerlite_brujula_email_style_qa_packet_2026-05-27.json");
    expect(reportMap.brujulaEmailStyleCorrection).toBe("/tmp/mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(reportMap.brujulaEmailRenderQa).toBe("/tmp/mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(reportMap.validationReceipt).toBe("/tmp/mailerlite_launch_os_validation_receipt_2026-05-27.json");
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
