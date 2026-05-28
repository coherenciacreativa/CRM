#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-consolidation-audit-2026-05-28';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CRM_MANIFEST = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md';
const DEFAULT_FIRST_BATCH_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_vnext_empty_group_create_EXECUTED_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_EXECUTED_2026-05-28.json';
const DEFAULT_MINI_LAUNCH_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_execution_inteligencia_descansar_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-consolidation-audit.mjs [options]

Options:
  --brand-dictionary <path>       Brand MailerLite group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --crm-manifest <path>           CRM receipt taxonomy manifest. Defaults to ${DEFAULT_CRM_MANIFEST}
  --first-batch-execution <path>  First vNext empty group execution JSON. Defaults to ${DEFAULT_FIRST_BATCH_EXECUTION}
  --onboarding-v2-execution <path> Onboarding v2 empty group execution JSON. Defaults to ${DEFAULT_ONBOARDING_V2_EXECUTION}
  --mini-launch-execution <path>  Mini-launch empty group execution JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EXECUTION}
  --out <path>                    Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>           Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                          Show this help

Local-only audit that reconciles Brand dictionary status, CRM taxonomy manifest
status, and approved empty-group execution receipts. It never opens UI, never
calls MailerLite/Shopify/CRM APIs, never reads subscribers, never mutates groups,
workflows, ledgers, cards, scoring, Fact Store or files outside the report paths.`;

const parseArgs = (argv) => {
  const options = {
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    crmManifest: DEFAULT_CRM_MANIFEST,
    firstBatchExecution: DEFAULT_FIRST_BATCH_EXECUTION,
    onboardingV2Execution: DEFAULT_ONBOARDING_V2_EXECUTION,
    miniLaunchExecution: DEFAULT_MINI_LAUNCH_EXECUTION,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--crm-manifest') options.crmManifest = argv[++index];
    else if (arg === '--first-batch-execution') options.firstBatchExecution = argv[++index];
    else if (arg === '--onboarding-v2-execution') options.onboardingV2Execution = argv[++index];
    else if (arg === '--mini-launch-execution') options.miniLaunchExecution = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeName = (value) =>
  cleanString(value)?.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim() ?? null;

const stripBackticks = (value) => cleanString(value)?.replace(/^`|`$/g, '') ?? null;

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const digestFor = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const parsePipeRow = (line) => line
  .trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map((cell) => cell.trim());

const isSeparatorRow = (cells) => cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const parseBrandDictionaryRows = (markdown) => {
  const rows = [];
  let headers = null;
  for (const line of markdown.split(/\r?\n/)) {
    if (!line.trim().startsWith('|')) {
      headers = null;
      continue;
    }
    const cells = parsePipeRow(line);
    if (cells.length < 3) continue;
    if (isSeparatorRow(cells)) continue;
    if (!headers) {
      headers = cells.map((cell) => cleanString(cell)?.toLowerCase() ?? '');
      continue;
    }
    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    const rawName = row['nombre de grupo'];
    if (!rawName || !rawName.includes('CC ·')) continue;
    const name = stripBackticks(rawName);
    rows.push({
      name,
      normalizedName: normalizeName(name),
      layer: stripBackticks(row.capa) ?? null,
      status: stripBackticks(row.estado) ?? null,
      crmMapping: stripBackticks(row['crm mapping']) ?? null,
      contentId: stripBackticks(row.content_id) ?? null,
      tableHeaders: headers,
    });
  }
  return rows;
};

const extractJsonBlock = (markdown) => {
  const match = markdown.match(/```json\s*([\s\S]*?)```/);
  if (!match) throw new Error('crm_manifest_json_block_missing');
  return JSON.parse(match[1]);
};

const parseCrmManifestRows = (markdown) => {
  const manifest = extractJsonBlock(markdown);
  return (manifest.groups ?? []).map((group) => ({
    ...group,
    normalizedName: normalizeName(group.name),
  }));
};

const executionRows = ({ report, reportPath, sourceId, sourceLabel }) =>
  (report?.createdGroups ?? []).map((group) => ({
    name: cleanString(group.name),
    normalizedName: normalizeName(group.name),
    liveGroupId: cleanString(group.id),
    sourceId,
    sourceLabel,
    reportPath: resolve(reportPath),
  })).filter((group) => group.name && group.liveGroupId);

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const classifyRow = ({ liveEvidence, brandRow, crmRow }) => {
  const brandStatus = brandRow?.status ?? null;
  const crmLiveGroupId = cleanString(crmRow?.liveGroupId) ?? null;
  const crmLiveStatus = cleanString(crmRow?.liveStatus) ?? null;
  const brandPromotionNeeded = brandStatus !== 'live_canonical';
  const crmManifestRefreshNeeded = crmLiveGroupId !== liveEvidence.liveGroupId
    || !crmLiveStatus?.startsWith('live_canonical');
  const issues = [];
  if (!brandRow) issues.push('missing_from_brand_dictionary');
  else if (brandPromotionNeeded) issues.push(`brand_status_not_live_canonical:${brandStatus ?? 'missing'}`);
  if (!crmRow) issues.push('missing_from_crm_manifest');
  else if (crmManifestRefreshNeeded) issues.push(`crm_manifest_live_status_or_id_stale:${crmLiveStatus ?? 'missing'}:${crmLiveGroupId ?? 'missing'}`);
  return {
    name: liveEvidence.name,
    liveGroupId: liveEvidence.liveGroupId,
    sourceId: liveEvidence.sourceId,
    brandStatus,
    brandLayer: brandRow?.layer ?? null,
    crmManifestLiveGroupId: crmLiveGroupId,
    crmManifestLiveStatus: crmLiveStatus,
    brandPromotionNeeded: Boolean(brandPromotionNeeded),
    crmManifestRefreshNeeded: Boolean(crmManifestRefreshNeeded),
    issues,
  };
};

const buildTaxonomyConsolidationAudit = ({
  brandDictionaryMarkdown,
  crmManifestMarkdown,
  firstBatchExecution,
  onboardingV2Execution,
  miniLaunchExecution,
  paths,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const brandRows = parseBrandDictionaryRows(brandDictionaryMarkdown);
  const crmRows = parseCrmManifestRows(crmManifestMarkdown);
  const brandByName = new Map(brandRows.map((row) => [row.normalizedName, row]));
  const crmByName = new Map(crmRows.map((row) => [row.normalizedName, row]));
  const liveEvidenceRows = [
    ...executionRows({ report: firstBatchExecution, reportPath: paths.firstBatchExecution, sourceId: 'first_live_canonical_batch', sourceLabel: 'First vNext empty group batch' }),
    ...executionRows({ report: onboardingV2Execution, reportPath: paths.onboardingV2Execution, sourceId: 'onboarding_v2_empty_groups', sourceLabel: 'Onboarding v2 empty groups' }),
    ...executionRows({ report: miniLaunchExecution, reportPath: paths.miniLaunchExecution, sourceId: 'mini_launch_empty_groups', sourceLabel: 'Mini-launch empty groups' }),
  ];

  const seen = new Set();
  const consolidatedRows = [];
  for (const evidence of liveEvidenceRows) {
    if (seen.has(evidence.normalizedName)) continue;
    seen.add(evidence.normalizedName);
    consolidatedRows.push(classifyRow({
      liveEvidence: evidence,
      brandRow: brandByName.get(evidence.normalizedName),
      crmRow: crmByName.get(evidence.normalizedName),
    }));
  }

  const brandPromotionRows = consolidatedRows.filter((row) => row.brandPromotionNeeded);
  const crmRefreshRows = consolidatedRows.filter((row) => row.crmManifestRefreshNeeded);
  const issueRows = consolidatedRows.filter((row) => row.issues.length > 0);
  const ok = true;
  const fullyConsolidated = issueRows.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_consolidation_audit',
    generatedAt,
    ok,
    status: fullyConsolidated
      ? 'taxonomy_receipts_consolidated_no_live_changes'
      : 'taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes',
    executiveSummary: {
      liveEvidenceGroupCount: consolidatedRows.length,
      brandDictionaryGroupCount: brandRows.length,
      crmManifestGroupCount: crmRows.length,
      brandPromotionNeededCount: brandPromotionRows.length,
      crmManifestRefreshNeededCount: crmRefreshRows.length,
      issueCount: issueRows.length,
      allLiveEvidenceRepresentedInBrandDictionary: consolidatedRows.every((row) => !row.issues.includes('missing_from_brand_dictionary')),
      allLiveEvidencePromotedInBrandDictionary: brandPromotionRows.length === 0,
      allLiveEvidenceRepresentedInCrmManifest: consolidatedRows.every((row) => !row.issues.includes('missing_from_crm_manifest')),
      allLiveEvidenceHasCrmLiveIds: crmRefreshRows.length === 0,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: fullyConsolidated
        ? 'use_consolidated_taxonomy_as_read_only_operating_evidence'
        : 'prepare_local_dictionary_and_manifest_refresh_from_live_execution_receipts',
    },
    consolidatedRows,
    brandPromotionNeeded: brandPromotionRows.map((row) => ({
      name: row.name,
      liveGroupId: row.liveGroupId,
      currentBrandStatus: row.brandStatus,
      expectedBrandStatus: 'live_canonical',
      sourceId: row.sourceId,
    })),
    crmManifestRefreshNeeded: crmRefreshRows.map((row) => ({
      name: row.name,
      liveGroupId: row.liveGroupId,
      currentCrmManifestLiveGroupId: row.crmManifestLiveGroupId,
      currentCrmManifestLiveStatus: row.crmManifestLiveStatus,
      expectedCrmManifestLiveStatus: 'live_canonical_empty_created',
      sourceId: row.sourceId,
    })),
    hardStops: [
      'This audit is not approval for any live MailerLite action.',
      'Do not edit Brand dictionary in a dirty Brand repo without isolating unrelated work.',
      'Do not mark a group live_canonical without a matching approved execution or fresh read-only verification receipt.',
      'Do not infer subscriber assignment, workflow use, scoring, engagement, purchase intent, opening, reading or click from group existence.',
      'Any later live use still requires its own exact approval and fresh evidence.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Taxonomy Consolidation Audit',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Summary',
  '',
  `- Live evidence groups: ${report.executiveSummary.liveEvidenceGroupCount}`,
  `- Brand promotion needed: ${report.executiveSummary.brandPromotionNeededCount}`,
  `- CRM manifest refresh needed: ${report.executiveSummary.crmManifestRefreshNeededCount}`,
  `- Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `- Open live mutation gates: ${report.executiveSummary.openLiveMutationGateCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Brand Promotions Needed',
  '',
  renderList(report.brandPromotionNeeded.map((row) => `${row.name} -> ${row.expectedBrandStatus} (${row.liveGroupId})`)),
  '',
  '## CRM Manifest Refresh Needed',
  '',
  renderList(report.crmManifestRefreshNeeded.map((row) => `${row.name} -> ${row.expectedCrmManifestLiveStatus} (${row.liveGroupId})`)),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Group mutations performed: ${report.safety.groupMutationsPerformed}`,
  `- Workflow mutations performed: ${report.safety.workflowMutationsPerformed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildTaxonomyConsolidationAuditFromFiles = async (options) => {
  const [
    brandDictionaryMarkdown,
    crmManifestMarkdown,
    firstBatchExecution,
    onboardingV2Execution,
    miniLaunchExecution,
    sourceDigests,
  ] = await Promise.all([
    readText(options.brandDictionary),
    readText(options.crmManifest),
    readJson(options.firstBatchExecution),
    readJson(options.onboardingV2Execution),
    readJson(options.miniLaunchExecution),
    Promise.all([
      digestFor(options.brandDictionary, 'Brand semantic dictionary for MailerLite groups'),
      digestFor(options.crmManifest, 'CRM receipt taxonomy manifest/cache'),
      digestFor(options.firstBatchExecution, 'first approved empty group execution receipt'),
      digestFor(options.onboardingV2Execution, 'Onboarding v2 approved empty group execution receipt'),
      digestFor(options.miniLaunchExecution, 'mini-launch approved empty group execution receipt'),
    ]),
  ]);

  return buildTaxonomyConsolidationAudit({
    brandDictionaryMarkdown,
    crmManifestMarkdown,
    firstBatchExecution,
    onboardingV2Execution,
    miniLaunchExecution,
    paths: options,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildTaxonomyConsolidationAuditFromFiles(options);
  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    liveEvidenceGroupCount: report.executiveSummary.liveEvidenceGroupCount,
    brandPromotionNeededCount: report.executiveSummary.brandPromotionNeededCount,
    crmManifestRefreshNeededCount: report.executiveSummary.crmManifestRefreshNeededCount,
    canAskApprovalNow: report.executiveSummary.canAskApprovalNow,
    openLiveMutationGateCount: report.executiveSummary.openLiveMutationGateCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error?.stack ?? error);
    process.exitCode = 1;
  });
}

export {
  buildTaxonomyConsolidationAudit,
  buildTaxonomyConsolidationAuditFromFiles,
  parseBrandDictionaryRows,
  parseCrmManifestRows,
};
