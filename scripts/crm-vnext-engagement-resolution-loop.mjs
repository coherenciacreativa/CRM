#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextEngagementResolutionLoop,
} from '../lib/crm/crm-vnext-engagement-resolution-loop';
import {
  formatCrmVNextEngagementResolutionLoopMarkdown,
} from '../lib/crm/crm-vnext-engagement-resolution-loop-markdown';

const usage = `Usage:
  node scripts/crm-vnext-engagement-resolution-loop.mjs [options]

Options:
  --ledger-path <path>             Optional engagement snapshot ledger path
  --card-store-path <path>         Optional local vNext card store path
  --legacy-path <path>             Optional legacy person-card path
  --fact-store-path <path>         Optional local Fact Store JSONL path
  --context-fact-ledger-path <path>
                                  Optional context-fact apply ledger JSONL path
  --limit <n>                      Questions to include. Default 5, max 10
  --queue-limit <n>                Movement queue rows to inspect first. Default 40
  --snapshot-limit <n>             Snapshot records to read. Default 5
  --movement-limit <n>             Movement records to read. Default 100
  --include-observation-only       Include keep-observing rows in the upstream brief
  --include-context-covered-questions
                                  Include already-covered contacts as answer prompts anyway
  --out <path>                     Write JSON packet locally
  --markdown-out <path>            Write answer-ready Markdown locally
  --fail-on-empty                  Exit 2 if no questions are produced
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
    factStorePath: null,
    contextFactLedgerPath: null,
    limit: 5,
    queueLimit: 40,
    snapshotLimit: 5,
    movementLimit: 100,
    includeObservationOnly: false,
    includeContextCoveredQuestions: false,
    out: null,
    markdownOut: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-observation-only') options.includeObservationOnly = true;
    else if (arg === '--include-context-covered-questions') options.includeContextCoveredQuestions = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--fact-store-path') options.factStorePath = argv[++index];
    else if (arg === '--context-fact-ledger-path') options.contextFactLedgerPath = argv[++index];
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

  const packet = await buildCrmVNextEngagementResolutionLoop(options);
  const markdown = formatCrmVNextEngagementResolutionLoopMarkdown(packet);
  const writes = {
    jsonPath: null,
    markdownPath: null,
  };

  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(packet, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, `${markdown.trimEnd()}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: packet.schemaVersion,
    mode: packet.mode,
    generatedAt: packet.generatedAt,
    summary: packet.summary,
    source: packet.source,
    writes,
    nextCommands: packet.resolutionPlan.nextCommands,
    markdownPreview: markdown.split('\n').slice(0, 18),
  }, null, 2));

  if (packet.summary.questions === 0 && options.failOnEmpty) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext engagement resolution loop failed: ${error.message}`);
  process.exitCode = 1;
});
