#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextDailyOperatorHandoff,
} from '../lib/crm/crm-vnext-daily-operator-handoff';
import {
  formatCrmVNextDailyOperatorHandoffMarkdown,
} from '../lib/crm/crm-vnext-daily-operator-handoff-markdown';

const usage = `Usage:
  node scripts/crm-vnext-daily-operator-handoff.mjs [options]

Options:
  --ledger-path <path>             Optional engagement snapshot ledger path
  --card-store-path <path>         Optional local vNext card store path
  --legacy-path <path>             Optional legacy person-card path
  --previous-snapshot-path <path>  Optional community queue snapshot
  --fact-store-path <path>         Optional local Fact Store JSONL path
  --context-fact-ledger-path <path>
                                  Optional context-fact apply ledger JSONL path
  --focus-queue-limit <n>          Focus queues to include in daily brief. Default 3
  --people-per-queue <n>           People per focus queue. Default 3
  --resolution-limit <n>           Engagement resolution questions to inspect. Default 5
  --queue-limit <n>                Movement queue rows to inspect first. Default 40
  --snapshot-limit <n>             Snapshot records to read. Default 5
  --movement-limit <n>             Movement records to read. Default 100
  --include-observation-only       Include keep-observing rows in resolution loop
  --skip-resolution-loop           Do not include engagement resolution-loop context
  --out <path>                     Write JSON handoff locally
  --markdown-out <path>            Write Markdown handoff locally
  --fail-on-notify                 Exit 2 if the handoff urgency is notify
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
    previousSnapshotPath: null,
    factStorePath: null,
    contextFactLedgerPath: null,
    focusQueueLimit: 3,
    peoplePerQueue: 3,
    resolutionLimit: 5,
    queueLimit: 40,
    snapshotLimit: 5,
    movementLimit: 100,
    includeObservationOnly: false,
    includeResolutionLoop: true,
    out: null,
    markdownOut: null,
    failOnNotify: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-observation-only') options.includeObservationOnly = true;
    else if (arg === '--skip-resolution-loop') options.includeResolutionLoop = false;
    else if (arg === '--fail-on-notify') options.failOnNotify = true;
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--previous-snapshot-path') options.previousSnapshotPath = argv[++index];
    else if (arg === '--fact-store-path') options.factStorePath = argv[++index];
    else if (arg === '--context-fact-ledger-path') options.contextFactLedgerPath = argv[++index];
    else if (arg === '--focus-queue-limit') options.focusQueueLimit = cleanInt(argv[++index], 3, 5);
    else if (arg === '--people-per-queue') options.peoplePerQueue = cleanInt(argv[++index], 3, 10);
    else if (arg === '--resolution-limit') options.resolutionLimit = cleanInt(argv[++index], 5, 10);
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

  const handoff = await buildCrmVNextDailyOperatorHandoff(options);
  const markdown = formatCrmVNextDailyOperatorHandoffMarkdown(handoff);
  const writes = {
    jsonPath: null,
    markdownPath: null,
  };

  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(handoff, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, `${markdown.trimEnd()}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: handoff.schemaVersion,
    mode: handoff.mode,
    generatedAt: handoff.generatedAt,
    summary: handoff.summary,
    source: handoff.source,
    taskIds: handoff.tasks.map((task) => task.taskId),
    writes,
    markdownPreview: markdown.split('\n').slice(0, 18),
  }, null, 2));

  if (handoff.summary.urgency === 'notify' && options.failOnNotify) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext daily operator handoff failed: ${error.message}`);
  process.exitCode = 1;
});
