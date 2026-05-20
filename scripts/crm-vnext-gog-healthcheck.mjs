#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-gog-healthcheck-2026-05-21';
const DEFAULT_ACCOUNT = process.env.GOG_ACCOUNT || 'saludoalsol@gmail.com';

const usage = `Usage:
  node scripts/crm-vnext-gog-healthcheck.mjs [options]

Options:
  --account <email>       Google account to check. Defaults to GOG_ACCOUNT or ${DEFAULT_ACCOUNT}
  --gog-bin <path>        gog binary. Defaults to gog
  --timeout-ms <n>        Per-command timeout. Defaults to 30000
  --out <path>            Write JSON report
  --markdown-out <path>   Write Markdown summary
  --fail-on-blocked       Exit with code 2 if any required check fails
  --help                  Show this help

Read-only health check for Mantis/OpenClaw Google Workspace evidence lanes.
It verifies token exchange plus People, Gmail, Contacts, Drive, Docs, and Sheets access
without printing personal email, document, sheet, or contact content.`;

const parseArgs = (argv) => {
  const options = {
    account: DEFAULT_ACCOUNT,
    gogBin: 'gog',
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
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--gog-bin') options.gogBin = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.account) throw new Error('missing_account');
  if (!options.gogBin) throw new Error('missing_gog_bin');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const compactError = (error) => {
  const raw = [
    error?.stderr ? String(error.stderr) : '',
    error?.stdout ? String(error.stdout) : '',
    error instanceof Error ? error.message : '',
  ].filter(Boolean).join(' ');
  const text = raw.replace(/\s+/g, ' ').trim() || 'unknown_error';
  if (/invalid_grant/i.test(text)) return 'oauth_invalid_grant';
  if (/accessNotConfigured|has not been used|is disabled/i.test(text)) return 'google_api_not_configured';
  if (/permission|insufficientPermissions|forbidden|403/i.test(text)) return 'insufficient_permissions';
  if (/timed out|timeout/i.test(text)) return 'timeout';
  return text.slice(0, 240);
};

const unblockActionFor = (reason) => {
  if (reason === 'oauth_invalid_grant') {
    return [
      'Reauthorize gog for saludoalsol@gmail.com with read-only CRM evidence scopes:',
      'gog auth add saludoalsol@gmail.com --services gmail,contacts,people,drive,docs,sheets --readonly --force-consent',
      'Complete browser consent locally; do not paste tokens or codes in chat.',
    ].join(' ');
  }
  if (reason === 'google_api_not_configured') {
    return 'Enable the required Google API for the gog OAuth project, then rerun this health check.';
  }
  if (reason === 'insufficient_permissions') {
    return 'Reauthorize gog with the required read-only scopes for Gmail, Contacts/People, Drive, Docs, and Sheets.';
  }
  if (reason === 'timeout') {
    return 'Retry the check; if repeated, inspect network/browser/OAuth prompt state before running CRM source recovery.';
  }
  return 'Inspect the gog command failure locally, keeping tokens and personal content out of chat/logs.';
};

const runGog = async (options, args, { account = true } = {}) => {
  const finalArgs = [...args];
  if (account) finalArgs.push('--account', options.account);
  finalArgs.push('--json', '--no-input');
  const { stdout } = await execFileAsync(options.gogBin, finalArgs, {
    timeout: options.timeoutMs,
    maxBuffer: 4 * 1024 * 1024,
  });
  return JSON.parse(stdout || '{}');
};

const check = async (service, runner, required = true) => {
  try {
    const result = await runner();
    return {
      service,
      ok: true,
      required,
      skipped: Boolean(result?.skipped),
      detail: result?.detail || 'ok',
    };
  } catch (error) {
    const reason = compactError(error);
    return {
      service,
      ok: false,
      required,
      skipped: false,
      reason,
      detail: reason,
      unblockAction: unblockActionFor(reason),
    };
  }
};

const filesFromDriveSearch = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.files)) return payload.files;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.data?.files)) return payload.data.files;
  return [];
};

