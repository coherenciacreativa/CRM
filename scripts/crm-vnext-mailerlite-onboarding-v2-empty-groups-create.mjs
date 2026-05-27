#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { buildPacket } from './crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-empty-groups-create-2026-05-27';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_BRAND_DICTIONARY = process.env.BRAND_MAILERLITE_GROUP_DICTIONARY
  || '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-create.mjs [options]

Options:
  --execute                  Create the approved empty groups. Without this, dry-run only.
  --approval-phrase <text>   Exact human approval phrase required with --execute.
  --design-packet <path>     Onboarding v2 design JSON. Passed to the packet builder.
  --brand-dictionary <path>  Brand Hub dictionary. Passed to the packet builder.
  --service <name>           Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>           Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>           MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>           Per-request timeout. Defaults to 30000
  --out <path>               Write JSON report
  --markdown-out <path>      Write Markdown report
  --help                     Show this help

Guarded create-empty runner for the 12 Onboarding v2 groups. Default mode is
dry-run. Execute mode requires the exact approval phrase produced after a fresh
read-only scan. It never reads subscribers, assigns subscribers, edits workflows,
activates automations, sends emails, touches Onboarding v1, or prints tokens.`;

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

const parseArgs = (argv) => {
  const options = {
    execute: false,
    approvalPhrase: null,
    designPacket: DEFAULT_DESIGN_PACKET,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
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
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
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

const buildExecutionDecision = ({ packet, execute, approvalPhrase }) => {
  const expectedPhrase = packet?.approvalGate?.exactApprovalPhrase ?? null;
  const approval = approvalStatusFor({ execute, approvalPhrase, expectedPhrase });
  const targetPlan = packet?.targetPlan ?? [];
  const blockers = [
    ...(packet?.ok ? [] : packet?.blockers?.length ? packet.blockers : ['packet_not_ready']),
    ...(approval.ok ? [] : [approval.status]),
    ...targetPlan
      .filter((target) => !target.canCreateEmptyAfterExplicitApproval)
      .map((target) => `${target.name}:not_safe_to_create_empty`),
  ];
  return {
    expectedPhrase,
    approval,
    targetPlan,
    blockers,
    canExecute: Boolean(execute && blockers.length === 0 && targetPlan.length > 0),
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
    const response = await fetch(urlWithParams(options.apiBase, path), {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Onboarding-V2-Empty-Groups-Create/1.0',
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
    id: cleanString(created?.id),
    name: cleanString(created?.name) ?? name,
  };
};

const safetyBlock = ({ execute, createdCount }) => ({
  mode: execute ? 'execute_create_onboarding_v2_empty_groups_only' : 'dry_run_only',
  mailerLiteMutationsPerformed: execute && createdCount > 0,
  groupMutationsPerformed: execute && createdCount > 0,
  groupMutationType: execute && createdCount > 0 ? 'create_empty_groups_only' : null,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  sendsPerformed: false,
  crmMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildRun = async (options) => {
  const packet = await buildPacket(options);
  const decision = buildExecutionDecision({
    packet,
    execute: options.execute,
    approvalPhrase: options.approvalPhrase,
  });

  const createdGroups = [];
  const errors = [];
  let credentialSummary = null;
  if (decision.canExecute) {
    const credential = await getCredential(options);
    credentialSummary = {
      service: options.service,
      account: options.account,
      credentialPresent: Boolean(credential.key),
      credentialSource: credential.source,
    };
    if (!credential.key) {
      decision.blockers.push('blocked_missing_mailerlite_credential_for_execute');
    } else {
      for (const target of decision.targetPlan) {
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
  }

  const executedOk = options.execute
    && decision.blockers.length === 0
    && errors.length === 0
    && createdGroups.length === decision.targetPlan.length;
  const dryRunOk = !options.execute && decision.blockers.length === 0;
  const status = options.execute
    ? executedOk
      ? 'executed_onboarding_v2_empty_group_creation'
      : decision.blockers.length
        ? 'blocked_before_live_create'
        : 'failed_during_live_create'
    : dryRunOk
      ? 'dry_run_ready_for_exact_approval'
      : 'dry_run_blocked';

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    ok: options.execute ? executedOk : dryRunOk,
    status,
    mode: options.execute ? 'execute_requested' : 'dry_run',
    packetSummary: {
      status: packet.status,
      targetCount: packet.targetPlan?.length ?? 0,
      liveGroupsRead: packet.sourceEvidence?.liveGroupsRead ?? null,
      liveAutomationsRead: packet.sourceEvidence?.liveAutomationsRead ?? null,
      blockers: packet.blockers ?? [],
    },
    decision,
    credential: credentialSummary,
    createdGroups,
    errors,
    safety: safetyBlock({ execute: options.execute, createdCount: createdGroups.length }),
  };
};

const renderMarkdown = (run) => [
  '# MailerLite Launch OS v0 - Onboarding v2 Empty Groups Create Runner',
  '',
  `Generated: ${run.generatedAt}`,
  `Mode: ${run.mode}`,
  `Status: ${run.status}`,
  '',
  '## Decision Ejecutiva',
  '',
  run.mode === 'dry_run'
    ? 'Dry-run completado. No se crearon grupos.'
    : run.status === 'executed_onboarding_v2_empty_group_creation'
      ? 'Creacion aprobada ejecutada para los grupos vacios de Onboarding v2.'
      : 'Execute fue solicitado pero quedo bloqueado o fallo antes de completarse.',
  '',
  '## Fresh Packet Summary',
  '',
  `- Packet status: ${run.packetSummary.status}`,
  `- Target count: ${run.packetSummary.targetCount}`,
  `- Live groups read: ${run.packetSummary.liveGroupsRead ?? 'n/a'}`,
  `- Live automations read: ${run.packetSummary.liveAutomationsRead ?? 'n/a'}`,
  '',
  '## Gates',
  '',
  `- Approval status: ${run.decision.approval.status}`,
  `- canExecute: ${run.decision.canExecute}`,
  `- Blockers: ${run.decision.blockers.length}`,
  '',
  '## Target Plan',
  '',
  ...run.decision.targetPlan.map((target) =>
    `- ${target.name}: ${target.plannedOperation}; existsInFreshScan=${target.existsInFreshScan}; workflowUseAllowed=${target.workflowUseAllowed}; subscriberAssignmentAllowed=${target.subscriberAssignmentAllowed}`,
  ),
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
  `- MailerLite mutations performed: ${run.safety.mailerLiteMutationsPerformed}`,
  `- Group mutation type: ${run.safety.groupMutationType ?? 'none'}`,
  '- No subscribers read or printed.',
  '- No subscribers assigned.',
  '- No workflows or automations edited.',
  '- No emails sent.',
  '- Onboarding v1 untouched.',
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
    packetSummary: run.packetSummary,
    createdCount: run.createdGroups.length,
    blockers: run.decision.blockers,
    errors: run.errors,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: run.safety,
  }, null, 2));

  if (options.execute && run.status !== 'executed_onboarding_v2_empty_group_creation') process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 empty groups create failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  approvalStatusFor,
  buildExecutionDecision,
  buildRun,
  normalizeApprovalPhrase,
  parseArgs,
  renderMarkdown,
};
