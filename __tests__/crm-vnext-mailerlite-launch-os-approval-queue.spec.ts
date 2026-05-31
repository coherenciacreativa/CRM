import { describe, expect, test } from "vitest";

import {
  buildApprovalQueue,
  buildBrujulaBuilderDraftItem,
  buildMiniLaunchEmailAssetBuildItem,
  buildMiniLaunchEmailManualUiDraftRepairItem,
  buildMiniLaunchEmailManualUiBuilderItem,
  buildMiniLaunchEmptyGroupItem,
  buildMiniLaunchSeedInboxCorrectionUiEditItem,
  buildMiniLaunchSeedSendItem,
  buildOnboardingV2EmptyGroupItem,
  buildShopifyPreviewRouteItem,
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

const miniLaunchEmailManualUiDraftRepairPacket = {
  status: "mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    canAskAlejandroForApproval: true,
    canRepairNow: false,
    packetIsApprovalByItself: false,
    targetDraftCount: 1,
    missingFragmentCount: 4,
    realMailerLiteRenderQaStatus: "mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes",
    manualUiBuildReceiptStatus: "manual_ui_build_receipt_executed_drafts_created_no_sends",
    seedTestQaPacketStatus: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
    seedTestQaCanAskApprovalNow: false,
    seedTestQaBlockerCount: 2,
    openLiveMutationGateCount: 0,
  },
  repairTargets: [{
    step: 1,
    role: "delivery_and_orientation",
    campaignId: "188672517160830964",
    draftName: "ML Draft · descanso · E01",
    missingFragmentCount: 4,
    missingFragments: [
      { id: "email_1_paragraph_2" },
      { id: "email_1_paragraph_3" },
      { id: "email_1_paragraph_4" },
      { id: "email_1_cta" },
    ],
  }],
  decision: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canRepairNow: false,
    exactApprovalPhrase: "Apruebo reparar manualmente en MailerLite UI únicamente el borrador Email 1 del mini-lanzamiento Inteligencia para descansar, campaña 188672517160830964, corrigiendo solo estos 4 fragmentos de cuerpo/CTA para que coincidan con el payload local y usando el placeholder inerte result_or_resource_link_placeholder, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.",
    approvalOpensOnly: ["edit only the existing draft campaign named in this packet"],
    stillClosedEvenAfterApproval: ["send_email_or_test_email", "workflow_or_automation_attachment"],
    requiredFreshEvidenceBeforeExecution: ["confirm Outbox is still empty before repair"],
  },
  safety: {
    browserOpened: false,
    mailerLiteApiCalledByThisPacket: false,
    sendsPerformed: false,
    subscriberMutationsPerformed: false,
    groupsCreatedOrAssigned: false,
    workflowMutationsPerformed: false,
    factStoreWritePerformed: false,
  },
};

const miniLaunchSeedInboxCorrectionUiEditApprovalPacket = {
  status: "seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    canAskAlejandroForApproval: true,
    targetDraftCount: 4,
    correctionPreviewStatus: "seed_inbox_correction_preview_ready_no_live_changes",
    emailRenderQaStatus: "mini_launch_email_render_qa_green_no_live_changes",
    emailRenderLocalReady: true,
    renderPreviewNonEmptyCount: 4,
    redCheckCount: 0,
    manualUiBuildReceiptStatus: "manual_ui_build_receipt_executed_drafts_created_no_sends",
    shopifyPreviewRouteExecutionStatus: "shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm",
    publicAudienceSendUrlGateReady: false,
  },
  targetDrafts: [
    { step: 1, draftName: "ML Draft · descanso · E01" },
    { step: 2, draftName: "ML Draft · descanso · E02" },
    { step: 3, draftName: "ML Draft · descanso · E03" },
    { step: 4, draftName: "ML Draft · descanso · E04" },
  ],
  decision: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canEditDraftsNow: false,
    exactApprovalPhrase: "Apruebo editar manualmente en MailerLite UI únicamente los 4 borradores existentes del mini-lanzamiento Inteligencia para descansar para aplicar el payload corregido local QA-green y reemplazar solo los placeholders inertes result_or_resource_link_placeholder, practice_link_placeholder y editorial_note_link_placeholder por las 3 URLs preview unlisted/noindex registradas en el Shopify preview route execution receipt, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify adicional, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.",
  },
  approvalBoundary: {
    allowedAfterExactApproval: ["edit_only_the_four_existing_target_drafts"],
    stillClosedEvenAfterApproval: ["test_send_or_seed_send", "public_or_audience_send"],
    requiredFreshEvidenceBeforeExecution: ["freshly confirm the four target drafts are still visible"],
  },
  blockers: [],
  safety: {
    exactUrlsStoredInReport: false,
    exactUrlsPrinted: false,
    mailerLiteUiOpened: false,
    mailerLiteMutationsPerformed: false,
    sendsPerformed: false,
  },
};

