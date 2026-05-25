#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-source-result-ledger-2026-05-25';
const LEDGER_ENTRY_SCHEMA_VERSION = 'crm-vnext-source-result-ledger-entry-2026-05-25';
const DEFAULT_LEDGER_PATH = '.crm-vnext/source-result-ledger/ledger.jsonl';

const usage = `Usage:
  node scripts/crm-vnext-source-result-ledger.mjs --report-file <path> [options]

Options:
  --report-file <path>       Read-only source-recovery report to classify
  --source-system <name>     Override source system label. Defaults to report.source
  --run-label <label>        Human label for this source check
  --ledger-path <path>       Append-only ledger path. Defaults to ${DEFAULT_LEDGER_PATH}
  --recorded-by <name>       Required with --write
  --write                    Append classified source-result entries to the local ledger
  --out <path>               Write classification JSON report
  --markdown-out <path>      Write compact Markdown report
  --help                     Show this help

Default mode is preview. This command never calls live sources, reads credentials, mutates cards,
writes Fact Store, changes scores, touches ManyChat LIVE, or sends outbound messages.`;

const RESULT_ORDER = {
  bridge_found: 0,
  found_profile_no_requested_bridge: 1,
  not_found_limited_search: 2,
  not_found_exhaustive: 3,
  blocked: 4,
  skipped_not_relevant: 5,
  unknown: 6,
};

const parseArgs = (argv) => {
  const options = {
    reportFile: null,
    sourceSystem: null,
    runLabel: null,
    ledgerPath: DEFAULT_LEDGER_PATH,
    recordedBy: null,
    write: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--write') options.write = true;
    else if (arg === '--report-file') options.reportFile = argv[++index];
    else if (arg === '--source-system') options.sourceSystem = argv[++index];
    else if (arg === '--run-label') options.runLabel = argv[++index];
    else if (arg === '--ledger-path') options.ledgerPath = argv[++index];
    else if (arg === '--recorded-by') options.recordedBy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.reportFile) throw new Error('report_file_required');
  if (options.write && !cleanString(options.recordedBy)) throw new Error('recorded_by_required_with_write');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const normalizeStatus = (value) =>
  cleanString(value)?.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') ?? null;

const normalizeAnchor = (value) =>
  cleanString(value)?.toLowerCase().replace(/^@+/, '').replace(/^ig:/, 'ig:') ?? null;

const isoNow = (value = null) => {
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

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeTextFile = async (filePath, text) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text, 'utf8');
  return absolutePath;
};

const redactPath = (value) => {
  const text = cleanString(value);
  if (!text) return null;
  return text.replace(/\/Users\/[^/\s]+/g, '~');
};

const contactEntries = (report) => {
  if (Array.isArray(report?.contacts)) {
    return report.contacts.map((contact, index) => [cleanString(contact?.contactKey) ?? `contact-${index + 1}`, contact]);
  }
  if (report?.contacts && typeof report.contacts === 'object') return Object.entries(report.contacts);
  return [];
};

const queriesForContact = (report, contactKey, contact) => {
  const contactQueries = Array.isArray(contact?.search_queries)
    ? contact.search_queries
    : Array.isArray(contact?.queries)
      ? contact.queries
      : [];
  const reportQueries = Array.isArray(report?.queries_executed) ? report.queries_executed : [];
  const normalizedKey = normalizeAnchor(contactKey);
  const queryMatches = reportQueries.filter((query) => normalizeAnchor(query?.anchor) === normalizedKey);
  return [...queryMatches, ...contactQueries].map((query) => ({
    method: cleanString(query?.method),
    anchor: cleanString(query?.anchor),
    query: cleanString(query?.query),
    result: cleanString(query?.result),
    uiResult: cleanString(query?.ui_result ?? query?.uiResult),
  }));
};

