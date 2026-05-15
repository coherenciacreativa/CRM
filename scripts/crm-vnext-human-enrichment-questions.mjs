#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-human-enrichment-questions-2026-05-11';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_CARD_WRITE_LEDGER_PATH = '.crm-vnext/card-write-apply/ledger.jsonl';

const usage = `Usage:
  node scripts/crm-vnext-human-enrichment-questions.mjs [options]

Options:
  --batch-loop-file <path>    Optional crm:vnext:batch-operating-loop JSON to seed people from a batch
  --questions-file <path>     Optional existing human-enrichment question packet to re-render
  --card-store-path <path>    Local vNext card store path. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --card-write-ledger-path <path>
                              Local card-write ledger JSONL path. Defaults to ${DEFAULT_CARD_WRITE_LEDGER_PATH}
  --from-card-write-ledger    Include recently committed local card writes as people to enrich
  --latest-writes <n>         Include the latest n unique upserted card writes. Implies --from-card-write-ledger
  --since <iso-date>          Include local card writes committed at/after this ISO date. Implies --from-card-write-ledger
  --person-id <id[,id]>       Include exact personId(s), e.g. ig:cielo_gom_g. May be repeated
  --out <path>                Write question packet JSON to this path
  --markdown-out <path>       Write a human-readable Markdown interview sheet
  --format <verbose|compact>  Markdown format. Defaults to verbose
  --profile-screenshot-manifest <path>
                              Optional JSON map of personId/handle/email to local profile screenshot paths
  --limit <n>                 Maximum people to include. Defaults to all selected people
  --help                      Show this help

This command is read-only. It creates a person-by-person question packet so Alejandro can add remembered context
after a batch. It never mutates cards, writes Fact Store, calls live APIs, touches credentials, or sends outbound.`;

