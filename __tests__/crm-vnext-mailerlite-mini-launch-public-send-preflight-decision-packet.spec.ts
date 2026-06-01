import { describe, expect, test } from "vitest";

import {
  buildPublicSendPreflightDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-public-send-preflight-decision-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const assetManifest = {
  ok: true,
  launch,
  executiveSummary: {
    finalPublicLinksReady: true,
    publicAudienceSendUrlGateReady: false,
  },
  finalPublicLinks: {
    slots: [
      {
        key: "result_or_resource_link",
        publicUrlReady: true,
        publicUrlSha256: "hash-result",
        exactPublicUrlStoredInReport: false,
        linkLifecycle: {
          currentStage: "preview_url_ready",
          previewUrlReady: "hash-result",
          liveUrlReady: false,
          previewPromotedToLive: false,
          publicAudienceSendReady: false,
        },
      },
      {
        key: "practice_link",
        publicUrlReady: true,
        publicUrlSha256: "hash-practice",
        exactPublicUrlStoredInReport: false,
        linkLifecycle: {
          currentStage: "preview_url_ready",
          previewUrlReady: "hash-practice",
          liveUrlReady: false,
          previewPromotedToLive: false,
          publicAudienceSendReady: false,
        },
      },
      {
        key: "editorial_note_link",
        publicUrlReady: true,
        publicUrlSha256: "hash-note",
        exactPublicUrlStoredInReport: false,
        linkLifecycle: {
          currentStage: "preview_url_ready",
          previewUrlReady: "hash-note",
          liveUrlReady: false,
          previewPromotedToLive: false,
          publicAudienceSendReady: false,
        },
      },
    ],
  },
};

const shopifyPublicUrlGate = {
  ok: true,
  executiveSummary: {
    finalPublicLinksReady: true,
    publicAudienceSendUrlGateReady: false,
    recommendedVisibilityTier: "unlisted_noindex_preview",
    fullyPublicNavigationRequiredNow: false,
    seoIndexingAllowedNow: false,
  },
};

const shopifyPreviewRouteExecutionReceipt = {
  ok: true,
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    previewRouteReady: true,
    targetLinkCount: 3,
  },
  qa: {
    automatedHtmlQa: {
      statusHttp200ForAll: true,
      noindexForAll: true,
      externalFormActionsForAll: 0,
    },
  },
};

const publicAudienceScopePacket = {
  ok: true,
  status: "public_audience_scope_packet_ready_blocked_no_live_changes",
  executiveSummary: {
    freshAudienceScanReady: true,
    suppressionStatusScanReady: true,
    suppressionExclusionPolicyReady: true,
  },
  audienceScopeOptions: [
    {
      id: "existing_legacy_onboarding_complete_campaign_audience",
      label: "Use existing practical campaign audience",
      groupName: "Onboarding complete",
      knownActiveCount: 933,
    },
    {
      id: "manual_micro_cohort",
      label: "Use exact micro-cohort",
      groupName: null,
      knownActiveCount: null,
    },
  ],
};

const publicAudienceSuppressionPolicyPacket = {
  ok: true,
  status: "public_audience_suppression_policy_packet_ready_no_live_changes",
  executiveSummary: {
    suppressionExclusionPolicyReady: true,
  },
  safety: {
    mailerLiteApiCalled: false,
    subscribersRead: false,
  },
};

const publicLaunchReadinessPacket = {
  ok: true,
  status: "mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes",
  executiveSummary: {
    seedInboxQaGreen: true,
    nullAudienceReplacementDraftsReady: true,
    previewLinksReady: true,
    blockerCount: 3,
    liveActionAllowedNow: false,
  },
};

const nullAudienceReplacementExecutionReceipt = {
  ok: true,
  status: "mailerlite_null_audience_replacement_execution_completed_no_sends",
  preflight: {
    safetyGroupActiveCount: 0,
  },
  postCreateQa: {
    replacementDraftCount: 4,
    nullAudienceSafeCount: 4,
    contentGreenCount: 4,
  },
};

const nullAudienceSeedInboxQa = {
  ok: true,
  status: "mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes",
  deliverySummary: {
    seedInboxQaGreen: true,
  },
};

const buildReport = (overrides = {}) => buildPublicSendPreflightDecisionPacket({
  assetManifest,
  shopifyPublicUrlGate,
  shopifyPreviewRouteExecutionReceipt,
  publicAudienceScopePacket,
  publicAudienceSuppressionPolicyPacket,
  publicLaunchReadinessPacket,
  nullAudienceReplacementExecutionReceipt,
  nullAudienceSeedInboxQa,
  generatedAt: "2026-06-01T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext MailerLite mini-launch public send preflight decision packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/assets.json",
      "--public-audience-scope-packet",
      "/tmp/scope.json",
      "--out",
      "/tmp/preflight.json",
      "--markdown-out",
      "/tmp/preflight.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/assets.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/scope.json");
    expect(parsed.out).toBe("/tmp/preflight.json");
    expect(parsed.markdownOut).toBe("/tmp/preflight.md");
  });

  test("explains the URL and audience decision without generating an approval phrase", () => {
    const report = buildReport();
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes");
    expect(report.executiveSummary.decisionExplanationReady).toBe(true);
    expect(report.executiveSummary.exactApprovalPhraseAvailable).toBe(false);
    expect(report.executiveSummary.exactApprovalPhrasePrinted).toBe(false);
    expect(report.executiveSummary.canAskExactApprovalNow).toBe(false);
    expect(report.executiveSummary.canExecuteNow).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.urlLifecycleEvidenceReady).toBe(true);
    expect(report.executiveSummary.audienceDecisionEvidenceReady).toBe(true);
    expect(report.executiveSummary.recommendedUrlDecisionId)
      .toBe("promote_existing_unlisted_noindex_preview_links_to_audience_send_ready");
    expect(report.executiveSummary.recommendedAudienceScopeId)
      .toBe("existing_legacy_onboarding_complete_campaign_audience");
    expect(report.executiveSummary.recommendedAudienceKnownActiveCount).toBe(933);
    expect(report.blockersBeforeHumanExplanation).toEqual([]);
    expect(report.futureApprovalBoundary.phraseGeneratedByThisPacket).toBe(false);
    expect(report.futureApprovalBoundary.canGeneratePhraseAfterExplanation).toBe(true);
    expect(report.futureApprovalBoundary.stillClosedEvenAfterDecisionApproval).toContain("public_or_audience_send");
    expect(markdown).toContain("Decision explanation ready: true");
    expect(markdown).toContain("Phrase generated by this packet: false");
    expect(report.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
      recipientsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("blocks explanation when exact URLs would be stored in the report", () => {
    const report = buildReport({
      assetManifest: {
        ...assetManifest,
        finalPublicLinks: {
          slots: assetManifest.finalPublicLinks.slots.map((slot, index) => ({
            ...slot,
            exactPublicUrlStoredInReport: index === 0,
          })),
        },
      },
    });

    expect(report.status).toBe("public_send_preflight_decision_packet_blocked_missing_evidence_no_live_changes");
    expect(report.executiveSummary.decisionExplanationReady).toBe(false);
    expect(report.blockersBeforeHumanExplanation).toContain("url_lifecycle_evidence_not_ready");
    expect(report.futureApprovalBoundary.canGeneratePhraseAfterExplanation).toBe(false);
  });

  test("keeps safety closed by default", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });
});
