import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { EmailGuess } from '../lib/utils/extract.js';
import { sbReady, sbSelect, sbPatch } from '../lib/utils/sb.js';
import { executePipeline, type ManyChatPayload, type PipelineResult } from './manychat-webhook.js';

const MAX_BATCH = 100;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const tokenOk =
      !process.env.API_TOKEN ||
      req.headers['x-api-token'] === process.env.API_TOKEN ||
      req.query?.token === process.env.API_TOKEN;
    if (!tokenOk) {
      return res.status(401).json({ ok: false, error: 'unauthorized' });
    }

    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const qs = `webhook_events?select=*&status=in.(NEW,FAILED)&order=created_at.asc&limit=${MAX_BATCH}`;
    const selectResult = await sbSelect(qs);

    if (!selectResult.ok || !Array.isArray(selectResult.json)) {
      return res.status(500).json({ ok: false, error: 'select_failed', detail: selectResult.json });
    }

    const events = selectResult.json as Array<Record<string, unknown>>;
    let processed = 0;
    let failed = 0;
    const results: Array<{ id: number | string; status: 'PROCESSED' | 'FAILED'; error: string | null }> = [];

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
      results.push({ id, status, error: errorMessage });
    }

    return res.status(200).json({
      ok: true,
      started: true,
      total: events.length,
      processed,
      failed,
      results,
    });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
