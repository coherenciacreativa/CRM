#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/engagement-signal-preview';

const usage = `Usage:
  node scripts/crm-vnext-engagement-signal-preview.mjs --signals-file <path> [options]

Options:
  --api-url <url>          Engagement signal preview API URL. Defaults to ${DEFAULT_API_URL}
  --signals-file <path>    JSON array or object with { "signals": [...] }
  --card-store-path <path> Local vNext card store path override
  --source-path <path>     Legacy Person Cards V1 source path override
  --prefer-store <0|1>     Prefer local vNext card store when available. Defaults to 1
  --out <path>             Write compact preview report to a local JSON file
  --fail-on-unmatched      Exit non-zero when any supplied signal is unmatched
  --help                   Show this help

This command is read-only. It previews how supplied MailerLite/Gmail/Instagram engagement signals would affect CRM scores. It never mutates cards, writes Fact Store, sends outbound, calls live APIs, or touches credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    signalsFile: null,
    cardStorePath: null,
    sourcePath: null,
    preferStore: null,
    out: null,
    failOnUnmatched: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-unmatched') options.failOnUnmatched = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--signals-file') options.signalsFile = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--source-path') options.sourcePath = argv[++index];
    else if (arg === '--prefer-store') options.preferStore = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
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

const readSignals = async (options) => {
  if (!options.signalsFile) throw new Error('signals_file_required');
  const raw = await readFile(resolve(options.signalsFile), 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.signals)) return parsed.signals;
  throw new Error('signals_file_must_be_array_or_object_with_signals');
};

const compactPreviewItem = (item) => ({
  previewItemId: item.previewItemId,
  personId: item.personId,
  displayName: item.displayName,
  match: item.match,
  before: item.before,
  after: item.after,
  delta: item.delta,
  movement: item.movement,
  newReasonCodes: item.newReasonCodes,
  newRiskCodes: item.newRiskCodes,
  recommendedQueue: item.recommendedQueue,
  aggregatedSignals: item.aggregatedSignals,
  operationsExecuted: item.operationsExecuted,
  safeNextStep: item.safeNextStep,
});

const compactPayload = (payload) => ({
  ok: payload.ok,
  source: payload.source,
  liveSources: payload.liveSources,
  mode: payload.preview?.mode,
  generatedAt: payload.preview?.generatedAt,
  summary: payload.preview?.summary,
  previewItems: payload.preview?.previewItems?.map(compactPreviewItem) ?? [],
  unmatchedSignals: payload.preview?.unmatchedSignals ?? [],
  safety: payload.preview?.safety,
});

const buildApiUrl = (options) => {
  const url = new URL(options.apiUrl);
  if (options.cardStorePath) url.searchParams.set('cardStorePath', resolve(options.cardStorePath));
  if (options.sourcePath) url.searchParams.set('sourcePath', resolve(options.sourcePath));
  if (options.preferStore === '0' || options.preferStore === '1') url.searchParams.set('preferStore', options.preferStore);
  return url;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const signals = await readSignals(options);
  const response = await fetch(buildApiUrl(options), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ signals }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    console.log(JSON.stringify(compactPayload(payload), null, 2));
    throw new Error(payload.error ?? `engagement_signal_preview_api_failed:${response.status}`);
  }

  const compact = compactPayload(payload);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) await writeFile(resolve(options.out), `${serialized}\n`, 'utf8');
  if (options.failOnUnmatched && payload.preview.summary.unmatchedSignals > 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext engagement-signal-preview failed: ${error.message}`);
  process.exitCode = 1;
});
