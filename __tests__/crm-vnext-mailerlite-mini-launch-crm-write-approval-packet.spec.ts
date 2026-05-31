import { describe, expect, test } from "vitest";

import {
  buildPolicyState,
  buildCrmWriteApprovalPacket,
  identityForEvent,
  isWritableObservedEvent,
  parseArgs,
  renderMarkdown,
  summarizeObservedEvents,
} from "../scripts/crm-vnext-mailerlite-mini-launch-crm-write-approval-packet.mjs";

const generatedAt = "2026-05-28T00:00:00.000Z";
const launchId = "mini_2026_06_rehearsal_inteligencia_para_descansar";

const signalProjectionPacket = {
  status: "ready_for_no_live_signal_projection_design",
  launch: {
    launchId,
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  projectionModel: {
    currentProjectionReadyFor: [
      "email_open",
      "email_click",
      "email_reply",
      "instagram_engagement_snapshot",
    ],
    storeOnlyNow: [
      "mini_launch_intake_created",
      "source_assigned",
      "resource_delivered",
      "content_sent",
    ],
  },
};

const eventContract = {
  status: "mini_launch_event_contract_ready_no_ledger_write",
  launch: {
    launchId,
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  sampleSignalEvents: [
    {
      eventKind: "email_open",
      sourceKind: "mailerlite_engagement",
      channel: "email",
      sourceId: "sample:email_open",
      observedAt: generatedAt,
      email: "sample@example.invalid",
      metrics: { launchId },
    },
  ],
};

const manualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    outboxCountAfterBuild: 0,
  },
};

