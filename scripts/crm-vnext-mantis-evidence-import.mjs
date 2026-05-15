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

const normalizeKey = (value) => cleanString(value)
  ?.toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '') ?? null;

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
  const explicitSourceKind = cleanString(source?.sourceKind)?.toLowerCase() ?? '';
  if ([
    'mailerlite_export',
    'contacts_app_export',
    'contacts_export',
    'google_drive_export',
    'retreat_table',
    'lead_capture_export',
    'instagram_dm_ui_export',
    'gmail_export',
    'local_fixture',
    'downloaded_file',
    'local_csv',
  ].includes(explicitSourceKind)) return explicitSourceKind;

  const kind = cleanString(source?.kind)?.toLowerCase() ?? '';
  const sourceLabel = cleanString(source?.source)?.toLowerCase() ?? '';
  const path = cleanString(source?.path)?.toLowerCase() ?? '';
  const finding = cleanString(source?.finding ?? source?.text ?? source?.snippet)?.toLowerCase() ?? '';
  const text = `${kind} ${sourceLabel} ${path} ${finding}`;

  if (kind.includes('negative')) return null;
  if (kind === 'mailerlite_export') return 'mailerlite_export';
  if (kind === 'contacts_app_export') return 'contacts_app_export';
  if (kind === 'google_drive_export') return 'google_drive_export';
  if (kind === 'retreat_table') return 'retreat_table';
  if (kind === 'lead_capture_export') return 'lead_capture_export';
  if (kind === 'instagram_dm_ui_export') return 'instagram_dm_ui_export';
  if (kind === 'gmail_export') return 'gmail_export';
  if (kind === 'local_fixture') return 'local_fixture';
  if (kind === 'downloaded_file') return 'downloaded_file';
  if (text.includes('mailerlite') || text.includes('subscribed') || text.includes('grupo') || text.includes('opened')) {
    return 'mailerlite_export';
  }
  if (text.includes('gmail') || text.includes('zoom <no-reply@zoom.us>')) {
    return 'gmail_export';
  }
  if (text.includes('contacts sqlite') || text.includes('macos contacts') || text.includes('contacts app')) {
    return 'contacts_app_export';
  }
  if (text.includes('google drive') || text.includes('drive/sheets') || text.includes('drive-derived')) {
    return text.includes('retiro') || text.includes('retreat') ? 'retreat_table' : 'google_drive_export';
  }
  if (text.includes('registrationreport') || text.includes('approved') || text.includes('asistentes a retiro')) {
    return 'retreat_table';
  }
  if (kind === 'local_csv_xlsx') return 'local_csv';
  if (kind === 'instagram_dm_ui_search' || text.includes('instagram messages ui')) return 'instagram_dm_ui_export';
  if (kind === 'juana_report' || text.includes('dm') || text.includes('inbound') || text.includes('instagram')) {
    return 'lead_capture_export';
  }
  if (kind === 'crm_vnext_store' || kind === 'hito36_batch') return 'local_fixture';
  if (kind === 'local_memory') return 'downloaded_file';
  return 'local_fixture';
};

const sourceSupportsIdentityFields = (source, sourceKind) => {
  const kind = cleanString(source?.kind)?.toLowerCase() ?? '';
  const finding = cleanString(source?.finding ?? source?.text ?? source?.snippet)?.toLowerCase() ?? '';
  return [
    'mailerlite_export',
    'retreat_table',
    'contacts_app_export',
    'contacts_export',
    'local_csv',
    'google_drive_export',
    'gmail_export',
    'instagram_dm_ui_export',
  ].includes(sourceKind)
    || kind === 'local_csv_xlsx'
    || /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i.test(finding);
};

const evidenceTextFor = (result, source, sourceKind) => {
  const includeIdentity = sourceSupportsIdentityFields(source, sourceKind);
  const sourceFinding = cleanString(source?.finding ?? source?.text ?? source?.snippet);
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
  cleanString(result.confidence) ? `Confidence: ${cleanString(result.confidence)}` : null,
  sourceFinding ? `Finding: ${sourceFinding}` : null,
  includeIdentity && Array.isArray(result.mailer_groups) && result.mailer_groups.length
    ? `Groups: ${result.mailer_groups.join('; ')}`
    : null,
].filter(Boolean).join(' | ');
};

const evidenceSourcesForResult = (result) => {
  const handle = normalizeHandle(result.handle);
  const resultKey = normalizeKey(result.resultKey ?? result.contactKey ?? result.candidate_name);
  const subjectKey = handle ?? resultKey ?? 'unknown';
  const sources = Array.isArray(result.evidenceSources) ? result.evidenceSources : [];
  return sources.flatMap((source, index) => {
    const sourceKind = sourceKindForEvidence(source);
    if (!sourceKind) return [];
    const text = evidenceTextFor(result, source, sourceKind);
    if (!text) return [];
    return [{
      sourceKind,
      sourceId: `mantis_evidence:${subjectKey}:${sourceKind}:${index + 1}`,
      title: `Mantis evidence for ${result.handle ?? result.candidate_name ?? subjectKey}`,
      handle: handle ? `@${handle}` : null,
      email: cleanString(result.candidate_email)?.toLowerCase() ?? null,
      text,
    }];
  });
};

const factLineForResult = (result) => {
  const customFactText = cleanString(result.factText);
  if (customFactText) return customFactText;
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
        kind: cleanString(source.kind ?? source.sourceKind ?? source.source),
        finding: cleanString(source.finding ?? source.text ?? source.snippet),
      }))
    : [],
});

const firstClean = (...values) => values.map(cleanString).find(Boolean) ?? null;

