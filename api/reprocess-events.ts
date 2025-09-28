import type { VercelRequest, VercelResponse } from '@vercel/node';
import { upsertContactAndMailerlite } from '../lib/app/lead-pipeline.js';
import { sbReady, sbSelect, sbPatch, sbInsert } from '../lib/utils/sb.js';

const DEFAULT_LIMIT = 100;
const MAX_ATTEMPTS = Number(process.env.REPROCESS_MAX_ATTEMPTS || 5);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      res.setHeader('Allow', ['GET', 'POST']);
      return res.status(405).json({ ok: false, error: 'method_not_allowed' });
    }

    const providedToken = String(req.headers['x-api-token'] || req.query?.token || '');
    if (process.env.API_TOKEN && providedToken !== process.env.API_TOKEN) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const requestedLimit = parseInt(String(req.query?.limit ?? DEFAULT_LIMIT), 10);
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(200, Math.max(1, requestedLimit))
      : DEFAULT_LIMIT;

    const query = [
      'webhook_events?select=*',
      'status=in.(NEW,FAILED)',
      'permanent_failed=is.false',
      `attempt_count=lt.${MAX_ATTEMPTS}`,
      'order=created_at.asc',
      `limit=${limit}`,
    ].join('&');

    const selectResult = await sbSelect(query);
    if (!selectResult.ok || !Array.isArray(selectResult.json)) {
      return res.status(selectResult.status).json({ ok: false, error: 'select_failed', detail: selectResult.json });
    }

    const events = selectResult.json as Array<Record<string, any>>;
    let processed = 0;
    let failed = 0;
    let checked = 0;

    for (const ev of events) {
      checked += 1;
      const eventId = ev.id;
      const currentAttempts = Number(ev.attempt_count ?? 0) + 1;

      await sbPatch(`webhook_events?id=eq.${encodeURIComponent(String(eventId))}`, {
        attempt_count: currentAttempts,
        last_attempt_at: new Date().toISOString(),
      });

      try {
        await upsertContactAndMailerlite({
          payload: ev.raw_payload,
          email: ev.extracted_email,
          confidence: typeof ev.extraction_confidence === 'number' ? ev.extraction_confidence : undefined,
        });
        await sbPatch(`webhook_events?id=eq.${encodeURIComponent(String(eventId))}`, {
          status: 'PROCESSED',
          error: null,
          permanent_failed: false,
          updated_at: new Date().toISOString(),
        });
        processed += 1;
      } catch (error) {
        const permanent = currentAttempts >= MAX_ATTEMPTS;
        await sbPatch(`webhook_events?id=eq.${encodeURIComponent(String(eventId))}`, {
          status: 'FAILED',
          permanent_failed: permanent,
          error: (error as Error).message ?? String(error),
          updated_at: new Date().toISOString(),
        });
        failed += 1;
      }
    }

    await sbInsert('event_log', {
      source: 'cron',
      action: 'reprocess',
      level: 'info',
      data: { processed, failed, checked, maxAttempts: MAX_ATTEMPTS },
      created_at: new Date().toISOString(),
    });

    return res.status(200).json({ ok: true, processed, failed, checked, maxAttempts: MAX_ATTEMPTS });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
