const SB = process.env.SUPABASE_URL || process.env.SUPABASE_URL_CRM || '';
const SR = process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_CRM || '';

const SB_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
  apikey: SR,
  Authorization: `Bearer ${SR}`,
};

export function sbReady() {
  return Boolean(SB && SR);
}

export async function sbInsert(table: string, row: Record<string, unknown> | Record<string, unknown>[]) {
  const payload = Array.isArray(row) ? row : [row];
  const response = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify(payload),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

export async function sbPatch(resource: string, patch: Record<string, unknown>) {
  const response = await fetch(`${SB}/rest/v1/${resource}`, {
    method: 'PATCH',
    headers: SB_HEADERS,
    body: JSON.stringify(patch),
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

export async function sbSelect(qs: string) {
  const response = await fetch(`${SB}/rest/v1/${qs}`, {
    method: 'GET',
    headers: SB_HEADERS,
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}

export async function safeSbPatchContactByEmail(email: string | undefined, patch: Record<string, unknown>) {
  if (!email || !email.trim()) return;
  if (!patch || !Object.keys(patch).length) return;
  try {
    const response = await fetch(`${SB}/rest/v1/contacts?email=eq.${encodeURIComponent(email)}`, {
      method: 'PATCH',
      headers: {
        ...SB_HEADERS,
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(patch),
    });
    if (!response.ok && response.status >= 500) {
      throw new Error(`Supabase contact patch failed (status ${response.status})`);
    }
  } catch (error) {
    console.warn('safeSbPatchContactByEmail failed', error);
  }
}
