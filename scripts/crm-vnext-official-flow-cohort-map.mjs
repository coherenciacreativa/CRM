#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-official-flow-cohort-map-2026-05-26';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_REPORTS_DIR = `${homedir()}/Documents/Mantis-Reports`;

const usage = `Usage:
  node scripts/crm-vnext-official-flow-cohort-map.mjs [options]

Options:
  --service <name>          Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>          Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>          MailerLite API base. Defaults to ${DEFAULT_API_BASE}
  --timeout-ms <n>          Per-request timeout. Defaults to 30000
  --limit <n>               Cursor scan page size. Defaults to 100
  --max-pages <n>           Cursor scan safety cap. Defaults to 100
  --batch-size <n>          Suggested fresh batch size. Defaults to 12
  --reports-dir <path>      Mantis-Reports directory. Defaults to ${DEFAULT_REPORTS_DIR}
  --card-store-path <path>  Local vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --out <path>              Write JSON report
  --markdown-out <path>     Write Markdown summary
  --fail-on-blocked         Exit with code 2 if MailerLite is blocked
  --help                    Show this help

Read-only planner for official-flow omnichannel stitching. It scans MailerLite with
cursor pagination and local filtering, reads local CRM cards and prior exact-anchor
reports, and proposes a fresh batch. It never mutates MailerLite, CRM cards, Fact
Store, ManyChat, Instagram, Gmail, Drive, Contacts, or outbound channels. It never
prints tokens.`;

const parseArgs = (argv) => {
  const options = {
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    limit: 100,
    maxPages: 100,
    batchSize: 12,
    reportsDir: DEFAULT_REPORTS_DIR,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    out: null,
    markdownOut: null,
    failOnBlocked: false,
    help: false,
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
    else if (arg === '--batch-size') options.batchSize = Number.parseInt(argv[++index], 10);
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  if (!options.apiBase) throw new Error('missing_api_base');
  options.apiBase = options.apiBase.replace(/\/+$/, '');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  options.limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(options.limit, 1000) : 100;
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? options.maxPages : 100;
  options.batchSize = Number.isFinite(options.batchSize) && options.batchSize > 0 ? options.batchSize : 12;
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const cleanEmail = (value) => cleanString(value)?.toLowerCase() ?? null;

const cleanHandle = (value) =>
  cleanString(value)
    ?.replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/[/?#].*$/, '')
    .replace(/\/+$/, '')
    .toLowerCase() ?? null;

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
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const unblockActionFor = (reason, options) => {
  if (reason === 'missing_mailerlite_credential') {
    return `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}. Do not paste tokens in chat.`;
  }
  if (reason === 'mailerlite_unauthenticated') {
    return `Refresh the MailerLite API key in Keychain service ${options.service}, account ${options.account}.`;
  }
  if (reason === 'mailerlite_forbidden') {
    return 'Check that the MailerLite API key can read subscribers and groups.';
  }
  if (reason === 'mailerlite_rate_limited') {
    return 'Retry later or reduce page size. The planner is read-only and safe to rerun.';
  }
  return 'Inspect MailerLite/keychain state locally while keeping tokens out of logs.';
};

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const fetchJson = async (options, key, path, params = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-Official-Flow-Cohort-Map/1.0',
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
        // Treat malformed next link as terminal.
      }
    }
  }
  return null;
};

