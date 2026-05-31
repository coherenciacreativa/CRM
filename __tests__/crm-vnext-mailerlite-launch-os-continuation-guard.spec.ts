import { describe, expect, test } from "vitest";

import {
  buildActiveInputs,
  buildClosedBoundaries,
  buildContinuationGuard,
  buildRecycledActionBlocks,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-continuation-guard.mjs";

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  currentState: {
    liveGates: {
      openLiveGateCount: 0,
    },
    approvalQueue: {
      openLiveMutationGateCount: 0,
    },
    miniLaunch: {
      emailManualUiBuildReceiptStatus: "manual_ui_build_receipt_executed_drafts_created_no_sends",
      emailManualUiDraftVisibleCount: 4,
      emailManualUiBuildClosed: true,
      emailManualUiSeedSendStillClosed: true,
      emailManualUiDraftRepairPacketStatus: "mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed",
      emailManualUiDraftRepairCanAskApproval: false,
      emailManualUiDraftRepairTargetCount: 0,
      emailManualUiDraftRepairMissingFragmentCount: 0,
      seedTestExecutionReceiptStatus: "seed_test_execution_completed_verified_by_gmail_no_public_send",
      seedTestExecutionCompleted: true,
      seedTestExecutionObservedMessageCount: 4,
      seedTestExecutionExpectedMessageCount: 4,
      seedTestExecutionPublicSendPerformed: false,
      seedTestExecutionAudienceSendPerformed: false,
      seedTestExecutionOutboxCount: 0,
      emptyGroupCreateDryRunStatus: "dry_run_no_create_needed_targets_already_exist",
      emptyGroupCreateDryRunTargetExistingCount: 2,
      emptyGroupCreateDryRunTargetMissingCount: 0,
      emptyGroupCreateDryRunCreatedCount: 0,
      emptyGroupCreateDryRunCanExecute: false,
      shopifyLocalBuildReceiptStatus: "shopify_local_build_receipt_executed_files_created_no_live_changes",
      shopifyLocalBuildFileCount: 5,
      shopifyLocalBuildClosed: true,
      shopifyLocalBuildNoPublish: true,
      shopifyLocalBuildNoApi: true,
      shopifyLocalBuildNoRealForms: true,
      departmentReviewStatus: "department_reviews_reconciled_ready_for_next_no_live_moves",
      pendingDepartments: [],
      acceptedFinalDepartments: ["brand", "web_design", "crm"],
      responseWatcherMissingFinalCount: 0,
      responseWatcherFinalFilePresentCount: 3,
    },
    brujulaPilot: {
      manualUiBuildReceiptStatus: "brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends",
      manualUiBuildClosed: true,
      manualUiCampaignId: "188677585118430654",
      manualUiOutboxCount: 0,
      realMailerLiteRenderQaStatus: "brujula_email1_real_mailerlite_render_qa_green_no_live_changes",
      realMailerLiteRenderReady: true,
      realMailerLiteRenderExactContent: true,
      realMailerLiteRenderSafetyClosed: true,
      realMailerLiteRenderBlockerCount: 0,
    },
    onboarding: {
      v2EmptyGroupsLifecycleStatus: "executed_and_verified_all_targets_exist_no_live_followup",
      v2EmptyGroupsExecutedCount: 12,
      v2EmptyGroupsPostExecutionAllExist: true,
      v2EmptyGroupsExistingTargetCount: 12,
      v2EmptyGroupsTargetCount: 12,
      v2EmptyGroupsCanAskApproval: false,
    },
    missingInputsKit: {
      status: "missing_inputs_kit_ready_no_live_changes",
      nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
      inputIds: [
        "exact_seed_recipient",
        "real_observed_events_file",
      ],
    },
  },
};

const goalAudit = {
  status: "goal_active_not_ready_for_live_operation",
  executiveSummary: {
    effectiveValidationStatus: "passed",
  },
};

const missingInputsKit = {
  status: "missing_inputs_kit_ready_no_live_changes",
  executiveSummary: {
    inputCount: 7,
    openLiveMutationGateCount: 0,
    nextSafeAction: "collect_missing_inputs_without_approval_or_execution",
  },
  inputRequests: [
    {
      id: "exact_seed_recipient",
      gateId: "mini_launch_seed_send",
      label: "Exact private seed recipient",
      privacy: "private",
      captureMode: "private_seed_email_file_preferred",
      sampleOnly: false,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_send_or_execution",
    },
    {
      id: "real_observed_events_file",
      gateId: "crm_signal_writes",
      label: "Real observed events file",
      privacy: "private_or_internal_evidence",
      captureMode: "json_file_with_real_observed_events",
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "exact_people",
      gateId: "crm_signal_writes",
      label: "Exact people or CRM identities",
      privacy: "private_or_internal_evidence",
      captureMode: "identity_fields_inside_observed_events_file",
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "writable_event_screen",
      gateId: "crm_signal_writes",
      label: "Writable-event screen",
      privacy: "derived_no_live_report",
      captureMode: "rerun_crm_write_approval_packet",
      sampleOnly: false,
      mustReplaceBeforeUse: false,
      approvalEffect: "does_not_approve_crm_writes",
    },
    {
      id: "fact_store_market_review",
      gateId: "crm_signal_writes",
      label: "Aggregate market review and exact facts",
      privacy: "internal_review",
      captureMode: "reviewed_aggregate_fact_list",
      sampleOnly: true,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_fact_store_write",
    },
    {
      id: "final_public_links",
      gateId: "mini_launch_seed_inbox_correction",
      label: "Final approved public links",
      privacy: "private_or_internal_evidence",
      captureMode: "correction_inputs_json.finalPublicLinks",
      sampleOnly: false,
      mustReplaceBeforeUse: true,
      approvalEffect: "does_not_approve_mailerlite_ui_edit_test_send_or_public_send",
    },
    {
      id: "subscription_reason_policy",
      gateId: "mini_launch_seed_inbox_correction",
      label: "Footer/subscription-reason policy",
      privacy: "internal_decision",
      captureMode: "correction_inputs_json.subscriptionReasonPolicy",
      sampleOnly: false,
      mustReplaceBeforeUse: false,
      approvalEffect: "does_not_approve_mailerlite_ui_edit_test_send_or_public_send",
    },
  ],
};

