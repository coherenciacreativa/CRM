#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { promisify } from 'node:util';
import { resolve } from 'node:path';

const execFileAsync = promisify(execFile);
const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/gmail-evidence-helper';

const usage = `Usage:
  node scripts/crm-vnext-gmail-evidence.mjs --text <text> [options]
  node scripts/crm-vnext-gmail-evidence.mjs --text-file <path> [options]

Options:
  --api-url <url>             Gmail evidence helper API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>               CRM facts/report text to build Gmail evidence for
  --text-file <path>          Local text file with CRM facts/report text
  --source-kind <kind>        alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>           Reporter name, e.g. Alejandro or Juana
  --channel <channel>         Channel name, e.g. codex
  --search-results-file <path>
                              JSON Gmail search results from a connector/export
  --use-gog                   Run read-only local gog gmail searches for planned queries
  --gog-bin <path>            gog binary. Defaults to gog
  --account <email>           Gmail account for gog
  --limit <n>                 Max results per gog query. Defaults to 5
  --fail-on-auth-block        Exit non-zero when gog auth is blocked
  --help                      Show this help

This command is read-only. It can plan Gmail queries, convert supplied Gmail results into evidenceSources, or call gog read-only search. It never sends email, mutates Gmail, mutates CRM cards, or writes Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    searchResultsFile: null,
    useGog: false,
    gogBin: 'gog',
    account: null,
    limit: 5,
    failOnAuthBlock: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--use-gog') options.useGog = true;
    else if (arg === '--fail-on-auth-block') options.failOnAuthBlock = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--search-results-file') options.searchResultsFile = argv[++index];
    else if (arg === '--gog-bin') options.gogBin = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--limit') options.limit = Number.parseInt(argv[++index], 10);
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  options.limit = Number.isFinite(options.limit) && options.limit > 0 ? Math.min(25, options.limit) : 5;
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
  if (!text) throw new Error('gmail_evidence_text_required');

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
  if (!response.ok) throw new Error(`gmail_evidence_helper_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`gmail_evidence_helper_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const runGogQuery = async (options, query) => {
  const args = ['gmail', 'search', query, '--json', '--no-input'];
  if (options.account) args.push('--account', options.account);
  try {
    const { stdout } = await execFileAsync(options.gogBin, args, {
      timeout: 45_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) return parsed.slice(0, options.limit);
    if (Array.isArray(parsed?.emails)) return parsed.emails.slice(0, options.limit);
    if (Array.isArray(parsed?.threads)) return parsed.threads.slice(0, options.limit);
    if (Array.isArray(parsed?.messages)) return parsed.messages.slice(0, options.limit);
    if (Array.isArray(parsed?.results)) return parsed.results.slice(0, options.limit);
    return [];
  } catch (error) {
    const stderr = error?.stderr ? String(error.stderr) : '';
    const message = stderr || (error instanceof Error ? error.message : 'gog_gmail_search_failed');
    throw new Error(message.trim());
  }
};

const collectGogResults = async (options, helper) => {
  const results = [];
  const usedQueries = [];
  for (const plan of helper.queryPlans) {
    const query = plan.primaryQuery;
    if (!query || usedQueries.includes(query)) continue;
    usedQueries.push(query);
    const queryResults = await runGogQuery(options, query);
    results.push(...queryResults);
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
    primaryQuery: plan.primaryQuery,
    contextualQueries: plan.contextualQueries,
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
    gmailSearchResults: suppliedResults,
  });

  if (options.useGog) {
    try {
      const gogResults = await collectGogResults(options, payload.helper);
      payload = await callHelper(options, {
        gmailSearchResults: gogResults,
      });
    } catch (error) {
      payload = await callHelper(options, {
        authBlocker: error instanceof Error ? error.message : 'gog_gmail_auth_blocked',
      });
    }
  }

  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (options.failOnAuthBlock && payload.helper.summary.authBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext gmail-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
