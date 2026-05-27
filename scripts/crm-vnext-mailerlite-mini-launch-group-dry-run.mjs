#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  readBrandDictionary,
  validateMailerLiteApiBase,
} from './crm-vnext-mailerlite-receipt-taxonomy-plan.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-group-dry-run-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_EMAIL_ASSET_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-group-dry-run.mjs [options]

Options:
  --rehearsal-packet <path>        Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --seed-test-qa-packet <path>     Seed-test QA JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --brand-email-asset-packet <path>
                                   Brand/email asset JSON. Defaults to ${DEFAULT_BRAND_EMAIL_ASSET_PACKET}
  --event-contract <path>          Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --brand-dictionary <path>        Brand group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --service <name>                 Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                 Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                 MailerLite API base. Only https://connect.mailerlite.com/api is allowed.
  --timeout-ms <n>                 Per-request timeout. Defaults to 30000
  --out <path>                     Write JSON report
  --markdown-out <path>            Write Markdown report
  --fail-on-blocked                Exit with code 2 if read-only scan or gates are blocked
  --help                           Show this help

Read-only launch-specific group dry-run for one Mini-Launch OS rehearsal. It checks
whether the Source/Delivered receipt groups for the launch already exist in
MailerLite and whether Brand Hub canon allows them to be considered for future
empty-group creation. It never creates groups, edits workflows, reads subscribers,
assigns subscribers, sends email, writes CRM cards, appends ledgers, or prints tokens.`;

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

const slugify = (value) =>
  cleanString(value)
    ?.normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') ?? null;

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    brandEmailAssetPacket: DEFAULT_BRAND_EMAIL_ASSET_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: null,
    markdownOut: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
    else if (arg === '--brand-email-asset-packet') options.brandEmailAssetPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = validateMailerLiteApiBase(options.apiBase);
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
  if (reason === 'mailerlite_forbidden') return 'Check that the MailerLite API key can read groups.';
  if (reason === 'mailerlite_rate_limited') return 'Retry later; this dry-run is read-only and can be rerun safely.';
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
        'User-Agent': 'CRM-vNext-MailerLite-Mini-Launch-Group-Dry-Run/1.0',
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
  const items = [];
  let cursor = null;
  for (let page = 0; page < 25; page += 1) {
    const params = { limit: 100 };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(options, key, '/groups', params);
    items.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return items;
};

const groupNameFor = (group) => cleanString(group?.name) ?? cleanString(group?.title) ?? cleanString(group?.label);
const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);
const activeCountFor = (group) => group?.active_count ?? group?.subscribers_count ?? group?.total ?? null;

const indexGroupsByName = (groups) => {
  const index = new Map();
  for (const group of groups) {
    const normalized = normalizeName(groupNameFor(group));
    if (normalized) index.set(normalized, group);
  }
  return index;
};

const launchFrom = (rehearsalPacket, seedTestQaPacket, brandEmailAssetPacket, eventContract) => ({
  launchId:
    rehearsalPacket?.launch?.launchId
    ?? seedTestQaPacket?.launch?.launchId
    ?? brandEmailAssetPacket?.launch?.launchId
    ?? eventContract?.launch?.launchId,
  resourceName:
    rehearsalPacket?.launch?.resourceName
    ?? seedTestQaPacket?.launch?.resourceName
    ?? brandEmailAssetPacket?.launch?.resourceName
    ?? eventContract?.launch?.resourceName,
  resourceType:
    rehearsalPacket?.launch?.resourceType
    ?? seedTestQaPacket?.launch?.resourceType
    ?? brandEmailAssetPacket?.launch?.resourceType
    ?? eventContract?.launch?.resourceType,
  sourceGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name
    ?? seedTestQaPacket?.launch?.sourceGroupCandidate
    ?? brandEmailAssetPacket?.launch?.sourceGroupCandidate
    ?? eventContract?.launch?.sourceGroupCandidate
    ?? null,
  deliveredGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name
    ?? seedTestQaPacket?.launch?.deliveredGroupCandidate
    ?? brandEmailAssetPacket?.launch?.deliveredGroupCandidate
    ?? eventContract?.launch?.deliveredGroupCandidate
    ?? null,
});

const candidateRowsFor = (launch) => {
  const slug = slugify(launch.resourceName);
  return [
    {
      name: launch.sourceGroupCandidate,
      layer: 'Source',
      recommendedStatus: 'candidate',
      meaning: `Posible origen de personas que entran por el test/quiz ${launch.resourceName}.`,
      usage: 'Cohorte de mini-lanzamiento; crear en MailerLite solo si hace falta para routing, dedupe o recibo seed.',
      crmMapping: `source_type=quiz; source=${slug}`,
    },
    {
      name: launch.deliveredGroupCandidate,
      layer: 'Delivered',
      recommendedStatus: 'candidate',
      meaning: `Posible marcador de entrega del resultado o práctica de ${launch.resourceName}.`,
      usage: 'Recibo de promesa cumplida; no significa apertura, lectura, click ni interés.',
      crmMapping: `content.delivered=quiz_result_${slug}`,
    },
  ];
};

const brandStatusAllowsFutureEmptyCreate = (status) =>
  ['proposed_local', 'live_canonical'].includes(cleanString(status));

const planLaunchGroups = ({ launch, brandDictionary, liveGroups }) => {
  const liveIndex = indexGroupsByName(liveGroups);
  return candidateRowsFor(launch).map((candidate) => {
    const normalized = normalizeName(candidate.name);
    const brandGroup = brandDictionary.groupsByNormalized.get(normalized) ?? null;
    const liveGroup = liveIndex.get(normalized) ?? null;
    const registeredInBrandDictionary = Boolean(brandGroup);
    const existsInMailerLite = Boolean(liveGroup);
    let status = 'blocked_missing_brand_dictionary_candidate';
    let recommendedAction = 'add_candidate_to_brand_dictionary_before_any_live_group_plan';

    if (registeredInBrandDictionary && !brandStatusAllowsFutureEmptyCreate(brandGroup.status)) {
      status = 'blocked_brand_status_not_create_approved';
      recommendedAction = 'brand_review_or_promote_to_proposed_local_before_empty_create';
    }
    if (registeredInBrandDictionary && brandStatusAllowsFutureEmptyCreate(brandGroup.status) && existsInMailerLite) {
      status = 'exists_in_mailerlite';
      recommendedAction = 'no_create_needed_verify_scope_before_any_receipt_assignment';
    }
    if (registeredInBrandDictionary && brandStatusAllowsFutureEmptyCreate(brandGroup.status) && !existsInMailerLite) {
      status = 'safe_to_create_empty_after_explicit_approval';
      recommendedAction = 'create_named_empty_group_only_after_explicit_approval_no_workflow_or_subscriber_attachment';
    }

    return {
      name: candidate.name,
      layer: candidate.layer,
      object: launch.resourceType,
      detail: launch.resourceName,
      registeredInBrandDictionary,
      brandStatus: brandGroup?.status ?? null,
      brandLayer: brandGroup?.layer ?? null,
      brandPurpose: brandGroup?.purpose ?? null,
      existsInMailerLite,
      liveGroupId: liveGroup ? groupIdFor(liveGroup) : null,
      activeCount: liveGroup ? activeCountFor(liveGroup) : null,
      proposedBrandDictionaryRow: registeredInBrandDictionary ? null : candidate,
      emptyGroupCreationStatus: status,
      workflowUseStatus: 'not_ready_for_workflow_use',
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
      sendAllowed: false,
      allowedOperation: status === 'safe_to_create_empty_after_explicit_approval'
        ? 'create_named_empty_group_only_after_explicit_approval'
        : 'none',
      recommendedAction,
    };
  });
};

const buildApprovalPhrase = (targets) => {
  if (!targets.length) return null;
  return `Apruebo crear únicamente estos ${targets.length} grupos vacíos del mini-lanzamiento en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar onboarding y con re-scan fresco previo: ${targets.map((target) => target.name).join('; ')}.`;
};

const buildSafety = ({ mailerLiteGroupsRead = 0, credentialSource = null }) => ({
  localOnly: false,
  readOnly: true,
  credentialSource: credentialSource ? 'configured_not_printed' : null,
  mailerLiteGroupsRead,
  mailerLiteSubscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteGroupsCreated: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const sourceDigestsFor = async (options) => {
  const paths = [
    options.rehearsalPacket,
    options.seedTestQaPacket,
    options.brandEmailAssetPacket,
    options.eventContract,
    options.brandDictionary,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push({
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor: path.includes('brand_email_asset')
        ? 'Brand/email copy readiness before seed test'
        : path.includes('seed_test_qa')
          ? 'seed-test and receipt-test gate separation'
          : path.includes('GROUP_DICTIONARY')
            ? 'Brand group canon and candidate status'
            : 'mini-launch launch identity and receipt candidates',
    });
  }
  return digests;
};

const buildBlockedReport = ({ reason, options, sourceDigests = [], generatedAt = new Date().toISOString() }) => ({
  schemaVersion: SCHEMA_VERSION,
  mode: 'read_only_mailerlite_launch_os_mini_launch_group_dry_run',
  generatedAt,
  ok: false,
  status: 'blocked_by_mailerlite_read_only_scan',
  blocker: {
    reason,
    unblockAction: unblockActionFor(reason, options),
  },
  sourceDigests,
  safety: buildSafety({ mailerLiteGroupsRead: 0, credentialSource: null }),
});

const buildReport = async (options, { generatedAt = new Date().toISOString(), liveGroupsOverride = null } = {}) => {
  const [rehearsalPacket, seedTestQaPacket, brandEmailAssetPacket, eventContract, brandDictionary, sourceDigests] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.seedTestQaPacket),
    readJson(options.brandEmailAssetPacket),
    readJson(options.eventContract),
    readBrandDictionary(options.brandDictionary),
    sourceDigestsFor(options),
  ]);

  const launch = launchFrom(rehearsalPacket, seedTestQaPacket, brandEmailAssetPacket, eventContract);
  const credential = liveGroupsOverride ? { key: 'fixture', source: 'fixture' } : await getCredential(options);
  if (!credential?.key) return buildBlockedReport({ reason: 'missing_mailerlite_credential', options, sourceDigests, generatedAt });

  let liveGroups = liveGroupsOverride;
  if (!liveGroups) {
    try {
      liveGroups = await scanGroups(options, credential.key);
    } catch (error) {
      return buildBlockedReport({
        reason: error?.reason || error?.message || 'unknown_mailerlite_error',
        options,
        sourceDigests,
        generatedAt,
      });
    }
  }

  const plannedGroups = planLaunchGroups({ launch, brandDictionary, liveGroups });
  const safeEmptyCreateTargets = plannedGroups.filter((group) =>
    group.emptyGroupCreationStatus === 'safe_to_create_empty_after_explicit_approval');
  const missingBrandCandidates = plannedGroups.filter((group) =>
    group.emptyGroupCreationStatus === 'blocked_missing_brand_dictionary_candidate');
  const brandStatusBlocked = plannedGroups.filter((group) =>
    group.emptyGroupCreationStatus === 'blocked_brand_status_not_create_approved');
  const groupsAlreadyLive = plannedGroups.filter((group) => group.existsInMailerLite);
  const allGroupsReadyForFutureEmptyCreate = plannedGroups.length > 0
    && plannedGroups.every((group) =>
      group.emptyGroupCreationStatus === 'safe_to_create_empty_after_explicit_approval'
      || group.emptyGroupCreationStatus === 'exists_in_mailerlite');

  let status = 'mini_launch_group_dry_run_ready_for_future_empty_group_decision';
  if (missingBrandCandidates.length) status = 'blocked_until_brand_dictionary_candidates';
  else if (brandStatusBlocked.length) status = 'blocked_until_brand_promotes_or_rejects_candidates';
  else if (groupsAlreadyLive.length === plannedGroups.length) status = 'mini_launch_groups_already_exist_no_create_needed';

  const canCreateNamedEmptyGroupsAfterExplicitApproval = allGroupsReadyForFutureEmptyCreate && safeEmptyCreateTargets.length > 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_launch_os_mini_launch_group_dry_run',
    generatedAt,
    ok: true,
    status,
    launch,
    summary: {
      liveGroupsRead: liveGroups.length,
      plannedGroupCount: plannedGroups.length,
      missingBrandCandidateCount: missingBrandCandidates.length,
      brandStatusBlockedCount: brandStatusBlocked.length,
      groupsAlreadyLiveCount: groupsAlreadyLive.length,
      safeEmptyCreateTargetCount: safeEmptyCreateTargets.length,
    },
    readiness: {
      brandDictionaryHasTargets: missingBrandCandidates.length === 0,
      brandApprovedForEmptyCreate: brandStatusBlocked.length === 0 && missingBrandCandidates.length === 0,
      canCreateNamedEmptyGroupsAfterExplicitApproval,
      canUseForReceiptSeedTestNow: false,
      canAssignSubscribersNow: false,
      canSendNow: false,
      canAttachWorkflowNow: false,
      nextNoLiveMove: missingBrandCandidates.length
        ? 'Have Brand add/review the proposed candidate rows in the group dictionary, then rerun this dry-run.'
        : brandStatusBlocked.length
          ? 'Brand should either promote the candidates to proposed_local or reject/rename them before any empty-group approval phrase exists.'
          : groupsAlreadyLive.length === plannedGroups.length
            ? 'Mini-launch receipt groups already exist in MailerLite; no empty-group creation approval is needed for this boundary. Continue only to the next separate local/approval gate.'
            : 'Prepare exact approval packet only if Alejandro wants to create the missing groups empty; receipt assignment remains a separate gate.',
    },
    plannedGroups,
    proposedBrandDictionaryRows: missingBrandCandidates
      .map((group) => group.proposedBrandDictionaryRow)
      .filter(Boolean),
    futureApprovalPhrase: canCreateNamedEmptyGroupsAfterExplicitApproval
      ? buildApprovalPhrase(safeEmptyCreateTargets)
      : null,
    approvalGate: {
      canCreateGroups: false,
      canCreateNamedEmptyGroupsAfterExplicitApproval,
      canUseWorkflow: false,
      canAttachToProtectedWorkflow: false,
      canAssignSubscribers: false,
      canSendEmail: false,
      note: 'A dry-run approval phrase, when present, can only cover named empty group creation. It never authorizes receipt assignment, workflow use, subscriber mutation, or sends.',
    },
    sourceDigests,
    safety: buildSafety({
      mailerLiteGroupsRead: liveGroups.length,
      credentialSource: credential.source,
    }),
  };
};

const markdownTableRowForCandidate = (candidate) =>
  `| \`${candidate.name}\` | ${candidate.layer} | \`${candidate.recommendedStatus}\` | ${candidate.meaning} | ${candidate.usage} | \`${candidate.crmMapping}\` |`;

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Group Dry-Run',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    '',
  ];

  if (!report.ok) {
    lines.push('## Blocker', '', `- Reason: ${report.blocker.reason}`, `- Unblock action: ${report.blocker.unblockAction}`, '');
  } else {
    lines.push(
      '## Decision Ejecutiva',
      '',
      `Mini-lanzamiento: ${report.launch.resourceName}`,
      `launch_id: ${report.launch.launchId}`,
      '',
      'Este dry-run revisa solo los grupos de recibo del mini-lanzamiento. No crea grupos, no toca subscribers, no conecta workflows y no envía correos.',
      '',
      '## Summary',
      '',
      `- Live MailerLite groups read: ${report.summary.liveGroupsRead}`,
      `- Planned launch groups: ${report.summary.plannedGroupCount}`,
      `- Missing Brand dictionary candidates: ${report.summary.missingBrandCandidateCount}`,
      `- Brand status blocked: ${report.summary.brandStatusBlockedCount}`,
      `- Already live: ${report.summary.groupsAlreadyLiveCount}`,
      `- Safe empty-create targets after explicit approval: ${report.summary.safeEmptyCreateTargetCount}`,
      '',
      '## Readiness',
      '',
      `- Brand dictionary has targets: ${report.readiness.brandDictionaryHasTargets}`,
      `- Brand approved for empty create: ${report.readiness.brandApprovedForEmptyCreate}`,
      `- Can create named empty groups after explicit approval: ${report.readiness.canCreateNamedEmptyGroupsAfterExplicitApproval}`,
      `- Can use for receipt seed test now: ${report.readiness.canUseForReceiptSeedTestNow}`,
      `- Can assign subscribers now: ${report.readiness.canAssignSubscribersNow}`,
      `- Can send now: ${report.readiness.canSendNow}`,
      `- Can attach workflow now: ${report.readiness.canAttachWorkflowNow}`,
      '',
      '## Planned Groups',
      '',
    );

    for (const group of report.plannedGroups) {
      lines.push(`### ${group.name}`);
      lines.push(`- Layer: ${group.layer}`);
      lines.push(`- Brand dictionary: ${group.registeredInBrandDictionary ? `${group.brandStatus}` : 'missing'}`);
      lines.push(`- Exists in MailerLite: ${group.existsInMailerLite}${group.liveGroupId ? ` (${group.liveGroupId})` : ''}`);
      lines.push(`- Empty group creation status: ${group.emptyGroupCreationStatus}`);
      lines.push(`- Workflow attachment allowed: ${group.workflowAttachmentAllowed}`);
      lines.push(`- Subscriber assignment allowed: ${group.subscriberAssignmentAllowed}`);
      lines.push(`- Send allowed: ${group.sendAllowed}`);
      lines.push(`- Recommended action: ${group.recommendedAction}`);
      lines.push('');
    }

    if (report.proposedBrandDictionaryRows.length) {
      lines.push('## Proposed Brand Dictionary Candidate Rows', '');
      lines.push('| Nombre de grupo | Capa | Estado | Significado | Uso principal | CRM mapping |');
      lines.push('|---|---|---|---|---|---|');
      for (const candidate of report.proposedBrandDictionaryRows) {
        lines.push(markdownTableRowForCandidate(candidate));
      }
      lines.push('');
    }

    lines.push('## Approval Gate', '');
    lines.push(`- canCreateGroups: ${report.approvalGate.canCreateGroups}`);
    lines.push(`- canCreateNamedEmptyGroupsAfterExplicitApproval: ${report.approvalGate.canCreateNamedEmptyGroupsAfterExplicitApproval}`);
    lines.push(`- canUseWorkflow: ${report.approvalGate.canUseWorkflow}`);
    lines.push(`- canAttachToProtectedWorkflow: ${report.approvalGate.canAttachToProtectedWorkflow}`);
    lines.push(`- canAssignSubscribers: ${report.approvalGate.canAssignSubscribers}`);
    lines.push(`- canSendEmail: ${report.approvalGate.canSendEmail}`);
    lines.push(`- Note: ${report.approvalGate.note}`);
    lines.push('');
    lines.push('## Future Approval Phrase');
    lines.push('');
    lines.push(report.futureApprovalPhrase ? `\`${report.futureApprovalPhrase}\`` : '- No approval phrase available yet.');
    lines.push('');
    lines.push('## Next No-Live Move');
    lines.push('');
    lines.push(`- ${report.readiness.nextNoLiveMove}`);
    lines.push('');
  }

  lines.push('## Fuentes Consultadas', '');
  for (const source of report.sourceDigests ?? []) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Read-only.');
  lines.push(`- MailerLite groups read: ${report.safety.mailerLiteGroupsRead}`);
  lines.push('- No subscribers read or printed.');
  lines.push('- No groups created, renamed, deleted or assigned.');
  lines.push('- No workflows, automations, forms, Shopify, CRM cards, Signal Event Ledger, scoring, Fact Store, sends, or outbound touched.');
  lines.push('- No tokens printed.');

  return lines.join('\n');
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

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    launchId: report.launch?.launchId ?? null,
    summary: report.summary ?? null,
    readiness: report.readiness ?? null,
    approvalGate: report.approvalGate ?? null,
    blocker: report.blocker ?? null,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnBlocked && (!report.ok || report.status.startsWith('blocked_'))) {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch group dry-run failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalPhrase,
  buildReport,
  candidateRowsFor,
  launchFrom,
  parseArgs,
  planLaunchGroups,
  renderMarkdown,
  slugify,
};
