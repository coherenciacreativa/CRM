import { describe, expect, test } from "vitest";

import {
  buildEventContract,
  buildEventContractPacket,
  buildOnboardingModel,
  buildSampleEvents,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-event-contract.mjs";

const emailReceipts = [
  {
    order: 1,
    subject: "{$name}, Tu primera nota de mi parte ✍🏻",
    name: "Tu primera nota de mi parte",
    contentId: null,
    recommendedReceiptGroup: null,
    dictionaryStatus: "needs_brand_content_mapping",
  },
  {
    order: 2,
    subject: "Relaciones que aumentan nuestra energía 🔋",
    name: "Segundo correo",
    contentId: "article_relaciones_aumentan_energia",
    recommendedReceiptGroup: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    dictionaryStatus: "proposed_local",
  },
  {
    order: 3,
    subject: "Sobre el amor",
    name: "Tercer correo, invitación a círculo",
    contentId: "article_sobre_el_amor",
    recommendedReceiptGroup: "CC · Sent · Article · Sobre el amor",
    dictionaryStatus: "live_canonical",
    mailerLiteGroupId: "188581888519046472",
  },
];

const designPacket = {
  status: "ready_for_human_architecture_review",
  workflowBlueprint: {
    proposedWorkflowName: "Onboarding editorial v2 - DRAFT",
    trigger: {
      group: {
        name: "CC · Journey · Editorial onboarding · Eligible",
        layer: "Journey",
      },
    },
    entryAssignmentsExpectedBeforeTrigger: [
      {
        group: {
          name: "CC · Source · IG onboarding",
          layer: "Source",
        },
      },
      {
        group: {
          name: "CC · Journey · Editorial onboarding · Eligible",
          layer: "Journey",
        },
      },
    ],
    firstActions: [
      {
        action: "mark_journey_in_progress",
        group: {
          name: "CC · Journey · Editorial onboarding · In progress",
          layer: "Journey",
        },
      },
    ],
    emailReceipts,
    completionActions: [
      {
        action: "mark_journey_complete",
        group: {
          name: "CC · Journey · Editorial onboarding · Complete",
          layer: "Journey",
        },
      },
      {
        action: "mark_general_newsletter_eligible",
        group: {
          name: "CC · Audience · General newsletter · Eligible",
          layer: "Audience",
        },
      },
    ],
  },
};

const v1Audit = {
  workflow: {
    id: "154049547088167956",
    name: "Onboarding flow",
    enabled: true,
    complete: true,
    broken: false,
    emailsCount: 11,
    qualifiedSubscribersCount: 0,
  },
  queueVisibility: {
    subscriberRowsRead: 0,
  },
};

const executionPacket = {
  status: "ready_for_human_decision_or_non_live_continuation",
  gateQueue: [
    {
      id: "create_empty_onboarding_v2_groups",
      status: "ready_for_exact_human_approval",
    },
    {
      id: "build_or_clone_disabled_onboarding_v2_draft",
      status: "blocked_until_empty_groups_are_created_or_explicitly_skipped",
    },
    {
      id: "seed_test_onboarding_v2",
      status: "blocked_until_disabled_v2_draft_exists_and_seed_email_is_approved",
    },
    {
      id: "production_entry_switch_to_v2",
      status: "closed_until_seed_tests_and_rollout_packet",
    },
    {
      id: "brand_first_email_content_mapping",
      status: "mapped_as_welcome_only_no_sent_receipt",
    },
  ],
};

const firstEmailMapping = {
  status: "first_email_mapping_ready_no_sent_receipt",
  decision: {
    recommendedPosture: "welcome_orientation_no_sent_receipt",
    recommendedContentId: null,
    recommendedMailerLiteSentGroup: null,
  },
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "Onboarding v2 workflow design and receipt plan",
  },
  {
    path: "/tmp/signal-event-ledger.md",
    present: true,
    chars: 1000,
    consultedFor: "Signal Event Ledger supported event kinds and safety",
  },
];

