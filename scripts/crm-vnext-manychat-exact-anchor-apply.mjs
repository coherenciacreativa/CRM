#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFile, copyFile, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-manychat-exact-anchor-apply-2026-05-25';
const LEDGER_ENTRY_SCHEMA_VERSION = 'crm-vnext-omnichannel-resolution-apply-ledger-entry-2026-05-25';
const STORE_SCHEMA_VERSION = 'crm-vnext-person-card-store-2026-05-10';
const CARD_SCHEMA_VERSION = 'person-card-vnext-2026-05-08';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_LEDGER_PATH = '.crm-vnext/omnichannel-resolution-apply/ledger.jsonl';
const DEFAULT_BACKUP_DIR = '.crm-vnext/backups/omnichannel-resolution-apply';
const DEFAULT_LOCK_PATH = '.crm-vnext/omnichannel-resolution-apply/write.lock';

const usage = `Usage:
  node scripts/crm-vnext-manychat-exact-anchor-apply.mjs --evidence-file <path> [options]

Options:
  --evidence-file <path>              ManyChat/Instagram exact-anchor evidence JSON
  --item-email <email>                Apply a specific email item. May be repeated
  --apply-all-ready                   Select every ready_for_write_review item
  --include-human-confirmed-candidates
                                      Also allow ready_for_human_confirmation_with_handle_candidate items
                                      after explicit human approval
  --card-store-path <path>            Local vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --ledger-path <path>                Local omnichannel apply ledger. Defaults to ${DEFAULT_LEDGER_PATH}
  --backup-dir <path>                 Backup directory. Defaults to ${DEFAULT_BACKUP_DIR}
  --lock-path <path>                  Write lock path. Defaults to ${DEFAULT_LOCK_PATH}
  --approved-by <name>                Required with --write
  --write                             Commit selected items after backup
  --out <path>                        Write apply report JSON
  --markdown-out <path>               Write compact apply report Markdown
  --fail-on-blocked                   Exit non-zero when any selected item is blocked
  --help                              Show this help

Default mode is dry-run. This command writes only local CRM vNext card-store/ledger files after backup. It never calls live APIs, never sends outbound messages, never writes Fact Store, never touches ManyChat LIVE, and never reads or mutates credentials.`;

