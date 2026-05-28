#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-workspace-2026-05-28';
const RESPONSE_SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-2026-05-28';
const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_RESPONSES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_responses_2026-05-28';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.md';

const ACTORS = ['brand', 'crm'];
const BRAND_DECISIONS = new Set(['promote_to_live_canonical', 'rename', 'reject']);
const CRM_DECISIONS = new Set(['prepare_local_manifest_patch_after_brand', 'hold_until_brand_live_canonical', 'reject_patch']);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-workspace.mjs [options]

Options:
  --taxonomy-refresh-handoff <path> Launch OS taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --responses-dir <path>           Response workspace directory. Defaults to ${DEFAULT_RESPONSES_DIR}
  --overwrite-pending              Overwrite existing *.pending.json working copies
  --no-write-pending               Do not write pending working copies; only report status
  --out <path>                     Write JSON response workspace. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown response workspace. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Local-only workspace for Brand and CRM taxonomy-refresh responses. It writes
pending working copies, validates final response files when they exist, and
keeps all live/application gates closed. It never edits Brand dictionary or CRM
manifest files, opens UI, calls MailerLite/Shopify/CRM APIs, reads subscribers,
mutates groups/workflows/cards/scoring/ledgers/Fact Store, or sends messages.`;

const parseArgs = (argv) => {
  const options = {
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    responsesDir: DEFAULT_RESPONSES_DIR,
    overwritePending: false,
    writePending: true,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--responses-dir') options.responsesDir = argv[++index];
    else if (arg === '--overwrite-pending') options.overwritePending = true;
    else if (arg === '--no-write-pending') options.writePending = false;
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readJsonIfPresent = async (path) => {
  try {
    return {
      exists: true,
      value: JSON.parse(await readFile(resolve(path), 'utf8')),
      error: null,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        exists: false,
        value: null,
        error: null,
      };
    }
    return {
      exists: true,
      value: null,
      error: error.message,
    };
  }
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  return fullPath;
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
  return fullPath;
};

const sourceDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const pendingPathFor = (responsesDir, actor) => resolve(responsesDir, `${actor}_taxonomy_refresh_response.pending.json`);
const finalPathFor = (responsesDir, actor) => resolve(responsesDir, `${actor}_taxonomy_refresh_response.json`);

const buildSafety = () => ({
  localOnly: true,
  filesWrittenOnly: true,
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
});

const buildBrandTemplate = ({ handoff, finalResponsePath, generatedAt }) => ({
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  actor: 'brand',
  reviewMode: 'no_live_taxonomy_refresh',
  liveApprovalGranted: false,
  sourceHandoffStatus: handoff.status,
  sourceHandoffGeneratedAt: handoff.generatedAt,
  decisionScope: 'brand_dictionary_semantic_status_only',
  decisions: (handoff.brandPromotionRows ?? []).map((row) => ({
    name: row.name,
    liveGroupId: row.liveGroupId,
    currentBrandStatus: row.currentBrandStatus ?? null,
    requestedBrandStatus: row.requestedBrandStatus ?? 'live_canonical',
    decision: 'pending',
    finalName: row.name,
    finalBrandStatus: null,
    notes: [],
  })),
  blockers: [],
  nextSafeStep: null,
  safety: buildSafety(),
  workspaceStatus: 'pending_working_copy_not_final_response',
  workspaceMeta: {
    generatedAt,
    finalResponsePath,
    pendingFileIsNotAcceptedByWorkspace: true,
  },
});

const buildCrmTemplate = ({ handoff, finalResponsePath, generatedAt }) => ({
  schemaVersion: RESPONSE_SCHEMA_VERSION,
  actor: 'crm',
  reviewMode: 'no_live_taxonomy_refresh',
  liveApprovalGranted: false,
  sourceHandoffStatus: handoff.status,
  sourceHandoffGeneratedAt: handoff.generatedAt,
  decisionScope: 'crm_manifest_local_cache_patch_planning_only',
  canApplyCrmManifestPatchNow: false,
  patchRows: (handoff.crmManifestPatchRows ?? []).map((row) => ({
    name: row.name,
    liveGroupId: row.liveGroupId,
    currentCrmManifestLiveGroupId: row.currentCrmManifestLiveGroupId ?? null,
    requestedCrmManifestLiveGroupId: row.requestedCrmManifestLiveGroupId ?? row.liveGroupId,
    currentCrmManifestLiveStatus: row.currentCrmManifestLiveStatus ?? null,
    requestedCrmManifestLiveStatus: row.requestedCrmManifestLiveStatus,
    decision: 'pending',
    applyNow: false,
    reasonToHoldApply: row.reasonToHoldApply ?? 'Brand dictionary has not yet confirmed this row as final canonical.',
    notes: [],
  })),
  blockers: [],
  nextSafeStep: null,
  safety: buildSafety(),
  workspaceStatus: 'pending_working_copy_not_final_response',
  workspaceMeta: {
    generatedAt,
    finalResponsePath,
    pendingFileIsNotAcceptedByWorkspace: true,
  },
});

const buildTemplates = ({ handoff, responsesDir, generatedAt }) => ({
  brand: buildBrandTemplate({
    handoff,
    finalResponsePath: finalPathFor(responsesDir, 'brand'),
    generatedAt,
  }),
  crm: buildCrmTemplate({
    handoff,
    finalResponsePath: finalPathFor(responsesDir, 'crm'),
    generatedAt,
  }),
});

const writePendingCopy = async ({ path, value, overwrite }) => {
  const existing = await readJsonIfPresent(path);
  if (existing.exists && !overwrite) {
    return {
      path: resolve(path),
      written: false,
      existedBefore: true,
      preservedExisting: true,
      error: existing.error,
    };
  }
  await writeJson(path, value);
  return {
    path: resolve(path),
    written: true,
    existedBefore: existing.exists,
    preservedExisting: false,
    error: null,
  };
};

const baseResponseProblems = ({ actor, response }) => {
  const problems = [];
  if (response?.schemaVersion !== RESPONSE_SCHEMA_VERSION) problems.push('schema_version_mismatch');
  if (response?.actor !== actor) problems.push('actor_mismatch');
  if (response?.reviewMode !== 'no_live_taxonomy_refresh') problems.push('review_mode_must_be_no_live_taxonomy_refresh');
  if (response?.liveApprovalGranted !== false) problems.push('live_approval_must_remain_false');
  const safety = response?.safety ?? {};
  for (const key of [
    'brandDictionaryMutated',
    'crmManifestMutated',
    'mailerLiteApiCalled',
    'shopifyApiCalled',
    'crmLiveApiCalled',
    'subscribersRead',
    'groupMutationsPerformed',
    'workflowMutationsPerformed',
    'sendsPerformed',
    'signalLedgerAppendPerformed',
    'crmCardMutationsPerformed',
    'crmScoreMutationsPerformed',
    'factStoreWritePerformed',
    'outboundPerformed',
    'tokensPrinted',
  ]) {
    if (safety[key] !== false) problems.push(`safety_${key}_must_be_false`);
  }
  return problems;
};

const namesFrom = (rows, key = 'name') => new Set((rows ?? []).map((row) => row?.[key]).filter(Boolean));

const missingNames = ({ expectedRows, actualRows }) => {
  const actual = namesFrom(actualRows);
  return (expectedRows ?? [])
    .map((row) => row.name)
    .filter((name) => !actual.has(name));
};

const validateBrandResponse = ({ response, template }) => {
  const problems = baseResponseProblems({ actor: 'brand', response });
  const decisions = response?.decisions ?? [];
  const expectedRows = template.decisions ?? [];

  if (!Array.isArray(decisions)) problems.push('decisions_must_be_array');
  else {
    if (decisions.length !== expectedRows.length) problems.push(`decision_count_mismatch:${decisions.length}:${expectedRows.length}`);
    for (const name of missingNames({ expectedRows, actualRows: decisions })) problems.push(`missing_decision_for:${name}`);
    for (const decision of decisions) {
      if (!BRAND_DECISIONS.has(decision?.decision)) problems.push(`invalid_or_pending_brand_decision:${decision?.name ?? 'unknown'}`);
      if (decision?.decision === 'rename' && typeof decision?.finalName !== 'string') problems.push(`rename_requires_final_name:${decision?.name ?? 'unknown'}`);
      if (decision?.decision === 'promote_to_live_canonical' && decision?.finalBrandStatus !== 'live_canonical') problems.push(`promote_requires_live_canonical_status:${decision?.name ?? 'unknown'}`);
    }
  }

  const unsafe = problems.some((problem) => problem.startsWith('safety_') || problem === 'live_approval_must_remain_false');
  const accepted = problems.length === 0;
  return {
    actor: 'brand',
    accepted,
    unsafe,
    status: accepted
      ? 'accepted_no_live_brand_taxonomy_response'
      : unsafe
        ? 'unsafe_brand_taxonomy_response_blocked'
        : 'incomplete_brand_taxonomy_response',
    missing: problems,
  };
};

const validateCrmResponse = ({ response, template }) => {
  const problems = baseResponseProblems({ actor: 'crm', response });
  const patchRows = response?.patchRows ?? [];
  const expectedRows = template.patchRows ?? [];

  if (response?.canApplyCrmManifestPatchNow !== false) problems.push('can_apply_crm_manifest_patch_now_must_be_false');
  if (!Array.isArray(patchRows)) problems.push('patch_rows_must_be_array');
  else {
    if (patchRows.length !== expectedRows.length) problems.push(`patch_row_count_mismatch:${patchRows.length}:${expectedRows.length}`);
    for (const name of missingNames({ expectedRows, actualRows: patchRows })) problems.push(`missing_patch_row_for:${name}`);
    for (const row of patchRows) {
      if (!CRM_DECISIONS.has(row?.decision)) problems.push(`invalid_or_pending_crm_decision:${row?.name ?? 'unknown'}`);
      if (row?.applyNow !== false) problems.push(`apply_now_must_be_false:${row?.name ?? 'unknown'}`);
    }
  }

  const unsafe = problems.some((problem) => problem.startsWith('safety_')
    || problem === 'live_approval_must_remain_false'
    || problem === 'can_apply_crm_manifest_patch_now_must_be_false'
    || problem.startsWith('apply_now_must_be_false:'));
  const accepted = problems.length === 0;
  return {
    actor: 'crm',
    accepted,
    unsafe,
    status: accepted
      ? 'accepted_no_live_crm_taxonomy_response'
      : unsafe
        ? 'unsafe_crm_taxonomy_response_blocked'
        : 'incomplete_crm_taxonomy_response',
    missing: problems,
  };
};

const validateResponse = ({ actor, response, template }) => {
  if (actor === 'brand') return validateBrandResponse({ response, template });
  if (actor === 'crm') return validateCrmResponse({ response, template });
  throw new Error(`unknown_actor:${actor}`);
};

const buildResponseState = async ({ responsesDir, templates, suffix }) => {
  const states = {};
  for (const actor of ACTORS) {
    const path = suffix === 'pending'
      ? pendingPathFor(responsesDir, actor)
      : finalPathFor(responsesDir, actor);
    const read = await readJsonIfPresent(path);
    if (!read.exists) {
      states[actor] = {
        actor,
        path,
        exists: false,
        status: suffix === 'pending' ? 'awaiting_pending_working_copy' : 'awaiting_final_response_file',
        accepted: false,
        unsafe: false,
        missing: [suffix === 'pending' ? 'pending_working_copy' : 'final_response_file'],
      };
    } else if (read.error) {
      states[actor] = {
        actor,
        path,
        exists: true,
        status: suffix === 'pending' ? 'invalid_json_pending_response_blocked' : 'invalid_json_final_response_blocked',
        accepted: false,
        unsafe: true,
        error: read.error,
      };
    } else {
      const validation = validateResponse({
        actor,
        response: read.value,
        template: templates[actor],
      });
      states[actor] = {
        path,
        exists: true,
        ...validation,
        pendingFileIsFinalResponse: suffix === 'final',
        readyToFinalize: suffix === 'pending' && validation.accepted === true,
        finalResponsePath: finalPathFor(responsesDir, actor),
      };
    }
  }
  return states;
};

const statusFrom = ({ finalResponseState, pendingResponseState }) => {
  const finalValues = Object.values(finalResponseState);
  const pendingValues = Object.values(pendingResponseState);
  if (finalValues.some((item) => item.unsafe)) return 'blocked_by_invalid_or_unsafe_taxonomy_final_response_no_live_changes';
  if (pendingValues.some((item) => item.unsafe)) return 'blocked_by_invalid_or_unsafe_taxonomy_pending_response_no_live_changes';
  if (finalValues.every((item) => item.accepted)) return 'taxonomy_refresh_response_workspace_ready_for_intake_no_live_changes';
  if (pendingValues.some((item) => item.readyToFinalize)) return 'taxonomy_refresh_response_workspace_has_ready_pending_responses_no_live_changes';
  return 'taxonomy_refresh_response_workspace_ready_awaiting_final_responses_no_live_changes';
};

const buildCommands = ({ responsesDir }) => ({
  refreshWorkspace: `npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace -- --responses-dir ${resolve(responsesDir)}`,
  rescanFinalResponses: `npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace -- --responses-dir ${resolve(responsesDir)} --no-write-pending`,
  refreshControlRoomAfterAcceptedResponses: [
    'npm run crm:vnext:mailerlite-launch-os-taxonomy-consolidation-audit',
    'npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-handoff',
    'npm run crm:vnext:mailerlite-launch-os-operator-runbook',
    'npm run crm:vnext:mailerlite-launch-os-goal-audit',
    'npm run crm:vnext:mailerlite-launch-os-validation-receipt',
  ],
});

const buildResponseWorkspace = async ({
  handoff,
  responsesDir,
  overwritePending = false,
  writePending = true,
  generatedAt = new Date().toISOString(),
}) => {
  const fullResponsesDir = resolve(responsesDir);
  const templates = buildTemplates({ handoff, responsesDir: fullResponsesDir, generatedAt });
  const workingCopies = [];

  if (writePending) await mkdir(fullResponsesDir, { recursive: true });

  for (const actor of ACTORS) {
    const path = pendingPathFor(fullResponsesDir, actor);
    const writeState = writePending
      ? await writePendingCopy({
        path,
        value: templates[actor],
        overwrite: overwritePending,
      })
      : {
        path,
        written: false,
        existedBefore: (await readJsonIfPresent(path)).exists,
        preservedExisting: true,
        error: null,
      };

    workingCopies.push({
      actor,
      pendingPath: path,
      finalResponsePath: finalPathFor(fullResponsesDir, actor),
      pendingFileIsAcceptedByWorkspace: false,
      liveApprovalGranted: false,
      decisionFieldsRemainPending: true,
      ...writeState,
    });
  }

  const finalResponseState = await buildResponseState({
    responsesDir: fullResponsesDir,
    templates,
    suffix: 'final',
  });
  const pendingResponseState = await buildResponseState({
    responsesDir: fullResponsesDir,
    templates,
    suffix: 'pending',
  });

  const acceptedActors = Object.values(finalResponseState).filter((item) => item.accepted).map((item) => item.actor);
  const pendingActors = Object.values(finalResponseState).filter((item) => !item.accepted).map((item) => item.actor);
  const readyPendingActors = Object.values(pendingResponseState).filter((item) => item.readyToFinalize).map((item) => item.actor);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_refresh_response_workspace',
    generatedAt,
    ok: true,
    status: statusFrom({ finalResponseState, pendingResponseState }),
    sourceHandoffStatus: handoff.status,
    responsesDir: fullResponsesDir,
    executiveSummary: {
      brandDecisionRowCount: handoff.executiveSummary?.brandPromotionDecisionCount ?? handoff.brandPromotionRows?.length ?? 0,
      crmManifestPatchRowCount: handoff.executiveSummary?.crmManifestPatchCount ?? handoff.crmManifestPatchRows?.length ?? 0,
      acceptedActorCount: acceptedActors.length,
      pendingActorCount: pendingActors.length,
      readyPendingActorCount: readyPendingActors.length,
      readyForIntake: pendingActors.length === 0,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: pendingActors.length === 0
        ? 'route_accepted_taxonomy_responses_to_a_future_local_patch_plan_without_applying_files'
        : 'collect_final_brand_and_crm_taxonomy_response_files_no_live_changes',
    },
    acceptedActors,
    pendingActors,
    readyPendingActors,
    workingCopies,
    finalResponseState,
    pendingResponseState,
    templates,
    commands: buildCommands({ responsesDir: fullResponsesDir }),
    operatorRules: [
      '*.pending.json files are working copies only.',
      'Only brand_taxonomy_refresh_response.json and crm_taxonomy_refresh_response.json count as final responses.',
      'Accepted responses do not apply Brand dictionary or CRM manifest patches.',
      'CRM response must keep canApplyCrmManifestPatchNow=false and every patch row applyNow=false.',
      'No live approval is requested or granted by this workspace.',
    ],
    safety: buildSafety(),
  };
};

const buildResponseWorkspaceFromFiles = async (options) => {
  const [handoff, sourceDigests] = await Promise.all([
    readJson(options.taxonomyRefreshHandoff),
    Promise.all([
      sourceDigest(options.taxonomyRefreshHandoff, 'Brand/CRM taxonomy refresh handoff source rows'),
    ]),
  ]);
  const workspace = await buildResponseWorkspace({
    handoff,
    responsesDir: options.responsesDir,
    overwritePending: options.overwritePending,
    writePending: options.writePending,
  });
  return {
    ...workspace,
    sourceDigests,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderState = (states) => Object.values(states)
  .map((state) => `- ${state.actor}: ${state.status}; accepted=${state.accepted}; unsafe=${state.unsafe} (${state.path})`)
  .join('\n');

const renderMarkdown = (workspace) => [
  '# MailerLite Launch OS - Taxonomy Refresh Response Workspace',
  '',
  `Generated: ${workspace.generatedAt}`,
  `Status: ${workspace.status}`,
  `Source handoff: ${workspace.sourceHandoffStatus}`,
  '',
  '## Summary',
  '',
  `- Brand decision rows: ${workspace.executiveSummary.brandDecisionRowCount}`,
  `- CRM manifest patch rows: ${workspace.executiveSummary.crmManifestPatchRowCount}`,
  `- Accepted actors: ${workspace.acceptedActors.join(', ') || 'none'}`,
  `- Pending actors: ${workspace.pendingActors.join(', ') || 'none'}`,
  `- Ready pending actors: ${workspace.readyPendingActors.join(', ') || 'none'}`,
  `- Ready for intake: ${workspace.executiveSummary.readyForIntake}`,
  `- Can ask approval now: ${workspace.executiveSummary.canAskApprovalNow}`,
  `- Can apply Brand dictionary patch now: ${workspace.executiveSummary.canApplyBrandDictionaryPatchNow}`,
  `- Can apply CRM manifest patch now: ${workspace.executiveSummary.canApplyCrmManifestPatchNow}`,
  `- Open live mutation gates: ${workspace.executiveSummary.openLiveMutationGateCount}`,
  `- Next safe action: ${workspace.executiveSummary.nextSafeAction}`,
  '',
  '## Working Copies',
  '',
  ...workspace.workingCopies.flatMap((copy) => [
    `### ${copy.actor}`,
    `- Pending working copy: ${copy.pendingPath}`,
    `- Final response path: ${copy.finalResponsePath}`,
    `- Written now: ${copy.written}`,
    `- Preserved existing: ${copy.preservedExisting}`,
    `- Accepted by workspace: ${copy.pendingFileIsAcceptedByWorkspace}`,
    `- Live approval granted: ${copy.liveApprovalGranted}`,
    '',
  ]),
  '## Final Response State',
  '',
  renderState(workspace.finalResponseState),
  '',
  '## Pending Response State',
  '',
  renderState(workspace.pendingResponseState),
  '',
  '## Commands',
  '',
  '```bash',
  workspace.commands.refreshWorkspace,
  workspace.commands.rescanFinalResponses,
  ...workspace.commands.refreshControlRoomAfterAcceptedResponses,
  '```',
  '',
  '## Operator Rules',
  '',
  renderList(workspace.operatorRules),
  '',
  '## Safety',
  '',
  `- Local only: ${workspace.safety.localOnly}`,
  `- Brand dictionary mutated: ${workspace.safety.brandDictionaryMutated}`,
  `- CRM manifest mutated: ${workspace.safety.crmManifestMutated}`,
  `- MailerLite API called: ${workspace.safety.mailerLiteApiCalled}`,
  `- Group mutations performed: ${workspace.safety.groupMutationsPerformed}`,
  `- Workflow mutations performed: ${workspace.safety.workflowMutationsPerformed}`,
  `- Sends performed: ${workspace.safety.sendsPerformed}`,
  `- CRM live API called: ${workspace.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${workspace.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const workspace = await buildResponseWorkspaceFromFiles(options);
  const out = options.out ? await writeJson(options.out, workspace) : null;
  const markdownOut = options.markdownOut ? await writeText(options.markdownOut, renderMarkdown(workspace)) : null;

  console.log(JSON.stringify({
    ok: workspace.ok,
    status: workspace.status,
    generatedAt: workspace.generatedAt,
    responsesDir: workspace.responsesDir,
    acceptedActors: workspace.acceptedActors,
    pendingActors: workspace.pendingActors,
    readyPendingActors: workspace.readyPendingActors,
    brandDecisionRowCount: workspace.executiveSummary.brandDecisionRowCount,
    crmManifestPatchRowCount: workspace.executiveSummary.crmManifestPatchRowCount,
    canAskApprovalNow: workspace.executiveSummary.canAskApprovalNow,
    canApplyBrandDictionaryPatchNow: workspace.executiveSummary.canApplyBrandDictionaryPatchNow,
    canApplyCrmManifestPatchNow: workspace.executiveSummary.canApplyCrmManifestPatchNow,
    openLiveMutationGateCount: workspace.executiveSummary.openLiveMutationGateCount,
    out,
    markdownOut,
    safety: workspace.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS taxonomy refresh response workspace failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBrandTemplate,
  buildCommands,
  buildCrmTemplate,
  buildResponseWorkspace,
  buildResponseWorkspaceFromFiles,
  buildSafety,
  finalPathFor,
  parseArgs,
  pendingPathFor,
  renderMarkdown,
  validateResponse,
};