const scanSubscribers = async (options, key) => {
  const subscribers = [];
  let cursor = null;
  let pages = 0;
  while (pages < options.maxPages) {
    const params = { limit: options.limit, include: 'groups' };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(options, key, '/subscribers', params);
    const items = extractItems(payload);
    if (!items.length) break;
    subscribers.push(...items);
    pages += 1;
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return {
    pages,
    subscribers,
    exhaustedByCap: Boolean(cursor && pages >= options.maxPages),
  };
};

const readJson = async (filePath, fallback = null) => {
  try {
    return JSON.parse(await readFile(resolve(filePath), 'utf8'));
  } catch {
    return fallback;
  }
};

const readCards = async (filePath) => {
  const parsed = await readJson(filePath, { cards: [] });
  return Array.isArray(parsed) ? parsed : Array.isArray(parsed?.cards) ? parsed.cards : [];
};

const buildCardIndexes = (cards) => {
  const byEmail = new Map();
  const byHandle = new Map();
  for (const card of cards) {
    const email = cleanEmail(card?.identities?.email);
    const handle = cleanHandle(card?.identities?.instagramHandle);
    if (email) byEmail.set(email, card);
    if (handle) byHandle.set(handle, card);
  }
  return { byEmail, byHandle };
};

const readProcessedAnchors = async (reportsDir) => {
  const anchors = {
    emails: new Set(),
    manyChatIds: new Set(),
    handles: new Set(),
    sourceFiles: [],
  };

  let files = [];
  try {
    files = await readdir(resolve(reportsDir));
  } catch {
    return anchors;
  }

  const relevant = files.filter((file) =>
    /^crm_vnext_manychat_exact_anchor_.*\.json$/.test(file)
    || /^crm_vnext_official_flow_manychat_exact_anchor_.*\.json$/.test(file)
  );

  for (const file of relevant) {
    const parsed = await readJson(join(resolve(reportsDir), file), null);
    if (!parsed) continue;
    anchors.sourceFiles.push(file);
    const items = Array.isArray(parsed?.items)
      ? parsed.items
      : Array.isArray(parsed?.planItems)
        ? parsed.planItems
        : [];
    for (const item of items) {
      const email = cleanEmail(item?.input?.email);
      const manyChatId = cleanString(item?.input?.manychatId);
      const handle = cleanHandle(
        item?.evidence?.instagramHandle
        ?? item?.incomingIdentity?.instagramHandle
        ?? item?.instagramHandle,
      );
      if (email) anchors.emails.add(email);
      if (manyChatId) anchors.manyChatIds.add(manyChatId);
      if (handle) anchors.handles.add(handle);
    }
  }

  return anchors;
};

const compactSnippet = (value, max = 260) => {
  const text = cleanString(value);
  if (!text) return null;
  return text.length <= max ? text : `${text.slice(0, max - 1)}…`;
};

const groupNamesFor = (subscriber) =>
  (Array.isArray(subscriber?.groups) ? subscriber.groups : [])
    .map((group) => cleanString(group?.name))
    .filter(Boolean);

const fieldsFor = (subscriber) => (subscriber?.fields && typeof subscriber.fields === 'object' ? subscriber.fields : {});

const officialGroupPatterns = [
  /leads?_instagram/i,
  /instagram/i,
  /primer bolet[ií]n/i,
  /first email/i,
  /second email/i,
  /onboarding/i,
  /br[uú]jula de claridad/i,
];

const officialFlowGroups = (groups) =>
  groups.filter((name) => officialGroupPatterns.some((pattern) => pattern.test(name)));

const stripEmails = (value) => cleanString(value)?.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, ' ') ?? '';

