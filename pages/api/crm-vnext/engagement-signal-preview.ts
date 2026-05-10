import type { NextApiRequest, NextApiResponse } from 'next';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from '../../../lib/crm/community-insights-source';
import {
  buildCrmVNextEngagementSignalPreview,
  type CrmEngagementSignalPreviewReport,
} from '../../../lib/crm/crm-vnext-engagement-signal-preview';
import {
  authorizeCrmVNextInternalRead,
} from '../../../lib/crm/crm-vnext-api-guard';
import { resolveCrmVNextReadSourceOptions } from '../../../lib/crm/crm-vnext-read-source-options';

type ApiBody =
  | {
      ok: true;
      source: PublicPersonCardsVNextSource;
      liveSources: {
        mailerLiteLiveApiCalled: false;
        gmailLiveApiCalled: false;
        instagramLiveApiCalled: false;
        manyChatLiveApiCalled: false;
      };
      preview: CrmEngagementSignalPreviewReport;
    }
  | { ok: false; error: string };

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
    const sourceOptions = resolveCrmVNextReadSourceOptions(req);
    const payload = await loadPersonCardsVNext(sourceOptions);
    const preview = buildCrmVNextEngagementSignalPreview({
      cards: payload.cards,
      signals: Array.isArray(body.signals) ? body.signals as never : [],
    });

    return res.status(200).json({
      ok: true,
      source: publicPersonCardsVNextSource(payload.source),
      liveSources: {
        mailerLiteLiveApiCalled: false,
        gmailLiveApiCalled: false,
        instagramLiveApiCalled: false,
        manyChatLiveApiCalled: false,
      },
      preview,
    });
  } catch (error) {
    console.error('crm-vnext engagement-signal-preview api error', error);
    return res.status(500).json({ ok: false, error: 'engagement_signal_preview_failed' });
  }
}
