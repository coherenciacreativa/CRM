#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  evaluateNullAudienceCampaign,
} from './crm-vnext-mailerlite-api-null-audience-lab.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send-2026-05-31';
const SAFETY_GROUP_NAME = 'CC · Safety · Null audience · DO NOT SEND';
const DEFAULT_REPLACEMENT_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_seed_test_send_execution_receipt_current_inteligencia_descansar_2026-05-31.md';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_SEED_EMAIL = 'saludoalsol+seedmail@gmail.com';
const PLACEHOLDERS = [
  'result_or_resource_link_placeholder',
  'practice_link_placeholder',
  'editorial_note_link_placeholder',
];

const EXPECTED_APPROVAL_PHRASE = 'Apruebo enviar únicamente test emails desde los 4 borradores asset-ready Null Audience del mini-lanzamiento Inteligencia para descansar al seed recipient exacto saludoalsol+seedmail@gmail.com, después de re-scan fresco por API y QA verde de que los 4 borradores siguen en draft, apuntan exclusivamente al grupo vacío CC · Safety · Null audience · DO NOT SEND con active_count=0, coinciden con el receipt de creación asset-ready, no tienen placeholders ni tokens redacted pendientes, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos o segmentos adicionales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; si cualquier QA falla, detenerse y reportar.';
const EXPECTED_E01_CANARY_APPROVAL_PHRASE = 'Apruebo enviar únicamente un test email desde el borrador canario E01 Null Audience del mini-lanzamiento Inteligencia para descansar al seed recipient exacto saludoalsol+seedmail@gmail.com, después de re-scan fresco por API y QA verde de que el borrador sigue en draft, apunta exclusivamente al grupo vacío CC · Safety · Null audience · DO NOT SEND con active_count=0, no tiene placeholders ni tokens redacted pendientes, sin reenviar E02-E04, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos o segmentos adicionales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; si cualquier QA falla, detenerse y reportar.';
const EXPECTED_E04_RESEND_APPROVAL_PHRASE = 'Apruebo reenviar únicamente un test email del borrador E04 corregido Null Audience del mini-lanzamiento Inteligencia para descansar al seed recipient exacto saludoalsol+seedmail@gmail.com, después de re-scan fresco por API y QA verde de que el borrador sigue en draft, apunta exclusivamente al grupo vacío CC · Safety · Null audience · DO NOT SEND con active_count=0, no tiene placeholders ni tokens redacted pendientes, sin reenviar E01-E03, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos o segmentos adicionales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; si el recipient no queda exactamente en el seed o cualquier QA falla, detenerse y reportar.';
const DEFAULT_TARGET_LABELS = ['E01', 'E02', 'E03', 'E04'];
const FULL_REPLACEMENT_RECEIPT_STATUS = 'mailerlite_null_audience_replacement_execution_completed_no_sends';
const CANARY_REPLACEMENT_RECEIPT_STATUS = 'mailerlite_null_audience_canary_replacement_execution_completed_no_sends';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-null-audience-seed-test-send.mjs [options]

Options:
  --replacement-receipt <path>  Null Audience replacement execution receipt. Defaults to ${DEFAULT_REPLACEMENT_RECEIPT}
  --execute                     Send the four approved MailerLite test emails. Without this, run read-only preflight only.
  --record-ui-sent              Record UI-assisted test sends after fresh API QA. Does not call a send endpoint.
  --target-labels <csv>         Optional subset of replacement drafts to send/record. Defaults to E01,E02,E03,E04.
  --ui-sent-labels <csv>        Required with --record-ui-sent. Expected: E01,E02,E03,E04.
  --approval-phrase <text>      Exact approval phrase required with --execute.
  --seed-email <email>          Exact seed recipient. Defaults to the approved seed email.
  --service <name>              Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>              Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>              MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>              Per-request timeout. Defaults to 30000.
  --out <path>                  Write JSON receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>         Write Markdown receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                        Show this help

Guarded runner for the exact approved Null Audience seed test. It validates the
four replacement drafts by fresh MailerLite API scan and sends only test emails
to the exact seed recipient after the approval phrase matches. It never
publishes, schedules, audience-sends, reads or mutates subscribers, creates or
assigns groups, touches workflows, Shopify, CRM, ledgers, cards, scoring or Fact
Store, and it never prints tokens, raw campaign/group IDs, sender values or
exact public URLs.`;

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

const normalizeEmail = (value) => cleanString(value)?.toLowerCase() ?? null;
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const emailLooksValid = (email) =>
  typeof email === 'string'
  && email.length <= 254
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  && !/[<>"'`;\\]/.test(email);

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return null;
  const visible = local.length <= 2 ? local[0] ?? '*' : local.slice(0, 2);
  return `${visible}…@${domain}`;
};

