import { bestName } from '../lib/names.js';
import { sbPatch, sbReady, sbSelect } from '../lib/utils/sb.js';

const DRY = process.env.DRY !== '0';
const LIMIT = Number(process.env.LIMIT || 200);

if (!sbReady()) {
  console.error('Supabase credentials missing');
  process.exit(1);
}

async function listContacts(limit) {
  const qs = `contacts?select=id,name,ig_username,ig_display_name,email,name_source&limit=${limit}`;
  const result = await sbSelect(qs);
  if (!result.ok || !Array.isArray(result.json)) {
    throw new Error(`Failed to list contacts: ${result.status}`);
  }
  return result.json;
}

async function run() {
  const rows = await listContacts(LIMIT);
  for (const row of rows) {
    const currentName = row.name ? String(row.name).trim() : '';
    const igUsername = row.ig_username ? String(row.ig_username).trim() : '';
    if (currentName && currentName !== igUsername) continue;
    const { name, source } = bestName({
      fullName: row.ig_display_name,
      username: igUsername,
      email: row.email,
    });
    if (!name) continue;
    if (DRY) {
      console.log('[DRY]', row.id, '→', name, source);
      continue;
    }
    const patch = { name, name_source: source };
    const response = await sbPatch(`contacts?id=eq.${encodeURIComponent(String(row.id))}`, patch);
    if (!response.ok) {
      console.warn('Patch failed', row.id, response.status, response.json);
    } else {
      console.log('Updated', row.id, name, source);
    }
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(99);
});
