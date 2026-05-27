#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCrmSignalEventLedgerInput } from '../lib/crm/crm-vnext-signal-event-ledger.js';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-event-contract-2026-05-27';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SOURCE_MAP = '/Users/alejandrogomez/CRM/docs/crm-vnext/source-of-truth-map.md';
const DEFAULT_SIGNAL_LEDGER_DOC = '/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-ledger.md';
const DEFAULT_SIGNAL_PROJECTION_DOC = '/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-projection.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-event-contract.mjs [options]

Options:
  --rehearsal-packet <path>   Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --source-map <path>         CRM source-of-truth map. Defaults to ${DEFAULT_SOURCE_MAP}
  --signal-ledger-doc <path>  Signal Event Ledger doc. Defaults to ${DEFAULT_SIGNAL_LEDGER_DOC}
  --signal-projection-doc <path> Signal Event Projection doc. Defaults to ${DEFAULT_SIGNAL_PROJECTION_DOC}
  --out <path>                Write JSON packet
  --markdown-out <path>       Write Markdown packet
  --help                      Show this help

Local-only event contract for one Mini-Launch OS rehearsal. It turns the
rehearsal signal map into concrete CRM Signal Event Ledger events, proves they
normalize without becoming unknown, and keeps all card/scoring/Fact Store/live
mutations closed. It does not append to the ledger.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    sourceMap: DEFAULT_SOURCE_MAP,
    signalLedgerDoc: DEFAULT_SIGNAL_LEDGER_DOC,
    signalProjectionDoc: DEFAULT_SIGNAL_PROJECTION_DOC,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--source-map') options.sourceMap = argv[++index];
    else if (arg === '--signal-ledger-doc') options.signalLedgerDoc = argv[++index];
    else if (arg === '--signal-projection-doc') options.signalProjectionDoc = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const digestSource = (path, content) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor: path.includes('source-of-truth')
    ? 'CRM layer boundaries and Signal Event Ledger authority'
    : path.includes('signal-event-ledger')
      ? 'canonical event storage shape and safety'
      : path.includes('signal-event-projection')
        ? 'projection/scoring boundary'
        : 'mini-launch rehearsal event map and handoff',
});

const loadSourceDigests = async (options) => {
  const paths = [
    options.rehearsalPacket,
    options.sourceMap,
    options.signalLedgerDoc,
    options.signalProjectionDoc,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push(digestSource(path, content));
  }
  return digests;
};

const launchFrom = (rehearsalPacket) => ({
  launchId: rehearsalPacket?.launch?.launchId,
  resourceName: rehearsalPacket?.launch?.resourceName,
  resourceType: rehearsalPacket?.launch?.resourceType,
  sourceGroupCandidate: rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name ?? null,
  deliveredGroupCandidate: rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name ?? null,
});

