#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-mantis-evidence-import-2026-05-10';

const usage = `Usage:
  node scripts/crm-vnext-mantis-evidence-import.mjs --report-file <path> [options]

Options:
  --report-file <path>       Mantis evidence-hunt JSON report
  --out <path>               Write import packet JSON to this path
  --text-out <path>          Write generated CRM fact text to this path
  --min-confidence <level>   high | medium | low | none. Defaults to high
  --handles <list>           Comma-separated handles to include, e.g. @a,@b
  --help                     Show this help

This command is read-only. It converts a Mantis evidence hunt into CRM vNext text + evidenceSources.
It never mutates cards, writes Fact Store, sends outbound messages, calls live APIs, or reads credentials.`;

const CONFIDENCE_ORDER = {
  none: 0,
  low: 1,
  medium: 2,
  high: 3,
};

const parseArgs = (argv) => {
  const options = {
    reportFile: null,
    out: null,
    textOut: null,
    minConfidence: 'high',
    handles: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--report-file') options.reportFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--text-out') options.textOut = argv[++index];
    else if (arg === '--min-confidence') options.minConfidence = argv[++index];
    else if (arg === '--handles') options.handles = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.reportFile) throw new Error('missing_report_file');
  if (!Object.hasOwn(CONFIDENCE_ORDER, options.minConfidence)) {
    throw new Error(`invalid_min_confidence:${options.minConfidence}`);
  }
  return options;
};

