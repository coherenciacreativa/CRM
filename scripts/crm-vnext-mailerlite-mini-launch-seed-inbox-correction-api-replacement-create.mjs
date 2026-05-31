#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildExactApprovalPhrase,
  buildReplacementTargets,
} from './crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-approval-packet.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-create-2026-05-31';
const DEFAULT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.md';

const STEP_LINK_KEY = new Map([
  [2, 'practice_link'],
  [3, 'editorial_note_link'],
]);
const STEP_PLACEHOLDER = new Map([
  [2, 'practice_link_placeholder'],
  [3, 'editorial_note_link_placeholder'],
]);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-create.mjs [options]

Options:
  --approval-packet <path>         API replacement approval packet JSON. Defaults to ${DEFAULT_APPROVAL_PACKET}
  --correction-preview <path>      Corrected payload preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --execute                        Create the two approved replacement drafts. Without this, dry-run/read-only scan only.
  --approval-phrase <text>         Exact approval phrase required with --execute.
  --service <name>                 Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                 Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                 MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                 Per-request timeout. Defaults to 30000.
  --out <path>                     Write JSON receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Guarded runner for the approved E02/E03 replacement-draft route. It creates
only two new MailerLite draft campaigns after exact approval, copying the old
draft HTML and replacing only the approved placeholders with preview URLs from
the Shopify receipt. It never sends, schedules, publishes, creates groups,
assigns subscribers, edits workflows, touches Shopify/CRM, appends ledgers,
writes cards/scoring, touches Fact Store, deletes old drafts, prints tokens, or
prints exact URLs.`;

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

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const parseArgs = (argv) => {
  const options = {
    approvalPacket: DEFAULT_APPROVAL_PACKET,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
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
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
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
  if (status === 404) return 'mailerlite_endpoint_not_found';
  if (status === 409 || /already exists|duplicate/i.test(text)) return 'mailerlite_campaign_conflict_or_duplicate';
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

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const requestJson = async ({ options, key, path, method = 'GET', body = null, params = {}, form = false }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers = {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'User-Agent': 'CRM-vNext-MailerLite-Mini-Launch-Seed-Inbox-Correction-API-Replacement/1.0',
    };
    let requestBody = null;
    if (body && form) {
      const searchParams = new URLSearchParams();
      for (const [field, value] of Object.entries(body)) {
        if (value !== null && value !== undefined) searchParams.set(field, String(value));
      }
      headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
      requestBody = searchParams;
    } else if (body) {
      headers['Content-Type'] = 'application/json';
      requestBody = JSON.stringify(body);
    }

    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      method,
      headers,
      body: requestBody,
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

const campaignNameFor = (campaign) => cleanString(campaign?.name) ?? cleanString(campaign?.title);
const campaignIdFor = (campaign) => cleanString(campaign?.id) ?? cleanString(campaign?.campaign_id);
const campaignStatusFor = (campaign) => cleanString(campaign?.status);
const emailForCampaign = (campaign) => Array.isArray(campaign?.emails) ? campaign.emails[0] ?? {} : {};

const fetchCampaigns = async (options, key) => {
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
        const id = campaignIdFor(campaign) ?? `${status}:${campaignNameFor(campaign) ?? byId.size}`;
        if (!byId.has(id)) byId.set(id, campaign);
      }
      const nextPage = extractNextPage(payload, page);
      if (!nextPage) break;
      page = nextPage;
    }
  }
  return [...byId.values()];
};

const fetchCampaignDetail = async (options, key, id) => {
  const payload = await requestJson({ options, key, path: `/campaigns/${id}` });
  return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
};

const targetLinksByKey = (receipt) => {
  const rows = Array.isArray(receipt?.targetLinks)
    ? receipt.targetLinks
    : Object.values(receipt?.targetLinks ?? {});
  return new Map(rows
    .filter((row) => cleanString(row?.key) && cleanString(row?.url))
    .map((row) => [cleanString(row.key), cleanString(row.url)]));
};

const buildPreflight = ({
  approvalPacket,
  correctionPreview,
  shopifyPreviewRouteExecutionReceipt,
  campaigns,
}) => {
  const blockers = [];
  const expectedPhrase = buildExactApprovalPhrase();
  const replacementTargets = buildReplacementTargets({
    correctionPreview,
    manualUiBuildReceipt: { draftReceipts: (approvalPacket?.replacementTargets ?? []).map((target) => ({
      step: target.step,
      draftName: target.oldDraftName,
      role: target.role,
    })) },
    replacementSuffix: 'API replacement',
  }).map((target) => {
    const explicitTarget = (approvalPacket?.replacementTargets ?? []).find((row) => Number(row?.step) === target.step);
    return {
      ...target,
      replacementDraftName: cleanString(explicitTarget?.replacementDraftName) ?? target.replacementDraftName,
      oldDraftName: cleanString(explicitTarget?.oldDraftName) ?? target.oldDraftName,
    };
  });
  const campaignsByName = new Map();
  for (const campaign of campaigns) {
    const normalized = normalizeName(campaignNameFor(campaign));
    if (!normalized) continue;
    const existing = campaignsByName.get(normalized) ?? [];
    existing.push(campaign);
    campaignsByName.set(normalized, existing);
  }
  const links = targetLinksByKey(shopifyPreviewRouteExecutionReceipt);

  if (approvalPacket?.status !== 'seed_inbox_correction_api_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`approval_packet_not_ready:${approvalPacket?.status ?? 'missing'}`);
  }
  if (approvalPacket?.decision?.packetIsApprovalByItself !== false) blockers.push('approval_packet_self_authorizes_unexpectedly');
  if (approvalPacket?.decision?.canCreateReplacementDraftsNow !== false) blockers.push('approval_packet_create_gate_unexpectedly_open');
  if (normalizeApprovalPhrase(approvalPacket?.decision?.exactApprovalPhrase) !== normalizeApprovalPhrase(expectedPhrase)) {
    blockers.push('approval_packet_exact_phrase_mismatch');
  }
  if (correctionPreview?.status !== 'seed_inbox_correction_preview_ready_no_live_changes') {
    blockers.push(`correction_preview_not_ready:${correctionPreview?.status ?? 'missing'}`);
  }
  if (shopifyPreviewRouteExecutionReceipt?.status !== 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm') {
    blockers.push(`shopify_preview_route_execution_not_ready:${shopifyPreviewRouteExecutionReceipt?.status ?? 'missing'}`);
  }
  if (shopifyPreviewRouteExecutionReceipt?.executionSummary?.canUseForLocalCorrectionPreview !== true) {
    blockers.push('shopify_preview_route_not_allowed_for_local_correction_preview');
  }
  if (shopifyPreviewRouteExecutionReceipt?.executionSummary?.publicAudienceSendUrlGateReady !== false) {
    blockers.push('shopify_preview_route_public_send_gate_unexpectedly_ready');
  }
  if (replacementTargets.length !== 2) blockers.push(`replacement_target_count_not_2:${replacementTargets.length}`);

  const targetPlan = replacementTargets.map((target) => {
    const oldMatches = campaignsByName.get(normalizeName(target.oldDraftName)) ?? [];
    const replacementMatches = campaignsByName.get(normalizeName(target.replacementDraftName)) ?? [];
    const linkKey = STEP_LINK_KEY.get(target.step);
    const placeholder = STEP_PLACEHOLDER.get(target.step);
    const url = linkKey ? links.get(linkKey) : null;
    const oldDrafts = oldMatches.filter((campaign) => campaignStatusFor(campaign) === 'draft');
    const rowBlockers = [];
    if (oldDrafts.length !== 1) rowBlockers.push(`target_${target.label}_old_draft_match_count_not_1:${oldDrafts.length}`);
    if (replacementMatches.length > 0) rowBlockers.push(`target_${target.label}_replacement_name_already_exists`);
    if (!url) rowBlockers.push(`target_${target.label}_exact_url_missing`);
    if (!placeholder) rowBlockers.push(`target_${target.label}_placeholder_missing`);
    blockers.push(...rowBlockers);
    return {
      ...target,
      linkKey,
      placeholder,
      oldCampaignId: oldDrafts.length === 1 ? campaignIdFor(oldDrafts[0]) : null,
      oldCampaignMatchCount: oldMatches.length,
      replacementNameCollisionCount: replacementMatches.length,
      urlSha256: url ? sha256(url) : null,
      exactUrlAvailable: Boolean(url),
      rowBlockers,
    };
  });

  return {
    expectedPhrase,
    replacementTargets,
    targetPlan,
    blockers: [...new Set(blockers)],
    campaignsRead: campaigns.length,
    canExecute: blockers.length === 0,
  };
};

const buildFormBody = ({ name, subject, fromName, fromEmail, replyTo, content, languageId = null }) => {
  const body = {
    name,
    type: 'regular',
    'emails[0][subject]': subject,
    'emails[0][from_name]': fromName,
    'emails[0][from]': fromEmail,
    'emails[0][content]': content,
  };
  if (replyTo) body['emails[0][reply_to]'] = replyTo;
  if (languageId) body.language_id = languageId;
  return body;
};

const safeSenderIdentity = (email) => ({
  fromName: cleanString(email?.from_name ?? email?.fromName),
  fromEmail: cleanString(email?.from ?? email?.from_email ?? email?.fromEmail),
  replyTo: cleanString(email?.reply_to ?? email?.replyTo),
  valuePrinted: false,
});

const contentForReplacement = ({ oldContent, placeholder, url }) => {
  if (typeof oldContent !== 'string' || oldContent.length === 0) {
    return { content: null, replacedCount: 0 };
  }
  const parts = oldContent.split(placeholder);
  return {
    content: parts.join(url),
    replacedCount: Math.max(0, parts.length - 1),
  };
};

const createdCampaignStatus = async ({ options, key, id }) => {
  if (!id) {
    return {
      id: null,
      name: null,
      status: null,
      filterIsNull: false,
      filterIsEmptyArray: false,
      hasBasicFilter: true,
      missingData: [],
      canBeScheduled: true,
      scheduledFor: null,
      queuedAt: null,
      startedAt: null,
      finishedAt: null,
      usedInAutomations: true,
      contentHasExpectedUrl: false,
      contentHasPlaceholder: true,
      emailId: null,
      detailFetched: false,
    };
  }
  const detail = await fetchCampaignDetail(options, key, id);
  const email = emailForCampaign(detail);
  return {
    id,
    name: campaignNameFor(detail),
    status: campaignStatusFor(detail),
    filterIsNull: detail?.filter === null || detail?.filter === undefined,
    filterIsEmptyArray: Array.isArray(detail?.filter) && detail.filter.length === 0,
    hasBasicFilter: Boolean(detail?.has_basic_filter ?? detail?.hasBasicFilter),
    missingData: Array.isArray(detail?.missing_data) ? detail.missing_data : [],
    canBeScheduled: Boolean(detail?.can_be_scheduled ?? detail?.canBeScheduled),
    scheduledFor: detail?.scheduled_for ?? detail?.scheduledFor ?? null,
    queuedAt: detail?.queued_at ?? detail?.queuedAt ?? null,
    startedAt: detail?.started_at ?? detail?.startedAt ?? null,
    finishedAt: detail?.finished_at ?? detail?.finishedAt ?? null,
    usedInAutomations: Boolean(detail?.used_in_automations ?? detail?.usedInAutomations),
    contentHasExpectedUrl: false,
    contentHasPlaceholder: false,
    emailId: cleanString(email?.id),
    detailFetched: true,
  };
};

const buildSafety = ({ execute, campaignsRead = 0, mutations = 0 }) => ({
  mode: execute ? 'execute_mailerlite_api_replacement_drafts_only' : 'dry_run_read_only',
  mailerLiteApiCalled: true,
  mailerLiteCampaignsRead: campaignsRead,
  mailerLiteDraftsCreated: execute ? mutations : 0,
  mailerLiteMutationsPerformed: execute && mutations > 0,
  mailerLiteAssetsCreatedOrEdited: execute && mutations > 0,
  allowedMutationType: execute && mutations > 0 ? 'create_two_new_draft_campaigns_only' : null,
  oldDraftsEdited: false,
  oldDraftsDeletedOrArchived: false,
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
  const [approvalPacket, correctionPreview, shopifyPreviewRouteExecutionReceipt] = await Promise.all([
    readJson(options.approvalPacket),
    readJson(options.correctionPreview),
    readJson(options.shopifyPreviewRouteExecutionReceipt),
  ]);
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
        blockers: ['blocked_missing_mailerlite_credential'],
      },
      freshScan: { campaignsRead: 0 },
      targetPlan: [],
      oldDraftChecks: [],
      createdDrafts: [],
      postScan: { replacementDraftCount: 0, inertDraftCount: 0 },
      errors: [],
      safety: buildSafety({ execute: options.execute }),
    };
  }

  const campaigns = await fetchCampaigns(options, credential.key);
  const preflight = buildPreflight({
    approvalPacket,
    correctionPreview,
    shopifyPreviewRouteExecutionReceipt,
    campaigns,
  });
  const approvalMatched = normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(preflight.expectedPhrase);
  const approvalStatus = !options.execute
    ? 'dry_run_no_live_approval_required'
    : approvalMatched
      ? 'exact_approval_phrase_matched'
      : cleanString(options.approvalPhrase)
        ? 'blocked_approval_phrase_mismatch'
        : 'blocked_missing_exact_approval_phrase';
  const blockers = [
    ...preflight.blockers,
    ...(options.execute && !approvalMatched ? [approvalStatus] : []),
  ];
  const createdDrafts = [];
  const oldDraftChecks = [];
  const errors = [];

  if (options.execute && blockers.length === 0) {
    const links = targetLinksByKey(shopifyPreviewRouteExecutionReceipt);
    for (const target of preflight.targetPlan) {
      try {
        const oldDetail = await fetchCampaignDetail(options, credential.key, target.oldCampaignId);
        const oldEmail = emailForCampaign(oldDetail);
        const sender = safeSenderIdentity(oldEmail);
        const url = links.get(target.linkKey);
        const oldContent = typeof oldEmail?.content === 'string' ? oldEmail.content : null;
        const { content, replacedCount } = contentForReplacement({
          oldContent,
          placeholder: target.placeholder,
          url,
        });
        const oldCheck = {
          step: target.step,
          label: target.label,
          oldCampaignId: target.oldCampaignId,
          oldStatus: campaignStatusFor(oldDetail),
          oldHasBasicFilter: Boolean(oldDetail?.has_basic_filter ?? oldDetail?.hasBasicFilter),
          oldCanBeScheduled: Boolean(oldDetail?.can_be_scheduled ?? oldDetail?.canBeScheduled),
          oldContentHadPlaceholder: oldContent ? oldContent.includes(target.placeholder) : false,
          replacementCount: replacedCount,
          senderIdentityPresent: Boolean(sender.fromName && sender.fromEmail),
          senderIdentityPrinted: false,
        };
        oldDraftChecks.push(oldCheck);

        if (campaignStatusFor(oldDetail) !== 'draft') throw new Error(`old_campaign_not_draft:${target.label}`);
        if (!oldCheck.oldContentHadPlaceholder) throw new Error(`old_campaign_placeholder_missing:${target.label}`);
        if (replacedCount < 1 || !content) throw new Error(`replacement_content_not_ready:${target.label}`);
        if (!sender.fromName || !sender.fromEmail) throw new Error(`sender_identity_missing:${target.label}`);

        const payload = await requestJson({
          options,
          key: credential.key,
          path: '/campaigns',
          method: 'POST',
          form: true,
          body: buildFormBody({
            name: target.replacementDraftName,
            subject: target.subject,
            fromName: sender.fromName,
            fromEmail: sender.fromEmail,
            replyTo: sender.replyTo,
            content,
            languageId: oldDetail?.language_id ?? oldDetail?.languageId ?? null,
          }),
        });
        const campaign = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
        createdDrafts.push({
          step: target.step,
          label: target.label,
          campaignId: campaignIdFor(campaign),
          name: target.replacementDraftName,
          status: campaignStatusFor(campaign),
          oldCampaignId: target.oldCampaignId,
          oldDraftLeftIntact: true,
          replacedPlaceholder: target.placeholder,
          replacementUrlSha256: target.urlSha256,
          exactUrlPrinted: false,
        });
      } catch (error) {
        errors.push({
          step: target.step,
          label: target.label,
          reason: error?.reason || error?.message || 'mailerlite_replacement_draft_create_failed',
          status: error?.status ?? null,
          details: Array.isArray(error?.details) ? error.details : [],
        });
        break;
      }
    }
  }

  const postScanCampaigns = credential?.key ? await fetchCampaigns(options, credential.key) : [];
  const postScanByName = new Map(postScanCampaigns.map((campaign) => [normalizeName(campaignNameFor(campaign)), campaign]));
  const postScan = [];
  for (const created of createdDrafts) {
    const detail = created.campaignId
      ? await fetchCampaignDetail(options, credential.key, created.campaignId)
      : null;
    const email = detail ? emailForCampaign(detail) : {};
    const urlHash = created.replacementUrlSha256;
    const content = typeof email?.content === 'string' ? email.content : '';
    const expectedUrl = [...targetLinksByKey(shopifyPreviewRouteExecutionReceipt).values()]
      .find((url) => sha256(url) === urlHash);
    postScan.push({
      ...await createdCampaignStatus({ options, key: credential.key, id: created.campaignId }),
      contentHasExpectedUrl: Boolean(expectedUrl && content.includes(expectedUrl)),
      contentHasPlaceholder: content.includes(created.replacedPlaceholder),
    });
  }
  const targetCollisionsAfter = preflight.targetPlan.map((target) => ({
    label: target.label,
    replacementDraftName: target.replacementDraftName,
    presentAfterRun: postScanByName.has(normalizeName(target.replacementDraftName)),
  }));
  const inertDraftCount = postScan.filter((row) =>
    row.status === 'draft'
    && row.canBeScheduled === false
    && row.usedInAutomations === false
    && row.scheduledFor === null
    && row.queuedAt === null
    && row.startedAt === null
    && row.finishedAt === null
    && row.contentHasExpectedUrl === true
    && row.contentHasPlaceholder === false,
  ).length;

  const executedOk = options.execute
    && blockers.length === 0
    && errors.length === 0
    && createdDrafts.length === 2
    && inertDraftCount === 2;
  const dryRunOk = !options.execute && blockers.length === 0;
  const partialMutationStopped = options.execute
    && !executedOk
    && createdDrafts.length > 0;
  const blockedBeforeMutation = options.execute
    && !executedOk
    && createdDrafts.length === 0
    && errors.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: options.execute ? 'execute_requested' : 'dry_run',
    generatedAt,
    ok: options.execute ? executedOk : dryRunOk,
    status: options.execute
      ? executedOk
        ? 'seed_inbox_correction_api_replacement_execution_completed_no_sends'
        : partialMutationStopped
          ? 'seed_inbox_correction_api_replacement_execution_partial_created_drafts_not_inert_stopped'
          : errors.length
          ? 'seed_inbox_correction_api_replacement_execution_failed_or_partial_stopped'
          : blockedBeforeMutation
            ? 'seed_inbox_correction_api_replacement_execution_blocked_before_mutation'
            : 'seed_inbox_correction_api_replacement_execution_failed_or_partial_stopped'
      : dryRunOk
        ? 'seed_inbox_correction_api_replacement_dry_run_ready_for_exact_approval'
        : 'seed_inbox_correction_api_replacement_dry_run_blocked',
    credential: {
      service: options.service,
      account: options.account,
      credentialPresent: Boolean(credential?.key),
      credentialSource: credential?.source ? 'configured_not_printed' : null,
    },
    decision: {
      approval: {
        provided: Boolean(cleanString(options.approvalPhrase)),
        status: approvalStatus,
      },
      canExecute: options.execute && blockers.length === 0,
      expectedPhraseSha256: sha256(preflight.expectedPhrase),
      exactApprovalPhrasePrinted: false,
      blockers,
    },
    freshScan: {
      campaignsRead: preflight.campaignsRead,
      replacementNameCollisionCount: preflight.targetPlan.reduce((sum, target) => sum + target.replacementNameCollisionCount, 0),
      oldDraftMatchCount: preflight.targetPlan.reduce((sum, target) => sum + target.oldCampaignMatchCount, 0),
    },
    targetPlan: preflight.targetPlan.map((target) => ({
      step: target.step,
      label: target.label,
      oldDraftName: target.oldDraftName,
      replacementDraftName: target.replacementDraftName,
      oldCampaignId: target.oldCampaignId,
      oldCampaignMatchCount: target.oldCampaignMatchCount,
      replacementNameCollisionCount: target.replacementNameCollisionCount,
      linkKey: target.linkKey,
      urlSha256: target.urlSha256,
      exactUrlPrinted: false,
      rowBlockers: target.rowBlockers,
    })),
    oldDraftChecks,
    createdDrafts,
    postScan: {
      campaignsRead: postScanCampaigns.length,
      replacementDraftCount: postScan.length,
      inertDraftCount,
      targetCollisionsAfter,
      replacementDrafts: postScan.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        canBeScheduled: row.canBeScheduled,
        hasBasicFilter: row.hasBasicFilter,
        filterIsNull: row.filterIsNull,
        filterIsEmptyArray: row.filterIsEmptyArray,
        missingData: row.missingData,
        scheduledFor: row.scheduledFor,
        queuedAt: row.queuedAt,
        usedInAutomations: row.usedInAutomations,
        contentHasPlaceholder: row.contentHasPlaceholder,
        contentHasExpectedUrl: row.contentHasExpectedUrl,
        emailId: row.emailId,
      })),
    },
    errors,
    safety: buildSafety({
      execute: options.execute,
      campaignsRead: preflight.campaignsRead + postScanCampaigns.length,
      mutations: createdDrafts.length,
    }),
  };
};

const renderMarkdown = (run) => [
  '# MailerLite Mini-Launch Seed Inbox Correction API Replacement Execution Receipt',
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
  '## Created Drafts',
  '',
  ...(run.createdDrafts.length
    ? run.createdDrafts.map((draft) => `- ${draft.label}: ${draft.name}; campaignId=${draft.campaignId}; oldDraftLeftIntact=${draft.oldDraftLeftIntact}; exactUrlPrinted=${draft.exactUrlPrinted}`)
    : ['- none']),
  '',
  '## Post-Scan',
  '',
  `- Campaigns read: ${run.postScan.campaignsRead}`,
  `- Replacement drafts found: ${run.postScan.replacementDraftCount}`,
  `- Inert replacement drafts: ${run.postScan.inertDraftCount}`,
  ...run.postScan.replacementDrafts.map((draft) =>
    `- ${draft.name}: status=${draft.status}; canBeScheduled=${draft.canBeScheduled}; hasBasicFilter=${draft.hasBasicFilter}; contentHasPlaceholder=${draft.contentHasPlaceholder}`,
  ),
  '',
  '## Blockers',
  '',
  ...(run.decision.blockers.length ? run.decision.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Errors',
  '',
  ...(run.errors.length ? run.errors.map((error) => `- ${error.label}: ${error.reason}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- MailerLite drafts created: ${run.safety.mailerLiteDraftsCreated}`,
  `- Old drafts edited: ${run.safety.oldDraftsEdited}`,
  `- Old drafts deleted/archived: ${run.safety.oldDraftsDeletedOrArchived}`,
  `- Sends performed: ${run.safety.sendsPerformed}`,
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
    createdDraftCount: run.createdDrafts.length,
    inertDraftCount: run.postScan.inertDraftCount,
    blockerCount: run.decision.blockers.length,
    errorCount: run.errors.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: {
      mailerLiteApiCalled: run.safety.mailerLiteApiCalled,
      mailerLiteDraftsCreated: run.safety.mailerLiteDraftsCreated,
      sendsPerformed: run.safety.sendsPerformed,
      campaignsPublished: run.safety.campaignsPublished,
      campaignsScheduled: run.safety.campaignsScheduled,
      subscribersRead: run.safety.subscribersRead,
      groupsCreatedOrAssigned: run.safety.groupsCreatedOrAssigned,
      workflowMutationsPerformed: run.safety.workflowMutationsPerformed,
      exactUrlsPrinted: run.safety.exactUrlsPrinted,
      tokensPrinted: run.safety.tokensPrinted,
    },
  }, null, 2));

  if (options.execute && run.status !== 'seed_inbox_correction_api_replacement_execution_completed_no_sends') {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite API replacement create failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFormBody,
  buildPreflight,
  buildRun,
  contentForReplacement,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  targetLinksByKey,
};
