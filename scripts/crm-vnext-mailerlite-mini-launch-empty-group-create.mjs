#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-empty-group-create-2026-05-28';
const DEFAULT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_creation_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-empty-group-create.mjs [options]

Options:
  --approval-packet <path>  Mini-launch exact approval packet JSON. Defaults to ${DEFAULT_APPROVAL_PACKET}
  --execute                 Create the approved empty groups. Without this, dry-run only.
  --approval-phrase <text>  Exact human approval phrase required with --execute.
  --service <name>          Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>          Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>          MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>          Per-request timeout. Defaults to 30000
  --out <path>              Write JSON report
  --markdown-out <path>     Write Markdown report
  --help                    Show this help

Guarded create-empty runner for the Inteligencia para descansar mini-launch
receipt groups. Default mode is dry-run. Execute mode requires the exact
approval phrase from the approval packet and a fresh MailerLite group re-scan.
It never reads subscribers, assigns subscribers, edits workflows/automations,
sends email, touches onboarding, writes CRM/ledgers/scoring/Fact Store, deletes
or renames groups, or prints tokens.`;

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

const parseArgs = (argv) => {
  const options = {
    approvalPacket: DEFAULT_APPROVAL_PACKET,
    execute: false,
    approvalPhrase: null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--approval-packet') options.approvalPacket = argv[++index];
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

  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/, '');
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${options.apiBase}`);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const approvalStatusFor = ({ execute, approvalPhrase, expectedPhrase }) => {
  if (!execute) {
    return {
      ok: true,
      status: 'dry_run_no_live_approval_required',
      provided: Boolean(cleanString(approvalPhrase)),
    };
  }
  const normalizedProvided = normalizeApprovalPhrase(approvalPhrase);
  const normalizedExpected = normalizeApprovalPhrase(expectedPhrase);
  if (!normalizedExpected) {
    return {
      ok: false,
      status: 'blocked_missing_expected_approval_phrase',
      provided: Boolean(normalizedProvided),
    };
  }
  if (!normalizedProvided) {
    return {
      ok: false,
      status: 'blocked_missing_exact_approval_phrase',
      provided: false,
    };
  }
  if (normalizedProvided !== normalizedExpected) {
    return {
      ok: false,
      status: 'blocked_approval_phrase_mismatch',
      provided: true,
    };
  }
  return {
    ok: true,
    status: 'exact_approval_phrase_matched',
    provided: true,
  };
};

const validatePacketReadiness = (packet) => {
  const issues = [];
  const targets = (packet?.targetGroups ?? []).filter((target) => cleanString(target?.name));

  if (packet?.ok !== true) issues.push('approval_packet_not_ok');
  if (packet?.status !== 'ready_for_exact_human_approval_to_create_mini_launch_empty_groups') {
    issues.push(`approval_packet_status_not_ready:${packet?.status ?? 'missing'}`);
  }
  if (packet?.decision?.canAskAlejandroForApproval !== true) issues.push('approval_packet_cannot_ask_alejandro');
  if (packet?.decision?.packetIsApprovalByItself !== false) issues.push('approval_packet_self_authorizes_unexpectedly');
  if (packet?.decision?.requiresFreshRerunBeforeExecution !== true) issues.push('approval_packet_missing_fresh_rerun_requirement');
  if (!cleanString(packet?.decision?.exactApprovalPhrase)) issues.push('approval_packet_missing_exact_phrase');
  if (targets.length === 0) issues.push('approval_packet_has_no_target_groups');

  for (const target of targets) {
    if (target.plannedOperation !== 'create_named_empty_group_after_exact_human_approval') {
      issues.push(`target_planned_operation_not_create_empty:${target.name}`);
    }
    if (target.allowedOperation !== 'create_named_empty_group_only_after_explicit_approval') {
      issues.push(`target_allowed_operation_not_narrow:${target.name}`);
    }
    if (target.workflowAttachmentAllowed !== false) issues.push(`target_workflow_attachment_not_closed:${target.name}`);
    if (target.subscriberAssignmentAllowed !== false) issues.push(`target_subscriber_assignment_not_closed:${target.name}`);
    if (target.sendAllowed !== false) issues.push(`target_send_not_closed:${target.name}`);
    if (target.existsInMailerLite === true || cleanString(target.liveGroupId)) {
      issues.push(`target_packet_already_live:${target.name}`);
    }
  }

  const safety = packet?.safety ?? {};
  if (safety.mailerLiteMutationsPerformed !== false) issues.push('approval_packet_reports_mailerlite_mutation');
  if (safety.mailerLiteGroupsCreated !== false) issues.push('approval_packet_reports_group_creation');
  if (safety.subscribersReadByThisPacket !== false) issues.push('approval_packet_reports_subscriber_read');
  if (safety.workflowMutationsPerformed !== false) issues.push('approval_packet_reports_workflow_mutation');
  if (safety.sendsPerformed !== false) issues.push('approval_packet_reports_send');

  return {
    ok: issues.length === 0,
    issues,
    targets,
  };
};

