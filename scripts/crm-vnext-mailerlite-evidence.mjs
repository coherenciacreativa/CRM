#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/mailerlite-evidence-helper';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-evidence.mjs --text <text> [options]
  node scripts/crm-vnext-mailerlite-evidence.mjs --text-file <path> [options]

Options:
  --api-url <url>             MailerLite evidence helper API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>               CRM facts/report text to build MailerLite evidence for
  --text-file <path>          Local text file with CRM facts/report text
  --source-kind <kind>        alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>           Reporter name, e.g. Alejandro or Juana
  --channel <channel>         Channel name, e.g. codex
  --search-results-file <path>
                              JSON MailerLite subscriber results from Mantis/OpenClaw/API/export
  --use-mailerlite-cli        Run read-only local mailerlite_cli people find searches for planned terms
  --python-bin <path>         Python executable for mailerlite_cli. Defaults to python3
  --limit <n>                 Cursor page size for MailerLite scans. Defaults to 100
  --max-pages <n>             Max cursor pages for local mailerlite_cli fallback scan. Defaults to 50
  --fail-on-auth-block        Exit non-zero when MailerLite auth is blocked
  --help                      Show this help

This command is read-only. It can plan MailerLite subscriber searches, convert supplied subscriber results into evidenceSources, or call the existing local MailerLite CLI in read-only mode. It never creates, updates, tags, groups, deletes, suppresses subscribers, mutates CRM cards, writes Fact Store, sends outbound messages, or prints credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    searchResultsFile: null,
    useMailerLiteCli: false,
    pythonBin: 'python3',
    limit: 100,
    maxPages: 50,
    failOnAuthBlock: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--use-mailerlite-cli') options.useMailerLiteCli = true;
    else if (arg === '--fail-on-auth-block') options.failOnAuthBlock = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--search-results-file') options.searchResultsFile = argv[++index];
    else if (arg === '--python-bin') options.pythonBin = argv[++index];
    else if (arg === '--limit') options.limit = Number.parseInt(argv[++index], 10);
    else if (arg === '--max-pages') options.maxPages = Number.parseInt(argv[++index], 10);
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  options.limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(100, options.limit) : 100;
  options.maxPages = Number.isFinite(options.maxPages) && options.maxPages > 0 ? Math.min(100, options.maxPages) : 50;
  return options;
};

const headers = () => {
  const result = { 'content-type': 'application/json' };
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    result['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }
  return result;
};

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  return null;
};

const readSearchResults = async (options) => {
  if (!options.searchResultsFile) return [];
  const raw = await readFile(resolve(options.searchResultsFile), 'utf8');
  return JSON.parse(raw);
};

const callHelper = async (options, extraBody = {}) => {
  const text = await readText(options);
  if (!text) throw new Error('mailerlite_evidence_text_required');

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      ...extraBody,
    }),
  });
  if (!response.ok) throw new Error(`mailerlite_evidence_helper_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`mailerlite_evidence_helper_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const sanitizeError = (value) =>
  String(value || 'mailerlite_read_blocked')
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, 'Bearer [redacted]')
    .replace(/api[_-]?key['":=\s]+[A-Za-z0-9._~+/=-]+/gi, 'api_key=[redacted]')
    .replace(/token['":=\s]+[A-Za-z0-9._~+/=-]+/gi, 'token=[redacted]')
    .replace(/\s+/g, ' ')
    .trim();

const uniqueTerms = (helper) => {
  const terms = [];
  for (const plan of helper.queryPlans ?? []) {
    for (const term of plan.searchTerms ?? []) {
      const cleaned = String(term || '').trim().replace(/^@+/, '');
      if (cleaned.length >= 3) terms.push(cleaned);
    }
  }
  return Array.from(new Set(terms)).slice(0, 12);
};

const parseMailerLiteCliOutput = (stdout) => {
  if (!stdout.trim()) return [];
  const parsed = JSON.parse(stdout);
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.data)) return parsed.data;
  if (Array.isArray(parsed?.subscribers)) return parsed.subscribers;
  if (Array.isArray(parsed?.items)) return parsed.items;
  if (Array.isArray(parsed?.results)) return parsed.results;
  return [];
};

const runMailerLiteScan = async (options, terms) => {
  const args = [
    '-m',
    'mailerlite_cli.cli',
    'people',
    'find',
    '--show-groups',
    '--show-fields',
    '--match-any',
    '--limit',
    String(options.limit),
    '--max-pages',
    String(options.maxPages),
  ];
  args.push('--tokens', terms.join(' '));

  try {
    const { stdout } = await execFileAsync(options.pythonBin, args, {
      cwd: process.cwd(),
      timeout: 60_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    return parseMailerLiteCliOutput(stdout);
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    const message = stderr || (error instanceof Error ? error.message : 'mailerlite_cli_read_failed');
    throw new Error(sanitizeError(message));
  }
};

const collectMailerLiteCliResults = async (options, helper) => {
  const terms = uniqueTerms(helper);
  if (!terms.length) return [];
  const results = [];
  const seen = new Set();
  const matches = await runMailerLiteScan(options, terms);
  for (const match of matches) {
    const key = match?.id ?? match?.email ?? JSON.stringify(match);
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(match);
  }
  return results;
};

const compactPayload = (payload) => ({
  ok: true,
  mode: payload.helper.mode,
  generatedAt: payload.helper.generatedAt,
  source: payload.source,
  summary: payload.helper.summary,
  auth: payload.helper.auth,
  queryPlans: payload.helper.queryPlans.map((plan) => ({
    clueId: plan.clueId,
    person: plan.person,
    searchTerms: plan.searchTerms,
    primarySearch: plan.primarySearch,
    reason: plan.reason,
  })),
  evidenceSources: payload.helper.evidenceSources,
  safety: payload.helper.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const suppliedResults = await readSearchResults(options);
  let payload = await callHelper(options, {
    mailerLiteSearchResults: suppliedResults,
  });

  if (options.useMailerLiteCli) {
    try {
      const mailerLiteResults = await collectMailerLiteCliResults(options, payload.helper);
      payload = await callHelper(options, {
        mailerLiteSearchResults: mailerLiteResults,
      });
    } catch (error) {
      payload = await callHelper(options, {
        authBlocker: error instanceof Error ? error.message : 'mailerlite_cli_auth_blocked',
      });
    }
  }

  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (options.failOnAuthBlock && payload.helper.summary.authBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext mailerlite-evidence failed: ${sanitizeError(error.message)}`);
  process.exitCode = 1;
});