const buildEventContract = (launch) => [
  {
    stage: 'idea_intake',
    eventKind: 'mini_launch_intake_created',
    channel: 'crm',
    direction: 'internal',
    sourceKind: 'mini_launch_rehearsal',
    meaning: 'The mini-launch idea exists as a tracked CRM experiment candidate.',
    requiredIdentityAnchor: 'test_or_contact_email_when_person_specific; launch_id when aggregate-only',
    metricsRequired: ['launchId', 'resourceType', 'resourceName'],
    projectionPosture: 'store_only_no_score_by_default',
    approvalGate: 'none_for_dry_run; ledger append still requires explicit approval if persisted',
  },
  {
    stage: 'brand_brief',
    eventKind: 'brand_brief_approved',
    channel: 'crm',
    direction: 'internal',
    sourceKind: 'brand_hub',
    meaning: 'Brand approved the public promise, claim guardrails and copy direction.',
    requiredIdentityAnchor: 'operator/test anchor unless person-specific',
    metricsRequired: ['launchId', 'brandStatus'],
    projectionPosture: 'store_only_no_score',
    approvalGate: 'brand approval before public copy reuse',
  },
  {
    stage: 'web_preview',
    eventKind: 'landing_preview_ready',
    channel: 'shopify',
    direction: 'internal',
    sourceKind: 'shopify_preview',
    meaning: 'A Shopify/Web preview or exact handoff exists for the launch.',
    requiredIdentityAnchor: 'operator/test anchor unless person-specific',
    metricsRequired: ['launchId', 'previewStatus'],
    projectionPosture: 'store_only_no_score',
    approvalGate: 'preview only; publish needs separate approval',
  },
  {
    stage: 'capture',
    eventKind: 'email_submitted',
    channel: 'web',
    direction: 'inbound',
    sourceKind: 'shopify_form_or_capture',
    meaning: 'A person submitted an email for the mini-launch resource.',
    requiredIdentityAnchor: 'email',
    metricsRequired: ['launchId', 'resourceType'],
    projectionPosture: 'store_then_identity_review_if_new_contact',
    approvalGate: 'no card write without CRM approval path',
  },
  {
    stage: 'receipt_assignment',
    eventKind: 'source_assigned',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_receipt',
    meaning: 'The person was assigned the Source receipt for this launch.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'sourceGroup'],
    projectionPosture: 'store_only_no_score_by_default',
    approvalGate: 'group creation/assignment requires separate exact approval',
  },
  {
    stage: 'quiz',
    eventKind: 'quiz_started',
    channel: 'quiz',
    direction: 'inbound',
    sourceKind: 'mini_launch_quiz',
    meaning: 'A person started the quiz/test resource.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'resourceType'],
    projectionPosture: 'store_only_until_product_fit_projection_exists',
    approvalGate: 'instrumentation only after web/quiz implementation approval',
  },
  {
    stage: 'quiz',
    eventKind: 'quiz_or_game_completed',
    channel: 'quiz',
    direction: 'inbound',
    sourceKind: 'mini_launch_quiz',
    meaning: 'A person completed the quiz/test and got a result archetype.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'resultId', 'resultPublicName'],
    projectionPosture: 'store_then_market_learning; scoring projection later if useful',
    approvalGate: 'instrumentation only after web/quiz implementation approval',
  },
  {
    stage: 'delivery',
    eventKind: 'resource_delivered',
    channel: 'email',
    direction: 'outbound',
    sourceKind: 'mailerlite_receipt',
    meaning: 'The promised resource/result was delivered.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'deliveredGroup'],
    projectionPosture: 'store_only; delivery is not open/click/interest',
    approvalGate: 'send/delivery needs exact seed or audience approval',
  },
  {
    stage: 'followup_email',
    eventKind: 'content_sent',
    channel: 'email',
    direction: 'outbound',
    sourceKind: 'mailerlite_followup',
    meaning: 'A canonical follow-up content item was sent inside the launch sequence.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'emailStep', 'contentId'],
    projectionPosture: 'store_only; Sent does not mean read',
    approvalGate: 'only if Brand canonizes content and send gate is approved',
  },
  {
    stage: 'engagement',
    eventKind: 'email_open',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'mailerlite_engagement',
    meaning: 'A person opened a launch email.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'emailStep'],
    projectionPosture: 'projects through existing email open pipeline',
    approvalGate: 'read-only engagement import only',
  },
  {
    stage: 'engagement',
    eventKind: 'email_click',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'mailerlite_engagement',
    meaning: 'A person clicked a launch email.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId', 'emailStep', 'linkKind'],
    projectionPosture: 'projects through existing email click pipeline',
    approvalGate: 'read-only engagement import only',
  },
  {
    stage: 'engagement',
    eventKind: 'email_reply',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'gmail_reply_activity',
    meaning: 'A person replied to the launch email sequence.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['launchId'],
    projectionPosture: 'projects through existing email reply pipeline',
    approvalGate: 'read-only reply discovery; no outbound without approval',
  },
  {
    stage: 'social_signal',
    eventKind: 'instagram_engagement_snapshot',
    channel: 'instagram',
    direction: 'inbound',
    sourceKind: 'instagram_activity',
    meaning: 'A grouped Instagram signal snapshot captured launch-related comments, likes or other available public activity.',
    requiredIdentityAnchor: 'instagramHandle_or_personId',
    metricsRequired: ['launchId', 'comments30d', 'likes30d', 'lastInteractionAt'],
    projectionPosture: 'projects through existing Instagram snapshot pipeline when metrics are available',
    approvalGate: 'read-only IG observation only; saves/shares stay review-only until supported by policy',
  },
  {
    stage: 'social_signal',
    eventKind: 'instagram_comment',
    channel: 'instagram',
    direction: 'inbound',
    sourceKind: 'instagram_activity',
    meaning: 'A person commented or reacted publicly/semipublicly around the launch.',
    requiredIdentityAnchor: 'instagramHandle_or_personId',
    metricsRequired: ['launchId', 'signalKind'],
    projectionPosture: 'projects through existing Instagram comment pipeline',
    approvalGate: 'read-only IG observation only',
  },
  {
    stage: 'social_signal',
    eventKind: 'instagram_like',
    channel: 'instagram',
    direction: 'inbound',
    sourceKind: 'instagram_activity',
    meaning: 'A person liked launch-related public/social content.',
    requiredIdentityAnchor: 'instagramHandle_or_personId',
    metricsRequired: ['launchId', 'signalKind'],
    projectionPosture: 'projects through existing Instagram like pipeline',
    approvalGate: 'read-only IG observation only',
  },
  {
    stage: 'learning_loop',
    eventKind: 'market_signal_reviewed',
    channel: 'crm',
    direction: 'internal',
    sourceKind: 'crm_market_learning',
    meaning: 'CRM/Brand reviewed launch signals and summarized market learning.',
    requiredIdentityAnchor: 'operator/test anchor for aggregate review',
    metricsRequired: ['launchId', 'sampleSize', 'learningQuality'],
    projectionPosture: 'store_only; not a person warmth signal by itself',
    approvalGate: 'human review before strategy decision',
  },
  {
    stage: 'learning_loop',
    eventKind: 'continue_or_archive_decision',
    channel: 'crm',
    direction: 'internal',
    sourceKind: 'decision_ledger',
    meaning: 'Alejandro decided whether to continue, iterate, archive, or develop the idea.',
    requiredIdentityAnchor: 'operator/test anchor for aggregate decision',
    metricsRequired: ['launchId', 'decision'],
    projectionPosture: 'store_only_decision_context',
    approvalGate: 'requires Alejandro decision',
  },
];