const customFieldSnapshot = (contact) => {
  const fields = contact?.custom_fields && typeof contact.custom_fields === 'object'
    ? contact.custom_fields
    : {};
  return {
    bufferOpen: cleanString(fields.buffer_open),
    crmFinalSent: cleanString(fields.crm_final_sent),
    hasEmailFromBuffer: cleanString(fields.has_email_from_buffer),
    hasEmailInFirstDm: cleanString(fields.has_email_in_first_dm),
    dmBufferPreview: cleanString(fields.dm_buffer)?.slice(0, 180) ?? null,
  };
};

const hasExplicitNoEmailInVisibleFields = (contact) => {
  const snapshot = customFieldSnapshot(contact);
  return snapshot.hasEmailFromBuffer?.toLowerCase() === 'no'
    && snapshot.hasEmailInFirstDm?.toLowerCase() === 'no';
};

const hasBridge = (contact) => {
  const status = normalizeStatus(contact?.bridge_status);
  if (/^no_|not_found|no_match|no_email_bridge/.test(status ?? '')) return false;
  return contact?.bridge_found === true
    || /bridge_found|bridge_confirmed|email_bridge/.test(status ?? '')
    || Boolean(cleanString(contact?.candidate_email ?? contact?.email));
};

const isLimitedManyChatSearch = (contact, report) => {
  const text = [
    cleanString(contact?.ui_note),
    cleanString(report?.ui_context?.search_box_label),
    cleanString(report?.ui_context?.segments_builder_state),
    ...(Array.isArray(report?.ui_context?.notes) ? report.ui_context.notes.map(cleanString) : []),
  ].filter(Boolean).join(' ').toLowerCase();
  return text.includes('search by name') || text.includes('custom-field') || text.includes('custom field') || text.includes('upsell');
};

const classifyContact = ({ report, contactKey, contact, sourceSystem, recordedAt, sourceReport, runLabel }) => {
  const status = normalizeStatus(contact?.status);
  const bridgeStatus = normalizeStatus(contact?.bridge_status);
  const queries = queriesForContact(report, contactKey, contact);
  let sourceResultStatus = 'unknown';
  let resultStrength = 'unknown';
  let sourceExhaustion = 'unknown';
  let retryPolicy = 'Do not use this source result for automation until a human reviews the raw report shape.';
  let operationalMeaning = 'The source result shape was not recognized by the classifier.';

  if (hasBridge(contact)) {
    sourceResultStatus = 'bridge_found';
    resultStrength = 'positive_bridge';
    sourceExhaustion = 'not_needed';
    retryPolicy = 'Route through normal evidence import and card-write approval; do not rerun the same source unless evidence conflicts.';
    operationalMeaning = 'This source found a usable identity bridge, pending normal approval gates.';
  } else if (status === 'found' && bridgeStatus === 'no_email_bridge_in_current_ui' && hasExplicitNoEmailInVisibleFields(contact)) {
    sourceResultStatus = 'found_profile_no_requested_bridge';
    resultStrength = 'negative_strong_for_visible_profile_fields';
    sourceExhaustion = 'exhausted_for_visible_manychat_profile_fields';
    retryPolicy = 'Do not repeat the same ManyChat profile read for email fields unless API/export/new custom fields become available; continue other lanes such as IG thread, MailerLite, Gmail, Drive, Contacts, or human memory.';
    operationalMeaning = 'ManyChat confirms the IG profile/contact exists, but visible onboarding fields say no captured email in buffer/first DM.';
  } else if (/not_found|no_match/.test(status ?? '') || /no_match/.test(bridgeStatus ?? '')) {
    if (isLimitedManyChatSearch(contact, report)) {
      sourceResultStatus = 'not_found_limited_search';
      resultStrength = 'negative_weak_due_to_ui_capability';
      sourceExhaustion = 'not_exhausted';
      retryPolicy = 'Retry only with a stronger ManyChat lane: custom-field filter, API/export if plan allows it, or another exact-anchor source. Do not treat this as proof the person is absent from ManyChat.';
      operationalMeaning = 'The current UI search did not match, but the visible search box is name-oriented or lacked the needed custom-field filter.';
    } else {
      sourceResultStatus = 'not_found_exhaustive';
      resultStrength = 'negative_strong_for_declared_method';
      sourceExhaustion = 'exhausted_for_declared_exact_anchor_method';
      retryPolicy = 'Do not repeat the same exact-anchor method unless new anchors appear.';
      operationalMeaning = 'The report declares an exact search that appears adequate for the requested source lane.';
    }
  } else if (/blocked|auth|login|token|required|unauth|checkpoint|permission|relay/.test(status ?? '')) {
    sourceResultStatus = 'blocked';
    resultStrength = 'blocked_no_evidence';
    sourceExhaustion = 'blocked_before_check';
    retryPolicy = 'Pause into awaiting_human_unblock and retry the same anchors after the unblock; do not report as final source negative.';
    operationalMeaning = 'The source was not actually checked because a human-action or auth blocker interrupted it.';
  }

  const entryId = `source_result_${hashId([
    LEDGER_ENTRY_SCHEMA_VERSION,
    sourceSystem,
    contactKey,
    sourceReport,
    sourceResultStatus,
    JSON.stringify(queries),
  ])}`;

  return {
    schemaVersion: LEDGER_ENTRY_SCHEMA_VERSION,
    ledgerEntryId: entryId,
    recordedAt,
    recordedBy: null,
    sourceReport,
    sourceReportFile: basename(sourceReport),
    runLabel,
    sourceSystem,
    contactKey,
    sourceResultStatus,
    resultStrength,
    sourceExhaustion,
    bridgeOutcome: hasBridge(contact) ? 'bridge_found' : 'bridge_not_found',
    confidence: cleanString(contact?.confidence),
    status: cleanString(contact?.status),
    bridgeStatus: cleanString(contact?.bridge_status),
    manychatContactId: cleanString(contact?.manychat_contact_id),
    instagramUserId: cleanString(contact?.ig_user_id),
    optedInHandle: cleanString(contact?.opted_in_handle),
    optedThrough: cleanString(contact?.opted_through),
    queries,
    evidenceSnapshot: customFieldSnapshot(contact),
    operationalMeaning,
    retryPolicy,
    safety: {
      outboundExecuted: false,
      crmCardWriteExecuted: false,
      factStoreWriteExecuted: false,
      liveApiMutationExecuted: false,
      credentialReadExecuted: false,
    },
  };
};

