import { access, appendFile, copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  applyCrmVNextCardMergeReviewResolutionToStore,
  buildCrmVNextCardMergeReviewResolver,
  type CrmCardMergeReviewResolverReport,
  type CrmCardMergeReviewLedgerEntry,
} from '../../../lib/crm/crm-vnext-card-merge-review-resolver';
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
  type CrmVNextPersonCardStore,
} from '../../../lib/crm/crm-vnext-card-write-apply';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

const DEFAULT_CARD_STORE_PATH = join(process.cwd(), '.crm-vnext', 'person-card-store', 'person-cards-vnext.json');
const DEFAULT_MERGE_REVIEW_LEDGER_PATH = join(process.cwd(), '.crm-vnext', 'card-merge-review-resolver', 'ledger.jsonl');
const DEFAULT_MERGE_REVIEW_BACKUP_DIR = join(process.cwd(), '.crm-vnext', 'backups', 'card-merge-review-resolver');

type ApiBody =
  | {
      ok: true;
      source: {
        cardStore: {
          kind: 'vnext-person-card-store';
          cards: number;
          mergeReviews: number;
          localPathsRedacted: true;
        };
      };
      resolver: CrmCardMergeReviewResolverReport;
      write: {
        committed: boolean;
        backups: {
          requiredForCommit: true;
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
  | { ok: false; error: string; resolver?: CrmCardMergeReviewResolverReport };

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
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

const readStore = async (filePath: string): Promise<CrmVNextPersonCardStore> => {
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

const appendLedger = async (
  filePath: string,
  entries: CrmCardMergeReviewLedgerEntry[],
): Promise<boolean> => {
  if (!entries.length) return false;
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, entries.map((entry) => JSON.stringify(entry)).join('\n') + '\n', 'utf8');
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
    const cardStorePath = resolve(
      queryPathOverride(req, 'cardStorePath', cleanString(body.cardStorePath) ?? DEFAULT_CARD_STORE_PATH)
      ?? DEFAULT_CARD_STORE_PATH,
    );
    const mergeReviewLedgerPath = resolve(
      queryPathOverride(req, 'mergeReviewLedgerPath', cleanString(body.mergeReviewLedgerPath) ?? DEFAULT_MERGE_REVIEW_LEDGER_PATH)
      ?? DEFAULT_MERGE_REVIEW_LEDGER_PATH,
    );
    const backupDir = resolve(
      queryPathOverride(req, 'backupDir', cleanString(body.backupDir) ?? DEFAULT_MERGE_REVIEW_BACKUP_DIR)
      ?? DEFAULT_MERGE_REVIEW_BACKUP_DIR,
    );
    const store = await readStore(cardStorePath);
    const commit = cleanBoolean(body.commit);
    const approvedBy = cleanString(body.approvedBy);
    const resolver = buildCrmVNextCardMergeReviewResolver({
      store,
      reviewIds: cleanStringArray(body.reviewIds ?? body.reviewId),
      resolveAllReady: cleanBoolean(body.resolveAllReady),
      approvedBy,
      commit,
      ackRestrictedService: cleanBoolean(body.ackRestrictedService),
    });

    if (commit && resolver.summary.commitBlocked) {
      return res.status(409).json({ ok: false, error: 'card_merge_review_resolver_commit_blocked', resolver });
    }

    let previousStoreBackupCreated = false;
    let cardStoreWritten = false;
    let ledgerWritten = false;
    let ledgerEntries = 0;

    if (commit) {
      previousStoreBackupCreated = await backupIfExists(cardStorePath, backupDir, 'store', resolver.generatedAt);
      const applied = applyCrmVNextCardMergeReviewResolutionToStore({
        store,
        report: resolver,
        approvedBy: approvedBy as string,
        committedAt: resolver.generatedAt,
      });
      await mkdir(dirname(cardStorePath), { recursive: true });
      await writeFile(cardStorePath, `${JSON.stringify(applied.store, null, 2)}\n`, 'utf8');
      cardStoreWritten = true;
      ledgerWritten = await appendLedger(mergeReviewLedgerPath, applied.ledgerEntries);
      ledgerEntries = applied.ledgerEntries.length;
    }

    return res.status(200).json({
      ok: true,
      source: {
        cardStore: {
          kind: 'vnext-person-card-store',
          cards: store.cards.length,
          mergeReviews: store.mergeReviewQueue.length,
          localPathsRedacted: true,
        },
      },
      resolver,
      write: {
        committed: commit,
        backups: {
          requiredForCommit: true,
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
    console.error('crm-vnext card-merge-review-resolver api error', error);
    return res.status(500).json({ ok: false, error: 'card_merge_review_resolver_failed' });
  }
}
