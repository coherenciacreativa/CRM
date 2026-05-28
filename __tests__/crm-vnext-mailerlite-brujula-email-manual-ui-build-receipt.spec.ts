import { describe, expect, test } from "vitest";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  buildBrujulaManualUiBuildReceipt,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-brujula-email-manual-ui-build-receipt.mjs";

const correction = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  draft: {
    subject: "Aquí está La Brújula de Claridad",
    preheader: "Una práctica breve para mirar una decisión con más calma.",
  },
  outputs: {
    htmlPath: "/tmp/mailerlite_brujula_email1_corrected_draft_2026-05-27.html",
    plainTextPath: "/tmp/mailerlite_brujula_email1_corrected_draft_2026-05-27.txt",
  },
};

const renderQa = {
  status: "brujula_email1_local_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
  },
};

const approvalIntake = {
  executiveSummary: {
    matchedApprovalId: "brujula_email1_builder_draft",
    matchedReadyApproval: true,
    liveMutationPerformed: false,
  },
};

const options = {
  campaignId: "188677585118430654",
  emailEditorId: "188677585133110728",
  campaignName: "Brújula · Email 1 corregido · Aquí está La Brújula de Claridad",
  subject: "Aquí está La Brújula de Claridad",
  preheader: "Una práctica breve para mirar una decisión con más calma.",
  campaignsRead: 30,
  draftsTabCount: 10,
  outboxCount: 0,
  preScanCampaignsRead: 29,
  preScanExactTargetMatches: 0,
  usedEditor: "new_simple_editor",
  customHtmlEditorStatus: "custom_html_import_not_used_on_growing_business_manual_ui_route",
  freshCollisionCheck: "pre-scan 0 matches; post-scan one draft; Outbox 0",
  observedInDrafts: true,
  contentPreviewObserved: true,
  recipientsEmptyObserved: true,
  savedIndicatorObserved: true,
};

const correctionWithExistingSources = async () => {
  const dir = await mkdtemp(join(tmpdir(), "brujula-receipt-"));
  const htmlPath = join(dir, "email.html");
  const plainTextPath = join(dir, "email.txt");
  await writeFile(htmlPath, "<html><body>Brújula</body></html>");
  await writeFile(plainTextPath, "Brújula");
  return {
    ...correction,
    outputs: {
      htmlPath,
      plainTextPath,
    },
  };
};

describe("CRM vNext MailerLite Brújula manual UI build receipt", () => {
  test("parses defaults and output paths", () => {
    const parsed = parseArgs(["--campaign-id", "123", "--out", "/tmp/receipt.json"]);

    expect(parsed.correction).toContain("mailerlite_brujula_email_style_correction_packet_2026-05-27.json");
    expect(parsed.renderQa).toContain("mailerlite_brujula_email_render_qa_packet_2026-05-27.json");
    expect(parsed.approvalIntake).toContain("mailerlite_launch_os_approval_intake_2026-05-28.json");
    expect(parsed.campaignId).toBe("123");
    expect(parsed.out).toBe("/tmp/receipt.json");
  });

  test("records a completed one-draft receipt with all live gates closed", async () => {
    const receipt = await buildBrujulaManualUiBuildReceipt({
      correction: await correctionWithExistingSources(),
      renderQa,
      approvalIntake,
      options,
      sourceDigests: [],
      generatedAt: "2026-05-28T03:10:00.000Z",
    });

    expect(receipt.status).toBe("brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends");
    expect(receipt.executiveSummary).toMatchObject({
      createdOrEditedDraftCount: 1,
      campaignId: "188677585118430654",
      subject: "Aquí está La Brújula de Claridad",
      outboxCountAfterBuild: 0,
      sendCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupAssignmentCount: 0,
      workflowAttachmentCount: 0,
    });
    expect(receipt.draftReceipt).toMatchObject({
      uiVisibleInDrafts: true,
      contentCopiedFromLocalHtmlPath: true,
      subjectChecked: true,
      preheaderChecked: true,
      recipientsEmptyObserved: true,
      notSentChecked: true,
    });
    expect(receipt.stillClosedAfterThisReceipt).toContain("test_send_or_public_send");
    expect(receipt.safety.sendsPerformed).toBe(false);
    expect(receipt.safety.factStoreWritePerformed).toBe(false);
  });

  test("blocks incomplete evidence", async () => {
    const receipt = await buildBrujulaManualUiBuildReceipt({
      correction,
      renderQa,
      approvalIntake,
      options: {
        ...options,
        subject: "Wrong subject",
        outboxCount: 1,
        observedInDrafts: false,
      },
    });

    expect(receipt.status).toBe("brujula_email1_manual_ui_build_receipt_incomplete_or_blocked");
    expect(receipt.blockers).toContain("subject_mismatch");
    expect(receipt.blockers).toContain("outbox_count_not_zero:1");
    expect(receipt.blockers).toContain("draft_not_observed_in_drafts");
  });

  test("keeps the safety contract receipt-only", () => {
    expect(buildSafety()).toMatchObject({
      receiptOnly: true,
      mailerLiteApiCalledByThisReceipt: false,
      subscribersReadOrAssigned: false,
      groupsCreatedOrAssigned: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
    });
  });

  test("renders Markdown summary", async () => {
    const markdown = renderMarkdown(await buildBrujulaManualUiBuildReceipt({
      correction: await correctionWithExistingSources(),
      renderQa,
      approvalIntake,
      options,
    }));

    expect(markdown).toContain("Brújula Email 1 Manual UI Build Receipt");
    expect(markdown).toContain("Outbox count: 0");
    expect(markdown).toContain("test_send_or_public_send");
  });
});
