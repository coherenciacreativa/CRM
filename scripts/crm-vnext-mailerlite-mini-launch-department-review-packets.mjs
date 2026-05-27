#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-packets-2026-05-27';
const DEFAULT_DISPATCH_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_dispatch_inteligencia_descansar_2026-05-27.json';
const DEFAULT_INTAKE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_RECONCILIATION_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json';
const DEFAULT_OUT_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_packets_inteligencia_descansar_2026-05-27';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-packets.mjs [options]

Options:
  --dispatch-packet <path>       Department review dispatch JSON. Defaults to ${DEFAULT_DISPATCH_PACKET}
  --intake-board <path>          Department review intake board JSON. Defaults to ${DEFAULT_INTAKE_BOARD}
  --reconciliation-board <path>  Department review reconciliation JSON. Defaults to ${DEFAULT_RECONCILIATION_BOARD}
  --out-dir <path>               Directory for individual department packets. Defaults to ${DEFAULT_OUT_DIR}
  --index-out <path>             Write JSON index packet
  --markdown-out <path>          Write Markdown index packet
  --help                         Show this help

Local-only department packet materializer. It splits the master dispatch into
one review packet per department, includes the matching response template, and
keeps reconciliation status visible. It never sends messages, calls
MailerLite/Shopify/CRM APIs, reads subscribers, creates groups, edits workflows,
sends emails, appends ledgers, writes cards, changes scoring, or touches Fact
Store.`;

const parseArgs = (argv) => {
  const options = {
    dispatchPacket: DEFAULT_DISPATCH_PACKET,
    intakeBoard: DEFAULT_INTAKE_BOARD,
    reconciliationBoard: DEFAULT_RECONCILIATION_BOARD,
    outDir: DEFAULT_OUT_DIR,
    indexOut: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--dispatch-packet') options.dispatchPacket = argv[++index];
    else if (arg === '--intake-board') options.intakeBoard = argv[++index];
    else if (arg === '--reconciliation-board') options.reconciliationBoard = argv[++index];
    else if (arg === '--out-dir') options.outDir = argv[++index];
    else if (arg === '--index-out') options.indexOut = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const loadSourceDigests = async (options) => {
  const sources = [
    [options.dispatchPacket, 'master review requests and evidence'],
    [options.intakeBoard, 'response templates and pending/accepted state'],
    [options.reconciliationBoard, 'current reconciliation status and live gates'],
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

const slugForDepartment = (department) => department.replace(/[^a-z0-9_]+/gi, '_').toLowerCase();

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

const buildDepartmentPacket = ({ review, intakeBoard, reconciliationBoard, outDir }) => {
  const department = review.department;
  const slug = slugForDepartment(department);
  const responseTemplate = intakeBoard?.responseTemplates?.[department] ?? null;
  const validation = reconciliationBoard?.responseState?.validations?.[department] ?? null;
  const mdPath = join(resolve(outDir), `${slug}_review_packet.md`);
  const jsonPath = join(resolve(outDir), `${slug}_review_packet.json`);

  return {
    schemaVersion: `${SCHEMA_VERSION}:${department}`,
    mode: 'local_only_department_review_packet',
    department,
    owner: review.owner,
    status: validation?.status ?? 'awaiting_response',
    launch: reconciliationBoard?.launch ?? intakeBoard?.launch ?? null,
    objective: review.objective,
    evidencePaths: review.evidencePaths,
    requiredOutput: review.requiredOutput,
    closedActions: review.closedActions,
    dispatchBlock: review.dispatchBlock,
    responseTemplate,
    responseValidation: validation,
    outputPaths: {
      markdown: mdPath,
      json: jsonPath,
    },
    liveGateSummary: {
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByDepartments: false,
    },
    operatorWarnings: [
      'This packet is a review request, not authorization to mutate anything.',
      'Use the responseTemplate to return a structured no-live response.',
      'Keep liveApprovalGranted=false.',
      'Do not create groups, edit Shopify, send emails, append ledgers, write cards, score people, touch Fact Store or route onboarding.',
    ],
    safety: buildSafety(),
  };
};

const buildPacketIndex = ({
  dispatchPacket,
  intakeBoard,
  reconciliationBoard,
  sourceDigests,
  outDir,
  generatedAt = new Date().toISOString(),
}) => {
  const packets = (dispatchPacket.departmentReviews ?? []).map((review) => buildDepartmentPacket({
    review,
    intakeBoard,
    reconciliationBoard,
    outDir,
  }));

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_packets',
    generatedAt,
    ok: true,
    status: 'mini_launch_department_review_packets_ready_no_live_changes',
    launch: dispatchPacket.launch ?? intakeBoard.launch ?? reconciliationBoard.launch ?? null,
    outDir: resolve(outDir),
    packetCount: packets.length,
    packets: packets.map((packet) => ({
      department: packet.department,
      status: packet.status,
      owner: packet.owner,
      markdown: packet.outputPaths.markdown,
      json: packet.outputPaths.json,
    })),
    pendingDepartments: reconciliationBoard?.responseState?.pendingDepartments ?? [],
    acceptedDepartments: reconciliationBoard?.responseState?.acceptedDepartments ?? [],
    unsafeDepartments: reconciliationBoard?.responseState?.unsafeDepartments ?? [],
    liveGateSummary: {
      openLiveGateCount: 0,
      liveApprovalNeededNow: false,
      liveApprovalGrantedByDepartments: false,
    },
    nextNoLiveMoves: [
      'Hand each department its individual packet or use the dispatch block inside it.',
      'Collect responses using the included response template.',
      'Run department review reconciliation with the response files before any next planner.',
      'Keep every live operation behind a later explicit Alejandro approval.',
    ],
    sourceDigests,
    safety: buildSafety(),
    fullPackets: packets,
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderDepartmentPacketMarkdown = (packet) => {
  const lines = [
    `# MailerLite Launch OS v0 - ${packet.department} Review Packet`,
    '',
    `Status: ${packet.status}`,
    `Owner: ${packet.owner}`,
    '',
    '## Objective',
    '',
    packet.objective,
    '',
    '## Evidence',
    '',
    renderList(packet.evidencePaths ?? []),
    '',
    '## Required Output',
    '',
    renderList(packet.requiredOutput ?? []),
    '',
    '## Closed Actions',
    '',
    renderList(packet.closedActions ?? []),
    '',
    '## Dispatch Block',
    '',
    '```text',
    packet.dispatchBlock,
    '```',
    '',
    '## Response Template',
    '',
    '```json',
    JSON.stringify(packet.responseTemplate, null, 2),
    '```',
    '',
    '## Operator Warnings',
    '',
    renderList(packet.operatorWarnings),
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin envio de mensajes externos.',
    '- Sin MailerLite API calls.',
    '- Sin Shopify API calls.',
    '- Sin CRM live API calls.',
    '- Sin subscribers leidos o modificados.',
    '- Sin grupos/workflows/forms creados o editados.',
    '- Sin emails enviados.',
    '- Sin append al Signal Event Ledger.',
    '- Sin card writes, scoring, Fact Store u outbound.',
  ];
  return lines.join('\n');
};

