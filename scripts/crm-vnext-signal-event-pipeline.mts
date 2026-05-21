#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextSignalEventPipeline,
  type CrmVNextSignalEventPipelineSource,
  type CrmVNextSignalEventPipelineSourceKind,
} from '../lib/crm/crm-vnext-signal-event-pipeline';

const usage = `Usage:
  node scripts/crm-vnext-signal-event-pipeline.mts [source options]

Sources:
  --mailerlite-snapshot-file <path>     JSON from Mantis/MailerLite engagement snapshot
  --gmail-reply-discovery-file <path>   JSON from Mantis Gmail reply intelligence discovery
  --signals-file <path>                 JSON array or {signals:[...]} engagement signals
  --events-file <path>                  JSON array or {events:[...]} canonical signal events

Options:
  --window-days <n>           Recent engagement window for source adapters. Default 30
  --source-label <text>       Human label for this source/batch
  --collector <text>          Collector label, e.g. Mantis or Codex
  --approved-by <name>        Required when --write-events or --write-snapshot is used
  --write-events              Append normalized events to the local Signal Event Ledger
  --write-snapshot            Append the read-only engagement preview to Engagement Snapshot Ledger
  --project-from-ledger       Project the whole local Signal Event Ledger instead of just this batch
  --include-restricted        Include restricted events in projection. Default false
  --ledger-path <path>        Signal Event Ledger override
  --snapshot-ledger-path <path> Engagement Snapshot Ledger override
  --card-store-path <path>    vNext card store path override
  --source-path <path>        Legacy Person Cards V1 source path override
  --prefer-store <0|1>        Prefer local vNext card store. Default 1
  --out <path>                Write compact pipeline JSON to a local file
  --fail-on-empty             Exit non-zero when no preview signals are produced
  --help                      Show this help

This command is local-only. It turns supplied read-only source snapshots into Signal Event Ledger records,
projects them into engagement-preview signals, and previews score movement. It never mutates person cards,
writes Fact Store, sends outbound messages, calls live APIs, or reads credentials.`;

type Options = {
  sourceFiles: Array<{ kind: CrmVNextSignalEventPipelineSourceKind; path: string }>;
  windowDays: number;
  sourceLabel: string | null;
  collector: string | null;
  approvedBy: string | null;
  writeEvents: boolean;
  writeSnapshot: boolean;
  projectFromLedger: boolean;
  includeRestricted: boolean;
  ledgerPath: string | null;
  snapshotLedgerPath: string | null;
  cardStorePath: string | null;
  legacyPath: string | null;
  preferStore: boolean | null;
  out: string | null;
  failOnEmpty: boolean;
  help: boolean;
};

const parseArgs = (argv: string[]): Options => {
  const options: Options = {
    sourceFiles: [],
    windowDays: 30,
    sourceLabel: null,
    collector: null,
    approvedBy: null,
    writeEvents: false,
    writeSnapshot: false,
    projectFromLedger: false,
    includeRestricted: false,
    ledgerPath: null,
    snapshotLedgerPath: null,
    cardStorePath: null,
    legacyPath: null,
    preferStore: null,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--write-events') options.writeEvents = true;
    else if (arg === '--write-snapshot') options.writeSnapshot = true;
    else if (arg === '--project-from-ledger') options.projectFromLedger = true;
    else if (arg === '--include-restricted') options.includeRestricted = true;
    else if (arg === '--mailerlite-snapshot-file') {
      options.sourceFiles.push({ kind: 'mailerlite_snapshot', path: argv[++index] });
    } else if (arg === '--gmail-reply-discovery-file') {
      options.sourceFiles.push({ kind: 'gmail_reply_discovery', path: argv[++index] });
    } else if (arg === '--signals-file') {
      options.sourceFiles.push({ kind: 'engagement_signals', path: argv[++index] });
    } else if (arg === '--events-file') {
      options.sourceFiles.push({ kind: 'signal_events', path: argv[++index] });
    } else if (arg === '--window-days') options.windowDays = Number(argv[++index]);
    else if (arg === '--source-label') options.sourceLabel = argv[++index];
    else if (arg === '--collector') options.collector = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--snapshot-ledger-path') options.snapshotLedgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--source-path') options.legacyPath = argv[++index];
    else if (arg === '--prefer-store') {
      const value = argv[++index];
      if (value !== '0' && value !== '1') throw new Error('invalid_prefer_store');
      options.preferStore = value === '1';
    } else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!Number.isFinite(options.windowDays) || options.windowDays < 1) {
    throw new Error('invalid_window_days');
  }
  if (!options.help && options.sourceFiles.length === 0 && !options.projectFromLedger) {
    throw new Error('at_least_one_source_or_project_from_ledger_required');
  }
  if ((options.writeEvents || options.writeSnapshot) && !options.approvedBy) {
    throw new Error('approved_by_required_for_writes');
  }
  return options;
};

const readJson = async (filePath: string) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath: string, value: unknown) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const readSources = async (options: Options): Promise<CrmVNextSignalEventPipelineSource[]> =>
  Promise.all(options.sourceFiles.map(async (source) => ({
    kind: source.kind,
    path: resolve(source.path),
    payload: await readJson(source.path),
  })));

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildCrmVNextSignalEventPipeline({
    sources: await readSources(options),
    windowDays: options.windowDays,
    sourceLabel: options.sourceLabel,
    collector: options.collector,
    approvedBy: options.approvedBy,
    writeEvents: options.writeEvents,
    writeSnapshot: options.writeSnapshot,
    projectFromLedger: options.projectFromLedger,
    includeRestricted: options.includeRestricted,
    ledgerPath: options.ledgerPath,
    snapshotLedgerPath: options.snapshotLedgerPath,
    cardStorePath: options.cardStorePath,
    legacyPath: options.legacyPath,
    preferStore: options.preferStore,
  });

  const serialized = JSON.stringify(report, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, report);
  if (options.failOnEmpty && report.summary.projectedSignals === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext signal-event-pipeline failed: ${error.message}`);
  process.exitCode = 1;
});
