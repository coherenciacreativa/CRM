#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { buildBhaktiWhatsappEvidencePacket, markdownForBhaktiWhatsappEvidencePacket } from '../lib/crm/crm-vnext-bhakti-whatsapp-evidence.js';

const DEFAULT_BHAKTI_ROOT = '/Users/alejandrogomez/bhakti-whatsapp';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';

const usage = `Usage:
  node scripts/crm-vnext-bhakti-whatsapp-evidence.mjs [options]

Options:
  --bhakti-root <path>              Bhakti WhatsApp repo. Defaults to ${DEFAULT_BHAKTI_ROOT}
  --env-file <path>                 Env file with Supabase URL/service role. Defaults to <bhakti-root>/.env.local
  --card-store-path <path>          CRM vNext card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --event-log-mode <none|sampled>   Read compact event_log samples by phone. Default sampled
  --event-limit-per-user <n>        Max event_log rows per user in sampled mode. Default 20
  --event-timeout-ms <n>            Per-user event_log timeout. Default 6000
  --event-concurrency <n>           Event_log read concurrency. Default 6
  --out <path>                      Write evidence packet JSON
  --markdown-out <path>             Write compact Markdown summary
  --events-out <path>               Write canonical signal-events JSON for pipeline
  --fail-on-empty                   Exit non-zero if no Bhakti users are found
  --help                            Show this help

This command is read-only. It reads Bhakti Supabase with GET requests and local CRM cards, then emits
evidence, write previews, and signal events. It never mutates Supabase, calls Twilio, sends WhatsApps,
modifies MailerLite, writes Fact Store, writes CRM cards, or prints credentials.`;

