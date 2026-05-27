#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateResponse } from './crm-vnext-mailerlite-mini-launch-department-review-intake.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-finalization-preflight-2026-05-27';

const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27';
const DEFAULT_CODEX_DRAFTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_codex_drafts_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-finalization-preflight.mjs [options]

Options:
  --response-workspace <path>   Response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --responses-dir <path>        Final/pending response directory. Defaults to ${DEFAULT_RESPONSES_DIR}
  --codex-drafts-dir <path>     Codex draft assist directory. Defaults to ${DEFAULT_CODEX_DRAFTS_DIR}
  --out <path>                  Write JSON report
  --markdown-out <path>         Write Markdown report
  --help                        Show this help

Local-only finalization preflight for Brand/Web/CRM department responses. It
checks final response files, pending working copies and Codex draft assists,
then reports what can move toward intake. It does not write final responses and
performs no live actions.`;

const DEPARTMENTS = ['brand', 'web_design', 'crm'];

const parseArgs = (argv) => {
  const options = {
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    responsesDir: DEFAULT_RESPONSES_DIR,
    codexDraftsDir: DEFAULT_CODEX_DRAFTS_DIR,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--responses-dir') options.responsesDir = argv[++index];
    else if (arg === '--codex-drafts-dir') options.codexDraftsDir = argv[++index];
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
      path: resolve(path),
      exists: true,
      value: JSON.parse(await readFile(resolve(path), 'utf8')),
      error: null,
    };
  } catch (error) {
    if (error.code === 'ENOENT') return { path: resolve(path), exists: false, value: null, error: null };
    return { path: resolve(path), exists: true, value: null, error: error.message };
  }
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const workingCopyFor = (workspace, department) =>
  workspace?.workingCopies?.find((copy) => copy.department === department) ?? null;

const templateFor = async (workspace, department) => {
  const copy = workingCopyFor(workspace, department);
  if (!copy?.templateSourcePath) throw new Error(`missing_template_source:${department}`);
  return readJson(copy.templateSourcePath);
};

const pathForKind = ({ workspace, responsesDir, codexDraftsDir, department, kind }) => {
  const copy = workingCopyFor(workspace, department);
  if (kind === 'final') return copy?.finalResponsePath ?? `${responsesDir}/${department}_response.json`;
  if (kind === 'pending') return copy?.pendingPath ?? `${responsesDir}/${department}_response.pending.json`;
  if (kind === 'codex_draft') return `${codexDraftsDir}/${department}_response.codex_draft.json`;
  throw new Error(`unknown_response_kind:${kind}`);
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  finalResponsesWritten: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const blockersForCandidate = ({ kind, readState, validation }) => {
  if (!readState.exists) return ['file_missing'];
  if (readState.error) return [`file_unreadable:${readState.error}`];
  const blockers = [];
  if (validation?.missing?.length) blockers.push(...validation.missing.map((item) => `missing:${item}`));
  if (validation?.unsafeReasons?.length) blockers.push(...validation.unsafeReasons.map((item) => `unsafe:${item}`));
  if (validation?.blockers?.length) blockers.push(...validation.blockers.map((item) => `department_blocker:${item}`));
  if (kind === 'codex_draft') blockers.push('codex_draft_requires_real_department_review_and_metadata_removal');
  if (kind === 'pending') blockers.push('pending_file_must_be_intentionally_saved_to_final_response_path');
  return [...new Set(blockers)];
};

const inspectCandidate = ({ department, kind, readState, template }) => {
  if (!readState.exists || readState.error) {
    return {
      department,
      kind,
      path: readState.path,
      exists: readState.exists,
      status: readState.exists ? 'unreadable_response_file' : 'missing_response_file',
      acceptedByIntake: false,
      canBecomeFinalNow: false,
      reviewMode: null,
      liveApprovalGranted: null,
      blockers: blockersForCandidate({ kind, readState, validation: null }),
      nextSafeStep: readState.exists ? 'Fix JSON syntax or replace this file.' : 'Create or collect this response file.',
    };
  }

  const validation = validateResponse({
    department,
    response: readState.value,
    template,
  });
  const blockers = blockersForCandidate({ kind, readState, validation });

  const acceptedByIntake = kind === 'final' && validation.accepted;
  const canBecomeFinalNow = kind === 'pending'
    && validation.accepted
    && !readState.value?.codexDraftMeta;

  const status = acceptedByIntake
    ? 'accepted_final_response_ready_for_intake'
    : canBecomeFinalNow
      ? 'pending_response_ready_to_finalize_after_department_confirmation'
      : kind === 'codex_draft'
        ? 'codex_draft_assist_not_final'
        : validation.status;

  return {
    department,
    kind,
    path: readState.path,
    exists: true,
    status,
    acceptedByIntake,
    canBecomeFinalNow,
    validationStatus: validation.status,
    reviewMode: readState.value?.reviewMode ?? null,
    liveApprovalGranted: readState.value?.liveApprovalGranted ?? null,
    hasCodexDraftMeta: Boolean(readState.value?.codexDraftMeta),
    blockers,
    nextSafeStep: acceptedByIntake
      ? 'Use this final response in intake/reconciliation.'
      : canBecomeFinalNow
        ? 'A real department reviewer can intentionally save this pending file to the final response path.'
        : kind === 'codex_draft'
          ? 'Use as review aid only; reviewer must edit, remove codexDraftMeta and save a separate final response.'
          : validation.nextSafeStep,
  };
};

const inspectDepartment = async ({ workspace, responsesDir, codexDraftsDir, department }) => {
  const template = await templateFor(workspace, department);
  const candidates = {};

  for (const kind of ['final', 'pending', 'codex_draft']) {
    const path = pathForKind({ workspace, responsesDir, codexDraftsDir, department, kind });
    const readState = await readJsonIfPresent(path);
    candidates[kind] = inspectCandidate({ department, kind, readState, template });
  }

  const finalState = candidates.final;
  const pendingState = candidates.pending;
  const codexDraftState = candidates.codex_draft;
  const state = finalState.acceptedByIntake
    ? 'final_response_ready'
    : pendingState.canBecomeFinalNow
      ? 'pending_response_ready_to_finalize'
      : codexDraftState.exists
        ? 'draft_assist_available_needs_department_review'
        : 'awaiting_department_response';

  return {
    department,
    state,
    finalResponsePath: finalState.path,
    acceptedFinalResponse: finalState.acceptedByIntake,
    pendingCanBecomeFinal: pendingState.canBecomeFinalNow,
    codexDraftAvailable: codexDraftState.exists,
    candidates,
    nextSafeStep: finalState.acceptedByIntake
      ? 'Ready for intake with this department final response.'
      : pendingState.canBecomeFinalNow
        ? 'Ask the department to confirm and save the pending response as final.'
        : codexDraftState.exists
          ? 'Ask the department to review the Codex draft and produce a clean final response.'
          : 'Collect a department response using the delivery pack.',
  };
};

const statusFor = (departments) => {
  if (departments.every((department) => department.acceptedFinalResponse)) {
    return 'department_final_responses_ready_for_intake_no_live_changes';
  }
  if (departments.some((department) => department.candidates.final.status === 'unsafe_response_blocked')) {
    return 'blocked_by_unsafe_final_department_response_no_live_changes';
  }
  if (departments.some((department) => department.pendingCanBecomeFinal)) {
    return 'department_finalization_preflight_has_pending_ready_to_finalize_no_live_changes';
  }
  return 'department_finalization_preflight_waiting_department_responses_no_live_changes';
};

const buildFinalizationPreflight = async ({
  responseWorkspace,
  responsesDir = DEFAULT_RESPONSES_DIR,
  codexDraftsDir = DEFAULT_CODEX_DRAFTS_DIR,
  generatedAt = new Date().toISOString(),
}) => {
  const departments = [];
  for (const department of DEPARTMENTS) {
    departments.push(await inspectDepartment({
      workspace: responseWorkspace,
      responsesDir,
      codexDraftsDir,
      department,
    }));
  }

  const acceptedDepartments = departments
    .filter((department) => department.acceptedFinalResponse)
    .map((department) => department.department);
  const pendingReadyDepartments = departments
    .filter((department) => department.pendingCanBecomeFinal)
    .map((department) => department.department);
  const draftAssistDepartments = departments
    .filter((department) => department.codexDraftAvailable && !department.acceptedFinalResponse)
    .map((department) => department.department);
  const awaitingDepartments = departments
    .filter((department) => !department.acceptedFinalResponse && !department.pendingCanBecomeFinal)
    .map((department) => department.department);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_response_finalization_preflight',
    generatedAt,
    ok: true,
    status: statusFor(departments),
    launch: responseWorkspace?.launch ?? null,
    responsesDir: resolve(responsesDir),
    codexDraftsDir: resolve(codexDraftsDir),
    readyForIntake: acceptedDepartments.length === DEPARTMENTS.length,
    acceptedDepartments,
    pendingReadyDepartments,
    draftAssistDepartments,
    awaitingDepartments,
    departments,
    nextSafeStep: acceptedDepartments.length === DEPARTMENTS.length
      ? 'Run department review intake/reconciliation with final response files.'
      : 'Collect real final Brand/Web/CRM responses; Codex drafts and pending files are not final.',
    hardStops: [
      'Do not write final response files from this preflight.',
      'Do not treat a Codex draft as department approval.',
      'Do not run intake/reconciliation from pending or codex_draft files.',
      'Do not open MailerLite, Shopify, CRM, subscriber, workflow, send, ledger, card, scoring or Fact Store gates.',
    ],
    safety: buildSafety(),
  };
};

const buildFinalizationPreflightFromFiles = async (options) => {
  const responseWorkspace = await readJson(options.responseWorkspace);
  return buildFinalizationPreflight({
    responseWorkspace,
    responsesDir: options.responsesDir,
    codexDraftsDir: options.codexDraftsDir,
  });
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Response Finalization Preflight',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Ready for intake: ${report.readyForIntake}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este preflight revisa archivos finales, pendientes y borradores Codex para evitar que una ayuda de trabajo se confunda con una respuesta final de Brand/Web/CRM.',
    '',
    '## Department States',
    '',
  ];

  for (const department of report.departments) {
    lines.push(`### ${department.department}`);
    lines.push(`- State: ${department.state}`);
    lines.push(`- Accepted final response: ${department.acceptedFinalResponse}`);
    lines.push(`- Pending can become final: ${department.pendingCanBecomeFinal}`);
    lines.push(`- Codex draft available: ${department.codexDraftAvailable}`);
    lines.push(`- Next safe step: ${department.nextSafeStep}`);
    for (const candidate of Object.values(department.candidates)) {
      lines.push(`- ${candidate.kind}: ${candidate.status}; ${candidate.path}`);
      if (candidate.blockers.length) {
        lines.push(`  blockers: ${candidate.blockers.join('; ')}`);
      }
    }
    lines.push('');
  }

  lines.push('## Next Safe Step', '');
  lines.push(`- ${report.nextSafeStep}`);

  lines.push('', '## Hard Stops', '');
  lines.push(renderList(report.hardStops));

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo reportes; no escribe respuestas finales.');
  lines.push('- Sin mensajes externos enviados.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return lines.join('\n');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildFinalizationPreflightFromFiles(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    readyForIntake: report.readyForIntake,
    acceptedDepartments: report.acceptedDepartments,
    pendingReadyDepartments: report.pendingReadyDepartments,
    draftAssistDepartments: report.draftAssistDepartments,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department response finalization preflight failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFinalizationPreflight,
  buildSafety,
  inspectCandidate,
  inspectDepartment,
  parseArgs,
  renderMarkdown,
  statusFor,
};