const buildReport = ({ report, options }) => {
  const recordedAt = isoNow(report?.created_at ?? report?.createdAt ?? report?.generatedAt);
  const sourceReport = resolve(options.reportFile);
  const sourceSystem = cleanString(options.sourceSystem) ?? cleanString(report?.source) ?? 'unknown_source';
  const runLabel = cleanString(options.runLabel) ?? cleanString(report?.schema) ?? basename(sourceReport);
  const entries = contactEntries(report)
    .map(([contactKey, contact]) => classifyContact({
      report,
      contactKey,
      contact,
      sourceSystem,
      recordedAt,
      sourceReport,
      runLabel,
    }))
    .sort((left, right) =>
      (RESULT_ORDER[left.sourceResultStatus] ?? 99) - (RESULT_ORDER[right.sourceResultStatus] ?? 99)
      || left.contactKey.localeCompare(right.contactKey)
    );

  const countsByStatus = entries.reduce((counts, entry) => {
    counts[entry.sourceResultStatus] = (counts[entry.sourceResultStatus] ?? 0) + 1;
    return counts;
  }, {});
  const countsByStrength = entries.reduce((counts, entry) => {
    counts[entry.resultStrength] = (counts[entry.resultStrength] ?? 0) + 1;
    return counts;
  }, {});

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'preview_source_result_classification',
    generatedAt: new Date().toISOString(),
    sourceReport: redactPath(sourceReport),
    sourceReportFile: basename(sourceReport),
    sourceSystem,
    runLabel,
    summary: {
      entries: entries.length,
      countsByStatus,
      countsByStrength,
      sourceNegativeButNotExhausted: entries.filter((entry) => entry.sourceExhaustion === 'not_exhausted').length,
      operationsExecuted: 0,
    },
    entries,
    safety: {
      outboundExecuted: false,
      crmCardWritesExecuted: false,
      factStoreWritesExecuted: false,
      liveApiMutationsExecuted: false,
      credentialReadsExecuted: false,
      localLedgerAppendOnly: Boolean(options.write),
    },
  };
};

