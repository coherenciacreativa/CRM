import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sbReady, sbSelect } from '../../lib/utils/sb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const limit = Math.min(50, Math.max(1, parseInt(String(req.query.limit ?? '20'), 10) || 20));
    const qs =
      'webhook_events?select=id,provider,contact_id,message_id,extracted_email,status,created_at' +
      `&order=created_at.desc&limit=${limit}`;
    const result = await sbSelect(qs);

    if (!result.ok) {
      return res.status(result.status).json({ ok: false, error: 'select_failed', detail: result.json });
    }

    return res.status(200).json({ ok: true, items: result.json });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
