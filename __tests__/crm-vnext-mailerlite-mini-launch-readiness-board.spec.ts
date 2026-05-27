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
  readiness: {
    brandDictionaryHasTargets: true,
    brandApprovedForEmptyCreate: true,
    canCreateNamedEmptyGroupsAfterExplicitApproval: true,
    canAssignSubscribersNow: false,
    canSendNow: false,
    canAttachWorkflowNow: false,
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
    expect(parsed.shopifyHandoffPacket).toContain("mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/board.json");
    expect(parsed.markdownOut).toBe("/tmp/board.md");
  });

  test("extracts launch from available packets", () => {
    expect(launchFrom({}, eventContract, emailSequencePacket)).toEqual(launch);
  });

  test("builds lanes with Brand, Web, CRM and MailerLite boundaries", () => {
    const lanes = buildLanes(packetSet);
    const byId = new Map(lanes.map((lane) => [lane.id, lane]));

    expect(lanes).toHaveLength(9);
    expect(byId.get("shopify_web_handoff")).toMatchObject({
      owner: "Web Design / Shopify",
      readyNow: true,
    });
    expect(byId.get("mailerlite_group_dry_run")).toMatchObject({
      readyNow: false,
      blockedBy: ["brand_dictionary_candidate_rows_missing"],
    });
    expect(byId.get("email_sequence")?.liveActionsClosed).toContain("seed_send");
    expect(byId.get("onboarding_protection")?.liveActionsClosed).toContain("edit_onboarding_v1");
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
    expect(queues.mailerLite.join(" ")).toContain("No action now");
    expect(queues.alejandro.join(" ")).toContain("No immediate live decision needed");
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
