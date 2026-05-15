#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildCrmVNextMailerLiteEngagementSignals } from '../lib/crm/crm-vnext-mailerlite-engagement-signals.js';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-engagement-signals.mjs --snapshot-file <path> [options]

Options:
  --snapshot-file <path>  JSON from Mantis/MailerLite export with subscriber or campaign activity rows
  --window-days <n>       Engagement window for nested campaign activity. Defaults to 30
  --observed-at <iso>     Override observedAt for records that do not include one
  --out <path>            Write engagement-signals JSON to a local file
  --fail-on-empty         Exit non-zero when no signals are produced
  --help                  Show this help

This command is read-only. It converts supplied MailerLite subscriber/campaign engagement snapshots into
crm:vnext:engagement-signal-preview input. It never calls MailerLite, reads credentials, mutates subscribers,
mutates CRM cards, writes Fact Store, or sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    snapshotFile: null,
    windowDays: 30,
    observedAt: null,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--snapshot-file') options.snapshotFile = argv[++index];
    else if (arg === '--window-days') options.windowDays = Number(argv[++index]);
    else if (arg === '--observed-at') options.observedAt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.snapshotFile) throw new Error('snapshot_file_required');
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
  skippedRecords: report.skippedRecords,
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const snapshot = await readJson(options.snapshotFile);
  const report = buildCrmVNextMailerLiteEngagementSignals({
    snapshot,
    windowDays: options.windowDays,
    observedAt: options.observedAt,
  });
  const compact = compactReport(report);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, compact);
  if (options.failOnEmpty && report.summary.signalsGenerated === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext mailerlite-engagement-signals failed: ${error.message}`);
  process.exitCode = 1;
});