const extractManyChatId = (...values) => {
  const text = values.map(cleanString).filter(Boolean).join('\n');
  const match = text.match(/many\s*chat(?:\s*id)?\s*[:#=-]?\s*(\d{5,})/i)
    ?? text.match(/manychat(?:_id|id)?\s*[:#=-]?\s*(\d{5,})/i);
  return match?.[1] ?? null;
};

const extractHandles = (...values) => {
  const handles = new Set();
  for (const value of values) {
    const withoutEmails = stripEmails(value);
    for (const match of withoutEmails.matchAll(/(?:^|[\s(])@([a-zA-Z0-9._]{2,30})\b/g)) {
      const handle = cleanHandle(match[1]);
      if (handle && !/\.(com|co|org|net|es|br|cl|ar|mx)$/i.test(handle)) handles.add(handle);
    }
    for (const match of withoutEmails.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})/gi)) {
      const handle = cleanHandle(match[1]);
      if (handle) handles.add(handle);
    }
  }
  return Array.from(handles);
};

const nonEmptyFieldKeys = (fields) =>
  Object.entries(fields)
    .filter(([, value]) => cleanString(value))
    .map(([key]) => key);

const scoreCandidate = ({ officialGroups, fields, manyChatId, explicitHandles, crmMatch, processed, subscriber }) => {
  let priority = 0;
  const reasons = [];
  if (manyChatId) {
    priority += 90;
    reasons.push('has_manychat_id');
  }
  if (officialGroups.some((name) => /leads?_instagram/i.test(name))) {
    priority += 35;
    reasons.push('lead_instagram_group');
  }
  if (officialGroups.some((name) => /primer bolet[ií]n|first email/i.test(name))) {
    priority += 18;
    reasons.push('first_newsletter_flow_group');
  }
  if (officialGroups.some((name) => /second email|onboarding/i.test(name))) {
    priority += 12;
    reasons.push('onboarding_progress_group');
  }
  if (cleanString(fields.phone)) {
    priority += 10;
    reasons.push('has_phone');
  }
  if (cleanString(fields.city) || cleanString(fields.country)) {
    priority += 10;
    reasons.push('has_location');
  }
  if (explicitHandles.length) {
    priority += 8;
    reasons.push('has_explicit_handle_hint');
  }
  if (cleanString(subscriber?.source) === 'api') {
    priority += 6;
    reasons.push('api_source');
  }
  if (crmMatch?.hasEmail && !crmMatch?.hasInstagram) {
    priority += 24;
    reasons.push('existing_card_missing_ig');
  }
  if (!crmMatch?.hasEmail && !crmMatch?.hasInstagram) {
    priority += 12;
    reasons.push('no_crm_card');
  }
  if (crmMatch?.hasEmail && crmMatch?.hasInstagram) {
    priority -= 90;
    reasons.push('already_email_plus_ig');
  }
  if (processed.byEmail || processed.byManyChatId) {
    priority -= 80;
    reasons.push('recently_processed_exact_anchor');
  }
  return { priority, reasons };
};

const candidateFor = ({ subscriber, indexes, processedAnchors }) => {
  const fields = fieldsFor(subscriber);
  const groups = groupNamesFor(subscriber);
  const officialGroups = officialFlowGroups(groups);
  const notes = cleanString(fields.notas ?? fields.notes ?? fields.note);
  const sourceOfSubscriber = cleanString(fields.source_of_subscriber ?? subscriber?.source);
  const manyChatId = extractManyChatId(notes, sourceOfSubscriber, fields.manychat_id, fields.manyChatId);
  const explicitHandles = extractHandles(notes, sourceOfSubscriber, fields.instagram, fields.instagram_handle, fields.ig);
  const email = cleanEmail(subscriber?.email);
  const cardByEmail = email ? indexes.byEmail.get(email) : null;
  const cardByHandle = explicitHandles.map((handle) => indexes.byHandle.get(handle)).find(Boolean) ?? null;
  const crmMatch = {
    personId: cardByEmail?.personId ?? cardByHandle?.personId ?? null,
    hasEmail: Boolean(cardByEmail?.identities?.email ?? cardByHandle?.identities?.email),
    hasInstagram: Boolean(cardByEmail?.identities?.instagramHandle ?? cardByHandle?.identities?.instagramHandle),
    instagramHandle: cleanHandle(cardByEmail?.identities?.instagramHandle ?? cardByHandle?.identities?.instagramHandle),
    displayName: cleanString(cardByEmail?.displayName ?? cardByHandle?.displayName),
  };
  const processed = {
    byEmail: Boolean(email && processedAnchors.emails.has(email)),
    byManyChatId: Boolean(manyChatId && processedAnchors.manyChatIds.has(manyChatId)),
    byHandle: explicitHandles.some((handle) => processedAnchors.handles.has(handle)),
  };
  const { priority, reasons } = scoreCandidate({
    officialGroups,
    fields,
    manyChatId,
    explicitHandles,
    crmMatch,
    processed,
    subscriber,
  });

  return {
    email,
    subscriberId: cleanString(subscriber?.id),
    status: cleanString(subscriber?.status),
    subscribedAt: cleanString(subscriber?.subscribed_at),
    updatedAt: cleanString(subscriber?.updated_at),
    name: cleanString(fields.name ?? subscriber?.name),
    phone: cleanString(fields.phone),
    city: cleanString(fields.city),
    country: cleanString(fields.country),
    groups,
    officialFlowGroups: officialGroups,
    source: cleanString(subscriber?.source),
    sourceOfSubscriber,
    notesSnippet: compactSnippet(notes),
    manyChatId,
    explicitHandlesFromFields: explicitHandles,
    nonEmptyFields: nonEmptyFieldKeys(fields),
    crmMatch,
    processed,
    priority,
    priorityReasons: reasons,
    gaps: [
      crmMatch.hasInstagram ? null : 'instagramHandle',
      crmMatch.hasEmail ? null : 'crmCard',
      cleanString(fields.phone) ? null : 'phone',
      cleanString(fields.city) || cleanString(fields.country) ? null : 'location',
    ].filter(Boolean),
    recommendedExactAnchorSearches: [
      manyChatId ? `manychat_profile:${manyChatId}` : null,
      email ? `instagram_messages_exact_email:${email}` : null,
      cleanString(fields.phone) ? `instagram_messages_exact_phone:${cleanString(fields.phone)}` : null,
    ].filter(Boolean),
  };
};

const isInternalOrTestCandidate = (candidate) => {
  const email = cleanEmail(candidate?.email);
  if (!email) return true;
  return [
    email === 'saludoalsol@gmail.com',
    email.startsWith('saludoalsol+'),
    email.endsWith('@coherenciacreativa.com'),
    /\b(test|prueba|dummy|example)\b/i.test(candidate?.name ?? ''),
  ].some(Boolean);
};

const buildReport = async (options) => {
  const generatedAt = new Date().toISOString();
  const credential = await getCredential(options);
  if (!credential.key) {
    const reason = 'missing_mailerlite_credential';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_official_flow_cohort_map',
      generatedAt,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      safety: safetyBlock(false),
    };
  }

  let scan;
  try {
    scan = await scanSubscribers(options, credential.key);
  } catch (error) {
    const reason = error?.reason || error?.message || 'mailerlite_read_blocked';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_official_flow_cohort_map',
      generatedAt,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      safety: safetyBlock(false),
    };
  }

  const cards = await readCards(options.cardStorePath);
  const indexes = buildCardIndexes(cards);
  const processedAnchors = await readProcessedAnchors(options.reportsDir);
  const allCandidates = scan.subscribers
    .map((subscriber) => candidateFor({ subscriber, indexes, processedAnchors }))
    .filter((candidate) =>
      candidate.email
      && candidate.officialFlowGroups.length
      && !isInternalOrTestCandidate(candidate)
    );

  const withManyChatId = allCandidates.filter((candidate) => candidate.manyChatId);
  const freshManyChatCandidates = allCandidates.filter((candidate) =>
    candidate.manyChatId
    && !candidate.processed.byEmail
    && !candidate.processed.byManyChatId
    && !candidate.crmMatch.hasInstagram
  );
  const emailOnlyOfficialFlowCandidates = allCandidates.filter((candidate) =>
    !candidate.manyChatId
    && !candidate.processed.byEmail
    && !candidate.crmMatch.hasInstagram
  );
  const alreadyCoveredOrProcessed = allCandidates.filter((candidate) =>
    candidate.crmMatch.hasInstagram || candidate.processed.byEmail || candidate.processed.byManyChatId
  );

  const suggestedBatch = freshManyChatCandidates
    .sort((left, right) => right.priority - left.priority || (left.subscribedAt || '').localeCompare(right.subscribedAt || ''))
    .slice(0, options.batchSize);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_official_flow_cohort_map',
    generatedAt,
    ok: true,
    status: scan.exhaustedByCap ? 'scan_page_cap_reached' : 'ok',
    keychain: {
      service: options.service,
      account: options.account,
      credentialSource: credential.source,
    },
    scan: {
      cursorPaginationUsed: true,
      pages: scan.pages,
      subscribersScanned: scan.subscribers.length,
      pageSize: options.limit,
      exhaustedByCap: scan.exhaustedByCap,
    },
    summary: {
      officialFlowLikeSubscribers: allCandidates.length,
      withManyChatId: withManyChatId.length,
      freshManyChatCandidates: freshManyChatCandidates.length,
      emailOnlyOfficialFlowCandidates: emailOnlyOfficialFlowCandidates.length,
      alreadyCoveredOrProcessed: alreadyCoveredOrProcessed.length,
      suggestedBatch: suggestedBatch.length,
      cardStoreCards: cards.length,
      priorExactAnchorReportsRead: processedAnchors.sourceFiles.length,
    },
    officialFlowGroupPatterns: officialGroupPatterns.map((pattern) => String(pattern)),
    processedAnchorSources: processedAnchors.sourceFiles,
    suggestedBatch,
    nextManyChatCandidates: freshManyChatCandidates
      .sort((left, right) => right.priority - left.priority)
      .slice(0, Math.max(options.batchSize * 3, options.batchSize)),
    emailOnlyOfficialFlowCandidates: emailOnlyOfficialFlowCandidates
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 40),
    alreadyCoveredOrProcessed: alreadyCoveredOrProcessed
      .sort((left, right) => right.priority - left.priority)
      .slice(0, 40),
    safety: safetyBlock(true),
  };
};

