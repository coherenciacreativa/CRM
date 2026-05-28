import { describe, expect, test } from "vitest";

import {
  buildManualUiBuildReceipt,
  buildRecordedSafety,
  parseArgs,
  parseDraftUiReference,
  renderMarkdown,
  validateReceipt,
} from "../scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-build-receipt.mjs";

const executionKit = {
  status: "mini_launch_email_manual_ui_execution_kit_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  executiveSummary: {
    targetDraftCount: 4,
  },
  perDraftSteps: [
    {
      step: 1,
      role: "delivery_and_orientation",
      draftName: "ML Draft · descanso · E01 Delivery orientation",
      subject: "Tu lectura",
      preheader: "Una entrada amable.",
      htmlPath: "/tmp/email-1.html",
    },
    {
      step: 2,
      role: "practice_or_value",
      draftName: "ML Draft · descanso · E02 Practice",
      subject: "Una practica",
      preheader: "Sin hacerlo perfecto.",
      htmlPath: "/tmp/email-2.html",
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      draftName: "ML Draft · descanso · E03 Editorial depth",
      subject: "El descanso pide criterio",
      preheader: "Una nota breve.",
      htmlPath: "/tmp/email-3.html",
    },
    {
      step: 4,
      role: "invitation_or_feedback",
      draftName: "ML Draft · descanso · E04 Feedback invitation",
      subject: "Que notaste",
      preheader: "Una pregunta pequena.",
      htmlPath: "/tmp/email-4.html",
    },
  ],
};

const approvalIntake = {
  status: "exact_approval_detected_requires_fresh_evidence_no_live_changes",
  executiveSummary: {
    matchedApprovalId: "mini_launch_email_manual_ui_builder",
    matchedReadyApproval: true,
    liveMutationPerformed: false,
  },
};

const options = {
  observedInDrafts: true,
  draftsTabCount: 9,
  outboxCount: 0,
  usedEditor: "new_simple_editor",
  customHtmlEditorStatus: "premium_upgrade_locked_on_growing_business",
  freshCollisionCheck: "drafts search mini_2026_06_rehearsal returned 0/0 before build; sent search returned 0/0; outbox 0",
  draftUiReferences: [
    { step: 4, campaignId: "188673460285736734", emailId: "188673460299368223" },
  ],
};

describe("CRM vNext MailerLite mini-launch manual UI build receipt", () => {
  test("normalizes CLI args and draft UI references", () => {
    const parsed = parseArgs([
      "--observed-in-drafts",
      "--drafts-tab-count",
      "9",
      "--outbox-count",
      "0",
      "--used-editor",
      "new_simple_editor",
      "--custom-html-editor-status",
      "premium_upgrade_locked_on_growing_business",
      "--fresh-collision-check",
      "draft/sent searches clear",
      "--draft-ui-reference",
      "4:campaignId=abc;emailId=def",
      "--out",
      "/tmp/receipt.json",
    ]);

    expect(parsed.executionKit).toContain("mailerlite_mini_launch_email_manual_ui_execution_kit_inteligencia_descansar_2026-05-28.json");
    expect(parsed.observedInDrafts).toBe(true);
    expect(parsed.draftsTabCount).toBe(9);
    expect(parsed.outboxCount).toBe(0);
    expect(parsed.draftUiReferences).toEqual([{ step: 4, campaignId: "abc", emailId: "def" }]);
    expect(parsed.out).toBe("/tmp/receipt.json");
    expect(parseDraftUiReference("1:url=https://example.test")).toEqual({ step: 1, url: "https://example.test" });
  });

  test("records the completed UI draft build without opening any send gate", () => {
    const receipt = buildManualUiBuildReceipt({
      executionKit,
      approvalIntake,
      options,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(receipt.status).toBe("manual_ui_build_receipt_executed_drafts_created_no_sends");
    expect(receipt.executiveSummary).toMatchObject({
      createdOrEditedDraftCount: 4,
      allTargetDraftsVisibleInDrafts: true,
      draftsTabCountAfterBuild: 9,
      outboxCountAfterBuild: 0,
      usedEditor: "new_simple_editor",
      customHtmlEditorStatus: "premium_upgrade_locked_on_growing_business",
      sendCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupAssignmentCount: 0,
      workflowAttachmentCount: 0,
    });
    expect(receipt.draftReceipts).toHaveLength(4);
    expect(receipt.draftReceipts[3].draftUiReference).toMatchObject({ campaignId: "188673460285736734" });
    expect(receipt.stillClosedAfterThisReceipt).toContain("seed_send_or_test_send");
    expect(receipt.blockers).toEqual([]);
  });

  test("keeps the receipt safety explicit about UI mutation and no sends", () => {
    expect(buildRecordedSafety()).toMatchObject({
      receiptOnly: true,
      browserOpenedByOperator: true,
      mailerLiteUiDraftMutationsRecorded: true,
      mailerLiteApiCalledByThisReceipt: false,
      sendsPerformed: false,
      groupsCreatedOrAssigned: false,
      factStoreWritePerformed: false,
    });
  });

  test("blocks incomplete evidence", () => {
    const blockers = validateReceipt({
      executionKit,
      approvalIntake,
      draftReceipts: [],
      options: {
        ...options,
        observedInDrafts: false,
        outboxCount: 1,
      },
    });

    expect(blockers).toContain("operator_did_not_observe_all_drafts_in_drafts_tab");
    expect(blockers).toContain("outbox_count_not_zero:1");
    expect(blockers).toContain("draft_receipt_count_not_4:0");
  });

  test("renders operating policy and still-closed gates", () => {
    const receipt = buildManualUiBuildReceipt({
      executionKit,
      approvalIntake,
      options,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(receipt);

    expect(markdown).toContain("Manual UI Build Receipt");
    expect(markdown).toContain("Move to Advanced/API");
    expect(markdown).toContain("No MailerLite API calls by this receipt");
    expect(markdown).toContain("seed_send_or_test_send");
  });
});
