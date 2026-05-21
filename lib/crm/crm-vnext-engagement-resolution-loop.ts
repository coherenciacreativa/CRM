import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  buildCrmVNextEngagementDecisionBrief,
  type CrmVNextEngagementDecisionBrief,
  type CrmVNextEngagementDecisionBriefCandidate,
} from './crm-vnext-engagement-decision-brief';

export const CRM_VNEXT_ENGAGEMENT_RESOLUTION_LOOP_SCHEMA_VERSION =
  'crm-vnext-engagement-resolution-loop-2026-05-21';

type LooseOptions = Record<string, any>;
type QuestionPriority = 'high' | 'medium' | 'low';
type ResolutionStatus = 'needs_alejandro_answer' | 'context_already_covered';

type ContextSummary = {
  personIds: string[];
  humanContextEvidenceCount: number;
  cardEvidenceCount: number;
  factStoreCount: number;
  contextFactLedgerCount: number;
  latestHumanContextAt: string | null;
  samples: string[];
  sources: string[];
};

type ContextIndex = Record<string, ContextSummary>;

const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_FACT_STORE_PATH = '.crm-vnext/fact-store/facts.jsonl';
const DEFAULT_CONTEXT_FACT_LEDGER_PATH = '.crm-vnext/context-fact-apply/ledger.jsonl';

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

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values.filter(Boolean)));

const latestIso = (values: Array<string | null | undefined>): string | null => {
  const sorted = values.filter(Boolean).sort() as string[];
  return sorted.length ? sorted[sorted.length - 1] : null;
};

const readJson = async (filePath: string | null | undefined): Promise<any | null> => {
  if (!filePath) return null;
  try {
    return JSON.parse(await readFile(resolve(filePath), 'utf8'));
  } catch {
    return null;
  }
};

const readJsonl = async (filePath: string | null | undefined): Promise<any[]> => {
  if (!filePath) return [];
  try {
    const raw = await readFile(resolve(filePath), 'utf8');
    const rows = [];
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        rows.push(JSON.parse(trimmed));
      } catch {
        // Ignore malformed local ledger rows; this guard should never block the operator brief.
      }
    }
    return rows;
  } catch {
    return [];
  }
};

const emptyContextSummary = (): ContextSummary => ({
  personIds: [],
  humanContextEvidenceCount: 0,
  cardEvidenceCount: 0,
  factStoreCount: 0,
  contextFactLedgerCount: 0,
  latestHumanContextAt: null,
  samples: [],
  sources: [],
});

const normalizeKey = (value: unknown): string | null => {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  if (cleaned.startsWith('ig:')) return `ig:${cleanHandle(cleaned.slice(3))}`;
  if (cleaned.startsWith('@')) return `ig:${cleanHandle(cleaned)}`;
  if (cleaned.startsWith('email:')) return `email:${cleaned.slice(6).trim().toLowerCase()}`;
  if (cleaned.includes('@') && !cleaned.includes(' ')) return `email:${cleaned.toLowerCase()}`;
  return cleaned;
};

const isHumanContextSource = (value: unknown): boolean => {
  const text = JSON.stringify(value ?? '').toLowerCase();
  return [
    'human_enrichment_response',
    'alejandro_conversation',
    'alejandro-context',
    'reporter":"alejandro',
  ].some((token) => text.includes(token));
};

const compactSample = (value: unknown): string | null => {
  const cleaned = cleanString(
    typeof value === 'string'
      ? value
      : (value as any)?.note
        ?? (value as any)?.statement
        ?? (value as any)?.evidenceText
        ?? (value as any)?.finding,
  );
  return cleaned ? cleaned.replace(/\s+/g, ' ').slice(0, 240) : null;
};

