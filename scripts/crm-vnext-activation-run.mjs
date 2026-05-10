#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/activation-run';

const usage = `Usage:
  node scripts/crm-vnext-activation-run.mjs --text <text> [options]
  node scripts/crm-vnext-activation-run.mjs --text-file <path> [options]

Options:
  --api-url <url>          Activation API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to activate
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. telegram
  --approved-by <name>     Required with --write
  --write                  Commit approved facts to the local Fact Store
  --fail-on-blocked        Exit non-zero when identity/business review or unmatched facts exist
  --help                   Show this help

This command never mutates person cards and never sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    approvedBy: null,
    write: false,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
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

const runActivation = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('activation_text_required');
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      commit: options.write,
      approvedBy: options.approvedBy,
    }),
  });
  if (!response.ok) throw new Error(`activation_run_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`activation_run_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactActivation = (activation, source) => ({
  ok: true,
  mode: activation.mode,
  committed: activation.committed,
  generatedAt: activation.generatedAt,
  source,
  summary: activation.summary,
  draft: {
    summary: activation.draft.summary,
    ambiguities: activation.draft.ambiguities,
  },
  addedFacts: activation.storeAppend.added.map((stored) => ({
    storedFactId: stored.storedFactId,
    factId: stored.factId,
    type: stored.fact.type,
    person: stored.fact.person,
    cardApply: stored.cardApply,
  })),
  identityReview: activation.identityReview.summary,
  cardDiff: activation.cardDiff.summary,
  nextSteps: activation.nextSteps,
  safety: activation.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runActivation(options);
  console.log(JSON.stringify(compactActivation(payload.activation, payload.source), null, 2));

  if (options.failOnBlocked && payload.activation.summary.blockedFacts > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext activation-run failed: ${error.message}`);
  process.exitCode = 1;
});
