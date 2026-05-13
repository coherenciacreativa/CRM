#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-instagram-dm-ui-evidence-2026-05-14';

const usage = `Usage:
  node scripts/crm-vnext-instagram-dm-ui-evidence.mjs --observations-file <path> [options]

Options:
  --observations-file <path>  JSON file with Instagram DM UI search observations
  --out <path>                Write evidence packet JSON to this path
  --fail-on-empty             Exit non-zero when no bridge evidence source is produced
  --help                      Show this help

This command is read-only. It converts human/Mantis observations from Instagram DM UI search into instagram_dm_ui_export evidenceSources. It never opens Instagram, calls live APIs, reads cookies, changes credentials, sends messages, mutates cards, writes Fact Store, or touches ManyChat LIVE.`;

const parseArgs = (argv) => {
  const options = {
    observationsFile: null,
    out: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--observations-file') options.observationsFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.observationsFile) throw new Error('observations_file_required');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
};

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
};

const normalizeHandle = (value) => {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const instagramUrl = cleaned.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i)?.[1];
  const handle = (instagramUrl ?? cleaned)
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+$/g, '')
    .trim()
    .toLowerCase();
  return /^[a-z0-9._]{2,30}$/.test(handle) ? handle : null;
};

const isoNow = (value) => {
  const raw = cleanString(value);
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const asArray = (value) => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    if (Array.isArray(value.observations)) return value.observations;
    if (Array.isArray(value.instagramDmUiObservations)) return value.instagramDmUiObservations;
    if (Array.isArray(value.results)) return value.results;
  }
  return [];
};

const field = (record, keys) => {
  for (const key of keys) {
    const value = record?.[key];
    if (value !== undefined && value !== null) return value;
  }
  return null;
};

const cleanList = (value) => {
  if (Array.isArray(value)) {
    const items = value
      .map((item) => cleanString(item))
      .filter(Boolean);
    return items.length ? items.join('; ') : null;
  }
  return cleanString(value);
};

const bridgeEvidenceFor = (raw, index, generatedAt) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const observation = raw;
  const searchTerm = cleanString(field(observation, ['searchTerm', 'query', 'searchedValue', 'lookup']));
  const email = normalizeEmail(field(observation, ['subjectEmail', 'email', 'matchedEmail']))
    ?? normalizeEmail(searchTerm);
  const handle = normalizeHandle(field(observation, [
    'matchedInstagramHandle',
    'instagramHandle',
    'handle',
    'threadHandle',
    'username',
  ]));
  const displayName = cleanString(field(observation, [
    'matchedDisplayName',
    'displayName',
    'threadDisplayName',
    'name',
    'subjectName',
  ]));
  const subjectName = cleanString(field(observation, ['subjectName', 'rawName', 'personName'])) ?? displayName;
  const profileUrl = cleanString(field(observation, ['profileUrl', 'instagramUrl', 'url']));
  const observedBy = cleanString(field(observation, ['observedBy', 'reviewer', 'operator'])) ?? 'manual_ui_observer';
  const observedAt = isoNow(field(observation, ['observedAt', 'createdAt', 'timestamp']) ?? generatedAt);
  const confidence = cleanString(field(observation, ['confidence'])) ?? (email && handle ? 'strong' : 'review');
  const snippet = cleanString(field(observation, ['snippet', 'messageSnippet', 'evidenceSnippet', 'notes', 'context']));
  const city = cleanString(field(observation, ['city', 'matchedCity', 'threadCity']));
  const country = cleanString(field(observation, ['country', 'matchedCountry', 'threadCountry']));
  const preferences = cleanList(field(observation, ['preferences', 'preferenceSignals', 'interests', 'interestSignals']));
  const tone = cleanString(field(observation, ['tone', 'toneNotes', 'communicationTone']));
  const threadContext = cleanString(field(observation, ['threadContext', 'conversationContext', 'contextSummary', 'context']));
  const threadContextLine = threadContext && threadContext !== snippet ? threadContext : null;

  if (!email || !handle) return null;

  const sourceId = cleanString(observation.sourceId)
    ?? `instagram-dm-ui:${hashId([email, handle, searchTerm, observedAt, String(index)])}`;
  const title = `Instagram DM UI bridge: ${email} -> @${handle}`;
  const text = [
    'Source: Instagram DM UI search bridge',
    searchTerm ? `Search term: ${searchTerm}` : null,
    `Email: ${email}`,
    subjectName ? `Name: ${subjectName}` : null,
    displayName ? `Thread display name: ${displayName}` : null,
    `Instagram: @${handle}`,
    `Handle: @${handle}`,
    profileUrl ? `Profile URL: ${profileUrl}` : null,
    city ? `City: ${city}` : null,
    country ? `Country: ${country}` : null,
    preferences ? `Preferences: ${preferences}` : null,
    tone ? `Tone: ${tone}` : null,
    threadContextLine ? `Thread context: ${threadContextLine}` : null,
    `Observed by: ${observedBy}`,
    `Observed at: ${observedAt}`,
    `Confidence: ${confidence}`,
    snippet ? `Snippet: ${snippet}` : null,
    'Review note: read-only UI observation; no outbound message sent.',
  ].filter(Boolean).join('\n');

  return {
    sourceKind: 'instagram_dm_ui_export',
    sourceId,
    title,
    subject: subjectName ?? displayName ?? `@${handle}`,
    email,
    handle,
    observedAt,
    snippet: [
      `Instagram DM UI search matched ${email} to @${handle}.`,
      displayName ? `Thread display name: ${displayName}.` : null,
      city ? `City: ${city}.` : null,
      country ? `Country: ${country}.` : null,
      preferences ? `Preferences: ${preferences}.` : null,
      tone ? `Tone: ${tone}.` : null,
      threadContextLine,
      snippet,
      `Observed by: ${observedBy}.`,
    ].filter(Boolean).join(' '),
    text,
  };
};

const buildReport = (observations, now = new Date().toISOString()) => {
  const generatedAt = isoNow(now);
  const evidenceSources = observations
    .map((observation, index) => bridgeEvidenceFor(observation, index, generatedAt))
    .filter(Boolean);
  const incompleteObservations = observations.length - evidenceSources.length;
  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_instagram_dm_ui_evidence',
    summary: {
      observationsRead: observations.length,
      bridgeEvidenceSources: evidenceSources.length,
      incompleteObservations,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    evidenceSources,
    reviewSignals: incompleteObservations > 0
      ? [{
          code: 'instagram_dm_ui_bridge_incomplete',
          message: 'One or more observations did not include both an email and an Instagram handle, so they were not promoted to bridge evidence.',
        }]
      : [],
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
      instagramPermissionMutationProhibited: true,
      manyChatLiveMutationProhibited: true,
      allowedUse: [
        'Convert manually observed Instagram DM UI search results into CRM vNext evidenceSources.',
        'Bridge a known email or phone clue to an Instagram handle after human/operator review.',
      ],
      prohibitedActions: [
        'Do not open Instagram or call Instagram APIs from this command.',
        'Do not send, like, react, follow, unfollow, or modify any Instagram content.',
        'Do not mutate CRM cards or Fact Store from this command.',
        'Do not read cookies, tokens, passwords, or credentials.',
      ],
    },
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const raw = await readFile(resolve(options.observationsFile), 'utf8');
  const observations = asArray(JSON.parse(raw));
  const report = buildReport(observations);

  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    generatedAt: report.generatedAt,
    summary: report.summary,
    out: options.out ? resolve(options.out) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnEmpty && report.summary.bridgeEvidenceSources === 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext instagram-dm-ui-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
