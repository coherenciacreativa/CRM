import { describe, expect, test } from "vitest";

import {
  buildPacketFromDryRun,
  renderMarkdown,
  safeTargetsFromDryRun,
  validateDryRunReadiness,
} from "../scripts/crm-vnext-mailerlite-mini-launch-empty-group-creation-packet.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const readyDryRun = {
  ok: true,
  status: "mini_launch_group_dry_run_ready_for_future_empty_group_decision",
  generatedAt: "2026-05-28T00:00:00.000Z",
  launch,
  summary: {
    liveGroupsRead: 75,
    plannedGroupCount: 2,
    missingBrandCandidateCount: 0,
    brandStatusBlockedCount: 0,
    groupsAlreadyLiveCount: 0,
    safeEmptyCreateTargetCount: 2,
  },
  readiness: {
    canCreateNamedEmptyGroupsAfterExplicitApproval: true,
    canAssignSubscribersNow: false,
    canSendNow: false,
    canAttachWorkflowNow: false,
  },
  plannedGroups: [
    {
      name: "CC · Source · Quiz · Inteligencia para descansar",
      layer: "Source",
      object: "quiz",
      detail: "Inteligencia para descansar",
      brandStatus: "proposed_local",
      existsInMailerLite: false,
      liveGroupId: null,
      emptyGroupCreationStatus: "safe_to_create_empty_after_explicit_approval",
      allowedOperation: "create_named_empty_group_only_after_explicit_approval",
    },
    {
      name: "CC · Delivered · Quiz result · Inteligencia para descansar",
      layer: "Delivered",
      object: "quiz",
      detail: "Inteligencia para descansar",
      brandStatus: "proposed_local",
      existsInMailerLite: false,
      liveGroupId: null,
      emptyGroupCreationStatus: "safe_to_create_empty_after_explicit_approval",
      allowedOperation: "create_named_empty_group_only_after_explicit_approval",
    },
  ],
  futureApprovalPhrase:
    "Apruebo crear únicamente estos 2 grupos vacíos del mini-lanzamiento en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar onboarding y con re-scan fresco previo: CC · Source · Quiz · Inteligencia para descansar; CC · Delivered · Quiz result · Inteligencia para descansar.",
  approvalGate: {
    canCreateGroups: false,
    canCreateNamedEmptyGroupsAfterExplicitApproval: true,
    canUseWorkflow: false,
    canAttachToProtectedWorkflow: false,
    canAssignSubscribers: false,
    canSendEmail: false,
  },
  safety: {
    readOnly: true,
    mailerLiteGroupsRead: 75,
    mailerLiteSubscribersRead: false,
    mailerLiteMutationsPerformed: false,
    mailerLiteGroupsCreated: false,
    workflowMutationsPerformed: false,
    sendsPerformed: false,
  },
};

describe("CRM vNext MailerLite mini-launch empty group creation packet", () => {
  test("extracts only create-empty targets from a ready dry-run", () => {
    const targets = safeTargetsFromDryRun(readyDryRun);

    expect(targets).toHaveLength(2);
    expect(targets[0]).toMatchObject({
      name: "CC · Source · Quiz · Inteligencia para descansar",
      plannedOperation: "create_named_empty_group_after_exact_human_approval",
      subscriberAssignmentAllowed: false,
      workflowAttachmentAllowed: false,
      sendAllowed: false,
    });
  });

  test("requires the dry-run status and gates to remain narrowly create-empty only", () => {
    const readiness = validateDryRunReadiness(readyDryRun);

    expect(readiness.ok).toBe(true);
    expect(readiness.issues).toEqual([]);

    const unsafe = validateDryRunReadiness({
      ...readyDryRun,
      approvalGate: {
        ...readyDryRun.approvalGate,
        canAssignSubscribers: true,
      },
    });

    expect(unsafe.ok).toBe(false);
    expect(unsafe.issues).toContain("subscriber_assignment_gate_unexpectedly_open");
  });

  test("blocks candidate-status dry-runs before asking Alejandro for approval", () => {
    const packet = buildPacketFromDryRun({
      dryRun: {
        ...readyDryRun,
        status: "blocked_until_brand_promotes_or_rejects_candidates",
        readiness: {
          ...readyDryRun.readiness,
          canCreateNamedEmptyGroupsAfterExplicitApproval: false,
        },
        futureApprovalPhrase: null,
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("blocked_before_exact_empty_group_approval");
    expect(packet.decision.canAskAlejandroForApproval).toBe(false);
    expect(packet.blockers).toContain("group_dry_run_status_not_ready:blocked_until_brand_promotes_or_rejects_candidates");
    expect(packet.blockers).toContain("missing_future_approval_phrase");
  });

  test("builds an approval packet without authorizing live execution", () => {
    const packet = buildPacketFromDryRun({
      dryRun: readyDryRun,
      dryRunPath: "/tmp/group-dry-run.json",
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.status).toBe("ready_for_exact_human_approval_to_create_mini_launch_empty_groups");
    expect(packet.decision).toMatchObject({
      canAskAlejandroForApproval: true,
      packetIsApprovalByItself: false,
      requiresFreshRerunBeforeExecution: true,
    });
    expect(packet.decision.exactApprovalPhrase).toContain("estos 2 grupos vacíos del mini-lanzamiento");
    expect(packet.approvalBoundary.stillClosedEvenAfterThisApproval).toContain("subscriber_reads_or_assignment");
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalledByThisPacket: false,
      mailerLiteMutationsPerformed: false,
      mailerLiteGroupsCreated: false,
      sendsPerformed: false,
    });
  });

  test("builds a reference packet when target groups already exist", () => {
    const packet = buildPacketFromDryRun({
      dryRun: {
        ...readyDryRun,
        status: "mini_launch_groups_already_exist_no_create_needed",
        summary: {
          ...readyDryRun.summary,
          liveGroupsRead: 77,
          groupsAlreadyLiveCount: 2,
          safeEmptyCreateTargetCount: 0,
        },
        readiness: {
          ...readyDryRun.readiness,
          canCreateNamedEmptyGroupsAfterExplicitApproval: false,
        },
        plannedGroups: readyDryRun.plannedGroups.map((group, index) => ({
          ...group,
          existsInMailerLite: true,
          liveGroupId: `18860000000000000${index}`,
          emptyGroupCreationStatus: "exists_in_mailerlite",
        })),
        futureApprovalPhrase: null,
        approvalGate: {
          ...readyDryRun.approvalGate,
          canCreateNamedEmptyGroupsAfterExplicitApproval: false,
        },
      },
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("reference_only_empty_group_creation_already_completed");
    expect(packet.decision.canAskAlejandroForApproval).toBe(false);
    expect(packet.decision.exactApprovalPhrase).toBeNull();
    expect(packet.targetGroups).toHaveLength(2);
    expect(packet.targetGroups[0]).toMatchObject({
      plannedOperation: "no_empty_group_creation_needed_already_exists",
      allowedOperation: "already_exists_no_create_needed",
      existsInMailerLite: true,
    });
    expect(packet.blockers).toEqual([]);
  });

  test("renders the human boundary and closed gates", () => {
    const packet = buildPacketFromDryRun({
      dryRun: readyDryRun,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Empty Group Creation Approval Packet");
    expect(markdown).toContain("Packet is approval by itself: false");
    expect(markdown).toContain("No MailerLite API call by this packet");
    expect(markdown).toContain("No groups created, renamed, deleted, or assigned");
  });
});