const miniLaunchSeedTestQaPacket = {
  status: "seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes",
  readiness: {
    manualUiDraftsBuilt: true,
    manualUiDraftCount: 4,
    localRenderReady: true,
    targetGroupsExist: true,
    realMailerLiteRenderQaReady: true,
    canAskSeedSendApprovalNow: false,
    machineBlockersBeforeSeedSendApprovalRequest: ["exact_seed_recipient_missing"],
  },
  seedIdentity: {
    supplied: false,
    redactedEmail: null,
  },
  targetDrafts: [
    { draftName: "ML Draft · descanso · E01" },
    { draftName: "ML Draft · descanso · E02" },
    { draftName: "ML Draft · descanso · E03" },
    { draftName: "ML Draft · descanso · E04" },
  ],
  seedSendApprovalBoundary: {
    canAskAlejandroForApproval: false,
    stillClosedEvenAfterApproval: ["public_or_audience_send", "workflow_or_automation_attachment", "crm_card_write"],
    requiredBeforeApprovalRequest: ["real MailerLite render QA green for all four UI drafts", "exact seed recipient captured in a private execution packet"],
  },
};

const miniLaunchSeedSendApprovalPacket = {
  status: "seed_send_approval_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    canAskAlejandroForApproval: true,
    canExecuteSendNow: false,
    packetIsApprovalByItself: false,
    seedRecipientSupplied: true,
    openLiveMutationGateCount: 0,
  },
  seedIdentity: {
    supplied: true,
    redactedEmail: "se…@example.com",
  },
  approvalBoundary: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteSendNow: false,
    exactApprovalPhrase: "Apruebo enviar únicamente test emails desde los 4 borradores del mini-lanzamiento Inteligencia para descansar al seed recipient exacto seed@example.com, después de re-scan fresco y QA real verde en MailerLite, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.",
    allowedAfterExactApproval: ["send test emails only from the four existing mini-launch draft campaigns to the exact seed recipient"],
    stillClosedEvenAfterApproval: ["public_or_audience_send", "workflow_or_automation_attachment", "crm_card_write"],
    requiredFreshEvidenceBeforeExecution: ["freshly confirm the four campaigns are still drafts and Outbox is empty"],
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

