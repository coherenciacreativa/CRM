import { describe, expect, test } from "vitest";

import {
  buildCrmSignalProjectionPacket,
  buildProjectionProof,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-crm-signal-projection-packet.mjs";

const generatedAt = "2026-05-28T00:00:00.000Z";

const crmResponse = {
  department: "crm",
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  liveApprovalGranted: false,
  signalBoundaryDecision: "approve",
  onboardingProtectionStatus: "protected",
  storeOnlyEvents: [
    "mini_launch_intake_created",
    "source_assigned",
    "resource_delivered",
    "content_sent",
  ],
  projectableLaterEvents: [
    "email_open",
    "email_click",
    "email_reply",
    "instagram_engagement_snapshot",
    "instagram_comment",
    "instagram_like",
    "quiz_completed",
    "result_viewed",
  ],
  receiptInterpretationWarnings: [
    "Source and Delivered groups are operational receipts, not proof of interest.",
  ],
  onboardingHandoffTargetGroup: "CC · Journey · Editorial onboarding · Eligible",
  onboardingHandoffRule: "Recommendation is not routing.",
};

const event = (eventKind: string, channel: string, sourceKind: string, subject = { email: "sample@example.invalid" }) => ({
  sourceKind,
  sourceId: `source:${eventKind}`,
  eventKind,
  channel,
  direction: channel === "email" || channel === "instagram" ? "inbound" : "internal",
  observedAt: generatedAt,
  ...subject,
  metrics: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    emailStep: 1,
    comments30d: 1,
    likes30d: 1,
    lastInteractionAt: generatedAt,
  },
  tags: ["mini_launch", eventKind],
  summary: `${eventKind} sample only.`,
});

const eventContract = {
  ok: true,
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  sampleSignalEvents: [
    event("source_assigned", "mailerlite", "mailerlite_receipt"),
    event("resource_delivered", "email", "mailerlite_receipt"),
    event("content_sent", "email", "mailerlite_followup"),
    event("quiz_or_game_completed", "quiz", "mini_launch_quiz"),
    event("email_open", "email", "mailerlite_engagement"),
    event("email_click", "email", "mailerlite_engagement"),
    event("email_reply", "email", "gmail_reply_activity"),
    event("instagram_engagement_snapshot", "instagram", "instagram_activity", { instagramHandle: "sample_handle" }),
    event("instagram_comment", "instagram", "instagram_activity", { instagramHandle: "sample_handle" }),
    event("instagram_like", "instagram", "instagram_activity", { instagramHandle: "sample_handle" }),
  ],
};

const onboardingHandoffPolicy = {
  targetGroups: {
    eligible: "CC · Journey · Editorial onboarding · Eligible",
  },
  readiness: {
    productiveOnboardingV1Protected: true,
  },
};

const sourceDigests = [
  {
    path: "/tmp/crm_response.json",
    present: true,
    chars: 1000,
    consultedFor: "final CRM department signal-boundary response",
  },
];

describe("CRM vNext MailerLite mini-launch CRM signal projection packet", () => {
  test("normalizes default args without live options", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/projection.json",
      "--markdown-out",
      "/tmp/projection.md",
    ]);

    expect(parsed.crmResponse).toContain("crm_response.json");
    expect(parsed.eventContract).toContain("mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json");
    expect(parsed.onboardingHandoffPolicy).toContain("mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json");
    expect(parsed.signalProjectionDoc).toContain("signal-event-projection.md");
    expect(parsed.out).toBe("/tmp/projection.json");
    expect(parsed.markdownOut).toBe("/tmp/projection.md");
  });

  test("extracts launch identity from CRM response and event contract", () => {
    expect(launchFrom(crmResponse, eventContract)).toEqual({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      resourceType: "quiz",
    });
  });

  test("proves current projector accepts engagement and skips operational receipts", () => {
    const proof = buildProjectionProof({ eventContract, generatedAt });

    expect(proof.normalization).toMatchObject({
      recordsRead: 10,
      eventsGenerated: 10,
      skippedRecords: 0,
    });
    expect(proof.projection.projectedEventKinds).toEqual(expect.arrayContaining([
      "email_open",
      "email_click",
      "email_reply",
      "instagram_engagement_snapshot",
      "instagram_comment",
      "instagram_like",
    ]));
    expect(proof.projection.skippedEventKinds).toEqual(expect.arrayContaining([
      "source_assigned",
      "resource_delivered",
      "content_sent",
      "quiz_or_game_completed",
    ]));
  });

  test("builds ready packet with all CRM writes and live gates closed", () => {
    const packet = buildCrmSignalProjectionPacket({
      crmResponse,
      eventContract,
      onboardingHandoffPolicy,
      sourceDigests,
      generatedAt,
    });

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("ready_for_no_live_signal_projection_design");
    expect(packet.projectionModel.currentProjectionReadyFor).toContain("email_open");
    expect(packet.projectionModel.storeOnlyNow).toContain("source_assigned");
    expect(packet.projectionModel.futurePolicyOnlyEvents).toEqual(expect.arrayContaining([
      "quiz_completed",
      "result_viewed",
    ]));
    expect(packet.approvalGate).toMatchObject({
      canAppendSignalLedgerNow: false,
      canWriteCardsNow: false,
      canScoreNow: false,
      canWriteFactStoreNow: false,
      canRouteOnboardingNow: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
      crmScoreMutationsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders markdown as an operator-safe report", () => {
    const packet = buildCrmSignalProjectionPacket({
      crmResponse,
      eventContract,
      onboardingHandoffPolicy,
      sourceDigests,
      generatedAt,
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("CRM Signal Projection Packet");
    expect(markdown).toContain("No autoriza Signal Ledger append");
    expect(markdown).toContain("source_assigned");
    expect(markdown).toContain("Sin card writes, scoring, Fact Store u outbound");
  });
});
