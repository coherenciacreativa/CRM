import { describe, expect, test } from "vitest";

import {
  buildBlockedGateHandoff,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-blocked-gate-handoff.mjs";

const approvalQueue = {
  status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
  executiveSummary: {
    readyApprovalRequestCount: 0,
    blockedApprovalRequestCount: 2,
    openLiveMutationGateCount: 0,
  },
  approvalItems: [
    {
      id: "mini_launch_empty_group_creation",
      title: "Mini-launch empty MailerLite groups",
      lane: "mini_launch_inteligencia_para_descansar",
      status: "reference_only_no_approval_request_now",
      operationType: "live_mailerlite_group_creation_already_completed",
    },
    {
      id: "brujula_email1_builder_draft",
      title: "Brújula Email 1 corrected MailerLite draft",
      lane: "brujula_test_pilot",
      status: "reference_only_no_approval_request_now",
      operationType: "live_mailerlite_builder_draft_mutation_already_completed",
    },
    {
      id: "mini_launch_seed_send",
      title: "Mini-launch seed/test send",
      lane: "mini_launch_inteligencia_para_descansar",
      status: "prepared_but_blocked_before_approval_request",
      blockers: ["exact_seed_recipient_missing"],
      evidence: {
        manualUiDraftsBuilt: true,
        realMailerLiteRenderQaReady: true,
        targetGroupsExist: true,
      },
    },
    {
      id: "crm_signal_writes",
      title: "CRM signal ledger/card/scoring/Fact Store writes",
      lane: "crm_signal_projection",
      status: "prepared_but_blocked_before_approval_request",
      blockers: [
        "real_observed_event_file_missing",
        "exact_observed_events_missing",
        "exact_person_identity_missing",
      ],
    },
  ],
};

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
};

const goalAudit = {
  status: "goal_active_not_ready_for_live_operation",
};

const seedTestQa = {
  status: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
  readiness: {
    manualUiDraftsBuilt: true,
    readyForAudienceLaunchNow: false,
  },
};

const seedSendApproval = {
  status: "seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes",
  executiveSummary: {
    targetDraftCount: 4,
    realMailerLiteRenderQaReady: true,
    targetGroupsExist: true,
  },
  blockers: ["exact_seed_recipient_missing"],
  approvalBoundary: {
    canAskAlejandroForApproval: false,
    exactApprovalPhrase: null,
    exactApprovalPhraseTemplate: "Do not print this in the handoff",
    stillClosedEvenAfterApproval: [
      "public_or_audience_send",
      "workflow_or_automation_attachment",
      "crm_signal_ledger_append",
    ],
  },
};

const crmWriteApproval = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    approvalRequestReady: false,
    exactEventCountReady: 0,
    exactPersonCountReady: 0,
    candidateWriteFamilyCount: 4,
    writePolicyPacketReady: true,
    operationsPreviewed: 0,
    operationsExecuted: 0,
    blockers: [
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "exact_person_identity_missing",
      "observed_events_not_all_writable_or_contain_samples",
      "aggregate_market_review_missing",
      "exact_fact_store_facts_missing",
      "fact_store_write_approval_missing",
    ],
  },
  observedEventInputContract: {
    acceptedShape: "{ events: [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }",
  },
  launchEvidenceState: {
    projectionPacketStatus: "ready_for_no_live_signal_projection_design",
  },
  approvalBoundary: {
    canAskAlejandroForApproval: false,
    exactApprovalPhrase: null,
    blockersBeforeApprovalRequest: [
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "exact_person_identity_missing",
      "observed_events_not_all_writable_or_contain_samples",
      "aggregate_market_review_missing",
      "exact_fact_store_facts_missing",
      "fact_store_write_approval_missing",
    ],
    observedEventsSummary: {
      supplied: false,
      total: 0,
      writableCount: 0,
      exactPersonCount: 0,
    },
  },
  policyEffect: {
    resolvedPolicyBlockers: [
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
      "scoring_policy_for_mini_launch_missing",
      "source_delivered_receipts_must_not_score_by_themselves",
    ],
    policyBlockersStillOpen: [],
  },
};

const backlogBoard = {
  status: "mini_launch_backlog_board_ready_no_live_changes",
  wipSnapshot: {
    safeToIntakeOneMoreNoLiveIdea: true,
    remainingNoLivePrepCapacity: 2,
    rule: "Backlog capacity never grants live operation permission.",
  },
};