const flattenEvidenceValue = (value) => {
  if (value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const cleaned = cleanString(String(value));
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => flattenEvidenceValue(item)).slice(0, 18);
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .flatMap(([key, nested]) => flattenEvidenceValue(nested).map((item) => `${key}: ${item}`))
      .slice(0, 18);
  }
  return [];
};

const findingForMatch = (match) => {
  const parts = [
    cleanString(match?.source) ? `Source: ${cleanString(match.source)}` : null,
    cleanString(match?.type) ? `Type: ${cleanString(match.type)}` : null,
    cleanString(match?.strength) ? `Strength: ${cleanString(match.strength)}` : null,
    cleanString(match?.confidence) ? `Confidence: ${cleanString(match.confidence)}` : null,
    cleanString(match?.whyItMatters) ? `Why: ${cleanString(match.whyItMatters)}` : null,
    cleanString(match?.searchTerm) ? `Search term: ${cleanString(match.searchTerm)}` : null,
    cleanString(match?.matchedDisplayName) ? `Matched display name: ${cleanString(match.matchedDisplayName)}` : null,
    cleanString(match?.matchedInstagramHandle) ? `Matched Instagram: @${normalizeHandle(match.matchedInstagramHandle)}` : null,
    cleanString(match?.candidate) ? `Candidate: ${cleanString(match.candidate)}` : null,
    cleanString(match?.reason) ? `Reason: ${cleanString(match.reason)}` : null,
    cleanString(match?.finding) ? `Finding: ${cleanString(match.finding)}` : null,
    cleanString(match?.classification) ? `Classification: ${cleanString(match.classification)}` : null,
    ...flattenEvidenceValue(match?.evidence).slice(0, 18),
  ].filter(Boolean);
  return parts.join(' | ');
};

const sourceKindHintForMatch = (match) => {
  const text = [
    cleanString(match?.type),
    cleanString(match?.source),
    cleanString(match?.sourceId),
    cleanString(match?.finding),
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('instagram_dm_ui') || text.includes('instagram messages ui')) return 'instagram_dm_ui_export';
  if (text.includes('mailerlite')) return 'mailerlite_export';
  if (text.includes('contacts')) return 'contacts_app_export';
  if (text.includes('drive') || text.includes('sheets')) return text.includes('retreat') || text.includes('retiro')
    ? 'retreat_table'
    : 'google_drive_export';
  if (text.includes('gmail')) return 'gmail_export';
  if (text.includes('lead_capture') || text.includes('instagram')) return 'lead_capture_export';
  if (text.includes('decision') || text.includes('person-card') || text.includes('crm vnext')) return 'local_fixture';
  return 'local_fixture';
};

const sourceKindHintForEvidenceRecord = (record) => {
  const text = [
    cleanString(record?.sourceSystem),
    cleanString(record?.source),
    cleanString(record?.sourceId),
    cleanString(record?.finding),
  ].filter(Boolean).join(' ').toLowerCase();
  if (text.includes('instagram_dm_ui') || text.includes('instagram messages ui')) return 'instagram_dm_ui_export';
  if (text.includes('lead-capture') || text.includes('lead_capture') || text.includes('mailerlite_form') || text.includes('onboarding')) {
    return 'lead_capture_export';
  }
  if (text.includes('mailerlite')) return 'mailerlite_export';
  if (text.includes('gmail')) return 'gmail_export';
  if (text.includes('drive') || text.includes('sheets')) return text.includes('retiro') || text.includes('retreat')
    ? 'retreat_table'
    : 'google_drive_export';
  if (text.includes('contacts')) return 'contacts_app_export';
  return 'local_fixture';
};

const findingForEvidenceRecord = (record) => [
  cleanString(record?.sourceSystem) ? `Source system: ${cleanString(record.sourceSystem)}` : null,
  cleanString(record?.searchTerm) ? `Search term: ${cleanString(record.searchTerm)}` : null,
  cleanString(record?.matchedDisplayName) ? `Matched display name: ${cleanString(record.matchedDisplayName)}` : null,
  cleanString(record?.matchedInstagramHandle) ? `Matched Instagram: @${normalizeHandle(record.matchedInstagramHandle)}` : null,
  cleanString(record?.confidence) ? `Confidence: ${cleanString(record.confidence)}` : null,
  cleanString(record?.finding) ? `Finding: ${cleanString(record.finding)}` : null,
  ...flattenEvidenceValue(record?.attributes).slice(0, 12),
].filter(Boolean).join(' | ');

const evidenceSourcesForContact = (contactKey, contact) => {
  const strongMatches = Array.isArray(contact?.strongMatches) ? contact.strongMatches : [];
  const weakMatches = Array.isArray(contact?.weakMatches) ? contact.weakMatches : [];
  const matchSources = [
    ...strongMatches.map((match) => ({ ...match, _bucket: 'strong' })),
    ...weakMatches.map((match) => ({ ...match, _bucket: 'weak_review_only' })),
  ].flatMap((match) => {
    const finding = findingForMatch(match);
    if (!finding) return [];
    return [{
      kind: sourceKindHintForMatch(match),
      finding: [
        `Contact key: ${contactKey}`,
        `Bucket: ${match._bucket}`,
        finding,
      ].join(' | '),
    }];
  });
  const evidenceRecordSources = (Array.isArray(contact?.evidenceRecords) ? contact.evidenceRecords : [])
    .flatMap((record, index) => {
      const finding = findingForEvidenceRecord(record);
      if (!finding) return [];
      return [{
        kind: sourceKindHintForEvidenceRecord(record),
        finding: [
          `Contact key: ${contactKey}`,
          cleanString(record?.sourceId) ? `Record sourceId: ${cleanString(record.sourceId)}` : `Record index: ${index + 1}`,
          finding,
        ].join(' | '),
      }];
    });
  return [...matchSources, ...evidenceRecordSources];
};

