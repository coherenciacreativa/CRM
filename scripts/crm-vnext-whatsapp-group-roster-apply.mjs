#!/usr/bin/env node
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  cleanEmail,
  normalizePhone,
  phoneDigits,
  phoneKey,
} from '../lib/crm/crm-vnext-whatsapp-group-roster-evidence.js';

const DEFAULT_CARD_STORE = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_BACKUP_DIR = '.crm-vnext/backups/whatsapp-group-roster-apply';
const DEFAULT_LEDGER_PATH = '.crm-vnext/whatsapp-group-roster-apply/ledger.jsonl';
const DEFAULT_LOCK_PATH = '.crm-vnext/whatsapp-group-roster-apply/write.lock';

const usage = `Usage:
  node scripts/crm-vnext-whatsapp-group-roster-apply.mjs --evidence-file <path> [options]

Options:
  --evidence-file <path>      WhatsApp group roster evidence packet
  --card-store <path>         Defaults to ${DEFAULT_CARD_STORE}
  --apply-ready-existing      Apply existing-card enrichments. Default true.
  --write                     Commit local card-store writes. Omitted = dry-run.
  --approved-by <name>        Required with --write.
  --out <path>                JSON output path
  --markdown-out <path>       Markdown output path
  --backup-dir <path>         Defaults to ${DEFAULT_BACKUP_DIR}
  --ledger-path <path>        Defaults to ${DEFAULT_LEDGER_PATH}
  --lock-path <path>          Defaults to ${DEFAULT_LOCK_PATH}
  --fail-on-blocked           Non-zero exit if any item is blocked
  --help                      Show help

Local CRM card-store writer only. It never sends WhatsApp messages, mutates WhatsApp groups,
mutates Contacts, writes Fact Store, mutates external systems, or creates outbound actions.`;

