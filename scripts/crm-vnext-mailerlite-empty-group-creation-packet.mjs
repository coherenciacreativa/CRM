#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

import { buildReport as buildPlannerReport, parseArgs as parsePlannerArgs } from './crm-vnext-mailerlite-receipt-taxonomy-plan.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-empty-group-creation-packet-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-empty-group-creation-packet.mjs [options]

Options:
  --service <name>       Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>       Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>       MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>       Per-request timeout. Defaults to 30000
  --out <path>           Write JSON packet
  --markdown-out <path>  Write Markdown packet
  --help                 Show this help

Read-only packet builder for MailerLite vNext. It combines a live operating snapshot
with the hardened taxonomy planner. It never creates groups, edits workflows, reads
subscriber rows, assigns subscribers, sends email, or mutates MailerLite.`;

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
        'User-Agent': 'CRM-vNext-MailerLite-Empty-Group-Creation-Packet/1.0',
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
  for (const key of ['data', 'groups', 'automations', 'fields', 'segments', 'forms', 'items', 'results']) {
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

const safeId = (item) => cleanString(item?.id) ?? cleanString(item?.form_id) ?? cleanString(item?.automation_id);
const safeName = (item) =>
  cleanString(item?.name)
  ?? cleanString(item?.title)
  ?? cleanString(item?.label)
  ?? cleanString(item?.key)
  ?? cleanString(item?.identifier);

const workflowSummary = (workflow) => ({
  id: safeId(workflow),
  name: safeName(workflow),
  enabled: workflow?.enabled ?? workflow?.active ?? workflow?.status ?? null,
  complete: workflow?.complete ?? null,
  trigger: safeName(workflow?.trigger) ?? cleanString(workflow?.trigger?.type) ?? null,
});

const groupSummary = (group) => ({
  id: safeId(group),
  name: safeName(group),
  subscriberCount: group?.active_count ?? group?.subscribers_count ?? group?.total ?? null,
});

const genericSummary = (item) => ({
  id: safeId(item),
  name: safeName(item),
  type: cleanString(item?.type),
  status: cleanString(item?.status) ?? cleanString(item?.state),
});

const readOptionalCollection = async ({ options, key, path, label }) => {
  try {
    const items = await scanCollection(options, key, path);
    return {
      label,
      path,
      ok: true,
      count: items.length,
      items,
    };
  } catch (error) {
    return {
      label,
      path,
      ok: false,
      count: 0,
      reason: error?.reason || error?.message || 'unknown_mailerlite_error',
      items: [],
    };
  }
};

const readFormsCollection = async ({ options, key }) => {
  const endpoints = [
    '/forms/popup',
    '/forms/embedded',
    '/forms/promotion',
  ];
  const reads = [];
  for (const path of endpoints) {
    reads.push(await readOptionalCollection({ options, key, path, label: path.replace('/forms/', 'forms_') }));
  }
  const okReads = reads.filter((read) => read.ok);
  return {
    label: 'forms',
    path: '/forms/{popup,embedded,promotion}',
    ok: okReads.length > 0,
    count: okReads.reduce((total, read) => total + read.count, 0),
    blockedReason: okReads.length > 0 ? null : reads.map((read) => `${read.path}:${read.reason}`).join('; '),
    endpointReads: reads.map((read) => ({
      path: read.path,
      ok: read.ok,
      count: read.count,
      reason: read.reason ?? null,
    })),
    items: okReads.flatMap((read) => read.items.map((item) => ({
      ...item,
      formEndpoint: read.path,
    }))),
  };
};

const buildSnapshot = async (options) => {
  const credential = await getCredential(options);
  if (!credential.key) {
    return {
      ok: false,
      status: 'blocked',
      blocker: {
        reason: 'missing_mailerlite_credential',
        unblockAction: `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}. Do not paste tokens in chat.`,
      },
      keychain: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      safety: safetyBlock(),
    };
  }

  const groups = await readOptionalCollection({ options, key: credential.key, path: '/groups', label: 'groups' });
  const workflows = await readOptionalCollection({ options, key: credential.key, path: '/automations', label: 'automations' });
  const fields = await readOptionalCollection({ options, key: credential.key, path: '/fields', label: 'fields' });
  const segments = await readOptionalCollection({ options, key: credential.key, path: '/segments', label: 'segments' });
  const forms = await readFormsCollection({ options, key: credential.key });

  const collections = { groups, workflows, fields, segments, forms };
  const requiredBlocked = [groups, workflows].filter((collection) => !collection.ok);
  const keyWorkflowNames = [
    'Onboarding flow',
    'Onboarding for legacy subscribers',
    'Perfect Week — Email 0 + handoff 24h',
    'Brújula de Claridad - Guía gratuita Workflow',
  ];
  const workflowIndex = new Map(workflows.items.map((workflow) => [normalizeName(safeName(workflow)), workflow]));

  return {
    ok: requiredBlocked.length === 0,
    status: requiredBlocked.length === 0 ? 'ok' : 'blocked',
    apiBase: options.apiBase,
    keychain: {
      service: options.service,
      account: options.account,
      credentialPresent: true,
      credentialSource: credential.source,
    },
    collections: {
      groups: {
        ok: groups.ok,
        count: groups.count,
        blockedReason: groups.reason ?? null,
        items: groups.items.map(groupSummary).sort((left, right) => left.name.localeCompare(right.name)),
      },
      workflows: {
        ok: workflows.ok,
        count: workflows.count,
        blockedReason: workflows.reason ?? null,
        items: workflows.items.map(workflowSummary).sort((left, right) => left.name.localeCompare(right.name)),
        keyWorkflows: keyWorkflowNames.map((name) => {
          const workflow = workflowIndex.get(normalizeName(name));
          return workflow ? workflowSummary(workflow) : { name, found: false };
        }),
      },
      fields: {
        ok: fields.ok,
        count: fields.count,
        blockedReason: fields.reason ?? null,
        items: fields.items.map(genericSummary).sort((left, right) => (left.name || '').localeCompare(right.name || '')),
      },
      segments: {
        ok: segments.ok,
        count: segments.count,
        blockedReason: segments.reason ?? null,
        items: segments.items.map(genericSummary).sort((left, right) => (left.name || '').localeCompare(right.name || '')),
      },
      forms: {
        ok: forms.ok,
        count: forms.count,
        blockedReason: forms.blockedReason ?? null,
        endpointReads: forms.endpointReads,
        items: forms.items.map(genericSummary).sort((left, right) => (left.name || '').localeCompare(right.name || '')),
      },
    },
    safety: safetyBlock(),
  };
};

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

const buildPacket = async (options) => {
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
  const snapshot = await buildSnapshot(options);
  const firstSet = planner.firstSafeEmptyGroupCreateSet ?? planner.firstSafeCreateSet ?? [];
  const canAskApproval = Boolean(
    snapshot.ok
    && planner.status === 'ready_for_human_review'
    && planner.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval
    && !planner.approvalGate?.canUseWorkflow
    && !planner.approvalGate?.canAttachToProtectedWorkflow
    && firstSet.length > 0
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_vnext_empty_group_creation_packet',
    generatedAt: new Date().toISOString(),
    ok: snapshot.ok && planner.ok,
    status: canAskApproval ? 'ready_for_empty_group_creation_decision' : 'blocked_or_not_ready',
    snapshot,
    planner: {
      status: planner.status,
      approvalGate: planner.approvalGate,
      summary: planner.summary,
      brandCanon: {
        alignmentOk: planner.brandCanon?.alignmentOk,
        issueCount: planner.brandCanon?.issueCount,
        blockingIssueCount: planner.brandCanon?.blockingIssueCount,
      },
      firstSafeEmptyGroupCreateSet: firstSet,
      futureLiveCreateRequirements: planner.futureLiveCreateRequirements,
    },
    decision: {
      canAskAlejandroForApproval: canAskApproval,
      recommendedDecision: canAskApproval ? 'approve_or_decline_named_empty_group_creation' : 'resolve_blockers_before_approval',
      exactApprovalPhrase: canAskApproval
        ? `Apruebo crear únicamente estos ${firstSet.length} grupos vacíos en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos y con re-scan fresco previo: ${firstSet.map((item) => item.name).join('; ')}.`
        : null,
    },
    safety: safetyBlock(),
  };
};

const renderMarkdown = (packet) => {
  const firstSet = packet.planner.firstSafeEmptyGroupCreateSet ?? [];
  const workflowLines = packet.snapshot.collections?.workflows?.keyWorkflows ?? [];
  const collection = packet.snapshot.collections ?? {};
  return [
    '# MailerLite vNext - Snapshot + Empty Group Creation Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Executive Decision',
    '',
    packet.decision.canAskAlejandroForApproval
      ? 'Ready for Alejandro to approve or decline creation of named empty groups only.'
      : 'Not ready for approval; resolve blockers first.',
    '',
    'This packet does not authorize workflow use, subscriber assignment, automation edits, sends, or any MailerLite mutation by itself.',
    '',
    '## Snapshot',
    '',
    `- Groups: ${collection.groups?.count ?? 0} (${collection.groups?.ok ? 'ok' : collection.groups?.blockedReason || 'blocked'})`,
    `- Workflows: ${collection.workflows?.count ?? 0} (${collection.workflows?.ok ? 'ok' : collection.workflows?.blockedReason || 'blocked'})`,
    `- Fields: ${collection.fields?.count ?? 0} (${collection.fields?.ok ? 'ok' : collection.fields?.blockedReason || 'blocked/optional'})`,
    `- Segments: ${collection.segments?.count ?? 0} (${collection.segments?.ok ? 'ok' : collection.segments?.blockedReason || 'blocked/optional'})`,
    `- Forms: ${collection.forms?.count ?? 0} (${collection.forms?.ok ? 'ok' : collection.forms?.blockedReason || 'blocked/optional'})`,
    '',
    '## Key Workflows',
    '',
    ...workflowLines.map((workflow) =>
      workflow.found === false
        ? `- ${workflow.name}: not found`
        : `- ${workflow.name}: id=${workflow.id || 'n/a'}, enabled=${workflow.enabled ?? 'n/a'}, complete=${workflow.complete ?? 'n/a'}, trigger=${workflow.trigger || 'n/a'}`,
    ),
    '',
    '## Empty Group Create Candidates',
    '',
    ...firstSet.flatMap((item) => [
      `- ${item.name}`,
      `  - Empty group creation: ${item.emptyGroupCreationStatus}`,
      `  - Workflow use: ${item.workflowUseStatus}`,
      `  - Workflow attachment allowed: ${item.workflowAttachmentAllowed}`,
      `  - Allowed operation: ${item.allowedOperation}`,
    ]),
    '',
    '## Gates',
    '',
    `- Brand canon alignment: ${packet.planner.brandCanon.alignmentOk}`,
    `- canCreateGroups: ${packet.planner.approvalGate?.canCreateGroups}`,
    `- canCreateNamedEmptyGroupsAfterExplicitApproval: ${packet.planner.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval}`,
    `- canUseWorkflow: ${packet.planner.approvalGate?.canUseWorkflow}`,
    `- canAttachToProtectedWorkflow: ${packet.planner.approvalGate?.canAttachToProtectedWorkflow}`,
    '',
    '## Approval Phrase',
    '',
    packet.decision.exactApprovalPhrase
      ? `\`${packet.decision.exactApprovalPhrase}\``
      : '- No approval phrase available until blockers are resolved.',
    '',
    '## Safety',
    '',
    '- Read-only packet generation.',
    '- No subscribers read or printed.',
    '- No groups created, renamed, deleted, or assigned.',
    '- No workflows edited.',
    '- No forms, fields, segments, automations, sends, or outbound touched.',
    '- No tokens printed.',
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

  const packet = await buildPacket(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    snapshot: {
      groups: packet.snapshot.collections?.groups?.count ?? null,
      workflows: packet.snapshot.collections?.workflows?.count ?? null,
      fields: packet.snapshot.collections?.fields?.count ?? null,
      segments: packet.snapshot.collections?.segments?.count ?? null,
      forms: packet.snapshot.collections?.forms?.count ?? null,
    },
    firstSafeEmptyGroupCreateSetCount: packet.planner.firstSafeEmptyGroupCreateSet.length,
    approvalGate: packet.planner.approvalGate,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext MailerLite empty group packet failed: ${error.message}`);
  process.exitCode = 1;
});
