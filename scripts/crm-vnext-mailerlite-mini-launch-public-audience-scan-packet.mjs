#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-public-audience-scan-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scan_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scan_packet_current_inteligencia_descansar_2026-05-31.md`;
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-public-audience-scan-packet.mjs [options]

Options:
  --public-audience-scope-packet <path> Current public audience scope packet JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --service <name>                     Keychain service. Defaults to MAILERLITE_KEYCHAIN_SERVICE or ${DEFAULT_SERVICE}
  --account <name>                     Keychain account. Defaults to MAILERLITE_KEYCHAIN_ACCOUNT or ${DEFAULT_ACCOUNT}
  --api-base <url>                     MailerLite API base. Only ${DEFAULT_API_BASE} is allowed.
  --timeout-ms <n>                     Per-request timeout. Defaults to 30000
  --limit <n>                          Cursor page size. Defaults to 100
  --max-pages <n>                      Cursor page cap. Defaults to 100
  --out <path>                         Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --fail-on-blocked                    Exit with code 2 if the read-only scan is blocked
  --help                               Show this help

Read-only MailerLite public audience scan packet for Inteligencia para descansar.
It scans groups and subscriber memberships only to aggregate counts/status posture
for candidate audience groups. It never creates, updates, tags, suppresses,
assigns, deletes, publishes, schedules, sends, opens UI, touches Shopify/CRM,
appends ledgers, writes cards/scoring/Fact Store, or prints tokens, raw IDs,
subscriber rows, recipients or exact URLs.`;

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

const parseArgs = (argv) => {
  const options = {
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    limit: 100,
    maxPages: 100,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--public-audience-scope-packet') options.publicAudienceScopePacket = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--limit') options.limit = Number.parseInt(argv[++index], 10);
    else if (arg === '--max-pages') options.maxPages = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  const apiBase = cleanString(options.apiBase)?.replace(/\/+$/u, '');
  if (apiBase !== DEFAULT_API_BASE) throw new Error('unsupported_mailerlite_api_base');
  options.apiBase = apiBase;
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  options.limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(options.limit, 100) : 100;
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? Math.min(options.maxPages, 250) : 100;
  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      private: false,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
    },
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

const sanitizeError = (value) =>
  String(value ?? 'mailerlite_read_blocked')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/api[_-]?key['":=\s]+[A-Za-z0-9._~+/=-]+/gi, 'api_key=[redacted]')
    .replace(/token['":=\s]+[A-Za-z0-9._~+/=-]+/gi, 'token=[redacted]')
    .replace(/\s+/g, ' ')
    .trim();

const classifyFailure = (status, bodyText = '') => {
  const text = sanitizeError(bodyText);
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const unblockActionFor = (reason, options) => {
  if (reason === 'missing_mailerlite_credential') {
    return `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}, or provide MAILERLITE_API_KEY locally. Do not paste tokens in chat.`;
  }
  if (reason === 'mailerlite_unauthenticated') {
    return `Refresh the MailerLite API key in Keychain service ${options.service}, account ${options.account}.`;
  }
  if (reason === 'mailerlite_forbidden') return 'Check that the MailerLite API key can read groups and subscribers.';
  if (reason === 'mailerlite_rate_limited') return 'Retry later; this scan is read-only and safe to rerun.';
  return 'Inspect MailerLite API/keychain state locally while keeping tokens out of logs.';
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
        'User-Agent': 'CRM-vNext-MailerLite-Public-Audience-Scan/1.0',
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
  for (const key of ['data', 'groups', 'subscribers', 'items', 'results']) {
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

const scanCollection = async (options, key, path, extraParams = {}) => {
  const items = [];
  let cursor = null;
  let pages = 0;
  while (pages < options.maxPages) {
    const params = { limit: options.limit, ...extraParams };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(options, key, path, params);
    items.push(...extractItems(payload));
    pages += 1;
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return {
    items,
    pages,
    exhaustedByCap: Boolean(cursor && pages >= options.maxPages),
  };
};

const groupNameFor = (group) => cleanString(group?.name) ?? cleanString(group?.title) ?? cleanString(group?.label);
const activeCountFor = (group) => {
  const value = group?.active_count ?? group?.activeCount ?? group?.subscribers_count ?? group?.total;
  return Number.isFinite(value) ? value : Number.isFinite(Number(value)) ? Number(value) : null;
};

const groupNamesForSubscriber = (subscriber) =>
  (Array.isArray(subscriber?.groups) ? subscriber.groups : [])
    .map((group) => groupNameFor(group))
    .filter(Boolean);

const statusForSubscriber = (subscriber) => normalizeName(subscriber?.status) ?? 'unknown';

const suppressionRiskStatuses = new Set([
  'unsubscribed',
  'bounced',
  'junk',
  'complained',
  'inactive',
  'unconfirmed',
]);

const isSuppressionRiskStatus = (status) =>
  status !== 'active' && status !== 'subscribed' && suppressionRiskStatuses.has(status);

const unique = (items) => [...new Set(items.filter(Boolean))];

const candidateGroupNamesFromScope = (scopePacket) => unique([
  scopePacket?.executiveSummary?.currentSafetyGroupName,
  ...(scopePacket?.audienceScopeOptions ?? []).map((option) => option?.groupName),
]);

const buildGroupIndex = (groups) => {
  const index = new Map();
  for (const group of groups) {
    const normalized = normalizeName(groupNameFor(group));
    if (normalized) index.set(normalized, group);
  }
  return index;
};

const initStatusCounts = () => ({
  active: 0,
  subscribed: 0,
  unsubscribed: 0,
  bounced: 0,
  junk: 0,
  complained: 0,
  inactive: 0,
  unconfirmed: 0,
  unknown: 0,
  other: 0,
});

const buildCandidateSummaries = ({ publicAudienceScopePacket, liveGroups, subscribers }) => {
  const groupIndex = buildGroupIndex(liveGroups);
  const candidateNames = candidateGroupNamesFromScope(publicAudienceScopePacket);
  const summaries = new Map();

  for (const name of candidateNames) {
    const liveGroup = groupIndex.get(normalizeName(name));
    summaries.set(name, {
      name,
      referencedByOptionIds: (publicAudienceScopePacket?.audienceScopeOptions ?? [])
        .filter((option) => option?.groupName === name)
        .map((option) => option.id),
      existsInMailerLite: Boolean(liveGroup),
      groupIdKnown: Boolean(liveGroup),
      apiActiveCount: liveGroup ? activeCountFor(liveGroup) : null,
      subscriberMembershipCountFromScan: 0,
      statusCounts: initStatusCounts(),
      suppressionRiskCountFromScan: 0,
      exactSubscriberRowsPrinted: false,
      rawIdsPrinted: false,
      recipientsPrinted: false,
    });
  }

  let subscribersMatchedToCandidateGroups = 0;
  for (const subscriber of subscribers) {
    const subscriberGroupNames = groupNamesForSubscriber(subscriber);
    const matchingCandidateNames = candidateNames.filter((name) => subscriberGroupNames.includes(name));
    if (!matchingCandidateNames.length) continue;
    subscribersMatchedToCandidateGroups += 1;
    const status = statusForSubscriber(subscriber);
    for (const name of matchingCandidateNames) {
      const summary = summaries.get(name);
      summary.subscriberMembershipCountFromScan += 1;
      if (Object.prototype.hasOwnProperty.call(summary.statusCounts, status)) summary.statusCounts[status] += 1;
      else summary.statusCounts.other += 1;
      if (isSuppressionRiskStatus(status) || (!['active', 'subscribed', 'unknown'].includes(status))) {
        summary.suppressionRiskCountFromScan += 1;
      }
    }
  }

  return {
    candidateGroups: [...summaries.values()],
    subscribersMatchedToCandidateGroups,
  };
};

const buildSafety = ({
  mailerLiteApiCalled = false,
  groupsRead = 0,
  subscribersRead = 0,
  credentialSource = null,
}) => ({
  localOnly: false,
  reportsOnly: true,
  readOnly: true,
  credentialSource: credentialSource ? 'configured_not_printed' : null,
  mailerLiteApiCalled,
  mailerLiteGroupsRead: groupsRead,
  mailerLiteSubscribersRead: subscribersRead,
  mailerLiteMutationsPerformed: false,
  mailerLiteUiUsed: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const buildBlockedReport = ({
  reason,
  options,
  publicAudienceScopePacket = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => ({
  schemaVersion: SCHEMA_VERSION,
  mode: 'read_only_mailerlite_mini_launch_public_audience_scan_packet',
  generatedAt,
  ok: false,
  status: 'blocked_by_mailerlite_read_only_scan',
  launch: {
    resourceName: publicAudienceScopePacket?.launch?.resourceName ?? 'Inteligencia para descansar',
    resourceType: publicAudienceScopePacket?.launch?.resourceType ?? 'quiz',
  },
  executiveSummary: {
    freshAudienceScanReady: false,
    membershipScanReady: false,
    suppressionStatusScanReady: false,
    suppressionExclusionPolicyReady: false,
    candidateGroupCount: candidateGroupNamesFromScope(publicAudienceScopePacket).length,
    groupsRead: 0,
    subscribersScanned: 0,
    subscribersMatchedToCandidateGroups: 0,
    blockerCount: 1,
    nextSafeAction: unblockActionFor(reason, options),
  },
  blockersBeforeAudienceScopeApproval: [reason],
  blocker: {
    reason,
    unblockAction: unblockActionFor(reason, options),
  },
  sourceDigests,
  safety: buildSafety(),
});

const buildPublicAudienceScanPacket = ({
  publicAudienceScopePacket,
  liveGroups,
  subscriberScan,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
  credentialSource = 'fixture',
}) => {
  const candidateSummaries = buildCandidateSummaries({
    publicAudienceScopePacket,
    liveGroups,
    subscribers: subscriberScan.subscribers,
  });
  const pageCapReached = subscriberScan.exhaustedByCap === true;
  const freshAudienceScanReady = !pageCapReached && candidateSummaries.candidateGroups.length > 0;
  const resolvedBlockers = freshAudienceScanReady ? ['fresh_audience_membership_scan_missing'] : [];
  const inheritedBlockers = publicAudienceScopePacket?.blockersBeforeScopeReady ?? [];
  const blockersBeforeAudienceScopeApproval = unique([
    ...inheritedBlockers.filter((blocker) => !resolvedBlockers.includes(blocker)),
    pageCapReached ? 'subscriber_scan_page_cap_reached' : null,
    'suppression_exclusion_policy_missing',
  ]);

  const safety = buildSafety({
    mailerLiteApiCalled: credentialSource !== 'fixture',
    groupsRead: liveGroups.length,
    subscribersRead: subscriberScan.subscribers.length,
    credentialSource,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_mini_launch_public_audience_scan_packet',
    generatedAt,
    ok: true,
    status: freshAudienceScanReady
      ? 'public_audience_scan_packet_ready_read_only_no_mutations'
      : 'public_audience_scan_packet_blocked_incomplete_read_only_no_mutations',
    launch: {
      launchId: publicAudienceScopePacket?.launch?.launchId ?? null,
      resourceName: publicAudienceScopePacket?.launch?.resourceName ?? 'Inteligencia para descansar',
      resourceType: publicAudienceScopePacket?.launch?.resourceType ?? 'quiz',
    },
    executiveSummary: {
      freshAudienceScanReady,
      membershipScanReady: freshAudienceScanReady,
      suppressionStatusScanReady: freshAudienceScanReady,
      suppressionExclusionPolicyReady: false,
      candidateGroupCount: candidateSummaries.candidateGroups.length,
      groupsRead: liveGroups.length,
      subscribersScanned: subscriberScan.subscribers.length,
      subscribersMatchedToCandidateGroups: candidateSummaries.subscribersMatchedToCandidateGroups,
      subscriberScanPages: subscriberScan.pages,
      subscriberScanPageCapReached: pageCapReached,
      resolvedBlockerCount: resolvedBlockers.length,
      blockerCount: blockersBeforeAudienceScopeApproval.length,
      nextSafeAction: freshAudienceScanReady
        ? 'Use this aggregate scan as fresh audience evidence; still require exact audience choice, URL gate, suppression/exclusion policy, and exact send approval before any public send.'
        : 'Refresh the read-only MailerLite scan until candidate group membership evidence is complete.',
    },
    candidateAudienceGroups: candidateSummaries.candidateGroups,
    audienceScopeProgress: {
      inheritedBlockers,
      resolvedBlockers,
      remainingBlockers: blockersBeforeAudienceScopeApproval,
      publicAudienceScopeReadyAfterScan: false,
      canAskAudienceScopeApprovalNowAfterScan: false,
    },
    hardStops: [
      'No public or audience send.',
      'No subscriber import, assignment, update, suppression change or deletion.',
      'No group creation, deletion, rename or assignment.',
      'No workflow, automation, campaign publish or schedule.',
      'No Shopify or CRM live mutation.',
      'No Signal Ledger append, card/scoring mutation or Fact Store write.',
      'No subscriber rows, raw IDs, exact recipients, exact URLs or tokens printed.',
    ],
    sourceDigests,
    safety,
  };
};

const loadAndScan = async (options) => {
  const source = await readJsonWithDigest(
    options.publicAudienceScopePacket,
    'candidate public/audience groups and current audience blockers',
  );
  const credential = await getCredential(options);
  if (!credential?.key) {
    return buildBlockedReport({
      reason: 'missing_mailerlite_credential',
      options,
      publicAudienceScopePacket: source.value,
      sourceDigests: [source.digest],
    });
  }

  let groupScan;
  let subscriberScanRaw;
  try {
    groupScan = await scanCollection(options, credential.key, '/groups');
    subscriberScanRaw = await scanCollection(options, credential.key, '/subscribers', { include: 'groups' });
  } catch (error) {
    return buildBlockedReport({
      reason: error?.reason || error?.message || 'mailerlite_read_blocked',
      options,
      publicAudienceScopePacket: source.value,
      sourceDigests: [source.digest],
    });
  }

  return buildPublicAudienceScanPacket({
    publicAudienceScopePacket: source.value,
    liveGroups: groupScan.items,
    subscriberScan: {
      subscribers: subscriberScanRaw.items,
      pages: subscriberScanRaw.pages,
      exhaustedByCap: subscriberScanRaw.exhaustedByCap,
    },
    sourceDigests: [source.digest],
    credentialSource: credential.source,
  });
};

const renderList = (items) => (items.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Mini-Launch Public Audience Scan Packet',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Launch: ${report.launch?.resourceName ?? 'unknown'}`,
    '',
    '## Executive Summary',
    '',
    `- Fresh audience scan ready: ${report.executiveSummary.freshAudienceScanReady}`,
    `- Membership scan ready: ${report.executiveSummary.membershipScanReady}`,
    `- Suppression status scan ready: ${report.executiveSummary.suppressionStatusScanReady}`,
    `- Suppression/exclusion policy ready: ${report.executiveSummary.suppressionExclusionPolicyReady}`,
    `- Candidate groups: ${report.executiveSummary.candidateGroupCount}`,
    `- MailerLite groups read: ${report.executiveSummary.groupsRead}`,
    `- MailerLite subscribers scanned: ${report.executiveSummary.subscribersScanned}`,
    `- Subscribers matched to candidate groups: ${report.executiveSummary.subscribersMatchedToCandidateGroups}`,
    `- Blocker count after scan: ${report.executiveSummary.blockerCount}`,
    `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
    '',
  ];

  if (!report.ok) {
    lines.push('## Blocker', '', `- Reason: ${report.blocker?.reason ?? 'unknown'}`, `- Unblock: ${report.blocker?.unblockAction ?? 'n/a'}`, '');
  } else {
    lines.push('## Candidate Audience Groups', '');
    for (const group of report.candidateAudienceGroups) {
      lines.push(`### ${group.name}`);
      lines.push(`- Exists in MailerLite: ${group.existsInMailerLite}`);
      lines.push(`- Group ID known but not printed: ${group.groupIdKnown}`);
      lines.push(`- API active count: ${group.apiActiveCount ?? 'unknown'}`);
      lines.push(`- Subscriber membership count from scan: ${group.subscriberMembershipCountFromScan}`);
      lines.push(`- Suppression risk count from scan: ${group.suppressionRiskCountFromScan}`);
      lines.push(`- Status counts: ${Object.entries(group.statusCounts).map(([key, value]) => `${key}=${value}`).join(', ')}`);
      lines.push('');
    }
    lines.push('## Audience Scope Progress', '');
    lines.push('Resolved blockers:');
    lines.push(renderList(report.audienceScopeProgress.resolvedBlockers));
    lines.push('');
    lines.push('Remaining blockers:');
    lines.push(renderList(report.audienceScopeProgress.remainingBlockers));
    lines.push('');
  }

  lines.push('## Hard Stops', '');
  lines.push(renderList(report.hardStops ?? []));
  lines.push('');
  lines.push('## Safety', '');
  lines.push(`- Read-only: ${report.safety.readOnly}`);
  lines.push(`- MailerLite API called: ${report.safety.mailerLiteApiCalled}`);
  lines.push(`- MailerLite groups read: ${report.safety.mailerLiteGroupsRead}`);
  lines.push(`- MailerLite subscribers read: ${report.safety.mailerLiteSubscribersRead}`);
  lines.push(`- Subscriber rows printed: ${report.safety.subscriberRowsPrinted}`);
  lines.push(`- Subscriber mutations performed: ${report.safety.subscriberMutationsPerformed}`);
  lines.push(`- Group mutations performed: ${report.safety.groupMutationsPerformed}`);
  lines.push(`- Sends performed: ${report.safety.sendsPerformed}`);
  lines.push(`- Raw IDs printed: ${report.safety.rawIdsPrinted}`);
  lines.push(`- Recipients printed: ${report.safety.recipientsPrinted}`);
  lines.push(`- Tokens printed: ${report.safety.tokensPrinted}`);
  lines.push('');

  return lines.join('\n');
};

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await loadAndScan(options);
  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    freshAudienceScanReady: report.executiveSummary.freshAudienceScanReady,
    membershipScanReady: report.executiveSummary.membershipScanReady,
    suppressionStatusScanReady: report.executiveSummary.suppressionStatusScanReady,
    suppressionExclusionPolicyReady: report.executiveSummary.suppressionExclusionPolicyReady,
    candidateGroupCount: report.executiveSummary.candidateGroupCount,
    groupsRead: report.executiveSummary.groupsRead,
    subscribersScanned: report.executiveSummary.subscribersScanned,
    subscribersMatchedToCandidateGroups: report.executiveSummary.subscribersMatchedToCandidateGroups,
    blockerCount: report.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnBlocked && !report.ok) process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch public audience scan packet failed: ${sanitizeError(error.message)}`);
    process.exitCode = 1;
  });
}

export {
  buildCandidateSummaries,
  buildPublicAudienceScanPacket,
  buildSafety,
  candidateGroupNamesFromScope,
  parseArgs,
  renderMarkdown,
};
