#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { promisify } from 'node:util';
import {
  buildWhatsAppGroupRosterEvidencePacket,
  markdownForWhatsAppGroupRosterEvidencePacket,
  normalizePhone,
  phoneDigits,
} from '../lib/crm/crm-vnext-whatsapp-group-roster-evidence.js';

const execFileAsync = promisify(execFile);

const usage = `Usage:
  node scripts/crm-vnext-whatsapp-group-roster-evidence.mjs --roster-file <json> [options]

Options:
  --roster-file <path>        JSON array of WhatsApp group roster rows
  --contacts-file <path>      Optional supplied Contacts export JSON
  --use-macos-contacts-db     Query local macOS Contacts SQLite DB read-only
  --contacts-db <path>        Specific AddressBook .abcddb file. Can be repeated.
  --card-store <path>         Defaults to .crm-vnext/person-card-store/person-cards-vnext.json
  --group-name <name>         Defaults to Encuentro Feliz
  --group-id <id>             Defaults to encuentro-feliz
  --observed-at <iso>         Optional observation timestamp
  --out <path>                JSON output path
  --markdown-out <path>       Markdown output path
  --events-out <path>         Signal events JSON output path
  --help                      Show help

Read-only. This command never sends WhatsApp messages, mutates WhatsApp groups, mutates Contacts,
writes CRM cards, writes Fact Store, or performs outbound actions.`;

