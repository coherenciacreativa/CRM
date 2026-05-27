#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-delivery-pack-2026-05-27';
const DEFAULT_PACKETS_INDEX = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_index_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-27.json';
const DEFAULT_TEMPLATES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_response_templates_inteligencia_descansar_2026-05-27';
const DEFAULT_RESPONSES_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-delivery-pack.mjs [options]

Options:
  --packets-index <path>   Department packets index JSON. Defaults to ${DEFAULT_PACKETS_INDEX}
  --runbook <path>         Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --templates-dir <path>   Response templates directory. Defaults to ${DEFAULT_TEMPLATES_DIR}
  --responses-dir <path>   Suggested response destination directory. Defaults to ${DEFAULT_RESPONSES_DIR}
  --out <path>             Write JSON delivery pack
  --markdown-out <path>    Write Markdown delivery pack
  --help                   Show this help

Local-only delivery and follow-up pack for Brand/Web/CRM reviews. It prepares
copy-ready review blocks, response paths, validation commands and sequencing.
It never sends messages, calls MailerLite/Shopify/CRM APIs, reads subscribers,
creates groups, edits workflows, sends emails, appends ledgers, writes cards,
changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    packetsIndex: DEFAULT_PACKETS_INDEX,
    runbook: DEFAULT_RUNBOOK,
    templatesDir: DEFAULT_TEMPLATES_DIR,
    responsesDir: DEFAULT_RESPONSES_DIR,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--packets-index') options.packetsIndex = argv[++index];
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--templates-dir') options.templatesDir = argv[++index];
    else if (arg === '--responses-dir') options.responsesDir = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readText = async (path) => readFile(resolve(path), 'utf8');

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

const templatePathFor = (templatesDir, department) => {
  const filename = department === 'web_design'
    ? 'web_design_response_template.json'
    : `${department}_response_template.json`;
  return resolve(templatesDir, filename);
};

const responsePathFor = (responsesDir, department) => {
  const filename = department === 'web_design'
    ? 'web_design_response.json'
    : `${department}_response.json`;
  return resolve(responsesDir, filename);
};

const departmentLabel = (department) => ({
  brand: 'Brand Hub / Brand Department OS',
  web_design: 'Web Design / Shopify',
  crm: 'CRM / Signal OS',
}[department] ?? department);

const departmentPriority = (department) => ({
  brand: 1,
  web_design: 2,
  crm: 2,
}[department] ?? 3);

const buildDeliveryBlock = ({ packet, templatePath, responsePath }) => {
  const reviewPacket = packet.packetJson;
  const safeMessage = [
    `Revisa este paquete no-live para ${departmentLabel(packet.department)}:`,
    '',
    reviewPacket.dispatchBlock,
    '',
    'Devuelve tu respuesta usando esta plantilla JSON:',
    templatePath,
    '',
    'Guarda o entrega la respuesta para este path esperado:',
    responsePath,
    '',
    'Reglas: reviewMode debe ser no_live_review, liveApprovalGranted debe ser false, y cualquier acción viva queda fuera de alcance.',
  ].join('\n');

  return {
    department: packet.department,
    label: departmentLabel(packet.department),
    priority: departmentPriority(packet.department),
    status: reviewPacket.status,
    packetMarkdown: packet.markdown,
    packetJson: packet.json,
    responseTemplate: templatePath,
    expectedResponsePath: responsePath,
    safeMessage,
    requiredReturnShape: reviewPacket.responseTemplate,
    closedActions: reviewPacket.closedActions ?? [],
    openLiveGateCount: 0,
  };
};

const buildValidationCommands = ({ responsesDir }) => {
  const brand = responsePathFor(responsesDir, 'brand');
  const web = responsePathFor(responsesDir, 'web_design');
  const crm = responsePathFor(responsesDir, 'crm');
  return {
    createResponsesDir: `mkdir -p ${resolve(responsesDir)}`,
    intake: `npm run crm:vnext:mailerlite-mini-launch-department-review-intake -- --brand-response ${brand} --web-design-response ${web} --crm-response ${crm} --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.md`,
    reconciliation: `npm run crm:vnext:mailerlite-mini-launch-department-review-reconciliation -- --intake-board /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_after_responses_inteligencia_descansar_2026-05-27.json --brand-response ${brand} --web-design-response ${web} --crm-response ${crm} --out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.json --markdown-out /Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.md`,
  };
};

const buildFollowUpPolicy = ({ packetsIndex, runbook }) => ({
  status: packetsIndex.pendingDepartments?.length
    ? 'send_or_route_department_reviews_next_no_live'
    : 'department_review_delivery_not_needed',
  sequence: [
    'Brand goes first because group semantics, voice and email style can change later dry-runs.',
    'Web Design and CRM can review in parallel after Brand packet is available; they must stay no-live.',
    'Only save structured response JSON files; do not treat prose approval as operational permission.',
    'Run intake and reconciliation after responses exist.',
    'Only accepted no-live reconciliation can unlock another no-live planner or scoped build request.',
  ],
  hardStops: [
    'No live approval can come from a department response.',
    'No Shopify build, preview, form connection or publish from this delivery pack.',
    'No MailerLite group creation, asset build, workflow use, subscriber assignment or send.',
    'No CRM Signal Ledger append, card write, scoring change or Fact Store write.',
    'No onboarding route or production v1 touch.',
  ],
  currentRunbookStatus: runbook.status,
  currentOpenLiveGateCount: runbook.currentState?.liveGates?.openLiveGateCount ?? 0,
});

