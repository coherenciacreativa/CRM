#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-request-bundle-2026-05-27';

const DEFAULT_OPERATOR_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_operator_queue_inteligencia_descansar_2026-05-27.json';
const DEFAULT_REQUESTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_requests_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-request-bundle.mjs [options]

Options:
  --operator-queue <path>       Department review operator queue JSON. Defaults to ${DEFAULT_OPERATOR_QUEUE}
  --requests-dir <path>         Write per-department request text files. Defaults to ${DEFAULT_REQUESTS_DIR}
  --out <path>                  Write JSON request bundle
  --markdown-out <path>         Write Markdown request bundle
  --help                        Show this help

Local-only request bundle for collecting Brand/Web/CRM final responses. It
turns the operator queue into copy-ready department instructions and local text
files. It never sends messages, writes final responses, calls MailerLite/Shopify
/CRM APIs, reads subscribers, creates groups, edits workflows, sends emails,
appends ledgers, writes cards, changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    operatorQueue: DEFAULT_OPERATOR_QUEUE,
    requestsDir: DEFAULT_REQUESTS_DIR,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--operator-queue') options.operatorQueue = argv[++index];
    else if (arg === '--requests-dir') options.requestsDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const requestFilenameFor = (department, index) => {
  const prefix = String(index + 1).padStart(2, '0');
  return `${prefix}_${department}_final_response_request.txt`;
};

const missingLine = (row) => (row.missingFields?.length
  ? row.missingFields.map((field) => `- ${field}`).join('\n')
  : '- none');

const renderRequestText = (row) => [
  `Mantis, necesito una respuesta final no-live de ${row.label}.`,
  '',
  'Contexto:',
  '- Esto pertenece a MailerLite Launch OS v0 para el mini-lanzamiento Inteligencia para descansar.',
  '- La respuesta debe ser criterio real del departamento, no una copia automática del borrador Codex.',
  '- El borrador Codex puede servir como punto de partida, pero no cuenta como respuesta final.',
  '- La regla rectora se mantiene: Recommendation is not routing.',
  '- No se debe tocar onboarding v1 ni asignar personas a CC · Journey · Editorial onboarding · Eligible sin un gate posterior.',
  '',
  'Archivos de trabajo:',
  `- Codex draft de apoyo: ${row.codexDraftPath ?? 'missing'}`,
  `- Pending file actual: ${row.pendingPath ?? 'missing'}`,
  `- Final response path esperado: ${row.finalResponsePath ?? 'missing'}`,
  `- Response template: ${row.responseTemplate ?? 'missing'}`,
  '',
  'Faltantes detectados por preflight:',
  missingLine(row),
  '',
  'Tarea exacta:',
  '- Revisa el paquete y el draft.',
  '- Produce una respuesta JSON limpia con reviewMode=no_live_review.',
  '- Mantén liveApprovalGranted=false.',
  '- No incluyas codexDraftMeta en la respuesta final.',
  '- Si algo no está listo, deja una objeción concreta y una recomendación no-live.',
  '',
  'Bloque de review:',
  '',
  row.messageBlock ?? 'missing_message_block',
  '',
  'Hard stops:',
  '- No enviar mensajes externos desde este pedido.',
  '- No crear grupos, tags, workflows, subscribers ni sends en MailerLite.',
  '- No editar Shopify ni publicar previews vivos.',
  '- No escribir CRM Signal Ledger, cards, scoring ni Fact Store.',
  '- No tratar esta respuesta como aprobación viva.',
].join('\n');