const parseArgs = (argv) => {
  const options = {
    batchLoopFile: null,
    questionsFile: null,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    cardWriteLedgerPath: DEFAULT_CARD_WRITE_LEDGER_PATH,
    fromCardWriteLedger: false,
    latestWrites: null,
    since: null,
    personIds: [],
    out: null,
    markdownOut: null,
    format: 'verbose',
    profileScreenshotManifest: null,
    limit: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--batch-loop-file') options.batchLoopFile = argv[++index];
    else if (arg === '--questions-file') options.questionsFile = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--card-write-ledger-path') options.cardWriteLedgerPath = argv[++index];
    else if (arg === '--from-card-write-ledger') options.fromCardWriteLedger = true;
    else if (arg === '--latest-writes') {
      options.latestWrites = Number(argv[++index]);
      options.fromCardWriteLedger = true;
    }
    else if (arg === '--since') {
      options.since = argv[++index];
      options.fromCardWriteLedger = true;
    }
    else if (arg === '--person-id') options.personIds.push(...argv[++index].split(','));
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--format') options.format = argv[++index];
    else if (arg === '--profile-screenshot-manifest') options.profileScreenshotManifest = argv[++index];
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (options.limit !== null && (!Number.isInteger(options.limit) || options.limit < 1)) {
    throw new Error('invalid_limit');
  }
  if (options.latestWrites !== null && (!Number.isInteger(options.latestWrites) || options.latestWrites < 1)) {
    throw new Error('invalid_latest_writes');
  }
  if (options.since !== null && Number.isNaN(Date.parse(options.since))) {
    throw new Error('invalid_since');
  }
  if (!['verbose', 'compact'].includes(options.format)) {
    throw new Error('invalid_format');
  }
  return options;
};

const cleanString = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readJsonl = async (filePath) => {
  const raw = await readFile(resolve(filePath), 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const normalizeManifestEntry = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return { path: resolve(value), source: 'profile_screenshot_manifest' };
  if (typeof value !== 'object') return null;
  const rawPath = cleanString(value.path ?? value.filePath ?? value.file ?? value.imagePath);
  if (!rawPath) return null;
  return {
    path: resolve(rawPath),
    source: cleanString(value.source) ?? 'profile_screenshot_manifest',
    capturedAt: cleanString(value.capturedAt ?? value.captured_at),
  };
};

const readScreenshotManifest = async (filePath) => {
  if (!filePath) return new Map();
  const parsed = await readJson(filePath);
  const entries = Array.isArray(parsed)
    ? parsed.flatMap((item) => {
      if (!item || typeof item !== 'object') return [];
      const keys = [
        cleanString(item.personId ?? item.person_id),
        cleanString(item.instagramHandle ?? item.instagram_handle),
        cleanString(item.email),
      ].filter(Boolean);
      const value = normalizeManifestEntry(item);
      return value ? keys.map((key) => [key, value]) : [];
    })
    : Object.entries(parsed ?? {}).map(([key, value]) => [cleanString(key), normalizeManifestEntry(value)]);
  return new Map(entries.filter(([key, value]) => key && value));
};

const personIdsFromCardWriteLedger = (entries, options) => {
  const sinceTime = options.since ? Date.parse(options.since) : null;
  const selected = [];
  for (const entry of [...entries].reverse()) {
    if (!entry || entry.mutationKind !== 'upsert_vnext_card') continue;
    if (sinceTime !== null && Date.parse(entry.committedAt ?? '') < sinceTime) continue;
    const personId = cleanString(entry.cardPersonId) ?? cleanString(entry.targetPersonId);
    if (!personId || selected.includes(personId)) continue;
    selected.push(personId);
    if (options.latestWrites !== null && selected.length >= options.latestWrites) break;
  }
  return selected;
};

const personIdsFromBatchLoop = (loop) => unique([
  ...(Array.isArray(loop?.readyApprovalItems) ? loop.readyApprovalItems.map((item) => item.targetPersonId) : []),
  ...(Array.isArray(loop?.blockedIdentityQueue) ? loop.blockedIdentityQueue.map((item) => item.targetPersonId) : []),
  ...(Array.isArray(loop?.noMaterialDeltaQueue) ? loop.noMaterialDeltaQueue.map((item) => item.targetPersonId) : []),
  ...(Array.isArray(loop?.readyWritePreview?.planItems) ? loop.readyWritePreview.planItems.map((item) => item.targetPersonId) : []),
]);

const batchStatusFor = (loop, personId) => {
  const ready = (loop?.readyApprovalItems ?? []).find((item) => item.targetPersonId === personId);
  if (ready) return {
    status: 'ready_for_card_write_approval',
    recommendedAction: cleanString(ready.recommendedAction),
    missingIdentityFields: [],
    operatorPrompt: null,
  };
  const blocked = (loop?.blockedIdentityQueue ?? []).find((item) => item.targetPersonId === personId);
  if (blocked) return {
    status: cleanString(blocked.status) ?? 'blocked_needs_more_identity',
    recommendedAction: cleanString(blocked.recommendedAction),
    missingIdentityFields: Array.isArray(blocked.identitySummary?.missingContactFields)
      ? blocked.identitySummary.missingContactFields.map(cleanString).filter(Boolean)
      : [],
    operatorPrompt: cleanString(blocked.operatorPrompt),
  };
  return {
    status: 'manual_follow_up',
    recommendedAction: null,
    missingIdentityFields: [],
    operatorPrompt: null,
  };
};

const weakDisplayName = (card) => {
  const displayName = cleanString(card?.displayName);
  if (!displayName) return true;
  const handle = cleanString(card?.identities?.instagramHandle);
  if (handle && displayName.replace(/^@+/, '').toLowerCase() === handle.toLowerCase()) return true;
  return displayName.split(/\s+/).filter(Boolean).length < 2 && !displayName.includes('/');
};

const knownIdentityLines = (card) => {
  if (!card) return [];
  return [
    cleanString(card.displayName) ? `Nombre: ${cleanString(card.displayName)}` : null,
    cleanString(card.identities?.instagramHandle) ? `Instagram: @${cleanString(card.identities.instagramHandle)?.replace(/^@+/, '')}` : null,
    cleanString(card.identities?.email) ? `Email: ${cleanString(card.identities.email)}` : null,
    cleanString(card.identities?.phone) ? `Telefono: ${cleanString(card.identities.phone)}` : null,
    cleanString(card.identities?.city) ? `Ciudad: ${cleanString(card.identities.city)}` : null,
    cleanString(card.identities?.country) ? `Pais: ${cleanString(card.identities.country)}` : null,
  ].filter(Boolean);
};

const knownProgramLines = (card) => {
  if (!card) return [];
  return [
    card.products?.yogaClasses90d ? `Clases de yoga: ${card.products.yogaClasses90d}` : null,
    card.products?.happyCircle90d ? `Encuentro Feliz: ${card.products.happyCircle90d}` : null,
    card.products?.retreatsAttended ? `Retiros: ${card.products.retreatsAttended}` : null,
    card.products?.activeClient ? 'Cliente activo: si' : null,
    card.products?.purchaseCount ? `Compras registradas: ${card.products.purchaseCount}` : null,
    card.products?.totalSpend ? `Gasto registrado: ${card.products.totalSpend}` : null,
  ].filter(Boolean);
};

const missingFieldLabels = (card, batchStatus) => {
  const missing = [];
  if (!card) return ['card_missing'];
  if (weakDisplayName(card)) missing.push('nombre_completo');
  if (!cleanString(card.identities?.email)) missing.push('email');
  if (!cleanString(card.identities?.phone)) missing.push('telefono');
  if (!cleanString(card.identities?.city)) missing.push('ciudad');
  if (!cleanString(card.identities?.country)) missing.push('pais');
  for (const field of batchStatus.missingIdentityFields ?? []) {
    if (field === 'phone') missing.push('telefono');
    else if (field === 'email') missing.push('email');
    else missing.push(field);
  }
  return unique(missing);
};

const priorityFor = (card, missingFields, batchStatus) => {
  if (!card) return 'high';
  if (/blocked/i.test(batchStatus.status)) return 'high';
  if (missingFields.includes('email') && missingFields.includes('telefono')) return 'high';
  if (missingFields.includes('email') || missingFields.includes('telefono') || weakDisplayName(card)) return 'medium';
  if ((card.evidence?.length ?? 0) < 3 || missingFields.includes('ciudad') || missingFields.includes('pais')) return 'medium';
  return 'low';
};

const questionFocusFor = (card, missingFields) => unique([
  ...missingFields.map((field) => `confirmar_${field}`),
  'programas_y_roles',
  'relacion_con_alejandro_o_comunidad',
  'historia_de_origen',
  'intereses_y_siguiente_paso',
  card?.products?.activeClient ? 'contexto_cliente_actual' : null,
]);

const subjectFor = (personId, card) => {
  const displayName = cleanString(card?.displayName);
  const handle = cleanString(card?.identities?.instagramHandle);
  if (displayName && handle) return `${displayName} (@${handle.replace(/^@+/, '')})`;
  if (displayName) return displayName;
  if (handle) return `@${handle.replace(/^@+/, '')}`;
  return personId;
};

const screenshotLookupKeys = (question) => unique([
  cleanString(question.personId),
  cleanString(question.subject?.instagramHandle),
  cleanString(question.subject?.instagramHandle)?.replace(/^@+/, ''),
  cleanString(question.subject?.instagramHandle) ? `@${cleanString(question.subject.instagramHandle).replace(/^@+/, '')}` : null,
  ...(question.known?.identity ?? [])
    .map((line) => cleanString(line)?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase())
    .filter(Boolean),
]);

const screenshotForQuestion = (question, screenshotManifest) => {
  for (const key of screenshotLookupKeys(question)) {
    const exact = screenshotManifest.get(key);
    if (exact) return exact;
    const normalized = screenshotManifest.get(key.replace(/^@+/, ''));
    if (normalized) return normalized;
  }
  return null;
};

const promptFor = (personId, card, missingFields) => {
  const subject = subjectFor(personId, card);
  const missing = missingFields.length ? missingFields.join(', ') : 'ningun campo critico';
  return [
    `Sobre ${subject}: ya tengo la tarjeta parcialmente armada. ¿Que mas recuerdas de esta persona?`,
    `Campos o contexto que seria especialmente util completar: ${missing}.`,
    'Puedes responder en lenguaje natural: programas en los que participa, retiros, si es cliente, como llego, ciudad, familia/aliados, intereses, etapa actual, y cualquier proximo paso que quieras que Mantis tenga presente.',
  ].join(' ');
};

const answerTemplateFor = (personId, card) => {
  const subject = subjectFor(personId, card);
  return `CRM: ${subject} es/ha sido ____. Participa o participo en ____. Vive en ____. Contactos/canales conocidos: ____. Relacion conmigo/la comunidad: ____. Intereses o siguiente paso: ____.`;
};

const questionFor = (personId, card, batchStatus, index) => {
  const missingFields = missingFieldLabels(card, batchStatus);
  const priority = priorityFor(card, missingFields, batchStatus);
  const identity = knownIdentityLines(card);
  const programs = knownProgramLines(card);
  return {
    questionId: `human_enrichment_${String(index + 1).padStart(2, '0')}_${personId.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase()}`,
    priority,
    personId,
    subject: {
      label: subjectFor(personId, card),
      displayName: cleanString(card?.displayName),
      instagramHandle: cleanString(card?.identities?.instagramHandle),
    },
    batchStatus,
    known: {
      identity,
      programs,
      evidenceCount: card?.evidence?.length ?? 0,
      nextAction: cleanString(card?.nextAction?.code),
    },
    missingFields,
    questionFocus: questionFocusFor(card, missingFields),
    prompt: promptFor(personId, card, missingFields),
    suggestedAnswerFormat: answerTemplateFor(personId, card),
    safeUse: {
      allowed: [
        'Turn Alejandro human memory into CRM facts through Fact Intake or a future approved card enrichment batch.',
        'Use as internal context for stitching and profile completeness.',
      ],
      prohibited: [
        'Do not treat this answer as permission to send outbound messages.',
        'Do not store sensitive clinical details beyond service/client relationship context.',
        'Do not mutate cards without a separate explicit local write approval.',
      ],
    },
  };
};

const buildPacket = ({ cards, batchLoop, ledgerPersonIds = [], personIds = [], now, source = {} }) => {
  const cardsById = new Map(cards.map((card) => [card.personId, card]));
  const selectedPersonIds = unique([
    ...personIdsFromBatchLoop(batchLoop),
    ...ledgerPersonIds,
    ...personIds.map(cleanString),
  ]);
  const questions = selectedPersonIds.map((personId, index) =>
    questionFor(personId, cardsById.get(personId) ?? null, batchStatusFor(batchLoop, personId), index)
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now ?? new Date().toISOString(),
    mode: 'read_only_human_enrichment_questions',
    source: {
      selectedPeople: selectedPersonIds.length,
      batchLoopFile: batchLoop?._sourceFile ? basename(batchLoop._sourceFile) : null,
      cardWriteLedgerLoaded: Boolean(source.cardWriteLedgerLoaded),
      cardWriteLedgerRows: source.cardWriteLedgerRows ?? 0,
      cardWriteLedgerPeopleSelected: ledgerPersonIds.length,
      cardStoreLoaded: true,
      localPathsRedacted: true,
    },
    summary: {
      questions: questions.length,
      highPriority: questions.filter((item) => item.priority === 'high').length,
      mediumPriority: questions.filter((item) => item.priority === 'medium').length,
      lowPriority: questions.filter((item) => item.priority === 'low').length,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    questions,
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
    },
  };
};

const markdownFor = (packet) => [
  '# CRM vNext Human Enrichment Questions',
  '',
  `Generated: ${packet.generatedAt}`,
  `Questions: ${packet.summary.questions}`,
  '',
  ...packet.questions.flatMap((question, index) => [
    `## ${index + 1}. ${question.subject.label}`,
    '',
    `Priority: ${question.priority}`,
    `Person ID: ${question.personId}`,
    `Batch status: ${question.batchStatus.status}`,
    '',
    'Known identity:',
    ...(question.known.identity.length ? question.known.identity.map((line) => `- ${line}`) : ['- none']),
    '',
    'Known programs/context:',
    ...(question.known.programs.length ? question.known.programs.map((line) => `- ${line}`) : ['- none']),
    '',
    'Missing or useful fields:',
    ...(question.missingFields.length ? question.missingFields.map((line) => `- ${line}`) : ['- none']),
    '',
    'Question:',
    '',
    question.prompt,
    '',
    'Suggested answer format:',
    '',
    question.suggestedAnswerFormat,
    '',
  ]),
].join('\n');

const compactKnownLines = (question) => {
  const lines = [
    ...question.known.identity,
    ...question.known.programs,
    question.known.evidenceCount ? `Fuentes/evidencias: ${question.known.evidenceCount}` : null,
    question.known.nextAction ? `Next action actual: ${question.known.nextAction}` : null,
  ].filter(Boolean);
  return lines.length ? lines.slice(0, 8) : ['Sin datos seguros todavia'];
};

const compactMissingLines = (question) => {
  const missing = question.missingFields?.filter((field) => field !== 'card_missing') ?? [];
  if (!missing.length) return ['Contexto humano: relacion, historia, programas reales, siguiente paso'];
  return unique([
    ...missing,
    'relacion/historia/programas',
    'siguiente paso',
  ]);
};

const compactInline = (values, fallback) => {
  const cleaned = values.map(cleanString).filter(Boolean);
  if (!cleaned.length) return fallback;
  return cleaned.join(' | ');
};

const compactMarkdownFor = (packet, screenshotManifest = new Map()) => [
  '# CRM vNext - Revision Compacta Para Alejandro',
  '',
  `Generado: ${packet.generatedAt}`,
  `Contactos: ${packet.summary.questions}`,
  '',
  'Responde libremente debajo de cada persona. Una frase, una memoria o un audio transcrito sirve.',
  '',
  ...packet.questions.flatMap((question, index) => {
    const screenshot = screenshotForQuestion(question, screenshotManifest);
    return [
      `## ${index + 1}. ${question.subject.label}`,
      '',
      screenshot?.path
        ? `![Perfil IG - ${question.subject.label}](${screenshot.path})`
        : 'Captura IG: pendiente',
      '',
      `Datos: ${compactInline(compactKnownLines(question), 'Sin datos seguros todavia')}`,
      `Completar: ${compactInline(compactMissingLines(question), 'Contexto humano y siguiente paso')}`,
      '',
      'Respuesta libre:',
      '> ',
      '',
    ];
  }),
].join('\n');

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${value}\n`, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = options.questionsFile
    ? await readJson(options.questionsFile)
    : (() => null)();

  const builtPacket = packet ?? await (async () => {
    const cardStore = await readJson(options.cardStorePath);
    const batchLoop = options.batchLoopFile
      ? { ...(await readJson(options.batchLoopFile)), _sourceFile: resolve(options.batchLoopFile) }
      : null;
    const cardWriteLedgerEntries = options.fromCardWriteLedger
      ? await readJsonl(options.cardWriteLedgerPath)
      : [];
    const ledgerPersonIds = options.fromCardWriteLedger
      ? personIdsFromCardWriteLedger(cardWriteLedgerEntries, options)
      : [];
    const personIds = options.limit ? options.personIds.slice(0, options.limit) : options.personIds;
    return buildPacket({
      cards: Array.isArray(cardStore?.cards) ? cardStore.cards : [],
      batchLoop,
      ledgerPersonIds,
      personIds,
      source: {
        cardWriteLedgerLoaded: options.fromCardWriteLedger,
        cardWriteLedgerRows: cardWriteLedgerEntries.length,
      },
    });
  })();

  const limitedPacket = options.limit
    ? { ...builtPacket, questions: builtPacket.questions.slice(0, options.limit) }
    : builtPacket;
  if (options.limit) {
    limitedPacket.summary = {
      questions: limitedPacket.questions.length,
      highPriority: limitedPacket.questions.filter((item) => item.priority === 'high').length,
      mediumPriority: limitedPacket.questions.filter((item) => item.priority === 'medium').length,
      lowPriority: limitedPacket.questions.filter((item) => item.priority === 'low').length,
      operationsExecuted: 0,
      cardMutationReady: false,
    };
  }

  const screenshotManifest = await readScreenshotManifest(options.profileScreenshotManifest);
  if (options.out) await writeJson(options.out, limitedPacket);
  if (options.markdownOut) {
    await writeText(
      options.markdownOut,
      options.format === 'compact'
        ? compactMarkdownFor(limitedPacket, screenshotManifest)
        : markdownFor(limitedPacket),
    );
  }
  console.log(JSON.stringify({
    ok: true,
    mode: limitedPacket.mode,
    generatedAt: limitedPacket.generatedAt,
    format: options.format,
    summary: limitedPacket.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    profileScreenshotsLoaded: screenshotManifest.size,
    safety: limitedPacket.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext human-enrichment-questions failed: ${error.message}`);
  process.exitCode = 1;
});
