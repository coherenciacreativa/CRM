import { describe, expect, test } from "vitest";

import {
  buildPublicLaunchReadinessPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-public-launch-readiness-packet.mjs";

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
    liveUrlReadyCount: 0,
    previewPromotedToLiveCount: 0,
  },
};

const shopifyPublicUrlGate = {
  ok: true,
  executiveSummary: {
    finalPublicLinksReady: true,
    publicAudienceSendUrlGateReady: false,
  },
};

const shopifyPreviewRouteExecutionReceipt = {
  ok: true,
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    previewRouteReady: true,
    targetLinkCount: 3,
    canUseForLocalCorrectionPreview: true,
    canUseForPublicAudienceSend: false,
    publicAudienceSendUrlGateReady: false,
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
    audienceScopePacketReady: true,
    publicAudienceScopeReady: false,
    selectedAudienceScopeId: null,
    recommendedDefaultNow: "keep_null_audience_no_public_send",
    recommendedFutureDecisionPath: "choose_existing_legacy_audience_micro_cohort_or_archive_after_url_gate_and_fresh_scan",
    candidateOptionCount: 5,
  },
  blockersBeforeScopeReady: [
    "exact_public_audience_scope_decision_missing",
    "public_audience_url_gate_not_ready",
    "fresh_audience_membership_scan_missing",
    "suppression_exclusion_policy_missing",
    "current_drafts_point_only_to_empty_safety_group",
  ],
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
  safety: {
    sendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    nonNullAudienceGroupsAssigned: false,
    tokensPrinted: false,
  },
};

const nullAudienceSeedInboxQa = {
  ok: true,
  status: "mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes",
  deliverySummary: {
    seedInboxQaGreen: true,
    deliveredToApprovedSeed: 4,
    expectedSeedMessages: 4,
    newCorrectedMessagesFoundOutsideApprovedSeed: 0,
  },
  safety: {
    gmailReadOnly: true,
    mailerLiteSendsPerformedByThisQa: false,
  },
};

const crmWriteApprovalPacket = {
  ok: true,
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    approvalRequestReady: false,
    exactEventCountReady: 0,
    exactPersonCountReady: 0,
    operationsExecuted: 0,
    blockers: ["real_observed_event_file_missing", "exact_person_identity_missing"],
  },
};

const approvalQueue = {
  ok: true,
  status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
  executiveSummary: {
    readyApprovalIds: [],
    blockedApprovalIds: ["crm_signal_writes"],
    openLiveMutationGateCount: 0,
  },
};

