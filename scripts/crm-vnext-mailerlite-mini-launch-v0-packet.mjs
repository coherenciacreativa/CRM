#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-v0-packet-2026-05-27';
const DEFAULT_LEAD_MAGNET_PATTERN = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/LEAD_MAGNET_OPERATING_PATTERN_V0_1.md';
const DEFAULT_CREATIVE_QA = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/END_TO_END_CREATIVE_QA_PROTOCOL.md';
const DEFAULT_EMAIL_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CRM_SOURCE_MAP = '/Users/alejandrogomez/CRM/docs/crm-vnext/source-of-truth-map.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-v0-packet.mjs [options]

Options:
  --launch-id <id>          Stable CRM launch id. Defaults to mini_launch_template_v0
  --resource-name <name>    Human resource name. Defaults to Mini Launch Template
  --resource-type <type>    guide|quiz|game|audio|practice|interactive. Defaults to guide
  --out <path>              Write JSON packet
  --markdown-out <path>     Write Markdown packet
  --help                    Show this help

Local-only Mini-Launch OS v0 packet. It turns Brand + CRM + MailerLite rules into
a reusable operating architecture for small launches. It does not call MailerLite,
Shopify, Gmail, Instagram, CRM live APIs, or send anything.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const slugify = (value) =>
  cleanString(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'mini_launch';

const titleCase = (value) =>
  cleanString(value)
    ?.split(/\s+/)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ') || 'Mini Launch Template';

const parseArgs = (argv) => {
  const options = {
    launchId: 'mini_launch_template_v0',
    resourceName: 'Mini Launch Template',
    resourceType: 'guide',
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--launch-id') options.launchId = argv[++index];
    else if (arg === '--resource-name') options.resourceName = argv[++index];
    else if (arg === '--resource-type') options.resourceType = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.launchId = slugify(options.launchId);
  options.resourceName = titleCase(options.resourceName);
  options.resourceType = slugify(options.resourceType);
  return options;
};

const sourceReceiptTypeFor = (resourceType) => {
  if (resourceType === 'quiz') return 'Quiz';
  if (resourceType === 'game' || resourceType === 'interactive') return 'Resource';
  if (resourceType === 'audio' || resourceType === 'practice') return 'Resource';
  return 'Resource';
};

const deliveredReceiptTypeFor = (resourceType) => {
  if (resourceType === 'quiz') return 'Quiz result';
  if (resourceType === 'game' || resourceType === 'interactive') return 'Interactive';
  if (resourceType === 'audio') return 'Audio';
  if (resourceType === 'practice') return 'Practice';
  return 'Guide';
};

const buildReceiptPlan = ({ launchId, resourceName, resourceType }) => {
  const sourceType = sourceReceiptTypeFor(resourceType);
  const deliveredType = deliveredReceiptTypeFor(resourceType);
  const sourceGroup = `CC · Source · ${sourceType} · ${resourceName}`;
  const deliveredGroup = `CC · Delivered · ${deliveredType} · ${resourceName}`;
  return {
    launchId,
    resourceName,
    resourceType,
    sourceGroup,
    deliveredGroup,
    audienceCandidate: 'CC · Audience · Mini-launches · Eligible',
    experimentPosture: {
      crmFirst: true,
      crmKey: `experiment.launch_id=${launchId}`,
      mailerLiteExperimentGroupDefault: null,
      createMailerLiteExperimentGroupOnlyIf: [
        'MailerLite needs routing inside a workflow.',
        'MailerLite needs dedupe/exclusion that CRM cannot enforce at send time.',
        'A later dry-run proves the group name is in Brand dictionary and Alejandro approves creation.',
      ],
    },
    sentReceipts: {
      default: 'only_for_canonical_followup_content',
      rule: 'Do not create Sent groups for every small email. Create Sent only when the content becomes reusable/canonical or dedupe-critical.',
    },
  };
};

const buildOperatingSequence = () => [
  {
    phase: 'idea_intake',
    owner: 'Brand Front Desk',
    output: 'Mini-launch brief: audience, promise, resource format, public/private surfaces, confirmed facts, open decisions.',
    liveMutationAllowed: false,
  },
  {
    phase: 'brand_direction',
    owner: 'Brand Department',
    output: 'Offer/copy guardrails, voice notes, claim limits, visual direction, CTA posture.',
    liveMutationAllowed: false,
  },
  {
    phase: 'public_offer_copy',
    owner: 'Brand Copy / Editorial',
    output: 'Landing, CTA, resource and email copy drafted with Alejandro voice; no internal strategy language in public surfaces.',
    liveMutationAllowed: false,
  },
  {
    phase: 'web_shopify_preview_or_handoff',
    owner: 'Web Design / Shopify',
    output: 'Shopify preview/draft or exact Web Design handoff; no loose HTML as final.',
    liveMutationAllowed: false,
  },
  {
    phase: 'resource_production',
    owner: 'Brand Editorial',
    output: 'Guide, quiz, game, audio, practice, or interactive resource with public/internal separation.',
    liveMutationAllowed: false,
  },
  {
    phase: 'email_sequence_design',
    owner: 'Email / MailerLite',
    output: 'Draft/test-only email sequence, inbox QA, visual canon applied, no audience sends.',
    liveMutationAllowed: false,
  },
  {
    phase: 'mailerlite_draft_test_lane',
    owner: 'Email / MailerLite',
    output: 'Disabled draft or seed-only test lane; exact recipient and groups before any test send.',
    liveMutationAllowed: false,
  },
  {
    phase: 'receipt_taxonomy_plan',
    owner: 'CRM / MailerLite Planner',
    output: 'Fresh scan, Brand dictionary alignment, unknown-group inventory, and dry-run before any group creation.',
    liveMutationAllowed: false,
  },
  {
    phase: 'crm_signal_plan',
    owner: 'CRM / Observability',
    output: 'Source, Delivered, optional Sent, CRM-first Experiment identity, signal map, dry-run before groups.',
    liveMutationAllowed: false,
  },
  {
    phase: 'qa_functional_creative',
    owner: 'Agency QA',
    output: 'Functional status and creative status reported separately before anything public/audience-facing.',
    liveMutationAllowed: false,
  },
  {
    phase: 'human_approval_and_launch',
    owner: 'Alejandro',
    output: 'One grouped decision for the next narrow live step: preview, test, publish, send, continue, iterate, or archive.',
    liveMutationAllowed: false,
  },
  {
    phase: 'learning_loop',
    owner: 'CRM + Brand',
    output: 'Market-signal review: what to continue, improve, turn into larger product, or archive.',
    liveMutationAllowed: false,
  },
];

const buildDefaultEmailSequence = () => [
  {
    step: 1,
    role: 'delivery_and_orientation',
    purpose: 'Cumplir la promesa del recurso, orientar con calidez y abrir una relacion de lectura.',
    receipts: ['Delivered group if resource is actually delivered'],
    sendPosture: 'draft_or_test_only_until_approved',
  },
  {
    step: 2,
    role: 'practice_or_value',
    purpose: 'Ayudar a usar el recurso con una practica pequena, sin sonar a automatizacion generica.',
    receipts: ['Sent group only if this becomes canonical reusable content'],
    sendPosture: 'draft_or_test_only_until_approved',
  },
  {
    step: 3,
    role: 'story_or_editorial_depth',
    purpose: 'Profundizar con una carta, articulo o ejemplo que conecte con la voz de Alejandro.',
    receipts: ['Sent group if it reuses a canonical article/carta'],
    sendPosture: 'draft_or_test_only_until_approved',
  },
  {
    step: 4,
    role: 'invitation_or_feedback',
    purpose: 'Invitar a responder, explorar un siguiente paso o dejar una senal de interes medible.',
    receipts: ['CRM signal first; MailerLite group only if routing/dedupe needs it'],
    sendPosture: 'draft_or_test_only_until_approved',
  },
];

const buildPublicSurfaceGuardrails = () => ({
  separationRequired: true,
  publicSurfaces: ['landing', 'resource', 'email body', 'thank-you page', 'caption_or_dm_copy'],
  internalSurfaces: ['strategy notes', 'CRM fields', 'MailerLite groups', 'tags', 'automation plan', 'QA receipt'],
  bannedInternalTermsInPublicCopy: [
    'lead magnet',
    'funnel',
    'embudo',
    'captura',
    'CRM',
    'tag',
    'automatizacion',
    'MailerLite',
    'simulado',
    'review',
  ],
  replacementTone: [
    'guia',
    'practica',
    'recurso',
    'serie por correo',
    'recibir',
    'guardar tu lugar',
    'continuar leyendo',
  ],
});

const buildCrmSignalMap = ({ launchId }) => [
  { event: 'mini_launch_intake_created', source: 'Brand/Mantis', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'brand_brief_approved', source: 'Brand Hub', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'landing_preview_ready', source: 'Shopify/Web Design', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'source_assigned', source: 'MailerLite group or Shopify form', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'resource_delivered', source: 'MailerLite Delivered group or email evidence', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'content_sent', source: 'MailerLite Sent group only for canonical follow-up content', key: launchId, ledger: 'CRM Signal Event Ledger' },
  { event: 'email_opened_or_clicked', source: 'MailerLite engagement snapshot', key: launchId, ledger: 'Signal Event Ledger -> Engagement Snapshot' },
  { event: 'reply_received', source: 'Gmail/newsletter reply evidence', key: launchId, ledger: 'Signal Event Ledger' },
  { event: 'ig_signal_observed', source: 'Instagram comments/likes/saves/shares when available', key: launchId, ledger: 'Signal Event Ledger' },
  { event: 'quiz_or_game_completed', source: 'quiz/game/app evidence when instrumented', key: launchId, ledger: 'Signal Event Ledger' },
  { event: 'market_signal_reviewed', source: 'CRM analyst packet', key: launchId, ledger: 'Review packet / decision ledger' },
  { event: 'continue_or_archive_decision', source: 'Alejandro decision', key: launchId, ledger: 'Decision ledger' },
];

const buildApprovalGates = () => [
  { gate: 'create_empty_groups', allowedNow: false, requiredEvidence: 'Fresh MailerLite scan + Brand dictionary alignment + exact approval phrase.' },
  { gate: 'shopify_preview_or_publish', allowedNow: false, requiredEvidence: 'Shopify preview/draft ready; live publish needs explicit approval.' },
  { gate: 'create_or_edit_mailerlite_workflow', allowedNow: false, requiredEvidence: 'Disabled draft plan; no active workflow touch without exact approval.' },
  { gate: 'seed_test_send', allowedNow: false, requiredEvidence: 'Exact seed email and test scope approved.' },
  { gate: 'audience_send', allowedNow: false, requiredEvidence: 'Functional + creative QA green/yellow accepted and explicit audience send approval.' },
  { gate: 'crm_card_or_score_mutation', allowedNow: false, requiredEvidence: 'CRM write/score approval path; signal events may be staged first.' },
];

const buildHumanInputsMinimum = () => [
  'Idea o tension principal del mini-lanzamiento.',
  'Formato preferido si Alejandro ya lo sabe: guia, quiz, juego, audio, practica, checklist o recurso interactivo.',
  'Audiencia inicial o contexto de comunidad donde se va a probar.',
  'Limites de promesa: que puede decirse y que no debe prometerse.',
  'Criterio de exito: respuestas, registros, clicks, replies, ventas, conversaciones o aprendizaje.',
  'Aprobacion exacta antes de cualquier paso vivo.',
];

const buildSuccessMetrics = () => ({
  speed: 'El sistema puede pasar de idea a packet revisable sin pedirle trabajo operativo innecesario a Alejandro.',
  coherence: 'Brand, Web, MailerLite y CRM usan el mismo launch_id, promesa, recurso y separacion publica/interna.',
  creativeQuality: 'El resultado no parece template generico; pasa QA creativo o declara pendiente exacto.',
  signalQuality: 'Cada mini-lanzamiento produce señales legibles: registros, entrega, opens/clicks, replies, IG response, completion if available.',
  learningDecision: 'Cada ciclo cierra con continue, iterate, archive o develop_into_larger_product.',
  safety: 'No hay envios, publicaciones, workflow edits ni mutaciones de audiencia sin aprobacion explicita.',
});

const safetyBlock = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmCardMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildMiniLaunchPacket = ({ options, sourceDigests, generatedAt = new Date().toISOString() }) => {
  const receiptPlan = buildReceiptPlan(options);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_v0_packet',
    generatedAt,
    ok: true,
    status: 'mini_launch_architecture_ready_for_reuse',
    sourceDigests,
    launchTemplate: {
      launchId: options.launchId,
      resourceName: options.resourceName,
      resourceType: options.resourceType,
      cadenceGoal: 'weekly_first_then_every_three_days_after_operational_confidence',
      publicPromiseRule: 'Clear, warm, honest, small enough to deliver, no exaggerated transformation claims.',
    },
    operatingSequence: buildOperatingSequence(),
    defaultEmailSequence: buildDefaultEmailSequence(),
    receiptPlan,
    crmSignalMap: buildCrmSignalMap({ launchId: options.launchId }),
    qualityModel: {
      functionalStatusRequired: 'green_or_declared_blocker_before_external_send',
      creativeStatusRequired: 'green_or_human_accepted_yellow_before_public/audience_use',
      publicInternalSeparation: true,
      emailStyleCanonRequired: true,
      shopifyPreviewDefault: true,
    },
    publicSurfaceGuardrails: buildPublicSurfaceGuardrails(),
    brandHandoff: {
      canonicalSources: [
        'LEAD_MAGNET_OPERATING_PATTERN_V0_1.md',
        'END_TO_END_CREATIVE_QA_PROTOCOL.md',
        'MANTIS_OPERATOR_LAYER.md',
        '02_visual_system/email_style_canon.md',
      ],
      asksBrandToProduce: [
        'Mini-launch brief and public promise.',
        'Landing/resource/email copy with Alejandro voice.',
        'Claim guardrails and public/internal language separation.',
        'Creative QA receipt before final/public use.',
      ],
    },
    crmHandoff: {
      canonicalSources: [
        'docs/crm-vnext/source-of-truth-map.md',
        'docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md',
        'CRM Signal Event Ledger',
      ],
      asksCrmToProduce: [
        'Signal/event contract for the launch_id.',
        'Read-only engagement packet after launch.',
        'Market-learning review: continue, iterate, archive, or develop into larger product.',
        'No card/score mutation without existing CRM approval path.',
      ],
    },
    humanInputsMinimum: buildHumanInputsMinimum(),
    successMetrics: buildSuccessMetrics(),
    approvalGates: buildApprovalGates(),
    nextRecommendedStep: {
      name: 'mini_launch_example_rehearsal_packet',
      description: 'Run this packet against one concrete idea as a no-live-change rehearsal, ideally quiz/game/guide, then produce exact Brand/CRM/Web/MailerLite handoff.',
      requiresHumanApprovalBeforeLiveMutation: true,
    },
    safety: safetyBlock(),
  };
};

const digestSource = (path, content) => ({
  path,
  present: true,
  chars: content.length,
  consultedFor: path.includes('LEAD_MAGNET')
    ? 'mini-product sequence and public/internal separation'
    : path.includes('CREATIVE_QA')
      ? 'functional/creative QA gates'
      : path.includes('MAILERLITE_RECEIPT')
        ? 'Source/Delivered/Sent/Journey/Audience/Experiment semantics'
        : path.includes('GROUP_DICTIONARY')
          ? 'concrete group status and dictionary authority'
          : 'CRM source-of-truth and signal/event routing',
});

const loadSources = async () => {
  const paths = [
    DEFAULT_LEAD_MAGNET_PATTERN,
    DEFAULT_CREATIVE_QA,
    DEFAULT_EMAIL_TAXONOMY,
    DEFAULT_GROUP_DICTIONARY,
    DEFAULT_CRM_SOURCE_MAP,
  ];
  const entries = [];
  for (const path of paths) {
    const content = await readFile(path, 'utf8');
    entries.push(digestSource(path, content));
  }
  return entries;
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Operating Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este packet deja definido el carril repetible para mini-lanzamientos: idea pequena -> Brand brief -> Shopify/Web -> recurso -> MailerLite draft/test -> recibos -> CRM signals -> aprendizaje de mercado.',
    '',
    'No ejecuta cambios vivos. No crea grupos, no envia emails, no publica Shopify, no toca workflows y no escribe CRM cards.',
    '',
    '## Template',
    '',
    `- launch_id: ${packet.launchTemplate.launchId}`,
    `- resource: ${packet.launchTemplate.resourceName}`,
    `- resource_type: ${packet.launchTemplate.resourceType}`,
    `- cadence goal: ${packet.launchTemplate.cadenceGoal}`,
    `- public promise rule: ${packet.launchTemplate.publicPromiseRule}`,
    '',
    '## Secuencia Operativa',
    '',
  ];

  for (const phase of packet.operatingSequence) {
    lines.push(`- ${phase.phase} (${phase.owner})`);
    lines.push(`  - Output: ${phase.output}`);
    lines.push(`  - Live mutation allowed now: ${phase.liveMutationAllowed}`);
  }

  lines.push('', '## Recibos MailerLite / CRM', '');
  lines.push(`- Source: ${packet.receiptPlan.sourceGroup}`);
  lines.push(`- Delivered: ${packet.receiptPlan.deliveredGroup}`);
  lines.push(`- Audience candidate: ${packet.receiptPlan.audienceCandidate}`);
  lines.push(`- Experiment identity: CRM-first (${packet.receiptPlan.experimentPosture.crmKey})`);
  lines.push('- MailerLite Experiment group: only if routing/dedupe/exclusion requires it and a later dry-run + approval exists.');
  lines.push(`- Sent receipts: ${packet.receiptPlan.sentReceipts.rule}`);

  lines.push('', '## CRM Signal Map', '');
  for (const signal of packet.crmSignalMap) {
    lines.push(`- ${signal.event}: source=${signal.source}; ledger=${signal.ledger}`);
  }

  lines.push('', '## Secuencia Email Por Defecto', '');
  for (const email of packet.defaultEmailSequence) {
    lines.push(`- Email ${email.step} (${email.role})`);
    lines.push(`  - Purpose: ${email.purpose}`);
    lines.push(`  - Send posture: ${email.sendPosture}`);
  }

  lines.push('', '## Guardrails De Superficie Publica', '');
  lines.push('- Public/internal separation required: true');
  lines.push('- Internal terms banned in public copy:');
  for (const term of packet.publicSurfaceGuardrails.bannedInternalTermsInPublicCopy) lines.push(`  - ${term}`);

  lines.push('', '## Brand Handoff', '');
  for (const item of packet.brandHandoff.asksBrandToProduce) lines.push(`- ${item}`);

  lines.push('', '## CRM Handoff', '');
  for (const item of packet.crmHandoff.asksCrmToProduce) lines.push(`- ${item}`);

  lines.push('', '## Approval Gates', '');
  for (const gate of packet.approvalGates) {
    lines.push(`- ${gate.gate}: allowedNow=${gate.allowedNow}; ${gate.requiredEvidence}`);
  }

  lines.push('', '## Inputs Humanos Minimos', '');
  for (const item of packet.humanInputsMinimum) lines.push(`- ${item}`);

  lines.push('', '## Metricas De Exito', '');
  for (const [key, value] of Object.entries(packet.successMetrics)) lines.push(`- ${key}: ${value}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push(
    '',
    '## Siguiente Paso Recomendado',
    '',
    `- ${packet.nextRecommendedStep.name}: ${packet.nextRecommendedStep.description}`,
    '- Requiere aprobacion humana antes de cualquier mutacion viva: true',
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin MailerLite API calls.',
    '- Sin Shopify API calls.',
    '- Sin CRM live API calls.',
    '- Sin lectura de subscriber rows.',
    '- Sin grupos/workflows/emails/envios.',
    '- Sin CRM card/scoring mutation.',
    '- Sin outbound.',
  );

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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const sourceDigests = await loadSources();
  const packet = buildMiniLaunchPacket({ options, sourceDigests });
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launchTemplate.launchId,
    resourceType: packet.launchTemplate.resourceType,
    sourceGroup: packet.receiptPlan.sourceGroup,
    deliveredGroup: packet.receiptPlan.deliveredGroup,
    approvalGates: packet.approvalGates.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch v0 packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalGates,
  buildDefaultEmailSequence,
  buildMiniLaunchPacket,
  buildPublicSurfaceGuardrails,
  buildReceiptPlan,
  buildCrmSignalMap,
  buildSuccessMetrics,
  parseArgs,
  renderMarkdown,
};
