import { describe, expect, test } from "vitest";

import {
  buildPreviewRouteApprovalPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.mjs";

const previewRouteDecision = {
  ok: true,
  status: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  executiveSummary: {
    recommendedDecision: "use_unlisted_noindex_preview_route_for_test_launch_links",
    recommendedVisibilityTier: "unlisted_noindex_preview",
    decisionExplanationReady: true,
    exactApprovalPhraseAvailable: false,
    exactApprovalPhrasePrinted: false,
    canAskApprovalNow: false,
    canPublishNow: false,
    publicAudienceSendUrlGateReady: false,
  },
  slotScope: [
    {
      key: "result_or_resource_link",
      label: "Result/resource page",
      pathCandidate: "/pages/result-inteligencia-para-descansar",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
    {
      key: "practice_link",
      label: "Practice section",
      pathCandidate: "/pages/result-inteligencia-para-descansar#practice",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
    {
      key: "editorial_note_link",
      label: "Editorial note section",
      pathCandidate: "/pages/result-inteligencia-para-descansar#editorial-note",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
  ],
  safety: {
    shopifyApiCalled: false,
    shopifyRepoFilesWritten: false,
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
  },
};

const decisionConfirmation = {
  ok: true,
  status: "shopify_preview_route_decision_confirmed_by_alejandro_no_live_changes",
  decision: {
    id: "use_unlisted_noindex_preview_route_for_test_launch_links",
    visibilityTier: "unlisted_noindex_preview",
  },
  confirmation: {
    confirmedBy: "Alejandro",
    confirmedAt: "2026-05-31T06:00:00.000Z",
    textSha256: "a".repeat(64),
    rawTextStored: false,
    exactApprovalPhraseProvided: false,
  },
  safety: {
    shopifyApiCalled: false,
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch Shopify preview route approval packet", () => {
  test("normalizes args", () => {
    const parsed = parseArgs([
      "--preview-route-decision",
      "/tmp/decision.json",
      "--decision-confirmation",
      "/tmp/confirmation.json",
      "--out",
      "/tmp/approval.json",
      "--markdown-out",
      "/tmp/approval.md",
    ]);

    expect(parsed.previewRouteDecision).toBe("/tmp/decision.json");
    expect(parsed.decisionConfirmation).toBe("/tmp/confirmation.json");
    expect(parsed.out).toBe("/tmp/approval.json");
    expect(parsed.markdownOut).toBe("/tmp/approval.md");
  });

  test("creates a ready exact-approval boundary only after human decision confirmation", () => {
    const packet = buildPreviewRouteApprovalPacket({
      previewRouteDecision,
      decisionConfirmation,
      generatedAt: "2026-05-31T06:00:00.000Z",
    });

    expect(packet.status).toBe("shopify_preview_route_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      humanDecisionConfirmed: true,
      exactApprovalPhraseAvailable: true,
      exactApprovalPhrasePrinted: true,
      canAskApprovalNow: true,
      canExecuteNow: false,
      canPublishNow: false,
      publicAudienceSendUrlGateReady: false,
    });
    expect(packet.approvalBoundary).toMatchObject({
      canAskAlejandroForApproval: true,
      packetIsApprovalByItself: false,
      canExecuteNow: false,
    });
    expect(packet.approvalBoundary.exactApprovalPhrase).toContain("preview route unlisted/noindex de Shopify");
    expect(packet.approvalBoundary.exactApprovalPhrase).toContain("sin tocar MailerLite");
    expect(packet.approvalBoundary.stillClosedEvenAfterApproval).toContain("audience_launch_or_public_send");
    expect(packet.targetLinks).toHaveLength(3);
    expect(packet.blockers).toEqual([]);
  });

  test("blocks and withholds the exact phrase without a confirmation receipt", () => {
    const packet = buildPreviewRouteApprovalPacket({
      previewRouteDecision,
      decisionConfirmation: null,
      generatedAt: "2026-05-31T06:00:00.000Z",
    });

    expect(packet.status).toBe("shopify_preview_route_approval_packet_blocked_no_live_changes");
    expect(packet.executiveSummary.exactApprovalPhraseAvailable).toBe(false);
    expect(packet.executiveSummary.canAskApprovalNow).toBe(false);
    expect(packet.approvalBoundary.exactApprovalPhrase).toBeNull();
    expect(packet.blockers).toContain("decision_confirmation_not_ready:missing");
  });

  test("renders markdown and keeps live safety closed", () => {
    const packet = buildPreviewRouteApprovalPacket({
      previewRouteDecision,
      decisionConfirmation,
      generatedAt: "2026-05-31T06:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Shopify Preview Route Approval Packet");
    expect(markdown).toContain("Exact approval phrase available: true");
    expect(markdown).toContain("No Shopify API/UI/publish action");
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      shopifyApiCalled: false,
      shopifyMutationsPerformed: false,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      tokensPrinted: false,
    });
  });
});
