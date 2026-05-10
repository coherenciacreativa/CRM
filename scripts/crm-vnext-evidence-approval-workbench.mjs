#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/evidence-approval-workbench';

const usage = `Usage:
  node scripts/crm-vnext-evidence-approval-workbench.mjs --text <text> [options]
  node scripts/crm-vnext-evidence-approval-workbench.mjs --text-file <path> [options]

Options:
  --api-url <url>              Evidence approval workbench API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>                CRM facts/report text
  --text-file <path>           Local text file with CRM facts/report text
  --evidence-file <path>       JSON file with connected evidenceSources from read-only searches
  --decision-ledger-path <path>
                              Local evidence-review decisions JSONL ledger to apply before queueing questions
  --source-kind <kind>         alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>            Reporter name, e.g. Alejandro or Juana
  --channel <channel>          Channel name, e.g. codex
  --include-expanded-sources   Search expanded local evidence sources
  --fail-on-open-review        Exit non-zero when unresolved evidence questions remain
  --help                       Show this help

This command is read-only. It prepares a compact decision queue for Mantis/Alejandro and never stores decisions, mutates cards, writes Fact Store, sends outbound messages, or calls live Gmail/Drive/MailerLite APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    evidenceFile: null,
    decisionLedgerPath: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    includeExpandedSources: false,
    failOnOpenReview: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--fail-on-open-review') options.failOnOpenReview = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--decision-ledger-path') options.decisionLedgerPath = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
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
  const parsed = JSON.parse(await readFile(resolve(options.evidenceFile), 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) return parsed.evidenceSources;
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const runWorkbench = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('evidence_approval_workbench_text_required');
  const evidenceSources = await readEvidenceSources(options);
  const apiUrl = new URL(options.apiUrl);
  if (options.decisionLedgerPath) {
    apiUrl.searchParams.set('decisionLedgerPath', resolve(options.decisionLedgerPath));
  }

  const response = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      evidenceSources,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
    }),
  });
  if (!response.ok) throw new Error(`evidence_approval_workbench_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`evidence_approval_workbench_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactQueueItem = (item) => ({
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

const compactWorkbench = (workbench, source) => ({
  ok: true,
  mode: workbench.mode,
  generatedAt: workbench.generatedAt,
  source,
  summary: workbench.summary,
  queueItems: workbench.queueItems.map(compactQueueItem),
  readyApprovalItems: workbench.readyApprovalItems,
  safety: workbench.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runWorkbench(options);
  console.log(JSON.stringify(compactWorkbench(payload.workbench, payload.source), null, 2));

  if (options.failOnOpenReview && payload.workbench.summary.queueItems > 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext evidence-approval-workbench failed: ${error.message}`);
  process.exitCode = 1;
});
