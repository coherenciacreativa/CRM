#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-brand-email-asset-packet-2026-05-27';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_VOICE_FINGERPRINT = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/voice/VOICE_FINGERPRINT_V0.md';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_OPERATOR_LAYER = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/MANTIS_OPERATOR_LAYER.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs [options]

Options:
  --rehearsal-packet <path>      Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --seed-test-qa-packet <path>   Seed-test QA JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --event-contract <path>        Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --voice-fingerprint <path>     Brand voice fingerprint. Defaults to ${DEFAULT_VOICE_FINGERPRINT}
  --email-style-canon <path>     Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --operator-layer <path>        Brand Department OS operator layer. Defaults to ${DEFAULT_OPERATOR_LAYER}
  --group-dictionary <path>      Brand MailerLite group dictionary. Defaults to ${DEFAULT_GROUP_DICTIONARY}
  --out <path>                   Write JSON packet
  --markdown-out <path>          Write Markdown packet
  --help                         Show this help

Local-only Brand/email asset packet for Email 1 of one Mini-Launch OS rehearsal.
It drafts public-facing copy plus a MailerLite-style visual spec for Brand review
without calling MailerLite, Shopify, CRM live APIs, subscribers, workflows, forms,
sends, Signal Event Ledger, card writes, scoring, or Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    voiceFingerprint: DEFAULT_VOICE_FINGERPRINT,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    operatorLayer: DEFAULT_OPERATOR_LAYER,
    groupDictionary: DEFAULT_GROUP_DICTIONARY,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--voice-fingerprint') options.voiceFingerprint = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--operator-layer') options.operatorLayer = argv[++index];
    else if (arg === '--group-dictionary') options.groupDictionary = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const normalizeForScan = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const asPublicText = (assetDrafts) => [
  ...(assetDrafts.subjectOptions ?? []).map((item) => item.text),
  ...(assetDrafts.preheaderOptions ?? []).map((item) => item.text),
  assetDrafts.emailBody?.greeting,
  ...(assetDrafts.emailBody?.paragraphs ?? []),
  assetDrafts.emailBody?.cta?.text,
  assetDrafts.emailBody?.closing,
  assetDrafts.plainTextFallback,
].filter(Boolean).join('\n');

const scanDraftText = (text, {
  bannedTerms = [
    'lead magnet',
    'funnel',
    'embudo',
    'captura',
    'crm',
    'tag',
    'automatizacion',
    'automatización',
    'mailerlite',
    'simulado',
    'review',
    'launch_id',
    'workflow',
  ],
} = {}) => {
  const normalized = normalizeForScan(text);
  const termHits = bannedTerms
    .map((term) => ({ term, count: normalized.split(normalizeForScan(term)).length - 1 }))
    .filter((hit) => hit.count > 0);
  const sometimesFormulaCount = (normalized.match(/\ba veces\b/g) ?? []).length;
  return {
    publicTextChars: text.length,
    bannedTermHits: termHits,
    sometimesFormulaCount,
    okForBrandReviewDraft: termHits.length === 0 && sometimesFormulaCount === 0,
  };
};

const digestSource = (path, content) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor: path.includes('VOICE_FINGERPRINT')
    ? 'voice, rhythm and anti-generic writing'
    : path.includes('email_style_canon')
      ? 'email layout, typography, CTA, signature and footer canon'
      : path.includes('MANTIS_OPERATOR_LAYER')
        ? 'Brand Department OS routing, source authority and public/internal separation'
        : path.includes('GROUP_DICTIONARY')
          ? 'MailerLite group meaning and live/candidate boundaries'
          : path.includes('seed_test_qa')
            ? 'seed-test gates and no-live approval matrix'
            : 'mini-launch rehearsal or event contract state',
});

const loadSourceDigests = async (options) => {
  const paths = [
    options.rehearsalPacket,
    options.seedTestQaPacket,
    options.eventContract,
    options.voiceFingerprint,
    options.emailStyleCanon,
    options.operatorLayer,
    options.groupDictionary,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push(digestSource(path, content));
  }
  return digests;
};

