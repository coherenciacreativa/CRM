import { describe, expect, test } from "vitest";

import {
  buildRecordedSafety,
  buildSeedInboxCorrectionUiEditReceipt,
  parseArgs,
  parseDraftUiReference,
  renderMarkdown,
  validateReceipt,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt.mjs";

const executionKit = {
  status: "seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes",
  launch: {
    id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    name: "Inteligencia para descansar",
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
      htmlPath: "/tmp/email-1.html",
      placeholderToReplace: "result_or_resource_link_placeholder",
      finalPublicLinkKey: "result_or_resource_link",
    },
    {
      step: 2,
      role: "practice_or_value",
      draftName: "ML Draft · descanso · E02 Practice",
      subject: "Una practica",
      htmlPath: "/tmp/email-2.html",
      placeholderToReplace: "practice_link_placeholder",
      finalPublicLinkKey: "practice_link",
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      draftName: "ML Draft · descanso · E03 Editorial depth",
      subject: "El descanso pide criterio",
      htmlPath: "/tmp/email-3.html",
      placeholderToReplace: "editorial_note_link_placeholder",
      finalPublicLinkKey: "editorial_note_link",
    },
    {
      step: 4,
      role: "invitation_or_feedback",
      draftName: "ML Draft · descanso · E04 Feedback invitation",
      subject: "Que notaste",
      htmlPath: "/tmp/email-4.html",
      placeholderToReplace: null,
      finalPublicLinkKey: null,
    },
  ],
};

const approvalIntake = {
  status: "exact_approval_detected_requires_fresh_evidence_no_live_changes",
  executiveSummary: {
    matchedApprovalId: "mini_launch_seed_inbox_correction_ui_edit",
    matchedReadyApproval: true,
    liveMutationPerformed: false,
  },
};

const options = {
  observedInDrafts: true,
  draftsTabCount: 4,
  outboxCount: 0,
  usedEditor: "mailerlite_drag_drop_editor",
  freshDraftStateCheck: "all four target drafts visible; outbox 0; no recipients, groups, segments, workflows, schedule or send state",
  draftUiReferences: [
    { step: 1, campaignId: "campaign-1" },
    { step: 2, campaignId: "campaign-2" },
  ],
};

describe("CRM vNext MailerLite seed inbox correction UI edit receipt", () => {
  test("normalizes CLI args and draft UI references", () => {
    const parsed = parseArgs([
      "--observed-in-drafts",
      "--drafts-tab-count",
      "4",
      "--outbox-count",
      "0",
      "--used-editor",
      "mailerlite_drag_drop_editor",
      "--fresh-draft-state-check",
      "all clear",
      "--draft-ui-reference",
      "1:campaignId=abc;emailId=def",
      "--out",
      "/tmp/receipt.json",
    ]);

    expect(parsed.executionKit).toContain("mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.approvalIntake).toContain("mailerlite_launch_os_approval_intake_current_2026-05-31.json");
    expect(parsed.observedInDrafts).toBe(true);
    expect(parsed.outboxCount).toBe(0);
    expect(parsed.draftUiReferences).toEqual([{ step: 1, campaignId: "abc", emailId: "def" }]);
    expect(parseDraftUiReference("2:url=https://example.test")).toEqual({ step: 2, url: "https://example.test" });
  });

  test("records completed correction edit without opening send or publish gates", () => {
    const receipt = buildSeedInboxCorrectionUiEditReceipt({
      executionKit,
      approvalIntake,
      options,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(receipt.status).toBe("seed_inbox_correction_ui_edit_receipt_executed_existing_drafts_updated_no_sends");
    expect(receipt.executiveSummary).toMatchObject({
      approvalMatched: true,
      editedDraftCount: 4,
      allTargetDraftsVisibleInDrafts: true,
      draftsTabCountAfterEdit: 4,
      outboxCountAfterEdit: 0,
      sendCount: 0,
      publishCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupOrSegmentAssignmentCount: 0,
      workflowAttachmentCount: 0,
      exactUrlPrinted: false,
      blockerCount: 0,
    });
    expect(receipt.draftReceipts[0]).toMatchObject({
      placeholderReplacementChecked: true,
      exactUrlPrinted: false,
      draftUiReference: { campaignId: "campaign-1" },
    });
    expect(receipt.draftReceipts[3]).toMatchObject({
      expectedPlaceholderReplacement: null,
      noUnexpectedPlaceholderChecked: true,
    });
    expect(receipt.stillClosedAfterThisReceipt).toContain("seed_send_or_test_send");
    expect(receipt.stillClosedAfterThisReceipt).toContain("public_audience_send");
  });

  test("keeps receipt safety explicit about UI mutation and no exact URL disclosure", () => {
    expect(buildRecordedSafety()).toMatchObject({
      receiptOnly: true,
      browserOpenedByOperator: true,
      mailerLiteUiDraftMutationsRecorded: true,
      mailerLiteApiCalledByThisReceipt: false,
      sendsPerformed: false,
      publicCampaignPublished: false,
      exactUrlsPrinted: false,
      tokensPrinted: false,
    });
  });

  test("blocks incomplete or wrong approval evidence", () => {
    const blockers = validateReceipt({
      executionKit,
      approvalIntake: {
        executiveSummary: {
          matchedApprovalId: "mini_launch_seed_send",
          matchedReadyApproval: true,
          liveMutationPerformed: false,
        },
      },
      draftReceipts: [],
      options: {
        ...options,
        observedInDrafts: false,
        outboxCount: 1,
        freshDraftStateCheck: null,
      },
    });

    expect(blockers).toContain("approval_intake_not_seed_inbox_correction_ui_edit:mini_launch_seed_send");
    expect(blockers).toContain("operator_did_not_observe_all_drafts_after_edit");
    expect(blockers).toContain("outbox_count_not_zero:1");
    expect(blockers).toContain("fresh_draft_state_check_missing");
    expect(blockers).toContain("draft_receipt_count_not_4:0");
  });

  test("renders still-closed gates and no-live safety", () => {
    const receipt = buildSeedInboxCorrectionUiEditReceipt({
      executionKit,
      approvalIntake,
      options,
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(receipt);

    expect(markdown).toContain("Seed Inbox Correction UI Edit Receipt");
    expect(markdown).toContain("No exact URLs printed");
    expect(markdown).toContain("seed_send_or_test_send");
    expect(markdown).toContain("No sends, publish, schedules");
  });
});