const confirmedIdentityFor = (contact) =>
  contact?.identity && typeof contact.identity === 'object' && !Array.isArray(contact.identity)
    ? contact.identity.confirmed ?? {}
    : {};

const hasBridgePendingIdentity = (contact) =>
  [
    ...(Array.isArray(contact?.identity?.candidates) ? contact.identity.candidates : []),
    ...(Array.isArray(contact?.identity?.candidatesReviewOnly) ? contact.identity.candidatesReviewOnly : []),
  ].some((candidate) =>
    /pending_bridge|review_only|identity_bridge/i.test(cleanString(candidate?.status) ?? '')
    || /bridge|handle/i.test(cleanString(candidate?.why) ?? '')
    || /family|shared|companion/i.test(cleanString(candidate?.status) ?? '')
  );

const evidenceSourcesForEnrichmentContact = (contactKey, contact) => {
  const bridgePending = hasBridgePendingIdentity(contact);
  const existingSources = [
    ...(Array.isArray(contact?.evidenceSources) ? contact.evidenceSources : []),
    ...(Array.isArray(contact?.evidence) ? contact.evidence : []),
  ];
  const evidenceSources = existingSources.map((source) => {
    const finding = cleanString(source?.finding);
    const bridgePrefix = bridgePending && /email|phone|subscriber|mailerlite|lead capture/i.test(finding ?? '')
      ? 'Identity bridge review required before assigning contact fields. '
      : '';
    return {
      kind: cleanString(source?.kind ?? source?.source),
      source: cleanString(source?.source),
      finding: `${bridgePrefix}${finding ?? ''}`.trim(),
    };
  });

  if (Array.isArray(contact?.identity?.doNotPromote)) {
    for (const rejected of contact.identity.doNotPromote) {
      const field = cleanString(rejected?.field ?? rejected?.kind) ?? 'field';
      const value = cleanString(rejected?.value) ?? 'unknown';
      const why = cleanString(rejected?.why);
      evidenceSources.push({
        kind: 'local_fixture',
        source: 'mantis_enrichment_rejected_collision',
        finding: [
          `Contact key: ${contactKey}`,
          `Do not assign ${field} ${value} to this contact.`,
          why ? `Why: ${why}` : null,
          'This is collision evidence only.',
        ].filter(Boolean).join(' '),
      });
    }
  }

  const reviewOnlyCandidates = [
    ...(Array.isArray(contact?.reviewOnlyCandidates) ? contact.reviewOnlyCandidates : []),
    ...(Array.isArray(contact?.identity?.candidatesReviewOnly) ? contact.identity.candidatesReviewOnly : []),
    ...(Array.isArray(contact?.identity?.candidates) ? contact.identity.candidates : []),
  ];
  for (const candidate of reviewOnlyCandidates) {
    const candidateText = typeof candidate === 'object' && candidate
      ? [
        cleanString(candidate.field) ? `Field: ${cleanString(candidate.field)}` : null,
        cleanString(candidate.value) ? `Value: ${cleanString(candidate.value)}` : null,
        cleanString(candidate.confidence) ? `Confidence: ${cleanString(candidate.confidence)}` : null,
        cleanString(candidate.status) ? `Status: ${cleanString(candidate.status)}` : null,
        cleanString(candidate.why) ? `Why: ${cleanString(candidate.why)}` : null,
        Array.isArray(candidate.sources) && candidate.sources.length
          ? `Sources: ${candidate.sources.map(cleanString).filter(Boolean).join('; ')}`
          : null,
      ].filter(Boolean).join(' | ')
      : cleanString(candidate);
    const finding = cleanString(candidateText);
    if (!finding) continue;
    evidenceSources.push({
      kind: bridgePending && /@|email|gmail|hotmail|phone|\+\d|\d{8,}/i.test(finding)
        ? 'mailerlite_export'
        : 'local_fixture',
      source: 'mantis_enrichment_review_only_candidate',
      finding: [
        `Contact key: ${contactKey}`,
        bridgePending ? 'Identity bridge review required before assigning contact fields.' : 'Review-only candidate.',
        finding,
      ].join(' '),
    });
  }

  if (Array.isArray(contact?.confirmedFacts)) {
    for (const fact of contact.confirmedFacts) {
      const finding = cleanString(fact);
      if (!finding) continue;
      evidenceSources.push({
        kind: 'local_fixture',
        source: 'mantis_enrichment_confirmed_fact',
        finding: `Contact key: ${contactKey}. ${finding}`,
      });
    }
  }

  for (const fact of [
    cleanString(contact?.programAndRelationshipEvidence?.finding),
    cleanString(contact?.retreatProgramEvidence?.finding),
    cleanString(contact?.emailPhoneOwnership?.rationale),
  ].filter(Boolean)) {
    evidenceSources.push({
      kind: 'local_fixture',
      source: 'mantis_enrichment_confirmed_context',
      finding: `Contact key: ${contactKey}. ${fact}`,
    });
  }

  return evidenceSources;
};

const confidenceForEnrichmentContact = (contact) => {
  if (Array.isArray(contact?.confirmedFacts) && contact.confirmedFacts.length) return 'high';
  const evidence = [
    ...(Array.isArray(contact?.evidenceSources) ? contact.evidenceSources : []),
    ...(Array.isArray(contact?.evidence) ? contact.evidence : []),
  ];
  if (evidence.some((source) =>
    /confirmed/i.test(cleanString(source?.status) ?? '')
    && confidenceAtLeast(source?.confidence, 'high')
  )) return 'high';

  const confirmed = confirmedIdentityFor(contact);
  if (firstClean(
    confirmed.instagramHandle,
    confirmed.fullName,
    confirmed.displayName,
    confirmed.phone,
    confirmed.email
  )) return 'medium';
  return 'low';
};