const mergeContext = (
  index: ContextIndex,
  keys: Array<string | null>,
  patch: Partial<ContextSummary>,
) => {
  for (const key of unique(keys.map(normalizeKey).filter(Boolean) as string[])) {
    const current = index[key] ?? emptyContextSummary();
    const sample = patch.samples?.[0] ? [patch.samples[0]] : [];
    const source = patch.sources?.[0] ? [patch.sources[0]] : [];
    index[key] = {
      personIds: unique([...current.personIds, ...(patch.personIds ?? [])]),
      humanContextEvidenceCount:
        current.humanContextEvidenceCount + (patch.humanContextEvidenceCount ?? 0),
      cardEvidenceCount: current.cardEvidenceCount + (patch.cardEvidenceCount ?? 0),
      factStoreCount: current.factStoreCount + (patch.factStoreCount ?? 0),
      contextFactLedgerCount:
        current.contextFactLedgerCount + (patch.contextFactLedgerCount ?? 0),
      latestHumanContextAt: latestIso([current.latestHumanContextAt, patch.latestHumanContextAt]),
      samples: unique([...current.samples, ...sample]).slice(0, 5),
      sources: unique([...current.sources, ...source]).slice(0, 8),
    };
  }
};

const keysForCard = (card: any): string[] => unique([
  cleanString(card?.personId),
  card?.identities?.email ? `email:${card.identities.email}` : null,
  card?.identities?.instagramHandle ? `ig:${cleanHandle(card.identities.instagramHandle)}` : null,
  card?.identities?.phone ? `phone:${card.identities.phone}` : null,
].filter(Boolean) as string[]);

const keysForStoredFact = (entry: any): string[] => unique([
  cleanString(entry?.fact?.person?.personIdHint),
  entry?.fact?.person?.email ? `email:${entry.fact.person.email}` : null,
  entry?.fact?.person?.instagramHandle ? `ig:${cleanHandle(entry.fact.person.instagramHandle)}` : null,
  entry?.fact?.person?.phone ? `phone:${entry.fact.person.phone}` : null,
].filter(Boolean) as string[]);

const buildContextIndex = async (options: LooseOptions = {}): Promise<ContextIndex> => {
  const index: ContextIndex = {};
  const cardStore = await readJson(options.cardStorePath ?? DEFAULT_CARD_STORE_PATH);
  for (const card of Array.isArray(cardStore?.cards) ? cardStore.cards : []) {
    const keys = keysForCard(card);
    for (const evidence of Array.isArray(card?.evidence) ? card.evidence : []) {
      const human = isHumanContextSource(evidence);
      mergeContext(index, keys, {
        personIds: [cleanString(card?.personId)].filter(Boolean) as string[],
        humanContextEvidenceCount: human ? 1 : 0,
        cardEvidenceCount: 1,
        latestHumanContextAt: human ? cleanString(evidence?.observedAt) : null,
        samples: human ? [compactSample(evidence)].filter(Boolean) as string[] : [],
        sources: [cleanString(evidence?.source)].filter(Boolean) as string[],
      });
    }
  }

  for (const entry of await readJsonl(options.factStorePath ?? DEFAULT_FACT_STORE_PATH)) {
    const keys = keysForStoredFact(entry);
    if (!keys.length) continue;
    const human = isHumanContextSource(entry);
    mergeContext(index, keys, {
      personIds: keys.filter((key) => key.startsWith('email:') || key.startsWith('ig:')),
      humanContextEvidenceCount: human ? 1 : 0,
      factStoreCount: 1,
      latestHumanContextAt: human ? cleanString(entry?.storedAt) : null,
      samples: human ? [compactSample(entry?.fact?.evidenceText)].filter(Boolean) as string[] : [],
      sources: [cleanString(entry?.fact?.source?.kind)].filter(Boolean) as string[],
    });
  }

  for (const entry of await readJsonl(options.contextFactLedgerPath ?? DEFAULT_CONTEXT_FACT_LEDGER_PATH)) {
    const key = cleanString(entry?.targetPersonId);
    if (!key) continue;
    const human = isHumanContextSource(entry);
    mergeContext(index, [key], {
      personIds: [key],
      humanContextEvidenceCount: human ? 1 : 0,
      contextFactLedgerCount: 1,
      latestHumanContextAt: human ? cleanString(entry?.committedAt) : null,
      samples: human ? [compactSample(entry?.statement)].filter(Boolean) as string[] : [],
      sources: [cleanString(entry?.evidenceSource)].filter(Boolean) as string[],
    });
  }

  return index;
};

