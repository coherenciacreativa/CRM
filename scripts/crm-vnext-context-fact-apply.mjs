#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFile, copyFile, mkdir, open, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-context-fact-apply-2026-05-14';
const LEDGER_ENTRY_SCHEMA_VERSION = 'crm-vnext-context-fact-apply-ledger-entry-2026-05-14';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';
const DEFAULT_LEDGER_PATH = '.crm-vnext/context-fact-apply/ledger.jsonl';
const DEFAULT_BACKUP_DIR = '.crm-vnext/backups/context-fact-apply';
const DEFAULT_LOCK_PATH = '.crm-vnext/context-fact-apply/write.lock';

const usage = `Usage:
  node scripts/crm-vnext-context-fact-apply.mjs --proposal-file <path> [options]

Options:
  --proposal-file <path>     JSON output from crm:vnext:context-fact-proposals
  --proposal-id <id>         Proposal ID to apply. May be repeated
  --apply-all-ready          Select every promote_to_card_evidence proposal
  --card-store-path <path>   Local vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --ledger-path <path>       Local context-fact apply ledger JSONL. Defaults to ${DEFAULT_LEDGER_PATH}
  --backup-dir <path>        Backup directory. Defaults to ${DEFAULT_BACKUP_DIR}
  --lock-path <path>         Write lock path. Defaults to ${DEFAULT_LOCK_PATH}
  --approved-by <name>       Required with --write
  --write                    Commit selected proposals to local card evidence after backup
  --out <path>               Write apply report JSON
  --fail-on-blocked          Exit non-zero if commit is blocked or any selected item is not ready
  --help                     Show this help

Default mode is dry-run. A committed write requires --write, --approved-by, and either --proposal-id or --apply-all-ready. This command writes only local CRM vNext card-store/ledger files after backup; it never writes Fact Store, sends outbound messages, calls live APIs, reads credentials, or touches ManyChat LIVE.`;

const parseArgs = (argv) => {
  const options = {
    proposalFile: null,
    proposalIds: [],
    applyAllReady: false,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    ledgerPath: DEFAULT_LEDGER_PATH,
    backupDir: DEFAULT_BACKUP_DIR,
    lockPath: DEFAULT_LOCK_PATH,
    approvedBy: null,
    write: false,
    out: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--apply-all-ready') options.applyAllReady = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--proposal-file') options.proposalFile = argv[++index];
    else if (arg === '--proposal-id') options.proposalIds.push(argv[++index]);
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--backup-dir') options.backupDir = argv[++index];
    else if (arg === '--lock-path') options.lockPath = argv[++index];
    else if (arg === '--approved-by') options.approvedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.proposalFile) throw new Error('proposal_file_required');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
};

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

const unique = (items) => Array.from(new Set(items));

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readProposalPacket = async (filePath) => {
  const parsed = await readJson(filePath);
  const proposals = Array.isArray(parsed?.proposals) ? parsed.proposals : Array.isArray(parsed) ? parsed : [];
  return {
    generatedAt: cleanString(parsed?.generatedAt),
    proposals: proposals.filter((proposal) => proposal && typeof proposal === 'object'),
    sourceSummary: parsed?.summary ?? null,
  };
};

