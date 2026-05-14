#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-ig-origin-batch-prompt-2026-05-14';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_CARD_WRITE_LEDGER_PATH = '.crm-vnext/card-write-apply/ledger.jsonl';
const OWNED_OR_INTERNAL_HANDLES = new Set([
  'alejandro_gomez_bernal',
  'alejandrogomezbernal',
  'saludoalsol',
  'coherenciacreativa',
  'coherencia_creativa',
  'notasdealejandro',
  'notas_de_alejandro',
]);
const GENERIC_IG_SIGNAL_SOURCES = new Set([
  'lead-state',
  'ig-ui-signals-state',
  'ig-api-inbox-snapshot',
]);

const usage = `Usage:
  node scripts/crm-vnext-ig-origin-batch-prompt.mjs [options]

Options:
  --card-store-path <path>       Local vNext card store path. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --card-write-ledger-path <path>
                                 Local card-write ledger JSONL path. Defaults to ${DEFAULT_CARD_WRITE_LEDGER_PATH}
  --latest-writes <n>            Seed from the latest n unique committed upserted cards
  --person-id <id[,id]>          Include exact personId(s). May be repeated
  --limit <n>                    Maximum contacts to include. Defaults to 8
  --request <text>               Natural request to embed in the Mantis prompt
  --out <path>                   Write JSON packet
  --markdown-out <path>          Write copy-ready Markdown prompt
  --help                         Show this help

This command is read-only. It prepares a bounded IG-origin/thread-context batch prompt for Mantis. It does not mutate cards, call live APIs, touch credentials, send outbound messages, or change ManyChat LIVE.`;

