import { describe, expect, test } from "vitest";

import {
  approvalStatusFor,
  buildExecutionDecision,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-create.mjs";

const phrase = "Apruebo crear únicamente estos 2 grupos vacíos de Onboarding v2 en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar Onboarding v1 y con re-scan fresco previo: CC · Source · IG onboarding; CC · Journey · Editorial onboarding · In progress.";

const readyPacket = {
  ok: true,
  status: "ready_for_exact_human_approval_to_create_empty_groups",
  blockers: [],
  approvalGate: {
    exactApprovalPhrase: phrase,
  },
  targetPlan: [
    {
      name: "CC · Source · IG onboarding",
      plannedOperation: "create_empty_group_after_exact_human_approval",
      existsInFreshScan: false,
      canCreateEmptyAfterExplicitApproval: true,
      workflowUseAllowed: false,
      subscriberAssignmentAllowed: false,
    },
    {
      name: "CC · Journey · Editorial onboarding · In progress",
      plannedOperation: "create_empty_group_after_exact_human_approval",
      existsInFreshScan: false,
      canCreateEmptyAfterExplicitApproval: true,
      workflowUseAllowed: false,
      subscriberAssignmentAllowed: false,
    },
  ],
};

describe("CRM vNext MailerLite onboarding v2 empty groups create runner", () => {
  test("keeps default design packet and Brand dictionary paths for CLI dry-run", () => {
    const options = parseArgs([]);

    expect(options.designPacket).toContain("mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json");
    expect(options.brandDictionary).toContain("MAILERLITE_GROUP_DICTIONARY_V0.md");
    expect(options.execute).toBe(false);
  });

  test("normalizes exact approval phrase but rejects mismatches", () => {
    expect(normalizeApprovalPhrase(`  ${phrase.replace(/\s+/g, "   ")}  `)).toBe(normalizeApprovalPhrase(phrase));

    expect(approvalStatusFor({
      execute: true,
      approvalPhrase: "adelante",
      expectedPhrase: phrase,
    })).toMatchObject({
      ok: false,
      status: "blocked_approval_phrase_mismatch",
    });
  });

  test("dry-run requires no live approval and cannot execute", () => {
    const decision = buildExecutionDecision({
      packet: readyPacket,
      execute: false,
      approvalPhrase: null,
    });

    expect(decision).toMatchObject({
      canExecute: false,
      approval: { ok: true, status: "dry_run_no_live_approval_required" },
      blockers: [],
    });
  });

  test("execute requires exact approval phrase", () => {
    expect(buildExecutionDecision({
      packet: readyPacket,
      execute: true,
      approvalPhrase: null,
    })).toMatchObject({
      canExecute: false,
      blockers: ["blocked_missing_exact_approval_phrase"],
    });

    expect(buildExecutionDecision({
      packet: readyPacket,
      execute: true,
      approvalPhrase: phrase,
    })).toMatchObject({
      canExecute: true,
      blockers: [],
      approval: { status: "exact_approval_phrase_matched" },
    });
  });

  test("blocks execute if any target is not safe to create empty", () => {
    const packet = {
      ...readyPacket,
      targetPlan: [
        ...readyPacket.targetPlan,
        {
          name: "CC · Sent · Article · Sobre el amor",
          plannedOperation: "block_existing_target_group",
          existsInFreshScan: true,
          canCreateEmptyAfterExplicitApproval: false,
        },
      ],
    };

    const decision = buildExecutionDecision({
      packet,
      execute: true,
      approvalPhrase: phrase,
    });

    expect(decision.canExecute).toBe(false);
    expect(decision.blockers).toContain("CC · Sent · Article · Sobre el amor:not_safe_to_create_empty");
  });

  test("renders safety boundaries in markdown", () => {
    const decision = buildExecutionDecision({
      packet: readyPacket,
      execute: false,
      approvalPhrase: null,
    });
    const markdown = renderMarkdown({
      generatedAt: "2026-05-27T00:00:00.000Z",
      mode: "dry_run",
      status: "dry_run_ready_for_exact_approval",
      packetSummary: {
        status: readyPacket.status,
        targetCount: 2,
        liveGroupsRead: 75,
        liveAutomationsRead: 13,
      },
      decision,
      createdGroups: [],
      errors: [],
      safety: {
        mailerLiteMutationsPerformed: false,
        groupMutationType: null,
      },
    });

    expect(markdown).toContain("No subscribers read or printed.");
    expect(markdown).toContain("No workflows or automations edited.");
    expect(markdown).toContain("Onboarding v1 untouched.");
  });
});
