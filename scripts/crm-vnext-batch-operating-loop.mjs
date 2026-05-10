#!/usr/bin/env node
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/batch-operating-loop';

const usage = `Usage:
  node scripts/crm-vnext-batch-operating-loop.mjs --text <text> [options]
  node scripts/crm-vnext-batch-operating-loop.mjs --text-file <path> [options]

Options:
  --api-url <url>          Batch operating loop API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to operate
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro, Juana, or Mantis
  --channel <channel>      Channel name, e.g. codex
  --include-expanded-sources
                           Also search read-only local CSVs, retreat tables, downloads, and contact exports
  --evidence-file <path>   JSON file with connected evidenceSources from read-only searches
  --decision-ledger-path <path>
                           Local evidence-review decisions JSONL ledger to apply before loop evaluation
  --card-store-path <path> Local vNext card store path. Defaults to .crm-vnext/person-card-store/person-cards-vnext.json
  --out <path>             Write the full compact loop report to a local JSON file
  --fail-on-open-work      Exit non-zero when evidence or identity queues still need work
  --help                   Show this help

This command is read-only. It gives Mantis one operating loop for a batch: evidence questions, blocked identity queue, ready approval items, and dry-run write preview. It never mutates cards, writes Fact Store, sends outbound messages, calls live APIs, or touches credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    includeExpandedSources: false,
    evidenceFile: null,
    decisionLedgerPath: null,
    cardStorePath: null,
    out: null,
    failOnOpenWork: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--fail-on-open-work') options.failOnOpenWork = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--decision-ledger-path') options.decisionLedgerPath = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const headers = () => {
  const result = { 'content-type': 'application/json' };
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    result['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }
  return result;
};

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  return null;
};

const readEvidenceSources = async (options) => {
  if (!options.evidenceFile) return [];
  const raw = await readFile(resolve(options.evidenceFile), 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) {
    return parsed.evidenceSources;
  }
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const compactEvidenceQueueItem = (item) => ({
  queueItemId: item.queueItemId,
  priority: item.priority,
  subject: item.subject,
  targetPersonId: item.targetPersonId,
  candidateEmail: item.candidateEmail,
  recommendedOptionId: item.recommendedOptionId,
  recommendedDecisionCli: item.recommendedDecisionCli,
  evidence: item.evidence,
  safeNextStep: item.safeNextStep,
});

const compactLoop = (loop, source) => ({
  ok: true,
  mode: loop.mode,
  generatedAt: loop.generatedAt,
  source,
  summary: loop.summary,
  operatorRunbook: loop.operatorRunbook,
  evidenceQuestionQueue: loop.evidenceQuestionQueue.map(compactEvidenceQueueItem),
  blockedIdentityQueue: loop.blockedIdentityQueue,
  readyApprovalItems: loop.readyApprovalItems,
  readyWritePreview: loop.readyWritePreview,
  componentSummaries: loop.componentSummaries,
  safety: loop.safety,
});

const runLoop = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('batch_operating_loop_text_required');
  const evidenceSources = await readEvidenceSources(options);
  const apiUrl = new URL(options.apiUrl);
  if (options.decisionLedgerPath) apiUrl.searchParams.set('decisionLedgerPath', resolve(options.decisionLedgerPath));
  if (options.cardStorePath) apiUrl.searchParams.set('cardStorePath', resolve(options.cardStorePath));

  const response = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
      evidenceSources,
    }),
  });
  if (!response.ok) throw new Error(`batch_operating_loop_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`batch_operating_loop_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runLoop(options);
  const compact = compactLoop(payload.loop, payload.source);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) {
    await writeFile(resolve(options.out), `${serialized}\n`, 'utf8');
  }

  if (
    options.failOnOpenWork
    && (
      payload.loop.summary.evidenceQuestionQueueItems > 0
      || payload.loop.summary.blockedIdentityItems > 0
    )
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext batch-operating-loop failed: ${error.message}`);
  process.exitCode = 1;
});
