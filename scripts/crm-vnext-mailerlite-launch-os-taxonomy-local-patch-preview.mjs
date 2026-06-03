#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-local-patch-preview-2026-06-03';
const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_TAXONOMY_DECISION_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_current_2026-06-03.json';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CRM_MANIFEST = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_local_patch_preview_current_2026-06-03.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_local_patch_preview_current_2026-06-03.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-local-patch-preview.mjs [options]

Options:
  --taxonomy-refresh-handoff <path> Taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --taxonomy-decision-intake <path> Decision intake JSON. Defaults to ${DEFAULT_TAXONOMY_DECISION_INTAKE}
  --brand-dictionary <path>        Brand MailerLite group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --crm-manifest <path>            CRM receipt taxonomy manifest. Defaults to ${DEFAULT_CRM_MANIFEST}
  --out <path>                     Write JSON preview. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown preview. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Local-only patch preview for accepted Brand/CRM taxonomy refresh decisions. It
does not apply patches, edit files, open UI, call MailerLite/Shopify/CRM APIs,
read subscribers, mutate groups/workflows/cards/scoring/ledgers/Fact Store, or
grant live approval.`;

const parseArgs = (argv) => {
  const options = {
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    taxonomyDecisionIntake: DEFAULT_TAXONOMY_DECISION_INTAKE,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    crmManifest: DEFAULT_CRM_MANIFEST,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--taxonomy-decision-intake') options.taxonomyDecisionIntake = argv[++index];
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

const normalizeName = (value) =>
  cleanString(value)?.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim() ?? null;

const stripBackticks = (value) => cleanString(value)?.replace(/^`|`$/g, '') ?? null;
const tick = (value) => `\`${cleanString(value) ?? ''}\``;

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));
const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const digestForText = ({ path, text, consultedFor }) => ({
  path: resolve(path),
  present: true,
  chars: text.length,
  sha256: sha256(text),
  consultedFor,
});

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  previewOnly: true,
  brandDictionaryMutated: false,
  crmManifestMutated: false,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
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
  liveApprovalGrantedByPreview: false,
});

const parsePipeRow = (line) => line
  .trim()
  .replace(/^\|/, '')
  .replace(/\|$/, '')
  .split('|')
  .map((cell) => cell.trim());

const isSeparatorRow = (cells) => cells.every((cell) => /^:?-{3,}:?$/.test(cell));

const renderPipeRow = (cells) => `| ${cells.join(' | ')} |`;