const groupNameFor = (group) => cleanString(group?.name) ?? cleanString(group?.title) ?? cleanString(group?.label);
const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);
const groupSubscriberCountFor = (group) => group?.active_count ?? group?.subscribers_count ?? group?.total ?? null;

const buildTargetPlan = ({ packet, liveGroups }) => {
  const liveByName = new Map();
  for (const group of liveGroups ?? []) {
    const normalized = normalizeName(groupNameFor(group));
    if (normalized) liveByName.set(normalized, group);
  }

  return (packet?.targetGroups ?? [])
    .filter((target) => cleanString(target?.name))
    .map((target) => {
      const live = liveByName.get(normalizeName(target.name));
      return {
        name: cleanString(target.name),
        normalizedName: normalizeName(target.name),
        existsInFreshScan: Boolean(live),
        liveGroupId: live ? groupIdFor(live) : null,
        liveSubscriberCount: live ? groupSubscriberCountFor(live) : null,
        plannedOperation: live ? 'block_existing_target_group' : 'create_empty_group',
        packetAllowedOperation: target.allowedOperation,
        workflowAttachmentAllowed: false,
        subscriberAssignmentAllowed: false,
        sendAllowed: false,
      };
    });
};

const buildSafety = ({ execute, createdCount, groupsRead }) => ({
  mode: execute ? 'execute_create_mini_launch_empty_groups_only' : 'dry_run_only',
  mailerLiteApiCalled: true,
  mailerLiteGroupsRead: groupsRead,
  mailerLiteMutationsPerformed: execute && createdCount > 0,
  groupMutationsPerformed: execute && createdCount > 0,
  groupMutationType: execute && createdCount > 0 ? 'create_empty_group_only' : null,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  onboardingTouched: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildRunFromState = ({
  packet,
  liveGroups,
  execute = false,
  approvalPhrase = null,
  generatedAt = new Date().toISOString(),
  credentialPresent = true,
  credentialSource = null,
  credentialService = DEFAULT_SERVICE,
  credentialAccount = DEFAULT_ACCOUNT,
  createdGroups = [],
  errors = [],
}) => {
  const packetReadiness = validatePacketReadiness(packet);
  const expectedPhrase = cleanString(packet?.decision?.exactApprovalPhrase);
  const approval = approvalStatusFor({ execute, approvalPhrase, expectedPhrase });
  const targetPlan = buildTargetPlan({ packet, liveGroups });
  const existingTargets = targetPlan.filter((target) => target.existsInFreshScan);
  const blockers = [
    ...packetReadiness.issues,
    ...(execute && !approval.ok ? [approval.status] : []),
    ...(existingTargets.length ? ['target_group_already_exists_in_fresh_scan'] : []),
  ];
  const canExecute = Boolean(execute && blockers.length === 0 && targetPlan.length > 0 && credentialPresent);
  const executedOk = canExecute && errors.length === 0 && createdGroups.length === targetPlan.length;
  const dryRunOk = !execute && blockers.length === 0;
  const status = execute
    ? executedOk
      ? 'executed_mini_launch_empty_group_creation'
      : blockers.length
        ? 'blocked_before_mini_launch_empty_group_create'
        : errors.length
          ? 'failed_during_mini_launch_empty_group_create'
          : 'execute_ready_but_not_performed'
    : dryRunOk
      ? 'dry_run_ready_for_exact_approval'
      : 'dry_run_blocked';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: execute ? 'execute_requested' : 'dry_run',
    generatedAt,
    ok: execute ? executedOk : dryRunOk,
    status,
    launch: packet?.launch ?? null,
    packetSummary: {
      status: packet?.status ?? null,
      targetCount: packet?.targetGroups?.length ?? 0,
      sourceDryRunStatus: packet?.sourceDryRun?.status ?? null,
      sourceDryRunGeneratedAt: packet?.sourceDryRun?.generatedAt ?? null,
      requiresFreshRerunBeforeExecution: packet?.decision?.requiresFreshRerunBeforeExecution ?? null,
      packetIsApprovalByItself: packet?.decision?.packetIsApprovalByItself ?? null,
    },
    credential: {
      service: credentialService,
      account: credentialAccount,
      credentialPresent,
      credentialSource: credentialSource ? 'configured_not_printed' : null,
    },
    freshScan: {
      groupsRead: liveGroups?.length ?? 0,
      targetGroupsExistingCount: existingTargets.length,
      targetGroupsMissingCount: targetPlan.filter((target) => !target.existsInFreshScan).length,
    },
    packetReadiness,
    decision: {
      expectedPhrase,
      approval,
      canExecute,
      blockers,
    },
    targetPlan,
    createdGroups,
    errors,
    safety: buildSafety({
      execute,
      createdCount: createdGroups.length,
      groupsRead: liveGroups?.length ?? 0,
    }),
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
  if (status === 404) return 'mailerlite_endpoint_not_found';
  if (status === 409 || /already exists|duplicate/i.test(text)) return 'mailerlite_group_conflict_or_duplicate';
  if (status === 422 || /validation/i.test(text)) return 'mailerlite_validation_failed';
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

const requestJson = async ({ options, key, path, method = 'GET', body = null, params = {} }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Mini-Launch-Empty-Group-Create/1.0',
      },
      body: body ? JSON.stringify(body) : null,
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

const fetchGroups = async (options, key) => {
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

const createGroup = async ({ options, key, name }) => {
  const payload = await requestJson({
    options,
    key,
    path: '/groups',
    method: 'POST',
    body: { name },
  });
  const created = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
  return {
    id: groupIdFor(created),
    name: groupNameFor(created) ?? name,
  };
};

const buildMissingCredentialRun = ({ packet, options, generatedAt = new Date().toISOString() }) => ({
  schemaVersion: SCHEMA_VERSION,
  mode: options.execute ? 'execute_requested' : 'dry_run',
  generatedAt,
  ok: false,
  status: 'blocked_missing_mailerlite_credential',
  launch: packet?.launch ?? null,
  packetSummary: {
    status: packet?.status ?? null,
    targetCount: packet?.targetGroups?.length ?? 0,
    sourceDryRunStatus: packet?.sourceDryRun?.status ?? null,
    sourceDryRunGeneratedAt: packet?.sourceDryRun?.generatedAt ?? null,
    requiresFreshRerunBeforeExecution: packet?.decision?.requiresFreshRerunBeforeExecution ?? null,
    packetIsApprovalByItself: packet?.decision?.packetIsApprovalByItself ?? null,
  },
  credential: {
    service: options.service,
    account: options.account,
    credentialPresent: false,
    credentialSource: null,
  },
  freshScan: {
    groupsRead: 0,
    targetGroupsExistingCount: null,
    targetGroupsMissingCount: null,
  },
  packetReadiness: validatePacketReadiness(packet),
  decision: {
    expectedPhrase: cleanString(packet?.decision?.exactApprovalPhrase),
    approval: approvalStatusFor({
      execute: options.execute,
      approvalPhrase: options.approvalPhrase,
      expectedPhrase: cleanString(packet?.decision?.exactApprovalPhrase),
    }),
    canExecute: false,
    blockers: ['blocked_missing_mailerlite_credential'],
  },
  targetPlan: [],
  createdGroups: [],
  errors: [],
  safety: buildSafety({ execute: options.execute, createdCount: 0, groupsRead: 0 }),
});

const buildRun = async (options) => {
  const packet = await readJson(options.approvalPacket);
  const credential = await getCredential(options);
  if (!credential?.key) return buildMissingCredentialRun({ packet, options });

  const liveGroups = await fetchGroups(options, credential.key);
  const initialRun = buildRunFromState({
    packet,
    liveGroups,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
    credentialPresent: true,
    credentialSource: credential.source,
    credentialService: options.service,
    credentialAccount: options.account,
  });

  if (!initialRun.decision.canExecute) return initialRun;

  const createdGroups = [];
  const errors = [];
  for (const target of initialRun.targetPlan) {
    try {
      const created = await createGroup({ options, key: credential.key, name: target.name });
      createdGroups.push(created);
    } catch (error) {
      errors.push({
        name: target.name,
        reason: error?.reason || error?.message || 'mailerlite_group_create_failed',
        status: error?.status ?? null,
      });
      break;
    }
  }

  return buildRunFromState({
    packet,
    liveGroups,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
    generatedAt: initialRun.generatedAt,
    credentialPresent: true,
    credentialSource: credential.source,
    credentialService: options.service,
    credentialAccount: options.account,
    createdGroups,
    errors,
  });
};

const renderMarkdown = (run) => [
  '# MailerLite Launch OS v0 - Mini-Launch Empty Group Create Runner',
  '',
  `Generated: ${run.generatedAt}`,
  `Mode: ${run.mode}`,
  `Status: ${run.status}`,
  '',
  '## Decision Ejecutiva',
  '',
  run.mode === 'dry_run'
    ? 'Dry-run completado. No se crearon grupos; el runner solo re-escaneo MailerLite para confirmar que los targets siguen faltando.'
    : run.status === 'executed_mini_launch_empty_group_creation'
      ? 'Creacion aprobada ejecutada para los dos grupos vacios del mini-lanzamiento.'
      : 'Execute fue solicitado pero quedo bloqueado o fallo antes de completarse.',
  '',
  `Mini-lanzamiento: ${run.launch?.resourceName ?? 'unknown'}`,
  `launch_id: ${run.launch?.launchId ?? 'unknown'}`,
  '',
  '## Fresh Scan',
  '',
  `- Live groups read: ${run.freshScan.groupsRead ?? 'n/a'}`,
  `- Target groups existing: ${run.freshScan.targetGroupsExistingCount ?? 'n/a'}`,
  `- Target groups missing: ${run.freshScan.targetGroupsMissingCount ?? 'n/a'}`,
  '',
  '## Gates',
  '',
  `- Packet status: ${run.packetSummary.status}`,
  `- Packet is approval by itself: ${run.packetSummary.packetIsApprovalByItself}`,
  `- Requires fresh rerun before execution: ${run.packetSummary.requiresFreshRerunBeforeExecution}`,
  `- Packet readiness: ${run.packetReadiness.ok}`,
  `- Approval status: ${run.decision.approval.status}`,
  `- canExecute: ${run.decision.canExecute}`,
  '',
  '## Target Plan',
  '',
  ...(run.targetPlan.length
    ? run.targetPlan.map((target) =>
      `- ${target.name}: ${target.plannedOperation}; existsInFreshScan=${target.existsInFreshScan}; workflowAttachmentAllowed=${target.workflowAttachmentAllowed}; subscriberAssignmentAllowed=${target.subscriberAssignmentAllowed}; sendAllowed=${target.sendAllowed}`,
    )
    : ['- None.']),
  '',
  '## Created Groups',
  '',
  run.createdGroups.length
    ? run.createdGroups.map((group) => `- ${group.name}: ${group.id ?? 'id_missing'}`).join('\n')
    : '- None.',
  '',
  '## Blockers',
  '',
  run.decision.blockers.length
    ? run.decision.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- None.',
  '',
  '## Errors',
  '',
  run.errors.length
    ? run.errors.map((error) => `- ${error.name}: ${error.reason}`).join('\n')
    : '- None.',
  '',
  '## Approval Phrase Required For Execute',
  '',
  run.decision.expectedPhrase ? `\`${run.decision.expectedPhrase}\`` : '- Not available.',
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${run.safety.mailerLiteApiCalled}`,
  `- MailerLite mutations performed: ${run.safety.mailerLiteMutationsPerformed}`,
  `- Group mutation type: ${run.safety.groupMutationType ?? 'none'}`,
  '- No subscribers read or printed.',
  '- No subscribers assigned.',
  '- No workflows or automations edited.',
  '- No emails sent.',
  '- Onboarding untouched.',
  '- No Shopify/CRM live mutations, ledger append, scoring or Fact Store write.',
  '- No tokens printed.',
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
  await writeFile(fullPath, value, 'utf8');
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
    generatedAt: run.generatedAt,
    freshScan: run.freshScan,
    packetSummary: run.packetSummary,
    createdCount: run.createdGroups.length,
    blockers: run.decision.blockers,
    errors: run.errors,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: run.safety,
  }, null, 2));

  if (options.execute && run.status !== 'executed_mini_launch_empty_group_creation') process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch empty group create failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  approvalStatusFor,
  buildRun,
  buildRunFromState,
  buildTargetPlan,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
  validatePacketReadiness,
};
