#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-department-review-dispatch-2026-05-27';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SHOPIFY_HANDOFF_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_GROUP_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-department-review-dispatch.mjs [options]

Options:
  --readiness-board <path>              Existing Mini-Launch readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --cadence-board <path>                Mini-Launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --email-sequence-packet <path>        Email sequence asset JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --brand-candidate-review-packet <path>
                                        Brand candidate review JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET}
  --shopify-handoff-packet <path>       Shopify/Web handoff JSON. Defaults to ${DEFAULT_SHOPIFY_HANDOFF_PACKET}
  --group-dry-run <path>                MailerLite group dry-run JSON. Defaults to ${DEFAULT_GROUP_DRY_RUN}
  --event-contract <path>               CRM event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --seed-test-qa-packet <path>          Seed-test QA JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --out <path>                          Write JSON dispatch packet
  --markdown-out <path>                 Write Markdown dispatch packet
  --help                                Show this help

Local-only department review dispatch for one Mini-Launch OS pilot. It prepares
precise Brand, Web Design and CRM review requests from the current evidence so
operators can review without touching MailerLite, Shopify, subscribers,
workflows, sends, CRM cards, scoring, Signal Ledger, or Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    readinessBoard: DEFAULT_READINESS_BOARD,
    cadenceBoard: DEFAULT_CADENCE_BOARD,
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    brandCandidateReviewPacket: DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET,
    shopifyHandoffPacket: DEFAULT_SHOPIFY_HANDOFF_PACKET,
    groupDryRun: DEFAULT_GROUP_DRY_RUN,
    eventContract: DEFAULT_EVENT_CONTRACT,
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--cadence-board') options.cadenceBoard = argv[++index];
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--brand-candidate-review-packet') options.brandCandidateReviewPacket = argv[++index];
    else if (arg === '--shopify-handoff-packet') options.shopifyHandoffPacket = argv[++index];
    else if (arg === '--group-dry-run') options.groupDryRun = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const loadSourceDigests = async (options) => {
  const sources = [
    [options.readinessBoard, 'current pilot readiness and live-gate posture'],
    [options.cadenceBoard, 'weekly cadence, WIP limits and pipeline governance'],
    [options.emailSequencePacket, 'four-email draft sequence for Brand review'],
    [options.brandCandidateReviewPacket, 'Brand semantic decision request for receipt groups'],
    [options.shopifyHandoffPacket, 'Shopify/Web Design handoff and suggested files'],
    [options.groupDryRun, 'MailerLite group dry-run status and missing Brand dictionary candidates'],
    [options.eventContract, 'CRM event spine and market signal boundaries'],
    [options.seedTestQaPacket, 'seed-test modes and exact approval separation'],
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

const mdPathFromJson = (path) => resolve(path).replace(/\.json$/, '.md');

const launchFrom = (readinessBoard, cadenceBoard, emailSequencePacket) =>
  readinessBoard?.launch
  ?? cadenceBoard?.currentPilot?.launch
  ?? emailSequencePacket?.launch
  ?? {
    launchId: null,
    resourceName: null,
    resourceType: null,
  };

const groupCandidatesFrom = (brandCandidateReviewPacket, groupDryRun) => {
  const requestCandidates = brandCandidateReviewPacket?.brandDecisionRequest?.candidates ?? [];
  if (requestCandidates.length) return requestCandidates.map((candidate) => candidate.name ?? candidate);
  const candidateRows = brandCandidateReviewPacket?.candidateRows ?? [];
  if (candidateRows.length) return candidateRows.map((candidate) => candidate.name ?? candidate);
  const dryRunCandidates = groupDryRun?.requestedGroups ?? groupDryRun?.candidates ?? [];
  return dryRunCandidates.map((candidate) => candidate.name ?? candidate).filter(Boolean);
};

const buildDepartmentReviews = ({
  launch,
  options,
  readinessBoard,
  cadenceBoard,
  brandCandidateReviewPacket,
  groupDryRun,
}) => {
  const groupCandidates = groupCandidatesFrom(brandCandidateReviewPacket, groupDryRun);
  const currentState = readinessBoard?.executiveSummary?.overallState ?? 'unknown';
  const cadenceState = cadenceBoard?.operatingRhythm?.activeCadenceNow ?? 'unknown';

  return [
    {
      department: 'brand',
      owner: 'Brand Hub / Brand Department OS',
      status: 'ready_to_dispatch_no_live_review',
      objective: 'Review voice, promise, public/internal separation, email sequence and MailerLite group semantics for the current pilot.',
      evidencePaths: [
        mdPathFromJson(options.emailSequencePacket),
        mdPathFromJson(options.brandCandidateReviewPacket),
        mdPathFromJson(options.groupDryRun),
        mdPathFromJson(options.cadenceBoard),
      ],
      requiredOutput: [
        'Approve, revise or reject the four-email sequence as Brand review only.',
        'Decide each launch-specific group candidate as add_as_candidate, rename, reject, or crm_first.',
        'Flag any voice issues, over-generic AI phrasing, public/internal leaks, claims risk, CTA mismatch, signature/footer/email-style gap.',
        'Return a concise checkpoint with decisions, edited copy notes, exact group names/statuses, blockers and next safe step.',
      ],
      closedActions: [
        'Do not create MailerLite groups.',
        'Do not build MailerLite assets.',
        'Do not send seed tests or audience emails.',
        'Do not publish or edit Shopify.',
        'Do not route anyone into onboarding.',
      ],
      dispatchBlock: [
        `Revisa el piloto MailerLite Launch OS: ${launch.resourceName} (${launch.launchId}).`,
        '',
        'Modo: revisión Brand no-viva. No autorices ni ejecutes cambios vivos.',
        '',
        'Lee estos archivos:',
        `- ${mdPathFromJson(options.emailSequencePacket)}`,
        `- ${mdPathFromJson(options.brandCandidateReviewPacket)}`,
        `- ${mdPathFromJson(options.groupDryRun)}`,
        `- ${mdPathFromJson(options.cadenceBoard)}`,
        '',
        'Necesito que devuelvas un checkpoint con:',
        '1. Revisión de voz/copy de la secuencia completa de 4 emails.',
        '2. Correcciones puntuales si algo suena genérico, demasiado AI, poco Alejandro, con fuga interna o con claims débiles.',
        `3. Decisión semántica para estos grupos: ${groupCandidates.join('; ') || 'ver packet de candidatos'}. Usa add_as_candidate, rename, reject o crm_first.`,
        '4. Señala si falta aplicar canon de email: firma, footer, CTA, tipografía o estilo visual.',
        '5. Próximo paso seguro, sin tocar MailerLite, Shopify, CRM, subscribers, workflows ni envíos.',
      ].join('\n'),
    },
    {
      department: 'web_design',
      owner: 'Web Design / Shopify',
      status: 'ready_to_dispatch_no_live_review',
      objective: 'Review Shopify-first handoff, mobile UX expectations and whether the pilot can become a local draft without loose HTML.',
      evidencePaths: [
        mdPathFromJson(options.shopifyHandoffPacket),
        mdPathFromJson(options.readinessBoard),
        mdPathFromJson(options.cadenceBoard),
      ],
      requiredOutput: [
        'Say whether the handoff is sufficient for a Shopify-native local draft.',
        'List required visual/mobile/UX corrections before any preview or form connection.',
        'Confirm exact files/components to create only if a later scoped build is approved.',
        'Return blockers and next safe no-live step.',
      ],
      closedActions: [
        'Do not edit Shopify files from this review request.',
        'Do not create preview/draft/live pages.',
        'Do not connect MailerLite forms.',
        'Do not publish a theme or public URL.',
      ],
      dispatchBlock: [
        `Revisa el handoff Shopify/Web del piloto: ${launch.resourceName} (${launch.launchId}).`,
        '',
        'Modo: revisión Web Design no-viva. No edites Shopify todavía.',
        '',
        'Lee estos archivos:',
        `- ${mdPathFromJson(options.shopifyHandoffPacket)}`,
        `- ${mdPathFromJson(options.readinessBoard)}`,
        `- ${mdPathFromJson(options.cadenceBoard)}`,
        '',
        'Necesito que devuelvas un checkpoint con:',
        '1. Si el handoff alcanza para construir una landing/quiz/resource en Shopify sin HTML suelto.',
        '2. Riesgos de diseño, mobile UX, jerarquía visual, CTA, formulario y coherencia con la web actual.',
        '3. Archivos/componentes concretos que crearías si luego se aprueba build local.',
        '4. Qué falta antes de conectar formulario, preview, publicación o MailerLite.',
        '5. Próximo paso seguro sin tocar Shopify, MailerLite, CRM, subscribers, workflows ni envíos.',
      ].join('\n'),
    },
    {
      department: 'crm',
      owner: 'CRM / Signal OS',
      status: 'ready_to_dispatch_no_live_review',
      objective: 'Review event contract, cadence and market-signal posture so the launch learns without corrupting CRM or onboarding.',
      evidencePaths: [
        mdPathFromJson(options.eventContract),
        mdPathFromJson(options.cadenceBoard),
        mdPathFromJson(options.seedTestQaPacket),
        mdPathFromJson(options.readinessBoard),
      ],
      requiredOutput: [
        'Confirm which launch events stay store-only and which can later become projected signals.',
        'Check that receipt groups do not become warmth or product-fit signals without interpretation.',
        'Confirm onboarding handoff remains separate and protected.',
        'List what would be needed before any Signal Ledger append, scoring change or card write.',
      ],
      closedActions: [
        'Do not append Signal Ledger events.',
        'Do not mutate CRM cards, scoring or Fact Store.',
        'Do not treat MailerLite receipts as relationship meaning by themselves.',
        'Do not route mini-launch participants into onboarding.',
      ],
      dispatchBlock: [
        `Revisa el contrato CRM del piloto MailerLite Launch OS: ${launch.resourceName} (${launch.launchId}).`,
        '',
        'Modo: revisión CRM no-viva. No escribas Signal Ledger, cards, scoring ni Fact Store.',
        '',
        'Lee estos archivos:',
        `- ${mdPathFromJson(options.eventContract)}`,
        `- ${mdPathFromJson(options.cadenceBoard)}`,
        `- ${mdPathFromJson(options.seedTestQaPacket)}`,
        `- ${mdPathFromJson(options.readinessBoard)}`,
        '',
        'Necesito que devuelvas un checkpoint con:',
        '1. Qué eventos del mini-lanzamiento son store-only y cuáles podrían proyectarse luego como señal.',
        '2. Cómo evitar que Source/Delivered/Sent se interpreten como interés humano sin evidencia adicional.',
        '3. Qué debe pasar antes de append al Signal Event Ledger, scoring, card writes o Fact Store.',
        '4. Cómo mantener el onboarding como tronco protegido y no como routing automático.',
        `5. Si la cadencia ${cadenceState} es segura para CRM dado el estado actual: ${currentState}.`,
      ].join('\n'),
    },
  ];
};

const buildSafety = () => ({
  localOnly: true,
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

const buildDispatchPacket = ({
  readinessBoard,
  cadenceBoard,
  emailSequencePacket,
  brandCandidateReviewPacket,
  shopifyHandoffPacket,
  groupDryRun,
  eventContract,
  seedTestQaPacket,
  sourceDigests,
  options,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(readinessBoard, cadenceBoard, emailSequencePacket);
  const departmentReviews = buildDepartmentReviews({
    launch,
    options,
    readinessBoard,
    cadenceBoard,
    emailSequencePacket,
    brandCandidateReviewPacket,
    shopifyHandoffPacket,
    groupDryRun,
    eventContract,
    seedTestQaPacket,
  });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_department_review_dispatch',
    generatedAt,
    ok: true,
    status: 'mini_launch_department_review_dispatch_ready_no_live_changes',
    launch,
    currentState: readinessBoard?.executiveSummary?.overallState ?? null,
    cadence: cadenceBoard?.operatingRhythm ?? null,
    departmentReviews,
    nextNoLiveMoves: [
      'Dispatch Brand review first because group semantics and email voice affect the next group dry-run.',
      'Dispatch Web Design review in parallel because it is no-live and cannot mutate Shopify from this packet.',
      'Dispatch CRM review before any Signal Ledger append, market-signal projection, or onboarding handoff design.',
      'After Brand returns candidate decisions, rerun the mini-launch group dry-run before any empty-group creation approval exists.',
    ],
    liveGateSummary: {
      openLiveGateCount: 0,
      reviewOnlyDepartmentCount: departmentReviews.length,
      liveApprovalNeededNow: false,
    },
    operatorWarnings: [
      'This packet prepares review messages; it does not send them.',
      'A department checkpoint is not live approval.',
      'Brand candidate approval does not create MailerLite groups.',
      'Web handoff approval does not publish Shopify or connect forms.',
      'CRM signal review does not append ledgers, write cards, score people, or route onboarding.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Department Review Dispatch',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Piloto: ${packet.launch.resourceName} (${packet.launch.launchId})`,
    `Estado actual: ${packet.currentState}`,
    '',
    'Este paquete deja listas las revisiones de Brand, Web Design y CRM. No envia mensajes ni autoriza acciones vivas; convierte la evidencia existente en pedidos de revision precisos.',
    '',
    '## Next No-Live Moves',
    '',
    renderList(packet.nextNoLiveMoves),
    '',
  ];

  for (const review of packet.departmentReviews) {
    lines.push(`## ${review.department}`);
    lines.push('');
    lines.push(`Owner: ${review.owner}`);
    lines.push(`Status: ${review.status}`);
    lines.push(`Objective: ${review.objective}`);
    lines.push('');
    lines.push('Evidence:');
    lines.push(renderList(review.evidencePaths));
    lines.push('');
    lines.push('Required output:');
    lines.push(renderList(review.requiredOutput));
    lines.push('');
    lines.push('Closed actions:');
    lines.push(renderList(review.closedActions));
    lines.push('');
    lines.push('Dispatch block:');
    lines.push('');
    lines.push('```text');
    lines.push(review.dispatchBlock);
    lines.push('```');
    lines.push('');
  }

  lines.push('## Operator Warnings', '');
  lines.push(renderList(packet.operatorWarnings));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin envio de mensajes externos.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin browser.');
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

const buildPacketFromFiles = async (options) => {
  const [
    readinessBoard,
    cadenceBoard,
    emailSequencePacket,
    brandCandidateReviewPacket,
    shopifyHandoffPacket,
    groupDryRun,
    eventContract,
    seedTestQaPacket,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.readinessBoard),
    readJson(options.cadenceBoard),
    readJson(options.emailSequencePacket),
    readJson(options.brandCandidateReviewPacket),
    readJson(options.shopifyHandoffPacket),
    readJson(options.groupDryRun),
    readJson(options.eventContract),
    readJson(options.seedTestQaPacket),
    loadSourceDigests(options),
  ]);

  return buildDispatchPacket({
    readinessBoard,
    cadenceBoard,
    emailSequencePacket,
    brandCandidateReviewPacket,
    shopifyHandoffPacket,
    groupDryRun,
    eventContract,
    seedTestQaPacket,
    sourceDigests,
    options,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch.launchId,
    reviewOnlyDepartmentCount: packet.liveGateSummary.reviewOnlyDepartmentCount,
    openLiveGateCount: packet.liveGateSummary.openLiveGateCount,
    liveApprovalNeededNow: packet.liveGateSummary.liveApprovalNeededNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch department review dispatch failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildDepartmentReviews,
  buildDispatchPacket,
  buildSafety,
  groupCandidatesFrom,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
