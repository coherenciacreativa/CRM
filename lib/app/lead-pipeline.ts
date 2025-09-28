import type { EmailGuess } from '../utils/extract.js';
import { getDmText } from '../utils/payload.js';
import { executePipeline, type ManyChatPayload, type PipelineResult } from '../../api/manychat-webhook.js';

export type UpsertInput = {
  payload: ManyChatPayload;
  text?: string | null;
  email?: string | null;
  confidence?: number | null;
};

/**
 * Re-runs the ManyChat pipeline for a stored webhook event.
 */
export async function upsertContactAndMailerlite({
  payload,
  email,
  confidence,
}: UpsertInput): Promise<PipelineResult> {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid payload for reprocess');
  }

  const guess: EmailGuess | null = email
    ? {
        email,
        confidence: typeof confidence === 'number' && Number.isFinite(confidence) ? confidence : 0.7,
      }
    : null;

  const dmText = getDmText(payload as any);
  const igProfileName =
    (payload as any)?.full_name ??
    (payload as any)?.subscriber?.name ??
    (payload as any)?.subscriber?.full_name ??
    '';
  const igUsername =
    (payload as any)?.instagram_username ??
    (payload as any)?.subscriber?.username ??
    '';

  return executePipeline(payload, guess, {
    dmText,
    igProfileName,
    igUsername,
  });
}