const loadPacket = async (packetSummary) => ({
  department: packetSummary.department,
  markdown: packetSummary.markdown,
  json: packetSummary.json,
  packetMarkdownText: await readText(packetSummary.markdown),
  packetJson: await readJson(packetSummary.json),
});

const buildDeliveryPack = async ({
  packetsIndex,
  runbook,
  templatesDir,
  responsesDir,
  sourceDigests,
  readPacket = loadPacket,
  generatedAt = new Date().toISOString(),
}) => {
  const packets = await Promise.all((packetsIndex.packets ?? []).map(readPacket));
  const deliveries = packets.map((packet) => buildDeliveryBlock({
    packet,
    templatePath: templatePathFor(templatesDir, packet.department),
    responsePath: responsePathFor(responsesDir, packet.department),
  })).sort((a, b) => a.priority - b.priority || a.department.localeCompare(b.department));

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_delivery_pack',
    generatedAt,
    ok: true,
    status: 'department_review_delivery_pack_ready_no_live_changes',
    launch: packetsIndex.launch ?? runbook.currentState?.miniLaunch?.currentPilot ?? null,
    pendingDepartments: packetsIndex.pendingDepartments ?? [],
    deliveryCount: deliveries.length,
    deliveries,
    responsesDir: resolve(responsesDir),
    validationCommands: buildValidationCommands({ responsesDir }),
    followUpPolicy: buildFollowUpPolicy({ packetsIndex, runbook }),
    liveGateSummary: {
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByDeliveryPack: false,
    },
    sourceDigests,
    safety: buildSafety(),
  };
};

const loadSourceDigests = async (options) => {
  const sources = [
    [options.packetsIndex, 'department packet paths and pending departments'],
    [options.runbook, 'operator state and live gate count'],
  ];
  const digests = [];
  for (const [path, consultedFor] of sources) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push({
      path: resolve(path),
      present: true,
      chars: content.length,
      consultedFor,
    });
  }
  return digests;
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (pack) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Delivery Pack',
    '',
    `Generated: ${pack.generatedAt}`,
    `Status: ${pack.status}`,
    `Open live gates: ${pack.liveGateSummary.openLiveGateCount}`,
    `Pending departments: ${pack.pendingDepartments.join(', ') || 'none'}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete deja listas las entregas no-live para Brand, Web Design y CRM. No envia mensajes ni concede permisos vivos.',
    '',
    '## Delivery Order',
    '',
    renderList(pack.followUpPolicy.sequence),
    '',
    '## Department Blocks',
    '',
  ];

  for (const delivery of pack.deliveries) {
    lines.push(`### ${delivery.label}`);
    lines.push(`- Department: ${delivery.department}`);
    lines.push(`- Status: ${delivery.status}`);
    lines.push(`- Packet: ${delivery.packetMarkdown}`);
    lines.push(`- Response template: ${delivery.responseTemplate}`);
    lines.push(`- Expected response path: ${delivery.expectedResponsePath}`);
    lines.push('');
    lines.push('Message block:');
    lines.push('');
    lines.push('```text');
    lines.push(delivery.safeMessage);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Validation Commands', '');
  lines.push('```bash');
  lines.push(pack.validationCommands.createResponsesDir);
  lines.push(pack.validationCommands.intake);
  lines.push(pack.validationCommands.reconciliation);
  lines.push('```');

  lines.push('', '## Hard Stops', '');
  lines.push(renderList(pack.followUpPolicy.hardStops));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of pack.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
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

const buildDeliveryPackFromFiles = async (options) => {
  const [packetsIndex, runbook, sourceDigests] = await Promise.all([
    readJson(options.packetsIndex),
    readJson(options.runbook),
    loadSourceDigests(options),
  ]);
  return buildDeliveryPack({
    packetsIndex,
    runbook,
    templatesDir: options.templatesDir,
    responsesDir: options.responsesDir,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const pack = await buildDeliveryPackFromFiles(options);
  if (options.out) await writeJson(options.out, pack);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(pack));

  console.log(JSON.stringify({
    ok: pack.ok,
    status: pack.status,
    generatedAt: pack.generatedAt,
    deliveryCount: pack.deliveryCount,
    pendingDepartments: pack.pendingDepartments,
    openLiveGateCount: pack.liveGateSummary.openLiveGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: pack.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite department review delivery pack failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDeliveryBlock,
  buildDeliveryPack,
  buildFollowUpPolicy,
  buildSafety,
  buildValidationCommands,
  parseArgs,
  renderMarkdown,
  responsePathFor,
  templatePathFor,
};
