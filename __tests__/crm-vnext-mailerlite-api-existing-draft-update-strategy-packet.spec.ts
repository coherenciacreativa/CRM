import { describe, expect, test } from "vitest";

import {
  buildStrategyPacket,
  cleanupCompleted,
  parseArgs,
  renderMarkdown,
  summarizeDraftSafety,
} from "../scripts/crm-vnext-mailerlite-api-existing-draft-update-strategy-packet.mjs";

const diagnostic = {
  ok: true,
  mode: "read_only_mailerlite_api_edit_diagnostic",
  status: "seed_inbox_correction_api_edit_diagnostic_blocked_or_needs_ui_no_live_changes",
  executiveSummary: {
    campaignReadCount: 4,
    apiErrorCount: 0,
    allCorrectedHtmlReady: true,
    allApiPayloadReady: true,
    allDraftsInertByApi: false,
    apiEditCandidate: false,
    blockerCount: 8,
  },
  draftDiagnostics: [
    {
      step: 1,
      currentCampaign: { safety: { allClosed: true, failed: [] } },
      apiPayload: { expectedPreviewUrlHashPresentAfterReplacement: true, totalPlaceholderCountAfterReplacement: 0 },
    },
    {
      step: 2,
      currentCampaign: {
        safety: {
          allClosed: false,
          failed: ["filter_absent_or_null", "no_basic_filter", "recipients_missing", "cannot_schedule_without_recipients"],
        },
      },
      apiPayload: { expectedPreviewUrlHashPresentAfterReplacement: true, totalPlaceholderCountAfterReplacement: 0 },
    },
  ],
  safety: {
    mailerLiteApiCalled: true,
    mailerLiteMutationsPerformed: false,
    sendsPerformed: false,
    tokensPrinted: false,
    exactUrlsPrinted: false,
  },
};

const apiLab = {
  ok: true,
  status: "mailerlite_api_inert_draft_lab_completed_no_inert_recipe_found_no_sends",
  executiveSummary: {
    cleanupComplete: true,
    variantCount: 4,
    inertVariantCount: 0,
    readyToUseApiRecipeForRealDrafts: false,
  },
  safety: {
    sendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    segmentsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    tokensPrinted: false,
  },
};

const uiPacket = {
  status: "seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    canAskAlejandroForApproval: true,
  },
};

const cleanupReceipt = {
  ok: true,
  status: "seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends",
  deletedDrafts: [{ step: 2 }, { step: 3 }],
  postScan: { goneCount: 2 },
  safety: {
    mailerLiteApiCalled: true,
    mailerLiteDraftsDeleted: 2,
    sendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    segmentsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    tokensPrinted: false,
    exactUrlsPrinted: false,
  },
};

describe("CRM vNext MailerLite API existing draft update strategy packet", () => {
  test("parses defaults", () => {
    const parsed = parseArgs(["--out", "/tmp/api-strategy.json"]);

    expect(parsed.apiEditDiagnostic).toContain("mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic");
    expect(parsed.apiInertDraftLab).toContain("mailerlite_api_inert_draft_lab");
    expect(parsed.out).toBe("/tmp/api-strategy.json");
  });

  test("records that current existing-draft API update is blocked while API read remains useful", () => {
    const packet = buildStrategyPacket({
      apiEditDiagnostic: diagnostic,
      apiInertDraftLab: apiLab,
      uiEditApprovalPacket: uiPacket,
      apiReplacementCleanupReceipt: cleanupReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("mailerlite_api_existing_draft_update_strategy_blocked_existing_drafts_not_inert_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      apiConnectionStableForRead: true,
      apiCreateRealDraftsRecommendedNow: false,
      apiExistingDraftUpdateRecommendedNow: false,
      allApiPayloadReady: true,
      allDraftsInertByApi: false,
      cleanupDone: true,
    });
    expect(packet.blockers).toContain("existing_drafts_not_all_inert_by_api");
    expect(packet.decisionBoundary).toMatchObject({
      packetIsApprovalByItself: false,
      canEditByApiNow: false,
      exactApprovalPhraseAvailable: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteMutationsPerformed: false,
      exactUrlsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("can become ready for a later separate approval packet only when all local evidence is green", () => {
    const readyDiagnostic = {
      ...diagnostic,
      status: "seed_inbox_correction_api_edit_diagnostic_ready_for_guarded_api_edit_approval_no_live_changes",
      executiveSummary: {
        ...diagnostic.executiveSummary,
        allDraftsInertByApi: true,
        apiEditCandidate: true,
        blockerCount: 0,
      },
      draftDiagnostics: diagnostic.draftDiagnostics.map((draft) => ({
        ...draft,
        currentCampaign: { safety: { allClosed: true, failed: [] } },
      })),
    };
    const packet = buildStrategyPacket({
      apiEditDiagnostic: readyDiagnostic,
      apiInertDraftLab: apiLab,
      uiEditApprovalPacket: uiPacket,
      apiReplacementCleanupReceipt: cleanupReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("mailerlite_api_existing_draft_update_strategy_ready_for_separate_approval_packet_no_live_changes");
    expect(packet.executiveSummary.apiExistingDraftUpdateRecommendedNow).toBe(true);
    expect(packet.decisionBoundary.canEditByApiNow).toBe(false);
    expect(packet.decisionBoundary.exactApprovalPhraseAvailable).toBe(false);
  });

  test("summarizes draft safety and renders source links without exact URLs", () => {
    const packet = buildStrategyPacket({
      apiEditDiagnostic: diagnostic,
      apiInertDraftLab: apiLab,
      uiEditApprovalPacket: uiPacket,
      apiReplacementCleanupReceipt: cleanupReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(cleanupCompleted(cleanupReceipt)).toBe(true);
    expect(summarizeDraftSafety(diagnostic)[1]).toMatchObject({
      step: 2,
      safetyClosed: false,
      failedSafetyCheckCount: 4,
      exactUrlStoredInReport: false,
    });
    expect(markdown).toContain("https://developers.mailerlite.com/docs/campaigns");
    expect(markdown).toContain("Exact URLs stored/printed: false/false");
    expect(markdown).not.toContain("result_or_resource_link_placeholder");
  });
});
