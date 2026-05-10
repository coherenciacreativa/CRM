import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextContactsEvidenceHelper,
  type CrmContactsEvidenceHelperReport,
} from '../../../lib/crm/crm-vnext-contacts-evidence-helper';
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
        contacts: {
          liveContactsCalledByApi: false;
          searchResultsSupplied: number;
        };
      };
      helper: CrmContactsEvidenceHelperReport;
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

const queryPathOverride = (
  req: NextApiRequest,
  queryKey: string,
  fallback: string | null = null,
): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return fallback;
  const value = req.query[queryKey];
  return cleanString(Array.isArray(value) ? value[0] : value) ?? fallback;
};

const suppliedResultsCount = (value: unknown): number => {
  if (Array.isArray(value)) return value.length;
  if (!value || typeof value !== 'object') return 0;
  const record = value as Record<string, unknown>;
  for (const key of ['contacts', 'people', 'results']) {
    if (Array.isArray(record[key])) return record[key].length;
  }
  return 0;
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
      return res.status(400).json({ ok: false, error: 'contacts_evidence_text_required' });
    }

    const sourcePath =
      queryPathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const mailerBridgePath =
      queryPathOverride(req, 'mailerBridgePath', process.env.CRM_VNEXT_MAILER_BRIDGE_ENRICHED_PATH || DEFAULT_MAILER_BRIDGE_ENRICHED_PATH)
      ?? DEFAULT_MAILER_BRIDGE_ENRICHED_PATH;
    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);
    const mailerBridgeRows = await loadMailerBridgeCandidates(mailerBridgePath);

    const helper = buildCrmVNextContactsEvidenceHelper({
      text,
      sourceKind: cleanSourceKind(body.sourceKind),
      reporter: cleanString(body.reporter),
      channel: cleanString(body.channel),
      occurredAt: cleanString(body.occurredAt),
      authBlocker: cleanString(body.authBlocker),
      cards: cardsPayload.cards,
      mailerBridgeRows,
      contactsSearchResults: body.contactsSearchResults,
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
        contacts: {
          liveContactsCalledByApi: false,
          searchResultsSupplied: suppliedResultsCount(body.contactsSearchResults),
        },
      },
      helper,
    });
  } catch (error) {
    console.error('crm-vnext contacts-evidence-helper api error', error);
    return res.status(500).json({ ok: false, error: 'contacts_evidence_helper_failed' });
  }
}
