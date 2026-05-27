#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateResponse,
} from './crm-vnext-mailerlite-mini-launch-department-review-intake.mjs';
import {
  finalPathFor,
  pendingPathFor,
} from './crm-vnext-mailerlite-mini-launch-department-review-response-workspace.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-finalize-pending-2026-05-27';
const DEFAULT_INTAKE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27';

const DEPARTMENTS = ['brand', 'web_design', 'crm'];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-finalize-pending.mjs [options]

Options:
  --intake-board <path>     Department review intake board JSON. Defaults to ${DEFAULT_INTAKE_BOARD}
  --responses-dir <path>    Response workspace directory. Defaults to ${DEFAULT_RESPONSES_DIR}
  --department <name|all>   Department to finalize: brand, web_design, crm, or all. Defaults to all
  --write                   Write valid pending responses to final response files
  --approved-by <name>      Required with --write. Human/department reviewer who confirmed finality
  --overwrite-final         Allow replacing an existing final response file
  --out <path>              Write JSON report
  --markdown-out <path>     Write Markdown report
  --help                    Show this help

Local-only finalizer for Brand/Web/CRM no-live review responses. It promotes a
*.pending.json working copy to the final response path only if the pending file
already validates as a no-live department response and contains no Codex draft
metadata. It performs no live actions.`;

const normalizeDepartment = (department) => {
  if (department === 'web') return 'web_design';
  return department;
};

const parseArgs = (argv) => {
  const options = {
    intakeBoard: DEFAULT_INTAKE_BOARD,
    responsesDir: DEFAULT_RESPONSES_DIR,
    department: 'all',
    write: false,
    approvedBy: null,
    overwriteFinal: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--intake-board') options.intakeBoard = argv[++index];
    else if (arg === '--responses-dir') options.responsesDir = argv[++index];
    else if (arg === '--department') options.department = normalizeDepartment(argv[++index]);
    else if (arg === '--write') options.write = true;
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--overwrite-final') options.overwriteFinal = true;
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (options.department !== 'all' && !DEPARTMENTS.includes(options.department)) {
    throw new Error(`unknown_department:${options.department}`);
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
    if (error.code === 'ENOENT') return { exists: false, value: null, error: null };
    return { exists: true, value: null, error: error.message };
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

const selectedDepartmentsFrom = (department) => department === 'all' ? DEPARTMENTS : [department];

const cleanFinalResponse = (response) => {
  const {
    workspaceStatus,
    workspaceInstructions,
    workspaceMeta,
    ...rest
  } = response;
  return rest;
};

const buildSafety = () => ({
  localOnly: true,
  finalResponseFilesOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
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

const planDepartmentFinalization = async ({
  department,
  responsesDir,
  templates,
  write = false,
  approvedBy = null,
  overwriteFinal = false,
}) => {
  const pendingPath = pendingPathFor(responsesDir, department);
  const finalPath = finalPathFor(responsesDir, department);
  const pendingRead = await readJsonIfPresent(pendingPath);
  const finalRead = await readJsonIfPresent(finalPath);
  const template = templates[department];

  if (!template) {
    return {
      department,
      pendingPath,
      finalPath,
      status: 'blocked_missing_response_template_no_live_changes',
      readyToFinalize: false,
      written: false,
      accepted: false,
      blockers: ['missing_response_template'],
    };
  }

  if (!pendingRead.exists) {
    return {
      department,
      pendingPath,
      finalPath,
      status: 'awaiting_pending_response_no_live_changes',
      readyToFinalize: false,
      written: false,
      accepted: false,
      blockers: ['pending_response_file_missing'],
    };
  }

  if (pendingRead.error) {
    return {
      department,
      pendingPath,
      finalPath,
      status: 'blocked_invalid_pending_json_no_live_changes',
      readyToFinalize: false,
      written: false,
      accepted: false,
      blockers: ['invalid_pending_json'],
      error: pendingRead.error,
    };
  }

  const validation = validateResponse({
    department,
    response: pendingRead.value,
    template,
  });
  const cleanResponse = cleanFinalResponse(pendingRead.value);
  const cleanValidation = validateResponse({
    department,
    response: cleanResponse,
    template,
  });

  if (!validation.accepted || !cleanValidation.accepted) {
    return {
      department,
      pendingPath,
      finalPath,
      status: validation.unsafe || cleanValidation.unsafe
        ? 'blocked_unsafe_pending_response_no_live_changes'
        : 'pending_response_not_ready_to_finalize_no_live_changes',
      readyToFinalize: false,
      written: false,
      accepted: false,
      validation,
      cleanValidation,
      blockers: [
        ...new Set([
          ...(validation.missing ?? []),
          ...(validation.unsafeReasons ?? []),
          ...(validation.blockers ?? []),
          ...(cleanValidation.missing ?? []),
          ...(cleanValidation.unsafeReasons ?? []),
          ...(cleanValidation.blockers ?? []),
        ]),
      ],
    };
  }

  if (finalRead.exists && !overwriteFinal) {
    return {
      department,
      pendingPath,
      finalPath,
      status: 'blocked_final_response_already_exists_no_live_changes',
      readyToFinalize: true,
      written: false,
      accepted: false,
      validation,
      cleanValidation,
      blockers: ['final_response_already_exists'],
    };
  }

  if (write && !approvedBy) {
    return {
      department,
      pendingPath,
      finalPath,
      status: 'blocked_write_requires_approved_by_no_live_changes',
      readyToFinalize: true,
      written: false,
      accepted: false,
      validation,
      cleanValidation,
      blockers: ['approved_by_required_for_write'],
    };
  }

  if (write) await writeJson(finalPath, cleanResponse);

  return {
    department,
    pendingPath,
    finalPath,
    status: write
      ? 'final_response_written_no_live_changes'
      : 'pending_response_ready_to_finalize_no_live_changes',
    readyToFinalize: true,
    written: write,
    accepted: write,
    validation,
    cleanValidation,
    removedWorkspaceFields: [
      'workspaceStatus',
      'workspaceInstructions',
      'workspaceMeta',
    ].filter((field) => Object.prototype.hasOwnProperty.call(pendingRead.value, field)),
    approvedBy: write ? approvedBy : null,
  };
};

const statusFrom = (results) => {
  if (results.some((item) => item.status.startsWith('blocked_'))) return 'pending_finalization_blocked_no_live_changes';
  if (results.some((item) => item.written)) return 'pending_responses_finalized_no_live_changes';
  if (results.some((item) => item.readyToFinalize)) return 'pending_responses_ready_to_finalize_no_live_changes';
  return 'pending_responses_not_ready_to_finalize_no_live_changes';
};

const buildFinalizePending = async ({
  intakeBoard,
  responsesDir,
  department = 'all',
  write = false,
  approvedBy = null,
  overwriteFinal = false,
  generatedAt = new Date().toISOString(),
}) => {
  const fullResponsesDir = resolve(responsesDir);
  const templates = intakeBoard.responseTemplates ?? {};
  const departments = selectedDepartmentsFrom(department);
  const results = [];

  for (const selectedDepartment of departments) {
    results.push(await planDepartmentFinalization({
      department: selectedDepartment,
      responsesDir: fullResponsesDir,
      templates,
      write,
      approvedBy,
      overwriteFinal,
    }));
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_finalize_pending',
    generatedAt,
    ok: true,
    status: statusFrom(results),
    responsesDir: fullResponsesDir,
    selectedDepartments: departments,
    writeMode: write,
    approvedBy: write ? approvedBy : null,
    overwriteFinal,
    readyDepartments: results.filter((item) => item.readyToFinalize).map((item) => item.department),
    writtenDepartments: results.filter((item) => item.written).map((item) => item.department),
    blockedDepartments: results.filter((item) => item.status.startsWith('blocked_')).map((item) => item.department),
    results,
    nextSafeStep: results.every((item) => item.written)
      ? 'Run response workspace, then intake and reconciliation with final response files only.'
      : 'Keep editing pending responses until they validate, then rerun with --write --approved-by after department confirmation.',
    hardStops: [
      'Do not create final responses from Codex draft files.',
      'Do not finalize any response that still contains codexDraftMeta.',
      'Do not treat final no-live response files as live approval.',
      'Do not touch MailerLite, Shopify, CRM live APIs, subscribers, workflows, sends, ledgers, cards, scoring or Fact Store.',
    ],
    safety: buildSafety(),
  };
};

const buildFinalizePendingFromFiles = async (options) => {
  const intakeBoard = await readJson(options.intakeBoard);
  return buildFinalizePending({
    intakeBoard,
    responsesDir: options.responsesDir,
    department: options.department,
    write: options.write,
    approvedBy: options.approvedBy,
    overwriteFinal: options.overwriteFinal,
  });
};

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS v0 - Finalize Pending Department Responses',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Responses dir: ${report.responsesDir}`,
    `Write mode: ${report.writeMode}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paso solo promueve respuestas pendientes ya validadas a archivos finales no-vivos. No decide por Brand, Web Design ni CRM; exige que la respuesta pendiente ya pase intake y no tenga metadata de borrador Codex.',
    '',
    '## Departments',
    '',
  ];

  for (const result of report.results) {
    lines.push(`### ${result.department}`);
    lines.push(`- Status: ${result.status}`);
    lines.push(`- Pending path: ${result.pendingPath}`);
    lines.push(`- Final path: ${result.finalPath}`);
    lines.push(`- Ready to finalize: ${result.readyToFinalize}`);
    lines.push(`- Written: ${result.written}`);
    if (result.blockers?.length) lines.push(`- Blockers: ${result.blockers.join(', ')}`);
    if (result.removedWorkspaceFields?.length) lines.push(`- Removed workspace fields: ${result.removedWorkspaceFields.join(', ')}`);
    lines.push('');
  }

  lines.push('## Next Safe Step', '');
  lines.push(`- ${report.nextSafeStep}`);

  lines.push('', '## Hard Stops', '');
  for (const item of report.hardStops) lines.push(`- ${item}`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo escribe archivos finales no-vivos cuando --write y --approved-by estan presentes.');
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

  const report = await buildFinalizePendingFromFiles(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    selectedDepartments: report.selectedDepartments,
    readyDepartments: report.readyDepartments,
    writtenDepartments: report.writtenDepartments,
    blockedDepartments: report.blockedDepartments,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department review finalize pending failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFinalizePending,
  buildFinalizePendingFromFiles,
  buildSafety,
  cleanFinalResponse,
  parseArgs,
  planDepartmentFinalization,
  renderMarkdown,
};