const launchFrom = (rehearsalPacket, seedTestQaPacket, eventContract) => ({
  launchId:
    rehearsalPacket?.launch?.launchId
    ?? seedTestQaPacket?.launch?.launchId
    ?? eventContract?.launch?.launchId,
  resourceName:
    rehearsalPacket?.launch?.resourceName
    ?? seedTestQaPacket?.launch?.resourceName
    ?? eventContract?.launch?.resourceName,
  resourceType:
    rehearsalPacket?.launch?.resourceType
    ?? seedTestQaPacket?.launch?.resourceType
    ?? eventContract?.launch?.resourceType,
  sourceGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name
    ?? seedTestQaPacket?.launch?.sourceGroupCandidate
    ?? eventContract?.launch?.sourceGroupCandidate
    ?? null,
  deliveredGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name
    ?? seedTestQaPacket?.launch?.deliveredGroupCandidate
    ?? eventContract?.launch?.deliveredGroupCandidate
    ?? null,
});

const buildEmailAssetDrafts = ({ launch }) => ({
  status: 'draft_for_brand_review_not_public_not_sent',
  surface: 'public_copy_plus_internal_notes',
  emailStep: 1,
  role: 'delivery_and_orientation',
  publicCopy: {
    subjectOptions: [
      {
        text: 'Tu lectura: qué tipo de descanso está pidiendo tu mente',
        note: 'directa, humana, sin urgencia artificial',
      },
      {
        text: 'Una pista amable para descansar mejor',
        note: 'más editorial; conviene si el resultado ya queda claro en el preview',
      },
      {
        text: `Tu resultado de ${launch.resourceName}`,
        note: 'funcional y claro para prueba seed',
      },
    ],
    preheaderOptions: [
      {
        text: 'Una lectura pequeña para mirar tu descanso sin convertirlo en otra tarea.',
      },
      {
        text: 'La idea no es exigirte calma, sino darte una entrada más amable.',
      },
      {
        text: 'Puedes leerlo despacio y quedarte con una práctica simple para hoy.',
      },
    ],
    emailBody: {
      greeting: 'Hola,',
      paragraphs: [
        `Gracias por hacer ${launch.resourceName}.`,
        'Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte. Es una pista pequeña: una manera de mirar por dónde podría entrar mejor el descanso en este momento de tu vida.',
        'La mente no siempre baja revoluciones por el mismo camino. Para algunas personas ayuda abrir espacio; para otras, volver al cuerpo, ordenar un límite o darse permiso sin convertir el descanso en otra tarea pendiente.',
        'Te dejo tu lectura y una práctica breve para probar hoy. Léela con curiosidad, sin buscar hacerlo perfecto. Si algo resuena, toma eso como punto de partida.',
      ],
      cta: {
        text: 'Ver mi lectura y práctica',
        destination: 'result_or_resource_link_placeholder',
        posture: 'one clear CTA; brand-aligned button or quiet editorial link',
      },
      closing: 'Un abrazo,\nAlejandro',
    },
    plainTextFallback: [
      'Hola,',
      '',
      `Gracias por hacer ${launch.resourceName}.`,
      '',
      'Lo que recibes aquí no es un diagnóstico ni una etiqueta para encerrarte. Es una pista pequeña: una manera de mirar por dónde podría entrar mejor el descanso en este momento de tu vida.',
      '',
      'La mente no siempre baja revoluciones por el mismo camino. Para algunas personas ayuda abrir espacio; para otras, volver al cuerpo, ordenar un límite o darse permiso sin convertir el descanso en otra tarea pendiente.',
      '',
      'Te dejo tu lectura y una práctica breve para probar hoy. Léela con curiosidad, sin buscar hacerlo perfecto. Si algo resuena, toma eso como punto de partida.',
      '',
      'Ver mi lectura y práctica: {{ result_or_resource_link }}',
      '',
      'Un abrazo,',
      'Alejandro',
    ].join('\n'),
  },
  internalNotes: {
    publicSurfaceRule: 'The public email copy above must not include implementation language, local paths, group names, launch ids, routing notes or internal QA receipts.',
    brandStatus: 'needs_brand_review',
    copyStatus: 'usable_draft_not_canon_approved',
    resultPersonalization: 'If the quiz can personalize by result archetype, keep this email as shared orientation and link to the result/practice page instead of adding complex conditional copy in Email 1.',
    signatureAsset: 'pending: use Alejandro visual signature asset when available; fallback is sober text signature.',
    footer: 'pending: review MailerLite legal/footer localization and visual cleanliness before any production use.',
  },
});

