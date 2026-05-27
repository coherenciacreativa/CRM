import { describe, expect, test } from "vitest";

import {
  buildPacketFromState,
  buildTargetPlan,
  exactApprovalPhraseFor,
  extractV2TargetGroups,
  validateTargetsAgainstBrand,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.mjs";

const designPacket = {
  status: "ready_for_human_architecture_review",
  decision: {
    recommendedOption: "option_b_light_clone_onboarding_v2_then_switch_entry",
  },
  groupWorkNeededBeforeV2Pilot: {
    missingOrProposedGroups: [
      { name: "CC · Source · IG onboarding", status: "proposed_local", layer: "Source" },
      { name: "CC · Journey · Editorial onboarding · In progress", status: "proposed_local", layer: "Journey" },
      { name: "CC · Sent · Article · Relaciones que aumentan nuestra energia", status: "proposed_local", layer: "Sent" },
      { name: "CC · Source · IG onboarding", status: "proposed_local", layer: "Source" },
    ],
  },
};

const dictionaryGroups = [
  {
    name: "CC · Source · IG onboarding",
    layer: "Source",
    status: "proposed_local",
    crmMapping: "source=ig_onboarding",
    mailerLiteGroupId: null,
  },
  {
    name: "CC · Journey · Editorial onboarding · In progress",
    layer: "Journey",
    status: "proposed_local",
    crmMapping: "journey.editorial_onboarding.status=in_progress",
    mailerLiteGroupId: null,
  },
  {
    name: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    layer: "Sent",
    status: "proposed_local",
    crmMapping: "content.sent=article_relaciones_aumentan_energia",
    mailerLiteGroupId: null,
  },
];

describe("CRM vNext MailerLite onboarding v2 empty groups packet", () => {
  test("extracts unique proposed target groups from the v2 design packet", () => {
    const targets = extractV2TargetGroups(designPacket);

    expect(targets).toHaveLength(3);
    expect(targets.map((target) => target.name)).toEqual([
      "CC · Source · IG onboarding",
      "CC · Journey · Editorial onboarding · In progress",
      "CC · Sent · Article · Relaciones que aumentan nuestra energia",
    ]);
  });

  test("requires Brand dictionary status proposed_local before approval", () => {
    const targets = extractV2TargetGroups(designPacket);
    const validated = validateTargetsAgainstBrand({
      targets,
      dictionaryGroups: [
        ...dictionaryGroups.slice(0, 2),
        {
          name: "CC · Sent · Article · Relaciones que aumentan nuestra energia",
          layer: "Sent",
          status: "candidate",
          crmMapping: "x",
          mailerLiteGroupId: null,
        },
      ],
    });

    expect(validated[0].brandValidationOk).toBe(true);
    expect(validated[2]).toMatchObject({
      brandValidationOk: false,
      brandValidationIssues: ["brand_status_not_proposed_local:candidate"],
    });
  });

  test("blocks targets that already exist in a fresh MailerLite scan", () => {
    const validated = validateTargetsAgainstBrand({
      targets: extractV2TargetGroups(designPacket),
      dictionaryGroups,
    });
    const targetPlan = buildTargetPlan({
      validatedTargets: validated,
      liveGroups: [{ id: "live-source", name: "CC · Source · IG onboarding", active_count: 0 }],
    });

    expect(targetPlan[0]).toMatchObject({
      existsInFreshScan: true,
      plannedOperation: "block_existing_target_group",
      canCreateEmptyAfterExplicitApproval: false,
      workflowUseAllowed: false,
      subscriberAssignmentAllowed: false,
    });
    expect(targetPlan[1]).toMatchObject({
      existsInFreshScan: false,
      plannedOperation: "create_empty_group_after_exact_human_approval",
      canCreateEmptyAfterExplicitApproval: true,
      workflowAttachmentAllowed: false,
    });
  });

  test("approval phrase is narrow and explicitly forbids live workflow/subscriber/sends", () => {
    const targets = extractV2TargetGroups(designPacket);
    const phrase = exactApprovalPhraseFor(targets);

    expect(phrase).toContain("estos 3 grupos vacíos de Onboarding v2");
    expect(phrase).toContain("sin subscribers");
    expect(phrase).toContain("sin workflows");
    expect(phrase).toContain("sin automatizaciones");
    expect(phrase).toContain("sin envíos");
    expect(phrase).toContain("sin tocar Onboarding v1");
    expect(phrase).toContain("CC · Source · IG onboarding");
    expect(phrase).not.toContain("audiencia");
  });

  test("builds a ready read-only packet when targets are missing and Brand-aligned", () => {
    const packet = buildPacketFromState({
      designPacket,
      dictionaryGroups,
      liveGroups: [],
      liveAutomations: [
        { id: "v1", name: "Onboarding flow", enabled: true, complete: true, broken: false },
      ],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("ready_for_exact_human_approval_to_create_empty_groups");
    expect(packet.approvalGate).toMatchObject({
      canAskAlejandroForApproval: true,
      canCreateOnlyNamedEmptyGroupsAfterExplicitApproval: true,
      canUseWorkflow: false,
      canAttachToProtectedWorkflow: false,
      canAssignSubscribers: false,
      canSendEmails: false,
    });
    expect(packet.safety).toMatchObject({
      readOnly: true,
      mailerLiteMutationsPerformed: false,
      groupMutationsPerformed: false,
      subscriberRowsRead: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
    });
  });
});
