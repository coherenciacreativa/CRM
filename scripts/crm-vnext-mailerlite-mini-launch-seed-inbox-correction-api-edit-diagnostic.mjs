#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-edit-diagnostic-2026-05-31';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json';
const DEFAULT_EXECUTION_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_execution_kit_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_PREVIEW = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic_current_inteligencia_descansar_2026-05-31.md';

const PLACEHOLDERS = [
  'result_or_resource_link_placeholder',
  'practice_link_placeholder',
  'editorial_note_link_placeholder',
];

const EXPECTED_LINK_KEY_BY_STEP = new Map([
  [1, 'result_or_resource_link'],
  [2, 'practice_link'],
  [3, 'editorial_note_link'],
]);

const PLACEHOLDER_BY_LINK_KEY = new Map([
  ['result_or_resource_link', 'result_or_resource_link_placeholder'],
  ['practice_link', 'practice_link_placeholder'],
  ['editorial_note_link', 'editorial_note_link_placeholder'],
]);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-edit-diagnostic.mjs [options]

Options:
  --real-mailerlite-render-qa <path> Latest read-only real MailerLite render QA with campaign IDs. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --execution-kit <path>            UI correction execution kit with corrected HTML paths. Defaults to ${DEFAULT_EXECUTION_KIT}
  --correction-preview <path>       Seed inbox correction preview with URL hashes only. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --service <name>                  Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                  Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                  MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                  Per-request timeout. Defaults to 30000.
  --out <path>                      Write JSON diagnostic. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>             Write Markdown diagnostic. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                            Show this help

Read-only MailerLite API diagnostic for deciding whether the four existing
Inteligencia para descansar drafts can move from UI correction to guarded API
editing. It reads campaign metadata/content by ID and local corrected HTML
evidence, records only booleans/counts/hashes, and never updates campaigns,
sends, schedules, reads subscribers, creates groups/segments, touches Shopify
or CRM, appends ledgers, writes cards/scoring, touches Fact Store, prints
tokens, or prints exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    executionKit: DEFAULT_EXECUTION_KIT,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
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
    else if (arg === '--execution-kit') options.executionKit = argv[++index];
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
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

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
  exactUrlsStoredInReport: false,
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

