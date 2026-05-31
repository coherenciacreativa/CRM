import { describe, expect, test } from "vitest";

import {
  buildSeedInboxCorrectionPlan,
  parseArgs,
  renderMarkdown,
  targetStepsFor,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-plan.mjs";

const seedInboxQa = {
  ok: true,
  status: "seed_inbox_qa_completed_correction_recommended_before_public_launch_no_live_changes",
  launch: {
    id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    name: "Inteligencia para descansar",
  },
  executiveSummary: {
    deliveryStatus: "green",
    readerFacingPublicReadiness: "yellow_needs_minor_footer_and_link_cleanup",
    correctionRecommendedBeforePublicLaunch: true,
    canAskPublicSendApprovalNow: false,
  },
  messageQa: [
    { step: 1, role: "delivery_orientation", subject: "[Test] Uno", gmailReceiptId: "m1" },
    { step: 2, role: "practice", subject: "[Test] Dos", gmailReceiptId: "m2" },
    { step: 3, role: "editorial_depth", subject: "[Test] Tres", gmailReceiptId: "m3" },
    { step: 4, role: "feedback_invitation", subject: "[Test] Cuatro", gmailReceiptId: "m4" },
  ],
  recommendedCorrectionsBeforePublic: [
    {
      id: "footer_sender_name_consistency",
      severity: "minor",
      scope: "E02_E03_E04",
      recommendation: "Remove duplicate sender name.",
    },
    {
      id: "spanish_subscription_reason_consistency",
      severity: "minor",
      scope: "E01_vs_E02_E03_E04",
      recommendation: "Normalize subscription reason.",
    },
    {
      id: "feedback_reply_cta_cleanup",
      severity: "minor",
      scope: "E04",
      recommendation: "Polish reply token.",
    },
    {
      id: "replace_inert_placeholders_before_public",
      severity: "required_before_public",
      scope: "E01_E02_E03",
      recommendation: "Replace inert placeholders.",
    },
  ],
};

const payloadManifest = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
  },
  payloads: [
    {
      step: 1,
      role: "delivery_and_orientation",
      subject: "Uno",
      contentBlocks: [
        { id: "email_1_cta", placeholder: { value: "result_or_resource_link_placeholder" } },
      ],
    },
    {
      step: 2,
      role: "practice_or_value",
      subject: "Dos",
      contentBlocks: [
        { id: "email_2_cta", placeholder: { value: "practice_link_placeholder" } },
      ],
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      subject: "Tres",
      contentBlocks: [
        { id: "email_3_cta", placeholder: { value: "editorial_note_link_placeholder" } },
      ],
    },
    { step: 4, role: "invitation_or_feedback", subject: "Cuatro", contentBlocks: [] },
  ],
};

describe("CRM vNext MailerLite mini-launch seed inbox correction plan", () => {
  test("normalizes defaults and rejects unknown args", () => {
    const parsed = parseArgs(["--out", "/tmp/out.json"]);
    expect(parsed.seedInboxQa).toContain("mailerlite_mini_launch_seed_inbox_qa");
    expect(parsed.out).toBe("/tmp/out.json");
    expect(() => parseArgs(["--bogus"])).toThrow("unknown_arg:--bogus");
  });

  test("maps known correction IDs to target steps", () => {
    expect(targetStepsFor("footer_sender_name_consistency")).toEqual([2, 3, 4]);
    expect(targetStepsFor("feedback_reply_cta_cleanup")).toEqual([4]);
    expect(targetStepsFor("replace_inert_placeholders_before_public")).toEqual([1, 2, 3]);
  });

  test("builds a local-only correction plan without opening live gates", () => {
    const plan = buildSeedInboxCorrectionPlan({
      seedInboxQa,
      payloadManifest,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(plan.ok).toBe(true);
    expect(plan.status).toBe("seed_inbox_correction_plan_ready_no_live_changes");
    expect(plan.executiveSummary).toMatchObject({
      correctionCount: 4,
      requiredInputCount: 2,
      canAskMailerLiteUiEditApprovalNow: false,
      canAskAdditionalTestSendApprovalNow: false,
      canAskPublicSendApprovalNow: false,
    });
    expect(plan.requiredInputsBeforeUiEditApproval.map((input) => input.id)).toEqual([
      "final_public_links",
      "subscription_reason_policy",
    ]);
    expect(plan.blockersBeforeAnyMailerLiteUiEditApproval).toEqual(expect.arrayContaining([
      "public_readiness_yellow",
      "exact_mailerlite_ui_edit_approval_missing",
      "fresh_post_correction_qa_missing",
    ]));
    expect(plan.corrections.find((correction) => correction.id === "replace_inert_placeholders_before_public")?.targetDrafts)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({ step: 1, placeholderValues: ["result_or_resource_link_placeholder"] }),
        expect.objectContaining({ step: 2, placeholderValues: ["practice_link_placeholder"] }),
        expect.objectContaining({ step: 3, placeholderValues: ["editorial_note_link_placeholder"] }),
      ]));
    expect(plan.safety).toMatchObject({
      mailerLiteUiOpened: false,
      mailerLiteApiCalled: false,
      mailerLiteSendsPerformed: false,
      publicOrAudienceSendPerformed: false,
    });
  });

  test("renders a concise markdown plan", () => {
    const plan = buildSeedInboxCorrectionPlan({
      seedInboxQa,
      payloadManifest,
      sourceDigests: [],
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(plan);

    expect(markdown).toContain("Seed Inbox Correction Plan");
    expect(markdown).toContain("footer_sender_name_consistency");
    expect(markdown).toContain("final_public_links");
    expect(markdown).toContain("No MailerLite UI opened");
  });
});