const parseArgs = (argv) => {
  const options = {
    replacementReceipt: DEFAULT_REPLACEMENT_RECEIPT,
    execute: false,
    recordUiSent: false,
    targetLabels: DEFAULT_TARGET_LABELS,
    uiSentLabels: [],
    approvalPhrase: null,
    seedEmail: DEFAULT_SEED_EMAIL,
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
    else if (arg === '--replacement-receipt') options.replacementReceipt = argv[++index];
    else if (arg === '--execute') options.execute = true;
    else if (arg === '--record-ui-sent') options.recordUiSent = true;
    else if (arg === '--target-labels') {
      options.targetLabels = (argv[++index] ?? '').split(',').map(cleanString).filter(Boolean);
    }
    else if (arg === '--ui-sent-labels') {
      options.uiSentLabels = (argv[++index] ?? '').split(',').map(cleanString).filter(Boolean);
    }
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--seed-email') options.seedEmail = argv[++index];
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
  if (options.execute && options.recordUiSent) throw new Error('execute_and_record_ui_sent_are_mutually_exclusive');
  options.targetLabels = [...new Set(options.targetLabels.map(cleanString).filter(Boolean))];
  const unsupportedLabels = options.targetLabels.filter((label) => !DEFAULT_TARGET_LABELS.includes(label));
  if (unsupportedLabels.length) throw new Error(`unsupported_target_labels:${unsupportedLabels.join(',')}`);
  if (!options.targetLabels.length) throw new Error('target_labels_required');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  options.seedEmail = normalizeEmail(options.seedEmail);
  return options;
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
  if (status === 404) return 'mailerlite_not_found';
  if (status === 409 || /already exists|duplicate/i.test(text)) return 'mailerlite_conflict_or_duplicate';
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

const requestJson = async ({ options, key, path, method = 'GET', body = null, params = {} }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers = {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'User-Agent': 'CRM-vNext-MailerLite-Null-Audience-Seed-Test/1.0',
    };
    const requestBody = body ? JSON.stringify(body) : null;
    if (requestBody) headers['Content-Type'] = 'application/json';

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
  for (const key of ['data', 'campaigns', 'groups', 'items', 'results']) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  }
  return [];
};

const extractNextCursor = (payload) => {
  for (const container of [payload, payload?.meta]) {
    if (!container || typeof container !== 'object') continue;
    for (const key of ['next_cursor', 'nextCursor']) {
      if (typeof container[key] === 'string' && container[key]) return container[key];
    }
    const nextLink = container.links?.next;
    if (typeof nextLink === 'string' && nextLink) {
      try {
        const parsed = new URL(nextLink);
        for (const key of ['cursor', 'next_cursor', 'page[cursor]']) {
          const value = parsed.searchParams.get(key);
          if (value) return value;
        }
      } catch {
        return null;
      }
    }
  }
  return null;
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

const campaignFromPayload = (payload) =>
  payload?.data && typeof payload.data === 'object' ? payload.data : payload;
const campaignIdFor = (campaign) => cleanString(campaign?.id) ?? cleanString(campaign?.campaign_id);
const campaignNameFor = (campaign) => cleanString(campaign?.name) ?? cleanString(campaign?.title);
const campaignStatusFor = (campaign) => cleanString(campaign?.status);
const campaignTypeFor = (campaign) => cleanString(campaign?.type);
const emailForCampaign = (campaign) => Array.isArray(campaign?.emails) ? campaign.emails[0] ?? {} : {};
const groupNameFor = (group) => cleanString(group?.name) ?? cleanString(group?.title) ?? cleanString(group?.label);
const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);
const activeCountFor = (group) => {
  const value = group?.active_count ?? group?.activeCount ?? group?.subscribers_count ?? group?.total;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

const scanGroups = async (options, key) => {
  const groups = [];
  let cursor = null;
  for (let page = 0; page < 25; page += 1) {
    const params = { limit: 100 };
    if (cursor) params.cursor = cursor;
    const payload = await requestJson({ options, key, path: '/groups', params });
    groups.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return groups;
};

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

const fetchCampaignDetail = async ({ options, key, id }) => {
  const payload = await requestJson({ options, key, path: `/campaigns/${id}` });
  return campaignFromPayload(payload);
};

const htmlStats = (html) => {
  const value = String(html ?? '');
  const placeholderCounts = Object.fromEntries(PLACEHOLDERS.map((placeholder) => [
    placeholder,
    value.split(placeholder).length - 1,
  ]));
  return {
    chars: value.length,
    sha256: sha256(value),
    placeholderCounts,
    totalPlaceholderCount: Object.values(placeholderCounts).reduce((sum, count) => sum + count, 0),
    redactedFinalLinkTokenCount: (value.match(/final_public_link_ready_redacted:/gu) ?? []).length,
  };
};

const targetLabelsAreE01Only = (targetLabels = []) => targetLabels.length === 1 && targetLabels[0] === 'E01';
const targetLabelsAreE04Only = (targetLabels = []) => targetLabels.length === 1 && targetLabels[0] === 'E04';
const replacementReceiptGreen = (receipt, targetLabels = DEFAULT_TARGET_LABELS) => {
  const labels = Array.isArray(targetLabels) && targetLabels.length ? targetLabels : DEFAULT_TARGET_LABELS;
  const isE01Canary = targetLabelsAreE01Only(labels);
  const expectedCount = isE01Canary ? 1 : DEFAULT_TARGET_LABELS.length;
  const receiptLabels = (receipt?.createdDrafts ?? []).map((row) => cleanString(row?.label)).filter(Boolean);
  const expectedReceiptStatus = isE01Canary
    ? CANARY_REPLACEMENT_RECEIPT_STATUS
    : FULL_REPLACEMENT_RECEIPT_STATUS;

  return receipt?.ok === true
    && receipt?.status === expectedReceiptStatus
    && receipt?.mode === 'execute_requested'
    && receipt?.createdDrafts?.length === expectedCount
    && labels.every((label) => receiptLabels.includes(label))
    && receipt?.postCreateQa?.replacementDraftCount === expectedCount
    && receipt?.postCreateQa?.nullAudienceSafeCount === expectedCount
    && receipt?.postCreateQa?.contentGreenCount === expectedCount
    && receipt?.safety?.mailerLiteDraftsCreated === expectedCount
    && receipt?.safety?.campaignsPublished === false
    && receipt?.safety?.campaignsScheduled === false
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.subscribersRead === false
    && receipt?.safety?.subscriberMutationsPerformed === false
    && receipt?.safety?.additionalGroupsCreatedOrAssigned === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.exactUrlsPrinted === false
    && receipt?.safety?.tokensPrinted === false;
};

const expectedApprovalPhraseFor = (targetLabels = DEFAULT_TARGET_LABELS) =>
  targetLabelsAreE01Only(targetLabels)
    ? EXPECTED_E01_CANARY_APPROVAL_PHRASE
    : targetLabelsAreE04Only(targetLabels)
      ? EXPECTED_E04_RESEND_APPROVAL_PHRASE
      : EXPECTED_APPROVAL_PHRASE;

const buildPreflight = ({ replacementReceipt, groups, campaigns, details, seedEmail, execute, approvalPhrase, targetLabels = DEFAULT_TARGET_LABELS }) => {
  const blockers = [];
  const expectedApprovalPhrase = expectedApprovalPhraseFor(targetLabels);
  const approvalMatched = normalizeApprovalPhrase(approvalPhrase) === normalizeApprovalPhrase(expectedApprovalPhrase);
  const expectedSeed = normalizeEmail(DEFAULT_SEED_EMAIL);
  const normalizedSeed = normalizeEmail(seedEmail);
  const targetLabelSet = new Set(targetLabels);

  if (!replacementReceiptGreen(replacementReceipt, targetLabels)) blockers.push('replacement_receipt_not_green_or_missing');
  if (!emailLooksValid(normalizedSeed)) blockers.push('seed_email_invalid');
  if (normalizedSeed !== expectedSeed) blockers.push('seed_email_not_exact_approved_recipient');
  if (execute && !approvalMatched) {
    blockers.push(cleanString(approvalPhrase) ? 'blocked_approval_phrase_mismatch' : 'blocked_missing_exact_approval_phrase');
  }

  const groupMatches = groups.filter((group) => normalizeName(groupNameFor(group)) === normalizeName(SAFETY_GROUP_NAME));
  const safetyGroup = groupMatches.length === 1 ? groupMatches[0] : null;
  const safetyGroupId = safetyGroup ? groupIdFor(safetyGroup) : null;
  const safetyGroupActiveCount = safetyGroup ? activeCountFor(safetyGroup) : null;
  if (groupMatches.length !== 1) blockers.push(`safety_group_match_count_not_1:${groupMatches.length}`);
  if (!safetyGroupId) blockers.push('safety_group_id_missing');
  if (safetyGroupActiveCount !== 0) blockers.push(`safety_group_active_count_not_0:${safetyGroupActiveCount}`);

  const campaignsByName = new Map();
  for (const campaign of campaigns) {
    const normalized = normalizeName(campaignNameFor(campaign));
    if (!normalized) continue;
    const rows = campaignsByName.get(normalized) ?? [];
    rows.push(campaign);
    campaignsByName.set(normalized, rows);
  }

  const qaRowsByLabel = new Map((replacementReceipt?.postCreateQa?.rows ?? []).map((row) => [cleanString(row?.label), row]));
  const targets = (replacementReceipt?.createdDrafts ?? [])
    .filter((created) => targetLabelSet.has(cleanString(created?.label)))
    .map((created) => {
    const label = cleanString(created?.label);
    const name = cleanString(created?.name);
    const matches = campaignsByName.get(normalizeName(name)) ?? [];
    const campaign = matches.length === 1 ? matches[0] : null;
    const id = campaign ? campaignIdFor(campaign) : null;
    const detail = id ? details.get(id) : null;
    const email = emailForCampaign(detail);
    const content = typeof email?.content === 'string' ? email.content : '';
    const stats = htmlStats(content);
    const priorQa = qaRowsByLabel.get(label);
    const evaluation = detail && safetyGroupId ? evaluateNullAudienceCampaign({
      campaign: detail,
      groupId: safetyGroupId,
      groupActiveCount: safetyGroupActiveCount,
    }) : null;
    const rowBlockers = [];

    if (!label) rowBlockers.push('target_label_missing');
    if (!name) rowBlockers.push(`target_${label ?? 'unknown'}_name_missing`);
    if (matches.length !== 1) rowBlockers.push(`target_${label ?? 'unknown'}_campaign_name_match_count_not_1:${matches.length}`);
    if (!id) rowBlockers.push(`target_${label ?? 'unknown'}_campaign_id_missing`);
    if (detail && campaignStatusFor(detail) !== 'draft') rowBlockers.push(`target_${label}_not_draft:${campaignStatusFor(detail)}`);
    if (detail && campaignTypeFor(detail) !== 'regular') rowBlockers.push(`target_${label}_not_regular:${campaignTypeFor(detail)}`);
    if (evaluation && evaluation.nullAudienceSafe !== true) rowBlockers.push(`target_${label}_null_audience_not_safe`);
    if (evaluation?.redactedObserved?.scheduledFor) rowBlockers.push(`target_${label}_scheduled_for_present`);
    if (evaluation?.redactedObserved?.queuedAt) rowBlockers.push(`target_${label}_queued_at_present`);
    if (evaluation?.redactedObserved?.startedAt) rowBlockers.push(`target_${label}_started_at_present`);
    if (evaluation?.redactedObserved?.finishedAt) rowBlockers.push(`target_${label}_finished_at_present`);
    if (stats.totalPlaceholderCount !== 0) rowBlockers.push(`target_${label}_placeholders_still_present`);
    if (stats.redactedFinalLinkTokenCount !== 0) rowBlockers.push(`target_${label}_redacted_tokens_still_present`);
    if (priorQa?.contentSha256 && stats.sha256 !== priorQa.contentSha256) rowBlockers.push(`target_${label}_content_sha256_drift`);
    if (created?.campaignIdSha256 && id && sha256(id) !== created.campaignIdSha256) rowBlockers.push(`target_${label}_campaign_id_hash_mismatch`);

    blockers.push(...rowBlockers);
    return {
      step: created?.step ?? null,
      label,
      name,
      campaignIdSha256: id ? sha256(id) : null,
      campaignIdPrinted: false,
      status: detail ? campaignStatusFor(detail) : null,
      type: detail ? campaignTypeFor(detail) : null,
      nullAudienceSafe: evaluation?.nullAudienceSafe ?? false,
      failedNullAudienceChecks: evaluation?.failed ?? ['campaign_detail_missing'],
      observed: evaluation?.redactedObserved ?? null,
      contentSha256: stats.sha256,
      contentMatchesCreationReceipt: Boolean(priorQa?.contentSha256 && stats.sha256 === priorQa.contentSha256),
      placeholderCount: stats.totalPlaceholderCount,
      redactedFinalLinkTokenCount: stats.redactedFinalLinkTokenCount,
      exactUrlsPrinted: false,
      rowBlockers,
      _campaignIdForRun: id,
    };
  });
  if (targets.length !== targetLabels.length) blockers.push(`target_count_not_${targetLabels.length}:${targets.length}`);

  return {
    approvalMatched,
    expectedApprovalPhraseSha256: sha256(expectedApprovalPhrase),
    targetLabels,
    seed: {
      redacted: redactEmail(normalizedSeed),
      sha256: normalizedSeed ? sha256(normalizedSeed) : null,
      printed: false,
    },
    safetyGroupName: SAFETY_GROUP_NAME,
    safetyGroupIdSha256: safetyGroupId ? sha256(safetyGroupId) : null,
    safetyGroupIdPrinted: false,
    safetyGroupActiveCount,
    groupMatchesRead: groupMatches.length,
    blockers: [...new Set(blockers)],
    targets,
  };
};

const testSendAttempts = (campaignId, email) => [
  { path: `/campaigns/${campaignId}/actions/send-test`, body: { email } },
  { path: `/campaigns/${campaignId}/actions/send-test`, body: { emails: [email] } },
  { path: `/campaigns/${campaignId}/actions/send_test`, body: { email } },
  { path: `/campaigns/${campaignId}/actions/send_test`, body: { emails: [email] } },
  { path: `/campaigns/${campaignId}/send-test`, body: { email } },
  { path: `/campaigns/${campaignId}/send-test`, body: { emails: [email] } },
  { path: `/campaigns/${campaignId}/send_test`, body: { email } },
  { path: `/campaigns/${campaignId}/send_test`, body: { emails: [email] } },
  { path: `/campaigns/${campaignId}/test`, body: { email } },
  { path: `/campaigns/${campaignId}/test`, body: { emails: [email] } },
].map((attempt) => ({
  ...attempt,
  endpointTemplate: attempt.path.replace(campaignId, '{campaign_id}'),
  bodyShape: Object.keys(attempt.body).sort().join(','),
}));

const sendOneTestEmail = async ({ options, key, campaignId, seedEmail, knownRecipe = null }) => {
  const attempts = knownRecipe
    ? [{
      path: knownRecipe.endpointTemplate.replace('{campaign_id}', campaignId),
      body: knownRecipe.bodyShape === 'emails' ? { emails: [seedEmail] } : { email: seedEmail },
      endpointTemplate: knownRecipe.endpointTemplate,
      bodyShape: knownRecipe.bodyShape,
    }]
    : testSendAttempts(campaignId, seedEmail);
  const errors = [];
  for (const attempt of attempts) {
    try {
      await requestJson({
        options,
        key,
        path: attempt.path,
        method: 'POST',
        body: attempt.body,
      });
      return {
        ok: true,
        endpointTemplate: attempt.endpointTemplate,
        bodyShape: attempt.bodyShape,
        apiResponseStored: false,
        errorsTriedBeforeSuccess: errors,
      };
    } catch (error) {
      errors.push({
        endpointTemplate: attempt.endpointTemplate,
        bodyShape: attempt.bodyShape,
        reason: error?.reason || error?.message || 'mailerlite_test_send_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    }
  }
  return {
    ok: false,
    endpointTemplate: knownRecipe?.endpointTemplate ?? null,
    bodyShape: knownRecipe?.bodyShape ?? null,
    apiResponseStored: false,
    errorsTriedBeforeSuccess: errors,
  };
};

const buildSafety = ({
  execute,
  recordUiSent = false,
  apiCalled = true,
  groupsRead = 0,
  campaignsRead = 0,
  campaignDetailsRead = 0,
  testEmailsSent = 0,
}) => ({
  mode: execute
    ? 'execute_mailerlite_api_null_audience_seed_test_send'
    : recordUiSent
      ? 'record_mailerlite_ui_null_audience_seed_test_send'
      : 'read_only_preflight',
  mailerLiteApiCalled: apiCalled,
  mailerLiteGroupsRead: groupsRead,
  mailerLiteCampaignsRead: campaignsRead,
  mailerLiteCampaignDetailsRead: campaignDetailsRead,
  mailerLiteTestEmailsSent: testEmailsSent,
  mailerLiteMutationsPerformed: (execute || recordUiSent) && testEmailsSent > 0,
  allowedMutationType: (execute || recordUiSent) && testEmailsSent > 0
    ? 'send_scoped_test_emails_only_to_exact_seed_recipient_from_null_audience_replacement_drafts'
    : null,
  testSendExecutionChannel: recordUiSent
    ? 'mailerlite_ui_manual_assisted'
    : execute && testEmailsSent > 0
      ? 'mailerlite_api_endpoint'
      : null,
  safetyGroupName: SAFETY_GROUP_NAME,
  safetyGroupNamePrinted: true,
  safetyGroupIdPrinted: false,
  seedRecipientPrinted: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  audienceSendsPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  additionalGroupsCreatedOrAssigned: false,
  nonNullAudienceGroupsAssigned: false,
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
  senderValuesPrinted: false,
  exactUrlsPrinted: false,
  tokensPrinted: false,
});

const targetedSeedTestSendCompleted = ({ preflight, sentTests, errors = [] }) => {
  const targetCount = Array.isArray(preflight?.targets) ? preflight.targets.length : 0;
  return targetCount > 0
    && preflight.blockers.length === 0
    && sentTests.length === targetCount
    && !errors.some((error) => error.phase === 'test_send');
};

const buildRun = async (options) => {
  const generatedAt = new Date().toISOString();
  const executionRequested = options.execute || options.recordUiSent;
  const replacementReceipt = await readJson(options.replacementReceipt);
  const credential = await getCredential(options);
  if (!credential?.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: options.execute ? 'execute_requested' : options.recordUiSent ? 'record_ui_sent' : 'read_only_preflight',
      generatedAt,
      ok: false,
      status: 'mailerlite_null_audience_seed_test_send_blocked_missing_mailerlite_credential',
      credential: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      decision: {
        approval: {
          provided: Boolean(cleanString(options.approvalPhrase)),
          status: executionRequested ? 'not_checked_missing_credential' : 'read_only_preflight_no_live_approval_required',
        },
        canExecute: false,
        blockers: ['blocked_missing_mailerlite_credential'],
      },
      preflight: { groupsRead: 0, campaignsRead: 0, campaignDetailsRead: 0 },
      targetPlan: [],
      sentTests: [],
      errors: [],
      safety: buildSafety({ execute: options.execute, recordUiSent: options.recordUiSent, apiCalled: false }),
    };
  }

  const [groups, campaigns] = await Promise.all([
    scanGroups(options, credential.key),
    fetchCampaigns(options, credential.key),
  ]);
  const targetNames = new Set((replacementReceipt?.createdDrafts ?? []).map((row) => normalizeName(row?.name)).filter(Boolean));
  const targetSummaries = campaigns.filter((campaign) => targetNames.has(normalizeName(campaignNameFor(campaign))));
  const detailEntries = await Promise.all(targetSummaries.map(async (campaign) => {
    const id = campaignIdFor(campaign);
    if (!id) return null;
    const detail = await fetchCampaignDetail({ options, key: credential.key, id });
    return [id, detail];
  }));
  const details = new Map(detailEntries.filter(Boolean));
  const preflight = buildPreflight({
    replacementReceipt,
    groups,
    campaigns,
    details,
    seedEmail: options.seedEmail,
    execute: executionRequested,
    approvalPhrase: options.approvalPhrase,
    targetLabels: options.targetLabels,
  });
  const sentTests = [];
  const errors = [];
  let recipe = null;

  if (options.recordUiSent && preflight.blockers.length === 0) {
    const expectedLabels = preflight.targetLabels;
    const providedLabels = [...new Set(options.uiSentLabels)];
    if (expectedLabels.some((label) => !providedLabels.includes(label)) || providedLabels.length !== expectedLabels.length) {
      preflight.blockers.push(`ui_sent_labels_not_exact:${providedLabels.join('|') || 'none'}`);
    } else {
      for (const target of preflight.targets) {
        sentTests.push({
          step: target.step,
          label: target.label,
          campaignIdSha256: target.campaignIdSha256,
          campaignIdPrinted: false,
          name: target.name,
          seedRecipientRedacted: preflight.seed.redacted,
          seedRecipientSha256: preflight.seed.sha256,
          seedRecipientPrinted: false,
          endpointTemplateUsed: null,
          bodyShapeUsed: null,
          executionChannel: 'mailerlite_ui_manual_assisted',
          uiSuccessObservedByOperator: true,
          apiResponseStored: false,
        });
      }
    }
  }

  if (options.execute && preflight.blockers.length === 0) {
    for (const target of preflight.targets) {
      const sendResult = await sendOneTestEmail({
        options,
        key: credential.key,
        campaignId: target._campaignIdForRun,
        seedEmail: options.seedEmail,
        knownRecipe: recipe,
      });
      if (sendResult.ok) {
        recipe = recipe ?? {
          endpointTemplate: sendResult.endpointTemplate,
          bodyShape: sendResult.bodyShape,
        };
        sentTests.push({
          step: target.step,
          label: target.label,
          campaignIdSha256: target.campaignIdSha256,
          campaignIdPrinted: false,
          name: target.name,
          seedRecipientRedacted: preflight.seed.redacted,
          seedRecipientSha256: preflight.seed.sha256,
          seedRecipientPrinted: false,
          endpointTemplateUsed: sendResult.endpointTemplate,
          bodyShapeUsed: sendResult.bodyShape,
          apiResponseStored: false,
        });
        if (sendResult.errorsTriedBeforeSuccess.length) {
          errors.push(...sendResult.errorsTriedBeforeSuccess.map((error) => ({
            phase: 'endpoint_discovery_before_success',
            label: target.label,
            ...error,
          })));
        }
      } else {
        errors.push({
          phase: 'test_send',
          label: target.label,
          reason: 'all_test_send_endpoint_attempts_failed',
          attempts: sendResult.errorsTriedBeforeSuccess,
        });
        break;
      }
    }
  }

  const targetedSendCompleted = targetedSeedTestSendCompleted({ preflight, sentTests, errors });
  const executedOk = options.execute && targetedSendCompleted;
  const recordedUiOk = options.recordUiSent && targetedSendCompleted;
  const readOnlyOk = !options.execute && preflight.blockers.length === 0;
  const cleanTargets = preflight.targets.map(({ _campaignIdForRun, ...target }) => target);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: options.execute ? 'execute_requested' : options.recordUiSent ? 'record_ui_sent' : 'read_only_preflight',
    generatedAt,
    ok: options.execute ? executedOk : options.recordUiSent ? recordedUiOk : readOnlyOk,
    status: options.execute
      ? executedOk
        ? 'mailerlite_null_audience_seed_test_send_completed_test_only'
        : sentTests.length > 0
          ? 'mailerlite_null_audience_seed_test_send_partial_stopped'
          : 'mailerlite_null_audience_seed_test_send_blocked_before_send'
      : options.recordUiSent
        ? recordedUiOk
          ? 'mailerlite_null_audience_seed_test_send_completed_test_only'
          : 'mailerlite_null_audience_seed_test_send_ui_record_blocked'
      : readOnlyOk
        ? 'mailerlite_null_audience_seed_test_send_preflight_ready_for_exact_approval'
        : 'mailerlite_null_audience_seed_test_send_preflight_blocked',
    credential: {
      service: options.service,
      account: options.account,
      credentialPresent: Boolean(credential?.key),
      credentialSource: credential?.source ? 'configured_not_printed' : null,
    },
    decision: {
      approval: {
        provided: Boolean(cleanString(options.approvalPhrase)),
        status: !executionRequested
          ? 'read_only_preflight_no_live_approval_required'
          : preflight.approvalMatched
            ? 'exact_approval_phrase_matched'
            : cleanString(options.approvalPhrase)
              ? 'blocked_approval_phrase_mismatch'
              : 'blocked_missing_exact_approval_phrase',
      },
      canExecute: executionRequested && preflight.blockers.length === 0,
      expectedPhraseSha256: preflight.expectedApprovalPhraseSha256,
      targetLabels: preflight.targetLabels,
      exactApprovalPhrasePrinted: false,
      blockers: preflight.blockers,
    },
    seedRecipient: preflight.seed,
    preflight: {
      groupsRead: groups.length,
      campaignsRead: campaigns.length,
      campaignDetailsRead: details.size,
      safetyGroupName: preflight.safetyGroupName,
      safetyGroupIdSha256: preflight.safetyGroupIdSha256,
      safetyGroupIdPrinted: false,
      safetyGroupActiveCount: preflight.safetyGroupActiveCount,
      groupMatchesRead: preflight.groupMatchesRead,
      targetCount: cleanTargets.length,
      qaGreenCount: cleanTargets.filter((target) =>
        target.nullAudienceSafe
        && target.contentMatchesCreationReceipt
        && target.placeholderCount === 0
        && target.redactedFinalLinkTokenCount === 0
        && target.status === 'draft'
        && target.type === 'regular'
        && target.rowBlockers.length === 0).length,
    },
    targetPlan: cleanTargets,
    sentTests,
    endpointRecipe: recipe
      ? {
        endpointTemplate: recipe.endpointTemplate,
        bodyShape: recipe.bodyShape,
        discoveredFromFirstSuccessfulSend: true,
      }
      : null,
    errors,
    safety: buildSafety({
      execute: options.execute,
      recordUiSent: options.recordUiSent,
      groupsRead: groups.length,
      campaignsRead: campaigns.length,
      campaignDetailsRead: details.size,
      testEmailsSent: sentTests.length,
    }),
  };
};

const renderMarkdown = (run) => [
  '# MailerLite Null Audience Seed Test Send Execution Receipt',
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
  '## Seed',
  '',
  `- Seed recipient: ${run.seedRecipient.redacted}`,
  `- Seed recipient printed raw: ${run.seedRecipient.printed}`,
  `- Target labels: ${(run.decision.targetLabels ?? DEFAULT_TARGET_LABELS).join(', ')}`,
  '',
  '## Preflight',
  '',
  `- Groups read: ${run.preflight.groupsRead}`,
  `- Campaigns read: ${run.preflight.campaignsRead}`,
  `- Campaign details read: ${run.preflight.campaignDetailsRead}`,
  `- Safety group: ${run.preflight.safetyGroupName}`,
  `- Safety group active_count: ${run.preflight.safetyGroupActiveCount}`,
  `- Target count: ${run.preflight.targetCount}`,
  `- QA green count: ${run.preflight.qaGreenCount}`,
  '',
  '## Sent Tests',
  '',
  ...(run.sentTests.length
    ? run.sentTests.map((row) => `- ${row.label}: ${row.name}; seed=${row.seedRecipientRedacted}; campaignIdPrinted=${row.campaignIdPrinted}`)
    : ['- none']),
  '',
  '## Blockers',
  '',
  ...(run.decision.blockers.length ? run.decision.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Errors',
  '',
  ...(run.errors.length ? run.errors.map((error) => `- ${error.label ?? error.phase}: ${error.reason}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- Test emails sent: ${run.safety.mailerLiteTestEmailsSent}`,
  `- Test send execution channel: ${run.safety.testSendExecutionChannel}`,
  `- Audience sends performed: ${run.safety.audienceSendsPerformed}`,
  `- Publish/schedule: ${run.safety.campaignsPublished}/${run.safety.campaignsScheduled}`,
  `- Subscribers read/mutated: ${run.safety.subscribersRead}/${run.safety.subscriberMutationsPerformed}`,
  `- Additional groups/segments/workflows mutated: ${run.safety.additionalGroupsCreatedOrAssigned || run.safety.segmentsCreatedOrAssigned || run.safety.workflowMutationsPerformed}`,
  `- Shopify/CRM/ledgers/cards/scoring/Fact Store closed: ${!run.safety.shopifyMutationsPerformed && !run.safety.crmLiveApiCalled && !run.safety.signalLedgerAppendPerformed && !run.safety.crmCardMutationsPerformed && !run.safety.crmScoreMutationsPerformed && !run.safety.factStoreWritePerformed}`,
  `- Exact URLs/tokens/sender values printed: ${run.safety.exactUrlsPrinted}/${run.safety.tokensPrinted}/${run.safety.senderValuesPrinted}`,
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
    targetCount: run.preflight.targetCount,
    qaGreenCount: run.preflight.qaGreenCount,
    testEmailsSent: run.sentTests.length,
    blockerCount: run.decision.blockers.length,
    errorCount: run.errors.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: {
      mailerLiteApiCalled: run.safety.mailerLiteApiCalled,
      mailerLiteTestEmailsSent: run.safety.mailerLiteTestEmailsSent,
      testSendExecutionChannel: run.safety.testSendExecutionChannel,
      audienceSendsPerformed: run.safety.audienceSendsPerformed,
      campaignsPublished: run.safety.campaignsPublished,
      campaignsScheduled: run.safety.campaignsScheduled,
      subscribersRead: run.safety.subscribersRead,
      subscriberMutationsPerformed: run.safety.subscriberMutationsPerformed,
      additionalGroupsCreatedOrAssigned: run.safety.additionalGroupsCreatedOrAssigned,
      workflowMutationsPerformed: run.safety.workflowMutationsPerformed,
      exactUrlsPrinted: run.safety.exactUrlsPrinted,
      tokensPrinted: run.safety.tokensPrinted,
    },
  }, null, 2));

  if ((options.execute || options.recordUiSent) && run.status !== 'mailerlite_null_audience_seed_test_send_completed_test_only') {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Null Audience seed test send failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  EXPECTED_APPROVAL_PHRASE,
  EXPECTED_E01_CANARY_APPROVAL_PHRASE,
  EXPECTED_E04_RESEND_APPROVAL_PHRASE,
  buildPreflight,
  buildRun,
  expectedApprovalPhraseFor,
  htmlStats,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  replacementReceiptGreen,
  targetedSeedTestSendCompleted,
};