const buildVisualSpec = () => ({
  status: 'asset_spec_ready_for_mailerlite_builder_or_web_design_handoff',
  source: 'email_style_canon.md',
  outerBackground: '#F4F7FA',
  containerBackground: '#FFFFFF',
  outerWidth: '640px approx',
  contentWidth: '540px approx',
  lateralPadding: '50px approx when template allows',
  bodyFont: 'Poppins, sans-serif',
  bodySize: '16px',
  bodyLineHeight: '26.4px / 165%',
  bodyColor: '#474747',
  editorialAccentFont: 'Georgia, serif',
  cta: {
    allowed: true,
    rule: 'one main CTA; brand-aligned color, not default MailerLite blue; medium weight; soft radius; sufficient contrast',
  },
  signature: {
    visualSignatureExpected: true,
    status: 'pending_asset_reference',
  },
  footer: {
    status: 'needs_review_before_public_or_audience_send',
    rule: 'legal footer must feel intentional, localized when possible, and not visually broken',
  },
  mobileQa: 'required before seed send or audience use',
});

const buildVoiceQa = ({ assetDrafts }) => {
  const publicText = asPublicText(assetDrafts.publicCopy);
  const scan = scanDraftText(publicText);
  return {
    publicTextScan: scan,
    verdict: scan.okForBrandReviewDraft ? 'yellow_ready_for_brand_review' : 'red_needs_rewrite_before_review',
    strengths: [
      'Opens with correspondence instead of sales pressure.',
      'Keeps the promise modest: lectura, pista, practica breve.',
      'Avoids exaggerated transformation claims and keeps non-diagnostic posture.',
      'Uses a human invitation rhythm closer to Alejandro than a generic template.',
    ],
    watchouts: [
      'Needs Brand review before reuse.',
      'Needs the real result/practice destination before seed send.',
      'Needs visual signature/footer QA before production.',
      'Do not overfit article-style cadence if this becomes a short transactional email.',
    ],
  };
};