const safetyBlock = (credentialChecked) => ({
  readOnly: true,
  credentialChecked,
  tokensPrinted: false,
  mailerLiteMutationsPerformed: false,
  crmWritesPerformed: false,
  factStoreWritesPerformed: false,
  manyChatMutationsPerformed: false,
  instagramMutationsPerformed: false,
  outboundPerformed: false,
});

const renderMarkdown = (report) => {
  if (!report.ok) {
    return [
      '# CRM vNext Official-Flow Cohort Map',
      '',
      `- Status: ${report.status}`,
      `- Blocker: ${report.blocker?.reason ?? 'unknown'}`,
      `- Unblock: ${report.blocker?.unblockAction ?? 'n/a'}`,
      '',
      'Safety: read-only, no tokens printed, no mutations.',
      '',
    ].join('\n');
  }

  return [
    '# CRM vNext Official-Flow Cohort Map',
    '',
    `- Status: ${report.status}`,
    `- Generated at: ${report.generatedAt}`,
    `- MailerLite scan: ${report.scan.pages} pages / ${report.scan.subscribersScanned} subscribers`,
    `- Official-flow-like subscribers: ${report.summary.officialFlowLikeSubscribers}`,
    `- With ManyChat ID: ${report.summary.withManyChatId}`,
    `- Fresh ManyChat candidates: ${report.summary.freshManyChatCandidates}`,
    `- Suggested batch: ${report.summary.suggestedBatch}`,
    `- Prior exact-anchor reports read: ${report.summary.priorExactAnchorReportsRead}`,
    '',
    '## Suggested Batch',
    '',
    ...report.suggestedBatch.flatMap((item, index) => [
      `### ${index + 1}. ${item.name ?? item.email}`,
      '',
      `- Email: ${item.email}`,
      `- ManyChat ID: ${item.manyChatId}`,
      `- Phone: ${item.phone ?? 'none'}`,
      `- Location: ${[item.city, item.country].filter(Boolean).join(', ') || 'none'}`,
      `- Groups: ${item.officialFlowGroups.join(', ')}`,
      `- Priority: ${item.priority} (${item.priorityReasons.join(', ')})`,
      `- CRM match: ${item.crmMatch.personId ?? 'none'}${item.crmMatch.hasInstagram ? ` / @${item.crmMatch.instagramHandle}` : ''}`,
      `- Exact-anchor searches: ${item.recommendedExactAnchorSearches.join(' | ')}`,
      item.notesSnippet ? `- Notes snippet: ${item.notesSnippet}` : null,
      '',
    ].filter(Boolean)),
    '## Safety',
    '',
    '- Read-only MailerLite cursor scan + local filtering.',
    '- No MailerLite, CRM, Fact Store, ManyChat, Instagram, Google, or outbound mutations.',
    '- Tokens not printed.',
    '',
  ].join('\n');
};

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
  const report = await buildReport(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));
  if (!options.out && !options.markdownOut) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(JSON.stringify({
      ok: report.ok,
      status: report.status,
      summary: report.summary ?? null,
      out: options.out,
      markdownOut: options.markdownOut,
    }, null, 2));
  }
  if (options.failOnBlocked && !report.ok) process.exitCode = 2;
};

main().catch((error) => {
  const message = String(error?.message ?? error).replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]');
  console.error(`crm-vnext official-flow cohort map failed: ${message}`);
  process.exitCode = 1;
});