const fullNameForContact = (contactKey, contact) => {
  const confirmed = confirmedIdentityFor(contact);
  const confirmedName = firstClean(confirmed.fullName, confirmed.displayName);
  if (confirmedName) return confirmedName;
  const resolved = contact?.resolvedAnchors ?? {};
  if (Array.isArray(resolved.nameCandidates) && resolved.nameCandidates.length) {
    return firstClean(...resolved.nameCandidates);
  }
  const inputAnchors = Array.isArray(contact?.inputAnchors) ? contact.inputAnchors : [];
  const namedAnchor = inputAnchors.find((anchor) => {
    const value = cleanString(anchor);
    return value && !value.startsWith('@') && !value.includes('@') && !/\d/.test(value);
  });
  if (namedAnchor) return cleanString(namedAnchor);
  return cleanString(contactKey)?.replace(/_/g, ' ') ?? null;
};

const contactKeyHandle = (contactKey) => {
  const value = cleanString(contactKey);
  if (!value) return null;
  if (value.startsWith('@')) return normalizeHandle(value);
  if (value.startsWith('ig:')) return normalizeHandle(value.slice(3));
  return null;
};

const evidenceKindFromSourceName = (sourceName) => {
  const text = cleanString(sourceName)?.toLowerCase() ?? '';
  if (text.includes('mailerlite')) return 'mailerlite_export';
  if (text.includes('contacts') || text.includes('addressbook')) return 'contacts_app_export';
  if (text.includes('gmail') || text.includes('zoom')) return 'gmail_export';
  if (text.includes('drive') || text.includes('sheets')) {
    return text.includes('retiro') || text.includes('retreat') ? 'retreat_table' : 'google_drive_export';
  }
  if (text.includes('crm') || text.includes('memory') || text.includes('reports')) return 'local_fixture';
  return 'local_fixture';
};

const sourceObjectToFinding = (source, prefix = null) => {
  const sourceName = cleanString(source?.source);
  const finding = cleanString(source?.finding);
  const confidence = cleanString(source?.confidence);
  const status = cleanString(source?.status);
  const sensitivity = cleanString(source?.sensitivity);
  const fields = source?.fields && typeof source.fields === 'object'
    ? flattenEvidenceValue(source.fields).slice(0, 10)
    : [];
  return [
    prefix,
    sourceName ? `Source: ${sourceName}` : null,
    finding ? `Finding: ${finding}` : null,
    confidence ? `Confidence: ${confidence}` : null,
    status ? `Status: ${status}` : null,
    sensitivity && sensitivity !== 'normal' ? `Sensitivity: ${sensitivity}` : null,
    ...fields,
  ].filter(Boolean).join(' | ');
};

