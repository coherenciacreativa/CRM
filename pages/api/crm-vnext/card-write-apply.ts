import { access, appendFile, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  applyCrmVNextCardWritePlanToStore,
  buildCrmVNextCardWriteApply,
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
  type CrmCardWriteApplyReport,
  type CrmVNextPersonCardStore,
} from '../../../lib/crm/crm-vnext-card-write-apply';
import {
  DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS,
  DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS,
  loadCrmVNextDeepLocalSources,
  normalizeCrmVNextConnectedEvidenceSources,
} from '../../../lib/crm/crm-vnext-deep-local-stitching';
import {
  DEFAULT_CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH,
  readCrmEvidenceReviewDecisionLedger,
} from '../../../lib/crm/crm-vnext-evidence-review-decisions';
import type { CrmFactSourceKind } from '../../../lib/crm/crm-vnext-fact-intake';
import {
  DEFAULT_MAILER_BRIDGE_ENRICHED_PATH,
  loadMailerBridgeCandidates,
} from '../../../lib/crm/crm-vnext-identity-stitching-research';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

const DEFAULT_CARD_STORE_PATH = join(process.cwd(), '.crm-vnext', 'person-card-store', 'person-cards-vnext.json');
const DEFAULT_CARD_WRITE_LEDGER_PATH = join(process.cwd(), '.crm-vnext', 'card-write-apply', 'ledger.jsonl');
const DEFAULT_CARD_WRITE_BACKUP_DIR = join(process.cwd(), '.crm-vnext', 'backups', 'card-write-apply');

type ApiBody =
  | {
      ok: true;
      source: {
        personCards: PublicLegacyPersonCardsV1Source;
        cardStore: {
          kind: 'vnext-person-card-store';
          existingStoreLoaded: boolean;
          cardsForApply: number;
          localPathsRedacted: true;
        };
        mailerBridge: {
          kind: 'mailer-bridge-candidates-enriched';
          rows: number;
          liveApiCalled: false;
        };
        localSearch: {
          includeExpandedSources: boolean;
          roots: number;
          filesScanned: number;
          filesSkipped: number;
          connectedEvidenceSources: number;
          localPathsRedacted: true;
        };
        evidenceReviewDecisions: {
          kind: 'local-evidence-review-decisions-ledger';
          rows: number;
          liveApiCalled: false;
          localPathsRedacted: true;
        };
        liveSources: {
          gmailLiveApiCalled: false;
          mailerLiteLiveApiCalled: false;
          googleDriveLiveApiCalled: false;
        };
      };
      apply: CrmCardWriteApplyReport;
      write: {
        committed: boolean;
        backups: {
          requiredForCommit: true;
          sourceBackupCreated: boolean;
          previousStoreBackupCreated: boolean;
        };
        files: {
          cardStoreWritten: boolean;
          ledgerWritten: boolean;
          ledgerEntries: number;
          localPathsRedacted: true;
        };
      };
    }
  | { ok: false; error: string; apply?: CrmCardWriteApplyReport };

const VALID_SOURCES = new Set<CrmFactSourceKind>([
  'alejandro_conversation',
  'telegram_human_report',
  'mailerlite_tag_snapshot',
  'instagram_signal',
  'manual_import',
  'unknown',
]);

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanSourceKind = (value: unknown): CrmFactSourceKind => {
  const raw = cleanString(value);
  if (raw && VALID_SOURCES.has(raw as CrmFactSourceKind)) return raw as CrmFactSourceKind;
  return 'unknown';
};

const cleanBoolean = (value: unknown): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  if (typeof value === 'string') return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
};

const cleanStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) return value.map(cleanString).filter((item): item is string => Boolean(item));
  const single = cleanString(value);
  return single ? [single] : [];
};

const queryPathOverride = (
  req: NextApiRequest,
  queryKey: string,
  fallback: string | null = null,
): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return fallback;
  const value = req.query[queryKey];
  return cleanString(Array.isArray(value) ? value[0] : value) ?? fallback;
};