const buildRequestBundle = ({
  operatorQueue,
  requestsDir,
  generatedAt = new Date().toISOString(),
}) => {
  const rows = [...(operatorQueue.rows ?? [])]
    .sort((a, b) => a.priority - b.priority || a.department.localeCompare(b.department))
    .map((row, index) => ({
      department: row.department,
      label: row.label,
      state: row.state,
      action: row.action,
      finalResponsePath: row.finalResponsePath,
      pendingPath: row.pendingPath,
      codexDraftPath: row.codexDraftPath,
      responseTemplate: row.responseTemplate,
      missingFields: row.missingFields ?? [],
      requestPath: resolve(requestsDir, requestFilenameFor(row.department, index)),
      requestText: renderRequestText(row),
    }));

  const awaitingFinalCount = rows.filter((row) => row.action !== 'run_intake_and_reconciliation_when_all_departments_are_accepted').length;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_request_bundle',
    generatedAt,
    ok: true,
    status: awaitingFinalCount > 0
      ? 'department_review_request_bundle_ready_to_collect_final_responses_no_live_changes'
      : 'department_review_request_bundle_no_requests_needed_no_live_changes',
    launch: operatorQueue.launch ?? null,
    summary: {
      requestCount: rows.length,
      awaitingFinalCount,
      readyForIntake: Boolean(operatorQueue.summary?.readyForIntake),
      openLiveGateCount: operatorQueue.summary?.openLiveGateCount ?? 0,
      nextBestMove: awaitingFinalCount > 0
        ? 'Send or route these local request texts to Brand, Web Design and CRM; collect clean final JSON responses only.'
        : 'Run finalization preflight, intake and reconciliation from final response files.',
    },
    requestsDir: resolve(requestsDir),
    requests: rows,
    validationCommands: operatorQueue.validationCommands ?? {},
    hardStops: [
      'Do not send these requests automatically from this script.',
      'Do not treat Codex drafts, pending files or prose replies as final department responses.',
      'Do not run intake/reconciliation until final response JSON files validate cleanly.',
      'Do not open MailerLite, Shopify, CRM, subscriber, workflow, send, Signal Ledger, card, scoring or Fact Store gates from this bundle.',
    ],
    safety: {
      localOnly: true,
      requestFilesWrittenOnly: true,
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
    sourceDigests: [
      {
        path: resolve(operatorQueue.sourcePath ?? DEFAULT_OPERATOR_QUEUE),
        present: true,
        consultedFor: 'department review operator queue',
      },
    ],
  };
};

const renderMarkdown = (bundle) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Request Bundle',
    '',
    `Generated: ${bundle.generatedAt}`,
    `Status: ${bundle.status}`,
    `Ready for intake: ${bundle.summary.readyForIntake}`,
    `Open live gates: ${bundle.summary.openLiveGateCount}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este bundle convierte la cola operativa en solicitudes concretas para Brand, Web Design y CRM. No envia mensajes ni escribe respuestas finales; solo deja los textos listos para que el operador los rote por el canal correcto.',
    '',
    '## Summary',
    '',
    `- Requests: ${bundle.summary.requestCount}`,
    `- Awaiting final responses: ${bundle.summary.awaitingFinalCount}`,
    `- Requests dir: ${bundle.requestsDir}`,
    `- Next best move: ${bundle.summary.nextBestMove}`,
    '',
    '## Requests',
    '',
  ];

  for (const request of bundle.requests) {
    lines.push(`### ${request.label}`);
    lines.push(`- Department: ${request.department}`);
    lines.push(`- State: ${request.state}`);
    lines.push(`- Action: ${request.action}`);
    lines.push(`- Request file: ${request.requestPath}`);
    lines.push(`- Final response path: ${request.finalResponsePath ?? 'missing'}`);
    lines.push('');
    lines.push('```text');
    lines.push(request.requestText);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Validation Commands', '');
  lines.push('```bash');
  if (bundle.validationCommands.finalizationPreflight) lines.push(bundle.validationCommands.finalizationPreflight);
  if (bundle.validationCommands.intake) lines.push(bundle.validationCommands.intake);
  if (bundle.validationCommands.reconciliation) lines.push(bundle.validationCommands.reconciliation);
  lines.push('```');

  lines.push('', '## Hard Stops', '');
  for (const hardStop of bundle.hardStops) lines.push(`- ${hardStop}`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo escribe archivos de solicitud y reportes.');
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

const writeRequestFiles = async (bundle) => {
  await mkdir(bundle.requestsDir, { recursive: true });
  await Promise.all(bundle.requests.map((request) => writeText(request.requestPath, request.requestText)));
};

const buildRequestBundleFromFiles = async (options) => {
  const operatorQueue = await readJson(options.operatorQueue);
  return buildRequestBundle({
    operatorQueue: {
      ...operatorQueue,
      sourcePath: options.operatorQueue,
    },
    requestsDir: options.requestsDir,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const bundle = await buildRequestBundleFromFiles(options);
  await writeRequestFiles(bundle);
  if (options.out) await writeJson(options.out, bundle);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(bundle));

  console.log(JSON.stringify({
    ok: bundle.ok,
    status: bundle.status,
    generatedAt: bundle.generatedAt,
    requestCount: bundle.summary.requestCount,
    awaitingFinalCount: bundle.summary.awaitingFinalCount,
    readyForIntake: bundle.summary.readyForIntake,
    openLiveGateCount: bundle.summary.openLiveGateCount,
    requestsDir: bundle.requestsDir,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: bundle.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department review request bundle failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildRequestBundle,
  buildRequestBundleFromFiles,
  parseArgs,
  renderMarkdown,
  renderRequestText,
};
