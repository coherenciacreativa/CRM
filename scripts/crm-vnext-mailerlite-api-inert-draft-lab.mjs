#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-api-inert-draft-lab-2026-05-31';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-api-inert-draft-lab.mjs [options]

Options:
  --real-mailerlite-render-qa <path> Source campaign IDs for sender identity. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --source-step <n>                  Existing safe draft step used only to read sender identity during execute. Defaults to 1.
  --execute                          Create/inspect/delete disposable lab drafts after exact approval.
  --approval-phrase <text>           Exact approval phrase required with --execute.
  --service <name>                   Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                   Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                   MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                   Per-request timeout. Defaults to 30000.
  --out <path>                       Write JSON lab packet/receipt. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>              Write Markdown lab packet/receipt. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                             Show this help

Local-first MailerLite API laboratory for discovering a reliable recipe to
create truly inert disposable draft campaigns. Dry-run mode is local-only and
prints no secrets. Execute mode creates only disposable [LAB NO SEND] draft
campaigns, inspects their metadata, then deletes everything it created. It
never sends, publishes, schedules, attaches workflows, reads subscribers,
creates or assigns real groups/segments, touches Shopify/CRM, appends ledgers,
writes cards/scoring, touches Fact Store, prints tokens, or prints sender
values.`;

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

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const buildExactApprovalPhrase = () =>
  'Apruebo ejecutar el laboratorio API de MailerLite para crear, inspeccionar y borrar únicamente campañas borrador desechables con prefijo [LAB NO SEND] para descubrir una receta de borrador inerte, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos o segmentos reales, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; borrar todo lo creado al final y generar recibo local.';

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
const readJson = async (path) => JSON.parse(await readText(path));

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
  secretsPrinted: false,
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
  if (status === 404) return 'mailerlite_campaign_not_found';
  if (status === 410) return 'mailerlite_campaign_gone';
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
      'User-Agent': 'CRM-vNext-MailerLite-API-Inert-Draft-Lab/1.0',
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
  '<p>MailerLite API inert draft laboratory.</p>',
  `<p>Variant: ${variantId}</p>`,
  '<p>Do not send. Disposable campaign for API safety testing only.</p>',
  '</body>',
  '</html>',
].join('');

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

const buildJsonBody = ({ name, subject, fromName, fromEmail, replyTo, content, languageId = null, audience = null }) => {
  const body = {
    name,
    type: 'regular',
    emails: [{
      subject,
      from_name: fromName,
      from: fromEmail,
      content,
    }],
  };
  if (replyTo) body.emails[0].reply_to = replyTo;
  if (languageId) body.language_id = languageId;
  if (audience) Object.assign(body, audience);
  return body;
};

const buildVariantPlans = ({ runId = 'dry-run' } = {}) => [
  {
    id: 'form_minimal_no_audience_fields',
    label: 'Form POST, no audience fields',
    hypothesis: 'Reproduce the prior API replacement behavior and confirm whether form POST alone creates a basic filter.',
    requestShape: 'form_urlencoded',
    audienceFields: [],
    updateAfterCreate: false,
    disposableName: `[LAB NO SEND] MailerLite inert draft lab ${runId} · form minimal`,
  },
  {
    id: 'json_minimal_no_audience_fields',
    label: 'JSON POST, no audience fields',
    hypothesis: 'Check whether JSON body semantics differ from form POST for recipient/filter defaults.',
    requestShape: 'json',
    audienceFields: [],
    updateAfterCreate: false,
    disposableName: `[LAB NO SEND] MailerLite inert draft lab ${runId} · json minimal`,
  },
  {
    id: 'json_empty_audience_arrays',
    label: 'JSON POST, explicit empty audience arrays',
    hypothesis: 'Check whether explicit empty groups/segments arrays preserve missing recipients instead of a basic filter.',
    requestShape: 'json',
    audienceFields: ['groups:empty_array', 'segments:empty_array'],
    updateAfterCreate: false,
    disposableName: `[LAB NO SEND] MailerLite inert draft lab ${runId} · json empty audience`,
  },
  {
    id: 'form_minimal_then_put_empty_audience_arrays',
    label: 'Form POST then JSON PUT empty audience arrays',
    hypothesis: 'Check whether a newly created disposable draft can be neutralized by an immediate update with empty audience arrays.',
    requestShape: 'form_then_json_put',
    audienceFields: ['put_groups:empty_array', 'put_segments:empty_array'],
    updateAfterCreate: true,
    disposableName: `[LAB NO SEND] MailerLite inert draft lab ${runId} · form then put empty audience`,
  },
];

const buildVariantBody = ({ variant, sender }) => {
  const subject = `[LAB NO SEND] MailerLite inert draft lab ${variant.id}`;
  const content = labContent(variant.id);
  if (variant.requestShape === 'json' || variant.requestShape === 'form_then_json_put') {
    const audience = variant.audienceFields.includes('groups:empty_array') || variant.audienceFields.includes('segments:empty_array')
      ? { groups: [], segments: [] }
      : null;
    return {
      body: buildJsonBody({
        name: variant.disposableName,
        subject,
        fromName: sender.fromName,
        fromEmail: sender.fromEmail,
        replyTo: sender.replyTo,
        content,
        languageId: sender.languageId,
        audience,
      }),
      form: false,
    };
  }

  return {
    body: buildFormBody({
      name: variant.disposableName,
      subject,
      fromName: sender.fromName,
      fromEmail: sender.fromEmail,
      replyTo: sender.replyTo,
      content,
      languageId: sender.languageId,
    }),
    form: true,
  };
};

const buildVariantUpdateBody = ({ variant, sender }) => ({
  body: buildJsonBody({
    name: variant.disposableName,
    subject: `[LAB NO SEND] MailerLite inert draft lab ${variant.id}`,
    fromName: sender.fromName,
    fromEmail: sender.fromEmail,
    replyTo: sender.replyTo,
    content: labContent(variant.id),
    languageId: sender.languageId,
    audience: { groups: [], segments: [] },
  }),
  form: false,
});

const filterStateFor = (campaign) => {
  const filter = campaign?.filter;
  if (filter === null || filter === undefined) return 'null_or_absent';
  if (Array.isArray(filter)) return `array:${filter.length}`;
  return typeof filter;
};

const evaluateCampaignInertness = (campaign) => {
  const missingData = Array.isArray(campaign?.missing_data) ? campaign.missing_data : [];
  const warnings = Array.isArray(campaign?.warnings) ? campaign.warnings : [];
  const checks = [
    { id: 'campaign_exists', ok: Boolean(campaignIdFor(campaign)), observed: Boolean(campaignIdFor(campaign)) },
    { id: 'campaign_is_draft', ok: campaign?.status === 'draft', observed: campaign?.status ?? null },
    { id: 'campaign_type_regular', ok: campaign?.type === 'regular', observed: campaign?.type ?? null },
    { id: 'filter_absent_or_null', ok: campaign?.filter == null, observed: filterStateFor(campaign) },
    { id: 'no_basic_filter', ok: campaign?.has_basic_filter === false, observed: campaign?.has_basic_filter ?? null },
    { id: 'recipients_missing', ok: missingData.includes('recipients'), observed: missingData },
    { id: 'cannot_schedule_without_recipients', ok: campaign?.can_be_scheduled === false, observed: campaign?.can_be_scheduled ?? null },
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
    inert: checks.every((check) => check.ok),
    failed: checks.filter((check) => !check.ok).map((check) => check.id),
    redactedObserved: {
      status: campaign?.status ?? null,
      type: campaign?.type ?? null,
      filterState: filterStateFor(campaign),
      hasBasicFilter: campaign?.has_basic_filter ?? null,
      canBeScheduled: campaign?.can_be_scheduled ?? null,
      missingData,
      scheduledFor: campaign?.scheduled_for ?? null,
      queuedAt: campaign?.queued_at ?? null,
      startedAt: campaign?.started_at ?? null,
      finishedAt: campaign?.finished_at ?? null,
      usedInAutomations: campaign?.used_in_automations ?? null,
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
      id,
      name: campaignNameFor(campaign),
      status: campaign?.status ?? null,
      reason: null,
    };
  } catch (error) {
    if (error?.reason === 'mailerlite_campaign_not_found' || error?.reason === 'mailerlite_campaign_gone') {
      return {
        found: false,
        id,
        name: null,
        status: 'gone',
        reason: error.reason,
      };
    }
    throw error;
  }
};

const buildSafety = ({ execute, apiCalled = false, created = 0, deleted = 0 }) => ({
  localOnly: !execute,
  reportsOnly: !execute,
  mode: execute ? 'execute_disposable_mailerlite_api_lab' : 'dry_run_packet_only',
  mailerLiteApiCalled: apiCalled,
  mailerLiteDraftsCreated: created,
  mailerLiteDraftsDeleted: deleted,
  mailerLiteMutationsPerformed: execute && (created > 0 || deleted > 0),
  allowedMutationType: execute && (created > 0 || deleted > 0)
    ? 'create_inspect_delete_disposable_lab_draft_campaigns_only'
    : null,
  disposableOnly: true,
  originalDraftsEditedOrDeleted: false,
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
      ? 'mailerlite_api_inert_draft_lab_packet_ready_for_exact_human_approval_no_live_changes'
      : 'mailerlite_api_inert_draft_lab_packet_blocked_no_live_changes',
    launch: realQa?.launch ?? null,
    executiveSummary: {
      purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
      variantCount: variants.length,
      sourceCampaignStep: options.sourceStep,
      sourceCampaignIdPresent: Boolean(sourceCampaignId),
      disposableDraftPrefix: '[LAB NO SEND]',
      exactApprovalPhraseAvailable: blockers.length === 0,
      canExecuteNow: false,
      packetIsApprovalByItself: false,
      blockerCount: blockers.length,
      nextBestMove: blockers.length === 0
        ? 'Ask Alejandro for the exact lab approval phrase before creating disposable MailerLite API test drafts.'
        : 'Resolve local source campaign evidence before asking for lab approval.',
    },
    decision: {
      packetIsApprovalByItself: false,
      canExecuteNow: false,
      exactApprovalPhrase: blockers.length === 0 ? buildExactApprovalPhrase() : null,
      exactApprovalPhrasePrintedByConsole: false,
    },
    approvalBoundary: {
      allowedAfterExactApproval: [
        'read one existing draft by ID only to reuse sender identity without printing values',
        'create only disposable MailerLite draft campaigns prefixed [LAB NO SEND]',
        'inspect each disposable draft by API',
        'delete every disposable draft created by the lab',
        'write a local receipt with hashes/counts/booleans only',
      ],
      stillClosedEvenAfterApproval: [
        'editing_existing_mini_launch_drafts',
        'creating_real_launch_replacement_drafts',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'publish_or_schedule_campaign',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'real_group_or_segment_creation_or_assignment',
        'shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'fresh source real MailerLite render QA with source campaign ID',
        'exact approval phrase unchanged',
        'Keychain MailerLite credential available without printing token',
      ],
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
      updateAfterCreate: variant.updateAfterCreate,
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

const executeLab = async ({ realQa, realQaRaw, options, generatedAt }) => {
  const expectedPhrase = buildExactApprovalPhrase();
  const approvalMatched = normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(expectedPhrase);
  const sourceCampaignId = campaignIdForStep(realQa, options.sourceStep);
  const blockers = [];
  if (!approvalMatched) blockers.push(cleanString(options.approvalPhrase) ? 'blocked_approval_phrase_mismatch' : 'blocked_missing_exact_approval_phrase');
  if (!sourceCampaignId) blockers.push(`source_campaign_id_missing_for_step_${options.sourceStep}`);

  if (blockers.length > 0) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'execute_requested',
      generatedAt,
      ok: false,
      status: 'mailerlite_api_inert_draft_lab_blocked_before_api_call',
      executiveSummary: {
        purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
        approvalMatched,
        variantCount: buildVariantPlans().length,
        inertVariantCount: 0,
        createdCount: 0,
        deletedCount: 0,
        goneCount: 0,
        blockerCount: blockers.length,
      },
      decision: {
        approval: {
          provided: Boolean(cleanString(options.approvalPhrase)),
          status: approvalMatched ? 'exact_approval_phrase_matched' : blockers[0],
        },
        canExecute: false,
        exactApprovalPhrasePrintedByConsole: false,
      },
      sourceDigests: [
        sourceDigest(options.realMailerLiteRenderQa, realQaRaw, 'source campaign IDs only; no API call made before approval/source blockers closed'),
      ],
      variants: buildVariantPlans().map((variant) => ({ id: variant.id, label: variant.label, skipped: true })),
      blockers,
      errors: [],
      safety: buildSafety({ execute: true, apiCalled: false }),
    };
  }

  const credential = await getCredential(options);
  if (!credential?.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'execute_requested',
      generatedAt,
      ok: false,
      status: 'mailerlite_api_inert_draft_lab_blocked_missing_mailerlite_credential',
      executiveSummary: {
        purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
        approvalMatched,
        variantCount: buildVariantPlans().length,
        inertVariantCount: 0,
        createdCount: 0,
        deletedCount: 0,
        goneCount: 0,
        blockerCount: 1,
      },
      decision: {
        approval: { provided: true, status: 'exact_approval_phrase_matched' },
        canExecute: false,
        exactApprovalPhrasePrintedByConsole: false,
      },
      credential: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      variants: buildVariantPlans().map((variant) => ({ id: variant.id, label: variant.label, skipped: true })),
      blockers: ['blocked_missing_mailerlite_credential'],
      errors: [],
      safety: buildSafety({ execute: true, apiCalled: false }),
    };
  }

  const runId = new Date(generatedAt).toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  const variants = buildVariantPlans({ runId });
  const errors = [];
  const variantReceipts = [];
  let apiCalled = false;

  let sourceDetail = null;
  try {
    sourceDetail = await fetchCampaignDetail({ options, key: credential.key, id: sourceCampaignId });
    apiCalled = true;
  } catch (error) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'execute_requested',
      generatedAt,
      ok: false,
      status: 'mailerlite_api_inert_draft_lab_source_fetch_failed_no_mutation',
      executiveSummary: {
        purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
        approvalMatched,
        variantCount: variants.length,
        inertVariantCount: 0,
        createdCount: 0,
        deletedCount: 0,
        goneCount: 0,
        blockerCount: 1,
      },
      decision: {
        approval: { provided: true, status: 'exact_approval_phrase_matched' },
        canExecute: false,
        exactApprovalPhrasePrintedByConsole: false,
      },
      sourceCampaign: {
        step: options.sourceStep,
        idSha256: sha256(sourceCampaignId),
        idPrinted: false,
        senderValuesPrinted: false,
      },
      variants: variants.map((variant) => ({ id: variant.id, label: variant.label, skipped: true })),
      blockers: ['source_campaign_fetch_failed'],
      errors: [{
        phase: 'source_campaign_fetch',
        reason: error?.reason || error?.message || 'mailerlite_source_campaign_fetch_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      }],
      safety: buildSafety({ execute: true, apiCalled }),
    };
  }

  const sender = safeSenderIdentity(sourceDetail);
  if (!sender.fromName || !sender.fromEmail) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'execute_requested',
      generatedAt,
      ok: false,
      status: 'mailerlite_api_inert_draft_lab_blocked_missing_sender_identity_no_mutation',
      executiveSummary: {
        purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
        approvalMatched,
        variantCount: variants.length,
        inertVariantCount: 0,
        createdCount: 0,
        deletedCount: 0,
        goneCount: 0,
        blockerCount: 1,
      },
      decision: {
        approval: { provided: true, status: 'exact_approval_phrase_matched' },
        canExecute: false,
        exactApprovalPhrasePrintedByConsole: false,
      },
      sourceCampaign: {
        step: options.sourceStep,
        idSha256: sha256(sourceCampaignId),
        idPrinted: false,
        senderValuesPrinted: false,
      },
      variants: variants.map((variant) => ({ id: variant.id, label: variant.label, skipped: true })),
      blockers: ['source_sender_identity_missing'],
      errors: [],
      safety: buildSafety({ execute: true, apiCalled }),
    };
  }

  for (const variant of variants) {
    const receipt = {
      id: variant.id,
      label: variant.label,
      hypothesis: variant.hypothesis,
      requestShape: variant.requestShape,
      audienceFields: variant.audienceFields,
      updateAfterCreate: variant.updateAfterCreate,
      disposableNameSha256: sha256(variant.disposableName),
      disposableNamePrinted: false,
      created: false,
      campaignId: null,
      campaignIdPrinted: false,
      createStatus: null,
      updateAttempted: false,
      updateStatus: null,
      inertAfterCreate: null,
      inertAfterUpdate: null,
      deleted: false,
      goneAfterDelete: false,
      errors: [],
    };

    try {
      const createBody = variant.requestShape === 'form_then_json_put'
        ? buildVariantBody({ variant: { ...variant, requestShape: 'form_urlencoded' }, sender })
        : buildVariantBody({ variant, sender });
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
      receipt.campaignId = campaignId;
      receipt.createStatus = created?.status ?? null;

      const createdDetail = campaignId ? await fetchCampaignDetail({ options, key: credential.key, id: campaignId }) : created;
      const createdEvaluation = evaluateCampaignInertness(createdDetail);
      receipt.inertAfterCreate = {
        inert: createdEvaluation.inert,
        failed: createdEvaluation.failed,
        observed: createdEvaluation.redactedObserved,
      };

      if (campaignId && variant.updateAfterCreate) {
        receipt.updateAttempted = true;
        const updateBody = buildVariantUpdateBody({ variant, sender });
        const updatedPayload = await requestJson({
          options,
          key: credential.key,
          path: `/campaigns/${campaignId}`,
          method: 'PUT',
          body: updateBody.body,
          form: updateBody.form,
        });
        receipt.updateStatus = campaignFromPayload(updatedPayload)?.status ?? 'completed';
        const updatedDetail = await fetchCampaignDetail({ options, key: credential.key, id: campaignId });
        const updatedEvaluation = evaluateCampaignInertness(updatedDetail);
        receipt.inertAfterUpdate = {
          inert: updatedEvaluation.inert,
          failed: updatedEvaluation.failed,
          observed: updatedEvaluation.redactedObserved,
        };
      }
    } catch (error) {
      receipt.errors.push({
        phase: receipt.created ? 'inspect_or_update' : 'create',
        reason: error?.reason || error?.message || 'mailerlite_lab_variant_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    } finally {
      if (receipt.campaignId) {
        try {
          await requestJson({
            options,
            key: credential.key,
            path: `/campaigns/${receipt.campaignId}`,
            method: 'DELETE',
          });
          receipt.deleted = true;
          const postDelete = await fetchCampaignStatusOrGone({ options, key: credential.key, id: receipt.campaignId });
          receipt.goneAfterDelete = postDelete.found === false;
        } catch (error) {
          receipt.errors.push({
            phase: 'delete_or_post_delete_scan',
            reason: error?.reason || error?.message || 'mailerlite_lab_cleanup_failed',
            status: error?.status ?? null,
            details: Array.isArray(error?.details) ? error.details : [],
          });
        }
      }
    }

    variantReceipts.push(receipt);
    errors.push(...receipt.errors.map((error) => ({
      variantId: variant.id,
      ...error,
    })));
    if (receipt.campaignId && (!receipt.deleted || !receipt.goneAfterDelete)) break;
  }

  const createdCount = variantReceipts.filter((variant) => variant.created).length;
  const deletedCount = variantReceipts.filter((variant) => variant.deleted).length;
  const goneCount = variantReceipts.filter((variant) => variant.goneAfterDelete).length;
  const inertVariantCount = variantReceipts.filter((variant) =>
    variant.inertAfterUpdate?.inert === true || variant.inertAfterCreate?.inert === true,
  ).length;
  const cleanupComplete = createdCount === deletedCount && createdCount === goneCount;
  const ok = errors.length === 0 && cleanupComplete && variantReceipts.length === variants.length;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'execute_requested',
    generatedAt,
    ok,
    status: ok
      ? inertVariantCount > 0
        ? 'mailerlite_api_inert_draft_lab_completed_inert_recipe_found_no_sends'
        : 'mailerlite_api_inert_draft_lab_completed_no_inert_recipe_found_no_sends'
      : cleanupComplete
        ? 'mailerlite_api_inert_draft_lab_completed_with_variant_errors_no_sends'
        : 'mailerlite_api_inert_draft_lab_cleanup_incomplete_stop_required',
    executiveSummary: {
      purpose: 'discover_safe_api_recipe_for_truly_inert_mailerlite_drafts',
      approvalMatched,
      variantCount: variants.length,
      variantRunCount: variantReceipts.length,
      inertVariantCount,
      createdCount,
      deletedCount,
      goneCount,
      cleanupComplete,
      errorCount: errors.length,
      readyToUseApiRecipeForRealDrafts: false,
      nextBestMove: inertVariantCount > 0 && cleanupComplete
        ? 'Prepare a separate exact approval packet for using the successful inert API recipe on real mini-launch drafts.'
        : 'Do not use API campaign creation for real mini-launch drafts until a safe inert recipe is found.',
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
  '# MailerLite API Inert Draft Lab',
  '',
  `- Generated: ${run.generatedAt}`,
  `- Mode: ${run.mode}`,
  `- Status: ${run.status}`,
  `- OK: ${run.ok}`,
  `- Purpose: ${run.executiveSummary?.purpose ?? 'unknown'}`,
  `- Variant count: ${run.executiveSummary?.variantCount ?? run.variants?.length ?? 0}`,
  `- Inert variant count: ${run.executiveSummary?.inertVariantCount ?? 0}`,
  `- Created/deleted/gone: ${run.executiveSummary?.createdCount ?? 0}/${run.executiveSummary?.deletedCount ?? 0}/${run.executiveSummary?.goneCount ?? 0}`,
  `- Cleanup complete: ${run.executiveSummary?.cleanupComplete ?? false}`,
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
    `- Inert after create: ${variant.inertAfterCreate?.inert ?? 'not_run'}`,
    `- Inert after update: ${variant.inertAfterUpdate?.inert ?? 'not_run'}`,
    `- Create failed checks: ${variant.inertAfterCreate?.failed?.join(', ') || 'none'}`,
    `- Update failed checks: ${variant.inertAfterUpdate?.failed?.join(', ') || 'none'}`,
    `- Error count: ${variant.errors?.length ?? 0}`,
    '',
  ])),
  '## Blockers',
  '',
  ...((run.blockers ?? []).length ? run.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Errors',
  '',
  ...((run.errors ?? []).length ? run.errors.map((error) => `- ${error.variantId ?? error.phase}: ${error.reason}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- MailerLite drafts created/deleted: ${run.safety.mailerLiteDraftsCreated}/${run.safety.mailerLiteDraftsDeleted}`,
  `- Original drafts edited/deleted: ${run.safety.originalDraftsEditedOrDeleted}`,
  `- Sends performed: ${run.safety.sendsPerformed}`,
  `- Campaigns published/scheduled: ${run.safety.campaignsPublished}/${run.safety.campaignsScheduled}`,
  `- Subscribers read/mutated: ${run.safety.subscribersRead}/${run.safety.subscriberMutationsPerformed}`,
  `- Groups/segments/workflows mutated: ${run.safety.groupsCreatedOrAssigned || run.safety.segmentsCreatedOrAssigned || run.safety.workflowMutationsPerformed}`,
  `- Shopify/CRM/ledgers/cards/scoring/Fact Store closed: ${!run.safety.shopifyMutationsPerformed && !run.safety.crmLiveApiCalled && !run.safety.signalLedgerAppendPerformed && !run.safety.crmCardMutationsPerformed && !run.safety.crmScoreMutationsPerformed && !run.safety.factStoreWritePerformed}`,
  `- Sender values printed: ${run.safety.senderValuesPrinted}`,
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
    variantCount: run.executiveSummary?.variantCount ?? run.variants?.length ?? 0,
    inertVariantCount: run.executiveSummary?.inertVariantCount ?? 0,
    createdCount: run.executiveSummary?.createdCount ?? 0,
    deletedCount: run.executiveSummary?.deletedCount ?? 0,
    goneCount: run.executiveSummary?.goneCount ?? 0,
    errorCount: run.executiveSummary?.errorCount ?? 0,
    exactApprovalPhraseAvailable: run.executiveSummary?.exactApprovalPhraseAvailable ?? false,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: {
      mailerLiteApiCalled: run.safety.mailerLiteApiCalled,
      mailerLiteDraftsCreated: run.safety.mailerLiteDraftsCreated,
      mailerLiteDraftsDeleted: run.safety.mailerLiteDraftsDeleted,
      sendsPerformed: run.safety.sendsPerformed,
      campaignsPublished: run.safety.campaignsPublished,
      campaignsScheduled: run.safety.campaignsScheduled,
      subscribersRead: run.safety.subscribersRead,
      groupsCreatedOrAssigned: run.safety.groupsCreatedOrAssigned,
      workflowMutationsPerformed: run.safety.workflowMutationsPerformed,
      senderValuesPrinted: run.safety.senderValuesPrinted,
      tokensPrinted: run.safety.tokensPrinted,
    },
  }, null, 2));

  if (options.execute && run.status === 'mailerlite_api_inert_draft_lab_cleanup_incomplete_stop_required') {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite API inert draft lab failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDryRunPacket,
  buildExactApprovalPhrase,
  buildFormBody,
  buildJsonBody,
  buildSafety,
  buildVariantPlans,
  evaluateCampaignInertness,
  parseArgs,
  renderMarkdown,
};
