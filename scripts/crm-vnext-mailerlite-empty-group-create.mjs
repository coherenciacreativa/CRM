#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { buildReport as buildPlannerReport, parseArgs as parsePlannerArgs } from './crm-vnext-mailerlite-receipt-taxonomy-plan.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-empty-group-create-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-empty-group-create.mjs [options]

Options:
  --execute                  Create approved empty groups. Without this, dry-run only.
  --approval-phrase <text>   Exact human approval phrase required with --execute.
  --service <name>           Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>           Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>           MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>           Per-request timeout. Defaults to 30000
  --out <path>               Write JSON report
  --markdown-out <path>      Write Markdown report
  --help                     Show this help

Safe create-empty executor for MailerLite vNext. Default mode is dry-run.
Even in --execute mode it can only create the planner-approved named empty groups.
It never reads subscriber rows, assigns subscribers, edits workflows, sends email,
renames groups, deletes groups, or mutates automations.`;

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

const expectedApprovalPhraseFor = (items) =>
  `Apruebo crear únicamente estos ${items.length} grupos vacíos en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos y con re-scan fresco previo: ${items.map((item) => item.name).join('; ')}.`;

const approvalStatusFor = ({ execute, providedPhrase, expectedPhrase }) => {
  if (!execute) {
    return {
      ok: true,
      status: 'dry_run_no_live_approval_required',
      provided: Boolean(cleanString(providedPhrase)),
    };
  }
  const normalizedProvided = normalizeApprovalPhrase(providedPhrase);
  const normalizedExpected = normalizeApprovalPhrase(expectedPhrase);
  if (!normalizedProvided) {
    return {
      ok: false,
      status: 'blocked_missing_explicit_approval_phrase',
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
    status: 'explicit_approval_phrase_matched',
    provided: true,
  };
};

const parseArgs = (argv) => {
  const options = {
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

const requestJson = async ({ options, key, path, method = 'GET', body = null }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, method === 'GET' ? { limit: 100 } : {}), {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Empty-Group-Create/1.0',
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
    const path = cursor ? `/groups?limit=100&cursor=${encodeURIComponent(cursor)}` : '/groups';
    const payload = await requestJson({ options, key, path });
    groups.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return groups;
};

const groupId = (group) => cleanString(group?.id);
const groupName = (group) => cleanString(group?.name);
const groupSubscriberCount = (group) => group?.active_count ?? group?.subscribers_count ?? group?.total ?? null;

const validatePlannerReadiness = (planner) => {
  const issues = [];
  const firstSet = planner.firstSafeEmptyGroupCreateSet ?? planner.firstSafeCreateSet ?? [];
  if (!planner.ok) issues.push('planner_not_ok');
  if (planner.status !== 'ready_for_human_review') issues.push(`planner_status_${planner.status}`);
  if (!planner.brandCanon?.alignmentOk) issues.push('brand_canon_alignment_not_ok');
  if (!planner.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval) {
    issues.push('named_empty_group_creation_gate_not_ready');
  }
  if (planner.approvalGate?.canUseWorkflow) issues.push('workflow_use_gate_unexpectedly_open');
  if (planner.approvalGate?.canAttachToProtectedWorkflow) issues.push('protected_workflow_attachment_gate_unexpectedly_open');
  if (!firstSet.length) issues.push('no_first_safe_empty_group_create_set');

  for (const item of firstSet) {
    if (item.allowedOperation !== 'create_named_empty_group_only_after_explicit_approval') {
      issues.push(`unsafe_allowed_operation:${item.name}`);
    }
    if (item.workflowAttachmentAllowed !== false) {
      issues.push(`workflow_attachment_not_blocked:${item.name}`);
    }
    if (item.emptyGroupCreationStatus !== 'safe_to_create_empty_after_approval') {
      issues.push(`empty_group_status_not_safe_after_approval:${item.name}`);
    }
  }

  return {
    ok: issues.length === 0,
    issues,
    firstSet,
  };
};

const buildTargetPlan = ({ firstSet, liveGroups }) => {
  const liveByName = new Map();
  for (const group of liveGroups) {
    const normalized = normalizeName(groupName(group));
    if (normalized) liveByName.set(normalized, group);
  }

  return firstSet.map((item) => {
    const live = liveByName.get(normalizeName(item.name));
    return {
      name: item.name,
      normalizedName: normalizeName(item.name),
      existsInFreshScan: Boolean(live),
      liveGroupId: live ? groupId(live) : null,
      liveSubscriberCount: live ? groupSubscriberCount(live) : null,
      plannedOperation: live ? 'block_existing_target_group' : 'create_empty_group',
      allowedOperation: item.allowedOperation,
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
    };
  });
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
    id: groupId(created),
    name: groupName(created) ?? name,
  };
};

const safetyBlock = ({ execute, createdCount = 0 }) => ({
  mode: execute ? 'execute_create_empty_groups_only' : 'dry_run_only',
  mailerLiteMutationsPerformed: execute && createdCount > 0,
  groupMutationsPerformed: execute && createdCount > 0,
  groupMutationType: execute && createdCount > 0 ? 'create_empty_group_only' : null,
  subscriberReadsPerformed: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  tokensPrinted: false,
  outboundPerformed: false,
});

const buildRun = async (options) => {
  const planner = await buildPlannerReport(parsePlannerArgs([
    '--service',
    options.service,
    '--account',
    options.account,
    '--api-base',
    options.apiBase,
    '--timeout-ms',
    String(options.timeoutMs),
  ]));
  const readiness = validatePlannerReadiness(planner);
  const expectedApprovalPhrase = expectedApprovalPhraseFor(readiness.firstSet);
  const approval = approvalStatusFor({
    execute: options.execute,
    providedPhrase: options.approvalPhrase,
    expectedPhrase: expectedApprovalPhrase,
  });

  const credential = await getCredential(options);
  if (!credential.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      ok: false,
      status: 'blocked_missing_mailerlite_credential',
      mode: options.execute ? 'execute_requested' : 'dry_run',
      planner: plannerSummary(planner),
      readiness,
      approval,
      expectedApprovalPhrase,
      keychain: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      safety: safetyBlock({ execute: options.execute, createdCount: 0 }),
    };
  }

  const liveGroups = await fetchGroups(options, credential.key);
  const targetPlan = buildTargetPlan({ firstSet: readiness.firstSet, liveGroups });
  const existingTargets = targetPlan.filter((target) => target.existsInFreshScan);
  const blockers = [
    ...readiness.issues,
    ...(approval.ok ? [] : [approval.status]),
    ...(existingTargets.length ? ['target_group_already_exists_in_fresh_scan'] : []),
  ];

  const canExecute = Boolean(options.execute && blockers.length === 0);
  const createdGroups = [];
  const errors = [];
  if (canExecute) {
    for (const target of targetPlan) {
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
  }

  const executedOk = canExecute && errors.length === 0 && createdGroups.length === targetPlan.length;
  const status = options.execute
    ? executedOk
      ? 'executed_empty_group_creation'
      : blockers.length
        ? 'blocked_before_live_create'
        : 'failed_during_live_create'
    : blockers.filter((blocker) => blocker !== approval.status).length
      ? 'dry_run_blocked'
      : 'dry_run_ready_for_explicit_approval';

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok: options.execute ? executedOk : blockers.filter((blocker) => blocker !== approval.status).length === 0,
    status,
    mode: options.execute ? 'execute_requested' : 'dry_run',
    planner: plannerSummary(planner),
    readiness,
    approval,
    expectedApprovalPhrase,
    keychain: {
      service: options.service,
      account: options.account,
      credentialPresent: true,
      credentialSource: credential.source,
    },
    freshScan: {
      groupsRead: liveGroups.length,
      targetGroupsExistingCount: existingTargets.length,
    },
    targetPlan,
    createdGroups,
    errors,
    blockers,
    safety: safetyBlock({ execute: options.execute, createdCount: createdGroups.length }),
  };
};

const plannerSummary = (planner) => ({
  status: planner.status,
  approvalGate: planner.approvalGate,
  summary: planner.summary,
  brandCanon: planner.brandCanon
    ? {
      alignmentOk: planner.brandCanon.alignmentOk,
      issueCount: planner.brandCanon.issueCount,
      blockingIssueCount: planner.brandCanon.blockingIssueCount,
    }
    : null,
});

const renderMarkdown = (run) => [
  '# MailerLite vNext - Empty Group Create Runner',
  '',
  `Generated: ${run.generatedAt}`,
  `Mode: ${run.mode}`,
  `Status: ${run.status}`,
  '',
  '## Executive Summary',
  '',
  run.mode === 'dry_run'
    ? 'Dry-run completed. No MailerLite mutations were performed.'
    : run.status === 'executed_empty_group_creation'
      ? 'Approved create-empty operation executed.'
      : 'Execute was requested but blocked or failed before completion.',
  '',
  '## Gates',
  '',
  `- Planner ready: ${run.readiness.ok}`,
  `- Approval status: ${run.approval.status}`,
  `- Brand canon alignment: ${run.planner.brandCanon?.alignmentOk}`,
  `- canCreateNamedEmptyGroupsAfterExplicitApproval: ${run.planner.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval}`,
  `- canUseWorkflow: ${run.planner.approvalGate?.canUseWorkflow}`,
  `- canAttachToProtectedWorkflow: ${run.planner.approvalGate?.canAttachToProtectedWorkflow}`,
  `- Fresh groups read: ${run.freshScan?.groupsRead ?? 'n/a'}`,
  `- Existing target groups in fresh scan: ${run.freshScan?.targetGroupsExistingCount ?? 'n/a'}`,
  '',
  '## Target Plan',
  '',
  ...(run.targetPlan ?? []).map((target) =>
    `- ${target.name}: ${target.plannedOperation}${target.liveGroupId ? ` (${target.liveGroupId})` : ''}`,
  ),
  '',
  '## Created Groups',
  '',
  run.createdGroups?.length
    ? run.createdGroups.map((group) => `- ${group.name}: ${group.id ?? 'id_missing'}`).join('\n')
    : '- None.',
  '',
  '## Blockers',
  '',
  run.blockers?.length
    ? run.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- None.',
  '',
  '## Approval Phrase Required For Live Execute',
  '',
  `\`${run.expectedApprovalPhrase}\``,
  '',
  '## Safety',
  '',
  `- MailerLite mutations performed: ${run.safety.mailerLiteMutationsPerformed}`,
  `- Group mutation type: ${run.safety.groupMutationType ?? 'none'}`,
  '- No subscribers read or printed.',
  '- No subscribers assigned.',
  '- No workflows or automations edited.',
  '- No emails sent.',
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
    freshScan: run.freshScan ?? null,
    targetCount: run.targetPlan?.length ?? 0,
    createdCount: run.createdGroups?.length ?? 0,
    blockers: run.blockers ?? [],
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: run.safety,
  }, null, 2));

  if (options.execute && run.status !== 'executed_empty_group_creation') process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite empty group create runner failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  approvalStatusFor,
  buildTargetPlan,
  expectedApprovalPhraseFor,
  normalizeApprovalPhrase,
  validatePlannerReadiness,
};