const buildApprovalGates = ({ launch }) => [
  {
    id: 'brand_review_email_1_copy',
    owner: 'Brand Hub',
    currentStatus: 'needed_before_seed_or_public_reuse',
    allowsLiveMutation: false,
    approvalNeededFromAlejandro: false,
    meaning: 'Brand can approve/revise the copy and voice before MailerLite rendering.',
  },
  {
    id: 'mailerLite_asset_build_or_ui_entry',
    owner: 'MailerLite operator',
    currentStatus: 'closed_until_brand_review_and_builder_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
    meaning: 'Building or editing a MailerLite email asset touches the platform and needs exact scope.',
  },
  {
    id: 'asset_only_seed_send',
    owner: 'MailerLite operator',
    currentStatus: 'closed_until_exact_seed_approval',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
    meaning: 'A seed email send tests creative rendering only; it does not test receipts or audience launch.',
  },
  {
    id: 'receipt_seed_test',
    owner: 'MailerLite + CRM',
    currentStatus: 'closed_until_group_dry_run_and_exact_receipt_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
    meaning: `Would require fresh group dry-run for ${launch.sourceGroupCandidate} and ${launch.deliveredGroupCandidate}.`,
  },
  {
    id: 'audience_launch',
    owner: 'Alejandro',
    currentStatus: 'closed',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
    meaning: 'No public send, Shopify publish, form connection, onboarding handoff, CRM card write or scoring without separate approval.',
  },
];

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  workflowMutationsPerformed: false,
  formMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildBrandEmailAssetPacket = ({
  rehearsalPacket,
  seedTestQaPacket,
  eventContract,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, seedTestQaPacket, eventContract);
  const rehearsalReady = rehearsalPacket?.status === 'mini_launch_rehearsal_ready_no_live_changes' && rehearsalPacket?.ok === true;
  const seedQaReady = seedTestQaPacket?.status === 'seed_test_qa_packet_ready_no_live_changes' && seedTestQaPacket?.ok === true;
  const eventContractReady = eventContract?.status === 'mini_launch_event_contract_ready_no_ledger_write' && eventContract?.ok === true;
  const assetDrafts = buildEmailAssetDrafts({ launch });
  const voiceQa = buildVoiceQa({ assetDrafts });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_brand_email_asset_packet',
    generatedAt,
    ok: rehearsalReady && seedQaReady && eventContractReady && voiceQa.publicTextScan.okForBrandReviewDraft,
    status: rehearsalReady && seedQaReady && eventContractReady
      ? 'brand_email_asset_packet_ready_for_brand_review_no_live_changes'
      : 'brand_email_asset_packet_needs_upstream_packets',
    launch,
    readiness: {
      rehearsalReady,
      seedQaReady,
      eventContractReady,
      brandReviewStatus: 'needs_brand_review',
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
      nextNoLiveMove: 'Brand reviews/revises Email 1 copy and visual spec; then regenerate seed-test QA packet with exact asset scope.',
    },
    assetDrafts,
    visualSpec: buildVisualSpec(),
    voiceQa,
    surfaceSeparation: {
      public: ['subject', 'preheader', 'email body', 'CTA text', 'plain-text fallback'],
      internal: ['source receipts', 'group candidates', 'approval gates', 'QA receipt', 'local paths', 'launch_id'],
      rule: 'Public copy must stay clean; implementation language belongs only in internal notes.',
    },
    approvalGates: buildApprovalGates({ launch }),
    nextSteps: [
      'Send this packet to Brand for review/revision, not as final approval.',
      'After Brand approval, build a MailerLite draft or UI asset only with exact approved scope.',
      'Run asset-only seed send only after Alejandro approves the exact seed email and send scope.',
      'Run receipt seed test only after fresh group dry-run and explicit approval for seed subscriber/group assignments.',
      'Keep audience launch, onboarding handoff, CRM card/scoring and Signal Event Ledger append closed until separate approval.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const copy = packet.assetDrafts.publicCopy;
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Brand/Email Asset Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id interno: ${packet.launch.launchId}`,
    '',
    'Este paquete convierte el ensayo en una pieza de email revisable por Marca. No aprueba envio, no crea assets vivos y no toca MailerLite. Sirve para que el equipo de Marca revise voz, promesa, CTA, firma, footer y sensacion editorial antes de probar render o recibos.',
    '',
    '## Readiness',
    '',
    `- Rehearsal ready: ${packet.readiness.rehearsalReady}`,
    `- Seed QA ready: ${packet.readiness.seedQaReady}`,
    `- Event contract ready: ${packet.readiness.eventContractReady}`,
    `- Brand review status: ${packet.readiness.brandReviewStatus}`,
    `- Ready for MailerLite asset build now: ${packet.readiness.readyForMailerLiteAssetBuildNow}`,
    `- Ready for seed send now: ${packet.readiness.readyForSeedSendNow}`,
    `- Ready for receipt seed test now: ${packet.readiness.readyForReceiptSeedTestNow}`,
    `- Ready for audience launch now: ${packet.readiness.readyForAudienceLaunchNow}`,
    '',
    '## Borrador Publico - Email 1',
    '',
    '### Subject Options',
    '',
  ];

  for (const option of copy.subjectOptions) {
    lines.push(`- ${option.text} (${option.note})`);
  }

  lines.push('', '### Preheader Options', '');
  for (const option of copy.preheaderOptions) {
    lines.push(`- ${option.text}`);
  }

  lines.push('', '### Body Draft', '');
  lines.push(copy.emailBody.greeting, '');
  for (const paragraph of copy.emailBody.paragraphs) {
    lines.push(paragraph, '');
  }
  lines.push(`CTA: ${copy.emailBody.cta.text}`);
  lines.push('', copy.emailBody.closing, '');

  lines.push('### Plain Text Fallback', '');
  lines.push('```text');
  lines.push(copy.plainTextFallback);
  lines.push('```');

  lines.push('', '## Especificacion Visual Email', '');
  for (const [key, value] of Object.entries(packet.visualSpec)) {
    if (typeof value === 'string' || typeof value === 'boolean') lines.push(`- ${key}: ${value}`);
  }
  lines.push(`- CTA: ${packet.visualSpec.cta.rule}`);
  lines.push(`- Signature: ${packet.visualSpec.signature.status}`);
  lines.push(`- Footer: ${packet.visualSpec.footer.status}`);

  lines.push('', '## Voice QA', '');
  lines.push(`- Verdict: ${packet.voiceQa.verdict}`);
  lines.push(`- Public text chars: ${packet.voiceQa.publicTextScan.publicTextChars}`);
  lines.push(`- Banned internal term hits: ${packet.voiceQa.publicTextScan.bannedTermHits.length}`);
  lines.push(`- "a veces" formula count: ${packet.voiceQa.publicTextScan.sometimesFormulaCount}`);
  lines.push('', 'Strengths:');
  lines.push(renderList(packet.voiceQa.strengths));
  lines.push('', 'Watchouts:');
  lines.push(renderList(packet.voiceQa.watchouts));

  lines.push('', '## Surface Separation', '');
  lines.push(`- Public: ${packet.surfaceSeparation.public.join(', ')}`);
  lines.push(`- Internal: ${packet.surfaceSeparation.internal.join(', ')}`);
  lines.push(`- Rule: ${packet.surfaceSeparation.rule}`);

  lines.push('', '## Approval Gates', '');
  for (const gate of packet.approvalGates) {
    lines.push(`### ${gate.id}`);
    lines.push(`- Owner: ${gate.owner}`);
    lines.push(`- Current status: ${gate.currentStatus}`);
    lines.push(`- Allows live mutation: ${gate.allowsLiveMutation}`);
    lines.push(`- Approval needed from Alejandro: ${gate.approvalNeededFromAlejandro}`);
    lines.push(`- Meaning: ${gate.meaning}`);
    lines.push('');
  }

  lines.push('## Next Steps', '');
  lines.push(renderList(packet.nextSteps));

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
  const [rehearsalPacket, seedTestQaPacket, eventContract, sourceDigests] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.seedTestQaPacket),
    readJson(options.eventContract),
    loadSourceDigests(options),
  ]);

  return buildBrandEmailAssetPacket({
    rehearsalPacket,
    seedTestQaPacket,
    eventContract,
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
    brandReviewStatus: packet.readiness.brandReviewStatus,
    readyForMailerLiteAssetBuildNow: packet.readiness.readyForMailerLiteAssetBuildNow,
    readyForSeedSendNow: packet.readiness.readyForSeedSendNow,
    readyForReceiptSeedTestNow: packet.readiness.readyForReceiptSeedTestNow,
    readyForAudienceLaunchNow: packet.readiness.readyForAudienceLaunchNow,
    voiceQaVerdict: packet.voiceQa.verdict,
    bannedInternalTermHits: packet.voiceQa.publicTextScan.bannedTermHits.length,
    sometimesFormulaCount: packet.voiceQa.publicTextScan.sometimesFormulaCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch Brand/email asset packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  asPublicText,
  buildBrandEmailAssetPacket,
  buildEmailAssetDrafts,
  buildVisualSpec,
  buildVoiceQa,
  launchFrom,
  parseArgs,
  renderMarkdown,
  scanDraftText,
};