const miniLaunchShopifyPreviewRouteDecision = {
  ok: true,
  status: "shopify_preview_route_decision_ready_for_human_explanation_no_live_changes",
  executiveSummary: {
    recommendedDecision: "use_unlisted_noindex_preview_route_for_test_launch_links",
    recommendedVisibilityTier: "unlisted_noindex_preview",
    decisionExplanationReady: true,
    exactApprovalPhraseAvailable: false,
    exactApprovalPhrasePrinted: false,
    canAskApprovalNow: false,
    canPublishNow: false,
    publicAudienceSendUrlGateReady: false,
    localAssetSlotReadyCount: 3,
    requiredPublicUrlCount: 3,
  },
  slotScope: [
    {
      key: "result_or_resource_link",
      label: "Result/resource page",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
    {
      key: "practice_link",
      label: "Practice section",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
    {
      key: "editorial_note_link",
      label: "Editorial note section",
      currentStage: "local_candidate",
      nextStageAfterApprovedPreviewRoute: "preview_url_ready",
      audienceSendReadyAfterApprovedPreviewRoute: false,
    },
  ],
  proposedScopeIfLaterApproved: {
    allowedActions: ["create_or_update_shopify_preview_route_for_existing_local_inteligencia_para_descansar_assets"],
    forbiddenActions: ["do_not_connect_mailerlite_groups_tags_workflows_or_subscribers"],
    requiredReceiptFields: ["visibility_tier=unlisted_noindex_preview"],
  },
  safety: {
    shopifyApiCalled: false,
    shopifyRepoFilesWritten: false,
    mailerLiteApiCalled: false,
    sendsPerformed: false,
  },
};

const miniLaunchShopifyPreviewRouteApprovalPacket = {
  ok: true,
  status: "shopify_preview_route_approval_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    humanDecisionConfirmed: true,
    recommendedVisibilityTier: "unlisted_noindex_preview",
    exactApprovalPhraseAvailable: true,
    exactApprovalPhrasePrinted: true,
    canAskApprovalNow: true,
    canExecuteNow: false,
    canPublishNow: false,
    publicAudienceSendUrlGateReady: false,
  },
  humanDecisionConfirmation: {
    status: "shopify_preview_route_decision_confirmed_by_alejandro_no_live_changes",
  },
  targetLinks: [
    { key: "result_or_resource_link", label: "Result/resource page" },
    { key: "practice_link", label: "Practice section" },
    { key: "editorial_note_link", label: "Editorial note section" },
  ],
  approvalBoundary: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canExecuteNow: false,
    exactApprovalPhrase: "Apruebo crear/actualizar únicamente la preview route unlisted/noindex de Shopify para los 3 links.",
    allowedAfterExactApproval: ["create_or_update_only_the_shopify_unlisted_noindex_preview_route_for_the_three_named_link_slots"],
    stillClosedEvenAfterApproval: ["audience_launch_or_public_send", "mailerlite_ui_edit_send_schedule_or_campaign_publish"],
    requiredFreshEvidenceBeforeExecution: ["freshly re-read the preview-route decision and approval packet"],
  },
  safety: {
    shopifyApiCalled: false,
    shopifyMutationsPerformed: false,
    mailerLiteApiCalled: false,
    crmLiveApiCalled: false,
    sendsPerformed: false,
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

const miniLaunchCrmWriteApprovalPacket = {
  status: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
  executiveSummary: {
    approvalRequestReady: false,
    exactEventCountReady: 0,
    exactPersonCountReady: 0,
    candidateWriteFamilyCount: 4,
    writePolicyPacketReady: true,
    operationsPreviewed: 0,
    operationsExecuted: 0,
  },
  policyEffect: {
    consumedPolicyPacket: true,
    resolvedPolicyBlockers: [
      "card_write_policy_packet_missing",
      "identity_stitching_packet_missing",
    ],
    policyBlockersStillOpen: [],
  },
  approvalBoundary: {
    canAskAlejandroForApproval: false,
    exactApprovalPhrase: null,
    blockersBeforeApprovalRequest: [
      "real_observed_event_file_missing",
      "exact_observed_events_missing",
      "exact_person_identity_missing",
    ],
    requiredBeforeApprovalRequest: [
      "Supply a real observed-events file with exact people and exact event fields.",
      "Choose one write family at a time: ledger append, card write, scoring, or Fact Store.",
      "Keep subscribers, workflows, sends, MailerLite mutations and Shopify live changes out of the CRM approval.",
    ],
  },
  writeFamilies: [
    { title: "Append observed mini-launch events to CRM Signal Event Ledger", canAskAlejandroForApproval: false, operationType: "local_crm_signal_event_ledger_append_after_future_exact_approval" },
    { title: "Write mini-launch signal history onto CRM person cards", canAskAlejandroForApproval: false, operationType: "local_crm_person_card_enrichment_after_future_exact_approval" },
    { title: "Project engagement signals into CRM scoring", canAskAlejandroForApproval: false, operationType: "local_crm_score_projection_after_future_exact_policy_approval" },
    { title: "Write aggregate launch learning to Fact Store", canAskAlejandroForApproval: false, operationType: "local_crm_fact_store_write_after_future_exact_approval" },
  ],
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
    expect(parsed.miniLaunchEmailManualUiDraftRepairPacket).toContain("mailerlite_mini_launch_email_manual_ui_draft_repair_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchSeedSendApprovalPacket).toContain("mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyLocalBuildRequest).toContain("mailerlite_mini_launch_shopify_local_build_request_inteligencia_descansar_2026-05-27.json");
    expect(parsed.miniLaunchShopifyLocalBuildReceipt).toContain("mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json");
    expect(parsed.miniLaunchShopifyPreviewRouteDecision).toContain("mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchShopifyPreviewRouteApprovalPacket).toContain("mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchShopifyPreviewRouteExecutionReceipt).toContain("mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json");
    expect(parsed.miniLaunchCrmWriteApprovalPacket).toContain("mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json");
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
    expect(queue.executiveSummary.blockedApprovalRequestCount).toBe(4);
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
    expect(byId.get("shopify_unlisted_noindex_preview_route")).toMatchObject({
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
      approvalType: "not_ready_for_request",
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
    expect(byId.get("mini_launch_email_asset_build")).toMatchObject({
      status: "reference_only_no_approval_request_now",
      canAskAlejandroNow: false,
      approvalType: "reference_only_superseded",
      operationType: "live_mailerlite_api_builder_draft_mutation_superseded_by_manual_ui_route",
      blockers: [],
      evidence: {
        apiAssetBuildSupersededByManualUi: true,
        manualUiReceiptStatus: "manual_ui_build_receipt_executed_drafts_created_no_sends",
        manualUiCreatedOrEditedDraftCount: 4,
        manualUiOutboxCountAfterBuild: 0,
        executionAdvancedPlanContentBlocker: true,
      },
    });
    expect(byId.get("mini_launch_seed_send")?.blockers).not.toContain("asset_build_not_executed");
    expect(byId.get("mini_launch_seed_send")?.blockers).toContain("real_mailerlite_render_qa_missing");
    expect(queue.executiveSummary.readyApprovalIds).not.toContain("mini_launch_email_manual_ui_builder");
    expect(queue.executiveSummary.blockedApprovalIds).not.toContain("mini_launch_email_asset_build");
  });

  test("adds a ready repair boundary when real MailerLite QA finds an exact-copy mismatch", () => {
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
      miniLaunchEmailManualUiDraftRepairPacket,
      miniLaunchShopifyLocalBuildRequest,
      miniLaunchCrmSignalProjectionPacket,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      validationReceipt,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const item = queue.approvalItems.find((approvalItem) => approvalItem.id === "mini_launch_email_manual_ui_draft_repair");

    expect(queue.executiveSummary.readyApprovalIds).toContain("mini_launch_email_manual_ui_draft_repair");
    expect(item).toMatchObject({
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      operationType: "live_mailerlite_ui_existing_draft_copy_repair_after_exact_approval",
      evidence: {
        targetDraftCount: 1,
        missingFragmentCount: 4,
        canRepairNow: false,
        packetIsApprovalByItself: false,
        seedTestQaCanAskApprovalNow: false,
      },
    });
    expect(item?.exactApprovalPhrase).toContain("campaña 188672517160830964");
    expect(item?.stillClosed).toContain("send_email_or_test_email");
  });

  test("keeps resolved manual UI draft repair as reference-only after real QA is green", () => {
    const item = buildMiniLaunchEmailManualUiDraftRepairItem({
      packet: {
        ...miniLaunchEmailManualUiDraftRepairPacket,
        status: "mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed",
        executiveSummary: {
          ...miniLaunchEmailManualUiDraftRepairPacket.executiveSummary,
          canAskAlejandroForApproval: false,
          targetDraftCount: 0,
          missingFragmentCount: 0,
          realMailerLiteRenderQaStatus: "mini_launch_real_mailerlite_render_qa_green_no_live_changes",
        },
        repairTargets: [],
        decision: {
          ...miniLaunchEmailManualUiDraftRepairPacket.decision,
          canAskAlejandroForApproval: false,
          exactApprovalPhrase: null,
        },
      },
    });

    expect(item).toMatchObject({
      status: "reference_only_no_approval_request_now",
      canAskAlejandroNow: false,
      approvalType: "reference_only_completed",
      operationType: "live_mailerlite_ui_existing_draft_copy_repair_already_resolved",
      blockers: [],
      evidence: {
        realMailerLiteRenderQaGreen: true,
        targetDraftCount: 0,
        missingFragmentCount: 0,
      },
    });
    expect(item.exactApprovalPhrase).toBeNull();
  });

  test("blocks repair boundary if packet self-authorizes or reports live actions", () => {
    const item = buildMiniLaunchEmailManualUiDraftRepairItem({
      packet: {
        ...miniLaunchEmailManualUiDraftRepairPacket,
        decision: {
          ...miniLaunchEmailManualUiDraftRepairPacket.decision,
          canRepairNow: true,
        },
        safety: {
          ...miniLaunchEmailManualUiDraftRepairPacket.safety,
          sendsPerformed: true,
        },
      },
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.blockers).toContain("manual_ui_draft_repair_gate_unexpectedly_open");
    expect(item.blockers).toContain("manual_ui_draft_repair_packet_reports_send");
  });

  test("marks seed inbox correction UI edit as the next exact approval boundary", () => {
    const item = buildMiniLaunchSeedInboxCorrectionUiEditItem({
      packet: miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
    });

    expect(item).toMatchObject({
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      id: "mini_launch_seed_inbox_correction_ui_edit",
      operationType: "live_mailerlite_ui_existing_draft_correction_edit_after_exact_approval",
      targetCount: 4,
      evidence: {
        localRenderReady: true,
        redCheckCount: 0,
        publicAudienceSendUrlGateReady: false,
        exactUrlsStoredInReport: false,
        sendsPerformed: false,
      },
    });
    expect(item.exactApprovalPhrase).toContain("sin enviar correos");
    expect(item.stillClosed).toContain("test_send_or_seed_send");
  });

  test("marks seed send ready only from a private seed-send approval packet", () => {
    const item = buildMiniLaunchSeedSendItem({
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      manualUiReceipt: miniLaunchEmailManualUiBuildReceipt,
      seedTestQaPacket: miniLaunchSeedTestQaPacket,
      seedSendApprovalPacket: miniLaunchSeedSendApprovalPacket,
    });

    expect(item).toMatchObject({
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      approvalType: "exact_phrase_required",
      operationType: "mailerLite_seed_send_after_later_exact_approval",
      evidence: {
        manualUiDraftsBuilt: true,
        seedSendApprovalPacketStatus: "seed_send_approval_packet_ready_for_exact_human_approval_no_live_changes",
        seedRecipientRedacted: "se…@example.com",
        privateSeedApprovalPacketReady: true,
      },
    });
    expect(item.exactApprovalPhrase).toContain("seed@example.com");
    expect(item.allowedAfterExactApproval).toContain("send test emails only from the four existing mini-launch draft campaigns to the exact seed recipient");
    expect(item.stillClosed).toContain("public_or_audience_send");
  });

  test("keeps seed send blocked when private seed packet is still waiting for recipient", () => {
    const item = buildMiniLaunchSeedSendItem({
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      manualUiReceipt: miniLaunchEmailManualUiBuildReceipt,
      seedTestQaPacket: miniLaunchSeedTestQaPacket,
      seedSendApprovalPacket: {
        ...miniLaunchSeedSendApprovalPacket,
        status: "seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes",
        seedIdentity: {
          supplied: false,
          redactedEmail: null,
        },
        approvalBoundary: {
          ...miniLaunchSeedSendApprovalPacket.approvalBoundary,
          canAskAlejandroForApproval: false,
          exactApprovalPhrase: null,
        },
      },
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.blockers).toEqual(["exact_seed_recipient_missing"]);
    expect(item.exactApprovalPhrase).toBeNull();
  });

  test("uses CRM write approval packet blockers once the packet exists", () => {
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
      miniLaunchCrmWriteApprovalPacket,
      brujulaEmailStyleCorrection,
      brujulaEmailRenderQa,
      validationReceipt,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    const item = queue.approvalItems.find((approvalItem) => approvalItem.id === "crm_signal_writes");

    expect(item).toMatchObject({
      status: "prepared_but_blocked_before_approval_request",
      canAskAlejandroNow: false,
      targetCount: 4,
      evidence: {
        writeApprovalPacketPresent: true,
        writeApprovalPacketStatus: "crm_write_approval_packet_blocked_missing_observed_events_no_live_changes",
        exactEventCountReady: 0,
        exactPersonCountReady: 0,
        candidateWriteFamilyCount: 4,
        writePolicyPacketReady: true,
        policyBlockersResolved: [
          "card_write_policy_packet_missing",
          "identity_stitching_packet_missing",
        ],
        policyBlockersStillOpen: [],
        operationsExecuted: 0,
      },
    });
    expect(item?.blockers).toContain("real_observed_event_file_missing");
    expect(item?.blockers).not.toContain("separate_crm_write_approval_packet_missing");
    expect(item?.requiredFreshEvidence.join(" ")).toContain("real observed-events file");
    expect(item?.notes.join(" ")).toContain("CRM write policy packet is ready and consumed");
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

  test("marks Shopify preview route ready only from a confirmed approval packet", () => {
    const item = buildShopifyPreviewRouteItem({
      decision: miniLaunchShopifyPreviewRouteDecision,
      approvalPacket: miniLaunchShopifyPreviewRouteApprovalPacket,
    });

    expect(item).toMatchObject({
      id: "shopify_unlisted_noindex_preview_route",
      status: "ready_for_exact_approval_request",
      canAskAlejandroNow: true,
      approvalType: "exact_phrase_required",
      operationType: "live_shopify_preview_route_after_exact_approval",
      targetCount: 3,
      evidence: {
        decisionReady: true,
        approvalPacketReady: true,
        recommendedVisibilityTier: "unlisted_noindex_preview",
        humanDecisionConfirmed: true,
        exactApprovalPhraseAvailable: true,
        canExecuteNow: false,
        publicAudienceSendUrlGateReady: false,
      },
    });
    expect(item.exactApprovalPhrase).toContain("preview route");
    expect(item.stillClosed).toContain("audience_launch_or_public_send");
    expect(item.commandAfterApproval).toContain("future Shopify preview-route execution");
  });

  test("keeps Shopify preview route blocked if the decision is not confirmed into an approval packet", () => {
    const item = buildShopifyPreviewRouteItem({
      decision: miniLaunchShopifyPreviewRouteDecision,
      approvalPacket: null,
    });

    expect(item.status).toBe("prepared_but_blocked_before_approval_request");
    expect(item.canAskAlejandroNow).toBe(false);
    expect(item.exactApprovalPhrase).toBeNull();
    expect(item.blockers).toContain("shopify_preview_route_confirmation_or_approval_packet_missing");
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
