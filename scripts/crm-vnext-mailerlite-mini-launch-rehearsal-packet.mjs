#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  buildCrmSignalMap,
  buildPublicSurfaceGuardrails,
  buildReceiptPlan,
} from './crm-vnext-mailerlite-mini-launch-v0-packet.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-rehearsal-packet-2026-05-27';
const DEFAULT_OPERATING_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.json';
const DEFAULT_EXECUTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_BRAND_OPERATOR = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/MANTIS_OPERATOR_LAYER.md';
const DEFAULT_SHOPIFY_PROTOCOL = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_RECEIPT_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CRM_SOURCE_MAP = '/Users/alejandrogomez/CRM/docs/crm-vnext/source-of-truth-map.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-rehearsal-packet.mjs [options]

Options:
  --launch-id <id>              Stable CRM launch id. Defaults to mini_2026_06_rehearsal_inteligencia_para_descansar
  --resource-name <name>        Resource name. Defaults to Inteligencia para descansar
  --resource-type <type>        quiz|game|guide|audio|practice|interactive. Defaults to quiz
  --audience <text>             Rehearsal audience hypothesis
  --success-criterion <text>    Rehearsal success criterion
  --operating-packet <path>     Mini-Launch OS v0 JSON. Defaults to ${DEFAULT_OPERATING_PACKET}
  --execution-packet <path>     Onboarding v2 execution packet JSON. Defaults to ${DEFAULT_EXECUTION_PACKET}
  --out <path>                  Write JSON packet
  --markdown-out <path>         Write Markdown packet
  --help                        Show this help

