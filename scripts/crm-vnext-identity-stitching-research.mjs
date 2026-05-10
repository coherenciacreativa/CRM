#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/identity-stitching-research';

const usage = `Usage:
  node scripts/crm-vnext-identity-stitching-research.mjs --text <text> [options]
  node scripts/crm-vnext-identity-stitching-research.mjs --text-file <path> [options]

Options:
  --api-url <url>          Identity stitching research API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to research
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. telegram
  --fail-on-decision       Exit non-zero when any clue requires human decision
  --help                   Show this help

This command is read-only. It never mutates person cards, never writes Fact Store, and never calls live MailerLite/Instagram/ManyChat/WhatsApp/Telegram APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    failOnDecision: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-decision') options.failOnDecision = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
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

const runResearch = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('identity_stitching_text_required');

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
    }),
  });
  if (!response.ok) throw new Error(`identity_stitching_research_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`identity_stitching_research_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactClue = (clue) => ({
  clueId: clue.clueId,
  person: clue.person,
  factTypes: clue.factTypes,
  stableIdentityPresent: clue.stableIdentityPresent,
  recommendation: clue.recommendation,
  privacySignals: clue.privacySignals.map((signal) => signal.code),
  relationshipSignals: clue.relationshipSignals.map((signal) => signal.code),
  candidates: clue.candidates.map((candidate) => ({
    source: candidate.source,
    personId: candidate.personId,
    displayName: candidate.displayName,
    identities: candidate.identities,
    score: candidate.score,
    confidence: candidate.confidence,
    matchReasons: candidate.matchReasons,
    evidence: candidate.evidence,
    sourceStatus: candidate.sourceStatus,
  })),
});

const compactResearch = (research, source) => ({
  ok: true,
  mode: research.mode,
  generatedAt: research.generatedAt,
  source,
  sourceCoverage: research.sourceCoverage,
  summary: research.summary,
  draft: {
    summary: research.draft.summary,
    ambiguities: research.draft.ambiguities,
  },
  clues: research.clues.map(compactClue),
  safety: research.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runResearch(options);
  console.log(JSON.stringify(compactResearch(payload.research, payload.source), null, 2));

  if (
    options.failOnDecision
    && payload.research.clues.some((clue) => clue.recommendation.requiresHumanDecision)
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext identity-stitching-research failed: ${error.message}`);
  process.exitCode = 1;
});
