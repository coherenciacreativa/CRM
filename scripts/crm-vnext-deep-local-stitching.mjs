#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/deep-local-stitching';

const usage = `Usage:
  node scripts/crm-vnext-deep-local-stitching.mjs --text <text> [options]
  node scripts/crm-vnext-deep-local-stitching.mjs --text-file <path> [options]

Options:
  --api-url <url>          Deep local stitching API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to research
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. telegram
  --include-expanded-sources
                          Also search read-only local CSVs, retreat tables, downloads, and contact exports
  --evidence-file <path>   JSON file with connected evidenceSources from Gmail/contact searches
  --fail-on-deferred       Exit non-zero when new-card creation is deferred by local evidence
  --help                   Show this help

This command is read-only. It searches configured local evidence sources and can ingest supplied evidence packets. It never mutates cards, never writes Fact Store, and never calls live APIs or outbound channels.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    includeExpandedSources: false,
    evidenceFile: null,
    failOnDeferred: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-deferred') options.failOnDeferred = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
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

const readEvidenceSources = async (options) => {
  if (!options.evidenceFile) return [];
  const raw = await readFile(resolve(options.evidenceFile), 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) {
    return parsed.evidenceSources;
  }
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const runStitching = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('deep_local_stitching_text_required');
  const evidenceSources = await readEvidenceSources(options);

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
      evidenceSources,
    }),
  });
  if (!response.ok) throw new Error(`deep_local_stitching_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`deep_local_stitching_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactClue = (clue) => ({
  clueId: clue.clueId,
  person: clue.person,
  identityResearchRecommendation: clue.identityResearchRecommendation,
  identitySummary: clue.identitySummary,
  recommendation: clue.recommendation,
  hits: clue.hits.map((hit) => ({
    sourceId: hit.sourceId,
    sourceKind: hit.sourceKind,
    lineNumber: hit.lineNumber,
    score: hit.score,
    confidence: hit.confidence,
    matchedIdentityTerms: hit.matchedIdentityTerms,
    contextSignals: hit.contextSignals,
    identitySignals: hit.identitySignals,
    snippet: hit.snippet,
  })),
});

const compactReport = (stitching, source) => ({
  ok: true,
  mode: stitching.mode,
  generatedAt: stitching.generatedAt,
  source,
  sourceCoverage: stitching.sourceCoverage,
  summary: stitching.summary,
  clues: stitching.clues.map(compactClue),
  safety: stitching.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runStitching(options);
  console.log(JSON.stringify(compactReport(payload.stitching, payload.source), null, 2));

  if (
    options.failOnDeferred
    && payload.stitching.summary.newCardCreationsDeferred > 0
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext deep-local-stitching failed: ${error.message}`);
  process.exitCode = 1;
});
