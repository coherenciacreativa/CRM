#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  EXPECTED_E04_RESEND_APPROVAL_PHRASE,
} from './crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-approval-queue-2026-05-31';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_post_execution_verify_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_EXECUTED_retry_with_validation_detail_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_builder_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_draft_repair_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_UI_EDIT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_MAILERLITE_API_INERT_DRAFT_LAB = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_MAILERLITE_API_NULL_AUDIENCE_LAB = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_MAILERLITE_API_EXISTING_DRAFT_UPDATE_STRATEGY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_existing_draft_update_strategy_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_SEND_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_send_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_execution_receipt_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_TEST_SEND_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_INBOX_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_request_inteligencia_descansar_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_DECISION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_BRUJULA_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_render_qa_packet_2026-05-27.json';
const DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_real_mailerlite_render_qa_2026-05-28.json';
const DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-approval-queue.mjs [options]

Options:
  --mini-launch-empty-group-packet <path>         Mini-launch empty-group approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET}
  --mini-launch-empty-group-create-dry-run <path> Mini-launch empty-group create dry-run. Defaults to ${DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN}
  --onboarding-v2-empty-groups-packet <path>      Onboarding v2 empty-groups approval packet. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET}
  --onboarding-v2-empty-groups-create-dry-run <path> Onboarding v2 empty-groups create dry-run. Defaults to ${DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN}
  --mini-launch-email-asset-build-scope-packet <path> Mini-launch email asset-build scope packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --mini-launch-email-builder-payload-manifest <path> Mini-launch email builder payload manifest. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST}
  --mini-launch-email-render-qa <path>         Mini-launch local email render QA packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA}
  --mini-launch-email-asset-build-dry-run <path> Mini-launch email asset-build dry-run. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN}
  --mini-launch-email-asset-build-execution <path> Mini-launch email asset-build execution attempt. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION}
  --mini-launch-email-manual-ui-builder-packet <path> Mini-launch manual UI builder fallback packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET}
  --mini-launch-email-manual-ui-build-receipt <path> Mini-launch manual UI post-build receipt. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --mini-launch-email-manual-ui-draft-repair-packet <path> Mini-launch manual UI draft repair approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET}
  --mini-launch-seed-inbox-correction-ui-edit-approval-packet <path> Mini-launch seed inbox correction UI edit approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_UI_EDIT_APPROVAL_PACKET}
  --mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet <path> Mini-launch unsafe API replacement cleanup approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_APPROVAL_PACKET}
  --mini-launch-seed-inbox-correction-api-replacement-cleanup-execution-receipt <path> Mini-launch unsafe API replacement cleanup execution receipt. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_EXECUTION_RECEIPT}
  --mini-launch-mailerlite-api-inert-draft-lab <path> Mini-launch MailerLite API inert draft lab packet or receipt. Defaults to ${DEFAULT_MINI_LAUNCH_MAILERLITE_API_INERT_DRAFT_LAB}
  --mini-launch-mailerlite-api-null-audience-lab <path> Mini-launch MailerLite API Null Audience lab packet or receipt. Defaults to ${DEFAULT_MINI_LAUNCH_MAILERLITE_API_NULL_AUDIENCE_LAB}
  --mini-launch-null-audience-replacement-approval-packet <path> Mini-launch Null Audience replacement approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_APPROVAL_PACKET}
  --mini-launch-null-audience-replacement-execution-receipt <path> Mini-launch Null Audience replacement execution receipt. Defaults to ${DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT}
  --mini-launch-mailerlite-api-existing-draft-update-strategy <path> Mini-launch MailerLite API existing draft update strategy packet. Defaults to ${DEFAULT_MINI_LAUNCH_MAILERLITE_API_EXISTING_DRAFT_UPDATE_STRATEGY}
  --mini-launch-seed-test-qa-packet <path> Mini-launch seed/test QA preflight packet. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET}
  --mini-launch-seed-send-approval-packet <path> Mini-launch private seed-send approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_SEND_APPROVAL_PACKET}
  --mini-launch-seed-test-execution-receipt <path> Completed seed/test execution receipt. Defaults to ${DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT}
  --mini-launch-null-audience-seed-test-send-execution-receipt <path> Completed Null Audience seed/test send receipt. Defaults to ${DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_TEST_SEND_EXECUTION_RECEIPT}
  --mini-launch-null-audience-seed-inbox-qa <path> Null Audience seed inbox QA report. Defaults to ${DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_INBOX_QA}
  --mini-launch-shopify-local-build-request <path> Shopify no-live local build request. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST}
  --mini-launch-shopify-local-build-receipt <path> Shopify no-live local build receipt. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --mini-launch-shopify-preview-route-decision <path> Shopify preview-route decision packet. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_DECISION}
  --mini-launch-shopify-preview-route-approval-packet <path> Shopify preview-route approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_APPROVAL_PACKET}
  --mini-launch-shopify-preview-route-execution-receipt <path> Shopify preview-route execution receipt. Defaults to ${DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --mini-launch-crm-signal-projection-packet <path> CRM signal projection packet. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET}
  --mini-launch-crm-write-approval-packet <path> CRM write approval packet. Defaults to ${DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET}
  --brujula-email-style-correction <path>         Brújula corrected Email 1 packet. Defaults to ${DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION}
  --brujula-email-render-qa <path>                Brújula local render QA packet. Defaults to ${DEFAULT_BRUJULA_EMAIL_RENDER_QA}
  --brujula-real-mailerlite-render-qa <path>      Brújula real MailerLite draft render QA. Defaults to ${DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA}
  --brujula-email-manual-ui-build-receipt <path>  Brújula Email 1 manual UI build receipt. Defaults to ${DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT}
  --validation-receipt <path>                     Validation receipt. Defaults to ${DEFAULT_VALIDATION_RECEIPT}
  --out <path>                                    Write JSON queue
  --markdown-out <path>                           Write Markdown queue
  --help                                          Show this help

Local-only approval queue for MailerLite Launch OS v0. It consolidates exact
human approval boundaries from existing reports. It never approves anything by
itself, calls MailerLite/Shopify/CRM live APIs, reads subscribers, creates
groups, edits workflows, sends email, appends ledgers, writes cards, changes
scoring, touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    miniLaunchEmptyGroupPacket: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_PACKET,
    miniLaunchEmptyGroupCreateDryRun: DEFAULT_MINI_LAUNCH_EMPTY_GROUP_CREATE_DRY_RUN,
    onboardingV2EmptyGroupsPacket: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_PACKET,
    onboardingV2EmptyGroupsCreateDryRun: DEFAULT_ONBOARDING_V2_EMPTY_GROUPS_CREATE_DRY_RUN,
    miniLaunchEmailAssetBuildScopePacket: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    miniLaunchEmailBuilderPayloadManifest: DEFAULT_MINI_LAUNCH_EMAIL_BUILDER_PAYLOAD_MANIFEST,
    miniLaunchEmailRenderQa: DEFAULT_MINI_LAUNCH_EMAIL_RENDER_QA,
    miniLaunchEmailAssetBuildDryRun: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_DRY_RUN,
    miniLaunchEmailAssetBuildExecution: DEFAULT_MINI_LAUNCH_EMAIL_ASSET_BUILD_EXECUTION,
    miniLaunchEmailManualUiBuilderPacket: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILDER_PACKET,
    miniLaunchEmailManualUiBuildReceipt: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_BUILD_RECEIPT,
    miniLaunchEmailManualUiDraftRepairPacket: DEFAULT_MINI_LAUNCH_EMAIL_MANUAL_UI_DRAFT_REPAIR_PACKET,
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket: DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_UI_EDIT_APPROVAL_PACKET,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket: DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_APPROVAL_PACKET,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt: DEFAULT_MINI_LAUNCH_SEED_INBOX_CORRECTION_API_REPLACEMENT_CLEANUP_EXECUTION_RECEIPT,
    miniLaunchMailerLiteApiInertDraftLab: DEFAULT_MINI_LAUNCH_MAILERLITE_API_INERT_DRAFT_LAB,
    miniLaunchMailerLiteApiNullAudienceLab: DEFAULT_MINI_LAUNCH_MAILERLITE_API_NULL_AUDIENCE_LAB,
    miniLaunchNullAudienceReplacementApprovalPacket: DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_APPROVAL_PACKET,
    miniLaunchNullAudienceReplacementExecutionReceipt: DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy: DEFAULT_MINI_LAUNCH_MAILERLITE_API_EXISTING_DRAFT_UPDATE_STRATEGY,
    miniLaunchSeedTestQaPacket: DEFAULT_MINI_LAUNCH_SEED_TEST_QA_PACKET,
    miniLaunchSeedSendApprovalPacket: DEFAULT_MINI_LAUNCH_SEED_SEND_APPROVAL_PACKET,
    miniLaunchSeedTestExecutionReceipt: DEFAULT_MINI_LAUNCH_SEED_TEST_EXECUTION_RECEIPT,
    miniLaunchNullAudienceSeedTestSendExecutionReceipt: DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_TEST_SEND_EXECUTION_RECEIPT,
    miniLaunchNullAudienceSeedInboxQa: DEFAULT_MINI_LAUNCH_NULL_AUDIENCE_SEED_INBOX_QA,
    miniLaunchShopifyLocalBuildRequest: DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_REQUEST,
    miniLaunchShopifyLocalBuildReceipt: DEFAULT_MINI_LAUNCH_SHOPIFY_LOCAL_BUILD_RECEIPT,
    miniLaunchShopifyPreviewRouteDecision: DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_DECISION,
    miniLaunchShopifyPreviewRouteApprovalPacket: DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_APPROVAL_PACKET,
    miniLaunchShopifyPreviewRouteExecutionReceipt: DEFAULT_MINI_LAUNCH_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    miniLaunchCrmSignalProjectionPacket: DEFAULT_MINI_LAUNCH_CRM_SIGNAL_PROJECTION_PACKET,
    miniLaunchCrmWriteApprovalPacket: DEFAULT_MINI_LAUNCH_CRM_WRITE_APPROVAL_PACKET,
    brujulaEmailStyleCorrection: DEFAULT_BRUJULA_EMAIL_STYLE_CORRECTION,
    brujulaEmailRenderQa: DEFAULT_BRUJULA_EMAIL_RENDER_QA,
    brujulaRealMailerLiteRenderQa: DEFAULT_BRUJULA_REAL_MAILERLITE_RENDER_QA,
    brujulaEmailManualUiBuildReceipt: DEFAULT_BRUJULA_EMAIL_MANUAL_UI_BUILD_RECEIPT,
    validationReceipt: DEFAULT_VALIDATION_RECEIPT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--mini-launch-empty-group-packet') options.miniLaunchEmptyGroupPacket = argv[++index];
    else if (arg === '--mini-launch-empty-group-create-dry-run') options.miniLaunchEmptyGroupCreateDryRun = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-packet') options.onboardingV2EmptyGroupsPacket = argv[++index];
    else if (arg === '--onboarding-v2-empty-groups-create-dry-run') options.onboardingV2EmptyGroupsCreateDryRun = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-scope-packet') options.miniLaunchEmailAssetBuildScopePacket = argv[++index];
    else if (arg === '--mini-launch-email-builder-payload-manifest') options.miniLaunchEmailBuilderPayloadManifest = argv[++index];
    else if (arg === '--mini-launch-email-render-qa') options.miniLaunchEmailRenderQa = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-dry-run') options.miniLaunchEmailAssetBuildDryRun = argv[++index];
    else if (arg === '--mini-launch-email-asset-build-execution') options.miniLaunchEmailAssetBuildExecution = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-builder-packet') options.miniLaunchEmailManualUiBuilderPacket = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-build-receipt') options.miniLaunchEmailManualUiBuildReceipt = argv[++index];
    else if (arg === '--mini-launch-email-manual-ui-draft-repair-packet') options.miniLaunchEmailManualUiDraftRepairPacket = argv[++index];
    else if (arg === '--mini-launch-seed-inbox-correction-ui-edit-approval-packet') options.miniLaunchSeedInboxCorrectionUiEditApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet') options.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-seed-inbox-correction-api-replacement-cleanup-execution-receipt') options.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-mailerlite-api-inert-draft-lab') options.miniLaunchMailerLiteApiInertDraftLab = argv[++index];
    else if (arg === '--mini-launch-mailerlite-api-null-audience-lab') options.miniLaunchMailerLiteApiNullAudienceLab = argv[++index];
    else if (arg === '--mini-launch-null-audience-replacement-approval-packet') options.miniLaunchNullAudienceReplacementApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-null-audience-replacement-execution-receipt') options.miniLaunchNullAudienceReplacementExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-mailerlite-api-existing-draft-update-strategy') options.miniLaunchMailerLiteApiExistingDraftUpdateStrategy = argv[++index];
    else if (arg === '--mini-launch-seed-test-qa-packet') options.miniLaunchSeedTestQaPacket = argv[++index];
    else if (arg === '--mini-launch-seed-send-approval-packet') options.miniLaunchSeedSendApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-seed-test-execution-receipt') options.miniLaunchSeedTestExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-null-audience-seed-test-send-execution-receipt') options.miniLaunchNullAudienceSeedTestSendExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-null-audience-seed-inbox-qa') options.miniLaunchNullAudienceSeedInboxQa = argv[++index];
    else if (arg === '--mini-launch-shopify-local-build-request') options.miniLaunchShopifyLocalBuildRequest = argv[++index];
    else if (arg === '--mini-launch-shopify-local-build-receipt') options.miniLaunchShopifyLocalBuildReceipt = argv[++index];
    else if (arg === '--mini-launch-shopify-preview-route-decision') options.miniLaunchShopifyPreviewRouteDecision = argv[++index];
    else if (arg === '--mini-launch-shopify-preview-route-approval-packet') options.miniLaunchShopifyPreviewRouteApprovalPacket = argv[++index];
    else if (arg === '--mini-launch-shopify-preview-route-execution-receipt') options.miniLaunchShopifyPreviewRouteExecutionReceipt = argv[++index];
    else if (arg === '--mini-launch-crm-signal-projection-packet') options.miniLaunchCrmSignalProjectionPacket = argv[++index];
    else if (arg === '--mini-launch-crm-write-approval-packet') options.miniLaunchCrmWriteApprovalPacket = argv[++index];
    else if (arg === '--brujula-email-style-correction') options.brujulaEmailStyleCorrection = argv[++index];
    else if (arg === '--brujula-email-render-qa') options.brujulaEmailRenderQa = argv[++index];
    else if (arg === '--brujula-real-mailerlite-render-qa') options.brujulaRealMailerLiteRenderQa = argv[++index];
    else if (arg === '--brujula-email-manual-ui-build-receipt') options.brujulaEmailManualUiBuildReceipt = argv[++index];
    else if (arg === '--validation-receipt') options.validationReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
    const raw = await readFile(resolved, 'utf8');
    return {
      value: JSON.parse(raw),
      digest: {
        path: resolved,
        present: true,
        chars: raw.length,
        consultedFor,
      },
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        chars: 0,
        consultedFor,
      },
    };
  }
};

const targetNamesFrom = (...values) => [...new Set(values
  .flatMap((value) => Array.isArray(value) ? value : [])
  .map((row) => typeof row === 'string'
    ? cleanString(row)
    : cleanString(row?.name ?? row?.draftName ?? row?.mailerLiteAssetNameDraft ?? row?.path))
  .filter(Boolean))];

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const itemStatusFor = ({ canAskNow, blockers }) => {
  if (canAskNow) return 'ready_for_exact_approval_request';
  if ((blockers ?? []).length > 0) return 'prepared_but_blocked_before_approval_request';
  return 'reference_only_no_approval_request_now';
};

const buildApprovalItem = ({
  id,
  title,
  lane,
  operationType,
  approvalType,
  canAskNow,
  exactApprovalPhrase,
  sourceStatuses,
  targetNames = [],
  allowedAfterExactApproval = [],
  stillClosed = [],
  requiredFreshEvidence = [],
  blockers = [],
  evidence = {},
  commandAfterApproval = null,
  notes = [],
}) => {
  const phrase = cleanString(exactApprovalPhrase);

  return {
    id,
    title,
    lane,
    operationType,
    approvalType,
    status: itemStatusFor({ canAskNow, blockers }),
    canAskAlejandroNow: canAskNow,
    exactApprovalPhrase: canAskNow ? phrase : null,
    exactApprovalPhrasePresent: Boolean(phrase),
    packetIsApprovalByItself: false,
    targetCount: targetNames.length,
    targetNames,
    sourceStatuses,
    allowedAfterExactApproval,
    stillClosed,
    requiredFreshEvidence,
    blockers,
    evidence,
    commandAfterApproval,
    notes,
  };
};