describe("CRM vNext MailerLite mini-launch public launch readiness packet", () => {
  test("normalizes args and defaults to local reports", () => {
    const parsed = parseArgs([
      "--asset-manifest",
      "/tmp/asset.json",
      "--approval-queue",
      "/tmp/queue.json",
      "--public-audience-scope-packet",
      "/tmp/audience.json",
      "--out",
      "/tmp/readiness.json",
      "--markdown-out",
      "/tmp/readiness.md",
    ]);

    expect(parsed.assetManifest).toBe("/tmp/asset.json");
    expect(parsed.approvalQueue).toBe("/tmp/queue.json");
    expect(parsed.publicAudienceScopePacket).toBe("/tmp/audience.json");
    expect(parsed.out).toBe("/tmp/readiness.json");
    expect(parsed.markdownOut).toBe("/tmp/readiness.md");
  });

  test("marks public launch blocked after green seed QA until URL and audience gates exist", () => {
    const report = buildPublicLaunchReadinessPacket({
      assetManifest,
      shopifyPublicUrlGate,
      shopifyPreviewRouteExecutionReceipt,
      publicAudienceScopePacket,
      nullAudienceReplacementExecutionReceipt,
      nullAudienceSeedInboxQa,
      crmWriteApprovalPacket,
      approvalQueue,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.ok).toBe(true);
    expect(report.status).toBe("mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes");
    expect(report.executiveSummary.seedInboxQaGreen).toBe(true);
    expect(report.executiveSummary.nullAudienceReplacementDraftsReady).toBe(true);
    expect(report.executiveSummary.previewLinksReady).toBe(true);
    expect(report.executiveSummary.finalPublicLinksReady).toBe(true);
    expect(report.executiveSummary.publicAudienceSendUrlGateReady).toBe(false);
    expect(report.executiveSummary.publicAudienceScopeReady).toBe(false);
    expect(report.executiveSummary.crmObservedEventsReady).toBe(false);
    expect(report.executiveSummary.postLaunchCrmWriteReady).toBe(false);
    expect(report.executiveSummary.exactPublicSendApprovalAlreadyQueued).toBe(false);
    expect(report.executiveSummary.readyForExactPublicSendApproval).toBe(false);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.postLaunchCrmBlockerCount).toBe(2);
    expect(report.executiveSummary.approvalExecutionBlockerCount).toBe(1);
    expect(report.blockersBeforePublicLaunch).toContain("preview_unlisted_noindex_links_are_not_audience_send_links");
    expect(report.blockersBeforePublicLaunch).toContain("exact_public_audience_scope_decision_missing");
    expect(report.blockersBeforePublicLaunch).toContain("current_drafts_point_only_to_empty_safety_group");
    expect(report.blockersBeforePublicLaunch).not.toContain("real_observed_event_file_missing");
    expect(report.blockersBeforePublicLaunch).not.toContain("public_send_approval_not_available");
    expect(report.postLaunchCrmBlockers).toContain("real_observed_event_file_missing");
    expect(report.approvalExecutionBlockers).toContain("exact_public_send_approval_not_yet_requested_or_matched");
    expect(report.readinessPolicy).toMatchObject({
      postLaunchCrmWritesAreNotPreSendBlockers: true,
      exactApprovalTextIsNotRequiredBeforeReadiness: true,
      executionStillRequiresExactApproval: true,
    });
    expect(markdown).toContain("Ready for exact public send approval: false");
    expect(markdown).toContain("Post-launch CRM writes are not pre-send blockers: true");
    expect(markdown).toContain("No public or audience send.");
    expect(report.safety).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
      recipientsPrinted: false,
    });
  });

  test("treats CRM observed events and approval text as post-readiness boundaries, not pre-send blockers", () => {
    const report = buildPublicLaunchReadinessPacket({
      assetManifest: {
        ...assetManifest,
        executiveSummary: {
          ...assetManifest.executiveSummary,
          publicAudienceSendUrlGateReady: true,
          liveUrlReadyCount: 3,
          previewPromotedToLiveCount: 0,
        },
      },
      shopifyPublicUrlGate: {
        ...shopifyPublicUrlGate,
        executiveSummary: {
          ...shopifyPublicUrlGate.executiveSummary,
          publicAudienceSendUrlGateReady: true,
        },
      },
      shopifyPreviewRouteExecutionReceipt: {
        ...shopifyPreviewRouteExecutionReceipt,
        executionSummary: {
          ...shopifyPreviewRouteExecutionReceipt.executionSummary,
          canUseForPublicAudienceSend: true,
          publicAudienceSendUrlGateReady: true,
        },
      },
      publicAudienceScopePacket: {
        ...publicAudienceScopePacket,
        executiveSummary: {
          ...publicAudienceScopePacket.executiveSummary,
          publicAudienceScopeReady: true,
          selectedAudienceScopeId: "existing_legacy_onboarding_complete_campaign_audience",
        },
        blockersBeforeScopeReady: [],
      },
      nullAudienceReplacementExecutionReceipt,
      nullAudienceSeedInboxQa,
      crmWriteApprovalPacket,
      approvalQueue,
      generatedAt: "2026-06-01T00:00:00.000Z",
    });

    expect(report.status).toBe("mini_launch_public_launch_readiness_ready_for_exact_approval_no_live_changes");
    expect(report.executiveSummary.readyForExactPublicSendApproval).toBe(true);
    expect(report.executiveSummary.canAskAlejandroForPublicSendApprovalNow).toBe(true);
    expect(report.executiveSummary.liveActionAllowedNow).toBe(false);
    expect(report.executiveSummary.crmObservedEventsReady).toBe(false);
    expect(report.executiveSummary.exactPublicSendApprovalAlreadyQueued).toBe(false);
    expect(report.blockersBeforeExactPublicSendApproval).toEqual([]);
    expect(report.postLaunchCrmBlockers).toContain("real_observed_event_file_missing");
    expect(report.approvalExecutionBlockers).toContain("exact_public_send_approval_not_yet_requested_or_matched");
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
