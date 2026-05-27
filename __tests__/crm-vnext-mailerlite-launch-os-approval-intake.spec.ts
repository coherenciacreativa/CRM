import { describe, expect, test } from "vitest";

import {
  buildApprovalIntake,
  buildSafety,
  normalizeApprovalText,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-approval-intake.mjs";

const exactMiniLaunchPhrase = "Apruebo crear únicamente estos 2 grupos vacíos del mini-lanzamiento en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar onboarding y con re-scan fresco previo: CC · Source · Quiz · Inteligencia para descansar; CC · Delivered · Quiz result · Inteligencia para descansar.";
const exactOnboardingPhrase = "Apruebo crear únicamente estos 12 grupos vacíos de Onboarding v2 en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar Onboarding v1 y con re-scan fresco previo.";

const approvalQueue = {
  status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
  executiveSummary: {
    readyApprovalRequestCount: 2,
    blockedApprovalRequestCount: 1,
    openLiveMutationGateCount: 0,
    nextBestHumanBoundary: "mini_launch_empty_group_creation",
    readyApprovalIds: ["mini_launch_empty_group_creation", "onboarding_v2_empty_group_creation"],
    blockedApprovalIds: ["mini_launch_seed_send"],
  },
  approvalItems: [
    {
      id: "mini_launch_empty_group_creation",
      title: "Mini-launch empty MailerLite groups",
      lane: "mini_launch_inteligencia_para_descansar",
      operationType: "live_mailerlite_group_creation_after_exact_approval",
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      exactApprovalPhrase: exactMiniLaunchPhrase,
      targetCount: 2,
      targetNames: [
        "CC · Source · Quiz · Inteligencia para descansar",
        "CC · Delivered · Quiz result · Inteligencia para descansar",
      ],
      allowedAfterExactApproval: ["create_these_named_empty_mailerlite_groups_only_after_fresh_rescan"],
      stillClosed: ["subscriber_reads_or_assignment", "workflow_or_automation_use", "sends"],
      requiredFreshEvidence: ["rerun mini-launch group dry-run immediately before execution"],
      commandAfterApproval: "npm run crm:vnext:mailerlite-mini-launch-empty-group-create -- --execute --approval-phrase \"<exact phrase>\"",
      blockers: [],
    },
    {
      id: "onboarding_v2_empty_group_creation",
      title: "Onboarding v2 empty MailerLite groups",
      lane: "onboarding_v2",
      operationType: "live_mailerlite_group_creation_after_exact_approval",
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      exactApprovalPhrase: exactOnboardingPhrase,
      targetCount: 12,
      targetNames: ["CC · Source · IG onboarding"],
      allowedAfterExactApproval: ["create_only_the_named_empty_onboarding_v2_groups_after_fresh_rescan"],
      stillClosed: ["onboarding_v1_changes", "subscriber_assignment_or_import"],
      requiredFreshEvidence: ["rerun onboarding v2 empty-groups create dry-run"],
      commandAfterApproval: "npm run crm:vnext:mailerlite-onboarding-v2-empty-groups-create -- --execute --approval-phrase \"<exact phrase>\"",
      blockers: [],
    },
    {
      id: "mini_launch_seed_send",
      title: "Mini-launch seed send",
      lane: "mini_launch_inteligencia_para_descansar",
      operationType: "mailerLite_seed_send_after_later_exact_approval",
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
      exactApprovalPhrase: null,
      targetCount: 0,
      targetNames: [],
      allowedAfterExactApproval: [],
      stillClosed: ["seed_send"],
      requiredFreshEvidence: [],
      commandAfterApproval: null,
      blockers: ["real_mailerlite_render_qa_missing"],
    },
  ],
};

describe("CRM vNext MailerLite Launch OS approval intake", () => {
  test("normalizes default args and mutually exclusive approval inputs", () => {
    const parsed = parseArgs(["--approval-text", "hola", "--out", "/tmp/intake.json", "--markdown-out", "/tmp/intake.md"]);

    expect(parsed.approvalQueue).toContain("mailerlite_launch_os_approval_queue_2026-05-28.json");
    expect(parsed.approvalText).toBe("hola");
    expect(parsed.out).toBe("/tmp/intake.json");
    expect(parsed.markdownOut).toBe("/tmp/intake.md");
    expect(() => parseArgs(["--approval-text", "x", "--approval-file", "/tmp/x"])).toThrow("approval_text_and_file_are_mutually_exclusive");
  });

  test("keeps the intake safety contract local and non-mutating", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      approvalTextPrinted: false,
      exactApprovalPhrasePrinted: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("waits quietly when no approval text is supplied", () => {
    const intake = buildApprovalIntake({
      approvalQueue,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(intake.status).toBe("waiting_for_exact_approval_text_no_live_changes");
    expect(intake.executiveSummary.approvalTextProvided).toBe(false);
    expect(intake.executiveSummary.matchedApprovalCount).toBe(0);
    expect(intake.executiveSummary.executionAllowedNow).toBe(false);
    expect(intake.matchedApproval).toBeNull();
  });

  test("detects an exact ready approval phrase without allowing execution", () => {
    const intake = buildApprovalIntake({
      approvalQueue,
      approvalText: `Mantis: ${exactMiniLaunchPhrase}`,
      approvalTextSource: "cli_text",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(intake.status).toBe("exact_approval_detected_requires_fresh_evidence_no_live_changes");
    expect(intake.executiveSummary.matchedApprovalId).toBe("mini_launch_empty_group_creation");
    expect(intake.executiveSummary.canProceedToFreshEvidence).toBe(true);
    expect(intake.executiveSummary.executionAllowedNow).toBe(false);
    expect(intake.matchedApproval).toMatchObject({
      targetCount: 2,
      blockers: [],
      targetNames: [
        "CC · Source · Quiz · Inteligencia para descansar",
        "CC · Delivered · Quiz result · Inteligencia para descansar",
      ],
    });
    expect(intake.operatorPlan.join("\n")).toContain("Fresh evidence required: rerun mini-launch group dry-run immediately before execution");
  });

  test("does not accept approximate or altered approval text", () => {
    const intake = buildApprovalIntake({
      approvalQueue,
      approvalText: exactMiniLaunchPhrase.replace("únicamente", "solo"),
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(intake.status).toBe("approval_text_present_but_no_exact_phrase_no_live_changes");
    expect(intake.executiveSummary.matchedApprovalCount).toBe(0);
    expect(intake.executiveSummary.canProceedToFreshEvidence).toBe(false);
    expect(intake.approvalTextHandling).toMatchObject({
      approvalTextClassification: "unmatched_or_broad_scope",
      broadOrApproximateApprovalExecutable: false,
      noLiveActionReason: "supplied_text_did_not_match_any_exact_queued_approval_phrase",
    });
    expect(intake.operatorPlan.join("\n")).toContain("Treat broad, approximate, or multi-scope approval as non-executable.");
  });

  test("classifies broad group approval as human intent but not executable scope", () => {
    const intake = buildApprovalIntake({
      approvalQueue,
      approvalText: "Te autorizo para crear los grupos que necesites",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(intake.status).toBe("approval_text_present_but_no_exact_phrase_no_live_changes");
    expect(intake.executiveSummary.approvalTextProvided).toBe(true);
    expect(intake.executiveSummary.matchedApprovalCount).toBe(0);
    expect(intake.executiveSummary.executionAllowedNow).toBe(false);
    expect(intake.executiveSummary.approvalTextClassification).toBe("unmatched_or_broad_scope");
    expect(intake.operatorPlan.join("\n")).toContain("Ready queue items remain separate boundaries");
    expect(intake.operatorPlan.join("\n")).toContain("Do not infer whether broad approval applies");
  });

  test("blocks ambiguous exact phrase matches", () => {
    const duplicatedQueue = {
      ...approvalQueue,
      approvalItems: [
        approvalQueue.approvalItems[0],
        {
          ...approvalQueue.approvalItems[1],
          exactApprovalPhrase: exactMiniLaunchPhrase,
        },
      ],
    };
    const intake = buildApprovalIntake({
      approvalQueue: duplicatedQueue,
      approvalText: exactMiniLaunchPhrase,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(intake.status).toBe("ambiguous_exact_approval_phrase_detected_no_live_changes");
    expect(intake.executiveSummary.matchedApprovalCount).toBe(2);
    expect(intake.executiveSummary.executionAllowedNow).toBe(false);
    expect(intake.ambiguousMatches.map((item) => item.id)).toEqual([
      "mini_launch_empty_group_creation",
      "onboarding_v2_empty_group_creation",
    ]);
  });

  test("renders markdown without printing the approval text or exact phrase", () => {
    const intake = buildApprovalIntake({
      approvalQueue,
      approvalText: exactMiniLaunchPhrase,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(intake);

    expect(markdown).toContain("# MailerLite Launch OS v0 - Approval Intake");
    expect(markdown).toContain("Matched approval id: mini_launch_empty_group_creation");
    expect(markdown).toContain("Approval text printed: false");
    expect(markdown).not.toContain(exactMiniLaunchPhrase);
  });

  test("normalizes approval-file text without weakening exact phrase matching", () => {
    expect(normalizeApprovalText(`\r\n${exactMiniLaunchPhrase}\r\n`)).toBe(exactMiniLaunchPhrase);
  });
});