const parseArgs = (argv) => {
  const options = {
    evidenceFile: null,
    itemEmails: [],
    applyAllReady: false,
    includeHumanConfirmedCandidates: false,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    ledgerPath: DEFAULT_LEDGER_PATH,
    backupDir: DEFAULT_BACKUP_DIR,
    lockPath: DEFAULT_LOCK_PATH,
    approvedBy: null,
    write: false,
    out: null,
    markdownOut: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--apply-all-ready') options.applyAllReady = true;
    else if (arg === '--include-human-confirmed-candidates') options.includeHumanConfirmedCandidates = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--item-email') options.itemEmails.push(argv[++index]);
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--backup-dir') options.backupDir = argv[++index];
    else if (arg === '--lock-path') options.lockPath = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.evidenceFile) throw new Error('evidence_file_required');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const cleanEmail = (value) => cleanString(value)?.toLowerCase() ?? null;

const cleanHandle = (value) =>
  cleanString(value)?.replace(/^@+/, '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/+$/, '').toLowerCase() ?? null;

const isoNow = (value) => {
  const raw = cleanString(value);
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const unique = (values) => Array.from(new Set(values));

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readPacket = async (filePath) => {
  const parsed = await readJson(filePath);
  const items = Array.isArray(parsed?.items) ? parsed.items : Array.isArray(parsed) ? parsed : [];
  return {
    schema: cleanString(parsed?.schema),
    generatedAt: cleanString(parsed?.generatedAt),
    summary: parsed?.summary ?? null,
    items: items.filter((item) => item && typeof item === 'object'),
  };
};

const readCardStore = async (filePath) => {
  const parsed = await readJson(filePath);
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
  return {
    store: Array.isArray(parsed) ? {
      schemaVersion: STORE_SCHEMA_VERSION,
      generatedAt: new Date().toISOString(),
      base: {
        kind: 'vnext-card-store',
        sourceKind: 'legacy-person-cards-v1-derived',
        cardsBeforeApply: cards.length,
      },
      cards,
      mergeReviewQueue: [],
      provenance: [],
    } : parsed,
    cards,
  };
};

const safeTimestamp = (value) => isoNow(value).replace(/[^0-9]/g, '').slice(0, 14);

const backupIfExists = async (filePath, backupDir, label, generatedAt) => {
  try {
    await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `${safeTimestamp(generatedAt)}.${label}.${basename(filePath)}.bak`,
  );
  await copyFile(filePath, backupPath);
  return backupPath;
};

const acquireWriteLock = async (lockPath, generatedAt) => {
  const resolvedLockPath = resolve(lockPath);
  await mkdir(dirname(resolvedLockPath), { recursive: true });
  let handle = null;
  try {
    handle = await open(resolvedLockPath, 'wx');
    await handle.writeFile(`${JSON.stringify({
      pid: process.pid,
      createdAt: generatedAt,
      purpose: 'crm-vnext-manychat-exact-anchor-apply-local-write',
    })}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`manychat_exact_anchor_apply_write_lock_active:${resolvedLockPath}`);
    }
    throw error;
  } finally {
    if (handle) await handle.close();
  }

  return async () => {
    await rm(resolvedLockPath, { force: true });
  };
};

const defaultProducts = () => ({
  yogaClasses90d: 0,
  happyCircle90d: 0,
  retreatsAttended: 0,
  totalSpend: 0,
  purchaseCount: 0,
  activeClient: false,
});

const defaultScoring = (dataConfidence = 64) => ({
  stage: 'SEMILLA',
  priorityScore: 3,
  commercialWarmth: 0,
  communityDepth: 0,
  relationshipEngagement: 0,
  dataConfidence,
  productFit: {
    yoga: 0,
    mentorship: 0,
    therapy: 0,
    digitalProducts: 0,
    retreats: 0,
  },
  nextBestAction: 'keep_warming',
  reasons: [],
  risks: [],
});

const defaultNextAction = () => ({
  code: 'keep_warming',
  requiresHumanReview: false,
  reason: 'Keep collecting signal before recommending a stronger action.',
});

const emptyChannels = () => ({
  email: { present: false, status: null },
  instagram: { present: false, status: null },
  whatsapp: { present: false, status: null },
  telegram: { present: false, status: null },
});

const buildNewCard = ({ personId, displayName, generatedAt }) => ({
  schemaVersion: CARD_SCHEMA_VERSION,
  personId,
  displayName,
  identities: {
    email: null,
    instagramHandle: null,
    instagramUserId: null,
    phone: null,
    city: null,
    country: null,
  },
  channels: emptyChannels(),
  products: defaultProducts(),
  scoring: defaultScoring(),
  evidence: [],
  nextAction: defaultNextAction(),
  updatedAt: generatedAt,
});

const displayNameFor = (item) => {
  const evidence = item?.evidence ?? {};
  const joinedName = [cleanString(evidence.firstName), cleanString(evidence.lastName)].filter(Boolean).join(' ');
  const manychatProfileName = cleanString(evidence.manychatProfileName);
  return cleanString(evidence.derivedName)
    ?? cleanString(evidence.instagramProfileSearchCorroboration?.candidateDisplayName)
    ?? cleanString(evidence.instagramUiExactSearch?.resultDisplayName)
    ?? manychatProfileName
    ?? cleanString(joinedName)
    ?? cleanString(item?.input?.name);
};

const evidenceHandleFor = (item, options) => {
  const exactHandle = cleanHandle(item?.evidence?.instagramHandle);
  if (exactHandle) return exactHandle;
  if (!options.includeHumanConfirmedCandidates) return null;
  return cleanHandle(item?.evidence?.instagramProfileSearchCorroboration?.candidateHandle);
};

const evidenceSummaryFor = (item, handle) => {
  const evidence = item?.evidence ?? {};
  const location = evidence.location ?? {};
  return {
    inputName: cleanString(item?.input?.name),
    email: cleanEmail(item?.input?.email),
    instagramHandle: handle,
    manychatId: cleanString(item?.input?.manychatId),
    manychatProfileName: cleanString(evidence.manychatProfileName),
    optedInThrough: cleanString(evidence.optedInThrough),
    phone: cleanString(evidence.phone),
    whatsapp: cleanString(evidence.whatsapp),
    city: cleanString(location.city),
    region: cleanString(location.region),
    country: cleanString(location.country),
    locationSource: cleanString(location.source),
    status: cleanString(item?.status),
    confidence: cleanString(item?.confidence),
    interestSignal: cleanString(evidence.interestSignal),
    instagramProfileCorroboration: evidence.instagramProfileSearchCorroboration ? {
      candidateHandle: cleanHandle(evidence.instagramProfileSearchCorroboration.candidateHandle),
      candidateDisplayName: cleanString(evidence.instagramProfileSearchCorroboration.candidateDisplayName),
      followBackVisible: Boolean(evidence.instagramProfileSearchCorroboration.candidateProfileSignals?.followBackVisible),
      profileImageMatchesExactEmailSearchResult: Boolean(
        evidence.instagramProfileSearchCorroboration.candidateProfileSignals?.profileImageMatchesExactEmailSearchResult,
      ),
    } : null,
  };
};

const evidenceNoteFor = (summary) => {
  const parts = [
    `ManyChat/Instagram exact-anchor bridge for ${summary.email}`,
    summary.instagramHandle ? `IG @${summary.instagramHandle}` : null,
    summary.manychatId ? `ManyChat ID ${summary.manychatId}` : null,
    summary.optedInThrough ? `origin ${summary.optedInThrough}` : null,
    summary.city || summary.country ? `location ${[summary.city, summary.region, summary.country].filter(Boolean).join(', ')}` : null,
    summary.phone ? 'phone present in source packet' : null,
    summary.interestSignal ? `signal: ${summary.interestSignal}` : null,
    summary.instagramProfileCorroboration
      ? 'Lorena-style corroboration: exact email in IG DM plus matching profile search signals'
      : null,
  ].filter(Boolean);
  return `${parts.join('; ')}.`;
};

const cardSnapshot = (card) => ({
  displayName: card?.displayName ?? null,
  identities: {
    email: card?.identities?.email ?? null,
    instagramHandle: card?.identities?.instagramHandle ?? null,
    instagramUserId: card?.identities?.instagramUserId ?? null,
    phone: card?.identities?.phone ?? null,
    city: card?.identities?.city ?? null,
    country: card?.identities?.country ?? null,
  },
  channels: card?.channels ?? emptyChannels(),
  evidenceCount: Array.isArray(card?.evidence) ? card.evidence.length : 0,
  updatedAt: card?.updatedAt ?? null,
});

const evidenceKey = (evidence) => JSON.stringify({
  source: cleanString(evidence?.source),
  note: cleanString(evidence?.note),
});

const mergeEvidence = (existing, incoming) => {
  const byKey = new Map();
  for (const item of [...(Array.isArray(existing) ? existing : []), ...incoming]) {
    const source = cleanString(item?.source);
    const note = cleanString(item?.note);
    if (!source || !note) continue;
    byKey.set(evidenceKey(item), {
      source,
      observedAt: cleanString(item?.observedAt),
      note,
    });
  }
  return Array.from(byKey.values()).slice(0, 160);
};

const cardIndexes = (cards) => {
  const byId = new Map();
  const byEmail = new Map();
  const byHandle = new Map();
  for (const card of cards) {
    if (!card?.personId) continue;
    byId.set(card.personId, card);
    const email = cleanEmail(card.identities?.email);
    const handle = cleanHandle(card.identities?.instagramHandle);
    if (email) byEmail.set(email, card);
    if (handle) byHandle.set(handle, card);
  }
  return { byId, byEmail, byHandle };
};

const isSelectable = (item, options) => {
  const status = cleanString(item?.status);
  if (status === 'ready_for_write_review') return true;
  return Boolean(options.includeHumanConfirmedCandidates && status === 'ready_for_human_confirmation_with_handle_candidate');
};

const selectItems = (items, options) => {
  const emails = unique(options.itemEmails.map(cleanEmail).filter(Boolean));
  if (emails.length) return items.filter((item) => emails.includes(cleanEmail(item?.input?.email)));
  if (options.applyAllReady) return items.filter((item) => isSelectable(item, options));
  return items.filter((item) => isSelectable(item, options));
};

const incomingIdentityFor = (item, options) => {
  const location = item?.evidence?.location ?? {};
  return {
    email: cleanEmail(item?.input?.email),
    instagramHandle: evidenceHandleFor(item, options),
    phone: cleanString(item?.evidence?.phone),
    city: cleanString(location.city),
    country: cleanString(location.country),
    whatsapp: cleanString(item?.evidence?.whatsapp),
  };
};

const planItemFor = ({ item, indexes, options, generatedAt, sourceReport }) => {
  const incoming = incomingIdentityFor(item, options);
  const displayName = displayNameFor(item);
  const emailCard = incoming.email ? indexes.byEmail.get(incoming.email) : null;
  const handleCard = incoming.instagramHandle ? indexes.byHandle.get(incoming.instagramHandle) : null;
  const selected = isSelectable(item, options);
  const targetCard = emailCard ?? handleCard ?? null;
  const targetPersonId = targetCard?.personId ?? (incoming.email ? `email:${incoming.email}` : null);
  const blockers = [
    !selected ? `unsupported_status:${cleanString(item?.status) ?? 'missing'}` : null,
    !incoming.email ? 'missing_exact_email_anchor' : null,
    !incoming.instagramHandle ? 'missing_instagram_handle_anchor' : null,
    emailCard && handleCard && emailCard.personId !== handleCard.personId
      ? `identity_collision_email_card:${emailCard.personId}_handle_card:${handleCard.personId}`
      : null,
    targetCard?.identities?.email && incoming.email && cleanEmail(targetCard.identities.email) !== incoming.email
      ? 'existing_email_conflict'
      : null,
    targetCard?.identities?.instagramHandle
      && incoming.instagramHandle
      && cleanHandle(targetCard.identities.instagramHandle) !== incoming.instagramHandle
      ? 'existing_instagram_handle_conflict'
      : null,
    targetCard?.identities?.phone && incoming.phone && cleanString(targetCard.identities.phone) !== incoming.phone
      ? 'existing_phone_conflict'
      : null,
  ].filter(Boolean);
  const status = blockers.length ? 'blocked' : 'ready_to_commit';
  const summary = evidenceSummaryFor(item, incoming.instagramHandle);
  const evidenceToAppend = status === 'ready_to_commit' ? {
    source: 'crm-vnext-manychat-exact-anchor-batch12',
    observedAt: generatedAt,
    note: evidenceNoteFor(summary),
  } : null;

  return {
    applyItemId: `manychat_exact_anchor_apply_${hashId([
      incoming.email,
      incoming.instagramHandle,
      cleanString(item?.input?.manychatId),
    ])}`,
    status,
    input: {
      name: cleanString(item?.input?.name),
      email: incoming.email,
      manychatId: cleanString(item?.input?.manychatId),
    },
    sourceStatus: cleanString(item?.status),
    confidence: cleanString(item?.confidence),
    recommendedAction: cleanString(item?.recommendedAction),
    targetPersonId,
    targetExists: Boolean(targetCard),
    displayName,
    incomingIdentity: incoming,
    existingCardSnapshot: targetCard ? cardSnapshot(targetCard) : null,
    proposedCardSnapshot: null,
    evidenceToAppend,
    sourceEvidenceSummary: summary,
    changedFields: [],
    blockers,
    sourceReport,
  };
};

const mergeIdentityValue = ({ current, incoming, changedFields, fieldPath }) => {
  if (!incoming) return current ?? null;
  if (!current) {
    changedFields.push(fieldPath);
    return incoming;
  }
  return current;
};

const applyItemToCard = ({ item, currentCard, generatedAt }) => {
  const changedFields = [];
  const card = currentCard
    ? structuredClone(currentCard)
    : buildNewCard({
      personId: item.targetPersonId,
      displayName: item.displayName,
      generatedAt,
    });

  if (!currentCard) changedFields.push('card');
  if (!card.displayName && item.displayName) {
    card.displayName = item.displayName;
    changedFields.push('displayName');
  }

  card.identities = {
    email: mergeIdentityValue({
      current: cleanEmail(card.identities?.email),
      incoming: item.incomingIdentity.email,
      changedFields,
      fieldPath: 'identities.email',
    }),
    instagramHandle: mergeIdentityValue({
      current: cleanHandle(card.identities?.instagramHandle),
      incoming: item.incomingIdentity.instagramHandle,
      changedFields,
      fieldPath: 'identities.instagramHandle',
    }),
    instagramUserId: cleanString(card.identities?.instagramUserId),
    phone: mergeIdentityValue({
      current: cleanString(card.identities?.phone),
      incoming: item.incomingIdentity.phone,
      changedFields,
      fieldPath: 'identities.phone',
    }),
    city: mergeIdentityValue({
      current: cleanString(card.identities?.city),
      incoming: item.incomingIdentity.city,
      changedFields,
      fieldPath: 'identities.city',
    }),
    country: mergeIdentityValue({
      current: cleanString(card.identities?.country),
      incoming: item.incomingIdentity.country,
      changedFields,
      fieldPath: 'identities.country',
    }),
  };

  card.channels = {
    ...emptyChannels(),
    ...(card.channels ?? {}),
    email: {
      present: true,
      status: card.channels?.email?.status ?? 'official_flow_confirmed',
    },
    instagram: {
      present: true,
      status: card.channels?.instagram?.status ?? 'official_flow_exact_anchor',
    },
    whatsapp: {
      present: Boolean(card.channels?.whatsapp?.present || item.incomingIdentity.whatsapp),
      status: card.channels?.whatsapp?.status ?? (item.incomingIdentity.whatsapp ? 'known' : null),
    },
  };
  changedFields.push('channels.email', 'channels.instagram');
  if (item.incomingIdentity.whatsapp) changedFields.push('channels.whatsapp');

  card.products = card.products ?? defaultProducts();
  card.scoring = card.scoring ?? defaultScoring();
  card.nextAction = card.nextAction ?? defaultNextAction();
  card.evidence = mergeEvidence(card.evidence, [item.evidenceToAppend]);
  changedFields.push('evidence', 'updatedAt');
  card.updatedAt = generatedAt;

  return {
    card,
    changedFields: unique(changedFields),
  };
};

const buildReport = ({ packet, cards, options, generatedAt, sourceReport }) => {
  const indexes = cardIndexes(cards);
  const selectedItems = selectItems(packet.items, options);
  const planItems = selectedItems.map((item) =>
    planItemFor({ item, indexes, options, generatedAt, sourceReport }));
  const commitBlockers = [
    options.write && !cleanString(options.approvedBy) ? 'approved_by_required_for_commit' : null,
    options.write && !options.applyAllReady && options.itemEmails.length === 0
      ? 'explicit_item_email_or_apply_all_ready_required_for_commit'
      : null,
    options.write && planItems.length === 0 ? 'no_selected_items' : null,
    ...planItems.flatMap((item) => item.blockers),
  ].filter(Boolean);
  const readyItems = planItems.filter((item) => item.status === 'ready_to_commit');
  const committed = Boolean(options.write && commitBlockers.length === 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_manychat_exact_anchor_apply' : 'dry_run_manychat_exact_anchor_apply',
    committed,
    source: {
      reportPath: sourceReport,
      reportSchema: packet.schema,
      reportGeneratedAt: packet.generatedAt,
      reportSummary: packet.summary,
    },
    selection: {
      itemEmails: unique(options.itemEmails.map(cleanEmail).filter(Boolean)),
      applyAllReady: Boolean(options.applyAllReady),
      includeHumanConfirmedCandidates: Boolean(options.includeHumanConfirmedCandidates),
    },
    summary: {
      sourceItems: packet.items.length,
      selectedItems: planItems.length,
      readyToCommit: readyItems.length,
      blockedItems: planItems.filter((item) => item.status !== 'ready_to_commit').length,
      existingCardsToEnrich: readyItems.filter((item) => item.targetExists).length,
      newCardsToCreate: readyItems.filter((item) => !item.targetExists).length,
      operationsPlanned: readyItems.length,
      operationsExecuted: committed ? readyItems.length : 0,
      committed,
      commitBlocked: Boolean(options.write && commitBlockers.length),
      commitBlockers: unique(commitBlockers),
    },
    planItems,
    write: {
      cardStoreWritten: false,
      backupCreated: false,
      backupPath: null,
      writeLockAcquired: false,
      ledgerWritten: false,
      ledgerEntries: 0,
    },
    safety: {
      localOnly: true,
      outboundProhibited: true,
      factStoreWriteProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
      manyChatLiveMutationProhibited: true,
      instagramMutationProhibited: true,
      requiresApprovedByForCommit: true,
      requiresExplicitSelectionForCommit: true,
      backupRequiredForCommit: true,
      allowedUse: [
        'Apply exact-anchor ManyChat/Instagram evidence to local CRM vNext cards.',
        'Create local cards only when email and Instagram are both strongly anchored.',
        'Preserve medium or variant-conflict candidates as review-only.',
      ],
      prohibitedActions: [
        'Do not send outbound messages.',
        'Do not write Fact Store.',
        'Do not call live APIs or browser UI.',
        'Do not mutate ManyChat LIVE, Instagram, Gmail, MailerLite, Drive, Contacts, WhatsApp, or Telegram.',
        'Do not read, print, rotate, or mutate credentials.',
        'Do not promote name-only Instagram candidates.',
      ],
    },
  };
};

const ledgerEntryFor = ({ item, before, after, approvedBy, committedAt }) => ({
  schemaVersion: LEDGER_ENTRY_SCHEMA_VERSION,
  ledgerEntryId: `omnichannel_resolution_apply_${hashId([
    item.applyItemId,
    item.targetPersonId,
    committedAt,
  ])}`,
  committedAt,
  committedBy: approvedBy,
  source: 'manychat_exact_anchor_batch12_20260525',
  sourceReport: item.sourceReport,
  targetPersonId: item.targetPersonId,
  mutationKind: item.targetExists
    ? 'enrich_manychat_instagram_exact_anchor_bridge'
    : 'create_manychat_instagram_exact_anchor_card',
  changedFields: item.changedFields,
  before,
  after,
  sourceEvidenceSummary: item.sourceEvidenceSummary,
  safety: {
    outboundExecuted: false,
    factStoreWriteExecuted: false,
    liveApiCallsExecuted: false,
    credentialReadExecuted: false,
    externalMutationsExecuted: false,
  },
});

const applyReportToStore = ({ store, report, approvedBy }) => {
  const cards = Array.isArray(store?.cards) ? store.cards : [];
  const indexes = cardIndexes(cards);
  const cardsById = new Map(cards.map((card) => [card.personId, card]));
  const ledgerEntries = [];
  const updatedPlanItems = [];

  for (const item of report.planItems) {
    if (item.status !== 'ready_to_commit') {
      updatedPlanItems.push(item);
      continue;
    }
    const currentCard = cardsById.get(item.targetPersonId) ?? null;
    const before = currentCard ? cardSnapshot(currentCard) : null;
    const applied = applyItemToCard({
      item,
      currentCard,
      generatedAt: report.generatedAt,
    });
    cardsById.set(item.targetPersonId, applied.card);
    indexes.byId.set(item.targetPersonId, applied.card);
    if (applied.card.identities.email) indexes.byEmail.set(applied.card.identities.email, applied.card);
    if (applied.card.identities.instagramHandle) indexes.byHandle.set(applied.card.identities.instagramHandle, applied.card);
    const after = cardSnapshot(applied.card);
    const updatedItem = {
      ...item,
      changedFields: applied.changedFields,
      proposedCardSnapshot: after,
    };
    ledgerEntries.push(ledgerEntryFor({
      item: updatedItem,
      before,
      after,
      approvedBy,
      committedAt: report.generatedAt,
    }));
    updatedPlanItems.push(updatedItem);
  }

  const nextStore = {
    ...store,
    generatedAt: report.generatedAt,
    cards: Array.from(cardsById.values()).sort((a, b) => a.personId.localeCompare(b.personId)),
    provenance: [
      ...(Array.isArray(store?.provenance) ? store.provenance : []),
      ...ledgerEntries.map((entry) => ({
        provenanceId: `manychat_exact_anchor_apply_provenance_${hashId([entry.ledgerEntryId])}`,
        targetPersonId: entry.targetPersonId,
        approvedBy,
        approvedAt: report.generatedAt,
        mutationKind: entry.mutationKind,
        source: entry.source,
        sourceReport: entry.sourceReport,
        safety: entry.safety,
      })),
    ],
  };

  return {
    store: nextStore,
    ledgerEntries,
    planItems: updatedPlanItems,
  };
};

const run = async (options) => {
  const generatedAt = new Date().toISOString();
  const packet = await readPacket(options.evidenceFile);
  const sourceReport = resolve(options.evidenceFile);
  const { store, cards } = await readCardStore(options.cardStorePath);
  let report = buildReport({ packet, cards, options, generatedAt, sourceReport });

  if (report.committed) {
    const releaseLock = await acquireWriteLock(options.lockPath, generatedAt);
    try {
      const fresh = await readCardStore(options.cardStorePath);
      report = buildReport({
        packet,
        cards: fresh.cards,
        options,
        generatedAt,
        sourceReport,
      });
      report.write.writeLockAcquired = true;
      if (!report.committed) return report;

      const cardStorePath = resolve(options.cardStorePath);
      const backupPath = await backupIfExists(
        cardStorePath,
        resolve(options.backupDir),
        'manychat-exact-anchor-batch12',
        report.generatedAt,
      );
      const applied = applyReportToStore({
        store: fresh.store,
        report,
        approvedBy: cleanString(options.approvedBy),
      });
      report.planItems = applied.planItems;
      await mkdir(dirname(cardStorePath), { recursive: true });
      await writeFile(cardStorePath, `${JSON.stringify(applied.store, null, 2)}\n`, 'utf8');
      if (applied.ledgerEntries.length) {
        const ledgerPath = resolve(options.ledgerPath);
        await mkdir(dirname(ledgerPath), { recursive: true });
        await appendFile(ledgerPath, `${applied.ledgerEntries.map((entry) => JSON.stringify(entry)).join('\n')}\n`, 'utf8');
      }
      report.write = {
        cardStoreWritten: true,
        backupCreated: Boolean(backupPath),
        backupPath,
        writeLockAcquired: true,
        ledgerWritten: applied.ledgerEntries.length > 0,
        ledgerEntries: applied.ledgerEntries.length,
      };
    } finally {
      await releaseLock();
    }
  }

  return report;
};

const markdownFor = (report) => {
  const lines = [
    '# CRM vNext ManyChat Exact-Anchor Apply',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Committed: ${report.committed ? 'yes' : 'no'}`,
    '',
    '## Summary',
    '',
    `- Selected items: ${report.summary.selectedItems}`,
    `- Ready/applied items: ${report.summary.readyToCommit}`,
    `- Existing cards enriched: ${report.summary.existingCardsToEnrich}`,
    `- New cards created: ${report.summary.newCardsToCreate}`,
    `- Blocked items: ${report.summary.blockedItems}`,
    `- Operations executed: ${report.summary.operationsExecuted}`,
    `- Backup: ${report.write.backupPath ?? 'none'}`,
    '',
    '## Applied / Planned Items',
    '',
    ...report.planItems.map((item) => [
      `### ${item.displayName ?? item.input.name ?? item.input.email}`,
      '',
      `- Status: ${item.status}`,
      `- Target: ${item.targetPersonId ?? 'none'}`,
      `- Email: ${item.input.email ?? 'none'}`,
      `- Instagram: ${item.incomingIdentity.instagramHandle ? `@${item.incomingIdentity.instagramHandle}` : 'none'}`,
      `- ManyChat ID: ${item.input.manychatId ?? 'none'}`,
      `- Location: ${[item.incomingIdentity.city, item.sourceEvidenceSummary.region, item.incomingIdentity.country].filter(Boolean).join(', ') || 'none'}`,
      `- Changed fields: ${item.changedFields.length ? item.changedFields.join(', ') : 'none'}`,
      item.blockers.length ? `- Blockers: ${item.blockers.join(', ')}` : null,
      '',
    ].filter(Boolean).join('\n')).join('\n'),
    '## Safety',
    '',
    '- Local CRM card-store and ledger only.',
    '- No outbound, no Fact Store writes, no live API calls, no credential access.',
    '- Name-only Instagram candidates remain blocked/review-only.',
    '',
  ];
  return `${lines.join('\n')}\n`;
};

const compactReport = (report) => ({
  ok: true,
  mode: report.mode,
  generatedAt: report.generatedAt,
  committed: report.committed,
  summary: report.summary,
  applied: report.planItems
    .filter((item) => item.status === 'ready_to_commit')
    .map((item) => ({
      targetPersonId: item.targetPersonId,
      email: item.input.email,
      instagramHandle: item.incomingIdentity.instagramHandle,
      targetExists: item.targetExists,
      changedFields: item.changedFields,
    })),
  blocked: report.planItems
    .filter((item) => item.status !== 'ready_to_commit')
    .map((item) => ({
      email: item.input.email,
      status: item.status,
      blockers: item.blockers,
    })),
  write: {
    ...report.write,
    backupPath: report.write.backupPath ? '[local-backup-path]' : null,
  },
  safety: report.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await run(options);
  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  if (options.markdownOut) {
    const markdownPath = resolve(options.markdownOut);
    await mkdir(dirname(markdownPath), { recursive: true });
    await writeFile(markdownPath, markdownFor(report), 'utf8');
  }
  console.log(JSON.stringify(compactReport(report), null, 2));

  if (
    options.failOnBlocked
    && (
      report.summary.commitBlocked
      || report.summary.blockedItems > 0
      || report.summary.readyToCommit !== report.summary.selectedItems
    )
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext manychat exact-anchor apply failed: ${error.message}`);
  process.exitCode = 1;
});