const appendLedgerEntries = async (entries, options, recordedAt) => {
  const absoluteLedgerPath = resolve(options.ledgerPath);
  await mkdir(dirname(absoluteLedgerPath), { recursive: true });
  const lines = entries.map((entry) => JSON.stringify({
    ...entry,
    recordedAt,
    recordedBy: cleanString(options.recordedBy),
  }));
  await appendFile(absoluteLedgerPath, `${lines.join('\n')}\n`, 'utf8');
  return absoluteLedgerPath;
};

const markdownFor = (classification, writes) => {
  const lines = [
    '# CRM vNext Source Result Ledger',
    '',
    `Generated: ${classification.generatedAt}`,
    `Source: ${classification.sourceSystem}`,
    `Report: ${classification.sourceReportFile}`,
    '',
    '## Summary',
    '',
    `- Entries classified: ${classification.summary.entries}`,
    `- Found profile but no requested bridge: ${classification.summary.countsByStatus.found_profile_no_requested_bridge ?? 0}`,
    `- Not found because search was limited: ${classification.summary.countsByStatus.not_found_limited_search ?? 0}`,
    `- Bridges found: ${classification.summary.countsByStatus.bridge_found ?? 0}`,
    `- Source negatives that are not exhausted: ${classification.summary.sourceNegativeButNotExhausted}`,
    `- Ledger append: ${writes.ledgerPath ? 'yes' : 'no'}`,
    '',
    '## Operator Reading',
    '',
    '- `found_profile_no_requested_bridge`: the profile/source was actually opened and visible requested fields did not contain the bridge. Do not repeat the same profile read unless new fields/export/API appear.',
    '- `not_found_limited_search`: the source was only searched through a weak/limited UI route. Do not treat this as source exhaustion; retry with custom-field filters, API/export, or another exact-anchor lane.',
    '- `blocked`: no evidence result yet. Pause into human unblock and retry.',
    '',
    '## Entries',
    '',
  ];

  for (const entry of classification.entries) {
    lines.push(`- ${entry.contactKey}: ${entry.sourceResultStatus} (${entry.resultStrength})`);
    lines.push(`  - meaning: ${entry.operationalMeaning}`);
    lines.push(`  - retry: ${entry.retryPolicy}`);
  }

  lines.push('', '## Safety', '');
  lines.push('- No CRM cards mutated.');
  lines.push('- No Fact Store writes.');
  lines.push('- No live APIs called.');
  lines.push('- No ManyChat LIVE mutations.');
  lines.push('- No outbound messages.');

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const sourceReport = await readJson(options.reportFile);
  const classification = buildReport({ report: sourceReport, options });
  const writes = {
    jsonPath: null,
    markdownPath: null,
    ledgerPath: null,
  };

  if (options.write) {
    writes.ledgerPath = await appendLedgerEntries(classification.entries, options, classification.generatedAt);
  }
  if (options.out) {
    writes.jsonPath = await writeTextFile(options.out, `${JSON.stringify(classification, null, 2)}\n`);
  }
  if (options.markdownOut) {
    writes.markdownPath = await writeTextFile(options.markdownOut, markdownFor(classification, writes));
  }

  console.log(JSON.stringify({
    ok: true,
    schemaVersion: classification.schemaVersion,
    generatedAt: classification.generatedAt,
    summary: classification.summary,
    entries: classification.entries.map((entry) => ({
      contactKey: entry.contactKey,
      sourceResultStatus: entry.sourceResultStatus,
      resultStrength: entry.resultStrength,
      sourceExhaustion: entry.sourceExhaustion,
    })),
    writes,
    safety: classification.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext source-result-ledger failed: ${error.message}`);
  process.exitCode = 1;
});
