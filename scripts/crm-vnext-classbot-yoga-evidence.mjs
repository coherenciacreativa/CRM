#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-classbot-yoga-evidence-2026-05-20';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_CLASSBOT_ROOT = join(homedir(), 'classbot');

const usage = `Usage:
  node scripts/crm-vnext-classbot-yoga-evidence.mjs [options]

Options:
  --classbot-root <path>       ClassBot root. Defaults to ~/classbot
  --recipients-csv <path>      ClassBot recipients CSV. Defaults to <classbot-root>/dispatcher/src/recipients.csv
  --idempotency-cache <path>   JSON records cache. May be repeated. Defaults to root + dispatcher caches
  --card-store-path <path>     Local CRM vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --include-admin             Include Alejandro/admin rows. Default excludes them
  --out <path>                 Write evidence packet JSON
  --markdown-out <path>        Write compact Markdown summary
  --fail-on-empty              Exit non-zero if no contacts are produced
  --help                       Show this help

This command is read-only. It turns ClassBot recipients and delivery idempotency into CRM vNext
evidence/previews for yoga class participation. It never executes ClassBot, touches Twilio,
sends WhatsApp, mutates CRM cards/Fact Store, calls live APIs, reads credentials, or touches
ManyChat LIVE.`;

const parseArgs = (argv) => {
  const options = {
    classbotRoot: DEFAULT_CLASSBOT_ROOT,
    recipientsCsv: null,
    idempotencyCaches: [],
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    includeAdmin: false,
    out: null,
    markdownOut: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--include-admin') options.includeAdmin = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--classbot-root') options.classbotRoot = argv[++index];
    else if (arg === '--recipients-csv') options.recipientsCsv = argv[++index];
    else if (arg === '--idempotency-cache') options.idempotencyCaches.push(argv[++index]);
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const normalizeText = (value) =>
  (cleanString(value) ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizePhoneDigits = (value) => cleanString(value)?.replace(/\D/g, '') ?? '';

const normalizePhone = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  const digits = normalizePhoneDigits(raw);
  if (!digits) return null;
  return raw.replace(/^whatsapp:/i, '').trim().startsWith('+') || raw.startsWith('whatsapp:+')
    ? `+${digits}`
    : digits;
};

const last4 = (value) => {
  const digits = normalizePhoneDigits(value);
  return digits ? digits.slice(-4) : null;
};

const slug = (value) => {
  const normalized = normalizeText(value).replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return normalized || 'unknown_contact';
};

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const parseCsv = (text) => {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else if (char !== '\r') field += char;
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((candidate) => candidate.some((value) => cleanString(value)));
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readRecipients = async (csvPath) => {
  const rows = parseCsv(await readFile(csvPath, 'utf8'));
  if (!rows.length) return [];
  const header = rows[0].map((value) => cleanString(value) ?? '');
  const indexByHeader = new Map(header.map((key, index) => [key, index]));
  const cell = (row, ...keys) => {
    for (const key of keys) {
      const index = indexByHeader.get(key);
      if (typeof index === 'number') return cleanString(row[index]);
    }
    return null;
  };
  return rows.slice(1).map((row, index) => ({
    sourceRow: index + 2,
    classId: cell(row, 'class_id', 'classId'),
    displayName: cell(row, 'displayName', 'display_name'),
    phone: cell(row, 'phone'),
    phoneNormalized: normalizePhone(cell(row, 'phone')),
    phoneLast4: last4(cell(row, 'phone')),
    timezone: cell(row, 'timezone'),
    program: cell(row, 'program', 'plan', 'enrollment', 'schedule') ?? 'two_per_week',
    status: cell(row, 'status') ?? 'active_default',
    trialStartDate: cell(row, 'trialStartDate', 'trial_start_date'),
    trialMaxSends: cell(row, 'trialMaxSends', 'trial_max_sends'),
  })).filter((recipient) => recipient.displayName || recipient.phoneNormalized);
};

const readIdempotencyRecords = async (paths) => {
  const records = [];
  for (const filePath of paths) {
    if (!existsSync(filePath)) continue;
    const parsed = await readJson(filePath);
    const values = Array.isArray(parsed) ? parsed : Object.values(parsed);
    for (const record of values) records.push({ ...record, sourceFile: filePath });
  }
  return records;
};

const recordPhoneDigits = (record) => {
  const key = cleanString(record?.key) ?? '';
  const matches = key.match(/whatsapp:\+\d+/g) || key.match(/:\+\d{8,}/g) || [];
  const raw = matches.at(-1)?.replace(/^:/, '') ?? record?.metadata?.phone ?? record?.metadata?.recipient ?? '';
  return normalizePhoneDigits(raw);
};

const classKeyFor = (record) => {
  const metadata = record?.metadata ?? {};
  const fromMetadata = cleanString(metadata.classId ?? metadata.class_id ?? metadata.classDate);
  if (fromMetadata) return fromMetadata;
  const key = cleanString(record?.key) ?? '';
  const match = key.match(/(?:clase|classbot|live)[-_:\w]*20\d{2}-?\d{2}-?\d{2}[-_:\w]*/i);
  return cleanString(match?.[0]) ?? key.split(':')[0] ?? null;
};

const summarizeDelivery = (records, phone) => {
  const digits = normalizePhoneDigits(phone);
  const relevant = records.filter((record) => {
    const recordDigits = recordPhoneDigits(record);
    return recordDigits && digits && recordDigits.endsWith(digits.slice(-10));
  });
  const countsByStatus = {};
  let firstTimestamp = null;
  let lastTimestamp = null;
  let latestStatus = null;
  let latestClassOrEventKey = null;
  const distinctClassOrEventKeys = new Set();
  for (const record of relevant) {
    const status = cleanString(record?.status) ?? 'unknown';
    countsByStatus[status] = (countsByStatus[status] ?? 0) + 1;
    const timestamp = cleanString(record?.timestamp ?? record?.updatedAt ?? record?.createdAt);
    if (timestamp && (!firstTimestamp || timestamp < firstTimestamp)) firstTimestamp = timestamp;
    if (timestamp && (!lastTimestamp || timestamp > lastTimestamp)) {
      lastTimestamp = timestamp;
      latestStatus = status;
      latestClassOrEventKey = classKeyFor(record);
    }
    const classKey = classKeyFor(record);
    if (classKey) distinctClassOrEventKeys.add(classKey);
  }
  return {
    total: relevant.length,
    countsByStatus,
    sent: countsByStatus.sent ?? 0,
    error: countsByStatus.error ?? 0,
    pending: countsByStatus.pending ?? 0,
    firstTimestamp,
    lastTimestamp,
    latestStatus,
    latestClassOrEventKey,
    distinctClassOrEventKeys: distinctClassOrEventKeys.size,
    interpretation: relevant.length ? 'ClassBot has real delivery evidence' : 'No idempotency delivery evidence found for this phone',
  };
};

const readCardStore = async (filePath) => {
  const parsed = await readJson(filePath);
  return Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
};

const cardIdentityText = (card) => normalizeText([
  card?.personId,
  card?.displayName,
  card?.identities?.email,
  card?.identities?.instagramHandle,
  card?.identities?.phone,
].filter(Boolean).join(' '));

const cardPublic = (card) => card ? {
  personId: card.personId,
  displayName: card.displayName ?? null,
  identities: {
    email: card.identities?.email ?? null,
    instagramHandle: card.identities?.instagramHandle ?? null,
    phoneLast4: last4(card.identities?.phone),
    city: card.identities?.city ?? null,
    country: card.identities?.country ?? null,
  },
  products: {
    yogaClasses90d: card.products?.yogaClasses90d ?? 0,
    happyCircle90d: card.products?.happyCircle90d ?? 0,
    retreatsAttended: card.products?.retreatsAttended ?? 0,
    activeClient: Boolean(card.products?.activeClient),
  },
} : null;

const matchCards = (recipient, cards) => {
  const digits = normalizePhoneDigits(recipient.phoneNormalized);
  const phoneMatches = digits
    ? cards.filter((card) => {
      const cardDigits = normalizePhoneDigits(card?.identities?.phone);
      return cardDigits && (
        cardDigits === digits
        || cardDigits.endsWith(digits.slice(-10))
        || digits.endsWith(cardDigits.slice(-10))
      );
    })
    : [];
  if (phoneMatches.length === 1) {
    return { confidence: 'strong', matchKind: 'phone_exact_or_last10', candidates: phoneMatches };
  }

  const name = normalizeText(recipient.displayName);
  const tokens = name.split(/\s+/).filter((token) => token.length >= 3);
  const nameMatches = tokens.length
    ? cards.filter((card) => tokens.every((token) => cardIdentityText(card).includes(token)))
    : [];
  if (nameMatches.length === 1 && tokens.length >= 2) {
    const card = nameMatches[0];
    const hasDisplayName = Boolean(cleanString(card.displayName));
    const confidence = hasDisplayName ? 'strong' : 'medium';
    return { confidence, matchKind: hasDisplayName ? 'name_tokens_display_name' : 'name_tokens_email_only', candidates: nameMatches };
  }
  if (nameMatches.length === 1 && tokens.length === 1) {
    return { confidence: 'medium', matchKind: 'single_name_token', candidates: nameMatches };
  }
  if (phoneMatches.length || nameMatches.length) {
    return { confidence: 'medium', matchKind: 'multiple_candidates_review', candidates: unique([...phoneMatches, ...nameMatches]) };
  }
  return { confidence: 'blocked', matchKind: 'no_existing_card_candidate', candidates: [] };
};

const missingFieldsFor = (card) => {
  if (!card) return ['email', 'instagramHandle', 'city', 'country'];
  return [
    card.identities?.email ? null : 'email',
    card.identities?.instagramHandle ? null : 'instagramHandle',
    card.identities?.city ? null : 'city',
    card.identities?.country ? null : 'country',
  ].filter(Boolean);
};

const readyWritePreviewFor = ({ contactKey, recipient, card, deliverySummary, confidence }) => {
  const recommendedAction = card ? 'enrich_existing_card' : 'create_review_card';
  const targetPersonId = card?.personId ?? null;
  const fields = card
    ? ['products.yoga', 'evidence.classbot', 'identities.phone_if_absent', 'channels.whatsapp']
    : ['displayName', 'identities.phone', 'products.yoga', 'evidence.classbot'];
  return {
    mode: 'dry_run_only',
    wouldMutate: true,
    executed: false,
    recommendedAction,
    target: { contactKey, personId: targetPersonId },
    confidence,
    operations: [
      {
        operation: card ? 'enrich_existing_card' : 'stage_create_review_card',
        targetPersonId,
        fields,
      },
      {
        operation: 'upsert_identity_phone_if_policy_approved',
        value: recipient.phoneNormalized,
        source: 'classbot_recipients_csv',
      },
      {
        operation: 'add_service_relationship',
        service: 'yoga_classes',
        program: recipient.program,
        status: recipient.status,
        source: 'classbot_recipients_csv',
      },
      {
        operation: 'add_evidence',
        source: 'classbot_delivery_evidence',
        summary: deliverySummary,
      },
    ],
    writePreconditions: [
      'human approval required',
      'card-write-merge-policy must allow operation',
      'no live outbound side effects',
      'for blocked/no-card contacts: resolve duplicate risk before write',
    ],
  };
};

const isAdminRow = (recipient) => {
  const text = normalizeText(recipient.displayName);
  return text === 'alejandro' || text.includes('admin');
};

const buildPacket = async (options) => {
  const classbotRoot = resolve(options.classbotRoot);
  const recipientsCsv = resolve(options.recipientsCsv ?? join(classbotRoot, 'dispatcher/src/recipients.csv'));
  const idempotencyCaches = options.idempotencyCaches.length
    ? options.idempotencyCaches.map((item) => resolve(item))
    : [
      join(classbotRoot, '.idempotency-cache/records.json'),
      join(classbotRoot, 'dispatcher/.idempotency-cache/records.json'),
    ];
  const cardStorePath = resolve(options.cardStorePath);
  const recipients = (await readRecipients(recipientsCsv))
    .filter((recipient) => options.includeAdmin || !isAdminRow(recipient));
  const records = await readIdempotencyRecords(idempotencyCaches);
  const cards = await readCardStore(cardStorePath);
  const contacts = {};
  for (const recipient of recipients) {
    const contactKey = slug(recipient.displayName ?? recipient.phoneLast4);
    const match = matchCards(recipient, cards);
    const primaryCandidate = match.candidates.length === 1 ? match.candidates[0] : null;
    const deliverySummary = summarizeDelivery(records, recipient.phoneNormalized);
    const recommendedAction = primaryCandidate ? 'enrich_existing_card' : 'create_review_card';
    const confidence = primaryCandidate ? match.confidence : 'blocked';
    contacts[contactKey] = {
      contactKey,
      classbot_display_name: recipient.displayName,
      classbot_program: recipient.program,
      classbot_status: recipient.status,
      classbot_timezone: recipient.timezone,
      classbot_phone_last4: recipient.phoneLast4,
      source_row: recipient.sourceRow,
      confidence,
      match_kind: match.matchKind,
      recommended_action: recommendedAction,
      crm_candidate_card: cardPublic(primaryCandidate),
      alternate_candidates: match.candidates.filter((card) => card !== primaryCandidate).map(cardPublic),
      confirmed_facts: {
        participates_in_yoga_classes: true,
        classbot_program: recipient.program,
        classbot_status: recipient.status,
        whatsapp_delivery_channel_present: Boolean(recipient.phoneNormalized),
        delivery_evidence_summary: deliverySummary,
      },
      missing_fields: missingFieldsFor(primaryCandidate),
      questions_for_alejandro: primaryCandidate
        ? confidence === 'medium'
          ? [`Confirmar que ${recipient.displayName} corresponde a ${primaryCandidate.personId}.`]
          : []
        : [`${recipient.displayName}: falta email o Instagram para evitar crear duplicado antes de write.`],
      ready_write_preview: readyWritePreviewFor({
        contactKey,
        recipient,
        card: primaryCandidate,
        deliverySummary,
        confidence,
      }),
    };
  }

  const values = Object.values(contacts);
  const summaryMetrics = {
    contactsProcessed: values.length,
    withCrmCandidate: values.filter((contact) => contact.crm_candidate_card).length,
    withoutCrmCandidate: values.filter((contact) => !contact.crm_candidate_card).length,
    confidenceStrong: values.filter((contact) => contact.confidence === 'strong').length,
    confidenceMedium: values.filter((contact) => contact.confidence === 'medium').length,
    confidenceBlocked: values.filter((contact) => contact.confidence === 'blocked').length,
    actionEnrichExistingCard: values.filter((contact) => contact.recommended_action === 'enrich_existing_card').length,
    actionCreateReviewCard: values.filter((contact) => contact.recommended_action === 'create_review_card').length,
    deliveryRecordsScanned: records.length,
    cardsScanned: cards.length,
  };

  return {
    schema: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode: 'read_only_classbot_yoga_evidence',
    safety: {
      readOnly: true,
      classBotRuntimeTouched: false,
      twilioTouched: false,
      whatsappOutboundExecuted: false,
      crmCardsMutated: false,
      factStoreMutated: false,
      liveApisCalled: false,
      credentialsReadOrPrinted: false,
      manyChatLiveTouched: false,
    },
    sourceFiles: {
      classbotRoot,
      recipientsCsv,
      idempotencyCaches,
      cardStorePath,
    },
    summaryMetrics,
    contacts,
    nextUse: [
      'Apply only strong/enrich_existing_card contacts after explicit approval.',
      'Keep medium contacts in identity review until Alejandro confirms.',
      'Do not create review cards for blocked/no-card contacts until duplicate risk is reduced.',
    ],
  };
};

const markdownFor = (packet) => {
  const contacts = Object.values(packet.contacts);
  const lines = [
    '# CRM vNext ClassBot Yoga Evidence',
    '',
    `Generated: ${packet.generatedAt}`,
    '',
    '## Safety',
    '',
    '- Read-only: yes',
    '- ClassBot/Twilio/WhatsApp runtime touched: no',
    '- CRM/Fact Store writes: no',
    '- Live API calls: no',
    '',
    '## Summary',
    '',
    `- Contacts processed: **${packet.summaryMetrics.contactsProcessed}**`,
    `- With CRM candidate: **${packet.summaryMetrics.withCrmCandidate}**`,
    `- Without CRM candidate: **${packet.summaryMetrics.withoutCrmCandidate}**`,
    `- Strong: **${packet.summaryMetrics.confidenceStrong}**`,
    `- Medium: **${packet.summaryMetrics.confidenceMedium}**`,
    `- Blocked: **${packet.summaryMetrics.confidenceBlocked}**`,
    '',
    '## Contacts',
    '',
    '| Contact | Program | Status | Sent | Last evidence | CRM candidate | Action | Confidence |',
    '|---|---|---|---:|---|---|---|---|',
  ];
  for (const contact of contacts) {
    const delivery = contact.confirmed_facts.delivery_evidence_summary;
    lines.push(`| ${contact.classbot_display_name} | ${contact.classbot_program} | ${contact.classbot_status} | ${delivery.sent ?? 0} | ${delivery.lastTimestamp ?? ''} | ${contact.crm_candidate_card?.personId ?? '-'} | ${contact.recommended_action} | ${contact.confidence} |`);
  }
  lines.push('', '## Next Use', '');
  for (const item of packet.nextUse) lines.push(`- ${item}`);
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const packet = await buildPacket(options);
  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  }
  if (options.markdownOut) {
    const markdownPath = resolve(options.markdownOut);
    await mkdir(dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, markdownFor(packet), 'utf8');
  }
  console.log(JSON.stringify({
    ok: true,
    schema: packet.schema,
    mode: packet.mode,
    summaryMetrics: packet.summaryMetrics,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
  if (options.failOnEmpty && packet.summaryMetrics.contactsProcessed === 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext classbot-yoga-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
