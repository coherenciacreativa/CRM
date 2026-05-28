import { describe, expect, test } from "vitest";

import {
  buildApprovalQueue,
  buildBrujulaBuilderDraftItem,
  buildMiniLaunchEmailAssetBuildItem,
  buildMiniLaunchEmailManualUiBuilderItem,
  buildMiniLaunchEmptyGroupItem,
  buildOnboardingV2EmptyGroupItem,
  buildSafety,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs";

const miniLaunchEmptyGroupPacket = {
  status: "ready_for_exact_human_approval_to_create_mini_launch_empty_groups",
  decision: {
    canAskAlejandroForApproval: true,
    exactApprovalPhrase: "Apruebo crear los 2 grupos vacios del mini-lanzamiento.",
  },
  targetGroups: [
    { name: "CC · Source · Quiz · Inteligencia para descansar" },
    { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
  ],
  approvalBoundary: {
    allowedAfterExactApproval: ["create_these_named_empty_mailerlite_groups_only_after_fresh_rescan"],
    stillClosedEvenAfterThisApproval: ["subscriber_reads_or_assignment", "workflow_or_automation_use", "email_asset_build_or_send"],
    requiredBeforeAnyExecutorRun: ["rerun mini-launch group dry-run immediately before execution"],
  },
  safety: {
    sourceDryRunMailerLiteGroupsRead: 75,
  },
};

const miniLaunchEmptyGroupCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  createdGroups: [],
  safety: {
    mailerLiteGroupsRead: 75,
    mailerLiteMutationsPerformed: false,
  },
};

const onboardingV2EmptyGroupsPacket = {
  status: "ready_for_exact_human_approval_to_create_empty_groups",
  approvalGate: {
    canAskAlejandroForApproval: true,
    exactApprovalPhrase: "Apruebo crear unicamente estos 12 grupos vacios de Onboarding v2.",
  },
  targetPlan: [
    { name: "CC · Source · IG onboarding" },
    { name: "CC · Journey · Editorial onboarding · In progress" },
  ],
  sourceEvidence: {
    liveGroupCount: 75,
    liveAutomationCount: 13,
  },
};

const onboardingV2EmptyGroupsCreateDryRun = {
  status: "dry_run_ready_for_exact_approval",
  createdGroups: [],
  safety: {
    groupMutationsPerformed: false,
  },
};

const miniLaunchEmailAssetBuildScopePacket = {
  status: "email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    assetCount: 4,
  },
  requestedFutureScope: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteBuildNow: false,
    exactApprovalPhrase: "Apruebo SOLO crear/editar como borradores en MailerLite los 4 assets.",
    allowedAfterExactApproval: ["create_or_edit_exactly_4_named_mailerlite_draft_email_assets"],
    stillClosedEvenAfterThisApproval: ["seed_send_or_test_send", "workflow_or_automation_attachment"],
  },
  assetBuildScope: {
    assets: [
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E01" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E02" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E03" },
      { mailerLiteAssetNameDraft: "ML Draft · descanso · E04" },
    ],
  },
  preExecutionChecklist: ["Confirm selected subject and preheader for all four emails."],
};

const miniLaunchEmailBuilderPayloadManifest = {
  status: "email_builder_payload_manifest_ready_no_live_changes",
  executiveSummary: {
    payloadCount: 4,
    contentBlockCount: 40,
    inertUrlPlaceholderCount: 3,
    readyForSeedSendNow: false,
  },
  approvalBoundary: {
    canExecuteBuilderNow: false,
    canSendNow: false,
  },
};

const miniLaunchEmailAssetBuildDryRun = {
  status: "dry_run_ready_for_exact_asset_build_approval",
  freshScan: {
    campaignsRead: 25,
    createDraftCount: 4,
    updateDraftCount: 0,
    conflictCount: 0,
  },
  assetMutations: [],
  safety: {
    mailerLiteMutationsPerformed: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
  },
};