const emailOwnershipSourcesForReport = (report) => {
  const subject = report?.subject ?? {};
  const contactKey = cleanString(subject.crmVnextKey)
    ?? (normalizeHandle(subject.instagramHandle) ? `ig:${normalizeHandle(subject.instagramHandle)}` : 'unknown');
  const sources = [];

  const contacts = Array.isArray(report?.matches_confirmados?.contacts)
    ? report.matches_confirmados.contacts
    : [];
  for (const contact of contacts) {
    const evidence = Array.isArray(contact?.evidence) ? contact.evidence : [];
    for (const item of evidence) {
      const finding = sourceObjectToFinding(item, [
        `Contact key: ${contactKey}`,
        'Confirmed contact point.',
        cleanString(contact?.type) && cleanString(contact?.value)
          ? `${cleanString(contact.type)} ${cleanString(contact.value)}`
          : null,
        cleanString(contact?.normalizedValue) ? `Normalized: ${cleanString(contact.normalizedValue)}` : null,
        cleanString(contact?.owner) ? `Owner: ${cleanString(contact.owner)}` : null,
      ].filter(Boolean).join(' '));
      if (!finding) continue;
      sources.push({
        kind: evidenceKindFromSourceName(item?.source),
        source: cleanString(item?.source),
        finding,
      });
    }
  }

  const identityMatches = Array.isArray(report?.matches_confirmados?.identity_context_matches)
    ? report.matches_confirmados.identity_context_matches
    : [];
  for (const item of identityMatches) {
    const finding = sourceObjectToFinding(item, [
      `Contact key: ${contactKey}`,
      'Identity context only; do not infer email ownership from this evidence.',
    ].join(' '));
    if (!finding) continue;
    sources.push({
      kind: evidenceKindFromSourceName(item?.source),
      source: cleanString(item?.source),
      finding,
    });
  }

  const reviewOnly = Array.isArray(report?.candidates_review_only)
    ? report.candidates_review_only
    : [];
  for (const candidate of reviewOnly) {
    const candidateValue = cleanString(candidate?.candidate);
    const candidateEvidence = Array.isArray(candidate?.evidence) ? candidate.evidence : [];
    const base = [
      `Contact key: ${contactKey}`,
      'Review-only email ownership candidate; do not assign as primary email.',
      candidateValue ? `Candidate: ${candidateValue.toLowerCase()}` : null,
      cleanString(candidate?.status) ? `Status: ${cleanString(candidate.status)}` : null,
      candidate?.doNotPromoteAsPrimaryEmail ? 'Do not promote as primary email.' : null,
      cleanString(candidate?.why) ? `Why: ${cleanString(candidate.why)}` : null,
      cleanString(candidate?.recommendedCRMHandling)
        ? `Recommended CRM handling: ${cleanString(candidate.recommendedCRMHandling)}`
        : null,
      ...flattenEvidenceValue(candidate?.confidence).slice(0, 6),
    ].filter(Boolean).join(' ');
    sources.push({
      kind: 'mailerlite_export',
      source: 'mantis_email_ownership_review_only_candidate',
      finding: base,
    });
    for (const item of candidateEvidence) {
      const finding = sourceObjectToFinding(item, base);
      if (!finding) continue;
      sources.push({
        kind: evidenceKindFromSourceName(item?.source),
        source: cleanString(item?.source),
        finding,
      });
    }
  }

  const rejected = Array.isArray(report?.rejected_collisions)
    ? report.rejected_collisions
    : [];
  for (const collision of rejected) {
    const candidateValue = cleanString(collision?.candidate);
    const base = [
      `Contact key: ${contactKey}`,
      'Rejected collision; do not assign to this contact.',
      candidateValue ? `Candidate: ${candidateValue}` : null,
      cleanString(collision?.type) ? `Type: ${cleanString(collision.type)}` : null,
      cleanString(collision?.status) ? `Status: ${cleanString(collision.status)}` : null,
      cleanString(collision?.confidence) ? `Confidence: ${cleanString(collision.confidence)}` : null,
      cleanString(collision?.why) ? `Why: ${cleanString(collision.why)}` : null,
      ...flattenEvidenceValue(collision?.examples).slice(0, 5),
    ].filter(Boolean).join(' ');
    sources.push({
      kind: 'local_fixture',
      source: 'mantis_email_ownership_rejected_collision',
      finding: base,
    });
    const collisionEvidence = Array.isArray(collision?.evidence) ? collision.evidence : [];
    for (const item of collisionEvidence) {
      const finding = sourceObjectToFinding(item, base);
      if (!finding) continue;
      sources.push({
        kind: evidenceKindFromSourceName(item?.source),
        source: cleanString(item?.source),
        finding,
      });
    }
  }

  const negativeFindings = Array.isArray(report?.negative_findings) ? report.negative_findings : [];
  for (const finding of negativeFindings.map(cleanString).filter(Boolean)) {
    sources.push({
      kind: 'local_fixture',
      source: 'mantis_email_ownership_negative_finding',
      finding: `Contact key: ${contactKey}. Negative finding: ${finding}`,
    });
  }

  if (report?.recomendacion_final && typeof report.recomendacion_final === 'object') {
    const recommendation = report.recomendacion_final;
    sources.push({
      kind: 'local_fixture',
      source: 'mantis_email_ownership_final_recommendation',
      finding: [
        `Contact key: ${contactKey}.`,
        cleanString(recommendation.decision) ? `Decision: ${cleanString(recommendation.decision)}` : null,
        typeof recommendation.safeEmailFound === 'boolean'
          ? `Safe email found: ${recommendation.safeEmailFound}`
          : null,
        cleanString(recommendation.crmWriteReadiness)
          ? `CRM write readiness: ${cleanString(recommendation.crmWriteReadiness)}`
          : null,
        cleanString(recommendation.secondaryAction)
          ? `Secondary action: ${cleanString(recommendation.secondaryAction)}`
          : null,
        cleanString(recommendation.why) ? `Why: ${cleanString(recommendation.why)}` : null,
      ].filter(Boolean).join(' '),
    });
  }

  return sources;
};

const normalizedResultForEmailOwnershipReport = (report) => {
  const subject = report?.subject ?? {};
  const context = subject.acceptedIdentityContext ?? {};
  const handle = normalizeHandle(subject.instagramHandle)
    ?? contactKeyHandle(subject.crmVnextKey);
  const location = cleanString(context.location);
  const [city, country] = location
    ? location.split(',').map((item) => cleanString(item))
    : [null, null];
  const confirmedContacts = Array.isArray(report?.matches_confirmados?.contacts)
    ? report.matches_confirmados.contacts
    : [];
  const confirmedPhone = firstClean(
    ...confirmedContacts
      .filter((item) => cleanString(item?.type)?.toLowerCase() === 'phone')
      .flatMap((item) => [item.normalizedValue, item.value]),
    context.phone
  );
  const reviewOnlyEmails = Array.isArray(report?.candidates_review_only)
    ? report.candidates_review_only
      .map((candidate) => cleanString(candidate?.candidate)?.toLowerCase())
      .filter(Boolean)
    : [];
  const recommendation = report?.recomendacion_final ?? {};
  const result = {
    resultKey: cleanString(subject.crmVnextKey) ?? (handle ? `ig:${handle}` : 'email_ownership_report'),
    contactKey: cleanString(subject.crmVnextKey) ?? (handle ? `ig:${handle}` : 'email_ownership_report'),
    handle: handle ? `@${handle}` : null,
    candidate_name: cleanString(context.name),
    candidate_email: null,
    candidate_phone: confirmedPhone,
    city: city ?? null,
    country: country ?? null,
    mailer_groups: [
      ...flattenEvidenceValue(context.relationshipContext).slice(0, 8),
      ...flattenEvidenceValue(context.familyContext).slice(0, 8),
    ],
    confidence: confirmedPhone || context.name || handle ? 'high' : 'medium',
    recommended_next_step: cleanString(recommendation.decision)
      ?? cleanString(recommendation.secondaryAction),
    blockers: recommendation.safeEmailFound === false
      ? ['no_safe_primary_email_found']
      : [],
    evidenceSources: emailOwnershipSourcesForReport(report),
  };
  const noSafeEmail = recommendation.safeEmailFound === false
    || /not_ready_for_email_write|insufficient/i.test(cleanString(recommendation.crmWriteReadiness) ?? '');
  return {
    ...result,
    factText: [
      `CRM: ${result.handle ?? result.candidate_name ?? result.contactKey}${result.candidate_name ? ` es ${result.candidate_name}` : ''}.`,
      result.candidate_phone ? `Teléfono confirmado ${result.candidate_phone}.` : null,
      noSafeEmail ? 'No hay email primario seguro para asignar.' : null,
      reviewOnlyEmails.length
        ? `Emails review-only/familiares no asignables como primarios: ${reviewOnlyEmails.join(', ')}.`
        : null,
      result.recommended_next_step ? `Recomendación Mantis: ${result.recommended_next_step}.` : null,
    ].filter(Boolean).join(' '),
  };
};

