#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  appendCrmEngagementSnapshotLedger,
  readCrmEngagementSnapshotLedger,
} from '../lib/crm/crm-vnext-engagement-snapshot-ledger.js';

const usage = `Usage:
  node scripts/crm-vnext-engagement-snapshot-ledger.mjs [options]

List mode:
  node scripts/crm-vnext-engagement-snapshot-ledger.mjs

Append preview/write mode:
  node scripts/crm-vnext-engagement-snapshot-ledger.mjs --preview-file <preview.json> [--write --approved-by <name>]

Options:
  --preview-file <path>  JSON from crm:vnext:engagement-signal-preview
  --ledger-path <path>   Local engagement snapshot ledger path override
  --limit <n>            Snapshots to return in list mode. Default 10, max 100
  --movement-limit <n>   Recent movements to return. Default 12, max 100
  --source-kind <kind>   Optional source kind label. Default engagement_signal_preview
  --source-label <text>  Optional source label for humans
  --approved-by <name>   Required with --write
  --write                Commit snapshot to the local ledger
  --out <path>           Write compact result JSON to a local file
  --help                 Show this help

This command is local-only. It stores read-only engagement preview snapshots for history and dashboard display.
It never mutates person cards, writes Fact Store, sends outbound messages, calls live APIs, or reads credentials.`;

const parseArgs = (argv) => {
  const options = {
    previewFile: null,
    ledgerPath: null,
    limit: 10,
    movementLimit: 12,
    sourceKind: null,
    sourceLabel: null,
    approvedBy: null,
    write: false,
    out: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--preview-file') options.previewFile = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 100) : 10;
    } else if (arg === '--movement-limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.movementLimit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 100) : 12;
    } else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--source-label') options.sourceLabel = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const compactSnapshot = (snapshot) => ({
  snapshotRecordId: snapshot.snapshotRecordId,
  capturedAt: snapshot.capturedAt,
  approvedBy: snapshot.approvedBy,
  sourcePreviewGeneratedAt: snapshot.sourcePreviewGeneratedAt,
  sourceKind: snapshot.sourceKind,
  sourceLabel: snapshot.sourceLabel,
  previewSummary: snapshot.previewSummary,
  movements: snapshot.movements.map((movement) => ({
    personId: movement.personId,
    displayName: movement.displayName,
    movement: movement.movement,
    recommendedQueue: movement.recommendedQueue,
    before: movement.before,
    after: movement.after,
    delta: movement.delta,
    sourceKinds: movement.match.sourceKinds,
    email: movement.aggregatedSignals.email,
    instagram: movement.aggregatedSignals.instagram,
  })),
  unmatchedSignals: snapshot.unmatchedSignals,
  safety: snapshot.safety,
});

const compactRead = (ledger) => ({
  ok: true,
  mode: ledger.mode,
  generatedAt: ledger.generatedAt,
  summary: ledger.summary,
  snapshots: ledger.snapshots.map(compactSnapshot),
  latestMovements: ledger.latestMovements,
  invalidRows: ledger.invalidRows,
  safety: ledger.safety,
});

const compactAppend = (result) => ({
  ok: true,
  mode: result.mode,
  committed: result.committed,
  incoming: result.incoming,
  added: result.added.map(compactSnapshot),
  duplicatesSkipped: result.duplicatesSkipped.map((snapshot) => snapshot.snapshotRecordId),
  summaryAfter: result.summaryAfter,
  latestMovements: result.latestMovements,
  safety: result.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');

  const payload = options.previewFile
    ? compactAppend(await appendCrmEngagementSnapshotLedger({
      preview: await readJson(options.previewFile),
      approvedBy: options.approvedBy,
      commit: options.write,
      ledgerPath: options.ledgerPath,
      sourceKind: options.sourceKind,
      sourceLabel: options.sourceLabel,
    }))
    : compactRead(await readCrmEngagementSnapshotLedger(options.ledgerPath, {
      limit: options.limit,
      movementLimit: options.movementLimit,
    }));

  const serialized = JSON.stringify(payload, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, payload);
};

main().catch((error) => {
  console.error(`crm-vnext engagement-snapshot-ledger failed: ${error.message}`);
  process.exitCode = 1;
});
