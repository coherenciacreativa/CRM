#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextEngagementMovementQueue,
  labelCrmVNextEngagementMovementCode,
} from '../lib/crm/crm-vnext-engagement-movement-queue';

const usage = `Usage:
  node scripts/crm-vnext-engagement-movement-queue.mjs [options]

Options:
  --ledger-path <path>       Local engagement snapshot ledger path override
  --card-store-path <path>   Local vNext card-store path override
  --legacy-path <path>       Legacy person-cards-v1 path override
  --limit <n>                Movement rows to return. Default 25, max 100
  --snapshot-limit <n>       Snapshots to inspect. Default 5, max 25
  --movement-limit <n>       Raw movement rows to inspect. Default 100, max 250
  --include-unchanged        Include rows whose latest priority delta is 0
  --out <path>               Write JSON report
  --markdown-out <path>      Write Markdown report
  --fail-on-review           Exit 2 when review rows or unmatched rows exist
  --help                     Show this help

This command is local/read-only. It reads the engagement snapshot ledger and person-card store,
then returns an operator queue. It never mutates cards, writes Fact Store, calls live APIs,
reads credentials, or sends outbound messages.`;

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
    limit: 25,
    snapshotLimit: 5,
    movementLimit: 100,
    includeUnchanged: false,
    out: null,
    markdownOut: null,
    failOnReview: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-unchanged') options.includeUnchanged = true;
    else if (arg === '--fail-on-review') options.failOnReview = true;
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--limit') options.limit = cleanInt(argv[++index], 25, 100);
    else if (arg === '--snapshot-limit') options.snapshotLimit = cleanInt(argv[++index], 5, 25);
    else if (arg === '--movement-limit') options.movementLimit = cleanInt(argv[++index], 100, 250);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const signed = (value) => value > 0 ? `+${value}` : String(value);

const formatMarkdown = (queue) => {
  const lines = [
    '# CRM vNext Engagement Movement Queue',
    '',
    `Generated: ${queue.generatedAt}`,
    `Mode: ${queue.mode}`,
    '',
    '## Summary',
    '',
    `- Snapshots: ${queue.source.snapshots}`,
    `- Total signals in history: ${queue.source.totalSignals}`,
    `- Rows: ${queue.summary.rows}`,
    `- Warmed rows: ${queue.summary.warmedRows}`,
    `- Cooled rows: ${queue.summary.cooledRows}`,
    `- Review rows: ${queue.summary.reviewRows}`,
    `- Unmatched rows: ${queue.summary.unmatchedRows}`,
    '',
    '## Movement Rows',
    '',
  ];

  if (!queue.rows.length) {
    lines.push('- No movement rows.');
  } else {
    for (const row of queue.rows) {
      lines.push(`- ${row.displayName || row.personId}: ${signed(row.delta.priorityScore)} priority (${row.before.priorityScore} -> ${row.after.priorityScore}); ${row.operatorAction.label}; ${labelCrmVNextEngagementMovementCode(row.sourceFamily)}; ${row.signals.email.label}`);
    }
  }

  if (queue.unmatchedRows.length) {
    lines.push('', '## Unmatched Signals', '');
    for (const row of queue.unmatchedRows) {
      lines.push(`- ${row.email || row.instagramHandle || row.phone || row.sourceKind}: ${row.safeNextStep}`);
    }
  }

  lines.push('', '## Safety', '');
  lines.push('- Read-only local queue.');
  lines.push('- No CRM card writes, no Fact Store writes, no live APIs, no outbound.');
  lines.push('- A warmed score is internal prioritization evidence, not permission to contact anyone.');

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const queue = await buildCrmVNextEngagementMovementQueue(options);
  console.log(JSON.stringify(queue, null, 2));

  if (options.out) await writeJson(options.out, queue);
  if (options.markdownOut) {
    const absolutePath = resolve(options.markdownOut);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, formatMarkdown(queue), 'utf8');
  }

  if (options.failOnReview && queue.summary.reviewRows > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext engagement-movement-queue failed: ${error.message}`);
  process.exitCode = 1;
});
