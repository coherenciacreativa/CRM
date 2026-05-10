#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/lead-capture-evidence-helper';

const usage = `Usage:
  node scripts/crm-vnext-lead-capture-evidence.mjs --text <text> [options]
  node scripts/crm-vnext-lead-capture-evidence.mjs --text-file <path> [options]

Options:
  --api-url <url>             Lead-capture evidence helper API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>               CRM facts/report text to build lead-capture evidence for
  --text-file <path>          Local text file with CRM facts/report text
  --source-kind <kind>        alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>           Reporter name, e.g. Alejandro or Juana
  --channel <channel>         Channel name, e.g. codex
  --search-results-file <path>
                              JSON ManyChat/webhook/Vercel/proxy/WhatsApp/MailerLite capture results from a read-only export
  --fail-on-auth-block        Exit non-zero when a read-only connector/export is blocked
  --help                      Show this help

This command is read-only. It plans ManyChat/CRM webhook/Vercel/WhatsApp/MailerLite lead-capture searches and converts supplied rows/results into lead_capture_export evidenceSources. It never edits ManyChat LIVE, calls Instagram, mutates MailerLite, mutates CRM cards, writes Fact Store, sends outbound messages, or reads credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    searchResultsFile: null,
    failOnAuthBlock: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-auth-block') options.failOnAuthBlock = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--search-results-file') options.searchResultsFile = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
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
  const parsed = JSON.parse(raw);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed) && Array.isArray(parsed.leadCaptureSearchResults)) {
    return parsed.leadCaptureSearchResults;
  }
  return parsed;
};

const callHelper = async (options, extraBody = {}) => {
  const text = await readText(options);
  if (!text) throw new Error('lead_capture_evidence_text_required');

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
  if (!response.ok) throw new Error(`lead_capture_evidence_helper_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`lead_capture_evidence_helper_api_error:${payload.error ?? 'unknown'}`);
  return payload;
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
    suggestedSources: plan.suggestedSources,
    reason: plan.reason,
  })),
  evidenceSources: payload.helper.evidenceSources,
  reviewSignals: payload.helper.reviewSignals,
  safety: payload.helper.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const suppliedResults = await readSearchResults(options);
  const payload = await callHelper(options, {
    leadCaptureSearchResults: suppliedResults,
  });

  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (options.failOnAuthBlock && payload.helper.summary.authBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext lead-capture-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
