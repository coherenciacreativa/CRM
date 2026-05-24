#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  buildCrmVNextOmnichannelCoveragePush,
} from '../lib/crm/crm-vnext-omnichannel-coverage-push';
import {
  formatCrmVNextOmnichannelCoveragePushMarkdown,
} from '../lib/crm/crm-vnext-omnichannel-coverage-push-markdown';

const usage = `Usage:
  node scripts/crm-vnext-omnichannel-coverage-push.mjs [options]

Options:
  --card-store-path <path>       Optional local vNext card store path
  --legacy-path <path>           Optional legacy person-card path
  --prefer-legacy                Use legacy person-card source instead of vNext store
  --limit <n>                    Total candidates to select. Default 40, max 80
  --ig-to-email-limit <n>        Candidate cap for Instagram-known/email-missing lane
  --email-to-ig-limit <n>        Candidate cap for email-known/Instagram-missing lane
  --out <path>                   Write JSON report locally
  --markdown-out <path>          Write Markdown report locally
  --help                         Show this help

Read-only/local. No live APIs, no CRM card writes, no Fact Store writes, no score mutation, no credential reads, no outbound.`;

const cleanInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseArgs = (argv) => {
  const options = {
    cardStorePath: null,
    legacyPath: null,
    preferStore: true,
    limit: 40,
    igToEmailLimit: null,
    emailToInstagramLimit: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--prefer-legacy') options.preferStore = false;
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--legacy-path') options.legacyPath = argv[++index];
    else if (arg === '--limit') options.limit = cleanInt(argv[++index], 40, 80);
    else if (arg === '--ig-to-email-limit') options.igToEmailLimit = cleanInt(argv[++index], 20, 80);
    else if (arg === '--email-to-ig-limit') options.emailToInstagramLimit = cleanInt(argv[++index], 20, 80);
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

  const report = await buildCrmVNextOmnichannelCoveragePush(options);
  const markdown = formatCrmVNextOmnichannelCoveragePushMarkdown(report);
  const writes = {
    jsonPath: null,
    markdownPath: null,
  };

  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(report, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, `${markdown.trimEnd()}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: report.schemaVersion,
    mode: report.mode,
    generatedAt: report.generatedAt,
    summary: report.summary,
    topCandidates: report.candidates.slice(0, 8).map((candidate) => ({
      rank: candidate.rank,
      lane: candidate.lane,
      personId: candidate.personId,
      displayName: candidate.displayName,
      bridgePotential: candidate.bridgePotential,
      priorityScore: candidate.priorityScore,
    })),
    writes,
    safety: {
      operationsExecuted: report.safety.operationsExecuted,
      outboundProhibited: report.safety.outboundProhibited,
      cardMutationProhibited: report.safety.cardMutationProhibited,
      liveApiCallsProhibited: report.safety.liveApiCallsProhibited,
    },
    markdownPreview: markdown.split('\n').slice(0, 26),
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext omnichannel-coverage-push failed: ${error.message}`);
  process.exitCode = 1;
});