const groupCreateExecution = {
  status: "executed_mini_launch_empty_group_creation",
  createdGroups: [
    { id: "1", name: "CC · Source · Quiz · Inteligencia para descansar" },
    { id: "2", name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
};

const shopifyLocalBuildReceipt = {
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  shopifyRepo: {
    localFilesCreatedOrUpdated: 5,
  },
  placeholders: {
    inert: true,
  },
};

const sourceDigests = [
  {
    path: "/tmp/projection.json",
    present: true,
    chars: 1000,
    consultedFor: "projection",
  },
];

const writePolicyPacket = {
  status: "crm_write_policy_packet_ready_no_live_changes",
  executiveSummary: {
    policyReady: true,
    blockersResolvedIfConsumed: [
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
      "scoring_policy_for_mini_launch_missing",
      "source_delivered_receipts_must_not_score_by_themselves",
    ],
    blockersStillRequireRealEvidence: [
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
    ],
  },
  policyCoverage: {
    cardWritePolicyPacketReady: true,
    identityStitchingPacketReady: true,
    scoringPolicyForMiniLaunchReady: true,
    sourceDeliveredReceiptsMustNotScoreByThemselves: true,
    aggregateMarketReviewPolicyReady: true,
    factStoreWritePolicyReady: true,
  },
  safety: {
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    crmScoreMutationsPerformed: false,
    factStoreWritePerformed: false,
    sendsPerformed: false,
  },
};

const realObservedEvent = {
  eventKind: "email_open",
  sourceKind: "mailerlite_engagement",
  channel: "email",
  sourceId: "mailerlite:campaign:188:subscriber:777:open",
  observedAt: generatedAt,
  email: "persona@example.com",
  metrics: { launchId },
  evidenceSourcePath: "/tmp/read-only-mailerlite-scan.json",
};

const internalSeedQaEvent = {
  eventKind: "content_sent",
  sourceKind: "mailerlite_seed_test",
  channel: "email",
  sourceId: "mailerlite:draft:E01:test-send",
  observedAt: generatedAt,
  email: "seed.person@example.com",
  metrics: { launchId },
  evidenceSourcePath: "/tmp/mailerlite_mini_launch_seed_test_execution_receipt.json",
  tags: ["seed_test", "internal_qa"],
};

describe("CRM vNext MailerLite mini-launch CRM write approval packet", () => {
  test("normalizes default args and optional observed events file", () => {
    const parsed = parseArgs([
      "--observed-events-file",
      "/tmp/events.json",
      "--out",
      "/tmp/crm-write.json",
      "--markdown-out",
      "/tmp/crm-write.md",
    ]);

    expect(parsed.signalProjectionPacket).toContain("mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.eventContract).toContain("mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json");
    expect(parsed.manualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.writePolicyPacket).toContain("mailerlite_mini_launch_crm_write_policy_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.observedEventsFile).toBe("/tmp/events.json");
    expect(parsed.out).toBe("/tmp/crm-write.json");
  });

  test("rejects sample identities as writable observed events", () => {
    const sample = eventContract.sampleSignalEvents[0];

    expect(identityForEvent(sample)).toMatchObject({
      email: "sample@example.invalid",
      label: "sample@example.invalid",
    });
    expect(isWritableObservedEvent(sample, launchId)).toBe(false);
    expect(isWritableObservedEvent(internalSeedQaEvent, launchId)).toBe(false);
    expect(isWritableObservedEvent(realObservedEvent, launchId)).toBe(true);
  });

  test("summarizes exact writable event and person counts", () => {
    const summary = summarizeObservedEvents([
      eventContract.sampleSignalEvents[0],
      internalSeedQaEvent,
      realObservedEvent,
    ], launchId);

    expect(summary).toMatchObject({
      supplied: true,
      total: 3,
      writableCount: 1,
      rejectedCount: 2,
      internalSeedOrQaCount: 1,
      exactPersonCount: 1,
      exactPeople: ["persona@example.com"],
      allWritable: false,
    });
  });

  test("builds blocked packet when only projection and sample event contract exist", () => {
    const packet = buildCrmWriteApprovalPacket({
      signalProjectionPacket,
      eventContract,
      manualUiBuildReceipt,
      groupCreateExecution,
      shopifyLocalBuildReceipt,
      sourceDigests,
      generatedAt,
    });

    expect(packet.status).toBe("crm_write_approval_packet_blocked_missing_observed_events_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      approvalRequestReady: false,
      exactEventCountReady: 0,
      exactPersonCountReady: 0,
      operationsExecuted: 0,
    });
    expect(packet.launchEvidenceState).toMatchObject({
      projectionReady: true,
      sampleEventsAreWritable: false,
      targetGroupsExist: true,
      manualUiDraftsBuilt: true,
      shopifyLocalBuildClosed: true,
    });
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).toEqual(expect.arrayContaining([
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "exact_person_identity_missing",
    ]));
    expect(packet.writeFamilies.find((family) => family.id === "signal_event_ledger_append")).toMatchObject({
      status: "blocked_before_approval_request",
      operationsExecuted: 0,
    });
    expect(packet.safety).toMatchObject({
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
      crmScoreMutationsPerformed: false,
      factStoreWritePerformed: false,
      sendsPerformed: false,
    });
  });

  test("still blocks card, scoring and Fact Store even with one writable event", () => {
    const packet = buildCrmWriteApprovalPacket({
      signalProjectionPacket,
      eventContract,
      observedEventsPayload: { events: [realObservedEvent] },
      sourceDigests,
      generatedAt,
    });

    expect(packet.executiveSummary.exactEventCountReady).toBe(1);
    expect(packet.executiveSummary.exactPersonCountReady).toBe(1);
    expect(packet.writeFamilies.find((family) => family.id === "signal_event_ledger_append")?.blockers).toEqual([]);
    expect(packet.writeFamilies.find((family) => family.id === "person_card_signal_history")?.blockers).toEqual(expect.arrayContaining([
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
    ]));
    expect(packet.writeFamilies.find((family) => family.id === "score_projection")?.blockers).toContain("scoring_policy_for_mini_launch_missing");
    expect(packet.writeFamilies.find((family) => family.id === "fact_store_market_learning")?.blockers).toContain("exact_fact_store_facts_missing");
  });

  test("consumes policy packet to close policy-only blockers while keeping evidence blockers", () => {
    const policyState = buildPolicyState(writePolicyPacket);
    expect(policyState).toMatchObject({
      ready: true,
      cardWritePolicyReady: true,
      identityStitchingPolicyReady: true,
      scoringPolicyReady: true,
      sourceDeliveredReceiptsNoScore: true,
    });

    const packet = buildCrmWriteApprovalPacket({
      signalProjectionPacket,
      eventContract,
      writePolicyPacket,
      sourceDigests,
      generatedAt,
    });

    expect(packet.executiveSummary.writePolicyPacketReady).toBe(true);
    expect(packet.policyEffect).toMatchObject({
      consumedPolicyPacket: true,
      policyBlockersStillOpen: [],
    });
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).toEqual(expect.arrayContaining([
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "aggregate_market_review_missing",
      "exact_fact_store_facts_missing",
      "fact_store_write_approval_missing",
    ]));
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).not.toContain("card_write_policy_packet_missing");
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).not.toContain("identity_stitching_packet_missing");
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).not.toContain("scoring_policy_for_mini_launch_missing");
    expect(packet.approvalBoundary.blockersBeforeApprovalRequest).not.toContain("source_delivered_receipts_must_not_score_by_themselves");
  });

  test("renders operator-safe markdown", () => {
    const packet = buildCrmWriteApprovalPacket({
      signalProjectionPacket,
      eventContract,
      sourceDigests,
      generatedAt,
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("CRM Write Approval Packet");
    expect(markdown).toContain("real_observed_event_file_missing");
    expect(markdown).toContain("No Signal Ledger append");
  });
});