const renderIndexMarkdown = (index) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Packets Index',
    '',
    `Generated: ${index.generatedAt}`,
    `Status: ${index.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Estos paquetes separan el pedido maestro en tres archivos individuales para Brand, Web Design y CRM. No envian mensajes ni abren permisos vivos.',
    '',
    '## Packets',
    '',
  ];

  for (const packet of index.packets) {
    lines.push(`- ${packet.department}: ${packet.status}`);
    lines.push(`  - Markdown: ${packet.markdown}`);
    lines.push(`  - JSON: ${packet.json}`);
  }

  lines.push('', '## Current Response State', '');
  lines.push(`- Accepted: ${index.acceptedDepartments.join(', ') || 'none'}`);
  lines.push(`- Pending: ${index.pendingDepartments.join(', ') || 'none'}`);
  lines.push(`- Unsafe: ${index.unsafeDepartments.join(', ') || 'none'}`);
  lines.push(`- Live gate open count: ${index.liveGateSummary.openLiveGateCount}`);

  lines.push('', '## Next No-Live Moves', '');
  lines.push(renderList(index.nextNoLiveMoves));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of index.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin envio de mensajes externos.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin emails enviados.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

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

const writeDepartmentPackets = async (packets) => {
  const written = [];
  for (const packet of packets) {
    await writeJson(packet.outputPaths.json, packet);
    await writeText(packet.outputPaths.markdown, renderDepartmentPacketMarkdown(packet));
    written.push(packet.outputPaths.json, packet.outputPaths.markdown);
  }
  return written;
};

const buildIndexFromFiles = async (options) => {
  const [dispatchPacket, intakeBoard, reconciliationBoard, sourceDigests] = await Promise.all([
    readJson(options.dispatchPacket),
    readJson(options.intakeBoard),
    readJson(options.reconciliationBoard),
    loadSourceDigests(options),
  ]);

  return buildPacketIndex({
    dispatchPacket,
    intakeBoard,
    reconciliationBoard,
    sourceDigests,
    outDir: options.outDir,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const index = await buildIndexFromFiles(options);
  const writtenPackets = await writeDepartmentPackets(index.fullPackets);
  const indexForFile = {
    ...index,
    fullPackets: undefined,
  };
  if (options.indexOut) await writeJson(options.indexOut, indexForFile);
  if (options.markdownOut) await writeText(options.markdownOut, renderIndexMarkdown(index));

  console.log(JSON.stringify({
    ok: index.ok,
    status: index.status,
    generatedAt: index.generatedAt,
    packetCount: index.packetCount,
    pendingDepartments: index.pendingDepartments,
    acceptedDepartments: index.acceptedDepartments,
    unsafeDepartments: index.unsafeDepartments,
    openLiveGateCount: index.liveGateSummary.openLiveGateCount,
    outDir: index.outDir,
    indexOut: options.indexOut ? resolve(options.indexOut) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    writtenPackets,
    safety: index.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch department review packets failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDepartmentPacket,
  buildPacketIndex,
  buildSafety,
  parseArgs,
  renderDepartmentPacketMarkdown,
  renderIndexMarkdown,
};
