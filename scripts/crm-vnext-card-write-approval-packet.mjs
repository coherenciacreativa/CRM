#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/card-write-approval-packet';

const usage = `Usage:
  node scripts/crm-vnext-card-write-approval-packet.mjs --text <text> [options]
  node scripts/crm-vnext-card-write-approval-packet.mjs --text-file <path> [options]

Options:
  --api-url <url>          Card write approval packet API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>            CRM facts/report text to prepare for approval
  --text-file <path>       Local text file with CRM facts/report text
  --source-kind <kind>     alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>        Reporter name, e.g. Alejandro or Juana
  --channel <channel>      Channel name, e.g. codex
  --include-expanded-sources
                           Also search read-only local CSVs, retreat tables, downloads, and contact exports
  --connected-evidence-only
                           Use only supplied --evidence-file sources, skipping default local memory search
  --evidence-file <path>   JSON file with connected evidenceSources from read-only searches
  --decision-ledger-path <path>
                           Local evidence-review decisions JSONL ledger to apply before approval
  --fail-on-blocked        Exit non-zero when any approval item is blocked
  --help                   Show this help

This command is read-only. It prepares explicit human approval packets for future card writes. It never mutates cards, never writes Fact Store, never sends outbound messages, and never calls live Gmail, Drive, or MailerLite APIs.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    includeExpandedSources: false,
    connectedEvidenceOnly: false,
    evidenceFile: null,
    decisionLedgerPath: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--connected-evidence-only') options.connectedEvidenceOnly = true;
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
  const raw = await readFile(resolve(options.evidenceFile), 'utf8');
  const parsed = JSON.parse(raw);
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object' && Array.isArray(parsed.evidenceSources)) {
    return parsed.evidenceSources;
  }
  throw new Error('evidence_file_must_be_array_or_object_with_evidenceSources');
};

const runPacket = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('card_write_approval_packet_text_required');
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
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      includeExpandedSources: options.includeExpandedSources,
      connectedEvidenceOnly: options.connectedEvidenceOnly,
      evidenceSources,
    }),
  });
  if (!response.ok) throw new Error(`card_write_approval_packet_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`card_write_approval_packet_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const compactApprovalItem = (item) => ({
  approvalItemId: item.approvalItemId,
  status: item.status,
  targetPersonId: item.targetPersonId,
  subject: item.subject,
  recommendedAction: item.recommendedAction,
  requestedDecision: item.requestedDecision,
  identitySummary: item.identitySummary,
  proposedServices: item.proposedServices,
  relationshipContexts: item.relationshipContexts,
  openQuestions: item.openQuestions,
  approvalScopes: item.approvalScopes,
  approvalChecklist: item.approvalChecklist,
  blockers: item.blockers,
  nextEvidenceActions: item.nextEvidenceActions,
  operationsPreviewed: item.operationsPreviewed,
  operationsExecuted: item.operationsExecuted,
  safeApprovalBoundary: item.safeApprovalBoundary,
});

const compactPacket = (packet, source) => ({
  ok: true,
  mode: packet.mode,
  generatedAt: packet.generatedAt,
  source,
  summary: packet.summary,
  batchSummary: packet.batchSummary,
  approvalItems: packet.approvalItems.map(compactApprovalItem),
  safety: packet.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runPacket(options);
  console.log(JSON.stringify(compactPacket(payload.packet, payload.source), null, 2));

  if (options.failOnBlocked && payload.packet.summary.readyForHumanApproval !== payload.packet.summary.items) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext card-write-approval-packet failed: ${error.message}`);
  process.exitCode = 1;
});
