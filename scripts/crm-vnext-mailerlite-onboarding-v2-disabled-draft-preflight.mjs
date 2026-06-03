#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-disabled-draft-preflight-2026-06-03';
const DEFAULT_BOUNDARY_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_boundary_packet_current_2026-06-03.json';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_MAPPING_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_draft_content_mapping_hardening_2026-06-03.json';
const DEFAULT_EMPTY_GROUPS_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const PROTECTED_V1_WORKFLOW = 'Onboarding flow';
const PROPOSED_V2_WORKFLOW = 'Onboarding editorial v2 - DRAFT';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-disabled-draft-preflight.mjs [options]

Options:
  --boundary-packet <path>       Current disabled draft build boundary JSON. Defaults to ${DEFAULT_BOUNDARY_PACKET}
  --design-packet <path>         Onboarding v2 design JSON. Defaults to ${DEFAULT_DESIGN_PACKET}
  --mapping-packet <path>        Onboarding v2 mapping hardening JSON. Defaults to ${DEFAULT_MAPPING_PACKET}
  --empty-groups-receipt <path>  Executed empty-groups receipt JSON. Defaults to ${DEFAULT_EMPTY_GROUPS_RECEIPT}
  --service <name>               Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>               Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>               MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>               Per-request timeout. Defaults to 30000
  --out <path>                   Write JSON receipt
  --markdown-out <path>          Write Markdown receipt
  --fail-on-blocked              Exit with code 2 when preflight is blocked
  --help                         Show this help

