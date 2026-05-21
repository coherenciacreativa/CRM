import {
  buildCrmVNextEngagementDecisionBrief,
  type CrmVNextEngagementDecisionBrief,
  type CrmVNextEngagementDecisionBriefCandidate,
} from './crm-vnext-engagement-decision-brief';

export const CRM_VNEXT_ENGAGEMENT_RESOLUTION_LOOP_SCHEMA_VERSION =
  'crm-vnext-engagement-resolution-loop-2026-05-21';

type LooseOptions = Record<string, any>;
type QuestionPriority = 'high' | 'medium' | 'low';

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value.replace(/,/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
};

const cleanHandle = (value: unknown): string | null =>
  cleanString(value)?.replace(/^@+/, '').toLowerCase() ?? null;

const slug = (value: string): string =>
  value.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'unknown';

const labelFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): string => {
  const handle = cleanHandle(candidate.identities.instagramHandle);
  const display = candidate.displayName.trim();
  const displayHasHandle = display.toLowerCase().includes(`@${handle}`);
  const displayIsHandle = cleanHandle(display) === handle;
  return handle && !displayHasHandle && !displayIsHandle
    ? `${candidate.displayName} (@${handle})`
    : candidate.displayName;
};

const priorityFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): QuestionPriority => {
  if (candidate.operatorAction.reviewRequired) return 'high';
  if (candidate.decisionNeed === 'email_reply_context_review') return 'high';
  if (candidate.priority.delta >= 15) return 'high';
  if (candidate.priority.delta >= 10) return 'medium';
  return 'low';
};

const identityLines = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] => [
  candidate.displayName ? `Nombre: ${candidate.displayName}` : null,
  candidate.identities.instagramHandle ? `Instagram: @${cleanHandle(candidate.identities.instagramHandle)}` : null,
  candidate.identities.email ? `Email: ${candidate.identities.email}` : null,
  candidate.identities.city ? `Ciudad: ${candidate.identities.city}` : null,
  candidate.identities.country ? `Pais: ${candidate.identities.country}` : null,
].filter(Boolean) as string[];

const signalCueLines = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] => [
  `Movimiento: ${candidate.priority.delta >= 0 ? '+' : ''}${candidate.priority.delta} prioridad (${candidate.priority.before} -> ${candidate.priority.after})`,
  `Fuente: ${candidate.sourceFamily}`,
  `Decision sugerida: ${candidate.operatorAction.label}`,
  ...candidate.primarySignals.slice(0, 4),
].filter(Boolean);

const missingFieldsFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] => {
  const missing = [];
  if (!candidate.identities.email) missing.push('email');
  if (!candidate.identities.instagramHandle) missing.push('instagram');
  if (!candidate.identities.city) missing.push('ciudad');
  if (!candidate.identities.country) missing.push('pais');
  if (candidate.decisionNeed === 'email_reply_context_review') {
    missing.push('interpretacion_de_respuesta_email');
  }
  if (candidate.decisionNeed === 'warm_contact_review') {
    missing.push('contexto_de_relacion_y_programas');
  }
  return Array.from(new Set([...missing, 'siguiente_paso_interno']));
};

const focusFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] => {
  if (candidate.decisionNeed === 'email_reply_context_review') {
    return [
      'Que significa esta respuesta dentro de la relacion con Alejandro.',
      'Si hay programas, intereses, historia o cuidado especial que debamos recordar.',
      'Si conviene solo observar, enriquecer la tarjeta, o preparar una idea futura de follow-up interno.',
    ];
  }
  if (candidate.decisionNeed === 'warm_contact_review') {
    return [
      'Si esta subida de calor confirma algo que Alejandro ya sabe de la persona.',
      'Programas/productos reales, historia de llegada, nivel de cercania y posible siguiente paso.',
      'Si falta investigar antes de pedir o proponer contacto.',
    ];
  }
  if (candidate.decisionNeed === 'identity_stitching_required') {
    return [
      'Que fuentes deberia revisar Mantis antes de crear o enriquecer tarjeta.',
      'Identidad, email, handle, telefono o contexto que reduzca ambiguedad.',
    ];
  }
  return [
    'Contexto humano si Alejandro lo recuerda.',
    'Mantener observacion si no hay nada nuevo.',
  ];
};

const promptFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): string =>
  [
    `Cuéntame, en lenguaje natural, qué recuerdas de ${candidate.displayName}.`,
    `La señal reciente fue: ${candidate.primarySignals[0] || candidate.operatorAction.reason}.`,
    `Me interesa especialmente: relación/historia, programas o productos, ciudad/país si falta, qué significa esta señal y si hay un próximo paso interno para Mantis.`,
    'No necesitas aprobar ningún mensaje ni escribir perfecto; una nota breve o una transcripción de audio sirve.',
  ].join(' ');

const answerTemplateFor = (candidate: CrmVNextEngagementDecisionBriefCandidate): string =>
  [
    `${candidate.displayName}:`,
    '- Cómo llegó o de dónde lo/la conozco:',
    '- Programas/productos/intereses:',
    '- Qué significa esta señal:',
    '- Siguiente paso interno para Mantis:',
  ].join('\n');