const candidateContextKeys = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] =>
  unique([
    cleanString(candidate.personId),
    candidate.identities.email ? `email:${candidate.identities.email}` : null,
    candidate.identities.instagramHandle ? `ig:${cleanHandle(candidate.identities.instagramHandle)}` : null,
  ].filter(Boolean) as string[]);

const contextForCandidate = (
  candidate: CrmVNextEngagementDecisionBriefCandidate,
  index: ContextIndex,
): ContextSummary => {
  const merged = emptyContextSummary();
  for (const key of candidateContextKeys(candidate)) {
    const context = index[normalizeKey(key) ?? key];
    if (!context) continue;
    merged.personIds = unique([...merged.personIds, ...context.personIds]);
    merged.humanContextEvidenceCount += context.humanContextEvidenceCount;
    merged.cardEvidenceCount += context.cardEvidenceCount;
    merged.factStoreCount += context.factStoreCount;
    merged.contextFactLedgerCount += context.contextFactLedgerCount;
    merged.latestHumanContextAt = latestIso([merged.latestHumanContextAt, context.latestHumanContextAt]);
    merged.samples = unique([...merged.samples, ...context.samples]).slice(0, 5);
    merged.sources = unique([...merged.sources, ...context.sources]).slice(0, 8);
  }
  return merged;
};

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

const signalInterpretationField = (candidate: CrmVNextEngagementDecisionBriefCandidate): string =>
  candidate.decisionNeed === 'email_reply_context_review'
    ? 'interpretacion_de_respuesta_email'
    : 'interpretacion_de_senal_reciente';

