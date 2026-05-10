import type { NextApiRequest, NextApiResponse } from 'next';
import {
  buildCrmFactIntakeDraft,
  type CrmFactIntakeDraft,
  type CrmFactSourceKind,
} from '../../../lib/crm/crm-vnext-fact-intake';
import { authorizeCrmVNextInternalRead } from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      draft: CrmFactIntakeDraft;
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
      return res.status(400).json({ ok: false, error: 'fact_intake_text_required' });
    }

    const draft = buildCrmFactIntakeDraft({
      text,
      sourceKind: cleanSourceKind(body.sourceKind),
      reporter: cleanString(body.reporter),
      channel: cleanString(body.channel),
      occurredAt: cleanString(body.occurredAt),
    });

    return res.status(200).json({ ok: true, draft });
  } catch (error) {
    console.error('crm-vnext fact-intake api error', error);
    return res.status(500).json({ ok: false, error: 'fact_intake_failed' });
  }
}
