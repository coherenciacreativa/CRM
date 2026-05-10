#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/card-write-apply';

const usage = `Usage:
  node scripts/crm-vnext-card-write-apply.mjs --text <text> [options]
  node scripts/crm-vnext-card-write-apply.mjs --text-file <path> [options]

Options:
  --api-url <url>               Card write apply API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>                 CRM facts/report text to prepare/apply
  --text-file <path>            Local text file with CRM facts/report text
  --source-kind <kind>          alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>             Reporter name, e.g. Alejandro or Juana
  --channel <channel>           Channel name, e.g. codex
  --include-expanded-sources
                                Also search read-only local CSVs, retreat tables, downloads, and contact exports
  --connected-evidence-only
                                Use only supplied --evidence-file sources, skipping default local memory search
  --evidence-file <path>        JSON file with connected evidenceSources from read-only searches
  --decision-ledger-path <path> Local evidence-review decisions JSONL ledger to apply before write
  --approval-item-id <id>       Approval item to apply. May be repeated
  --apply-all-ready             Select every ready_for_human_approval item
  --card-store-path <path>      Local vNext card store path. Defaults to .crm-vnext/person-card-store/person-cards-vnext.json
  --card-write-ledger-path <path>
                                Local card-write ledger JSONL path
  --backup-dir <path>           Local backup directory for committed writes
  --approved-by <name>          Required with --write
  --write                       Commit to the local vNext card store after backups
  --fail-on-blocked             Exit non-zero when commit is blocked or selected items are not committable
  --help                        Show this help

Default mode is dry-run. A committed write requires --write, --approved-by, and either --approval-item-id or --apply-all-ready. This command writes only local CRM vNext card-store/ledger files after backup; it never sends outbound messages, writes Fact Store, calls live APIs, or touches credentials.`;

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
    approvalItemIds: [],
    applyAllReady: false,
    cardStorePath: null,
    cardWriteLedgerPath: null,
    backupDir: null,
    approvedBy: null,
    write: false,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--include-expanded-sources') options.includeExpandedSources = true;
    else if (arg === '--connected-evidence-only') options.connectedEvidenceOnly = true;
    else if (arg === '--apply-all-ready') options.applyAllReady = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--decision-ledger-path') options.decisionLedgerPath = argv[++index];
    else if (arg === '--approval-item-id') options.approvalItemIds.push(argv[++index]);
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--card-write-ledger-path') options.cardWriteLedgerPath = argv[++index];
    else if (arg === '--backup-dir') options.backupDir = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
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

const compactPlanItem = (item) => ({
  applyItemId: item.applyItemId,
  status: item.status,
  approvalItemId: item.approvalItemId,
  targetPersonId: item.targetPersonId,
  subject: item.subject,
  recommendedAction: item.recommendedAction,
  mutationKind: item.mutationKind,
  proposedCard: item.proposedCard ? {
    personId: item.proposedCard.personId,
    displayName: item.proposedCard.displayName,
    identities: item.proposedCard.identities,
    products: item.proposedCard.products,
    evidenceCount: item.proposedCard.evidence.length,
  } : null,
  operations: item.operations.map((operation) => ({
    operationId: operation.operationId,
    type: operation.type,
    executed: operation.executed,
    approvalRequired: operation.approvalRequired,
  })),
  approvalScopes: item.approvalScopes,
  commitBlockers: item.commitBlockers,
});

const compactPayload = (payload) => ({
  ok: payload.ok,
  source: payload.source,
  mode: payload.apply?.mode,
  generatedAt: payload.apply?.generatedAt,
  summary: payload.apply?.summary,
  planItems: payload.apply?.planItems?.map(compactPlanItem) ?? [],
  write: payload.write,
  safety: payload.apply?.safety,
});

const runApply = async (options) => {
  const text = await readText(options);
  if (!text) throw new Error('card_write_apply_text_required');
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');
  if (options.write && !options.applyAllReady && options.approvalItemIds.length === 0) {
    throw new Error('approval_item_id_or_apply_all_ready_required_for_write');
  }

  const evidenceSources = await readEvidenceSources(options);
  const apiUrl = new URL(options.apiUrl);
  if (options.decisionLedgerPath) apiUrl.searchParams.set('decisionLedgerPath', resolve(options.decisionLedgerPath));
  if (options.cardStorePath) apiUrl.searchParams.set('cardStorePath', resolve(options.cardStorePath));
  if (options.cardWriteLedgerPath) apiUrl.searchParams.set('cardWriteLedgerPath', resolve(options.cardWriteLedgerPath));
  if (options.backupDir) apiUrl.searchParams.set('backupDir', resolve(options.backupDir));

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
      approvalItemIds: options.approvalItemIds,
      applyAllReady: options.applyAllReady,
      approvedBy: options.approvedBy,
      commit: options.write,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    console.log(JSON.stringify(compactPayload(payload), null, 2));
    throw new Error(payload.error ?? `card_write_apply_api_failed:${response.status}`);
  }
  return payload;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runApply(options);
  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (
    options.failOnBlocked
    && (
      payload.apply.summary.commitBlocked
      || payload.apply.summary.blockedItems > 0
      || payload.apply.summary.commitEligibleItems !== payload.apply.summary.selectedItems
    )
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext card-write-apply failed: ${error.message}`);
  process.exitCode = 1;
});
