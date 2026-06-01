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
    expect(plan.paths.miniLaunchPublicAudienceScanPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_public_audience_scan_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchPublicAudienceSuppressionPolicyPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_public_audience_suppression_policy_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchPublicAudienceScopePacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchPublicLaunchReadinessPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchPublicSendPreflightDecisionPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-05-31.json",
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
    expect(plan.paths.miniLaunchRealMailerLiteRenderQaBeforeSeedSendLatest).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json",
    );
    expect(plan.paths.miniLaunchMailerLiteApiInertDraftLab).toBe(
      "/tmp/mantis-reports/mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchMailerLiteApiNullAudienceLab).toBe(
      "/tmp/mantis-reports/mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchNullAudienceReplacementApprovalPacket).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchNullAudienceReplacementExecutionReceipt).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchNullAudienceSeedInboxQa).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchSeedInboxCorrectionApiEditDiagnostic).toBe(
      "/tmp/mantis-reports/mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(plan.paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy).toBe(
      "/tmp/mantis-reports/mailerlite_api_existing_draft_update_strategy_current_inteligencia_descansar_2026-05-31.json",
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
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-public-audience-scan-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-public-audience-suppression-policy-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-public-audience-scope-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-public-launch-readiness-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-public-send-preflight-decision-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-receipt.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-api-inert-draft-lab.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-api-null-audience-lab.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-api-existing-draft-update-strategy-packet.mjs");
    expect(commands).toContain("crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.mjs");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-crm-write-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-asset-manifest");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-public-url-gate");
    expect(commands).toContain("mailerlite_mini_launch_public_audience_scan_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-public-audience-suppression-policy-packet");
    expect(commands).toContain("mailerlite_mini_launch_public_audience_suppression_policy_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-public-launch-readiness-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-public-send-preflight-decision-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-preview-route-decision-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-shopify-preview-route-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-api-inert-draft-lab");
    expect(commands).toContain("crm:vnext:mailerlite-api-null-audience-lab");
    expect(commands).toContain("crm:vnext:mailerlite-mini-launch-null-audience-replacement-approval-packet");
    expect(commands).toContain("crm:vnext:mailerlite-api-existing-draft-update-strategy-packet");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-approval-intake");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-missing-inputs-intake");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-missing-inputs-request-bundle");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-post-input-orchestrator");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-continuation-guard");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-operator-runbook");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-goal-audit");
    expect(commands).toContain("crm:vnext:mailerlite-launch-os-validation-receipt");
    expect(commands).toContain("mailerlite_mini_launch_crm_write_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_decision_confirmation_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_api_existing_draft_update_strategy_current_inteligencia_descansar_2026-05-31.json");
    expect(commands).toContain("mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json");
    expect(commands).toContain("mailerlite_launch_os_approval_intake_current_2026-05-31.json");
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
        approvalIntake: {
          path: paths.approvalIntake,
          markdownPath: paths.approvalIntakeMarkdown,
          status: "waiting_for_exact_approval_text_no_live_changes",
          ok: true,
          approvalTextProvided: false,
          matchedApprovalCount: 0,
          matchedApprovalId: null,
          executionAllowedNow: false,
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
        miniLaunchPublicAudienceScanPacket: {
          path: paths.miniLaunchPublicAudienceScanPacket,
          markdownPath: paths.miniLaunchPublicAudienceScanPacketMarkdown,
          status: "public_audience_scan_packet_ready_read_only_no_mutations",
          ok: true,
          freshAudienceScanReady: true,
          membershipScanReady: true,
          suppressionStatusScanReady: true,
          suppressionExclusionPolicyReady: false,
          candidateGroupCount: 5,
          subscribersScanned: 933,
          subscribersMatchedToCandidateGroups: 933,
          blockerCount: 4,
          mailerLiteApiCalled: true,
          subscriberRowsPrinted: false,
          rawIdsPrinted: false,
          recipientsPrinted: false,
          tokensPrinted: false,
        },
        miniLaunchPublicAudienceSuppressionPolicyPacket: {
          path: paths.miniLaunchPublicAudienceSuppressionPolicyPacket,
          markdownPath: paths.miniLaunchPublicAudienceSuppressionPolicyPacketMarkdown,
          status: "public_audience_suppression_policy_packet_ready_no_live_changes",
          ok: true,
          suppressionPolicyPacketReady: true,
          suppressionExclusionPolicyReady: true,
          policyRuleCount: 6,
          sendableMembershipObservations: 933,
          suppressionRiskMembershipCount: 144,
          resolvedBlockerCount: 1,
          remainingBlockerCountAfterPolicy: 3,
          publicAudienceSendAllowedNow: false,
          mailerLiteApiCalled: false,
          subscribersRead: false,
          subscriberRowsPrinted: false,
          sendsPerformed: false,
          rawIdsPrinted: false,
          recipientsPrinted: false,
          tokensPrinted: false,
        },
        miniLaunchPublicAudienceScopePacket: {
          path: paths.miniLaunchPublicAudienceScopePacket,
          markdownPath: paths.miniLaunchPublicAudienceScopePacketMarkdown,
          status: "public_audience_scope_packet_ready_blocked_no_live_changes",
          ok: true,
          audienceScopePacketReady: true,
          publicAudienceScopeReady: false,
          readyForExactAudienceScopeApproval: false,
          canAskAudienceScopeApprovalNow: false,
          selectedAudienceScopeId: null,
          recommendedDefaultNow: "keep_null_audience_no_public_send",
          recommendedFutureDecisionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_subscriber_send",
          massSubscriberSendRecommendedNow: false,
          existingActiveSubscriberAudienceFutureOptionOnly: true,
          candidateOptionCount: 6,
          blockerCount: 5,
          mailerLiteApiCalled: false,
          subscribersRead: false,
          sendsPerformed: false,
          rawIdsPrinted: false,
          recipientsPrinted: false,
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
        miniLaunchMailerLiteApiInertDraftLab: {
          path: paths.miniLaunchMailerLiteApiInertDraftLab,
          markdownPath: paths.miniLaunchMailerLiteApiInertDraftLabMarkdown,
          status: "mailerlite_api_inert_draft_lab_packet_ready_for_exact_human_approval_no_live_changes",
          ok: true,
          mode: "dry_run_packet_only",
          variantCount: 4,
          inertVariantCount: null,
          exactApprovalPhraseAvailable: true,
          canExecuteNow: false,
          mailerLiteApiCalled: false,
          mailerLiteDraftsCreated: 0,
          mailerLiteDraftsDeleted: 0,
          senderValuesPrinted: false,
          tokensPrinted: false,
        },
        miniLaunchMailerLiteApiNullAudienceLab: {
          path: paths.miniLaunchMailerLiteApiNullAudienceLab,
          markdownPath: paths.miniLaunchMailerLiteApiNullAudienceLabMarkdown,
          status: "mailerlite_api_null_audience_lab_packet_ready_for_exact_human_approval_no_live_changes",
          ok: true,
          mode: "dry_run_packet_only",
          safetyGroupName: "CC · Safety · Null audience · DO NOT SEND",
          safetyGroupActiveCountObserved: null,
          variantCount: 2,
          safeNullAudienceVariantCount: null,
          readyToUseNullAudienceRecipeForRealDrafts: null,
          exactApprovalPhraseAvailable: true,
          canExecuteNow: false,
          mailerLiteApiCalled: false,
          mailerLiteSafetyGroupsCreated: 0,
          mailerLiteDraftsCreated: 0,
          mailerLiteDraftsDeleted: 0,
          senderValuesPrinted: false,
          safetyGroupIdPrinted: false,
          tokensPrinted: false,
        },
        miniLaunchNullAudienceReplacementApprovalPacket: {
          path: paths.miniLaunchNullAudienceReplacementApprovalPacket,
          markdownPath: paths.miniLaunchNullAudienceReplacementApprovalPacketMarkdown,
          status: "mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes",
          ok: true,
          canAskAlejandroForApproval: true,
          replacementTargetCount: 4,
          nullAudienceRecipeReady: true,
          safetyGroupActiveCountObserved: 0,
          localRenderReady: true,
          redCheckCount: 0,
          publicAudienceSendUrlGateReady: false,
          sourceCampaignIdCount: 4,
          blockerCount: 0,
          mailerLiteApiCalled: false,
          mailerLiteMutationsPerformed: false,
          exactUrlsPrinted: false,
          tokensPrinted: false,
        },
        miniLaunchNullAudienceReplacementExecutionReceipt: {
          path: paths.miniLaunchNullAudienceReplacementExecutionReceipt,
          markdownPath: paths.miniLaunchNullAudienceReplacementExecutionReceiptMarkdown,
          status: "mailerlite_null_audience_replacement_preflight_ready_for_exact_approval",
          ok: true,
          mode: "read_only_preflight",
          createdDraftCount: 0,
          nullAudienceSafeCount: null,
          contentGreenCount: null,
          cleanupAttempted: null,
          blockerCount: 0,
          mailerLiteApiCalled: true,
          mailerLiteDraftsCreated: 0,
          sendsPerformed: false,
          tokensPrinted: false,
        },
        miniLaunchNullAudienceSeedInboxQa: {
          path: paths.miniLaunchNullAudienceSeedInboxQa,
          markdownPath: paths.miniLaunchNullAudienceSeedInboxQaMarkdown,
          status: "mailerlite_null_audience_seed_inbox_qa_partial_blocked_e04_not_delivered_to_seed",
          ok: false,
          seedInboxQaGreen: false,
          deliveredToApprovedSeed: 3,
          expectedSeedMessages: 4,
          correctedOutsideSeedCount: 1,
          needsHumanApprovalBeforeAdditionalSend: true,
          recommendedNextBoundary: "approve_resending_only_E04_test_to_exact_seed_after_fresh_rescan",
          gmailReadOnly: true,
          sendsPerformedByQa: false,
        },
        miniLaunchPublicLaunchReadinessPacket: {
          path: paths.miniLaunchPublicLaunchReadinessPacket,
          markdownPath: paths.miniLaunchPublicLaunchReadinessPacketMarkdown,
          status: "mini_launch_public_launch_readiness_blocked_after_green_seed_qa_no_live_changes",
          ok: true,
          seedInboxQaGreen: true,
          nullAudienceReplacementDraftsReady: true,
          previewLinksReady: true,
          finalPublicLinksReady: true,
          publicAudienceSendUrlGateReady: false,
          publicAudienceScopeReady: false,
          crmObservedEventsReady: false,
          readyForExactPublicSendApproval: false,
          liveActionAllowedNow: false,
          blockerCount: 7,
          mailerLiteApiCalled: false,
          sendsPerformed: false,
          exactUrlsPrinted: false,
          recipientsPrinted: false,
        },
        miniLaunchPublicSendPreflightDecisionPacket: {
          path: paths.miniLaunchPublicSendPreflightDecisionPacket,
          markdownPath: paths.miniLaunchPublicSendPreflightDecisionPacketMarkdown,
          status: "public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes",
          ok: true,
          decisionExplanationReady: true,
          exactApprovalPhraseAvailable: false,
          canAskExactApprovalNow: false,
          canExecuteNow: false,
          urlLifecycleEvidenceReady: true,
          audienceDecisionEvidenceReady: true,
          recommendedUrlDecisionId: "keep_existing_unlisted_noindex_preview_links_for_qa_and_micro_cohort_candidate",
          recommendedAudienceScopeId: "keep_null_audience_no_public_send",
          recommendedAudienceKnownActiveCount: 0,
          recommendedDistributionPath: "qa_then_manual_micro_cohort_or_opt_in_testers_before_any_broad_send",
          massSubscriberSendRecommendedNow: false,
          existingActiveSubscriberAudienceFutureOptionOnly: true,
          existingActiveSubscriberAudienceKnownActiveCount: 933,
          audienceStrategyGateRequiredBeforeMassSend: true,
          blockerCount: 0,
          mailerLiteApiCalled: false,
          shopifyApiCalled: false,
          sendsPerformed: false,
          exactUrlsPrinted: false,
          recipientsPrinted: false,
        },
        miniLaunchMailerLiteApiExistingDraftUpdateStrategy: {
          path: paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
          markdownPath: paths.miniLaunchMailerLiteApiExistingDraftUpdateStrategyMarkdown,
          status: "mailerlite_api_existing_draft_update_strategy_blocked_existing_drafts_not_inert_no_live_changes",
          ok: true,
          apiConnectionStableForRead: true,
          apiExistingDraftUpdateRecommendedNow: false,
          apiCreateRealDraftsRecommendedNow: false,
          allApiPayloadReady: true,
          allDraftsInertByApi: false,
          blockerCount: 1,
          mailerLiteApiCalled: false,
          mailerLiteMutationsPerformed: false,
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
    expect(renderMarkdown(receipt)).toContain("Approval intake");
  });
});
