import { describe, expect, test } from "vitest";

import {
  buildPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-approval-packet.mjs";

const correctionPreview = {
  status: "seed_inbox_correction_preview_ready_no_live_changes",
  executiveSummary: {
    finalPublicLinksReady: true,
    subscriptionReasonPolicyReady: true,
    redactedPayloadManifestReady: true,
  },
  redactedPayloadManifest: {
    subscriptionReasonPolicy: {
      policy: "remove_custom_line_and_rely_on_platform_footer",
    },
  },
  safety: {
    exactUrlsStoredInReport: false,
  },
};

const emailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    emailCount: 4,
    renderPreviewNonEmptyCount: 4,
    redCheckCount: 0,
    publicUseReady: false,
    seedSendReady: false,
  },
};

const manualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    outboxCountAfterBuild: 0,
    sendCount: 0,
    scheduleCount: 0,
    subscriberReadOrAssignmentCount: 0,
    groupAssignmentCount: 0,
    workflowAttachmentCount: 0,
  },
  draftReceipts: [
    { step: 1, draftName: "ML Draft · descanso · E01", uiVisibleInDrafts: true },
    { step: 2, draftName: "ML Draft · descanso · E02", uiVisibleInDrafts: true },
    { step: 3, draftName: "ML Draft · descanso · E03", uiVisibleInDrafts: true },
    { step: 4, draftName: "ML Draft · descanso · E04", uiVisibleInDrafts: true },
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
    canUseForPublicAudienceSend: false,
    publicAudienceSendUrlGateReady: false,
  },
};

describe("CRM vNext MailerLite mini-launch seed inbox correction UI edit approval packet", () => {
  test("normalizes args and defaults", () => {
    const parsed = parseArgs(["--out", "/tmp/packet.json", "--markdown-out", "/tmp/packet.md"]);

    expect(parsed.correctionPreview).toContain("mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json");
    expect(parsed.emailRenderQa).toContain("mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json");
    expect(parsed.out).toBe("/tmp/packet.json");
  });

  test("builds exact UI edit approval boundary without opening live gates", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      manualUiBuildReceipt,
      shopifyPreviewRouteExecutionReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes");
    expect(packet.executiveSummary.canAskAlejandroForApproval).toBe(true);
    expect(packet.executiveSummary.targetDraftCount).toBe(4);
    expect(packet.decision.exactApprovalPhrase).toContain("Apruebo editar manualmente en MailerLite UI únicamente los 4 borradores existentes");
    expect(packet.decision.exactApprovalPhrase).toContain("sin enviar correos");
    expect(packet.decision.canEditDraftsNow).toBe(false);
    expect(packet.correctionScope.exactUrlsStoredInThisPacket).toBe(false);
    expect(packet.approvalBoundary.stillClosedEvenAfterApproval).toContain("test_send_or_seed_send");
    expect(packet.safety.mailerLiteUiOpened).toBe(false);
    expect(packet.safety.mailerLiteMutationsPerformed).toBe(false);
    expect(packet.safety.sendsPerformed).toBe(false);
  });

  test("blocks approval when local render QA is not green", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa: {
        ...emailRenderQa,
        status: "mini_launch_email_render_qa_needs_fixes_no_live_changes",
      },
      manualUiBuildReceipt,
      shopifyPreviewRouteExecutionReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(packet.status).toBe("seed_inbox_correction_ui_edit_approval_packet_blocked_no_live_changes");
    expect(packet.executiveSummary.canAskAlejandroForApproval).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBeNull();
    expect(packet.blockers).toContain("email_render_qa_not_green:mini_launch_email_render_qa_needs_fixes_no_live_changes");
  });

  test("renders markdown with safety boundary", () => {
    const packet = buildPacket({
      correctionPreview,
      emailRenderQa,
      manualUiBuildReceipt,
      shopifyPreviewRouteExecutionReceipt,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(renderMarkdown(packet)).toContain("Can ask Alejandro: true");
    expect(renderMarkdown(packet)).toContain("Sin MailerLite UI/API");
    expect(buildSafety().exactUrlsPrinted).toBe(false);
  });
});
