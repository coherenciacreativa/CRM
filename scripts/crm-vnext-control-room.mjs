#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextControlRoom,
} from '../lib/crm/crm-vnext-control-room';
import {
  formatCrmVNextControlRoomMarkdown,
} from '../lib/crm/crm-vnext-control-room-markdown';

const usage = `Usage:
  node scripts/crm-vnext-control-room.mjs [options]

Options:
  --reports-dir <path>             Local Mantis reports directory. Defaults to ~/Documents/Mantis-Reports
  --card-store-path <path>         Optional local vNext card store path
  --legacy-path <path>             Optional legacy person-card path
  --ledger-path <path>             Optional engagement snapshot ledger path
  --fact-store-path <path>         Optional local Fact Store JSONL path
  --context-fact-ledger-path <path>
                                  Optional context-fact apply ledger JSONL path
  --signal-since-days <n>          Signal packet inbox scan window. Default 14
  --signal-limit <n>               Signal packet inbox file limit. Default 120
  --resolution-limit <n>           Engagement resolution questions to inspect. Default 5
  --skip-resolution-loop           Do not include engagement resolution-loop context
  --out <path>                     Write JSON control-room report locally
  --markdown-out <path>            Write Markdown control-room report locally
  --fail-on-action                 Exit 2 unless state is observe
  --help                           Show this help

Read-only/local. No live APIs, no CRM card writes, no Fact Store writes, no score mutation, no credential reads, no outbound.`;

const cleanInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseArgs = (argv) => {
  const options = {
    reportsDir: null,
    cardStorePath: null,
    legacyPath: null,
    ledgerPath: null,
    factStorePath: null,
    contextFactLedgerPath: null,
    signalSinceDays: 14,
    signalLimit: 120,
    resolutionLimit: 5,
    includeResolutionLoop: true,
    out: null,
    markdownOut: null,
    failOnAction: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--skip-resolution-loop') options.includeResolutionLoop = false;
    else if (arg === '--fail-on-action') options.failOnAction = true;
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--fact-store-path') options.factStorePath = argv[++index];
    else if (arg === '--context-fact-ledger-path') options.contextFactLedgerPath = argv[++index];
    else if (arg === '--signal-since-days') options.signalSinceDays = cleanInt(argv[++index], 14, 60);
    else if (arg === '--signal-limit') options.signalLimit = cleanInt(argv[++index], 120, 500);
    else if (arg === '--resolution-limit') options.resolutionLimit = cleanInt(argv[++index], 5, 10);
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

  const report = await buildCrmVNextControlRoom(options);
  const markdown = formatCrmVNextControlRoomMarkdown(report);
  const writes = {
    jsonPath: null,
    markdownPath: null,
  };

  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, `${markdown.trimEnd()}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: report.schemaVersion,
    mode: report.mode,
    generatedAt: report.generatedAt,
    state: report.state,
    summary: report.summary,
    writes,
    markdownPreview: markdown.split('\n').slice(0, 24),
  }, null, 2));

  if (options.failOnAction && report.state !== 'observe') {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext control-room failed: ${error.message}`);
  process.exitCode = 1;
});