const buildReport = async (options) => {
  let docId = null;
  let sheetId = null;

  const checks = [];
  checks.push(await check('auth_token_exchange', async () => {
    const payload = await runGog(options, ['auth', 'list', '--check', '--timeout', '10s'], { account: false });
    const account = (payload.accounts || []).find((item) => item.email === options.account);
    if (!account) throw new Error('account_not_found');
    if (account.valid !== true) throw new Error(account.error || 'token_invalid');
    return { detail: 'token exchange ok' };
  }));

  checks.push(await check('people_profile', async () => {
    await runGog(options, ['people', 'me']);
    return { detail: 'People profile endpoint ok' };
  }));

  checks.push(await check('gmail_search', async () => {
    await runGog(options, ['gmail', 'search', 'newer_than:365d', '--max', '1']);
    return { detail: 'Gmail read-only thread search ok' };
  }));

  checks.push(await check('contacts_list', async () => {
    await runGog(options, ['contacts', 'list', '--max', '1']);
    return { detail: 'Contacts read-only list ok' };
  }));

  checks.push(await check('drive_document_search', async () => {
    const payload = await runGog(options, [
      'drive',
      'search',
      "mimeType = 'application/vnd.google-apps.document' and trashed = false",
      '--raw-query',
      '--max',
      '1',
    ]);
    const files = filesFromDriveSearch(payload);
    docId = files[0]?.id || null;
    return { detail: docId ? 'Drive document search ok' : 'Drive document search ok; no document candidate found' };
  }));

  checks.push(await check('docs_metadata', async () => {
    if (!docId) return { skipped: true, detail: 'Skipped because Drive returned no document candidate' };
    await runGog(options, ['docs', 'info', docId]);
    return { detail: 'Docs metadata endpoint ok' };
  }));

  checks.push(await check('drive_spreadsheet_search', async () => {
    const payload = await runGog(options, [
      'drive',
      'search',
      "mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false",
      '--raw-query',
      '--max',
      '1',
    ]);
    const files = filesFromDriveSearch(payload);
    sheetId = files[0]?.id || null;
    return { detail: sheetId ? 'Drive spreadsheet search ok' : 'Drive spreadsheet search ok; no spreadsheet candidate found' };
  }));

  checks.push(await check('sheets_metadata', async () => {
    if (!sheetId) return { skipped: true, detail: 'Skipped because Drive returned no spreadsheet candidate' };
    await runGog(options, ['sheets', 'metadata', sheetId]);
    return { detail: 'Sheets metadata endpoint ok' };
  }));

  const blockingChecks = checks.filter((item) => item.required && item.ok === false);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_gog_healthcheck',
    checkedAt: new Date().toISOString(),
    account: options.account,
    ok: blockingChecks.length === 0,
    status: blockingChecks.length === 0 ? 'ok' : 'blocked',
    summary: {
      totalChecks: checks.length,
      ok: checks.filter((item) => item.ok).length,
      blocked: blockingChecks.length,
      skipped: checks.filter((item) => item.skipped).length,
    },
    checks,
    safety: {
      readOnly: true,
      personalContentPrinted: false,
      tokensPrinted: false,
      outboundPerformed: false,
      googleMutationsPerformed: false,
    },
    nextAction: blockingChecks.length === 0
      ? 'Google Workspace read-only evidence lanes are healthy for Mantis source recovery.'
      : 'Pause CRM source recovery and ask Alejandro to complete the listed unblock actions before retrying.',
  };
};

const renderMarkdown = (report) => [
  '# CRM vNext gog Health Check',
  '',
  `- Account: ${report.account}`,
  `- Status: ${report.status}`,
  `- Checked at: ${report.checkedAt}`,
  `- Checks: ${report.summary.ok}/${report.summary.totalChecks} OK, ${report.summary.blocked} blocked, ${report.summary.skipped} skipped`,
  '',
  '## Checks',
  '',
  ...report.checks.map((item) => {
    const mark = item.ok ? (item.skipped ? '-' : 'OK') : 'BLOCKED';
    const base = `- ${mark} ${item.service}: ${item.detail}`;
    return item.ok ? base : `${base}\n  - Unblock: ${item.unblockAction}`;
  }),
  '',
  '## Safety',
  '',
  '- Read-only check only.',
  '- No Gmail/Drive/Docs/Sheets/Contacts content printed.',
  '- No tokens, codes, or credentials printed.',
  '- No Google mutations and no outbound.',
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
    account: report.account,
    summary: report.summary,
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
  console.error(`crm-vnext gog healthcheck failed: ${error.message}`);
  process.exitCode = 1;
});