Read-only MailerLite preflight for a future disabled Onboarding v2 draft build.
It reads only groups and automations, verifies the protected v1 workflow posture,
verifies the 12 already-created v2 groups still exist with active_count=0, and
checks for a conflicting v2 workflow boundary. It does not create, clone, edit,
activate, pause or disable workflows; it does not read subscriber rows; it does
not mutate groups, tags, segments, campaigns, sends, CRM, ledgers, cards,
scoring, Shopify or Fact Store; and it does not print tokens.`;

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

const safeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

const safeBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1 ? true : value === 0 ? false : null;
  const text = cleanString(value)?.toLowerCase();
  if (['true', 'yes', 'enabled', 'active', '1'].includes(text)) return true;
  if (['false', 'no', 'disabled', 'inactive', 'draft', '0'].includes(text)) return false;
  return null;
};

const sha256 = (value) =>
  cleanString(value)
    ? createHash('sha256').update(cleanString(value)).digest('hex')
    : null;

const parseArgs = (argv) => {
  const options = {
    boundaryPacket: DEFAULT_BOUNDARY_PACKET,
    designPacket: DEFAULT_DESIGN_PACKET,
    mappingPacket: DEFAULT_MAPPING_PACKET,
    emptyGroupsReceipt: DEFAULT_EMPTY_GROUPS_RECEIPT,
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
    else if (arg === '--boundary-packet') options.boundaryPacket = argv[++index];
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--mapping-packet') options.mappingPacket = argv[++index];
    else if (arg === '--empty-groups-receipt') options.emptyGroupsReceipt = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.service = cleanString(options.service);
  options.account = cleanString(options.account);
  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/, '');
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${options.apiBase}`);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const uniqueNames = (values) => {
  const seen = new Set();
  const names = [];
  for (const value of values) {
    const name = cleanString(value);
    const normalized = normalizeName(name);
    if (!name || !normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    names.push(name);
  }
  return names;
};

const extractRequiredV2GroupNames = ({ designPacket, mappingPacket, emptyGroupsReceipt }) => {
  const receiptNames = Array.isArray(emptyGroupsReceipt?.createdGroups)
    ? emptyGroupsReceipt.createdGroups.map((group) => group?.name)
    : [];
  if (receiptNames.length) return uniqueNames(receiptNames);

  const designNames = Array.isArray(designPacket?.groupWorkNeededBeforeV2Pilot?.missingOrProposedGroups)
    ? designPacket.groupWorkNeededBeforeV2Pilot.missingOrProposedGroups.map((group) => group?.name)
    : [];
  if (designNames.length) return uniqueNames(designNames);

  const mappingNames = [
    mappingPacket?.draftSkeleton?.sourceAssignmentExpectedBeforeTrigger,
    mappingPacket?.draftSkeleton?.firstAction?.group,
    mappingPacket?.draftSkeleton?.completionActions?.map((action) => action?.group),
    mappingPacket?.contentReceiptMap?.map((item) => item?.receiptGroup),
  ].flat(3);
  return uniqueNames(mappingNames);
};

const safeId = (item) => cleanString(item?.id) ?? cleanString(item?.automation_id) ?? cleanString(item?.group_id);
const safeName = (item) => cleanString(item?.name) ?? cleanString(item?.title);
const activeCountFor = (group) => safeNumber(group?.active_count ?? group?.activeCount ?? group?.subscribers_count ?? group?.total);

const summarizeWorkflow = (workflow) => ({
  idSha256: sha256(safeId(workflow)),
  name: safeName(workflow),
  enabled: safeBool(workflow?.enabled ?? workflow?.active),
  complete: safeBool(workflow?.complete),
  broken: safeBool(workflow?.broken),
  status: cleanString(workflow?.status ?? workflow?.state),
});

const summarizeGroup = (group) => ({
  idSha256: sha256(safeId(group)),
  name: safeName(group),
  activeCount: activeCountFor(group),
});

const evaluateV1Workflow = ({ workflows, workflowName = PROTECTED_V1_WORKFLOW }) => {
  const matches = workflows.filter((workflow) => normalizeName(safeName(workflow)) === normalizeName(workflowName));
  const workflow = matches[0] ?? null;
  const summary = workflow ? summarizeWorkflow(workflow) : { name: workflowName, found: false };
  const blockers = [];
  if (!workflow) blockers.push('productive_v1_workflow_missing');
  if (matches.length > 1) blockers.push(`productive_v1_workflow_duplicate_count:${matches.length}`);
  if (workflow) {
    if (summary.enabled !== true) blockers.push(`productive_v1_enabled_not_true:${summary.enabled ?? 'unknown'}`);
    if (summary.complete !== true) blockers.push(`productive_v1_complete_not_true:${summary.complete ?? 'unknown'}`);
    if (summary.broken !== false) blockers.push(`productive_v1_broken_not_false:${summary.broken ?? 'unknown'}`);
  }
  return {
    ok: blockers.length === 0,
    workflow: summary,
    blockers,
  };
};

const evaluateRequiredGroups = ({ requiredGroupNames, groups, expectedTargetCount = null }) => {
  const groupsByName = new Map();
  for (const group of groups) {
    const normalized = normalizeName(safeName(group));
    if (!normalized) continue;
    if (!groupsByName.has(normalized)) groupsByName.set(normalized, []);
    groupsByName.get(normalized).push(group);
  }

  const targetResults = requiredGroupNames.map((name) => {
    const matches = groupsByName.get(normalizeName(name)) ?? [];
    const group = matches[0] ?? null;
    const activeCount = group ? activeCountFor(group) : null;
    const blockers = [];
    if (!group) blockers.push(`required_v2_group_missing:${name}`);
    if (matches.length > 1) blockers.push(`required_v2_group_duplicate:${name}:${matches.length}`);
    if (group && activeCount !== 0) blockers.push(`required_v2_group_active_count_not_0:${name}:${activeCount ?? 'unknown'}`);
    return {
      name,
      found: Boolean(group),
      duplicateCount: Math.max(0, matches.length - 1),
      idSha256: group ? sha256(safeId(group)) : null,
      activeCount,
      ok: blockers.length === 0,
      blockers,
    };
  });

  const blockers = targetResults.flatMap((target) => target.blockers);
  if (expectedTargetCount !== null && requiredGroupNames.length !== expectedTargetCount) {
    blockers.push(`expected_v2_group_count_mismatch:${requiredGroupNames.length}:${expectedTargetCount}`);
  }

  return {
    ok: blockers.length === 0,
    expectedTargetCount,
    targetCount: requiredGroupNames.length,
    foundCount: targetResults.filter((target) => target.found).length,
    emptyCount: targetResults.filter((target) => target.activeCount === 0).length,
    targets: targetResults,
    blockers,
  };
};

const workflowConflictReason = (workflow) => {
  const summary = summarizeWorkflow(workflow);
  if (summary.enabled === true) return 'active_v2_workflow_with_target_name';
  return 'existing_v2_workflow_with_target_name_requires_human_strategy';
};

const evaluateV2WorkflowBoundary = ({ workflows, workflowName = PROPOSED_V2_WORKFLOW }) => {
  const exactMatches = workflows.filter((workflow) => normalizeName(safeName(workflow)) === normalizeName(workflowName));
  const relatedMatches = workflows.filter((workflow) => {
    const normalized = normalizeName(safeName(workflow)) ?? '';
    return normalized.includes('onboarding editorial v2') && normalizeName(safeName(workflow)) !== normalizeName(workflowName);
  });
  const conflicts = exactMatches.map((workflow) => ({
    reason: workflowConflictReason(workflow),
    workflow: summarizeWorkflow(workflow),
  }));
  const blockers = conflicts.map((conflict) => conflict.reason);
  return {
    ok: blockers.length === 0,
    workflowName,
    exactMatchCount: exactMatches.length,
    relatedMatchCount: relatedMatches.length,
    conflicts,
    relatedMatches: relatedMatches.map(summarizeWorkflow),
    blockers,
  };
};

const safetyBlock = () => ({
  readOnly: true,
  mailerLiteApiCalled: true,
  mailerLiteMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  sendsPerformed: false,
  campaignsMutated: false,
  shopifyTouched: false,
  crmMutationsPerformed: false,
  ledgersTouched: false,
  cardsTouched: false,
  scoringTouched: false,
  factStoreTouched: false,
  tokensPrinted: false,
  rawIdsPrinted: false,
});

const buildPreflightFromState = ({
  boundaryPacket,
  designPacket,
  mappingPacket,
  emptyGroupsReceipt,
  groups,
  workflows,
  generatedAt = new Date().toISOString(),
}) => {
  const requiredGroupNames = extractRequiredV2GroupNames({ designPacket, mappingPacket, emptyGroupsReceipt });
  const expectedTargetCount = safeNumber(boundaryPacket?.localEvidenceSummary?.v2Groups?.expectedTargetCount);
  const v1 = evaluateV1Workflow({ workflows });
  const groupQa = evaluateRequiredGroups({ requiredGroupNames, groups, expectedTargetCount });
  const v2Workflow = evaluateV2WorkflowBoundary({ workflows });
  const blockers = [
    ...(boundaryPacket?.ok ? [] : ['boundary_packet_not_ok']),
    ...(requiredGroupNames.length ? [] : ['no_required_v2_group_names_found']),
    ...v1.blockers,
    ...groupQa.blockers,
    ...v2Workflow.blockers,
  ];
  const ok = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_mailerlite_onboarding_v2_disabled_draft_preflight',
    ok,
    status: ok
      ? 'onboarding_v2_disabled_draft_build_fresh_preflight_green'
      : 'onboarding_v2_disabled_draft_build_fresh_preflight_blocked',
    sourceEvidence: {
      boundaryPacketStatus: boundaryPacket?.status ?? null,
      mappingPacketStatus: mappingPacket?.status ?? null,
      emptyGroupsReceiptStatus: emptyGroupsReceipt?.status ?? null,
      groupsRead: groups.length,
      automationsRead: workflows.length,
      expectedV2GroupCount: expectedTargetCount,
    },
    qa: {
      productiveV1StillGreen: v1,
      v2GroupsStillEmptyAndAvailable: groupQa,
      noConflictingV2Workflow: v2Workflow,
      deferredToFutureBuildBoundary: {
        draftCanRemainDisabled: 'not_mutated_in_this_read_only_preflight',
        actionPrimitiveCheck: 'deferred_until_disabled_draft_build_or_seed_test_boundary',
      },
    },
    approvalPosture: {
      readOnlyPreflightApprovalConsumed: true,
      disabledDraftBuildApprovalReadyNow: ok,
      disabledDraftBuildApprovalPhraseGeneratedNow: false,
      futureBuildApprovalPhrasePolicy: 'Generate the exact disabled-draft build approval phrase only after this green receipt is reviewed as the next boundary.',
      workflowMutationAuthorizedNow: false,
      seedTestAuthorizedNow: false,
      publicAudienceSendAuthorized: false,
      liveActionAllowedNow: false,
    },
    blockers,
    safety: safetyBlock(),
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

const fetchJson = async (options, key, path, params = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Onboarding-V2-Disabled-Draft-Preflight/1.0',
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
  for (const key of ['data', 'groups', 'automations', 'items', 'results']) {
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

const scanCollection = async (options, key, path) => {
  const items = [];
  let cursor = null;
  for (let page = 0; page < 25; page += 1) {
    const params = { limit: 100 };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(options, key, path, params);
    items.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return items;
};

const readAutomationDetailsIfAvailable = async ({ options, key, workflows }) => {
  const v1 = workflows.find((workflow) => normalizeName(safeName(workflow)) === normalizeName(PROTECTED_V1_WORKFLOW));
  if (!v1 || !safeId(v1)) return workflows;
  try {
    const payload = await fetchJson(options, key, `/automations/${safeId(v1)}`);
    const detail = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    return workflows.map((workflow) => (safeId(workflow) === safeId(v1) ? { ...workflow, ...detail } : workflow));
  } catch {
    return workflows;
  }
};

const buildPreflight = async (options) => {
  const boundaryPacket = await readJson(options.boundaryPacket);
  const designPacket = await readJson(options.designPacket);
  const mappingPacket = await readJson(options.mappingPacket);
  const emptyGroupsReceipt = await readJson(options.emptyGroupsReceipt);
  const credential = await getCredential(options);
  if (!credential.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      mode: 'read_only_mailerlite_onboarding_v2_disabled_draft_preflight',
      ok: false,
      status: 'blocked_missing_mailerlite_credential',
      blocker: {
        reason: 'missing_mailerlite_credential',
        unblockAction: `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}. Do not paste tokens in chat.`,
      },
      safety: {
        ...safetyBlock(),
        mailerLiteApiCalled: false,
      },
    };
  }

  const groups = await scanCollection(options, credential.key, '/groups');
  const automationList = await scanCollection(options, credential.key, '/automations');
  const workflows = await readAutomationDetailsIfAvailable({ options, key: credential.key, workflows: automationList });
  return buildPreflightFromState({
    boundaryPacket,
    designPacket,
    mappingPacket,
    emptyGroupsReceipt,
    groups,
    workflows,
  });
};

const renderMarkdown = (preflight) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v2 Disabled Draft Build Fresh Preflight',
    '',
    `Generated: ${preflight.generatedAt}`,
    `Status: ${preflight.status}`,
    '',
  ];

  if (!preflight.ok && preflight.blocker) {
    lines.push('## Blocker', '', `- Reason: ${preflight.blocker.reason}`, `- Unblock: ${preflight.blocker.unblockAction}`, '');
    return lines.join('\n');
  }

  lines.push(
    '## Decision Ejecutiva',
    '',
    preflight.ok
      ? 'Preflight read-only verde. Ya se puede preparar el siguiente boundary de aprobacion para crear o clonar solo un workflow draft disabled de Onboarding v2.'
      : 'Preflight read-only bloqueado. No preparar aprobacion de workflow build hasta resolver blockers.',
    '',
    'Este recibo no autoriza crear, clonar, editar, activar, pausar ni desactivar workflows. Tampoco autoriza seed tests, subscribers, grupos, tags, segments, campaigns, Shopify, CRM, ledgers, cards, scoring ni Fact Store.',
    '',
    '## Evidencia',
    '',
    `- Boundary packet status: ${preflight.sourceEvidence?.boundaryPacketStatus ?? 'n/a'}`,
    `- Mapping packet status: ${preflight.sourceEvidence?.mappingPacketStatus ?? 'n/a'}`,
    `- Empty groups receipt status: ${preflight.sourceEvidence?.emptyGroupsReceiptStatus ?? 'n/a'}`,
    `- Groups read: ${preflight.sourceEvidence?.groupsRead ?? 'n/a'}`,
    `- Automations read: ${preflight.sourceEvidence?.automationsRead ?? 'n/a'}`,
    `- Expected v2 group count: ${preflight.sourceEvidence?.expectedV2GroupCount ?? 'n/a'}`,
    '',
    '## QA',
    '',
    `- Productive v1 green: ${preflight.qa?.productiveV1StillGreen?.ok ?? false}`,
    `- V1 workflow: ${preflight.qa?.productiveV1StillGreen?.workflow?.name ?? 'n/a'} enabled=${preflight.qa?.productiveV1StillGreen?.workflow?.enabled ?? 'n/a'} complete=${preflight.qa?.productiveV1StillGreen?.workflow?.complete ?? 'n/a'} broken=${preflight.qa?.productiveV1StillGreen?.workflow?.broken ?? 'n/a'}`,
    `- V2 groups empty and available: ${preflight.qa?.v2GroupsStillEmptyAndAvailable?.ok ?? false}`,
    `- V2 groups found: ${preflight.qa?.v2GroupsStillEmptyAndAvailable?.foundCount ?? 'n/a'}/${preflight.qa?.v2GroupsStillEmptyAndAvailable?.targetCount ?? 'n/a'}`,
    `- V2 groups active_count=0: ${preflight.qa?.v2GroupsStillEmptyAndAvailable?.emptyCount ?? 'n/a'}/${preflight.qa?.v2GroupsStillEmptyAndAvailable?.targetCount ?? 'n/a'}`,
    `- Conflicting v2 workflow absent: ${preflight.qa?.noConflictingV2Workflow?.ok ?? false}`,
    `- Exact v2 workflow match count: ${preflight.qa?.noConflictingV2Workflow?.exactMatchCount ?? 'n/a'}`,
    '',
    '## Required V2 Groups',
    '',
  );

  for (const target of preflight.qa?.v2GroupsStillEmptyAndAvailable?.targets ?? []) {
    lines.push(`- ${target.name}: found=${target.found}; active_count=${target.activeCount ?? 'n/a'}; ok=${target.ok}`);
  }

  lines.push('', '## Blockers', '');
  lines.push(preflight.blockers?.length ? preflight.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None.');

  lines.push(
    '',
    '## Gates',
    '',
    `- Disabled draft build approval ready now: ${preflight.approvalPosture?.disabledDraftBuildApprovalReadyNow ?? false}`,
    `- Workflow mutation authorized now: ${preflight.approvalPosture?.workflowMutationAuthorizedNow ?? false}`,
    `- Seed test authorized now: ${preflight.approvalPosture?.seedTestAuthorizedNow ?? false}`,
    `- Public/audience send authorized: ${preflight.approvalPosture?.publicAudienceSendAuthorized ?? false}`,
    `- Live action allowed now: ${preflight.approvalPosture?.liveActionAllowedNow ?? false}`,
    '',
    '## Safety',
    '',
    '- Read-only MailerLite API preflight.',
    '- No subscriber rows read or printed.',
    '- No group, workflow, automation, campaign or send mutations.',
    '- Productive Onboarding v1 not touched.',
    '- No Shopify, CRM, ledgers, cards, scoring or Fact Store.',
    '- No tokens or raw IDs printed.',
    '',
  );

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

  const preflight = await buildPreflight(options);
  if (options.out) await writeJson(options.out, preflight);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(preflight));

  console.log(JSON.stringify({
    ok: preflight.ok,
    status: preflight.status,
    generatedAt: preflight.generatedAt,
    groupsRead: preflight.sourceEvidence?.groupsRead ?? null,
    automationsRead: preflight.sourceEvidence?.automationsRead ?? null,
    v1Green: preflight.qa?.productiveV1StillGreen?.ok ?? false,
    v2GroupsFound: preflight.qa?.v2GroupsStillEmptyAndAvailable?.foundCount ?? null,
    v2GroupsEmpty: preflight.qa?.v2GroupsStillEmptyAndAvailable?.emptyCount ?? null,
    v2WorkflowConflictCount: preflight.qa?.noConflictingV2Workflow?.exactMatchCount ?? null,
    blockers: preflight.blockers ?? (preflight.blocker ? [preflight.blocker.reason] : []),
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: preflight.safety,
  }, null, 2));

  if (!preflight.ok && options.failOnBlocked) process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 disabled draft preflight failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPreflight,
  buildPreflightFromState,
  evaluateRequiredGroups,
  evaluateV1Workflow,
  evaluateV2WorkflowBoundary,
  extractRequiredV2GroupNames,
  parseArgs,
  renderMarkdown,
};