const parseBrandDictionaryRows = (markdown) => {
  const rows = [];
  let headers = null;
  const lines = markdown.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
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
    const nameIndex = headers.indexOf('nombre de grupo');
    const statusIndex = headers.indexOf('estado');
    if (nameIndex === -1 || statusIndex === -1) continue;
    const name = stripBackticks(cells[nameIndex]);
    if (!name || !name.includes('CC ·')) continue;
    const row = Object.fromEntries(headers.map((header, cellIndex) => [header, cells[cellIndex] ?? '']));
    rows.push({
      name,
      normalizedName: normalizeName(name),
      status: stripBackticks(cells[statusIndex]) ?? null,
      layer: stripBackticks(row.capa) ?? null,
      significance: stripBackticks(row.significado) ?? null,
      primaryUse: stripBackticks(row['uso principal'] ?? row.uso) ?? null,
      crmMapping: stripBackticks(row['crm mapping']) ?? null,
      contentId: stripBackticks(row.content_id) ?? null,
      lineNumber: index + 1,
      lineText: line,
      cells,
      headers,
      nameIndex,
      statusIndex,
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
  return {
    manifest,
    rows: (manifest.groups ?? []).map((group, index) => ({
      ...group,
      index,
      normalizedName: normalizeName(group.name),
    })),
  };
};

const sourceDigestMatch = ({ handoff, path, sha }) => {
  const digest = (handoff?.sourceDigests ?? []).find((entry) => resolve(entry.path) === resolve(path));
  if (!digest?.sha256) return null;
  return digest.sha256 === sha;
};

const receiptLabelFor = (sourceId) => {
  if (sourceId === 'first_live_canonical_batch') return 'first live canonical batch';
  if (sourceId === 'onboarding_v2_empty_groups') return 'Onboarding v2 empty-groups receipt';
  if (sourceId === 'mini_launch_empty_groups') return 'mini-launch empty-groups receipt';
  return sourceId ?? 'approved empty-group receipt';
};

const buildBrandPatchPreview = ({ handoff, decisionIntake, brandDictionaryMarkdown }) => {
  const rows = parseBrandDictionaryRows(brandDictionaryMarkdown);
  const rowByName = new Map(rows.map((row) => [row.normalizedName, row]));
  const handoffByName = new Map((handoff.brandPromotionRows ?? []).map((row) => [normalizeName(row.name), row]));

  return (decisionIntake.brandDecisionState?.decisions ?? []).map((decision) => {
    const normalizedName = normalizeName(decision.name);
    const dictionaryRow = rowByName.get(normalizedName);
    const handoffRow = handoffByName.get(normalizedName);
    const proposedCells = dictionaryRow ? [...dictionaryRow.cells] : [];
    if (dictionaryRow) proposedCells[dictionaryRow.statusIndex] = tick('live_canonical');
    return {
      name: decision.name,
      sourceId: decision.sourceId ?? handoffRow?.sourceId ?? null,
      liveGroupId: decision.liveGroupId ?? handoffRow?.liveGroupId ?? null,
      decision: decision.decision,
      accepted: decision.accepted === true,
      currentStatus: dictionaryRow?.status ?? null,
      proposedStatus: 'live_canonical',
      statusChangeNeeded: dictionaryRow?.status !== 'live_canonical',
      targetFoundInBrandDictionary: Boolean(dictionaryRow),
      dictionaryLineNumber: dictionaryRow?.lineNumber ?? null,
      currentLineText: dictionaryRow?.lineText ?? null,
      proposedLineText: dictionaryRow ? renderPipeRow(proposedCells) : null,
      verificationLineToAdd: `- ${tick(decision.name)}: ${tick(`mailerLiteGroupId=${decision.liveGroupId ?? handoffRow?.liveGroupId ?? 'missing'}`)}, ${tick('estado=live_canonical')}. Creado vacio por ${receiptLabelFor(decision.sourceId ?? handoffRow?.sourceId)}; no asignar subscribers sin gate separado.`,
      applyNow: false,
      liveMutationAllowed: false,
      issues: [
        ...(decision.decision === 'promote_to_live_canonical' ? [] : [`unsupported_brand_decision_for_patch_preview:${decision.decision ?? 'missing'}`]),
        ...(dictionaryRow ? [] : ['missing_from_brand_dictionary']),
        ...(decision.liveMutationAllowed === true ? ['liveMutationAllowed_must_be_false'] : []),
      ],
    };
  });
};

const inferObjectAndDetail = (name) => {
  const parts = cleanString(name)?.split(' · ') ?? [];
  return {
    layer: parts[1] ?? null,
    object: parts[2] ?? null,
    detail: parts.slice(3).join(' · ') || null,
  };
};

const contentIdFromMapping = (mapping) => {
  const text = cleanString(mapping);
  if (!text) return null;
  const match = text.match(/content\.(?:delivered|sent)=([^;]+)/);
  return match?.[1]?.trim() ?? null;
};

const buildManifestEntryDraft = ({ decision, handoffRow, brandRow, requestedLiveGroupId, requestedLiveStatus }) => {
  const inferred = inferObjectAndDetail(decision.name);
  return {
    name: decision.name,
    liveGroupId: requestedLiveGroupId,
    liveStatus: requestedLiveStatus,
    layer: brandRow?.layer ?? handoffRow?.layer ?? inferred.layer,
    object: inferred.object,
    ...(inferred.detail ? { detail: inferred.detail } : {}),
    ...(brandRow?.contentId || contentIdFromMapping(brandRow?.crmMapping)
      ? { contentId: brandRow?.contentId ?? contentIdFromMapping(brandRow?.crmMapping) }
      : {}),
    purpose: brandRow?.significance ?? brandRow?.primaryUse ?? 'CRM-side operating receipt mirrored from Brand dictionary and approved empty-group execution receipt.',
    relatedHistoricGroups: [],
    relatedWorkflows: [],
    safeToCreateEmpty: true,
    safeToUseInDisabledPilotAfterQa: false,
    pilotPriority: 4,
  };
};

const buildCrmManifestPatchPreview = ({ handoff, decisionIntake, brandDictionaryMarkdown, crmManifestMarkdown }) => {
  const { rows } = parseCrmManifestRows(crmManifestMarkdown);
  const rowByName = new Map(rows.map((row) => [row.normalizedName, row]));
  const handoffByName = new Map((handoff.crmManifestPatchRows ?? []).map((row) => [normalizeName(row.name), row]));
  const brandRows = parseBrandDictionaryRows(brandDictionaryMarkdown);
  const brandByName = new Map(brandRows.map((row) => [row.normalizedName, row]));

  return (decisionIntake.crmDecisionState?.patchRows ?? []).map((decision) => {
    const normalizedName = normalizeName(decision.name);
    const manifestRow = rowByName.get(normalizedName);
    const handoffRow = handoffByName.get(normalizedName);
    const brandRow = brandByName.get(normalizedName);
    const requestedLiveGroupId = decision.liveGroupId ?? handoffRow?.requestedCrmManifestLiveGroupId ?? handoffRow?.liveGroupId ?? null;
    const requestedLiveStatus = handoffRow?.requestedCrmManifestLiveStatus ?? 'live_canonical_empty_created_2026-05-28';
    const proposedGroup = manifestRow ? {
      ...manifestRow,
      liveGroupId: requestedLiveGroupId,
      liveStatus: requestedLiveStatus,
    } : buildManifestEntryDraft({
      decision,
      handoffRow,
      brandRow,
      requestedLiveGroupId,
      requestedLiveStatus,
    });
    if (proposedGroup) {
      delete proposedGroup.index;
      delete proposedGroup.normalizedName;
    }
    return {
      name: decision.name,
      liveGroupId: requestedLiveGroupId,
      decision: decision.decision,
      accepted: decision.accepted === true,
      targetFoundInCrmManifest: Boolean(manifestRow),
      manifestGroupIndex: manifestRow?.index ?? null,
      currentLiveGroupId: manifestRow?.liveGroupId ?? null,
      proposedLiveGroupId: requestedLiveGroupId,
      currentLiveStatus: manifestRow?.liveStatus ?? null,
      proposedLiveStatus: requestedLiveStatus,
      liveGroupIdChangeNeeded: manifestRow?.liveGroupId !== requestedLiveGroupId,
      liveStatusChangeNeeded: manifestRow?.liveStatus !== requestedLiveStatus,
      manifestEntryAddNeeded: !manifestRow,
      jsonPatchOperations: manifestRow ? [
        {
          op: manifestRow.liveGroupId ? 'replace' : 'add',
          path: `/groups/${manifestRow.index}/liveGroupId`,
          value: requestedLiveGroupId,
        },
        {
          op: manifestRow.liveStatus ? 'replace' : 'add',
          path: `/groups/${manifestRow.index}/liveStatus`,
          value: requestedLiveStatus,
        },
      ] : [
        {
          op: 'add',
          path: '/groups/-',
          value: proposedGroup,
        },
      ],
      proposedGroup,
      applyNow: false,
      liveMutationAllowed: false,
      issues: [
        ...(decision.decision === 'prepare_local_manifest_patch_after_brand' ? [] : [`unsupported_crm_decision_for_patch_preview:${decision.decision ?? 'missing'}`]),
        ...(decision.applyNow === false ? [] : ['applyNow_must_be_false']),
        ...(requestedLiveGroupId ? [] : ['requested_live_group_id_missing']),
        ...(brandRow ? [] : ['missing_from_brand_dictionary_for_manifest_entry_draft']),
      ],
    };
  });
};

const buildTaxonomyLocalPatchPreview = ({
  taxonomyRefreshHandoff,
  taxonomyDecisionIntake,
  brandDictionaryMarkdown,
  crmManifestMarkdown,
  paths,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const readyIntake = taxonomyDecisionIntake?.status === 'taxonomy_refresh_decision_intake_ready_for_local_patch_preview_no_live_changes'
    && taxonomyDecisionIntake?.executiveSummary?.readyForLocalPatchPreview === true;
  const brandPatchPreview = buildBrandPatchPreview({
    handoff: taxonomyRefreshHandoff,
    decisionIntake: taxonomyDecisionIntake,
    brandDictionaryMarkdown,
  });
  const crmManifestPatchPreview = buildCrmManifestPatchPreview({
    handoff: taxonomyRefreshHandoff,
    decisionIntake: taxonomyDecisionIntake,
    brandDictionaryMarkdown,
    crmManifestMarkdown,
  });
  const brandIssues = brandPatchPreview.flatMap((row) => row.issues.map((issue) => `brand:${row.name}:${issue}`));
  const crmIssues = crmManifestPatchPreview.flatMap((row) => row.issues.map((issue) => `crm:${row.name}:${issue}`));
  const sourceWarnings = sourceDigests
    .filter((digest) => digest.matchesHandoffSourceDigest === false)
    .map((digest) => `source_digest_changed_since_handoff:${digest.path}`);
  const blockers = [
    ...(readyIntake ? [] : ['decision_intake_not_ready_for_local_patch_preview']),
    ...brandIssues,
    ...crmIssues,
  ];
  const previewReady = blockers.length === 0;
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_patch_preview',
    generatedAt,
    ok: previewReady,
    status: previewReady
      ? 'taxonomy_local_patch_preview_ready_no_live_changes'
      : 'taxonomy_local_patch_preview_blocked_no_live_changes',
    executiveSummary: {
      taxonomyRefreshHandoffStatus: taxonomyRefreshHandoff?.status ?? null,
      taxonomyDecisionIntakeStatus: taxonomyDecisionIntake?.status ?? null,
      readyForLocalPatchPreview: previewReady,
      brandPatchPreviewRowCount: brandPatchPreview.length,
      brandStatusChangeCount: brandPatchPreview.filter((row) => row.statusChangeNeeded).length,
      crmManifestPatchPreviewRowCount: crmManifestPatchPreview.length,
      crmManifestEntryAddCount: crmManifestPatchPreview.filter((row) => row.manifestEntryAddNeeded).length,
      crmLiveGroupIdChangeCount: crmManifestPatchPreview.filter((row) => row.liveGroupIdChangeNeeded).length,
      crmLiveStatusChangeCount: crmManifestPatchPreview.filter((row) => row.liveStatusChangeNeeded).length,
      blockerCount: blockers.length,
      warningCount: sourceWarnings.length,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: previewReady
        ? 'review_local_patch_preview_and_prepare_exact_apply_approval_phrase_only_if_wanted'
        : 'fix_local_patch_preview_blockers_without_live_changes',
    },
    targetPaths: {
      brandDictionary: resolve(paths.brandDictionary),
      crmManifest: resolve(paths.crmManifest),
    },
    brandPatchPreview,
    crmManifestPatchPreview,
    blockers,
    warnings: sourceWarnings,
    hardStops: [
      'This preview is not approval.',
      'Do not apply Brand dictionary or CRM manifest patches from this preview without a later exact approval.',
      'Do not call MailerLite, Shopify or CRM live APIs from this preview.',
      'Do not mutate subscribers, groups, workflows, sends, ledgers, cards, scoring or Fact Store.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderBrandRows = (rows = []) => rows.map((row) => [
  `- ${row.name}`,
  `  - Line: ${row.dictionaryLineNumber ?? 'missing'}`,
  `  - Status: ${row.currentStatus ?? 'missing'} -> ${row.proposedStatus}`,
  `  - Group ID: ${row.liveGroupId ?? 'missing'}`,
  `  - Apply now: ${row.applyNow}`,
].join('\n')).join('\n') || '- none';

const renderCrmRows = (rows = []) => rows.map((row) => [
  `- ${row.name}`,
  `  - Manifest group index: ${row.manifestGroupIndex ?? 'missing'}`,
  `  - liveGroupId: ${row.currentLiveGroupId ?? 'missing'} -> ${row.proposedLiveGroupId ?? 'missing'}`,
  `  - liveStatus: ${row.currentLiveStatus ?? 'missing'} -> ${row.proposedLiveStatus ?? 'missing'}`,
  `  - JSON operations: ${row.jsonPatchOperations.length}`,
  `  - Apply now: ${row.applyNow}`,
].join('\n')).join('\n') || '- none';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Taxonomy Local Patch Preview',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Summary',
  '',
  `- Handoff status: ${report.executiveSummary.taxonomyRefreshHandoffStatus}`,
  `- Decision intake status: ${report.executiveSummary.taxonomyDecisionIntakeStatus}`,
  `- Ready for local patch preview: ${report.executiveSummary.readyForLocalPatchPreview}`,
  `- Brand preview rows: ${report.executiveSummary.brandPatchPreviewRowCount}`,
  `- Brand status changes: ${report.executiveSummary.brandStatusChangeCount}`,
  `- CRM manifest preview rows: ${report.executiveSummary.crmManifestPatchPreviewRowCount}`,
  `- CRM manifest entries to add: ${report.executiveSummary.crmManifestEntryAddCount}`,
  `- CRM liveGroupId changes: ${report.executiveSummary.crmLiveGroupIdChangeCount}`,
  `- CRM liveStatus changes: ${report.executiveSummary.crmLiveStatusChangeCount}`,
  `- Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `- Can apply Brand dictionary patch now: ${report.executiveSummary.canApplyBrandDictionaryPatchNow}`,
  `- Can apply CRM manifest patch now: ${report.executiveSummary.canApplyCrmManifestPatchNow}`,
  `- Open live mutation gates: ${report.executiveSummary.openLiveMutationGateCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Targets',
  '',
  `- Brand dictionary: ${report.targetPaths.brandDictionary}`,
  `- CRM manifest: ${report.targetPaths.crmManifest}`,
  '',
  '## Brand Preview',
  '',
  renderBrandRows(report.brandPatchPreview),
  '',
  '## CRM Manifest Preview',
  '',
  renderCrmRows(report.crmManifestPatchPreview),
  '',
  '## Blockers',
  '',
  renderList(report.blockers),
  '',
  '## Warnings',
  '',
  renderList(report.warnings),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Preview only: ${report.safety.previewOnly}`,
  `- Brand dictionary mutated: ${report.safety.brandDictionaryMutated}`,
  `- CRM manifest mutated: ${report.safety.crmManifestMutated}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Group mutations performed: ${report.safety.groupMutationsPerformed}`,
  `- Workflow mutations performed: ${report.safety.workflowMutationsPerformed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  `- Live approval granted by preview: ${report.safety.liveApprovalGrantedByPreview}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildTaxonomyLocalPatchPreviewFromFiles = async (options) => {
  const [
    taxonomyRefreshHandoff,
    taxonomyDecisionIntake,
    brandDictionaryMarkdown,
    crmManifestMarkdown,
  ] = await Promise.all([
    readJson(options.taxonomyRefreshHandoff),
    readJson(options.taxonomyDecisionIntake),
    readText(options.brandDictionary),
    readText(options.crmManifest),
  ]);
  const brandDigest = digestForText({
    path: options.brandDictionary,
    text: brandDictionaryMarkdown,
    consultedFor: 'Brand dictionary current local target for patch preview',
  });
  const crmDigest = digestForText({
    path: options.crmManifest,
    text: crmManifestMarkdown,
    consultedFor: 'CRM manifest current local target for patch preview',
  });
  return buildTaxonomyLocalPatchPreview({
    taxonomyRefreshHandoff,
    taxonomyDecisionIntake,
    brandDictionaryMarkdown,
    crmManifestMarkdown,
    paths: options,
    sourceDigests: [
      {
        path: resolve(options.taxonomyRefreshHandoff),
        present: true,
        chars: JSON.stringify(taxonomyRefreshHandoff).length,
        sha256: sha256(JSON.stringify(taxonomyRefreshHandoff)),
        consultedFor: 'taxonomy refresh handoff rows',
      },
      {
        path: resolve(options.taxonomyDecisionIntake),
        present: true,
        chars: JSON.stringify(taxonomyDecisionIntake).length,
        sha256: sha256(JSON.stringify(taxonomyDecisionIntake)),
        consultedFor: 'accepted Brand/CRM decision intake',
      },
      {
        ...brandDigest,
        matchesHandoffSourceDigest: sourceDigestMatch({
          handoff: taxonomyRefreshHandoff,
          path: options.brandDictionary,
          sha: brandDigest.sha256,
        }),
      },
      {
        ...crmDigest,
        matchesHandoffSourceDigest: sourceDigestMatch({
          handoff: taxonomyRefreshHandoff,
          path: options.crmManifest,
          sha: crmDigest.sha256,
        }),
      },
    ],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildTaxonomyLocalPatchPreviewFromFiles(options);
  const jsonPath = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownPath = await writeText(options.markdownOut, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    out: jsonPath,
    markdownOut: markdownPath,
    summary: report.executiveSummary,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS taxonomy local patch preview failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildTaxonomyLocalPatchPreview,
  buildTaxonomyLocalPatchPreviewFromFiles,
  parseArgs,
  renderMarkdown,
};
