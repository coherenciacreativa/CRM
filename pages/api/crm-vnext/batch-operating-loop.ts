import { access, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextBatchOperatingLoop,
  type CrmBatchOperatingLoopReport,
} from '../../../lib/crm/crm-vnext-batch-operating-loop';
import {
  CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
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

type ApiBody =
  | {
      ok: true;
      source: {
        personCards: PublicLegacyPersonCardsV1Source;
        cardStore: {
          kind: 'vnext-person-card-store';
          existingStoreLoaded: boolean;
          cardsForLoop: number;
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
          contactsLiveApiCalled: false;
        };
      };
      loop: CrmBatchOperatingLoopReport;
    }
  | { ok: false; error: string };

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

const queryPathOverride = (
  req: NextApiRequest,
  queryKey: string,
  fallback: string | null = null,
): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return fallback;
  const value = req.query[queryKey];
  return cleanString(Array.isArray(value) ? value[0] : value) ?? fallback;
};

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
      return res.status(400).json({ ok: false, error: 'batch_operating_loop_text_required' });
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
    const cardsForLoop = existingStore?.cards ?? legacyCardsPayload.cards;
    const mailerBridgeRows = await loadMailerBridgeCandidates(mailerBridgePath);
    const localSourceLoad = await loadCrmVNextDeepLocalSources(localRoots);
    const connectedEvidenceSources = normalizeCrmVNextConnectedEvidenceSources(body.evidenceSources);
    const evidenceReviewDecisionLedger = await readCrmEvidenceReviewDecisionLedger(decisionLedgerPath, { limit: 500 });
    const loop = buildCrmVNextBatchOperatingLoop({
      text,
      sourceKind: cleanSourceKind(body.sourceKind),
      reporter: cleanString(body.reporter),
      channel: cleanString(body.channel),
      occurredAt: cleanString(body.occurredAt),
      cards: cardsForLoop,
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
      applyAllReady: true,
      commit: false,
    });

    return res.status(200).json({
      ok: true,
      source: {
        personCards: publicLegacyPersonCardsV1Source(legacyCardsPayload.source),
        cardStore: {
          kind: 'vnext-person-card-store',
          existingStoreLoaded: Boolean(existingStore),
          cardsForLoop: cardsForLoop.length,
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
          contactsLiveApiCalled: false,
        },
      },
      loop,
    });
  } catch (error) {
    console.error('crm-vnext batch-operating-loop api error', error);
    return res.status(500).json({ ok: false, error: 'batch_operating_loop_failed' });
  }
}
