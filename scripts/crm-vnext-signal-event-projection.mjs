#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmSignalEventProjection,
  buildCrmSignalEventProjectionFromLedger,
} from '../lib/crm/crm-vnext-signal-event-projection.js';

const usage = `Usage:
  node scripts/crm-vnext-signal-event-projection.mjs [options]

Project supplied event JSON:
  node scripts/crm-vnext-signal-event-projection.mjs --events-file <signal-events.json>

Project from local ledger:
  node scripts/crm-vnext-signal-event-projection.mjs --from-ledger

Options:
  --events-file <path>      JSON with {events:[...]} or a JSON array of stored signal events
  --from-ledger             Read .crm-vnext/signal-events/ledger.jsonl
  --ledger-path <path>      Local signal event ledger path override
  --limit <n>               Ledger events to inspect. Default 5000, max 10000
  --include-restricted      Include restricted events in projection. Default false
  --out <path>              Write projection JSON to a local file
  --fail-on-empty           Exit non-zero when no engagement signals are produced
  --help                    Show this help

This command is read-only. It projects canonical CRM vNext signal events into engagement-signal-preview
input. It never mutates cards, writes Fact Store, changes scores, calls live APIs, sends outbound, or reads credentials.`;

const parseArgs = (argv) => {
  const options = {
    eventsFile: null,
    fromLedger: false,
    ledgerPath: null,
    limit: 5000,
    includeRestricted: false,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--from-ledger') options.fromLedger = true;
    else if (arg === '--include-restricted') options.includeRestricted = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--events-file') options.eventsFile = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--limit') {
      const parsed = Number.parseInt(argv[++index], 10);
      options.limit = Number.isFinite(parsed) && parsed >= 0 ? Math.min(parsed, 10000) : 5000;
    } else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.eventsFile && !options.fromLedger) {
    throw new Error('events_file_or_from_ledger_required');
  }
  if (options.eventsFile && options.fromLedger) throw new Error('choose_events_file_or_from_ledger');
  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const eventsFromPayload = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === 'object' && Array.isArray(payload.events)) return payload.events;
  throw new Error('events_file_must_be_array_or_object_with_events');
};

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const compactReport = (report) => ({
  ok: true,
  mode: report.mode,
  schemaVersion: report.schemaVersion,
  generatedAt: report.generatedAt,
  source: report.source,
  summary: report.summary,
  signals: report.signals,
  skippedEvents: report.skippedEvents,
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = options.fromLedger
    ? await buildCrmSignalEventProjectionFromLedger({
      ledgerPath: options.ledgerPath,
      limit: options.limit,
      includeRestricted: options.includeRestricted,
    })
    : buildCrmSignalEventProjection({
      events: eventsFromPayload(await readJson(options.eventsFile)),
      includeRestricted: options.includeRestricted,
    });

  const compact = compactReport(report);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, compact);
  if (options.failOnEmpty && report.summary.signalsGenerated === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext signal-event-projection failed: ${error.message}`);
  process.exitCode = 1;
});
