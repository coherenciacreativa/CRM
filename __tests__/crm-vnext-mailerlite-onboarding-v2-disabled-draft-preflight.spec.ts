import { describe, expect, test } from "vitest";

import {
  buildPreflightFromState,
  evaluateRequiredGroups,
  evaluateV1Workflow,
  evaluateV2WorkflowBoundary,
  extractRequiredV2GroupNames,
} from "../scripts/crm-vnext-mailerlite-onboarding-v2-disabled-draft-preflight.mjs";

const boundaryPacket = {
  ok: true,
  status: "onboarding_v2_disabled_draft_build_boundary_packet_ready_local_only",
  localEvidenceSummary: {
    v2Groups: {
      expectedTargetCount: 3,
    },
  },
};

const designPacket = {
  groupWorkNeededBeforeV2Pilot: {
    missingOrProposedGroups: [
      { name: "CC · Source · IG onboarding" },
      { name: "CC · Journey · Editorial onboarding · In progress" },
      { name: "CC · Journey · Editorial onboarding · Complete" },
    ],
  },
};

const mappingPacket = {
  status: "onboarding_v2_draft_content_mapping_hardening_ready_local_only",
};

const emptyGroupsReceipt = {
  status: "executed_onboarding_v2_empty_group_creation",
  createdGroups: [
    { id: "g-source", name: "CC · Source · IG onboarding" },
    { id: "g-progress", name: "CC · Journey · Editorial onboarding · In progress" },
    { id: "g-complete", name: "CC · Journey · Editorial onboarding · Complete" },
  ],
};

const liveGroups = [
  { id: "g-source", name: "CC · Source · IG onboarding", active_count: 0 },
  { id: "g-progress", name: "CC · Journey · Editorial onboarding · In progress", active_count: 0 },
  { id: "g-complete", name: "CC · Journey · Editorial onboarding · Complete", active_count: 0 },
];

const liveWorkflows = [
  { id: "w-v1", name: "Onboarding flow", enabled: true, complete: true, broken: false },
];

describe("CRM vNext MailerLite onboarding v2 disabled draft preflight", () => {
  test("extracts required v2 groups from the executed empty-groups receipt first", () => {
    const names = extractRequiredV2GroupNames({ designPacket, mappingPacket, emptyGroupsReceipt });

    expect(names).toEqual([
      "CC · Source · IG onboarding",
      "CC · Journey · Editorial onboarding · In progress",
      "CC · Journey · Editorial onboarding · Complete",
    ]);
  });

  test("verifies productive v1 remains enabled, complete and not broken", () => {
    const result = evaluateV1Workflow({ workflows: liveWorkflows });

    expect(result.ok).toBe(true);
    expect(result.workflow).toMatchObject({
      name: "Onboarding flow",
      enabled: true,
      complete: true,
      broken: false,
    });
  });

  test("blocks when a required v2 group is no longer empty", () => {
    const result = evaluateRequiredGroups({
      requiredGroupNames: extractRequiredV2GroupNames({ designPacket, mappingPacket, emptyGroupsReceipt }),
      groups: [
        liveGroups[0],
        { ...liveGroups[1], active_count: 1 },
        liveGroups[2],
      ],
      expectedTargetCount: 3,
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("required_v2_group_active_count_not_0:CC · Journey · Editorial onboarding · In progress:1");
  });

  test("blocks any exact v2 workflow boundary conflict", () => {
    const result = evaluateV2WorkflowBoundary({
      workflows: [
        ...liveWorkflows,
        { id: "w-v2", name: "Onboarding editorial v2 - DRAFT", enabled: false, complete: false, broken: false },
      ],
    });

    expect(result.ok).toBe(false);
    expect(result.blockers).toContain("existing_v2_workflow_with_target_name_requires_human_strategy");
  });

  test("builds a green read-only receipt when v1, groups and workflow boundary are safe", () => {
    const preflight = buildPreflightFromState({
      boundaryPacket,
      designPacket,
      mappingPacket,
      emptyGroupsReceipt,
      groups: liveGroups,
      workflows: liveWorkflows,
      generatedAt: "2026-06-03T00:00:00.000Z",
    });

    expect(preflight.status).toBe("onboarding_v2_disabled_draft_build_fresh_preflight_green");
    expect(preflight.approvalPosture).toMatchObject({
      disabledDraftBuildApprovalReadyNow: true,
      workflowMutationAuthorizedNow: false,
      seedTestAuthorizedNow: false,
      publicAudienceSendAuthorized: false,
      liveActionAllowedNow: false,
    });
    expect(preflight.safety).toMatchObject({
      readOnly: true,
      mailerLiteMutationsPerformed: false,
      groupMutationsPerformed: false,
      workflowMutationsPerformed: false,
      subscriberRowsRead: false,
      sendsPerformed: false,
      tokensPrinted: false,
      rawIdsPrinted: false,
    });
  });
});