const parseArgs = (argv) => {
  const options = {
    bhaktiRoot: DEFAULT_BHAKTI_ROOT,
    envFile: null,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    eventLogMode: 'sampled',
    eventLimitPerUser: 20,
    eventTimeoutMs: 6000,
    eventConcurrency: 6,
    out: null,
    markdownOut: null,
    eventsOut: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--bhakti-root') options.bhaktiRoot = argv[++index];
    else if (arg === '--env-file') options.envFile = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--event-log-mode') options.eventLogMode = argv[++index];
    else if (arg === '--event-limit-per-user') options.eventLimitPerUser = Number(argv[++index]);
    else if (arg === '--event-timeout-ms') options.eventTimeoutMs = Number(argv[++index]);
    else if (arg === '--event-concurrency') options.eventConcurrency = Number(argv[++index]);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--events-out') options.eventsOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!['none', 'sampled'].includes(options.eventLogMode)) throw new Error('invalid_event_log_mode');
  if (!Number.isFinite(options.eventLimitPerUser) || options.eventLimitPerUser < 0) throw new Error('invalid_event_limit_per_user');
  if (!Number.isFinite(options.eventTimeoutMs) || options.eventTimeoutMs < 1000) throw new Error('invalid_event_timeout_ms');
  if (!Number.isFinite(options.eventConcurrency) || options.eventConcurrency < 1) throw new Error('invalid_event_concurrency');
  return options;
};

const parseEnvFile = async (filePath) => {
  const text = await readFile(resolve(filePath), 'utf8');
  const env = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 0) continue;
    const key = trimmed.slice(0, index).trim();
    let value = trimmed.slice(index + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath, value) => {
  const resolved = resolve(filePath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (filePath, value) => {
  const resolved = resolve(filePath);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, value, 'utf8');
};

const makeSupabaseClient = ({ supabaseUrl, serviceRole }) => {
  if (!supabaseUrl || !serviceRole) throw new Error('missing_supabase_env');
  const baseUrl = supabaseUrl.replace(/\/+$/, '');
  const headers = {
    apikey: serviceRole,
    Authorization: `Bearer ${serviceRole}`,
  };
  return async (path, options = {}) => {
    const controller = new AbortController();
    const timeout = options.timeoutMs
      ? setTimeout(() => controller.abort(), options.timeoutMs)
      : null;
    try {
      const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
        headers,
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`supabase_get_failed:${response.status}:${text.slice(0, 160)}`);
      return JSON.parse(text || 'null');
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };
};

const cleanPhone = (value) => {
  if (typeof value !== 'string') return null;
  const digits = value.replace(/\D/g, '');
  return digits ? `+${digits}` : null;
};

const fetchUsers = async (sget) => {
  const select = [
    'id',
    'email',
    'phone_e164',
    'name',
    'status',
    'source',
    'day_index',
    'route_mode',
    'time_code',
    'tz',
    'trial_started_at',
    'start_ts',
    'created_at',
    'updated_at',
    'last_inbound_at',
    'last_status_at',
    'links_sent_at',
    'qa_sent_at',
  ].join(',');
  const rows = await sget(`users?select=${encodeURIComponent(select)}&order=created_at.asc&limit=2000`);
  return Array.isArray(rows) ? rows : [];
};

const safeEventRow = (row) => ({
  created_at: row?.created_at ?? null,
  source: row?.source ?? null,
  action: row?.action ?? null,
  user_phone: row?.user_phone ?? null,
  error: row?.error ? String(row.error).slice(0, 120) : null,
});

const mapLimit = async (items, limit, mapper) => {
  const results = new Array(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await mapper(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
};

const fetchEventSamples = async (sget, users, options) => {
  if (options.eventLogMode === 'none' || options.eventLimitPerUser === 0) {
    return {
      byPhone: {},
      audit: { mode: options.eventLogMode, usersSampled: 0, rowsRead: 0, errors: 0, timeoutsOrFailures: [] },
    };
  }

  const byPhone = {};
  const failures = [];
  let rowsRead = 0;
  const usersWithPhone = users.filter((user) => cleanPhone(user.phone_e164));
  await mapLimit(usersWithPhone, Math.floor(options.eventConcurrency), async (user) => {
    const phone = cleanPhone(user.phone_e164);
    try {
      const rows = await sget(
        `event_log?select=created_at,source,action,user_phone,error&user_phone=eq.${encodeURIComponent(phone)}&limit=${Math.floor(options.eventLimitPerUser)}`,
        { timeoutMs: Math.floor(options.eventTimeoutMs) },
      );
      const safeRows = Array.isArray(rows) ? rows.map(safeEventRow) : [];
      byPhone[phone] = safeRows;
      rowsRead += safeRows.length;
    } catch (error) {
      failures.push({
        phoneLast4: phone.slice(-4),
        reason: String(error?.name === 'AbortError' ? 'timeout' : error?.message ?? error).slice(0, 160),
      });
      byPhone[phone] = [];
    }
  });

  return {
    byPhone,
    audit: {
      mode: 'sampled_by_user_phone_unordered',
      usersSampled: usersWithPhone.length,
      limitPerUser: Math.floor(options.eventLimitPerUser),
      timeoutMs: Math.floor(options.eventTimeoutMs),
      rowsRead,
      errors: failures.length,
      timeoutsOrFailures: failures.slice(0, 24),
      note: 'event_log broad/recent ordering is intentionally avoided because it can time out; users table timestamps provide current-state signals.',
    },
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const bhaktiRoot = resolve(options.bhaktiRoot);
  const envFile = resolve(options.envFile ?? join(bhaktiRoot, '.env.local'));
  if (!existsSync(envFile)) throw new Error(`env_file_not_found:${envFile}`);
  const env = await parseEnvFile(envFile);
  const sget = makeSupabaseClient({
    supabaseUrl: env.SUPABASE_URL,
    serviceRole: env.SUPABASE_SERVICE_ROLE,
  });
  const [users, cardStore] = await Promise.all([
    fetchUsers(sget),
    readJson(options.cardStorePath),
  ]);
  const eventSamples = await fetchEventSamples(sget, users, options);
  const packet = buildBhaktiWhatsappEvidencePacket({
    users,
    cardStore,
    eventSamplesByPhone: eventSamples.byPhone,
    eventLogAudit: eventSamples.audit,
    source: {
      bhaktiRootLabel: 'bhakti-whatsapp',
      cardStorePathLabel: options.cardStorePath,
    },
  });
  const signalEventsPayload = {
    schemaVersion: 'crm-vnext-bhakti-whatsapp-signal-events-v0-2026-05-27',
    generatedAt: packet.generatedAt,
    source: 'bhakti_whatsapp_evidence_adapter_v0',
    summary: {
      events: packet.signalEvents.length,
      usersRead: packet.summary.usersRead,
      matchedExisting: packet.summary.matchedExisting,
      readyForWriteReview: packet.summary.readyForWriteReview,
    },
    events: packet.signalEvents,
    safety: packet.safety,
  };

  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, markdownForBhaktiWhatsappEvidencePacket(packet));
  if (options.eventsOut) await writeJson(options.eventsOut, signalEventsPayload);

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: packet.schemaVersion,
    mode: packet.mode,
    summary: packet.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    eventsOut: options.eventsOut ? resolve(options.eventsOut) : null,
    safety: packet.safety,
  }, null, 2));

  if (options.failOnEmpty && packet.summary.usersRead === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext bhakti-whatsapp-evidence failed: ${String(error?.message ?? error).replace(/Bearer\\s+\\S+/g, 'Bearer [redacted]')}`);
  process.exitCode = 1;
});
