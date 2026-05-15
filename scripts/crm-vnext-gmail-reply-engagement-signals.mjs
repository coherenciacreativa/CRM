#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildCrmVNextGmailReplyEngagementSignals } from '../lib/crm/crm-vnext-gmail-reply-engagement-signals.js';

const usage = `Usage:
  node scripts/crm-vnext-gmail-reply-engagement-signals.mjs --discovery-file <path> [options]

Options:
  --discovery-file <path> JSON from Mantis Gmail reply intelligence discovery
  --snapshot-file <path>  Alias for --discovery-file
  --window-days <n>       Recent reply window. Defaults to 30
  --out <path>            Write engagement-signals JSON to a local file
  --fail-on-empty         Exit non-zero when no signals are produced
  --help                  Show this help

This command is read-only. It converts supplied Gmail newsletter reply metadata into
crm:vnext:engagement-signal-preview input. It never calls Gmail, reads credentials, exports full
email bodies, mutates Gmail, mutates CRM cards, writes Fact Store, or sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    discoveryFile: null,
    windowDays: 30,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--discovery-file' || arg === '--snapshot-file') options.discoveryFile = argv[++index];
    else if (arg === '--window-days') options.windowDays = Number(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.discoveryFile) throw new Error('discovery_file_required');
  if (!Number.isFinite(options.windowDays) || options.windowDays < 1) throw new Error('invalid_window_days');
  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

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
  windowDays: report.windowDays,
  summary: report.summary,
  signals: report.signals,
  replyActivities: report.replyActivities,
  skippedRecords: report.skippedRecords,
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const snapshot = await readJson(options.discoveryFile);
  const report = buildCrmVNextGmailReplyEngagementSignals({
    snapshot,
    windowDays: options.windowDays,
  });
  const compact = compactReport(report);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, compact);
  if (options.failOnEmpty && report.summary.signalsGenerated === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext gmail-reply-engagement-signals failed: ${error.message}`);
  process.exitCode = 1;
});
