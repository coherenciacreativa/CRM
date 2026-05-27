#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-response-watcher-2026-05-27';

const DEFAULT_REQUEST_BUNDLE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_request_bundle_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_FINALIZATION_PREFLIGHT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-response-watcher.mjs [options]

Options:
  --request-bundle <path>          Department request bundle JSON. Defaults to ${DEFAULT_REQUEST_BUNDLE}
  --response-workspace <path>      Department response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --finalization-preflight <path>  Department finalization preflight JSON. Defaults to ${DEFAULT_FINALIZATION_PREFLIGHT}
  --out <path>                     Write JSON watcher report
  --markdown-out <path>            Write Markdown watcher report
  --help                           Show this help

Local-only watcher for Brand/Web/CRM final response files. It checks whether
expected request, pending and final response files exist, then tells the
operator the next safe no-live step. It never creates final responses, sends
messages, calls MailerLite/Shopify/CRM APIs, reads subscribers, mutates groups
or workflows, sends emails, appends ledgers, writes cards, changes scoring, or
touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    requestBundle: DEFAULT_REQUEST_BUNDLE,
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    finalizationPreflight: DEFAULT_FINALIZATION_PREFLIGHT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--request-bundle') options.requestBundle = argv[++index];
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--finalization-preflight') options.finalizationPreflight = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const pathExists = async (path) => {
  if (!path) return false;
  try {
    await access(resolve(path));
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
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

const byDepartment = (items = []) => new Map(items.map((item) => [item.department, item]));

const uniqueDepartments = ({ requestBundle, responseWorkspace, finalizationPreflight }) => [
  ...new Set([
    ...(requestBundle?.requests ?? []).map((request) => request.department),
    ...(responseWorkspace?.workingCopies ?? []).map((copy) => copy.department),
    ...(finalizationPreflight?.departments ?? []).map((department) => department.department),
    'brand',
    'web_design',
    'crm',
  ].filter(Boolean)),
].sort((a, b) => {
  const order = { brand: 1, web_design: 2, crm: 3 };
  return (order[a] ?? 99) - (order[b] ?? 99) || a.localeCompare(b);
});

const fileStateFor = (fileStates, path) => {
  if (!path) return { path: null, exists: false };
  if (fileStates instanceof Map) {
    return { path, exists: Boolean(fileStates.get(path)) };
  }
  return { path, exists: Boolean(fileStates?.[path]) };
};

const rowStatusFor = ({ finalExists, pendingExists, requestExists, acceptedFinalResponse }) => {
  if (acceptedFinalResponse) return 'accepted_final_response_ready_for_intake';
  if (finalExists) return 'final_response_file_present_requires_fresh_preflight';
  if (pendingExists) return 'pending_working_copy_present_waiting_department_final_response';
  if (requestExists) return 'request_file_present_waiting_department_response';
  return 'missing_request_and_response_files';
};

const nextSafeStepFor = ({ status, label }) => {
  if (status === 'accepted_final_response_ready_for_intake') {
    return `${label} is accepted by preflight; keep waiting for the other departments or run intake if all are accepted.`;
  }
  if (status === 'final_response_file_present_requires_fresh_preflight') {
    return `Run finalization preflight so ${label}'s final file is validated before intake.`;
  }
  if (status === 'pending_working_copy_present_waiting_department_final_response') {
    return `Ask ${label} to turn the pending working copy into a clean final response only after real review.`;
  }
  if (status === 'request_file_present_waiting_department_response') {
    return `Route the existing request file to ${label} and collect a final no-live JSON response.`;
  }
  return `Regenerate the request bundle or response workspace before asking ${label} for a final response.`;
};

const buildRows = ({
  requestBundle,
  responseWorkspace,
  finalizationPreflight,
  fileStates = {},
}) => {
  const requests = byDepartment(requestBundle?.requests ?? []);
  const workingCopies = byDepartment(responseWorkspace?.workingCopies ?? []);
  const preflightDepartments = byDepartment(finalizationPreflight?.departments ?? []);

  return uniqueDepartments({ requestBundle, responseWorkspace, finalizationPreflight }).map((department) => {
    const request = requests.get(department) ?? {};
    const workingCopy = workingCopies.get(department) ?? {};
    const preflight = preflightDepartments.get(department) ?? {};
    const label = request.label ?? department;
    const finalResponsePath = request.finalResponsePath
      ?? workingCopy.finalResponsePath
      ?? preflight.finalResponsePath
      ?? preflight.candidates?.final?.path
      ?? null;
    const pendingPath = request.pendingPath
      ?? workingCopy.pendingPath
      ?? preflight.candidates?.pending?.path
      ?? null;
    const requestPath = request.requestPath ?? null;
    const codexDraftPath = request.codexDraftPath
      ?? preflight.candidates?.codex_draft?.path
      ?? null;
    const finalState = fileStateFor(fileStates, finalResponsePath);
    const pendingState = fileStateFor(fileStates, pendingPath);
    const requestState = fileStateFor(fileStates, requestPath);
    const codexDraftState = fileStateFor(fileStates, codexDraftPath);
    const acceptedFinalResponse = Boolean(preflight.acceptedFinalResponse);
    const status = rowStatusFor({
      finalExists: finalState.exists,
      pendingExists: pendingState.exists,
      requestExists: requestState.exists,
      acceptedFinalResponse,
    });

    return {
      department,
      label,
      status,
      acceptedFinalResponse,
      finalResponsePath,
      finalExists: finalState.exists,
      pendingPath,
      pendingExists: pendingState.exists,
      requestPath,
      requestExists: requestState.exists,
      codexDraftPath,
      codexDraftExists: codexDraftState.exists,
      preflightState: preflight.state ?? null,
      preflightAcceptedFinalResponse: acceptedFinalResponse,
      pendingCanBecomeFinal: Boolean(preflight.pendingCanBecomeFinal),
      nextSafeStep: nextSafeStepFor({ status, label }),
    };
  });
};

const buildCommands = ({ responseWorkspace }) => ({
  requestBundle: 'npm run crm:vnext:mailerlite-mini-launch-department-review-request-bundle',
  responseWatcher: 'npm run crm:vnext:mailerlite-mini-launch-department-review-response-watcher',
  finalizationPreflight: 'npm run crm:vnext:mailerlite-mini-launch-department-review-finalization-preflight',
  intakeWhenFinalResponsesValidate: responseWorkspace?.commands?.intakeWhenFinalResponsesExist
    ?? responseWorkspace?.commands?.intake
    ?? null,
  reconciliationWhenIntakeAcceptsResponses: responseWorkspace?.commands?.reconciliationWhenIntakeAcceptsResponses
    ?? responseWorkspace?.commands?.reconciliation
    ?? null,
});

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

const buildResponseWatcher = ({
  requestBundle,
  responseWorkspace,
  finalizationPreflight,
  fileStates = {},
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const rows = buildRows({
    requestBundle,
    responseWorkspace,
    finalizationPreflight,
    fileStates,
  });
  const missingFinalDepartments = rows
    .filter((row) => !row.finalExists)
    .map((row) => row.department);
  const finalFilePresentDepartments = rows
    .filter((row) => row.finalExists)
    .map((row) => row.department);
  const acceptedFinalDepartments = rows
    .filter((row) => row.acceptedFinalResponse)
    .map((row) => row.department);
  const pendingPresentDepartments = rows
    .filter((row) => row.pendingExists && !row.finalExists)
    .map((row) => row.department);
  const requestPresentDepartments = rows
    .filter((row) => row.requestExists)
    .map((row) => row.department);

  const allFinalFilesPresent = rows.length > 0 && rows.every((row) => row.finalExists);
  const allAcceptedByPreflight = rows.length > 0 && rows.every((row) => row.acceptedFinalResponse);
  const status = allAcceptedByPreflight
    ? 'department_review_response_watcher_ready_for_intake_no_live_changes'
    : allFinalFilesPresent
      ? 'department_review_response_watcher_ready_for_finalization_preflight_no_live_changes'
      : 'department_review_response_watcher_waiting_final_responses_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_response_watcher',
    generatedAt,
    ok: true,
    status,
    launch: requestBundle?.launch ?? responseWorkspace?.launch ?? finalizationPreflight?.launch ?? null,
    summary: {
      departmentCount: rows.length,
      acceptedFinalCount: acceptedFinalDepartments.length,
      finalFilePresentCount: finalFilePresentDepartments.length,
      missingFinalCount: missingFinalDepartments.length,
      pendingPresentCount: pendingPresentDepartments.length,
      requestPresentCount: requestPresentDepartments.length,
      readyForIntake: allAcceptedByPreflight,
      openLiveGateCount: Math.max(
        requestBundle?.summary?.openLiveGateCount ?? 0,
        responseWorkspace?.liveGateSummary?.openLiveGateCount ?? 0,
        finalizationPreflight?.liveGateSummary?.openLiveGateCount ?? 0,
      ),
      nextBestMove: allAcceptedByPreflight
        ? 'Run department review intake and reconciliation from final response files.'
        : allFinalFilesPresent
          ? 'Run finalization preflight now; all expected final response files exist.'
          : `Keep collecting final response files for: ${missingFinalDepartments.join(', ') || 'none'}.`,
    },
    missingFinalDepartments,
    finalFilePresentDepartments,
    acceptedFinalDepartments,
    pendingPresentDepartments,
    requestPresentDepartments,
    rows,
    commands: buildCommands({ responseWorkspace }),
    hardStops: [
      'Do not create final response files from this watcher.',
      'Do not treat pending files, request files or Codex drafts as final department responses.',
      'Do not run intake/reconciliation until final response files pass finalization preflight.',
      'Do not open MailerLite, Shopify, CRM, subscriber, workflow, send, Signal Ledger, card, scoring or Fact Store gates from this watcher.',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const fileStatesFromRows = async ({ requestBundle, responseWorkspace, finalizationPreflight }) => {
  const rows = buildRows({
    requestBundle,
    responseWorkspace,
    finalizationPreflight,
    fileStates: {},
  });
  const paths = new Set();
  for (const row of rows) {
    if (row.finalResponsePath) paths.add(row.finalResponsePath);
    if (row.pendingPath) paths.add(row.pendingPath);
    if (row.requestPath) paths.add(row.requestPath);
    if (row.codexDraftPath) paths.add(row.codexDraftPath);
  }

  const states = {};
  await Promise.all([...paths].map(async (path) => {
    states[path] = await pathExists(path);
  }));
  return states;
};

const buildResponseWatcherFromFiles = async (options) => {
  const [requestBundle, responseWorkspace, finalizationPreflight, sourceDigests] = await Promise.all([
    readJson(options.requestBundle),
    readJson(options.responseWorkspace),
    readJson(options.finalizationPreflight),
    Promise.all([
      sourceDigest(options.requestBundle, 'department request paths and final response expectations'),
      sourceDigest(options.responseWorkspace, 'pending/final response workspace and intake commands'),
      sourceDigest(options.finalizationPreflight, 'current finalization validation state'),
    ]),
  ]);
  const fileStates = await fileStatesFromRows({
    requestBundle,
    responseWorkspace,
    finalizationPreflight,
  });
  return buildResponseWatcher({
    requestBundle,
    responseWorkspace,
    finalizationPreflight,
    fileStates,
    sourceDigests,
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (watcher) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Response Watcher',
    '',
    `Generated: ${watcher.generatedAt}`,
    `Status: ${watcher.status}`,
    `Ready for intake: ${watcher.summary.readyForIntake}`,
    `Open live gates: ${watcher.summary.openLiveGateCount}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este watcher revisa si ya existen las respuestas finales de Brand, Web Design y CRM. No crea respuestas, no envia mensajes y no toca sistemas vivos.',
    '',
    '## Summary',
    '',
    `- Departments: ${watcher.summary.departmentCount}`,
    `- Accepted final responses: ${watcher.summary.acceptedFinalCount}`,
    `- Final files present: ${watcher.summary.finalFilePresentCount}`,
    `- Missing final files: ${watcher.summary.missingFinalCount}`,
    `- Pending files present: ${watcher.summary.pendingPresentCount}`,
    `- Request files present: ${watcher.summary.requestPresentCount}`,
    `- Next best move: ${watcher.summary.nextBestMove}`,
    '',
    '## Department Rows',
    '',
  ];

  for (const row of watcher.rows) {
    lines.push(`### ${row.label}`);
    lines.push(`- Department: ${row.department}`);
    lines.push(`- Status: ${row.status}`);
    lines.push(`- Final exists: ${row.finalExists} (${row.finalResponsePath ?? 'missing'})`);
    lines.push(`- Pending exists: ${row.pendingExists} (${row.pendingPath ?? 'missing'})`);
    lines.push(`- Request exists: ${row.requestExists} (${row.requestPath ?? 'missing'})`);
    lines.push(`- Codex draft exists: ${row.codexDraftExists} (${row.codexDraftPath ?? 'missing'})`);
    lines.push(`- Next safe step: ${row.nextSafeStep}`);
    lines.push('');
  }

  lines.push('## Commands', '');
  lines.push('```bash');
  for (const command of Object.values(watcher.commands).filter(Boolean)) lines.push(command);
  lines.push('```');

  lines.push('', '## Hard Stops', '');
  lines.push(renderList(watcher.hardStops));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of watcher.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo reportes; no escribe respuestas finales.');
  lines.push('- Sin mensajes externos enviados.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return lines.join('\n');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const watcher = await buildResponseWatcherFromFiles(options);
  if (options.out) await writeJson(options.out, watcher);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(watcher));

  console.log(JSON.stringify({
    ok: watcher.ok,
    status: watcher.status,
    generatedAt: watcher.generatedAt,
    missingFinalDepartments: watcher.missingFinalDepartments,
    finalFilePresentDepartments: watcher.finalFilePresentDepartments,
    acceptedFinalDepartments: watcher.acceptedFinalDepartments,
    nextBestMove: watcher.summary.nextBestMove,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: watcher.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department response watcher failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildResponseWatcher,
  buildRows,
  buildSafety,
  fileStatesFromRows,
  parseArgs,
  renderMarkdown,
  rowStatusFor,
};
