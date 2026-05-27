#!/usr/bin/env node
import { appendFile, copyFile, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-bhakti-whatsapp-apply-2026-05-27';
const STORE_SCHEMA_VERSION = 'crm-vnext-person-card-store-2026-05-10';
const CARD_SCHEMA_VERSION = 'person-card-vnext-2026-05-08';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_LEDGER_PATH = '.crm-vnext/bhakti-whatsapp-apply/ledger.jsonl';
const DEFAULT_BACKUP_DIR = '.crm-vnext/backups/bhakti-whatsapp-apply';
const DEFAULT_LOCK_PATH = '.crm-vnext/bhakti-whatsapp-apply/write.lock';

const usage = `Usage:
  node scripts/crm-vnext-bhakti-whatsapp-apply.mjs --evidence-file <path> [options]

Options:
  --evidence-file <path>       Bhakti WhatsApp evidence adapter JSON
  --apply-all-ready            Select every ready_for_write_review item
  --item-email <email>         Apply only a specific email. May be repeated
  --card-store-path <path>     Local vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --ledger-path <path>         Local append-only receipt ledger. Defaults to ${DEFAULT_LEDGER_PATH}
  --backup-dir <path>          Backup directory. Defaults to ${DEFAULT_BACKUP_DIR}
  --lock-path <path>           Write lock path. Defaults to ${DEFAULT_LOCK_PATH}
  --approved-by <name>         Required with --write
  --write                      Commit selected local card writes after backup
  --out <path>                 Write apply report JSON
  --markdown-out <path>        Write compact Markdown report
  --fail-on-blocked            Exit non-zero if selected items are blocked
  --help                       Show this help

Default mode is dry-run. This command writes only local CRM card-store/ledger files after explicit
approval. It never calls Bhakti/Supabase, Twilio, WhatsApp, MailerLite, Fact Store, or outbound channels.`;

const parseArgs = (argv) => {
  const options = {
    evidenceFile: null,
    applyAllReady: false,
    itemEmails: [],
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
    else if (arg === '--apply-all-ready') options.applyAllReady = true;
    else if (arg === '--write') options.write = true;
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
  if (options.write && !cleanString(options.approvedBy)) throw new Error('approved_by_required_for_write');
  if (!options.help && !options.applyAllReady && options.itemEmails.length === 0) {
    throw new Error('select_items_with_apply_all_ready_or_item_email');
  }
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const cleanEmail = (value) => cleanString(value)?.toLowerCase() ?? null;
const phoneDigits = (value) => cleanString(value)?.replace(/\D/g, '') ?? '';
const phoneKey = (value) => {
  const digits = phoneDigits(value);
  return digits.length > 10 ? digits.slice(-10) : digits;
};
const isoNow = (value) => {
  const raw = cleanString(value);
  const date = raw ? new Date(raw) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};
const safeTimestamp = (value) => isoNow(value).replace(/[^0-9]/g, '').slice(0, 14);

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath, value) => {
  const resolved = resolve(filePath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (filePath, value) => {
  const resolved = resolve(filePath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, value, 'utf8');
};

const readCardStore = async (filePath) => {
  const parsed = await readJson(filePath);
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
  return {
    store: Array.isArray(parsed)
      ? {
        schemaVersion: STORE_SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        base: { kind: 'vnext-card-store', sourceKind: 'previous-vnext-card-store', cardsBeforeApply: cards.length },
        cards,
        mergeReviewQueue: [],
        provenance: [],
      }
      : parsed,
    cards,
  };
};

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
  const resolved = resolve(lockPath);
  await mkdir(dirname(resolved), { recursive: true });
  let handle = null;
  try {
    handle = await open(resolved, 'wx');
    await handle.writeFile(`${JSON.stringify({ pid: process.pid, createdAt: generatedAt, purpose: 'crm-vnext-bhakti-whatsapp-apply' })}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(`bhakti_whatsapp_apply_write_lock_active:${resolved}`);
    throw error;
  } finally {
    if (handle) await handle.close();
  }
  return async () => rm(resolved, { force: true });
};

const defaultProducts = () => ({
  yogaClasses90d: 0,
  happyCircle90d: 0,
  retreatsAttended: 0,
  totalSpend: 0,
  purchaseCount: 0,
  activeClient: false,
});

const defaultScoring = () => ({
  stage: 'SEMILLA',
  priorityScore: 3,
  commercialWarmth: 0,
  communityDepth: 0,
  relationshipEngagement: 0,
  dataConfidence: 64,
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

const normalizeStore = (store, generatedAt) => ({
  schemaVersion: store.schemaVersion ?? STORE_SCHEMA_VERSION,
  generatedAt,
  base: store.base ?? { kind: 'vnext-card-store', sourceKind: 'previous-vnext-card-store' },
  cards: Array.isArray(store.cards) ? store.cards : [],
  mergeReviewQueue: Array.isArray(store.mergeReviewQueue) ? store.mergeReviewQueue : [],
  provenance: Array.isArray(store.provenance) ? store.provenance : [],
});

const cardIndexes = (cards) => {
  const byPersonId = new Map();
  const byEmail = new Map();
  const byPhone = new Map();
  for (const card of cards) {
    if (card?.personId) byPersonId.set(card.personId, card);
    const email = cleanEmail(card?.identities?.email);
    const phone = phoneKey(card?.identities?.phone);
    if (email) byEmail.set(email, [...(byEmail.get(email) ?? []), card]);
    if (phone) byPhone.set(phone, [...(byPhone.get(phone) ?? []), card]);
  }
  return { byPersonId, byEmail, byPhone };
};

const selectedItems = (packet, options) => {
  const ready = Array.isArray(packet.readyWriteItems) ? packet.readyWriteItems : [];
  if (options.applyAllReady) return ready;
  const emails = new Set(options.itemEmails.map(cleanEmail).filter(Boolean));
  return ready.filter((item) => emails.has(cleanEmail(item?.identity?.email)));
};

const evidenceNoteFor = (item, generatedAt) => ({
  source: 'bhakti_whatsapp.users',
  observedAt: item.bhaktiState?.latestActivityAt ?? generatedAt,
  note: `Bhakti WhatsApp: status=${item.bhaktiState?.status ?? 'unknown'}, day_index=${item.bhaktiState?.dayIndex ?? 'n/a'}, phone_last4=${item.identity?.phoneLast4 ?? 'n/a'}.`,
});

const applyExistingEnrichment = ({ item, indexes, generatedAt }) => {
  const personId = item.readyWritePreview?.target?.personId;
  const card = indexes.byPersonId.get(personId);
  if (!card) return { status: 'blocked', reason: 'target_card_not_found', item };
  const incomingEmail = cleanEmail(item.identity?.email);
  const incomingPhone = cleanString(item.identity?.phone);
  const existingEmail = cleanEmail(card.identities?.email);
  const existingPhone = cleanString(card.identities?.phone);

  if (incomingEmail && existingEmail && incomingEmail !== existingEmail) {
    return { status: 'blocked', reason: 'email_conflict_on_recheck', item, personId };
  }
  if (incomingPhone && existingPhone && phoneKey(incomingPhone) !== phoneKey(existingPhone)) {
    return { status: 'blocked', reason: 'phone_conflict_on_recheck', item, personId };
  }

  const changedFields = [];
  if (incomingEmail && !existingEmail) {
    card.identities.email = incomingEmail;
    card.channels.email = { present: true, status: 'known' };
    changedFields.push('identities.email', 'channels.email');
  }
  if (incomingPhone && !existingPhone) {
    card.identities.phone = incomingPhone;
    card.channels.whatsapp = { present: true, status: 'known' };
    changedFields.push('identities.phone', 'channels.whatsapp');
  } else if (incomingPhone && existingPhone && !card.channels?.whatsapp?.present) {
    card.channels.whatsapp = { present: true, status: 'known' };
    changedFields.push('channels.whatsapp');
  }
  card.evidence = [...(Array.isArray(card.evidence) ? card.evidence : []), evidenceNoteFor(item, generatedAt)];
  card.updatedAt = generatedAt;
  changedFields.push('evidence', 'updatedAt');

  return {
    status: 'ready_to_commit',
    operation: 'enrich_existing_card',
    personId,
    email: incomingEmail,
    changedFields,
  };
};

const buildNewCard = (item, generatedAt) => {
  const email = cleanEmail(item.identity?.email);
  const phone = cleanString(item.identity?.phone);
  const channels = emptyChannels();
  channels.email = { present: Boolean(email), status: email ? 'known' : null };
  channels.whatsapp = { present: Boolean(phone), status: phone ? 'known' : null };
  return {
    schemaVersion: CARD_SCHEMA_VERSION,
    personId: `email:${email}`,
    displayName: cleanString(item.identity?.displayName),
    identities: {
      email,
      instagramHandle: null,
      instagramUserId: null,
      phone,
      city: null,
      country: null,
    },
    channels,
    products: defaultProducts(),
    scoring: defaultScoring(),
    evidence: [evidenceNoteFor(item, generatedAt)],
    nextAction: defaultNextAction(),
    updatedAt: generatedAt,
  };
};

const applyNewCard = ({ item, store, indexes, generatedAt }) => {
  const email = cleanEmail(item.identity?.email);
  const phone = cleanString(item.identity?.phone);
  if (!email || !phone) return { status: 'blocked', reason: 'missing_email_or_phone_for_new_card', item };
  if ((indexes.byEmail.get(email) ?? []).length) return { status: 'blocked', reason: 'email_now_exists_on_recheck', item };
  if ((indexes.byPhone.get(phoneKey(phone)) ?? []).length) return { status: 'blocked', reason: 'phone_now_exists_on_recheck', item };

  const card = buildNewCard(item, generatedAt);
  store.cards.push(card);
  indexes.byPersonId.set(card.personId, card);
  indexes.byEmail.set(email, [card]);
  indexes.byPhone.set(phoneKey(phone), [card]);
  return {
    status: 'ready_to_commit',
    operation: 'create_review_card',
    personId: card.personId,
    email,
    changedFields: ['card'],
  };
};

const buildReport = async (options) => {
  const generatedAt = new Date().toISOString();
  const packet = await readJson(options.evidenceFile);
  const { store } = await readCardStore(options.cardStorePath);
  const nextStore = normalizeStore(JSON.parse(JSON.stringify(store)), generatedAt);
  const indexes = cardIndexes(nextStore.cards);
  const selected = selectedItems(packet, options);
  const planned = [];
  const blocked = [];

  for (const item of selected) {
    const action = item.readyWritePreview?.recommendedAction;
    const result = action === 'enrich_existing_card'
      ? applyExistingEnrichment({ item, indexes, generatedAt })
      : action === 'stage_create_review_card'
        ? applyNewCard({ item, store: nextStore, indexes, generatedAt })
        : { status: 'blocked', reason: `unsupported_action:${action}`, item };
    if (result.status === 'ready_to_commit') planned.push(result);
    else blocked.push(result);
  }

  const committed = options.write && blocked.length === 0;
  let backupPath = null;
  let unlock = null;
  if (committed) {
    unlock = await acquireWriteLock(options.lockPath, generatedAt);
    try {
      backupPath = await backupIfExists(options.cardStorePath, options.backupDir, 'bhakti-whatsapp-apply', generatedAt);
      await writeJson(options.cardStorePath, nextStore);
      await mkdir(dirname(resolve(options.ledgerPath)), { recursive: true });
      await appendFile(resolve(options.ledgerPath), `${JSON.stringify({
        schemaVersion: 'crm-vnext-bhakti-whatsapp-apply-ledger-entry-2026-05-27',
        generatedAt,
        evidenceFile: resolve(options.evidenceFile),
        approvedBy: cleanString(options.approvedBy),
        selected: selected.length,
        committed: planned.length,
        backupPath,
        operations: planned,
      })}\n`, 'utf8');
    } finally {
      if (unlock) await unlock();
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_bhakti_whatsapp_card_apply' : 'dry_run_bhakti_whatsapp_card_apply',
    committed,
    source: {
      evidenceFile: resolve(options.evidenceFile),
      cardStorePath: resolve(options.cardStorePath),
      ledgerPath: resolve(options.ledgerPath),
      backupPath,
    },
    summary: {
      selected: selected.length,
      readyToCommit: planned.length,
      blocked: blocked.length,
      existingEnrichments: planned.filter((item) => item.operation === 'enrich_existing_card').length,
      newReviewCards: planned.filter((item) => item.operation === 'create_review_card').length,
      cardsBefore: Array.isArray(store.cards) ? store.cards.length : 0,
      cardsAfterIfCommitted: nextStore.cards.length,
      operationsExecuted: committed ? planned.length : 0,
      externalMutationsExecuted: 0,
    },
    plannedOperations: planned,
    blocked,
    safety: {
      localCardStoreOnly: true,
      dryRunByDefault: true,
      supabaseCallsExecuted: false,
      twilioCallsExecuted: false,
      whatsappOutboundExecuted: false,
      mailerLiteMutationsExecuted: false,
      factStoreWritesExecuted: false,
      crmCardWritesExecuted: committed,
      credentialsPrinted: false,
    },
  };
};

const markdownFor = (report) => {
  const lines = [
    '# CRM vNext Bhakti WhatsApp Apply Dry Run',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Mode: ${report.mode}`,
    `- Selected: **${report.summary.selected}**`,
    `- Ready to commit: **${report.summary.readyToCommit}**`,
    `- Blocked: **${report.summary.blocked}**`,
    `- Existing enrichments: **${report.summary.existingEnrichments}**`,
    `- New review cards: **${report.summary.newReviewCards}**`,
    `- Operations executed: **${report.summary.operationsExecuted}**`,
    '',
    '## Planned Operations',
    '',
    '| Operation | Person | Email | Fields |',
    '|---|---|---|---|',
  ];
  for (const op of report.plannedOperations.slice(0, 100)) {
    lines.push(`| ${op.operation} | ${op.personId} | ${op.email ?? '-'} | ${(op.changedFields ?? []).join(', ')} |`);
  }
  if (report.blocked.length) {
    lines.push('', '## Blocked', '');
    for (const item of report.blocked) lines.push(`- ${item.reason ?? 'blocked'}: ${item.item?.identity?.email ?? item.personId ?? '-'}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- Dry-run by default.');
  lines.push('- Local card-store write only with explicit approval.');
  lines.push('- No external APIs, outbound, Supabase mutation, MailerLite mutation, or Fact Store write.');
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  const report = await buildReport(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, markdownFor(report));
  console.log(JSON.stringify({
    ok: true,
    schemaVersion: report.schemaVersion,
    mode: report.mode,
    committed: report.committed,
    summary: report.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
  if (options.failOnBlocked && report.summary.blocked > 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext bhakti-whatsapp-apply failed: ${error.message}`);
  process.exitCode = 1;
});
