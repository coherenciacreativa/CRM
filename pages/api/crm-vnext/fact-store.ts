import type { NextApiRequest, NextApiResponse } from 'next';
import {
  appendCrmFactsToStore,
  readCrmFactStore,
  type CrmFactStoreAppendResult,
  type CrmFactStoreReadResult,
} from '../../../lib/crm/crm-vnext-fact-store';
import {
  buildCrmFactIntakeDraft,
  type CrmFactEvent,
  type CrmFactIntakeDraft,
  type CrmFactSourceKind,
} from '../../../lib/crm/crm-vnext-fact-intake';
import {
  allowCrmVNextLocalQueryOverrides,
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';

type ApiBody =
  | {
      ok: true;
      store: CrmFactStoreReadResult;
    }
  | {
      ok: true;
      result: CrmFactStoreAppendResult;
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

const getStorePath = (req: NextApiRequest): string | null => {
  if (!allowCrmVNextLocalQueryOverrides(req)) return null;
  const queryPath = cleanString(req.query.storePath);
  return queryPath;
};

const factsFromBody = (body: Record<string, unknown>): { facts: CrmFactEvent[]; draft: Pick<CrmFactIntakeDraft, 'generatedAt'> | null } => {
  const draft = body.draft && typeof body.draft === 'object' ? body.draft as CrmFactIntakeDraft : null;
  if (draft && Array.isArray(draft.facts)) {
    return { facts: draft.facts, draft: { generatedAt: draft.generatedAt } };
  }

  if (Array.isArray(body.facts)) {
    return { facts: body.facts as CrmFactEvent[], draft: null };
  }

  const text = cleanString(body.text);
  if (text) {
    const built = buildCrmFactIntakeDraft({
      text,
      sourceKind: cleanSourceKind(body.sourceKind),
      reporter: cleanString(body.reporter),
      channel: cleanString(body.channel),
      occurredAt: cleanString(body.occurredAt),
    });
    return { facts: built.facts, draft: { generatedAt: built.generatedAt } };
  }

  return { facts: [], draft: null };
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
    const storePath = getStorePath(req);
    if (req.method === 'GET') {
      return res.status(200).json({
        ok: true,
        store: await readCrmFactStore(storePath ?? undefined, { limit: cleanLimit(req.query.limit) }),
      });
    }

    const body = typeof req.body === 'object' && req.body ? req.body as Record<string, unknown> : {};
    const { facts, draft } = factsFromBody(body);
    if (!facts.length) {
      return res.status(400).json({ ok: false, error: 'fact_store_facts_required' });
    }

    const approvedBy = cleanString(body.approvedBy);
    if (cleanBool(body.commit) && !approvedBy) {
      return res.status(400).json({ ok: false, error: 'fact_store_approved_by_required' });
    }

    return res.status(200).json({
      ok: true,
      result: await appendCrmFactsToStore({
        facts,
        draft,
        approvedBy: approvedBy ?? 'dry-run',
        commit: cleanBool(body.commit),
        storePath,
      }),
    });
  } catch (error) {
    console.error('crm-vnext fact-store api error', error);
    return res.status(500).json({ ok: false, error: 'fact_store_failed' });
  }
}
