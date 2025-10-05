import { sbSelect, sbUpsert } from './sb.js';

export type GmailTokenRecord = {
  id: string;
  account_email: string;
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expires_at?: string | null;
};

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';

export function gmailReady() {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export async function getGmailToken(): Promise<GmailTokenRecord | null> {
  const response = await sbSelect('gmail_tokens?order=updated_at.desc&limit=1');
  if (!response.ok || !Array.isArray(response.json) || !response.json.length) return null;
  return response.json[0] as GmailTokenRecord;
}

export async function storeGmailToken(data: {
  account_email: string;
  access_token?: string | null;
  refresh_token?: string | null;
  scope?: string | null;
  token_type?: string | null;
  expires_in?: number;
}) {
  const expiresAt = data.expires_in ? new Date(Date.now() + data.expires_in * 1000).toISOString() : null;
  const record = {
    account_email: data.account_email,
    access_token: data.access_token ?? null,
    refresh_token: data.refresh_token ?? null,
    scope: data.scope ?? null,
    token_type: data.token_type ?? null,
    expires_at: expiresAt,
  };
  return sbUpsert('gmail_tokens', record, { returning: 'minimal' });
}

export async function refreshAccessToken(refreshToken: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error('Missing Google OAuth client configuration');
  }
  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Google refresh failed: ${text || response.status}`);
  }
  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
    token_type?: string;
  };
  return data;
}

export function isTokenExpired(expiresAt: string | null | undefined) {
  if (!expiresAt) return true;
  const expiry = new Date(expiresAt).getTime();
  if (Number.isNaN(expiry)) return true;
  return Date.now() > expiry - 60_000; // refresh 1m earlier
}

export function extractEmailAddress(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const match = raw.match(/<([^>]+)>/);
  if (match) return match[1].trim().toLowerCase();
  return raw.trim().replace(/^mailto:/i, '').toLowerCase();
}

export async function ensureAccessToken(token: GmailTokenRecord | null) {
  if (!token) return null;
  if (token.access_token && !isTokenExpired(token.expires_at)) {
    return {
      access_token: token.access_token,
      expires_at: token.expires_at,
      refresh_token: token.refresh_token,
      account_email: token.account_email,
      scope: token.scope,
      token_type: token.token_type,
    };
  }
  if (!token.refresh_token) {
    throw new Error('Missing refresh token for Gmail account');
  }
  const refreshed = await refreshAccessToken(token.refresh_token);
  await storeGmailToken({
    account_email: token.account_email,
    access_token: refreshed.access_token,
    refresh_token: token.refresh_token,
    scope: refreshed.scope ?? token.scope ?? null,
    token_type: refreshed.token_type ?? token.token_type ?? null,
    expires_in: refreshed.expires_in,
  });
  return {
    access_token: refreshed.access_token,
    expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString(),
    refresh_token: token.refresh_token,
    account_email: token.account_email,
    scope: refreshed.scope ?? token.scope ?? null,
    token_type: refreshed.token_type ?? token.token_type ?? null,
  };
}