describe("CRM vNext MailerLite onboarding v2 event contract", () => {
  test("normalizes default args without live options", () => {
    const parsed = parseArgs([]);

    expect(parsed.designPacket).toContain("mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json");
    expect(parsed.v1Audit).toContain("mailerlite_onboarding_v1_audit_2026-05-27.json");
    expect(parsed.executionPacket).toContain("mailerlite_onboarding_v2_execution_packet_2026-05-27.json");
    expect(parsed.firstEmailMapping).toContain("mailerlite_onboarding_v2_first_email_mapping_2026-05-27.json");
    expect(parsed.out).toBeNull();
    expect(parsed.markdownOut).toBeNull();
  });

  test("builds onboarding model from v1 audit and v2 design packets", () => {
    const model = buildOnboardingModel({
      designPacket,
      v1Audit,
      executionPacket,
      firstEmailMapping,
    });

    expect(model.currentV1).toMatchObject({
      workflowName: "Onboarding flow",
      enabled: true,
      complete: true,
      broken: false,
      subscriberRowsRead: 0,
    });
    expect(model.v2).toMatchObject({
      sourceGroup: "CC · Source · IG onboarding",
      eligibleGroup: "CC · Journey · Editorial onboarding · Eligible",
      inProgressGroup: "CC · Journey · Editorial onboarding · In progress",
      completeGroup: "CC · Journey · Editorial onboarding · Complete",
      audienceEligibleGroup: "CC · Audience · General newsletter · Eligible",
    });
    expect(model.emailPlan.welcomeOnlyEmail).toMatchObject({
      posture: "welcome_orientation_no_sent_receipt",
      recommendedReceiptGroup: null,
    });
    expect(model.emailPlan.canonicalArticleReceiptCount).toBe(2);
  });

  test("defines onboarding journey, content, engagement and handoff events", () => {
    const model = buildOnboardingModel({
      designPacket,
      v1Audit,
      executionPacket,
      firstEmailMapping,
    });
    const contract = buildEventContract(model);
    const eventKinds = contract.map((item) => item.eventKind);

    expect(eventKinds).toEqual(expect.arrayContaining([
      "source_assigned",
      "onboarding_eligibility_assigned",
      "onboarding_started",
      "email_sent",
      "content_sent",
      "email_open",
      "email_click",
      "email_reply",
      "email_suppression",
      "onboarding_completed",
      "audience_eligibility_assigned",
      "onboarding_handoff_recommended",
    ]));
    expect(contract.find((item) => item.eventKind === "content_sent")).toMatchObject({
      projectionPosture: "store_only; Sent means system delivery, not read/open/click/interest",
    });
    expect(contract.every((item) => item.approvalGate)).toBe(true);
  });

  test("builds sample events without production subscriber identity", () => {
    const model = buildOnboardingModel({
      designPacket,
      v1Audit,
      executionPacket,
      firstEmailMapping,
    });
    const eventContract = buildEventContract(model);
    const events = buildSampleEvents({
      eventContract,
      model,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(events).toHaveLength(eventContract.length);
    expect(events.every((event) => event.email === "sample@example.invalid")).toBe(true);
    expect(events.find((event) => event.eventKind === "content_sent")?.metrics).toMatchObject({
      contentId: "article_relaciones_aumentan_energia",
      receiptGroup: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    });
    expect(events.find((event) => event.eventKind === "onboarding_started")?.metrics).toMatchObject({
      workflowName: "Onboarding editorial v2 - DRAFT",
    });
  });

  test("proves all sample events normalize without ledger writes", () => {
    const packet = buildEventContractPacket({
      designPacket,
      v1Audit,
      executionPacket,
      firstEmailMapping,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("onboarding_v2_event_contract_ready_no_ledger_write");
    expect(packet.normalizationProof.summary).toMatchObject({
      recordsRead: packet.eventContract.length,
      eventsGenerated: packet.eventContract.length,
      skippedRecords: 0,
    });
    expect(new Set(packet.normalizationProof.eventKinds).has("unknown")).toBe(false);
    expect(new Set(packet.normalizationProof.channels).has("unknown")).toBe(false);
    expect(packet.projectionBoundary.existingProjectionReadyFor).toEqual([
      "email_open",
      "email_click",
      "email_reply",
      "email_suppression",
    ]);
    expect(packet.approvalBoundary).toMatchObject({
      canAppendToLedgerNow: false,
      canAssignMailerLiteGroupsNow: false,
      canTouchOnboardingV1Now: false,
      canUseOnboardingV2WorkflowNow: false,
    });
    expect(packet.safety).toMatchObject({
      signalLedgerAppendPerformed: false,
      mailerLiteApiCalled: false,
      subscriberRowsRead: false,
      onboardingV1Touched: false,
      sendsPerformed: false,
    });
    expect(markdown).toContain("MailerLite Onboarding v2");
    expect(markdown).toContain("Open live gates from this packet: 0");
    expect(markdown).toContain("Sin tocar Onboarding v1");
  });
});
