#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildExactApprovalPhrase,
} from './crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete-2026-05-31';
const DEFAULT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-delete.mjs [options]

Options:
  --approval-packet <path> Cleanup approval packet JSON. Defaults to ${DEFAULT_APPROVAL_PACKET}
  --execute                Delete the two approved unsafe replacement drafts. Without this, dry-run/read-only scan only.
  --approval-phrase <text> Exact approval phrase required with --execute.
  --service <name>         Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>         Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>         MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>         Per-request timeout. Defaults to 30000.
  --out <path>             Write JSON receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>    Write Markdown receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                   Show this help

Guarded runner for the approved cleanup route. It deletes only the two
campaign ids named in the cleanup approval packet, after a fresh read-only scan
and exact human approval. It never sends, schedules, publishes, creates groups,
assigns subscribers, edits workflows, touches Shopify/CRM, appends ledgers,
writes cards/scoring, touches Fact Store, deletes original E02/E03 drafts,
prints tokens, or prints exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeApprovalPhrase = (value) =>
  cleanString(value)
    ?.normalize('NFKC')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const parseArgs = (argv) => {
  const options = {
    approvalPacket: DEFAULT_APPROVAL_PACKET,
    execute: false,
    approvalPhrase: null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--approval-packet') options.approvalPacket = argv[++index];
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/u, '');
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${options.apiBase}`);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  try {
    return await readJson(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    return null;
  }
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
  if (status === 403 || /forbidden|permission|advanced/i.test(text)) return 'mailerlite_forbidden_or_plan_limited';
  if (status === 404) return 'mailerlite_campaign_not_found';
  if (status === 410) return 'mailerlite_campaign_gone';
  if (status === 409 || /already exists|duplicate|conflict/i.test(text)) return 'mailerlite_campaign_conflict';
  if (status === 422 || /validation|field must be|Campaign is not with status draft/i.test(text)) return 'mailerlite_validation_failed';
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
        .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[email_redacted]')
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

const requestJson = async ({ options, key, path, method = 'GET' }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.apiBase}${path.startsWith('/') ? path : `/${path}`}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Mini-Launch-API-Replacement-Cleanup/1.0',
      },
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

const campaignFromPayload = (payload) =>
  payload?.data && typeof payload.data === 'object' ? payload.data : payload;

const fetchCampaignStatus = async ({ options, key, id }) => {
  try {
    const campaign = campaignFromPayload(await requestJson({ options, key, path: `/campaigns/${id}` }));
    return {
      found: true,
      id: cleanString(campaign?.id) ?? id,
      name: cleanString(campaign?.name) ?? cleanString(campaign?.title),
      status: cleanString(campaign?.status),
      canBeScheduled: Boolean(campaign?.can_be_scheduled ?? campaign?.canBeScheduled),
      hasBasicFilter: Boolean(campaign?.has_basic_filter ?? campaign?.hasBasicFilter),
      filterIsEmptyArray: Array.isArray(campaign?.filter) && campaign.filter.length === 0,
      scheduledFor: campaign?.scheduled_for ?? campaign?.scheduledFor ?? null,
      queuedAt: campaign?.queued_at ?? campaign?.queuedAt ?? null,
      startedAt: campaign?.started_at ?? campaign?.startedAt ?? null,
      finishedAt: campaign?.finished_at ?? campaign?.finishedAt ?? null,
      usedInAutomations: Boolean(campaign?.used_in_automations ?? campaign?.usedInAutomations),
    };
  } catch (error) {
    if (error?.status === 404 || error?.status === 410 || error?.reason === 'mailerlite_campaign_not_found' || error?.reason === 'mailerlite_campaign_gone') {
      return {
        found: false,
        id,
        name: null,
        status: error?.status === 410 || error?.reason === 'mailerlite_campaign_gone' ? 'gone' : 'not_found',
        canBeScheduled: false,
        hasBasicFilter: false,
        filterIsEmptyArray: false,
        scheduledFor: null,
        queuedAt: null,
        startedAt: null,
        finishedAt: null,
        usedInAutomations: false,
      };
    }
    throw error;
  }
};

const normalizeName = (value) =>
  cleanString(value)
    ?.normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const targetsFromPacket = (packet) => (packet?.cleanupTargets ?? []).map((target) => ({
  label: cleanString(target?.label),
  campaignId: cleanString(target?.campaignId),
  name: cleanString(target?.name),
}));

const falseOrNull = (value) => value === false || value === null || value === undefined;

const cleanupDeletionEvidenceSafe = (receipt, targets) => {
  const rows = Array.isArray(receipt?.deletedDrafts) ? receipt.deletedDrafts : [];
  const safety = receipt?.safety ?? {};
  const targetRows = Array.isArray(targets) ? targets : [];
  const targetIds = new Set(targetRows.map((target) => cleanString(target?.campaignId)).filter(Boolean));
  const targetNames = new Map(targetRows.map((target) => [
    cleanString(target?.campaignId),
    normalizeName(target?.name),
  ]));

  if (receipt?.mode !== 'execute_requested') return false;
  if (![
    'seed_inbox_correction_api_replacement_cleanup_execution_partial_stopped',
    'seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends',
  ].includes(receipt?.status)) return false;
  if (targetRows.length !== 2 || rows.length !== 2 || targetIds.size !== 2) return false;
  if (safety.mailerLiteApiCalled !== true) return false;
  if (safety.mailerLiteDraftsDeleted !== 2) return false;
  if (safety.mailerLiteMutationsPerformed !== true) return false;
  if (safety.allowedMutationType !== 'delete_two_unsafe_replacement_draft_campaigns_only') return false;
  if (safety.originalDraftsEditedOrDeleted !== false) return false;
  if (safety.campaignsCreatedOrEdited !== false) return false;
  if (safety.campaignsPublished !== false) return false;
  if (safety.campaignsScheduled !== false) return false;
  if (safety.sendsPerformed !== false) return false;
  if (safety.subscribersRead !== false) return false;
  if (safety.subscriberMutationsPerformed !== false) return false;
  if (safety.groupsCreatedOrAssigned !== false) return false;
  if (safety.segmentsCreatedOrAssigned !== false) return false;
  if (safety.workflowMutationsPerformed !== false) return false;
  if (!falseOrNull(safety.shopifyApiCalled)) return false;
  if (!falseOrNull(safety.shopifyMutationsPerformed)) return false;
  if (safety.crmLiveApiCalled !== false) return false;
  if (safety.signalLedgerAppendPerformed !== false) return false;
  if (safety.crmCardMutationsPerformed !== false) return false;
  if (safety.crmScoreMutationsPerformed !== false) return false;
  if (safety.factStoreWritePerformed !== false) return false;
  if (safety.tokensPrinted !== false) return false;
  if (safety.exactUrlsPrinted !== false) return false;

  return rows.every((row) => {
    const id = cleanString(row?.campaignId);
    return id
      && targetIds.has(id)
      && row?.deleted === true
      && normalizeName(row?.name) === targetNames.get(id);
  });
};

const buildPreflight = ({ approvalPacket, currentStatuses, priorDeletionEvidence = false }) => {
  const blockers = [];
  const targets = targetsFromPacket(approvalPacket);

  if (approvalPacket?.status !== 'seed_inbox_correction_api_replacement_cleanup_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`cleanup_approval_packet_not_ready:${approvalPacket?.status ?? 'missing'}`);
  }
  if (approvalPacket?.decision?.packetIsApprovalByItself !== false) blockers.push('cleanup_packet_self_authorizes_unexpectedly');
  if (approvalPacket?.decision?.canDeleteNow !== false) blockers.push('cleanup_packet_delete_gate_unexpectedly_open');
  if (normalizeApprovalPhrase(approvalPacket?.decision?.exactApprovalPhrase) !== normalizeApprovalPhrase(buildExactApprovalPhrase())) {
    blockers.push('cleanup_exact_phrase_mismatch');
  }
  if (targets.length !== 2) blockers.push(`cleanup_target_count_not_2:${targets.length}`);

  const currentById = new Map(currentStatuses.map((status) => [cleanString(status?.id), status]));
  for (const target of targets) {
    const current = currentById.get(target.campaignId);
    if (!target.campaignId) blockers.push(`cleanup_target_${target.label ?? 'unknown'}_missing_campaign_id`);
    if (!target.name) blockers.push(`cleanup_target_${target.label ?? target.campaignId ?? 'unknown'}_missing_name`);
    if (!current?.found) {
      if (priorDeletionEvidence) continue;
      blockers.push(`cleanup_target_${target.label ?? target.campaignId}_not_found`);
      continue;
    }
    if (normalizeName(current.name) !== normalizeName(target.name)) {
      blockers.push(`cleanup_target_${target.label}_name_mismatch`);
    }
    if (current.status !== 'draft') blockers.push(`cleanup_target_${target.label}_not_draft:${current.status ?? 'missing'}`);
    if (current.scheduledFor !== null || current.queuedAt !== null || current.startedAt !== null || current.finishedAt !== null) {
      blockers.push(`cleanup_target_${target.label}_has_send_or_schedule_state`);
    }
    if (current.usedInAutomations !== false) blockers.push(`cleanup_target_${target.label}_used_in_automations`);
  }

  return {
    targets,
    blockers: [...new Set(blockers)],
    canExecute: blockers.length === 0,
  };
};

const buildSafety = ({ execute, campaignsRead = 0, deleted = 0 }) => ({
  mode: execute ? 'execute_mailerlite_api_cleanup_delete_only' : 'dry_run_read_only',
  mailerLiteApiCalled: true,
  mailerLiteCampaignsRead: campaignsRead,
  mailerLiteDraftsDeleted: execute ? deleted : 0,
  mailerLiteMutationsPerformed: execute && deleted > 0,
  allowedMutationType: execute && deleted > 0 ? 'delete_two_unsafe_replacement_draft_campaigns_only' : null,
  originalDraftsEditedOrDeleted: false,
  campaignsCreatedOrEdited: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  sendsPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
  segmentsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
  exactUrlsPrinted: false,
});

const buildRun = async (options) => {
  const generatedAt = new Date().toISOString();
  const approvalPacket = await readJson(options.approvalPacket);
  const credential = await getCredential(options);
  if (!credential?.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: options.execute ? 'execute_requested' : 'dry_run',
      generatedAt,
      ok: false,
      status: 'blocked_missing_mailerlite_credential',
      credential: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      decision: {
        approval: {
          provided: Boolean(cleanString(options.approvalPhrase)),
          status: options.execute ? 'not_checked_missing_credential' : 'dry_run_no_live_approval_required',
        },
        canExecute: false,
        exactApprovalPhrasePrinted: false,
        blockers: ['blocked_missing_mailerlite_credential'],
      },
      preScan: [],
      deletedDrafts: [],
      postScan: [],
      errors: [],
      safety: buildSafety({ execute: options.execute }),
    };
  }

  const targets = targetsFromPacket(approvalPacket);
  const priorReceipt = options.execute ? await readOptionalJson(options.out) : null;
  const priorDeletionEvidence = cleanupDeletionEvidenceSafe(priorReceipt, targets);
  const preScan = [];
  const errors = [];
  for (const target of targets) {
    try {
      preScan.push(await fetchCampaignStatus({ options, key: credential.key, id: target.campaignId }));
    } catch (error) {
      errors.push({
        label: target.label,
        campaignId: target.campaignId,
        phase: 'pre_scan',
        reason: error?.reason || error?.message || 'mailerlite_cleanup_prescan_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    }
  }

  const preflight = buildPreflight({
    approvalPacket,
    currentStatuses: preScan,
    priorDeletionEvidence,
  });
  const approvalMatched = normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(buildExactApprovalPhrase());
  const approvalStatus = !options.execute
    ? 'dry_run_no_live_approval_required'
    : approvalMatched
      ? 'exact_approval_phrase_matched'
      : cleanString(options.approvalPhrase)
        ? 'blocked_approval_phrase_mismatch'
        : 'blocked_missing_exact_approval_phrase';
  const blockers = [
    ...preflight.blockers,
    ...(errors.length ? ['pre_scan_failed'] : []),
    ...(options.execute && !approvalMatched ? [approvalStatus] : []),
  ];
  const deletedDrafts = [];

  if (options.execute && blockers.length === 0) {
    const previousDeletedById = new Map((priorDeletionEvidence ? priorReceipt.deletedDrafts : []).map((row) => [
      cleanString(row?.campaignId),
      row,
    ]));
    const currentById = new Map(preScan.map((status) => [cleanString(status?.id), status]));
    for (const target of preflight.targets) {
      if (priorDeletionEvidence && currentById.get(target.campaignId)?.found === false) {
        const previous = previousDeletedById.get(target.campaignId);
        deletedDrafts.push({
          label: previous?.label ?? target.label,
          campaignId: target.campaignId,
          name: previous?.name ?? target.name,
          deleted: true,
          reconciledFromPreviousReceipt: true,
        });
        continue;
      }
      try {
        await requestJson({ options, key: credential.key, path: `/campaigns/${target.campaignId}`, method: 'DELETE' });
        deletedDrafts.push({
          label: target.label,
          campaignId: target.campaignId,
          name: target.name,
          deleted: true,
        });
      } catch (error) {
        errors.push({
          label: target.label,
          campaignId: target.campaignId,
          phase: 'delete',
          reason: error?.reason || error?.message || 'mailerlite_cleanup_delete_failed',
          status: error?.status ?? null,
          details: Array.isArray(error?.details) ? error.details : [],
        });
        break;
      }
    }
  }

  const postScan = [];
  for (const target of targets) {
    try {
      postScan.push(await fetchCampaignStatus({ options, key: credential.key, id: target.campaignId }));
    } catch (error) {
      errors.push({
        label: target.label,
        campaignId: target.campaignId,
        phase: 'post_scan',
        reason: error?.reason || error?.message || 'mailerlite_cleanup_postscan_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    }
  }

  const goneCount = postScan.filter((row) => row.found === false).length;
  const executedOk = options.execute
    && blockers.length === 0
    && errors.length === 0
    && deletedDrafts.length === 2
    && goneCount === 2;
  const dryRunOk = !options.execute
    && blockers.length === 0
    && errors.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: options.execute ? 'execute_requested' : 'dry_run',
    generatedAt,
    ok: options.execute ? executedOk : dryRunOk,
    status: options.execute
      ? executedOk
        ? 'seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends'
        : deletedDrafts.length > 0
          ? 'seed_inbox_correction_api_replacement_cleanup_execution_partial_stopped'
          : 'seed_inbox_correction_api_replacement_cleanup_execution_blocked_before_mutation'
      : dryRunOk
        ? 'seed_inbox_correction_api_replacement_cleanup_dry_run_ready_for_exact_approval'
        : 'seed_inbox_correction_api_replacement_cleanup_dry_run_blocked',
    credential: {
      service: options.service,
      account: options.account,
      credentialPresent: true,
      credentialSource: 'configured_not_printed',
    },
    decision: {
      approval: {
        provided: Boolean(cleanString(options.approvalPhrase)),
        status: approvalStatus,
      },
      canExecute: options.execute && blockers.length === 0,
      exactApprovalPhrasePrinted: false,
      blockers,
    },
    preScan,
    deletedDrafts,
    postScan: {
      targetCount: targets.length,
      goneCount,
      targets: postScan,
    },
    errors,
    reconciliation: {
      priorExecutionReceiptUsed: priorDeletionEvidence,
      priorExecutionReceiptStatus: priorDeletionEvidence ? priorReceipt.status : null,
      priorExecutionReceiptOut: priorDeletionEvidence ? resolve(options.out) : null,
    },
    safety: buildSafety({
      execute: options.execute,
      campaignsRead: preScan.length + postScan.length,
      deleted: deletedDrafts.length,
    }),
  };
};

const renderMarkdown = (run) => [
  '# MailerLite Mini-Launch API Replacement Cleanup Execution Receipt',
  '',
  `Generated: ${run.generatedAt}`,
  `Mode: ${run.mode}`,
  `Status: ${run.status}`,
  `OK: ${run.ok}`,
  '',
  '## Decision',
  '',
  `- Approval status: ${run.decision.approval.status}`,
  `- Can execute: ${run.decision.canExecute}`,
  `- Exact approval phrase printed: ${run.decision.exactApprovalPhrasePrinted}`,
  `- Blocker count: ${run.decision.blockers.length}`,
  '',
  '## Cleanup',
  '',
  `- Deleted drafts: ${run.deletedDrafts.length}`,
  `- Gone after post-scan: ${run.postScan.goneCount}`,
  ...run.deletedDrafts.map((draft) => `- ${draft.label}: ${draft.name}; campaignId=${draft.campaignId}; deleted=${draft.deleted}`),
  '',
  '## Blockers',
  '',
  ...(run.decision.blockers.length ? run.decision.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Errors',
  '',
  ...(run.errors.length ? run.errors.map((error) => `- ${error.label}: ${error.phase}:${error.reason}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- MailerLite drafts deleted: ${run.safety.mailerLiteDraftsDeleted}`,
  `- Original drafts edited/deleted: ${run.safety.originalDraftsEditedOrDeleted}`,
  `- Sends performed: ${run.safety.sendsPerformed}`,
  `- Campaigns created/edited: ${run.safety.campaignsCreatedOrEdited}`,
  `- Campaigns published: ${run.safety.campaignsPublished}`,
  `- Campaigns scheduled: ${run.safety.campaignsScheduled}`,
  `- Subscribers read: ${run.safety.subscribersRead}`,
  `- Subscriber mutations: ${run.safety.subscriberMutationsPerformed}`,
  `- Groups/segments assigned: ${run.safety.groupsCreatedOrAssigned}/${run.safety.segmentsCreatedOrAssigned}`,
  `- Workflows mutated: ${run.safety.workflowMutationsPerformed}`,
  `- Shopify/CRM/ledgers/cards/scoring/Fact Store closed: ${!run.safety.shopifyMutationsPerformed && !run.safety.crmLiveApiCalled && !run.safety.signalLedgerAppendPerformed && !run.safety.crmCardMutationsPerformed && !run.safety.crmScoreMutationsPerformed && !run.safety.factStoreWritePerformed}`,
  `- Exact URLs printed: ${run.safety.exactUrlsPrinted}`,
  `- Tokens printed: ${run.safety.tokensPrinted}`,
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
  await writeFile(fullPath, `${value}\n`, 'utf8');
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
    deletedDraftCount: run.deletedDrafts.length,
    goneCount: run.postScan.goneCount,
    blockerCount: run.decision.blockers.length,
    errorCount: run.errors.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: {
      mailerLiteApiCalled: run.safety.mailerLiteApiCalled,
      mailerLiteDraftsDeleted: run.safety.mailerLiteDraftsDeleted,
      sendsPerformed: run.safety.sendsPerformed,
      campaignsPublished: run.safety.campaignsPublished,
      campaignsScheduled: run.safety.campaignsScheduled,
      subscribersRead: run.safety.subscribersRead,
      groupsCreatedOrAssigned: run.safety.groupsCreatedOrAssigned,
      segmentsCreatedOrAssigned: run.safety.segmentsCreatedOrAssigned,
      workflowMutationsPerformed: run.safety.workflowMutationsPerformed,
      exactUrlsPrinted: run.safety.exactUrlsPrinted,
      tokensPrinted: run.safety.tokensPrinted,
    },
  }, null, 2));

  if (options.execute && run.status !== 'seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends') {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite API replacement cleanup failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPreflight,
  buildRun,
  cleanupDeletionEvidenceSafe,
  fetchCampaignStatus,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  targetsFromPacket,
};
