#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextSignalPacketInboxFromReportsDir,
  renderCrmVNextSignalPacketInboxMarkdown,
} from '../lib/crm/crm-vnext-signal-packet-inbox.js';

const usage = `Usage:
  node scripts/crm-vnext-signal-packet-inbox.mjs [options]

Options:
  --reports-dir <path>       Local Mantis reports directory. Defaults to ~/Documents/Mantis-Reports
  --since-days <n>           Scan recent report window. Default 14
  --limit <n>                Max recent JSON files to classify. Default 120
  --out <path>               Write inbox JSON report
  --markdown-out <path>      Write compact Markdown report
  --fail-on-candidates       Exit non-zero when unprocessed candidate packets exist
  --fail-on-blockers         Exit non-zero when active source blockers exist and no candidate packet exists
  --help                     Show this help

This command is local-only and read-only. It scans already-saved Mantis/Codex JSON reports,
finds unprocessed signal packets, and recommends the next local signal-event-pipeline command.
It never opens live sources, sends outbound messages, mutates CRM cards, writes Fact Store,
touches credentials, or changes scores.`;

const parseArgs = (argv) => {
  const options = {
    reportsDir: null,
    sinceDays: 14,
    limit: 120,
    out: null,
    markdownOut: null,
    failOnCandidates: false,
    failOnBlockers: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-candidates') options.failOnCandidates = true;
    else if (arg === '--fail-on-blockers') options.failOnBlockers = true;
    else if (arg === '--reports-dir') options.reportsDir = argv[++index];
    else if (arg === '--since-days') options.sinceDays = Number(argv[++index]);
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!Number.isFinite(options.sinceDays) || options.sinceDays < 1) throw new Error('invalid_since_days');
  if (!Number.isFinite(options.limit) || options.limit < 1) throw new Error('invalid_limit');
  return options;
};

const writeText = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, value, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildCrmVNextSignalPacketInboxFromReportsDir({
    reportsDir: options.reportsDir,
    sinceDays: options.sinceDays,
    limit: options.limit,
  });

  console.log(JSON.stringify(report, null, 2));

  if (options.out) {
    await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.markdownOut) {
    await writeText(options.markdownOut, renderCrmVNextSignalPacketInboxMarkdown(report));
  }

  if (options.failOnCandidates && report.summary.candidatePackets > 0) {
    process.exitCode = 2;
  } else if (options.failOnBlockers && report.summary.candidatePackets === 0 && report.summary.activeBlockers > 0) {
    process.exitCode = 3;
  }
};

main().catch((error) => {
  console.error(`crm-vnext signal-packet-inbox failed: ${error.message}`);
  process.exitCode = 1;
});
