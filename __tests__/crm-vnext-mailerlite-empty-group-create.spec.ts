import { describe, expect, test } from "vitest";

import {
  approvalStatusFor,
  buildTargetPlan,
  expectedApprovalPhraseFor,
  normalizeApprovalPhrase,
  validatePlannerReadiness,
} from "../scripts/crm-vnext-mailerlite-empty-group-create.mjs";

const firstSet = [
  {
    name: "CC · Source · Resource · Brújula",
    emptyGroupCreationStatus: "safe_to_create_empty_after_approval",
    allowedOperation: "create_named_empty_group_only_after_explicit_approval",
    workflowAttachmentAllowed: false,
  },
  {
    name: "CC · Delivered · Guide · Brújula",
    emptyGroupCreationStatus: "safe_to_create_empty_after_approval",
    allowedOperation: "create_named_empty_group_only_after_explicit_approval",
    workflowAttachmentAllowed: false,
  },
];

describe("CRM vNext MailerLite empty group create runner", () => {
  test("keeps dry-run independent from live approval", () => {
    const expectedPhrase = expectedApprovalPhraseFor(firstSet);
    const approval = approvalStatusFor({
      execute: false,
      providedPhrase: null,
      expectedPhrase,
    });

    expect(approval).toMatchObject({
      ok: true,
      status: "dry_run_no_live_approval_required",
      provided: false,
    });
  });

  test("blocks execute without the exact approval phrase", () => {
    const expectedPhrase = expectedApprovalPhraseFor(firstSet);

    expect(approvalStatusFor({
      execute: true,
      providedPhrase: "",
      expectedPhrase,
    })).toMatchObject({
      ok: false,
      status: "blocked_missing_explicit_approval_phrase",
    });

    expect(approvalStatusFor({
      execute: true,
      providedPhrase: "adelante",
      expectedPhrase,
    })).toMatchObject({
      ok: false,
      status: "blocked_approval_phrase_mismatch",
    });
  });

  test("accepts the exact normalized approval phrase for execute", () => {
    const expectedPhrase = expectedApprovalPhraseFor(firstSet);
    const spacedPhrase = `  ${expectedPhrase.replace(/\s+/g, "   ")}  `;

    expect(normalizeApprovalPhrase(spacedPhrase)).toBe(normalizeApprovalPhrase(expectedPhrase));
    expect(approvalStatusFor({
      execute: true,
      providedPhrase: spacedPhrase,
      expectedPhrase,
    })).toMatchObject({
      ok: true,
      status: "explicit_approval_phrase_matched",
    });
  });

  test("blocks target groups that already exist in the fresh scan", () => {
    const targets = buildTargetPlan({
      firstSet,
      liveGroups: [
        {
          id: "group-1",
          name: "CC · Source · Resource · Brújula",
          active_count: 0,
        },
      ],
    });

    expect(targets[0]).toMatchObject({
      existsInFreshScan: true,
      plannedOperation: "block_existing_target_group",
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
    });
    expect(targets[1]).toMatchObject({
      existsInFreshScan: false,
      plannedOperation: "create_empty_group",
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
    });
  });

  test("requires planner gates to stay narrowly create-empty only", () => {
    const readiness = validatePlannerReadiness({
      ok: true,
      status: "ready_for_human_review",
      brandCanon: { alignmentOk: true },
      approvalGate: {
        canCreateNamedEmptyGroupsAfterExplicitApproval: true,
        canUseWorkflow: false,
        canAttachToProtectedWorkflow: false,
      },
      firstSafeEmptyGroupCreateSet: firstSet,
    });

    expect(readiness.ok).toBe(true);
    expect(readiness.issues).toEqual([]);

    const unsafe = validatePlannerReadiness({
      ok: true,
      status: "ready_for_human_review",
      brandCanon: { alignmentOk: true },
      approvalGate: {
        canCreateNamedEmptyGroupsAfterExplicitApproval: true,
        canUseWorkflow: true,
        canAttachToProtectedWorkflow: false,
      },
      firstSafeEmptyGroupCreateSet: firstSet,
    });

    expect(unsafe.ok).toBe(false);
    expect(unsafe.issues).toContain("workflow_use_gate_unexpectedly_open");
  });
});
