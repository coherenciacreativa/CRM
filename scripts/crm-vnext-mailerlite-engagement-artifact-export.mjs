#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const RECEIPT_SCHEMA_VERSION = 'crm-vnext-mailerlite-engagement-artifact-export-receipt-2026-06-05';
const ARTIFACT_SCHEMA_VERSION = 'crm-vnext-mailerlite-engagement-private-artifact-2026-06-05';
const DEFAULT_PRIVATE_ARTIFACT_DIR = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const DEFAULT_DATE_STAMP = new Date().toISOString().slice(0, 10);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-engagement-artifact-export.mjs [options]

Options:
  --service <name>        Stored credential service override.
  --account <name>        Stored credential account override.
  --api-base <url>        MailerLite API base.
  --timeout-ms <n>        Per-request timeout. Defaults to 30000
  --limit <n>             Cursor scan page size. Defaults to 100
  --max-pages <n>         Cursor scan safety cap. Defaults to 20
  --artifact-out <path>   Private source artifact path outside the repo.
  --out <path>            Redacted JSON receipt path.
  --markdown-out <path>   Redacted Markdown receipt path.
  --fail-on-blocked       Exit with code 2 if export is blocked.
  --help                  Show this help

Read-only MailerLite engagement source artifact export for CRM Core.
It writes raw source rows only to a private local artifact path outside the repo,
and emits only redacted aggregate receipts. It never prints subscriber rows,
bulk emails, raw API payloads, credentials, tokens, headers, or private content.`;

const defaultArtifactPath = () =>
  `${DEFAULT_PRIVATE_ARTIFACT_DIR}/crm_core_mailerlite_engagement_source_artifact_${DEFAULT_DATE_STAMP}.json`;

const defaultJsonReceiptPath = () =>
  `${DEFAULT_REPORTS_DIR}/crm_core_mailerlite_engagement_artifact_export_${DEFAULT_DATE_STAMP}.json`;

const defaultMarkdownReceiptPath = () =>
  `${DEFAULT_REPORTS_DIR}/crm_core_mailerlite_engagement_artifact_export_${DEFAULT_DATE_STAMP}.md`;

const parseArgs = (argv) => {
  const options = {
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    limit: 100,
    maxPages: 20,
    artifactOut: defaultArtifactPath(),
    out: defaultJsonReceiptPath(),
    markdownOut: defaultMarkdownReceiptPath(),
    failOnBlocked: false,
    help: false,
    repoRoot: process.cwd(),
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--limit') options.limit = Number.parseInt(argv[++index], 10);
    else if (arg === '--max-pages') options.maxPages = Number.parseInt(argv[++index], 10);
    else if (arg === '--artifact-out') options.artifactOut = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = String(options.apiBase || '').replace(/\/+$/, '');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  options.limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(options.limit, 1000) : 100;
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? options.maxPages : 20;
  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  if (!options.apiBase) throw new Error('missing_api_base');
  if (!options.artifactOut) throw new Error('missing_artifact_out');
  return options;
};

const isInsideRepo = (filePath, repoRoot) => {
  const absolutePath = resolve(filePath);
  const absoluteRepo = resolve(repoRoot);
  const rel = relative(absoluteRepo, absolutePath);
  return rel === '' || (!rel.startsWith('..') && !rel.startsWith('/'));
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
    return key ? { key } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return keychain;
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key };
  }
  return { key: null };
};

const credentialReceipt = (credentialPresent) => ({
  credentialPresent,
  storedCredentialChecked: true,
  credentialMode: credentialPresent ? 'credential_available' : 'credential_missing',
});

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const fetchJson = async (state, options, key, path, params = {}) => {
  state.mailerLiteApiCalled = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Engagement-Artifact-Export/1.0',
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
  for (const key of ['data', 'subscribers', 'items', 'results']) {
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
        // Ignore malformed next links and treat them as no cursor.
      }
    }
  }
  return null;
};

const getPath = (record, key) => {
  if (!record || typeof record !== 'object') return null;
  if (!key.includes('.')) return record[key] ?? null;
  let cursor = record;
  for (const part of key.split('.')) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return cursor ?? null;
};

const fieldObjectValue = (fields, key) => {
  if (!fields || typeof fields !== 'object' || Array.isArray(fields)) return null;
  return fields[key] ?? null;
};

const fieldArrayValue = (fields, key) => {
  if (!Array.isArray(fields)) return null;
  const normalizedKey = key.toLowerCase();
  const match = fields.find((field) => {
    if (!field || typeof field !== 'object') return false;
    const fieldKey = String(field.key ?? field.name ?? field.id ?? '').toLowerCase();
    return fieldKey === normalizedKey;
  });
  return match?.value ?? null;
};

const pick = (record, keys) => {
  for (const key of keys) {
    const direct = getPath(record, key);
    if (direct !== null && direct !== undefined && direct !== '') return direct;
    const fields = record?.fields;
    const fromObject = fieldObjectValue(fields, key);
    if (fromObject !== null && fromObject !== undefined && fromObject !== '') return fromObject;
    const fromArray = fieldArrayValue(fields, key);
    if (fromArray !== null && fromArray !== undefined && fromArray !== '') return fromArray;
  }
  return null;
};

const present = (record, keys) => pick(record, keys) !== null;

const parseDate = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const latestIso = (rows, keys) => {
  let latest = null;
  for (const row of rows) {
    for (const key of keys) {
      const value = parseDate(pick(row, [key]));
      if (!value) continue;
      if (!latest || new Date(value).getTime() > new Date(latest).getTime()) latest = value;
    }
  }
  return latest;
};

const normalizeStatus = (value) => {
  const raw = String(value ?? '').toLowerCase();
  if (!raw) return 'unknown';
  if (raw.includes('complain') || raw.includes('spam')) return 'complained';
  if (raw.includes('bounce')) return 'bounced';
  if (raw.includes('unsub')) return 'unsubscribed';
  if (raw.includes('active') || raw.includes('subscribed')) return 'active';
  return 'unknown';
};

const countRowsWith = (rows, keys) => rows.filter((row) => present(row, keys)).length;

const countStatuses = (rows) => rows.reduce((counts, row) => {
  const status = normalizeStatus(pick(row, [
    'subscriberStatus',
    'subscriber_status',
    'email_subscriber_status',
    'status',
    'state',
    'subscriber.status',
  ]));
  counts[status] = (counts[status] ?? 0) + 1;
  return counts;
}, { active: 0, unsubscribed: 0, bounced: 0, complained: 0, unknown: 0 });

const fieldAvailability = (rows) => ({
  identityAnchors: {
    email: countRowsWith(rows, ['email', 'subscriber.email', 'subscriber_email', 'subscriberEmail', 'contact.email']),
    subscriberId: countRowsWith(rows, ['id', 'subscriberId', 'subscriber_id', 'subscriber.id']),
    instagramHandle: countRowsWith(rows, ['instagramHandle', 'instagram_handle', 'igHandle', 'ig_handle']),
    phone: countRowsWith(rows, ['phone', 'fields.phone', 'subscriber.phone']),
    personId: countRowsWith(rows, ['personId', 'person_id', 'targetPersonId']),
  },
  engagement: {
    opens30d: countRowsWith(rows, ['opens30d', 'opens_30d', 'open_count_30d', 'campaign_opens_30d', 'opens']),
    clicks30d: countRowsWith(rows, ['clicks30d', 'clicks_30d', 'click_count_30d', 'campaign_clicks_30d', 'clicks']),
    opens90d: countRowsWith(rows, ['opens90d', 'opens_90d', 'open_count_90d', 'campaign_opens_90d']),
    clicks90d: countRowsWith(rows, ['clicks90d', 'clicks_90d', 'click_count_90d', 'campaign_clicks_90d']),
    lifetimeOpens: countRowsWith(rows, ['lifetimeOpens', 'lifetime_opens', 'aggregate.opens_count', 'opens_count', 'total_opens']),
    lifetimeClicks: countRowsWith(rows, ['lifetimeClicks', 'lifetime_clicks', 'aggregate.clicks_count', 'clicks_count', 'total_clicks']),
    openRate: countRowsWith(rows, ['openRate', 'open_rate', 'aggregate.open_rate']),
    clickRate: countRowsWith(rows, ['clickRate', 'click_rate', 'aggregate.click_rate']),
    lastOpenAt: countRowsWith(rows, ['lastOpenAt', 'last_open_at', 'latest_open_at', 'opened_at']),
    lastClickAt: countRowsWith(rows, ['lastClickAt', 'last_click_at', 'latest_click_at', 'clicked_at']),
  },
  campaign: {
    campaignActivity: countRowsWith(rows, ['campaignActivity', 'campaign_activity', 'campaigns', 'recentCampaigns']),
    campaignId: countRowsWith(rows, ['campaignId', 'campaign_id', 'campaign.id']),
    campaignName: countRowsWith(rows, ['campaignName', 'campaign_name', 'campaign.name']),
  },
  status: {
    subscriberStatus: countRowsWith(rows, ['subscriberStatus', 'subscriber_status', 'email_subscriber_status', 'status', 'state']),
    groups: countRowsWith(rows, ['groups', 'group_names', 'groupNames']),
    tags: countRowsWith(rows, ['tags', 'tag_names', 'tagNames']),
    segments: countRowsWith(rows, ['segments', 'lists']),
  },
});

const freshness = (rows) => ({
  latestObservedAt: latestIso(rows, ['observedAt', 'observed_at', 'snapshotAt', 'snapshot_at', 'generatedAt']),
  latestUpdatedAt: latestIso(rows, ['updatedAt', 'updated_at']),
  latestCreatedAt: latestIso(rows, ['createdAt', 'created_at']),
  latestSubscribedAt: latestIso(rows, ['subscribedAt', 'subscribed_at', 'aggregate.subscribedAt']),
  latestOpenAt: latestIso(rows, ['lastOpenAt', 'last_open_at', 'latest_open_at', 'opened_at']),
  latestClickAt: latestIso(rows, ['lastClickAt', 'last_click_at', 'latest_click_at', 'clicked_at']),
});

const makeBaseReport = (options, credentialPresent, state) => ({
  schemaVersion: RECEIPT_SCHEMA_VERSION,
  mode: 'read_only_mailerlite_engagement_private_artifact_export',
  sourceFamily: 'mailerlite_email_engagement',
  checkedExportedAt: new Date().toISOString(),
  route: 'mailerlite_subscribers_readonly_cursor_export',
  ok: false,
  status: 'blocked',
  credential: credentialReceipt(credentialPresent),
  pageCaps: {
    limit: options.limit,
    maxPages: options.maxPages,
    pagesScanned: 0,
    capReached: false,
  },
  aggregate: {
    rowCount: 0,
  },
  fieldFamiliesAvailable: {
    identityAnchors: {},
    engagement: {},
    campaign: {},
    status: {},
  },
  freshness: {},
  suppressionStatusCoverage: {},
  privateArtifact: {
    written: false,
    pathLabel: basename(resolve(options.artifactOut)),
    outsideRepo: !isInsideRepo(options.artifactOut, options.repoRoot),
  },
  blockers: [],
  closedGates: [
    'no_mailerlite_mutation',
    'no_crm_state_mutation',
    'no_signal_event_ledger_write',
    'no_engagement_snapshot_ledger_write',
    'no_card_write',
    'no_fact_store_write',
    'no_scoring_write',
    'no_outbound_action',
    'no_launch_os_docs',
  ],
  safetyFlags: {
    mailerLiteApiCalled: state.mailerLiteApiCalled,
    mutationsPerformed: false,
    crmStateTouched: false,
    rawRowsPrinted: false,
    privateArtifactWritten: false,
    redactedReceiptWritten: false,
  },
});

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

const writePrivateArtifact = async (options, rows, exportedAt) => {
  const artifact = {
    schemaVersion: ARTIFACT_SCHEMA_VERSION,
    sourceFamily: 'mailerlite_email_engagement',
    exportedAt,
    route: 'mailerlite_subscribers_readonly_cursor_export',
    privateLocalArtifact: true,
    commitPolicy: 'do_not_commit',
    memoryPolicy: 'do_not_write_artifact_contents_to_mantis_memory',
    rows,
  };
  await writeJson(options.artifactOut, artifact);
};

const collectRows = async (state, options, key) => {
  let cursor = null;
  let pages = 0;
  const rows = [];

  while (pages < options.maxPages) {
    const params = { limit: options.limit };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(state, options, key, '/subscribers', params);
    const items = extractItems(payload);
    if (!items.length) break;
    rows.push(...items);
    pages += 1;
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }

  return {
    rows,
    pages,
    capReached: Boolean(cursor && pages >= options.maxPages),
  };
};

const buildReport = async (options) => {
  const state = { mailerLiteApiCalled: false };
  const credential = await getCredential(options);
  const credentialPresent = Boolean(credential.key);
  const report = makeBaseReport(options, credentialPresent, state);

  if (isInsideRepo(options.artifactOut, options.repoRoot)) {
    report.blockers.push('private_artifact_path_inside_repo');
    return report;
  }

  if (!credential.key) {
    report.blockers.push('missing_mailerlite_credential');
    return report;
  }

  try {
    const result = await collectRows(state, options, credential.key);
    report.safetyFlags.mailerLiteApiCalled = state.mailerLiteApiCalled;
    report.pageCaps.pagesScanned = result.pages;
    report.pageCaps.capReached = result.capReached;
    report.aggregate.rowCount = result.rows.length;
    report.fieldFamiliesAvailable = fieldAvailability(result.rows);
    report.freshness = freshness(result.rows);
    report.suppressionStatusCoverage = countStatuses(result.rows);

    if (result.capReached) report.blockers.push('mailerlite_export_page_cap_reached');
    if (result.rows.length === 0) report.blockers.push('mailerlite_export_no_rows_returned');

    if (report.blockers.length === 0) {
      await writePrivateArtifact(options, result.rows, report.checkedExportedAt);
      report.privateArtifact.written = true;
      report.safetyFlags.privateArtifactWritten = true;
      report.ok = true;
      report.status = 'ok';
    }
  } catch (error) {
    report.safetyFlags.mailerLiteApiCalled = state.mailerLiteApiCalled;
    report.blockers.push(error?.reason || error?.message || 'mailerlite_export_unknown_error');
  }

  return report;
};

const renderMarkdown = (report) => [
  '# CRM Core MailerLite Engagement Artifact Export Receipt',
  '',
  `- Status: ${report.status}`,
  `- Source family: ${report.sourceFamily}`,
  `- Checked/exported at: ${report.checkedExportedAt}`,
  `- Route: ${report.route}`,
  `- Page caps: limit ${report.pageCaps.limit}, max pages ${report.pageCaps.maxPages}`,
  `- Pages scanned: ${report.pageCaps.pagesScanned}`,
  `- Rows exported: ${report.aggregate.rowCount}`,
  `- Private artifact written: ${report.privateArtifact.written ? 'yes' : 'no'}`,
  `- Private artifact path label: ${report.privateArtifact.pathLabel}`,
  `- Artifact outside repo: ${report.privateArtifact.outsideRepo ? 'yes' : 'no'}`,
  '',
  '## Field Families Available',
  '',
  `- Identity anchors: ${JSON.stringify(report.fieldFamiliesAvailable.identityAnchors)}`,
  `- Engagement: ${JSON.stringify(report.fieldFamiliesAvailable.engagement)}`,
  `- Campaign: ${JSON.stringify(report.fieldFamiliesAvailable.campaign)}`,
  `- Status: ${JSON.stringify(report.fieldFamiliesAvailable.status)}`,
  '',
  '## Freshness',
  '',
  `- Latest observed at: ${report.freshness.latestObservedAt ?? 'unknown'}`,
  `- Latest updated at: ${report.freshness.latestUpdatedAt ?? 'unknown'}`,
  `- Latest subscribed at: ${report.freshness.latestSubscribedAt ?? 'unknown'}`,
  `- Latest open at: ${report.freshness.latestOpenAt ?? 'unknown'}`,
  `- Latest click at: ${report.freshness.latestClickAt ?? 'unknown'}`,
  '',
  '## Status Coverage',
  '',
  `- Active: ${report.suppressionStatusCoverage.active ?? 0}`,
  `- Unsubscribed: ${report.suppressionStatusCoverage.unsubscribed ?? 0}`,
  `- Bounced: ${report.suppressionStatusCoverage.bounced ?? 0}`,
  `- Complained: ${report.suppressionStatusCoverage.complained ?? 0}`,
  `- Unknown: ${report.suppressionStatusCoverage.unknown ?? 0}`,
  '',
  '## Blockers',
  '',
  ...(report.blockers.length ? report.blockers.map((item) => `- ${item}`) : ['- none']),
  '',
  '## Closed Gates',
  '',
  ...report.closedGates.map((item) => `- ${item}`),
  '',
  '## Safety Flags',
  '',
  `- MailerLite API called: ${report.safetyFlags.mailerLiteApiCalled ? 'yes' : 'no'}`,
  `- Mutations performed: ${report.safetyFlags.mutationsPerformed ? 'yes' : 'no'}`,
  `- CRM state touched: ${report.safetyFlags.crmStateTouched ? 'yes' : 'no'}`,
  `- Raw rows printed: ${report.safetyFlags.rawRowsPrinted ? 'yes' : 'no'}`,
  `- Private artifact written: ${report.safetyFlags.privateArtifactWritten ? 'yes' : 'no'}`,
  `- Redacted receipt written: ${report.safetyFlags.redactedReceiptWritten ? 'yes' : 'no'}`,
  '',
  'This receipt is aggregate-only. It intentionally omits subscriber rows, bulk emails, raw API payloads, private URLs, campaign bodies, credentials, tokens, headers, environment values, credential source, credential length, and credential fingerprint.',
  '',
].join('\n');

const compactTerminalReport = (report, options) => ({
  ok: report.ok,
  status: report.status,
  sourceFamily: report.sourceFamily,
  checkedExportedAt: report.checkedExportedAt,
  route: report.route,
  pageCaps: report.pageCaps,
  aggregate: report.aggregate,
  fieldFamiliesAvailable: report.fieldFamiliesAvailable,
  freshness: report.freshness,
  suppressionStatusCoverage: report.suppressionStatusCoverage,
  privateArtifact: report.privateArtifact,
  blockers: report.blockers,
  closedGates: report.closedGates,
  safetyFlags: report.safetyFlags,
  receiptLabels: {
    json: options.out ? basename(resolve(options.out)) : null,
    markdown: options.markdownOut ? basename(resolve(options.markdownOut)) : null,
  },
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildReport(options);
  report.safetyFlags.redactedReceiptWritten = Boolean(options.out || options.markdownOut);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify(compactTerminalReport(report, options), null, 2));

  if (!report.ok && options.failOnBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext MailerLite engagement artifact export failed: ${error.message}`);
  process.exitCode = 1;
});
