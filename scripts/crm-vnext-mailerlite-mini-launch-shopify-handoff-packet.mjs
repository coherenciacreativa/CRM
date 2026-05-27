#!/usr/bin/env node
import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanDraftText } from './crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-shopify-handoff-packet-2026-05-27';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SHOPIFY_PROTOCOL = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md';
const DEFAULT_WEB_DESIGN_SOURCE_MAP = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/web_design/WEB_DESIGN_SOURCE_MAP.md';
const DEFAULT_VOICE_FINGERPRINT = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/voice/VOICE_FINGERPRINT_V0.md';
const DEFAULT_WEB_REPO = '/Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite';
const WEB_REFERENCE_PATHS = [
  'assets/page-typography-harmony.css',
  'assets/mobile-polish.css',
  'sections/landing-brujula-claridad.liquid',
  'sections/guide-brujula-claridad.liquid',
  'snippets/mailerlite-brujula-claridad-form.liquid',
  'templates/page.landing-brujula-claridad.json',
  'templates/page.guia-brujula-claridad.json',
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-shopify-handoff-packet.mjs [options]

Options:
  --rehearsal-packet <path>              Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --email-sequence-packet <path>         Email sequence asset packet JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --brand-candidate-review-packet <path> Brand candidate review packet JSON. Defaults to ${DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET}
  --shopify-protocol <path>              Brand Shopify preview protocol. Defaults to ${DEFAULT_SHOPIFY_PROTOCOL}
  --web-design-source-map <path>         Brand Web Design source map. Defaults to ${DEFAULT_WEB_DESIGN_SOURCE_MAP}
  --voice-fingerprint <path>             Brand voice fingerprint. Defaults to ${DEFAULT_VOICE_FINGERPRINT}
  --web-repo <path>                      Shopify repo root. Defaults to ${DEFAULT_WEB_REPO}
  --out <path>                           Write JSON packet
  --markdown-out <path>                  Write Markdown packet
  --help                                 Show this help

Local-only Shopify/Web Design handoff packet for one Mini-Launch OS rehearsal.
It defines the Shopify-first preview route, public copy blocks, suggested repo
files, QA checklist, and approval gates. It never writes the Shopify repo, calls
Shopify APIs, connects forms/tags/CRM, publishes, sends email, mutates
MailerLite, touches subscribers/workflows, appends ledgers, writes cards, or
changes scoring/Fact Store.`;

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
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'mini-launch';

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    brandCandidateReviewPacket: DEFAULT_BRAND_CANDIDATE_REVIEW_PACKET,
    shopifyProtocol: DEFAULT_SHOPIFY_PROTOCOL,
    webDesignSourceMap: DEFAULT_WEB_DESIGN_SOURCE_MAP,
    voiceFingerprint: DEFAULT_VOICE_FINGERPRINT,
    webRepo: DEFAULT_WEB_REPO,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--brand-candidate-review-packet') options.brandCandidateReviewPacket = argv[++index];
    else if (arg === '--shopify-protocol') options.shopifyProtocol = argv[++index];
    else if (arg === '--web-design-source-map') options.webDesignSourceMap = argv[++index];
    else if (arg === '--voice-fingerprint') options.voiceFingerprint = argv[++index];
    else if (arg === '--web-repo') options.webRepo = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const exists = async (path) => {
  try {
    await access(resolve(path), constants.F_OK);
    return true;
  } catch {
    return false;
  }
};

const digestSource = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const readTextDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return digestSource(path, content, consultedFor);
};

const inspectWebRepoReferences = async (webRepo) => {
  const root = resolve(webRepo);
  const references = [];
  for (const relativePath of WEB_REFERENCE_PATHS) {
    const fullPath = resolve(root, relativePath);
    const present = await exists(fullPath);
    let chars = 0;
    if (present) {
      const content = await readFile(fullPath, 'utf8');
      chars = content.length;
    }
    references.push({
      relativePath,
      path: fullPath,
      present,
      chars,
      role: relativePath.includes('typography')
        ? 'typography and web rhythm'
        : relativePath.includes('mobile')
          ? 'mobile QA and layout polish'
          : relativePath.includes('landing')
            ? 'landing precedent'
            : relativePath.includes('guide')
              ? 'resource/result page precedent'
              : relativePath.includes('snippet')
                ? 'MailerLite form snippet precedent'
                : 'Shopify template precedent',
    });
  }
  return {
    webRepo: root,
    referenceCount: references.length,
    presentCount: references.filter((item) => item.present).length,
    references,
  };
};

const loadSourceDigests = async (options, webRepoInspection) => {
  const digests = [
    await readTextDigest(options.rehearsalPacket, 'mini-launch concept, landing draft and public surface strategy'),
    await readTextDigest(options.emailSequencePacket, 'email sequence and CTA continuity'),
    await readTextDigest(options.brandCandidateReviewPacket, 'closed MailerLite receipt gates and Brand naming review state'),
    await readTextDigest(options.shopifyProtocol, 'Shopify-first routing, fallback and live-publish boundaries'),
    await readTextDigest(options.webDesignSourceMap, 'web design source authority, mobile-first and conversion-without-pressure criteria'),
    await readTextDigest(options.voiceFingerprint, 'Alejandro voice and anti-generic language guardrails'),
  ];

  for (const reference of webRepoInspection.references.filter((item) => item.present)) {
    digests.push({
      path: reference.path,
      present: true,
      chars: reference.chars,
      consultedFor: reference.role,
    });
  }
  return digests;
};

const launchFrom = (rehearsalPacket, emailSequencePacket) => ({
  launchId: rehearsalPacket?.launch?.launchId ?? emailSequencePacket?.launch?.launchId,
  resourceName: rehearsalPacket?.launch?.resourceName ?? emailSequencePacket?.launch?.resourceName,
  resourceType: rehearsalPacket?.launch?.resourceType ?? emailSequencePacket?.launch?.resourceType,
});

const buildPublicSurfaceCopy = ({ launch, rehearsalPacket }) => {
  const publicSurfaceDrafts = rehearsalPacket?.publicSurfaceDrafts ?? {};
  return {
    landing: {
      surface: 'public',
      h1: publicSurfaceDrafts?.landing?.h1Draft ?? launch.resourceName,
      eyebrow: 'Test breve',
      subhead: publicSurfaceDrafts?.landing?.subheadDraft
        ?? 'Un test breve para reconocer que tipo de descanso esta pidiendo tu mente y recibir una practica pequena para empezar a abrir espacio.',
      ctaPrimary: 'Hacer el test breve',
      ctaSecondary: 'Leer de que se trata',
      trustNotes: [
        'No es un diagnostico.',
        'No promete curar insomnio, ansiedad ni agotamiento clinico.',
        'Entrega una lectura pequena y una practica simple para hoy.',
      ],
    },
    quiz: {
      surface: 'public',
      title: 'Cinco preguntas para mirar tu descanso',
      intro: 'Responde con la opcion que mas se acerque a tu momento actual. No busques quedar bien; busca reconocer con honestidad por donde podria entrar mejor el descanso.',
      questions: (rehearsalPacket?.quizModel?.questions ?? []).map((question, index) => ({
        id: question.id ?? `q${index + 1}`,
        prompt: question.prompt,
        answerSignals: question.answerSignals ?? [],
      })),
    },
    result: {
      surface: 'public',
      title: 'Tu resultado es una pista, no una etiqueta',
      intro: publicSurfaceDrafts?.quiz?.completionMessageDraft
        ?? 'Tu resultado no pretende encerrarte en una categoria. Es una lectura pequena para empezar a escucharte con mas precision.',
      cta: 'Recibir mi lectura y practica',
    },
    thankYou: {
      surface: 'public',
      title: 'Listo. Tu lectura esta en camino.',
      body: 'Te envie tu lectura al correo. Si no llega en unos minutos, revisa promociones o spam.',
      cta: 'Volver a la pagina principal',
    },
  };
};

const flattenPublicCopy = (publicSurfaceCopy) => [
  publicSurfaceCopy.landing.eyebrow,
  publicSurfaceCopy.landing.h1,
  publicSurfaceCopy.landing.subhead,
  publicSurfaceCopy.landing.ctaPrimary,
  publicSurfaceCopy.landing.ctaSecondary,
  ...publicSurfaceCopy.landing.trustNotes,
  publicSurfaceCopy.quiz.title,
  publicSurfaceCopy.quiz.intro,
  ...publicSurfaceCopy.quiz.questions.map((question) => question.prompt),
  publicSurfaceCopy.result.title,
  publicSurfaceCopy.result.intro,
  publicSurfaceCopy.result.cta,
  publicSurfaceCopy.thankYou.title,
  publicSurfaceCopy.thankYou.body,
  publicSurfaceCopy.thankYou.cta,
].filter(Boolean).join('\n');

const buildSuggestedShopifyFiles = ({ launch }) => {
  const slug = slugify(launch.resourceName);
  return [
    {
      path: `sections/landing-${slug}.liquid`,
      purpose: 'Landing + quiz entry surface; Shopify section for preview/draft page.',
      basis: 'sections/landing-brujula-claridad.liquid',
      status: 'suggested_not_created',
    },
    {
      path: `sections/result-${slug}.liquid`,
      purpose: 'Result/thank-you/resource surface after quiz or email capture.',
      basis: 'sections/guide-brujula-claridad.liquid',
      status: 'suggested_not_created',
    },
    {
      path: `snippets/mailerlite-${slug}-form.liquid`,
      purpose: 'Future form snippet placeholder; do not connect real MailerLite form/tag/group without approval.',
      basis: 'snippets/mailerlite-brujula-claridad-form.liquid',
      status: 'suggested_not_created',
    },
    {
      path: `templates/page.landing-${slug}.json`,
      purpose: 'Draft Shopify page template for the landing.',
      basis: 'templates/page.landing-brujula-claridad.json',
      status: 'suggested_not_created',
    },
    {
      path: `templates/page.result-${slug}.json`,
      purpose: 'Draft Shopify page template for result/thank-you/resource.',
      basis: 'templates/page.guia-brujula-claridad.json',
      status: 'suggested_not_created',
    },
  ];
};

const buildDesignDirection = ({ launch }) => ({
  posture: 'warm_premium_mobile_first_not_kitsch_not_clinical',
  referenceSystem: 'Brújula landing/resource pages are precedent, not a cage.',
  typographyAndRhythm: [
    'Use existing Shopify theme typography variables when possible.',
    'Respect page-typography-harmony.css for hierarchy and line length.',
    'Use mobile-polish.css criteria to prevent overflow, cramped buttons or edge-to-edge accidents.',
  ],
  visualNotes: [
    `${launch.resourceName} should feel like a quiet, intelligent test, not a loud quiz funnel.`,
    'Use warm paper/cream, restrained teal/sage, and one clear CTA hierarchy unless Brand chooses a new visual direction.',
    'Avoid gamified/kitsch visuals; the test should feel reflective and trustworthy.',
  ],
});

const buildFormAndDataPlan = ({ launch, brandCandidateReviewPacket }) => ({
  status: 'placeholder_only_no_live_form_connection',
  publicFields: [
    { field: 'name', required: true, purpose: 'personalize email greeting' },
    { field: 'email', required: true, purpose: 'deliver result/resource' },
    { field: 'quiz_answers', required: true, purpose: 'compute/show result locally or through future approved mechanism' },
  ],
  optionalFields: [
    { field: 'phone', required: false, purpose: 'not recommended for first version unless a strong reason appears' },
    { field: 'city_country', required: false, purpose: 'avoid extra friction unless CRM asks later' },
  ],
  hiddenFieldsDraft: [
    { field: 'source', value: `Landing ${launch.resourceName}`, public: false },
    { field: 'launch_id', value: launch.launchId, public: false },
  ],
  mailerLiteGroupsRemainClosed: {
    sourceCandidate: brandCandidateReviewPacket?.candidateRows?.find((row) => row.layer === 'Source')?.name ?? null,
    deliveredCandidate: brandCandidateReviewPacket?.candidateRows?.find((row) => row.layer === 'Delivered')?.name ?? null,
    missingBrandCandidateCount: brandCandidateReviewPacket?.dictionaryState?.missingCandidateCount ?? null,
    rule: 'Do not connect form submissions to groups/tags until Brand dictionary + group dry-run + Alejandro approval exist.',
  },
});

const buildQaChecklist = () => ({
  publicCopy: [
    'No internal language: CRM, MailerLite, tag, embudo, lead magnet, automatizacion, launch_id.',
    'No diagnostic, therapeutic, medical or guaranteed transformation claims.',
    'CTA is clear but not anxious.',
    'Public notes and internal implementation notes are separate.',
  ],
  mobile: [
    'Hero, quiz, form and thank-you states fit on mobile without text overlap.',
    'Buttons are tappable and do not wrap awkwardly.',
    'Question cards and answer choices keep stable spacing.',
    'Preview includes at least landing top, quiz state, result/thank-you state and email capture state.',
  ],
  technical: [
    'No live publish.',
    'No live theme push.',
    'No real MailerLite form id, group, tag, automation or CRM connection without approval.',
    'Use local/draft section/template names if Web Design builds a preview.',
  ],
});

const buildApprovalGates = () => [
  {
    id: 'web_design_review',
    currentStatus: 'needed',
    allowsLiveMutation: false,
    approvalNeededFromAlejandro: false,
  },
  {
    id: 'shopify_local_repo_draft',
    currentStatus: 'closed_until_web_design_accepts_handoff_or_alejandro_requests_build',
    allowsLiveMutation: false,
    approvalNeededFromAlejandro: false,
  },
  {
    id: 'shopify_preview_or_draft_page',
    currentStatus: 'closed_until_exact_preview_scope',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'form_mailerlite_connection',
    currentStatus: 'closed_until_brand_groups_and_mailerlite_approval',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
  {
    id: 'publish_live',
    currentStatus: 'closed',
    allowsLiveMutation: true,
    approvalNeededFromAlejandro: true,
  },
];

const buildSafety = ({ webRepoInspection }) => ({
  localOnly: true,
  shopifyRepoReadOnlyInspection: true,
  shopifyRepoReferenceFilesRead: webRepoInspection.presentCount,
  shopifyRepoFilesWritten: false,
  shopifyApiCalled: false,
  shopifyLiveThemeTouched: false,
  shopifyPublishPerformed: false,
  mailerLiteApiCalled: false,
  mailerLiteMutationsPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildShopifyHandoffPacket = ({
  rehearsalPacket,
  emailSequencePacket,
  brandCandidateReviewPacket,
  webRepoInspection,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, emailSequencePacket);
  const publicSurfaceCopy = buildPublicSurfaceCopy({ launch, rehearsalPacket });
  const publicCopyScan = scanDraftText(flattenPublicCopy(publicSurfaceCopy));
  const suggestedShopifyFiles = buildSuggestedShopifyFiles({ launch });
  const upstreamReady = [
    rehearsalPacket?.ok === true,
    emailSequencePacket?.ok === true,
    brandCandidateReviewPacket?.ok === true,
    webRepoInspection.presentCount >= 5,
  ].every(Boolean);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_shopify_web_design_handoff_packet',
    generatedAt,
    ok: upstreamReady && publicCopyScan.okForBrandReviewDraft,
    status: upstreamReady
      ? 'shopify_handoff_packet_ready_for_web_design_review_no_live_changes'
      : 'shopify_handoff_packet_needs_upstream_or_web_reference',
    launch,
    readiness: {
      upstreamReady,
      readyForWebDesignReviewNow: true,
      readyForShopifyRepoEditNow: false,
      readyForShopifyPreviewNow: false,
      readyForFormConnectionNow: false,
      readyForPublishNow: false,
      nextNoLiveMove: 'Web Design reviews this handoff and either builds a local draft or returns visual/UX corrections.',
    },
    publicSurfaceCopy,
    publicCopyQa: {
      verdict: publicCopyScan.okForBrandReviewDraft ? 'yellow_ready_for_web_design_review' : 'red_rewrite_before_web_design',
      scan: publicCopyScan,
    },
    designDirection: buildDesignDirection({ launch }),
    webRepoInspection,
    suggestedShopifyFiles,
    formAndDataPlan: buildFormAndDataPlan({ launch, brandCandidateReviewPacket }),
    qaChecklist: buildQaChecklist(),
    approvalGates: buildApprovalGates(),
    sourceDigests,
    safety: buildSafety({ webRepoInspection }),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const copy = packet.publicSurfaceCopy;
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Shopify/Web Handoff Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id interno: ${packet.launch.launchId}`,
    '',
    'Este packet prepara el handoff Shopify/Web Design para una vista real de landing/test/resultado. No escribe en el repo Shopify, no llama APIs, no conecta formularios, no publica y no toca MailerLite ni CRM vivo.',
    '',
    '## Readiness',
    '',
    `- Ready for Web Design review now: ${packet.readiness.readyForWebDesignReviewNow}`,
    `- Ready for Shopify repo edit now: ${packet.readiness.readyForShopifyRepoEditNow}`,
    `- Ready for Shopify preview now: ${packet.readiness.readyForShopifyPreviewNow}`,
    `- Ready for form connection now: ${packet.readiness.readyForFormConnectionNow}`,
    `- Ready for publish now: ${packet.readiness.readyForPublishNow}`,
    '',
    '## Public Copy QA',
    '',
    `- Verdict: ${packet.publicCopyQa.verdict}`,
    `- Public text chars: ${packet.publicCopyQa.scan.publicTextChars}`,
    `- Banned internal term hits: ${packet.publicCopyQa.scan.bannedTermHits.length}`,
    `- "a veces" formula count: ${packet.publicCopyQa.scan.sometimesFormulaCount}`,
    '',
    '## Public Surfaces',
    '',
    '### Landing',
    `- Eyebrow: ${copy.landing.eyebrow}`,
    `- H1: ${copy.landing.h1}`,
    `- Subhead: ${copy.landing.subhead}`,
    `- Primary CTA: ${copy.landing.ctaPrimary}`,
    `- Secondary CTA: ${copy.landing.ctaSecondary}`,
    '',
    'Trust notes:',
    renderList(copy.landing.trustNotes),
    '',
    '### Quiz',
    `- Title: ${copy.quiz.title}`,
    `- Intro: ${copy.quiz.intro}`,
    '',
  ];

  for (const question of copy.quiz.questions) {
    lines.push(`- ${question.id}: ${question.prompt}`);
  }

  lines.push('', '### Result / Thank You');
  lines.push(`- Result title: ${copy.result.title}`);
  lines.push(`- Result intro: ${copy.result.intro}`);
  lines.push(`- Result CTA: ${copy.result.cta}`);
  lines.push(`- Thank-you title: ${copy.thankYou.title}`);
  lines.push(`- Thank-you body: ${copy.thankYou.body}`);

  lines.push('', '## Suggested Shopify Files', '');
  for (const file of packet.suggestedShopifyFiles) {
    lines.push(`- \`${file.path}\` (${file.status}) - ${file.purpose}; basis: \`${file.basis}\``);
  }

  lines.push('', '## Web Repo References Read', '');
  lines.push(`- Repo: ${packet.webRepoInspection.webRepo}`);
  lines.push(`- Reference files present/read: ${packet.webRepoInspection.presentCount}/${packet.webRepoInspection.referenceCount}`);
  for (const reference of packet.webRepoInspection.references) {
    lines.push(`- ${reference.present ? 'present' : 'missing'}: \`${reference.relativePath}\` (${reference.role})`);
  }

  lines.push('', '## Design Direction', '');
  lines.push(`- Posture: ${packet.designDirection.posture}`);
  lines.push(`- Reference system: ${packet.designDirection.referenceSystem}`);
  lines.push('Typography and rhythm:');
  lines.push(renderList(packet.designDirection.typographyAndRhythm));
  lines.push('Visual notes:');
  lines.push(renderList(packet.designDirection.visualNotes));

  lines.push('', '## Form And Data Plan', '');
  lines.push(`- Status: ${packet.formAndDataPlan.status}`);
  lines.push('- Public fields:');
  for (const field of packet.formAndDataPlan.publicFields) {
    lines.push(`  - ${field.field}: required=${field.required}; ${field.purpose}`);
  }
  lines.push('- Hidden fields draft (internal only):');
  for (const field of packet.formAndDataPlan.hiddenFieldsDraft) {
    lines.push(`  - ${field.field}: ${field.value}`);
  }
  lines.push(`- Source candidate: ${packet.formAndDataPlan.mailerLiteGroupsRemainClosed.sourceCandidate}`);
  lines.push(`- Delivered candidate: ${packet.formAndDataPlan.mailerLiteGroupsRemainClosed.deliveredCandidate}`);
  lines.push(`- Rule: ${packet.formAndDataPlan.mailerLiteGroupsRemainClosed.rule}`);

  lines.push('', '## QA Checklist', '');
  lines.push('Public copy:');
  lines.push(renderList(packet.qaChecklist.publicCopy));
  lines.push('Mobile:');
  lines.push(renderList(packet.qaChecklist.mobile));
  lines.push('Technical:');
  lines.push(renderList(packet.qaChecklist.technical));

  lines.push('', '## Approval Gates', '');
  for (const gate of packet.approvalGates) {
    lines.push(`- ${gate.id}: ${gate.currentStatus}; live mutation=${gate.allowsLiveMutation}; Alejandro approval=${gate.approvalNeededFromAlejandro}`);
  }

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Repo Shopify inspeccionado en lectura solamente.');
  lines.push('- Sin archivos escritos en Shopify.');
  lines.push('- Sin Shopify API calls ni publicacion.');
  lines.push('- Sin conexion real de formulario, grupos, tags, CRM o automatizaciones.');
  lines.push('- Sin MailerLite API calls, subscribers, workflows o sends.');
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
  const webRepoInspection = await inspectWebRepoReferences(options.webRepo);
  const [
    rehearsalPacket,
    emailSequencePacket,
    brandCandidateReviewPacket,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.emailSequencePacket),
    readJson(options.brandCandidateReviewPacket),
    loadSourceDigests(options, webRepoInspection),
  ]);

  return buildShopifyHandoffPacket({
    rehearsalPacket,
    emailSequencePacket,
    brandCandidateReviewPacket,
    webRepoInspection,
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
    readyForWebDesignReviewNow: packet.readiness.readyForWebDesignReviewNow,
    readyForShopifyRepoEditNow: packet.readiness.readyForShopifyRepoEditNow,
    readyForShopifyPreviewNow: packet.readiness.readyForShopifyPreviewNow,
    readyForFormConnectionNow: packet.readiness.readyForFormConnectionNow,
    readyForPublishNow: packet.readiness.readyForPublishNow,
    bannedInternalTermHits: packet.publicCopyQa.scan.bannedTermHits.length,
    sometimesFormulaCount: packet.publicCopyQa.scan.sometimesFormulaCount,
    webRepoReferenceFilesRead: packet.safety.shopifyRepoReferenceFilesRead,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch Shopify handoff packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPublicSurfaceCopy,
  buildShopifyHandoffPacket,
  buildSuggestedShopifyFiles,
  flattenPublicCopy,
  inspectWebRepoReferences,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
