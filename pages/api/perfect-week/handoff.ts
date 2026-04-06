import type { NextApiRequest, NextApiResponse } from 'next';

type HandoffResponse =
  | {
      ok: true;
      scanned: number;
      due: number;
      handedOff: number;
      skippedAlreadyOnboarding: number;
      failed: number;
    }
  | {
      ok: false;
      error: string;
      message: string;
    };

const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_EMAIL0_GROUP = '153400728188094209';
const DEFAULT_DELAY_HOURS = 24;

const normalizeText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
const isNumericGroupId = (value: string) => /^\d{5,}$/.test(value);

const splitGroupIds = (value: string) =>
  value
    .split(',')
    .map((item) => normalizeText(item))
    .filter(Boolean);

const getMailerLiteKey = () =>
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

const getCronSecret = () => normalizeText(process.env.PERFECT_WEEK_HANDOFF_CRON_SECRET || process.env.CRONJOB_API_KEY);

const isAuthorized = (req: NextApiRequest) => {
  if (req.headers['x-vercel-cron'] === '1') return true;

  const secret = getCronSecret();
  if (!secret) return false;

  const tokenParam = typeof req.query.token === 'string' ? req.query.token : '';
  const auth = req.headers.authorization;
  const bearer = auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7) : auth || '';
  const provided = normalizeText(bearer || tokenParam);

  return Boolean(provided && provided === secret);
};

const resolveConfig = () => {
  const email0Group =
    normalizeText(process.env.PERFECT_WEEK_EMAIL0_GROUP_ID) ||
    normalizeText(process.env.PERFECT_WEEK_TRIGGER_GROUP_ID) ||
    normalizeText(process.env.MAILERLITE_TRIGGER_GROUP_ID) ||
    DEFAULT_EMAIL0_GROUP;

  const onboardingFromPerfectWeek = normalizeText(process.env.PERFECT_WEEK_ONBOARDING_GROUP_ID);
  const onboardingFromMailerLiteGroups = splitGroupIds(normalizeText(process.env.MAILERLITE_GROUP_IDS || ''))[1] || '';
  const onboardingGroup = onboardingFromPerfectWeek || onboardingFromMailerLiteGroups;

  const delayHoursRaw = Number.parseInt(process.env.PERFECT_WEEK_HANDOFF_DELAY_HOURS || '', 10);
  const delayHours = Number.isFinite(delayHoursRaw) && delayHoursRaw > 0 ? delayHoursRaw : DEFAULT_DELAY_HOURS;

  if (!isNumericGroupId(email0Group) || !isNumericGroupId(onboardingGroup)) {
    throw new Error('group_configuration_error');
  }

  return {
    email0Group,
    onboardingGroup,
    delayMs: delayHours * 60 * 60 * 1000,
  };
};

async function mlRequest(path: string, key: string, init: RequestInit = {}) {
  const response = await fetch(`${MAILERLITE_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const text = await response.text();
  let json: unknown = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return { response, json };
}

type Subscriber = {
  id: string;
  email: string;
  createdAt: string | null;
  groups: string[];
};

const toSubscribers = (payload: unknown): Subscriber[] => {
  const rows = Array.isArray((payload as { data?: unknown[] })?.data)
    ? (((payload as { data?: unknown[] }).data || []) as unknown[])
    : [];

  return rows
    .map((row) => {
      const item = (row || {}) as Record<string, unknown>;
      const groupRows = Array.isArray(item.groups) ? (item.groups as unknown[]) : [];
      return {
        id: normalizeText(item.id),
        email: normalizeText(item.email).toLowerCase(),
        createdAt: normalizeText(item.created_at || item.subscribed_at || item.updated_at) || null,
        groups: groupRows
          .map((group) => normalizeText((group as Record<string, unknown>)?.id))
          .filter(Boolean),
      };
    })
    .filter((item) => Boolean(item.email));
};

async function listEmail0GroupSubscribers(groupId: string, key: string) {
  const all: Subscriber[] = [];
  const limit = 100;
  const maxPages = 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const { response, json } = await mlRequest(`/groups/${groupId}/subscribers?limit=${limit}&page=${page}`, key);
    if (!response.ok) {
      throw new Error(`mailerlite_group_subscribers_failed_${response.status}`);
    }

    const chunk = toSubscribers(json);
    if (!chunk.length) break;

    all.push(...chunk);

    const meta = (json as { meta?: Record<string, unknown> })?.meta || {};
    const lastPage = Number(meta.last_page || 0);
    if (Number.isFinite(lastPage) && lastPage > 0 && page >= lastPage) {
      break;
    }

    if (chunk.length < limit) break;
  }

  return all;
}

function isDue(createdAt: string | null, thresholdMs: number) {
  if (!createdAt) return false;
  const parsed = Date.parse(createdAt);
  if (!Number.isFinite(parsed)) return false;
  return parsed <= thresholdMs;
}

async function addToOnboarding(email: string, onboardingGroup: string, key: string) {
  const payload = {
    email,
    resubscribe: true,
    groups: [onboardingGroup],
  };

  const { response } = await mlRequest('/subscribers', key, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.ok || response.status === 409;
}

async function removeFromEmail0(subscriberId: string, email0Group: string, key: string) {
  if (!subscriberId) return;
  try {
    await mlRequest(`/subscribers/${encodeURIComponent(subscriberId)}/groups/${encodeURIComponent(email0Group)}`, key, {
      method: 'DELETE',
    });
  } catch {
    // Best-effort cleanup only.
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<HandoffResponse>) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ ok: false, error: 'method_not_allowed', message: 'Método no permitido.' });
  }

  if (!isAuthorized(req)) {
    return res.status(401).json({ ok: false, error: 'unauthorized', message: 'No autorizado.' });
  }

  const key = getMailerLiteKey();
  if (!key) {
    return res.status(500).json({ ok: false, error: 'mailerlite_not_configured', message: 'Falta MailerLite API key.' });
  }

  let config: ReturnType<typeof resolveConfig>;
  try {
    config = resolveConfig();
  } catch {
    return res.status(500).json({
      ok: false,
      error: 'group_configuration_error',
      message: 'Configura PERFECT_WEEK_EMAIL0_GROUP_ID/PERFECT_WEEK_TRIGGER_GROUP_ID y PERFECT_WEEK_ONBOARDING_GROUP_ID.',
    });
  }

  try {
    const subscribers = await listEmail0GroupSubscribers(config.email0Group, key);
    const thresholdMs = Date.now() - config.delayMs;

    let due = 0;
    let handedOff = 0;
    let skippedAlreadyOnboarding = 0;
    let failed = 0;

    for (const subscriber of subscribers) {
      const alreadyOnboarding = subscriber.groups.includes(config.onboardingGroup);
      if (alreadyOnboarding) {
        skippedAlreadyOnboarding += 1;
        continue;
      }

      if (!isDue(subscriber.createdAt, thresholdMs)) {
        continue;
      }

      due += 1;
      const moved = await addToOnboarding(subscriber.email, config.onboardingGroup, key);
      if (!moved) {
        failed += 1;
        continue;
      }

      handedOff += 1;
      await removeFromEmail0(subscriber.id, config.email0Group, key);
    }

    return res.status(200).json({
      ok: true,
      scanned: subscribers.length,
      due,
      handedOff,
      skippedAlreadyOnboarding,
      failed,
    });
  } catch (error) {
    console.error('perfect-week handoff error', error);
    return res.status(500).json({
      ok: false,
      error: 'handoff_failed',
      message: 'No se pudo completar el handoff en este intento.',
    });
  }
}
