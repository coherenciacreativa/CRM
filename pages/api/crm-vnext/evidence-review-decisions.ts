import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS,
  DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS,
  loadCrmVNextDeepLocalSources,
  normalizeCrmVNextConnectedEvidenceSources,
} from '../../../lib/crm/crm-vnext-deep-local-stitching';
import {
  appendCrmEvidenceReviewDecisions,
  readCrmEvidenceReviewDecisionLedger,
  type CrmEvidenceReviewDecisionInput,
  type CrmEvidenceReviewDecisionLedgerAppendResult,
  type CrmEvidenceReviewDecisionLedgerReadResult,
  type CrmEvidenceReviewDecisionPacketForLedger,
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

type ApiBody =
  | {
      ok: true;
      ledger: CrmEvidenceReviewDecisionLedgerReadResult;
    }
  | {
      ok: true;
      source: {
        personCards: PublicLegacyPersonCardsV1Source | null;
        mailerBridge: {
          kind: 'mailer-bridge-candidates-enriched';
          rows: number;
          liveApiCalled: false;
        } | null;
        localSearch: {
          includeExpandedSources: boolean;
          roots: number;
          filesScanned: number;
          filesSkipped: number;
          connectedEvidenceSources: number;
          localPathsRedacted: true;
        } | null;
        liveSources: {
          gmailLiveApiCalled: false;
          mailerLiteLiveApiCalled: false;
          googleDriveLiveApiCalled: false;
        };
      };
      result: CrmEvidenceReviewDecisionLedgerAppendResult;
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

const cleanBool = (value: unknown): boolean =>
  value === true || value === 'true' || value === '1';

const cleanSourceKind = (value: unknown): CrmFactSourceKind => {
  const raw = cleanString(value);
  if (raw && VALID_SOURCES.has(raw as CrmFactSourceKind)) return raw as CrmFactSourceKind;
  return 'unknown';
};

const cleanLimit = (value: string | string[] | undefined): number => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 0) return 25;
  return Math.min(parsed, 100);
};

const cleanDecisions = (value: unknown): CrmEvidenceReviewDecisionInput[] =>
  Array.isArray(value)
    ? value.filter((item): item is CrmEvidenceReviewDecisionInput => Boolean(item && typeof item === 'object'))
    : [];

const cleanPacket = (value: unknown): CrmEvidenceReviewDecisionPacketForLedger | null => {
  if (!value || typeof value !== 'object') return null;
  const record = value as Partial<CrmEvidenceReviewDecisionPacketForLedger>;
  if (!Array.isArray(record.reviewItems)) return null;
  return {
    generatedAt: cleanString(record.generatedAt),
    reviewItems: record.reviewItems,
  };
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

const getLedgerPath = (req: NextApiRequest): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return null;
  return cleanString(req.query.ledgerPath);
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<ApiBody>) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  const auth = authorizeCrmVNextInternalRead(req);
  if (auth.ok === false) {
    return res.status(auth.status).json({ ok: false, error: auth.error });
  }

  try {
    const ledgerPath = getLedgerPath(req);
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        ledger: await readCrmEvidenceReviewDecisionLedger(ledgerPath ?? undefined, { limit: cleanLimit(req.query.limit) }),
      });
    }

    const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
    const decisions = cleanDecisions(body.decisions);
    if (!decisions.length) {
      return res.status(400).json({ ok: false, error: 'evidence_review_decisions_required' });
    }
    const approvedBy = cleanString(body.approvedBy);
    if (cleanBool(body.commit) && !approvedBy) {
      return res.status(400).json({ ok: false, error: 'evidence_review_decisions_approved_by_required' });
    }

    const packet = cleanPacket(body.packet);
    let source: Extract<ApiBody, { ok: true; result: CrmEvidenceReviewDecisionLedgerAppendResult }>['source'] = {
      personCards: null,
      mailerBridge: null,
      localSearch: null,
      liveSources: {
        gmailLiveApiCalled: false,
        mailerLiteLiveApiCalled: false,
        googleDriveLiveApiCalled: false,
      },
    };

    if (packet) {
      return res.status(200).json({
        ok: true,
        source,
        result: await appendCrmEvidenceReviewDecisions({
          text: cleanString(body.text) ?? 'CRM evidence review decision packet supplied.',
          sourceKind: cleanSourceKind(body.sourceKind),
          cards: [],
          mailerBridgeRows: [],
          packet,
          decisions,
          approvedBy: approvedBy ?? 'dry-run',
          commit: cleanBool(body.commit),
          ledgerPath,
        }),
      });
    }

    const text = cleanString(body.text);
    if (!text) {
      return res.status(400).json({ ok: false, error: 'evidence_review_decisions_text_or_packet_required' });
    }

    const sourcePath =
      queryPathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const mailerBridgePath =
      queryPathOverride(req, 'mailerBridgePath', process.env.CRM_VNEXT_MAILER_BRIDGE_ENRICHED_PATH || DEFAULT_MAILER_BRIDGE_ENRICHED_PATH)
      ?? DEFAULT_MAILER_BRIDGE_ENRICHED_PATH;
    const localRootPath = queryPathOverride(req, 'localRootPath');
    const includeExpandedSources = cleanBool(
      body.includeExpandedSources
      ?? (Array.isArray(req.query.includeExpandedSources) ? req.query.includeExpandedSources[0] : req.query.includeExpandedSources),
    );
    const localRoots = localRootPath
      ? [localRootPath]
      : includeExpandedSources
        ? DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS
        : DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS;

    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const mailerBridgeRows = await loadMailerBridgeCandidates(mailerBridgePath);
    const localSourceLoad = await loadCrmVNextDeepLocalSources(localRoots);
    const connectedEvidenceSources = normalizeCrmVNextConnectedEvidenceSources(body.evidenceSources);
    source = {
      personCards: publicLegacyPersonCardsV1Source(cardsPayload.source),
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
      liveSources: {
        gmailLiveApiCalled: false,
        mailerLiteLiveApiCalled: false,
        googleDriveLiveApiCalled: false,
      },
    };

    return res.status(200).json({
      ok: true,
      source,
      result: await appendCrmEvidenceReviewDecisions({
        text,
        sourceKind: cleanSourceKind(body.sourceKind),
        reporter: cleanString(body.reporter),
        channel: cleanString(body.channel),
        occurredAt: cleanString(body.occurredAt),
        cards: cardsPayload.cards,
        mailerBridgeRows,
        localSources: [
          ...localSourceLoad.sources,
          ...connectedEvidenceSources,
        ],
        sourceCoverage: {
          ...localSourceLoad,
          connectedEvidenceSources: connectedEvidenceSources.length,
        },
        decisions,
        approvedBy: approvedBy ?? 'dry-run',
        commit: cleanBool(body.commit),
        ledgerPath,
      }),
    });
  } catch (error) {
    console.error('crm-vnext evidence-review-decisions api error', error);
    return res.status(500).json({ ok: false, error: 'evidence_review_decisions_failed' });
  }
}
