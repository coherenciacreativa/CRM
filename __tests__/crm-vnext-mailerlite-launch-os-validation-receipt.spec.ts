import { describe, expect, test } from "vitest";

import {
  buildSafety,
  buildValidationReceipt,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-validation-receipt.mjs";

const runbook = {
  status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
  currentState: {
    liveGates: {
      openLiveGateCount: 0,
    },
    continuationGuard: {
      status: "mailerlite_launch_os_continuation_guard_ready_no_live_changes",
      oldUiWorkClosed: true,
      closedBoundaryCount: 8,
    },
    missingInputsIntake: {
      status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
      readyInputCount: 0,
      fullPrivateValuesStoredInReport: false,
    },
    missingInputsRequestBundle: {
      status: "missing_inputs_request_bundle_ready_no_live_changes",
      requestCount: 5,
      copyBlocksReady: true,
      asksApproval: false,
      createsPrivateFiles: false,
    },
    privateInputTemplatePack: {
      status: "private_input_template_pack_ready_no_live_changes",
      templateCount: 5,
      exampleFileCount: 2,
      activePathCollisionCount: 0,
      createsActivePrivateInputFiles: false,
      writesRealPrivateValues: false,
    },
    postInputOrchestrator: {
      status: "post_input_orchestrator_waiting_for_inputs_no_live_changes",
      readyCommandCount: 0,
      commandsExecuted: false,
      canAskApprovalNow: false,
    },
    taxonomyConsolidationAudit: {
      status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
      liveEvidenceGroupCount: 19,
      brandPromotionNeededCount: 14,
      crmManifestRefreshNeededCount: 14,
      canAskApprovalNow: false,
    },
    taxonomyRefreshHandoff: {
      status: "taxonomy_refresh_handoff_ready_no_live_changes",
      brandPromotionDecisionCount: 14,
      crmManifestPatchCount: 14,
      canApplyCrmManifestPatchNow: false,
    },
    taxonomyRefreshDecisionIntake: {
      status: "taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes",
      brandDecisionRowsPresent: 0,
      brandDecisionRowsNeeded: 14,
      readyForLocalPatchPreview: false,
      canApplyCrmManifestPatchNow: false,
    },
    taxonomyRefreshResponseWorkspace: {
      status: "taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes",
      brandDecisionRowCount: 14,
      crmManifestPatchRowCount: 14,
      pendingActorCount: 2,
      readyForIntake: false,
      canApplyCrmManifestPatchNow: false,
    },
    taxonomyRefreshResponseRequestBundle: {
      status: "taxonomy_refresh_response_request_bundle_ready_no_live_changes",
      requestCount: 2,
      pendingActorCount: 2,
      missingFinalResponseCount: 2,
      copyBlocksReady: true,
      asksLiveApproval: false,
      createsFinalResponseFiles: false,
      canApplyCrmManifestPatchNow: false,
    },
    miniLaunch: {
      shopifyPreviewRouteDecisionStatus: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
      shopifyPreviewRouteDecisionExplanationReady: true,
      shopifyPreviewRouteExactApprovalPhraseAvailable: false,
      shopifyPreviewRouteExactApprovalPhrasePrinted: false,
      shopifyPreviewRouteCanAskApprovalNow: false,
      shopifyPreviewRouteCanPublishNow: false,
      shopifyPreviewRouteRecommendedVisibilityTier: "unlisted_noindex_preview",
      publicAudienceScopeRecommendedDefaultNow: "keep_null_audience_no_public_send",
      publicAudienceScopeRecommendedFutureDecisionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_subscriber_send",
      publicAudienceScopeMassSubscriberSendRecommendedNow: false,
      publicSendPreflightRecommendedAudienceScopeId: "keep_null_audience_no_public_send",
      publicSendPreflightRecommendedAudienceKnownActiveCount: 0,
      publicSendPreflightRecommendedDistributionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_send",
      publicSendPreflightMassSubscriberSendRecommendedNow: false,
      publicSendPreflightExistingActiveSubscriberAudienceFutureOptionOnly: true,
      publicSendPreflightAudienceStrategyGateRequiredBeforeMassSend: true,
      pilotDistributionStrategyPacketStatus: "pilot_distribution_strategy_packet_ready_no_live_changes",
      pilotDistributionStrategyReady: true,
      pilotDistributionRecommendedStrategy: "keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send",
      pilotDistributionCurrentDefault: "keep_null_audience_no_public_send",
      pilotDistributionNextLearningLanes: ["manual_micro_cohort_next", "opt_in_testers_next"],
      pilotDistributionBroadActiveSubscriberSendRecommendedNow: false,
      pilotDistributionFinalSendPhraseAvailable: false,
      pilotDistributionCanAskFinalSendApprovalNow: false,
      pilotDistributionLiveActionAllowedNow: false,
      pilotDistributionBlockerCount: 0,
    },
  },
};

const goalAudit = {
  status: "goal_active_not_ready_for_live_operation",
  executiveSummary: {
    readyForLiveOperation: false,
    liveActionAllowedNow: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    shopifyApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
  },
};

const onboardingTrunkMap = {
  status: "onboarding_trunk_map_ready_no_live_changes",
};

const continuationGuard = {
  status: "mailerlite_launch_os_continuation_guard_ready_no_live_changes",
  executiveSummary: {
    oldUiWorkClosed: true,
    closedBoundaryCount: 8,
  },
};

const missingInputsIntake = {
  status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
  executiveSummary: {
    readyInputCount: 0,
    fullPrivateValuesStoredInReport: false,
  },
};

const missingInputsRequestBundle = {
  status: "missing_inputs_request_bundle_ready_no_live_changes",
  executiveSummary: {
    requestCount: 5,
    copyBlocksReady: true,
    asksApproval: false,
    createsPrivateFiles: false,
  },
};

const privateInputTemplatePack = {
  status: "private_input_template_pack_ready_no_live_changes",
  executiveSummary: {
    templateCount: 5,
    exampleFileCount: 2,
    activePathCollisionCount: 0,
  },
  safety: {
    createsActivePrivateInputFiles: false,
    writesRealPrivateValues: false,
  },
};

const postInputOrchestrator = {
  status: "post_input_orchestrator_waiting_for_inputs_no_live_changes",
  executiveSummary: {
    readyCommandCount: 0,
    commandsExecuted: false,
    canAskApprovalNow: false,
  },
};

const taxonomyConsolidationAudit = {
  status: "taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes",
  executiveSummary: {
    liveEvidenceGroupCount: 19,
    brandPromotionNeededCount: 14,
    crmManifestRefreshNeededCount: 14,
    canAskApprovalNow: false,
  },
};

const taxonomyRefreshHandoff = {
  status: "taxonomy_refresh_handoff_ready_no_live_changes",
  executiveSummary: {
    brandPromotionDecisionCount: 14,
    crmManifestPatchCount: 14,
    canApplyCrmManifestPatchNow: false,
  },
};

const taxonomyRefreshDecisionIntake = {
  status: "taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes",
  executiveSummary: {
    brandDecisionRowsPresent: 0,
    brandDecisionRowsNeeded: 14,
    readyForLocalPatchPreview: false,
    canApplyCrmManifestPatchNow: false,
  },
};

const taxonomyRefreshResponseWorkspace = {
  status: "taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes",
  executiveSummary: {
    brandDecisionRowCount: 14,
    crmManifestPatchRowCount: 14,
    pendingActorCount: 2,
    readyForIntake: false,
    canApplyCrmManifestPatchNow: false,
  },
};

const taxonomyRefreshResponseRequestBundle = {
  status: "taxonomy_refresh_response_request_bundle_ready_no_live_changes",
  executiveSummary: {
    requestCount: 2,
    pendingActorCount: 2,
    missingFinalResponseCount: 2,
    copyBlocksReady: true,
    asksLiveApproval: false,
    createsFinalResponseFiles: false,
    canApplyCrmManifestPatchNow: false,
  },
};

const miniLaunchShopifyPreviewRouteDecision = {
  status: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
  executiveSummary: {
    recommendedVisibilityTier: "unlisted_noindex_preview",
    decisionExplanationReady: true,
    exactApprovalPhraseAvailable: false,
    exactApprovalPhrasePrinted: false,
    canAskApprovalNow: false,
    canPublishNow: false,
  },
};

const packageJson = {
  scripts: {
    "crm:vnext:mailerlite-launch-os-operator-runbook": "node scripts/runbook.mjs",
    "crm:vnext:mailerlite-launch-os-approval-queue": "node scripts/approval-queue.mjs",
    "crm:vnext:mailerlite-launch-os-approval-intake": "node scripts/approval-intake.mjs",
    "crm:vnext:mailerlite-launch-os-blocked-gate-handoff": "node scripts/blocked-gate-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-kit": "node scripts/missing-inputs-kit.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-intake": "node scripts/missing-inputs-intake.mjs",
    "crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle": "node scripts/missing-inputs-request-bundle.mjs",
    "crm:vnext:mailerlite-launch-os-private-input-template-pack": "node scripts/private-input-template-pack.mjs",
    "crm:vnext:mailerlite-launch-os-post-input-orchestrator": "node scripts/post-input-orchestrator.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit": "node scripts/taxonomy-consolidation-audit.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-handoff": "node scripts/taxonomy-refresh-handoff.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-decision-intake": "node scripts/taxonomy-refresh-decision-intake.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace": "node scripts/taxonomy-refresh-response-workspace.mjs",
    "crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-request-bundle": "node scripts/taxonomy-refresh-response-request-bundle.mjs",
    "crm:vnext:mailerlite-launch-os-continuation-guard": "node scripts/continuation-guard.mjs",
    "crm:vnext:mailerlite-launch-os-goal-audit": "node scripts/audit.mjs",
    "crm:vnext:mailerlite-launch-os-validation-receipt": "node scripts/validation-receipt.mjs",
    "crm:vnext:mailerlite-launch-os-current-state-refresh": "node scripts/current-state-refresh.mjs",
    "crm:vnext:mailerlite-brujula-email-manual-ui-build-receipt": "node scripts/brujula-manual-ui-build-receipt.mjs",
    "crm:vnext:mailerlite-brujula-real-mailerlite-render-qa": "node scripts/brujula-real-render-qa.mjs",
    "crm:vnext:mailerlite-onboarding-trunk-map": "node scripts/trunk-map.mjs",
    "crm:vnext:mailerlite-mini-launch-department-review-response-watcher": "node scripts/response-watcher.mjs",
    "crm:vnext:mailerlite-mini-launch-backlog-board": "node scripts/backlog-board.mjs",
    "crm:vnext:mailerlite-mini-launch-local-email-asset-plan": "node scripts/local-email-asset-plan.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build-scope-packet": "node scripts/email-asset-build-scope.mjs",
    "crm:vnext:mailerlite-mini-launch-email-builder-payload-manifest": "node scripts/email-builder-payload-manifest.mjs",
    "crm:vnext:mailerlite-mini-launch-email-render-qa-packet": "node scripts/email-render-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-real-mailerlite-render-qa": "node scripts/real-mailerlite-render-qa.mjs",
    "crm:vnext:mailerlite-mini-launch-email-asset-build": "node scripts/email-asset-build.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-builder-packet": "node scripts/email-manual-ui-builder-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-execution-kit": "node scripts/email-manual-ui-execution-kit.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-build-receipt": "node scripts/email-manual-ui-build-receipt.mjs",
    "crm:vnext:mailerlite-mini-launch-email-manual-ui-draft-repair-packet": "node scripts/email-manual-ui-draft-repair-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-send-approval-packet": "node scripts/seed-send-approval-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-test-qa-packet": "node scripts/seed-test-qa-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-inbox-correction-plan": "node scripts/seed-inbox-correction-plan.mjs",
    "crm:vnext:mailerlite-mini-launch-seed-inbox-correction-preview": "node scripts/seed-inbox-correction-preview.mjs",
    "crm:vnext:mailerlite-mini-launch-shopify-preview-route-decision-packet": "node scripts/shopify-preview-route-decision.mjs",
    "crm:vnext:mailerlite-mini-launch-crm-write-policy-packet": "node scripts/crm-write-policy-packet.mjs",
    "crm:vnext:mailerlite-mini-launch-crm-write-approval-packet": "node scripts/crm-write-approval-packet.mjs",
  },
};

const sourceDigests = [
  {
    path: "/tmp/mailerlite_launch_os_operator_runbook_2026-05-28.json",
    present: true,
    chars: 100,
    sha256: "abc",
    consultedFor: "runbook",
  },
];

describe("CRM vNext MailerLite Launch OS validation receipt", () => {
  test("normalizes args and repeated commands", () => {
    const parsed = parseArgs([
      "--validation-status",
      "passed",
      "--validation-summary",
      "focused checks passed",
      "--test-files",
      "46",
      "--test-count",
      "260",
      "--command",
      "node --check a.mjs",
      "--command",
      "npm exec vitest run x.spec.ts",
      "--out",
      "/tmp/receipt.json",
      "--markdown-out",
      "/tmp/receipt.md",
    ]);

    expect(parsed.runbook).toContain("mailerlite_launch_os_operator_runbook_2026-05-28.json");
    expect(parsed.goalAudit).toContain("mailerlite_launch_os_v0_goal_audit_2026-05-28.json");
    expect(parsed.continuationGuard).toContain("mailerlite_launch_os_continuation_guard_2026-05-28.json");
    expect(parsed.missingInputsIntake).toContain("mailerlite_launch_os_missing_inputs_intake_2026-05-28.json");
    expect(parsed.missingInputsRequestBundle).toContain("mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json");
    expect(parsed.privateInputTemplatePack).toContain("mailerlite_launch_os_private_input_template_pack_2026-05-28.json");
    expect(parsed.postInputOrchestrator).toContain("mailerlite_launch_os_post_input_orchestrator_2026-05-28.json");
    expect(parsed.taxonomyConsolidationAudit).toContain("mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json");
    expect(parsed.taxonomyRefreshHandoff).toContain("mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json");
    expect(parsed.taxonomyRefreshDecisionIntake).toContain("mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json");
    expect(parsed.taxonomyRefreshResponseWorkspace).toContain("mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json");
    expect(parsed.taxonomyRefreshResponseRequestBundle).toContain("mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.json");
    expect(parsed.miniLaunchShopifyPreviewRouteDecision).toContain("mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchShopifyPreviewRouteExecutionReceipt).toContain("mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.validationStatus).toBe("passed");
    expect(parsed.testFiles).toBe(46);
    expect(parsed.testCount).toBe(260);
    expect(parsed.commands).toEqual(["node --check a.mjs", "npm exec vitest run x.spec.ts"]);
    expect(parsed.out).toBe("/tmp/receipt.json");
  });

  test("records passed validation only with closed gates and test evidence", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      continuationGuard,
      missingInputsIntake,
      missingInputsRequestBundle,
      privateInputTemplatePack,
      postInputOrchestrator,
      taxonomyConsolidationAudit,
      taxonomyRefreshHandoff,
      taxonomyRefreshDecisionIntake,
      taxonomyRefreshResponseWorkspace,
      taxonomyRefreshResponseRequestBundle,
      onboardingTrunkMap,
      miniLaunchShopifyPreviewRouteDecision,
      packageJson,
      sourceDigests,
      validationStatus: "passed",
      validationSummary: "node --check plus broad MailerLite Vitest suite passed",
      testFiles: 46,
      testCount: 260,
      commands: ["node --check scripts/a.mjs", "npm exec vitest run __tests__/x.spec.ts"],
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(receipt.status).toBe("mailerlite_launch_os_validation_receipt_ready_no_live_changes");
    expect(receipt.validationStatus).toBe("passed");
    expect(receipt.evidence.liveGatesClosed).toBe(true);
    expect(receipt.evidence.packageRequiredScriptsPresent).toBe(true);
    expect(receipt.evidence.continuationGuardStatus).toBe("mailerlite_launch_os_continuation_guard_ready_no_live_changes");
    expect(receipt.evidence.continuationGuardOldUiWorkClosed).toBe(true);
    expect(receipt.evidence.missingInputsIntakeStatus).toBe("missing_inputs_intake_waiting_for_inputs_no_live_changes");
    expect(receipt.evidence.missingInputsIntakeReadyInputCount).toBe(0);
    expect(receipt.evidence.missingInputsIntakeFullPrivateValuesStored).toBe(false);
    expect(receipt.evidence.missingInputsRequestBundleStatus).toBe("missing_inputs_request_bundle_ready_no_live_changes");
    expect(receipt.evidence.missingInputsRequestBundleRequestCount).toBe(5);
    expect(receipt.evidence.missingInputsRequestBundleCopyBlocksReady).toBe(true);
    expect(receipt.evidence.missingInputsRequestBundleAsksApproval).toBe(false);
    expect(receipt.evidence.missingInputsRequestBundleCreatesPrivateFiles).toBe(false);
    expect(receipt.evidence.privateInputTemplatePackStatus).toBe("private_input_template_pack_ready_no_live_changes");
    expect(receipt.evidence.privateInputTemplatePackExampleFileCount).toBe(2);
    expect(receipt.evidence.privateInputTemplatePackActivePathCollisionCount).toBe(0);
    expect(receipt.evidence.privateInputTemplatePackCreatesActivePrivateInputFiles).toBe(false);
    expect(receipt.evidence.privateInputTemplatePackWritesRealPrivateValues).toBe(false);
    expect(receipt.evidence.postInputOrchestratorStatus).toBe("post_input_orchestrator_waiting_for_inputs_no_live_changes");
    expect(receipt.evidence.postInputOrchestratorReadyCommandCount).toBe(0);
    expect(receipt.evidence.postInputOrchestratorCommandsExecuted).toBe(false);
    expect(receipt.evidence.postInputOrchestratorCanAskApprovalNow).toBe(false);
    expect(receipt.evidence.taxonomyConsolidationAuditStatus).toBe("taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes");
    expect(receipt.evidence.taxonomyConsolidationLiveEvidenceGroupCount).toBe(19);
    expect(receipt.evidence.taxonomyConsolidationBrandPromotionNeededCount).toBe(14);
    expect(receipt.evidence.taxonomyConsolidationCrmManifestRefreshNeededCount).toBe(14);
    expect(receipt.evidence.taxonomyConsolidationCanAskApprovalNow).toBe(false);
    expect(receipt.evidence.taxonomyRefreshHandoffStatus).toBe("taxonomy_refresh_handoff_ready_no_live_changes");
    expect(receipt.evidence.taxonomyRefreshBrandPromotionDecisionCount).toBe(14);
    expect(receipt.evidence.taxonomyRefreshCrmManifestPatchCount).toBe(14);
    expect(receipt.evidence.taxonomyRefreshCanApplyCrmManifestPatchNow).toBe(false);
    expect(receipt.evidence.taxonomyRefreshDecisionIntakeStatus).toBe("taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes");
    expect(receipt.evidence.taxonomyRefreshDecisionBrandRowsPresent).toBe(0);
    expect(receipt.evidence.taxonomyRefreshDecisionBrandRowsNeeded).toBe(14);
    expect(receipt.evidence.taxonomyRefreshDecisionReadyForLocalPatchPreview).toBe(false);
    expect(receipt.evidence.taxonomyRefreshResponseWorkspaceStatus).toBe("taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes");
    expect(receipt.evidence.taxonomyRefreshResponsePendingActorCount).toBe(2);
    expect(receipt.evidence.taxonomyRefreshResponseReadyForIntake).toBe(false);
    expect(receipt.evidence.taxonomyRefreshResponseRequestBundleStatus).toBe("taxonomy_refresh_response_request_bundle_ready_no_live_changes");
    expect(receipt.evidence.taxonomyRefreshResponseRequestCount).toBe(2);
    expect(receipt.evidence.taxonomyRefreshResponseRequestPendingActorCount).toBe(2);
    expect(receipt.evidence.taxonomyRefreshResponseRequestMissingFinalResponseCount).toBe(2);
    expect(receipt.evidence.taxonomyRefreshResponseRequestCopyBlocksReady).toBe(true);
    expect(receipt.evidence.taxonomyRefreshResponseRequestAsksLiveApproval).toBe(false);
    expect(receipt.evidence.taxonomyRefreshResponseRequestCreatesFinalResponseFiles).toBe(false);
    expect(receipt.evidence.shopifyPreviewRouteDecisionStatus).toBe("shopify_preview_route_decision_ready_for_human_explanation_no_live_changes");
    expect(receipt.evidence.shopifyPreviewRouteDecisionExplanationReady).toBe(true);
    expect(receipt.evidence.shopifyPreviewRouteExactApprovalPhraseAvailable).toBe(false);
    expect(receipt.evidence.shopifyPreviewRouteExactApprovalPhrasePrinted).toBe(false);
    expect(receipt.evidence.shopifyPreviewRouteCanAskApprovalNow).toBe(false);
    expect(receipt.evidence.shopifyPreviewRouteCanPublishNow).toBe(false);
    expect(receipt.evidence.publicAudienceScopeRecommendedDefaultNow).toBe("keep_null_audience_no_public_send");
    expect(receipt.evidence.publicAudienceScopeMassSubscriberSendRecommendedNow).toBe(false);
    expect(receipt.evidence.publicSendPreflightRecommendedAudienceScopeId).toBe("keep_null_audience_no_public_send");
    expect(receipt.evidence.publicSendPreflightRecommendedAudienceKnownActiveCount).toBe(0);
    expect(receipt.evidence.publicSendPreflightMassSubscriberSendRecommendedNow).toBe(false);
    expect(receipt.evidence.publicSendPreflightExistingActiveSubscriberAudienceFutureOptionOnly).toBe(true);
    expect(receipt.evidence.publicSendPreflightAudienceStrategyGateRequiredBeforeMassSend).toBe(true);
    expect(receipt.evidence.pilotDistributionStrategyPacketStatus).toBe(
      "pilot_distribution_strategy_packet_ready_no_live_changes",
    );
    expect(receipt.evidence.pilotDistributionRecommendedStrategy).toBe(
      "keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send",
    );
    expect(receipt.evidence.pilotDistributionCurrentDefault).toBe("keep_null_audience_no_public_send");
    expect(receipt.evidence.pilotDistributionNextLearningLanes).toEqual([
      "manual_micro_cohort_next",
      "opt_in_testers_next",
    ]);
    expect(receipt.evidence.pilotDistributionBroadActiveSubscriberSendRecommendedNow).toBe(false);
    expect(receipt.evidence.pilotDistributionCanAskFinalSendApprovalNow).toBe(false);
    expect(receipt.evidence.pilotDistributionLiveActionAllowedNow).toBe(false);
    expect(receipt.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("does not mark passed when summary or test counts are missing", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      continuationGuard,
      missingInputsIntake,
      missingInputsRequestBundle,
      privateInputTemplatePack,
      postInputOrchestrator,
      taxonomyConsolidationAudit,
      onboardingTrunkMap,
      packageJson,
      validationStatus: "passed",
      validationSummary: null,
      testFiles: null,
      testCount: 260,
    });

    expect(receipt.status).toBe("mailerlite_launch_os_validation_receipt_needs_validation_no_live_changes");
    expect(receipt.validationStatus).toBe("needs_validation");
  });

  test("keeps safety closed and renders hard boundary", () => {
    const receipt = buildValidationReceipt({
      runbook,
      goalAudit,
      continuationGuard,
      missingInputsIntake,
      onboardingTrunkMap,
      miniLaunchShopifyPreviewRouteDecision,
      packageJson,
      sourceDigests,
      validationStatus: "passed",
      validationSummary: "tests passed",
      testFiles: 46,
      testCount: 260,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(receipt);

    expect(buildSafety()).toMatchObject({
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      subscribersRead: false,
    });
    expect(markdown).toContain("Validation Receipt");
    expect(markdown).toContain("Continuation guard");
    expect(markdown).toContain("Missing-inputs intake");
    expect(markdown).toContain("Missing-inputs request bundle");
    expect(markdown).toContain("Taxonomy consolidation audit");
    expect(markdown).toContain("Taxonomy decision intake");
    expect(markdown).toContain("Taxonomy response workspace");
    expect(markdown).toContain("Taxonomy response request bundle");
    expect(markdown).toContain("Shopify preview-route decision");
    expect(markdown).toContain("No live actions");
    expect(markdown).toContain("This receipt cannot approve live action");
  });
});
