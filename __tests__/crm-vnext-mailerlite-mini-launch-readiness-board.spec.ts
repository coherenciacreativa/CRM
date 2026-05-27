import { describe, expect, test } from "vitest";

import {
  buildDepartmentQueues,
  buildLanes,
  buildLiveGateMatrix,
  buildReadinessBoard,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-readiness-board.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const onboardingExecutionPacket = {
  ok: true,
  status: "ready_for_human_decision_or_non_live_continuation",
  gateQueue: [],
};

const rehearsalPacket = {
  ok: true,
  status: "mini_launch_rehearsal_ready_no_live_changes",
  launch,
};

const eventContract = {
  ok: true,
  status: "mini_launch_event_contract_ready_no_ledger_write",
  launch,
};

const seedTestQaPacket = {
  ok: true,
  status: "seed_test_qa_packet_ready_no_live_changes",
  launch,
  readiness: {
    readyForSeedSendNow: false,
    readyForReceiptSeedTestNow: false,
  },
};

const brandEmailAssetPacket = {
  ok: true,
  status: "brand_email_asset_packet_ready_for_brand_review_no_live_changes",
  launch,
  readiness: {
    brandReviewStatus: "needs_brand_review",
    readyForSeedSendNow: false,
  },
};

const groupDryRun = {
  ok: true,
  status: "blocked_until_brand_dictionary_candidates",
  launch,
  readiness: {
    canCreateNamedEmptyGroupsAfterExplicitApproval: false,
  },
};

const promotedGroupDryRun = {
  ...groupDryRun,
  status: "mini_launch_group_dry_run_ready_for_future_empty_group_decision",
  summary: {
    missingBrandCandidateCount: 0,
    brandStatusBlockedCount: 0,
  },
  plannedGroups: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      layer: "Source",
      registeredInBrandDictionary: true,
      brandStatus: "proposed_local",
      existsInMailerLite: false,
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      layer: "Delivered",
      registeredInBrandDictionary: true,
      brandStatus: "proposed_local",
      existsInMailerLite: false,
    },
  ],
  readiness: {
    brandDictionaryHasTargets: true,
    brandApprovedForEmptyCreate: true,
    canCreateNamedEmptyGroupsAfterExplicitApproval: true,
    canAssignSubscribersNow: false,
    canSendNow: false,
    canAttachWorkflowNow: false,
  },
};

const emptyGroupCreationPacket = {
  ok: true,
  status: "ready_for_exact_human_approval_to_create_mini_launch_empty_groups",
  launch,
  decision: {
    canAskAlejandroForApproval: true,
    requiresFreshRerunBeforeExecution: true,
    packetIsApprovalByItself: false,
  },
  targetGroups: [
    { name: "CC · Source · Quiz · Inteligencia para descansar" },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
};

const emptyGroupCreateDryRun = {
  ok: true,
  status: "dry_run_ready_for_exact_approval",
  mode: "dry_run",
  launch,
  freshScan: {
    groupsRead: 75,
    targetGroupsExistingCount: 0,
    targetGroupsMissingCount: 2,
  },
  decision: {
    canExecute: false,
    blockers: [],
  },
  createdGroups: [],
  safety: {
    mailerLiteMutationsPerformed: false,
  },
};

const brandCandidateReviewPacket = {
  ok: true,
  status: "brand_candidate_review_packet_ready_no_live_changes",
  launch,
  brandDecisionRequest: {
    recommendedDecision: "add_as_candidate",
  },
  dictionaryState: {
    missingCandidateCount: 2,
  },
};

const emailSequencePacket = {
  ok: true,
  status: "email_sequence_asset_packet_ready_for_brand_review_no_live_changes",
  launch,
  readiness: {
    brandReviewStatus: "needs_brand_review_full_sequence",
    readyForMailerLiteAssetBuildNow: false,
  },
};

const emailStyleQaPacket = {
  ok: true,
  status: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
  launch,
  executiveSummary: {
    brandSequenceApprovedNoLive: true,
    readyForLocalAssetPlanNow: true,
    hardBlockerCount: 0,
    yellowCheckCount: 4,
    styleGapCount: 3,
    claimsRiskCount: 2,
    publicInternalLeakIssueCount: 0,
  },
  approvalGate: {
    readyForLocalAssetPlanNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    readyForReceiptSeedTestNow: false,
    readyForAudienceLaunchNow: false,
    nextNoLiveMove: "Prepare local email asset plan/style implementation from this QA packet; do not build in MailerLite or send until exact scope approval.",
  },
};

const localEmailAssetPlan = {
  ok: true,
  status: "mini_launch_local_email_asset_plan_ready_no_live_changes",
  launch,
  executiveSummary: {
    assetCount: 4,
    styleQaStatus: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
    styleQaHardBlockerCount: 0,
    styleQaYellowCheckCount: 4,
    readyForLocalAssetPlanNow: true,
    readyForExactAssetBuildScopeRequestNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    placeholderCount: 4,
  },
  approvalBoundary: {
    readyForExactAssetBuildScopeRequestNow: true,
    readyForMailerLiteAssetBuildNow: false,
    readyForSeedSendNow: false,
    canCreateOrEditMailerLiteAssetsNow: false,
    canAssignSubscribersNow: false,
    canAttachWorkflowNow: false,
  },
};

const shopifyHandoffPacket = {
  ok: true,
  status: "shopify_handoff_packet_ready_for_web_design_review_no_live_changes",
  launch,
  readiness: {
    readyForWebDesignReviewNow: true,
    readyForShopifyRepoEditNow: false,
    readyForShopifyPreviewNow: false,
  },
};

const crmSignalProjectionPacket = {
  ok: true,
  status: "ready_for_no_live_signal_projection_design",
  launch,
  projectionModel: {
    currentProjectionReadyFor: ["email_open", "email_click", "email_reply"],
    storeOnlyNow: ["source_assigned", "resource_delivered"],
    futurePolicyOnlyEvents: ["quiz_completed", "result_viewed"],
  },
  projectionProof: {
    projection: {
      signalsGenerated: 3,
    },
  },
  approvalGate: {
    canAppendSignalLedgerNow: false,
    canWriteCardsNow: false,
    canScoreNow: false,
    canWriteFactStoreNow: false,
  },
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "mini-launch concept and handoffs",
  },
];

