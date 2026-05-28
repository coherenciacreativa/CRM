import { describe, expect, test } from "vitest";

import {
  buildCrmWritePolicyPacket,
  eventKindsFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-crm-write-policy-packet.mjs";

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
      email: "sample@example.invalid",
    },
  ],
};

describe("CRM vNext MailerLite mini-launch CRM write policy packet", () => {
  test("normalizes defaults", () => {
    const parsed = parseArgs(["--out", "/tmp/policy.json", "--markdown-out", "/tmp/policy.md"]);

    expect(parsed.signalProjectionPacket).toContain("mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.eventContract).toContain("mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/policy.json");
    expect(parsed.markdownOut).toBe("/tmp/policy.md");
  });

  test("classifies known event kinds from projection and contract", () => {
    const kinds = eventKindsFrom({ projectionPacket: signalProjectionPacket, eventContract });

    expect(kinds.projectable).toContain("email_click");
    expect(kinds.storeOnly).toContain("resource_delivered");
    expect(kinds.contractKinds).toContain("email_open");
    expect(kinds.allKnown).toEqual(expect.arrayContaining([
      "source_assigned",
      "email_open",
      "instagram_engagement_snapshot",
    ]));
  });

  test("builds ready local policy without opening write gates", () => {
    const packet = buildCrmWritePolicyPacket({
      signalProjectionPacket,
      eventContract,
      generatedAt,
    });

    expect(packet.status).toBe("crm_write_policy_packet_ready_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      policyReady: true,
      approvalRequestReady: false,
      operationsExecuted: 0,
    });
    expect(packet.policyCoverage).toMatchObject({
      cardWritePolicyPacketReady: true,
      identityStitchingPacketReady: true,
      scoringPolicyForMiniLaunchReady: true,
      sourceDeliveredReceiptsMustNotScoreByThemselves: true,
    });
    expect(packet.executiveSummary.blockersResolvedIfConsumed).toEqual(expect.arrayContaining([
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
      "scoring_policy_for_mini_launch_missing",
      "source_delivered_receipts_must_not_score_by_themselves",
    ]));
    expect(packet.executiveSummary.blockersStillRequireRealEvidence).toEqual(expect.arrayContaining([
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "fact_store_write_approval_missing",
    ]));
    expect(packet.eventKindPolicy.neverScoreByThemselves).toEqual(expect.arrayContaining([
      "source_assigned",
      "resource_delivered",
      "content_sent",
    ]));
    expect(packet.safety).toMatchObject({
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
      crmScoreMutationsPerformed: false,
      factStoreWritePerformed: false,
      sendsPerformed: false,
    });
  });

  test("renders operator-safe markdown", () => {
    const packet = buildCrmWritePolicyPacket({
      signalProjectionPacket,
      eventContract,
      generatedAt,
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("CRM Write Policy Packet");
    expect(markdown).toContain("source_delivered_receipts_must_not_score_by_themselves");
    expect(markdown).toContain("No CRM write");
  });
});
