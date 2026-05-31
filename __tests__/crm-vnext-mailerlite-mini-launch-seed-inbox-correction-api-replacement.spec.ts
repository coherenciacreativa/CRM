import { describe, expect, test } from "vitest";

import {
  buildExactApprovalPhrase,
  buildPacket,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-approval-packet.mjs";
import {
  buildExactApprovalPhrase as buildCleanupExactApprovalPhrase,
  buildPacket as buildCleanupPacket,
  executionReceiptShowsUnsafeCreatedDrafts,
  targetRowsFrom,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs";
import {
  buildPreflight as buildCleanupPreflight,
  normalizeApprovalPhrase as normalizeCleanupApprovalPhrase,
  parseArgs as parseCleanupArgs,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete.mjs";
import {
  buildFormBody,
  buildPreflight,
  contentForReplacement,
  normalizeApprovalPhrase,
  parseArgs,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-create.mjs";

const correctionPreview = {
  status: "seed_inbox_correction_preview_ready_no_live_changes",
  executiveSummary: {
    finalPublicLinksReady: true,
    redactedPayloadManifestReady: true,
    exactUrlsStoredInReport: false,
  },
  payloads: [
    {
      step: 2,
      role: "practice",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E02",
      subject: "Practice subject",
      cta: { destinationType: "practice_link" },
    },
    {
      step: 3,
      role: "editorial note",
      mailerLiteAssetNameDraft: "ML Draft · descanso · E03",
      subject: "Editorial subject",
      cta: { destinationType: "editorial_note_link" },
    },
  ],
};

const emailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    emailCount: 4,
    redCheckCount: 0,
    publicUseReady: false,
    seedSendReady: false,
  },
};

const manualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    sendCount: 0,
    scheduleCount: 0,
    subscriberReadOrAssignmentCount: 0,
    groupAssignmentCount: 0,
    workflowAttachmentCount: 0,
  },
  draftReceipts: [
    { step: 2, draftName: "ML Draft · descanso · E02", role: "practice" },
    { step: 3, draftName: "ML Draft · descanso · E03", role: "editorial note" },
  ],
  safety: {
    sendsPerformed: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

const shopifyPreviewRouteExecutionReceipt = {
  status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
  executionSummary: {
    previewRouteReady: true,
    targetLinkCount: 3,
    canUseForLocalCorrectionPreview: true,
    publicAudienceSendUrlGateReady: false,
  },
  targetLinks: [
    { key: "practice_link", url: "https://example.test/preview/practice" },
    { key: "editorial_note_link", url: "https://example.test/preview/editorial" },
  ],
};

const apiEditReceipt = {
  status: "mini_launch_seed_inbox_correction_api_edit_failed_stopped",
  skipped: [{ reason: "recipient_gate_not_inert" }],
  operations: [{ error: "no_recipient_filter,no_basic_filter" }],
  safety: {
    mailerLiteDraftsEdited: 0,
    mailerLiteMutationsPerformed: false,
    sendsPerformed: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    tokensPrinted: false,
    exactUrlsPrinted: false,
  },
};

const partialExecutionReceipt = {
  ok: false,
  status: "seed_inbox_correction_api_replacement_execution_partial_created_drafts_not_inert_stopped",
  mode: "execute_requested",
  createdDrafts: [
    {
      step: 2,
      label: "E02",
      campaignId: "new-e02",
      name: "ML Draft · descanso · E02 · API replacement",
      status: "draft",
      oldCampaignId: "old-e02",
      oldDraftLeftIntact: true,
      exactUrlPrinted: false,
    },
    {
      step: 3,
      label: "E03",
      campaignId: "new-e03",
      name: "ML Draft · descanso · E03 · API replacement",
      status: "draft",
      oldCampaignId: "old-e03",
      oldDraftLeftIntact: true,
      exactUrlPrinted: false,
    },
  ],
  postScan: {
    inertDraftCount: 0,
    replacementDrafts: [
      {
        id: "new-e02",
        name: "ML Draft · descanso · E02 · API replacement",
        status: "draft",
        canBeScheduled: true,
        hasBasicFilter: true,
        filterIsEmptyArray: true,
        scheduledFor: null,
        queuedAt: null,
        usedInAutomations: false,
        contentHasPlaceholder: false,
        contentHasExpectedUrl: true,
      },
      {
        id: "new-e03",
        name: "ML Draft · descanso · E03 · API replacement",
        status: "draft",
        canBeScheduled: true,
        hasBasicFilter: true,
        filterIsEmptyArray: true,
        scheduledFor: null,
        queuedAt: null,
        usedInAutomations: false,
        contentHasPlaceholder: false,
        contentHasExpectedUrl: true,
      },
    ],
  },
  safety: {
    mailerLiteDraftsCreated: 2,
    mailerLiteMutationsPerformed: true,
    oldDraftsEdited: false,
    oldDraftsDeletedOrArchived: false,
    campaignsPublished: false,
    campaignsScheduled: false,
    sendsPerformed: false,
    subscribersRead: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    segmentsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    shopifyMutationsPerformed: false,
    crmLiveApiCalled: false,
    signalLedgerAppendPerformed: false,
    crmCardMutationsPerformed: false,
    crmScoreMutationsPerformed: false,
    factStoreWritePerformed: false,
    tokensPrinted: false,
    exactUrlsPrinted: false,
  },
};

describe("CRM vNext MailerLite mini-launch API replacement drafts", () => {
  test("builds an exact API replacement approval packet without self-authorization", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      manualUiBuildReceipt,
      shopifyPreviewRouteExecutionReceipt,
      apiEditReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_inbox_correction_api_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.replacementTargets).toHaveLength(2);
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.decision.canCreateReplacementDraftsNow).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBe(buildExactApprovalPhrase());
    expect(packet.approvalBoundary.stillClosedEvenAfterApproval).toContain("test_send_or_seed_send");
    expect(packet.safety.mailerLiteApiCalled).toBe(false);
    expect(packet.safety.mailerLiteMutationsPerformed).toBe(false);
  });

  test("preflight blocks collisions and opens only the approved create lane when clean", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      manualUiBuildReceipt,
      shopifyPreviewRouteExecutionReceipt,
      apiEditReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const campaigns = [
      { id: "old-e02", name: "ML Draft · descanso · E02", status: "draft" },
      { id: "old-e03", name: "ML Draft · descanso · E03", status: "draft" },
    ];

    const preflight = buildPreflight({
      approvalPacket: packet,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaigns,
    });

    expect(preflight.canExecute).toBe(true);
    expect(preflight.blockers).toEqual([]);
    expect(preflight.targetPlan.map((row) => row.replacementNameCollisionCount)).toEqual([0, 0]);

    const collision = buildPreflight({
      approvalPacket: packet,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaigns: [
        ...campaigns,
        { id: "replacement-e02", name: "ML Draft · descanso · E02 · API replacement", status: "draft" },
      ],
    });

    expect(collision.canExecute).toBe(false);
    expect(collision.blockers).toContain("target_E02_replacement_name_already_exists");
  });

  test("preserves HTML while replacing only the approved placeholder", () => {
    const oldContent = "<table>\n  <tr><td>practice_link_placeholder</td></tr>\n</table>";
    const result = contentForReplacement({
      oldContent,
      placeholder: "practice_link_placeholder",
      url: "https://example.test/preview/practice",
    });

    expect(result.replacedCount).toBe(1);
    expect(result.content).toBe("<table>\n  <tr><td>https://example.test/preview/practice</td></tr>\n</table>");
  });

  test("form body never carries recipients, groups, segments or workflow fields", () => {
    const body = buildFormBody({
      name: "Replacement",
      subject: "Subject",
      fromName: "Sender",
      fromEmail: "sender@example.test",
      replyTo: "reply@example.test",
      content: "<p>Hello</p>",
    });

    expect(body.type).toBe("regular");
    expect(Object.keys(body).some((key) => /group|segment|subscriber|workflow|recipient/i.test(key))).toBe(false);
  });

  test("normalizes the exact approval phrase and parser defaults", () => {
    const phrase = buildExactApprovalPhrase();
    expect(normalizeApprovalPhrase(`  ${phrase}\n`)).toBe(normalizeApprovalPhrase(phrase));
    const parsed = parseArgs(["--execute", "--approval-phrase", phrase]);
    expect(parsed.execute).toBe(true);
    expect(parsed.approvalPhrase).toBe(phrase);
    expect(parsed.apiBase).toBe("https://connect.mailerlite.com/api");
  });

  test("builds cleanup approval packet for the two unsafe API replacement drafts", () => {
    const targets = targetRowsFrom(partialExecutionReceipt);
    expect(executionReceiptShowsUnsafeCreatedDrafts(partialExecutionReceipt, targets)).toBe(true);

    const packet = buildCleanupPacket({
      executionReceipt: partialExecutionReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_inbox_correction_api_replacement_cleanup_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.cleanupTargets).toHaveLength(2);
    expect(packet.decision.packetIsApprovalByItself).toBe(false);
    expect(packet.decision.canDeleteNow).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBe(buildCleanupExactApprovalPhrase());
    expect(packet.approvalBoundary.stillClosedEvenAfterApproval).toContain("creating_new_replacement_drafts");
    expect(packet.safety.mailerLiteApiCalled).toBe(false);
    expect(packet.safety.mailerLiteDraftsDeleted).toBe(0);
  });

  test("cleanup delete preflight stays gated to exact unsafe draft ids", () => {
    const packet = buildCleanupPacket({
      executionReceipt: partialExecutionReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const preflight = buildCleanupPreflight({
      approvalPacket: packet,
      currentStatuses: [
        {
          found: true,
          id: "new-e02",
          name: "ML Draft · descanso · E02 · API replacement",
          status: "draft",
          scheduledFor: null,
          queuedAt: null,
          startedAt: null,
          finishedAt: null,
          usedInAutomations: false,
        },
        {
          found: true,
          id: "new-e03",
          name: "ML Draft · descanso · E03 · API replacement",
          status: "draft",
          scheduledFor: null,
          queuedAt: null,
          startedAt: null,
          finishedAt: null,
          usedInAutomations: false,
        },
      ],
    });

    expect(preflight.canExecute).toBe(true);
    expect(preflight.blockers).toEqual([]);

    const unsafeNameMismatch = buildCleanupPreflight({
      approvalPacket: packet,
      currentStatuses: [
        {
          found: true,
          id: "new-e02",
          name: "Wrong draft",
          status: "draft",
          scheduledFor: null,
          queuedAt: null,
          startedAt: null,
          finishedAt: null,
          usedInAutomations: false,
        },
        {
          found: true,
          id: "new-e03",
          name: "ML Draft · descanso · E03 · API replacement",
          status: "draft",
          scheduledFor: null,
          queuedAt: null,
          startedAt: null,
          finishedAt: null,
          usedInAutomations: false,
        },
      ],
    });

    expect(unsafeNameMismatch.canExecute).toBe(false);
    expect(unsafeNameMismatch.blockers).toContain("cleanup_target_E02_name_mismatch");

    const phrase = buildCleanupExactApprovalPhrase();
    const parsed = parseCleanupArgs(["--execute", "--approval-phrase", phrase]);
    expect(parsed.execute).toBe(true);
    expect(normalizeCleanupApprovalPhrase(parsed.approvalPhrase)).toBe(normalizeCleanupApprovalPhrase(phrase));
  });
});
