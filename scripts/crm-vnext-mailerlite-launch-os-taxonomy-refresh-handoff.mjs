#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-refresh-handoff-2026-05-28';
const DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_consolidation_audit_2026-05-28.json';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CRM_MANIFEST = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-handoff.mjs [options]

Options:
  --taxonomy-consolidation-audit <path> Launch OS taxonomy consolidation audit JSON. Defaults to ${DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT}
  --brand-dictionary <path>             Brand MailerLite group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --crm-manifest <path>                 CRM receipt taxonomy manifest. Defaults to ${DEFAULT_CRM_MANIFEST}
  --out <path>                          Write JSON handoff. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                 Write Markdown handoff. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                Show this help

Local-only handoff that converts taxonomy consolidation drift into explicit
Brand promotion and CRM manifest refresh rows. It never edits Brand Hub or CRM
manifest files, never opens UI, never calls MailerLite/Shopify/CRM APIs, never
reads subscribers, never mutates groups/workflows/cards/scoring/ledgers/Fact
Store, and never asks for live approval.`;

const parseArgs = (argv) => {
  const options = {
    taxonomyConsolidationAudit: DEFAULT_TAXONOMY_CONSOLIDATION_AUDIT,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    crmManifest: DEFAULT_CRM_MANIFEST,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--taxonomy-consolidation-audit') options.taxonomyConsolidationAudit = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--crm-manifest') options.crmManifest = argv[++index];
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

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  brandDictionaryMutated: false,
  crmManifestMutated: false,
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

const plannedLiveStatusFor = (row) => {
  const sourceId = cleanString(row.sourceId);
  if (sourceId === 'first_live_canonical_batch') return 'live_canonical_empty_created_2026-05-27';
  return 'live_canonical_empty_created_2026-05-28';
};

const rowByName = (rows = []) => new Map(rows.map((row) => [row.name, row]));

const buildBrandPromotionRows = (audit) => (audit.brandPromotionNeeded ?? []).map((row) => ({
  name: row.name,
  sourceId: row.sourceId,
  liveGroupId: row.liveGroupId,
  currentBrandStatus: row.currentBrandStatus ?? null,
  requestedBrandStatus: row.expectedBrandStatus ?? 'live_canonical',
  requestedBrandAction: 'promote_existing_live_empty_group_to_live_canonical_in_brand_dictionary',
  evidenceBasis: 'approved_empty_group_execution_receipt',
  allowsLiveMailerLiteChanges: false,
}));

const buildCrmManifestPatchRows = (audit) => {
  const consolidated = rowByName(audit.consolidatedRows ?? []);
  return (audit.crmManifestRefreshNeeded ?? []).map((row) => {
    const source = consolidated.get(row.name);
    return {
      name: row.name,
      sourceId: row.sourceId,
      liveGroupId: row.liveGroupId,
      currentCrmManifestLiveGroupId: row.currentCrmManifestLiveGroupId ?? null,
      currentCrmManifestLiveStatus: row.currentCrmManifestLiveStatus ?? null,
      requestedCrmManifestLiveGroupId: row.liveGroupId,
      requestedCrmManifestLiveStatus: plannedLiveStatusFor(row),
      operation: 'set_liveGroupId_and_liveStatus_from_approved_execution_receipt',
      layer: source?.brandLayer ?? null,
      brandStatusAtAuditTime: source?.brandStatus ?? null,
      safeToApplyBeforeBrandLiveCanonical: false,
      reasonToHoldApply: source?.brandStatus === 'live_canonical'
        ? null
        : 'Brand dictionary has not yet promoted this row to live_canonical.',
    };
  });
};

const buildOperatorHandoff = ({ brandPromotionRows, crmManifestPatchRows }) => [
  'Brand/Mantis: decide whether these existing empty MailerLite groups should be promoted to live_canonical in the Brand dictionary, renamed, or rejected.',
  'CRM: do not refresh the operating manifest as canonical until Brand has made that semantic decision.',
  `Brand rows needing decision: ${brandPromotionRows.length}.`,
  `CRM manifest patch rows prepared: ${crmManifestPatchRows.length}.`,
  'This packet is evidence and patch planning only; it is not approval for MailerLite, Shopify, CRM live APIs, subscribers, workflows, sends, ledgers, cards, scoring or Fact Store.',
].join('\n');

const buildTaxonomyRefreshHandoff = ({
  taxonomyConsolidationAudit,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const brandPromotionRows = buildBrandPromotionRows(taxonomyConsolidationAudit);
  const crmManifestPatchRows = buildCrmManifestPatchRows(taxonomyConsolidationAudit);
  const driftCount = brandPromotionRows.length + crmManifestPatchRows.length;
  const ready = taxonomyConsolidationAudit?.status
    === 'taxonomy_consolidation_audit_ready_with_local_dictionary_drift_no_live_changes';
  const complete = taxonomyConsolidationAudit?.status === 'taxonomy_receipts_consolidated_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_refresh_handoff',
    generatedAt,
    ok: Boolean(ready || complete),
    status: driftCount > 0
      ? 'taxonomy_refresh_handoff_ready_no_live_changes'
      : 'taxonomy_refresh_handoff_not_needed_no_live_changes',
    executiveSummary: {
      sourceAuditStatus: taxonomyConsolidationAudit?.status ?? null,
      liveEvidenceGroupCount: taxonomyConsolidationAudit?.executiveSummary?.liveEvidenceGroupCount ?? null,
      brandPromotionDecisionCount: brandPromotionRows.length,
      crmManifestPatchCount: crmManifestPatchRows.length,
      handoffItemCount: driftCount,
      allBrandRowsAlreadyLiveCanonical: brandPromotionRows.length === 0,
      allCrmManifestRowsAlreadyRefreshed: crmManifestPatchRows.length === 0,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: driftCount > 0
        ? 'route_taxonomy_handoff_to_brand_and_crm_for_semantic_decision_no_live_changes'
        : 'rerun_taxonomy_consolidation_audit_before_any_future_live_use',
    },
    brandPromotionRows,
    crmManifestPatchRows,
    decisionSequence: [
      {
        order: 1,
        actor: 'Brand Hub',
        action: 'promote_rename_or_reject_each_row_semantically',
        liveMutationAllowed: false,
      },
      {
        order: 2,
        actor: 'CRM',
        action: 'refresh_local_manifest_cache_only_after_brand_decision',
        liveMutationAllowed: false,
      },
      {
        order: 3,
        actor: 'Codex/Mantis',
        action: 'rerun_taxonomy_consolidation_audit_and_regenerate_runbook_goal_audit_validation_receipt',
        liveMutationAllowed: false,
      },
    ],
    exactHandoffPrompts: {
      brand: [
        'Mantis/Brand: revisa estas filas de grupos MailerLite ya creados vacios por aprobaciones explicitas previas.',
        'Decide por cada fila si Brand la promueve a live_canonical, la renombra o la rechaza.',
        'No autorices desde esta decision ningun cambio vivo en MailerLite, subscribers, workflows, envios, Shopify, CRM, ledgers, cards, scoring ni Fact Store.',
      ].join(' '),
      crm: [
        'CRM: prepara el refresh del manifest local usando los liveGroupId de los recibos aprobados.',
        'No apliques la marca canonica final hasta que Brand haya promovido o resuelto cada fila.',
        'Despues de aplicar, rerunear taxonomy consolidation audit, runbook, goal audit y validation receipt.',
      ].join(' '),
    },
    forbiddenInterpretations: [
      'Existing empty group does not imply subscriber membership.',
      'Delivered does not imply opened, read, clicked, liked, interested, scored or purchased.',
      'Source does not imply consent, purchase or CRM readiness.',
      'Brand live_canonical promotion is a semantic dictionary decision, not permission to send or mutate workflows.',
      'CRM manifest refresh is an operating-cache update, not a live CRM API write.',
    ],
    operatorHandoff: buildOperatorHandoff({ brandPromotionRows, crmManifestPatchRows }),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderBrandRows = (rows) => rows.length
  ? rows.map((row) => `| \`${row.name}\` | ${row.sourceId} | \`${row.currentBrandStatus ?? 'missing'}\` | \`${row.requestedBrandStatus}\` | ${row.liveGroupId} |`).join('\n')
  : '| none | | | | |';

