#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-asset-build-2026-05-28';
const DEFAULT_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-asset-build.mjs [options]

Options:
  --scope-packet <path>      Email asset-build scope packet JSON. Defaults to ${DEFAULT_SCOPE_PACKET}
  --payload-manifest <path>  Email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --execute                  Create/update the exact MailerLite draft campaigns. Without this, dry-run only.
  --approval-phrase <text>   Exact human approval phrase required with --execute.
  --from-email <email>       Verified MailerLite sender email required with --execute. Env: MAILERLITE_ASSET_FROM_EMAIL
  --from-name <name>         Sender name required with --execute. Env: MAILERLITE_ASSET_FROM_NAME
  --reply-to <email>         Verified reply-to email. Env: MAILERLITE_ASSET_REPLY_TO
  --service <name>           Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>           Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>           MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>           Per-request timeout. Defaults to 30000
  --out <path>               Write JSON report
  --markdown-out <path>      Write Markdown report
  --help                     Show this help

Guarded dry-run/runner for the Inteligencia para descansar mini-launch email
draft assets. Dry-run does a fresh read-only MailerLite campaign scan. Execute
mode requires exact approval plus sender identity and only creates or updates
the four named draft campaigns. It never schedules/sends email, reads or assigns
subscribers, creates groups, touches workflows/automations, Shopify, CRM live
APIs, ledgers, cards, scoring, Fact Store, deletes campaigns, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeName = (value) =>
  cleanString(value)
    ?.normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const normalizeApprovalPhrase = (value) =>
  cleanString(value)
    ?.normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const parseArgs = (argv) => {
  const options = {
    scopePacket: DEFAULT_SCOPE_PACKET,
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    execute: false,
    approvalPhrase: null,
    fromEmail: process.env.MAILERLITE_ASSET_FROM_EMAIL || null,
    fromName: process.env.MAILERLITE_ASSET_FROM_NAME || null,
    replyTo: process.env.MAILERLITE_ASSET_REPLY_TO || null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--scope-packet') options.scopePacket = argv[++index];
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--from-email') options.fromEmail = argv[++index];
    else if (arg === '--from-name') options.fromName = argv[++index];
    else if (arg === '--reply-to') options.replyTo = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/, '');
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${options.apiBase}`);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const approvalStatusFor = ({ execute, approvalPhrase, expectedPhrase }) => {
  if (!execute) {
    return {
      ok: true,
      status: 'dry_run_no_live_approval_required',
      provided: Boolean(cleanString(approvalPhrase)),
    };
  }
  const normalizedProvided = normalizeApprovalPhrase(approvalPhrase);
  const normalizedExpected = normalizeApprovalPhrase(expectedPhrase);
  if (!normalizedExpected) {
    return {
      ok: false,
      status: 'blocked_missing_expected_approval_phrase',
      provided: Boolean(normalizedProvided),
    };
  }
  if (!normalizedProvided) {
    return {
      ok: false,
      status: 'blocked_missing_exact_approval_phrase',
      provided: false,
    };
  }
  if (normalizedProvided !== normalizedExpected) {
    return {
      ok: false,
      status: 'blocked_approval_phrase_mismatch',
      provided: true,
    };
  }
  return {
    ok: true,
    status: 'exact_approval_phrase_matched',
    provided: true,
  };
};

const validateSourceReadiness = ({ scopePacket, payloadManifest }) => {
  const issues = [];
  const assets = Array.isArray(scopePacket?.assetBuildScope?.assets) ? scopePacket.assetBuildScope.assets : [];
  const payloads = Array.isArray(payloadManifest?.payloads) ? payloadManifest.payloads : [];
  const closedAfterApproval = scopePacket?.requestedFutureScope?.stillClosedEvenAfterThisApproval ?? [];
  const manifestClosedAfterApproval = payloadManifest?.approvalBoundary?.stillClosedEvenAfterAssetBuildApproval ?? [];

  if (scopePacket?.ok !== true) issues.push('scope_packet_not_ok');
  if (scopePacket?.status !== 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    issues.push(`scope_packet_status_not_ready:${scopePacket?.status ?? 'missing'}`);
  }
  if (scopePacket?.requestedFutureScope?.canAskAlejandroForApproval !== true) {
    issues.push('scope_packet_cannot_ask_alejandro');
  }
  if (scopePacket?.requestedFutureScope?.packetIsApprovalByItself !== false) {
    issues.push('scope_packet_self_authorizes_unexpectedly');
  }
  if (scopePacket?.requestedFutureScope?.canExecuteBuildNow !== false) {
    issues.push('scope_packet_execute_gate_unexpectedly_open');
  }
  if (!cleanString(scopePacket?.requestedFutureScope?.exactApprovalPhrase)) {
    issues.push('scope_packet_missing_exact_approval_phrase');
  }
  if (assets.length !== 4) issues.push(`scope_packet_expected_4_assets:${assets.length}`);
  if (scopePacket?.safety?.mailerLiteApiCalled !== false) issues.push('scope_packet_reports_mailerlite_api_call');
  if (scopePacket?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('scope_packet_reports_asset_mutation');
  if (scopePacket?.safety?.sendsPerformed !== false) issues.push('scope_packet_reports_send');

  if (payloadManifest?.ok !== true) issues.push('payload_manifest_not_ok');
  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    issues.push(`payload_manifest_status_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (payloadManifest?.approvalBoundary?.manifestIsApprovalByItself !== false) {
    issues.push('payload_manifest_self_authorizes_unexpectedly');
  }
  if (payloadManifest?.approvalBoundary?.exactAssetBuildApprovalStillRequired !== true) {
    issues.push('payload_manifest_exact_approval_not_required_unexpectedly');
  }
  if (payloadManifest?.approvalBoundary?.canExecuteBuilderNow !== false) {
    issues.push('payload_manifest_execute_gate_unexpectedly_open');
  }
  if (payloadManifest?.approvalBoundary?.canSendNow !== false) issues.push('payload_manifest_send_gate_open');
  if (payloadManifest?.approvalBoundary?.canAttachWorkflowNow !== false) issues.push('payload_manifest_workflow_gate_open');
  if (payloadManifest?.approvalBoundary?.canReadOrAssignSubscribersNow !== false) issues.push('payload_manifest_subscriber_gate_open');
  if (payloadManifest?.approvalBoundary?.canCreateGroupsNow !== false) issues.push('payload_manifest_group_gate_open');
  if (payloads.length !== 4) issues.push(`payload_manifest_expected_4_payloads:${payloads.length}`);
  if (payloadManifest?.safety?.mailerLiteApiCalled !== false) issues.push('payload_manifest_reports_mailerlite_api_call');
  if (payloadManifest?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('payload_manifest_reports_asset_mutation');
  if (payloadManifest?.safety?.sendsPerformed !== false) issues.push('payload_manifest_reports_send');

  for (const requiredClosed of [
    'seed_send_or_test_send',
    'workflow_or_automation_attachment',
    'subscriber_read_assignment_or_import',
    'group_creation_or_assignment',
    'shopify_preview_publish_or_form_connection',
    'crm_signal_ledger_append',
    'crm_card_write',
    'crm_scoring',
    'fact_store_write',
    'audience_launch',
  ]) {
    if (!closedAfterApproval.includes(requiredClosed)) issues.push(`scope_missing_closed_gate:${requiredClosed}`);
    if (!manifestClosedAfterApproval.includes(requiredClosed)) issues.push(`manifest_missing_closed_gate:${requiredClosed}`);
  }

  for (const payload of payloads) {
    if (!cleanString(payload?.mailerLiteAssetNameDraft)) issues.push(`payload_missing_draft_name:${payload?.step ?? 'unknown'}`);
    if (!cleanString(payload?.subject)) issues.push(`payload_missing_subject:${payload?.step ?? 'unknown'}`);
    if (!cleanString(payload?.preheader)) issues.push(`payload_missing_preheader:${payload?.step ?? 'unknown'}`);
    if (payload?.liveActionAllowedNow !== false) issues.push(`payload_live_action_gate_open:${payload?.step ?? 'unknown'}`);
    if (!Array.isArray(payload?.hardExclusions) || !payload.hardExclusions.includes('send_email')) {
      issues.push(`payload_missing_send_hard_exclusion:${payload?.step ?? 'unknown'}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    assets,
    payloads,
  };
};

const campaignNameFor = (campaign) => cleanString(campaign?.name) ?? cleanString(campaign?.title);
const campaignIdFor = (campaign) => cleanString(campaign?.id) ?? cleanString(campaign?.campaign_id);
const campaignStatusFor = (campaign) => cleanString(campaign?.status);

const groupCampaignsByName = (campaigns = []) => {
  const map = new Map();
  for (const campaign of campaigns) {
    const normalized = normalizeName(campaignNameFor(campaign));
    if (!normalized) continue;
    const existing = map.get(normalized) ?? [];
    existing.push(campaign);
    map.set(normalized, existing);
  }
  return map;
};

const buildTargetPayloads = (payloadManifest) => (payloadManifest?.payloads ?? [])
  .filter((payload) => cleanString(payload?.mailerLiteAssetNameDraft))
  .map((payload) => ({
    step: payload.step,
    role: cleanString(payload.role),
    name: cleanString(payload.mailerLiteAssetNameDraft),
    normalizedName: normalizeName(payload.mailerLiteAssetNameDraft),
    subject: cleanString(payload.subject),
    preheader: cleanString(payload.preheader),
    contentBlocks: Array.isArray(payload.contentBlocks) ? payload.contentBlocks : [],
    cta: payload.cta ?? null,
    plainTextFallback: cleanString(payload.plainTextFallback),
    hardExclusions: payload.hardExclusions ?? [],
  }));

const signatureAssetFor = (signatureAssetReference) => {
  const selected = signatureAssetReference?.selected ?? signatureAssetReference?.signatureAsset ?? null;
  const src = cleanString(selected?.src);
  const srcSha256 = cleanString(selected?.srcSha256);
  if (!src || !srcSha256) return null;
  return {
    src,
    srcSha256,
    width: Number.isFinite(Number(selected?.width)) && Number(selected.width) > 0
      ? Number(selected.width)
      : 189,
    height: Number.isFinite(Number(selected?.height)) && Number(selected.height) > 0
      ? Number(selected.height)
      : null,
  };
};

const CANONICAL_AUTHOR_NAME = 'Alejandro Gómez Bernal';
const CANONICAL_AUTHOR_BIO = 'Psicólogo · Monje · Desarrollador de proyectos con sentido.';
const CANONICAL_UNSUBSCRIBE_TEXT =
  'Te envío este correo porque pediste recibir este resultado o recurso de Coherencia Creativa. Si no quieres recibir más correos, puedes darte de baja aquí:';
const CANONICAL_UNSUBSCRIBE_LABEL = 'Darme de baja';
const CANONICAL_UNSUBSCRIBE_HREF = '{$unsubscribe}';
const CANONICAL_POSTAL_ADDRESS = 'Finca el Amanecer, vereda Alatania, Subachoque';
const CANONICAL_COUNTRY = 'Colombia';

const buildHtmlForPayload = (payload, { signatureAssetReference = null } = {}) => {
  const escape = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  const signatureAsset = signatureAssetFor(signatureAssetReference);
  const lines = [
    '<!doctype html>',
    '<html lang="es">',
    '<head>',
    '  <meta charset="utf-8">',
    '  <meta name="viewport" content="width=device-width, initial-scale=1">',
    `  <title>${escape(payload.subject)}</title>`,
    '  <style>',
    '    body { margin: 0; background: #F4F7FA; color: #474747; font-family: Poppins, Arial, sans-serif; }',
    '    .email-container { max-width: 640px; margin: 0 auto; background: #FFFFFF; }',
    '    .email-content { padding: 44px 42px 36px; }',
    '    p { font-size: 16px; line-height: 165%; margin: 0 0 18px; }',
    '    .cta-placeholder { display: inline-block; margin: 8px 0 4px; padding: 12px 18px; border-radius: 7px; background: #2F3E63; color: #FFFFFF; font-weight: 600; text-decoration: none; }',
    '    .placeholder-note { color: #777777; font-size: 13px; line-height: 150%; }',
    '    .signature { margin: 28px 0 0; font-family: Georgia, serif; color: #2F3E63; }',
    '    .signature-image { display: block; width: 189px; max-width: 60%; height: auto; border: 0; }',
    '    .footer { color: #5F6668; }',
    '    .footer-name { margin: 0 0 8px; font-family: Georgia, serif; font-size: 24px; line-height: 120%; font-weight: 700; color: #4A4A4A; }',
    '    .footer-bio { margin: 0 0 16px; font-size: 14px; line-height: 150%; color: #5F6668; }',
    '    .footer-unsubscribe { margin: 0 0 4px; font-size: 12px; line-height: 155%; color: #6F7678; }',
    '    .footer-link { font-size: 12px; line-height: 155%; color: #6F7678; text-decoration: underline; }',
    '    .footer-address { margin: 18px 0 0; font-size: 11px; line-height: 150%; color: #858A8C; }',
    '    @media (max-width: 640px) { .email-content { padding: 36px 24px 32px; } p { font-size: 15px; } }',
    '  </style>',
    '</head>',
    '<body>',
    '  <div class="email-container">',
    '    <div class="email-content">',
  ];

  if (payload.preheader) {
    lines.push(`    <div style="display:none;max-height:0;overflow:hidden;">${escape(payload.preheader)}</div>`);
  }

  for (const block of payload.contentBlocks) {
    if (block.type === 'preheader') continue;
    if (block.type === 'signature') {
      if (signatureAsset) {
        const heightAttr = signatureAsset.height ? ` height="${escape(signatureAsset.height)}"` : '';
        lines.push(`      <p class="signature"><img class="signature-image" src="${escape(signatureAsset.src)}" alt="Firma de Alejandro" width="${escape(signatureAsset.width)}"${heightAttr} data-signature-asset-sha256="${escape(signatureAsset.srcSha256)}"></p>`);
      } else {
        lines.push('      <p class="signature">Alejandro</p>');
      }
      continue;
    }
    const text = cleanString(block?.text);
    if (!text) continue;
    if (block.type === 'compliance_footer') {
      lines.push('      <hr style="border:0;border-top:1px solid #E3E7EA;margin:32px 0 18px;">');
      lines.push('      <div class="footer">');
      lines.push(`        <p class="footer-name">${escape(CANONICAL_AUTHOR_NAME)}</p>`);
      lines.push(`        <p class="footer-bio">${escape(CANONICAL_AUTHOR_BIO)}</p>`);
      lines.push(`        <p class="footer-unsubscribe">${escape(CANONICAL_UNSUBSCRIBE_TEXT)}</p>`);
      lines.push(`        <p><a class="footer-link" href="${escape(CANONICAL_UNSUBSCRIBE_HREF)}">${escape(CANONICAL_UNSUBSCRIBE_LABEL)}</a></p>`);
      lines.push(`        <p class="footer-address">${escape(CANONICAL_POSTAL_ADDRESS)}<br>${escape(CANONICAL_COUNTRY)}</p>`);
      lines.push('      </div>');
    } else if (block.type === 'cta') {
      const placeholder = cleanString(block?.placeholder?.value) ?? cleanString(block?.destination) ?? 'inert_placeholder';
      lines.push(`      <p><a class="cta-placeholder" href="${escape(placeholder)}">${escape(text)}</a></p>`);
    } else if (block.type === 'reply_cta') {
      lines.push(`      <p><span class="cta-placeholder">${escape(text)}</span></p>`);
    } else {
      for (const paragraph of text.split('\n').map(cleanString).filter(Boolean)) {
        lines.push(`      <p>${escape(paragraph)}</p>`);
      }
    }
  }

  lines.push('    </div>');
  lines.push('  </div>');
  lines.push('</body>');
  lines.push('</html>');
  return lines.join('\n');
};

const buildTargetPlan = ({ payloadManifest, campaigns = [] }) => {
  const campaignsByName = groupCampaignsByName(campaigns);
  return buildTargetPayloads(payloadManifest).map((target) => {
    const matchingCampaigns = campaignsByName.get(target.normalizedName) ?? [];
    const statuses = matchingCampaigns.map(campaignStatusFor).filter(Boolean);
    const draftCampaigns = matchingCampaigns.filter((campaign) => campaignStatusFor(campaign) === 'draft');
    const nonDraftCampaigns = matchingCampaigns.filter((campaign) => campaignStatusFor(campaign) !== 'draft');
    const plannedOperation = matchingCampaigns.length === 0
      ? 'create_draft_campaign'
      : matchingCampaigns.length === 1 && draftCampaigns.length === 1
        ? 'update_existing_draft_campaign'
        : 'block_existing_campaign_conflict';

    return {
      ...target,
      existsInFreshScan: matchingCampaigns.length > 0,
      matchingCampaignCount: matchingCampaigns.length,
      matchingCampaignIds: matchingCampaigns.map(campaignIdFor).filter(Boolean),
      matchingCampaignStatuses: statuses,
      draftCampaignId: draftCampaigns.length === 1 ? campaignIdFor(draftCampaigns[0]) : null,
      nonDraftCampaignCount: nonDraftCampaigns.length,
      plannedOperation,
      allowedMutationInExecute: plannedOperation === 'create_draft_campaign' || plannedOperation === 'update_existing_draft_campaign',
      sendAllowed: false,
      scheduleAllowed: false,
      workflowAttachmentAllowed: false,
      subscriberReadOrAssignmentAllowed: false,
      groupAssignmentAllowed: false,
    };
  });
};

const senderIdentityFor = ({ fromEmail, fromName, replyTo }) => ({
  fromEmail: cleanString(fromEmail),
  fromName: cleanString(fromName),
  replyTo: cleanString(replyTo),
  fromEmailPresent: Boolean(cleanString(fromEmail)),
  fromNamePresent: Boolean(cleanString(fromName)),
});

const buildSafety = ({ execute, mutatedCount = 0, campaignsRead = 0 }) => ({
  mode: execute ? 'execute_mailerlite_draft_campaign_asset_build_only' : 'dry_run_only',
  mailerLiteApiCalled: true,
  mailerLiteCampaignsRead: campaignsRead,
  mailerLiteMutationsPerformed: execute && mutatedCount > 0,
  mailerLiteAssetsCreatedOrEdited: execute && mutatedCount > 0,
  allowedMutationType: execute && mutatedCount > 0 ? 'create_or_update_draft_campaign_only' : null,
  campaignDeletesPerformed: false,
  schedulesPerformed: false,
  sendsPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  groupsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  onboardingTouched: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildRunFromState = ({
  scopePacket,
  payloadManifest,
  campaigns = [],
  execute = false,
  approvalPhrase = null,
  fromEmail = null,
  fromName = null,
  replyTo = null,
  generatedAt = new Date().toISOString(),
  credentialPresent = true,
  credentialSource = null,
  credentialService = DEFAULT_SERVICE,
  credentialAccount = DEFAULT_ACCOUNT,
  assetMutations = [],
  errors = [],
}) => {
  const sourceReadiness = validateSourceReadiness({ scopePacket, payloadManifest });
  const expectedPhrase = cleanString(scopePacket?.requestedFutureScope?.exactApprovalPhrase);
  const approval = approvalStatusFor({ execute, approvalPhrase, expectedPhrase });
  const senderIdentity = senderIdentityFor({ fromEmail, fromName, replyTo });
  const targetPlan = buildTargetPlan({ payloadManifest, campaigns });
  const campaignConflictTargets = targetPlan.filter((target) => target.plannedOperation === 'block_existing_campaign_conflict');
  const createTargets = targetPlan.filter((target) => target.plannedOperation === 'create_draft_campaign');
  const updateTargets = targetPlan.filter((target) => target.plannedOperation === 'update_existing_draft_campaign');
  const sourceBlockers = sourceReadiness.issues;
  const executionPreconditionBlockers = [
    ...(!credentialPresent ? ['blocked_missing_mailerlite_credential'] : []),
    ...(!senderIdentity.fromEmailPresent ? ['blocked_missing_verified_from_email'] : []),
    ...(!senderIdentity.fromNamePresent ? ['blocked_missing_from_name'] : []),
  ];
  const blockers = [
    ...sourceBlockers,
    ...(campaignConflictTargets.length ? ['target_campaign_name_conflict_with_non_draft_or_duplicate'] : []),
    ...(execute && !approval.ok ? [approval.status] : []),
    ...(execute ? executionPreconditionBlockers : []),
  ];
  const canExecute = Boolean(
    execute
    && blockers.length === 0
    && targetPlan.length === 4
    && targetPlan.every((target) => target.allowedMutationInExecute),
  );
  const executedOk = canExecute && errors.length === 0 && assetMutations.length === targetPlan.length;
  const dryRunOk = !execute && blockers.length === 0;
  const status = execute
    ? executedOk
      ? 'executed_mini_launch_email_asset_build'
      : blockers.length
        ? 'blocked_before_mini_launch_email_asset_build'
        : errors.length
          ? 'failed_during_mini_launch_email_asset_build'
          : 'execute_ready_but_not_performed'
    : dryRunOk
      ? 'dry_run_ready_for_exact_asset_build_approval'
      : 'dry_run_blocked_before_asset_build_approval';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: execute ? 'execute_requested' : 'dry_run',
    generatedAt,
    ok: execute ? executedOk : dryRunOk,
    status,
    launch: scopePacket?.launch ?? payloadManifest?.launch ?? null,
    sourceSummary: {
      scopePacketStatus: scopePacket?.status ?? null,
      payloadManifestStatus: payloadManifest?.status ?? null,
      exactApprovalPhrasePresent: Boolean(expectedPhrase),
      scopePacketIsApprovalByItself: scopePacket?.requestedFutureScope?.packetIsApprovalByItself ?? null,
      manifestIsApprovalByItself: payloadManifest?.approvalBoundary?.manifestIsApprovalByItself ?? null,
      sourceCanExecuteBuildNow: scopePacket?.requestedFutureScope?.canExecuteBuildNow ?? null,
      manifestCanExecuteBuilderNow: payloadManifest?.approvalBoundary?.canExecuteBuilderNow ?? null,
    },
    credential: {
      service: credentialService,
      account: credentialAccount,
      credentialPresent,
      credentialSource: credentialSource ? 'configured_not_printed' : null,
    },
    senderIdentity: {
      fromEmailPresent: senderIdentity.fromEmailPresent,
      fromNamePresent: senderIdentity.fromNamePresent,
      replyToPresent: Boolean(senderIdentity.replyTo),
      valuePrinted: false,
      note: 'Sender identity is required only for execute mode and is not printed in reports.',
    },
    freshScan: {
      campaignsRead: campaigns.length,
      targetCampaignsExistingCount: targetPlan.filter((target) => target.existsInFreshScan).length,
      targetCampaignsMissingCount: targetPlan.filter((target) => !target.existsInFreshScan).length,
      createDraftCount: createTargets.length,
      updateDraftCount: updateTargets.length,
      conflictCount: campaignConflictTargets.length,
    },
    sourceReadiness,
    decision: {
      expectedPhrase,
      approval,
      canExecute,
      blockers,
      futureExecutionPreconditions: [
        'Exact Alejandro asset-build approval phrase must match the scope packet.',
        'A verified MailerLite sender email and sender name must be supplied for execute mode.',
        'Fresh campaign scan must show each target missing or as a single existing draft.',
        'Execute mode can only create/update draft campaigns and cannot schedule, send, attach workflows, read subscribers, assign groups, touch Shopify, write CRM, append ledgers, score, or touch Fact Store.',
      ],
    },
    targetPlan,
    assetMutations,
    errors,
    safety: buildSafety({
      execute,
      mutatedCount: assetMutations.length,
      campaignsRead: campaigns.length,
    }),
  };
};

const getKeychainSecret = async (service, account) => {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-w',
      '-s',
      service,
      '-a',
      account,
    ], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    const key = stdout.trim();
    return key ? { key, source: `keychain:${service}/${account}` } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return keychain;
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key, source: `env:${name}` };
  }
  return { key: null, source: null };
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 404) return 'mailerlite_endpoint_not_found';
  if (status === 409 || /already exists|duplicate/i.test(text)) return 'mailerlite_campaign_conflict_or_duplicate';
  if (status === 422 || /validation|Campaign is not with status draft/i.test(text)) return 'mailerlite_validation_failed';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const sanitizeApiErrorDetails = (payload) => {
  const details = [];
  const push = (key, value) => {
    const text = cleanString(value);
    if (!text) return;
    details.push({
      field: cleanString(key) ?? 'message',
      message: text
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email_redacted]')
        .slice(0, 500),
    });
  };

  push('message', payload?.message);
  if (payload?.errors && typeof payload.errors === 'object') {
    for (const [key, value] of Object.entries(payload.errors)) {
      if (Array.isArray(value)) {
        for (const item of value) push(key, item);
      } else {
        push(key, value);
      }
    }
  }
  return details.slice(0, 20);
};

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const requestJson = async ({ options, key, path, method = 'GET', body = null, params = {} }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Mini-Launch-Email-Asset-Build/1.0',
      },
      body: body ? JSON.stringify(body) : null,
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    if (!response.ok) {
      const reason = classifyFailure(response.status, text);
      const error = new Error(reason);
      error.status = response.status;
      error.reason = reason;
      error.details = sanitizeApiErrorDetails(payload);
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.reason) throw error;
    const reason = classifyFailure(0, error instanceof Error ? error.message : String(error));
    const wrapped = new Error(reason);
    wrapped.status = 0;
    wrapped.reason = reason;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
};

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  for (const key of ['data', 'campaigns', 'items', 'results']) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  }
  return [];
};

const extractNextPage = (payload, currentPage) => {
  const nextLink = payload?.links?.next ?? payload?.meta?.links?.next;
  if (typeof nextLink === 'string' && nextLink) {
    try {
      const parsed = new URL(nextLink);
      const page = Number.parseInt(parsed.searchParams.get('page') ?? '', 10);
      if (Number.isFinite(page) && page > currentPage) return page;
    } catch {
      return currentPage + 1;
    }
  }
  const current = Number.parseInt(payload?.meta?.current_page ?? currentPage, 10);
  const last = Number.parseInt(payload?.meta?.last_page ?? currentPage, 10);
  if (Number.isFinite(current) && Number.isFinite(last) && current < last) return current + 1;
  return null;
};

const fetchCampaigns = async (options, key) => {
  const campaigns = [];
  const byId = new Map();
  for (const status of ['draft', 'ready', 'sent']) {
    let page = 1;
    for (let iteration = 0; iteration < 25; iteration += 1) {
      const payload = await requestJson({
        options,
        key,
        path: '/campaigns',
        params: {
          limit: 100,
          page,
          'filter[status]': status,
          'filter[type]': 'regular',
        },
      });
      for (const campaign of extractItems(payload)) {
        const id = campaignIdFor(campaign) ?? `${status}:${campaignNameFor(campaign) ?? campaigns.length}`;
        if (!byId.has(id)) byId.set(id, campaign);
      }
      const nextPage = extractNextPage(payload, page);
      if (!nextPage) break;
      page = nextPage;
    }
  }
  campaigns.push(...byId.values());
  return campaigns;
};

const buildMailerLiteCampaignBody = ({ target, senderIdentity }) => {
  const email = {
    subject: target.subject,
    from_name: senderIdentity.fromName,
    from: senderIdentity.fromEmail,
    content: buildHtmlForPayload(target),
  };
  if (senderIdentity.replyTo) email.reply_to = senderIdentity.replyTo;
  return {
    name: target.name,
    type: 'regular',
    emails: [email],
  };
};

const mutateDraftCampaign = async ({ options, key, target, senderIdentity }) => {
  const body = buildMailerLiteCampaignBody({ target, senderIdentity });
  const method = target.plannedOperation === 'update_existing_draft_campaign' ? 'PUT' : 'POST';
  const path = target.plannedOperation === 'update_existing_draft_campaign'
    ? `/campaigns/${target.draftCampaignId}`
    : '/campaigns';
  if (method === 'PUT') delete body.type;
  const payload = await requestJson({ options, key, path, method, body });
  const campaign = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  return {
    step: target.step,
    name: target.name,
    operation: target.plannedOperation,
    campaignId: campaignIdFor(campaign),
    campaignStatus: campaignStatusFor(campaign),
  };
};

const buildMissingCredentialRun = ({ scopePacket, payloadManifest, options, generatedAt = new Date().toISOString() }) =>
  buildRunFromState({
    scopePacket,
    payloadManifest,
    campaigns: [],
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
    fromEmail: options.fromEmail,
    fromName: options.fromName,
    replyTo: options.replyTo,
    generatedAt,
    credentialPresent: false,
    credentialSource: null,
    credentialService: options.service,
    credentialAccount: options.account,
  });

const buildRun = async (options) => {
  const [scopePacket, payloadManifest] = await Promise.all([
    readJson(options.scopePacket),
    readJson(options.payloadManifest),
  ]);
  const credential = await getCredential(options);
  if (!credential?.key) return buildMissingCredentialRun({ scopePacket, payloadManifest, options });

  const campaigns = await fetchCampaigns(options, credential.key);
  const initialRun = buildRunFromState({
    scopePacket,
    payloadManifest,
    campaigns,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
    fromEmail: options.fromEmail,
    fromName: options.fromName,
    replyTo: options.replyTo,
    credentialPresent: true,
    credentialSource: credential.source,
    credentialService: options.service,
    credentialAccount: options.account,
  });

  if (!initialRun.decision.canExecute) return initialRun;

  const senderIdentity = senderIdentityFor(options);
  const assetMutations = [];
  const errors = [];
  for (const target of initialRun.targetPlan) {
    try {
      const mutation = await mutateDraftCampaign({
        options,
        key: credential.key,
        target,
        senderIdentity,
      });
      assetMutations.push(mutation);
    } catch (error) {
      errors.push({
        step: target.step,
        name: target.name,
        reason: error?.reason || error?.message || 'mailerlite_campaign_asset_build_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
      break;
    }
  }

  return buildRunFromState({
    scopePacket,
    payloadManifest,
    campaigns,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
    fromEmail: options.fromEmail,
    fromName: options.fromName,
    replyTo: options.replyTo,
    generatedAt: initialRun.generatedAt,
    credentialPresent: true,
    credentialSource: credential.source,
    credentialService: options.service,
    credentialAccount: options.account,
    assetMutations,
    errors,
  });
};

const renderMarkdown = (run) => [
  '# MailerLite Launch OS v0 - Mini-Launch Email Asset Build Runner',
  '',
  `Generated: ${run.generatedAt}`,
  `Mode: ${run.mode}`,
  `Status: ${run.status}`,
  '',
  '## Decision Ejecutiva',
  '',
  run.mode === 'dry_run'
    ? 'Dry-run completado. Se hizo un escaneo read-only de campañas de MailerLite y no se crearon ni editaron assets.'
    : run.status === 'executed_mini_launch_email_asset_build'
      ? 'Creacion/edicion aprobada ejecutada solo para los cuatro borradores nombrados del mini-lanzamiento.'
      : 'Execute fue solicitado pero quedo bloqueado o fallo antes de completar los cuatro borradores.',
  '',
  `Mini-lanzamiento: ${run.launch?.resourceName ?? 'unknown'}`,
  `launch_id: ${run.launch?.launchId ?? 'unknown'}`,
  '',
  '## Fresh Campaign Scan',
  '',
  `- Campaigns read: ${run.freshScan.campaignsRead}`,
  `- Target campaigns existing: ${run.freshScan.targetCampaignsExistingCount}`,
  `- Target campaigns missing: ${run.freshScan.targetCampaignsMissingCount}`,
  `- Would create draft campaigns: ${run.freshScan.createDraftCount}`,
  `- Would update draft campaigns: ${run.freshScan.updateDraftCount}`,
  `- Conflicts: ${run.freshScan.conflictCount}`,
  '',
  '## Gates',
  '',
  `- Scope packet status: ${run.sourceSummary.scopePacketStatus}`,
  `- Payload manifest status: ${run.sourceSummary.payloadManifestStatus}`,
  `- Scope packet is approval by itself: ${run.sourceSummary.scopePacketIsApprovalByItself}`,
  `- Manifest is approval by itself: ${run.sourceSummary.manifestIsApprovalByItself}`,
  `- Scope can execute build now: ${run.sourceSummary.sourceCanExecuteBuildNow}`,
  `- Manifest can execute builder now: ${run.sourceSummary.manifestCanExecuteBuilderNow}`,
  `- Approval status: ${run.decision.approval.status}`,
  `- canExecute: ${run.decision.canExecute}`,
  `- Sender identity supplied: fromEmail=${run.senderIdentity.fromEmailPresent}; fromName=${run.senderIdentity.fromNamePresent}; replyTo=${run.senderIdentity.replyToPresent}`,
  '',
  '## Target Plan',
  '',
  ...(run.targetPlan.length
    ? run.targetPlan.map((target) =>
      `- Email ${target.step} ${target.name}: ${target.plannedOperation}; existing=${target.existsInFreshScan}; statuses=${target.matchingCampaignStatuses.join(', ') || 'none'}; sendAllowed=${target.sendAllowed}; workflowAttachmentAllowed=${target.workflowAttachmentAllowed}; subscriberReadOrAssignmentAllowed=${target.subscriberReadOrAssignmentAllowed}`,
    )
    : ['- None.']),
  '',
  '## Asset Mutations',
  '',
  run.assetMutations.length
    ? run.assetMutations.map((asset) => `- Email ${asset.step} ${asset.name}: ${asset.operation}; campaignId=${asset.campaignId ?? 'id_missing'}; status=${asset.campaignStatus ?? 'unknown'}`).join('\n')
    : '- None.',
  '',
  '## Blockers',
  '',
  run.decision.blockers.length
    ? run.decision.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- None.',
  '',
  '## Future Execution Preconditions',
  '',
  ...run.decision.futureExecutionPreconditions.map((item) => `- ${item}`),
  '',
  '## Approval Phrase Required For Execute',
  '',
  run.decision.expectedPhrase ? `\`${run.decision.expectedPhrase}\`` : '- Not available.',
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- MailerLite campaigns read: ${run.safety.mailerLiteCampaignsRead}`,
  `- MailerLite mutations performed: ${run.safety.mailerLiteMutationsPerformed}`,
  `- MailerLite assets created or edited: ${run.safety.mailerLiteAssetsCreatedOrEdited}`,
  `- Allowed mutation type: ${run.safety.allowedMutationType ?? 'none'}`,
  '- No campaigns scheduled or sent.',
  '- No campaign deletes.',
  '- No subscribers read, printed, imported or assigned.',
  '- No groups created or assigned.',
  '- No workflows or automations edited.',
  '- Onboarding untouched.',
  '- No Shopify/CRM live mutations, ledger append, cards, scoring or Fact Store write.',
  '- No tokens or sender values printed.',
  '',
].join('\n');

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const run = await buildRun(options);
  if (options.out) await writeJson(options.out, run);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(run));

  console.log(JSON.stringify({
    ok: run.ok,
    status: run.status,
    mode: run.mode,
    generatedAt: run.generatedAt,
    freshScan: run.freshScan,
    sourceSummary: run.sourceSummary,
    assetMutationCount: run.assetMutations.length,
    blockers: run.decision.blockers,
    errors: run.errors,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: run.safety,
  }, null, 2));

  if (options.execute && run.status !== 'executed_mini_launch_email_asset_build') process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email asset build failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  approvalStatusFor,
  buildHtmlForPayload,
  buildRun,
  buildRunFromState,
  buildTargetPlan,
  buildTargetPayloads,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  senderIdentityFor,
  signatureAssetFor,
  validateSourceReadiness,
};
