import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextCardWriteMergePolicy,
  type CrmCardWriteMergePolicyReport,
} from '../../../lib/crm/crm-vnext-card-write-merge-policy';
import {
  DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS,
  DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS,
  loadCrmVNextDeepLocalSources,
  normalizeCrmVNextConnectedEvidenceSources,
} from '../../../lib/crm/crm-vnext-deep-local-stitching';
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
      source: {
        personCards: PublicLegacyPersonCardsV1Source;
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
        liveSources: {
          gmailLiveApiCalled: false;
          mailerLiteLiveApiCalled: false;
        };
      };
      policy: CrmCardWriteMergePolicyReport;
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
      return res.status(400).json({ ok: false, error: 'card_write_merge_policy_text_required' });
    }

    const sourcePath =
      queryPathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const mailerBridgePath =
      queryPathOverride(req, 'mailerBridgePath', process.env.CRM_VNEXT_MAILER_BRIDGE_ENRICHED_PATH || DEFAULT_MAILER_BRIDGE_ENRICHED_PATH)
      ?? DEFAULT_MAILER_BRIDGE_ENRICHED_PATH;
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

    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const mailerBridgeRows = await loadMailerBridgeCandidates(mailerBridgePath);
    const localSourceLoad = await loadCrmVNextDeepLocalSources(localRoots);
    const connectedEvidenceSources = normalizeCrmVNextConnectedEvidenceSources(body.evidenceSources);
    const policy = buildCrmVNextCardWriteMergePolicy({
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
    });

    return res.status(200).json({
      ok: true,
      source: {
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
        },
      },
      policy,
    });
  } catch (error) {
    console.error('crm-vnext card-write-merge-policy api error', error);
    return res.status(500).json({ ok: false, error: 'card_write_merge_policy_failed' });
  }
}
