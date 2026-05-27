#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  validateResponse,
} from './crm-vnext-mailerlite-mini-launch-department-review-intake.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-response-workspace-2026-05-27';
const DEFAULT_DELIVERY_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json';
const DEFAULT_INTAKE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-response-workspace.mjs [options]

Options:
  --delivery-pack <path>       Department review delivery pack JSON. Defaults to ${DEFAULT_DELIVERY_PACK}
  --intake-board <path>        Department review intake board JSON. Defaults to ${DEFAULT_INTAKE_BOARD}
  --responses-dir <path>       Response workspace directory. Defaults to ${DEFAULT_RESPONSES_DIR}
  --overwrite-pending          Overwrite existing *.pending.json working copies
  --no-write-pending           Do not write pending working copies; only report status
  --out <path>                 Write JSON response workspace board
  --markdown-out <path>        Write Markdown response workspace board
  --help                       Show this help

Local-only workspace for Brand/Web/CRM no-live responses. It writes pending
working copies that cannot be mistaken for final accepted responses, tracks the
expected final response files, and keeps all live gates closed. It never sends
messages, calls MailerLite/Shopify/CRM APIs, reads subscribers, creates groups,
edits workflows, sends emails, appends ledgers, writes cards, changes scoring,
or touches Fact Store.`;

const DEPARTMENTS = ['brand', 'web_design', 'crm'];

const parseArgs = (argv) => {
  const options = {
    deliveryPack: DEFAULT_DELIVERY_PACK,
    intakeBoard: DEFAULT_INTAKE_BOARD,
    responsesDir: DEFAULT_RESPONSES_DIR,
    overwritePending: false,
    writePending: true,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--delivery-pack') options.deliveryPack = argv[++index];
    else if (arg === '--intake-board') options.intakeBoard = argv[++index];
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
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const filenameFor = (department, suffix) => `${department}_response.${suffix}.json`;

const pendingPathFor = (responsesDir, department) => resolve(responsesDir, filenameFor(department, 'pending'));

const finalPathFor = (responsesDir, department) => resolve(responsesDir, `${department}_response.json`);

const deliveryFor = (deliveryPack, department) =>
  (deliveryPack.deliveries ?? []).find((delivery) => delivery.department === department) ?? null;

const buildPendingWorkingCopy = ({ department, template, finalResponsePath, generatedAt }) => ({
  ...template,
  workspaceStatus: 'pending_working_copy_not_final_response',
  workspaceInstructions: [
    'Edit this as a working copy only.',
    `When complete, save the final response at ${finalResponsePath}.`,
    'Keep reviewMode as no_live_review.',
    'Keep liveApprovalGranted as false.',
    'Do not use this file as live approval for MailerLite, Shopify, CRM, workflows, subscribers, sends, ledgers, cards, scoring, or Fact Store.',
  ],
  workspaceMeta: {
    department,
    generatedAt,
    finalResponsePath,
    pendingFileIsNotAcceptedByIntake: true,
  },
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

const buildFinalResponseState = async ({ responsesDir, templates }) => {
  const states = {};
  for (const department of DEPARTMENTS) {
    const path = finalPathFor(responsesDir, department);
    const read = await readJsonIfPresent(path);
    if (!read.exists) {
      states[department] = {
        department,
        path,
        exists: false,
        status: 'awaiting_final_response_file',
        accepted: false,
        unsafe: false,
        missing: ['final_response_file'],
      };
    } else if (read.error) {
      states[department] = {
        department,
        path,
        exists: true,
        status: 'invalid_json_final_response_blocked',
        accepted: false,
        unsafe: true,
        error: read.error,
      };
    } else {
      states[department] = {
        path,
        exists: true,
        ...validateResponse({
          department,
          response: read.value,
          template: templates[department],
        }),
      };
    }
  }
  return states;
};

const buildSafety = () => ({
  localOnly: true,
  filesWrittenOnly: true,
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
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  signalLedgerAppendPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildCommands = ({ responsesDir }) => {
  const brand = finalPathFor(responsesDir, 'brand');
  const web = finalPathFor(responsesDir, 'web_design');
  const crm = finalPathFor(responsesDir, 'crm');
  return {
    createWorkspace: `npm run crm:vnext:mailerlite-mini-launch-department-review-response-workspace -- --responses-dir ${resolve(responsesDir)} --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.md`,
    intakeWhenFinalResponsesExist: `npm run crm:vnext:mailerlite-mini-launch-department-review-intake -- --brand-response ${brand} --web-design-response ${web} --crm-response ${crm} --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.md`,
    reconciliationWhenIntakeAcceptsResponses: `npm run crm:vnext:mailerlite-mini-launch-department-review-reconciliation -- --intake-board /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.json --brand-response ${brand} --web-design-response ${web} --crm-response ${crm} --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.md`,
  };
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

const statusFrom = (finalResponseState) => {
  const values = Object.values(finalResponseState);
  if (values.some((item) => item.unsafe)) return 'blocked_by_invalid_or_unsafe_final_response_no_live_changes';
  if (values.every((item) => item.accepted)) return 'department_review_response_workspace_ready_for_intake_no_live_changes';
  return 'department_review_response_workspace_ready_awaiting_final_responses_no_live_changes';
};

const buildResponseWorkspace = async ({
  deliveryPack,
  intakeBoard,
  responsesDir,
  overwritePending = false,
  writePending = true,
  generatedAt = new Date().toISOString(),
}) => {
  const fullResponsesDir = resolve(responsesDir);
  const templates = intakeBoard.responseTemplates ?? {};
  const workingCopies = [];

  if (writePending) await mkdir(fullResponsesDir, { recursive: true });

  for (const department of DEPARTMENTS) {
    const template = templates[department];
    const pendingPath = pendingPathFor(fullResponsesDir, department);
    const finalResponsePath = finalPathFor(fullResponsesDir, department);
    const delivery = deliveryFor(deliveryPack, department);
    const pendingCopy = buildPendingWorkingCopy({
      department,
      template,
      finalResponsePath,
      generatedAt,
    });
    const writeState = writePending
      ? await writePendingCopy({
        path: pendingPath,
        value: pendingCopy,
        overwrite: overwritePending,
      })
      : {
        path: pendingPath,
        written: false,
        existedBefore: (await readJsonIfPresent(pendingPath)).exists,
        preservedExisting: true,
        error: null,
      };

    workingCopies.push({
      department,
      pendingPath,
      finalResponsePath,
      templateSourcePath: delivery?.responseTemplate ?? null,
      deliveryPacketPath: delivery?.packetJson ?? null,
      expectedFinalPathFromDeliveryPack: delivery?.expectedResponsePath ?? finalResponsePath,
      reviewMode: pendingCopy.reviewMode,
      liveApprovalGranted: pendingCopy.liveApprovalGranted,
      decisionFieldsRemainPending: true,
      pendingFileIsAcceptedByIntake: false,
      ...writeState,
    });
  }

  const finalResponseState = await buildFinalResponseState({
    responsesDir: fullResponsesDir,
    templates,
  });
  const acceptedDepartments = Object.values(finalResponseState).filter((item) => item.accepted).map((item) => item.department);
  const pendingDepartments = Object.values(finalResponseState).filter((item) => !item.accepted).map((item) => item.department);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_response_workspace',
    generatedAt,
    ok: true,
    status: statusFrom(finalResponseState),
    launch: intakeBoard.launch ?? deliveryPack.launch ?? null,
    responsesDir: fullResponsesDir,
    readyForIntake: pendingDepartments.length === 0,
    acceptedDepartments,
    pendingDepartments,
    workingCopies,
    finalResponseState,
    commands: buildCommands({ responsesDir: fullResponsesDir }),
    operatorRules: [
      'Use *.pending.json files only as working copies.',
      'Only brand_response.json, web_design_response.json and crm_response.json are final response paths.',
      'Final responses must keep reviewMode=no_live_review and liveApprovalGranted=false.',
      'Accepted responses unlock only no-live reconciliation; they never authorize live systems.',
      'If a pending file already exists, preserve it unless --overwrite-pending is explicit.',
    ],
    liveGateSummary: {
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByWorkspace: false,
    },
    safety: buildSafety(),
  };
};

const loadSourceDigests = async (options) => Promise.all([
  sourceDigest(options.deliveryPack, 'delivery blocks, template paths and expected final response paths'),
  sourceDigest(options.intakeBoard, 'response templates, launch identity and no-live validation rules'),
]);

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (workspace) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Response Workspace',
    '',
    `Generated: ${workspace.generatedAt}`,
    `Status: ${workspace.status}`,
    `Ready for intake: ${workspace.readyForIntake}`,
    `Open live gates: ${workspace.liveGateSummary.openLiveGateCount}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Esta bandeja deja copias de trabajo pendientes para Brand, Web Design y CRM, y separa esas copias de las respuestas finales que el intake puede validar.',
    '',
    '## Working Copies',
    '',
  ];

  for (const copy of workspace.workingCopies) {
    lines.push(`### ${copy.department}`);
    lines.push(`- Pending working copy: ${copy.pendingPath}`);
    lines.push(`- Final response path: ${copy.finalResponsePath}`);
    lines.push(`- Written now: ${copy.written}`);
    lines.push(`- Preserved existing: ${copy.preservedExisting}`);
    lines.push(`- Accepted by intake: ${copy.pendingFileIsAcceptedByIntake}`);
    lines.push(`- Live approval granted: ${copy.liveApprovalGranted}`);
    lines.push('');
  }

  lines.push('## Final Response State', '');
  for (const state of Object.values(workspace.finalResponseState)) {
    lines.push(`- ${state.department}: ${state.status} (${state.path})`);
  }

  lines.push('', '## Commands', '');
  lines.push('```bash');
  lines.push(workspace.commands.createWorkspace);
  lines.push(workspace.commands.intakeWhenFinalResponsesExist);
  lines.push(workspace.commands.reconciliationWhenIntakeAcceptsResponses);
  lines.push('```');

  lines.push('', '## Operator Rules', '');
  lines.push(renderList(workspace.operatorRules));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of workspace.sourceDigests ?? []) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin mensajes externos enviados.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return lines.join('\n');
};