const safeFilenameTimestamp = (value: string): string => value.replace(/[^0-9TZ]/g, '').slice(0, 16);

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const readExistingStore = async (filePath: string): Promise<CrmVNextPersonCardStore | null> => {
  if (!await fileExists(filePath)) return null;
  const parsed = JSON.parse(await readFile(filePath, 'utf8')) as CrmVNextPersonCardStore;
  if (parsed?.schemaVersion !== CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION || !Array.isArray(parsed.cards)) {
    throw new Error('invalid_vnext_card_store');
  }
  return parsed;
};

const backupIfExists = async (
  filePath: string,
  backupDir: string,
  label: string,
  generatedAt: string,
): Promise<boolean> => {
  if (!await fileExists(filePath)) return false;
  await mkdir(backupDir, { recursive: true });
  const backupName = `${safeFilenameTimestamp(generatedAt)}.${label}.${basename(filePath)}.bak`;
  await copyFile(filePath, join(backupDir, backupName));
  return true;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  try {
    const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
    const text = cleanString(body.text);
    if (!text) {
      return res.status(400).json({ ok: false, error: 'card_write_apply_text_required' });
    }

    const sourcePath =
      queryPathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const mailerBridgePath =
      queryPathOverride(req, 'mailerBridgePath', process.env.CRM_VNEXT_MAILER_BRIDGE_ENRICHED_PATH || DEFAULT_MAILER_BRIDGE_ENRICHED_PATH)
      ?? DEFAULT_MAILER_BRIDGE_ENRICHED_PATH;
    const decisionLedgerPath =
      queryPathOverride(req, 'decisionLedgerPath', process.env.CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH || DEFAULT_CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH)
      ?? DEFAULT_CRM_VNEXT_EVIDENCE_REVIEW_DECISIONS_PATH;
    const cardStorePath = resolve(
      queryPathOverride(req, 'cardStorePath', cleanString(body.cardStorePath) ?? DEFAULT_CARD_STORE_PATH)
      ?? DEFAULT_CARD_STORE_PATH,
    );
    const cardWriteLedgerPath = resolve(
      queryPathOverride(req, 'cardWriteLedgerPath', cleanString(body.cardWriteLedgerPath) ?? DEFAULT_CARD_WRITE_LEDGER_PATH)
      ?? DEFAULT_CARD_WRITE_LEDGER_PATH,
    );
    const backupDir = resolve(
      queryPathOverride(req, 'backupDir', cleanString(body.backupDir) ?? DEFAULT_CARD_WRITE_BACKUP_DIR)
      ?? DEFAULT_CARD_WRITE_BACKUP_DIR,
    );
    const localRootPath = queryPathOverride(req, 'localRootPath');
    const includeExpandedSources = cleanBoolean(
      body.includeExpandedSources
      ?? (Array.isArray(req.query.includeExpandedSources) ? req.query.includeExpandedSources[0] : req.query.includeExpandedSources),
    );
    const localRoots = localRootPath
      ? [localRootPath]
      : includeExpandedSources
        ? DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS
        : DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS;

    const legacyCardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const existingStore = await readExistingStore(cardStorePath);
    const cardsForApply = existingStore?.cards ?? legacyCardsPayload.cards;
    const mailerBridgeRows = await loadMailerBridgeCandidates(mailerBridgePath);
    const localSourceLoad = await loadCrmVNextDeepLocalSources(localRoots);
    const connectedEvidenceSources = normalizeCrmVNextConnectedEvidenceSources(body.evidenceSources);
    const evidenceReviewDecisionLedger = await readCrmEvidenceReviewDecisionLedger(decisionLedgerPath, { limit: 500 });
    const commit = cleanBoolean(body.commit);
    const approvedBy = cleanString(body.approvedBy);
    const apply = buildCrmVNextCardWriteApply({
      text,
      sourceKind: cleanSourceKind(body.sourceKind),
      reporter: cleanString(body.reporter),
      channel: cleanString(body.channel),
      occurredAt: cleanString(body.occurredAt),
      cards: cardsForApply,
      mailerBridgeRows,
      localSources: [
        ...localSourceLoad.sources,
        ...connectedEvidenceSources,
      ],
      sourceCoverage: {
        ...localSourceLoad,
        connectedEvidenceSources: connectedEvidenceSources.length,
      },
      evidenceReviewDecisions: evidenceReviewDecisionLedger.decisions,
      approvalItemIds: cleanStringArray(body.approvalItemIds ?? body.approvalItemId),
      applyAllReady: cleanBoolean(body.applyAllReady),
      approvedBy,
      commit,
    });

    if (commit && apply.summary.commitBlocked) {
      return res.status(409).json({ ok: false, error: 'card_write_apply_commit_blocked', apply });
    }

    let sourceBackupCreated = false;
    let previousStoreBackupCreated = false;
    let cardStoreWritten = false;
    let ledgerWritten = false;
    let ledgerEntries = 0;

    if (commit) {
      sourceBackupCreated = await backupIfExists(sourcePath, backupDir, 'source', apply.generatedAt);
      previousStoreBackupCreated = await backupIfExists(cardStorePath, backupDir, 'store', apply.generatedAt);
      const applied = applyCrmVNextCardWritePlanToStore({
        report: apply,
        baseCards: legacyCardsPayload.cards,
        previousStore: existingStore,
        approvedBy: approvedBy as string,
        committedAt: apply.generatedAt,
      });
      await mkdir(dirname(cardStorePath), { recursive: true });
      await writeFile(cardStorePath, `${JSON.stringify(applied.store, null, 2)}\n`, 'utf8');
      cardStoreWritten = true;
      if (applied.ledgerEntries.length) {
        await mkdir(dirname(cardWriteLedgerPath), { recursive: true });
        await appendFile(
          cardWriteLedgerPath,
          applied.ledgerEntries.map((entry) => JSON.stringify(entry)).join('\n') + '\n',
          'utf8',
        );
        ledgerWritten = true;
        ledgerEntries = applied.ledgerEntries.length;
      }
    }

    return res.status(200).json({
      ok: true,
      source: {
        personCards: publicLegacyPersonCardsV1Source(legacyCardsPayload.source),
        cardStore: {
          kind: 'vnext-person-card-store',
          existingStoreLoaded: Boolean(existingStore),
          cardsForApply: cardsForApply.length,
          localPathsRedacted: true,
        },
        mailerBridge: {
          kind: 'mailer-bridge-candidates-enriched',
          rows: mailerBridgeRows.length,
          liveApiCalled: false,
        },
        localSearch: {
          includeExpandedSources,
          roots: localSourceLoad.roots,
          filesScanned: localSourceLoad.filesScanned,
          filesSkipped: localSourceLoad.filesSkipped,
          connectedEvidenceSources: connectedEvidenceSources.length,
          localPathsRedacted: true,
        },
        evidenceReviewDecisions: {
          kind: 'local-evidence-review-decisions-ledger',
          rows: evidenceReviewDecisionLedger.summary.decisions,
          liveApiCalled: false,
          localPathsRedacted: true,
        },
        liveSources: {
          gmailLiveApiCalled: false,
          mailerLiteLiveApiCalled: false,
          googleDriveLiveApiCalled: false,
        },
      },
      apply,
      write: {
        committed: commit,
        backups: {
          requiredForCommit: true,
          sourceBackupCreated,
          previousStoreBackupCreated,
        },
        files: {
          cardStoreWritten,
          ledgerWritten,
          ledgerEntries,
          localPathsRedacted: true,
        },
      },
    });
  } catch (error) {
    console.error('crm-vnext card-write-apply api error', error);
    return res.status(500).json({ ok: false, error: 'card_write_apply_failed' });
  }
}