const redundancyReviewFor = (
  candidate: CrmVNextEngagementDecisionBriefCandidate,
  context: ContextSummary,
): {
  status: ResolutionStatus;
  contextCovered: boolean;
  requiresAlejandroAnswer: boolean;
  reason: string;
  recommendedHandling: string;
  humanContextEvidenceCount: number;
  cardEvidenceCount: number;
  factStoreCount: number;
  contextFactLedgerCount: number;
  latestHumanContextAt: string | null;
  samples: string[];
} => {
  const contextCovered = context.humanContextEvidenceCount >= 3;
  const emailReply = candidate.decisionNeed === 'email_reply_context_review';
  return {
    status: contextCovered ? 'context_already_covered' : 'needs_alejandro_answer',
    contextCovered,
    requiresAlejandroAnswer: !contextCovered,
    reason: contextCovered
      ? `Ya hay ${context.humanContextEvidenceCount} pieza(s) de contexto humano previo; una pregunta amplia seria redundante.`
      : 'No hay suficiente contexto humano previo para interpretar esta senal de engagement.',
    recommendedHandling: contextCovered
      ? emailReply
        ? 'No preguntar quien es esta persona. Revisar primero el contexto especifico de la respuesta; preguntar solo una interpretacion minima si la respuesta cambia el mapa de relacion.'
        : 'No hacer pregunta amplia. Usar el contexto existente y mantener observacion calida salvo que un futuro plan de follow-up requiera aprobacion explicita.'
      : 'Hacerle a Alejandro una pregunta compacta en lenguaje natural y pasar la respuesta por human-enrichment-response-evidence.',
    humanContextEvidenceCount: context.humanContextEvidenceCount,
    cardEvidenceCount: context.cardEvidenceCount,
    factStoreCount: context.factStoreCount,
    contextFactLedgerCount: context.contextFactLedgerCount,
    latestHumanContextAt: context.latestHumanContextAt,
    samples: context.samples.slice(0, 3),
  };
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

const promptFor = (
  candidate: CrmVNextEngagementDecisionBriefCandidate,
  redundancyReview: ReturnType<typeof redundancyReviewFor>,
): string => {
  const signal = candidate.primarySignals[0] || candidate.operatorAction.reason;
  if (redundancyReview.contextCovered) {
    return [
      `No hagas una pregunta amplia sobre ${candidate.displayName}: ya tenemos contexto humano suficiente.`,
      `La señal nueva fue: ${signal}.`,
      candidate.decisionNeed === 'email_reply_context_review'
        ? 'Primero revisa internamente el contexto/snippet de la respuesta. Si cambia algo, pregunta solo una decision minima: si esta respuesta modifica la relacion, el siguiente paso interno o si basta mantener observacion.'
        : 'Usa la tarjeta y los facts existentes; solo escala a Alejandro si quieres proponer un follow-up futuro o si aparece informacion nueva que contradiga el contexto actual.',
    ].join(' ');
  }

  return [
    `Cuéntame, en lenguaje natural, qué recuerdas de ${candidate.displayName}.`,
    `La señal reciente fue: ${signal}.`,
    `Me interesa especialmente: relación/historia, programas o productos, ciudad/país si falta, qué significa esta señal y si hay un próximo paso interno para Mantis.`,
    'No necesitas aprobar ningún mensaje ni escribir perfecto; una nota breve o una transcripción de audio sirve.',
  ].join(' ');
};

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
  contextIndex: ContextIndex,
) => {
  const context = contextForCandidate(candidate, contextIndex);
  const redundancyReview = redundancyReviewFor(candidate, context);
  const missingFields = redundancyReview.contextCovered
    ? unique([signalInterpretationField(candidate), 'siguiente_paso_interno'])
    : missingFieldsFor(candidate);

  return {
    questionId: `engagement_resolution_${String(index + 1).padStart(2, '0')}_${slug(candidate.personId || candidate.displayName)}`,
    priority: redundancyReview.contextCovered ? 'low' as QuestionPriority : priorityFor(candidate),
    personId: candidate.personId,
    subject: {
      label: labelFor(candidate),
      displayName: candidate.displayName,
      instagramHandle: cleanHandle(candidate.identities.instagramHandle),
    },
    batchStatus: {
      status: redundancyReview.status,
      recommendedAction: redundancyReview.contextCovered
        ? 'internal_signal_review_no_broad_question'
        : candidate.operatorAction.code,
      missingIdentityFields: missingFieldsFor(candidate).filter((field) => ['email', 'instagram', 'ciudad', 'pais'].includes(field)),
      operatorPrompt: redundancyReview.contextCovered
        ? 'Context already covered; do not ask a broad memory question.'
        : candidate.suggestedQuestion,
    },
    known: {
      identity: identityLines(candidate),
      programs: [],
      memoryCues: [
        ...signalCueLines(candidate),
        ...redundancyReview.samples.map((sample) => `Contexto ya guardado: ${sample}`),
      ],
      evidenceCount: candidate.primarySignals.length,
      nextAction: redundancyReview.contextCovered
        ? 'internal_signal_review_no_broad_question'
        : candidate.operatorAction.code,
    },
    missingFields,
    questionFocus: redundancyReview.contextCovered
      ? [
        'No repetir una pregunta amplia de memoria humana.',
        'Revisar internamente si la señal reciente cambia la interpretacion.',
        'Escalar solo una decision minima si hay propuesta futura de follow-up.',
      ]
      : focusFor(candidate),
    prompt: promptFor(candidate, redundancyReview),
    suggestedAnswerFormat: redundancyReview.contextCovered
      ? `${candidate.displayName}: mantener observacion / cambia interpretacion / preparar plan interno futuro.`
      : answerTemplateFor(candidate),
    engagementContext: {
      decisionNeed: candidate.decisionNeed,
      sourceFamily: candidate.sourceFamily,
      movement: candidate.movement,
      priorityDelta: candidate.priority.delta,
      operatorAction: candidate.operatorAction,
      reasonCodes: candidate.reasonCodes,
      riskCodes: candidate.riskCodes,
    },
    redundancyReview,
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
  };
};

