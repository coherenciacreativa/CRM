#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-operator-queue-2026-05-27';

const DEFAULT_DELIVERY_PACK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_delivery_pack_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RESPONSE_WORKSPACE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_workspace_inteligencia_descansar_2026-05-27.json';
const DEFAULT_FINALIZATION_PREFLIGHT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_finalization_preflight_inteligencia_descansar_2026-05-27.json';
const DEFAULT_DRAFT_ASSIST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_draft_assist_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-operator-queue.mjs [options]

Options:
  --delivery-pack <path>             Department review delivery pack JSON. Defaults to ${DEFAULT_DELIVERY_PACK}
  --response-workspace <path>        Department response workspace JSON. Defaults to ${DEFAULT_RESPONSE_WORKSPACE}
  --finalization-preflight <path>    Finalization preflight JSON. Defaults to ${DEFAULT_FINALIZATION_PREFLIGHT}
  --draft-assist <path>              Codex draft assist JSON. Defaults to ${DEFAULT_DRAFT_ASSIST}
  --out <path>                       Write JSON queue
  --markdown-out <path>              Write Markdown queue
  --help                             Show this help

Local-only operator queue for Brand/Web/CRM final response collection. It
combines delivery blocks, pending/final response state, Codex draft status and
finalization blockers. It never sends messages, writes final responses, calls
MailerLite/Shopify/CRM APIs, reads subscribers, creates groups, edits workflows,
sends emails, appends ledgers, writes cards, changes scoring, or touches Fact
Store.`;

const parseArgs = (argv) => {
  const options = {
    deliveryPack: DEFAULT_DELIVERY_PACK,
    responseWorkspace: DEFAULT_RESPONSE_WORKSPACE,
    finalizationPreflight: DEFAULT_FINALIZATION_PREFLIGHT,
    draftAssist: DEFAULT_DRAFT_ASSIST,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--delivery-pack') options.deliveryPack = argv[++index];
    else if (arg === '--response-workspace') options.responseWorkspace = argv[++index];
    else if (arg === '--finalization-preflight') options.finalizationPreflight = argv[++index];
    else if (arg === '--draft-assist') options.draftAssist = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const sourceDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const loadSourceDigests = async (options) => Promise.all([
  sourceDigest(options.deliveryPack, 'copy-ready no-live department review blocks and response paths'),
  sourceDigest(options.responseWorkspace, 'pending/final response workspace state'),
  sourceDigest(options.finalizationPreflight, 'final response blockers and Codex draft safety state'),
  sourceDigest(options.draftAssist, 'Codex draft assist file paths and draft-only posture'),
]);

const byDepartment = (items = []) => new Map(items.map((item) => [item.department, item]));

const missingFromBlockers = (blockers = []) =>
  blockers.filter((blocker) => String(blocker).startsWith('missing:'));

const actionFor = ({ preflightDepartment }) => {
  if (preflightDepartment?.acceptedFinalResponse) return 'run_intake_and_reconciliation_when_all_departments_are_accepted';
  if (preflightDepartment?.pendingCanBecomeFinal) return 'finalize_pending_only_after_department_confirms_it_is_final';
  if (preflightDepartment?.codexDraftAvailable) return 'ask_department_to_review_codex_draft_and_save_clean_final_response';
  return 'send_delivery_block_and_collect_final_response';
};

const buildDepartmentRow = ({ department, delivery, workingCopy, preflightDepartment, draftFile }) => {
  const finalCandidate = preflightDepartment?.candidates?.final ?? {};
  const pendingCandidate = preflightDepartment?.candidates?.pending ?? {};
  const codexDraftCandidate = preflightDepartment?.candidates?.codex_draft ?? {};
  return {
    department,
    label: delivery?.label ?? department,
    priority: delivery?.priority ?? 3,
    state: preflightDepartment?.state ?? 'unknown',
    action: actionFor({ preflightDepartment }),
    acceptedFinalResponse: Boolean(preflightDepartment?.acceptedFinalResponse),
    pendingCanBecomeFinal: Boolean(preflightDepartment?.pendingCanBecomeFinal),
    codexDraftAvailable: Boolean(preflightDepartment?.codexDraftAvailable),
    finalResponsePath: preflightDepartment?.finalResponsePath
      ?? workingCopy?.finalResponsePath
      ?? delivery?.expectedResponsePath
      ?? draftFile?.finalResponsePath
      ?? null,
    pendingPath: workingCopy?.pendingPath ?? pendingCandidate.path ?? null,
    codexDraftPath: draftFile?.draftPath ?? codexDraftCandidate.path ?? null,
    responseTemplate: delivery?.responseTemplate ?? workingCopy?.templateSourcePath ?? null,
    packetMarkdown: delivery?.packetMarkdown ?? null,
    messageBlock: delivery?.safeMessage ?? null,
    expectedResponsePathMatches: Boolean(delivery?.expectedResponsePath && workingCopy?.finalResponsePath)
      ? delivery.expectedResponsePath === workingCopy.finalResponsePath
      : null,
    blockers: {
      final: finalCandidate.blockers ?? [],
      pending: pendingCandidate.blockers ?? [],
      codexDraft: codexDraftCandidate.blockers ?? [],
    },
    missingFields: missingFromBlockers(pendingCandidate.blockers),
    nextSafeStep: preflightDepartment?.nextSafeStep
      ?? pendingCandidate.nextSafeStep
      ?? finalCandidate.nextSafeStep
      ?? 'Collect final no-live department response.',
  };
};

const buildOperatorQueue = ({
  deliveryPack,
  responseWorkspace,
  finalizationPreflight,
  draftAssist,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const deliveryByDepartment = byDepartment(deliveryPack?.deliveries ?? []);
  const workingByDepartment = byDepartment(responseWorkspace?.workingCopies ?? []);
  const preflightByDepartment = byDepartment(finalizationPreflight?.departments ?? []);
  const draftByDepartment = byDepartment(draftAssist?.draftFiles ?? []);
  const departments = Array.from(new Set([
    ...(deliveryPack?.pendingDepartments ?? []),
    ...(responseWorkspace?.pendingDepartments ?? []),
    ...(finalizationPreflight?.awaitingDepartments ?? []),
    ...deliveryByDepartment.keys(),
    ...workingByDepartment.keys(),
    ...preflightByDepartment.keys(),
    ...draftByDepartment.keys(),
  ]));

  const rows = departments
    .map((department) => buildDepartmentRow({
      department,
      delivery: deliveryByDepartment.get(department),
      workingCopy: workingByDepartment.get(department),
      preflightDepartment: preflightByDepartment.get(department),
      draftFile: draftByDepartment.get(department),
    }))
    .sort((a, b) => a.priority - b.priority || a.department.localeCompare(b.department));

  const acceptedCount = rows.filter((row) => row.acceptedFinalResponse).length;
  const readyPendingCount = rows.filter((row) => row.pendingCanBecomeFinal).length;
  const draftAvailableCount = rows.filter((row) => row.codexDraftAvailable).length;
  const awaitingFinalCount = rows.filter((row) => !row.acceptedFinalResponse).length;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_operator_queue',
    generatedAt,
    ok: true,
    status: responseWorkspace?.readyForIntake
      ? 'department_review_operator_queue_ready_for_intake_no_live_changes'
      : 'department_review_operator_queue_waiting_final_responses_no_live_changes',
    launch: deliveryPack?.launch ?? responseWorkspace?.launch ?? finalizationPreflight?.launch ?? draftAssist?.launch ?? null,
    summary: {
      departmentCount: rows.length,
      acceptedCount,
      readyPendingCount,
      draftAvailableCount,
      awaitingFinalCount,
      readyForIntake: Boolean(responseWorkspace?.readyForIntake || finalizationPreflight?.readyForIntake),
      openLiveGateCount: Math.max(
        deliveryPack?.liveGateSummary?.openLiveGateCount ?? 0,
        responseWorkspace?.liveGateSummary?.openLiveGateCount ?? 0,
      ),
      nextBestMove: awaitingFinalCount > 0
        ? 'Use each row messageBlock plus codexDraftPath as a review aid; collect clean final response files only.'
        : 'Run intake and reconciliation from final response files.',
    },
    rows,
    validationCommands: {
      intake: responseWorkspace?.commands?.intake ?? deliveryPack?.validationCommands?.intake ?? null,
      reconciliation: responseWorkspace?.commands?.reconciliation ?? deliveryPack?.validationCommands?.reconciliation ?? null,
      finalizationPreflight: 'npm run crm:vnext:mailerlite-mini-launch-department-review-finalization-preflight',
    },
    hardStops: [
      'Do not treat message blocks, pending files or Codex drafts as final responses.',
      'Do not run intake/reconciliation until final brand_response.json, web_design_response.json and crm_response.json validate cleanly.',
      'Do not open MailerLite, Shopify, CRM, subscriber, workflow, send, Signal Ledger, card, scoring or Fact Store gates from this queue.',
    ],
    safety: {
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
    },
    sourceDigests,
  };
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (queue) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Operator Queue',
    '',
    `Generated: ${queue.generatedAt}`,
    `Status: ${queue.status}`,
    `Ready for intake: ${queue.summary.readyForIntake}`,
    `Open live gates: ${queue.summary.openLiveGateCount}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Esta cola reune el bloque exacto de entrega, el borrador Codex, el pending file, el path final y los blockers de finalizacion por departamento. No envia mensajes ni escribe respuestas finales.',
    '',
    '## Summary',
    '',
    `- Departments: ${queue.summary.departmentCount}`,
    `- Accepted final responses: ${queue.summary.acceptedCount}`,
    `- Pending files ready to finalize: ${queue.summary.readyPendingCount}`,
    `- Codex drafts available: ${queue.summary.draftAvailableCount}`,
    `- Awaiting final responses: ${queue.summary.awaitingFinalCount}`,
    `- Next best move: ${queue.summary.nextBestMove}`,
    '',
    '## Queue',
    '',
  ];

  for (const row of queue.rows) {
    lines.push(`### ${row.label}`);
    lines.push(`- Department: ${row.department}`);
    lines.push(`- State: ${row.state}`);
    lines.push(`- Action: ${row.action}`);
    lines.push(`- Final response path: ${row.finalResponsePath ?? 'missing'}`);
    lines.push(`- Pending path: ${row.pendingPath ?? 'missing'}`);
    lines.push(`- Codex draft path: ${row.codexDraftPath ?? 'missing'}`);
    lines.push(`- Response template: ${row.responseTemplate ?? 'missing'}`);
    lines.push(`- Missing fields: ${row.missingFields.join(', ') || 'none'}`);
    lines.push(`- Next safe step: ${row.nextSafeStep}`);
    lines.push('');
    lines.push('Message block:');
    lines.push('');
    lines.push('```text');
    lines.push(row.messageBlock ?? 'missing_message_block');
    lines.push('```');
    lines.push('');
  }

  lines.push('## Validation Commands', '');
  lines.push('```bash');
  if (queue.validationCommands.finalizationPreflight) lines.push(queue.validationCommands.finalizationPreflight);
  if (queue.validationCommands.intake) lines.push(queue.validationCommands.intake);
  if (queue.validationCommands.reconciliation) lines.push(queue.validationCommands.reconciliation);
  lines.push('```');

  lines.push('', '## Hard Stops', '');
  lines.push(renderList(queue.hardStops));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of queue.sourceDigests) {
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

const buildOperatorQueueFromFiles = async (options) => {
  const [
    deliveryPack,
    responseWorkspace,
    finalizationPreflight,
    draftAssist,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.deliveryPack),
    readJson(options.responseWorkspace),
    readJson(options.finalizationPreflight),
    readJson(options.draftAssist),
    loadSourceDigests(options),
  ]);

  return buildOperatorQueue({
    deliveryPack,
    responseWorkspace,
    finalizationPreflight,
    draftAssist,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const queue = await buildOperatorQueueFromFiles(options);
  if (options.out) await writeJson(options.out, queue);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(queue));

  console.log(JSON.stringify({
    ok: queue.ok,
    status: queue.status,
    generatedAt: queue.generatedAt,
    departmentCount: queue.summary.departmentCount,
    acceptedCount: queue.summary.acceptedCount,
    awaitingFinalCount: queue.summary.awaitingFinalCount,
    readyForIntake: queue.summary.readyForIntake,
    openLiveGateCount: queue.summary.openLiveGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: queue.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department review operator queue failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDepartmentRow,
  buildOperatorQueue,
  buildOperatorQueueFromFiles,
  parseArgs,
  renderMarkdown,
};