const miniLaunchEmailAssetBuildExecution = {
  status: "failed_during_mini_launch_email_asset_build",
  assetMutations: [],
  errors: [{
    step: 1,
    reason: "mailerlite_validation_failed",
    status: 422,
    details: [{
      field: "emails.0.content",
      message: "Content submission is only available on advanced plan.",
    }],
  }],
  safety: {
    sendsPerformed: false,
    subscribersRead: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

const miniLaunchEmailRenderQa = {
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    renderPreviewNonEmptyCount: 4,
    htmlWrittenCount: 4,
    publicUseReady: false,
    seedSendReady: false,
  },
  safety: {
    mailerLiteApiCalled: false,
    sendsPerformed: false,
  },
};

const miniLaunchEmailManualUiBuilderPacket = {
  status: "mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    targetDraftCount: 4,
    htmlSourceCount: 4,
    localRenderReadyCount: 4,
    advancedPlanApiBlockerConfirmed: true,
    apiAssetMutationCount: 0,
    canUseManualUiNow: false,
    canSendNow: false,
  },
  sourceEvidence: {
    payloadManifestStatus: "email_builder_payload_manifest_ready_no_live_changes",
    renderQaStatus: "mini_launch_email_render_qa_green_no_live_changes",
    assetBuildExecutionStatus: "failed_during_mini_launch_email_asset_build",
  },
  manualUiApprovalBoundary: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canUseBrowserNow: false,
    canCreateOrEditDraftsNow: false,
    exactApprovalPhrase: "Apruebo construir manualmente en MailerLite UI únicamente estos 4 borradores.",
    allowedAfterExactApproval: ["open_mailerlite_ui_manually_prefer_safari"],
    stillClosedEvenAfterApproval: ["seed_send_or_test_send", "workflow_or_automation_attachment"],
    requiredFreshEvidenceBeforeExecution: ["freshly confirm the four target draft names"],
  },
  manualUiTargetDrafts: [
    { draftName: "ML Draft · descanso · E01" },
    { draftName: "ML Draft · descanso · E02" },
    { draftName: "ML Draft · descanso · E03" },
    { draftName: "ML Draft · descanso · E04" },
  ],
  operatingPolicy: {
    status: "manual_ui_now_advanced_api_later_when_volume_justifies",
    currentDecision: "Use MailerLite UI for this mini-launch draft build while the account remains on Growing Business.",
    futureAdvancedApiUpgradeTriggers: [
      "mini_launches_become_frequent_enough_that_manual_ui_is_a_bottleneck",
      "active_subscriber_tier_exceeds_2500_or_pricing_tier_requires_a_fresh_plan_review",
    ],
  },
  safety: {
    browserOpened: false,
    mailerLiteApiCalled: false,
    mailerLiteAssetsCreatedOrEdited: false,
    sendsPerformed: false,
  },
};

const miniLaunchEmailManualUiBuildReceipt = {
  status: "manual_ui_build_receipt_executed_drafts_created_no_sends",
  executiveSummary: {
    createdOrEditedDraftCount: 4,
    allTargetDraftsVisibleInDrafts: true,
    draftsTabCountAfterBuild: 9,
    outboxCountAfterBuild: 0,
    usedEditor: "new_simple_editor",
    customHtmlEditorStatus: "premium_upgrade_locked_on_growing_business",
    sendCount: 0,
    scheduleCount: 0,
    subscriberReadOrAssignmentCount: 0,
    groupAssignmentCount: 0,
    workflowAttachmentCount: 0,
  },
  stillClosedAfterThisReceipt: [
    "seed_send_or_test_send",
    "workflow_or_automation_attachment",
    "subscriber_read_assignment_or_import",
  ],
  safety: {
    sendsPerformed: false,
    schedulesCreated: false,
    subscribersReadOrAssigned: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
  },
};