export const buildCrmVNextEngagementResolutionLoopFromBrief = (
  brief: CrmVNextEngagementDecisionBrief,
  options: LooseOptions = {},
) => {
  const generatedAt = isoNow(options.now);
  const limit = Math.max(1, Math.min(Math.round(cleanNumber(options.limit, 5)), 10));
  const candidates = Array.isArray(brief?.candidates) ? brief.candidates.slice(0, limit) : [];
  const contextIndex = (options.contextIndex ?? {}) as ContextIndex;
  const includeContextCoveredQuestions = options.includeContextCoveredQuestions === true;
  const resolutionItems = candidates.map((candidate, index) =>
    questionFor(candidate, index, contextIndex),
  );
  const contextCoveredItems = resolutionItems.filter((item) =>
    item.redundancyReview.contextCovered,
  );
  const questions = resolutionItems.filter((item) =>
    item.redundancyReview.requiresAlejandroAnswer || includeContextCoveredQuestions,
  );

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
      contextIndexSources: {
        enabled: Boolean(options.contextIndex),
        cardStore: options.cardStorePath ? 'custom' : DEFAULT_CARD_STORE_PATH,
        factStore: options.factStorePath ? 'custom' : DEFAULT_FACT_STORE_PATH,
        contextFactLedger: options.contextFactLedgerPath ? 'custom' : DEFAULT_CONTEXT_FACT_LEDGER_PATH,
      },
    },
    summary: {
      candidatesReviewed: resolutionItems.length,
      questions: questions.length,
      highPriority: questions.filter((question) => question.priority === 'high').length,
      mediumPriority: questions.filter((question) => question.priority === 'medium').length,
      lowPriority: questions.filter((question) => question.priority === 'low').length,
      contextCovered: contextCoveredItems.length,
      broadQuestionsSuppressed: includeContextCoveredQuestions ? 0 : contextCoveredItems.length,
      operationsExecuted: 0,
      cardMutationReady: false,
      factStoreWriteReady: false,
      outboundReady: false,
    },
    questions,
    contextCoveredItems,
    resolutionPlan: {
      step1: 'Skip broad questions for context-covered contacts; handle them as internal signal review first.',
      step2: 'Ask Alejandro only the remaining compact questions in natural language.',
      step3: 'Save answers in the generated Markdown under each Respuesta libre section.',
      step4: 'Run human-enrichment-response-evidence with the answers Markdown and this questions JSON.',
      step5: 'Feed produced evidenceSources into context-fact-proposals.',
      step6: 'Only after explicit approval, use context-fact-apply or a card-write approval path.',
      nextCommands: [
        'npm run crm:vnext:human-enrichment-response-evidence -- --answers-md <answers.md> --questions-file <engagement-resolution-loop.json>',
        'npm run crm:vnext:context-fact-proposals -- --evidence-file <response-evidence.json>',
        'npm run crm:vnext:context-fact-apply -- --proposal-file <proposals.json> --proposal-id <id> --approved-by Alejandro',
      ],
    },
    mantisPrompt: [
      'Mantis: usa este paquete como lista corta de preguntas de engagement para Alejandro.',
      'No preguntes ampliamente por personas marcadas context_already_covered; revisa la señal internamente y escala solo una decision minima si hace falta.',
      'Pregunta una persona a la vez cuando el item diga needs_alejandro_answer.',
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
  const contextIndex = await buildContextIndex(options);
  const brief = await buildCrmVNextEngagementDecisionBrief({
    ...options,
    limit: options.briefLimit ?? options.limit ?? 5,
  });
  return buildCrmVNextEngagementResolutionLoopFromBrief(brief, {
    ...options,
    contextIndex,
  });
};
