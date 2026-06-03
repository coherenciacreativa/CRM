import { describe, expect, test } from "vitest";

import {
  EXACT_APPROVAL_PHRASE,
  buildPacket,
  noV2WorkflowConflict,
  v1Green,
  v2GroupsGreen,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-disabled-draft-approval-packet.mjs";

const greenPreflight = {
  ok: true,
  status: "onboarding_v2_disabled_draft_build_fresh_preflight_green",
  sourceEvidence: {
    groupsRead: 90,
    automationsRead: 13,
  },
  qa: {
    productiveV1StillGreen: {
      ok: true,
      workflow: {
        name: "Onboarding flow",
        enabled: true,
        complete: true,
        broken: false,
      },
    },
    v2GroupsStillEmptyAndAvailable: {
      ok: true,
      targetCount: 12,
      foundCount: 12,
      emptyCount: 12,
      targets: Array.from({ length: 12 }, (_, index) => ({
        name: `CC · Test · ${index + 1}`,
        ok: true,
        activeCount: 0,
      })),
    },
    noConflictingV2Workflow: {
      ok: true,
      workflowName: "Onboarding editorial v2 - DRAFT",
      exactMatchCount: 0,
    },
  },
};

const boundaryPacket = {
  ok: true,
  status: "onboarding_v2_disabled_draft_build_boundary_packet_ready_local_only",
  futureBuildScope: {
    workflowName: "Onboarding editorial v2 - DRAFT",
    triggerGroup: "CC · Journey · Editorial onboarding · Eligible",
    mustNotUseTrigger: "leads_instagram.csv",
  },
};

const mappingPacket = {
  ok: true,
  status: "onboarding_v2_draft_content_mapping_hardening_ready_local_only",
  draftSkeleton: {
    workflowName: "Onboarding editorial v2 - DRAFT",
    trigger: {
      group: "CC · Journey · Editorial onboarding · Eligible",
      mustNotUse: ["leads_instagram.csv"],
    },
    firstAction: {
      intent: "mark_journey_in_progress",
      group: "CC · Journey · Editorial onboarding · In progress",
    },
    completionActions: [
      { intent: "mark_journey_complete", group: "CC · Journey · Editorial onboarding · Complete" },
    ],
  },
  contentReceiptMap: [
    { order: 1, receiptPosture: "welcome_orientation_no_sent_receipt" },
    ...Array.from({ length: 10 }, (_, index) => ({
      order: index + 2,
      receiptPosture: "canonical_article_sent_receipt",
    })),
  ],
};

describe("CRM vNext MailerLite Onboarding v2 disabled draft approval packet", () => {
  test("recognizes the green preflight predicates", () => {
    expect(v1Green(greenPreflight)).toBe(true);
    expect(v2GroupsGreen(greenPreflight)).toBe(true);
    expect(noV2WorkflowConflict(greenPreflight)).toBe(true);
  });

  test("builds a local-only approval packet without authorizing execution", () => {
    const packet = buildPacket({
      preflight: greenPreflight,
      boundaryPacket,
      mappingPacket,
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(packet.status).toBe("onboarding_v2_disabled_draft_build_approval_packet_ready_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      canAskAlejandroForApproval: true,
      exactApprovalPhraseAvailable: true,
      packetIsApprovalByItself: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      productiveV1Green: true,
      v2GroupsFound: 12,
      v2GroupsEmpty: 12,
    });
    expect(packet.approvalBoundary.exactApprovalPhrase).toBe(EXACT_APPROVAL_PHRASE);
    expect(packet.approvalBoundary.expectedApprovalPhraseSha256).toBeTruthy();
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      workflowMutationsPerformed: false,
      subscriberRowsRead: false,
      sendsPerformed: false,
      tokensPrinted: false,
    });
  });

  test("withholds the approval phrase when the preflight is not green", () => {
    const packet = buildPacket({
      preflight: {
        ...greenPreflight,
        ok: false,
        status: "onboarding_v2_disabled_draft_build_fresh_preflight_blocked",
      },
      boundaryPacket,
      mappingPacket,
    });

    expect(packet.status).toBe("onboarding_v2_disabled_draft_build_approval_packet_blocked_no_live_changes");
    expect(packet.executiveSummary.canAskAlejandroForApproval).toBe(false);
    expect(packet.approvalBoundary.exactApprovalPhrase).toBeNull();
    expect(packet.blockers).toContain("fresh_preflight_not_ok");
  });

  test("keeps disabled/inactive route guarantee as a hard stop", () => {
    const packet = buildPacket({
      preflight: greenPreflight,
      boundaryPacket,
      mappingPacket,
    });

    expect(packet.routeRequirementsBeforeExecution.join(" ")).toContain("disabled/inactive");
    expect(packet.hardStops).toContain("stop_if_route_cannot_guarantee_disabled_inactive_workflow");
    expect(packet.approvalBoundary.exactApprovalPhrase).toContain("si antes de ejecutar no se puede garantizar");
  });
});
