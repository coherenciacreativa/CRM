import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize, parse } from 'cookie';
import { gmailReady, storeGmailToken, getGmailToken } from '../../../lib/utils/gmail.js';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? '';
const stateCookieName = 'gmail_oauth_state';

function buildRedirectUri(req: NextApiRequest) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protoHeader = req.headers['x-forwarded-proto'];
  const isHttps = protoHeader ? String(protoHeader).includes('https') : Boolean(process.env.VERCEL);
  const protocol = isHttps ? 'https' : 'http';
  return `${protocol}://${host}/api/google/oauth/callback`;
}

async function fetchProfile(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/gmail/v1/users/me/profile', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to fetch Gmail profile (${response.status}): ${text}`);
  }
  const data = (await response.json()) as { emailAddress?: string };
  return data?.emailAddress ?? null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const redirectBase = `${buildRedirectUri(req).replace('/api/google/oauth/callback', '')}/search`;

  if (req.method !== 'GET') {
    return res.redirect(`${redirectBase}?gmail=error&reason=method`);
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !gmailReady()) {
    return res.redirect(`${redirectBase}?gmail=error&reason=config`);
  }

  const { code, state, error } = req.query;
  if (error) {
    return res.redirect(`${redirectBase}?gmail=error&reason=denied`);
  }

  if (!code || typeof code !== 'string') {
    return res.redirect(`${redirectBase}?gmail=error&reason=missing_code`);
  }

  const cookies = parse(req.headers.cookie || '');
  const storedState = cookies[stateCookieName];
  if (!state || typeof state !== 'string' || !storedState || storedState !== state) {
    res.setHeader('Set-Cookie', serialize(stateCookieName, '', { path: '/', maxAge: 0 }));
    return res.redirect(`${redirectBase}?gmail=error&reason=state`);
  }

  const redirectUri = buildRedirectUri(req);

  const params = new URLSearchParams({
    code,
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!tokenResponse.ok) {
      const text = await tokenResponse.text();
      throw new Error(`Token exchange failed (${tokenResponse.status}): ${text}`);
    }

    const tokenData = (await tokenResponse.json()) as {
      access_token: string;
      expires_in: number;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
    };

    const accessToken = tokenData.access_token;
    let refreshToken = tokenData.refresh_token;
    if (!refreshToken) {
      const existingRecord = await getGmailToken();
      if (!existingRecord?.refresh_token) {
        throw new Error('Missing refresh token. Ask the user to remove access and try again.');
      }
      refreshToken = existingRecord.refresh_token;
    }

    const accountEmail = await fetchProfile(accessToken);
    if (!accountEmail) {
      throw new Error('Unable to determine Gmail account email');
    }

    await storeGmailToken({
      account_email: accountEmail,
      access_token: accessToken,
      refresh_token: refreshToken,
      scope: tokenData.scope,
      token_type: tokenData.token_type,
      expires_in: tokenData.expires_in,
    });

    res.setHeader('Set-Cookie', serialize(stateCookieName, '', { path: '/', maxAge: 0 }));
    return res.redirect(`${redirectBase}?gmail=connected`);
  } catch (err) {
    console.error('google oauth callback error', err);
    res.setHeader('Set-Cookie', serialize(stateCookieName, '', { path: '/', maxAge: 0 }));
    return res.redirect(`${redirectBase}?gmail=error&reason=callback`);
  }
}
