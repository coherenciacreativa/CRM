import type { NextApiRequest, NextApiResponse } from 'next';
import { serialize } from 'cookie';

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? '';
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

const stateCookieName = 'gmail_oauth_state';

function buildRedirectUri(req: NextApiRequest) {
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  const protoHeader = req.headers['x-forwarded-proto'];
  const isHttps = protoHeader ? String(protoHeader).includes('https') : Boolean(process.env.VERCEL);
  const protocol = isHttps ? 'https' : 'http';
  return `${protocol}://${host}/api/google/oauth/callback`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  if (!CLIENT_ID) {
    return res.status(500).json({ ok: false, error: 'missing_google_client_id' });
  }

  const state = crypto.randomUUID();
  const redirectUri = buildRedirectUri(req);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: SCOPES,
    state,
    include_granted_scopes: 'true',
  });

  res.setHeader(
    'Set-Cookie',
    serialize(stateCookieName, state, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 300,
    }),
  );

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}
