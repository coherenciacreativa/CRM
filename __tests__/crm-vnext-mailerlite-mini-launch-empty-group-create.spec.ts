import { describe, expect, test } from "vitest";

import {
  approvalStatusFor,
  buildRunFromState,
  buildTargetPlan,
  normalizeApprovalPhrase,
  renderMarkdown,
  validatePacketReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-empty-group-create.mjs";

const approvalPhrase =
  "Apruebo crear únicamente estos 2 grupos vacíos del mini-lanzamiento en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar onboarding y con re-scan fresco previo: CC · Source · Quiz · Inteligencia para descansar; CC · Delivered · Quiz result · Inteligencia para descansar.";

const packet = {
  ok: true,
  status: "ready_for_exact_human_approval_to_create_mini_launch_empty_groups",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  sourceDryRun: {
    status: "mini_launch_group_dry_run_ready_for_future_empty_group_decision",
    generatedAt: "2026-05-28T00:00:00.000Z",
  },
  decision: {
    canAskAlejandroForApproval: true,
    exactApprovalPhrase: approvalPhrase,
    requiresFreshRerunBeforeExecution: true,
    packetIsApprovalByItself: false,
  },
  targetGroups: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      plannedOperation: "create_named_empty_group_after_exact_human_approval",
      allowedOperation: "create_named_empty_group_only_after_explicit_approval",
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
      sendAllowed: false,
      existsInMailerLite: false,
      liveGroupId: null,
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      plannedOperation: "create_named_empty_group_after_exact_human_approval",
      allowedOperation: "create_named_empty_group_only_after_explicit_approval",
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
      sendAllowed: false,
      existsInMailerLite: false,
      liveGroupId: null,
    },
  ],
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteGroupsCreated: false,
    subscribersReadByThisPacket: false,
    workflowMutationsPerformed: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch empty group create runner", () => {
  test("normalizes exact approval phrases but never requires them in dry-run", () => {
    const dryRunApproval = approvalStatusFor({
      execute: false,
      approvalPhrase: null,
      expectedPhrase: approvalPhrase,
    });
    const executeApproval = approvalStatusFor({
      execute: true,
      approvalPhrase: `  ${approvalPhrase}  `,
      expectedPhrase: approvalPhrase,
    });

    expect(dryRunApproval).toMatchObject({
      ok: true,
      status: "dry_run_no_live_approval_required",
    });
    expect(executeApproval).toMatchObject({
      ok: true,
      status: "exact_approval_phrase_matched",
    });
    expect(normalizeApprovalPhrase("“hola”")).toBe('"hola"');
  });

  test("validates the approval packet as a human boundary, not execution approval", () => {
    const readiness = validatePacketReadiness(packet);

    expect(readiness.ok).toBe(true);
    expect(readiness.targets).toHaveLength(2);

    const unsafe = validatePacketReadiness({
      ...packet,
      decision: {
        ...packet.decision,
        packetIsApprovalByItself: true,
      },
    });

    expect(unsafe.ok).toBe(false);
    expect(unsafe.issues).toContain("approval_packet_self_authorizes_unexpectedly");
  });

  test("builds a target plan that blocks any target already found in the fresh scan", () => {
    const plan = buildTargetPlan({
      packet,
      liveGroups: [
        {
          id: "188600000000000000",
          name: "CC · Source · Quiz · Inteligencia para descansar",
          active_count: 0,
        },
      ],
    });

    expect(plan[0]).toMatchObject({
      existsInFreshScan: true,
      liveGroupId: "188600000000000000",
      plannedOperation: "block_existing_target_group",
      subscriberAssignmentAllowed: false,
      workflowAttachmentAllowed: false,
      sendAllowed: false,
    });
    expect(plan[1]).toMatchObject({
      existsInFreshScan: false,
      plannedOperation: "create_empty_group",
    });
  });

  test("returns a dry-run ready report with zero mutations when both targets are missing", () => {
    const run = buildRunFromState({
      packet,
      liveGroups: [{ id: "188581887447401645", name: "CC · Source · Resource · Brújula" }],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(run.status).toBe("dry_run_ready_for_exact_approval");
    expect(run.ok).toBe(true);
    expect(run.freshScan).toMatchObject({
      groupsRead: 1,
      targetGroupsExistingCount: 0,
      targetGroupsMissingCount: 2,
    });
    expect(run.decision.canExecute).toBe(false);
    expect(run.safety).toMatchObject({
      mailerLiteApiCalled: true,
      mailerLiteMutationsPerformed: false,
      groupMutationsPerformed: false,
      subscriberRowsRead: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
      onboardingTouched: false,
    });
  });

  test("execute mode is blocked without the exact phrase", () => {
    const run = buildRunFromState({
      packet,
      liveGroups: [],
      execute: true,
      approvalPhrase: null,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(run.status).toBe("blocked_before_mini_launch_empty_group_create");
    expect(run.decision.blockers).toContain("blocked_missing_exact_approval_phrase");
    expect(run.safety.mailerLiteMutationsPerformed).toBe(false);
  });

  test("renders closed subscriber, workflow, send and onboarding gates", () => {
    const run = buildRunFromState({
      packet,
      liveGroups: [],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(run);

    expect(markdown).toContain("Mini-Launch Empty Group Create Runner");
    expect(markdown).toContain("No subscribers read or printed");
    expect(markdown).toContain("No workflows or automations edited");
    expect(markdown).toContain("Onboarding untouched");
  });
});
