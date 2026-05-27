#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildVisualSpec,
  scanDraftText,
} from './crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-sequence-asset-packet-2026-05-27';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_EMAIL_ASSET_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_VOICE_FINGERPRINT = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/voice/VOICE_FINGERPRINT_V0.md';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-sequence-asset-packet.mjs [options]

Options:
  --rehearsal-packet <path>              Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --event-contract <path>                Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --brand-email-asset-packet <path>      Email 1 Brand asset packet JSON. Defaults to ${DEFAULT_BRAND_EMAIL_ASSET_PACKET}
  --brand-candidate-review-packet <path> Brand candidate review packet JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET}
  --voice-fingerprint <path>             Brand voice fingerprint. Defaults to ${DEFAULT_VOICE_FINGERPRINT}
  --email-style-canon <path>             Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --group-dictionary <path>              Brand MailerLite group dictionary. Defaults to ${DEFAULT_GROUP_DICTIONARY}
  --control-room <path>                  CRM MailerLite Launch OS control room. Defaults to ${DEFAULT_CONTROL_ROOM}
  --out <path>                           Write JSON packet
  --markdown-out <path>                  Write Markdown packet
  --help                                 Show this help

Local-only full email-sequence asset packet for one Mini-Launch OS rehearsal.
It turns a single Email 1 asset into a four-step draft sequence for Brand review,
MailerLite asset planning, onboarding handoff policy, and CRM observability. It
never calls MailerLite, Shopify, CRM live APIs, browsers, subscribers, workflows,
forms, sends, ledgers, card writes, scoring, or Fact Store.`;

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

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    brandEmailAssetPacket: DEFAULT_BRAND_EMAIL_ASSET_PACKET,
    brandCandidateReviewPacket: DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET,
    voiceFingerprint: DEFAULT_VOICE_FINGERPRINT,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    groupDictionary: DEFAULT_GROUP_DICTIONARY,
    controlRoom: DEFAULT_CONTROL_ROOM,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--brand-email-asset-packet') options.brandEmailAssetPacket = argv[++index];
    else if (arg === '--brand-candidate-review-packet') options.brandCandidateReviewPacket = argv[++index];
    else if (arg === '--voice-fingerprint') options.voiceFingerprint = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--group-dictionary') options.groupDictionary = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
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
  consultedFor: path.includes('rehearsal')
    ? 'launch identity, audience hypothesis and rough sequence strategy'
    : path.includes('event_contract')
      ? 'CRM event spine and store-only signal posture'
      : path.includes('brand_email_asset')
        ? 'Email 1 copy and visual asset context'
        : path.includes('brand_candidate_review')
          ? 'Brand semantic candidate status and closed receipt gates'
          : path.includes('VOICE_FINGERPRINT')
            ? 'Alejandro voice, cadence and anti-generic copy guardrails'
            : path.includes('email_style_canon')
              ? 'email typography, CTA, signature and footer canon'
              : path.includes('GROUP_DICTIONARY')
                ? 'MailerLite group dictionary and semantic authority'
                : 'current Launch OS control room and approval gates',
});

const loadSourceDigests = async (options) => {
  const paths = [
    options.rehearsalPacket,
    options.eventContract,
    options.brandEmailAssetPacket,
    options.brandCandidateReviewPacket,
    options.voiceFingerprint,
    options.emailStyleCanon,
    options.groupDictionary,
    options.controlRoom,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push(digestSource(path, content));
  }
  return digests;
};

const launchFrom = (rehearsalPacket, eventContract, brandEmailAssetPacket) => ({
  launchId:
    rehearsalPacket?.launch?.launchId
    ?? eventContract?.launch?.launchId
    ?? brandEmailAssetPacket?.launch?.launchId,
  resourceName:
    rehearsalPacket?.launch?.resourceName
    ?? eventContract?.launch?.resourceName
    ?? brandEmailAssetPacket?.launch?.resourceName,
  resourceType:
    rehearsalPacket?.launch?.resourceType
    ?? eventContract?.launch?.resourceType
    ?? brandEmailAssetPacket?.launch?.resourceType,
  sourceGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name
    ?? eventContract?.launch?.sourceGroupCandidate
    ?? brandEmailAssetPacket?.launch?.sourceGroupCandidate
    ?? null,
  deliveredGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name
    ?? eventContract?.launch?.deliveredGroupCandidate
    ?? brandEmailAssetPacket?.launch?.deliveredGroupCandidate
    ?? null,
});

const emailPublicText = (email) => [
  ...(email.publicCopy?.subjectOptions ?? []).map((item) => item.text),
  ...(email.publicCopy?.preheaderOptions ?? []).map((item) => item.text),
  email.publicCopy?.emailBody?.greeting,
  ...(email.publicCopy?.emailBody?.paragraphs ?? []),
  email.publicCopy?.emailBody?.cta?.text,
  email.publicCopy?.emailBody?.closing,
  email.publicCopy?.plainTextFallback,
].filter(Boolean).join('\n');

const sequencePublicText = (sequence) => sequence.map(emailPublicText).join('\n\n---\n\n');

const copyFromEmail1Asset = (brandEmailAssetPacket) => {
  const copy = brandEmailAssetPacket?.assetDrafts?.publicCopy;
  if (!copy) return null;
  return {
    subjectOptions: copy.subjectOptions ?? [],
    preheaderOptions: copy.preheaderOptions ?? [],
    emailBody: copy.emailBody ?? null,
    plainTextFallback: copy.plainTextFallback ?? null,
  };
};

const makeEmail = ({ step, role, status, subjectOptions, preheaderOptions, paragraphs, cta, closing = 'Un abrazo,\nAlejandro' }) => ({
  step,
  role,
  status,
  publicCopy: {
    subjectOptions: subjectOptions.map((text) => ({ text })),
    preheaderOptions: preheaderOptions.map((text) => ({ text })),
    emailBody: {
      greeting: 'Hola,',
      paragraphs,
      cta,
      closing,
    },
    plainTextFallback: [
      'Hola,',
      '',
      ...paragraphs.flatMap((paragraph) => [paragraph, '']),
      cta?.destination === 'reply'
        ? cta.text
        : `${cta.text}: {{ ${cta.destination} }}`,
      '',
      closing,
    ].join('\n'),
  },
});

const buildEmailSequenceAssets = ({ launch, brandEmailAssetPacket }) => {
  const email1PublicCopy = copyFromEmail1Asset(brandEmailAssetPacket);
  return [
    {
      step: 1,
      role: 'delivery_and_orientation',
      status: 'draft_from_prior_brand_email_asset_packet_not_public_not_sent',
      publicCopy: email1PublicCopy,
      purpose: 'Deliver the result/resource, orient the reader gently, and keep the promise modest.',
      mailerLiteAssetNameDraft: `ML Draft · ${slugify(launch.launchId)} · E01 Delivery orientation`,
      receiptPosture: {
        sourceGroupCandidate: launch.sourceGroupCandidate,
        deliveredGroupCandidate: launch.deliveredGroupCandidate,
        sentGroupDefault: null,
        rule: 'Delivered receipt only after real delivery is approved and tested; no Sent group for this delivery email by default.',
      },
    },
    {
      ...makeEmail({
        step: 2,
        role: 'practice_or_value',
        status: 'draft_for_brand_review_not_public_not_sent',
        subjectOptions: [
          'Una práctica pequeña para descansar sin exigirte calma',
          'Cinco minutos para probar otra entrada al descanso',
          'Para acompañar tu resultado de descanso',
        ],
        preheaderOptions: [
          'Una práctica breve para que el descanso no se convierta en otra tarea.',
          'La idea es probar con suavidad, no hacerlo perfecto.',
        ],
        paragraphs: [
          'Quiero proponerte una práctica breve para acompañar tu resultado.',
          'No necesitas hacerla perfecta. El punto es notar qué cambia cuando el descanso deja de ser una tarea más y se vuelve un gesto posible.',
          'Elige un momento del día y prueba esto: apoya los pies, suelta un poco la mandíbula y nombra en voz baja qué necesita hoy tu mente: espacio, ritmo, permiso o un límite amable.',
          'Quédate con una sola señal. Con eso basta para empezar.',
        ],
        cta: {
          text: 'Guardar esta práctica',
          destination: 'practice_link_placeholder',
          posture: 'quiet editorial link or one restrained brand button',
        },
      }),
      purpose: 'Help the person use the result with one low-friction practice.',
      mailerLiteAssetNameDraft: `ML Draft · ${slugify(launch.launchId)} · E02 Practice`,
      receiptPosture: {
        sentGroupDefault: null,
        rule: 'No Sent group unless Brand later canonizes this as reusable content or MailerLite needs dedupe.',
      },
    },
    {
      ...makeEmail({
        step: 3,
        role: 'story_or_editorial_depth',
        status: 'draft_for_brand_review_not_public_not_sent',
        subjectOptions: [
          'El descanso también pide criterio',
          'Una nota breve sobre descanso y energía',
          'Mirar el cansancio con más honestidad',
        ],
        preheaderOptions: [
          'Una nota para mirar tu descanso con más honestidad y menos presión.',
          'No todo se resuelve agregando otra técnica a la lista.',
        ],
        paragraphs: [
          'Hay una forma de cansancio que no se resuelve agregando otra técnica a la lista.',
          'Cuando la vida se llena de pendientes, el descanso puede empezar a sonar como un mandato más: relájate, medita, duerme mejor, responde bien.',
          'Me interesa una entrada distinta: recuperar criterio. Mirar qué merece tu energía, qué puede esperar y qué estás intentando sostener solo por costumbre.',
          'Tu resultado puede servir como una pequeña brújula para esa conversación.',
        ],
        cta: {
          text: 'Leer la nota breve',
          destination: 'editorial_note_link_placeholder',
          posture: 'editorial link preferred unless a single CTA button is needed',
        },
      }),
      purpose: 'Deepen the idea through Alejandro-style editorial reflection.',
      mailerLiteAssetNameDraft: `ML Draft · ${slugify(launch.launchId)} · E03 Editorial depth`,
      receiptPosture: {
        sentGroupDefault: null,
        rule: 'Create a Sent group only if this becomes a canonical article/carta reused beyond the mini-launch.',
      },
    },
    {
      ...makeEmail({
        step: 4,
        role: 'invitation_or_feedback',
        status: 'draft_for_brand_review_not_public_not_sent',
        subjectOptions: [
          '¿Qué notaste al probar tu descanso?',
          'Una pregunta sencilla para cerrar este recorrido',
          'Cuéntame qué apareció con tu resultado',
        ],
        preheaderOptions: [
          'Una pregunta pequeña para cerrar el ciclo y dejar una señal útil.',
          'Puedes responder con una línea si algo se volvió más claro.',
        ],
        paragraphs: [
          'Quiero cerrar esta pequeña serie con una pregunta simple.',
          'Después de mirar tu resultado o probar la práctica, ¿qué reconociste sobre tu manera de descansar?',
          'Puede ser una frase, una resistencia, una sorpresa o una necesidad que quedó más visible.',
          'Si te nace, respóndeme este correo con una línea. Leo esas respuestas con mucha atención porque me ayudan a cuidar mejor lo que viene y a entender qué temas merecen más profundidad.',
        ],
        cta: {
          text: 'Responder con una línea',
          destination: 'reply',
          posture: 'reply prompt; no sales CTA by default',
        },
      }),
      purpose: 'Invite qualitative feedback and market learning without commercial pressure.',
      mailerLiteAssetNameDraft: `ML Draft · ${slugify(launch.launchId)} · E04 Feedback invitation`,
      receiptPosture: {
        sentGroupDefault: null,
        rule: 'CRM signal first for replies/feedback; no MailerLite group unless routing or exclusion requires it.',
      },
    },
  ];
};

const buildSequenceQa = (sequence) => {
  const perEmail = sequence.map((email) => ({
    step: email.step,
    role: email.role,
    scan: scanDraftText(emailPublicText(email)),
  }));
  const aggregateScan = scanDraftText(sequencePublicText(sequence));
  return {
    verdict: aggregateScan.okForBrandReviewDraft
      ? 'yellow_ready_for_brand_review_not_approved'
      : 'red_rewrite_before_brand_review',
    aggregateScan,
    perEmail,
    requirementsBeforeAnyMailerLiteBuild: [
      'Brand reviews voice, promise and CTA posture for all four emails.',
      'Email Style QA verifies visual signature, footer/legal, CTA color and mobile rendering.',
      'Any reused article/carta must be mapped to a canonical content_id before a Sent group is proposed.',
    ],
  };
};

const buildMailerLiteAssetPlan = ({ launch, sequence }) => ({
  status: 'draft_names_and_structure_only_no_mailerlite_asset_created',
  assetCount: sequence.length,
  assets: sequence.map((email) => ({
    step: email.step,
    role: email.role,
    mailerLiteAssetNameDraft: email.mailerLiteAssetNameDraft,
    sourceStatus: email.status,
    liveAssetExists: false,
    sendAllowed: false,
    workflowUseAllowed: false,
    subscriberAssignmentAllowed: false,
  })),
  workflowPosture: {
    default: 'disabled_draft_or_manual_seed_only_after_future_approval',
    activeWorkflowAllowedNow: false,
    touchesOnboardingV1: false,
    touchesOnboardingV2: false,
    note: `This sequence belongs to launch ${launch.launchId}; onboarding handoff is a later gate, not implicit workflow attachment.`,
  },
});

const buildReceiptAndOnboardingPolicy = ({ launch, brandCandidateReviewPacket }) => ({
  sourceCandidate: launch.sourceGroupCandidate,
  deliveredCandidate: launch.deliveredGroupCandidate,
  brandCandidateReviewStatus: brandCandidateReviewPacket?.status ?? null,
  brandMissingCandidateCount: brandCandidateReviewPacket?.dictionaryState?.missingCandidateCount ?? null,
  sequenceSentGroupDefault: 'none',
  sentGroupRule: 'Do not create Sent groups for small follow-up emails unless Brand canonizes a reusable article/carta or MailerLite needs dedupe.',
  onboardingHandoff: {
    currentStatus: 'closed_until_separate_onboarding_gate',
    possibleFutureTarget: 'CC · Journey · Editorial onboarding · Eligible',
    preservesProductionOnboardingV1: true,
    rule: 'A mini-launch sequence may invite the person toward the editorial onboarding, but it must not attach to active onboarding or duplicate article delivery without a migration/eligibility gate.',
  },
});

const buildApprovalGates = () => [
  {
    id: 'brand_review_full_sequence',
    currentStatus: 'needed',
    allowsLiveMutation: false,
    approvalNeededFromAlejandro: false,
  },
  {
    id: 'mailerlite_asset_build',
    currentStatus: 'closed_until_brand_review_and_exact_build_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'asset_only_seed_send',
    currentStatus: 'closed_until_exact_seed_email_and_send_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'receipt_seed_test',
    currentStatus: 'closed_until_brand_candidate_decision_group_dry_run_and_exact_seed_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'onboarding_handoff',
    currentStatus: 'closed_until_onboarding_v2_gate_or_explicit_routing_policy',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'audience_launch',
    currentStatus: 'closed',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
];

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  groupsCreated: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildEmailSequenceAssetPacket = ({
  rehearsalPacket,
  eventContract,
  brandEmailAssetPacket,
  brandCandidateReviewPacket,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, eventContract, brandEmailAssetPacket);
  const sequence = buildEmailSequenceAssets({ launch, brandEmailAssetPacket });
  const sequenceQa = buildSequenceQa(sequence);
  const visualSpec = buildVisualSpec();
  const upstreamReady = [
    rehearsalPacket?.ok === true,
    eventContract?.ok === true,
    brandEmailAssetPacket?.ok === true,
    brandCandidateReviewPacket?.ok === true,
  ].every(Boolean);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_email_sequence_asset_packet',
    generatedAt,
    ok: upstreamReady && sequenceQa.aggregateScan.okForBrandReviewDraft,
    status: upstreamReady
      ? 'email_sequence_asset_packet_ready_for_brand_review_no_live_changes'
      : 'email_sequence_asset_packet_needs_upstream_packets',
    launch,
    readiness: {
      upstreamReady,
      brandReviewStatus: 'needs_brand_review_full_sequence',
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
      nextNoLiveMove: 'Brand reviews the full four-email sequence; then regenerate seed QA with exact asset scope.',
    },
    emailSequence: sequence,
    sequenceQa,
    visualSpec,
    mailerLiteAssetPlan: buildMailerLiteAssetPlan({ launch, sequence }),
    receiptAndOnboardingPolicy: buildReceiptAndOnboardingPolicy({ launch, brandCandidateReviewPacket }),
    approvalGates: buildApprovalGates(),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderEmail = (email) => {
  const copy = email.publicCopy;
  const lines = [
    `### Email ${email.step}: ${email.role}`,
    '',
    `- Status: ${email.status}`,
    `- Purpose: ${email.purpose}`,
    `- MailerLite asset name draft: ${email.mailerLiteAssetNameDraft}`,
    `- Receipt rule: ${email.receiptPosture.rule}`,
    '',
    'Subject options:',
    ...copy.subjectOptions.map((item) => `- ${item.text}`),
    '',
    'Preheader options:',
    ...copy.preheaderOptions.map((item) => `- ${item.text}`),
    '',
    'Body:',
    '',
    copy.emailBody.greeting,
    '',
    ...copy.emailBody.paragraphs.flatMap((paragraph) => [paragraph, '']),
    `CTA: ${copy.emailBody.cta.text}`,
    '',
    copy.emailBody.closing,
    '',
  ];
  return lines.join('\n');
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Email Sequence Asset Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id interno: ${packet.launch.launchId}`,
    '',
    'Este paquete convierte el mini-lanzamiento en una secuencia completa de cuatro emails revisable por Brand. No crea assets en MailerLite, no envia correos, no asigna grupos, no conecta workflows y no toca onboarding.',
    '',
    '## Readiness',
    '',
    `- Upstream ready: ${packet.readiness.upstreamReady}`,
    `- Brand review status: ${packet.readiness.brandReviewStatus}`,
    `- Ready for MailerLite asset build now: ${packet.readiness.readyForMailerLiteAssetBuildNow}`,
    `- Ready for seed send now: ${packet.readiness.readyForSeedSendNow}`,
    `- Ready for receipt seed test now: ${packet.readiness.readyForReceiptSeedTestNow}`,
    `- Ready for audience launch now: ${packet.readiness.readyForAudienceLaunchNow}`,
    '',
    '## Sequence QA',
    '',
    `- Verdict: ${packet.sequenceQa.verdict}`,
    `- Public text chars: ${packet.sequenceQa.aggregateScan.publicTextChars}`,
    `- Banned internal term hits: ${packet.sequenceQa.aggregateScan.bannedTermHits.length}`,
    `- "a veces" formula count: ${packet.sequenceQa.aggregateScan.sometimesFormulaCount}`,
    '',
    'Requirements before MailerLite build:',
    renderList(packet.sequenceQa.requirementsBeforeAnyMailerLiteBuild),
    '',
    '## Email Sequence Draft',
    '',
    ...packet.emailSequence.map(renderEmail),
    '## MailerLite Asset Plan',
    '',
    `- Status: ${packet.mailerLiteAssetPlan.status}`,
    `- Asset count: ${packet.mailerLiteAssetPlan.assetCount}`,
    `- Active workflow allowed now: ${packet.mailerLiteAssetPlan.workflowPosture.activeWorkflowAllowedNow}`,
    `- Touches Onboarding v1: ${packet.mailerLiteAssetPlan.workflowPosture.touchesOnboardingV1}`,
    `- Touches Onboarding v2: ${packet.mailerLiteAssetPlan.workflowPosture.touchesOnboardingV2}`,
    `- Note: ${packet.mailerLiteAssetPlan.workflowPosture.note}`,
    '',
    '## Receipt And Onboarding Policy',
    '',
    `- Source candidate: ${packet.receiptAndOnboardingPolicy.sourceCandidate}`,
    `- Delivered candidate: ${packet.receiptAndOnboardingPolicy.deliveredCandidate}`,
    `- Brand candidate review status: ${packet.receiptAndOnboardingPolicy.brandCandidateReviewStatus}`,
    `- Brand missing candidate count: ${packet.receiptAndOnboardingPolicy.brandMissingCandidateCount}`,
    `- Sequence Sent group default: ${packet.receiptAndOnboardingPolicy.sequenceSentGroupDefault}`,
    `- Sent group rule: ${packet.receiptAndOnboardingPolicy.sentGroupRule}`,
    `- Onboarding handoff status: ${packet.receiptAndOnboardingPolicy.onboardingHandoff.currentStatus}`,
    `- Possible future onboarding target: ${packet.receiptAndOnboardingPolicy.onboardingHandoff.possibleFutureTarget}`,
    `- Preserves production Onboarding v1: ${packet.receiptAndOnboardingPolicy.onboardingHandoff.preservesProductionOnboardingV1}`,
    '',
    '## Approval Gates',
    '',
  ];

  for (const gate of packet.approvalGates) {
    lines.push(`- ${gate.id}: ${gate.currentStatus}; live mutation=${gate.allowsLiveMutation}; Alejandro approval=${gate.approvalNeededFromAlejandro}`);
  }

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin browser.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
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
    rehearsalPacket,
    eventContract,
    brandEmailAssetPacket,
    brandCandidateReviewPacket,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.eventContract),
    readJson(options.brandEmailAssetPacket),
    readJson(options.brandCandidateReviewPacket),
    loadSourceDigests(options),
  ]);

  return buildEmailSequenceAssetPacket({
    rehearsalPacket,
    eventContract,
    brandEmailAssetPacket,
    brandCandidateReviewPacket,
    sourceDigests,
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
    emailCount: packet.emailSequence.length,
    sequenceQaVerdict: packet.sequenceQa.verdict,
    bannedInternalTermHits: packet.sequenceQa.aggregateScan.bannedTermHits.length,
    sometimesFormulaCount: packet.sequenceQa.aggregateScan.sometimesFormulaCount,
    readyForMailerLiteAssetBuildNow: packet.readiness.readyForMailerLiteAssetBuildNow,
    readyForSeedSendNow: packet.readiness.readyForSeedSendNow,
    readyForReceiptSeedTestNow: packet.readiness.readyForReceiptSeedTestNow,
    readyForAudienceLaunchNow: packet.readiness.readyForAudienceLaunchNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email sequence asset packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEmailSequenceAssetPacket,
  buildEmailSequenceAssets,
  buildSequenceQa,
  launchFrom,
  parseArgs,
  renderMarkdown,
  sequencePublicText,
};