const questionFor = (
  candidate: CrmVNextEngagementDecisionBriefCandidate,
  index: number,
) => ({
  questionId: `engagement_resolution_${String(index + 1).padStart(2, '0')}_${slug(candidate.personId || candidate.displayName)}`,
  priority: priorityFor(candidate),
  personId: candidate.personId,
  subject: {
    label: labelFor(candidate),
    displayName: candidate.displayName,
    instagramHandle: cleanHandle(candidate.identities.instagramHandle),
  },
  batchStatus: {
    status: 'engagement_decision_candidate',
    recommendedAction: candidate.operatorAction.code,
    missingIdentityFields: missingFieldsFor(candidate).filter((field) => ['email', 'instagram', 'ciudad', 'pais'].includes(field)),
    operatorPrompt: candidate.suggestedQuestion,
  },
  known: {
    identity: identityLines(candidate),
    programs: [],
    memoryCues: signalCueLines(candidate),
    evidenceCount: candidate.primarySignals.length,
    nextAction: candidate.operatorAction.code,
  },
  missingFields: missingFieldsFor(candidate),
  questionFocus: focusFor(candidate),
  prompt: promptFor(candidate),
  suggestedAnswerFormat: answerTemplateFor(candidate),
  engagementContext: {
    decisionNeed: candidate.decisionNeed,
    sourceFamily: candidate.sourceFamily,
    movement: candidate.movement,
    priorityDelta: candidate.priority.delta,
    operatorAction: candidate.operatorAction,
    reasonCodes: candidate.reasonCodes,
    riskCodes: candidate.riskCodes,
  },
  safeUse: {
    allowed: [
      'Turn Alejandro human memory into local evidence through human-enrichment-response-evidence.',
      'Prepare context/fact proposals for explicit later approval.',
      'Use as internal interpretation for Mantis operator review.',
    ],
    prohibited: [
      'Do not treat this response as permission to send outbound messages.',
      'Do not mutate cards, Fact Store, scores, or live sources from this packet.',
      'Do not store sensitive clinical detail beyond service/client relationship context.',
    ],
  },
});

export const buildCrmVNextEngagementResolutionLoopFromBrief = (
  brief: CrmVNextEngagementDecisionBrief,
  options: LooseOptions = {},
) => {
  const generatedAt = isoNow(options.now);
  const limit = Math.max(1, Math.min(Math.round(cleanNumber(options.limit, 5)), 10));
  const candidates = Array.isArray(brief?.candidates) ? brief.candidates.slice(0, limit) : [];
  const questions = candidates.map(questionFor);

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_ENGAGEMENT_RESOLUTION_LOOP_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_engagement_resolution_loop',
    source: {
      decisionBriefSchemaVersion: brief?.schemaVersion ?? null,
      decisionBriefGeneratedAt: brief?.generatedAt ?? null,
      decisionBriefCandidates: brief?.summary?.returnedCandidates ?? 0,
      sourceMovementRows: brief?.source?.movementRows ?? 0,
      sourceLatestCapturedAt: brief?.source?.latestCapturedAt ?? null,
    },
    summary: {
      questions: questions.length,
      highPriority: questions.filter((question) => question.priority === 'high').length,
      mediumPriority: questions.filter((question) => question.priority === 'medium').length,
      lowPriority: questions.filter((question) => question.priority === 'low').length,
      operationsExecuted: 0,
      cardMutationReady: false,
      factStoreWriteReady: false,
      outboundReady: false,
    },
    questions,
    resolutionPlan: {
      step1: 'Ask Alejandro the compact questions in natural language.',
      step2: 'Save answers in the generated Markdown under each Respuesta libre section.',
      step3: 'Run human-enrichment-response-evidence with the answers Markdown and this questions JSON.',
      step4: 'Feed produced evidenceSources into context-fact-proposals.',
      step5: 'Only after explicit approval, use context-fact-apply or a card-write approval path.',
      nextCommands: [
        'npm run crm:vnext:human-enrichment-response-evidence -- --answers-md <answers.md> --questions-file <engagement-resolution-loop.json>',
        'npm run crm:vnext:context-fact-proposals -- --evidence-file <response-evidence.json>',
        'npm run crm:vnext:context-fact-apply -- --proposal-file <proposals.json> --proposal-id <id> --approved-by Alejandro',
      ],
    },
    mantisPrompt: [
      'Mantis: usa este paquete como lista corta de preguntas de engagement para Alejandro.',
      'Pregunta una persona a la vez si conviene reducir carga cognitiva.',
      'Acepta respuestas naturales o audios transcritos; luego guárdalas en el Markdown bajo Respuesta libre.',
      'Después corre human-enrichment-response-evidence y prepara propuestas/facts, sin enviar mensajes ni escribir tarjetas.',
    ].join(' '),
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      scoreMutationProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
      prohibitedActions: [
        'Do not send Instagram, WhatsApp, Telegram, email, ManyChat, or other messages from this loop.',
        'Do not mutate CRM cards, Fact Store, scores, MailerLite, Gmail, Instagram, ManyChat, Google, Shopify, WhatsApp, or credentials.',
        'Do not treat Alejandro context as approval for outreach or record mutation.',
      ],
    },
  };
};

export const buildCrmVNextEngagementResolutionLoop = async (
  options: LooseOptions = {},
) => {
  const brief = await buildCrmVNextEngagementDecisionBrief({
    ...options,
    limit: options.briefLimit ?? options.limit ?? 5,
  });
  return buildCrmVNextEngagementResolutionLoopFromBrief(brief, options);
};