const cleanEmail = (value) => cleanString(value)?.toLowerCase() ?? null;

const normalizedConfidenceForInstagramUiContact = (contact) => {
  const text = [
    cleanString(contact?.confidence),
    cleanString(contact?.status ?? contact?.result),
  ].filter(Boolean).join(' ').toLowerCase();
  if (/high|strong|found/.test(text) && !/review_only|without_handle|no_handle/.test(text)) return 'high';
  if (/review_only|without_handle|no_handle|not_found/.test(text)) return 'low';
  if (cleanString(contact?.matchedInstagramHandle)) return 'medium';
  return 'low';
};

const threadContextPartsFor = (contact) => {
  const threadContext = contact?.threadContext && typeof contact.threadContext === 'object'
    ? contact.threadContext
    : {};
  return {
    compact: cleanString(threadContext.compact ?? contact?.threadContext ?? contact?.compactContext),
    preferences: [
      ...(Array.isArray(threadContext.preferences) ? threadContext.preferences : []),
      ...(Array.isArray(contact?.preferences) ? contact.preferences : []),
    ].map(cleanString).filter(Boolean),
    tone: cleanString(threadContext.tone ?? contact?.tone),
    productInterest: cleanString(threadContext.productInterest ?? contact?.productInterest),
    nextStepCue: cleanString(threadContext.nextStepCue ?? contact?.nextStepCue),
  };
};

const evidenceSourcesForInstagramUiContact = (contactKey, contact) => {
  const existingSources = Array.isArray(contact?.evidenceSources) ? contact.evidenceSources : [];
  const mapped = existingSources.map((source) => ({
    ...source,
    sourceKind: cleanString(source?.sourceKind) ?? 'instagram_dm_ui_export',
    kind: cleanString(source?.kind ?? source?.sourceKind) ?? 'instagram_dm_ui_export',
    finding: cleanString(source?.finding ?? source?.text ?? source?.snippet),
  }));
  const thread = threadContextPartsFor(contact);
  const locationText = cleanString(contact?.locationEvidence?.sourceText)
    ?? cleanString(contact?.locationEvidence)
    ?? cleanString(contact?.locationText);
  const contextFinding = [
    `Contact key: ${contactKey}`,
    cleanString(contact?.status ?? contact?.result) ? `Status: ${cleanString(contact.status ?? contact.result)}` : null,
    cleanString(contact?.matchedInstagramHandle ?? contact?.recoveredHandle) ? `Matched Instagram: @${normalizeHandle(contact.matchedInstagramHandle ?? contact.recoveredHandle)}` : null,
    cleanString(contact?.matchedDisplayName ?? contact?.threadDisplayName) ? `Matched display name: ${cleanString(contact.matchedDisplayName ?? contact.threadDisplayName)}` : null,
    cleanString(contact?.city ?? contact?.locationEvidence?.city) ? `City: ${cleanString(contact.city ?? contact.locationEvidence.city)}` : null,
    cleanString(contact?.country ?? contact?.locationEvidence?.country) ? `Country: ${cleanString(contact.country ?? contact.locationEvidence.country)}` : null,
    locationText ? `Location evidence: ${locationText}` : null,
    thread.compact ? `Thread context: ${thread.compact}` : null,
    thread.preferences.length ? `Preferences: ${thread.preferences.join('; ')}` : null,
    thread.tone ? `Tone: ${thread.tone}` : null,
    thread.productInterest ? `Product interest: ${thread.productInterest}` : null,
    thread.nextStepCue ? `Next step cue: ${thread.nextStepCue}` : null,
  ].filter(Boolean).join(' | ');
  if (contextFinding) {
    mapped.push({
      sourceKind: 'instagram_dm_ui_export',
      kind: 'instagram_dm_ui_export',
      source: 'mantis_instagram_ui_auth_rerun_context',
      finding: contextFinding,
    });
  }
  for (const candidate of Array.isArray(contact?.discardedCandidates) ? contact.discardedCandidates : []) {
    const finding = [
      `Contact key: ${contactKey}`,
      'Discarded Instagram UI candidate; do not assign.',
      cleanString(candidate?.candidate ?? candidate?.label) ? `Candidate: ${cleanString(candidate.candidate ?? candidate.label)}` : null,
      cleanString(candidate?.reason) ? `Reason: ${cleanString(candidate.reason)}` : null,
    ].filter(Boolean).join(' ');
    if (finding) {
      mapped.push({
        sourceKind: 'local_fixture',
        kind: 'local_fixture',
        source: 'mantis_instagram_ui_discarded_candidate',
        finding,
      });
    }
  }
  return mapped;
};

