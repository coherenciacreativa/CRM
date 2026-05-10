#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/card-merge-review-resolver';

const usage = `Usage:
  node scripts/crm-vnext-card-merge-review-resolver.mjs [options]

Options:
  --api-url <url>                 Merge review resolver API URL. Defaults to ${DEFAULT_API_URL}
  --review-id <id>                Merge review id to resolve. May be repeated
  --resolve-all-ready             Select every ready merge-review item
  --card-store-path <path>        Local vNext card store path. Defaults to .crm-vnext/person-card-store/person-cards-vnext.json
  --merge-review-ledger-path <path>
                                  Local merge-review resolver ledger JSONL path
  --backup-dir <path>             Local backup directory for committed writes
  --evidence-file <json>          Supplemental evidenceSources JSON from a read-only helper/export
  --approved-by <name>            Required with --write
  --ack-restricted-service        Required to commit a merge with restricted service context
  --write                         Commit resolved merge items to the local vNext card store after backup
  --fail-on-blocked               Exit non-zero when commit is blocked or selected items are not resolvable
  --help                          Show this help

Default mode is dry-run. A committed merge requires --write, --approved-by, and either --review-id or --resolve-all-ready. Restricted service merges also require --ack-restricted-service. This command writes only local CRM vNext card-store/ledger files after backup; it never sends outbound messages, writes Fact Store, calls live APIs, or touches credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    reviewIds: [],
    resolveAllReady: false,
    cardStorePath: null,
    mergeReviewLedgerPath: null,
    backupDir: null,
    evidenceFile: null,
    approvedBy: null,
    ackRestrictedService: false,
    write: false,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--resolve-all-ready') options.resolveAllReady = true;
    else if (arg === '--ack-restricted-service') options.ackRestrictedService = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--review-id') options.reviewIds.push(argv[++index]);
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--merge-review-ledger-path') options.mergeReviewLedgerPath = argv[++index];
    else if (arg === '--backup-dir') options.backupDir = argv[++index];
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
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

const compactReviewItem = (item) => ({
  reviewId: item.reviewId,
  status: item.status,
  targetPersonId: item.targetPersonId,
  subjectLabel: item.subjectLabel,
  targetCard: item.targetCard,
  proposedResolvedCard: item.proposedResolvedCard ? {
    personId: item.proposedResolvedCard.personId,
    displayName: item.proposedResolvedCard.displayName,
    identities: item.proposedResolvedCard.identities,
    products: item.proposedResolvedCard.products,
    evidenceCount: item.proposedResolvedCard.evidence.length,
  } : null,
  operationIds: item.operationIds,
  approvalScopes: item.approvalScopes,
  restrictedService: item.restrictedService,
  supplementalEvidence: item.supplementalEvidence,
  commitBlockers: item.commitBlockers,
});

const compactPayload = (payload) => ({
  ok: payload.ok,
  source: payload.source,
  mode: payload.resolver?.mode,
  generatedAt: payload.resolver?.generatedAt,
  summary: payload.resolver?.summary,
  reviewItems: payload.resolver?.reviewItems?.map(compactReviewItem) ?? [],
  write: payload.write,
  safety: payload.resolver?.safety,
});

const runResolver = async (options) => {
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');
  if (options.write && !options.resolveAllReady && options.reviewIds.length === 0) {
    throw new Error('review_id_or_resolve_all_ready_required_for_write');
  }

  const apiUrl = new URL(options.apiUrl);
  if (options.cardStorePath) apiUrl.searchParams.set('cardStorePath', resolve(options.cardStorePath));
  if (options.mergeReviewLedgerPath) apiUrl.searchParams.set('mergeReviewLedgerPath', resolve(options.mergeReviewLedgerPath));
  if (options.backupDir) apiUrl.searchParams.set('backupDir', resolve(options.backupDir));
  const evidenceSources = options.evidenceFile
    ? await evidenceSourcesFromFile(options.evidenceFile)
    : [];

  const response = await fetch(apiUrl.toString(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      reviewIds: options.reviewIds,
      evidenceSources,
      resolveAllReady: options.resolveAllReady,
      approvedBy: options.approvedBy,
      ackRestrictedService: options.ackRestrictedService,
      commit: options.write,
    }),
  });
  const payload = await response.json();
  if (!response.ok || !payload.ok) {
    console.log(JSON.stringify(compactPayload(payload), null, 2));
    throw new Error(payload.error ?? `card_merge_review_resolver_api_failed:${response.status}`);
  }
  return payload;
};

const evidenceSourcesFromFile = async (filePath) => {
  const parsed = JSON.parse(await readFile(resolve(filePath), 'utf8'));
  if (Array.isArray(parsed)) return parsed;
  if (Array.isArray(parsed?.evidenceSources)) return parsed.evidenceSources;
  if (Array.isArray(parsed?.helper?.evidenceSources)) return parsed.helper.evidenceSources;
  if (Array.isArray(parsed?.report?.evidenceSources)) return parsed.report.evidenceSources;
  throw new Error('evidence_file_must_contain_array_or_evidenceSources');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const payload = await runResolver(options);
  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (
    options.failOnBlocked
    && (
      payload.resolver.summary.commitBlocked
      || payload.resolver.summary.blockedReviews > 0
      || payload.resolver.summary.readyForHumanApprovedMerge !== payload.resolver.summary.selectedReviews
    )
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext card-merge-review-resolver failed: ${error.message}`);
  process.exitCode = 1;
});
