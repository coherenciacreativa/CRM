#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  appendCrmSignalEventLedger,
  buildCrmSignalEventLedgerInput,
  readCrmSignalEventLedger,
} from '../lib/crm/crm-vnext-signal-event-ledger.js';

const usage = `Usage:
  node scripts/crm-vnext-signal-event-ledger.mjs [options]

List mode:
  node scripts/crm-vnext-signal-event-ledger.mjs

Normalize supplied events without writing:
  node scripts/crm-vnext-signal-event-ledger.mjs --events-file <signals-or-events.json>

Append approved events:
  node scripts/crm-vnext-signal-event-ledger.mjs --events-file <signals-or-events.json> --write --approved-by <name>

Options:
  --events-file <path>  JSON with {events:[...]}, {signals:[...]}, or a JSON array
  --ledger-path <path>  Local signal event ledger path override
  --limit <n>           Events to return in list mode. Default 50, max 500
  --source-label <text> Optional human label for this source/batch
  --collector <text>    Optional collector label, e.g. Mantis or Codex
  --approved-by <name>  Required with --write
  --write               Commit to the local append-only ledger
  --out <path>          Write compact result JSON to a local file
  --fail-on-empty       Exit non-zero when no events are normalized
  --help                Show this help

This command is local-only. It normalizes read-only source observations into a canonical CRM vNext
signal event ledger. It never mutates person cards, writes Fact Store, changes scores, sends outbound
messages, calls live APIs, or reads credentials.`;

const parseArgs = (argv) => {
  const options = {
    eventsFile: null,
    ledgerPath: null,
    limit: 50,
    sourceLabel: null,
    collector: null,
    approvedBy: null,
    write: false,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--events-file') options.eventsFile = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 500) : 50;
    } else if (arg === '--source-label') options.sourceLabel = argv[++index];
    else if (arg === '--collector') options.collector = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');
  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const compactEvent = (event) => ({
  eventId: event.eventId,
  observedAt: event.observedAt,
  capturedAt: event.capturedAt,
  source: event.source,
  subject: event.subject,
  event: event.event,
  evidence: event.evidence,
  sensitivity: event.sensitivity,
  safety: event.safety,
});

const compactNormalize = (report) => ({
  ok: true,
  mode: report.mode,
  schemaVersion: report.schemaVersion,
  generatedAt: report.generatedAt,
  summary: report.summary,
  events: report.events.map(compactEvent),
  skippedRecords: report.skippedRecords,
  safety: report.safety,
});

const compactRead = (ledger) => ({
  ok: true,
  mode: ledger.mode,
  schemaVersion: ledger.schemaVersion,
  generatedAt: ledger.generatedAt,
  summary: ledger.summary,
  events: ledger.events.map(compactEvent),
  invalidRows: ledger.invalidRows,
  safety: ledger.safety,
});

const compactAppend = (result) => ({
  ok: true,
  mode: result.mode,
  schemaVersion: result.schemaVersion,
  generatedAt: result.generatedAt,
  committed: result.committed,
  incoming: result.incoming,
  normalized: result.normalized,
  added: result.added.map(compactEvent),
  duplicatesSkipped: result.duplicatesSkipped.map((event) => event.eventId),
  skippedRecords: result.skippedRecords,
  summaryAfter: result.summaryAfter,
  safety: result.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = options.eventsFile
    ? options.write
      ? compactAppend(await appendCrmSignalEventLedger({
        payload: await readJson(options.eventsFile),
        approvedBy: options.approvedBy,
        commit: true,
        ledgerPath: options.ledgerPath,
        sourceLabel: options.sourceLabel,
        collector: options.collector,
      }))
      : compactNormalize(buildCrmSignalEventLedgerInput(await readJson(options.eventsFile), {
        sourceLabel: options.sourceLabel,
        collector: options.collector,
      }))
    : compactRead(await readCrmSignalEventLedger(options.ledgerPath, { limit: options.limit }));

  const serialized = JSON.stringify(payload, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, payload);
  if (options.failOnEmpty) {
    const count = options.eventsFile ? (payload.summary?.eventsGenerated ?? payload.normalized ?? 0) : payload.summary?.events ?? 0;
    if (count === 0) process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext signal-event-ledger failed: ${error.message}`);
  process.exitCode = 1;
});
