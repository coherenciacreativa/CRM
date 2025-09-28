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

export async function sbInsert(table: string, row: Record<string, unknown>) {
  const response = await fetch(`${SB}/rest/v1/${table}`, {
    method: 'POST',
    headers: SB_HEADERS,
    body: JSON.stringify([row]),
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

export async function sbSelect(resource: string, params?: Record<string, string | number>) {
  const url = new URL(`${SB}/rest/v1/${resource}`);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, String(value));
    }
  }
  const headers = { ...SB_HEADERS, Prefer: 'return=representation' };
  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });
  const json = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, json };
}