const validationReceipt = {
  validationStatus: "passed",
};

describe("CRM vNext MailerLite Launch OS continuation guard", () => {
  test("normalizes default args and output paths", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/continuation-guard.json",
      "--markdown-out",
      "/tmp/continuation-guard.md",
    ]);

    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-28.json");
    expect(parsed.goalAudit).toContain("mailerlite_launch_os_v0_goal_audit_2026-05-28.json");
    expect(parsed.missingInputsKit).toContain("mailerlite_launch_os_missing_inputs_kit_2026-05-28.json");
    expect(parsed.validationReceipt).toContain("mailerlite_launch_os_validation_receipt_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/continuation-guard.json");
    expect(parsed.markdownOut).toBe("/tmp/continuation-guard.md");
  });

  test("records closed hitos and blocks recycled UI work", () => {
    const boundaries = buildClosedBoundaries({ runbook });
    const byId = Object.fromEntries(boundaries.map((boundary) => [boundary.id, boundary]));

    expect(boundaries.every((boundary) => boundary.closed)).toBe(true);
    expect(byId.mini_launch_manual_ui_draft_build.evidence).toContain("emailManualUiDraftVisibleCount=4");
    expect(byId.mini_launch_manual_ui_draft_repair.evidence).toContain("emailManualUiDraftRepairTargetCount=0");
    expect(byId.brujula_real_mailerlite_render_qa.evidence).toContain("realMailerLiteRenderBlockerCount=0");
    expect(byId.mini_launch_empty_group_creation.evidence).toContain("emptyGroupCreateDryRunCreatedCount=0");
    expect(byId.onboarding_v2_empty_group_creation.evidence).toContain("v2EmptyGroupsExistingTargetCount=12");

    const blocks = buildRecycledActionBlocks();
    expect(blocks.map((block) => block.id)).toContain("do_not_reopen_closed_mailerlite_ui_drafts");
    expect(blocks.find((block) => block.id === "do_not_request_seed_send_approval_without_seed_recipient")?.status).toBe("blocked_until_exact_seed_recipient_exists");
    expect(blocks.find((block) => block.id === "do_not_request_mailerlite_ui_correction_without_links_policy_fresh_qa")?.appliesTo).toContain("final_public_links");
  });

  test("surfaces active inputs without treating them as approval", () => {
    const inputs = buildActiveInputs({ missingInputsKit, runbook });

    expect(inputs.map((input) => input.id)).toEqual([
      "exact_seed_recipient",
      "real_observed_events_file",
      "exact_people",
      "writable_event_screen",
      "fact_store_market_review",
      "final_public_links",
      "subscription_reason_policy",
    ]);
    expect(inputs.find((input) => input.id === "exact_seed_recipient")?.approvalEffect).toBe("does_not_approve_send_or_execution");
    expect(inputs.find((input) => input.id === "fact_store_market_review")?.approvalEffect).toBe("does_not_approve_fact_store_write");
    expect(inputs.find((input) => input.id === "final_public_links")?.approvalEffect).toBe("does_not_approve_mailerlite_ui_edit_test_send_or_public_send");
  });

  test("builds ready guard with no live actions and markdown summary", () => {
    const guard = buildContinuationGuard({
      runbook,
      goalAudit,
      missingInputsKit,
      validationReceipt,
      sourceDigests: [
        {
          path: "/tmp/mailerlite_launch_os_operator_runbook_2026-05-28.json",
          present: true,
          chars: 100,
          sha256: "abc",
          consultedFor: "runbook",
        },
      ],
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(guard);

    expect(guard.status).toBe("mailerlite_launch_os_continuation_guard_ready_no_live_changes");
    expect(guard.executiveSummary.oldUiWorkClosed).toBe(true);
    expect(guard.executiveSummary.closedBoundaryCount).toBe(9);
    expect(guard.executiveSummary.activeInputCount).toBe(7);
    expect(guard.executiveSummary.uiWorkAction).toBe("do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch");
    expect(guard.safety).toMatchObject({
      localOnly: true,
      uiOpened: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
    expect(buildSafety().browserOpened).toBe(false);
    expect(markdown).toContain("Continuation Guard");
    expect(markdown).toContain("Do Not Recycle");
    expect(markdown).toContain("do_not_reopen_closed_mailerlite_ui_drafts");
    expect(markdown).toContain("do_not_request_mailerlite_ui_correction_without_links_policy_fresh_qa");
  });
});