Local-only rehearsal packet for one concrete mini-launch idea. It produces the
Brand/Web/MailerLite/CRM handoff, data plan, receipt candidates, approval gates,
and onboarding handoff posture without calling MailerLite, Shopify, Gmail,
Instagram, CRM live APIs, mutating subscribers/workflows/cards, or sending email.`;

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

const normalizeResourceName = (value) => cleanString(value) ?? 'Inteligencia para descansar';

const parseArgs = (argv) => {
  const options = {
    launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
    resourceName: 'Inteligencia para descansar',
    resourceType: 'quiz',
    audience: 'Personas de la comunidad que sienten cansancio mental, culpa al descansar o dificultad para bajar revoluciones.',
    successCriterion: 'Aprendizaje de mercado: registros, respuestas cualitativas, clicks, replies y senales de interes para profundizar el tema.',
    operatingPacket: DEFAULT_OPERATING_PACKET,
    executionPacket: DEFAULT_EXECUTION_PACKET,
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
    else if (arg === '--audience') options.audience = argv[++index];
    else if (arg === '--success-criterion') options.successCriterion = argv[++index];
    else if (arg === '--operating-packet') options.operatingPacket = argv[++index];
    else if (arg === '--execution-packet') options.executionPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return {
    ...options,
    launchId: slugify(options.launchId),
    resourceName: normalizeResourceName(options.resourceName),
    resourceType: slugify(options.resourceType),
    audience: cleanString(options.audience),
    successCriterion: cleanString(options.successCriterion),
  };
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const digestSource = (path, content) => ({
  path,
  present: true,
  chars: content.length,
  consultedFor: path.includes('MANTIS_OPERATOR')
    ? 'Brand Department routing and operator posture'
    : path.includes('SHOPIFY_PREVIEW')
      ? 'Shopify/Web preview default and fallback rules'
      : path.includes('email_style_canon')
        ? 'email visual and editorial style canon'
        : path.includes('MAILERLITE_RECEIPT')
          ? 'receipt semantics and candidate naming'
          : path.includes('GROUP_DICTIONARY')
            ? 'group status dictionary and candidate authority'
            : 'CRM source-of-truth and signal routing',
});

const loadSourceDigests = async () => {
  const paths = [
    DEFAULT_BRAND_OPERATOR,
    DEFAULT_SHOPIFY_PROTOCOL,
    DEFAULT_EMAIL_STYLE_CANON,
    DEFAULT_RECEIPT_TAXONOMY,
    DEFAULT_GROUP_DICTIONARY,
    DEFAULT_CRM_SOURCE_MAP,
  ];
  const entries = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    entries.push(digestSource(path, content));
  }
  return entries;
};

const findGate = (executionPacket, id) =>
  executionPacket?.gateQueue?.find((gate) => gate?.id === id) ?? null;

const buildConceptBrief = (options) => ({
  publicWorkingTitle: options.resourceName,
  internalLaunchId: options.launchId,
  format: options.resourceType,
  audienceHypothesis: options.audience,
  publicPromiseDraft: 'Un test breve para reconocer que tipo de descanso esta pidiendo tu mente y recibir una practica pequena para empezar a abrir espacio.',
  notPromises: [
    'No prometer curar insomnio, ansiedad, agotamiento clinico o burnout.',
    'No diagnosticar a la persona por sus respuestas.',
    'No convertir el quiz en formula magica ni en presion de productividad.',
  ],
  successCriterion: options.successCriterion,
  whyThisIdeaFitsTheStrategy: [
    'Es pequeno, rapido de producir y facil de entender.',
    'Genera senales de mercado mas ricas que un simple registro: respuestas, resultado, clicks, replies e interes tematico.',
    'Puede handoff al onboarding editorial sin interrumpir la relacion que ya funciona.',
  ],
});

const buildQuizModel = () => ({
  status: 'draft_rehearsal_only',
  questions: [
    {
      id: 'q1_stop_response',
      prompt: 'Cuando por fin paras un momento, que aparece primero?',
      answerSignals: ['ruido_mental', 'tension_cuerpo', 'culpa_por_descansar', 'desconexion'],
    },
    {
      id: 'q2_rest_need',
      prompt: 'Que parece necesitar mas tu sistema en estos dias?',
      answerSignals: ['espacio', 'ritmo', 'permiso', 'cuerpo'],
    },
    {
      id: 'q3_obstacle',
      prompt: 'Que suele interrumpir tu descanso antes de que alcance a hacer efecto?',
      answerSignals: ['pantallas', 'pendientes', 'autoexigencia', 'no_saber_como_bajar'],
    },
    {
      id: 'q4_best_entry',
      prompt: 'Que tipo de practica se siente mas posible para ti hoy?',
      answerSignals: ['respirar', 'caminar_lento', 'escribir', 'ordenar_un_limite'],
    },
    {
      id: 'q5_followup_interest',
      prompt: 'Si recibieras una nota breve sobre descanso esta semana, que te interesaria mas?',
      answerSignals: ['mente', 'cuerpo', 'emocion', 'habitos'],
    },
  ],
  resultArchetypes: [
    {
      id: 'espacio_mental',
      publicName: 'Descanso por espacio mental',
      meaning: 'La persona necesita bajar ruido y recuperar margen interior antes de tomar nuevas decisiones.',
      firstPractice: 'Tres minutos sin resolver nada: notar, nombrar y dejar pasar una capa de ruido.',
    },
    {
      id: 'ritmo_cuerpo',
      publicName: 'Descanso por ritmo del cuerpo',
      meaning: 'El descanso entra mejor por una regulacion corporal simple que por una explicacion larga.',
      firstPractice: 'Caminar o moverse lentamente durante cinco minutos sin convertirlo en ejercicio productivo.',
    },
    {
      id: 'permiso_emocional',
      publicName: 'Descanso por permiso emocional',
      meaning: 'La dificultad no es saber que descansar ayuda, sino sentirse autorizado a hacerlo sin culpa.',
      firstPractice: 'Escribir una frase de permiso concreto para hoy, pequena y creible.',
    },
    {
      id: 'limite_amable',
      publicName: 'Descanso por limite amable',
      meaning: 'La persona necesita cerrar una fuga de atencion antes de poder descansar de verdad.',
      firstPractice: 'Elegir una cosa que no se va a resolver hoy y dejarla anotada para manana.',
    },
  ],
});

const buildPublicSurfaceDrafts = (conceptBrief) => ({
  landing: {
    surface: 'public',
    shopifyDefault: true,
    h1Draft: conceptBrief.publicWorkingTitle,
    subheadDraft: conceptBrief.publicPromiseDraft,
    ctaDrafts: ['Recibir mi lectura', 'Hacer el test breve', 'Ver que tipo de descanso necesito'],
    avoid: [
      'No usar lenguaje interno como lead magnet, tag, CRM, embudo, MailerLite o automatizacion.',
      'No usar el recurso repetido de copy "a veces..." como muletilla; si aparece, que sea excepcional y deliberado.',
    ],
  },
  quiz: {
    surface: 'public',
    completionMessageDraft: 'Tu resultado no pretende encerrarte en una categoria. Es una lectura pequena para empezar a escucharte con mas precision.',
  },
  thankYouPage: {
    surface: 'public',
    draft: 'Te envie tu lectura al correo. Si no llega en unos minutos, revisa promociones o spam.',
  },
  internalNotes: {
    surface: 'internal',
    forbiddenInPublicCopy: ['launch_id', 'CRM', 'Source group', 'Delivered group', 'workflow', 'test lane'],
  },
});

const buildEmailSequence = () => [
  {
    step: 1,
    role: 'delivery_and_orientation',
    subjectDraft: 'Tu lectura: que tipo de descanso esta pidiendo tu mente',
    purpose: 'Entregar el resultado, explicar como leerlo sin rigidez y proponer una practica pequena.',
    receiptPosture: 'Delivered receipt only after real delivery; no Sent receipt by default.',
    sendGate: 'test_only_after_exact_seed_approval',
  },
  {
    step: 2,
    role: 'practice_or_value',
    subjectDraft: 'Una practica pequena para descansar sin obligarte a descansar',
    purpose: 'Ayudar a usar el resultado con una accion concreta de baja friccion.',
    receiptPosture: 'No Sent group unless Brand canonizes this as reusable content.',
    sendGate: 'draft_only_until_seed_and_public_send_approvals',
  },
  {
    step: 3,
    role: 'editorial_depth',
    subjectDraft: 'El descanso tambien pide criterio',
    purpose: 'Conectar el tema con una carta/editorial en voz de Alejandro.',
    receiptPosture: 'Use Sent only if the email maps to a canonical article/carta.',
    sendGate: 'draft_only_until_seed_and_public_send_approvals',
  },
  {
    step: 4,
    role: 'reply_or_next_step',
    subjectDraft: 'Que viste de ti en este test?',
    purpose: 'Invitar a responder, recoger senales cualitativas y proponer continuidad editorial.',
    receiptPosture: 'CRM-first signal for replies/clicks; MailerLite group only if routing requires it.',
    sendGate: 'draft_only_until_seed_and_public_send_approvals',
  },
];

const buildReceiptCandidates = ({ launchId, resourceName, resourceType }) => {
  const receiptPlan = buildReceiptPlan({ launchId, resourceName, resourceType });
  return {
    sourceGroupCandidate: {
      name: receiptPlan.sourceGroup,
      status: 'brand_dictionary_candidate_before_creation',
      liveCreationAllowedNow: false,
      meaning: 'Persona entro por el test/recurso de este mini-lanzamiento.',
    },
    deliveredGroupCandidate: {
      name: receiptPlan.deliveredGroup,
      status: 'brand_dictionary_candidate_before_creation',
      liveCreationAllowedNow: false,
      meaning: 'Persona recibio el resultado/recurso prometido.',
    },
    audiencePosture: {
      default: 'crm_first_or_existing_general_newsletter_until_dedicated_audience_is_approved',
      possibleFutureGroup: receiptPlan.audienceCandidate,
      liveCreationAllowedNow: false,
    },
    experimentIdentity: receiptPlan.experimentPosture,
    sentReceipts: receiptPlan.sentReceipts,
  };
};

const buildOnboardingHandoff = () => ({
  currentOnboardingV1: 'preserve_live_untouched',
  principle: 'El mini-lanzamiento puede abrir una puerta; el onboarding editorial profundiza la relacion.',
  allowedNow: false,
  futureRoute: [
    'Despues de entregar el recurso y medir senal inicial, proponer continuidad hacia el onboarding editorial.',
    'No insertar automaticamente a nadie en el onboarding vivo sin packet de ruta y aprobacion.',
    'Si se usa MailerLite, preferir Journey Eligible como intencion de ruta, no como prueba de que la persona ya recorrio el onboarding.',
  ],
  v2Dependency: 'Onboarding v2 groups/draft are still gated; do not depend on them for this rehearsal.',
});

const buildHandoffs = (options) => ({
  brand: {
    asks: [
      'Convertir el brief en copy con voz de Alejandro y sin muletillas de AI.',
      'Definir claim guardrails: promesa pequena, honesta y no clinica.',
      'Revisar landing, quiz, emails y thank-you como superficies publicas separadas de notas internas.',
      'Emitir QA creativo antes de cualquier test/publicacion.',
    ],
    sourcePath: DEFAULT_BRAND_OPERATOR,
  },
  webShopify: {
    asks: [
      'Preparar preview/draft Shopify o handoff exacto al repo web, no HTML suelto como final.',
      'Asegurar mobile-first: quiz/CTA legibles, sin secciones promocionales infladas.',
      'No publicar ni conectar formularios reales sin aprobacion.',
    ],
    sourcePath: DEFAULT_SHOPIFY_PROTOCOL,
  },
  mailerLite: {
    asks: [
      'Preparar solo plan/dry-run de grupos candidatos; no crear grupos sin aprobacion exacta.',
      'Preparar secuencia como draft/test lane; no activar workflow ni enviar a audiencia.',
      'Aplicar email style canon antes de cualquier test email.',
    ],
    candidates: buildReceiptCandidates(options),
  },
  crm: {
    asks: [
      'Registrar el launch_id como identidad del experimento.',
      'Proyectar eventos/senales sin mutar cards ni scoring hasta gate CRM.',
      'Preparar review de aprendizaje de mercado: continuar, iterar, archivar o desarrollar.',
    ],
    sourcePath: DEFAULT_CRM_SOURCE_MAP,
  },
});

const buildDataPlan = (launchId) => ({
  primaryKey: `experiment.launch_id=${launchId}`,
  collectIfInstrumented: [
    'email_submitted',
    'quiz_started',
    'quiz_completed',
    'quiz_result',
    'source_assigned',
    'resource_delivered',
    'email_opened',
    'email_clicked',
    'reply_received',
    'ig_comment_or_dm_signal',
    'share_or_save_signal_when_available',
  ],
  marketQuestions: [
    'El tema descanso genera registros o solo curiosidad superficial?',
    'Que resultado/arquetipo aparece con mas frecuencia?',
    'Que practica recibe mas clicks o replies?',
    'El tema abre conversaciones profundas que puedan alimentar producto mayor?',
  ],
});

const buildApprovalQueue = () => [
  {
    gate: 'brand_approve_brief_and_public_copy',
    requiredBefore: 'any Shopify preview, MailerLite draft, or public-facing copy reuse',
    allowedNow: false,
  },
  {
    gate: 'shopify_preview_draft',
    requiredBefore: 'creating a visual/web preview outside local handoff',
    allowedNow: false,
  },
  {
    gate: 'create_empty_mailerlite_groups',
    requiredBefore: 'Source/Delivered candidate groups exist in Brand dictionary, fresh scan is clean, exact approval phrase is given',
    allowedNow: false,
  },
  {
    gate: 'create_disabled_workflow_or_form_in_mailerlite',
    requiredBefore: 'group plan and seed/test scope are approved',
    allowedNow: false,
  },
  {
    gate: 'send_seed_test_email',
    requiredBefore: 'exact test email, exact email step, exact groups, and no audience send scope are approved',
    allowedNow: false,
  },
  {
    gate: 'audience_launch',
    requiredBefore: 'functional QA, creative QA, final copy approval, and explicit send/publish approval',
    allowedNow: false,
  },
  {
    gate: 'crm_card_or_score_mutation',
    requiredBefore: 'CRM write/score policy approves concrete operations from evidence',
    allowedNow: false,
  },
];

const safetyBlock = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  workflowMutationsPerformed: false,
  formMutationsPerformed: false,
  sendsPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildRehearsalPacket = ({
  options,
  operatingPacket,
  executionPacket,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const rehearsalGate = findGate(executionPacket, 'non_live_mini_launch_rehearsal');
  const conceptBrief = buildConceptBrief(options);
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_rehearsal_packet',
    generatedAt,
    ok: true,
    status: 'mini_launch_rehearsal_ready_no_live_changes',
    launch: {
      launchId: options.launchId,
      resourceName: options.resourceName,
      resourceType: options.resourceType,
      targetDatePosture: 'candidate_not_committed',
    },
    readinessEvidence: {
      operatingPacketStatus: operatingPacket?.status ?? null,
      executionPacketStatus: executionPacket?.status ?? null,
      executionGateStatus: rehearsalGate?.status ?? null,
      executionGateAllowedWithoutHumanApproval: rehearsalGate?.allowedWithoutHumanApproval ?? null,
      defaultEmailSteps: operatingPacket?.defaultEmailSequence?.length ?? null,
    },
    conceptBrief,
    quizModel: buildQuizModel(),
    publicSurfaceDrafts: buildPublicSurfaceDrafts(conceptBrief),
    emailSequence: buildEmailSequence(),
    crmSignalMap: buildCrmSignalMap({ launchId: options.launchId }),
    dataPlan: buildDataPlan(options.launchId),
    handoffs: buildHandoffs(options),
    onboardingHandoff: buildOnboardingHandoff(),
    publicSurfaceGuardrails: buildPublicSurfaceGuardrails(),
    approvalQueue: buildApprovalQueue(),
    nextNoLiveMoves: [
      'Brand can turn this rehearsal into polished public copy and quiz result copy.',
      'Web Design can prepare a Shopify preview/handoff from the brief.',
      'CRM can draft the event contract/schema for this launch_id.',
      'MailerLite can prepare a dry-run group/workflow/test packet after Brand approves names and copy.',
    ],
    sourceDigests,
    safety: safetyBlock(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Rehearsal Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Ensayo local-only para: ${packet.launch.resourceName}`,
    `launch_id: ${packet.launch.launchId}`,
    `Formato: ${packet.launch.resourceType}`,
    '',
    'Este rehearsal prueba el carril completo sin publicar, crear grupos, activar workflows, asignar subscribers, enviar correos o escribir CRM cards. Sirve para ver si la agencia virtual puede pasar de idea a operacion lista para aprobaciones estrechas.',
    '',
    '## Evidencia De Readiness',
    '',
    `- Mini-Launch OS status: ${packet.readinessEvidence.operatingPacketStatus}`,
    `- Execution packet status: ${packet.readinessEvidence.executionPacketStatus}`,
    `- Rehearsal gate: ${packet.readinessEvidence.executionGateStatus}`,
    `- Default email steps: ${packet.readinessEvidence.defaultEmailSteps}`,
    '',
    '## Brief',
    '',
    `- Promesa publica draft: ${packet.conceptBrief.publicPromiseDraft}`,
    `- Audiencia: ${packet.conceptBrief.audienceHypothesis}`,
    `- Criterio de exito: ${packet.conceptBrief.successCriterion}`,
    '- No prometer:',
    ...packet.conceptBrief.notPromises.map((item) => `  - ${item}`),
    '',
    '## Quiz / Recurso',
    '',
    `Status: ${packet.quizModel.status}`,
    '- Preguntas draft:',
    ...packet.quizModel.questions.map((question) => `  - ${question.id}: ${question.prompt}`),
    '- Resultados draft:',
    ...packet.quizModel.resultArchetypes.map((result) => `  - ${result.publicName}: ${result.firstPractice}`),
    '',
    '## Superficies Publicas',
    '',
    `- Landing H1: ${packet.publicSurfaceDrafts.landing.h1Draft}`,
    `- Landing subhead: ${packet.publicSurfaceDrafts.landing.subheadDraft}`,
    `- CTAs: ${packet.publicSurfaceDrafts.landing.ctaDrafts.join(' / ')}`,
    `- Thank-you: ${packet.publicSurfaceDrafts.thankYouPage.draft}`,
    '- Evitar:',
    ...packet.publicSurfaceDrafts.landing.avoid.map((item) => `  - ${item}`),
    '',
    '## Secuencia Email Draft',
    '',
    ...packet.emailSequence.flatMap((email) => [
      `- Email ${email.step} (${email.role})`,
      `  - Subject draft: ${email.subjectDraft}`,
      `  - Purpose: ${email.purpose}`,
      `  - Receipt posture: ${email.receiptPosture}`,
      `  - Gate: ${email.sendGate}`,
    ]),
    '',
    '## Recibos / Grupos Candidatos',
    '',
    `- Source candidate: ${packet.handoffs.mailerLite.candidates.sourceGroupCandidate.name}`,
    `- Delivered candidate: ${packet.handoffs.mailerLite.candidates.deliveredGroupCandidate.name}`,
    `- Audience posture: ${packet.handoffs.mailerLite.candidates.audiencePosture.default}`,
    `- Experiment: ${packet.handoffs.mailerLite.candidates.experimentIdentity.crmKey}`,
    `- Sent receipts: ${packet.handoffs.mailerLite.candidates.sentReceipts.rule}`,
    '',
    '## CRM Signal Map',
    '',
    ...packet.crmSignalMap.map((signal) => `- ${signal.event}: source=${signal.source}; ledger=${signal.ledger}`),
    '',
    '## Data Plan',
    '',
    `- Primary key: ${packet.dataPlan.primaryKey}`,
    '- Collect if instrumented:',
    ...packet.dataPlan.collectIfInstrumented.map((item) => `  - ${item}`),
    '- Market questions:',
    ...packet.dataPlan.marketQuestions.map((item) => `  - ${item}`),
    '',
    '## Handoffs',
    '',
    '### Brand',
    ...packet.handoffs.brand.asks.map((item) => `- ${item}`),
    '',
    '### Web / Shopify',
    ...packet.handoffs.webShopify.asks.map((item) => `- ${item}`),
    '',
    '### MailerLite',
    ...packet.handoffs.mailerLite.asks.map((item) => `- ${item}`),
    '',
    '### CRM',
    ...packet.handoffs.crm.asks.map((item) => `- ${item}`),
    '',
    '## Onboarding Handoff',
    '',
    `- Current v1: ${packet.onboardingHandoff.currentOnboardingV1}`,
    `- Principle: ${packet.onboardingHandoff.principle}`,
    `- Allowed now: ${packet.onboardingHandoff.allowedNow}`,
    ...packet.onboardingHandoff.futureRoute.map((item) => `- ${item}`),
    '',
    '## Approval Queue',
    '',
    ...packet.approvalQueue.map((gate) => `- ${gate.gate}: allowedNow=${gate.allowedNow}; requiredBefore=${gate.requiredBefore}`),
    '',
    '## Next No-Live Moves',
    '',
    ...packet.nextNoLiveMoves.map((item) => `- ${item}`),
    '',
    '## Fuentes Consultadas',
    '',
    ...packet.sourceDigests.map((source) => `- ${source.path} (${source.consultedFor})`),
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin MailerLite API calls.',
    '- Sin Shopify API calls.',
    '- Sin CRM live API calls.',
    '- Sin lectura ni impresion de subscribers.',
    '- Sin grupos/workflows/forms/emails/envios.',
    '- Sin CRM card/scoring mutation.',
    '- Sin outbound.',
    '- No tokens printed.',
  ];
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
  const [operatingPacket, executionPacket, sourceDigests] = await Promise.all([
    readJson(options.operatingPacket),
    readJson(options.executionPacket),
    loadSourceDigests(),
  ]);

  return buildRehearsalPacket({
    options,
    operatingPacket,
    executionPacket,
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
    resourceName: packet.launch.resourceName,
    sourceCandidate: packet.handoffs.mailerLite.candidates.sourceGroupCandidate.name,
    deliveredCandidate: packet.handoffs.mailerLite.candidates.deliveredGroupCandidate.name,
    approvalGates: packet.approvalQueue.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch rehearsal packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalQueue,
  buildConceptBrief,
  buildDataPlan,
  buildOnboardingHandoff,
  buildQuizModel,
  buildRehearsalPacket,
  buildReceiptCandidates,
  parseArgs,
  renderMarkdown,
};