const readCardStore = async (filePath) => {
  const parsed = await readJson(filePath);
  const cards = Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
  return {
    store: Array.isArray(parsed) ? {
      schemaVersion: 'crm-vnext-person-card-store-2026-05-10',
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
  return Array.from(byKey.values()).slice(0, 120);
};

const safeFilenameTimestamp = (value) =>
  isoNow(value).replace(/[^0-9]/g, '').slice(0, 14);

const backupIfExists = async (filePath, backupDir, label, generatedAt) => {
  try {
    await readFile(filePath, 'utf8');
  } catch {
    return null;
  }
  await mkdir(backupDir, { recursive: true });
  const backupPath = join(
    backupDir,
    `${safeFilenameTimestamp(generatedAt)}.${label}.${basename(filePath)}.bak`,
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
      purpose: 'crm-vnext-context-fact-apply-local-write',
    })}\n`, 'utf8');
  } catch (error) {
    if (error?.code === 'EEXIST') {
      throw new Error(`context_fact_apply_write_lock_active:${resolvedLockPath}`);
    }
    throw error;
  } finally {
    if (handle) await handle.close();
  }

  return async () => {
    await rm(resolvedLockPath, { force: true });
  };
};

const compactProposal = (proposal) => ({
  proposalId: cleanString(proposal?.proposalId),
  targetPersonId: cleanString(proposal?.targetPersonId),
  displayName: cleanString(proposal?.target?.displayName),
  contextKind: cleanString(proposal?.contextKind),
  statement: cleanString(proposal?.statement),
  confidence: cleanString(proposal?.confidence),
  sensitivity: cleanString(proposal?.sensitivity),
  promotionAction: cleanString(proposal?.promotionAction),
  source: proposal?.source ? {
    sourceKind: cleanString(proposal.source.sourceKind),
    sourceId: cleanString(proposal.source.sourceId),
    title: cleanString(proposal.source.title),
  } : null,
  suggestedCardEvidence: proposal?.suggestedCardEvidence ? {
    source: cleanString(proposal.suggestedCardEvidence.source),
    observedAt: cleanString(proposal.suggestedCardEvidence.observedAt),
    note: cleanString(proposal.suggestedCardEvidence.note),
  } : null,
});

const itemStatusFor = (proposal, cardById) => {
  if (proposal.promotionAction !== 'promote_to_card_evidence') return 'blocked_not_promotable';
  if (!proposal.proposalId) return 'blocked_missing_proposal_id';
  if (!proposal.targetPersonId) return 'blocked_missing_target_person_id';
  if (!proposal.suggestedCardEvidence?.note || !proposal.suggestedCardEvidence?.source) return 'blocked_missing_card_evidence';
  if (!cardById.has(proposal.targetPersonId)) return 'blocked_missing_existing_card';
  return 'ready_to_commit';
};

const planItemFor = (proposal, cardById) => {
  const compact = compactProposal(proposal);
  const status = itemStatusFor(compact, cardById);
  const currentCard = compact.targetPersonId ? cardById.get(compact.targetPersonId) : null;
  const currentEvidence = Array.isArray(currentCard?.evidence) ? currentCard.evidence : [];
  const evidenceAlreadyPresent = compact.suggestedCardEvidence
    ? currentEvidence.some((item) => evidenceKey(item) === evidenceKey(compact.suggestedCardEvidence))
    : false;
  const finalStatus = status === 'ready_to_commit' && evidenceAlreadyPresent
    ? 'blocked_duplicate_evidence'
    : status;
  const commitBlockers = finalStatus === 'ready_to_commit' ? [] : [finalStatus];
  const evidenceToAppend = finalStatus === 'ready_to_commit' ? compact.suggestedCardEvidence : null;

  return {
    applyItemId: `context_fact_apply_${hashId([
      compact.proposalId,
      compact.targetPersonId,
      compact.statement,
    ])}`,
    status: finalStatus,
    proposalId: compact.proposalId,
    targetPersonId: compact.targetPersonId,
    displayName: compact.displayName,
    contextKind: compact.contextKind,
    statement: compact.statement,
    promotionAction: compact.promotionAction,
    confidence: compact.confidence,
    sensitivity: compact.sensitivity,
    currentEvidenceCount: currentEvidence.length,
    proposedEvidenceCount: evidenceToAppend ? currentEvidence.length + 1 : currentEvidence.length,
    evidenceToAppend,
    source: compact.source,
    commitBlockers,
  };
};

const selectProposals = (proposals, options) => {
  const ids = unique(options.proposalIds.map(cleanString).filter(Boolean));
  if (ids.length) return proposals.filter((proposal) => ids.includes(cleanString(proposal?.proposalId)));
  if (options.applyAllReady) {
    return proposals.filter((proposal) =>
      cleanString(proposal?.promotionAction) === 'promote_to_card_evidence'
      && proposal?.suggestedCardEvidence
    );
  }
  return proposals.filter((proposal) =>
    cleanString(proposal?.promotionAction) === 'promote_to_card_evidence'
    && proposal?.suggestedCardEvidence
  );
};

const safety = () => ({
  localOnly: true,
  outboundProhibited: true,
  factStoreWriteProhibited: true,
  liveApiCallsProhibited: true,
  credentialReadProhibited: true,
  manyChatLiveMutationProhibited: true,
  instagramPermissionMutationProhibited: true,
  requiresApprovedByForCommit: true,
  requiresExplicitSelectionForCommit: true,
  backupRequiredForCommit: true,
  allowedUse: [
    'Append Alejandro-approved context evidence to existing local CRM vNext person cards.',
    'Create a backup and local ledger before committed local writes.',
    'Preserve review-only or weak evidence without applying it.',
  ],
  prohibitedActions: [
    'Do not create new person cards.',
    'Do not mutate identity fields, scoring fields, product fields, or channels.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts APIs.',
    'Do not read, print, rotate, or mutate credentials.',
  ],
});

const buildReport = ({ packet, cards, options, generatedAt }) => {
  const approvedBy = cleanString(options.approvedBy);
  const cardById = new Map(cards.map((card) => [card.personId, card]));
  const selected = selectProposals(packet.proposals, options);
  const planItems = selected.map((proposal) => planItemFor(proposal, cardById));
  const commitBlockers = [
    options.write && !approvedBy ? 'approved_by_required_for_commit' : null,
    options.write && !options.applyAllReady && options.proposalIds.length === 0
      ? 'explicit_proposal_id_or_apply_all_ready_required_for_commit'
      : null,
    options.write && planItems.length === 0 ? 'no_selected_proposals' : null,
    ...planItems.flatMap((item) => item.commitBlockers),
  ].filter(Boolean);
  const committed = Boolean(options.write && commitBlockers.length === 0);
  const readyItems = planItems.filter((item) => item.status === 'ready_to_commit');
  const targetCards = new Set(readyItems.map((item) => item.targetPersonId)).size;

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: committed ? 'local_context_fact_apply' : 'dry_run_context_fact_apply',
    committed,
    source: {
      proposalPacketGeneratedAt: packet.generatedAt,
      proposalSummary: packet.sourceSummary,
    },
    selection: {
      proposalIds: unique(options.proposalIds.map(cleanString).filter(Boolean)),
      applyAllReady: Boolean(options.applyAllReady),
    },
    summary: {
      proposalsAvailable: packet.proposals.length,
      selectedItems: planItems.length,
      readyToCommit: readyItems.length,
      blockedItems: planItems.filter((item) => item.status !== 'ready_to_commit').length,
      targetCards,
      evidenceToAppend: readyItems.length,
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
    safety: safety(),
  };
};

const ledgerEntryFor = (item, approvedBy, committedAt) => ({
  schemaVersion: LEDGER_ENTRY_SCHEMA_VERSION,
  ledgerEntryId: `context_fact_apply_ledger_${hashId([
    item.applyItemId,
    item.proposalId,
    committedAt,
  ])}`,
  committedAt,
  committedBy: approvedBy,
  applyItemId: item.applyItemId,
  proposalId: item.proposalId,
  targetPersonId: item.targetPersonId,
  contextKind: item.contextKind,
  statement: item.statement,
  evidenceSource: item.evidenceToAppend?.source ?? null,
  safety: {
    outboundExecuted: false,
    factStoreWriteExecuted: false,
    liveApiCallsExecuted: false,
    credentialReadExecuted: false,
  },
});

const applyReportToStore = ({ store, report, approvedBy }) => {
  const cards = Array.isArray(store?.cards) ? store.cards : [];
  const cardsById = new Map(cards.map((card) => [card.personId, card]));
  const ledgerEntries = [];

  for (const item of report.planItems.filter((planItem) => planItem.status === 'ready_to_commit')) {
    const card = cardsById.get(item.targetPersonId);
    if (!card || !item.evidenceToAppend) continue;
    cardsById.set(item.targetPersonId, {
      ...card,
      evidence: mergeEvidence(card.evidence, [item.evidenceToAppend]),
      updatedAt: report.generatedAt,
    });
    ledgerEntries.push(ledgerEntryFor(item, approvedBy, report.generatedAt));
  }

  return {
    store: {
      ...store,
      generatedAt: report.generatedAt,
      cards: Array.from(cardsById.values()).sort((a, b) => a.personId.localeCompare(b.personId)),
      provenance: [
        ...(Array.isArray(store?.provenance) ? store.provenance : []),
        ...ledgerEntries.map((entry) => ({
          provenanceId: `context_fact_apply_provenance_${hashId([entry.ledgerEntryId])}`,
          proposalId: entry.proposalId,
          targetPersonId: entry.targetPersonId,
          approvedBy,
          approvedAt: report.generatedAt,
          mutationKind: 'append_card_evidence',
          safety: entry.safety,
        })),
      ],
    },
    ledgerEntries,
  };
};

const run = async (options) => {
  const generatedAt = new Date().toISOString();
  const packet = await readProposalPacket(options.proposalFile);
  const { store, cards } = await readCardStore(options.cardStorePath);
  let report = buildReport({ packet, cards, options, generatedAt });

  if (report.committed) {
    const releaseLock = await acquireWriteLock(options.lockPath, generatedAt);
    try {
      const fresh = await readCardStore(options.cardStorePath);
      report = buildReport({
        packet,
        cards: fresh.cards,
        options,
        generatedAt,
      });
      report.write.writeLockAcquired = true;
      if (!report.committed) return report;

      const cardStorePath = resolve(options.cardStorePath);
      const backupDir = resolve(options.backupDir);
      const backupPath = await backupIfExists(cardStorePath, backupDir, 'store', report.generatedAt);
      const applied = applyReportToStore({
        store: fresh.store,
        report,
        approvedBy: cleanString(options.approvedBy),
      });
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

const compactReport = (report) => ({
  ok: true,
  mode: report.mode,
  generatedAt: report.generatedAt,
  committed: report.committed,
  summary: report.summary,
  selectedProposalIds: report.planItems.map((item) => item.proposalId),
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
  console.error(`crm-vnext context fact apply failed: ${error.message}`);
  process.exitCode = 1;
});