const normalizedResultForInstagramUiContact = ([contactKey, contact]) => {
  const handle = normalizeHandle(contact?.matchedInstagramHandle ?? contact?.recoveredHandle) ?? contactKeyHandle(contactKey);
  const thread = threadContextPartsFor(contact);
  const candidateName = firstClean(contact?.matchedDisplayName, contact?.threadDisplayName, contact?.label, fullNameForContact(contactKey, contact));
  const candidateEmail = cleanEmail(contact?.subjectEmail ?? contact?.recoveredEmail)
    ?? (contactKey.startsWith('email:') ? cleanEmail(contactKey.replace(/^email:/, '')) : null);
  const candidatePhone = firstClean(contact?.subjectPhone, contact?.recoveredPhone);
  const city = firstClean(contact?.city, contact?.locationEvidence?.city);
  const country = firstClean(contact?.country, contact?.locationEvidence?.country);
  const reviewOnly = /review_only|without_handle|no_handle/i.test([
    cleanString(contact?.status ?? contact?.result),
    cleanString(contact?.confidence),
  ].filter(Boolean).join(' '));
  const noHandle = !handle;
  const result = {
    resultKey: contactKey,
    contactKey,
    handle: handle ? `@${handle}` : null,
    candidate_name: candidateName,
    candidate_email: candidateEmail,
    candidate_phone: candidatePhone,
    city,
    country,
    mailer_groups: [
      thread.productInterest,
      ...thread.preferences,
    ].filter(Boolean),
    confidence: normalizedConfidenceForInstagramUiContact(contact),
    recommended_next_step: thread.nextStepCue ?? cleanString(contact?.recommendation ?? contact?.recommendedActionAfterInstagramUi),
    blockers: [
      reviewOnly || noHandle ? 'instagram_ui_no_recoverable_handle' : null,
      cleanString(contact?.emailOwnershipStatus) === 'not_found_in_instagram_ui'
        ? 'instagram_ui_no_email_ownership_evidence'
        : null,
    ].filter(Boolean),
    evidenceSources: evidenceSourcesForInstagramUiContact(contactKey, contact),
  };
  const subject = result.handle ?? result.candidate_email ?? result.candidate_name ?? contactKey;
  return {
    ...result,
    factText: [
      `CRM: ${subject}${result.candidate_name && result.handle ? ` es ${result.candidate_name}` : ''}.`,
      result.candidate_email ? `Email visible/puente ${result.candidate_email}.` : null,
      result.candidate_phone ? `Teléfono visible/puente ${result.candidate_phone}.` : null,
      result.city ? `Ciudad ${result.city}.` : null,
      result.country ? `País ${result.country}.` : null,
      thread.productInterest ? `Interés: ${thread.productInterest}.` : null,
      thread.compact ? `Contexto IG UI: ${thread.compact}` : null,
      reviewOnly || noHandle ? 'Mantener review-only: no hay handle recuperable seguro.' : null,
    ].filter(Boolean).join(' '),
  };
};

const contactFactText = (contactKey, contact, result) => {
  if (contact?.identity && typeof contact.identity === 'object') {
    const bridgePending = hasBridgePendingIdentity(contact);
    const confirmedFacts = Array.isArray(contact.confirmedFacts)
      ? contact.confirmedFacts.map(cleanString).filter(Boolean)
      : [];
    const rejected = Array.isArray(contact?.identity?.doNotPromote)
      ? contact.identity.doNotPromote
        .map((item) => [cleanString(item?.field ?? item?.kind), cleanString(item?.value)].filter(Boolean).join(' '))
        .filter(Boolean)
      : [];
    const parts = [
      bridgePending ? 'tiene candidatos de identity bridge que requieren aprobación antes de asignar email/teléfono' : null,
      rejected.length ? `colisiones no asignables registradas por Mantis: ${rejected.length}` : null,
      confirmedFacts.length ? `hechos confirmados: ${confirmedFacts.join('; ')}` : null,
      cleanString(contact?.communityRelationship?.type) ? `relación: ${cleanString(contact.communityRelationship.type)}` : null,
      Array.isArray(contact?.programAndRelationshipEvidence?.relationshipTypes) && contact.programAndRelationshipEvidence.relationshipTypes.length
        ? `relación: ${contact.programAndRelationshipEvidence.relationshipTypes.map(cleanString).filter(Boolean).join(' + ')}`
        : null,
      cleanString(contact?.retreatProgramEvidence?.status) ? `estado retiro: ${cleanString(contact.retreatProgramEvidence.status)}` : null,
      cleanString(contact?.programAndRelationshipEvidence?.status) ? `estado programa: ${cleanString(contact.programAndRelationshipEvidence.status)}` : null,
    ].filter(Boolean);
    const subject = result.handle ?? result.candidate_name ?? contactKey;
    const intro = result.handle && result.candidate_name
      ? `CRM: ${result.handle} es ${result.candidate_name}.`
      : `CRM: ${subject}.`;
    return `${intro} ${parts.join('; ')}.`;
  }

  const resolved = contact?.resolvedAnchors ?? {};
  const facts = [
    result.handle ? `handle ${result.handle}` : null,
    result.candidate_name ? `se llama ${result.candidate_name}` : null,
    result.candidate_email ? `email confirmado ${result.candidate_email}` : null,
    result.candidate_phone ? `teléfono ${result.candidate_phone}` : null,
    Array.isArray(resolved.secondaryEmails) && resolved.secondaryEmails.length
      ? `correos secundarios/históricos: ${resolved.secondaryEmails.map((item) => item.email ?? item).filter(Boolean).join(', ')}`
      : null,
    Array.isArray(resolved.familyOrCompanionEmailsReviewOnly) && resolved.familyOrCompanionEmailsReviewOnly.length
      ? `emails de familia/acompañante review-only, no asignar como email primario: ${resolved.familyOrCompanionEmailsReviewOnly.join(', ')}`
      : null,
    Array.isArray(resolved.retreatOrClassEvidence) && resolved.retreatOrClassEvidence.length
      ? `evidencia de comunidad/programas: ${resolved.retreatOrClassEvidence.join('; ')}`
      : null,
    Array.isArray(resolved.retreatLeadEvidence) && resolved.retreatLeadEvidence.length
      ? `evidencia de interés en retiros: ${resolved.retreatLeadEvidence.join('; ')}`
      : null,
    cleanString(contact?.recommendation) ? `recomendación Mantis: ${cleanString(contact.recommendation)}` : null,
  ].filter(Boolean);
  const subject = result.handle ?? result.candidate_name ?? contactKey;
  return `CRM: ${subject} — ${facts.join('; ')}.`;
};