const buildMiniLaunchEmptyGroupItem = ({ packet, dryRun }) => {
  const targetNames = targetNamesFrom(packet?.targetGroups);
  const blockers = [];
  const packetReadyForApproval = packet?.status === 'ready_for_exact_human_approval_to_create_mini_launch_empty_groups';
  const packetReferenceAlreadyCompleted = packet?.status === 'reference_only_empty_group_creation_already_completed';
  const targetGroupsAlreadyExist = dryRun?.status === 'dry_run_no_create_needed_targets_already_exist'
    || (
      dryRun?.freshScan?.targetGroupsMissingCount === 0
      && dryRun?.freshScan?.targetGroupsExistingCount === targetNames.length
      && targetNames.length > 0
    );

  if (!targetGroupsAlreadyExist && !packetReadyForApproval) {
    blockers.push(`mini_launch_empty_group_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (targetGroupsAlreadyExist && !packetReadyForApproval && !packetReferenceAlreadyCompleted) {
    blockers.push(`mini_launch_empty_group_packet_not_reference_or_ready:${packet?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && dryRun?.status !== 'dry_run_ready_for_exact_approval') {
    blockers.push(`mini_launch_empty_group_create_dry_run_not_ready:${dryRun?.status ?? 'missing'}`);
  }
  if (countRows(dryRun?.createdGroups) !== 0) blockers.push('dry_run_unexpectedly_reports_created_groups');
  if (!targetGroupsAlreadyExist && !cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_target_groups');

  const canAskNow = !targetGroupsAlreadyExist
    && blockers.length === 0
    && packet?.decision?.canAskAlejandroForApproval === true;

  return buildApprovalItem({
    id: 'mini_launch_empty_group_creation',
    title: 'Mini-launch empty MailerLite groups',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: targetGroupsAlreadyExist
      ? 'live_mailerlite_group_creation_already_completed'
      : 'live_mailerlite_group_creation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase,
    sourceStatuses: {
      approvalPacket: packet?.status ?? null,
      dryRun: dryRun?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.approvalBoundary?.stillClosedEvenAfterThisApproval ?? [],
    requiredFreshEvidence: packet?.approvalBoundary?.requiredBeforeAnyExecutorRun ?? [],
    blockers,
    evidence: {
      sourceDryRunGroupsRead: packet?.safety?.sourceDryRunMailerLiteGroupsRead ?? dryRun?.safety?.mailerLiteGroupsRead ?? null,
      targetMissingCount: dryRun?.freshScan?.targetGroupsMissingCount ?? targetNames.length,
      targetExistingCount: dryRun?.freshScan?.targetGroupsExistingCount ?? null,
      targetGroupsAlreadyExist,
      mutationsPerformed: dryRun?.safety?.mailerLiteMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-empty-group-create -- --execute --approval-phrase "<exact phrase>"',
    notes: [
      targetGroupsAlreadyExist
        ? 'The two named empty groups already exist; no new approval request is needed for this boundary.'
        : 'Approval covers only the two named empty groups.',
      'No subscribers, workflows, sends, onboarding route or Shopify/CRM action is included.',
    ],
  });
};

const buildOnboardingV2EmptyGroupItem = ({ packet, dryRun }) => {
  const targetNames = targetNamesFrom(packet?.targetPlan, dryRun?.decision?.targetPlan);
  const targetPlan = dryRun?.decision?.targetPlan ?? packet?.targetPlan ?? [];
  const executionCompleted = dryRun?.status === 'executed_onboarding_v2_empty_group_creation'
    && countRows(dryRun?.createdGroups) === targetNames.length
    && targetNames.length > 0;
  const postExecutionAllExist = targetNames.length > 0
    && targetPlan.length === targetNames.length
    && targetPlan.every((target) => target?.existsInFreshScan === true);
  const targetGroupsAlreadyExist = executionCompleted || postExecutionAllExist;
  const blockers = [];

  if (!targetGroupsAlreadyExist && packet?.status !== 'ready_for_exact_human_approval_to_create_empty_groups') {
    blockers.push(`onboarding_v2_empty_groups_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && dryRun?.status !== 'dry_run_ready_for_exact_approval') {
    blockers.push(`onboarding_v2_empty_groups_create_dry_run_not_ready:${dryRun?.status ?? 'missing'}`);
  }
  if (!targetGroupsAlreadyExist && countRows(dryRun?.createdGroups) !== 0) blockers.push('dry_run_unexpectedly_reports_created_groups');
  if (!targetGroupsAlreadyExist && !cleanString(packet?.approvalGate?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_target_groups');

  const canAskNow = !targetGroupsAlreadyExist
    && blockers.length === 0
    && packet?.approvalGate?.canAskAlejandroForApproval === true;

  return buildApprovalItem({
    id: 'onboarding_v2_empty_group_creation',
    title: 'Onboarding v2 empty MailerLite groups',
    lane: 'onboarding_v2',
    operationType: targetGroupsAlreadyExist
      ? 'live_mailerlite_group_creation_already_completed'
      : 'live_mailerlite_group_creation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.approvalGate?.exactApprovalPhrase,
    sourceStatuses: {
      approvalPacket: packet?.status ?? null,
      dryRun: dryRun?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: ['create_only_the_named_empty_onboarding_v2_groups_after_fresh_rescan'],
    stillClosed: [
      'onboarding_v1_changes',
      'workflow_or_automation_activation',
      'subscriber_assignment_or_import',
      'sends',
      'mini_launch_routing',
      'crm_writes',
      'fact_store_write',
    ],
    requiredFreshEvidence: [
      'rerun onboarding v2 empty-groups packet or fresh create dry-run',
      'confirm all target groups are still missing',
      'confirm Onboarding v1 remains untouched',
      'provide exact approval phrase unchanged',
    ],
    blockers,
    evidence: {
      targetCount: targetNames.length,
      liveGroupsRead: dryRun?.packetSummary?.liveGroupsRead ?? packet?.sourceEvidence?.liveGroupCount ?? null,
      liveAutomationsRead: dryRun?.packetSummary?.liveAutomationsRead ?? packet?.sourceEvidence?.liveAutomationCount ?? null,
      targetGroupsAlreadyExist,
      createdCount: countRows(dryRun?.createdGroups),
      mutationsPerformed: dryRun?.safety?.groupMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-onboarding-v2-empty-groups-create -- --execute --approval-phrase "<exact phrase>"',
    notes: [
      targetGroupsAlreadyExist
        ? 'The twelve named empty groups already exist; no new approval request is needed for this boundary.'
        : 'Approval covers empty group creation only.',
      'It is not permission to build or switch the Onboarding v2 workflow.',
    ],
  });
};

const executionHasAdvancedPlanContentBlocker = (executionAttempt) =>
  (executionAttempt?.errors ?? []).some((error) =>
    (error?.details ?? []).some((detail) =>
      /content submission is only available on advanced plan/i.test(cleanString(detail?.message) ?? ''),
    ),
  );

const manualUiReceiptCompleted = (receipt, targetNames) =>
  receipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
  && receipt?.executiveSummary?.createdOrEditedDraftCount === targetNames.length
  && targetNames.length === 4
  && receipt?.executiveSummary?.sendCount === 0
  && receipt?.executiveSummary?.scheduleCount === 0
  && receipt?.executiveSummary?.subscriberReadOrAssignmentCount === 0
  && receipt?.executiveSummary?.groupAssignmentCount === 0
  && receipt?.executiveSummary?.workflowAttachmentCount === 0
  && receipt?.executiveSummary?.outboxCountAfterBuild === 0
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false;

const buildMiniLaunchEmailAssetBuildItem = ({
  scopePacket,
  payloadManifest,
  renderQa = null,
  dryRun = null,
  executionAttempt = null,
  manualUiReceipt = null,
  manualUiDraftRepairPacket = null,
}) => {
  const targetNames = targetNamesFrom(scopePacket?.assetBuildScope?.assets, payloadManifest?.payloads);
  const executionStatus = executionAttempt?.status ?? null;
  const executionAttemptPresent = Boolean(executionAttempt);
  const executionMutations = countRows(executionAttempt?.assetMutations);
  const executionErrors = executionAttempt?.errors ?? [];
  const executionAdvancedPlanBlocker = executionHasAdvancedPlanContentBlocker(executionAttempt);
  const manualUiCompleted = manualUiReceiptCompleted(manualUiReceipt, targetNames);
  const executionCompleted = executionStatus === 'executed_mini_launch_email_asset_build'
    && executionMutations === targetNames.length
    && executionAttempt?.safety?.mailerLiteAssetsCreatedOrEdited === true
    && executionAttempt?.safety?.sendsPerformed === false
    && executionAttempt?.safety?.subscribersRead === false
    && executionAttempt?.safety?.groupsCreatedOrAssigned === false
    && executionAttempt?.safety?.workflowMutationsPerformed === false;

  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_email_asset_build',
      title: 'Mini-launch MailerLite draft email assets',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_builder_draft_mutation_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        scopePacket: scopePacket?.status ?? null,
        payloadManifest: payloadManifest?.status ?? null,
        renderQa: renderQa?.status ?? null,
        dryRun: dryRun?.status ?? null,
        executionAttempt: executionStatus,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval ?? payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval ?? [],
      requiredFreshEvidence: [
        'run real MailerLite builder/render QA before any seed-send approval request',
        'confirm exact seed recipient before any test send',
      ],
      blockers: [],
      evidence: {
        executionAttemptStatus: executionStatus,
        assetMutationCount: executionMutations,
        createdOrEditedDrafts: true,
        sendsPerformed: executionAttempt?.safety?.sendsPerformed ?? null,
        subscribersRead: executionAttempt?.safety?.subscribersRead ?? null,
        groupsCreatedOrAssigned: executionAttempt?.safety?.groupsCreatedOrAssigned ?? null,
        workflowMutationsPerformed: executionAttempt?.safety?.workflowMutationsPerformed ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The approved draft asset-build boundary has already been used.',
        'Seed send remains a separate later approval after real MailerLite render QA.',
      ],
    });
  }

  if (manualUiCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_email_asset_build',
      title: 'Mini-launch MailerLite draft email assets',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_api_builder_draft_mutation_superseded_by_manual_ui_route',
      approvalType: 'reference_only_superseded',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        scopePacket: scopePacket?.status ?? null,
        payloadManifest: payloadManifest?.status ?? null,
        renderQa: renderQa?.status ?? null,
        dryRun: dryRun?.status ?? null,
        executionAttempt: executionStatus,
        manualUiReceipt: manualUiReceipt?.status ?? null,
        manualUiDraftRepairPacket: manualUiDraftRepairPacket?.status ?? null,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: manualUiReceipt?.stillClosedAfterThisReceipt
        ?? scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval
        ?? payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval
        ?? [],
      requiredFreshEvidence: [
        'use the manual UI build receipt and real MailerLite render QA as current asset evidence',
        'confirm exact seed recipient before any test send',
      ],
      blockers: [],
      evidence: {
        apiAssetBuildSupersededByManualUi: true,
        manualUiReceiptStatus: manualUiReceipt.status,
        manualUiCreatedOrEditedDraftCount: manualUiReceipt.executiveSummary.createdOrEditedDraftCount,
        manualUiOutboxCountAfterBuild: manualUiReceipt.executiveSummary.outboxCountAfterBuild,
        manualUiUsedEditor: manualUiReceipt.executiveSummary.usedEditor,
        executionAttemptStatus: executionStatus,
        executionAssetMutationCount: executionMutations,
        executionAdvancedPlanContentBlocker: executionAdvancedPlanBlocker,
        realMailerLiteRenderQaGreen: manualUiDraftRepairPacket?.executiveSummary?.realMailerLiteRenderQaStatus === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes',
        repairPacketStatus: manualUiDraftRepairPacket?.status ?? null,
        sendsPerformed: manualUiReceipt.safety?.sendsPerformed ?? null,
        groupsCreatedOrAssigned: manualUiReceipt.safety?.groupsCreatedOrAssigned ?? null,
        workflowMutationsPerformed: manualUiReceipt.safety?.workflowMutationsPerformed ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The API asset-build boundary is retained as historical evidence only; the approved manual UI draft build is the current asset route.',
        'The Advanced/API blocker should not be treated as a live operating blocker while manual UI remains the chosen route.',
        'Revisit Advanced/API only when launch frequency or subscriber-tier economics justify the upgrade.',
        'Seed send remains a separate later approval after real MailerLite render QA and an exact seed recipient.',
      ],
    });
  }

  const blockers = [];

  if (scopePacket?.status !== 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`email_asset_build_scope_packet_not_ready:${scopePacket?.status ?? 'missing'}`);
  }
  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    blockers.push(`email_builder_payload_manifest_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (scopePacket?.requestedFutureScope?.canAskAlejandroForApproval !== true) {
    blockers.push('scope_packet_cannot_ask_approval_now');
  }
  if (scopePacket?.requestedFutureScope?.canExecuteBuildNow !== false) {
    blockers.push('scope_packet_build_gate_unexpectedly_open');
  }
  if (payloadManifest?.approvalBoundary?.canExecuteBuilderNow !== false) {
    blockers.push('payload_manifest_build_gate_unexpectedly_open');
  }
  if (renderQa) {
    if (renderQa.status !== 'mini_launch_email_render_qa_green_no_live_changes') {
      blockers.push(`email_render_qa_not_green:${renderQa.status ?? 'missing'}`);
    }
    if (renderQa.executiveSummary?.localRenderReady !== true) blockers.push('email_render_qa_local_render_not_ready');
    if (renderQa.executiveSummary?.publicUseReady !== false) blockers.push('email_render_qa_public_gate_unexpectedly_open');
    if (renderQa.executiveSummary?.seedSendReady !== false) blockers.push('email_render_qa_seed_send_gate_unexpectedly_open');
    if (renderQa.safety?.mailerLiteApiCalled !== false) blockers.push('email_render_qa_reports_mailerlite_api_call');
    if (renderQa.safety?.sendsPerformed !== false) blockers.push('email_render_qa_reports_send');
  } else {
    blockers.push('email_render_qa_missing');
  }
  if (dryRun) {
    if (dryRun.status !== 'dry_run_ready_for_exact_asset_build_approval') {
      blockers.push(`email_asset_build_dry_run_not_ready:${dryRun.status ?? 'missing'}`);
    }
    if ((dryRun.freshScan?.conflictCount ?? 0) > 0) blockers.push('email_asset_build_dry_run_has_campaign_conflicts');
    if (countRows(dryRun.assetMutations) !== 0) blockers.push('dry_run_unexpectedly_reports_asset_mutations');
    if (dryRun.safety?.mailerLiteMutationsPerformed !== false) blockers.push('dry_run_reports_mailerlite_mutation');
    if (dryRun.safety?.mailerLiteAssetsCreatedOrEdited !== false) blockers.push('dry_run_reports_asset_create_or_edit');
    if (dryRun.safety?.sendsPerformed !== false) blockers.push('dry_run_reports_send');
    if (dryRun.safety?.subscribersRead !== false) blockers.push('dry_run_reports_subscriber_read');
    if (dryRun.safety?.groupsCreatedOrAssigned !== false) blockers.push('dry_run_reports_group_create_or_assignment');
  }
  if (executionAttemptPresent) {
    if (executionStatus === 'failed_during_mini_launch_email_asset_build') {
      blockers.push(executionAdvancedPlanBlocker
        ? 'mailerlite_api_content_submission_requires_advanced_plan'
        : 'email_asset_build_execution_attempt_failed');
    } else if (executionStatus && executionStatus !== 'dry_run_ready_for_exact_asset_build_approval') {
      blockers.push(`email_asset_build_execution_attempt_not_completed:${executionStatus}`);
    }
    if (executionMutations > 0 && executionStatus !== 'executed_mini_launch_email_asset_build') {
      blockers.push('email_asset_build_partial_mutation_requires_manual_reconciliation');
    }
    if (executionAttempt?.safety?.sendsPerformed !== false) blockers.push('execution_attempt_reports_send');
    if (executionAttempt?.safety?.subscribersRead !== false) blockers.push('execution_attempt_reports_subscriber_read');
    if (executionAttempt?.safety?.groupsCreatedOrAssigned !== false) blockers.push('execution_attempt_reports_group_create_or_assignment');
    if (executionAttempt?.safety?.workflowMutationsPerformed !== false) blockers.push('execution_attempt_reports_workflow_mutation');
  }
  if (!cleanString(scopePacket?.requestedFutureScope?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length === 0) blockers.push('missing_asset_targets');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_email_asset_build',
    title: 'Mini-launch MailerLite draft email assets',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_builder_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: scopePacket?.requestedFutureScope?.exactApprovalPhrase,
    sourceStatuses: {
      scopePacket: scopePacket?.status ?? null,
      payloadManifest: payloadManifest?.status ?? null,
      renderQa: renderQa?.status ?? null,
      dryRun: dryRun?.status ?? null,
      executionAttempt: executionStatus,
    },
    targetNames,
    allowedAfterExactApproval: scopePacket?.requestedFutureScope?.allowedAfterExactApproval ?? [],
    stillClosed: scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval ?? payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval ?? [],
    requiredFreshEvidence: scopePacket?.preExecutionChecklist ?? [],
    blockers,
    evidence: {
      assetCount: scopePacket?.executiveSummary?.assetCount ?? payloadManifest?.executiveSummary?.payloadCount ?? null,
      payloadCount: payloadManifest?.executiveSummary?.payloadCount ?? null,
      contentBlockCount: payloadManifest?.executiveSummary?.contentBlockCount ?? null,
      placeholders: payloadManifest?.executiveSummary?.inertUrlPlaceholderCount ?? null,
      localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
      renderPreviewNonEmptyCount: renderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      htmlWrittenCount: renderQa?.executiveSummary?.htmlWrittenCount ?? null,
      campaignsRead: dryRun?.freshScan?.campaignsRead ?? null,
      createDraftCount: dryRun?.freshScan?.createDraftCount ?? null,
      updateDraftCount: dryRun?.freshScan?.updateDraftCount ?? null,
      conflictCount: dryRun?.freshScan?.conflictCount ?? null,
      assetMutationsPerformed: dryRun?.safety?.mailerLiteAssetsCreatedOrEdited ?? false,
      executionAttemptStatus: executionStatus,
      executionAssetMutationCount: executionMutations,
      executionErrorCount: executionErrors.length,
      executionAdvancedPlanContentBlocker: executionAdvancedPlanBlocker,
      sendsAllowedNow: payloadManifest?.approvalBoundary?.canSendNow ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-email-asset-build -- --execute --approval-phrase "<exact phrase>" --from-email "<verified sender>" --from-name "<sender name>"',
    notes: [
      'The payload manifest is local input, not approval.',
      executionAdvancedPlanBlocker
        ? 'MailerLite API rejected HTML content submission because the account is not on an Advanced plan; use Advanced/API, manual UI build, or a separately approved shell-draft fallback.'
        : null,
      dryRun
        ? 'Fresh campaign dry-run is attached; execute still needs exact approval and verified sender identity.'
        : 'Attach a fresh email asset-build dry-run before execute.',
      'Seed send remains a later separate gate after builder/render QA.',
    ].filter(Boolean),
  });
};

const buildMiniLaunchEmailManualUiBuilderItem = ({ packet, receipt = null }) => {
  const targetNames = targetNamesFrom((packet?.manualUiTargetDrafts ?? []).map((row) => row?.draftName));
  const receiptCompleted = manualUiReceiptCompleted(receipt, targetNames);
  if (receiptCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_email_manual_ui_builder',
      title: 'Mini-launch MailerLite manual UI draft build',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_ui_draft_mutation_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        packet: packet?.status ?? null,
        receipt: receipt?.status ?? null,
        apiExecution: packet?.sourceEvidence?.assetBuildExecutionStatus ?? null,
        renderQa: packet?.sourceEvidence?.renderQaStatus ?? null,
        payloadManifest: packet?.sourceEvidence?.payloadManifestStatus ?? null,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: receipt?.stillClosedAfterThisReceipt ?? packet?.manualUiApprovalBoundary?.stillClosedEvenAfterApproval ?? [],
      requiredFreshEvidence: [
        'run real MailerLite builder/render QA before any seed-send approval request',
        'confirm exact seed recipient before any test send',
      ],
      blockers: [],
      evidence: {
        receiptStatus: receipt.status,
        createdOrEditedDraftCount: receipt.executiveSummary.createdOrEditedDraftCount,
        allTargetDraftsVisibleInDrafts: receipt.executiveSummary.allTargetDraftsVisibleInDrafts,
        draftsTabCountAfterBuild: receipt.executiveSummary.draftsTabCountAfterBuild,
        outboxCountAfterBuild: receipt.executiveSummary.outboxCountAfterBuild,
        usedEditor: receipt.executiveSummary.usedEditor,
        customHtmlEditorStatus: receipt.executiveSummary.customHtmlEditorStatus,
        sendsPerformed: receipt.safety?.sendsPerformed ?? null,
        schedulesCreated: receipt.safety?.schedulesCreated ?? null,
        subscribersReadOrAssigned: receipt.safety?.subscribersReadOrAssigned ?? null,
        groupsCreatedOrAssigned: receipt.safety?.groupsCreatedOrAssigned ?? null,
        workflowMutationsPerformed: receipt.safety?.workflowMutationsPerformed ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The approved manual UI draft build boundary has already been used.',
        'Current route is MailerLite UI on Growing Business; revisit Advanced/API when launches are frequent enough or subscribers pass 2,500 / pricing needs review.',
        'Seed send remains a separate later approval after real MailerLite render QA.',
      ],
    });
  }

  const blockers = [];

  if (packet?.status !== 'mini_launch_email_manual_ui_builder_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`manual_ui_builder_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.manualUiApprovalBoundary?.canAskAlejandroForApproval !== true) {
    blockers.push('manual_ui_builder_cannot_ask_approval_now');
  }
  if (packet?.manualUiApprovalBoundary?.packetIsApprovalByItself !== false) {
    blockers.push('manual_ui_builder_packet_self_authorizes_unexpectedly');
  }
  if (packet?.manualUiApprovalBoundary?.canUseBrowserNow !== false) {
    blockers.push('manual_ui_browser_gate_unexpectedly_open');
  }
  if (packet?.manualUiApprovalBoundary?.canCreateOrEditDraftsNow !== false) {
    blockers.push('manual_ui_draft_gate_unexpectedly_open');
  }
  if (packet?.executiveSummary?.advancedPlanApiBlockerConfirmed !== true) {
    blockers.push('advanced_plan_api_blocker_not_confirmed');
  }
  if ((packet?.executiveSummary?.apiAssetMutationCount ?? null) !== 0) {
    blockers.push(`api_asset_mutation_count_not_zero:${packet?.executiveSummary?.apiAssetMutationCount ?? 'missing'}`);
  }
  if (packet?.safety?.browserOpened !== false) blockers.push('manual_ui_packet_reports_browser_opened');
  if (packet?.safety?.mailerLiteApiCalled !== false) blockers.push('manual_ui_packet_reports_mailerlite_api_call');
  if (packet?.safety?.mailerLiteAssetsCreatedOrEdited !== false) blockers.push('manual_ui_packet_reports_asset_mutation');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('manual_ui_packet_reports_send');
  if (!cleanString(packet?.manualUiApprovalBoundary?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (targetNames.length !== 4) blockers.push(`manual_ui_target_count_not_4:${targetNames.length}`);

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_email_manual_ui_builder',
    title: 'Mini-launch MailerLite manual UI draft build',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_ui_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.manualUiApprovalBoundary?.exactApprovalPhrase,
    sourceStatuses: {
      packet: packet?.status ?? null,
      apiExecution: packet?.sourceEvidence?.assetBuildExecutionStatus ?? null,
      renderQa: packet?.sourceEvidence?.renderQaStatus ?? null,
      payloadManifest: packet?.sourceEvidence?.payloadManifestStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.manualUiApprovalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.manualUiApprovalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.manualUiApprovalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      targetDraftCount: packet?.executiveSummary?.targetDraftCount ?? null,
      htmlSourceCount: packet?.executiveSummary?.htmlSourceCount ?? null,
      localRenderReadyCount: packet?.executiveSummary?.localRenderReadyCount ?? null,
      advancedPlanApiBlockerConfirmed: packet?.executiveSummary?.advancedPlanApiBlockerConfirmed ?? null,
      apiAssetMutationCount: packet?.executiveSummary?.apiAssetMutationCount ?? null,
      canUseManualUiNow: packet?.executiveSummary?.canUseManualUiNow ?? null,
      canSendNow: packet?.executiveSummary?.canSendNow ?? null,
      operatingPolicyStatus: packet?.operatingPolicy?.status ?? null,
      futureAdvancedApiUpgradeTriggers: packet?.operatingPolicy?.futureAdvancedApiUpgradeTriggers ?? [],
    },
    commandAfterApproval: 'manual MailerLite UI builder work only after exact approval; prefer Safari; no sends/workflows/subscribers/groups',
    notes: [
      'Fallback for API HTML content submission blocked by the current non-Advanced MailerLite plan.',
      packet?.operatingPolicy?.currentDecision ?? null,
      'Future frequent launches or subscriber tier growth beyond 2,500 should trigger a fresh Advanced/API review.',
      'This approval would open only draft creation/editing in MailerLite UI; seed send remains separate.',
    ].filter(Boolean),
  });
};

const buildMiniLaunchEmailManualUiDraftRepairItem = ({ packet }) => {
  const targetNames = targetNamesFrom((packet?.repairTargets ?? []).map((target) =>
    target?.draftName
      ? `${target.draftName} (${target.campaignId ?? 'campaign missing'})`
      : target?.campaignId,
  ));

  if (packet?.status === 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed') {
    return buildApprovalItem({
      id: 'mini_launch_email_manual_ui_draft_repair',
      title: 'Mini-launch MailerLite manual UI draft copy repair',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_ui_existing_draft_copy_repair_already_resolved',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        repairPacket: packet?.status ?? null,
        realMailerLiteRenderQa: packet?.executiveSummary?.realMailerLiteRenderQaStatus ?? null,
        manualUiBuildReceipt: packet?.executiveSummary?.manualUiBuildReceiptStatus ?? null,
        seedTestQaPacket: packet?.executiveSummary?.seedTestQaPacketStatus ?? null,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: packet?.decision?.stillClosedEvenAfterApproval ?? [
        'send_email_or_test_email',
        'publish_or_schedule',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'group_creation_or_assignment',
        'shopify_preview_publish_form_connection_or_api',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
        'audience_launch',
      ],
      requiredFreshEvidence: [],
      blockers: [],
      evidence: {
        targetDraftCount: packet?.executiveSummary?.targetDraftCount ?? null,
        missingFragmentCount: packet?.executiveSummary?.missingFragmentCount ?? null,
        realMailerLiteRenderQaGreen: packet?.executiveSummary?.realMailerLiteRenderQaStatus === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes',
        canRepairNow: packet?.decision?.canRepairNow ?? null,
        packetIsApprovalByItself: packet?.decision?.packetIsApprovalByItself ?? null,
        seedTestQaCanAskApprovalNow: packet?.executiveSummary?.seedTestQaCanAskApprovalNow ?? null,
        seedTestQaBlockerCount: packet?.executiveSummary?.seedTestQaBlockerCount ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The repair packet is retained as evidence only; the real MailerLite render QA is already green.',
        'Seed/test send remains separate and still requires an exact seed recipient and exact send approval.',
      ],
    });
  }

  const blockers = [];

  if (packet?.status !== 'mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`manual_ui_draft_repair_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.decision?.canAskAlejandroForApproval !== true) blockers.push('manual_ui_draft_repair_cannot_ask_approval_now');
  if (packet?.decision?.packetIsApprovalByItself !== false) blockers.push('manual_ui_draft_repair_packet_self_authorizes_unexpectedly');
  if (packet?.decision?.canRepairNow !== false) blockers.push('manual_ui_draft_repair_gate_unexpectedly_open');
  if (!cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if ((packet?.executiveSummary?.targetDraftCount ?? 0) !== 1) blockers.push(`manual_ui_draft_repair_target_count_not_1:${packet?.executiveSummary?.targetDraftCount ?? 'missing'}`);
  if ((packet?.executiveSummary?.missingFragmentCount ?? 0) < 1) blockers.push('manual_ui_draft_repair_missing_fragment_count_zero');
  if (packet?.executiveSummary?.openLiveMutationGateCount !== 0) blockers.push('manual_ui_draft_repair_open_live_gate_count_not_zero');
  if (packet?.safety?.browserOpened !== false) blockers.push('manual_ui_draft_repair_packet_reports_browser_opened');
  if (packet?.safety?.mailerLiteApiCalledByThisPacket !== false) blockers.push('manual_ui_draft_repair_packet_reports_mailerlite_api_call');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('manual_ui_draft_repair_packet_reports_send');
  if (packet?.safety?.subscriberMutationsPerformed !== false) blockers.push('manual_ui_draft_repair_packet_reports_subscriber_mutation');
  if (packet?.safety?.groupsCreatedOrAssigned !== false) blockers.push('manual_ui_draft_repair_packet_reports_group_mutation');
  if (packet?.safety?.workflowMutationsPerformed !== false) blockers.push('manual_ui_draft_repair_packet_reports_workflow_mutation');
  if (packet?.safety?.factStoreWritePerformed !== false) blockers.push('manual_ui_draft_repair_packet_reports_fact_store_write');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_email_manual_ui_draft_repair',
    title: 'Mini-launch MailerLite manual UI draft copy repair',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_ui_existing_draft_copy_repair_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase,
    sourceStatuses: {
      repairPacket: packet?.status ?? null,
      realMailerLiteRenderQa: packet?.executiveSummary?.realMailerLiteRenderQaStatus ?? null,
      manualUiBuildReceipt: packet?.executiveSummary?.manualUiBuildReceiptStatus ?? null,
      seedTestQaPacket: packet?.executiveSummary?.seedTestQaPacketStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.decision?.approvalOpensOnly ?? [],
    stillClosed: packet?.decision?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.decision?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      targetDraftCount: packet?.executiveSummary?.targetDraftCount ?? null,
      missingFragmentCount: packet?.executiveSummary?.missingFragmentCount ?? null,
      canRepairNow: packet?.decision?.canRepairNow ?? null,
      packetIsApprovalByItself: packet?.decision?.packetIsApprovalByItself ?? null,
      seedTestQaCanAskApprovalNow: packet?.executiveSummary?.seedTestQaCanAskApprovalNow ?? null,
      seedTestQaBlockerCount: packet?.executiveSummary?.seedTestQaBlockerCount ?? null,
      repairTargetCampaignIds: (packet?.repairTargets ?? []).map((target) => target.campaignId).filter(Boolean),
      fragmentIds: (packet?.repairTargets ?? []).flatMap((target) =>
        (target?.missingFragments ?? []).map((fragment) => fragment.id).filter(Boolean),
      ),
    },
    commandAfterApproval: 'manual MailerLite UI repair only after exact approval; prefer Safari; edit only the listed draft fragments',
    notes: [
      'This approval would repair an existing draft-copy mismatch, not create new assets.',
      'Seed/test send remains separate and still requires green real MailerLite render QA plus exact seed recipient and exact send approval.',
    ],
  });
};

const buildMiniLaunchSeedInboxCorrectionUiEditItem = ({ packet }) => {
  const targetNames = targetNamesFrom(packet?.targetDrafts);
  const blockers = [...(packet?.blockers ?? [])];

  if (packet?.status !== 'seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`correction_ui_edit_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.executiveSummary?.canAskAlejandroForApproval !== true) blockers.push('correction_ui_edit_packet_cannot_ask_approval_now');
  if (packet?.decision?.packetIsApprovalByItself !== false) blockers.push('correction_ui_edit_packet_self_authorizes_unexpectedly');
  if (packet?.decision?.canEditDraftsNow !== false) blockers.push('correction_ui_edit_gate_unexpectedly_open');
  if (!cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if ((packet?.executiveSummary?.targetDraftCount ?? 0) !== 4) blockers.push(`correction_ui_edit_target_count_not_4:${packet?.executiveSummary?.targetDraftCount ?? 'missing'}`);
  if (packet?.executiveSummary?.emailRenderLocalReady !== true) blockers.push('correction_ui_edit_local_render_not_ready');
  if ((packet?.executiveSummary?.redCheckCount ?? 0) !== 0) blockers.push('correction_ui_edit_render_red_checks_present');
  if (packet?.executiveSummary?.publicAudienceSendUrlGateReady !== false) blockers.push('correction_ui_edit_public_url_gate_unexpectedly_ready');
  if (packet?.safety?.exactUrlsStoredInReport !== false) blockers.push('correction_ui_edit_packet_stores_exact_urls');
  if (packet?.safety?.exactUrlsPrinted !== false) blockers.push('correction_ui_edit_packet_prints_exact_urls');
  if (packet?.safety?.mailerLiteUiOpened !== false) blockers.push('correction_ui_edit_packet_reports_ui_opened');
  if (packet?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('correction_ui_edit_packet_reports_mailerlite_mutation');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('correction_ui_edit_packet_reports_send');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_seed_inbox_correction_ui_edit',
    title: 'Mini-launch MailerLite draft correction UI edit',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_ui_existing_draft_correction_edit_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase,
    sourceStatuses: {
      correctionUiEditApprovalPacket: packet?.status ?? null,
      correctionPreview: packet?.executiveSummary?.correctionPreviewStatus ?? null,
      emailRenderQa: packet?.executiveSummary?.emailRenderQaStatus ?? null,
      manualUiBuildReceipt: packet?.executiveSummary?.manualUiBuildReceiptStatus ?? null,
      shopifyPreviewRouteExecution: packet?.executiveSummary?.shopifyPreviewRouteExecutionStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.approvalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.approvalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      targetDraftCount: packet?.executiveSummary?.targetDraftCount ?? null,
      localRenderReady: packet?.executiveSummary?.emailRenderLocalReady ?? null,
      renderPreviewNonEmptyCount: packet?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      redCheckCount: packet?.executiveSummary?.redCheckCount ?? null,
      publicAudienceSendUrlGateReady: packet?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      exactUrlsStoredInReport: packet?.safety?.exactUrlsStoredInReport ?? null,
      exactUrlsPrinted: packet?.safety?.exactUrlsPrinted ?? null,
      sendsPerformed: packet?.safety?.sendsPerformed ?? null,
      mailerLiteMutationsPerformed: packet?.safety?.mailerLiteMutationsPerformed ?? null,
    },
    commandAfterApproval: 'manual MailerLite UI correction edit only after exact approval; prefer Safari; no sends/workflows/subscribers/groups',
    notes: [
      'This approval would edit existing MailerLite drafts only; it does not send another test.',
      'The three preview URLs remain QA/correction links only and are not audience-send-ready.',
      'After editing, run real MailerLite render QA before any later test-send approval.',
    ],
  });
};

const cleanupExecutionCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends'
  && receipt?.mode === 'execute_requested'
  && countRows(receipt?.deletedDrafts) === 2
  && receipt?.postScan?.goneCount === 2
  && receipt?.safety?.mailerLiteApiCalled === true
  && receipt?.safety?.mailerLiteDraftsDeleted === 2
  && receipt?.safety?.mailerLiteMutationsPerformed === true
  && receipt?.safety?.allowedMutationType === 'delete_two_unsafe_replacement_draft_campaigns_only'
  && receipt?.safety?.originalDraftsEditedOrDeleted === false
  && receipt?.safety?.campaignsCreatedOrEdited === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.subscribersRead === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.segmentsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.shopifyMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.signalLedgerAppendPerformed === false
  && receipt?.safety?.crmCardMutationsPerformed === false
  && receipt?.safety?.crmScoreMutationsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.tokensPrinted === false
  && receipt?.safety?.exactUrlsPrinted === false;

const buildMiniLaunchSeedInboxCorrectionApiReplacementCleanupItem = ({ packet, executionReceipt = null }) => {
  const targetNames = targetNamesFrom((packet?.cleanupTargets ?? []).map((target) =>
    target?.name && target?.campaignId
      ? `${target.name} (${target.campaignId})`
      : target?.name ?? target?.campaignId,
  ));
  const executionCompleted = cleanupExecutionCompleted(executionReceipt);
  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_seed_inbox_correction_api_replacement_cleanup',
      title: 'Mini-launch MailerLite unsafe API replacement draft cleanup',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_api_unsafe_replacement_draft_cleanup_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        cleanupApprovalPacket: packet?.status ?? null,
        cleanupExecutionReceipt: executionReceipt.status,
      },
      targetNames: targetNames.length ? targetNames : targetNamesFrom(executionReceipt.deletedDrafts),
      allowedAfterExactApproval: [],
      stillClosed: packet?.approvalBoundary?.stillClosedEvenAfterApproval ?? [
        'creating_new_replacement_drafts',
        'editing_old_e02_e03_drafts',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'group_or_segment_creation_or_assignment',
        'shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidence: [
        'use the cleanup execution receipt as completed evidence',
        'regenerate approval queue/runbook/goal audit before requesting the next MailerLite correction boundary',
      ],
      blockers: [],
      evidence: {
        cleanupExecutionCompleted: true,
        deletedDraftCount: countRows(executionReceipt.deletedDrafts),
        goneCount: executionReceipt.postScan.goneCount,
        mailerLiteDraftsDeleted: executionReceipt.safety.mailerLiteDraftsDeleted,
        originalDraftsEditedOrDeleted: executionReceipt.safety.originalDraftsEditedOrDeleted,
        sendsPerformed: executionReceipt.safety.sendsPerformed,
        groupsCreatedOrAssigned: executionReceipt.safety.groupsCreatedOrAssigned,
        segmentsCreatedOrAssigned: executionReceipt.safety.segmentsCreatedOrAssigned,
        workflowMutationsPerformed: executionReceipt.safety.workflowMutationsPerformed,
      },
      commandAfterApproval: null,
      notes: [
        'The unsafe API replacement drafts have been cleaned up; do not ask for this cleanup approval again.',
        'The next MailerLite draft correction boundary may be considered only after fresh local queue/runbook refresh.',
      ],
    });
  }

  const blockers = [...(packet?.blockers ?? [])];

  if (packet?.status !== 'seed_inbox_correction_api_replacement_cleanup_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`api_replacement_cleanup_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.executiveSummary?.canAskAlejandroForApproval !== true) blockers.push('api_replacement_cleanup_cannot_ask_approval_now');
  if (packet?.decision?.packetIsApprovalByItself !== false) blockers.push('api_replacement_cleanup_packet_self_authorizes_unexpectedly');
  if (packet?.decision?.canDeleteNow !== false) blockers.push('api_replacement_cleanup_delete_gate_unexpectedly_open');
  if (packet?.decision?.canCreateReplacementDraftsNow !== false) blockers.push('api_replacement_cleanup_create_gate_unexpectedly_open');
  if (packet?.decision?.canEditExistingDraftsNow !== false) blockers.push('api_replacement_cleanup_edit_gate_unexpectedly_open');
  if (packet?.decision?.canSendNow !== false) blockers.push('api_replacement_cleanup_send_gate_unexpectedly_open');
  if (!cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if ((packet?.executiveSummary?.cleanupTargetCount ?? 0) !== 2) blockers.push(`api_replacement_cleanup_target_count_not_2:${packet?.executiveSummary?.cleanupTargetCount ?? 'missing'}`);
  if (packet?.executiveSummary?.inertDraftCount !== 0) blockers.push(`api_replacement_cleanup_inert_count_not_zero:${packet?.executiveSummary?.inertDraftCount ?? 'missing'}`);
  if (packet?.safety?.mailerLiteApiCalled !== false) blockers.push('api_replacement_cleanup_packet_reports_mailerlite_api_call');
  if (packet?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('api_replacement_cleanup_packet_reports_mailerlite_mutation');
  if (packet?.safety?.mailerLiteDraftsDeleted !== 0) blockers.push('api_replacement_cleanup_packet_reports_deleted_drafts');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('api_replacement_cleanup_packet_reports_send');
  if (packet?.safety?.subscriberMutationsPerformed !== false) blockers.push('api_replacement_cleanup_packet_reports_subscriber_mutation');
  if (packet?.safety?.groupsCreatedOrAssigned !== false) blockers.push('api_replacement_cleanup_packet_reports_group_mutation');
  if (packet?.safety?.segmentsCreatedOrAssigned !== false) blockers.push('api_replacement_cleanup_packet_reports_segment_mutation');
  if (packet?.safety?.workflowMutationsPerformed !== false) blockers.push('api_replacement_cleanup_packet_reports_workflow_mutation');
  if (packet?.safety?.factStoreWritePerformed !== false) blockers.push('api_replacement_cleanup_packet_reports_fact_store_write');
  if (packet?.safety?.tokensPrinted !== false) blockers.push('api_replacement_cleanup_packet_prints_tokens');
  if (packet?.safety?.exactUrlsPrinted !== false) blockers.push('api_replacement_cleanup_packet_prints_exact_urls');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_seed_inbox_correction_api_replacement_cleanup',
    title: 'Mini-launch MailerLite unsafe API replacement draft cleanup',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_api_delete_only_unsafe_replacement_drafts_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase,
    sourceStatuses: {
      cleanupApprovalPacket: packet?.status ?? null,
      executionReceipt: packet?.executiveSummary?.executionReceiptStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.approvalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.approvalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      cleanupTargetCount: packet?.executiveSummary?.cleanupTargetCount ?? null,
      createdDraftCount: packet?.executiveSummary?.createdDraftCount ?? null,
      inertDraftCount: packet?.executiveSummary?.inertDraftCount ?? null,
      allOldDraftsLeftIntact: packet?.executiveSummary?.allOldDraftsLeftIntact ?? null,
      executionReceiptOk: packet?.executiveSummary?.executionReceiptOk ?? null,
      executionReceiptStatus: packet?.executiveSummary?.executionReceiptStatus ?? null,
      sendsPerformed: packet?.safety?.sendsPerformed ?? null,
      mailerLiteMutationsPerformedByPacket: packet?.safety?.mailerLiteMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete -- --execute --approval-phrase "<exact phrase>"',
    notes: [
      'This cleanup approval exists because the API-created replacement drafts are content-correct but not inert: MailerLite reports canBeScheduled=true and hasBasicFilter=true.',
      'This boundary must be resolved before any further draft correction/test-send/public-send work for the mini-launch.',
      'The original E02/E03 drafts are explicitly left intact.',
    ],
  });
};

const mailerLiteApiInertDraftLabCompleted = (lab) =>
  lab?.ok === true
  && typeof lab?.status === 'string'
  && lab.status.startsWith('mailerlite_api_inert_draft_lab_completed_')
  && lab?.mode === 'execute_requested'
  && lab?.executiveSummary?.variantCount === countRows(lab?.variants)
  && lab?.executiveSummary?.createdCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.deletedCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.goneCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.cleanupComplete === true
  && lab?.safety?.mailerLiteApiCalled === true
  && lab?.safety?.mailerLiteDraftsCreated === lab?.executiveSummary?.variantCount
  && lab?.safety?.mailerLiteDraftsDeleted === lab?.executiveSummary?.variantCount
  && lab?.safety?.mailerLiteMutationsPerformed === true
  && lab?.safety?.allowedMutationType === 'create_inspect_delete_disposable_lab_draft_campaigns_only'
  && lab?.safety?.disposableOnly === true
  && lab?.safety?.originalDraftsEditedOrDeleted === false
  && lab?.safety?.campaignsPublished === false
  && lab?.safety?.campaignsScheduled === false
  && lab?.safety?.sendsPerformed === false
  && lab?.safety?.subscribersRead === false
  && lab?.safety?.subscriberMutationsPerformed === false
  && lab?.safety?.groupsCreatedOrAssigned === false
  && lab?.safety?.segmentsCreatedOrAssigned === false
  && lab?.safety?.workflowMutationsPerformed === false
  && lab?.safety?.shopifyMutationsPerformed === false
  && lab?.safety?.crmLiveApiCalled === false
  && lab?.safety?.signalLedgerAppendPerformed === false
  && lab?.safety?.crmCardMutationsPerformed === false
  && lab?.safety?.crmScoreMutationsPerformed === false
  && lab?.safety?.factStoreWritePerformed === false
  && lab?.safety?.senderValuesPrinted === false
  && lab?.safety?.tokensPrinted === false
  && lab?.safety?.exactPreviewUrlsPrinted === false;

const buildMiniLaunchMailerLiteApiInertDraftLabItem = ({ lab }) => {
  const targetNames = targetNamesFrom((lab?.variants ?? []).map((variant) => variant?.label ?? variant?.id));
  const executionCompleted = mailerLiteApiInertDraftLabCompleted(lab);

  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_mailerlite_api_inert_draft_lab',
      title: 'MailerLite API inert draft lab',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_api_disposable_draft_lab_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        lab: lab.status,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: lab?.approvalBoundary?.stillClosedEvenAfterApproval ?? [
        'editing_existing_mini_launch_drafts',
        'creating_real_launch_replacement_drafts',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'subscriber_workflow_group_or_segment_mutations',
        'shopify_or_crm_mutation',
        'ledger_card_scoring_or_fact_store_writes',
      ],
      requiredFreshEvidence: [
        'use the lab execution receipt as the current API recipe evidence',
        'create a separate exact approval packet before applying any recipe to real mini-launch drafts',
      ],
      blockers: [],
      evidence: {
        labCompleted: true,
        variantCount: lab?.executiveSummary?.variantCount ?? null,
        inertVariantCount: lab?.executiveSummary?.inertVariantCount ?? null,
        readyToUseApiRecipeForRealDrafts: lab?.executiveSummary?.readyToUseApiRecipeForRealDrafts ?? null,
        cleanupComplete: lab?.executiveSummary?.cleanupComplete ?? null,
        createdCount: lab?.safety?.mailerLiteDraftsCreated ?? null,
        deletedCount: lab?.safety?.mailerLiteDraftsDeleted ?? null,
        sendsPerformed: lab?.safety?.sendsPerformed ?? null,
        originalDraftsEditedOrDeleted: lab?.safety?.originalDraftsEditedOrDeleted ?? null,
        senderValuesPrinted: lab?.safety?.senderValuesPrinted ?? null,
        tokensPrinted: lab?.safety?.tokensPrinted ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The disposable API lab has already run and cleaned itself up.',
        lab?.executiveSummary?.readyToUseApiRecipeForRealDrafts === true
          ? 'This receipt is recipe evidence only; it does not authorize editing real launch drafts.'
          : 'No safe inert API creation recipe was found; do not use this API creation route for real launch drafts.',
      ],
    });
  }

  const blockers = [...(lab?.blockers ?? [])];

  if (lab?.status !== 'mailerlite_api_inert_draft_lab_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`api_inert_draft_lab_not_ready:${lab?.status ?? 'missing'}`);
  }
  if (lab?.ok !== true) blockers.push('api_inert_draft_lab_not_ok');
  if (lab?.mode !== 'dry_run_packet_only') blockers.push(`api_inert_draft_lab_mode_not_dry_run:${lab?.mode ?? 'missing'}`);
  if (lab?.decision?.packetIsApprovalByItself !== false) blockers.push('api_inert_draft_lab_packet_self_authorizes_unexpectedly');
  if (lab?.decision?.canExecuteNow !== false) blockers.push('api_inert_draft_lab_execute_gate_unexpectedly_open');
  if (!cleanString(lab?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if ((lab?.executiveSummary?.variantCount ?? 0) !== 4) blockers.push(`api_inert_draft_lab_variant_count_not_4:${lab?.executiveSummary?.variantCount ?? 'missing'}`);
  if (lab?.executiveSummary?.sourceCampaignIdPresent !== true) blockers.push('api_inert_draft_lab_source_campaign_missing');
  if (lab?.executiveSummary?.packetIsApprovalByItself !== false) blockers.push('api_inert_draft_lab_summary_self_authorizes_unexpectedly');
  if (lab?.executiveSummary?.canExecuteNow !== false) blockers.push('api_inert_draft_lab_summary_execute_gate_unexpectedly_open');
  if (lab?.safety?.mailerLiteApiCalled !== false) blockers.push('api_inert_draft_lab_packet_reports_mailerlite_api_call');
  if (lab?.safety?.mailerLiteDraftsCreated !== 0) blockers.push('api_inert_draft_lab_packet_reports_created_drafts');
  if (lab?.safety?.mailerLiteDraftsDeleted !== 0) blockers.push('api_inert_draft_lab_packet_reports_deleted_drafts');
  if (lab?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_mailerlite_mutation');
  if (lab?.safety?.sendsPerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_send');
  if (lab?.safety?.subscribersRead !== false) blockers.push('api_inert_draft_lab_packet_reports_subscriber_read');
  if (lab?.safety?.subscriberMutationsPerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_subscriber_mutation');
  if (lab?.safety?.groupsCreatedOrAssigned !== false) blockers.push('api_inert_draft_lab_packet_reports_group_mutation');
  if (lab?.safety?.segmentsCreatedOrAssigned !== false) blockers.push('api_inert_draft_lab_packet_reports_segment_mutation');
  if (lab?.safety?.workflowMutationsPerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_workflow_mutation');
  if (lab?.safety?.shopifyMutationsPerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_shopify_mutation');
  if (lab?.safety?.crmLiveApiCalled !== false) blockers.push('api_inert_draft_lab_packet_reports_crm_live_api_call');
  if (lab?.safety?.factStoreWritePerformed !== false) blockers.push('api_inert_draft_lab_packet_reports_fact_store_write');
  if (lab?.safety?.senderValuesPrinted !== false) blockers.push('api_inert_draft_lab_packet_prints_sender_values');
  if (lab?.safety?.tokensPrinted !== false) blockers.push('api_inert_draft_lab_packet_prints_tokens');
  if (lab?.safety?.exactPreviewUrlsPrinted !== false) blockers.push('api_inert_draft_lab_packet_prints_exact_urls');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_mailerlite_api_inert_draft_lab',
    title: 'MailerLite API inert draft lab',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_api_disposable_draft_lab_after_exact_approval',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: lab?.decision?.exactApprovalPhrase ?? null,
    sourceStatuses: {
      lab: lab?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: lab?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: lab?.approvalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: lab?.approvalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      variantCount: lab?.executiveSummary?.variantCount ?? null,
      sourceCampaignStep: lab?.executiveSummary?.sourceCampaignStep ?? null,
      sourceCampaignIdPresent: lab?.executiveSummary?.sourceCampaignIdPresent ?? null,
      disposableDraftPrefix: lab?.executiveSummary?.disposableDraftPrefix ?? null,
      exactApprovalPhraseAvailable: lab?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      canExecuteNow: lab?.executiveSummary?.canExecuteNow ?? null,
      packetIsApprovalByItself: lab?.executiveSummary?.packetIsApprovalByItself ?? null,
      mailerLiteApiCalled: lab?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformedByPacket: lab?.safety?.mailerLiteMutationsPerformed ?? null,
      senderValuesPrinted: lab?.safety?.senderValuesPrinted ?? null,
      tokensPrinted: lab?.safety?.tokensPrinted ?? null,
      exactPreviewUrlsPrinted: lab?.safety?.exactPreviewUrlsPrinted ?? null,
    },
    commandAfterApproval: canAskNow
      ? 'npm run crm:vnext:mailerlite-api-inert-draft-lab -- --execute --approval-phrase "<exact phrase>"'
      : null,
    notes: [
      'This is an API-discovery lab only: create, inspect and delete disposable [LAB NO SEND] drafts to learn which payload shape yields an inert draft.',
      'It is deliberately separated from editing existing mini-launch drafts or creating real replacement drafts.',
      'If the lab cannot prove cleanup or inertness, stop and report instead of moving to real drafts.',
    ],
  });
};

const mailerLiteApiNullAudienceLabCompleted = (lab) =>
  lab?.ok === true
  && typeof lab?.status === 'string'
  && lab.status.startsWith('mailerlite_api_null_audience_lab_completed_')
  && lab?.mode === 'execute_requested'
  && lab?.executiveSummary?.variantCount === countRows(lab?.variants)
  && lab?.executiveSummary?.createdCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.deletedCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.goneCount === lab?.executiveSummary?.variantCount
  && lab?.executiveSummary?.cleanupComplete === true
  && lab?.executiveSummary?.safetyGroupActiveCountObserved === 0
  && lab?.safety?.mailerLiteApiCalled === true
  && lab?.safety?.mailerLiteDraftsCreated === lab?.executiveSummary?.variantCount
  && lab?.safety?.mailerLiteDraftsDeleted === lab?.executiveSummary?.variantCount
  && lab?.safety?.mailerLiteMutationsPerformed === true
  && lab?.safety?.allowedMutationType === 'create_or_use_empty_safety_group_and_create_inspect_delete_disposable_null_audience_lab_campaigns_only'
  && lab?.safety?.disposableOnly === true
  && lab?.safety?.originalDraftsEditedOrDeleted === false
  && lab?.safety?.realLaunchDraftsCreatedOrEdited === false
  && lab?.safety?.realCampaignAudienceAssignmentsPerformed === false
  && lab?.safety?.campaignsPublished === false
  && lab?.safety?.campaignsScheduled === false
  && lab?.safety?.sendsPerformed === false
  && lab?.safety?.subscribersRead === false
  && lab?.safety?.subscriberMutationsPerformed === false
  && lab?.safety?.additionalGroupsCreatedOrAssigned === false
  && lab?.safety?.segmentsCreatedOrAssigned === false
  && lab?.safety?.workflowMutationsPerformed === false
  && lab?.safety?.shopifyMutationsPerformed === false
  && lab?.safety?.crmLiveApiCalled === false
  && lab?.safety?.factStoreWritePerformed === false
  && lab?.safety?.senderValuesPrinted === false
  && lab?.safety?.safetyGroupIdPrinted === false
  && lab?.safety?.tokensPrinted === false;

const buildMiniLaunchMailerLiteApiNullAudienceLabItem = ({ lab }) => {
  const targetNames = [
    lab?.safetyGroup?.name ?? lab?.executiveSummary?.safetyGroupName,
    ...(lab?.variants ?? []).map((variant) => variant?.label ?? variant?.id),
  ].filter(Boolean);
  const executionCompleted = mailerLiteApiNullAudienceLabCompleted(lab);

  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_mailerlite_api_null_audience_lab',
      title: 'MailerLite API Null Audience lab',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_api_null_audience_lab_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        lab: lab.status,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: lab?.approvalBoundary?.stillClosedEvenAfterApproval ?? [
        'editing_existing_mini_launch_drafts',
        'creating_real_launch_replacement_drafts',
        'assigning_real_launch_campaigns_to_any_audience',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'subscriber_workflow_segment_or_additional_group_mutations',
        'shopify_or_crm_mutation',
        'ledger_card_scoring_or_fact_store_writes',
      ],
      requiredFreshEvidence: [
        'use the lab execution receipt as Null Audience recipe evidence',
        'create a separate exact approval packet before applying this pattern to real launch drafts',
      ],
      blockers: [],
      evidence: {
        labCompleted: true,
        safetyGroupName: lab?.executiveSummary?.safetyGroupName ?? null,
        safetyGroupActiveCountObserved: lab?.executiveSummary?.safetyGroupActiveCountObserved ?? null,
        safetyGroupCreatedByLab: lab?.executiveSummary?.safetyGroupCreatedByLab ?? null,
        variantCount: lab?.executiveSummary?.variantCount ?? null,
        safeNullAudienceVariantCount: lab?.executiveSummary?.safeNullAudienceVariantCount ?? null,
        readyToUseNullAudienceRecipeForRealDrafts:
          lab?.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts ?? null,
        cleanupComplete: lab?.executiveSummary?.cleanupComplete ?? null,
        createdCount: lab?.safety?.mailerLiteDraftsCreated ?? null,
        deletedCount: lab?.safety?.mailerLiteDraftsDeleted ?? null,
        safetyGroupsCreated: lab?.safety?.mailerLiteSafetyGroupsCreated ?? null,
        sendsPerformed: lab?.safety?.sendsPerformed ?? null,
        originalDraftsEditedOrDeleted: lab?.safety?.originalDraftsEditedOrDeleted ?? null,
        realLaunchDraftsCreatedOrEdited: lab?.safety?.realLaunchDraftsCreatedOrEdited ?? null,
        realCampaignAudienceAssignmentsPerformed: lab?.safety?.realCampaignAudienceAssignmentsPerformed ?? null,
        tokensPrinted: lab?.safety?.tokensPrinted ?? null,
      },
      commandAfterApproval: null,
      notes: [
        lab?.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts === true
          ? 'Null Audience looks viable for a later API-heavy launch factory, but this receipt is not approval to create real campaign drafts.'
          : 'The lab completed, but it did not prove a recipe that should be applied to real launch drafts.',
      ],
    });
  }

  const blockers = [...(lab?.blockers ?? [])];

  if (lab?.status !== 'mailerlite_api_null_audience_lab_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`api_null_audience_lab_not_ready:${lab?.status ?? 'missing'}`);
  }
  if (lab?.ok !== true) blockers.push('api_null_audience_lab_not_ok');
  if (lab?.mode !== 'dry_run_packet_only') blockers.push(`api_null_audience_lab_mode_not_dry_run:${lab?.mode ?? 'missing'}`);
  if (lab?.decision?.packetIsApprovalByItself !== false) blockers.push('api_null_audience_lab_packet_self_authorizes_unexpectedly');
  if (lab?.decision?.canExecuteNow !== false) blockers.push('api_null_audience_lab_execute_gate_unexpectedly_open');
  if (!cleanString(lab?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if ((lab?.executiveSummary?.variantCount ?? 0) !== 2) blockers.push(`api_null_audience_lab_variant_count_not_2:${lab?.executiveSummary?.variantCount ?? 'missing'}`);
  if (lab?.executiveSummary?.sourceCampaignIdPresent !== true) blockers.push('api_null_audience_lab_source_campaign_missing');
  if (lab?.executiveSummary?.safetyGroupActiveCountRequired !== 0) blockers.push('api_null_audience_lab_safety_group_required_count_not_zero');
  if (lab?.executiveSummary?.packetIsApprovalByItself !== false) blockers.push('api_null_audience_lab_summary_self_authorizes_unexpectedly');
  if (lab?.executiveSummary?.canExecuteNow !== false) blockers.push('api_null_audience_lab_summary_execute_gate_unexpectedly_open');
  if (lab?.safety?.mailerLiteApiCalled !== false) blockers.push('api_null_audience_lab_packet_reports_mailerlite_api_call');
  if (lab?.safety?.mailerLiteSafetyGroupsCreated !== 0) blockers.push('api_null_audience_lab_packet_reports_safety_group_created');
  if (lab?.safety?.mailerLiteDraftsCreated !== 0) blockers.push('api_null_audience_lab_packet_reports_created_drafts');
  if (lab?.safety?.mailerLiteDraftsDeleted !== 0) blockers.push('api_null_audience_lab_packet_reports_deleted_drafts');
  if (lab?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_mailerlite_mutation');
  if (lab?.safety?.realLaunchDraftsCreatedOrEdited !== false) blockers.push('api_null_audience_lab_packet_reports_real_draft_mutation');
  if (lab?.safety?.realCampaignAudienceAssignmentsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_real_audience_assignment');
  if (lab?.safety?.sendsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_send');
  if (lab?.safety?.subscribersRead !== false) blockers.push('api_null_audience_lab_packet_reports_subscriber_read');
  if (lab?.safety?.subscriberMutationsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_subscriber_mutation');
  if (lab?.safety?.additionalGroupsCreatedOrAssigned !== false) blockers.push('api_null_audience_lab_packet_reports_additional_group_mutation');
  if (lab?.safety?.segmentsCreatedOrAssigned !== false) blockers.push('api_null_audience_lab_packet_reports_segment_mutation');
  if (lab?.safety?.workflowMutationsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_workflow_mutation');
  if (lab?.safety?.shopifyMutationsPerformed !== false) blockers.push('api_null_audience_lab_packet_reports_shopify_mutation');
  if (lab?.safety?.crmLiveApiCalled !== false) blockers.push('api_null_audience_lab_packet_reports_crm_live_api_call');
  if (lab?.safety?.factStoreWritePerformed !== false) blockers.push('api_null_audience_lab_packet_reports_fact_store_write');
  if (lab?.safety?.senderValuesPrinted !== false) blockers.push('api_null_audience_lab_packet_prints_sender_values');
  if (lab?.safety?.safetyGroupIdPrinted !== false) blockers.push('api_null_audience_lab_packet_prints_safety_group_id');
  if (lab?.safety?.tokensPrinted !== false) blockers.push('api_null_audience_lab_packet_prints_tokens');
  if (lab?.safety?.exactPreviewUrlsPrinted !== false) blockers.push('api_null_audience_lab_packet_prints_exact_urls');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_mailerlite_api_null_audience_lab',
    title: 'MailerLite API Null Audience lab',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_api_null_audience_lab_after_exact_approval',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: lab?.decision?.exactApprovalPhrase ?? null,
    sourceStatuses: {
      lab: lab?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: lab?.approvalBoundary?.allowedAfterExactApproval ?? [],
    stillClosed: lab?.approvalBoundary?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: lab?.approvalBoundary?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      safetyGroupName: lab?.executiveSummary?.safetyGroupName ?? null,
      variantCount: lab?.executiveSummary?.variantCount ?? null,
      sourceCampaignStep: lab?.executiveSummary?.sourceCampaignStep ?? null,
      sourceCampaignIdPresent: lab?.executiveSummary?.sourceCampaignIdPresent ?? null,
      disposableDraftPrefix: lab?.executiveSummary?.disposableDraftPrefix ?? null,
      exactApprovalPhraseAvailable: lab?.executiveSummary?.exactApprovalPhraseAvailable ?? null,
      canExecuteNow: lab?.executiveSummary?.canExecuteNow ?? null,
      packetIsApprovalByItself: lab?.executiveSummary?.packetIsApprovalByItself ?? null,
      mailerLiteApiCalled: lab?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformedByPacket: lab?.safety?.mailerLiteMutationsPerformed ?? null,
      safetyGroupsCreatedByPacket: lab?.safety?.mailerLiteSafetyGroupsCreated ?? null,
      senderValuesPrinted: lab?.safety?.senderValuesPrinted ?? null,
      safetyGroupIdPrinted: lab?.safety?.safetyGroupIdPrinted ?? null,
      tokensPrinted: lab?.safety?.tokensPrinted ?? null,
    },
    commandAfterApproval: canAskNow
      ? 'npm run crm:vnext:mailerlite-api-null-audience-lab -- --execute --approval-phrase "<exact phrase>"'
      : null,
    notes: [
      'This lab tests the API-heavy safety design: drafts may be schedulable, but their only audience is a permanent empty safety group.',
      'It may create that one named safety group if missing; it does not create or edit real launch drafts.',
      'If the safety group is not empty or the campaign filter is not exclusive to it, stop and do not promote the recipe.',
    ],
  });
};

const nullAudienceReplacementExecutionCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'mailerlite_null_audience_replacement_execution_completed_no_sends'
  && receipt?.mode === 'execute_requested'
  && receipt?.createdDrafts?.length === 4
  && receipt?.postCreateQa?.replacementDraftCount === 4
  && receipt?.postCreateQa?.nullAudienceSafeCount === 4
  && receipt?.postCreateQa?.contentGreenCount === 4
  && receipt?.cleanup?.attempted === false
  && receipt?.safety?.mailerLiteApiCalled === true
  && receipt?.safety?.mailerLiteDraftsCreated === 4
  && receipt?.safety?.mailerLiteDraftsDeletedByFailureCleanup === 0
  && receipt?.safety?.oldDraftsEdited === false
  && receipt?.safety?.oldDraftsDeletedOrArchived === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.subscribersRead === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.additionalGroupsCreatedOrAssigned === false
  && receipt?.safety?.nonNullAudienceGroupsAssigned === false
  && receipt?.safety?.segmentsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.shopifyMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.exactUrlsPrinted === false
  && receipt?.safety?.senderValuesPrinted === false
  && receipt?.safety?.tokensPrinted === false;

const buildMiniLaunchNullAudienceReplacementItem = ({ packet, executionReceipt = null }) => {
  const targetNames = targetNamesFrom((packet?.replacementTargets ?? []).map((target) =>
    target?.replacementDraftName ?? target?.label));
  const completed = nullAudienceReplacementExecutionCompleted(executionReceipt);

  if (completed) {
    return buildApprovalItem({
      id: 'mini_launch_mailerlite_api_null_audience_replacement_drafts',
      title: 'MailerLite API Null Audience replacement drafts',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'live_mailerlite_api_null_audience_replacement_drafts_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        packet: packet?.status ?? null,
        executionReceipt: executionReceipt.status,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: packet?.decision?.stillClosedEvenAfterApproval ?? [],
      requiredFreshEvidence: [
        'use the execution receipt as evidence before seed-send QA',
        'do not create another replacement set unless names are changed and a new packet is generated',
      ],
      blockers: [],
      evidence: {
        completed: true,
        createdDraftCount: executionReceipt?.createdDrafts?.length ?? null,
        nullAudienceSafeCount: executionReceipt?.postCreateQa?.nullAudienceSafeCount ?? null,
        contentGreenCount: executionReceipt?.postCreateQa?.contentGreenCount ?? null,
        safetyGroupName: executionReceipt?.preflight?.safetyGroupName ?? null,
        safetyGroupActiveCount: executionReceipt?.preflight?.safetyGroupActiveCount ?? null,
        sendsPerformed: executionReceipt?.safety?.sendsPerformed ?? null,
        campaignsPublished: executionReceipt?.safety?.campaignsPublished ?? null,
        campaignsScheduled: executionReceipt?.safety?.campaignsScheduled ?? null,
        oldDraftsEdited: executionReceipt?.safety?.oldDraftsEdited ?? null,
        tokensPrinted: executionReceipt?.safety?.tokensPrinted ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The four replacement drafts were created by API and constrained to the empty Null Audience safety group.',
        'This completion does not authorize seed sends, public sends, workflow attachment, subscriber mutation or CRM writes.',
      ],
    });
  }

  const blockers = [...(packet?.blockers ?? [])];
  if (packet?.status !== 'mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`null_audience_replacement_packet_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.ok !== true) blockers.push('null_audience_replacement_packet_not_ok');
  if (packet?.executiveSummary?.canAskAlejandroForApproval !== true) blockers.push('null_audience_replacement_cannot_ask_approval_now');
  if (packet?.decision?.packetIsApprovalByItself !== false) blockers.push('null_audience_replacement_packet_self_authorizes_unexpectedly');
  if (packet?.decision?.canCreateReplacementDraftsNow !== false) blockers.push('null_audience_replacement_create_gate_unexpectedly_open');
  if (!cleanString(packet?.decision?.exactApprovalPhrase)) blockers.push('missing_exact_approval_phrase');
  if (packet?.executiveSummary?.replacementTargetCount !== 4) blockers.push(`replacement_target_count_not_4:${packet?.executiveSummary?.replacementTargetCount ?? 'missing'}`);
  if (packet?.executiveSummary?.nullAudienceRecipeReady !== true) blockers.push('null_audience_recipe_not_ready');
  if (packet?.executiveSummary?.safetyGroupActiveCountObserved !== 0) blockers.push(`safety_group_active_count_not_0_in_packet:${packet?.executiveSummary?.safetyGroupActiveCountObserved ?? 'missing'}`);
  if (packet?.executiveSummary?.publicAudienceSendUrlGateReady !== false) blockers.push('public_audience_send_url_gate_unexpectedly_ready');
  if (packet?.safety?.mailerLiteApiCalled !== false) blockers.push('packet_reports_mailerlite_api_call');
  if (packet?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('packet_reports_mailerlite_mutation');
  if (packet?.safety?.sendsPerformed !== false) blockers.push('packet_reports_send');
  if (packet?.safety?.subscribersRead !== false) blockers.push('packet_reports_subscriber_read');
  if (packet?.safety?.subscriberMutationsPerformed !== false) blockers.push('packet_reports_subscriber_mutation');
  if (packet?.safety?.groupsCreatedOrAssigned !== false) blockers.push('packet_reports_group_mutation');
  if (packet?.safety?.workflowMutationsPerformed !== false) blockers.push('packet_reports_workflow_mutation');
  if (packet?.safety?.shopifyMutationsPerformed !== false) blockers.push('packet_reports_shopify_mutation');
  if (packet?.safety?.crmLiveApiCalled !== false) blockers.push('packet_reports_crm_live_api_call');
  if (packet?.safety?.factStoreWritePerformed !== false) blockers.push('packet_reports_fact_store_write');
  if (packet?.safety?.exactUrlsPrinted !== false) blockers.push('packet_prints_exact_urls');
  if (packet?.safety?.senderValuesPrinted !== false) blockers.push('packet_prints_sender_values');
  if (packet?.safety?.tokensPrinted !== false) blockers.push('packet_prints_tokens');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_mailerlite_api_null_audience_replacement_drafts',
    title: 'MailerLite API Null Audience replacement drafts',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_api_null_audience_replacement_drafts_after_exact_approval',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: packet?.decision?.exactApprovalPhrase ?? null,
    sourceStatuses: {
      packet: packet?.status ?? null,
      executionReceipt: executionReceipt?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: packet?.decision?.allowedAfterExactApproval ?? [],
    stillClosed: packet?.decision?.stillClosedEvenAfterApproval ?? [],
    requiredFreshEvidence: packet?.decision?.requiredFreshEvidenceBeforeExecution ?? [],
    blockers,
    evidence: {
      replacementTargetCount: packet?.executiveSummary?.replacementTargetCount ?? null,
      safetyGroupName: packet?.executiveSummary?.safetyGroupName ?? null,
      safetyGroupActiveCountObserved: packet?.executiveSummary?.safetyGroupActiveCountObserved ?? null,
      nullAudienceRecipeReady: packet?.executiveSummary?.nullAudienceRecipeReady ?? null,
      localRenderReady: packet?.executiveSummary?.localRenderReady ?? null,
      redCheckCount: packet?.executiveSummary?.redCheckCount ?? null,
      finalPublicLinksReady: packet?.executiveSummary?.finalPublicLinksReady ?? null,
      publicAudienceSendUrlGateReady: packet?.executiveSummary?.publicAudienceSendUrlGateReady ?? null,
      sourceCampaignIdCount: packet?.executiveSummary?.sourceCampaignIdCount ?? null,
      exactApprovalPhraseAvailable: Boolean(cleanString(packet?.decision?.exactApprovalPhrase)),
      mailerLiteApiCalledByPacket: packet?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformedByPacket: packet?.safety?.mailerLiteMutationsPerformed ?? null,
      exactUrlsPrinted: packet?.safety?.exactUrlsPrinted ?? null,
      senderValuesPrinted: packet?.safety?.senderValuesPrinted ?? null,
      tokensPrinted: packet?.safety?.tokensPrinted ?? null,
      readOnlyPreflightStatus: executionReceipt?.mode === 'read_only_preflight' ? executionReceipt?.status ?? null : null,
      readOnlyPreflightBlockerCount: executionReceipt?.mode === 'read_only_preflight'
        ? executionReceipt?.decision?.blockers?.length ?? null
        : null,
    },
    commandAfterApproval: canAskNow
      ? 'npm run crm:vnext:mailerlite-mini-launch-null-audience-replacement-create -- --execute --approval-phrase "<exact phrase>"'
      : null,
    notes: [
      'This is the first real draft-construction boundary using the proven Null Audience API safety model.',
      'It creates four new replacement drafts only; old drafts remain intact as no-use references.',
      'If post-create QA fails, drafts created by that execution must be deleted in the same approved run.',
    ],
  });
};

const buildMiniLaunchMailerLiteApiExistingDraftUpdateStrategyItem = ({ packet }) => {
  const targetNames = targetNamesFrom((packet?.localEvidenceInterpretation?.readOnlyExistingDraftDiagnostic?.draftSafety ?? [])
    .map((draft) => `E${String(draft?.step).padStart(2, '0')}`));
  const apiExistingDraftUpdateRecommendedNow =
    packet?.executiveSummary?.apiExistingDraftUpdateRecommendedNow === true;
  const apiCreateRealDraftsRecommendedNow =
    packet?.executiveSummary?.apiCreateRealDraftsRecommendedNow === true;

  return buildApprovalItem({
    id: 'mini_launch_mailerlite_api_existing_draft_update_strategy',
    title: 'MailerLite API existing-draft update strategy',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'reference_only_mailerlite_api_existing_draft_update_strategy',
    approvalType: 'reference_only_strategy',
    canAskNow: false,
    exactApprovalPhrase: null,
    sourceStatuses: {
      strategyPacket: packet?.status ?? null,
      apiEditDiagnostic: packet?.executiveSummary?.apiEditDiagnosticStatus ?? null,
    },
    targetNames,
    allowedAfterExactApproval: [],
    stillClosed: [
      'api_edit_without_separate_exact_approval_packet',
      'api_create_real_replacement_drafts',
      'test_send_or_seed_send',
      'public_or_audience_send',
      'subscriber_workflow_group_or_segment_mutations',
      'shopify_or_crm_mutation',
      'ledger_card_scoring_or_fact_store_writes',
    ],
    requiredFreshEvidence: packet?.decisionBoundary?.beforeAnyFutureApiMutation ?? [],
    blockers: [],
    evidence: {
      apiConnectionStableForRead: packet?.executiveSummary?.apiConnectionStableForRead ?? null,
      allApiPayloadReady: packet?.executiveSummary?.allApiPayloadReady ?? null,
      allDraftsInertByApi: packet?.executiveSummary?.allDraftsInertByApi ?? null,
      apiEditCandidate: packet?.executiveSummary?.apiEditCandidate ?? null,
      apiExistingDraftUpdateRecommendedNow,
      apiCreateRealDraftsRecommendedNow,
      blockerCount: packet?.executiveSummary?.blockerCount ?? null,
      blockerIds: packet?.blockers ?? [],
      exactApprovalPhraseAvailable: packet?.decisionBoundary?.exactApprovalPhraseAvailable ?? null,
      mailerLiteApiCalledByPacket: packet?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteMutationsPerformedByPacket: packet?.safety?.mailerLiteMutationsPerformed ?? null,
      tokensPrinted: packet?.safety?.tokensPrinted ?? null,
      exactUrlsPrinted: packet?.safety?.exactUrlsPrinted ?? null,
    },
    commandAfterApproval: null,
    notes: [
      apiExistingDraftUpdateRecommendedNow
        ? 'API existing-draft updates may be worth a separate approval packet, but this strategy packet is not that approval.'
        : 'Current E02/E03 metadata is not inert enough for an API edit; keep API for read-only QA and future checks.',
      apiCreateRealDraftsRecommendedNow
        ? 'Review this unexpected result before using API-created real replacement drafts.'
        : 'The current disposable lab did not find a safe API recipe for creating real replacement drafts.',
    ],
  });
};

const shopifyLocalBuildReceiptCompleted = (receipt, targetNames) =>
  receipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes'
  && receipt?.shopifyRepo?.localFilesCreatedOrUpdated === targetNames.length
  && receipt?.validation?.jsonTemplatesParsed === true
  && receipt?.validation?.noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles === true
  && receipt?.validation?.noMailerLiteScriptsFoundInNewFiles === true
  && receipt?.validation?.noShopifyAdminApiOrPublishCommandRun === true
  && receipt?.validation?.noRealFormAction === true
  && receipt?.validation?.noCrmWorkflowSubscriberOrScoringTermsFoundInNewFiles === true
  && receipt?.placeholders?.present === true
  && receipt?.placeholders?.inert === true
  && receipt?.safety?.shopifyApiCalled === false
  && receipt?.safety?.shopifyPublishPerformed === false
  && receipt?.safety?.themePushPerformed === false
  && receipt?.safety?.realFormsCreated === false
  && receipt?.safety?.mailerLiteApiCalled === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.subscribersRead === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false;

const buildShopifyLocalBuildItem = ({ request, receipt = null }) => {
  const suggestedFiles = targetNamesFrom(
    request?.requestedLocalScope?.files,
    request?.requestedLocalScope?.shopifyFiles,
    request?.requestedLocalScope?.proposedFiles,
  );
  const receiptFiles = targetNamesFrom(receipt?.files);
  const targetNames = receiptFiles.length > 0 ? receiptFiles : suggestedFiles;
  const receiptCompleted = shopifyLocalBuildReceiptCompleted(receipt, targetNames);
  if (receiptCompleted) {
    return buildApprovalItem({
      id: 'shopify_no_live_local_build',
      title: 'Shopify local no-live build files',
      lane: 'web_design_shopify_local_only',
      operationType: 'local_shopify_repo_edit_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        request: request?.status ?? null,
        receipt: receipt?.status ?? null,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: receipt?.stillClosedAfterThisReceipt ?? [
        'shopify_api_or_live_theme',
        'publish',
        'real_forms',
        'mailerlite_live_connection',
        'crm_live_write',
        'subscriber_or_workflow_mutation',
      ],
      requiredFreshEvidence: [
        'do not publish or connect the local files without a new exact approval',
        'run browser/mobile QA before any future preview or publish boundary',
      ],
      blockers: [],
      evidence: {
        receiptStatus: receipt.status,
        localFilesCreatedOrUpdated: receipt.shopifyRepo.localFilesCreatedOrUpdated,
        placeholdersPresent: receipt.placeholders?.present ?? null,
        placeholdersInert: receipt.placeholders?.inert ?? null,
        jsonTemplatesParsed: receipt.validation?.jsonTemplatesParsed ?? null,
        noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles: receipt.validation?.noExternalUrlsOrSubscriptionEndpointsFoundInNewFiles ?? null,
        noMailerLiteScriptsFoundInNewFiles: receipt.validation?.noMailerLiteScriptsFoundInNewFiles ?? null,
        noShopifyAdminApiOrPublishCommandRun: receipt.validation?.noShopifyAdminApiOrPublishCommandRun ?? null,
        noRealFormAction: receipt.validation?.noRealFormAction ?? null,
        shopifyApiCalled: receipt.safety?.shopifyApiCalled ?? null,
        shopifyPublishPerformed: receipt.safety?.shopifyPublishPerformed ?? null,
        realFormsCreated: receipt.safety?.realFormsCreated ?? null,
        mailerLiteApiCalled: receipt.safety?.mailerLiteApiCalled ?? null,
        crmLiveApiCalled: receipt.safety?.crmLiveApiCalled ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The approved Shopify no-live local build boundary has already been used.',
        'The five local files remain disconnected; preview/publish/form connection require separate approval.',
      ],
    });
  }

  const blockers = [];

  if (request?.status !== 'ready_for_human_or_web_design_scope_approval_no_live_changes') {
    blockers.push(`shopify_local_build_request_not_ready:${request?.status ?? 'missing'}`);
  }
  if (!cleanString(request?.approvalGate?.requiredPhraseBeforeLocalFiles)) blockers.push('missing_exact_approval_phrase');
  if (request?.approvalGate?.canBuildLocalFilesNow !== false) blockers.push('local_build_gate_unexpectedly_open');
  if (request?.approvalGate?.canPublishOrConnectNow !== false) blockers.push('publish_or_connect_gate_unexpectedly_open');

  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'shopify_no_live_local_build',
    title: 'Shopify local no-live build files',
    lane: 'web_design_shopify_local_only',
    operationType: 'local_repo_edit_after_exact_no_live_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: request?.approvalGate?.requiredPhraseBeforeLocalFiles,
    sourceStatuses: {
      request: request?.status ?? null,
    },
    targetNames: suggestedFiles,
    allowedAfterExactApproval: [
      'edit_only_local_shopify_repo_files_named_in_the_request',
      'use inert placeholders only',
      'do not publish or call APIs',
    ],
    stillClosed: [
      'shopify_api_or_live_theme',
      'publish',
      'real_forms',
      'mailerlite_live_connection',
      'crm_live_write',
      'subscriber_or_workflow_mutation',
    ],
    requiredFreshEvidence: [
      'confirm exact file scope',
      'confirm inert placeholders',
      'confirm no Shopify CLI/API publish action',
    ],
    blockers,
    evidence: {
      suggestedFileCount: suggestedFiles.length,
      canPublishOrConnectNow: request?.approvalGate?.canPublishOrConnectNow ?? null,
    },
    commandAfterApproval: 'local Shopify repo edits only in /Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite',
    notes: ['This is a no-live local build approval, not a Shopify publish or MailerLite form approval.'],
  });
};

const shopifyPreviewRouteDecisionReady = (decision) =>
  decision?.ok === true
  && decision?.status === 'shopify_preview_route_decision_ready_for_human_explanation_no_live_changes'
  && decision?.executiveSummary?.decisionExplanationReady === true
  && decision?.executiveSummary?.recommendedVisibilityTier === 'unlisted_noindex_preview'
  && decision?.executiveSummary?.exactApprovalPhraseAvailable === false
  && decision?.executiveSummary?.exactApprovalPhrasePrinted === false
  && decision?.executiveSummary?.canAskApprovalNow === false
  && decision?.executiveSummary?.canPublishNow === false
  && decision?.safety?.shopifyApiCalled === false
  && decision?.safety?.shopifyRepoFilesWritten === false
  && decision?.safety?.mailerLiteApiCalled === false
  && decision?.safety?.sendsPerformed === false;

const shopifyPreviewRouteApprovalPacketReady = (packet) =>
  packet?.ok === true
  && packet?.status === 'shopify_preview_route_approval_packet_ready_for_exact_human_approval_no_live_changes'
  && packet?.approvalBoundary?.canAskAlejandroForApproval === true
  && packet?.approvalBoundary?.canExecuteNow === false
  && cleanString(packet?.approvalBoundary?.exactApprovalPhrase)
  && packet?.safety?.shopifyApiCalled === false
  && packet?.safety?.shopifyMutationsPerformed === false
  && packet?.safety?.mailerLiteApiCalled === false
  && packet?.safety?.crmLiveApiCalled === false
  && packet?.safety?.sendsPerformed === false;

const shopifyPreviewRouteExecutionReady = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm'
  && receipt?.executionSummary?.previewRouteReady === true
  && receipt?.executionSummary?.targetLinkCount === 3
  && receipt?.executionSummary?.publicAudienceSendUrlGateReady === false
  && receipt?.executionSummary?.canUseForLocalCorrectionPreview === true
  && receipt?.executionSummary?.canUseForPublicAudienceSend === false
  && receipt?.executionSummary?.requiresSeparateMailerLiteUiEditApprovalBeforeDraftMutation === true
  && receipt?.safety?.scopedLiveShopifyMutationApproved === true
  && receipt?.safety?.shopifyApiCalled === true
  && receipt?.safety?.shopifyMutationsPerformed === true
  && receipt?.safety?.shopifyThemePublished === false
  && receipt?.safety?.siteNavigationUpdated === false
  && receipt?.safety?.seoIndexingAllowed === false
  && receipt?.safety?.realFormsCreated === false
  && receipt?.safety?.mailerLiteApiCalled === false
  && receipt?.safety?.mailerLiteMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.groupMutationsPerformed === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.tokensPrinted === false
  && receipt?.qa?.automatedHtmlQa?.statusHttp200ForAll === true
  && receipt?.qa?.automatedHtmlQa?.noindexForAll === true
  && receipt?.qa?.automatedHtmlQa?.mailerLiteMatchesForAll === 0
  && receipt?.qa?.automatedHtmlQa?.externalFormActionsForAll === 0;

const buildShopifyPreviewRouteItem = ({ decision, approvalPacket = null, executionReceipt = null }) => {
  const executionReady = shopifyPreviewRouteExecutionReady(executionReceipt);
  const targetNames = targetNamesFrom(
    (executionReceipt?.targetLinks ?? []).map((target) => target?.label ?? target?.key),
    (approvalPacket?.targetLinks ?? []).map((target) => target?.label ?? target?.key),
    (decision?.slotScope ?? []).map((slot) => slot?.label ?? slot?.key),
  );
  const decisionReady = shopifyPreviewRouteDecisionReady(decision);
  const approvalReady = shopifyPreviewRouteApprovalPacketReady(approvalPacket);
  const blockers = [];

  if (executionReady) {
    return buildApprovalItem({
      id: 'shopify_unlisted_noindex_preview_route',
      title: 'Shopify unlisted/noindex preview route',
      lane: 'web_design_shopify_preview_route',
      operationType: 'live_shopify_preview_route_already_completed_for_qa_only',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        previewRouteDecision: decision?.status ?? null,
        approvalPacket: approvalPacket?.status ?? null,
        executionReceipt: executionReceipt?.status ?? null,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: [
        'mailerLite_ui_edit_or_draft_mutation',
        'public_or_audience_send',
        'workflow_or_automation_changes',
        'subscriber_or_group_assignments',
        'shopify_navigation_or_seo_publish',
        'crm_live_writes',
        'ledger_card_scoring_or_fact_store_writes',
      ],
      requiredFreshEvidence: [
        'separate MailerLite UI edit approval before replacing draft placeholders with preview URLs',
        'separate public/audience send approval after final QA',
      ],
      blockers,
      evidence: {
        decisionReady,
        approvalPacketReady: approvalReady,
        executionReceiptReady: true,
        previewRouteReady: executionReceipt?.executionSummary?.previewRouteReady ?? null,
        targetLinkCount: executionReceipt?.executionSummary?.targetLinkCount ?? null,
        effectivePreviewView: executionReceipt?.executionSummary?.effectivePreviewView ?? null,
        effectivePreviewUrlUsesViewParameter: executionReceipt?.executionSummary?.effectivePreviewUrlUsesViewParameter ?? null,
        canUseForLocalCorrectionPreview: executionReceipt?.executionSummary?.canUseForLocalCorrectionPreview ?? null,
        canUseForPublicAudienceSend: executionReceipt?.executionSummary?.canUseForPublicAudienceSend ?? null,
        publicAudienceSendUrlGateReady: executionReceipt?.executionSummary?.publicAudienceSendUrlGateReady ?? null,
        automatedHtmlQaGreen: executionReceipt?.qa?.automatedHtmlQa?.statusHttp200ForAll === true
          && executionReceipt?.qa?.automatedHtmlQa?.noindexForAll === true
          && executionReceipt?.qa?.automatedHtmlQa?.mailerLiteMatchesForAll === 0
          && executionReceipt?.qa?.automatedHtmlQa?.externalFormActionsForAll === 0,
      },
      commandAfterApproval: null,
      notes: [
        'The scoped Shopify preview-route execution is already complete and QA-green for exact-link preview use.',
        'This does not open MailerLite draft edits or audience send; those remain separate approval boundaries.',
      ],
    });
  }

  if (!decisionReady) blockers.push(`shopify_preview_route_decision_not_ready:${decision?.status ?? 'missing'}`);
  if (approvalPacket) {
    if (!approvalReady) blockers.push(`shopify_preview_route_approval_packet_not_ready:${approvalPacket?.status ?? 'missing'}`);
  } else {
    blockers.push(decisionReady
      ? 'shopify_preview_route_confirmation_or_approval_packet_missing'
      : 'shopify_preview_route_approval_packet_missing');
  }
  if (approvalPacket?.approvalBoundary?.canExecuteNow !== false) {
    blockers.push('shopify_preview_route_execute_gate_unexpectedly_open');
  }
  if (approvalPacket?.approvalBoundary?.packetIsApprovalByItself !== false) {
    blockers.push('shopify_preview_route_packet_self_authorizes_unexpectedly');
  }
  if (approvalPacket && !cleanString(approvalPacket?.approvalBoundary?.exactApprovalPhrase)) {
    blockers.push('missing_exact_approval_phrase');
  }
  if (targetNames.length !== 3) blockers.push(`shopify_preview_route_target_count_not_3:${targetNames.length}`);

  const canAskNow = approvalReady && blockers.length === 0;

  return buildApprovalItem({
    id: 'shopify_unlisted_noindex_preview_route',
    title: 'Shopify unlisted/noindex preview route',
    lane: 'web_design_shopify_preview_route',
    operationType: 'live_shopify_preview_route_after_exact_approval',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: approvalPacket?.approvalBoundary?.exactApprovalPhrase ?? null,
    sourceStatuses: {
      previewRouteDecision: decision?.status ?? null,
      approvalPacket: approvalPacket?.status ?? null,
      confirmation: approvalPacket?.humanDecisionConfirmation?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: approvalPacket?.approvalBoundary?.allowedAfterExactApproval
      ?? decision?.proposedScopeIfLaterApproved?.allowedActions
      ?? [],
    stillClosed: approvalPacket?.approvalBoundary?.stillClosedEvenAfterApproval
      ?? decision?.proposedScopeIfLaterApproved?.forbiddenActions
      ?? [],
    requiredFreshEvidence: approvalPacket?.approvalBoundary?.requiredFreshEvidenceBeforeExecution
      ?? decision?.proposedScopeIfLaterApproved?.requiredReceiptFields
      ?? [],
    blockers,
    evidence: {
      decisionReady,
      approvalPacketReady: approvalReady,
      recommendedVisibilityTier: decision?.executiveSummary?.recommendedVisibilityTier ?? approvalPacket?.executiveSummary?.recommendedVisibilityTier ?? null,
      decisionExplanationReady: decision?.executiveSummary?.decisionExplanationReady ?? null,
      humanDecisionConfirmed: approvalPacket?.executiveSummary?.humanDecisionConfirmed ?? null,
      exactApprovalPhraseAvailable: approvalPacket?.executiveSummary?.exactApprovalPhraseAvailable ?? false,
      exactApprovalPhrasePrintedInApprovalPacket: approvalPacket?.executiveSummary?.exactApprovalPhrasePrinted ?? false,
      canExecuteNow: approvalPacket?.approvalBoundary?.canExecuteNow ?? null,
      publicAudienceSendUrlGateReady: approvalPacket?.executiveSummary?.publicAudienceSendUrlGateReady
        ?? decision?.executiveSummary?.publicAudienceSendUrlGateReady
        ?? null,
      localAssetSlotReadyCount: decision?.executiveSummary?.localAssetSlotReadyCount ?? null,
      requiredPublicUrlCount: decision?.executiveSummary?.requiredPublicUrlCount ?? null,
    },
    commandAfterApproval: canAskNow
      ? 'future Shopify preview-route execution only after fresh QA and a local execution receipt; no MailerLite/CRM/subscriber/workflow/send bundle'
      : null,
    notes: [
      approvalReady
        ? 'Alejandro confirmed the unlisted/noindex preview-route decision; exact approval still only opens this preview-route boundary.'
        : 'The preview-route strategy is separated from execution so confirmation cannot be mistaken for Shopify permission.',
      'This boundary is for QA-accessible links only; audience send remains closed until the same slots are live/promoted and post-correction QA is green.',
    ],
  });
};

const isFalse = (value) => value === false;
const anyIncludes = (items, fragments) => (items ?? [])
  .some((item) => fragments.some((fragment) => String(item).includes(fragment)));
const allContentChecksGreen = (checks) =>
  Boolean(checks) && Object.values(checks).every((value) => value === true);
const brujulaManualUiReceiptStatus = (receipt) => receipt?.status ?? null;
const brujulaManualUiCampaignId = (receipt) =>
  receipt?.executiveSummary?.campaignId ?? receipt?.campaign?.id ?? null;
const brujulaManualUiCampaignName = (receipt) =>
  receipt?.executiveSummary?.campaignName ?? receipt?.campaign?.name ?? null;
const brujulaManualUiSubject = (receipt) =>
  receipt?.executiveSummary?.subject ?? receipt?.campaign?.subject ?? null;
const brujulaManualUiOutboxCount = (receipt) =>
  receipt?.executiveSummary?.outboxCountAfterBuild
    ?? receipt?.verification?.postExecutionApiVerify?.readyOutboxCampaignsRead
    ?? null;
const brujulaManualUiCreatedOrEditedCount = (receipt) =>
  receipt?.executiveSummary?.createdOrEditedDraftCount
    ?? (receipt?.campaign?.id && receipt?.campaign?.status === 'draft' ? 1 : null);
const brujulaManualUiRecipientsEmptyObserved = (receipt) =>
  receipt?.draftReceipt?.recipientsEmptyObserved
    ?? (receipt?.campaign?.recipientsSelected === false && receipt?.campaign?.groupsOrSegmentsSelected === false);
const brujulaManualUiSendsPerformed = (receipt) =>
  receipt?.safety?.sendsPerformed ?? receipt?.campaign?.sent ?? null;

const brujulaManualUiReceiptClosed = (receipt, expectedSubject) => {
  const status = brujulaManualUiReceiptStatus(receipt);
  const oldSchemaClosed = status === 'brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends'
    && brujulaManualUiCreatedOrEditedCount(receipt) === 1
    && brujulaManualUiSubject(receipt) === expectedSubject
    && brujulaManualUiOutboxCount(receipt) === 0
    && receipt?.draftReceipt?.uiVisibleInDrafts === true
    && receipt?.draftReceipt?.contentCopiedFromLocalHtmlPath === true
    && brujulaManualUiRecipientsEmptyObserved(receipt) === true
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesCreated === false
    && receipt?.safety?.subscribersReadOrAssigned === false
    && receipt?.safety?.groupsCreatedOrAssigned === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && anyIncludes(receipt?.stillClosedAfterThisReceipt, ['test_send_or_public_send']);

  const verify = receipt?.verification?.postExecutionApiVerify ?? {};
  const greenReceiptClosed = status === 'brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends'
    && receipt?.ok === true
    && receipt?.scope?.approvedScopeId === 'brujula_email1_builder_draft'
    && receipt?.scope?.exactApprovalMatched === true
    && brujulaManualUiCreatedOrEditedCount(receipt) === 1
    && brujulaManualUiSubject(receipt) === expectedSubject
    && receipt?.campaign?.status === 'draft'
    && isFalse(receipt?.campaign?.recipientsSelected)
    && isFalse(receipt?.campaign?.groupsOrSegmentsSelected)
    && isFalse(receipt?.campaign?.scheduled)
    && isFalse(receipt?.campaign?.sent)
    && verify?.status === 'post_ui_paste_verify_green'
    && verify?.targetInDraft === true
    && verify?.targetInReadyOutbox === false
    && verify?.targetInSent === false
    && allContentChecksGreen(verify?.contentChecks)
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesPerformed === false
    && receipt?.safety?.publicCampaignPublished === false
    && receipt?.safety?.subscriberMutationsPerformed === false
    && receipt?.safety?.groupsCreated === false
    && receipt?.safety?.groupAssignmentsPerformed === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && anyIncludes(receipt?.scope?.stillClosed, ['send_email_or_test_email', 'cards_scoring_or_fact_store_writes']);

  return oldSchemaClosed || greenReceiptClosed;
};

const seedTestExecutionCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'seed_test_execution_completed_verified_by_gmail_no_public_send'
  && receipt?.gmailVerification?.observedTestMessageCount === 4
  && receipt?.gmailVerification?.expectedTestMessageCount === 4
  && receipt?.gmailVerification?.allSubjectsMatchedExpected === true
  && receipt?.gmailVerification?.allRecipientsMatchedApprovedSeedRecipient === true
  && receipt?.uiExecution?.verificationEmail?.sentOnlyToApprovedSeedRecipient === true
  && receipt?.uiExecution?.verificationEmail?.completed === true
  && receipt?.uiExecution?.outboxCountObservedAfterExecution === 0
  && receipt?.safety?.testEmailsSentToSeedRecipientCount === 4
  && receipt?.safety?.verificationEmailSentToSeedRecipientCount === 1
  && receipt?.safety?.publicCampaignSendPerformed === false
  && receipt?.safety?.audienceSendPerformed === false
  && receipt?.safety?.subscribersCreatedOrImported === false
  && receipt?.safety?.subscribersAssignedOutsideSeedRecipient === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowsOrAutomationsCreatedOrEditedOrActivated === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.shopifyFilesChangedByThisExecution === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.signalLedgerAppendPerformed === false
  && receipt?.safety?.crmCardMutationsPerformed === false
  && receipt?.safety?.crmScoreMutationsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.secretsOrVerificationTokensPrinted === false;

const nullAudienceSeedTestSendCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'mailerlite_null_audience_seed_test_send_completed_test_only'
  && receipt?.mode === 'record_ui_sent'
  && receipt?.preflight?.targetCount === 4
  && receipt?.preflight?.qaGreenCount === 4
  && countRows(receipt?.sentTests) === 4
  && receipt?.decision?.approval?.status === 'exact_approval_phrase_matched'
  && receipt?.safety?.mailerLiteApiCalled === true
  && receipt?.safety?.mailerLiteTestEmailsSent === 4
  && receipt?.safety?.testSendExecutionChannel === 'mailerlite_ui_manual_assisted'
  && receipt?.safety?.audienceSendsPerformed === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.subscribersRead === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.additionalGroupsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.shopifyMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.signalLedgerAppendPerformed === false
  && receipt?.safety?.crmCardMutationsPerformed === false
  && receipt?.safety?.crmScoreMutationsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.exactUrlsPrinted === false
  && receipt?.safety?.tokensPrinted === false;

const buildBrujulaBuilderDraftItem = ({ correction, renderQa, realMailerLiteRenderQa = null, manualUiReceipt = null }) => {
  const subject = cleanString(correction?.draft?.subject) ?? 'Brújula Email 1';
  const htmlPath = cleanString(correction?.outputs?.htmlPath);
  const receiptClosed = brujulaManualUiReceiptClosed(manualUiReceipt, subject);

  if (receiptClosed) {
    return buildApprovalItem({
      id: 'brujula_email1_builder_draft',
      title: 'Brújula Email 1 corrected MailerLite draft',
      lane: 'brujula_test_pilot',
      operationType: 'live_mailerlite_builder_draft_mutation_already_completed',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        correction: correction?.status ?? null,
        renderQa: renderQa?.status ?? null,
        realMailerLiteRenderQa: realMailerLiteRenderQa?.status ?? null,
        manualUiReceipt: manualUiReceipt?.status ?? null,
      },
      targetNames: [subject],
      allowedAfterExactApproval: [],
      stillClosed: [
        'test_send_or_public_send',
        'workflow_activation',
        'subscriber_or_group_mutation',
        'shopify_publish',
        'crm_write',
        'fact_store_write',
      ],
      requiredFreshEvidence: [
        'use the manual UI build receipt as current Brújula Email 1 draft state',
        realMailerLiteRenderQa?.status === 'brujula_email1_real_mailerlite_render_qa_green_no_live_changes'
          ? 'real MailerLite render QA is green; exact recipient and exact test-send approval are still required'
          : 'run real MailerLite render QA before any test-send approval request',
      ],
      blockers: [],
      evidence: {
        receiptStatus: brujulaManualUiReceiptStatus(manualUiReceipt),
        campaignId: brujulaManualUiCampaignId(manualUiReceipt),
        campaignName: brujulaManualUiCampaignName(manualUiReceipt),
        createdOrEditedDraftCount: brujulaManualUiCreatedOrEditedCount(manualUiReceipt),
        outboxCountAfterBuild: brujulaManualUiOutboxCount(manualUiReceipt),
        recipientsEmptyObserved: brujulaManualUiRecipientsEmptyObserved(manualUiReceipt),
        sendsPerformed: brujulaManualUiSendsPerformed(manualUiReceipt),
        realMailerLiteRenderQaGreen: realMailerLiteRenderQa?.status === 'brujula_email1_real_mailerlite_render_qa_green_no_live_changes',
        realMailerLiteRenderQaStatus: realMailerLiteRenderQa?.status ?? null,
        realMailerLiteRenderBlockerCount: realMailerLiteRenderQa?.executiveSummary?.blockerCount ?? null,
        contentChecks: manualUiReceipt?.verification?.postExecutionApiVerify?.contentChecks ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The approved Brújula Email 1 draft build boundary has already been used.',
        'Test send, public send, workflows, subscribers, groups, Shopify, CRM and Fact Store remain separate closed gates.',
      ],
    });
  }

  const blockers = [];

  if (correction?.status !== 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes') {
    blockers.push(`brujula_correction_not_ready:${correction?.status ?? 'missing'}`);
  }
  if (renderQa?.status !== 'brujula_email1_local_render_qa_green_no_live_changes') {
    blockers.push(`brujula_render_qa_not_green:${renderQa?.status ?? 'missing'}`);
  }
  if (renderQa?.executiveSummary?.localRenderReady !== true) blockers.push('local_render_not_ready');
  if (!htmlPath) blockers.push('missing_local_html_path');

  const canAskNow = blockers.length === 0;
  const exactPhrase = `Apruebo SOLO crear/editar como borrador en MailerLite el Email 1 corregido de Brújula usando el HTML local ${htmlPath ?? '<html path missing>'}, sin enviar correos, sin publicar, sin activar workflows, sin subscribers, sin crear grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;

  return buildApprovalItem({
    id: 'brujula_email1_builder_draft',
    title: 'Brújula Email 1 corrected MailerLite draft',
    lane: 'brujula_test_pilot',
    operationType: 'live_mailerlite_builder_draft_mutation_after_exact_approval',
    approvalType: 'exact_phrase_required',
    canAskNow,
    exactApprovalPhrase: exactPhrase,
    sourceStatuses: {
      correction: correction?.status ?? null,
      renderQa: renderQa?.status ?? null,
    },
    targetNames: [subject],
    allowedAfterExactApproval: [
      'create_or_edit_only_the_brujula_email1_draft_in_mailerlite',
      'use_the_local_corrected_html_and_plain_text',
      'run_real_mailerlite_render_qa_before_any_test_send_request',
    ],
    stillClosed: [
      'test_send_or_public_send',
      'workflow_activation',
      'subscriber_or_group_mutation',
      'shopify_publish',
      'crm_write',
      'fact_store_write',
    ],
    requiredFreshEvidence: [
      'confirm local HTML path exists',
      'confirm local render QA is still green',
      'confirm target MailerLite draft identity before edit',
    ],
    blockers,
    evidence: {
      htmlPath,
      localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
      testSendReady: renderQa?.executiveSummary?.testSendReady ?? correction?.executiveSummary?.testSendReady ?? null,
    },
    commandAfterApproval: 'future MailerLite builder draft edit only after exact approval; no test send',
    notes: ['This advances the Brújula pilot toward builder QA but does not make it public-use ready.'],
  });
};

const buildMiniLaunchSeedSendItem = ({
  payloadManifest,
  renderQa = null,
  manualUiReceipt = null,
  seedTestQaPacket = null,
  seedSendApprovalPacket = null,
  seedTestExecutionReceipt = null,
  nullAudienceSeedTestSendReceipt = null,
}) => {
  const manualUiDraftsBuilt = manualUiReceipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && manualUiReceipt?.executiveSummary?.createdOrEditedDraftCount === 4;
  const seedPacketBlockers = seedTestQaPacket?.readiness?.machineBlockersBeforeSeedSendApprovalRequest;
  const seedPacketCanAsk = seedTestQaPacket?.seedSendApprovalBoundary?.canAskAlejandroForApproval === true;
  const privateSeedReady = seedSendApprovalPacket?.status === 'seed_send_approval_packet_ready_for_exact_human_approval_no_live_changes'
    && seedSendApprovalPacket?.approvalBoundary?.canAskAlejandroForApproval === true
    && seedSendApprovalPacket?.approvalBoundary?.canExecuteSendNow === false
    && seedSendApprovalPacket?.executiveSummary?.openLiveMutationGateCount === 0;
  const privateSeedWaiting = seedSendApprovalPacket?.status === 'seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes';
  const privateSeedBlockers = privateSeedReady
    ? []
    : privateSeedWaiting
      ? ['exact_seed_recipient_missing']
      : seedSendApprovalPacket
        ? [`seed_send_approval_packet_not_ready:${seedSendApprovalPacket.status ?? 'missing'}`]
        : [];
  const blockers = [...new Set(privateSeedReady
    ? []
    : Array.isArray(seedPacketBlockers)
    ? [
      ...seedPacketBlockers,
      ...(seedPacketCanAsk ? ['private_seed_send_approval_packet_missing'] : []),
      ...privateSeedBlockers,
    ]
    : [
      ...(manualUiDraftsBuilt ? [] : ['asset_build_not_executed']),
      'real_mailerlite_render_qa_missing',
      'exact_seed_recipient_missing',
      ...privateSeedBlockers,
    ])];
  const executionCompleted = seedTestExecutionCompleted(seedTestExecutionReceipt);
  const nullAudienceSeedSent = nullAudienceSeedTestSendCompleted(nullAudienceSeedTestSendReceipt);
  const targetNames = targetNamesFrom(
    (seedTestQaPacket?.targetDrafts ?? []).map((draft) => draft?.draftName),
    (seedTestExecutionReceipt?.uiExecution?.campaigns ?? []).map((campaign) => campaign?.draftName),
    (nullAudienceSeedTestSendReceipt?.targetPlan ?? []).map((target) => target?.name),
    (nullAudienceSeedTestSendReceipt?.sentTests ?? []).map((sent) => sent?.name),
  );

  if (nullAudienceSeedSent) {
    return buildApprovalItem({
      id: 'mini_launch_seed_send',
      title: 'Mini-launch seed/test send',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'mailerLite_null_audience_seed_test_sent_inbox_qa_pending',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        payloadManifest: payloadManifest?.status ?? null,
        renderQa: renderQa?.status ?? null,
        manualUiReceipt: manualUiReceipt?.status ?? null,
        seedTestQaPacket: seedTestQaPacket?.status ?? null,
        seedSendApprovalPacket: seedSendApprovalPacket?.status ?? null,
        seedTestExecutionReceipt: seedTestExecutionReceipt?.status ?? null,
        nullAudienceSeedTestSendReceipt: nullAudienceSeedTestSendReceipt.status,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: [
        'additional_seed_or_test_send',
        'public_or_audience_send',
        'publish_or_schedule',
        'workflow_or_automation_attachment',
        'subscriber_import_assignment_or_mutation',
        'group_creation_or_assignment',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidence: [
        'perform seed inbox QA on the four received test emails',
        'confirm copy, formatting, footer, links and replies before any public/audience launch boundary',
        'require a new exact approval before any additional test send or audience send',
      ],
      blockers: [],
      evidence: {
        seedTestSendCompleted: true,
        inboxQaVerified: false,
        seedRecipientRedacted: nullAudienceSeedTestSendReceipt.seedRecipient?.redacted ?? seedSendApprovalPacket?.seedIdentity?.redactedEmail ?? null,
        targetCount: nullAudienceSeedTestSendReceipt.preflight?.targetCount ?? null,
        qaGreenCount: nullAudienceSeedTestSendReceipt.preflight?.qaGreenCount ?? null,
        testEmailsSentToSeedRecipientCount: nullAudienceSeedTestSendReceipt.safety?.mailerLiteTestEmailsSent ?? null,
        executionChannel: nullAudienceSeedTestSendReceipt.safety?.testSendExecutionChannel ?? null,
        audienceSendPerformed: nullAudienceSeedTestSendReceipt.safety?.audienceSendsPerformed ?? null,
        campaignsPublished: nullAudienceSeedTestSendReceipt.safety?.campaignsPublished ?? null,
        campaignsScheduled: nullAudienceSeedTestSendReceipt.safety?.campaignsScheduled ?? null,
        subscribersRead: nullAudienceSeedTestSendReceipt.safety?.subscribersRead ?? null,
        subscriberMutationsPerformed: nullAudienceSeedTestSendReceipt.safety?.subscriberMutationsPerformed ?? null,
        groupsCreatedOrAssigned: nullAudienceSeedTestSendReceipt.safety?.additionalGroupsCreatedOrAssigned ?? null,
        workflowMutationsPerformed: nullAudienceSeedTestSendReceipt.safety?.workflowMutationsPerformed ?? null,
        exactUrlsPrinted: nullAudienceSeedTestSendReceipt.safety?.exactUrlsPrinted ?? null,
        tokensPrinted: nullAudienceSeedTestSendReceipt.safety?.tokensPrinted ?? null,
      },
      commandAfterApproval: null,
      notes: [
        'The exact seed/test approval boundary has already been used through MailerLite UI on the Null Audience replacement drafts.',
        'This is not Gmail/inbox QA completion and does not authorize public/audience sends, schedules, workflows, subscribers, groups, Shopify, CRM, ledgers, cards, scoring or Fact Store.',
      ],
    });
  }

  if (executionCompleted) {
    return buildApprovalItem({
      id: 'mini_launch_seed_send',
      title: 'Mini-launch seed/test send',
      lane: 'mini_launch_inteligencia_para_descansar',
      operationType: 'mailerLite_seed_test_completed_reference_only',
      approvalType: 'reference_only_completed',
      canAskNow: false,
      exactApprovalPhrase: null,
      sourceStatuses: {
        payloadManifest: payloadManifest?.status ?? null,
        renderQa: renderQa?.status ?? null,
        manualUiReceipt: manualUiReceipt?.status ?? null,
        seedTestQaPacket: seedTestQaPacket?.status ?? null,
        seedSendApprovalPacket: seedSendApprovalPacket?.status ?? null,
        seedTestExecutionReceipt: seedTestExecutionReceipt.status,
      },
      targetNames,
      allowedAfterExactApproval: [],
      stillClosed: seedTestExecutionReceipt?.remainingClosedGates ?? [
        'public_or_audience_send',
        'publish_or_schedule',
        'workflow_or_automation_attachment',
        'subscriber_import_assignment_or_mutation',
        'group_creation_or_assignment',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidence: [
        'use the seed-test execution receipt as completed evidence',
        'perform human inbox QA before any correction or public/audience launch boundary',
        'require a new exact approval before any additional test send or audience send',
      ],
      blockers: [],
      evidence: {
        seedTestExecutionCompleted: true,
        seedRecipientRedacted: seedTestExecutionReceipt.seedRecipient?.redactedEmail ?? seedSendApprovalPacket?.seedIdentity?.redactedEmail ?? null,
        observedTestMessageCount: seedTestExecutionReceipt.gmailVerification.observedTestMessageCount,
        expectedTestMessageCount: seedTestExecutionReceipt.gmailVerification.expectedTestMessageCount,
        allSubjectsMatchedExpected: seedTestExecutionReceipt.gmailVerification.allSubjectsMatchedExpected,
        allRecipientsMatchedApprovedSeedRecipient: seedTestExecutionReceipt.gmailVerification.allRecipientsMatchedApprovedSeedRecipient,
        verificationEmailSentToSeedRecipientCount: seedTestExecutionReceipt.safety.verificationEmailSentToSeedRecipientCount,
        testEmailsSentToSeedRecipientCount: seedTestExecutionReceipt.safety.testEmailsSentToSeedRecipientCount,
        outboxCountAfterExecution: seedTestExecutionReceipt.uiExecution.outboxCountObservedAfterExecution,
        draftsTabCountAfterExecution: seedTestExecutionReceipt.uiExecution.draftsTabCountObservedAfterExecution ?? null,
        browser: seedTestExecutionReceipt.uiExecution.browser ?? null,
        publicCampaignSendPerformed: seedTestExecutionReceipt.safety.publicCampaignSendPerformed,
        audienceSendPerformed: seedTestExecutionReceipt.safety.audienceSendPerformed,
        subscribersCreatedOrImported: seedTestExecutionReceipt.safety.subscribersCreatedOrImported,
        groupsCreatedOrAssigned: seedTestExecutionReceipt.safety.groupsCreatedOrAssigned,
        workflowsOrAutomationsCreatedOrEditedOrActivated: seedTestExecutionReceipt.safety.workflowsOrAutomationsCreatedOrEditedOrActivated,
        secretsOrVerificationTokensPrinted: seedTestExecutionReceipt.safety.secretsOrVerificationTokensPrinted,
      },
      commandAfterApproval: null,
      notes: [
        'The exact seed/test approval boundary has already been used and verified by Gmail receipts.',
        'This is not approval for public/audience sends, schedules, workflows, subscribers, groups, Shopify, CRM, ledgers, cards, scoring or Fact Store.',
      ],
    });
  }

  return buildApprovalItem({
    id: 'mini_launch_seed_send',
    title: 'Mini-launch seed/test send',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'mailerLite_seed_send_after_later_exact_approval',
    approvalType: privateSeedReady ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow: privateSeedReady,
    exactApprovalPhrase: privateSeedReady ? seedSendApprovalPacket.approvalBoundary.exactApprovalPhrase : null,
    sourceStatuses: {
      payloadManifest: payloadManifest?.status ?? null,
      renderQa: renderQa?.status ?? null,
      manualUiReceipt: manualUiReceipt?.status ?? null,
      seedTestQaPacket: seedTestQaPacket?.status ?? null,
      seedSendApprovalPacket: seedSendApprovalPacket?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: privateSeedReady
      ? seedSendApprovalPacket.approvalBoundary.allowedAfterExactApproval ?? []
      : [],
    stillClosed: seedSendApprovalPacket?.approvalBoundary?.stillClosedEvenAfterApproval
      ?? seedTestQaPacket?.seedSendApprovalBoundary?.stillClosedEvenAfterApproval
      ?? [
      'seed_send',
      'workflow_or_automation_attachment',
      'subscriber_read_assignment_or_import',
      'audience_launch',
    ],
    requiredFreshEvidence: seedSendApprovalPacket?.approvalBoundary?.requiredFreshEvidenceBeforeExecution
      ?? seedTestQaPacket?.seedSendApprovalBoundary?.requiredBeforeApprovalRequest
      ?? [
      manualUiDraftsBuilt
        ? 'manual UI drafts exist; run real MailerLite builder/render QA on those drafts'
        : 'assets must first be built as drafts after exact asset-build or manual UI approval',
      'exact seed recipient and asset scope must be named',
    ],
    blockers,
    evidence: {
      manualUiDraftsBuilt,
      manualUiReceiptStatus: manualUiReceipt?.status ?? null,
      seedTestQaPacketStatus: seedTestQaPacket?.status ?? null,
      seedRecipientSupplied: seedTestQaPacket?.seedIdentity?.supplied ?? false,
      seedSendApprovalPacketStatus: seedSendApprovalPacket?.status ?? null,
      seedRecipientRedacted: seedSendApprovalPacket?.seedIdentity?.redactedEmail ?? seedTestQaPacket?.seedIdentity?.redactedEmail ?? null,
      privateSeedApprovalPacketReady: privateSeedReady,
      canAskSeedSendApprovalNow: seedTestQaPacket?.readiness?.canAskSeedSendApprovalNow ?? false,
      realMailerLiteRenderQaReady: seedTestQaPacket?.readiness?.realMailerLiteRenderQaReady ?? false,
      targetGroupsExist: seedTestQaPacket?.readiness?.targetGroupsExist ?? null,
      seedPreflightBlockers: seedPacketBlockers ?? null,
      readyForSeedSendNow: payloadManifest?.executiveSummary?.readyForSeedSendNow ?? null,
      localRenderReady: renderQa?.executiveSummary?.localRenderReady ?? null,
      renderPreviewNonEmptyCount: renderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      outboxCountAfterManualBuild: manualUiReceipt?.executiveSummary?.outboxCountAfterBuild ?? null,
    },
    commandAfterApproval: null,
    notes: [
      privateSeedReady
        ? 'Private seed-send approval packet is ready; exact approval still required before any test send.'
        : null,
      manualUiDraftsBuilt
        ? 'Manual UI drafts are present; use the seed-test QA packet as the current preflight source before any send request.'
        : 'Do not ask for seed-send approval from the asset-build packet alone.',
    ].filter(Boolean),
  });
};

const nullAudienceSeedInboxQaNeedsE04Resend = (qa) =>
  qa?.status === 'mailerlite_null_audience_seed_inbox_qa_partial_blocked_e04_not_delivered_to_seed'
  && qa?.deliverySummary?.expectedSeedMessages === 4
  && qa?.deliverySummary?.deliveredToApprovedSeed === 3
  && qa?.deliverySummary?.newCorrectedMessagesFoundOutsideApprovedSeed === 1
  && qa?.deliverySummary?.seedInboxQaGreen === false
  && qa?.decision?.needsHumanApprovalBeforeAnyAdditionalSend === true
  && qa?.safety?.gmailReadOnly === true
  && qa?.safety?.mailerLiteSendsPerformedByThisQa === false;

const buildMiniLaunchE04SeedResendItem = ({
  seedInboxQa,
  nullAudienceSeedTestSendReceipt = null,
  nullAudienceReplacementExecutionReceipt = null,
}) => {
  if (!seedInboxQa) return null;

  const e04 = (seedInboxQa.messageQa ?? []).find((row) => row?.label === 'E04') ?? {};
  const e04Sent = (nullAudienceSeedTestSendReceipt?.sentTests ?? []).find((row) => row?.label === 'E04') ?? {};
  const e04Replacement = (nullAudienceReplacementExecutionReceipt?.createdDrafts ?? []).find((row) => row?.label === 'E04') ?? {};
  const seedSendCompleted = nullAudienceSeedTestSendCompleted(nullAudienceSeedTestSendReceipt);
  const replacementCompleted = nullAudienceReplacementExecutionCompleted(nullAudienceReplacementExecutionReceipt);
  const qaNeedsE04Resend = nullAudienceSeedInboxQaNeedsE04Resend(seedInboxQa);
  const blockers = [
    qaNeedsE04Resend ? null : `null_audience_seed_inbox_qa_not_at_e04_resend_boundary:${seedInboxQa.status ?? 'missing'}`,
    seedSendCompleted ? null : `null_audience_seed_send_receipt_not_completed:${nullAudienceSeedTestSendReceipt?.status ?? 'missing'}`,
    replacementCompleted ? null : `null_audience_replacement_receipt_not_completed:${nullAudienceReplacementExecutionReceipt?.status ?? 'missing'}`,
    e04?.latestExpectedVersionFound === true ? null : 'corrected_e04_not_found_anywhere_in_gmail_readback',
    e04?.latestExpectedVersionRecipient === 'non_seed_sender_account' ? null : 'corrected_e04_recipient_not_confirmed_as_non_seed_sender_account',
    e04?.oldSeedVersionFound === true ? null : 'old_e04_seed_version_not_confirmed',
  ].filter(Boolean);
  const canAskNow = blockers.length === 0;

  return buildApprovalItem({
    id: 'mini_launch_null_audience_e04_seed_resend',
    title: 'Mini-launch Null Audience E04 seed-test resend',
    lane: 'mini_launch_inteligencia_para_descansar',
    operationType: 'live_mailerlite_null_audience_e04_test_resend_after_exact_approval',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: EXPECTED_E04_RESEND_APPROVAL_PHRASE,
    sourceStatuses: {
      seedInboxQa: seedInboxQa?.status ?? null,
      nullAudienceSeedTestSendReceipt: nullAudienceSeedTestSendReceipt?.status ?? null,
      nullAudienceReplacementExecutionReceipt: nullAudienceReplacementExecutionReceipt?.status ?? null,
    },
    targetNames: targetNamesFrom([
      e04Sent?.name,
      e04Replacement?.name,
      e04?.subject,
    ]),
    allowedAfterExactApproval: [
      'fresh_api_rescan_e04_only',
      'send_or_record_one_e04_test_email_only_to_exact_approved_seed_recipient',
      'rerun_gmail_seed_inbox_qa_for_e04_delivery',
      'generate_local_e04_resend_receipt',
    ],
    stillClosed: [
      'e01_e02_e03_resend',
      'public_or_audience_send',
      'publish_or_schedule',
      'workflow_or_automation_attachment',
      'subscriber_import_assignment_or_mutation',
      'group_creation_or_assignment',
      'shopify_preview_publish_or_form_connection',
      'crm_signal_ledger_append',
      'crm_card_write',
      'crm_scoring',
      'fact_store_write',
    ],
    requiredFreshEvidence: [
      'fresh MailerLite API re-scan confirms E04 remains draft',
      'fresh MailerLite API re-scan confirms E04 is assigned only to the empty Null Audience safety group',
      'fresh MailerLite API re-scan confirms safety group active_count is 0',
      'fresh content QA confirms E04 has no placeholders or redacted final-link tokens',
      'post-send Gmail readback confirms corrected E04 arrived at the exact approved seed recipient',
    ],
    blockers,
    evidence: {
      seedInboxQaGreen: seedInboxQa?.deliverySummary?.seedInboxQaGreen ?? null,
      deliveredToApprovedSeed: seedInboxQa?.deliverySummary?.deliveredToApprovedSeed ?? null,
      expectedSeedMessages: seedInboxQa?.deliverySummary?.expectedSeedMessages ?? null,
      correctedE04FoundOutsideSeed: seedInboxQa?.deliverySummary?.newCorrectedMessagesFoundOutsideApprovedSeed ?? null,
      latestCorrectedE04RecipientClass: e04?.latestExpectedVersionRecipient ?? null,
      oldSeedE04Found: e04?.oldSeedVersionFound ?? null,
      oldSeedE04RawReplyTokenPresent: e04?.bodyQa?.rawReplyTokenPresentInOldSeedVersion ?? null,
      latestCorrectedE04RawReplyTokenPresent: e04?.bodyQa?.rawReplyTokenPresentInLatestVersion ?? null,
      priorSeedTestExecutionChannel: nullAudienceSeedTestSendReceipt?.safety?.testSendExecutionChannel ?? null,
      priorAudienceSendPerformed: nullAudienceSeedTestSendReceipt?.safety?.audienceSendsPerformed ?? null,
      priorCampaignsPublished: nullAudienceSeedTestSendReceipt?.safety?.campaignsPublished ?? null,
      priorCampaignsScheduled: nullAudienceSeedTestSendReceipt?.safety?.campaignsScheduled ?? null,
      priorSubscriberMutationsPerformed: nullAudienceSeedTestSendReceipt?.safety?.subscriberMutationsPerformed ?? null,
      priorWorkflowMutationsPerformed: nullAudienceSeedTestSendReceipt?.safety?.workflowMutationsPerformed ?? null,
    },
    commandAfterApproval: 'npm run crm:vnext:mailerlite-mini-launch-null-audience-seed-test-send -- --target-labels E04 --execute --approval-phrase "<exact E04 resend phrase>"',
    notes: [
      'Use this boundary only to repair the E04 seed delivery mismatch.',
      'The corrected E04 content appears repaired, but seed delivery is not green yet.',
      'If the public API still cannot send test emails, use MailerLite UI for the E04-only send and record it with --record-ui-sent --target-labels E04 --ui-sent-labels E04 after the same fresh API QA.',
    ],
  });
};

const writeFamilyLabelsFrom = (writeApprovalPacket) =>
  (writeApprovalPacket?.writeFamilies ?? []).map((family) => cleanString(family?.title)).filter(Boolean);

const buildCrmSignalWriteItem = ({ packet, writeApprovalPacket = null }) => {
  const writePacketPresent = Boolean(writeApprovalPacket);
  const canAskNow = writeApprovalPacket?.approvalBoundary?.canAskAlejandroForApproval === true;
  const writePolicyPacketReady = writeApprovalPacket?.executiveSummary?.writePolicyPacketReady === true;
  const resolvedPolicyBlockers = writeApprovalPacket?.policyEffect?.resolvedPolicyBlockers ?? [];
  const policyBlockersStillOpen = writeApprovalPacket?.policyEffect?.policyBlockersStillOpen ?? [];
  const packetBlockers = writePacketPresent
    ? (writeApprovalPacket?.approvalBoundary?.blockersBeforeApprovalRequest ?? [])
    : ['separate_crm_write_approval_packet_missing'];
  const targetNames = writePacketPresent
    ? writeFamilyLabelsFrom(writeApprovalPacket)
    : [];

  return buildApprovalItem({
    id: 'crm_signal_writes',
    title: 'CRM signal ledger/card/scoring/Fact Store writes',
    lane: 'crm_signal_projection',
    operationType: 'crm_live_write_after_future_specific_approval_packet',
    approvalType: canAskNow ? 'exact_phrase_required' : 'not_ready_for_request',
    canAskNow,
    exactApprovalPhrase: writeApprovalPacket?.approvalBoundary?.exactApprovalPhrase ?? null,
    sourceStatuses: {
      projectionPacket: packet?.status ?? null,
      writeApprovalPacket: writeApprovalPacket?.status ?? null,
    },
    targetNames,
    allowedAfterExactApproval: writeApprovalPacket?.writeFamilies
      ?.filter((family) => family.canAskAlejandroForApproval === true)
      .map((family) => family.operationType)
      ?? [],
    stillClosed: [
      'signal_ledger_append_until_exact_event_approval',
      'crm_card_write_until_card_packet_approval',
      'crm_scoring_until_policy_and_exact_deltas_approval',
      'fact_store_write_until_exact_fact_approval',
      'mailerlite_or_shopify_mutation',
      'subscribers_workflows_or_sends',
    ],
    requiredFreshEvidence: writeApprovalPacket?.approvalBoundary?.requiredBeforeApprovalRequest ?? [
      'build a separate CRM write approval packet with exact events, people and fields',
      'confirm no subscriber/workflow/send action is bundled',
    ],
    blockers: packetBlockers,
    evidence: {
      canAppendSignalLedgerNow: packet?.approvalGate?.canAppendSignalLedgerNow ?? null,
      canWriteCardsNow: packet?.approvalGate?.canWriteCardsNow ?? null,
      canScoreNow: packet?.approvalGate?.canScoreNow ?? null,
      canWriteFactStoreNow: packet?.approvalGate?.canWriteFactStoreNow ?? null,
      writeApprovalPacketPresent: writePacketPresent,
      writeApprovalPacketStatus: writeApprovalPacket?.status ?? null,
      exactEventCountReady: writeApprovalPacket?.executiveSummary?.exactEventCountReady ?? null,
      exactPersonCountReady: writeApprovalPacket?.executiveSummary?.exactPersonCountReady ?? null,
      candidateWriteFamilyCount: writeApprovalPacket?.executiveSummary?.candidateWriteFamilyCount ?? null,
      writePolicyPacketReady,
      policyBlockersResolved: resolvedPolicyBlockers,
      policyBlockersStillOpen,
      operationsPreviewed: writeApprovalPacket?.executiveSummary?.operationsPreviewed ?? null,
      operationsExecuted: writeApprovalPacket?.executiveSummary?.operationsExecuted ?? null,
    },
    commandAfterApproval: canAskNow
      ? 'future CRM write runner only after exact approval for one write family; no MailerLite/Shopify/subscriber/workflow/send bundle'
      : null,
    notes: [
      writePacketPresent
        ? 'CRM write approval packet exists, but current state is still blocked until real observed events, exact people and one write family are named.'
        : 'Current projection packet is a no-live interpretation bridge only.',
      writePolicyPacketReady
        ? 'CRM write policy packet is ready and consumed; current blockers are evidence, identity, aggregate review, Fact Store or future exact approval gates.'
        : null,
      'Sample event-contract events cannot become person history.',
    ].filter(Boolean),
  });
};

const buildApprovalQueue = ({
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
  miniLaunchEmailManualUiDraftRepairPacket = null,
  miniLaunchSeedInboxCorrectionUiEditApprovalPacket = null,
  miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket = null,
  miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt = null,
  miniLaunchMailerLiteApiInertDraftLab = null,
  miniLaunchMailerLiteApiNullAudienceLab = null,
  miniLaunchNullAudienceReplacementApprovalPacket = null,
  miniLaunchNullAudienceReplacementExecutionReceipt = null,
  miniLaunchMailerLiteApiExistingDraftUpdateStrategy = null,
  miniLaunchSeedTestQaPacket,
  miniLaunchSeedSendApprovalPacket = null,
  miniLaunchSeedTestExecutionReceipt = null,
  miniLaunchNullAudienceSeedTestSendExecutionReceipt = null,
  miniLaunchNullAudienceSeedInboxQa = null,
  miniLaunchShopifyLocalBuildRequest,
  miniLaunchShopifyLocalBuildReceipt,
  miniLaunchShopifyPreviewRouteDecision = null,
  miniLaunchShopifyPreviewRouteApprovalPacket = null,
  miniLaunchShopifyPreviewRouteExecutionReceipt = null,
  miniLaunchCrmSignalProjectionPacket,
  miniLaunchCrmWriteApprovalPacket = null,
  brujulaEmailStyleCorrection,
  brujulaEmailRenderQa,
  brujulaRealMailerLiteRenderQa = null,
  brujulaEmailManualUiBuildReceipt,
  validationReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const cleanupItem = miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket
    ? buildMiniLaunchSeedInboxCorrectionApiReplacementCleanupItem({
      packet: miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
      executionReceipt: miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
    })
    : null;
  const cleanupRequiresAttention = cleanupItem
    && ['ready_for_exact_approval_request', 'prepared_but_blocked_before_approval_request'].includes(cleanupItem.status);
  const apiLabItem = miniLaunchMailerLiteApiInertDraftLab
    ? buildMiniLaunchMailerLiteApiInertDraftLabItem({
      lab: miniLaunchMailerLiteApiInertDraftLab,
    })
    : null;
  const apiLabRequiresAttention = apiLabItem
    && ['ready_for_exact_approval_request', 'prepared_but_blocked_before_approval_request'].includes(apiLabItem.status);
  const apiNullAudienceLabItem = miniLaunchMailerLiteApiNullAudienceLab
    ? buildMiniLaunchMailerLiteApiNullAudienceLabItem({
      lab: miniLaunchMailerLiteApiNullAudienceLab,
    })
    : null;
  const apiNullAudienceLabRequiresAttention = apiNullAudienceLabItem
    && ['ready_for_exact_approval_request', 'prepared_but_blocked_before_approval_request'].includes(apiNullAudienceLabItem.status);
  const nullAudienceReplacementItem = miniLaunchNullAudienceReplacementApprovalPacket
    ? buildMiniLaunchNullAudienceReplacementItem({
      packet: miniLaunchNullAudienceReplacementApprovalPacket,
      executionReceipt: miniLaunchNullAudienceReplacementExecutionReceipt,
    })
    : null;
  const nullAudienceReplacementCompleted = nullAudienceReplacementExecutionCompleted(miniLaunchNullAudienceReplacementExecutionReceipt);
  const nullAudienceReplacementRequiresAttention = nullAudienceReplacementItem
    && ['ready_for_exact_approval_request', 'prepared_but_blocked_before_approval_request'].includes(nullAudienceReplacementItem.status);

  const approvalItems = [
    buildMiniLaunchEmptyGroupItem({
      packet: miniLaunchEmptyGroupPacket,
      dryRun: miniLaunchEmptyGroupCreateDryRun,
    }),
    buildOnboardingV2EmptyGroupItem({
      packet: onboardingV2EmptyGroupsPacket,
      dryRun: onboardingV2EmptyGroupsCreateDryRun,
    }),
    buildMiniLaunchEmailAssetBuildItem({
      scopePacket: miniLaunchEmailAssetBuildScopePacket,
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      dryRun: miniLaunchEmailAssetBuildDryRun,
      executionAttempt: miniLaunchEmailAssetBuildExecution,
      manualUiReceipt: miniLaunchEmailManualUiBuildReceipt,
      manualUiDraftRepairPacket: miniLaunchEmailManualUiDraftRepairPacket,
    }),
    buildMiniLaunchEmailManualUiBuilderItem({
      packet: miniLaunchEmailManualUiBuilderPacket,
      receipt: miniLaunchEmailManualUiBuildReceipt,
    }),
    miniLaunchEmailManualUiDraftRepairPacket
      ? buildMiniLaunchEmailManualUiDraftRepairItem({
        packet: miniLaunchEmailManualUiDraftRepairPacket,
      })
      : null,
    cleanupItem,
    !cleanupRequiresAttention && apiLabItem,
    !cleanupRequiresAttention && !apiLabRequiresAttention && apiNullAudienceLabItem,
    !cleanupRequiresAttention && !apiLabRequiresAttention && !apiNullAudienceLabRequiresAttention && nullAudienceReplacementItem,
    !cleanupRequiresAttention && !apiLabRequiresAttention && !apiNullAudienceLabRequiresAttention && !nullAudienceReplacementRequiresAttention && !nullAudienceReplacementCompleted && miniLaunchMailerLiteApiExistingDraftUpdateStrategy
      ? buildMiniLaunchMailerLiteApiExistingDraftUpdateStrategyItem({
        packet: miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
      })
      : null,
    !cleanupRequiresAttention && !apiLabRequiresAttention && !apiNullAudienceLabRequiresAttention && !nullAudienceReplacementRequiresAttention && !nullAudienceReplacementCompleted && miniLaunchSeedInboxCorrectionUiEditApprovalPacket
      ? buildMiniLaunchSeedInboxCorrectionUiEditItem({
        packet: miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
      })
      : null,
    buildShopifyLocalBuildItem({
      request: miniLaunchShopifyLocalBuildRequest,
      receipt: miniLaunchShopifyLocalBuildReceipt,
    }),
    buildShopifyPreviewRouteItem({
      decision: miniLaunchShopifyPreviewRouteDecision,
      approvalPacket: miniLaunchShopifyPreviewRouteApprovalPacket,
      executionReceipt: miniLaunchShopifyPreviewRouteExecutionReceipt,
    }),
    buildBrujulaBuilderDraftItem({
      correction: brujulaEmailStyleCorrection,
      renderQa: brujulaEmailRenderQa,
      realMailerLiteRenderQa: brujulaRealMailerLiteRenderQa,
      manualUiReceipt: brujulaEmailManualUiBuildReceipt,
    }),
    buildMiniLaunchSeedSendItem({
      payloadManifest: miniLaunchEmailBuilderPayloadManifest,
      renderQa: miniLaunchEmailRenderQa,
      manualUiReceipt: miniLaunchEmailManualUiBuildReceipt,
      seedTestQaPacket: miniLaunchSeedTestQaPacket,
      seedSendApprovalPacket: miniLaunchSeedSendApprovalPacket,
      seedTestExecutionReceipt: miniLaunchSeedTestExecutionReceipt,
      nullAudienceSeedTestSendReceipt: miniLaunchNullAudienceSeedTestSendExecutionReceipt,
    }),
    buildMiniLaunchE04SeedResendItem({
      seedInboxQa: miniLaunchNullAudienceSeedInboxQa,
      nullAudienceSeedTestSendReceipt: miniLaunchNullAudienceSeedTestSendExecutionReceipt,
      nullAudienceReplacementExecutionReceipt: miniLaunchNullAudienceReplacementExecutionReceipt,
    }),
    buildCrmSignalWriteItem({
      packet: miniLaunchCrmSignalProjectionPacket,
      writeApprovalPacket: miniLaunchCrmWriteApprovalPacket,
    }),
  ].filter(Boolean);

  const readyItems = approvalItems.filter((item) => item.status === 'ready_for_exact_approval_request');
  const blockedItems = approvalItems.filter((item) => item.status === 'prepared_but_blocked_before_approval_request');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_approval_queue',
    generatedAt,
    ok: true,
    status: 'mailerlite_launch_os_approval_queue_ready_no_live_changes',
    executiveSummary: {
      totalApprovalItems: approvalItems.length,
      readyApprovalRequestCount: readyItems.length,
      blockedApprovalRequestCount: blockedItems.length,
      openLiveMutationGateCount: 0,
      validationStatus: validationReceipt?.validationStatus ?? null,
      validationTestFiles: validationReceipt?.testScope?.testFiles ?? null,
      validationTestCount: validationReceipt?.testScope?.testCount ?? null,
      nextBestHumanBoundary: readyItems[0]?.id ?? null,
      readyApprovalIds: readyItems.map((item) => item.id),
      blockedApprovalIds: blockedItems.map((item) => item.id),
    },
    approvalItems,
    hardStops: [
      'This queue is not approval.',
      'Only exact approval phrases can open the single named operation they describe.',
      'A group approval never authorizes subscribers, workflows or sends.',
      'An asset-build approval never authorizes seed sends, workflow attachment or audience launch.',
      'A completed seed/test send never authorizes any later public/audience send or workflow/subscriber mutation.',
      'A MailerLite API inert-draft lab approval only authorizes disposable [LAB NO SEND] drafts and cleanup.',
      'A MailerLite API Null Audience lab approval only authorizes one empty safety group plus disposable [LAB NULL AUDIENCE] drafts and cleanup.',
      'A Null Audience replacement-draft approval only authorizes four new drafts assigned exclusively to the empty safety group, never sends or subscriber/workflow mutations.',
      'A Shopify local-build approval never authorizes publish, API calls, real forms or MailerLite/CRM live writes.',
      'CRM signal writes require a separate exact CRM write approval packet.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (queue) => {
  const lines = [
    '# MailerLite Launch OS v0 - Approval Queue',
    '',
    `Generated: ${queue.generatedAt}`,
    `Status: ${queue.status}`,
    '',
    '## Executive Summary',
    '',
    `- Ready approval requests: ${queue.executiveSummary.readyApprovalRequestCount}`,
    `- Blocked approval requests: ${queue.executiveSummary.blockedApprovalRequestCount}`,
    `- Open live mutation gates: ${queue.executiveSummary.openLiveMutationGateCount}`,
    `- Validation: ${queue.executiveSummary.validationStatus ?? 'unknown'} (${queue.executiveSummary.validationTestFiles ?? 'unknown'} files / ${queue.executiveSummary.validationTestCount ?? 'unknown'} tests)`,
    `- Next human boundary: ${queue.executiveSummary.nextBestHumanBoundary ?? 'none'}`,
    '',
    '## Approval Items',
    '',
  ];

  for (const item of queue.approvalItems) {
    lines.push(
      `### ${item.id}`,
      '',
      `- Title: ${item.title}`,
      `- Status: ${item.status}`,
      `- Can ask Alejandro now: ${item.canAskAlejandroNow}`,
      `- Lane: ${item.lane}`,
      `- Operation type: ${item.operationType}`,
      `- Target count: ${item.targetCount}`,
    );

    if (item.targetNames.length) {
      lines.push('- Targets:');
      for (const target of item.targetNames) lines.push(`  - ${target}`);
    }

    if (item.exactApprovalPhrase) {
      lines.push('', 'Exact approval phrase:', '', '```text', item.exactApprovalPhrase, '```');
    }

    if (item.blockers.length) {
      lines.push('', 'Blockers:');
      for (const blocker of item.blockers) lines.push(`- ${blocker}`);
    }

    if (item.allowedAfterExactApproval.length) {
      lines.push('', 'Allowed after exact approval:');
      for (const allowed of item.allowedAfterExactApproval) lines.push(`- ${allowed}`);
    }

    if (item.stillClosed.length) {
      lines.push('', 'Still closed:');
      for (const closed of item.stillClosed) lines.push(`- ${closed}`);
    }

    if (item.requiredFreshEvidence.length) {
      lines.push('', 'Required fresh evidence before execution:');
      for (const evidence of item.requiredFreshEvidence) lines.push(`- ${evidence}`);
    }

    lines.push('');
  }

  lines.push('## Hard Stops', '');
  for (const stop of queue.hardStops) lines.push(`- ${stop}`);
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const buildQueueFromFiles = async (options) => {
  const entries = await Promise.all([
    readOptionalJsonWithDigest(options.miniLaunchEmptyGroupPacket, 'mini-launch empty-group approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmptyGroupCreateDryRun, 'mini-launch empty-group create dry-run'),
    readOptionalJsonWithDigest(options.onboardingV2EmptyGroupsPacket, 'onboarding v2 empty-groups approval packet'),
    readOptionalJsonWithDigest(options.onboardingV2EmptyGroupsCreateDryRun, 'onboarding v2 empty-groups create dry-run'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildScopePacket, 'mini-launch email asset-build scope packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmailBuilderPayloadManifest, 'mini-launch email builder payload manifest'),
    readOptionalJsonWithDigest(options.miniLaunchEmailRenderQa, 'mini-launch local email render QA packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildDryRun, 'mini-launch email asset-build dry-run'),
    readOptionalJsonWithDigest(options.miniLaunchEmailAssetBuildExecution, 'mini-launch email asset-build execution attempt'),
    readOptionalJsonWithDigest(options.miniLaunchEmailManualUiBuilderPacket, 'mini-launch manual UI builder fallback approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchEmailManualUiBuildReceipt, 'mini-launch manual UI post-build receipt'),
    readOptionalJsonWithDigest(options.miniLaunchEmailManualUiDraftRepairPacket, 'mini-launch manual UI draft repair approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedInboxCorrectionUiEditApprovalPacket, 'mini-launch seed inbox correction UI edit approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket, 'mini-launch unsafe API replacement cleanup approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt, 'mini-launch unsafe API replacement cleanup execution receipt'),
    readOptionalJsonWithDigest(options.miniLaunchMailerLiteApiInertDraftLab, 'mini-launch MailerLite API inert draft lab packet or receipt'),
    readOptionalJsonWithDigest(options.miniLaunchMailerLiteApiNullAudienceLab, 'mini-launch MailerLite API Null Audience lab packet or receipt'),
    readOptionalJsonWithDigest(options.miniLaunchNullAudienceReplacementApprovalPacket, 'mini-launch MailerLite API Null Audience replacement approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchNullAudienceReplacementExecutionReceipt, 'mini-launch MailerLite API Null Audience replacement execution receipt or read-only preflight'),
    readOptionalJsonWithDigest(options.miniLaunchMailerLiteApiExistingDraftUpdateStrategy, 'mini-launch MailerLite API existing draft update strategy packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedTestQaPacket, 'mini-launch seed/test QA preflight packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedSendApprovalPacket, 'mini-launch private seed-send approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchSeedTestExecutionReceipt, 'completed mini-launch seed/test execution receipt'),
    readOptionalJsonWithDigest(options.miniLaunchNullAudienceSeedTestSendExecutionReceipt, 'completed Null Audience seed/test send receipt'),
    readOptionalJsonWithDigest(options.miniLaunchNullAudienceSeedInboxQa, 'Null Audience seed inbox QA report'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyLocalBuildRequest, 'Shopify no-live local build request'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyLocalBuildReceipt, 'Shopify no-live local build receipt'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyPreviewRouteDecision, 'Shopify preview-route decision packet'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyPreviewRouteApprovalPacket, 'Shopify preview-route approval packet'),
    readOptionalJsonWithDigest(options.miniLaunchShopifyPreviewRouteExecutionReceipt, 'Shopify preview-route execution receipt with QA evidence'),
    readOptionalJsonWithDigest(options.miniLaunchCrmSignalProjectionPacket, 'CRM signal projection packet'),
    readOptionalJsonWithDigest(options.miniLaunchCrmWriteApprovalPacket, 'CRM write approval packet with exact events/people/fields boundary'),
    readOptionalJsonWithDigest(options.brujulaEmailStyleCorrection, 'Brújula corrected Email 1 packet'),
    readOptionalJsonWithDigest(options.brujulaEmailRenderQa, 'Brújula local render QA packet'),
    readOptionalJsonWithDigest(options.brujulaRealMailerLiteRenderQa, 'Brújula real MailerLite draft render QA'),
    readOptionalJsonWithDigest(options.brujulaEmailManualUiBuildReceipt, 'Brújula Email 1 manual UI build receipt'),
    readOptionalJsonWithDigest(options.validationReceipt, 'latest validation receipt'),
  ]);

  const [
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
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
    miniLaunchMailerLiteApiInertDraftLab,
    miniLaunchMailerLiteApiNullAudienceLab,
    miniLaunchNullAudienceReplacementApprovalPacket,
    miniLaunchNullAudienceReplacementExecutionReceipt,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
    miniLaunchSeedTestQaPacket,
    miniLaunchSeedSendApprovalPacket,
    miniLaunchSeedTestExecutionReceipt,
    miniLaunchNullAudienceSeedTestSendExecutionReceipt,
    miniLaunchNullAudienceSeedInboxQa,
    miniLaunchShopifyLocalBuildRequest,
    miniLaunchShopifyLocalBuildReceipt,
    miniLaunchShopifyPreviewRouteDecision,
    miniLaunchShopifyPreviewRouteApprovalPacket,
    miniLaunchShopifyPreviewRouteExecutionReceipt,
    miniLaunchCrmSignalProjectionPacket,
    miniLaunchCrmWriteApprovalPacket,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    brujulaRealMailerLiteRenderQa,
    brujulaEmailManualUiBuildReceipt,
    validationReceipt,
  ] = entries.map((entry) => entry.value);

  return buildApprovalQueue({
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
    miniLaunchSeedInboxCorrectionUiEditApprovalPacket,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupApprovalPacket,
    miniLaunchSeedInboxCorrectionApiReplacementCleanupExecutionReceipt,
    miniLaunchMailerLiteApiInertDraftLab,
    miniLaunchMailerLiteApiNullAudienceLab,
    miniLaunchNullAudienceReplacementApprovalPacket,
    miniLaunchNullAudienceReplacementExecutionReceipt,
    miniLaunchMailerLiteApiExistingDraftUpdateStrategy,
    miniLaunchSeedTestQaPacket,
    miniLaunchSeedSendApprovalPacket,
    miniLaunchSeedTestExecutionReceipt,
    miniLaunchNullAudienceSeedTestSendExecutionReceipt,
    miniLaunchNullAudienceSeedInboxQa,
    miniLaunchShopifyLocalBuildRequest,
    miniLaunchShopifyLocalBuildReceipt,
    miniLaunchShopifyPreviewRouteDecision,
    miniLaunchShopifyPreviewRouteApprovalPacket,
    miniLaunchShopifyPreviewRouteExecutionReceipt,
    miniLaunchCrmSignalProjectionPacket,
    miniLaunchCrmWriteApprovalPacket,
    brujulaEmailStyleCorrection,
    brujulaEmailRenderQa,
    brujulaRealMailerLiteRenderQa,
    brujulaEmailManualUiBuildReceipt,
    validationReceipt,
    sourceDigests: entries.map((entry) => entry.digest),
  });
};

const writeOutputs = async ({ queue, out, markdownOut }) => {
  if (out) {
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(resolve(out), `${JSON.stringify(queue, null, 2)}\n`);
  }

  if (markdownOut) {
    await mkdir(dirname(resolve(markdownOut)), { recursive: true });
    await writeFile(resolve(markdownOut), renderMarkdown(queue));
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const queue = await buildQueueFromFiles(options);
  await writeOutputs({ queue, out: options.out, markdownOut: options.markdownOut });

  console.log(JSON.stringify({
    ok: queue.ok,
    status: queue.status,
    generatedAt: queue.generatedAt,
    readyApprovalRequestCount: queue.executiveSummary.readyApprovalRequestCount,
    blockedApprovalRequestCount: queue.executiveSummary.blockedApprovalRequestCount,
    openLiveMutationGateCount: queue.executiveSummary.openLiveMutationGateCount,
    readyApprovalIds: queue.executiveSummary.readyApprovalIds,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: queue.safety,
  }, null, 2));
};

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildApprovalQueue,
  buildBrujulaBuilderDraftItem,
  buildMiniLaunchEmailAssetBuildItem,
  buildMiniLaunchEmailManualUiDraftRepairItem,
  buildMiniLaunchEmailManualUiBuilderItem,
  buildMiniLaunchEmptyGroupItem,
  buildMiniLaunchE04SeedResendItem,
  buildMiniLaunchMailerLiteApiExistingDraftUpdateStrategyItem,
  buildMiniLaunchMailerLiteApiInertDraftLabItem,
  buildMiniLaunchMailerLiteApiNullAudienceLabItem,
  buildMiniLaunchNullAudienceReplacementItem,
  buildMiniLaunchSeedInboxCorrectionApiReplacementCleanupItem,
  buildMiniLaunchSeedInboxCorrectionUiEditItem,
  buildMiniLaunchSeedSendItem,
  buildOnboardingV2EmptyGroupItem,
  buildShopifyPreviewRouteItem,
  buildSafety,
  cleanupExecutionCompleted,
  mailerLiteApiInertDraftLabCompleted,
  mailerLiteApiNullAudienceLabCompleted,
  nullAudienceSeedInboxQaNeedsE04Resend,
  nullAudienceSeedTestSendCompleted,
  nullAudienceReplacementExecutionCompleted,
  parseArgs,
  renderMarkdown,
  shopifyPreviewRouteExecutionReady,
};
