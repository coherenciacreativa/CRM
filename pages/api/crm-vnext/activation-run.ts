import type { NextApiRequest, NextApiResponse } from 'next';
import {
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
  loadLegacyPersonCardsV1AsPersonCards,
  publicLegacyPersonCardsV1Source,
  type PublicLegacyPersonCardsV1Source,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextActivationRun,
  type CrmActivationRunReport,
} from '../../../lib/crm/crm-vnext-activation-run';
import type { CrmFactSourceKind } from '../../../lib/crm/crm-vnext-fact-intake';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      source: PublicLegacyPersonCardsV1Source;
      activation: CrmActivationRunReport;
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
      return res.status(400).json({ ok: false, error: 'activation_text_required' });
    }

    const commit = cleanBool(body.commit);
    const approvedBy = cleanString(body.approvedBy);
    if (commit && !approvedBy) {
      return res.status(400).json({ ok: false, error: 'activation_approved_by_required' });
    }

    const sourcePath =
      queryPathOverride(req, 'sourcePath', process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH)
      ?? DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
    const storePath = queryPathOverride(req, 'storePath');
    const cardsPayload = await loadLegacyPersonCardsV1AsPersonCards(sourcePath);

    return res.status(200).json({
      ok: true,
      source: publicLegacyPersonCardsV1Source(cardsPayload.source),
      activation: await buildCrmVNextActivationRun({
        text,
        sourceKind: cleanSourceKind(body.sourceKind),
        reporter: cleanString(body.reporter),
        channel: cleanString(body.channel),
        occurredAt: cleanString(body.occurredAt),
        approvedBy: approvedBy ?? 'dry-run',
        commit,
        storePath,
        cards: cardsPayload.cards,
      }),
    });
  } catch (error) {
    console.error('crm-vnext activation-run api error', error);
    return res.status(500).json({ ok: false, error: 'activation_run_failed' });
  }
}