const normalizedResultForContact = ([contactKey, contact]) => {
  if (contact?.identity && typeof contact.identity === 'object') {
    const confirmed = confirmedIdentityFor(contact);
    const handle = normalizeHandle(confirmed.instagramHandle)
      ?? normalizeHandle(contact?.inputHandle)
      ?? contactKeyHandle(contact?.crmVnextKey)
      ?? contactKeyHandle(contactKey);
    const candidateName = fullNameForContact(contactKey, contact);
    const candidateEmail = firstClean(confirmed.email);
    const candidatePhone = firstClean(confirmed.phone);
    const city = firstClean(confirmed.city);
    const country = firstClean(confirmed.country);
    const result = {
      resultKey: contactKey,
      contactKey,
      handle: handle ? `@${handle}` : null,
      candidate_name: candidateName,
      candidate_email: candidateEmail?.toLowerCase() ?? null,
      candidate_phone: candidatePhone,
      city,
      country,
      mailer_groups: [
        cleanString(contact?.retreatProgramEvidence?.status),
        cleanString(contact?.communityRelationship?.type),
        ...(Array.isArray(contact?.programAndRelationshipEvidence?.relationshipTypes)
          ? contact.programAndRelationshipEvidence.relationshipTypes.map(cleanString).filter(Boolean)
          : []),
      ].filter(Boolean),
      confidence: confidenceForEnrichmentContact(contact),
      recommended_next_step: cleanString(contact?.communityRelationship?.recommendedNextAction)
        ?? cleanString(contact?.recommendedNextStep)
        ?? cleanString(contact?.recommendedNextAction),
      blockers: Array.isArray(contact?.blockers)
        ? contact.blockers.map((blocker) => cleanString(blocker?.exactBlocker ?? blocker)).filter(Boolean)
        : [],
      evidenceSources: evidenceSourcesForEnrichmentContact(contactKey, contact),
    };
    return {
      ...result,
      factText: contactFactText(contactKey, contact, result),
    };
  }

  const resolved = contact?.resolvedAnchors ?? {};
  const handle = normalizeHandle(resolved.instagramHandle) ?? normalizeHandle(
    Array.isArray(contact?.inputAnchors)
      ? contact.inputAnchors.find((anchor) => cleanString(anchor)?.startsWith('@'))
      : null
  );
  const candidateEmail = firstClean(resolved.primaryEmail, resolved.email, resolved.ownedEmail);
  const candidatePhone = firstClean(resolved.phone);
  const candidateName = firstClean(resolved.displayName, resolved.displayNameCandidate, resolved.fullName, fullNameForContact(contactKey, contact));
  const city = firstClean(resolved.city, resolved.cityCandidate, resolved.cityCandidateFromBio);
  const country = firstClean(resolved.country, resolved.countryCandidate, resolved.countryCandidateFromBio);
  const groups = [
    ...(Array.isArray(resolved.retreatOrClassEvidence) ? resolved.retreatOrClassEvidence : []),
    ...(Array.isArray(resolved.retreatLeadEvidence) ? resolved.retreatLeadEvidence : []),
  ].map(cleanString).filter(Boolean);
  const strongMatches = Array.isArray(contact?.strongMatches) ? contact.strongMatches : [];
  const recommendation = cleanString(contact?.recommendation);
  const result = {
    resultKey: contactKey,
    contactKey,
    handle: handle ? `@${handle}` : null,
    candidate_name: candidateName,
    candidate_email: candidateEmail?.toLowerCase() ?? null,
    candidate_phone: candidatePhone,
    city,
    country,
    mailer_groups: groups,
    confidence: strongMatches.length ? 'high' : 'medium',
    recommended_next_step: recommendation,
    blockers: recommendation === 'needs_human_decision' ? ['needs_human_decision_before_card_write'] : [],
    evidenceSources: evidenceSourcesForContact(contactKey, contact),
  };
  return {
    ...result,
    factText: contactFactText(contactKey, contact, result),
  };
};

const normalizedResultsForReport = (report) => {
  if (Array.isArray(report?.results)) return report.results;
  const reportSchema = cleanString(report?.schemaVersion ?? report?.schema);
  if ((reportSchema === 'mantis.crm_vnext.instagram_ui_auth_rerun.v1'
    || reportSchema === 'mantis.crm_vnext.stitching_batch_instagram_ui_complement_retry.v1')
    && report?.contacts
    && typeof report.contacts === 'object'
    && !Array.isArray(report.contacts)
  ) {
    return Object.entries(report.contacts).map(normalizedResultForInstagramUiContact);
  }
  if (report?.contacts && typeof report.contacts === 'object' && !Array.isArray(report.contacts)) {
    return Object.entries(report.contacts).map(normalizedResultForContact);
  }
  if (
    report?.subject
    && (
      report?.candidates_review_only
      || report?.matches_confirmados
      || report?.recomendacion_final
    )
  ) {
    return [normalizedResultForEmailOwnershipReport(report)];
  }
  return [];
};

const buildImportPacket = (report, options) => {
  const results = normalizedResultsForReport(report);
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
