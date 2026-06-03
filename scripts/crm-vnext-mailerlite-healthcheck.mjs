#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-healthcheck-2026-05-21';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-healthcheck.mjs [options]

Options:
  --service <name>       Stored credential service override.
  --account <name>       Stored credential account override.
  --api-base <url>       MailerLite API base.
  --timeout-ms <n>       Per-request timeout. Defaults to 30000
  --limit <n>            Cursor scan page size. Defaults to 100
  --max-pages <n>        Cursor scan safety cap. Defaults to 50
  --out <path>           Write JSON report
  --markdown-out <path>  Write Markdown summary
  --fail-on-blocked      Exit with code 2 if any required check fails
  --help                 Show this help

Read-only health check for CRM vNext MailerLite evidence lanes.
It verifies credential presence, groups read, subscribers read, and cursor pagination
without printing subscriber rows, personal fields, or tokens.`;

const parseArgs = (argv) => {
  const options = {
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    limit: 100,
    maxPages: 50,
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
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? options.maxPages : 50;
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
    return key ? { key } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return keychain;
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key };
  }
  return { key: null };
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const unblockActionFor = (reason) => {
  if (reason === 'missing_mailerlite_credential') {
    return 'Store a valid MailerLite API key in the local stored credential path. Do not paste tokens in chat.';
  }
  if (reason === 'mailerlite_unauthenticated') {
    return 'Refresh the stored MailerLite API key locally. A known-good local source may be copied internally, but never print or paste the token.';
  }
  if (reason === 'mailerlite_forbidden') {
    return 'Check that the MailerLite API key has permission for read-only subscriber and group endpoints.';
  }
  if (reason === 'mailerlite_rate_limited') {
    return 'Retry later with a lower page size or longer delay before running source recovery.';
  }
  return 'Inspect local MailerLite source state while keeping tokens and subscriber content out of chat/logs.';
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
        'User-Agent': 'CRM-vNext-MailerLite-Healthcheck/1.0',
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
        // Ignore malformed next link and treat it as no cursor.
      }
    }
  }
  return null;
};

const check = async (service, runner, options, required = true) => {
  try {
    const result = await runner();
    return {
      service,
      ok: true,
      required,
      detail: result?.detail || 'ok',
      metrics: result?.metrics || undefined,
    };
  } catch (error) {
    const reason = error?.reason || error?.message || 'unknown_mailerlite_error';
    return {
      service,
      ok: false,
      required,
      reason,
      detail: reason,
      unblockAction: unblockActionFor(reason),
    };
  }
};

const credentialReceipt = (credentialPresent) => ({
  credentialPresent,
  storedCredentialChecked: true,
  credentialMode: 'stored_credential_checked',
});

const buildReport = async (options) => {
  const credential = await getCredential(options);
  const credentialPresent = Boolean(credential.key);
  const checks = [];

  checks.push(await check('credential_presence', async () => {
    if (!credential.key) {
      const error = new Error('missing_mailerlite_credential');
      error.reason = 'missing_mailerlite_credential';
      throw error;
    }
    return {
      detail: 'stored credential available',
      metrics: credentialReceipt(true),
    };
  }, options));

  if (credential.key) {
    checks.push(await check('groups_probe', async () => {
      const payload = await fetchJson(options, credential.key, '/groups', { limit: 1 });
      return { detail: 'Groups endpoint ok', metrics: { returned: extractItems(payload).length } };
    }, options));

    checks.push(await check('subscribers_probe', async () => {
      const payload = await fetchJson(options, credential.key, '/subscribers', { limit: 1 });
      return { detail: 'Subscribers endpoint ok', metrics: { returned: extractItems(payload).length } };
    }, options));

    checks.push(await check('subscriber_cursor_scan', async () => {
      let cursor = null;
      let pages = 0;
      let subscribersScanned = 0;
      while (pages < options.maxPages) {
        const params = { limit: options.limit };
        if (cursor) params.cursor = cursor;
        const payload = await fetchJson(options, credential.key, '/subscribers', params);
        const items = extractItems(payload);
        if (!items.length) break;
        subscribersScanned += items.length;
        pages += 1;
        cursor = extractNextCursor(payload);
        if (!cursor) break;
      }
      const exhaustedByCap = Boolean(cursor && pages >= options.maxPages);
      if (exhaustedByCap) {
        const error = new Error('mailerlite_scan_page_cap_reached');
        error.reason = 'mailerlite_scan_page_cap_reached';
        throw error;
      }
      return {
        detail: `Cursor pagination ok: ${pages} pages scanned`,
        metrics: {
          pages,
          subscribersScanned,
          pageSize: options.limit,
          exhaustedByCap: false,
        },
      };
    }, options));
  }

  const blockingChecks = checks.filter((item) => item.required && item.ok === false);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_healthcheck',
    checkedAt: new Date().toISOString(),
    credential: credentialReceipt(credentialPresent),
    ok: blockingChecks.length === 0,
    status: blockingChecks.length === 0 ? 'ok' : 'blocked',
    summary: {
      totalChecks: checks.length,
      ok: checks.filter((item) => item.ok).length,
      blocked: blockingChecks.length,
      subscriberPages: checks.find((item) => item.service === 'subscriber_cursor_scan')?.metrics?.pages ?? null,
      subscribersScanned: checks.find((item) => item.service === 'subscriber_cursor_scan')?.metrics?.subscribersScanned ?? null,
    },
    checks,
    safety: {
      readOnly: true,
      personalContentPrinted: false,
      tokensPrinted: false,
      outboundPerformed: false,
      mailerLiteMutationsPerformed: false,
      subscriberRowsPrinted: false,
    },
    nextAction: blockingChecks.length === 0
      ? 'MailerLite read-only evidence lane is healthy for Mantis source recovery.'
      : 'Pause CRM source recovery and complete the listed MailerLite unblock actions before retrying.',
  };
};

const renderMarkdown = (report) => [
  '# CRM vNext MailerLite Health Check',
  '',
  `- Status: ${report.status}`,
  `- Checked at: ${report.checkedAt}`,
  `- Credential present: ${report.credential.credentialPresent ? 'yes' : 'no'}`,
  `- Stored credential checked: ${report.credential.storedCredentialChecked ? 'yes' : 'no'}`,
  `- Checks: ${report.summary.ok}/${report.summary.totalChecks} OK, ${report.summary.blocked} blocked`,
  `- Cursor scan: ${report.summary.subscriberPages ?? 0} pages / ${report.summary.subscribersScanned ?? 0} subscribers`,
  '',
  '## Checks',
  '',
  ...report.checks.map((item) => {
    const mark = item.ok ? 'OK' : 'BLOCKED';
    const base = `- ${mark} ${item.service}: ${item.detail}`;
    return item.ok ? base : `${base}\n  - Unblock: ${item.unblockAction}`;
  }),
  '',
  '## Safety',
  '',
  '- Read-only check only.',
  '- No subscriber rows, emails, names, groups, fields, or notes printed.',
  '- No tokens, codes, or credentials printed.',
  '- No MailerLite mutations and no outbound.',
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

  const report = await buildReport(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    checkedAt: report.checkedAt,
    summary: report.summary,
    credential: report.credential,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    blockedChecks: report.checks.filter((item) => item.ok === false).map((item) => ({
      service: item.service,
      reason: item.reason,
      unblockAction: item.unblockAction,
    })),
    safety: report.safety,
  }, null, 2));

  if (!report.ok && options.failOnBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext MailerLite healthcheck failed: ${error.message}`);
  process.exitCode = 1;
});
