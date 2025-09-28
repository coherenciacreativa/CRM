import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { EmailGuess } from '../lib/utils/extract.js';
import { sbReady, sbSelect, sbPatch } from '../lib/utils/sb.js';
import { executePipeline, type ManyChatPayload, type PipelineResult } from './manychat-webhook.js';

const DEFAULT_LIMIT = 100;

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

    const selectResult = await sbSelect(
      `webhook_events?select=*&status=in.(NEW,FAILED)&order=created_at.asc&limit=${limit}`,
    );
    if (!selectResult.ok || !Array.isArray(selectResult.json)) {
      return res.status(500).json({ ok: false, error: 'select_failed', detail: selectResult.json });
    }

    const events = selectResult.json as Array<Record<string, unknown>>;
    let processed = 0;
    let failed = 0;

    for (const event of events) {
      const id = event.id as number | string;
      const rawPayload = event.raw_payload as ManyChatPayload | undefined;
      const extractedEmail = typeof event.extracted_email === 'string' ? event.extracted_email : null;
      const extractionConfidence = Number(event.extraction_confidence ?? 0) || 0;
      const guess: EmailGuess | null = extractedEmail
        ? { email: extractedEmail, confidence: extractionConfidence }
        : null;

      let status: 'PROCESSED' | 'FAILED' = 'PROCESSED';
      let errorMessage: string | null = null;
      let pipelineResult: PipelineResult | null = null;

      if (!rawPayload || typeof rawPayload !== 'object') {
        status = 'FAILED';
        errorMessage = 'missing_raw_payload';
        failed += 1;
      } else {
        try {
          pipelineResult = await executePipeline(rawPayload, guess);
          processed += 1;
        } catch (pipelineError) {
          status = 'FAILED';
          errorMessage = (pipelineError as Error).message;
          failed += 1;
        }
      }

      const patchPayload: Record<string, unknown> = {
        status,
        error: errorMessage,
        updated_at: new Date().toISOString(),
      };
      if (pipelineResult?.resolvedEmail ?? guess?.email) {
        patchPayload.extracted_email = pipelineResult?.resolvedEmail ?? guess?.email;
      }

      await sbPatch(`webhook_events?id=eq.${encodeURIComponent(String(id))}`, patchPayload);
    }

    return res.status(200).json({
      ok: true,
      checked: events.length,
      processed,
      failed,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