const parseArgs = (argv) => {
  const options = {
    rosterFile: null,
    contactsFile: null,
    useMacosContactsDb: false,
    contactsDbs: [],
    cardStore: '.crm-vnext/person-card-store/person-cards-vnext.json',
    groupName: 'Encuentro Feliz',
    groupId: 'encuentro-feliz',
    observedAt: null,
    out: null,
    markdownOut: null,
    eventsOut: null,
    help: false,
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--roster-file') options.rosterFile = argv[++index];
    else if (arg === '--contacts-file') options.contactsFile = argv[++index];
    else if (arg === '--use-macos-contacts-db') options.useMacosContactsDb = true;
    else if (arg === '--contacts-db') options.contactsDbs.push(argv[++index]);
    else if (arg === '--card-store') options.cardStore = argv[++index];
    else if (arg === '--group-name') options.groupName = argv[++index];
    else if (arg === '--group-id') options.groupId = argv[++index];
    else if (arg === '--observed-at') options.observedAt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--events-out') options.eventsOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const defaultContactsDbs = async () => {
  const root = join(homedir(), 'Library', 'Application Support', 'AddressBook');
  const dbs = [join(root, 'AddressBook-v22.abcddb')];
  try {
    const sources = await readdir(join(root, 'Sources'), { withFileTypes: true });
    for (const entry of sources) {
      if (entry.isDirectory()) dbs.push(join(root, 'Sources', entry.name, 'AddressBook-v22.abcddb'));
    }
  } catch {
    // Root DB remains a valid candidate.
  }
  return dbs;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const stripDiacritics = (value) =>
  (value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

const normalizeText = (value) =>
  stripDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const sqlString = (value) => `'${String(value).replace(/'/g, "''")}'`;

const rosterSearchTerms = (roster) => {
  const terms = [];
  const add = (value) => {
    const cleaned = cleanString(value);
    if (cleaned && normalizeText(cleaned).length >= 5) terms.push(cleaned);
  };
  for (const row of roster) {
    const raw = cleanString(row?.displayNameRaw ?? row?.displayName ?? row?.name ?? row);
    const phone = normalizePhone(row?.phone ?? raw);
    if (phone) add(phoneDigits(phone));
    const display = raw
      ?.replace(/^‎?Maybe ?/i, '')
      .replace(/^Maybe\s*/i, '')
      .replace(/\+[\d\s().‑-]{7,}$/u, '')
      .split(',')[0]
      .trim();
    add(display);
    const normalized = normalizeText(display);
    for (const token of normalized.split(/\s+/).filter((item) => item.length >= 6)) add(token);
  }
  return Array.from(new Set(terms)).slice(0, 250);
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
    .map((term) => `lower(${recordSearchable}) LIKE '%' || ${sqlString(term.toLowerCase())} || '%'`)
    .join(' OR ');
  const emailWhere = terms
    .map((term) => `lower(COALESCE(ZADDRESS,'')) LIKE '%' || ${sqlString(term.toLowerCase())} || '%'`)
    .join(' OR ');
  const phoneWhere = terms
    .map((term) => term.replace(/\D/g, ''))
    .filter((term) => term.length >= 6)
    .map((term) => `replace(replace(replace(replace(COALESCE(ZFULLNUMBER,''), ' ', ''), '-', ''), '(', ''), ')', '') LIKE '%' || ${sqlString(term)} || '%'`)
    .join(' OR ');
  const socialWhere = terms
    .map((term) => `lower(COALESCE(ZUSERNAME,'') || ' ' || COALESCE(ZUSERIDENTIFIER,'') || ' ' || COALESCE(ZURLSTRING,'')) LIKE '%' || ${sqlString(term.toLowerCase())} || '%'`)
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
LIMIT 500;
`;
};

const parseSqliteJsonLines = (stdout) => {
  if (!stdout) return [];
  try {
    const parsed = JSON.parse(stdout);
    if (Array.isArray(parsed)) {
      return parsed.map((row) => JSON.parse(row.contact_json ?? JSON.stringify(row)));
    }
  } catch {
    // Fall through to newline parsing.
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
    })
    .filter(Boolean);
};

const collectMacosContactsResults = async (options, roster) => {
  const terms = rosterSearchTerms(roster);
  if (!terms.length) return [];
  const dbs = options.contactsDbs.length ? options.contactsDbs.map(resolve) : await defaultContactsDbs();
  const contacts = [];
  const seen = new Set();
  for (const db of dbs) {
    try {
      const { stdout } = await execFileAsync('sqlite3', ['-readonly', '-json', db, contactsSql(terms)], {
        timeout: 20_000,
        maxBuffer: 8 * 1024 * 1024,
      });
      for (const contact of parseSqliteJsonLines(stdout)) {
        const key = JSON.stringify([contact.fullName, contact.name, contact.emails, contact.phones, contact.socials]);
        if (seen.has(key)) continue;
        seen.add(key);
        contacts.push(contact);
      }
    } catch {
      // Ignore one DB failure; other source DBs may still be readable.
    }
  }
  return contacts;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }
  if (!options.rosterFile) throw new Error('missing_roster_file');

  const roster = await readJson(options.rosterFile);
  const cardStore = await readJson(options.cardStore);
  const suppliedContacts = options.contactsFile ? await readJson(options.contactsFile) : [];
  const macosContacts = options.useMacosContactsDb ? await collectMacosContactsResults(options, roster) : [];
  const packet = buildWhatsAppGroupRosterEvidencePacket({
    rosterEntries: roster,
    contacts: [...suppliedContacts, ...macosContacts],
    cardStore,
    group: {
      id: options.groupId,
      name: options.groupName,
      observedAt: options.observedAt,
      source: 'WhatsApp macOS UI group member roster + macOS Contacts read-only',
    },
  });
  const markdown = markdownForWhatsAppGroupRosterEvidencePacket(packet);

  const json = JSON.stringify(packet, null, 2);
  if (options.out) await writeFile(resolve(options.out), `${json}\n`, 'utf8');
  else console.log(json);
  if (options.markdownOut) await writeFile(resolve(options.markdownOut), `${markdown}\n`, 'utf8');
  if (options.eventsOut) {
    await writeFile(resolve(options.eventsOut), `${JSON.stringify({
      schemaVersion: 'crm-vnext-whatsapp-group-roster-signal-events-v0-2026-05-27',
      generatedAt: packet.generatedAt,
      source: 'whatsapp_group_roster_evidence_v0',
      events: packet.signalEvents,
      safety: packet.safety,
    }, null, 2)}\n`, 'utf8');
  }

  if (options.out || options.markdownOut || options.eventsOut) {
    console.log(JSON.stringify({
      ok: true,
      out: options.out ? resolve(options.out) : null,
      markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
      eventsOut: options.eventsOut ? resolve(options.eventsOut) : null,
      summary: packet.summary,
      safety: packet.safety,
    }, null, 2));
  }
};

main().catch((error) => {
  console.error(`crm-vnext whatsapp-group-roster-evidence failed: ${String(error?.message ?? error).replace(/Bearer\s+\S+/g, 'Bearer [redacted]')}`);
  process.exitCode = 1;
});