const sampleSubject = () => ({
  email: 'sample@example.invalid',
});

const sampleEventFor = ({ contract, launch, index, generatedAt }) => {
  const subject = contract.requiredIdentityAnchor.includes('instagramHandle')
    ? { instagramHandle: 'sample_handle' }
    : sampleSubject();
  const metricDefaults = {
    launchId: launch.launchId,
    resourceName: launch.resourceName,
    resourceType: launch.resourceType,
    sourceGroup: launch.sourceGroupCandidate,
    deliveredGroup: launch.deliveredGroupCandidate,
    resultId: 'espacio_mental',
    resultPublicName: 'Descanso por espacio mental',
    emailStep: 1,
    contentId: 'draft_rehearsal_only',
    linkKind: 'resource_or_reply_cta',
    signalKind: 'comment',
    comments30d: 1,
    likes30d: 1,
    lastInteractionAt: generatedAt,
    sampleSize: 1,
    learningQuality: 'sample_only',
    decision: 'pending',
  };
  return {
    sourceKind: contract.sourceKind,
    sourceId: `${launch.launchId}:${contract.eventKind}:sample-${index + 1}`,
    eventKind: contract.eventKind,
    channel: contract.channel,
    direction: contract.direction,
    observedAt: generatedAt,
    ...subject,
    metrics: Object.fromEntries(contract.metricsRequired.map((key) => [key, metricDefaults[key] ?? 'sample'])),
    tags: ['mini_launch', launch.launchId, contract.stage],
    summary: `${contract.meaning} Sample event shape only; not observed from a real person.`,
  };
};

const buildSampleEvents = ({ contract, launch, generatedAt }) =>
  contract.map((item, index) => sampleEventFor({ contract: item, launch, index, generatedAt }));

