#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-refresh-decision-intake-2026-05-28';
const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_BRAND_DECISION_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_brand_decision_input_2026-05-28.json';
const DEFAULT_CRM_DECISION_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_crm_decision_input_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-decision-intake.mjs [options]

Options:
  --taxonomy-refresh-handoff <path> Taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --brand-decision-file <path>      Optional Brand decision JSON. Defaults to ${DEFAULT_BRAND_DECISION_FILE}
  --crm-decision-file <path>        Optional CRM decision JSON. Defaults to ${DEFAULT_CRM_DECISION_FILE}
  --out <path>                      Write JSON intake report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>             Write Markdown intake report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                            Show this help

Local-only Brand/CRM taxonomy refresh decision intake. It validates whether
Brand and CRM have resolved the semantic/cache boundary from the taxonomy
refresh handoff. It never edits Brand Hub or CRM manifest files, never opens UI,
never calls MailerLite/Shopify/CRM APIs, never reads subscribers, never mutates
groups/workflows/cards/scoring/ledgers/Fact Store, and never treats a decision
as live approval.`;

const parseArgs = (argv) => {
  const options = {
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    brandDecisionFile: DEFAULT_BRAND_DECISION_FILE,
    crmDecisionFile: DEFAULT_CRM_DECISION_FILE,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--brand-decision-file') options.brandDecisionFile = argv[++index];
    else if (arg === '--crm-decision-file') options.crmDecisionFile = argv[++index];
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

const readOptionalJson = async (path) => {
  try {
    const content = await readText(path);
    return {
      present: true,
      value: JSON.parse(content),
      chars: content.length,
      error: null,
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { present: false, value: null, chars: 0, error: null };
    if (error instanceof SyntaxError) return { present: true, value: null, chars: 0, error: `invalid_json:${error.message}` };
    return { present: false, value: null, chars: 0, error: error.message };
  }
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const digestFor = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    private: false,
    chars: content.length,
    sha256: sha256(content),
    consultedFor,
  };
};

const optionalSourceStatus = ({ path, read, consultedFor }) => ({
  path: resolve(path),
  present: read.present,
  private: false,
  chars: read.chars ?? 0,
  sha256: read.present && read.value ? sha256(JSON.stringify(read.value)) : null,
  error: read.error ?? null,
  consultedFor,
});

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  brandDictionaryMutated: false,
  crmManifestMutated: false,
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
  liveApprovalGrantedByIntake: false,
});

const unsafeHeaderReasons = (payload) => [
  ...(payload?.reviewMode === 'no_live_taxonomy_refresh_review' ? [] : ['reviewMode_must_be_no_live_taxonomy_refresh_review']),
  ...(payload?.liveApprovalGranted === false ? [] : ['liveApprovalGranted_must_be_false']),
  ...(payload?.executeNow === true ? ['executeNow_must_not_be_true'] : []),
  ...(payload?.applyNow === true ? ['applyNow_must_not_be_true'] : []),
  ...(payload?.publishNow === true ? ['publishNow_must_not_be_true'] : []),
  ...(payload?.sendNow === true ? ['sendNow_must_not_be_true'] : []),
  ...(payload?.mailerLiteMutationAllowed === true ? ['mailerLiteMutationAllowed_must_not_be_true'] : []),
  ...(payload?.workflowMutationAllowed === true ? ['workflowMutationAllowed_must_not_be_true'] : []),
  ...(payload?.subscriberMutationAllowed === true ? ['subscriberMutationAllowed_must_not_be_true'] : []),
];

const targetBrandRows = (handoff) => handoff?.brandPromotionRows ?? [];
const targetCrmRows = (handoff) => handoff?.crmManifestPatchRows ?? [];
const allowedBrandDecisions = new Set(['promote_to_live_canonical', 'rename', 'reject']);

const getDecisionRows = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload.brandDecisions)) return payload.brandDecisions;
  if (Array.isArray(payload.decisions)) return payload.decisions;
  if (Array.isArray(payload.rows)) return payload.rows;
  return [];
};

const buildBrandDecisionState = ({ handoff, read }) => {
  const targets = targetBrandRows(handoff);
  if (!read.present) {
    return {
      status: 'missing_no_live_changes',
      present: false,
      requiredDecisionCount: targets.length,
      suppliedDecisionCount: 0,
      acceptedDecisionCount: 0,
      promoteCount: 0,
      renameCount: 0,
      rejectCount: 0,
      allTargetsCovered: false,
      allTargetsPromoted: false,
      unsafe: false,
      blockers: ['brand_decision_file_missing'],
      unsafeReasons: [],
      decisions: [],
    };
  }
  if (read.error || !read.value) {
    return {
      status: 'invalid_json_no_live_changes',
      present: true,
      requiredDecisionCount: targets.length,
      suppliedDecisionCount: 0,
      acceptedDecisionCount: 0,
      promoteCount: 0,
      renameCount: 0,
      rejectCount: 0,
      allTargetsCovered: false,
      allTargetsPromoted: false,
      unsafe: false,
      blockers: [read.error ?? 'brand_decision_file_unreadable'],
      unsafeReasons: [],
      decisions: [],
    };
  }

  const unsafeReasons = unsafeHeaderReasons(read.value);
  const rows = getDecisionRows(read.value);
  const targetByName = new Map(targets.map((row) => [row.name, row]));
  const seen = new Set();
  const decisions = rows.map((row) => {
    const name = cleanString(row?.name);
    const decision = cleanString(row?.decision);
    const target = targetByName.get(name);
    const finalName = cleanString(row?.finalName);
    const issues = [
      ...(name ? [] : ['name_missing']),
      ...(target ? [] : ['unknown_group_name']),
      ...(target && cleanString(row?.liveGroupId) === String(target.liveGroupId) ? [] : ['liveGroupId_mismatch_or_missing']),
      ...(allowedBrandDecisions.has(decision) ? [] : ['decision_not_allowed']),
      ...(decision === 'rename' && !finalName ? ['rename_requires_finalName'] : []),
    ];
    if (name) seen.add(name);
    return {
      name,
      sourceId: target?.sourceId ?? null,
      liveGroupId: target?.liveGroupId ?? cleanString(row?.liveGroupId),
      decision,
      finalName,
      accepted: issues.length === 0,
      liveMutationAllowed: false,
      issues,
    };
  });
  const missingTargets = targets.filter((row) => !seen.has(row.name)).map((row) => row.name);
  const extraRows = decisions.filter((row) => row.issues.includes('unknown_group_name')).map((row) => row.name).filter(Boolean);
  const accepted = decisions.filter((row) => row.accepted);
  const promoteCount = accepted.filter((row) => row.decision === 'promote_to_live_canonical').length;
  const renameCount = accepted.filter((row) => row.decision === 'rename').length;
  const rejectCount = accepted.filter((row) => row.decision === 'reject').length;
  const blockers = [
    ...missingTargets.map((name) => `missing_brand_decision:${name}`),
    ...extraRows.map((name) => `extra_brand_decision:${name}`),
    ...decisions.flatMap((row) => row.issues.map((issue) => `row:${row.name ?? 'unknown'}:${issue}`)),
  ];
  const allTargetsCovered = missingTargets.length === 0 && decisions.length === targets.length && blockers.length === 0;
  const allTargetsPromoted = allTargetsCovered && promoteCount === targets.length;
  const unsafe = unsafeReasons.length > 0;
  return {
    status: unsafe
      ? 'unsafe_brand_decision_blocked_no_live_changes'
      : allTargetsCovered
        ? 'brand_decision_ready_no_live_changes'
        : 'brand_decision_incomplete_no_live_changes',
    present: true,
    requiredDecisionCount: targets.length,
    suppliedDecisionCount: decisions.length,
    acceptedDecisionCount: accepted.length,
    promoteCount,
    renameCount,
    rejectCount,
    allTargetsCovered,
    allTargetsPromoted,
    unsafe,
    blockers,
    unsafeReasons,
    decisions,
  };
};

const buildCrmDecisionState = ({ handoff, read }) => {
  const requiredPatchCount = targetCrmRows(handoff).length;
  if (!read.present) {
    return {
      status: 'missing_no_live_changes',
      present: false,
      requiredPatchCount,
      suppliedPatchCount: 0,
      manifestRefreshAccepted: false,
      applyOnlyAfterBrandLiveCanonical: null,
      localPatchOnly: null,
      ready: false,
      unsafe: false,
      blockers: ['crm_decision_file_missing'],
      unsafeReasons: [],
    };
  }
  if (read.error || !read.value) {
    return {
      status: 'invalid_json_no_live_changes',
      present: true,
      requiredPatchCount,
      suppliedPatchCount: 0,
      manifestRefreshAccepted: false,
      applyOnlyAfterBrandLiveCanonical: null,
      localPatchOnly: null,
      ready: false,
      unsafe: false,
      blockers: [read.error ?? 'crm_decision_file_unreadable'],
      unsafeReasons: [],
    };
  }

  const payload = read.value;
  const unsafeReasons = unsafeHeaderReasons(payload);
  const suppliedPatchCount = Number.isFinite(Number(payload.patchRowCount))
    ? Number(payload.patchRowCount)
    : Array.isArray(payload.patchRows)
      ? payload.patchRows.length
      : 0;
  const blockers = [
    ...(payload.manifestRefreshAccepted === true ? [] : ['manifestRefreshAccepted_must_be_true']),
    ...(payload.applyOnlyAfterBrandLiveCanonical === true ? [] : ['applyOnlyAfterBrandLiveCanonical_must_be_true']),
    ...(payload.localPatchOnly === true ? [] : ['localPatchOnly_must_be_true']),
    ...(suppliedPatchCount === requiredPatchCount ? [] : [`patchRowCount_mismatch:${suppliedPatchCount}_of_${requiredPatchCount}`]),
  ];
  const unsafe = unsafeReasons.length > 0;
  const ready = !unsafe && blockers.length === 0;
  return {
    status: unsafe
      ? 'unsafe_crm_decision_blocked_no_live_changes'
      : ready
        ? 'crm_decision_ready_no_live_changes'
        : 'crm_decision_incomplete_no_live_changes',
    present: true,
    requiredPatchCount,
    suppliedPatchCount,
    manifestRefreshAccepted: payload.manifestRefreshAccepted === true,
    applyOnlyAfterBrandLiveCanonical: payload.applyOnlyAfterBrandLiveCanonical ?? null,
    localPatchOnly: payload.localPatchOnly ?? null,
    ready,
    unsafe,
    blockers,
    unsafeReasons,
  };
};

const buildDecisionTemplate = (handoff) => ({
  brandDecisionTemplate: {
    reviewMode: 'no_live_taxonomy_refresh_review',
    liveApprovalGranted: false,
    brandDecisions: targetBrandRows(handoff).map((row) => ({
      name: row.name,
      liveGroupId: row.liveGroupId,
      decision: 'promote_to_live_canonical',
    })),
  },
  crmDecisionTemplate: {
    reviewMode: 'no_live_taxonomy_refresh_review',
    liveApprovalGranted: false,
    manifestRefreshAccepted: true,
    applyOnlyAfterBrandLiveCanonical: true,
    localPatchOnly: true,
    patchRowCount: targetCrmRows(handoff).length,
  },
});

const buildTaxonomyRefreshDecisionIntake = ({
  taxonomyRefreshHandoff,
  brandDecisionRead,
  crmDecisionRead,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const brandDecisionState = buildBrandDecisionState({ handoff: taxonomyRefreshHandoff, read: brandDecisionRead });
  const crmDecisionState = buildCrmDecisionState({ handoff: taxonomyRefreshHandoff, read: crmDecisionRead });
  const unsafe = brandDecisionState.unsafe || crmDecisionState.unsafe;
  const brandResolvedWithoutDirectPatch = brandDecisionState.renameCount > 0 || brandDecisionState.rejectCount > 0;
  const readyForLocalPatchPreview = !unsafe
    && brandDecisionState.allTargetsPromoted === true
    && crmDecisionState.ready === true;
  const status = unsafe
    ? 'taxonomy_refresh_decision_intake_blocked_unsafe_decision_no_live_changes'
    : readyForLocalPatchPreview
      ? 'taxonomy_refresh_decision_intake_ready_for_local_patch_preview_no_live_changes'
      : 'taxonomy_refresh_decision_intake_waiting_for_brand_crm_decisions_no_live_changes';
  const blockers = [
    ...brandDecisionState.blockers,
    ...crmDecisionState.blockers,
    ...(brandResolvedWithoutDirectPatch ? ['brand_decision_includes_rename_or_reject_requires_new_handoff'] : []),
  ];
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_refresh_decision_intake',
    generatedAt,
    ok: !unsafe,
    status,
    executiveSummary: {
      taxonomyRefreshHandoffStatus: taxonomyRefreshHandoff?.status ?? null,
      brandDecisionStatus: brandDecisionState.status,
      crmDecisionStatus: crmDecisionState.status,
      brandDecisionRowsNeeded: brandDecisionState.requiredDecisionCount,
      brandDecisionRowsPresent: brandDecisionState.suppliedDecisionCount,
      brandPromoteCount: brandDecisionState.promoteCount,
      brandRenameCount: brandDecisionState.renameCount,
      brandRejectCount: brandDecisionState.rejectCount,
      crmManifestPatchRowsNeeded: crmDecisionState.requiredPatchCount,
      crmManifestPatchRowsAccepted: crmDecisionState.suppliedPatchCount,
      readyForLocalPatchPreview,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: readyForLocalPatchPreview
        ? 'prepare_local_patch_preview_only_no_live_changes'
        : 'collect_brand_and_crm_taxonomy_decisions_without_live_approval',
    },
    brandDecisionState,
    crmDecisionState,
    blockers,
    unsafeReasons: [
      ...brandDecisionState.unsafeReasons.map((reason) => `brand:${reason}`),
      ...crmDecisionState.unsafeReasons.map((reason) => `crm:${reason}`),
    ],
    decisionTemplate: buildDecisionTemplate(taxonomyRefreshHandoff),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Launch OS - Taxonomy Refresh Decision Intake',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Summary',
  '',
  `- Handoff status: ${report.executiveSummary.taxonomyRefreshHandoffStatus}`,
  `- Brand decision status: ${report.executiveSummary.brandDecisionStatus}`,
  `- CRM decision status: ${report.executiveSummary.crmDecisionStatus}`,
  `- Brand rows present: ${report.executiveSummary.brandDecisionRowsPresent}/${report.executiveSummary.brandDecisionRowsNeeded}`,
  `- CRM patch rows accepted: ${report.executiveSummary.crmManifestPatchRowsAccepted}/${report.executiveSummary.crmManifestPatchRowsNeeded}`,
  `- Ready for local patch preview: ${report.executiveSummary.readyForLocalPatchPreview}`,
  `- Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
  `- Can apply Brand dictionary patch now: ${report.executiveSummary.canApplyBrandDictionaryPatchNow}`,
  `- Can apply CRM manifest patch now: ${report.executiveSummary.canApplyCrmManifestPatchNow}`,
  `- Open live mutation gates: ${report.executiveSummary.openLiveMutationGateCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Blockers',
  '',
  renderList(report.blockers),
  '',
  '## Unsafe Reasons',
  '',
  renderList(report.unsafeReasons),
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
  `- Live approval granted by intake: ${report.safety.liveApprovalGrantedByIntake}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildTaxonomyRefreshDecisionIntakeFromFiles = async (options) => {
  const [taxonomyRefreshHandoff, brandDecisionRead, crmDecisionRead, handoffDigest] = await Promise.all([
    readJson(options.taxonomyRefreshHandoff),
    readOptionalJson(options.brandDecisionFile),
    readOptionalJson(options.crmDecisionFile),
    digestFor(options.taxonomyRefreshHandoff, 'taxonomy refresh handoff rows needing Brand and CRM decision intake'),
  ]);
  const sourceDigests = [
    handoffDigest,
    optionalSourceStatus({
      path: options.brandDecisionFile,
      read: brandDecisionRead,
      consultedFor: 'optional Brand taxonomy refresh decision input',
    }),
    optionalSourceStatus({
      path: options.crmDecisionFile,
      read: crmDecisionRead,
      consultedFor: 'optional CRM taxonomy refresh decision input',
    }),
  ];
  return buildTaxonomyRefreshDecisionIntake({
    taxonomyRefreshHandoff,
    brandDecisionRead,
    crmDecisionRead,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildTaxonomyRefreshDecisionIntakeFromFiles(options);
  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));
  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    brandDecisionRowsPresent: report.executiveSummary.brandDecisionRowsPresent,
    brandDecisionRowsNeeded: report.executiveSummary.brandDecisionRowsNeeded,
    crmManifestPatchRowsAccepted: report.executiveSummary.crmManifestPatchRowsAccepted,
    crmManifestPatchRowsNeeded: report.executiveSummary.crmManifestPatchRowsNeeded,
    readyForLocalPatchPreview: report.executiveSummary.readyForLocalPatchPreview,
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
  buildBrandDecisionState,
  buildCrmDecisionState,
  buildTaxonomyRefreshDecisionIntake,
  buildTaxonomyRefreshDecisionIntakeFromFiles,
  parseArgs,
  renderMarkdown,
};
