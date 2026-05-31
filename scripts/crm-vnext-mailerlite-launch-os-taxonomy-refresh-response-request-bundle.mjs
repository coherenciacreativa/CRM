#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-request-bundle-2026-05-28';

const DEFAULT_TAXONOMY_REFRESH_HANDOFF = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_handoff_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_workspace_2026-05-28.json';
const DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_decision_intake_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_taxonomy_refresh_response_request_bundle_2026-05-28.md';
const MANTIS_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-taxonomy-refresh-response-request-bundle.mjs [options]

Options:
  --taxonomy-refresh-handoff <path>            Taxonomy refresh handoff JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_HANDOFF}
  --taxonomy-refresh-response-workspace <path> Taxonomy response workspace JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE}
  --taxonomy-refresh-decision-intake <path>    Taxonomy decision intake JSON. Defaults to ${DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE}
  --out <path>                                 Write JSON request bundle. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown request bundle. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                       Show this help

Local-only request bundle for Brand/CRM taxonomy final responses. It turns the
response workspace and decision intake into copy-ready instructions for the two
final response files. It does not create final responses, ask approval, edit
Brand dictionary or CRM manifest files, open UI, call APIs, read subscribers,
mutate groups/workflows/cards/scoring/ledgers/Fact Store, or send messages.`;

const parseArgs = (argv) => {
  const options = {
    taxonomyRefreshHandoff: DEFAULT_TAXONOMY_REFRESH_HANDOFF,
    taxonomyRefreshResponseWorkspace: DEFAULT_TAXONOMY_REFRESH_RESPONSE_WORKSPACE,
    taxonomyRefreshDecisionIntake: DEFAULT_TAXONOMY_REFRESH_DECISION_INTAKE,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--taxonomy-refresh-handoff') options.taxonomyRefreshHandoff = argv[++index];
    else if (arg === '--taxonomy-refresh-response-workspace') options.taxonomyRefreshResponseWorkspace = argv[++index];
    else if (arg === '--taxonomy-refresh-decision-intake') options.taxonomyRefreshDecisionIntake = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
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

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  createsFinalResponseFiles: false,
  editsPendingWorkingCopies: false,
  asksApproval: false,
  asksLiveApproval: false,
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

const getWorkingCopy = (workspace, actor) => (workspace?.workingCopies ?? []).find((copy) => copy.actor === actor) ?? null;

const reportDateFromGeneratedAt = (generatedAt) => {
  if (typeof generatedAt !== 'string') return 'current';
  const match = generatedAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? 'current';
};

const currentReportPath = ({ stem, generatedAt, extension }) => `${MANTIS_REPORTS_DIR}/${stem}_current_${reportDateFromGeneratedAt(generatedAt)}.${extension}`;

const buildFollowUpReportPaths = ({ generatedAt, requestBundlePath }) => ({
  taxonomyResponseWorkspaceJson: currentReportPath({ stem: 'mailerlite_launch_os_taxonomy_refresh_response_workspace', generatedAt, extension: 'json' }),
  taxonomyResponseWorkspaceMarkdown: currentReportPath({ stem: 'mailerlite_launch_os_taxonomy_refresh_response_workspace', generatedAt, extension: 'md' }),
  taxonomyDecisionIntakeJson: currentReportPath({ stem: 'mailerlite_launch_os_taxonomy_refresh_decision_intake', generatedAt, extension: 'json' }),
  taxonomyDecisionIntakeMarkdown: currentReportPath({ stem: 'mailerlite_launch_os_taxonomy_refresh_decision_intake', generatedAt, extension: 'md' }),
  operatorRunbookJson: currentReportPath({ stem: 'mailerlite_launch_os_operator_runbook', generatedAt, extension: 'json' }),
  operatorRunbookMarkdown: currentReportPath({ stem: 'mailerlite_launch_os_operator_runbook', generatedAt, extension: 'md' }),
  goalAuditJson: currentReportPath({ stem: 'mailerlite_launch_os_v0_goal_audit', generatedAt, extension: 'json' }),
  goalAuditMarkdown: currentReportPath({ stem: 'mailerlite_launch_os_v0_goal_audit', generatedAt, extension: 'md' }),
  validationReceiptJson: currentReportPath({ stem: 'mailerlite_launch_os_validation_receipt', generatedAt, extension: 'json' }),
  validationReceiptMarkdown: currentReportPath({ stem: 'mailerlite_launch_os_validation_receipt', generatedAt, extension: 'md' }),
  requestBundleJson: requestBundlePath ? resolve(requestBundlePath) : '<current_taxonomy_response_request_bundle_json>',
  requestBundleMarkdown: requestBundlePath
    ? resolve(requestBundlePath).replace(/\.json$/u, '.md')
    : '<current_taxonomy_response_request_bundle_md>',
});

const pathOrPlaceholder = (path, placeholder) => (path ? resolve(path) : placeholder);

const actorState = ({ workspace, intake, actor }) => {
  const finalState = workspace?.finalResponseState?.[actor] ?? {};
  const pendingState = workspace?.pendingResponseState?.[actor] ?? {};
  const workingCopy = getWorkingCopy(workspace, actor);
  const intakeState = actor === 'brand' ? intake?.brandDecisionState : intake?.crmDecisionState;

  return {
    actor,
    pendingPath: workingCopy?.pendingPath ?? pendingState.path ?? null,
    finalResponsePath: workingCopy?.finalResponsePath ?? finalState.path ?? null,
    finalResponsePresent: finalState.exists === true,
    finalResponseAccepted: finalState.accepted === true,
    pendingReadyToFinalize: pendingState.readyToFinalize === true,
    workspaceStatus: finalState.status ?? null,
    pendingStatus: pendingState.status ?? null,
    intakeStatus: intakeState?.status ?? null,
    unsafe: finalState.unsafe === true || pendingState.unsafe === true || intakeState?.unsafe === true,
    missing: [
      ...(finalState.missing ?? []),
      ...(intakeState?.blockers ?? []),
    ],
  };
};

const buildBrandCopy = ({ state, rowCount }) => [
  'Brand debe revisar la working copy pendiente y guardar una respuesta final local.',
  `Working copy: ${state.pendingPath}`,
  `Final file requerido: ${state.finalResponsePath}`,
  `Filas a decidir: ${rowCount}.`,
  'Cada fila debe tener decision final: promote_to_live_canonical, rename o reject.',
  'Si usa promote_to_live_canonical, finalBrandStatus debe quedar live_canonical.',
  'Mantener liveApprovalGranted=false y todos los flags safety de mutacion en false.',
  'Esto solo resuelve la decision semantica de Brand; no edita el diccionario Brand ni crea/modifica grupos reales.',
].join(' ');

const buildCrmCopy = ({ state, rowCount }) => [
  'CRM debe revisar la working copy pendiente y guardar una respuesta final local.',
  `Working copy: ${state.pendingPath}`,
  `Final file requerido: ${state.finalResponsePath}`,
  `Filas de manifest a decidir: ${rowCount}.`,
  'Cada fila debe elegir prepare_local_manifest_patch_after_brand, hold_until_brand_live_canonical o reject_patch.',
  'Para cualquier fila, applyNow debe ser false; en el encabezado canApplyCrmManifestPatchNow debe ser false.',
  'Mantener liveApprovalGranted=false y todos los flags safety de mutacion en false.',
  'Esto solo habilita validacion y posible patch preview local posterior; no edita el manifest CRM.',
].join(' ');

const buildRequest = ({ actor, workspace, intake }) => {
  const state = actorState({ workspace, intake, actor });
  const rowCount = actor === 'brand'
    ? workspace?.executiveSummary?.brandDecisionRowCount ?? 0
    : workspace?.executiveSummary?.crmManifestPatchRowCount ?? 0;

  return {
    actor,
    title: actor === 'brand' ? 'Brand taxonomy final response' : 'CRM taxonomy final response',
    audience: actor === 'brand' ? 'Brand' : 'CRM',
    rowCount,
    pendingPath: state.pendingPath,
    finalResponsePath: state.finalResponsePath,
    finalResponsePresent: state.finalResponsePresent,
    finalResponseAccepted: state.finalResponseAccepted,
    pendingReadyToFinalize: state.pendingReadyToFinalize,
    workspaceStatus: state.workspaceStatus,
    pendingStatus: state.pendingStatus,
    intakeStatus: state.intakeStatus,
    unsafe: state.unsafe,
    missing: state.missing,
    copyReadyText: actor === 'brand'
      ? buildBrandCopy({ state, rowCount })
      : buildCrmCopy({ state, rowCount }),
    collectionRule: 'Collect the final response file only; do not treat the response as live approval or execution.',
    asksApproval: false,
    asksLiveApproval: false,
    canExecuteAfterCollection: false,
  };
};

const buildCommands = (workspace, { generatedAt, requestBundlePath, taxonomyRefreshHandoffPath } = {}) => {
  const reportPaths = buildFollowUpReportPaths({ generatedAt, requestBundlePath });
  const brandWorkingCopy = getWorkingCopy(workspace, 'brand');
  const crmWorkingCopy = getWorkingCopy(workspace, 'crm');
  const brandFinalResponsePath = pathOrPlaceholder(brandWorkingCopy?.finalResponsePath, '<brand_taxonomy_final_response_json>');
  const crmFinalResponsePath = pathOrPlaceholder(crmWorkingCopy?.finalResponsePath, '<crm_taxonomy_final_response_json>');
  const responsesDir = brandWorkingCopy?.pendingPath
    ? dirname(resolve(brandWorkingCopy.pendingPath))
    : '<taxonomy_refresh_responses_dir>';
  const handoffPath = pathOrPlaceholder(taxonomyRefreshHandoffPath, DEFAULT_TAXONOMY_REFRESH_HANDOFF);

  return {
    refreshWorkspaceWithoutWritingPending: `npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-workspace -- --responses-dir ${responsesDir} --no-write-pending --out ${reportPaths.taxonomyResponseWorkspaceJson} --markdown-out ${reportPaths.taxonomyResponseWorkspaceMarkdown}`,
    runDecisionIntake: `npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-decision-intake -- --taxonomy-refresh-handoff ${handoffPath} --brand-decision-file ${brandFinalResponsePath} --crm-decision-file ${crmFinalResponsePath} --out ${reportPaths.taxonomyDecisionIntakeJson} --markdown-out ${reportPaths.taxonomyDecisionIntakeMarkdown}`,
    refreshRequestBundleAfterIntake: `npm run crm:vnext:mailerlite-launch-os-taxonomy-refresh-response-request-bundle -- --taxonomy-refresh-handoff ${handoffPath} --taxonomy-refresh-response-workspace ${reportPaths.taxonomyResponseWorkspaceJson} --taxonomy-refresh-decision-intake ${reportPaths.taxonomyDecisionIntakeJson} --out ${reportPaths.requestBundleJson} --markdown-out ${reportPaths.requestBundleMarkdown}`,
    refreshControlRoomAfterResponses: [
      `npm run crm:vnext:mailerlite-launch-os-operator-runbook -- --taxonomy-refresh-response-workspace ${reportPaths.taxonomyResponseWorkspaceJson} --taxonomy-refresh-decision-intake ${reportPaths.taxonomyDecisionIntakeJson} --taxonomy-refresh-response-request-bundle ${reportPaths.requestBundleJson} --out ${reportPaths.operatorRunbookJson} --markdown-out ${reportPaths.operatorRunbookMarkdown}`,
      `npm run crm:vnext:mailerlite-launch-os-goal-audit -- --runbook ${reportPaths.operatorRunbookJson} --taxonomy-refresh-response-workspace ${reportPaths.taxonomyResponseWorkspaceJson} --taxonomy-refresh-decision-intake ${reportPaths.taxonomyDecisionIntakeJson} --taxonomy-refresh-response-request-bundle ${reportPaths.requestBundleJson} --out ${reportPaths.goalAuditJson} --markdown-out ${reportPaths.goalAuditMarkdown}`,
      `npm run crm:vnext:mailerlite-launch-os-validation-receipt -- --runbook ${reportPaths.operatorRunbookJson} --goal-audit ${reportPaths.goalAuditJson} --taxonomy-refresh-response-workspace ${reportPaths.taxonomyResponseWorkspaceJson} --taxonomy-refresh-decision-intake ${reportPaths.taxonomyDecisionIntakeJson} --taxonomy-refresh-response-request-bundle ${reportPaths.requestBundleJson} --out ${reportPaths.validationReceiptJson} --markdown-out ${reportPaths.validationReceiptMarkdown}`,
    ],
  };
};

const buildTaxonomyRefreshResponseRequestBundle = ({
  taxonomyRefreshHandoff,
  taxonomyRefreshResponseWorkspace,
  taxonomyRefreshDecisionIntake,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
  requestBundlePath = null,
  taxonomyRefreshHandoffPath = null,
}) => {
  const requests = ['brand', 'crm'].map((actor) => buildRequest({
    actor,
    workspace: taxonomyRefreshResponseWorkspace,
    intake: taxonomyRefreshDecisionIntake,
  }));
  const pendingActors = requests.filter((request) => !request.finalResponseAccepted).map((request) => request.actor);
  const missingFinalResponseActors = requests.filter((request) => !request.finalResponsePresent).map((request) => request.actor);
  const unsafeActors = requests.filter((request) => request.unsafe).map((request) => request.actor);
  const copyBlocksReady = requests.every((request) => Boolean(cleanString(request.copyReadyText))
    && Boolean(cleanString(request.pendingPath))
    && Boolean(cleanString(request.finalResponsePath)));
  const safety = buildSafety();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_taxonomy_refresh_response_request_bundle',
    generatedAt,
    ok: unsafeActors.length === 0,
    status: unsafeActors.length > 0
      ? 'taxonomy_refresh_response_request_bundle_blocked_unsafe_response_no_live_changes'
      : pendingActors.length > 0
        ? 'taxonomy_refresh_response_request_bundle_ready_no_live_changes'
        : 'taxonomy_refresh_response_request_bundle_all_responses_present_no_live_changes',
    executiveSummary: {
      handoffStatus: taxonomyRefreshHandoff?.status ?? null,
      responseWorkspaceStatus: taxonomyRefreshResponseWorkspace?.status ?? null,
      decisionIntakeStatus: taxonomyRefreshDecisionIntake?.status ?? null,
      requestCount: requests.length,
      pendingActorCount: pendingActors.length,
      missingFinalResponseCount: missingFinalResponseActors.length,
      pendingActors,
      missingFinalResponseActors,
      unsafeActors,
      copyBlocksReady,
      asksApproval: false,
      asksLiveApproval: false,
      createsFinalResponseFiles: false,
      canAskApprovalNow: false,
      canApplyBrandDictionaryPatchNow: false,
      canApplyCrmManifestPatchNow: false,
      openLiveMutationGateCount: 0,
      nextHumanAction: pendingActors.length > 0
        ? 'collect_brand_and_crm_final_response_files_only'
        : 'rerun_decision_intake_and_prepare_local_patch_preview_only',
      nextSafeAction: 'collect_taxonomy_final_responses_without_live_approval_or_execution',
    },
    requests,
    commands: buildCommands(taxonomyRefreshResponseWorkspace, { generatedAt, requestBundlePath, taxonomyRefreshHandoffPath }),
    hardStops: [
      'This request bundle is not approval.',
      '*.pending.json files are working copies only; final response files must be saved without the .pending suffix.',
      'Final responses do not apply Brand dictionary or CRM manifest patches.',
      'CRM responses must keep canApplyCrmManifestPatchNow=false and every patch row applyNow=false.',
      'Do not open UI, call MailerLite/Shopify/CRM APIs, mutate subscribers, groups, workflows, cards, scoring, ledgers or Fact Store from this bundle.',
      'After final files exist, rerun the response workspace scan and decision intake before any local patch preview.',
    ],
    sourceDigests,
    safety,
  };
};

const buildTaxonomyRefreshResponseRequestBundleFromFiles = async (options) => {
  const [
    taxonomyRefreshHandoff,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshDecisionIntake,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.taxonomyRefreshHandoff),
    readJson(options.taxonomyRefreshResponseWorkspace),
    readJson(options.taxonomyRefreshDecisionIntake),
    Promise.all([
      digestFor(options.taxonomyRefreshHandoff, 'taxonomy refresh handoff rows for Brand/CRM response requests'),
      digestFor(options.taxonomyRefreshResponseWorkspace, 'taxonomy response workspace paths, pending files and final response states'),
      digestFor(options.taxonomyRefreshDecisionIntake, 'taxonomy decision intake current blockers and local patch preview gate'),
    ]),
  ]);

  return buildTaxonomyRefreshResponseRequestBundle({
    taxonomyRefreshHandoff,
    taxonomyRefreshResponseWorkspace,
    taxonomyRefreshDecisionIntake,
    sourceDigests,
    requestBundlePath: options.out,
    taxonomyRefreshHandoffPath: options.taxonomyRefreshHandoff,
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (bundle) => {
  const lines = [
    '# MailerLite Launch OS Taxonomy Response Request Bundle',
    '',
    `Generated: ${bundle.generatedAt}`,
    `Status: ${bundle.status}`,
    '',
    '## Summary',
    '',
    `- Request count: ${bundle.executiveSummary.requestCount}`,
    `- Pending actors: ${bundle.executiveSummary.pendingActors.join(', ') || 'none'}`,
    `- Missing final responses: ${bundle.executiveSummary.missingFinalResponseActors.join(', ') || 'none'}`,
    `- Copy blocks ready: ${bundle.executiveSummary.copyBlocksReady}`,
    `- Asks approval: ${bundle.executiveSummary.asksApproval}`,
    `- Asks live approval: ${bundle.executiveSummary.asksLiveApproval}`,
    `- Creates final response files: ${bundle.executiveSummary.createsFinalResponseFiles}`,
    `- Can ask approval now: ${bundle.executiveSummary.canAskApprovalNow}`,
    `- Can apply CRM manifest patch now: ${bundle.executiveSummary.canApplyCrmManifestPatchNow}`,
    `- Open live mutation gates: ${bundle.executiveSummary.openLiveMutationGateCount}`,
    `- Next safe action: ${bundle.executiveSummary.nextSafeAction}`,
    '',
    '## Copy-Ready Requests',
    '',
  ];

  for (const request of bundle.requests) {
    lines.push(`### ${request.actor}`);
    lines.push('');
    lines.push(`Audience: ${request.audience}`);
    lines.push(`Rows: ${request.rowCount}`);
    lines.push(`Pending path: ${request.pendingPath}`);
    lines.push(`Final response path: ${request.finalResponsePath}`);
    lines.push(`Final response present: ${request.finalResponsePresent}`);
    lines.push(`Final response accepted: ${request.finalResponseAccepted}`);
    lines.push(`Intake status: ${request.intakeStatus}`);
    lines.push('');
    lines.push(request.copyReadyText);
    lines.push('');
    lines.push(`Collection rule: ${request.collectionRule}`);
    lines.push(`Missing: ${request.missing.join(', ') || 'none'}`);
    lines.push('');
  }

  lines.push('## Commands After Final Files Exist');
  lines.push('');
  lines.push('```bash');
  lines.push(bundle.commands.refreshWorkspaceWithoutWritingPending);
  lines.push(bundle.commands.runDecisionIntake);
  lines.push(bundle.commands.refreshRequestBundleAfterIntake);
  for (const command of bundle.commands.refreshControlRoomAfterResponses) lines.push(command);
  lines.push('```');
  lines.push('');
  lines.push('## Hard Stops');
  lines.push('');
  lines.push(renderList(bundle.hardStops));
  lines.push('');
  lines.push('## Safety');
  lines.push('');
  lines.push('- Local-only report.');
  lines.push('- No final response files created.');
  lines.push('- No approval requested.');
  lines.push('- No live APIs, UI, subscribers, groups, workflows, sends, CRM writes, scoring or Fact Store writes.');
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const bundle = await buildTaxonomyRefreshResponseRequestBundleFromFiles(options);
  const out = options.out ? await writeJson(options.out, bundle) : null;
  const markdownOut = options.markdownOut ? await writeText(options.markdownOut, renderMarkdown(bundle)) : null;

  console.log(JSON.stringify({
    ok: bundle.ok,
    status: bundle.status,
    generatedAt: bundle.generatedAt,
    requestCount: bundle.executiveSummary.requestCount,
    pendingActors: bundle.executiveSummary.pendingActors,
    missingFinalResponseActors: bundle.executiveSummary.missingFinalResponseActors,
    copyBlocksReady: bundle.executiveSummary.copyBlocksReady,
    asksApproval: bundle.executiveSummary.asksApproval,
    asksLiveApproval: bundle.executiveSummary.asksLiveApproval,
    createsFinalResponseFiles: bundle.executiveSummary.createsFinalResponseFiles,
    canAskApprovalNow: bundle.executiveSummary.canAskApprovalNow,
    canApplyCrmManifestPatchNow: bundle.executiveSummary.canApplyCrmManifestPatchNow,
    openLiveMutationGateCount: bundle.executiveSummary.openLiveMutationGateCount,
    out,
    markdownOut,
    safety: bundle.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS taxonomy response request bundle failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSafety,
  buildTaxonomyRefreshResponseRequestBundle,
  buildTaxonomyRefreshResponseRequestBundleFromFiles,
  parseArgs,
  renderMarkdown,
};