const requestJson = async ({ options, key, path }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(`${options.apiBase}${path.startsWith('/') ? path : `/${path}`}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Seed-Inbox-Correction-API-Edit-Diagnostic/1.0',
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
    return payload?.data && typeof payload.data === 'object' ? payload.data : payload;
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

const campaignIdFor = (campaign) => cleanString(campaign?.id) ?? cleanString(campaign?.campaign_id);
const campaignNameFor = (campaign) => cleanString(campaign?.name) ?? cleanString(campaign?.title);
const emailForCampaign = (campaign) => Array.isArray(campaign?.emails) ? campaign.emails[0] ?? {} : {};

const htmlStats = (html) => {
  const value = String(html ?? '');
  const placeholderCounts = Object.fromEntries(
    PLACEHOLDERS.map((placeholder) => [
      placeholder,
      value.split(placeholder).length - 1,
    ]),
  );
  const urlHashes = [...value.matchAll(/https?:\/\/[^"'<>\s)]+/giu)]
    .map((match) => match[0].replace(/&amp;/g, '&').replace(/[.,;]+$/u, ''))
    .filter(Boolean)
    .map((url) => sha256(url));
  return {
    chars: value.length,
    nonEmpty: value.length > 0,
    placeholderCounts,
    totalPlaceholderCount: Object.values(placeholderCounts).reduce((sum, count) => sum + count, 0),
    urlHashCount: urlHashes.length,
    urlHashesUniqueCount: new Set(urlHashes).size,
    urlHashes,
  };
};

const linkHashesFromCorrectionPreview = (correctionPreview) => {
  const hashesByKey = correctionPreview?.executiveSummary?.finalPublicUrlHashesByKey ?? {};
  return new Map(Object.entries(hashesByKey)
    .map(([key, value]) => [cleanString(key), cleanString(value)])
    .filter(([key, value]) => key && value));
};

const targetLinksByKey = (receipt) => {
  const rows = Array.isArray(receipt?.targetLinks)
    ? receipt.targetLinks
    : Object.values(receipt?.targetLinks ?? {});
  return new Map(rows
    .map((row) => [cleanString(row?.key), cleanString(row?.url)])
    .filter(([key, url]) => key && url));
};

const replaceExactPlaceholder = ({ content, placeholder, url }) => {
  if (typeof content !== 'string' || !placeholder || !url) {
    return { content, replacementCount: 0 };
  }
  const parts = content.split(placeholder);
  return {
    content: parts.join(url),
    replacementCount: Math.max(0, parts.length - 1),
  };
};

const safetyForCampaign = (campaign) => {
  const missingData = Array.isArray(campaign?.missing_data) ? campaign.missing_data : [];
  const warnings = Array.isArray(campaign?.warnings) ? campaign.warnings : [];
  const filter = campaign?.filter;
  const checks = [
    { id: 'campaign_exists', ok: Boolean(campaignIdFor(campaign)), observed: Boolean(campaignIdFor(campaign)) },
    { id: 'campaign_is_draft', ok: campaign?.status === 'draft', observed: campaign?.status ?? null },
    { id: 'campaign_type_regular', ok: campaign?.type === 'regular', observed: campaign?.type ?? null },
    { id: 'not_scheduled', ok: campaign?.scheduled_for == null, observed: campaign?.scheduled_for ?? null },
    { id: 'not_queued', ok: campaign?.queued_at == null, observed: campaign?.queued_at ?? null },
    { id: 'not_started', ok: campaign?.started_at == null, observed: campaign?.started_at ?? null },
    { id: 'not_finished', ok: campaign?.finished_at == null, observed: campaign?.finished_at ?? null },
    { id: 'not_currently_sending', ok: campaign?.is_currently_sending_out === false, observed: campaign?.is_currently_sending_out ?? null },
    { id: 'not_used_in_automations', ok: campaign?.used_in_automations === false, observed: campaign?.used_in_automations ?? null },
    { id: 'filter_absent_or_null', ok: filter == null, observed: filter == null ? 'absent_or_null' : Array.isArray(filter) ? `array:${filter.length}` : typeof filter },
    { id: 'no_basic_filter', ok: campaign?.has_basic_filter === false, observed: campaign?.has_basic_filter ?? null },
    { id: 'recipients_missing', ok: missingData.includes('recipients'), observed: missingData },
    { id: 'no_warnings', ok: warnings.length === 0, observed: warnings },
    { id: 'cannot_schedule_without_recipients', ok: campaign?.can_be_scheduled === false, observed: campaign?.can_be_scheduled ?? null },
  ];
  return {
    checks,
    allClosed: checks.every((check) => check.ok),
    failed: checks.filter((check) => !check.ok).map((check) => check.id),
  };
};

const targetRowsFrom = ({ realQa, executionKit }) => {
  const kitByStep = new Map((executionKit?.perDraftSteps ?? [])
    .map((row) => [Number(row?.step), row])
    .filter(([step]) => Number.isFinite(step)));
  return (realQa?.drafts ?? []).map((draft) => {
    const step = Number(draft?.step);
    const kitRow = kitByStep.get(step) ?? {};
    return {
      step,
      campaignId: cleanString(draft?.campaignId),
      draftName: cleanString(kitRow?.draftName) ?? cleanString(draft?.observedName) ?? cleanString(draft?.expectedName),
      htmlPath: cleanString(kitRow?.htmlPath),
    };
  }).filter((row) => Number.isFinite(row.step));
};

const redactedSenderAvailability = (email) => ({
  fromNamePresent: Boolean(cleanString(email?.from_name ?? email?.fromName)),
  fromEmailPresent: Boolean(cleanString(email?.from ?? email?.from_email ?? email?.fromEmail)),
  replyToPresent: Boolean(cleanString(email?.reply_to ?? email?.replyTo)),
  valuesPrinted: false,
});

const buildDiagnosticFromState = ({
  realQa,
  executionKit,
  correctionPreview,
  shopifyPreviewRouteExecutionReceipt = null,
  campaignsById,
  correctedHtmlByStep,
  apiErrors = [],
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const targetRows = targetRowsFrom({ realQa, executionKit });
  const expectedHashes = linkHashesFromCorrectionPreview(correctionPreview);
  const exactPreviewLinks = targetLinksByKey(shopifyPreviewRouteExecutionReceipt);
  const blockers = [];

  if (realQa?.status !== 'mini_launch_real_mailerlite_render_qa_green_no_live_changes') {
    blockers.push(`real_mailerlite_render_qa_not_green:${realQa?.status ?? 'missing'}`);
  }
  if (executionKit?.status !== 'seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes') {
    blockers.push(`execution_kit_not_ready:${executionKit?.status ?? 'missing'}`);
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
  if (targetRows.length !== 4) blockers.push(`target_count_not_4:${targetRows.length}`);

  const draftDiagnostics = targetRows.map((target) => {
    const campaign = campaignsById.get(target.campaignId);
    const email = campaign ? emailForCampaign(campaign) : {};
    const currentHtml = String(email?.content ?? '');
    const correctedHtml = correctedHtmlByStep.get(target.step) ?? '';
    const currentStats = htmlStats(currentHtml);
    const correctedStats = htmlStats(correctedHtml);
    const safety = campaign ? safetyForCampaign(campaign) : { allClosed: false, failed: ['campaign_missing'], checks: [] };
    const expectedLinkKey = EXPECTED_LINK_KEY_BY_STEP.get(target.step) ?? null;
    const expectedLinkHash = expectedLinkKey ? expectedHashes.get(expectedLinkKey) ?? null : null;
    const exactPreviewUrl = expectedLinkKey ? exactPreviewLinks.get(expectedLinkKey) ?? null : null;
    const exactPreviewUrlHash = exactPreviewUrl ? sha256(exactPreviewUrl) : null;
    const exactPreviewUrlMatchesCorrectionHash = expectedLinkKey
      ? Boolean(expectedLinkHash && exactPreviewUrlHash && expectedLinkHash === exactPreviewUrlHash)
      : true;
    const currentContainsExpectedHash = expectedLinkHash
      ? currentStats.urlHashes.includes(expectedLinkHash)
      : true;
    const placeholder = expectedLinkKey ? PLACEHOLDER_BY_LINK_KEY.get(expectedLinkKey) ?? null : null;
    const currentExpectedPlaceholderCount = placeholder ? currentStats.placeholderCounts[placeholder] ?? 0 : 0;
    const apiPayloadReplacement = replaceExactPlaceholder({
      content: currentHtml,
      placeholder,
      url: exactPreviewUrl,
    });
    const apiPayloadStats = htmlStats(apiPayloadReplacement.content);
    const apiPayloadContainsExpectedHash = expectedLinkHash
      ? apiPayloadStats.urlHashes.includes(expectedLinkHash)
      : true;
    const senderAvailability = redactedSenderAvailability(email);
    const emailCount = Array.isArray(campaign?.emails) ? campaign.emails.length : 0;
    const rowBlockers = [];

    if (!target.campaignId) rowBlockers.push('campaign_id_missing');
    if (!campaign) rowBlockers.push('campaign_detail_missing');
    if (campaign && campaignNameFor(campaign) !== target.draftName) rowBlockers.push('campaign_name_mismatch');
    if (!safety.allClosed) rowBlockers.push(...safety.failed.map((id) => `safety_${id}`));
    if (emailCount !== 1) rowBlockers.push(`email_count_not_1:${emailCount}`);
    if (!senderAvailability.fromNamePresent) rowBlockers.push('sender_from_name_missing');
    if (!senderAvailability.fromEmailPresent) rowBlockers.push('sender_from_email_missing');
    if (!currentStats.nonEmpty) rowBlockers.push('current_html_missing');
    if (!correctedStats.nonEmpty) rowBlockers.push('corrected_html_missing');
    if (correctedStats.totalPlaceholderCount > 0) rowBlockers.push('corrected_html_still_contains_inert_placeholders');
    if (expectedLinkKey && !exactPreviewUrl) rowBlockers.push(`shopify_exact_preview_url_missing:${expectedLinkKey}`);
    if (expectedLinkKey && !exactPreviewUrlMatchesCorrectionHash) rowBlockers.push(`shopify_exact_preview_url_hash_mismatch:${expectedLinkKey}`);
    if (expectedLinkKey && !currentContainsExpectedHash && currentExpectedPlaceholderCount !== 1) rowBlockers.push(`current_placeholder_count_not_1:${placeholder}:${currentExpectedPlaceholderCount}`);
    if (expectedLinkKey && !apiPayloadContainsExpectedHash) rowBlockers.push(`api_payload_expected_preview_url_hash_missing:${expectedLinkKey}`);
    if (apiPayloadStats.totalPlaceholderCount > 0) rowBlockers.push('api_payload_still_contains_inert_placeholders');

    blockers.push(...rowBlockers.map((blocker) => `step_${target.step}_${blocker}`));

    return {
      step: target.step,
      campaignId: target.campaignId,
      draftName: target.draftName,
      observedName: campaign ? campaignNameFor(campaign) : null,
      nameMatches: campaign ? campaignNameFor(campaign) === target.draftName : false,
      htmlPath: target.htmlPath,
      currentCampaign: campaign ? {
        status: campaign?.status ?? null,
        type: campaign?.type ?? null,
        emailCount,
        emailIdPresent: Boolean(cleanString(email?.id)),
        senderAvailability,
        safety,
      } : null,
      currentHtml: {
        chars: currentStats.chars,
        nonEmpty: currentStats.nonEmpty,
        placeholderCounts: currentStats.placeholderCounts,
        totalPlaceholderCount: currentStats.totalPlaceholderCount,
        urlHashCount: currentStats.urlHashCount,
      },
      correctedHtml: {
        chars: correctedStats.chars,
        nonEmpty: correctedStats.nonEmpty,
        placeholderCounts: correctedStats.placeholderCounts,
        totalPlaceholderCount: correctedStats.totalPlaceholderCount,
        expectedPreviewUrlKey: expectedLinkKey,
        expectedPreviewUrlHashPresent: expectedLinkHash
          ? correctedStats.urlHashes.includes(expectedLinkHash)
          : true,
        urlHashCount: correctedStats.urlHashCount,
        urlHashesUniqueCount: correctedStats.urlHashesUniqueCount,
        usedForApiPayloadReadiness: false,
        redactedRenderMayHaveZeroUrls: true,
      },
      apiPayload: {
        expectedPreviewUrlKey: expectedLinkKey,
        exactPreviewUrlAvailable: expectedLinkKey ? Boolean(exactPreviewUrl) : true,
        exactPreviewUrlHashMatchesCorrectionPreview: exactPreviewUrlMatchesCorrectionHash,
        currentAlreadyContainsExpectedPreviewUrlHash: currentContainsExpectedHash,
        currentExpectedPlaceholderCount,
        placeholderReplacementCount: apiPayloadReplacement.replacementCount,
        expectedPreviewUrlHashPresentAfterReplacement: apiPayloadContainsExpectedHash,
        totalPlaceholderCountAfterReplacement: apiPayloadStats.totalPlaceholderCount,
        exactUrlStoredInReport: false,
        exactUrlPrinted: false,
      },
      apiEditCandidate: rowBlockers.length === 0,
      rowBlockers: [...new Set(rowBlockers)],
    };
  });

  const uniqueBlockers = [...new Set([
    ...blockers,
    ...apiErrors.map((error) => `api_${error.phase}_${error.reason}`),
  ])];
  const allDraftsInertByApi = draftDiagnostics.length === 4
    && draftDiagnostics.every((draft) => draft.currentCampaign?.safety?.allClosed === true);
  const allCorrectedHtmlReady = draftDiagnostics.length === 4
    && draftDiagnostics.every((draft) => draft.correctedHtml.nonEmpty && draft.correctedHtml.totalPlaceholderCount === 0);
  const allApiPayloadReady = draftDiagnostics.length === 4
    && draftDiagnostics.filter((draft) => EXPECTED_LINK_KEY_BY_STEP.has(draft.step)).every((draft) => (
      draft.apiPayload.exactPreviewUrlAvailable
      && draft.apiPayload.exactPreviewUrlHashMatchesCorrectionPreview
      && draft.apiPayload.expectedPreviewUrlHashPresentAfterReplacement
      && draft.apiPayload.totalPlaceholderCountAfterReplacement === 0
    ));
  const apiEditCandidate = uniqueBlockers.length === 0 && allDraftsInertByApi && allCorrectedHtmlReady && allApiPayloadReady;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_api_edit_diagnostic',
    generatedAt,
    ok: true,
    status: apiEditCandidate
      ? 'seed_inbox_correction_api_edit_diagnostic_ready_for_guarded_api_edit_approval_no_live_changes'
      : 'seed_inbox_correction_api_edit_diagnostic_blocked_or_needs_ui_no_live_changes',
    launch: executionKit?.launch ?? realQa?.launch ?? null,
    executiveSummary: {
      targetDraftCount: targetRows.length,
      campaignReadCount: campaignsById.size,
      apiErrorCount: apiErrors.length,
      allDraftsInertByApi,
      allCorrectedHtmlReady,
      allApiPayloadReady,
      apiEditCandidate,
      recommendedRoute: apiEditCandidate
        ? 'prepare_guarded_api_edit_approval_packet_before_any_mutation'
        : 'stay_with_ui_edit_or_resolve_api_diagnostic_blockers_before_mutation',
      blockerCount: uniqueBlockers.length,
      nextBestMove: apiEditCandidate
        ? 'Generate a separate exact approval packet for guarded API editing of the four existing drafts; do not edit yet.'
        : 'Do not edit by API until blockers are resolved or use the existing UI edit route after exact approval.',
    },
    apiEditBoundary: {
      diagnosticIsApprovalByItself: false,
      canEditByApiNow: false,
      allowedOnlyAfterFutureExactApproval: [
        'fresh_rescan_the_four_existing_mailerlite_drafts_by_id',
        'put_update_only_the_four_existing_draft_campaigns',
        'copy_corrected_local_html_without_printing_exact_urls',
        'preserve_no_recipients_no_schedule_no_send_no_workflow_attachment',
        'write_post_edit_receipt_and_run_real_mailerlite_render_qa',
      ],
      stillClosed: [
        'api_edit_without_a_new_exact_approval_phrase',
        'creating_replacement_drafts',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'publish_or_schedule_campaign',
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
    },
    draftDiagnostics,
    blockers: uniqueBlockers,
    apiErrors,
    sourceDigests,
    safety: {
      mailerLiteApiCalled: true,
      mailerLiteCampaignsRead: campaignsById.size,
      mailerLiteMutationsPerformed: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
      campaignsPublished: false,
      campaignsScheduled: false,
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
      exactUrlsStoredInReport: false,
      exactUrlsPrinted: false,
      tokensPrinted: false,
    },
  };
};

const buildDiagnosticFromFiles = async (options) => {
  const [realQaRaw, executionKitRaw, correctionPreviewRaw] = await Promise.all([
    readText(options.realMailerLiteRenderQa),
    readText(options.executionKit),
    readText(options.correctionPreview),
  ]);
  const shopifyPreviewRouteExecutionReceiptRaw = await readText(options.shopifyPreviewRouteExecutionReceipt);
  const realQa = JSON.parse(realQaRaw);
  const executionKit = JSON.parse(executionKitRaw);
  const correctionPreview = JSON.parse(correctionPreviewRaw);
  const shopifyPreviewRouteExecutionReceipt = JSON.parse(shopifyPreviewRouteExecutionReceiptRaw);
  const targets = targetRowsFrom({ realQa, executionKit });
  const correctedHtmlByStep = new Map();
  const sourceDigests = [
    sourceDigest(options.realMailerLiteRenderQa, realQaRaw, 'latest read-only MailerLite draft IDs and pre-correction QA evidence'),
    sourceDigest(options.executionKit, executionKitRaw, 'four target drafts and corrected local HTML paths'),
    sourceDigest(options.correctionPreview, correctionPreviewRaw, 'preview URL hashes and correction readiness without exact URL storage'),
    sourceDigest(options.shopifyPreviewRouteExecutionReceipt, shopifyPreviewRouteExecutionReceiptRaw, 'exact preview URL source read internally; only hashes stored in this diagnostic'),
  ];

  for (const target of targets) {
    if (!target.htmlPath) continue;
    const html = await readText(target.htmlPath);
    correctedHtmlByStep.set(target.step, html);
    sourceDigests.push(sourceDigest(target.htmlPath, html, `corrected_html_step_${target.step}`));
  }

  const credential = await getCredential(options);
  if (!credential?.key) {
    return buildDiagnosticFromState({
      realQa,
      executionKit,
      correctionPreview,
      shopifyPreviewRouteExecutionReceipt,
      campaignsById: new Map(),
      correctedHtmlByStep,
      apiErrors: [{
        phase: 'credential',
        reason: 'blocked_missing_mailerlite_credential',
        status: null,
        details: [],
      }],
      sourceDigests,
    });
  }

  const campaignsById = new Map();
  const apiErrors = [];
  for (const target of targets) {
    try {
      const campaign = await requestJson({ options, key: credential.key, path: `/campaigns/${target.campaignId}` });
      campaignsById.set(target.campaignId, campaign);
    } catch (error) {
      apiErrors.push({
        step: target.step,
        campaignId: target.campaignId,
        phase: 'fetch_campaign_detail',
        reason: error?.reason || error?.message || 'mailerlite_campaign_detail_failed',
        status: error?.status ?? null,
        details: Array.isArray(error?.details) ? error.details : [],
      });
    }
  }

  return buildDiagnosticFromState({
    realQa,
    executionKit,
    correctionPreview,
    shopifyPreviewRouteExecutionReceipt,
    campaignsById,
    correctedHtmlByStep,
    apiErrors,
    sourceDigests,
  });
};

const renderMarkdown = (diagnostic) => [
  '# MailerLite Mini-Launch Seed Inbox Correction API Edit Diagnostic',
  '',
  `- Generated: ${diagnostic.generatedAt}`,
  `- Status: ${diagnostic.status}`,
  `- API edit candidate: ${diagnostic.executiveSummary.apiEditCandidate}`,
  `- Recommended route: ${diagnostic.executiveSummary.recommendedRoute}`,
  `- Target drafts: ${diagnostic.executiveSummary.targetDraftCount}`,
  `- Campaigns read: ${diagnostic.executiveSummary.campaignReadCount}`,
  `- All drafts inert by API: ${diagnostic.executiveSummary.allDraftsInertByApi}`,
  `- Corrected HTML ready: ${diagnostic.executiveSummary.allCorrectedHtmlReady}`,
  `- API payload ready: ${diagnostic.executiveSummary.allApiPayloadReady}`,
  `- Blocker count: ${diagnostic.executiveSummary.blockerCount}`,
  '',
  '## Draft Diagnostics',
  '',
  ...diagnostic.draftDiagnostics.flatMap((draft) => [
    `### E${String(draft.step).padStart(2, '0')}`,
    '',
    `- Campaign ID: ${draft.campaignId}`,
    `- Name matches: ${draft.nameMatches}`,
    `- Current status/type: ${draft.currentCampaign?.status ?? 'missing'} / ${draft.currentCampaign?.type ?? 'missing'}`,
    `- Safety closed: ${draft.currentCampaign?.safety?.allClosed ?? false}`,
    `- Failed safety checks: ${draft.currentCampaign?.safety?.failed?.join(', ') || 'none'}`,
    `- Current placeholder count: ${draft.currentHtml.totalPlaceholderCount}`,
    `- Corrected placeholder count: ${draft.correctedHtml.totalPlaceholderCount}`,
    `- Corrected expected preview URL hash present: ${draft.correctedHtml.expectedPreviewUrlHashPresent}`,
    `- API payload expected preview URL hash present: ${draft.apiPayload.expectedPreviewUrlHashPresentAfterReplacement}`,
    `- API payload placeholder count after replacement: ${draft.apiPayload.totalPlaceholderCountAfterReplacement}`,
    `- API edit candidate: ${draft.apiEditCandidate}`,
    `- Row blockers: ${draft.rowBlockers.join(', ') || 'none'}`,
    '',
  ]),
  '## Blockers',
  '',
  ...(diagnostic.blockers.length ? diagnostic.blockers.map((blocker) => `- ${blocker}`) : ['- none']),
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${diagnostic.safety.mailerLiteApiCalled}`,
  `- MailerLite mutations performed: ${diagnostic.safety.mailerLiteMutationsPerformed}`,
  `- Sends performed: ${diagnostic.safety.sendsPerformed}`,
  `- Campaigns published/scheduled: ${diagnostic.safety.campaignsPublished}/${diagnostic.safety.campaignsScheduled}`,
  `- Subscribers read/mutated: ${diagnostic.safety.subscribersRead}/${diagnostic.safety.subscriberMutationsPerformed}`,
  `- Groups/segments/workflows mutated: ${diagnostic.safety.groupsCreatedOrAssigned || diagnostic.safety.segmentsCreatedOrAssigned || diagnostic.safety.workflowMutationsPerformed}`,
  `- Shopify/CRM/ledgers/cards/scoring/Fact Store closed: ${!diagnostic.safety.shopifyMutationsPerformed && !diagnostic.safety.crmLiveApiCalled && !diagnostic.safety.signalLedgerAppendPerformed && !diagnostic.safety.crmCardMutationsPerformed && !diagnostic.safety.crmScoreMutationsPerformed && !diagnostic.safety.factStoreWritePerformed}`,
  `- Exact URLs stored/printed: ${diagnostic.safety.exactUrlsStoredInReport}/${diagnostic.safety.exactUrlsPrinted}`,
  `- Tokens printed: ${diagnostic.safety.tokensPrinted}`,
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

  const diagnostic = await buildDiagnosticFromFiles(options);
  if (options.out) await writeJson(options.out, diagnostic);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(diagnostic));

  console.log(JSON.stringify({
    ok: diagnostic.ok,
    status: diagnostic.status,
    apiEditCandidate: diagnostic.executiveSummary.apiEditCandidate,
    allDraftsInertByApi: diagnostic.executiveSummary.allDraftsInertByApi,
    allCorrectedHtmlReady: diagnostic.executiveSummary.allCorrectedHtmlReady,
    allApiPayloadReady: diagnostic.executiveSummary.allApiPayloadReady,
    campaignReadCount: diagnostic.executiveSummary.campaignReadCount,
    blockerCount: diagnostic.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: diagnostic.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite seed inbox correction API edit diagnostic failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDiagnosticFromState,
  htmlStats,
  parseArgs,
  renderMarkdown,
  safetyForCampaign,
  targetRowsFrom,
};
