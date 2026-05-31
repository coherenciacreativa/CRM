#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  SAFETY_GROUP_NAME,
  buildExactApprovalPhrase,
  buildReplacementTargets,
} from './crm-vnext-mailerlite-mini-launch-null-audience-replacement-approval-packet.mjs';
import {
  evaluateNullAudienceCampaign,
} from './crm-vnext-mailerlite-api-null-audience-lab.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-null-audience-replacement-create-2026-05-31';
const DEFAULT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.md';
const PLACEHOLDERS = [
  'result_or_resource_link_placeholder',
  'practice_link_placeholder',
  'editorial_note_link_placeholder',
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-null-audience-replacement-create.mjs [options]

Options:
  --approval-packet <path>         Null Audience replacement approval packet JSON. Defaults to ${DEFAULT_APPROVAL_PACKET}
  --correction-preview <path>      Corrected payload preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --email-render-qa <path>         Local render QA with corrected HTML paths. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --real-mailerlite-render-qa <path> Existing real MailerLite render QA with source campaign IDs. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --execute                        Create the four approved replacement drafts. Without this, run read-only API preflight only.
  --approval-phrase <text>         Exact approval phrase required with --execute.
  --service <name>                 Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                 Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                 MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                 Per-request timeout. Defaults to 30000.
  --out <path>                     Write JSON receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Guarded runner for the approved Null Audience replacement-draft route. It may
create exactly four new MailerLite draft campaigns only after exact approval,
using local QA-green HTML and assigning every new campaign exclusively to the
empty safety group "${SAFETY_GROUP_NAME}". It never sends, publishes, schedules,
creates groups, reads or mutates subscribers, edits workflows, touches Shopify
or CRM, appends ledgers, writes cards/scoring, touches Fact Store, deletes old
drafts, prints tokens, prints sender values, prints exact URLs, or prints raw
campaign/group IDs. If post-create QA fails, it deletes drafts created by this
run before returning the receipt.`;

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
const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const readText = async (path) => readFile(resolve(path), 'utf8');
const redactedTokenFor = (key) => key ? `final_public_link_ready_redacted:${key}` : null;

const parseArgs = (argv) => {
  const options = {
    approvalPacket: DEFAULT_APPROVAL_PACKET,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
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
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
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
  if (status === 410) return 'mailerlite_gone';
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

const requestJson = async ({ options, key, path, method = 'GET', body = null, params = {}, form = false }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const headers = {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'User-Agent': 'CRM-vNext-MailerLite-Null-Audience-Replacement/1.0',
    };
    let requestBody = null;
    if (body && form) {
      const searchParams = new URLSearchParams();
      for (const [field, value] of Object.entries(body)) {
        if (value === null || value === undefined) continue;
        if (Array.isArray(value)) {
          for (const item of value) searchParams.append(field, String(item));
        } else {
          searchParams.set(field, String(value));
        }
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

const fetchCampaignStatusOrGone = async ({ options, key, id }) => {
  try {
    const campaign = await fetchCampaignDetail({ options, key, id });
    return {
      found: true,
      idSha256: sha256(id),
      status: campaignStatusFor(campaign),
      reason: null,
    };
  } catch (error) {
    if (error?.reason === 'mailerlite_not_found' || error?.reason === 'mailerlite_gone') {
      return {
        found: false,
        idSha256: sha256(id),
        status: 'gone',
        reason: error.reason,
      };
    }
    throw error;
  }
};

const safeSenderIdentity = (campaign) => {
  const email = emailForCampaign(campaign);
  return {
    fromName: cleanString(email?.from_name ?? email?.fromName),
    fromEmail: cleanString(email?.from ?? email?.from_email ?? email?.fromEmail),
    replyTo: cleanString(email?.reply_to ?? email?.replyTo),
    languageId: cleanString(campaign?.language_id ?? campaign?.languageId),
    valuePrinted: false,
  };
};

const rowByStep = (rows = []) => new Map(rows.map((row) => [Number(row?.step), row]).filter(([step]) => Number.isFinite(step)));
const sourceCampaignIdForStep = (realQa, step) =>
  cleanString((realQa?.drafts ?? []).find((row) => Number(row?.step) === Number(step))?.campaignId);

const htmlStats = (html) => {
  const urlHashes = [...String(html ?? '').matchAll(/https?:\/\/[^"'<>\s)]+/giu)]
    .map((match) => match[0].replace(/&amp;/g, '&').replace(/[.,;]+$/u, ''))
    .filter(Boolean)
    .map((url) => sha256(url));
  const placeholderCounts = Object.fromEntries(PLACEHOLDERS.map((placeholder) => [
    placeholder,
    String(html ?? '').split(placeholder).length - 1,
  ]));
  return {
    chars: String(html ?? '').length,
    sha256: sha256(String(html ?? '')),
    placeholderCounts,
    totalPlaceholderCount: Object.values(placeholderCounts).reduce((sum, count) => sum + count, 0),
    redactedFinalLinkTokenCount: (String(html ?? '').match(/final_public_link_ready_redacted:/gu) ?? []).length,
    urlHashes,
    urlHashCount: urlHashes.length,
    exactUrlsPrinted: false,
  };
};

const buildFormBody = ({ name, subject, fromName, fromEmail, replyTo, content, languageId = null, groupId }) => {
  const body = {
    name,
    type: 'regular',
    'groups[]': [groupId],
    'emails[0][subject]': subject,
    'emails[0][from_name]': fromName,
    'emails[0][from]': fromEmail,
    'emails[0][content]': content,
  };
  if (replyTo) body['emails[0][reply_to]'] = replyTo;
  if (languageId) body.language_id = languageId;
  return body;
};

const targetLinksByKey = (receipt) => {
  const rows = Array.isArray(receipt?.targetLinks)
    ? receipt.targetLinks
    : Object.values(receipt?.targetLinks ?? {});
  return new Map(rows
    .map((row) => [cleanString(row?.key), cleanString(row?.url)])
    .filter(([key, url]) => key && url));
};

const targetRecords = async ({
  approvalPacket,
  correctionPreview,
  emailRenderQa,
  shopifyPreviewRouteExecutionReceipt,
  realMailerLiteRenderQa,
}) => {
  const qaByStep = rowByStep(emailRenderQa?.emailQa ?? []);
  const exactLinks = targetLinksByKey(shopifyPreviewRouteExecutionReceipt);
  const htmlEntries = await Promise.all([1, 2, 3, 4].map(async (step) => {
    const path = cleanString(qaByStep.get(step)?.htmlPath);
    if (!path) return [step, null];
    const html = await readText(path);
    return [step, { path: resolve(path), html, stats: htmlStats(html) }];
  }));
  const htmlEvidenceByStep = new Map(htmlEntries.filter(([, value]) => value).map(([step, value]) => [step, {
    path: value.path,
    chars: value.stats.chars,
    sha256: value.stats.sha256,
    totalPlaceholderCount: value.stats.totalPlaceholderCount,
    redactedFinalLinkTokenCount: value.stats.redactedFinalLinkTokenCount,
    urlHashCount: value.stats.urlHashCount,
  }]));
  const targets = buildReplacementTargets({
    correctionPreview,
    emailRenderQa,
    realMailerLiteRenderQa,
    htmlEvidenceByStep,
  });
  const explicitByStep = rowByStep(approvalPacket?.replacementTargets ?? []);
  return targets.map((target) => {
    const explicit = explicitByStep.get(target.step) ?? {};
    const htmlRow = new Map(htmlEntries).get(target.step);
    return {
      ...target,
      replacementDraftName: cleanString(explicit.replacementDraftName) ?? target.replacementDraftName,
      sourceCampaignId: sourceCampaignIdForStep(realMailerLiteRenderQa, target.step),
      correctedHtml: htmlRow?.html ?? null,
      correctedHtmlStats: htmlRow?.stats ?? null,
      exactPreviewUrl: target.finalPublicLinkKey ? exactLinks.get(target.finalPublicLinkKey) ?? null : null,
    };
  });
};

const buildPreflight = ({ approvalPacket, targets, groups, campaigns, execute, approvalPhrase }) => {
  const blockers = [];
  const expectedPhrase = buildExactApprovalPhrase();
  const approvalMatched = normalizeApprovalPhrase(approvalPhrase) === normalizeApprovalPhrase(expectedPhrase);
  const groupMatches = groups.filter((group) => normalizeName(groupNameFor(group)) === normalizeName(SAFETY_GROUP_NAME));
  const safetyGroup = groupMatches.length === 1 ? groupMatches[0] : null;
  const safetyGroupId = safetyGroup ? groupIdFor(safetyGroup) : null;
  const safetyGroupActiveCount = safetyGroup ? activeCountFor(safetyGroup) : null;
  const campaignsByName = new Map();
  for (const campaign of campaigns) {
    const normalized = normalizeName(campaignNameFor(campaign));
    if (!normalized) continue;
    const rows = campaignsByName.get(normalized) ?? [];
    rows.push(campaign);
    campaignsByName.set(normalized, rows);
  }

  if (approvalPacket?.status !== 'mailerlite_null_audience_replacement_approval_packet_ready_for_exact_human_approval_no_live_changes') {
    blockers.push(`approval_packet_not_ready:${approvalPacket?.status ?? 'missing'}`);
  }
  if (approvalPacket?.ok !== true) blockers.push('approval_packet_not_ok');
  if (approvalPacket?.executiveSummary?.canAskAlejandroForApproval !== true) blockers.push('approval_packet_cannot_ask_approval_now');
  if (approvalPacket?.decision?.packetIsApprovalByItself !== false) blockers.push('approval_packet_self_authorizes_unexpectedly');
  if (approvalPacket?.decision?.canCreateReplacementDraftsNow !== false) blockers.push('approval_packet_create_gate_unexpectedly_open');
  if (normalizeApprovalPhrase(approvalPacket?.decision?.exactApprovalPhrase) !== normalizeApprovalPhrase(expectedPhrase)) {
    blockers.push('approval_packet_exact_phrase_mismatch');
  }
  if (approvalPacket?.safety?.mailerLiteApiCalled !== false) blockers.push('approval_packet_reports_mailerlite_api_call');
  if (approvalPacket?.safety?.mailerLiteMutationsPerformed !== false) blockers.push('approval_packet_reports_mailerlite_mutation');
  if (approvalPacket?.safety?.sendsPerformed !== false) blockers.push('approval_packet_reports_send');
  if (approvalPacket?.safety?.exactUrlsPrinted !== false) blockers.push('approval_packet_prints_exact_urls');
  if (approvalPacket?.safety?.tokensPrinted !== false) blockers.push('approval_packet_prints_tokens');
  if (execute && !approvalMatched) {
    blockers.push(cleanString(approvalPhrase) ? 'blocked_approval_phrase_mismatch' : 'blocked_missing_exact_approval_phrase');
  }
  if (groupMatches.length !== 1) blockers.push(`safety_group_match_count_not_1:${groupMatches.length}`);
  if (!safetyGroupId) blockers.push('safety_group_id_missing');
  if (safetyGroupActiveCount !== 0) blockers.push(`safety_group_active_count_not_0:${safetyGroupActiveCount}`);
  if (targets.length !== 4) blockers.push(`target_count_not_4:${targets.length}`);

  const targetPlan = targets.map((target) => {
    const rowBlockers = [];
    const collisions = campaignsByName.get(normalizeName(target.replacementDraftName)) ?? [];
    if (!target.sourceCampaignId) rowBlockers.push(`target_${target.label}_source_campaign_id_missing`);
    if (!target.replacementDraftName) rowBlockers.push(`target_${target.label}_replacement_name_missing`);
    if (collisions.length > 0) rowBlockers.push(`target_${target.label}_replacement_name_already_exists`);
    if (!target.correctedHtml || target.correctedHtml.length < 100) rowBlockers.push(`target_${target.label}_corrected_html_missing_or_small`);
    if (target.correctedHtmlStats?.totalPlaceholderCount !== 0) rowBlockers.push(`target_${target.label}_corrected_html_still_has_placeholders`);
    const redactedToken = redactedTokenFor(target.finalPublicLinkKey);
    const exactPreviewUrlSha256 = target.exactPreviewUrl ? sha256(target.exactPreviewUrl) : null;
    if (target.expectedFinalPublicUrlSha256 && !target.exactPreviewUrl) {
      rowBlockers.push(`target_${target.label}_exact_preview_url_missing`);
    }
    if (target.expectedFinalPublicUrlSha256 && exactPreviewUrlSha256 !== target.expectedFinalPublicUrlSha256) {
      rowBlockers.push(`target_${target.label}_exact_preview_url_hash_mismatch`);
    }
    if (redactedToken && !target.correctedHtml?.includes(redactedToken)) {
      rowBlockers.push(`target_${target.label}_redacted_token_missing_from_html`);
    }
    blockers.push(...rowBlockers);
    return {
      step: target.step,
      label: target.label,
      role: target.role,
      subject: target.subject,
      sourceCampaignIdSha256: target.sourceCampaignId ? sha256(target.sourceCampaignId) : null,
      sourceCampaignIdPrinted: false,
      replacementDraftName: target.replacementDraftName,
      replacementNameCollisionCount: collisions.length,
      correctedHtmlPath: target.correctedHtmlPath,
      correctedHtmlSha256: target.correctedHtmlStats?.sha256 ?? null,
      correctedHtmlChars: target.correctedHtmlStats?.chars ?? null,
      correctedHtmlTotalPlaceholderCount: target.correctedHtmlStats?.totalPlaceholderCount ?? null,
      expectedFinalPublicUrlSha256: target.expectedFinalPublicUrlSha256 ?? null,
      exactPreviewUrlSha256,
      exactUrlPrinted: false,
      rowBlockers,
      _sourceCampaignIdForRun: target.sourceCampaignId,
      _correctedHtmlForRun: target.correctedHtml,
      _exactPreviewUrlForRun: target.exactPreviewUrl,
      _redactedTokenForRun: redactedToken,
    };
  });

  return {
    expectedPhrase,
    approvalMatched,
    blockers: [...new Set(blockers)],
    safetyGroupId,
    safetyGroupIdSha256: safetyGroupId ? sha256(safetyGroupId) : null,
    safetyGroupIdPrinted: false,
    safetyGroupActiveCount,
    groupMatchesRead: groupMatches.length,
    targetPlan,
  };
};

const buildSafety = ({
  execute,
  apiCalled = true,
  groupsRead = 0,
  campaignsRead = 0,
  sourceDraftsRead = 0,
  created = 0,
  deleted = 0,
}) => ({
  mode: execute ? 'execute_mailerlite_api_null_audience_replacement_drafts' : 'read_only_preflight',
  mailerLiteApiCalled: apiCalled,
  mailerLiteGroupsRead: groupsRead,
  mailerLiteCampaignsRead: campaignsRead,
  mailerLiteSourceDraftsRead: sourceDraftsRead,
  mailerLiteDraftsCreated: created,
  mailerLiteDraftsDeletedByFailureCleanup: deleted,
  mailerLiteMutationsPerformed: execute && (created > 0 || deleted > 0),
  allowedMutationType: execute && created > 0
    ? 'create_four_null_audience_replacement_drafts_only_and_cleanup_created_drafts_on_failure'
    : null,
  safetyGroupName: SAFETY_GROUP_NAME,
  safetyGroupNamePrinted: true,
  safetyGroupIdPrinted: false,
  oldDraftsEdited: false,
  oldDraftsDeletedOrArchived: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  sendsPerformed: false,
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

const buildRun = async (options) => {
  const generatedAt = new Date().toISOString();
  const [
    approvalPacket,
    correctionPreview,
    emailRenderQa,
    shopifyPreviewRouteExecutionReceipt,
    realMailerLiteRenderQa,
  ] = await Promise.all([
    readJson(options.approvalPacket),
    readJson(options.correctionPreview),
    readJson(options.emailRenderQa),
    readJson(options.shopifyPreviewRouteExecutionReceipt),
    readJson(options.realMailerLiteRenderQa),
  ]);
  const credential = await getCredential(options);
  if (!credential?.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: options.execute ? 'execute_requested' : 'read_only_preflight',
      generatedAt,
      ok: false,
      status: 'mailerlite_null_audience_replacement_blocked_missing_mailerlite_credential',
      credential: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      decision: {
        approval: {
          provided: Boolean(cleanString(options.approvalPhrase)),
          status: options.execute ? 'not_checked_missing_credential' : 'read_only_preflight_no_live_approval_required',
        },
        canExecute: false,
        blockers: ['blocked_missing_mailerlite_credential'],
      },
      preflight: { groupsRead: 0, campaignsRead: 0 },
      targetPlan: [],
      createdDrafts: [],
      postCreateQa: { replacementDraftCount: 0, nullAudienceSafeCount: 0 },
      cleanup: { attempted: false, deletedCount: 0, goneCount: 0 },
      errors: [],
      safety: buildSafety({ execute: options.execute, apiCalled: false }),
    };
  }

  const [targets, groups, campaigns] = await Promise.all([
    targetRecords({
      approvalPacket,
      correctionPreview,
      emailRenderQa,
      shopifyPreviewRouteExecutionReceipt,
      realMailerLiteRenderQa,
    }),
    scanGroups(options, credential.key),
    fetchCampaigns(options, credential.key),
  ]);
  const preflight = buildPreflight({
    approvalPacket,
    targets,
    groups,
    campaigns,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
  });
  const createdDrafts = [];
  const postCreateQa = [];
  const errors = [];
  let sourceDraftsRead = 0;
  let cleanupAttempted = false;
  let cleanupDeletedCount = 0;
  let cleanupGoneCount = 0;

  if (options.execute && preflight.blockers.length === 0) {
    for (const target of preflight.targetPlan) {
      try {
        const sourceDetail = await fetchCampaignDetail({
          options,
          key: credential.key,
          id: target._sourceCampaignIdForRun,
        });
        sourceDraftsRead += 1;
        const sender = safeSenderIdentity(sourceDetail);
        if (campaignStatusFor(sourceDetail) !== 'draft') throw new Error(`source_campaign_not_draft:${target.label}`);
        if (!sender.fromName || !sender.fromEmail) throw new Error(`sender_identity_missing:${target.label}`);
        const content = target._redactedTokenForRun && target._exactPreviewUrlForRun
          ? target._correctedHtmlForRun.split(target._redactedTokenForRun).join(target._exactPreviewUrlForRun)
          : target._correctedHtmlForRun;

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
            languageId: sourceDetail?.language_id ?? sourceDetail?.languageId ?? null,
            groupId: preflight.safetyGroupId,
          }),
        });
        const campaign = campaignFromPayload(payload);
        const campaignId = campaignIdFor(campaign);
        createdDrafts.push({
          step: target.step,
          label: target.label,
          campaignIdSha256: campaignId ? sha256(campaignId) : null,
          campaignIdPrinted: false,
          name: target.replacementDraftName,
          status: campaignStatusFor(campaign),
          sourceCampaignIdSha256: target.sourceCampaignIdSha256,
          oldDraftLeftIntact: true,
          exactUrlPrinted: false,
          _campaignIdForRun: campaignId,
        });
      } catch (error) {
        errors.push({
          phase: 'create',
          label: target.label,
          reason: error?.reason || error?.message || 'mailerlite_null_audience_replacement_create_failed',
          status: error?.status ?? null,
          details: Array.isArray(error?.details) ? error.details : [],
        });
        break;
      }
    }

    for (const created of createdDrafts) {
      try {
        const detail = await fetchCampaignDetail({ options, key: credential.key, id: created._campaignIdForRun });
        const email = emailForCampaign(detail);
        const content = typeof email?.content === 'string' ? email.content : '';
        const stats = htmlStats(content);
        const target = preflight.targetPlan.find((row) => row.step === created.step);
        const evaluation = evaluateNullAudienceCampaign({
          campaign: detail,
          groupId: preflight.safetyGroupId,
          groupActiveCount: preflight.safetyGroupActiveCount,
        });
        postCreateQa.push({
          step: created.step,
          label: created.label,
          campaignIdSha256: created.campaignIdSha256,
          name: created.name,
          nullAudienceSafe: evaluation.nullAudienceSafe,
          failedNullAudienceChecks: evaluation.failed,
          observed: evaluation.redactedObserved,
          contentSha256: stats.sha256,
          contentHasPlaceholder: stats.totalPlaceholderCount > 0,
          contentHasExpectedUrlHash: target?.expectedFinalPublicUrlSha256
            ? stats.urlHashes.includes(target.expectedFinalPublicUrlSha256)
            : true,
          exactUrlPrinted: false,
        });
      } catch (error) {
        errors.push({
          phase: 'post_create_qa',
          label: created.label,
          reason: error?.reason || error?.message || 'mailerlite_null_audience_replacement_post_create_qa_failed',
          status: error?.status ?? null,
          details: Array.isArray(error?.details) ? error.details : [],
        });
      }
    }

    const postCreateGreen = createdDrafts.length === 4
      && postCreateQa.length === 4
      && postCreateQa.every((row) =>
        row.nullAudienceSafe === true
        && row.contentHasPlaceholder === false
        && row.contentHasExpectedUrlHash === true);
    if (!postCreateGreen && createdDrafts.length > 0) {
      cleanupAttempted = true;
      for (const created of createdDrafts) {
        try {
          await requestJson({
            options,
            key: credential.key,
            path: `/campaigns/${created._campaignIdForRun}`,
            method: 'DELETE',
          });
          cleanupDeletedCount += 1;
          const gone = await fetchCampaignStatusOrGone({
            options,
            key: credential.key,
            id: created._campaignIdForRun,
          });
          if (gone.found === false) cleanupGoneCount += 1;
        } catch (error) {
          errors.push({
            phase: 'failure_cleanup',
            label: created.label,
            reason: error?.reason || error?.message || 'mailerlite_null_audience_replacement_failure_cleanup_failed',
            status: error?.status ?? null,
            details: Array.isArray(error?.details) ? error.details : [],
          });
        }
      }
    }
  }

  const nullAudienceSafeCount = postCreateQa.filter((row) => row.nullAudienceSafe).length;
  const contentGreenCount = postCreateQa.filter((row) =>
    row.contentHasPlaceholder === false
    && row.contentHasExpectedUrlHash === true).length;
  const executedOk = options.execute
    && preflight.blockers.length === 0
    && errors.length === 0
    && createdDrafts.length === 4
    && postCreateQa.length === 4
    && nullAudienceSafeCount === 4
    && contentGreenCount === 4
    && cleanupAttempted === false;
  const readOnlyOk = !options.execute && preflight.blockers.length === 0;

  const cleanCreatedDrafts = createdDrafts.map(({ _campaignIdForRun, ...row }) => row);
  const cleanTargetPlan = preflight.targetPlan.map(({
    _sourceCampaignIdForRun,
    _correctedHtmlForRun,
    _exactPreviewUrlForRun,
    _redactedTokenForRun,
    ...row
  }) => row);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: options.execute ? 'execute_requested' : 'read_only_preflight',
    generatedAt,
    ok: options.execute ? executedOk : readOnlyOk,
    status: options.execute
      ? executedOk
        ? 'mailerlite_null_audience_replacement_execution_completed_no_sends'
        : createdDrafts.length > 0
          ? cleanupAttempted && cleanupDeletedCount === createdDrafts.length && cleanupGoneCount === createdDrafts.length
            ? 'mailerlite_null_audience_replacement_execution_failed_cleanup_completed_no_sends'
            : 'mailerlite_null_audience_replacement_execution_failed_cleanup_incomplete_no_sends'
          : 'mailerlite_null_audience_replacement_execution_blocked_before_mutation'
      : readOnlyOk
        ? 'mailerlite_null_audience_replacement_preflight_ready_for_exact_approval'
        : 'mailerlite_null_audience_replacement_preflight_blocked',
    credential: {
      service: options.service,
      account: options.account,
      credentialPresent: Boolean(credential?.key),
      credentialSource: credential?.source ? 'configured_not_printed' : null,
    },
    decision: {
      approval: {
        provided: Boolean(cleanString(options.approvalPhrase)),
        status: !options.execute
          ? 'read_only_preflight_no_live_approval_required'
          : preflight.approvalMatched
            ? 'exact_approval_phrase_matched'
            : cleanString(options.approvalPhrase)
              ? 'blocked_approval_phrase_mismatch'
              : 'blocked_missing_exact_approval_phrase',
      },
      canExecute: options.execute && preflight.blockers.length === 0,
      expectedPhraseSha256: sha256(preflight.expectedPhrase),
      exactApprovalPhrasePrinted: false,
      blockers: preflight.blockers,
    },
    preflight: {
      groupsRead: groups.length,
      campaignsRead: campaigns.length,
      safetyGroupName: SAFETY_GROUP_NAME,
      safetyGroupIdSha256: preflight.safetyGroupIdSha256,
      safetyGroupIdPrinted: false,
      safetyGroupActiveCount: preflight.safetyGroupActiveCount,
      groupMatchesRead: preflight.groupMatchesRead,
      replacementNameCollisionCount: cleanTargetPlan.reduce((sum, row) => sum + row.replacementNameCollisionCount, 0),
    },
    targetPlan: cleanTargetPlan,
    createdDrafts: cleanCreatedDrafts,
    postCreateQa: {
      replacementDraftCount: postCreateQa.length,
      nullAudienceSafeCount,
      contentGreenCount,
      rows: postCreateQa,
    },
    cleanup: {
      attempted: cleanupAttempted,
      deletedCount: cleanupDeletedCount,
      goneCount: cleanupGoneCount,
    },
    errors,
    safety: buildSafety({
      execute: options.execute,
      groupsRead: groups.length,
      campaignsRead: campaigns.length,
      sourceDraftsRead,
      created: createdDrafts.length,
      deleted: cleanupDeletedCount,
    }),
  };
};

const renderMarkdown = (run) => [
  '# MailerLite Null Audience Replacement Execution Receipt',
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
  '## Preflight',
  '',
  `- Groups read: ${run.preflight.groupsRead}`,
  `- Campaigns read: ${run.preflight.campaignsRead}`,
  `- Safety group: ${run.preflight.safetyGroupName}`,
  `- Safety group active_count: ${run.preflight.safetyGroupActiveCount}`,
  `- Safety group ID printed: ${run.preflight.safetyGroupIdPrinted}`,
  '',
  '## Created Drafts',
  '',
  ...(run.createdDrafts.length
    ? run.createdDrafts.map((draft) => `- ${draft.label}: ${draft.name}; status=${draft.status}; campaignIdPrinted=${draft.campaignIdPrinted}; oldDraftLeftIntact=${draft.oldDraftLeftIntact}`)
    : ['- none']),
  '',
  '## Post-Create QA',
  '',
  `- Replacement drafts checked: ${run.postCreateQa.replacementDraftCount}`,
  `- Null Audience safe count: ${run.postCreateQa.nullAudienceSafeCount}`,
  `- Content green count: ${run.postCreateQa.contentGreenCount}`,
  ...run.postCreateQa.rows.map((row) =>
    `- ${row.label}: nullAudienceSafe=${row.nullAudienceSafe}; contentHasPlaceholder=${row.contentHasPlaceholder}; contentHasExpectedUrlHash=${row.contentHasExpectedUrlHash}; exactUrlPrinted=${row.exactUrlPrinted}`),
  '',
  '## Cleanup',
  '',
  `- Attempted: ${run.cleanup.attempted}`,
  `- Deleted/gone: ${run.cleanup.deletedCount}/${run.cleanup.goneCount}`,
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
  `- Drafts created: ${run.safety.mailerLiteDraftsCreated}`,
  `- Drafts deleted by failure cleanup: ${run.safety.mailerLiteDraftsDeletedByFailureCleanup}`,
  `- Old drafts edited/deleted: ${run.safety.oldDraftsEdited}/${run.safety.oldDraftsDeletedOrArchived}`,
  `- Sends/publish/schedule: ${run.safety.sendsPerformed}/${run.safety.campaignsPublished}/${run.safety.campaignsScheduled}`,
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
    createdDraftCount: run.createdDrafts.length,
    nullAudienceSafeCount: run.postCreateQa.nullAudienceSafeCount,
    contentGreenCount: run.postCreateQa.contentGreenCount,
    blockerCount: run.decision.blockers.length,
    errorCount: run.errors.length,
    cleanupAttempted: run.cleanup.attempted,
    cleanupDeletedCount: run.cleanup.deletedCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: {
      mailerLiteApiCalled: run.safety.mailerLiteApiCalled,
      mailerLiteDraftsCreated: run.safety.mailerLiteDraftsCreated,
      sendsPerformed: run.safety.sendsPerformed,
      campaignsPublished: run.safety.campaignsPublished,
      campaignsScheduled: run.safety.campaignsScheduled,
      subscribersRead: run.safety.subscribersRead,
      additionalGroupsCreatedOrAssigned: run.safety.additionalGroupsCreatedOrAssigned,
      nonNullAudienceGroupsAssigned: run.safety.nonNullAudienceGroupsAssigned,
      workflowMutationsPerformed: run.safety.workflowMutationsPerformed,
      exactUrlsPrinted: run.safety.exactUrlsPrinted,
      tokensPrinted: run.safety.tokensPrinted,
    },
  }, null, 2));

  if (options.execute && run.status !== 'mailerlite_null_audience_replacement_execution_completed_no_sends') {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Null Audience replacement create failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFormBody,
  buildPreflight,
  buildRun,
  htmlStats,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
};
