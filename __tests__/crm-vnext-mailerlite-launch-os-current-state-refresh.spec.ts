import { describe, expect, test } from "vitest";
import {
  assertLocalOnlyCommandPlan,
  buildCurrentStateRefreshPlan,
  buildRefreshReceipt,
  buildReportCommands,
  buildReportPaths,
  buildSafety,
  formatCommand,
  parseArgs,
  parseVitestCounts,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-current-state-refresh.mjs";

const reportsDir = "/tmp/mantis-reports";

describe("CRM vNext MailerLite Launch OS current-state refresh", () => {
  test("normalizes args and current report paths", () => {
    const options = parseArgs([
      "--date",
      "2026-05-31",
      "--reports-dir",
      reportsDir,
      "--out",
      "/tmp/refresh.json",
    ]);

    expect(options.date).toBe("2026-05-31");
    expect(options.reportsDir).toBe(reportsDir);
    expect(options.out).toBe("/tmp/refresh.json");
    expect(options.markdownOut).toBe("/tmp/refresh.md");
  });

  test("builds a local-only command plan for current-state report regeneration", () => {
    const plan = buildCurrentStateRefreshPlan({
      date: "2026-05-31",
      reportsDir,
    });
    const commands = [...plan.validationCommands, ...plan.reportCommands].map(formatCommand).join("\n");

    expect(plan.paths.operatorRunbook).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_operator_runbook_current_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchCrmWriteApprovalPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_crm_write_approval_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchAssetManifest).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchShopifyPublicUrlGate).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchShopifyPreviewRouteDecision).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchShopifyPreviewRouteDecisionConfirmation).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_shopify_preview_route_decision_confirmation_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchShopifyPreviewRouteApprovalPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchShopifyPreviewRouteExecutionReceipt).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchEmailRenderQa).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchSeedInboxCorrectionUiEditExecutionKit).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.privateObservedEventsFile).toBe(
      "/tmp/mantis-reports/private/mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json",
    );
    expect(plan.paths.goalAudit).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_v0_goal_audit_current_2026-05-31.json",
    );
    expect(plan.paths.validationReceipt).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_validation_receipt_current_2026-05-31.json",
    );
    expect(plan.paths.currentStateRefresh).toBe(
      "/tmp/mantis-reports/mailerlite_launch_os_current_state_refresh_current_2026-05-31.json",
    );
    expect(commands).toContain("crm-vnext-mailerlite-launch-os-current-state-refresh.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-asset-manifest.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-shopify-public-url-gate.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.mjs");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-crm-write-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-asset-manifest");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-public-url-gate");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-preview-route-decision-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-preview-route-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-missing-inputs-intake");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-post-input-orchestrator");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-continuation-guard");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-operator-runbook");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-goal-audit");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-validation-receipt");
    expect(commands).toContain("mailerlite_mini_launch_crm_write_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_decision_confirmation_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_launch_os_missing_inputs_request_bundle_current_2026-05-31.json");
    expect(commands).toContain("mailerlite_launch_os_taxonomy_refresh_response_request_bundle_current_2026-05-31.json");
    expect(commands).toContain("--no-write-examples");
    expect(commands).not.toMatch(/(^|\s)--write(\s|$)/u);
    expect(commands).not.toMatch(/(^|\s)--execute(\s|$)/u);
    expect(assertLocalOnlyCommandPlan(plan)).toBe(true);
  });

  test("threads validation results into report commands without live operations", () => {
    const paths = buildReportPaths({ date: "2026-05-31", reportsDir });
    const validationResult = {
      runValidation: true,
      commands: buildCurrentStateRefreshPlan({ date: "2026-05-31", reportsDir }).validationCommands,
      testFiles: 4,
      testCount: 45,
    };
    const reportCommands = buildReportCommands(paths, validationResult);
    const validationReceiptCommand = reportCommands.find((entry) => entry.id === "refresh_validation_receipt");

    expect(validationReceiptCommand?.args).toContain("--validation-status");
    expect(validationReceiptCommand?.args).toContain("passed");
    expect(validationReceiptCommand?.args).toContain("--test-files");
    expect(validationReceiptCommand?.args).toContain("4");
    expect(validationReceiptCommand?.args).toContain("--test-count");
    expect(validationReceiptCommand?.args).toContain("45");
    expect(formatCommand(validationReceiptCommand!)).not.toContain("--write");
  });

  test("parses focused Vitest counts from command output", () => {
    const counts = parseVitestCounts([
      {
        id: "focused_vitest",
        stdoutTail: " Test Files  4 passed (4)\n      Tests  45 passed (45)",
        stderrTail: "",
      },
    ]);

    expect(counts).toEqual({ testFiles: 4, testCount: 45 });
  });

  test("builds a refresh receipt with hard safety gates closed", () => {
    const paths = buildReportPaths({ date: "2026-05-31", reportsDir });
    const commandResults = [
      {
        id: "node_check_current_state_refresh",
        purpose: "syntax-check",
        command: "node --check scripts/current.mjs",
        startedAt: "2026-05-31T00:00:00.000Z",
        finishedAt: "2026-05-31T00:00:01.000Z",
        exitCode: 0,
        signal: null,
        ok: true,
        stdoutTail: "",
        stderrTail: "",
        error: null,
      },
    ];
    const receipt = buildRefreshReceipt({
      options: {
        date: "2026-05-31",
        reportsDir,
        out: "/tmp/refresh.json",
        markdownOut: "/tmp/refresh.md",
      },
      paths,
      validationResults: commandResults,
      reportResults: [],
      validationResult: {
        runValidation: true,
        commands: [],
        testFiles: 4,
        testCount: 45,
      },
      generatedReports: {
        crmWriteApprovalPacket: {
          path: paths.miniLaunchCrmWriteApprovalPacket,
          markdownPath: paths.miniLaunchCrmWriteApprovalPacketMarkdown,
          status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
          ok: true,
          exactEventCountReady: 0,
          exactPersonCountReady: 0,
          internalSeedOrQaCount: 0,
        },
        approvalQueue: {
          path: paths.approvalQueue,
          markdownPath: paths.approvalQueueMarkdown,
          status: "mailerlite_launch_os_approval_queue_ready_no_live_changes",
          ok: true,
          readyApprovalRequestCount: 0,
          blockedApprovalRequestCount: 1,
          openLiveMutationGateCount: 0,
        },
        blockedGateHandoff: {
          path: paths.blockedGateHandoff,
          markdownPath: paths.blockedGateHandoffMarkdown,
          status: "blocked_gate_handoff_ready_no_live_changes",
          ok: true,
          inputNeededCount: 6,
          openLiveMutationGateCount: 0,
        },
        miniLaunchAssetManifest: {
          path: paths.miniLaunchAssetManifest,
          markdownPath: paths.miniLaunchAssetManifestMarkdown,
          status: "mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes",
          ok: true,
          finalPublicLinksReady: false,
          publicAudienceSendUrlGateReady: false,
          linkLifecyclePolicy: "single_slot_preview_to_live_lifecycle",
          requiresAlejandroManualLinks: false,
          subscriptionReasonPolicy: "remove_custom_line_and_rely_on_platform_footer",
        },
        miniLaunchShopifyPublicUrlGate: {
          path: paths.miniLaunchShopifyPublicUrlGate,
          markdownPath: paths.miniLaunchShopifyPublicUrlGateMarkdown,
          status: "shopify_public_url_gate_waiting_decision_no_live_changes",
          ok: true,
          finalPublicLinksReady: false,
          publicAudienceSendUrlGateReady: false,
          noSeparateUrlSetsRequired: true,
          approvalPhraseAvailable: false,
          recommendedVisibilityTier: "unlisted_noindex_preview",
          fullyPublicNavigationRequiredNow: false,
          seoIndexingAllowedNow: false,
          decisionExplanationRequiredBeforeApprovalPhrase: true,
          canPublishNow: false,
        },
        miniLaunchShopifyPreviewRouteDecision: {
          path: paths.miniLaunchShopifyPreviewRouteDecision,
          markdownPath: paths.miniLaunchShopifyPreviewRouteDecisionMarkdown,
          status: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
          ok: true,
          recommendedVisibilityTier: "unlisted_noindex_preview",
          decisionExplanationReady: true,
          exactApprovalPhraseAvailable: false,
          exactApprovalPhrasePrinted: false,
          canAskApprovalNow: false,
          canPublishNow: false,
          publicAudienceSendUrlGateReady: false,
        },
        miniLaunchShopifyPreviewRouteApprovalPacket: {
          path: paths.miniLaunchShopifyPreviewRouteApprovalPacket,
          markdownPath: paths.miniLaunchShopifyPreviewRouteApprovalPacketMarkdown,
          status: "shopify_preview_route_approval_packet_ready_for_exact_human_approval_no_live_changes",
          ok: true,
          humanDecisionConfirmed: true,
          exactApprovalPhraseAvailable: true,
          exactApprovalPhrasePrinted: true,
          canAskApprovalNow: true,
          canExecuteNow: false,
          canPublishNow: false,
          publicAudienceSendUrlGateReady: false,
        },
        miniLaunchShopifyPreviewRouteExecutionReceipt: {
          path: paths.miniLaunchShopifyPreviewRouteExecutionReceipt,
          markdownPath: paths.miniLaunchShopifyPreviewRouteExecutionReceiptMarkdown,
          status: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
          ok: true,
          previewRouteReady: true,
          publicAudienceSendUrlGateReady: false,
          targetLinkCount: 3,
          effectivePreviewView: "lead-result-inteligencia-isolated",
        },
        miniLaunchEmailRenderQa: {
          path: paths.miniLaunchEmailRenderQa,
          markdownPath: paths.miniLaunchEmailRenderQaMarkdown,
          status: "mini_launch_email_render_qa_green_no_live_changes",
          ok: true,
          localRenderReady: true,
          emailCount: 4,
          renderPreviewNonEmptyCount: 4,
          redCheckCount: 0,
          publicUseReady: false,
          mailerLiteBuilderReady: false,
          seedSendReady: false,
        },
        miniLaunchSeedInboxCorrectionUiEditApprovalPacket: {
          path: paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
          markdownPath: paths.miniLaunchSeedInboxCorrectionUiEditApprovalPacketMarkdown,
          status: "seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes",
          ok: true,
          canAskAlejandroForApproval: true,
          targetDraftCount: 4,
          localRenderReady: true,
          blockerCount: 0,
          publicAudienceSendUrlGateReady: false,
        },
        miniLaunchSeedInboxCorrectionUiEditExecutionKit: {
          path: paths.miniLaunchSeedInboxCorrectionUiEditExecutionKit,
          markdownPath: paths.miniLaunchSeedInboxCorrectionUiEditExecutionKitMarkdown,
          status: "seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes",
          ok: true,
          targetDraftCount: 4,
          htmlSourceReadyCount: 4,
          previewReadyCount: 4,
          canOpenBrowserNow: false,
          canEditDraftsNow: false,
          canSendNow: false,
          blockerCount: 0,
        },
        missingInputsKit: {
          path: paths.missingInputsKit,
          markdownPath: paths.missingInputsKitMarkdown,
          status: "missing_inputs_kit_ready_no_live_changes",
          ok: true,
          inputCount: 6,
          openLiveMutationGateCount: 0,
        },
        missingInputsIntake: {
          path: paths.missingInputsIntake,
          markdownPath: paths.missingInputsIntakeMarkdown,
          status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
          ok: true,
          readyInputCount: 0,
          inputCount: 6,
          readyForCrmApprovalRequest: false,
          readyForMiniLaunchCorrectionPreview: false,
        },
        missingInputsRequestBundle: {
          path: paths.missingInputsRequestBundle,
          markdownPath: paths.missingInputsRequestBundleMarkdown,
          status: "missing_inputs_request_bundle_ready_no_live_changes",
          ok: true,
          requestCount: 6,
          canAskApprovalNow: false,
        },
        privateInputTemplatePack: {
          path: paths.privateInputTemplatePack,
          markdownPath: paths.privateInputTemplatePackMarkdown,
          status: "private_input_template_pack_ready_no_live_changes",
          ok: true,
          templateCount: 6,
          writeExamples: false,
        },
        postInputOrchestrator: {
          path: paths.postInputOrchestrator,
          markdownPath: paths.postInputOrchestratorMarkdown,
          status: "post_input_orchestrator_waiting_for_inputs_no_live_changes",
          ok: true,
          readyCommandCount: 0,
          commandsExecuted: false,
        },
        continuationGuard: {
          path: paths.continuationGuard,
          markdownPath: paths.continuationGuardMarkdown,
          status: "mailerlite_launch_os_continuation_guard_ready_no_live_changes",
          ok: true,
          openLiveMutationGateCount: 0,
          oldUiWorkClosed: true,
        },
        operatorRunbook: {
          path: paths.operatorRunbook,
          markdownPath: paths.operatorRunbookMarkdown,
          status: "mailerlite_launch_os_operator_runbook_ready_no_live_changes",
          ok: true,
          openLiveGateCount: 0,
          validationStatus: "passed",
        },
        goalAudit: {
          path: paths.goalAudit,
          markdownPath: paths.goalAuditMarkdown,
          status: "goal_active_not_ready_for_live_operation",
          ok: true,
          readyForLiveOperation: false,
          liveActionAllowedNow: false,
          provenCount: 7,
          partialCount: 3,
          blockedCount: 0,
        },
        validationReceipt: {
          path: paths.validationReceipt,
          markdownPath: paths.validationReceiptMarkdown,
          status: "mailerlite_launch_os_validation_receipt_ready_no_live_changes",
          ok: true,
          validationStatus: "passed",
          liveGatesClosed: true,
          testFiles: 4,
          testCount: 45,
        },
      },
      generatedAt: "2026-05-31T00:00:02.000Z",
    });

    expect(receipt.status).toBe("mailerlite_launch_os_current_state_refresh_ready_no_live_changes");
    expect(receipt.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
    });
    expect(buildSafety().groupMutationsPerformed).toBe(false);
    expect(renderMarkdown(receipt)).toContain("Current-State Refresh");
  });
});
