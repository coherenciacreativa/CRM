#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/contacts-evidence-helper';

const usage = `Usage:
  node scripts/crm-vnext-contacts-evidence.mjs --text <text> [options]
  node scripts/crm-vnext-contacts-evidence.mjs --text-file <path> [options]

Options:
  --api-url <url>             Contacts evidence helper API URL. Defaults to ${DEFAULT_API_URL}
  --text <text>               CRM facts/report text to build Contacts evidence for
  --text-file <path>          Local text file with CRM facts/report text
  --source-kind <kind>        alejandro_conversation | telegram_human_report | mailerlite_tag_snapshot | instagram_signal | manual_import | unknown
  --reporter <name>           Reporter name, e.g. Alejandro or Juana
  --channel <channel>         Channel name, e.g. codex
  --search-results-file <path>
                              JSON Contacts search results from a read-only export
  --use-macos-contacts-db     Run a targeted read-only search against the local macOS Contacts SQLite store
  --contacts-db <path>        Specific AddressBook .abcddb file. Can be repeated.
  --fail-on-auth-block        Exit non-zero when Contacts access is blocked
  --help                      Show this help

This command is read-only. It can plan Contacts searches, convert supplied Contacts results into evidenceSources, or query the local Contacts DB by planned terms. It never mutates Contacts, mutates CRM cards, writes Fact Store, sends outbound messages, or reads credentials.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    text: null,
    textFile: null,
    sourceKind: 'unknown',
    reporter: null,
    channel: null,
    searchResultsFile: null,
    useMacosContactsDb: false,
    contactsDbs: [],
    failOnAuthBlock: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--use-macos-contacts-db') options.useMacosContactsDb = true;
    else if (arg === '--fail-on-auth-block') options.failOnAuthBlock = true;
    else if (arg === '--api-url') options.apiUrl = argv[++index];
    else if (arg === '--text') options.text = argv[++index];
    else if (arg === '--text-file') options.textFile = argv[++index];
    else if (arg === '--source-kind') options.sourceKind = argv[++index];
    else if (arg === '--reporter') options.reporter = argv[++index];
    else if (arg === '--channel') options.channel = argv[++index];
    else if (arg === '--search-results-file') options.searchResultsFile = argv[++index];
    else if (arg === '--contacts-db') options.contactsDbs.push(argv[++index]);
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const headers = () => {
  const result = { 'content-type': 'application/json' };
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    result['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }
  return result;
};

const readText = async (options) => {
  if (options.text) return options.text;
  if (options.textFile) return readFile(resolve(options.textFile), 'utf8');
  return null;
};

const readSearchResults = async (options) => {
  if (!options.searchResultsFile) return [];
  const raw = await readFile(resolve(options.searchResultsFile), 'utf8');
  return JSON.parse(raw);
};

const callHelper = async (options, extraBody = {}) => {
  const text = await readText(options);
  if (!text) throw new Error('contacts_evidence_text_required');

  const response = await fetch(options.apiUrl, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      text,
      sourceKind: options.sourceKind,
      reporter: options.reporter,
      channel: options.channel,
      ...extraBody,
    }),
  });
  if (!response.ok) throw new Error(`contacts_evidence_helper_api_failed:${response.status}`);
  const payload = await response.json();
  if (!payload.ok) throw new Error(`contacts_evidence_helper_api_error:${payload.error ?? 'unknown'}`);
  return payload;
};

const defaultContactsDbs = async () => {
  const root = join(homedir(), 'Library', 'Application Support', 'AddressBook');
  const dbs = [join(root, 'AddressBook-v22.abcddb')];
  try {
    const sources = await readdir(join(root, 'Sources'), { withFileTypes: true });
    for (const entry of sources) {
      if (entry.isDirectory()) dbs.push(join(root, 'Sources', entry.name, 'AddressBook-v22.abcddb'));
    }
  } catch {
    // The root DB is enough for many local setups; source DBs are opportunistic.
  }
  return dbs;
};

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

const termsFromHelper = (helper) => {
  const terms = [];
  for (const plan of helper.queryPlans ?? []) {
    for (const term of plan.searchTerms ?? []) {
      const normalized = String(term).trim().replace(/^@+/, '').toLowerCase();
      if (normalized.length >= 5) terms.push(normalized);
    }
  }
  return Array.from(new Set(terms)).slice(0, 12);
};

const contactsSql = (terms) => {
  const recordSearchable = [
    "COALESCE(r.ZFIRSTNAME,'')",
    "COALESCE(r.ZMIDDLENAME,'')",
    "COALESCE(r.ZLASTNAME,'')",
    "COALESCE(r.ZNAME,'')",
    "COALESCE(r.ZNICKNAME,'')",
    "COALESCE(r.ZORGANIZATION,'')",
  ].join(" || ' ' || ");
  const recordWhere = terms
    .map((term) => `lower(${recordSearchable}) LIKE '%' || ${sqlString(term)} || '%'`)
    .join(' OR ');
  const emailWhere = terms
    .map((term) => `lower(COALESCE(ZADDRESS,'')) LIKE '%' || ${sqlString(term)} || '%'`)
    .join(' OR ');
  const phoneWhere = terms
    .map((term) => term.replace(/\D/g, ''))
    .filter((term) => term.length >= 6)
    .map((term) => `replace(replace(replace(replace(COALESCE(ZFULLNUMBER,''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE '%' || ${sqlString(term)} || '%'`)
    .join(' OR ');
  const socialWhere = terms
    .map((term) => `lower(COALESCE(ZUSERNAME,'') || ' ' || COALESCE(ZUSERIDENTIFIER,'') || ' ' || COALESCE(ZURLSTRING,'')) LIKE '%' || ${sqlString(term)} || '%'`)
    .join(' OR ');
  return `
WITH candidates AS (
  SELECT DISTINCT r.Z_PK AS id,
    TRIM(COALESCE(r.ZFIRSTNAME,'') || ' ' || COALESCE(r.ZMIDDLENAME,'') || ' ' || COALESCE(r.ZLASTNAME,'')) AS fullName,
    r.ZNAME AS name,
    r.ZNICKNAME AS nickname,
    r.ZORGANIZATION AS organization
  FROM ZABCDRECORD r
  WHERE ${recordWhere || '0'}
  UNION
  SELECT DISTINCT r.Z_PK AS id,
    TRIM(COALESCE(r.ZFIRSTNAME,'') || ' ' || COALESCE(r.ZMIDDLENAME,'') || ' ' || COALESCE(r.ZLASTNAME,'')) AS fullName,
    r.ZNAME AS name,
    r.ZNICKNAME AS nickname,
    r.ZORGANIZATION AS organization
  FROM ZABCDRECORD r
  JOIN ZABCDEMAILADDRESS e ON e.ZOWNER = r.Z_PK OR e.Z22_OWNER = r.Z_PK
  WHERE ${emailWhere || '0'}
  UNION
  SELECT DISTINCT r.Z_PK AS id,
    TRIM(COALESCE(r.ZFIRSTNAME,'') || ' ' || COALESCE(r.ZMIDDLENAME,'') || ' ' || COALESCE(r.ZLASTNAME,'')) AS fullName,
    r.ZNAME AS name,
    r.ZNICKNAME AS nickname,
    r.ZORGANIZATION AS organization
  FROM ZABCDRECORD r
  JOIN ZABCDPHONENUMBER p ON p.ZOWNER = r.Z_PK OR p.Z22_OWNER = r.Z_PK
  WHERE ${phoneWhere || '0'}
  UNION
  SELECT DISTINCT r.Z_PK AS id,
    TRIM(COALESCE(r.ZFIRSTNAME,'') || ' ' || COALESCE(r.ZMIDDLENAME,'') || ' ' || COALESCE(r.ZLASTNAME,'')) AS fullName,
    r.ZNAME AS name,
    r.ZNICKNAME AS nickname,
    r.ZORGANIZATION AS organization
  FROM ZABCDRECORD r
  JOIN ZABCDSOCIALPROFILE s ON s.ZOWNER = r.Z_PK OR s.Z22_OWNER = r.Z_PK
  WHERE ${socialWhere || '0'}
)
SELECT json_object(
  'id', c.id,
  'sourceId', 'contacts:macos:' || c.id,
  'fullName', NULLIF(c.fullName, ''),
  'name', c.name,
  'nickname', c.nickname,
  'organization', c.organization,
  'emails', COALESCE((SELECT json_group_array(DISTINCT e.ZADDRESS) FROM ZABCDEMAILADDRESS e WHERE (e.ZOWNER = c.id OR e.Z22_OWNER = c.id) AND e.ZADDRESS IS NOT NULL), json('[]')),
  'phones', COALESCE((SELECT json_group_array(DISTINCT p.ZFULLNUMBER) FROM ZABCDPHONENUMBER p WHERE (p.ZOWNER = c.id OR p.Z22_OWNER = c.id) AND p.ZFULLNUMBER IS NOT NULL), json('[]')),
  'socials', COALESCE((SELECT json_group_array(DISTINCT COALESCE(s.ZUSERNAME, s.ZUSERIDENTIFIER, s.ZURLSTRING)) FROM ZABCDSOCIALPROFILE s WHERE (s.ZOWNER = c.id OR s.Z22_OWNER = c.id) AND COALESCE(s.ZUSERNAME, s.ZUSERIDENTIFIER, s.ZURLSTRING) IS NOT NULL), json('[]'))
) AS contact_json
FROM candidates c
LIMIT 50;
`;
};

const parseSqliteJsonLines = (stdout) => {
  const rows = stdout
    ? (() => {
    try {
      const parsed = JSON.parse(stdout);
      if (Array.isArray(parsed)) {
        return parsed.map((row) => JSON.parse(row.contact_json ?? JSON.stringify(row)));
      }
    } catch {
      // Fall through to newline parsing for older sqlite output modes.
    }
    return stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        try {
          const parsed = JSON.parse(line);
          return JSON.parse(parsed.contact_json ?? line);
        } catch {
          return null;
        }
      });
  })()
    : [];
  return rows.filter(Boolean);
};

const collectMacosContactsResults = async (options, helper) => {
  const terms = termsFromHelper(helper);
  if (!terms.length) return [];
  const dbs = options.contactsDbs.length ? options.contactsDbs.map(resolve) : await defaultContactsDbs();
  const contacts = [];
  const seen = new Set();
  for (const db of dbs) {
    try {
      const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', db, contactsSql(terms)], {
        timeout: 20_000,
        maxBuffer: 4 * 1024 * 1024,
      });
      for (const contact of parseSqliteJsonLines(stdout)) {
        const key = JSON.stringify([contact.fullName, contact.name, contact.emails, contact.phones, contact.socials]);
        if (seen.has(key)) continue;
        seen.add(key);
        contacts.push(contact);
      }
    } catch {
      // Ignore individual source DB failures; report a blocker only if no DB can be read.
    }
  }
  return contacts;
};

const compactPayload = (payload) => ({
  ok: true,
  mode: payload.helper.mode,
  generatedAt: payload.helper.generatedAt,
  source: payload.source,
  summary: payload.helper.summary,
  auth: payload.helper.auth,
  queryPlans: payload.helper.queryPlans.map((plan) => ({
    clueId: plan.clueId,
    person: plan.person,
    searchTerms: plan.searchTerms,
    reason: plan.reason,
  })),
  evidenceSources: payload.helper.evidenceSources,
  safety: payload.helper.safety,
});

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const suppliedResults = await readSearchResults(options);
  let payload = await callHelper(options, {
    contactsSearchResults: suppliedResults,
  });

  if (options.useMacosContactsDb) {
    try {
      const contactsResults = await collectMacosContactsResults(options, payload.helper);
      payload = await callHelper(options, {
        contactsSearchResults: contactsResults,
      });
    } catch (error) {
      payload = await callHelper(options, {
        authBlocker: error instanceof Error ? error.message : 'macos_contacts_read_blocked',
      });
    }
  }

  console.log(JSON.stringify(compactPayload(payload), null, 2));

  if (options.failOnAuthBlock && payload.helper.summary.authBlocked) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext contacts-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
