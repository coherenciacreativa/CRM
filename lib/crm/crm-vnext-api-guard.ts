import type { NextApiRequest } from 'next';

export type CrmVNextApiAuth =
  | { ok: true }
  | { ok: false; status: number; error: string };

export const getCrmVNextHeader = (value: string | string[] | undefined): string | null => {
  if (Array.isArray(value)) return value[0] || null;
  return value || null;
};

const getBearer = (authorization: string | string[] | undefined): string | null => {
  const value = getCrmVNextHeader(authorization);
  if (!value) return null;
  const match = value.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
};

const isLoopbackAddress = (address: string | undefined): boolean =>
  address === '127.0.0.1' ||
  address === '::1' ||
  address === '::ffff:127.0.0.1';

const isLocalHost = (host: string | null): boolean =>
  Boolean(host && /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(host));

export const isCrmVNextLoopbackRequest = (req: NextApiRequest): boolean =>
  isLocalHost(getCrmVNextHeader(req.headers.host)) && isLoopbackAddress(req.socket?.remoteAddress);

export const allowCrmVNextLocalQueryOverrides = (req: NextApiRequest): boolean =>
  process.env.NODE_ENV !== 'production' || isCrmVNextLoopbackRequest(req);

export const authorizeCrmVNextInternalRead = (req: NextApiRequest): CrmVNextApiAuth => {
  const configuredToken = process.env.CRM_VNEXT_INSIGHTS_TOKEN || '';
  const providedToken =
    getBearer(req.headers.authorization) ||
    getCrmVNextHeader(req.headers['x-crm-vnext-token']);
  const production = process.env.NODE_ENV === 'production';

  if (isCrmVNextLoopbackRequest(req)) return { ok: true };

  if (!production && !configuredToken) return { ok: true };

  if (!configuredToken) {
    return { ok: false, status: 503, error: 'internal_token_not_configured' };
  }

  if (providedToken !== configuredToken) {
    return { ok: false, status: 401, error: 'unauthorized' };
  }

  return { ok: true };
};