const buildResponseWorkspaceFromFiles = async (options) => {
  const [deliveryPack, intakeBoard, sourceDigests] = await Promise.all([
    readJson(options.deliveryPack),
    readJson(options.intakeBoard),
    loadSourceDigests(options),
  ]);
  const workspace = await buildResponseWorkspace({
    deliveryPack,
    intakeBoard,
    responsesDir: options.responsesDir,
    overwritePending: options.overwritePending,
    writePending: options.writePending,
  });
  return {
    ...workspace,
    sourceDigests,
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const workspace = await buildResponseWorkspaceFromFiles(options);
  if (options.out) await writeJson(options.out, workspace);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(workspace));

  console.log(JSON.stringify({
    ok: workspace.ok,
    status: workspace.status,
    generatedAt: workspace.generatedAt,
    responsesDir: workspace.responsesDir,
    readyForIntake: workspace.readyForIntake,
    acceptedDepartments: workspace.acceptedDepartments,
    pendingDepartments: workspace.pendingDepartments,
    openLiveGateCount: workspace.liveGateSummary.openLiveGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: workspace.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch department review response workspace failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCommands,
  buildFinalResponseState,
  buildPendingWorkingCopy,
  buildResponseWorkspace,
  buildResponseWorkspaceFromFiles,
  buildSafety,
  finalPathFor,
  parseArgs,
  pendingPathFor,
  renderMarkdown,
};
