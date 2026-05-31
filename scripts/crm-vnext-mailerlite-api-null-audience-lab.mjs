#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-api-null-audience-lab-2026-05-31';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_null_audience_lab_current_inteligencia_descansar_2026-05-31.md';
const SAFETY_GROUP_NAME = 'CC · Safety · Null audience · DO NOT SEND';
const DISPOSABLE_PREFIX = '[LAB NULL AUDIENCE]';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-api-null-audience-lab.mjs [options]

Options:
  --real-mailerlite-render-qa <path> Source campaign IDs for sender identity. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --source-step <n>                  Existing safe draft step used only to read sender identity during execute. Defaults to 1.
  --execute                          Create/use the Null Audience safety group and create/inspect/delete disposable lab drafts after exact approval.
  --approval-phrase <text>           Exact approval phrase required with --execute.
  --service <name>                   Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                   Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                   MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                   Per-request timeout. Defaults to 30000.
  --out <path>                       Write JSON lab packet/receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>              Write Markdown lab packet/receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                             Show this help

Local-first MailerLite API laboratory for a safer API-heavy launch factory.
Dry-run mode is local-only and prints no secrets. Execute mode may create or
use only the permanent empty safety group "${SAFETY_GROUP_NAME}", then creates
only disposable ${DISPOSABLE_PREFIX} campaign drafts assigned exclusively to
that empty group, inspects them, and deletes every disposable draft it created.
It never sends, publishes, schedules, attaches workflows, mutates subscribers,
creates additional groups/segments, touches Shopify/CRM, appends ledgers,
writes cards/scoring, touches Fact Store, prints tokens, prints sender values,
or prints group/campaign IDs.`;

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

const buildExactApprovalPhrase = () =>
  `Apruebo ejecutar el laboratorio API Null Audience de MailerLite para crear o usar únicamente el grupo vacío de seguridad ${SAFETY_GROUP_NAME} con active_count=0 y crear, inspeccionar y borrar únicamente campañas borrador desechables con prefijo ${DISPOSABLE_PREFIX} asignadas solo a ese grupo vacío, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos o segmentos adicionales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; si el grupo no está vacío o el filtro no apunta exclusivamente a ese grupo, detenerse y generar recibo local.`;

const parseArgs = (argv) => {
  const options = {
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    sourceStep: 1,
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
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
    else if (arg === '--source-step') options.sourceStep = Number.parseInt(argv[++index], 10);
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
  options.sourceStep = Number.isFinite(options.sourceStep) && options.sourceStep > 0 ? options.sourceStep : 1;
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
  secretsPrinted: false,
  exactIdsPrinted: false,
});

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
      'User-Agent': 'CRM-vNext-MailerLite-API-Null-Audience-Lab/1.0',
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
  for (const key of ['data', 'groups', 'items', 'results']) {
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
        // Treat malformed pagination as terminal.
      }
    }
  }
  return null;
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

const groupNameFor = (group) => cleanString(group?.name) ?? cleanString(group?.title) ?? cleanString(group?.label);
const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);
const activeCountFor = (group) => {
  const value = group?.active_count ?? group?.activeCount ?? group?.subscribers_count ?? group?.total;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

const findGroupsByName = (groups, name) => {
  const normalized = normalizeName(name);
  return groups.filter((group) => normalizeName(groupNameFor(group)) === normalized);
};

const createGroup = async ({ options, key, name }) => {
  const payload = await requestJson({
    options,
    key,
    path: '/groups',
    method: 'POST',
    body: { name },
  });
  return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
};

const campaignFromPayload = (payload) =>
  payload?.data && typeof payload.data === 'object' ? payload.data : payload;

const campaignIdFor = (campaign) => cleanString(campaign?.id) ?? cleanString(campaign?.campaign_id);
const campaignNameFor = (campaign) => cleanString(campaign?.name) ?? cleanString(campaign?.title);
const emailForCampaign = (campaign) => Array.isArray(campaign?.emails) ? campaign.emails[0] ?? {} : {};

const campaignIdForStep = (realQa, step) => {
  const row = (realQa?.drafts ?? []).find((draft) => Number(draft?.step) === Number(step));
  return cleanString(row?.campaignId);
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

const labContent = (variantId) => [
  '<!doctype html>',
  '<html>',
  '<body>',
  '<p>MailerLite API Null Audience laboratory.</p>',
  `<p>Variant: ${variantId}</p>`,
  '<p>Do not send. Disposable campaign assigned only to the empty safety group.</p>',
  '</body>',
  '</html>',
].join('');

const buildJsonBody = ({ name, subject, fromName, fromEmail, replyTo, content, languageId = null, groupId }) => {
  const body = {
    name,
    type: 'regular',
    groups: [groupId],
    segments: [],
    emails: [{
      subject,
      from_name: fromName,
      from: fromEmail,
      content,
    }],
  };
  if (replyTo) body.emails[0].reply_to = replyTo;
  if (languageId) body.language_id = languageId;
  return body;
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

const buildVariantPlans = ({ runId = 'dry-run' } = {}) => [
  {
    id: 'json_single_empty_safety_group',
    label: 'JSON POST assigned to the empty safety group',
    hypothesis: 'A draft assigned exclusively to an empty safety group can be API-created safely even if MailerLite marks it schedulable.',
    requestShape: 'json',
    audienceFields: ['groups:single_empty_safety_group', 'segments:empty_array'],
    disposableName: `${DISPOSABLE_PREFIX} MailerLite null audience lab ${runId} · json group`,
  },
  {
    id: 'form_single_empty_safety_group',
    label: 'Form POST assigned to the empty safety group',
    hypothesis: 'Confirm whether form-url-encoded creation can use the same empty safety group audience shape.',
    requestShape: 'form_urlencoded',
    audienceFields: ['groups:single_empty_safety_group', 'segments:omitted'],
    disposableName: `${DISPOSABLE_PREFIX} MailerLite null audience lab ${runId} · form group`,
  },
];

const buildVariantBody = ({ variant, sender, groupId }) => {
  const subject = `${DISPOSABLE_PREFIX} MailerLite null audience lab ${variant.id}`;
  const content = labContent(variant.id);
  if (variant.requestShape === 'form_urlencoded') {
    return {
      body: buildFormBody({
        name: variant.disposableName,
        subject,
        fromName: sender.fromName,
        fromEmail: sender.fromEmail,
        replyTo: sender.replyTo,
        content,
        languageId: sender.languageId,
        groupId,
      }),
      form: true,
    };
  }

  return {
    body: buildJsonBody({
      name: variant.disposableName,
      subject,
      fromName: sender.fromName,
      fromEmail: sender.fromEmail,
      replyTo: sender.replyTo,
      content,
      languageId: sender.languageId,
      groupId,
    }),
    form: false,
  };
};

const filterStateFor = (campaign) => {
  const filter = campaign?.filter;
  if (filter === null || filter === undefined) return 'null_or_absent';
  if (Array.isArray(filter)) return `array:${filter.length}`;
  return typeof filter;
};

const collectAudienceIds = (value, keyName, ids = [], depth = 0) => {
  if (depth > 20 || value === null || value === undefined) return ids;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const item = value[index];
      if (typeof item === 'string' && item.toLowerCase() === keyName && Array.isArray(value[index + 1])) {
        ids.push(...value[index + 1].map((entry) => cleanString(entry)).filter(Boolean));
      }
      collectAudienceIds(item, keyName, ids, depth + 1);
    }
    return ids;
  }
  if (typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      if (key.toLowerCase() === keyName && Array.isArray(nested)) {
        ids.push(...nested.map((entry) => cleanString(entry?.id ?? entry)).filter(Boolean));
      }
      collectAudienceIds(nested, keyName, ids, depth + 1);
    }
  }
  return ids;
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const evaluateNullAudienceCampaign = ({ campaign, groupId, groupActiveCount }) => {
  const missingData = Array.isArray(campaign?.missing_data) ? campaign.missing_data : [];
  const warnings = Array.isArray(campaign?.warnings) ? campaign.warnings : [];
  const filterGroupIds = unique(collectAudienceIds(campaign?.filter, 'groups'));
  const filterSegmentIds = unique(collectAudienceIds(campaign?.filter, 'segments'));
  const nullGroupOnly = filterGroupIds.length === 1 && filterGroupIds[0] === cleanString(groupId);
  const noSegments = filterSegmentIds.length === 0;
  const checks = [
    { id: 'campaign_exists', ok: Boolean(campaignIdFor(campaign)), observed: Boolean(campaignIdFor(campaign)) },
    { id: 'campaign_is_draft', ok: campaign?.status === 'draft', observed: campaign?.status ?? null },
    { id: 'campaign_type_regular', ok: campaign?.type === 'regular', observed: campaign?.type ?? null },
    { id: 'null_group_active_count_zero', ok: groupActiveCount === 0, observed: groupActiveCount },
    { id: 'filter_points_only_to_null_group', ok: nullGroupOnly, observed: { groupIdCount: filterGroupIds.length } },
    { id: 'filter_has_no_segments', ok: noSegments, observed: { segmentIdCount: filterSegmentIds.length } },
    { id: 'not_scheduled', ok: campaign?.scheduled_for == null, observed: campaign?.scheduled_for ?? null },
    { id: 'not_queued', ok: campaign?.queued_at == null, observed: campaign?.queued_at ?? null },
    { id: 'not_started', ok: campaign?.started_at == null, observed: campaign?.started_at ?? null },
    { id: 'not_finished', ok: campaign?.finished_at == null, observed: campaign?.finished_at ?? null },
    { id: 'not_currently_sending', ok: campaign?.is_currently_sending_out === false, observed: campaign?.is_currently_sending_out ?? null },
    { id: 'not_used_in_automations', ok: campaign?.used_in_automations === false, observed: campaign?.used_in_automations ?? null },
    { id: 'no_warnings', ok: warnings.length === 0, observed: warnings },
  ];
  return {
    checks,
    nullAudienceSafe: checks.every((check) => check.ok),
    failed: checks.filter((check) => !check.ok).map((check) => check.id),
    redactedObserved: {
      status: campaign?.status ?? null,
      type: campaign?.type ?? null,
      filterState: filterStateFor(campaign),
      filterGroupIdCount: filterGroupIds.length,
      filterGroupIdSha256: filterGroupIds[0] ? sha256(filterGroupIds[0]) : null,
      filterSegmentIdCount: filterSegmentIds.length,
      hasBasicFilter: campaign?.has_basic_filter ?? null,
      canBeScheduled: campaign?.can_be_scheduled ?? null,
      missingData,
      scheduledFor: campaign?.scheduled_for ?? null,
      queuedAt: campaign?.queued_at ?? null,
      startedAt: campaign?.started_at ?? null,
      finishedAt: campaign?.finished_at ?? null,
      usedInAutomations: campaign?.used_in_automations ?? null,
      groupActiveCount,
    },
  };
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
      nameSha256: campaignNameFor(campaign) ? sha256(campaignNameFor(campaign)) : null,
      status: campaign?.status ?? null,
      reason: null,
    };
  } catch (error) {
    if (error?.reason === 'mailerlite_not_found' || error?.reason === 'mailerlite_gone') {
      return {
        found: false,
        idSha256: sha256(id),
        nameSha256: null,
        status: 'gone',
        reason: error.reason,
      };
    }
    throw error;
  }
};

const buildSafety = ({
  execute,
  apiCalled = false,
  groupsRead = 0,
  safetyGroupsCreated = 0,
  created = 0,
  deleted = 0,
}) => ({
  localOnly: !execute,
  reportsOnly: !execute,
  mode: execute ? 'execute_null_audience_mailerlite_api_lab' : 'dry_run_packet_only',
  mailerLiteApiCalled: apiCalled,
  mailerLiteGroupsRead: groupsRead,
  mailerLiteSafetyGroupsCreated: safetyGroupsCreated,
  mailerLiteDraftsCreated: created,
  mailerLiteDraftsDeleted: deleted,
  mailerLiteMutationsPerformed: execute && (safetyGroupsCreated > 0 || created > 0 || deleted > 0),
  allowedMutationType: execute && (safetyGroupsCreated > 0 || created > 0 || deleted > 0)
    ? 'create_or_use_empty_safety_group_and_create_inspect_delete_disposable_null_audience_lab_campaigns_only'
    : null,
  safetyGroupName: SAFETY_GROUP_NAME,
  safetyGroupNamePrinted: true,
  safetyGroupIdPrinted: false,
  disposableOnly: true,
  originalDraftsEditedOrDeleted: false,
  realLaunchDraftsCreatedOrEdited: false,
  realCampaignAudienceAssignmentsPerformed: false,
  disposableCampaignAudienceAssignedOnlyToNullGroup: created > 0,
  campaignsPublished: false,
  campaignsScheduled: false,
  sendsPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  additionalGroupsCreatedOrAssigned: false,
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
  tokensPrinted: false,
  exactPreviewUrlsPrinted: false,
});

const buildDryRunPacket = ({ realQa, realQaRaw, options, generatedAt }) => {
  const variants = buildVariantPlans();
  const sourceCampaignId = campaignIdForStep(realQa, options.sourceStep);
  const blockers = [];
  if (!sourceCampaignId) blockers.push(`source_campaign_id_missing_for_step_${options.sourceStep}`);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'dry_run_packet_only',
    generatedAt,
    ok: blockers.length === 0,
    status: blockers.length === 0
      ? 'mailerlite_api_null_audience_lab_packet_ready_for_exact_human_approval_no_live_changes'
      : 'mailerlite_api_null_audience_lab_packet_blocked_no_live_changes',
    launch: realQa?.launch ?? null,
    executiveSummary: {
      purpose: 'prove_an_api_heavy_null_audience_draft_recipe_for_frequent_launches',
      safetyGroupName: SAFETY_GROUP_NAME,
      safetyGroupActiveCountRequired: 0,
      variantCount: variants.length,
      sourceCampaignStep: options.sourceStep,
      sourceCampaignIdPresent: Boolean(sourceCampaignId),
      disposableDraftPrefix: DISPOSABLE_PREFIX,
      exactApprovalPhraseAvailable: blockers.length === 0,
      canExecuteNow: false,
      packetIsApprovalByItself: false,
      blockerCount: blockers.length,
      nextBestMove: blockers.length === 0
        ? 'Ask Alejandro for the exact Null Audience lab approval phrase before touching MailerLite.'
        : 'Resolve local source campaign evidence before asking for Null Audience lab approval.',
    },
    decision: {
      packetIsApprovalByItself: false,
      canExecuteNow: false,
      exactApprovalPhrase: blockers.length === 0 ? buildExactApprovalPhrase() : null,
      exactApprovalPhrasePrintedByConsole: false,
    },
    approvalBoundary: {
      allowedAfterExactApproval: [
        `create or use only the empty MailerLite safety group named ${SAFETY_GROUP_NAME}`,
        'confirm the safety group active_count is 0 before campaign creation',
        `create only disposable MailerLite draft campaigns prefixed ${DISPOSABLE_PREFIX}`,
        'assign each disposable draft only to the empty safety group audience',
        'inspect each disposable draft by API',
        'delete every disposable draft created by the lab',
        'write a local receipt with hashes/counts/booleans only',
      ],
      stillClosedEvenAfterApproval: [
        'editing_existing_mini_launch_drafts',
        'creating_real_launch_replacement_drafts',
        'assigning_real_launch_campaigns_to_any_audience',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'publish_or_schedule_campaign',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'creating_or_assigning_any_additional_group_or_segment',
        'shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'fresh source real MailerLite render QA with source campaign ID',
        `fresh MailerLite group scan for ${SAFETY_GROUP_NAME}`,
        'exact approval phrase unchanged',
        'Keychain MailerLite credential available without printing token',
      ],
    },
    safetyGroup: {
      name: SAFETY_GROUP_NAME,
      idPrinted: false,
      activeCountRequiredBeforeCampaignCreate: 0,
      allowedIfMissing: 'create_this_named_empty_safety_group_only_after_exact_approval',
      allowedIfPresent: 'reuse_only_if_active_count_is_zero',
    },
    sourceCampaign: {
      step: options.sourceStep,
      idSha256: sourceCampaignId ? sha256(sourceCampaignId) : null,
      idPrinted: false,
      senderValuesWillBeReadOnlyDuringExecute: true,
      senderValuesPrinted: false,
    },
    variants: variants.map((variant) => ({
      id: variant.id,
      label: variant.label,
      hypothesis: variant.hypothesis,
      requestShape: variant.requestShape,
      audienceFields: variant.audienceFields,
      disposableNameSha256: sha256(variant.disposableName),
      disposableNamePrinted: false,
    })),
    blockers,
    sourceDigests: [
      sourceDigest(options.realMailerLiteRenderQa, realQaRaw, 'source campaign IDs only; no sender values read in dry-run'),
    ],
    safety: buildSafety({ execute: false }),
  };
};

const blockedExecuteReceipt = ({
  generatedAt,
  realQaRaw = null,
  options,
  status,
  blockers,
  errors = [],
  apiCalled = false,
  groupsRead = 0,
  safetyGroupsCreated = 0,
}) => ({
  schemaVersion: SCHEMA_VERSION,
  mode: 'execute_requested',
  generatedAt,
  ok: false,
  status,
  executiveSummary: {
    purpose: 'prove_an_api_heavy_null_audience_draft_recipe_for_frequent_launches',
    approvalMatched: normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(buildExactApprovalPhrase()),
    safetyGroupName: SAFETY_GROUP_NAME,
    safetyGroupActiveCountRequired: 0,
    variantCount: buildVariantPlans().length,
    safeNullAudienceVariantCount: 0,
    createdCount: 0,
    deletedCount: 0,
    goneCount: 0,
    cleanupComplete: true,
    blockerCount: blockers.length,
    errorCount: errors.length,
    readyToUseNullAudienceRecipeForRealDrafts: false,
  },
  decision: {
    approval: {
      provided: Boolean(cleanString(options.approvalPhrase)),
      status: normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(buildExactApprovalPhrase())
        ? 'exact_approval_phrase_matched'
        : blockers[0],
    },
    canExecute: false,
    exactApprovalPhrasePrintedByConsole: false,
  },
  safetyGroup: {
    name: SAFETY_GROUP_NAME,
    idPrinted: false,
    activeCountRequired: 0,
    activeCountObserved: null,
  },
  variants: buildVariantPlans().map((variant) => ({ id: variant.id, label: variant.label, skipped: true })),
  blockers,
  errors,
  sourceDigests: realQaRaw ? [
    sourceDigest(options.realMailerLiteRenderQa, realQaRaw, 'source campaign IDs only; no sender values printed'),
  ] : [],
  safety: buildSafety({
    execute: true,
    apiCalled,
    groupsRead,
    safetyGroupsCreated,
  }),
});

const executeLab = async ({ realQa, realQaRaw, options, generatedAt }) => {
  const expectedPhrase = buildExactApprovalPhrase();
  const approvalMatched = normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(expectedPhrase);
  const sourceCampaignId = campaignIdForStep(realQa, options.sourceStep);
  const blockers = [];
  if (!approvalMatched) blockers.push(cleanString(options.approvalPhrase) ? 'blocked_approval_phrase_mismatch' : 'blocked_missing_exact_approval_phrase');
  if (!sourceCampaignId) blockers.push(`source_campaign_id_missing_for_step_${options.sourceStep}`);

  if (blockers.length > 0) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_before_api_call',
      blockers,
    });
  }

  const credential = await getCredential(options);
  if (!credential?.key) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_missing_mailerlite_credential',
      blockers: ['blocked_missing_mailerlite_credential'],
    });
  }

  let apiCalled = false;
  let groupsRead = 0;
  let safetyGroupsCreated = 0;

  let sourceDetail = null;
  try {
    sourceDetail = await fetchCampaignDetail({ options, key: credential.key, id: sourceCampaignId });
    apiCalled = true;
  } catch (error) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_source_fetch_failed_no_mutation',
      blockers: ['source_campaign_fetch_failed'],
      errors: [{
        phase: 'source_campaign_fetch',
        reason: error?.reason || error?.message || 'mailerlite_source_campaign_fetch_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      }],
      apiCalled,
    });
  }

  const sender = safeSenderIdentity(sourceDetail);
  if (!sender.fromName || !sender.fromEmail) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_missing_sender_identity_no_mutation',
      blockers: ['source_sender_identity_missing'],
      apiCalled,
    });
  }

  let groups = [];
  try {
    groups = await scanGroups(options, credential.key);
    apiCalled = true;
    groupsRead = groups.length;
  } catch (error) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_group_scan_failed_no_campaign_created',
      blockers: ['safety_group_scan_failed'],
      errors: [{
        phase: 'safety_group_scan',
        reason: error?.reason || error?.message || 'mailerlite_group_scan_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      }],
      apiCalled,
      groupsRead,
    });
  }

  let safetyGroupMatches = findGroupsByName(groups, SAFETY_GROUP_NAME);
  if (safetyGroupMatches.length > 1) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_duplicate_safety_group_no_campaign_created',
      blockers: ['duplicate_safety_group_names_found'],
      apiCalled,
      groupsRead,
    });
  }

  let safetyGroup = safetyGroupMatches[0] ?? null;
  if (!safetyGroup) {
    try {
      safetyGroup = await createGroup({ options, key: credential.key, name: SAFETY_GROUP_NAME });
      apiCalled = true;
      safetyGroupsCreated = 1;
      groups = await scanGroups(options, credential.key);
      groupsRead = groups.length;
      safetyGroupMatches = findGroupsByName(groups, SAFETY_GROUP_NAME);
      safetyGroup = safetyGroupMatches[0] ?? safetyGroup;
    } catch (error) {
      return blockedExecuteReceipt({
        generatedAt,
        realQaRaw,
        options,
        status: 'mailerlite_api_null_audience_lab_safety_group_create_failed_no_campaign_created',
        blockers: ['safety_group_create_failed'],
        errors: [{
          phase: 'safety_group_create',
          reason: error?.reason || error?.message || 'mailerlite_safety_group_create_failed',
          status: error?.status ?? null,
          details: Array.isArray(error?.details) ? error.details : [],
        }],
        apiCalled,
        groupsRead,
        safetyGroupsCreated,
      });
    }
  }

  const safetyGroupId = groupIdFor(safetyGroup);
  const safetyGroupActiveCount = activeCountFor(safetyGroup);
  if (!safetyGroupId) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_safety_group_id_missing_no_campaign_created',
      blockers: ['safety_group_id_missing'],
      apiCalled,
      groupsRead,
      safetyGroupsCreated,
    });
  }
  if (safetyGroupActiveCount !== 0) {
    return blockedExecuteReceipt({
      generatedAt,
      realQaRaw,
      options,
      status: 'mailerlite_api_null_audience_lab_blocked_safety_group_not_empty_no_campaign_created',
      blockers: [`safety_group_active_count_not_zero:${safetyGroupActiveCount ?? 'unknown'}`],
      apiCalled,
      groupsRead,
      safetyGroupsCreated,
    });
  }

  const runId = new Date(generatedAt).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const variants = buildVariantPlans({ runId });
  const errors = [];
  const variantReceipts = [];

  for (const variant of variants) {
    const receipt = {
      id: variant.id,
      label: variant.label,
      hypothesis: variant.hypothesis,
      requestShape: variant.requestShape,
      audienceFields: variant.audienceFields,
      disposableNameSha256: sha256(variant.disposableName),
      disposableNamePrinted: false,
      safetyGroupName: SAFETY_GROUP_NAME,
      safetyGroupIdSha256: sha256(safetyGroupId),
      safetyGroupIdPrinted: false,
      safetyGroupActiveCount,
      created: false,
      campaignIdSha256: null,
      campaignIdPrinted: false,
      createStatus: null,
      nullAudienceSafe: null,
      deleted: false,
      goneAfterDelete: false,
      errors: [],
    };

    try {
      const createBody = buildVariantBody({ variant, sender, groupId: safetyGroupId });
      const createdPayload = await requestJson({
        options,
        key: credential.key,
        path: '/campaigns',
        method: 'POST',
        body: createBody.body,
        form: createBody.form,
      });
      apiCalled = true;
      const created = campaignFromPayload(createdPayload);
      const campaignId = campaignIdFor(created);
      receipt.created = Boolean(campaignId);
      receipt.campaignIdSha256 = campaignId ? sha256(campaignId) : null;
      receipt.createStatus = created?.status ?? null;

      const createdDetail = campaignId ? await fetchCampaignDetail({ options, key: credential.key, id: campaignId }) : created;
      const evaluation = evaluateNullAudienceCampaign({
        campaign: createdDetail,
        groupId: safetyGroupId,
        groupActiveCount: safetyGroupActiveCount,
      });
      receipt.nullAudienceSafe = {
        ok: evaluation.nullAudienceSafe,
        failed: evaluation.failed,
        observed: evaluation.redactedObserved,
      };
      receipt._campaignIdForCleanup = campaignId;
    } catch (error) {
      receipt.errors.push({
        phase: receipt.created ? 'inspect' : 'create',
        reason: error?.reason || error?.message || 'mailerlite_null_audience_lab_variant_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    } finally {
      if (receipt._campaignIdForCleanup) {
        try {
          await requestJson({
            options,
            key: credential.key,
            path: `/campaigns/${receipt._campaignIdForCleanup}`,
            method: 'DELETE',
          });
          receipt.deleted = true;
          const postDelete = await fetchCampaignStatusOrGone({
            options,
            key: credential.key,
            id: receipt._campaignIdForCleanup,
          });
          receipt.goneAfterDelete = postDelete.found === false;
        } catch (error) {
          receipt.errors.push({
            phase: 'delete_or_post_delete_scan',
            reason: error?.reason || error?.message || 'mailerlite_null_audience_lab_cleanup_failed',
            status: error?.status ?? null,
            details: Array.isArray(error?.details) ? error.details : [],
          });
        }
      }
      delete receipt._campaignIdForCleanup;
    }

    variantReceipts.push(receipt);
    errors.push(...receipt.errors.map((error) => ({
      variantId: variant.id,
      ...error,
    })));
    if (receipt.campaignIdSha256 && (!receipt.deleted || !receipt.goneAfterDelete)) break;
  }

  const createdCount = variantReceipts.filter((variant) => variant.created).length;
  const deletedCount = variantReceipts.filter((variant) => variant.deleted).length;
  const goneCount = variantReceipts.filter((variant) => variant.goneAfterDelete).length;
  const safeNullAudienceVariantCount = variantReceipts.filter((variant) =>
    variant.nullAudienceSafe?.ok === true,
  ).length;
  const cleanupComplete = createdCount === deletedCount && createdCount === goneCount;
  const ok = cleanupComplete && variantReceipts.length === variants.length && errors.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'execute_requested',
    generatedAt,
    ok,
    status: ok
      ? safeNullAudienceVariantCount > 0
        ? 'mailerlite_api_null_audience_lab_completed_null_audience_recipe_found_no_sends'
        : 'mailerlite_api_null_audience_lab_completed_no_safe_null_audience_recipe_no_sends'
      : cleanupComplete
        ? 'mailerlite_api_null_audience_lab_completed_with_variant_errors_no_sends'
        : 'mailerlite_api_null_audience_lab_cleanup_incomplete_stop_required',
    executiveSummary: {
      purpose: 'prove_an_api_heavy_null_audience_draft_recipe_for_frequent_launches',
      approvalMatched,
      safetyGroupName: SAFETY_GROUP_NAME,
      safetyGroupActiveCountRequired: 0,
      safetyGroupExistedBeforeLab: safetyGroupsCreated === 0,
      safetyGroupCreatedByLab: safetyGroupsCreated === 1,
      safetyGroupActiveCountObserved: safetyGroupActiveCount,
      safetyGroupIdPresent: Boolean(safetyGroupId),
      variantCount: variants.length,
      variantRunCount: variantReceipts.length,
      safeNullAudienceVariantCount,
      createdCount,
      deletedCount,
      goneCount,
      cleanupComplete,
      errorCount: errors.length,
      readyToUseNullAudienceRecipeForRealDrafts: safeNullAudienceVariantCount > 0 && cleanupComplete,
      nextBestMove: safeNullAudienceVariantCount > 0 && cleanupComplete
        ? 'Prepare a separate exact approval packet for API-created real launch drafts assigned first to the empty Null Audience safety group.'
        : 'Do not use the Null Audience API campaign creation route for real launch drafts until the lab proves exclusive empty-group assignment.',
    },
    decision: {
      approval: { provided: true, status: 'exact_approval_phrase_matched' },
      canExecute: false,
      exactApprovalPhrasePrintedByConsole: false,
    },
    credential: {
      service: options.service,
      account: options.account,
      credentialPresent: true,
      credentialSource: 'configured_not_printed',
    },
    safetyGroup: {
      name: SAFETY_GROUP_NAME,
      idSha256: sha256(safetyGroupId),
      idPrinted: false,
      activeCountObserved: safetyGroupActiveCount,
      createdByLab: safetyGroupsCreated === 1,
    },
    sourceCampaign: {
      step: options.sourceStep,
      idSha256: sha256(sourceCampaignId),
      idPrinted: false,
      senderValuesPrinted: false,
    },
    variants: variantReceipts,
    errors,
    sourceDigests: [
      sourceDigest(options.realMailerLiteRenderQa, realQaRaw, 'source campaign IDs only; sender values read by API but not printed'),
    ],
    safety: buildSafety({
      execute: true,
      apiCalled,
      groupsRead,
      safetyGroupsCreated,
      created: createdCount,
      deleted: deletedCount,
    }),
  };
};

const buildRun = async (options) => {
  const generatedAt = new Date().toISOString();
  const realQaRaw = await readText(options.realMailerLiteRenderQa);
  const realQa = JSON.parse(realQaRaw);
  if (!options.execute) {
    return buildDryRunPacket({ realQa, realQaRaw, options, generatedAt });
  }
  return executeLab({ realQa, realQaRaw, options, generatedAt });
};

const renderMarkdown = (run) => [
  '# MailerLite API Null Audience Lab',
  '',
  `- Generated: ${run.generatedAt}`,
  `- Mode: ${run.mode}`,
  `- Status: ${run.status}`,
  `- OK: ${run.ok}`,
  `- Purpose: ${run.executiveSummary?.purpose ?? 'unknown'}`,
  `- Safety group: ${run.executiveSummary?.safetyGroupName ?? SAFETY_GROUP_NAME}`,
  `- Safety group active count required/observed: ${run.executiveSummary?.safetyGroupActiveCountRequired ?? 0}/${run.executiveSummary?.safetyGroupActiveCountObserved ?? 'not_run'}`,
  `- Variant count: ${run.executiveSummary?.variantCount ?? run.variants?.length ?? 0}`,
  `- Safe Null Audience variant count: ${run.executiveSummary?.safeNullAudienceVariantCount ?? 0}`,
  `- Created/deleted/gone: ${run.executiveSummary?.createdCount ?? 0}/${run.executiveSummary?.deletedCount ?? 0}/${run.executiveSummary?.goneCount ?? 0}`,
  `- Cleanup complete: ${run.executiveSummary?.cleanupComplete ?? false}`,
  `- Ready to use recipe for real drafts: ${run.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts ?? false}`,
  `- Exact approval phrase available: ${run.executiveSummary?.exactApprovalPhraseAvailable ?? false}`,
  `- Exact approval phrase printed by console: ${run.decision?.exactApprovalPhrasePrintedByConsole ?? false}`,
  '',
  '## Variants',
  '',
  ...((run.variants ?? []).flatMap((variant) => [
    `### ${variant.id}`,
    '',
    `- Label: ${variant.label ?? 'unknown'}`,
    `- Request shape: ${variant.requestShape ?? 'not_run'}`,
    `- Audience fields: ${(variant.audienceFields ?? []).join(', ') || 'none'}`,
    `- Created/deleted/gone: ${variant.created ?? false}/${variant.deleted ?? false}/${variant.goneAfterDelete ?? false}`,
    `- Null Audience safe: ${variant.nullAudienceSafe?.ok ?? 'not_run'}`,
    `- Failed checks: ${variant.nullAudienceSafe?.failed?.join(', ') || 'none'}`,
    `- Error count: ${variant.errors?.length ?? 0}`,
    '',
  ])),
  '## Approval Boundary',
  '',
  `- Packet is approval by itself: ${run.decision?.packetIsApprovalByItself ?? false}`,
  `- Can execute now without exact phrase: ${run.decision?.canExecute ?? false}`,
  ...(run.decision?.exactApprovalPhrase ? [
    '',
    'Exact approval phrase:',
    '',
    '```text',
    run.decision.exactApprovalPhrase,
    '```',
  ] : []),
  '',
  '## Blockers',
  '',
  ...((run.blockers ?? []).length ? run.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety?.mailerLiteApiCalled}`,
  `- MailerLite safety groups created: ${run.safety?.mailerLiteSafetyGroupsCreated}`,
  `- MailerLite draft campaigns created/deleted: ${run.safety?.mailerLiteDraftsCreated}/${run.safety?.mailerLiteDraftsDeleted}`,
  `- MailerLite mutations performed: ${run.safety?.mailerLiteMutationsPerformed}`,
  `- Original/real launch drafts edited or deleted: ${run.safety?.originalDraftsEditedOrDeleted || run.safety?.realLaunchDraftsCreatedOrEdited}`,
  `- Real campaign audience assignments performed: ${run.safety?.realCampaignAudienceAssignmentsPerformed}`,
  `- Sends/publish/schedule: ${run.safety?.sendsPerformed}/${run.safety?.campaignsPublished}/${run.safety?.campaignsScheduled}`,
  `- Subscribers read/mutated: ${run.safety?.subscribersRead}/${run.safety?.subscriberMutationsPerformed}`,
  `- Additional groups/segments/workflows mutated: ${run.safety?.additionalGroupsCreatedOrAssigned || run.safety?.segmentsCreatedOrAssigned || run.safety?.workflowMutationsPerformed}`,
  `- Shopify/CRM/Fact Store touched: ${run.safety?.shopifyMutationsPerformed || run.safety?.crmLiveApiCalled || run.safety?.factStoreWritePerformed}`,
  `- IDs/sender values/tokens printed: ${run.safety?.safetyGroupIdPrinted || run.safety?.senderValuesPrinted}/${run.safety?.tokensPrinted}`,
  '',
].join('\n');

const writeOutputs = async (run, options) => {
  await mkdir(dirname(resolve(options.out)), { recursive: true });
  await writeFile(resolve(options.out), `${JSON.stringify(run, null, 2)}\n`, 'utf8');
  if (options.markdownOut) {
    await mkdir(dirname(resolve(options.markdownOut)), { recursive: true });
    await writeFile(resolve(options.markdownOut), `${renderMarkdown(run)}\n`, 'utf8');
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const run = await buildRun(options);
  await writeOutputs(run, options);

  console.log(JSON.stringify({
    ok: run.ok,
    status: run.status,
    mode: run.mode,
    safetyGroupName: SAFETY_GROUP_NAME,
    safetyGroupActiveCountObserved: run.executiveSummary?.safetyGroupActiveCountObserved ?? null,
    variantCount: run.executiveSummary?.variantCount ?? null,
    safeNullAudienceVariantCount: run.executiveSummary?.safeNullAudienceVariantCount ?? null,
    readyToUseNullAudienceRecipeForRealDrafts: run.executiveSummary?.readyToUseNullAudienceRecipeForRealDrafts ?? null,
    exactApprovalPhraseAvailable: run.executiveSummary?.exactApprovalPhraseAvailable ?? null,
    canExecuteNow: run.executiveSummary?.canExecuteNow ?? false,
    blockerCount: run.executiveSummary?.blockerCount ?? 0,
    out: resolve(options.out),
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: run.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite API Null Audience lab failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  SAFETY_GROUP_NAME,
  buildDryRunPacket,
  buildExactApprovalPhrase,
  buildFormBody,
  buildJsonBody,
  buildSafety,
  buildVariantPlans,
  evaluateNullAudienceCampaign,
  parseArgs,
  renderMarkdown,
};
