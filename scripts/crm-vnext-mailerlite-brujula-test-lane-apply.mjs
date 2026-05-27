#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildPlan,
  exactApprovalPhraseFor,
  normalizeEmail,
  redactEmail,
} from './crm-vnext-mailerlite-brujula-test-lane-plan.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-test-lane-apply-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const RECEIPT_GROUPS = [
  {
    name: 'CC · Source · Resource · Brújula',
    id: '188581887447401645',
    defaultAssign: true,
  },
  {
    name: 'CC · Delivered · Guide · Brújula',
    id: '188581888003147002',
    defaultAssign: true,
  },
  {
    name: 'CC · Sent · Article · Sobre el amor',
    id: '188581888519046472',
    defaultAssign: false,
  },
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-test-lane-apply.mjs [options]

Options:
  --test-email <email>             Required. The single approved test subscriber email.
  --approval-phrase <text>         Required. Must exactly match the generated approval phrase.
  --assign-sobre-el-amor           Also assign CC · Sent · Article · Sobre el amor.
  --service <name>                 Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                 Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                 MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                 Per-request timeout. Defaults to 30000
  --out <path>                     Write JSON report
  --markdown-out <path>            Write Markdown report
  --help                           Show this help

Live test-only runner for the Brújula pilot. It can only create/update one approved
test subscriber and assign approved receipt groups. It never activates workflows,
edits automations, sends emails, touches other subscribers, bulk imports, deletes,
renames, or prints tokens.`;

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
    testEmail: null,
    approvalPhrase: null,
    assignSobreElAmor: false,
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
    else if (arg === '--test-email') options.testEmail = argv[++index];
    else if (arg === '--approval-phrase') options.approvalPhrase = argv[++index];
    else if (arg === '--assign-sobre-el-amor') options.assignSobreElAmor = true;
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
  options.testEmail = normalizeEmail(options.testEmail);
  if (!options.testEmail) throw new Error('missing_or_invalid_test_email');
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
        'User-Agent': 'CRM-vNext-MailerLite-Brujula-Test-Lane-Apply/1.0',
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

const safeId = (item) => cleanString(item?.id);
const safeName = (item) => cleanString(item?.name) ?? cleanString(item?.title) ?? cleanString(item?.label);
const extractData = (payload) => (payload?.data && typeof payload.data === 'object' ? payload.data : payload);

const getSubscriber = async ({ options, key }) => {
  try {
    const payload = await requestJson({
      options,
      key,
      path: `/subscribers/${encodeURIComponent(options.testEmail)}`,
      params: { include: 'groups' },
    });
    const data = extractData(payload);
    return {
      found: true,
      id: safeId(data),
      email: redactEmail(data?.email ?? options.testEmail),
      status: cleanString(data?.status),
      groups: Array.isArray(data?.groups)
        ? data.groups.map((group) => ({ id: safeId(group), name: safeName(group) })).filter((group) => group.id || group.name)
        : [],
    };
  } catch (error) {
    if (error?.reason === 'mailerlite_endpoint_not_found') {
      return {
        found: false,
        reason: error.reason,
        email: redactEmail(options.testEmail),
      };
    }
    throw error;
  }
};

const createSubscriber = async ({ options, key }) => {
  const payload = await requestJson({
    options,
    key,
    path: '/subscribers',
    method: 'POST',
    body: { email: options.testEmail },
  });
  const data = extractData(payload);
  return {
    id: safeId(data),
    email: redactEmail(data?.email ?? options.testEmail),
    status: cleanString(data?.status),
  };
};

const assignGroup = async ({ options, key, subscriberId, group }) => {
  const payload = await requestJson({
    options,
    key,
    path: `/subscribers/${encodeURIComponent(subscriberId)}/groups/${encodeURIComponent(group.id)}`,
    method: 'POST',
  });
  const data = extractData(payload);
  return {
    id: safeId(data) ?? group.id,
    name: safeName(data) ?? group.name,
  };
};

const safeSubscriberStatus = (status) => {
  if (!status) return true;
  return !['unsubscribed', 'bounced', 'junk'].includes(status.toLowerCase());
};

const buildApply = async (options) => {
  const expectedPhrase = exactApprovalPhraseFor(options.testEmail);
  const approvalMatched = normalizeApprovalPhrase(options.approvalPhrase) === normalizeApprovalPhrase(expectedPhrase);
  const blockers = approvalMatched ? [] : ['approval_phrase_mismatch'];

  const plan = await buildPlan(options);
  if (!plan.ok) blockers.push(...plan.blockers);

  const credential = await getCredential(options);
  if (!credential.key) blockers.push('missing_mailerlite_credential');

  const groupsToAssign = RECEIPT_GROUPS.filter((group) => group.defaultAssign || options.assignSobreElAmor);
  const liveRequired = plan.mailerLite?.requiredGroups ?? [];
  for (const group of groupsToAssign) {
    const live = liveRequired.find((item) => item.id === group.id || item.name === group.name);
    if (!live?.exists) blockers.push(`required_group_missing:${group.name}`);
  }

  let beforeSubscriber = null;
  let createdSubscriber = null;
  let afterSubscriber = null;
  const assignedGroups = [];
  const errors = [];

  if (!blockers.length) {
    beforeSubscriber = await getSubscriber({ options, key: credential.key });
    if (beforeSubscriber.found && !safeSubscriberStatus(beforeSubscriber.status)) {
      blockers.push(`subscriber_status_not_safe_to_update:${beforeSubscriber.status}`);
    }
  }

  if (!blockers.length) {
    try {
      const subscriber = beforeSubscriber.found
        ? beforeSubscriber
        : await createSubscriber({ options, key: credential.key });
      createdSubscriber = beforeSubscriber.found
        ? { created: false, id: beforeSubscriber.id, email: beforeSubscriber.email, status: beforeSubscriber.status }
        : { created: true, ...subscriber };
      if (!createdSubscriber.id) throw new Error('subscriber_id_missing_after_create_or_fetch');

      for (const group of groupsToAssign) {
        assignedGroups.push(await assignGroup({
          options,
          key: credential.key,
          subscriberId: createdSubscriber.id,
          group,
        }));
      }
      afterSubscriber = await getSubscriber({ options, key: credential.key });
    } catch (error) {
      errors.push({
        reason: error?.reason || error?.message || 'mailerlite_brujula_apply_failed',
        status: error?.status ?? null,
      });
    }
  }

  const ok = !blockers.length && !errors.length && assignedGroups.length === groupsToAssign.length;
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'live_test_only_brujula_subscriber_receipts',
    generatedAt: new Date().toISOString(),
    ok,
    status: ok ? 'executed_test_subscriber_receipts' : 'blocked_or_failed',
    target: {
      testEmail: redactEmail(options.testEmail),
      fullEmailStoredInReport: false,
    },
    planStatus: {
      status: plan.status,
      blockers: plan.blockers,
      brujulaAutomation: plan.mailerLite?.brujulaAutomation
        ? {
          found: plan.mailerLite.brujulaAutomation.found,
          enabled: plan.mailerLite.brujulaAutomation.enabled,
          complete: plan.mailerLite.brujulaAutomation.complete,
        }
        : null,
    },
    approval: {
      matched: approvalMatched,
      expectedPhrasePresent: Boolean(expectedPhrase),
    },
    beforeSubscriber,
    createdSubscriber,
    assignedGroups,
    afterSubscriber,
    blockers,
    errors,
    safety: {
      mailerLiteMutationsPerformed: ok,
      subscriberCreateOrUpdatePerformed: Boolean(createdSubscriber?.created),
      singleSubscriberLookupPerformed: true,
      subscriberRowsPrinted: false,
      groupAssignmentsPerformed: assignedGroups.length > 0,
      groupAssignmentsLimitedToApprovedSubscriber: true,
      groupAssignmentsLimitedToApprovedGroups: true,
      workflowMutationsPerformed: false,
      automationMutationsPerformed: false,
      workflowActivationPerformed: false,
      audienceSendPerformed: false,
      testEmailSendPerformed: false,
      tokensPrinted: false,
      outboundPerformed: false,
    },
  };
};

const renderMarkdown = (report) => [
  '# MailerLite vNext - Brújula Test Lane Apply',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Mode: ${report.mode}`,
  '',
  '## Executive Summary',
  '',
  report.ok
    ? 'Approved test-only subscriber receipt rehearsal executed.'
    : 'Apply was blocked or failed; no further action should be assumed.',
  '',
  'This did not send email, activate workflows, touch active onboarding, or modify any subscriber other than the approved test address.',
  '',
  '## Target',
  '',
  `- Test email: ${report.target.testEmail}`,
  `- Full email stored in report: ${report.target.fullEmailStoredInReport}`,
  '',
  '## Plan Gate',
  '',
  `- Plan status: ${report.planStatus.status}`,
  `- Brújula automation found: ${report.planStatus.brujulaAutomation?.found}`,
  `- Brújula automation enabled: ${report.planStatus.brujulaAutomation?.enabled}`,
  `- Brújula automation complete: ${report.planStatus.brujulaAutomation?.complete}`,
  `- Approval phrase matched: ${report.approval.matched}`,
  '',
  '## Subscriber',
  '',
  `- Before: ${report.beforeSubscriber?.found ? `found ${report.beforeSubscriber.id} (${report.beforeSubscriber.status ?? 'status_unknown'})` : 'not found'}`,
  `- Created: ${report.createdSubscriber?.created ?? false}`,
  `- Subscriber id: ${report.createdSubscriber?.id ?? report.afterSubscriber?.id ?? 'n/a'}`,
  `- After status: ${report.afterSubscriber?.status ?? 'n/a'}`,
  '',
  '## Assigned Groups',
  '',
  report.assignedGroups.length
    ? report.assignedGroups.map((group) => `- ${group.name}: ${group.id}`).join('\n')
    : '- None.',
  '',
  '## Blockers',
  '',
  report.blockers.length ? report.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None.',
  '',
  '## Errors',
  '',
  report.errors.length ? report.errors.map((error) => `- ${error.reason}${error.status ? ` (${error.status})` : ''}`).join('\n') : '- None.',
  '',
  '## Safety',
  '',
  `- MailerLite mutations performed: ${report.safety.mailerLiteMutationsPerformed}`,
  `- Subscriber create/update performed: ${report.safety.subscriberCreateOrUpdatePerformed}`,
  `- Group assignments performed: ${report.safety.groupAssignmentsPerformed}`,
  '- Single approved subscriber only.',
  '- Approved groups only.',
  '- No workflows or automations edited or activated.',
  '- No audience send.',
  '- No test email sent by this runner.',
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

  const report = await buildApply(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    target: report.target,
    created: report.createdSubscriber?.created ?? false,
    subscriberId: report.createdSubscriber?.id ?? report.afterSubscriber?.id ?? null,
    assignedGroupCount: report.assignedGroups.length,
    blockers: report.blockers,
    errors: report.errors,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (!report.ok) process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula test lane apply failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApply,
  normalizeApprovalPhrase,
  safeSubscriberStatus,
};
