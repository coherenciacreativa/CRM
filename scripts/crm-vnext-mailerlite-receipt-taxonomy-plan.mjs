#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-receipt-taxonomy-plan-2026-05-26';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const DEFAULT_MANIFEST = 'docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-receipt-taxonomy-plan.mjs [options]

Options:
  --manifest <path>      Markdown manifest with JSON block. Defaults to ${DEFAULT_MANIFEST}
  --service <name>       Keychain service. Defaults to MAILERLITE_KEYCHAIN_SERVICE or ${DEFAULT_SERVICE}
  --account <name>       Keychain account. Defaults to MAILERLITE_KEYCHAIN_ACCOUNT or ${DEFAULT_ACCOUNT}
  --api-base <url>       MailerLite API base. Defaults to ${DEFAULT_API_BASE}
  --timeout-ms <n>       Per-request timeout. Defaults to 30000
  --out <path>           Write JSON report
  --markdown-out <path>  Write Markdown summary
  --fail-on-blocked      Exit with code 2 if MailerLite read-only probes fail
  --help                 Show this help

Read-only planner for MailerLite receipt taxonomy. It compares the local CC receipt
manifest with live MailerLite groups/workflows. It never creates groups, never edits
workflows, never reads subscribers, never mutates MailerLite, and never prints tokens.`;

const parseArgs = (argv) => {
  const options = {
    manifest: DEFAULT_MANIFEST,
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
    else if (arg === '--manifest') options.manifest = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.manifest) throw new Error('missing_manifest');
  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  if (!options.apiBase) throw new Error('missing_api_base');
  options.apiBase = options.apiBase.replace(/\/+$/, '');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

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

const hash12 = (value) => createHash('sha256').update(value).digest('hex').slice(0, 12);

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
  if (reason === 'mailerlite_forbidden') {
    return 'Check that the MailerLite API key can read group and automation endpoints.';
  }
  if (reason === 'mailerlite_rate_limited') {
    return 'Retry later; planner is read-only and can be rerun safely.';
  }
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
        'User-Agent': 'CRM-vNext-MailerLite-Receipt-Taxonomy-Plan/1.0',
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
        // No-op. Treat malformed pagination as terminal.
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

const readManifest = async (path) => {
  const manifestPath = resolve(path);
  const raw = await readFile(manifestPath, 'utf8');
  const block = raw.match(/```json\s*([\s\S]*?)```/);
  if (!block) throw new Error(`manifest_json_block_missing:${manifestPath}`);
  const manifest = JSON.parse(block[1]);
  if (!Array.isArray(manifest.groups)) throw new Error('manifest_groups_required');
  return { manifestPath, manifest };
};

const workflowNameFor = (workflow) =>
  cleanString(workflow?.name)
  ?? cleanString(workflow?.title)
  ?? cleanString(workflow?.workflow_name)
  ?? cleanString(workflow?.automation_name);

const groupNameFor = (group) =>
  cleanString(group?.name)
  ?? cleanString(group?.title)
  ?? cleanString(group?.label);

const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);

const buildIndexes = ({ groups, workflows }) => {
  const groupsByName = new Map();
  for (const group of groups) {
    const name = groupNameFor(group);
    const normalized = normalizeName(name);
    if (normalized) groupsByName.set(normalized, group);
  }

  const workflowsByName = new Map();
  for (const workflow of workflows) {
    const name = workflowNameFor(workflow);
    const normalized = normalizeName(name);
    if (normalized) workflowsByName.set(normalized, workflow);
  }

  return { groupsByName, workflowsByName };
};

const liveWorkflowSummary = (workflow) => {
  if (!workflow) return null;
  return {
    id: cleanString(workflow.id),
    name: workflowNameFor(workflow),
    enabled: workflow.enabled ?? workflow.active ?? workflow.status ?? null,
    complete: workflow.complete ?? null,
  };
};

const statusForGroup = ({ entry, liveGroup }) => {
  if (liveGroup) return 'exists';
  if (!entry.safeToCreateEmpty) return 'needs_review';
  return 'safe_to_create_empty_after_approval';
};

const planGroups = ({ manifest, groups, workflows }) => {
  const indexes = buildIndexes({ groups, workflows });
  return manifest.groups.map((entry) => {
    const name = cleanString(entry.name);
    const liveGroup = indexes.groupsByName.get(normalizeName(name));
    const relatedHistoricGroups = (entry.relatedHistoricGroups ?? []).map((historicName) => {
      const live = indexes.groupsByName.get(normalizeName(historicName));
      return {
        name: historicName,
        exists: Boolean(live),
        id: live ? groupIdFor(live) : null,
      };
    });
    const relatedWorkflows = (entry.relatedWorkflows ?? []).map((workflowName) => {
      const live = indexes.workflowsByName.get(normalizeName(workflowName));
      return {
        name: workflowName,
        exists: Boolean(live),
        live: liveWorkflowSummary(live),
      };
    });
    const status = statusForGroup({ entry, liveGroup });
    const touchesProtectedWorkflow = relatedWorkflows.some((workflow) =>
      workflow.exists && (manifest.policy?.doNotTouchActiveWorkflows ?? [])
        .some((protectedName) => normalizeName(protectedName) === normalizeName(workflow.name)),
    );

    return {
      name,
      layer: cleanString(entry.layer),
      object: cleanString(entry.object),
      detail: cleanString(entry.detail),
      contentId: cleanString(entry.contentId),
      purpose: cleanString(entry.purpose),
      existsInMailerLite: Boolean(liveGroup),
      liveGroupId: liveGroup ? groupIdFor(liveGroup) : null,
      safeToCreateEmpty: Boolean(entry.safeToCreateEmpty),
      safeToUseInLiveFlowNow: Boolean(entry.safeToUseInLiveFlowNow),
      pilotPriority: Number.isFinite(entry.pilotPriority) ? entry.pilotPriority : null,
      status,
      useGuard: touchesProtectedWorkflow
        ? 'do_not_edit_or_use_inside_protected_workflow_without_separate_gate'
        : 'no_protected_workflow_gate_detected',
      recommendedAction: liveGroup
        ? 'no_create_needed'
        : entry.safeToCreateEmpty
          ? 'create_empty_group_only_after_explicit_approval'
          : 'manual_review_before_create',
      relatedHistoricGroups,
      relatedWorkflows,
    };
  });
};

const buildReport = async (options) => {
  const { manifestPath, manifest } = await readManifest(options.manifest);
  const credential = await getCredential(options);
  if (!credential.key) {
    const reason = 'missing_mailerlite_credential';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_receipt_taxonomy_plan',
      generatedAt: new Date().toISOString(),
      manifestPath,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      safety: safetyBlock(),
    };
  }

  let groups = [];
  let workflows = [];
  try {
    groups = await scanCollection(options, credential.key, '/groups');
    workflows = await scanCollection(options, credential.key, '/automations');
  } catch (error) {
    const reason = error?.reason || error?.message || 'mailerlite_read_blocked';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_receipt_taxonomy_plan',
      generatedAt: new Date().toISOString(),
      manifestPath,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      keychain: safeKeychain(options, credential),
      safety: safetyBlock(),
    };
  }

  const plannedGroups = planGroups({ manifest, groups, workflows });
  const firstSafeCreateSet = plannedGroups
    .filter((item) => item.pilotPriority === 1 && item.status === 'safe_to_create_empty_after_approval')
    .map((item) => item.name);
  const activeFlowRelated = plannedGroups
    .filter((item) => item.useGuard === 'do_not_edit_or_use_inside_protected_workflow_without_separate_gate')
    .map((item) => item.name);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_receipt_taxonomy_plan',
    generatedAt: new Date().toISOString(),
    manifestPath,
    ok: true,
    status: 'ready_for_human_review',
    apiBase: options.apiBase,
    keychain: safeKeychain(options, credential),
    liveScan: {
      groupsRead: groups.length,
      workflowsRead: workflows.length,
      subscribersRead: 0,
      subscriberRowsPrinted: 0,
    },
    manifest: {
      schemaVersion: manifest.schemaVersion,
      groupCount: manifest.groups.length,
      contentIdCount: Array.isArray(manifest.contentIds) ? manifest.contentIds.length : 0,
      doNotTouchHistoricGroups: manifest.policy?.doNotTouchHistoricGroups ?? [],
      doNotTouchActiveWorkflows: manifest.policy?.doNotTouchActiveWorkflows ?? [],
      pilotWorkflows: manifest.policy?.pilotWorkflows ?? [],
    },
    summary: {
      plannedGroups: plannedGroups.length,
      alreadyExist: plannedGroups.filter((item) => item.existsInMailerLite).length,
      missing: plannedGroups.filter((item) => !item.existsInMailerLite).length,
      safeToCreateEmptyAfterApproval: plannedGroups.filter((item) => item.status === 'safe_to_create_empty_after_approval').length,
      needsReviewActiveFlowRelated: activeFlowRelated.length,
      firstSafeCreateSetCount: firstSafeCreateSet.length,
    },
    firstSafeCreateSet,
    activeFlowRelated,
    plannedGroups,
    safety: safetyBlock(),
    nextAction: firstSafeCreateSet.length
      ? 'Ask Alejandro whether to create the first empty CC receipt groups, or adjust naming before any MailerLite mutation.'
      : 'Review naming; no group creation recommended yet.',
  };
};

const safeKeychain = (options, credential) => ({
  service: options.service,
  account: options.account,
  credentialPresent: Boolean(credential.key),
  credentialSource: credential.source,
  credentialFingerprintSha256_12: credential.key ? hash12(credential.key) : null,
});

const safetyBlock = () => ({
  readOnly: true,
  mailerLiteMutationsPerformed: false,
  subscriberReadsPerformed: false,
  subscriberRowsPrinted: false,
  workflowMutationsPerformed: false,
  groupMutationsPerformed: false,
  tokensPrinted: false,
  outboundPerformed: false,
});

const renderMarkdown = (report) => {
  const lines = [
    '# CRM vNext - MailerLite Receipt Taxonomy Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Manifest: ${report.manifestPath}`,
    '',
  ];

  if (!report.ok) {
    lines.push('## Blocker', '', `- Reason: ${report.blocker?.reason}`, `- Unblock: ${report.blocker?.unblockAction}`, '');
    return lines.join('\n');
  }

  lines.push(
    '## Summary',
    '',
    `- Live groups read: ${report.liveScan.groupsRead}`,
    `- Live workflows read: ${report.liveScan.workflowsRead}`,
    `- Manifest groups: ${report.summary.plannedGroups}`,
    `- Already exist: ${report.summary.alreadyExist}`,
    `- Missing: ${report.summary.missing}`,
    `- Safe empty-create after approval: ${report.summary.safeToCreateEmptyAfterApproval}`,
    `- Needs review because active-flow related: ${report.summary.needsReviewActiveFlowRelated}`,
    '',
    '## First Safe Create Set',
    '',
  );

  if (report.firstSafeCreateSet.length) {
    for (const name of report.firstSafeCreateSet) lines.push(`- ${name}`);
  } else {
    lines.push('- None yet.');
  }

  lines.push('', '## Planner Table', '');
  for (const item of report.plannedGroups) {
    lines.push(`- ${item.status}: ${item.name}`);
    if (item.relatedHistoricGroups.some((group) => group.exists)) {
      const names = item.relatedHistoricGroups.filter((group) => group.exists).map((group) => group.name).join(', ');
      lines.push(`  - Existing historical groups: ${names}`);
    }
    if (item.relatedWorkflows.some((workflow) => workflow.exists)) {
      const names = item.relatedWorkflows.filter((workflow) => workflow.exists).map((workflow) => workflow.name).join(', ');
      lines.push(`  - Related workflows found: ${names}`);
    }
  }

  lines.push(
    '',
    '## Do Not Touch',
    '',
    ...report.manifest.doNotTouchHistoricGroups.map((name) => `- Group: ${name}`),
    ...report.manifest.doNotTouchActiveWorkflows.map((name) => `- Workflow: ${name}`),
    '',
    '## Safety',
    '',
    '- Read-only planner only.',
    '- No subscribers read or printed.',
    '- No groups created, renamed, deleted, or assigned.',
    '- No workflows edited.',
    '- No tokens printed.',
    '- No outbound.',
    '',
    `Next action: ${report.nextAction}`,
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

  const report = await buildReport(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    summary: report.summary ?? null,
    blocker: report.blocker ?? null,
    firstSafeCreateSet: report.firstSafeCreateSet ?? [],
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (!report.ok && options.failOnBlocked) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext MailerLite receipt taxonomy planner failed: ${error.message}`);
  process.exitCode = 1;
});