const miniLaunchShopifyLocalBuildRequest = {
  status: "ready_for_human_or_web_design_scope_approval_no_live_changes",
  approvalGate: {
    canBuildLocalFilesNow: false,
    requiredPhraseBeforeLocalFiles: "Apruebo el build local Shopify no-live.",
    canPublishOrConnectNow: false,
  },
  requestedLocalScope: {
    files: [
      { path: "sections/landing-inteligencia-para-descansar.liquid" },
      { path: "templates/page.landing-inteligencia-para-descansar.json" },
    ],
  },
};

const miniLaunchShopifyLocalBuildReceipt = {
  status: "shopify_local_build_receipt_executed_files_created_no_live_changes",
  shopifyRepo: {
    localFilesCreatedOrUpdated: 2,
  },
  files: [
    { path: "sections/landing-inteligencia-para-descansar.liquid" },
    { path: "templates/page.landing-inteligencia-para-descansar.json" },
  ],
  placeholders: {
    present: true,
    inert: true,
  },
  validation: {
    jsonTemplatesParsed: true,
    noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles: true,
    noMailerLiteScriptsFoundInNewFiles: true,
    noShopifyAdminApiOrPublishCommandRun: true,
    noRealFormAction: true,
    noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles: true,
  },
  stillClosedAfterThisReceipt: [
    "shopify_publish_or_theme_push",
    "shopify_admin_api",
    "real_form_connection",
  ],
  safety: {
    shopifyApiCalled: false,
    shopifyPublishPerformed: false,
    themePushPerformed: false,
    realFormsCreated: false,
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    subscribersRead: false,
    workflowMutationsPerformed: false,
    sendsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const miniLaunchCrmSignalProjectionPacket = {
  status: "ready_for_no_live_signal_projection_design",
  approvalGate: {
    canAppendSignalLedgerNow: false,
    canWriteCardsNow: false,
    canScoreNow: false,
    canWriteFactStoreNow: false,
  },
};

const brujulaEmailStyleCorrection = {
  status: "brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes",
  draft: {
    subject: "Aqui esta La Brujula de Claridad",
  },
  outputs: {
    htmlPath: "/tmp/brujula-email-1.html",
  },
};

const brujulaEmailRenderQa = {
  status: "brujula_email1_local_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    testSendReady: false,
  },
};

const brujulaEmailManualUiBuildReceipt = {
  status: "brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends",
  ok: true,
  scope: {
    approvedScopeId: "brujula_email1_builder_draft",
    exactApprovalMatched: true,
    stillClosed: [
      "send_email_or_test_email",
      "cards_scoring_or_fact_store_writes",
    ],
  },
  campaign: {
    id: "188677585118430654",
    name: "Brújula · Email 1 corregido · Aquí está La Brújula de Claridad",
    status: "draft",
    subject: "Aqui esta La Brujula de Claridad",
    recipientsSelected: false,
    groupsOrSegmentsSelected: false,
    scheduled: false,
    sent: false,
  },
  verification: {
    postExecutionApiVerify: {
      status: "post_ui_paste_verify_green",
      targetInDraft: true,
      targetInReadyOutbox: false,
      targetInSent: false,
      readyOutboxCampaignsRead: 0,
      contentChecks: {
        hasTitle: true,
        hasGreeting: true,
      },
    },
  },
  safety: {
    sendsPerformed: false,
    schedulesPerformed: false,
    publicCampaignPublished: false,
    subscriberMutationsPerformed: false,
    groupsCreated: false,
    groupAssignmentsPerformed: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const validationReceipt = {
  validationStatus: "passed",
  testScope: {
    testFiles: 55,
    testCount: 331,
  },
};

const buildQueue = () => buildApprovalQueue({
  miniLaunchEmptyGroupPacket,
  miniLaunchEmptyGroupCreateDryRun,
  onboardingV2EmptyGroupsPacket,
  onboardingV2EmptyGroupsCreateDryRun,
  miniLaunchEmailAssetBuildScopePacket,
  miniLaunchEmailBuilderPayloadManifest,
  miniLaunchEmailRenderQa,
  miniLaunchEmailAssetBuildDryRun,
  miniLaunchEmailAssetBuildExecution,
  miniLaunchEmailManualUiBuilderPacket,
  miniLaunchShopifyLocalBuildRequest,
  miniLaunchCrmSignalProjectionPacket,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  validationReceipt,
  generatedAt: "2026-05-28T00:00:00.000Z",
});

describe("CRM vNext MailerLite Launch OS approval queue", () => {
  test("normalizes default args and outputs", () => {
    const parsed = parseArgs(["--out", "/tmp/queue.json", "--markdown-out", "/tmp/queue.md"]);

    expect(parsed.miniLaunchEmptyGroupPacket).toContain("mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.onboardingV2EmptyGroupsPacket).toContain("mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json");
    expect(parsed.onboardingV2EmptyGroupsCreateDryRun).toContain("mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json");
    expect(parsed.miniLaunchEmailBuilderPayloadManifest).toContain("mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailRenderQa).toContain("mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildDryRun).toContain("mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailAssetBuildExecution).toContain("mailerlite_mini_launch_email_asset_build_EXECUTED_retry_with_validation_detail_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailManualUiBuilderPacket).toContain("mailerlite_mini_launch_email_manual_ui_builder_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchEmailManualUiBuildReceipt).toContain("mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyLocalBuildRequest).toContain("mailerlite_mini_launch_shopify_local_build_request_inteligencia_descansar_2026-05-27.json");
    expect(parsed.miniLaunchShopifyLocalBuildReceipt).toContain("mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.brujulaEmailManualUiBuildReceipt).toContain("mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/queue.json");
    expect(parsed.markdownOut).toBe("/tmp/queue.md");
  });

  test("keeps the safety contract local and non-mutating", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      reportsOnly: true,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmLiveApiCalled: false,
      groupsCreated: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("marks exact approval items ready while keeping seed and CRM writes blocked", () => {
    const queue = buildQueue();
    const byId = new Map(queue.approvalItems.map((item) => [item.id, item]));

    expect(queue.status).toBe("mailerlite_launch_os_approval_queue_ready_no_live_changes");
    expect(queue.executiveSummary.readyApprovalRequestCount).toBe(5);
    expect(queue.executiveSummary.blockedApprovalRequestCount).toBe(3);
    expect(queue.executiveSummary.openLiveMutationGateCount).toBe(0);
    expect(queue.executiveSummary.readyApprovalIds).toEqual([
      "mini_launch_empty_group_creation",
      "onboarding_v2_empty_group_creation",
      "mini_launch_email_manual_ui_builder",
      "shopify_no_live_local_build",
      "brujula_email1_builder_draft",
    ]);

    expect(byId.get("mini_launch_email_asset_build")).toMatchObject({
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
      exactApprovalPhrasePresent: true,
      packetIsApprovalByItself: false,
      targetCount: 4,
      evidence: {
        campaignsRead: 25,
        createDraftCount: 4,
        updateDraftCount: 0,
        conflictCount: 0,
        assetMutationsPerformed: false,
        localRenderReady: true,
        renderPreviewNonEmptyCount: 4,
        executionAdvancedPlanContentBlocker: true,
      },
    });
    expect(byId.get("mini_launch_email_manual_ui_builder")).toMatchObject({
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      operationType: "live_mailerlite_ui_draft_mutation_after_exact_approval",
      evidence: {
        targetDraftCount: 4,
        htmlSourceCount: 4,
        advancedPlanApiBlockerConfirmed: true,
        apiAssetMutationCount: 0,
        operatingPolicyStatus: "manual_ui_now_advanced_api_later_when_volume_justifies",
      },
    });
    expect(byId.get("mini_launch_seed_send")).toMatchObject({
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
    });
    expect(byId.get("crm_signal_writes")?.blockers).toContain("separate_crm_write_approval_packet_missing");
  });

  test("marks manual UI approval as completed once the post-build receipt exists", () => {
    const queue = buildApprovalQueue({
      miniLaunchEmptyGroupPacket,
      miniLaunchEmptyGroupCreateDryRun,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailAssetBuildDryRun,
      miniLaunchEmailAssetBuildExecution,
      miniLaunchEmailManualUiBuilderPacket,
      miniLaunchEmailManualUiBuildReceipt,
      miniLaunchShopifyLocalBuildRequest,
      miniLaunchCrmSignalProjectionPacket,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      validationReceipt,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const byId = new Map(queue.approvalItems.map((item) => [item.id, item]));

    expect(byId.get("mini_launch_email_manual_ui_builder")).toMatchObject({
      status: "reference_only_no_approval_request_now",
      canAskAlejandroNow: false,
      operationType: "live_mailerlite_ui_draft_mutation_already_completed",
      evidence: {
        receiptStatus: "manual_ui_build_receipt_executed_drafts_created_no_sends",
        createdOrEditedDraftCount: 4,
        outboxCountAfterBuild: 0,
      },
    });
    expect(byId.get("mini_launch_seed_send")?.blockers).not.toContain("asset_build_not_executed");
    expect(byId.get("mini_launch_seed_send")?.blockers).toContain("real_mailerlite_render_qa_missing");
    expect(queue.executiveSummary.readyApprovalIds).not.toContain("mini_launch_email_manual_ui_builder");
  });

  test("marks Shopify local build approval as completed once the local receipt exists", () => {
    const queue = buildApprovalQueue({
      miniLaunchEmptyGroupPacket,
      miniLaunchEmptyGroupCreateDryRun,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailAssetBuildDryRun,
      miniLaunchEmailAssetBuildExecution,
      miniLaunchEmailManualUiBuilderPacket,
      miniLaunchShopifyLocalBuildRequest,
      miniLaunchShopifyLocalBuildReceipt,
      miniLaunchCrmSignalProjectionPacket,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      validationReceipt,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    const item = queue.approvalItems.find((approvalItem) => approvalItem.id === "shopify_no_live_local_build");

    expect(queue.executiveSummary.readyApprovalIds).not.toContain("shopify_no_live_local_build");
    expect(item).toMatchObject({
      status: "reference_only_no_approval_request_now",
      canAskAlejandroNow: false,
      operationType: "local_shopify_repo_edit_already_completed",
      approvalType: "reference_only_completed",
      targetCount: 2,
      evidence: {
        receiptStatus: "shopify_local_build_receipt_executed_files_created_no_live_changes",
        localFilesCreatedOrUpdated: 2,
        placeholdersPresent: true,
        placeholdersInert: true,
        noShopifyAdminApiOrPublishCommandRun: true,
        noRealFormAction: true,
        shopifyApiCalled: false,
        shopifyPublishPerformed: false,
        realFormsCreated: false,
        mailerLiteApiCalled: false,
        crmLiveApiCalled: false,
      },
    });
    expect(item?.stillClosed).toContain("shopify_publish_or_theme_push");
    expect(item?.notes.join(" ")).toContain("Shopify no-live local build boundary has already been used");
  });

  test("marks Brújula builder draft approval as completed once the manual UI receipt exists", () => {
    const queue = buildApprovalQueue({
      miniLaunchEmptyGroupPacket,
      miniLaunchEmptyGroupCreateDryRun,
      onboardingV2EmptyGroupsPacket,
      onboardingV2EmptyGroupsCreateDryRun,
      miniLaunchEmailAssetBuildScopePacket,
      miniLaunchEmailBuilderPayloadManifest,
      miniLaunchEmailRenderQa,
      miniLaunchEmailAssetBuildDryRun,
      miniLaunchEmailAssetBuildExecution,
      miniLaunchEmailManualUiBuilderPacket,
      miniLaunchShopifyLocalBuildRequest,
      miniLaunchCrmSignalProjectionPacket,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      brujulaEmailManualUiBuildReceipt,
      validationReceipt,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const item = queue.approvalItems.find((approvalItem) => approvalItem.id === "brujula_email1_builder_draft");

    expect(queue.executiveSummary.readyApprovalIds).not.toContain("brujula_email1_builder_draft");
    expect(item).toMatchObject({
      status: "reference_only_no_approval_request_now",
      canAskAlejandroNow: false,
      operationType: "live_mailerlite_builder_draft_mutation_already_completed",
      approvalType: "reference_only_completed",
      evidence: {
        receiptStatus: "brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends",
        campaignId: "188677585118430654",
        createdOrEditedDraftCount: 1,
        outboxCountAfterBuild: 0,
        recipientsEmptyObserved: true,
        sendsPerformed: false,
      },
    });
    expect(item?.stillClosed).toContain("test_send_or_public_send");
  });

  test("blocks a mini-launch empty-group item if the create dry-run is not green", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "blocked",
      },
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.blockers).toContain("mini_launch_empty_group_create_dry_run_not_ready:blocked");
  });

  test("marks mini-launch empty-group approval as reference-only after targets already exist", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "dry_run_no_create_needed_targets_already_exist",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
      },
    });

    expect(item.status).toBe("reference_only_no_approval_request_now");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.operationType).toBe("live_mailerlite_group_creation_already_completed");
    expect(item.evidence).toMatchObject({
      targetGroupsAlreadyExist: true,
      targetMissingCount: 0,
      targetExistingCount: 2,
    });
    expect(item.notes.join(" ")).toContain("already exist");
  });

  test("keeps mini-launch empty-group item reference-only with completed packet and no exact phrase", () => {
    const item = buildMiniLaunchEmptyGroupItem({
      packet: {
        ...miniLaunchEmptyGroupPacket,
        status: "reference_only_empty_group_creation_already_completed",
        decision: {
          ...miniLaunchEmptyGroupPacket.decision,
          canAskAlejandroForApproval: false,
          exactApprovalPhrase: null,
        },
        targetGroups: miniLaunchEmptyGroupPacket.targetGroups.map((target) => ({
          ...target,
          plannedOperation: "no_empty_group_creation_needed_already_exists",
          allowedOperation: "already_exists_no_create_needed",
          existsInMailerLite: true,
        })),
      },
      dryRun: {
        ...miniLaunchEmptyGroupCreateDryRun,
        status: "dry_run_no_create_needed_targets_already_exist",
        freshScan: {
          targetGroupsExistingCount: 2,
          targetGroupsMissingCount: 0,
        },
      },
    });

    expect(item.status).toBe("reference_only_no_approval_request_now");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.blockers).toEqual([]);
  });

  test("marks onboarding v2 empty-group approval as reference-only after targets already exist", () => {
    const item = buildOnboardingV2EmptyGroupItem({
      packet: onboardingV2EmptyGroupsPacket,
      dryRun: {
        status: "dry_run_blocked",
        packetSummary: {
          status: "blocked_before_empty_group_approval",
          liveGroupsRead: 89,
          liveAutomationsRead: 13,
        },
        decision: {
          targetPlan: onboardingV2EmptyGroupsPacket.targetPlan.map((target) => ({
            ...target,
            existsInFreshScan: true,
          })),
        },
        createdGroups: [],
        safety: {
          groupMutationsPerformed: false,
        },
      },
    });

    expect(item.status).toBe("reference_only_no_approval_request_now");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.operationType).toBe("live_mailerlite_group_creation_already_completed");
    expect(item.evidence).toMatchObject({
      targetGroupsAlreadyExist: true,
      liveGroupsRead: 89,
    });
  });

  test("blocks mini-launch email asset build after MailerLite rejects API content submission on non-Advanced plan", () => {
    const item = buildMiniLaunchEmailAssetBuildItem({
      scopePacket: miniLaunchEmailAssetBuildScopePacket,
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      dryRun: miniLaunchEmailAssetBuildDryRun,
      executionAttempt: {
        status: "failed_during_mini_launch_email_asset_build",
        assetMutations: [],
        errors: [{
          step: 1,
          reason: "mailerlite_validation_failed",
          status: 422,
          details: [{
            field: "emails.0.content",
            message: "Content submission is only available on advanced plan.",
          }],
        }],
        safety: {
          sendsPerformed: false,
          subscribersRead: false,
          groupsCreatedOrAssigned: false,
          workflowMutationsPerformed: false,
        },
      },
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.blockers).toContain("mailerlite_api_content_submission_requires_advanced_plan");
    expect(item.evidence).toMatchObject({
      executionAttemptStatus: "failed_during_mini_launch_email_asset_build",
      executionAssetMutationCount: 0,
      executionAdvancedPlanContentBlocker: true,
    });
    expect(item.notes.join(" ")).toContain("Advanced plan");
  });

  test("marks manual UI builder fallback ready only after API blocker is proven with zero mutations", () => {
    const item = buildMiniLaunchEmailManualUiBuilderItem({
      packet: miniLaunchEmailManualUiBuilderPacket,
    });

    expect(item.status).toBe("ready_for_exact_approval_request");
    expect(item.canAskAlejandroNow).toBe(true);
    expect(item.targetCount).toBe(4);
    expect(item.commandAfterApproval).toContain("prefer Safari");
    expect(item.notes.join(" ")).toContain("non-Advanced MailerLite plan");
    expect(item.notes.join(" ")).toContain("subscriber tier growth beyond 2,500");
    expect(item.evidence.futureAdvancedApiUpgradeTriggers).toContain(
      "mini_launches_become_frequent_enough_that_manual_ui_is_a_bottleneck",
    );

    const blocked = buildMiniLaunchEmailManualUiBuilderItem({
      packet: {
        ...miniLaunchEmailManualUiBuilderPacket,
        executiveSummary: {
          ...miniLaunchEmailManualUiBuilderPacket.executiveSummary,
          advancedPlanApiBlockerConfirmed: false,
        },
      },
    });

    expect(blocked.status).toBe("prepared_but_blocked_before_approval_request");
    expect(blocked.blockers).toContain("advanced_plan_api_blocker_not_confirmed");
  });

  test("builds specific boundary items for onboarding v2, asset build and Brújula", () => {
    expect(buildOnboardingV2EmptyGroupItem({
      packet: onboardingV2EmptyGroupsPacket,
      dryRun: onboardingV2EmptyGroupsCreateDryRun,
    })).toMatchObject({
      status: "ready_for_exact_approval_request",
      targetCount: 2,
      operationType: "live_mailerlite_group_creation_after_exact_approval",
    });

    expect(buildMiniLaunchEmailAssetBuildItem({
      scopePacket: miniLaunchEmailAssetBuildScopePacket,
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
    })).toMatchObject({
      status: "ready_for_exact_approval_request",
      operationType: "live_mailerlite_builder_draft_mutation_after_exact_approval",
      evidence: {
        payloadCount: 4,
        contentBlockCount: 40,
        localRenderReady: true,
      },
    });

    const brujula = buildBrujulaBuilderDraftItem({
      correction: brujulaEmailStyleCorrection,
      renderQa: brujulaEmailRenderQa,
    });
    expect(brujula.status).toBe("ready_for_exact_approval_request");
    expect(brujula.exactApprovalPhrase).toContain("/tmp/brujula-email-1.html");
    expect(brujula.stillClosed).toContain("test_send_or_public_send");
  });

  test("renders Markdown with phrases and hard stops", () => {
    const markdown = renderMarkdown(buildQueue());

    expect(markdown).toContain("# MailerLite Launch OS v0 - Approval Queue");
    expect(markdown).toContain("Ready approval requests: 5");
    expect(markdown).toContain("Apruebo construir manualmente en MailerLite UI");
    expect(markdown).toContain("This queue is not approval.");
  });
});