const packetSet = {
  onboardingExecutionPacket,
  rehearsalPacket,
  eventContract,
  seedTestQaPacket,
  brandEmailAssetPacket,
  groupDryRun,
  brandCandidateReviewPacket,
  emailSequencePacket,
  shopifyHandoffPacket,
  crmSignalProjectionPacket,
};

describe("CRM vNext MailerLite mini-launch readiness board", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/board.json",
      "--markdown-out",
      "/tmp/board.md",
    ]);

    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.emailStyleQaPacket).toContain("mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.localEmailAssetPlan).toContain("mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json");
    expect(parsed.shopifyHandoffPacket).toContain("mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.crmSignalProjectionPacket).toContain("mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emptyGroupCreationPacket).toContain("mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.emptyGroupCreateDryRun).toContain("mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/board.json");
    expect(parsed.markdownOut).toBe("/tmp/board.md");
  });

  test("extracts launch from available packets", () => {
    expect(launchFrom({}, eventContract, emailSequencePacket)).toEqual(launch);
  });

  test("builds lanes with Brand, Web, CRM and MailerLite boundaries", () => {
    const lanes = buildLanes(packetSet);
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(lanes).toHaveLength(12);
    expect(byId.get("crm_signal_projection_packet")).toMatchObject({
      owner: "CRM / Signal OS",
      readyNow: true,
      readiness: {
        canAppendSignalLedgerNow: false,
        canWriteCardsNow: false,
        canScoreNow: false,
        canWriteFactStoreNow: false,
      },
    });
    expect(byId.get("shopify_web_handoff")).toMatchObject({
      owner: "Web Design / Shopify",
      readyNow: true,
    });
    expect(byId.get("mailerlite_group_dry_run")).toMatchObject({
      readyNow: false,
      blockedBy: ["brand_dictionary_candidate_rows_missing"],
    });
    expect(byId.get("mailerlite_empty_group_approval_packet")).toMatchObject({
      readyNow: false,
      blockedBy: ["empty_group_creation_packet_not_generated"],
    });
    expect(byId.get("mailerlite_empty_group_create_dry_run")).toMatchObject({
      readyNow: false,
      blockedBy: ["mini_launch_empty_group_create_dry_run_not_generated"],
    });
    expect(byId.get("email_sequence")?.liveActionsClosed).toContain("seed_send");
    expect(byId.get("onboarding_protection")?.liveActionsClosed).toContain("edit_onboarding_v1");
  });

  test("moves the email sequence lane from Brand review to local asset planning after Email Style QA", () => {
    const lanes = buildLanes({
      ...packetSet,
      emailStyleQaPacket,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("email_sequence")).toMatchObject({
      sourceStatus: "mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes",
      readyNow: true,
      blockedBy: [
        "exact_mailerlite_asset_build_scope",
        "builder_render_qa_before_seed_send",
        "exact_seed_send_approval",
      ],
      readiness: {
        brandReviewStatus: "approved_no_live_from_final_brand_response",
        readyForLocalAssetPlanNow: true,
        readyForMailerLiteAssetBuildNow: false,
        readyForSeedSendNow: false,
        hardBlockerCount: 0,
        yellowCheckCount: 4,
      },
    });
    expect(byId.get("email_sequence")?.nextAction).toContain("do not build in MailerLite or send");
    expect(byId.get("email_sequence")?.liveActionsClosed).toContain("mailerLite_asset_build");
  });

  test("moves the email sequence lane from QA to local asset-plan boundary", () => {
    const lanes = buildLanes({
      ...packetSet,
      emailStyleQaPacket,
      localEmailAssetPlan,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("email_sequence")).toMatchObject({
      sourceStatus: "mini_launch_local_email_asset_plan_ready_no_live_changes",
      readyNow: true,
      readiness: {
        readyForLocalAssetPlanNow: true,
        readyForExactAssetBuildScopeRequestNow: true,
        readyForMailerLiteAssetBuildNow: false,
        readyForSeedSendNow: false,
        assetCount: 4,
        placeholderCount: 4,
        canCreateOrEditMailerLiteAssetsNow: false,
      },
    });
    expect(byId.get("email_sequence")?.nextAction).toContain("do not build assets");
  });

  test("marks empty group approval packet ready only as a human boundary", () => {
    const lanes = buildLanes({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
      emptyGroupCreationPacket,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("mailerlite_empty_group_approval_packet")).toMatchObject({
      readyNow: true,
      blockedBy: [],
      readiness: {
        canAskAlejandroForApproval: true,
        targetGroupCount: 2,
        requiresFreshRerunBeforeExecution: true,
        packetIsApprovalByItself: false,
      },
    });
    expect(byId.get("mailerlite_empty_group_approval_packet")?.nextAction).toContain("Pause at Alejandro decision boundary");
    expect(byId.get("mailerlite_empty_group_approval_packet")?.liveActionsClosed).toContain("group_creation_until_exact_phrase");
  });

  test("marks create runner dry-run ready only as a pre-execute human boundary", () => {
    const lanes = buildLanes({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
      emptyGroupCreationPacket,
      emptyGroupCreateDryRun,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("mailerlite_empty_group_create_dry_run")).toMatchObject({
      readyNow: true,
      blockedBy: [],
      readiness: {
        freshGroupsRead: 75,
        targetGroupsExistingCount: 0,
        targetGroupsMissingCount: 2,
        createdCount: 0,
        canExecute: false,
        mailerLiteMutationsPerformed: false,
      },
    });
    expect(byId.get("mailerlite_empty_group_create_dry_run")?.nextAction).toContain("Pause at Alejandro exact-phrase boundary");
    expect(byId.get("mailerlite_empty_group_create_dry_run")?.liveActionsClosed).toContain("execute_until_exact_phrase");
  });

  test("marks group dry-run ready only after Brand promotion and fresh read-only scan", () => {
    const lanes = buildLanes({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("mailerlite_group_dry_run")).toMatchObject({
      readyNow: true,
      blockedBy: [],
    });
    expect(byId.get("mailerlite_group_dry_run")?.nextAction).toContain("exact empty-group creation approval packet");
    expect(byId.get("mailerlite_group_dry_run")?.liveActionsClosed).toContain("subscriber_assignment");
  });

  test("closes the Brand candidate lane from a promoted dry-run even when the request packet is historical", () => {
    const lanes = buildLanes({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
    });
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(byId.get("brand_candidate_groups")).toMatchObject({
      sourceStatus: "brand_candidate_decision_closed_ready_no_live_changes",
      readyNow: true,
      blockedBy: [],
      readiness: {
        decisionState: "closed_from_promoted_group_dry_run",
        acceptedGroupCount: 2,
        missingCandidateCount: 0,
        historicalMissingCandidateCount: 2,
      },
    });
    expect(byId.get("brand_candidate_groups")?.nextAction).toContain("Empty group creation still requires exact Alejandro approval");
    expect(byId.get("brand_candidate_groups")?.liveActionsClosed).toContain("group_creation");
  });

  test("live gate matrix keeps only review gates open and all live mutations closed", () => {
    const matrix = buildLiveGateMatrix();

    expect(matrix.filter((gate) => gate.status === "open_no_live").map((gate) => gate.id)).toEqual([
      "brand_review",
      "web_design_review",
    ]);
    expect(matrix.find((gate) => gate.id === "mailerlite_group_creation")).toMatchObject({
      status: "closed",
      needsAlejandroApprovalNow: true,
    });
    expect(matrix.find((gate) => gate.id === "audience_launch")).toMatchObject({
      status: "closed",
      owner: "Alejandro",
    });
  });

  test("department queues make immediate work non-live", () => {
    const lanes = buildLanes(packetSet);
    const queues = buildDepartmentQueues({ lanes });

    expect(queues.brand.join(" ")).toContain("Review Email 1");
    expect(queues.webDesign.join(" ")).toContain("local/draft scope only");
    expect(queues.crm.join(" ")).toContain("CRM signal projection packet is ready as no-live policy");
    expect(queues.mailerLite.join(" ")).toContain("No action now");
    expect(queues.alejandro.join(" ")).toContain("No immediate live decision needed");
  });

  test("department queues and next moves use Email Style QA after Brand sequence approval", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      emailStyleQaPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const queues = buildDepartmentQueues({ lanes: board.lanes });

    expect(board.executiveSummary.nextBestNoLiveMoves[0]).toContain("Email sequence Brand review is closed");
    expect(queues.brand.join(" ")).toContain("Brand sequence approval is closed");
    expect(queues.crm.join(" ")).toContain("Email Style QA is ready for local asset planning only");
  });

  test("builds board with no live mutation gates open", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.status).toBe("mini_launch_readiness_board_ready_no_live_changes");
    expect(board.executiveSummary).toMatchObject({
      overallState: "ready_for_department_reviews_not_ready_for_live_operation",
      liveMutationGateOpenCount: 0,
      noImmediateAlejandroLiveApprovalNeeded: true,
    });
    expect(board.safety).toMatchObject({
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
    });
    expect(board.operatorWarnings).toContain("Do not treat a Brand candidate decision as permission to create MailerLite groups.");
    expect(board.operatorWarnings).toContain("Do not treat the empty-group approval packet as execution approval; Alejandro must give the exact phrase and the runner must re-scan first.");
    expect(board.operatorWarnings).toContain("Do not run the mini-launch create runner with --execute unless Alejandro gives the exact phrase for the two named empty groups.");
    expect(board.operatorWarnings).toContain("Do not treat the CRM signal projection packet as permission to append ledgers, write cards, score, or touch Fact Store.");
  });

  test("updates executive next moves after group dry-run is no longer blocked", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.executiveSummary.nextBestNoLiveMoves.join(" ")).toContain("exact empty-group creation approval packet");
    expect(board.executiveSummary.nextBestNoLiveMoves.join(" ")).not.toContain("reruns the group dry-run after Brand");

    const queues = buildDepartmentQueues({ lanes: board.lanes });
    expect(queues.brand.join(" ")).toContain("Group candidate semantics are closed for this pass");
    expect(queues.crm.join(" ")).toContain("Use the fresh group dry-run");
  });

  test("updates executive next moves when the empty-group approval packet is prepared", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
      emptyGroupCreationPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.executiveSummary.nextBestNoLiveMoves.join(" ")).toContain("Run the mini-launch empty-group create runner in dry-run mode only");
    expect(board.executiveSummary.nextBestNoLiveMoves.join(" ")).not.toContain("Prepare an exact empty-group creation approval packet");
    expect(buildDepartmentQueues({ lanes: board.lanes }).crm.join(" ")).toContain("Exact empty-group approval packet is prepared");
  });

  test("updates executive next moves when the create runner dry-run is green", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      groupDryRun: promotedGroupDryRun,
      emptyGroupCreationPacket,
      emptyGroupCreateDryRun,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(board.executiveSummary.nextBestNoLiveMoves.join(" ")).toContain("create runner dry-run is green");
    expect(buildDepartmentQueues({ lanes: board.lanes }).crm.join(" ")).toContain("Mini-launch create runner dry-run is green");
  });

  test("renders board as an operator-safe report", () => {
    const board = buildReadinessBoard({
      ...packetSet,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(board);

    expect(markdown).toContain("Mini-Launch Readiness Board");
    expect(markdown).toContain("ready_for_department_reviews_not_ready_for_live_operation");
    expect(markdown).toContain("brand_candidate_groups");
    expect(markdown).toContain("Do not treat Web Design handoff as permission to publish");
    expect(markdown).toContain("Sin test email enviado");
  });
});