const renderCrmRows = (rows) => rows.length
  ? rows.map((row) => `| \`${row.name}\` | ${row.sourceId} | ${row.liveGroupId} | \`${row.currentCrmManifestLiveStatus ?? 'missing'}\` | \`${row.requestedCrmManifestLiveStatus}\` | ${row.safeToApplyBeforeBrandLiveCanonical} |`).join('\n')
  : '| none | | | | | |';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Taxonomy Refresh Handoff',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Summary',
  '',
  `- Source audit: ${report.executiveSummary.sourceAuditStatus}`,
  `- Live evidence groups: ${report.executiveSummary.liveEvidenceGroupCount ?? 'unknown'}`,
  `- Brand promotion decisions: ${report.executiveSummary.brandPromotionDecisionCount}`,
  `- CRM manifest patch rows: ${report.executiveSummary.crmManifestPatchCount}`,
  `- Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `- Can apply Brand dictionary patch now: ${report.executiveSummary.canApplyBrandDictionaryPatchNow}`,
  `- Can apply CRM manifest patch now: ${report.executiveSummary.canApplyCrmManifestPatchNow}`,
  `- Open live mutation gates: ${report.executiveSummary.openLiveMutationGateCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Brand Promotion Decision Rows',
  '',
  '| Nombre de grupo | Source | Estado actual Brand | Estado pedido | liveGroupId |',
  '|---|---|---|---|---|',
  renderBrandRows(report.brandPromotionRows),
  '',
  '## CRM Manifest Patch Rows',
  '',
  '| Nombre de grupo | Source | liveGroupId | liveStatus actual | liveStatus pedido | Apply before Brand canonical |',
  '|---|---|---|---|---|---|',
  renderCrmRows(report.crmManifestPatchRows),
  '',
  '## Decision Sequence',
  '',
  renderList(report.decisionSequence.map((item) => `${item.order}. ${item.actor}: ${item.action}; liveMutationAllowed=${item.liveMutationAllowed}`)),
  '',
  '## Exact Handoff Prompts',
  '',
  `Brand: ${report.exactHandoffPrompts.brand}`,
  '',
  `CRM: ${report.exactHandoffPrompts.crm}`,
  '',
  '## Forbidden Interpretations',
  '',
  renderList(report.forbiddenInterpretations),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Brand dictionary mutated: ${report.safety.brandDictionaryMutated}`,
  `- CRM manifest mutated: ${report.safety.crmManifestMutated}`,
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

const buildTaxonomyRefreshHandoffFromFiles = async (options) => {
  const [taxonomyConsolidationAudit, sourceDigests] = await Promise.all([
    readJson(options.taxonomyConsolidationAudit),
    Promise.all([
      digestFor(options.taxonomyConsolidationAudit, 'taxonomy consolidation audit source for Brand and CRM refresh handoff'),
      digestFor(options.brandDictionary, 'Brand dictionary authority consulted for target path and hash only'),
      digestFor(options.crmManifest, 'CRM manifest authority consulted for target path and hash only'),
    ]),
  ]);
  return buildTaxonomyRefreshHandoff({ taxonomyConsolidationAudit, sourceDigests });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildTaxonomyRefreshHandoffFromFiles(options);
  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    brandPromotionDecisionCount: report.executiveSummary.brandPromotionDecisionCount,
    crmManifestPatchCount: report.executiveSummary.crmManifestPatchCount,
    canAskApprovalNow: report.executiveSummary.canAskApprovalNow,
    canApplyBrandDictionaryPatchNow: report.executiveSummary.canApplyBrandDictionaryPatchNow,
    canApplyCrmManifestPatchNow: report.executiveSummary.canApplyCrmManifestPatchNow,
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
  buildTaxonomyRefreshHandoff,
  buildTaxonomyRefreshHandoffFromFiles,
  renderMarkdown,
};