const safetyBlock = () => ({
  localOnly: true,
  signalLedgerAppendPerformed: false,
  cardMutationPerformed: false,
  factStoreWritePerformed: false,
  scoreMutationPerformed: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildEventContractPacket = ({
  rehearsalPacket,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket);
  const eventContract = buildEventContract(launch);
  const sampleSignalEvents = buildSampleEvents({ contract: eventContract, launch, generatedAt });
  const normalizationProof = buildCrmSignalEventLedgerInput({ events: sampleSignalEvents }, {
    now: generatedAt,
    sourceLabel: `Mini-launch event contract ${launch.launchId}`,
    collector: 'Codex',
  });

  const unknownKinds = normalizationProof.events.filter((event) => event.event.kind === 'unknown');
  const unknownChannels = normalizationProof.events.filter((event) => event.event.channel === 'unknown');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_event_contract',
    generatedAt,
    ok: unknownKinds.length === 0 && unknownChannels.length === 0 && normalizationProof.summary.skippedRecords === 0,
    status: unknownKinds.length || unknownChannels.length || normalizationProof.summary.skippedRecords
      ? 'mini_launch_event_contract_needs_ledger_review'
      : 'mini_launch_event_contract_ready_no_ledger_write',
    launch,
    eventContract,
    sampleSignalEvents,
    normalizationProof: {
      schemaVersion: normalizationProof.schemaVersion,
      mode: normalizationProof.mode,
      summary: normalizationProof.summary,
      eventKinds: normalizationProof.events.map((event) => event.event.kind),
      channels: normalizationProof.events.map((event) => event.event.channel),
      skippedRecords: normalizationProof.skippedRecords,
      safety: normalizationProof.safety,
    },
    projectionBoundary: {
      existingProjectionReadyFor: [
        'email_open',
        'email_click',
        'email_reply',
        'instagram_engagement_snapshot',
        'instagram_comment',
        'instagram_like',
      ],
      storeOnlyForNow: eventContract
        .filter((item) => item.projectionPosture.includes('store_only') || item.projectionPosture.includes('market_learning'))
        .map((item) => item.eventKind),
      rule: 'Store launch operation and learning events first. Only project into scoring when a reviewed policy says the signal should affect warmth/product-fit.',
    },
    approvalBoundary: {
      canNormalizeDryRunNow: true,
      canAppendToLedgerNow: false,
      appendRequires: '--write --approved-by Alejandro with a real observed events file',
      stillForbidden: [
        'card writes',
        'score mutation',
        'Fact Store write',
        'MailerLite group creation or assignment',
        'workflow or form edits',
        'Shopify publish',
        'email/audience send',
        'outbound reply',
      ],
    },
    sourceDigests,
    safety: safetyBlock(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Event Contract',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Contrato de señales para: ${packet.launch.resourceName}`,
    `launch_id: ${packet.launch.launchId}`,
    '',
    'Este packet define que eventos produciria el mini-lanzamiento y prueba que el Signal Event Ledger los reconoce sin convertirlos en `unknown`. No escribe al ledger, no toca cards, no mueve scoring y no llama APIs vivas.',
    '',
    '## Normalization Proof',
    '',
    `- Records read: ${packet.normalizationProof.summary.recordsRead}`,
    `- Events generated: ${packet.normalizationProof.summary.eventsGenerated}`,
    `- Skipped records: ${packet.normalizationProof.summary.skippedRecords}`,
    `- Event kinds: ${Array.from(new Set(packet.normalizationProof.eventKinds)).join(', ')}`,
    `- Channels: ${Array.from(new Set(packet.normalizationProof.channels)).join(', ')}`,
    '',
    '## Event Contract',
    '',
  ];

  for (const item of packet.eventContract) {
    lines.push(`### ${item.eventKind}`);
    lines.push(`- Stage: ${item.stage}`);
    lines.push(`- Channel: ${item.channel}`);
    lines.push(`- Direction: ${item.direction}`);
    lines.push(`- Source kind: ${item.sourceKind}`);
    lines.push(`- Meaning: ${item.meaning}`);
    lines.push(`- Identity anchor: ${item.requiredIdentityAnchor}`);
    lines.push(`- Metrics required: ${item.metricsRequired.join(', ')}`);
    lines.push(`- Projection posture: ${item.projectionPosture}`);
    lines.push(`- Approval gate: ${item.approvalGate}`);
    lines.push('');
  }

  lines.push('## Projection Boundary', '');
  lines.push(`- Existing projection ready for: ${packet.projectionBoundary.existingProjectionReadyFor.join(', ')}`);
  lines.push(`- Store-only for now: ${Array.from(new Set(packet.projectionBoundary.storeOnlyForNow)).join(', ')}`);
  lines.push(`- Rule: ${packet.projectionBoundary.rule}`);

  lines.push('', '## Approval Boundary', '');
  lines.push(`- Can normalize dry-run now: ${packet.approvalBoundary.canNormalizeDryRunNow}`);
  lines.push(`- Can append to ledger now: ${packet.approvalBoundary.canAppendToLedgerNow}`);
  lines.push(`- Append requires: ${packet.approvalBoundary.appendRequires}`);
  lines.push('- Still forbidden:');
  for (const item of packet.approvalBoundary.stillForbidden) lines.push(`  - ${item}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push(
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin append al Signal Event Ledger.',
    '- Sin card writes.',
    '- Sin Fact Store writes.',
    '- Sin scoring mutation.',
    '- Sin MailerLite/Shopify/CRM live API calls.',
    '- Sin subscriber rows.',
    '- Sin workflows/forms/envios.',
    '- Sin outbound.',
    '- No tokens printed.',
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

const buildPacketFromFiles = async (options) => {
  const [rehearsalPacket, sourceDigests] = await Promise.all([
    readJson(options.rehearsalPacket),
    loadSourceDigests(options),
  ]);
  return buildEventContractPacket({ rehearsalPacket, sourceDigests });
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
    eventKinds: packet.normalizationProof.eventKinds,
    eventsGenerated: packet.normalizationProof.summary.eventsGenerated,
    skippedRecords: packet.normalizationProof.summary.skippedRecords,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch event contract failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEventContract,
  buildEventContractPacket,
  buildSampleEvents,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
