import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sbReady, sbSelect } from '../../lib/utils/sb.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (!sbReady()) {
      return res.status(503).json({ ok: false, error: 'missing_supabase_env' });
    }

    const latest = await sbSelect(
      'webhook_events?select=id,extracted_email,status,attempt_count,permanent_failed,created_at&order=created_at.desc&limit=50',
    );
    if (!latest.ok) {
      return res.status(latest.status).json({ ok: false, error: 'select_failed', detail: latest.json });
    }

    return res.status(200).json({ ok: true, latest: latest.json });
  } catch (error) {
    return res.status(500).json({ ok: false, error: (error as Error).message });
  }
}
