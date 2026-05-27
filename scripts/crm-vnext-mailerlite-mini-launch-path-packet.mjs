#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-path-packet-2026-05-27';
const DEFAULT_BRAND_DICTIONARY = process.env.BRAND_MAILERLITE_GROUP_DICTIONARY
  || '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_LEAD_MAGNET_PATTERN = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/LEAD_MAGNET_OPERATING_PATTERN_V0_1.md';
const DEFAULT_QA_PROTOCOL = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/END_TO_END_CREATIVE_QA_PROTOCOL.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-path-packet.mjs [options]

Options:
  --launch-id <id>          Optional launch id. Defaults to template mode.
  --name <name>             Optional public/internal launch name.
  --resource-type <type>    guide | quiz | game | audio | practice | checklist | resource. Defaults to resource.
  --brand-dictionary <path> Brand Hub MailerLite dictionary.
  --taxonomy <path>         Brand Hub MailerLite taxonomy.
  --lead-pattern <path>     Brand lead magnet operating pattern.
  --qa-protocol <path>      Brand end-to-end QA protocol.
  --out <path>              Write JSON packet
  --markdown-out <path>     Write Markdown packet
  --help                    Show this help

Local-only path packet for future mini-launches. It defines the safe operating
route across Brand, Shopify/Web, MailerLite, and CRM. It never calls MailerLite,
creates groups, edits workflows, reads subscribers, sends email, or mutates CRM.`;

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
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase() ?? null;

const titleCase = (value) =>
  cleanString(value)
    ?.split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') ?? null;

const parseArgs = (argv) => {
  const options = {
    launchId: null,
    name: null,
    resourceType: 'resource',
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    taxonomy: DEFAULT_TAXONOMY,
    leadPattern: DEFAULT_LEAD_MAGNET_PATTERN,
    qaProtocol: DEFAULT_QA_PROTOCOL,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--launch-id') options.launchId = argv[++index];
    else if (arg === '--name') options.name = argv[++index];
    else if (arg === '--resource-type') options.resourceType = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--taxonomy') options.taxonomy = argv[++index];
    else if (arg === '--lead-pattern') options.leadPattern = argv[++index];
    else if (arg === '--qa-protocol') options.qaProtocol = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.launchId = cleanString(options.launchId);
  options.name = cleanString(options.name);
  options.resourceType = cleanString(options.resourceType) ?? 'resource';
  return options;
};

const publicResourceTypeForGroup = (resourceType) => {
  const normalized = slugify(resourceType);
  if (normalized === 'guide') return 'Guide';
  if (normalized === 'quiz') return 'Quiz result';
  if (normalized === 'game') return 'Interactive';
  if (normalized === 'audio') return 'Audio';
  if (normalized === 'practice') return 'Practice';
  if (normalized === 'checklist') return 'Checklist';
  return 'Resource';
};

const sourceTypeForGroup = (resourceType) => {
  const normalized = slugify(resourceType);
  if (normalized === 'quiz') return 'Quiz';
  if (normalized === 'game') return 'Interactive';
  if (normalized === 'event') return 'Event';
  return 'Resource';
};

const buildLaunchIdentity = ({ launchId, name, resourceType }) => {
  const displayName = titleCase(name) ?? '<Nombre del mini-producto>';
  const contentStem = slugify(name) ?? '<slug>';
  const stableLaunchId = launchId ?? `mini_<YYYY_MM_DD>_${contentStem}`;
  return {
    launchId: stableLaunchId,
    displayName,
    resourceType: cleanString(resourceType) ?? 'resource',
    contentStem,
    templateMode: !launchId || !name,
  };
};

const buildMailerLitePlan = (identity) => {
  const sourceType = sourceTypeForGroup(identity.resourceType);
  const deliveredType = publicResourceTypeForGroup(identity.resourceType);
  const sourceGroup = `CC · Source · ${sourceType} · ${identity.displayName}`;
  const deliveredGroup = `CC · Delivered · ${deliveredType} · ${identity.displayName}`;
  return {
    posture: 'proposed_local_only_until_dry_run_and_approval',
    sourceGroup,
    deliveredGroup,
    sentGroups: [],
    journeyGroups: {
      default: 'crm_first_by_launch_id',
      mailerLiteOnlyIfNeeded: `CC · Journey · ${identity.displayName} · <Estado>`,
      note: 'Do not create generic Mini-launch Active/Completed groups by default.',
    },
    experimentGroup: {
      default: 'crm_first',
      mailerLiteOnlyIfNeeded: `CC · Experiment · ${identity.launchId}`,
      allowedReason: 'routing, dedupe, or exclusion inside MailerLite only',
    },
    audienceImplication: {
      default: 'no_new_audience_group_by_default',
      possibleFuture: 'CC · Audience · Mini-launches · Eligible',
    },
    requiredBeforeLiveUse: [
      'Brand dictionary candidate entry.',
      'Fresh MailerLite planner scan.',
      'Exact approval before any group creation.',
      'Disabled draft workflow or test-only lane before subscriber assignment.',
    ],
  };
};

const buildCrmSignalMap = (identity) => ({
  launchId: identity.launchId,
  crmFirstFields: [
    'launch_id',
    'source_type',
    'resource_type',
    'market_signal_goal',
    'offer_stage',
    'creative_status',
    'functional_status',
  ],
  events: [
    'mini_launch_intake_created',
    'brand_brief_approved',
    'shopify_preview_created',
    'source_group_assigned',
    'resource_delivered',
    'email_sent',
    'email_opened',
    'email_clicked',
    'email_replied',
    'ig_liked_or_commented',
    'ig_saved_or_shared_if_available',
    'quiz_or_game_completed_if_applicable',
    'human_reply_reviewed',
    'continue_or_archive_decision',
  ],
  marketLearning: [
    'signups',
    'delivery_success',
    'email engagement',
    'reply quality',
    'IG response',
    'resource completion if instrumented',
    'conversion to next conversation or product interest',
  ],
});

const buildOperatingStages = () => [
  {
    stage: 'intake',
    owner: 'Brand',
    output: 'Mini-launch brief: promesa publica, audiencia, recurso, no-promesas, criterio de exito.',
    liveRisk: 'none',
  },
  {
    stage: 'brand_creative',
    owner: 'Brand',
    output: 'Copy landing, recurso, emails, CTA, public/internal surface split, creative QA criteria.',
    liveRisk: 'none',
  },
  {
    stage: 'web_shopify',
    owner: 'Web/Shopify',
    output: 'Shopify draft/preview or exact handoff. No loose HTML unless Shopify is blocked and declared.',
    liveRisk: 'no_publish_without_approval',
  },
  {
    stage: 'mailerlite_design',
    owner: 'MailerLite/CRM',
    output: 'Groups, draft automation shape, test lane, exact approval gates.',
    liveRisk: 'no_group_or_workflow_mutation_without_approval',
  },
  {
    stage: 'crm_observability',
    owner: 'CRM',
    output: 'Signal/event map and market-learning report template.',
    liveRisk: 'no_card_or_scoring_mutation_without_review',
  },
  {
    stage: 'qa',
    owner: 'Brand + CRM',
    output: 'Functional status and creative status reported separately.',
    liveRisk: 'no_public_or_audience_send_without_approval',
  },
  {
    stage: 'decision',
    owner: 'Alejandro',
    output: 'One grouped approval: test, publish, send, continue, iterate, or archive.',
    liveRisk: 'human_gate',
  },
];

const buildApprovalGates = () => [
  {
    gate: 'create_empty_groups',
    required: 'Fresh planner + exact phrase.',
    allowedByThisPacket: false,
  },
  {
    gate: 'create_or_edit_draft_workflow',
    required: 'Separate exact approval; draft must stay disabled.',
    allowedByThisPacket: false,
  },
  {
    gate: 'assign_seed_subscriber',
    required: 'Single test email, exact groups, exact scope.',
    allowedByThisPacket: false,
  },
  {
    gate: 'send_test_email',
    required: 'Explicit test recipient and email(s).',
    allowedByThisPacket: false,
  },
  {
    gate: 'publish_shopify_or_send_audience',
    required: 'Separate public/audience approval after QA.',
    allowedByThisPacket: false,
  },
];

const buildQaContract = () => ({
  functionalStatusRequired: true,
  creativeStatusRequired: true,
  minimumReceipt: {
    flow: '<launch_id>',
    surface: 'publica | interna | mixta',
    functionalStatus: 'verde | amarillo | rojo',
    creativeStatus: 'verde | amarillo | rojo',
    humanApprovalRequired: true,
  },
  publicCopyBannedTerms: [
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
});

const safetyBlock = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const sourceReceipt = async (options) => {
  const sources = [
    { label: 'brand_dictionary', path: options.brandDictionary },
    { label: 'mailer_lite_taxonomy', path: options.taxonomy },
    { label: 'lead_magnet_pattern', path: options.leadPattern },
    { label: 'creative_qa_protocol', path: options.qaProtocol },
  ];
  const reads = [];
  for (const source of sources) {
    const raw = await readFile(resolve(source.path), 'utf8');
    reads.push({
      ...source,
      bytes: Buffer.byteLength(raw, 'utf8'),
      present: true,
    });
  }
  return reads;
};

const buildPacket = async (options, generatedAt = new Date().toISOString()) => {
  const identity = buildLaunchIdentity(options);
  const sources = await sourceReceipt(options);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mini_launch_path_packet',
    generatedAt,
    ok: true,
    status: 'mini_launch_path_defined_no_live_changes',
    identity,
    sourceReceipt: sources,
    operatingStages: buildOperatingStages(),
    mailerLitePlan: buildMailerLitePlan(identity),
    crmSignalMap: buildCrmSignalMap(identity),
    qaContract: buildQaContract(),
    approvalGates: buildApprovalGates(),
    nextAction: 'Use this packet as the default route when Alejandro asks for a new mini-product, guide, quiz, game, audio, practice, or capture experiment.',
    safety: safetyBlock(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Path Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Esta es la ruta operativa por defecto para mini-productos, recursos de captura, quizzes, juegos, audios o practicas breves.',
    '',
    `- launch_id: ${packet.identity.launchId}`,
    `- nombre: ${packet.identity.displayName}`,
    `- tipo de recurso: ${packet.identity.resourceType}`,
    `- template mode: ${packet.identity.templateMode}`,
    '',
    '## Fuentes Consultadas',
    '',
    ...packet.sourceReceipt.map((source) => `- ${source.label}: ${source.path}`),
    '',
    '## Secuencia Operativa',
    '',
  ];

  for (const stage of packet.operatingStages) {
    lines.push(`- ${stage.stage}: ${stage.owner}`);
    lines.push(`  - Output: ${stage.output}`);
    lines.push(`  - Live risk: ${stage.liveRisk}`);
  }

  lines.push('', '## MailerLite Plan', '');
  lines.push(`- Source group: ${packet.mailerLitePlan.sourceGroup}`);
  lines.push(`- Delivered group: ${packet.mailerLitePlan.deliveredGroup}`);
  lines.push(`- Journey default: ${packet.mailerLitePlan.journeyGroups.default}`);
  lines.push(`- Experiment default: ${packet.mailerLitePlan.experimentGroup.default}`);
  lines.push(`- Experiment only if needed: ${packet.mailerLitePlan.experimentGroup.mailerLiteOnlyIfNeeded}`);
  lines.push(`- Audience default: ${packet.mailerLitePlan.audienceImplication.default}`);
  lines.push('- Required before live use:');
  for (const item of packet.mailerLitePlan.requiredBeforeLiveUse) lines.push(`  - ${item}`);

  lines.push('', '## CRM Signal Map', '');
  lines.push(`- launch_id: ${packet.crmSignalMap.launchId}`);
  lines.push('- Events:');
  for (const event of packet.crmSignalMap.events) lines.push(`  - ${event}`);
  lines.push('- Market learning:');
  for (const signal of packet.crmSignalMap.marketLearning) lines.push(`  - ${signal}`);

  lines.push('', '## QA Contract', '');
  lines.push('- Functional status required: true');
  lines.push('- Creative status required: true');
  lines.push('- Public copy banned terms:');
  for (const term of packet.qaContract.publicCopyBannedTerms) lines.push(`  - ${term}`);

  lines.push('', '## Approval Gates', '');
  for (const gate of packet.approvalGates) {
    lines.push(`- ${gate.gate}: allowedByThisPacket=${gate.allowedByThisPacket}; required=${gate.required}`);
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- Local-only packet.',
    '- No MailerLite API calls.',
    '- No groups, workflows, subscribers, sends, Shopify publish, CRM card/scoring, or outbound mutations.',
    '',
    `Next action: ${packet.nextAction}`,
    '',
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

  const packet = await buildPacket(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.identity.launchId,
    sourceGroup: packet.mailerLitePlan.sourceGroup,
    deliveredGroup: packet.mailerLitePlan.deliveredGroup,
    approvalGates: packet.approvalGates.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch path packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalGates,
  buildLaunchIdentity,
  buildMailerLitePlan,
  buildPacket,
  buildQaContract,
  buildCrmSignalMap,
  parseArgs,
  renderMarkdown,
};