const sourceDigests = [
  { id: "approvalQueue", path: "/tmp/approval-queue.json", present: true, chars: 100, consultedFor: "queue" },
  { id: "seedTestQa", path: "/tmp/seed-qa.json", present: true, chars: 100, consultedFor: "seed QA" },
  { id: "seedSendApproval", path: "/tmp/seed-send.json", present: true, chars: 100, consultedFor: "seed approval" },
  { id: "crmWriteApproval", path: "/tmp/crm-write.json", present: true, chars: 100, consultedFor: "crm write" },
];

const buildHandoff = () => buildBlockedGateHandoff({
  approvalQueue,
  runbook,
  goalAudit,
  seedTestQa,
  seedSendApproval,
  crmWriteApproval,
  backlogBoard,
  sourceDigests,
  generatedAt: "2026-05-28T00:00:00.000Z",
});

describe("CRM vNext MailerLite Launch OS blocked gate handoff", () => {
  test("parses default paths and output args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/blocked.json",
      "--markdown-out",
      "/tmp/blocked.md",
    ]);

    expect(parsed.approvalQueue).toContain("mailerlite_launch_os_approval_queue_2026-05-28.json");
    expect(parsed.seedSendApproval).toContain("mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.crmWriteApproval).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/blocked.json");
  });

  test("builds a handoff with two blocked gates and no askable approval", () => {
    const handoff = buildHandoff();

    expect(handoff.status).toBe("blocked_gate_handoff_ready_no_live_changes");
    expect(handoff.executiveSummary.readyApprovalCount).toBe(0);
    expect(handoff.executiveSummary.blockedGateCount).toBe(2);
    expect(handoff.executiveSummary.canAskApprovalNow).toBe(false);
    expect(handoff.executiveSummary.openLiveMutationGateCount).toBe(0);
    expect(handoff.blockedGates.map((gate) => gate.id)).toEqual([
      "mini_launch_seed_send",
      "crm_signal_writes",
    ]);
  });

  test("seed gate asks for input instead of printing a future approval phrase", () => {
    const handoff = buildHandoff();
    const seedGate = handoff.blockedGates.find((gate) => gate.id === "mini_launch_seed_send");

    expect(seedGate?.state).toBe("waiting_exact_seed_recipient_before_approval_request");
    expect(seedGate?.inputNeededNow.map((item) => item.id)).toContain("exact_seed_recipient");
    expect(seedGate?.doNotAskYetReason).toContain("exact_seed_recipient_missing");
    expect(seedGate?.approvalLaterNotNow.exactApprovalPhraseAvailableNow).toBe(false);
    expect(JSON.stringify(handoff)).not.toContain("Do not print this in the handoff");
  });

  test("CRM gate names evidence and identity inputs while keeping write families closed", () => {
    const handoff = buildHandoff();
    const crmGate = handoff.blockedGates.find((gate) => gate.id === "crm_signal_writes");

    expect(crmGate?.state).toBe("waiting_real_observed_events_and_exact_people_before_approval_request");
    expect(crmGate?.inputNeededNow.map((item) => item.id)).toEqual([
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
    ]);
    expect(crmGate?.currentEvidence.writePolicyPacketReady).toBe(true);
    expect(crmGate?.currentEvidence.resolvedPolicyBlockers).toContain("scoring_policy_for_mini_launch_missing");
    expect(crmGate?.stillClosed).toContain("crm_scoring");
    expect(crmGate?.doNotAskYetReason).toContain("exact_person_identity_missing");
  });

  test("carries closed reference-only approvals and no-live capacity", () => {
    const handoff = buildHandoff();

    expect(handoff.closedReferenceOnlyApprovals.map((item) => item.id)).toEqual([
      "mini_launch_empty_group_creation",
      "brujula_email1_builder_draft",
    ]);
    expect(handoff.allowedNoLiveWork.safeToIntakeOneMoreNoLiveIdea).toBe(true);
    expect(handoff.allowedNoLiveWork.remainingNoLivePrepCapacity).toBe(2);
  });

  test("renders markdown with the approval-later boundary and closed safety", () => {
    const handoff = buildHandoff();
    const markdown = renderMarkdown(handoff);

    expect(markdown).toContain("Blocked Gate Handoff");
    expect(markdown).toContain("Approval later, not now");
    expect(markdown).toContain("mini_launch_seed_send");
    expect(markdown).toContain("crm_signal_writes");
    expect(markdown).toContain("No live actions");
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
      tokensPrinted: false,
    });
  });
});