const cleanString = (value) => {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const normalizeHandle = (value) => cleanString(value)?.replace(/^@+/, '').toLowerCase() ?? null;

const selectedHandleSet = (value) => {
  if (!value) return null;
  const handles = value
    .split(',')
    .map((item) => normalizeHandle(item))
    .filter(Boolean);
  return handles.length ? new Set(handles) : null;
};

const confidenceAtLeast = (value, minConfidence) =>
  (CONFIDENCE_ORDER[cleanString(value)?.toLowerCase() ?? 'none'] ?? 0) >= CONFIDENCE_ORDER[minConfidence];

const sourceKindForEvidence = (source) => {
  const kind = cleanString(source?.kind)?.toLowerCase() ?? '';
  const path = cleanString(source?.path)?.toLowerCase() ?? '';
  const finding = cleanString(source?.finding)?.toLowerCase() ?? '';
  const text = `${kind} ${path} ${finding}`;

  if (kind.includes('negative')) return null;
  if (text.includes('mailerlite') || text.includes('subscribed') || text.includes('grupo') || text.includes('opened')) {
    return 'mailerlite_export';
  }
  if (text.includes('registrationreport') || text.includes('approved') || text.includes('asistentes a retiro')) {
    return 'retreat_table';
  }
  if (kind === 'local_csv_xlsx') return 'local_csv';
  if (kind === 'juana_report' || text.includes('dm') || text.includes('inbound') || text.includes('instagram')) {
    return 'lead_capture_export';
  }
  if (kind === 'crm_vnext_store' || kind === 'hito36_batch') return 'local_fixture';
  if (kind === 'local_memory') return 'downloaded_file';
  return 'local_fixture';
};

const sourceSupportsIdentityFields = (source, sourceKind) => {
  const kind = cleanString(source?.kind)?.toLowerCase() ?? '';
  const finding = cleanString(source?.finding)?.toLowerCase() ?? '';
  return [
    'mailerlite_export',
    'retreat_table',
    'contacts_app_export',
    'contacts_export',
    'local_csv',
    'google_drive_export',
    'gmail_export',
  ].includes(sourceKind)
    || kind === 'local_csv_xlsx'
    || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(finding);
};

const evidenceTextFor = (result, source, sourceKind) => {
  const includeIdentity = sourceSupportsIdentityFields(source, sourceKind);
  return [
  cleanString(result.handle) ? `Handle: ${cleanString(result.handle)}` : null,
  includeIdentity && cleanString(result.candidate_name)
    ? `Name: ${cleanString(result.candidate_name)}`
    : null,
  includeIdentity && cleanString(result.candidate_email)
    ? `Email: ${cleanString(result.candidate_email)?.toLowerCase()}`
    : null,
  includeIdentity && cleanString(result.candidate_phone)
    ? `Phone: ${cleanString(result.candidate_phone)}`
    : null,
  includeIdentity && cleanString(result.city)
    ? `City: ${cleanString(result.city)}`
    : null,
  includeIdentity && cleanString(result.country)
    ? `Country: ${cleanString(result.country)}`
    : null,
  includeIdentity && Array.isArray(result.mailer_groups) && result.mailer_groups.length
    ? `Groups: ${result.mailer_groups.join('; ')}`
    : null,
  cleanString(result.confidence) ? `Confidence: ${cleanString(result.confidence)}` : null,
  cleanString(source?.finding) ? `Finding: ${cleanString(source.finding)}` : null,
].filter(Boolean).join('\n');
};

const evidenceSourcesForResult = (result) => {
  const handle = normalizeHandle(result.handle);
  const sources = Array.isArray(result.evidenceSources) ? result.evidenceSources : [];
  return sources.flatMap((source, index) => {
    const sourceKind = sourceKindForEvidence(source);
    if (!sourceKind) return [];
    const text = evidenceTextFor(result, source, sourceKind);
    if (!text) return [];
    return [{
      sourceKind,
      sourceId: `mantis_evidence:${handle ?? 'unknown'}:${sourceKind}:${index + 1}`,
      title: `Mantis evidence for ${result.handle ?? handle ?? 'unknown'}`,
      handle: handle ? `@${handle}` : null,
      email: cleanString(result.candidate_email)?.toLowerCase() ?? null,
      text,
    }];
  });
};

const factLineForResult = (result) => {
  const handle = result.handle ?? (normalizeHandle(result.handle) ? `@${normalizeHandle(result.handle)}` : null);
  const name = cleanString(result.candidate_name);
  const subject = [handle, name ? `se llama ${name}` : null].filter(Boolean).join(' ');
  if (!subject) return null;
  return `CRM: ${subject}, y preguntó o manifestó interés por el retiro según el evidence hunt read-only de Mantis.`;
};

const publicResultFor = (result) => ({
  handle: result.handle ?? null,
  candidate_name: cleanString(result.candidate_name),
  candidate_email: cleanString(result.candidate_email)?.toLowerCase() ?? null,
  candidate_phone: cleanString(result.candidate_phone),
  city: cleanString(result.city),
  country: cleanString(result.country),
  mailer_groups: Array.isArray(result.mailer_groups) ? result.mailer_groups.map(cleanString).filter(Boolean) : [],
  confidence: cleanString(result.confidence)?.toLowerCase() ?? 'none',
  recommended_next_step: cleanString(result.recommended_next_step),
  blockers: Array.isArray(result.blockers) ? result.blockers.map(cleanString).filter(Boolean) : [],
  evidenceSources: Array.isArray(result.evidenceSources)
    ? result.evidenceSources
      .filter((source) => sourceKindForEvidence(source))
      .map((source) => ({
        kind: cleanString(source.kind),
        finding: cleanString(source.finding),
      }))
    : [],
});

const buildImportPacket = (report, options) => {
  const results = Array.isArray(report?.results) ? report.results : [];
  const handleSet = selectedHandleSet(options.handles);
  const selectedResults = results.filter((result) => {
    const handle = normalizeHandle(result.handle);
    if (handleSet && (!handle || !handleSet.has(handle))) return false;
    return confidenceAtLeast(result.confidence, options.minConfidence);
  });
  const evidenceSources = selectedResults.flatMap(evidenceSourcesForResult);
  const text = selectedResults.map(factLineForResult).filter(Boolean).join('\n');

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode: 'read_only_mantis_evidence_hunt_import',
    source: {
      reportFile: options.reportFile ? basename(options.reportFile) : null,
      task: cleanString(report?.meta?.task),
      mutationsPerformed: Boolean(report?.meta?.mutations_performed),
      outboundMessagesToLeads: Boolean(report?.meta?.outbound_messages_to_leads),
      sourceBlockers: report?.meta?.source_blockers ?? {},
    },
    selection: {
      minConfidence: options.minConfidence,
      handles: handleSet ? Array.from(handleSet).map((handle) => `@${handle}`) : null,
    },
    summary: {
      results: results.length,
      selectedResults: selectedResults.length,
      evidenceSources: evidenceSources.length,
      highConfidence: selectedResults.filter((result) => cleanString(result.confidence)?.toLowerCase() === 'high').length,
      mediumConfidence: selectedResults.filter((result) => cleanString(result.confidence)?.toLowerCase() === 'medium').length,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    text,
    evidenceSources,
    selectedResults: selectedResults.map(publicResultFor),
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
      localPathsRedacted: true,
      allowedUse: [
        'Convert Mantis-selected read-only evidence into CRM vNext evidenceSources.',
        'Feed Stitch Batch Review, Evidence Approval Workbench, and Card Write Approval Packet.',
      ],
      prohibitedActions: [
        'Do not write person cards from this import.',
        'Do not treat this import as identity approval.',
        'Do not send outbound messages or mutate external systems.',
      ],
    },
  };
};

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${value}\n`, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const reportFile = resolve(options.reportFile);
  const report = JSON.parse(await readFile(reportFile, 'utf8'));
  const packet = buildImportPacket(report, { ...options, reportFile });

  if (options.out) await writeJson(options.out, packet);
  if (options.textOut) await writeText(options.textOut, packet.text);

  console.log(JSON.stringify({
    ok: true,
    mode: packet.mode,
    generatedAt: packet.generatedAt,
    source: packet.source,
    selection: packet.selection,
    summary: packet.summary,
    textOut: options.textOut ? resolve(options.textOut) : null,
    out: options.out ? resolve(options.out) : null,
    safety: packet.safety,
  }, null, 2));
};

main().catch((error) => {
  console.error(`crm-vnext mantis-evidence-import failed: ${error.message}`);
  process.exitCode = 1;
});