const parseArgs = (argv) => {
  const options = {
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    cardWriteLedgerPath: DEFAULT_CARD_WRITE_LEDGER_PATH,
    latestWrites: null,
    personIds: [],
    limit: 8,
    request: 'Mantis, corre un batch CRM vNext IG-origin con contexto de hilo para estos contactos.',
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--card-write-ledger-path') options.cardWriteLedgerPath = argv[++index];
    else if (arg === '--latest-writes') options.latestWrites = Number(argv[++index]);
    else if (arg === '--person-id') options.personIds.push(...argv[++index].split(','));
    else if (arg === '--limit') options.limit = Number(argv[++index]);
    else if (arg === '--request') options.request = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!Number.isInteger(options.limit) || options.limit < 1) throw new Error('invalid_limit');
  if (options.latestWrites !== null && (!Number.isInteger(options.latestWrites) || options.latestWrites < 1)) {
    throw new Error('invalid_latest_writes');
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

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readJsonl = async (filePath) => {
  const raw = await readFile(resolve(filePath), 'utf8');
  return raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line));
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const latestPersonIdsFromLedger = (entries, count) => {
  if (!count) return [];
  const selected = [];
  for (const entry of [...entries].reverse()) {
    if (!entry || entry.mutationKind !== 'upsert_vnext_card') continue;
    const personId = cleanString(entry.cardPersonId) ?? cleanString(entry.targetPersonId);
    if (!personId || selected.includes(personId)) continue;
    selected.push(personId);
    if (selected.length >= count) break;
  }
  return selected;
};

const normalizeHandle = (value) => cleanString(value)?.replace(/^@+/, '').toLowerCase() ?? null;

const evidenceText = (card) =>
  (card?.evidence ?? [])
    .map((item) => `${cleanString(item.source) ?? ''} ${cleanString(item.note) ?? ''}`)
    .join(' ');

const hasOwnedOrInternalHandle = (card) => {
  const handle = normalizeHandle(card?.identities?.instagramHandle);
  return Boolean(handle && OWNED_OR_INTERNAL_HANDLES.has(handle));
};

const hasRichEvidence = (card) => {
  const text = evidenceText(card).toLowerCase();
  if (/\b(manychat|lead_capture|lead-capture|lead capture|onboarding|vercel|proxy|webhook|mailerlite|gmail|drive|contacts|retreat|retiro|yoga|encuentro|juana|mantis|instagram_dm_ui|crm-vnext|daily_memory)\b/i.test(text)) {
    return true;
  }
  return (card?.evidence ?? []).some((item) => {
    const source = cleanString(item?.source);
    const note = cleanString(item?.note);
    return Boolean(source && !GENERIC_IG_SIGNAL_SOURCES.has(source) && note && note.length >= 24);
  });
};

const isGenericIgOnlySignal = (card) => {
  const handle = normalizeHandle(card?.identities?.instagramHandle);
  if (!handle) return false;
  if (
    cleanString(card?.displayName)
    || cleanString(card?.identities?.email)
    || cleanString(card?.identities?.phone)
    || cleanString(card?.identities?.city)
    || cleanString(card?.identities?.country)
  ) {
    return false;
  }
  const evidence = Array.isArray(card?.evidence) ? card.evidence : [];
  if (evidence.length > 1) return false;
  const onlySource = cleanString(evidence[0]?.source);
  const onlyNote = cleanString(evidence[0]?.note);
  return Boolean(!onlyNote && (!onlySource || GENERIC_IG_SIGNAL_SOURCES.has(onlySource)));
};

const isIgOrigin = (card) => {
  const text = evidenceText(card).toLowerCase();
  return Boolean(
    normalizeHandle(card?.identities?.instagramHandle)
    || /\b(manychat|lead_capture|lead-capture|lead capture|onboarding|vercel|proxy|webhook|org[aá]nico|captured message|mensaje capturado|instagram onboarding|ig:)\b/i.test(text)
  );
};

const missingFieldsFor = (card) => {
  const fields = [];
  if (!cleanString(card?.identities?.email)) fields.push('email');
  if (!cleanString(card?.identities?.instagramHandle)) fields.push('instagramHandle');
  if (!cleanString(card?.identities?.phone)) fields.push('phone');
  if (!cleanString(card?.identities?.city)) fields.push('city');
  if (!cleanString(card?.identities?.country)) fields.push('country');
  if ((card?.evidence?.length ?? 0) < 2) fields.push('contextEvidence');
  return fields;
};

const subjectFor = (card) => {
  const displayName = cleanString(card?.displayName);
  const handle = normalizeHandle(card?.identities?.instagramHandle);
  if (displayName && handle) return `${displayName} (@${handle})`;
  if (displayName) return displayName;
  if (handle) return `@${handle}`;
  return cleanString(card?.personId) ?? 'unknown';
};

const anchorsFor = (card) => unique([
  cleanString(card?.personId),
  cleanString(card?.displayName),
  cleanString(card?.identities?.email),
  cleanString(card?.identities?.phone),
  normalizeHandle(card?.identities?.instagramHandle) ? `@${normalizeHandle(card.identities.instagramHandle)}` : null,
]);

const isFallbackEligible = (card) => {
  if (!isIgOrigin(card)) return false;
  if (hasOwnedOrInternalHandle(card)) return false;
  if (isGenericIgOnlySignal(card)) return false;
  return Boolean(
    hasRichEvidence(card)
    || cleanString(card?.displayName)
    || cleanString(card?.identities?.email)
    || cleanString(card?.identities?.phone)
  );
};

const priorityFor = (card, recentIndex) => {
  const missing = missingFieldsFor(card);
  let score = 0;
  if (isIgOrigin(card)) score += 50;
  else score -= 40;
  if (hasRichEvidence(card)) score += 18;
  if (isGenericIgOnlySignal(card)) score -= 80;
  if (hasOwnedOrInternalHandle(card)) score -= 100;
  if (recentIndex >= 0) score += Math.max(0, 24 - recentIndex * 2);
  if (missing.includes('instagramHandle')) score += 24;
  if (missing.includes('phone')) score += 8;
  if (missing.includes('city')) score += 6;
  if (missing.includes('contextEvidence')) score += 10;
  if (cleanString(card?.identities?.email) && missing.includes('instagramHandle')) score += 12;
  if (cleanString(card?.identities?.instagramHandle)) score += 4;
  return score;
};

const searchTasksFor = (card) => {
  const tasks = [];
  const email = cleanString(card?.identities?.email);
  const phone = cleanString(card?.identities?.phone);
  const handle = normalizeHandle(card?.identities?.instagramHandle);
  if (email && !handle) tasks.push(`Buscar el email ${email} dentro de Instagram Messages UI para intentar recuperar handle.`);
  if (phone && !handle) tasks.push(`Buscar el telefono ${phone} y variantes normalizadas dentro de Instagram Messages UI.`);
  if (handle) tasks.push(`Inspeccionar el hilo de @${handle} en modo read-only, solo si ya esta accesible, para contexto compacto.`);
  tasks.push('Buscar la misma persona en lead-capture, ManyChat/proxy/Vercel, MailerLite y reportes locales si aplica.');
  tasks.push('Capturar solo datos compactos: ciudad, pais, interes, preferencias, tono, origen y siguiente paso; no copiar conversaciones completas.');
  return tasks;
};

const outputContractFor = (card) => ({
  contactKey: cleanString(card?.personId),
  inputAnchors: anchorsFor(card),
  expectedEvidenceShapes: [
    'contact-keyed Mantis evidence hunt JSON for crm:vnext:mantis-evidence-import',
    'optional instagram_dm_ui observations for crm:vnext:instagram-dm-ui-evidence when a DM UI bridge is found',
  ],
  fieldsToImprove: missingFieldsFor(card),
  safety: {
    readOnly: true,
    noOutbound: true,
    noManyChatLive: true,
    noCredentialChanges: true,
  },
});

const contactPacketFor = (card, recentIndex) => ({
  personId: cleanString(card?.personId),
  subject: subjectFor(card),
  priorityScore: priorityFor(card, recentIndex),
  likelyIgOrigin: isIgOrigin(card),
  known: {
    displayName: cleanString(card?.displayName),
    email: cleanString(card?.identities?.email),
    phone: cleanString(card?.identities?.phone),
    instagramHandle: normalizeHandle(card?.identities?.instagramHandle),
    city: cleanString(card?.identities?.city),
    country: cleanString(card?.identities?.country),
    evidenceCount: card?.evidence?.length ?? 0,
    nextAction: cleanString(card?.nextAction?.code),
  },
  selectionSignals: {
    richEvidence: hasRichEvidence(card),
    genericIgOnlySignal: isGenericIgOnlySignal(card),
    ownedOrInternalHandle: hasOwnedOrInternalHandle(card),
  },
  missingFields: missingFieldsFor(card),
  inputAnchors: anchorsFor(card),
  searchTasks: searchTasksFor(card),
  outputContract: outputContractFor(card),
});

const buildPrompt = (packet) => {
  const contactLines = packet.contacts.map((contact, index) => [
    `${index + 1}. ${contact.subject}`,
    `   - personId: ${contact.personId}`,
    `   - anchors: ${contact.inputAnchors.join(' | ')}`,
    `   - faltantes/prioridad: ${contact.missingFields.join(', ') || 'sin faltantes criticos'} / score ${contact.priorityScore}`,
    `   - tareas: ${contact.searchTasks.join(' ')}`,
  ].join('\n')).join('\n\n');

  return [
    packet.request,
    '',
    'Modo: read-only estricto. No hagas writes al CRM, no Fact Store, no ManyChat LIVE, no outbound, no credenciales, no permisos, no cambios en Instagram/MailerLite/Google.',
    '',
    'Objetivo: enriquecer/stitching de tarjetas IG-origin usando fuentes disponibles y, cuando exista, contexto compacto del hilo de Instagram. No copies conversaciones completas; resume solo datos útiles y seguros.',
    '',
    'Contactos del batch:',
    '',
    contactLines,
    '',
    'Fuentes sugeridas: person-card-store local, lead-capture/ManyChat/proxy/Vercel/WhatsApp automation logs, MailerLite con cursor pagination + filtrado local, Gmail/Drive/Contacts si estan autenticados, Mantis-Reports/local memory, e Instagram Messages UI solo como observacion read-only.',
    '',
    'Si encuentras un puente por Instagram Messages UI, guarda observaciones compatibles con crm:vnext:instagram-dm-ui-evidence: searchTerm, subjectName, subjectEmail/phone, matchedInstagramHandle, matchedDisplayName, city, country, preferences, tone, threadContext, observedBy, observedAt, confidence, snippet.',
    '',
    'Entrega un JSON contact-keyed en ~/Documents/Mantis-Reports con schemaVersion mantis.crm_vnext.evidence_hunt.v1, resumen corto, sourcesConsulted, blockers exactos, contacts, strongMatches, weakMatches, discardedCandidates, resolvedAnchors y recommendation. Cero mutaciones.',
  ].join('\n');
};

const buildMarkdown = (packet) => [
  `# CRM vNext IG-Origin Batch Prompt`,
  '',
  `Generated: ${packet.generatedAt}`,
  `Mode: ${packet.mode}`,
  '',
  '## Copy-ready prompt for Mantis',
  '',
  '```text',
  packet.mantisPrompt,
  '```',
  '',
  '## Selected Contacts',
  '',
  ...packet.contacts.flatMap((contact, index) => [
    `### ${index + 1}. ${contact.subject}`,
    '',
    `- personId: ${contact.personId}`,
    `- likely IG origin: ${contact.likelyIgOrigin ? 'yes' : 'review'}`,
    `- missing fields: ${contact.missingFields.join(', ') || 'none'}`,
    `- anchors: ${contact.inputAnchors.join(' | ')}`,
    `- known: email=${contact.known.email ?? '-'}; phone=${contact.known.phone ?? '-'}; instagram=${contact.known.instagramHandle ? `@${contact.known.instagramHandle}` : '-'}; city=${contact.known.city ?? '-'}; country=${contact.known.country ?? '-'}`,
    '',
  ]),
  '## Safety',
  '',
  '- Read-only packet.',
  '- No outbound messages.',
  '- No ManyChat LIVE.',
  '- No live credential or permission changes.',
  '- No card writes without separate explicit approval.',
  '',
].join('\n');

const buildPacket = ({ cards, ledgerEntries, options, now }) => {
  const cardsById = new Map(cards.map((card) => [cleanString(card.personId), card]));
  const latestIds = latestPersonIdsFromLedger(ledgerEntries, options.latestWrites);
  const explicitIds = options.personIds.map(cleanString).filter(Boolean);
  const seededIds = unique([...explicitIds, ...latestIds]);
  const seededCards = seededIds.map((id) => cardsById.get(id)).filter(Boolean);
  const seededIdSet = new Set(seededIds);
  const fallbackCards = cards
    .filter((card) => isFallbackEligible(card))
    .filter((card) => !seededIdSet.has(cleanString(card.personId)))
    .sort((a, b) => priorityFor(b, -1) - priorityFor(a, -1));
  const excludedFallbackCards = cards.filter((card) =>
    isIgOrigin(card)
    && !isFallbackEligible(card)
    && !explicitIds.includes(cleanString(card.personId))
    && !latestIds.includes(cleanString(card.personId))
  );
  const seededPackets = seededCards
    .filter((card) => {
      const personId = cleanString(card.personId);
      if (explicitIds.includes(personId)) return true;
      if (hasOwnedOrInternalHandle(card)) return false;
      return isIgOrigin(card) && !isGenericIgOnlySignal(card);
    })
    .map((card) => contactPacketFor(card, latestIds.indexOf(cleanString(card.personId))))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.subject.localeCompare(b.subject));
  const fallbackPackets = fallbackCards
    .map((card) => contactPacketFor(card, -1))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.subject.localeCompare(b.subject))
  const candidates = [...seededPackets, ...fallbackPackets].slice(0, options.limit);
  const basePacket = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: now,
    mode: 'read_only_ig_origin_batch_prompt',
    request: options.request,
    summary: {
      contactsSelected: candidates.length,
      latestWriteSeeds: latestIds.length,
      explicitSeeds: explicitIds.length,
      excludedLowSignalFallbacks: excludedFallbackCards.length,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    contacts: candidates,
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
      manyChatLiveMutationProhibited: true,
      instagramPermissionMutationProhibited: true,
    },
  };
  return {
    ...basePacket,
    mantisPrompt: buildPrompt(basePacket),
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const cardStore = await readJson(options.cardStorePath);
  const cards = Array.isArray(cardStore?.cards) ? cardStore.cards : [];
  const ledgerEntries = await readJsonl(options.cardWriteLedgerPath);
  const packet = buildPacket({
    cards,
    ledgerEntries,
    options,
    now: new Date().toISOString(),
  });

  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  }
  if (options.markdownOut) {
    const outPath = resolve(options.markdownOut);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, buildMarkdown(packet), 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    mode: packet.mode,
    generatedAt: packet.generatedAt,
    summary: packet.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    contacts: packet.contacts.map((contact) => ({
      personId: contact.personId,
      subject: contact.subject,
      missingFields: contact.missingFields,
      priorityScore: contact.priorityScore,
    })),
    safety: packet.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext ig-origin-batch-prompt failed: ${error.message}`);
  process.exitCode = 1;
});