const parseArgs = (argv) => {
  const options = {
    evidenceFile: null,
    cardStore: DEFAULT_CARD_STORE,
    backupDir: DEFAULT_BACKUP_DIR,
    ledgerPath: DEFAULT_LEDGER_PATH,
    lockPath: DEFAULT_LOCK_PATH,
    applyReadyExisting: true,
    write: false,
    approvedBy: null,
    out: null,
    markdownOut: null,
    failOnBlocked: false,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--card-store') options.cardStore = argv[++index];
    else if (arg === '--backup-dir') options.backupDir = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--lock-path') options.lockPath = argv[++index];
    else if (arg === '--apply-ready-existing') options.applyReadyExisting = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else throw new Error(`unknown_arg:${arg}`);
  }
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const asCards = (store) => Array.isArray(store) ? store : Array.isArray(store?.cards) ? store.cards : [];

const isoNow = () => new Date().toISOString();

const hashId = (parts) =>
  createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex').slice(0, 16);

const ensureDir = async (path) => mkdir(path, { recursive: true });

const backupIfExists = async (path, backupDir, label, generatedAt) => {
  const source = resolve(path);
  const backupBase = resolve(backupDir);
  await ensureDir(backupBase);
  const safeDate = generatedAt.replace(/\D/g, '').slice(0, 14);
  const target = resolve(backupBase, `${safeDate}.${label}.person-cards-vnext.json.bak`);
  await writeFile(target, await readFile(source));
  return target;
};

const acquireLock = async (lockPath) => {
  const resolved = resolve(lockPath);
  await ensureDir(dirname(resolved));
  try {
    await writeFile(resolved, `${JSON.stringify({ pid: process.pid, createdAt: isoNow(), purpose: 'crm-vnext-whatsapp-group-roster-apply' })}\n`, { flag: 'wx' });
  } catch (error) {
    if (error?.code === 'EEXIST') throw new Error(`whatsapp_group_roster_apply_write_lock_active:${resolved}`);
    throw error;
  }
  return async () => {
    await rm(resolved, { force: true });
  };
};

const buildIndexes = (cards) => {
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

const publicCard = (card) => card ? {
  personId: card.personId ?? null,
  displayName: card.displayName ?? null,
  email: card.identities?.email ?? null,
  phone: card.identities?.phone ?? null,
  whatsappPresent: Boolean(card.channels?.whatsapp?.present),
} : null;

const evidenceAlreadyPresent = (card, evidence) => {
  const summary = evidence.summary ?? evidence.note ?? '';
  return (card.evidence ?? []).some((item) =>
    item?.source === evidence.source
    && item?.observedAt === evidence.observedAt
    && (item?.note === summary || item?.summary === summary));
};

const planItem = ({ item, indexes }) => {
  const preview = item.readyWritePreview;
  if (preview?.status !== 'ready_for_write_review' || preview.recommendedAction !== 'enrich_existing_card') {
    return {
      contactKey: item.contactKey,
      status: 'skipped',
      reason: 'not_ready_existing_enrichment',
      operations: [],
    };
  }

  const personId = preview.target?.personId;
  const card = personId ? indexes.byPersonId.get(personId) : null;
  if (!card) {
    return {
      contactKey: item.contactKey,
      status: 'blocked',
      reason: 'target_card_missing',
      target: { personId },
      operations: [],
    };
  }

  const operations = [];
  const blockers = [];
  for (const op of preview.operations ?? []) {
    if (op.operation === 'set_identity_phone_if_absent') {
      const incoming = normalizePhone(op.value);
      const current = normalizePhone(card.identities?.phone);
      const matches = incoming ? indexes.byPhone.get(phoneKey(incoming)) ?? [] : [];
      const conflict = matches.find((candidate) => candidate.personId !== card.personId);
      if (!incoming) blockers.push('invalid_incoming_phone');
      else if (current) operations.push({ ...op, status: 'noop_existing_phone', existingValue: current });
      else if (conflict) blockers.push(`phone_belongs_to_other_card:${conflict.personId}`);
      else operations.push({ ...op, value: incoming, status: 'ready' });
    } else if (op.operation === 'set_identity_email_if_absent') {
      const incoming = cleanEmail(op.value);
      const current = cleanEmail(card.identities?.email);
      const matches = incoming ? indexes.byEmail.get(incoming) ?? [] : [];
      const conflict = matches.find((candidate) => candidate.personId !== card.personId);
      if (!incoming) blockers.push('invalid_incoming_email');
      else if (current) operations.push({ ...op, status: 'noop_existing_email', existingValue: current });
      else if (conflict) blockers.push(`email_belongs_to_other_card:${conflict.personId}`);
      else operations.push({ ...op, value: incoming, status: 'ready' });
    } else if (op.operation === 'mark_whatsapp_channel_present') {
      if (card.channels?.whatsapp?.present) operations.push({ ...op, status: 'noop_whatsapp_already_present' });
      else operations.push({ ...op, status: 'ready' });
    } else if (op.operation === 'add_evidence') {
      if (evidenceAlreadyPresent(card, op)) operations.push({ ...op, status: 'noop_evidence_already_present' });
      else operations.push({ ...op, status: 'ready' });
    }
  }

  if (blockers.length) {
    return {
      contactKey: item.contactKey,
      status: 'blocked',
      reason: blockers.join(';'),
      target: publicCard(card),
      operations,
    };
  }

  return {
    contactKey: item.contactKey,
    status: operations.some((op) => op.status === 'ready') ? 'ready' : 'noop',
    target: publicCard(card),
    roster: item.roster,
    identity: item.identity,
    operations,
  };
};

const applyPlanToCards = (cards, plan) => {
  const byPersonId = new Map(cards.map((card) => [card.personId, card]));
  for (const item of plan.items) {
    if (item.status !== 'ready') continue;
    const card = byPersonId.get(item.target?.personId);
    if (!card) continue;
    card.identities ??= {};
    card.channels ??= {};
    card.channels.whatsapp ??= { present: false, status: null };
    card.evidence ??= [];
    for (const op of item.operations) {
      if (op.status !== 'ready') continue;
      if (op.operation === 'set_identity_phone_if_absent' && !normalizePhone(card.identities.phone)) {
        card.identities.phone = op.value;
      } else if (op.operation === 'set_identity_email_if_absent' && !cleanEmail(card.identities.email)) {
        card.identities.email = op.value;
        card.channels.email ??= { present: true, status: 'known' };
        card.channels.email.present = true;
        card.channels.email.status ??= 'known';
      } else if (op.operation === 'mark_whatsapp_channel_present') {
        card.channels.whatsapp.present = true;
        card.channels.whatsapp.status = 'known';
      } else if (op.operation === 'add_evidence') {
        const evidence = {
          source: op.source,
          observedAt: op.observedAt,
          note: op.summary,
        };
        if (!evidenceAlreadyPresent(card, evidence)) card.evidence.push(evidence);
      }
    }
    card.updatedAt = plan.generatedAt;
  }
};

const buildPlan = ({ evidence, cardStore, generatedAt, approvedBy = null }) => {
  const cards = asCards(cardStore);
  const indexes = buildIndexes(cards);
  const readySourceItems = (evidence.items ?? []).filter((item) =>
    item.readyWritePreview?.status === 'ready_for_write_review'
    && item.readyWritePreview?.recommendedAction === 'enrich_existing_card');
  const items = readySourceItems.map((item) => planItem({ item, indexes }));
  return {
    schemaVersion: 'crm-vnext-whatsapp-group-roster-apply-v0-2026-05-27',
    generatedAt,
    mode: 'dry_run_whatsapp_group_roster_card_apply',
    approvedBy,
    evidenceFileSchemaVersion: evidence.schemaVersion ?? null,
    group: evidence.group ?? null,
    summary: {
      sourceReadyExistingItems: readySourceItems.length,
      ready: items.filter((item) => item.status === 'ready').length,
      noop: items.filter((item) => item.status === 'noop').length,
      blocked: items.filter((item) => item.status === 'blocked').length,
      skipped: items.filter((item) => item.status === 'skipped').length,
      operationsReady: items.reduce((sum, item) => sum + item.operations.filter((op) => op.status === 'ready').length, 0),
      cardsBefore: cards.length,
      cardsAfter: cards.length,
    },
    safety: {
      localCardStoreWrite: false,
      whatsappMessagesSent: false,
      whatsappGroupMutations: false,
      contactsMutations: false,
      factStoreWrites: false,
      outbound: false,
      newCardsCreated: false,
    },
    items,
  };
};

const markdownForPlan = (plan) => {
  const lines = [
    '# CRM vNext WhatsApp Group Roster Apply',
    '',
    `Generated: ${plan.generatedAt}`,
    `Mode: ${plan.mode}`,
    `Approved by: ${plan.approvedBy ?? 'n/a'}`,
    '',
    '## Summary',
    '',
    `- Source ready existing items: ${plan.summary.sourceReadyExistingItems}`,
    `- Ready: ${plan.summary.ready}`,
    `- Noop: ${plan.summary.noop}`,
    `- Blocked: ${plan.summary.blocked}`,
    `- Operations ready: ${plan.summary.operationsReady}`,
    `- Cards before/after: ${plan.summary.cardsBefore} -> ${plan.summary.cardsAfter}`,
    '',
    '## Items',
    '',
  ];
  for (const item of plan.items) {
    lines.push(`- ${item.identity?.displayName ?? item.contactKey}: ${item.status} -> ${item.target?.displayName ?? item.target?.personId ?? 'n/a'}`);
  }
  lines.push(
    '',
    '## Safety Receipt',
    '',
    `- Local card-store write: ${plan.safety.localCardStoreWrite}`,
    `- WhatsApp messages sent: ${plan.safety.whatsappMessagesSent}`,
    `- WhatsApp group mutations: ${plan.safety.whatsappGroupMutations}`,
    `- Contacts mutations: ${plan.safety.contactsMutations}`,
    `- Fact Store writes: ${plan.safety.factStoreWrites}`,
    `- Outbound: ${plan.safety.outbound}`,
    `- New cards created: ${plan.safety.newCardsCreated}`,
  );
  return lines.join('\n');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  if (!options.evidenceFile) throw new Error('missing_evidence_file');
  if (options.write && !options.approvedBy) throw new Error('approved_by_required_for_write');

  const generatedAt = isoNow();
  const evidence = await readJson(options.evidenceFile);
  const cardStorePath = resolve(options.cardStore);
  const cardStore = await readJson(cardStorePath);
  const cards = asCards(cardStore);
  const plan = buildPlan({ evidence, cardStore, generatedAt, approvedBy: options.approvedBy });
  const blocked = plan.summary.blocked > 0;

  let releaseLock = null;
  let backupPath = null;
  if (options.write) {
    if (blocked) throw new Error('blocked_items_present_refusing_write');
    releaseLock = await acquireLock(options.lockPath);
    try {
      backupPath = await backupIfExists(cardStorePath, options.backupDir, 'whatsapp-group-roster-apply', generatedAt);
      applyPlanToCards(cards, plan);
      plan.mode = 'local_whatsapp_group_roster_card_apply';
      plan.safety.localCardStoreWrite = true;
      plan.summary.operationsCommitted = plan.summary.operationsReady;
      plan.backupPath = backupPath;
      plan.ledgerPath = resolve(options.ledgerPath);
      cardStore.generatedAt = generatedAt;
      cardStore.provenance ??= {};
      cardStore.provenance.lastWhatsappGroupRosterApply = {
        generatedAt,
        approvedBy: options.approvedBy,
        evidenceFile: resolve(options.evidenceFile),
        operationsCommitted: plan.summary.operationsCommitted,
      };
      const tempPath = `${cardStorePath}.${hashId([generatedAt, process.pid.toString()])}.tmp`;
      await writeFile(tempPath, `${JSON.stringify(cardStore, null, 2)}\n`, 'utf8');
      await rename(tempPath, cardStorePath);
      await ensureDir(dirname(resolve(options.ledgerPath)));
      await writeFile(resolve(options.ledgerPath), `${JSON.stringify({
        schemaVersion: 'crm-vnext-whatsapp-group-roster-apply-ledger-entry-2026-05-27',
        generatedAt,
        approvedBy: options.approvedBy,
        evidenceFile: resolve(options.evidenceFile),
        backupPath,
        operationsCommitted: plan.summary.operationsCommitted,
        itemCount: plan.items.length,
      })}\n`, { flag: 'a' });
    } finally {
      if (releaseLock) await releaseLock();
    }
  } else {
    plan.summary.operationsCommitted = 0;
  }

  const json = JSON.stringify(plan, null, 2);
  const markdown = markdownForPlan(plan);
  if (options.out) await writeFile(resolve(options.out), `${json}\n`, 'utf8');
  else console.log(json);
  if (options.markdownOut) await writeFile(resolve(options.markdownOut), `${markdown}\n`, 'utf8');
  if (options.out || options.markdownOut) {
    console.log(JSON.stringify({
      ok: true,
      out: options.out ? resolve(options.out) : null,
      markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
      summary: plan.summary,
      safety: plan.safety,
      backupPath,
    }, null, 2));
  }
  if (options.failOnBlocked && blocked) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext whatsapp-group-roster-apply failed: ${String(error?.message ?? error).replace(/Bearer\s+\S+/g, 'Bearer [redacted]')}`);
  process.exitCode = 1;
});

export const __filename = fileURLToPath(import.meta.url);
