#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextEngagementDecisionBrief,
} from '../lib/crm/crm-vnext-engagement-decision-brief';
import {
  formatCrmVNextEngagementDecisionBriefMarkdown,
} from '../lib/crm/crm-vnext-engagement-decision-brief-markdown';

const usage = `Usage:
  node scripts/crm-vnext-engagement-decision-brief.mjs [options]

Options:
  --ledger-path <path>             Optional engagement snapshot ledger path
  --card-store-path <path>         Optional local vNext card store path
  --legacy-path <path>             Optional legacy person-card path
  --limit <n>                      Candidates to include. Default 5, max 10
  --queue-limit <n>                Movement queue rows to inspect first. Default 40, max 100
  --snapshot-limit <n>             Snapshot records to read. Default 5
  --movement-limit <n>             Movement records to read. Default 100
  --include-observation-only       Include keep-observing rows
  --out <path>                     Write JSON payload locally
  --markdown-out <path>            Write Markdown payload locally
  --fail-on-decision               Exit 2 when the brief needs Alejandro decision
  --help                           Show this help

Read-only/local. No live APIs, no CRM card writes, no Fact Store writes, no score mutation, no outbound.`;

const cleanInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseArgs = (argv) => {
  const options = {
    ledgerPath: null,
    cardStorePath: null,
    legacyPath: null,
    limit: 5,
    queueLimit: 40,
    snapshotLimit: 5,
    movementLimit: 100,
    includeObservationOnly: false,
    out: null,
    markdownOut: null,
    failOnDecision: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-observation-only') options.includeObservationOnly = true;
    else if (arg === '--fail-on-decision') options.failOnDecision = true;
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--limit') options.limit = cleanInt(argv[++index], 5, 10);
    else if (arg === '--queue-limit') options.queueLimit = cleanInt(argv[++index], 40, 100);
    else if (arg === '--snapshot-limit') options.snapshotLimit = cleanInt(argv[++index], 5, 25);
    else if (arg === '--movement-limit') options.movementLimit = cleanInt(argv[++index], 100, 250);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const writeTextFile = async (filePath, text) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text, 'utf8');
  return absolutePath;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const brief = await buildCrmVNextEngagementDecisionBrief(options);
  const markdown = formatCrmVNextEngagementDecisionBriefMarkdown(brief);
  const writes = {
    jsonPath: null,
    markdownPath: null,
  };

  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(brief, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, `${markdown.trimEnd()}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: brief.schemaVersion,
    mode: brief.mode,
    generatedAt: brief.generatedAt,
    summary: brief.summary,
    source: brief.source,
    writes,
    markdownPreview: markdown.split('\n').slice(0, 18),
  }, null, 2));

  if (brief.summary.requiresAlejandroDecision && options.failOnDecision) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext engagement decision brief failed: ${error.message}`);
  process.exitCode = 1;
});

