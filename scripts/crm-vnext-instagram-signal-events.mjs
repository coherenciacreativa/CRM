#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextInstagramSignalEvents,
} from '../lib/crm/crm-vnext-instagram-signal-events.js';

const usage = `Usage:
  node scripts/crm-vnext-instagram-signal-events.mjs --observations-file <path> [options]

Options:
  --observations-file <path>  JSON observations from Instagram API, Instagram UI, ManyChat export, or manual read-only review
  --out <path>                Write canonical signal event JSON to this path
  --fail-on-empty             Exit non-zero when no Instagram signal event is produced
  --help                      Show this help

This command is read-only. It converts supplied Instagram observations into canonical Signal Event Ledger records.
It never opens Instagram, calls live APIs, reads cookies, changes credentials, sends messages, mutates cards,
writes Fact Store, touches ManyChat LIVE, or changes scores.`;

const parseArgs = (argv) => {
  const options = {
    observationsFile: null,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--observations-file') options.observationsFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.observationsFile) throw new Error('observations_file_required');
  return options;
};

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const raw = JSON.parse(await readFile(resolve(options.observationsFile), 'utf8'));
  const report = buildCrmVNextInstagramSignalEvents(raw);

  if (options.out) await writeJson(options.out, report);

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    generatedAt: report.generatedAt,
    summary: report.summary,
    out: options.out ? resolve(options.out) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnEmpty && report.summary.eventsGenerated === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext instagram-signal-events failed: ${error.message}`);
  process.exitCode = 1;
});
