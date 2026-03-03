#!/usr/bin/env node

const MAILERLITE_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_GROUP_NAME = 'Perfect Week Leads';

const args = process.argv.slice(2);

const readArg = (key) => {
  const entry = args.find((token) => token.startsWith(`${key}=`));
  return entry ? entry.slice(key.length + 1).trim() : '';
};

const groupName = readArg('--name') || process.env.PERFECT_WEEK_GROUP_NAME || DEFAULT_GROUP_NAME;
const key =
  process.env.MAILERLITE_API_KEY || process.env.MAILERLITE_TOKEN || process.env.ML_API_KEY || '';

if (!key) {
  console.error('Missing MailerLite API key env (MAILERLITE_API_KEY/MAILERLITE_TOKEN/ML_API_KEY).');
  process.exit(1);
}

const request = async (path, init = {}) => {
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
  let json = null;
  if (text) {
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }
  }

  return { response, json };
};

const findExistingGroup = async (name) => {
  const { response, json } = await request('/groups?limit=100');
  if (!response.ok) {
    throw new Error(`groups_list_failed_${response.status}`);
  }

  const groups = Array.isArray(json?.data) ? json.data : [];
  const match = groups.find((group) => {
    const candidate = String(group?.name || '').trim().toLowerCase();
    return candidate === name.trim().toLowerCase();
  });

  return match || null;
};

const createGroup = async (name) => {
  const { response, json } = await request('/groups', {
    method: 'POST',
    body: JSON.stringify({ name }),
  });

  if (!response.ok) {
    throw new Error(`group_create_failed_${response.status}`);
  }

  return json?.data || null;
};

(async () => {
  try {
    const existing = await findExistingGroup(groupName);
    if (existing?.id) {
      console.log(JSON.stringify({ ok: true, created: false, id: String(existing.id), name: existing.name }));
      return;
    }

    const created = await createGroup(groupName);
    if (!created?.id) {
      throw new Error('group_create_missing_id');
    }

    console.log(JSON.stringify({ ok: true, created: true, id: String(created.id), name: created.name || groupName }));
  } catch (error) {
    console.error(`Failed to create/find group: ${error instanceof Error ? error.message : 'unknown_error'}`);
    process.exit(1);
  }
})();
