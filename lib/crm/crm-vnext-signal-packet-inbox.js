import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';

export const CRM_VNEXT_SIGNAL_PACKET_INBOX_SCHEMA_VERSION =
  'crm-vnext-signal-packet-inbox-2026-05-22';

const DEFAULT_REPORTS_DIR_LABEL = '~/Documents/Mantis-Reports';
const DAY_MS = 24 * 60 * 60 * 1000;

const PIPELINE_FLAGS = {
  mailerlite_snapshot: '--mailerlite-snapshot-file',
  gmail_reply_discovery: '--gmail-reply-discovery-file',
  engagement_signals: '--signals-file',
  signal_events: '--events-file',
};

const cleanPublicText = (value) =>
  String(value ?? '')
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicText(value);
  return cleaned || null;
};

const isoNow = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const asDate = (value) => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

const isoFrom = (value, fallback = null) => asDate(value)?.toISOString() ?? fallback;

const normalizeFileName = (value) => {
  const raw = typeof value === 'string' ? value : cleanString(value);
  return basename(cleanPublicText(raw ? basename(raw) : 'unknown.json'));
};

const lower = (value) => cleanString(value)?.toLowerCase() ?? '';

const asArray = (value) => Array.isArray(value) ? value : [];

const getPath = (record, key) => {
  if (!record || typeof record !== 'object') return null;
  if (!key.includes('.')) return record[key] ?? null;
  let cursor = record;
  for (const part of key.split('.')) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return cursor ?? null;
};

const firstValue = (record, keys) => {
  for (const key of keys) {
    const value = getPath(record, key);
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const stringifyShallow = (value) => {
  try {
    return JSON.stringify(value ?? {}).slice(0, 24000).toLowerCase();
  } catch {
    return '';
  }
};

const laneCodesFromText = (raw) => {
  const value = lower(raw);
  const lanes = new Set();
  if (
    value.includes('google')
    || value.includes('gog')
    || value.includes('gmail')
    || value.includes('drive')
    || value.includes('docs')
    || value.includes('sheets')
    || value.includes('contacts')
    || value.includes('invalid_grant')
  ) lanes.add('google_workspace');
  if (value.includes('mailerlite') || value.includes('401') || value.includes('token')) lanes.add('mailerlite');
  if (value.includes('instagram') || value.includes('relay') || value.includes('login')) lanes.add('instagram_ui');
  return lanes;
};

const fileStem = (fileName) => fileName.replace(/\.json$/i, '');

const pathLabelFor = (fileName, reportsDirLabel = DEFAULT_REPORTS_DIR_LABEL) =>
  `${reportsDirLabel.replace(/\/+$/, '')}/${normalizeFileName(fileName)}`;

const commandFor = (packetKind, fileName, reportsDirLabel = DEFAULT_REPORTS_DIR_LABEL) => {
  const flag = PIPELINE_FLAGS[packetKind];
  return flag
    ? `npm run crm:vnext:signal-event-pipeline -- ${flag} ${pathLabelFor(fileName, reportsDirLabel)} --out ${reportsDirLabel}/${fileStem(fileName)}_pipeline_preview.json`
    : null;
};

const hasEventShape = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  return Boolean(
    firstValue(record, ['eventKind', 'event_kind', 'kind'])
      && firstValue(record, ['sourceKind', 'source_kind', 'source'])
      && firstValue(record, ['observedAt', 'observed_at', 'timestamp', 'date']),
  );
};

const hasSignalShape = (record) => {
  if (!record || typeof record !== 'object' || Array.isArray(record)) return false;
  return Boolean(
    firstValue(record, ['personId', 'person_id', 'email', 'instagramHandle', 'phone'])
      && firstValue(record, ['sourceKind', 'source_kind', 'kind', 'channel'])
      && firstValue(record, ['observedAt', 'observed_at', 'capturedAt', 'captured_at']),
  );
};

const isPipelineOutput = (payload) => {
  const schema = lower(payload?.schemaVersion ?? payload?.schema);
  const mode = lower(payload?.mode);
  return schema.includes('signal-event-pipeline') || mode.includes('signal_event_pipeline');
};

const isKnownGeneratedOutput = (fileName, payload) => {
  const name = fileName.toLowerCase();
  const schema = lower(payload?.schemaVersion ?? payload?.schema);
  const mode = lower(payload?.mode);
  if (isPipelineOutput(payload)) return true;
  return [
    'engagement_movement_queue',
    'engagement_signal_preview',
    'engagement_preview',
    'signal_packet_inbox',
    'engagement_decision_brief',
    'engagement_resolution_loop',
    'daily_operator_handoff',
    'daily_brief',
    'crm_vnext_snapshot_',
    'healthcheck',
    'source_health_preflight',
    'source_recovery_awaiting_human_unblock',
    'context_fact',
    'human_enrichment',
    'response_evidence',
    'card_apply',
    'card_write',
    'stitching',
    'evidence_hunt',
    'approval_packet',
    'questions',
    'proposals',
  ].some((marker) => name.includes(marker) || schema.includes(marker.replaceAll('_', '-')) || mode.includes(marker));
};

export const classifyCrmVNextSignalPacket = (entry) => {
  const fileName = normalizeFileName(entry.fileName ?? entry.path ?? 'unknown.json');
  if (entry.parseError) {
    return {
      fileName,
      packetKind: 'parse_error',
      actionable: false,
      reason: 'json_parse_error',
    };
  }

  const payload = entry.payload;
  const schema = lower(payload?.schemaVersion ?? payload?.schema);
  const mode = lower(payload?.mode);
  const name = fileName.toLowerCase();

  if (isKnownGeneratedOutput(fileName, payload)) {
    return {
      fileName,
      packetKind: 'generated_output',
      actionable: false,
      reason: 'generated_report_not_signal_input',
    };
  }

  if (
    schema.includes('instagram-signal-events')
    || mode.includes('instagram_signal_events')
    || name.includes('instagram_signal_events')
    || asArray(payload?.signalEvents).some(hasEventShape)
    || asArray(payload?.events).some(hasEventShape)
    || (Array.isArray(payload) && payload.some(hasEventShape))
  ) {
    return {
      fileName,
      packetKind: 'signal_events',
      actionable: true,
      reason: 'canonical_signal_events_packet',
    };
  }

  if (
    mode.includes('mailerlite_engagement_snapshot')
    || name.includes('mailerlite_engagement_snapshot')
    || (
      name.includes('mailerlite')
      && Boolean(payload?.scan?.cursorPaginationUsed)
      && asArray(payload?.records).length > 0
    )
  ) {
    return {
      fileName,
      packetKind: 'mailerlite_snapshot',
      actionable: true,
      reason: 'mailerlite_engagement_snapshot_packet',
    };
  }

  if (
    schema.includes('engagement-signals')
    || mode.includes('engagement_signal')
    || asArray(payload?.signals).some(hasSignalShape)
    || (Array.isArray(payload) && payload.some(hasSignalShape))
  ) {
    return {
      fileName,
      packetKind: 'engagement_signals',
      actionable: true,
      reason: 'engagement_signals_packet',
    };
  }

  if (
    schema.includes('gmail-reply')
    || schema.includes('email-reply')
    || name.includes('email_reply_intelligence')
    || name.includes('gmail_reply_discovery')
    || Boolean(payload?.contractV0)
    || asArray(payload?.representativeExamples).length > 0
    || asArray(payload?.gmailReplyActivities).length > 0
  ) {
    return {
      fileName,
      packetKind: 'gmail_reply_discovery',
      actionable: true,
      reason: 'gmail_reply_discovery_packet',
    };
  }

  return {
    fileName,
    packetKind: 'non_signal_report',
    actionable: false,
    reason: 'no_signal_input_contract_detected',
  };
};

const processedSourcesFrom = (entries) => {
  const processed = new Map();
  for (const entry of entries) {
    if (!entry.payload || !isPipelineOutput(entry.payload)) continue;
    const processedAt =
      asDate(entry.payload.generatedAt)
      ?? asDate(entry.modifiedAt)
      ?? new Date(0);
    for (const source of asArray(entry.payload.sourceReports)) {
      const labels = [
        source?.pathLabel,
        source?.label,
        source?.path,
      ].map(cleanString).filter(Boolean);
      for (const label of labels) {
        const fileName = normalizeFileName(label);
        const current = processed.get(fileName);
        if (!current || processedAt > current.processedAt) {
          processed.set(fileName, {
            processedAt,
            processorFileName: normalizeFileName(entry.fileName ?? entry.path ?? 'pipeline.json'),
            processorMode: cleanString(entry.payload.mode) ?? null,
          });
        }
      }
    }
  }
  return processed;
};

const latestPipelineProcessorFrom = (entries) => {
  let latest = null;
  for (const entry of entries) {
    if (!entry.payload || !isPipelineOutput(entry.payload)) continue;
    const processedAt =
      asDate(entry.payload.generatedAt)
      ?? asDate(entry.modifiedAt)
      ?? new Date(0);
    if (!latest || processedAt > latest.processedAt) {
      latest = {
        processedAt,
        processorFileName: normalizeFileName(entry.fileName ?? entry.path ?? 'pipeline.json'),
        processorMode: cleanString(entry.payload.mode) ?? null,
      };
    }
  }
  return latest;
};

const detectBlocker = (entry, latestHealthyByLane) => {
  if (entry.parseError || !entry.payload || typeof entry.payload !== 'object') return null;
  const payload = entry.payload;
  const fileName = normalizeFileName(entry.fileName ?? entry.path ?? 'unknown.json');
  const text = stringifyShallow(payload);
  const status = lower(payload.status);
  const mode = lower(payload.mode);
  const schema = lower(payload.schemaVersion ?? payload.schema);
  const modifiedAt = asDate(entry.modifiedAt) ?? new Date(0);
  const reasons = [];
  const lanes = new Set();

  const addLaneFromText = (raw) => {
    for (const lane of laneCodesFromText(raw)) lanes.add(lane);
  };

  if (status.includes('awaiting_human_unblock') || mode.includes('preflight')) {
    const preflight = payload.preflight && typeof payload.preflight === 'object' ? payload.preflight : {};
    for (const [key, value] of Object.entries(preflight)) {
      const sourceStatus = lower(value?.status);
      if (sourceStatus.includes('blocked') || sourceStatus.includes('login') || sourceStatus.includes('invalid')) {
        const reason = `${key}:${sourceStatus || 'blocked'}`.slice(0, 120);
        reasons.push(reason);
        addLaneFromText(`${key} ${sourceStatus} ${value?.blockerType ?? ''} ${value?.humanActionRequired ?? ''}`);
      }
    }
    if (!reasons.length && status.includes('awaiting_human_unblock')) {
      reasons.push('awaiting_human_unblock');
      addLaneFromText(text);
    }
  }

  if (
    schema.includes('healthcheck')
    && (
      payload.ok === false
      || lower(payload.status).includes('blocked')
      || Number(payload.summary?.blocked ?? 0) > 0
    )
  ) {
    reasons.push('source_health_blocked');
    addLaneFromText(`${fileName} ${text}`);
  }

  if (Array.isArray(payload.blockers) && payload.blockers.length > 0) {
    const authBlocker = payload.blockers.find((blocker) => {
      const blockerText = stringifyShallow(blocker);
      return /auth|401|token|required|blocked|invalid_grant|login|permission|credential/.test(blockerText);
    });
    if (authBlocker) {
      reasons.push('auth_or_permission_blocker_reported');
      addLaneFromText(authBlocker);
    }
  }

  if (!reasons.length) return null;

  const laneList = Array.from(lanes);
  if (!laneList.length && !status.includes('awaiting_human_unblock')) return null;
  const superseded = laneList.length > 0 && laneList.every((lane) => {
    const healthyAt = latestHealthyByLane.get(lane);
    return healthyAt && healthyAt > modifiedAt;
  });

  return {
    fileName,
    modifiedAt: isoFrom(modifiedAt),
    status: superseded ? 'superseded_blocker' : 'active_blocker',
    lanes: laneList.length ? laneList : ['unknown'],
    reasons: Array.from(new Set(reasons)).slice(0, 6),
    superseded,
  };
};

const latestHealthyLaneChecks = (entries) => {
  const latest = new Map();
  const markHealthy = (lane, at) => {
    const current = latest.get(lane);
    if (!current || at > current) latest.set(lane, at);
  };

  for (const entry of entries) {
    const payload = entry.payload;
    if (!payload || typeof payload !== 'object') continue;
    const at = asDate(payload.checkedAt ?? payload.generatedAt ?? payload.generatedAtLocal ?? entry.modifiedAt) ?? new Date(0);
    const scanStatusContainers = [
      payload.sourceStatus,
      payload.preflight,
    ].filter((value) => value && typeof value === 'object' && !Array.isArray(value));
    for (const container of scanStatusContainers) {
      for (const [key, value] of Object.entries(container)) {
        const status = lower(value?.status);
        if (!status) continue;
        const healthy =
          status.includes('ok')
          || status.includes('available')
          || status.includes('read_only');
        const blocked =
          status.includes('blocked')
          || status.includes('invalid')
          || status.includes('login');
        if (!healthy || blocked) continue;
        for (const lane of laneCodesFromText(`${key} ${status}`)) markHealthy(lane, at);
      }
    }

    const schema = lower(payload.schemaVersion ?? payload.schema);
    const mode = lower(payload.mode);
    if (!schema.includes('healthcheck') && !mode.includes('healthcheck')) continue;
    const blockedCount = Number(payload.summary?.blocked);
    const healthy =
      payload.ok === true
      || lower(payload.status) === 'ok'
      || (
        Number.isFinite(blockedCount)
        && blockedCount === 0
        && payload.ok !== false
        && !lower(payload.status).includes('blocked')
      );
    if (!healthy) {
      continue;
    }
    const fileName = normalizeFileName(entry.fileName ?? entry.path ?? 'healthcheck.json').toLowerCase();
    const lanes = [];
    if (fileName.includes('gog') || schema.includes('gog')) lanes.push('google_workspace');
    if (fileName.includes('mailerlite') || schema.includes('mailerlite')) lanes.push('mailerlite');
    for (const lane of lanes) markHealthy(lane, at);
  }
  return latest;
};

const entryDate = (entry) =>
  asDate(entry.payload?.generatedAt)
  ?? asDate(entry.payload?.checkedAt)
  ?? asDate(entry.payload?.createdAtLocal)
  ?? asDate(entry.modifiedAt)
  ?? new Date(0);

export const buildCrmVNextSignalPacketInbox = (input = {}) => {
  const generatedAt = isoNow(input.now);
  const sinceDays = Number.isFinite(Number(input.sinceDays)) && Number(input.sinceDays) > 0
    ? Number(input.sinceDays)
    : 14;
  const limit = Number.isFinite(Number(input.limit)) && Number(input.limit) > 0
    ? Number(input.limit)
    : 120;
  const generatedAtDate = asDate(generatedAt) ?? new Date();
  const sinceDate = new Date(generatedAtDate.getTime() - sinceDays * DAY_MS);
  const reportsDirLabel = cleanString(input.reportsDirLabel) ?? DEFAULT_REPORTS_DIR_LABEL;
  const allEntries = asArray(input.files)
    .map((entry) => ({
      ...entry,
      fileName: normalizeFileName(entry.fileName ?? entry.path ?? 'unknown.json'),
      modifiedAt: isoFrom(entry.modifiedAt, generatedAt),
    }))
    .filter((entry) => entry.fileName.toLowerCase().endsWith('.json'))
    .sort((left, right) => entryDate(right).getTime() - entryDate(left).getTime());

  const scopedEntries = allEntries
    .filter((entry) => entryDate(entry) >= sinceDate)
    .slice(0, limit);
  const processedSources = processedSourcesFrom(allEntries);
  const latestPipelineProcessor = latestPipelineProcessorFrom(allEntries);
  const latestHealthyByLane = latestHealthyLaneChecks(allEntries);

  const candidatePackets = [];
  const processedInputPackets = [];
  const observeOnlyFiles = [];
  const parseErrors = [];

  for (const entry of scopedEntries) {
    const classification = classifyCrmVNextSignalPacket(entry);
    if (classification.packetKind === 'parse_error') {
      parseErrors.push({
        fileName: entry.fileName,
        modifiedAt: entry.modifiedAt,
        reason: 'json_parse_error',
      });
      continue;
    }

    if (!classification.actionable) {
      observeOnlyFiles.push({
        fileName: entry.fileName,
        modifiedAt: entry.modifiedAt,
        reason: classification.reason,
      });
      continue;
    }

    const processed = processedSources.get(entry.fileName);
    const modifiedAt = asDate(entry.modifiedAt) ?? new Date(0);
    if (processed && processed.processedAt >= modifiedAt) {
      processedInputPackets.push({
        fileName: entry.fileName,
        packetKind: classification.packetKind,
        modifiedAt: entry.modifiedAt,
        processedAt: processed.processedAt.toISOString(),
        processorFileName: processed.processorFileName,
      });
      continue;
    }
    if (
      classification.packetKind === 'engagement_signals'
      && latestPipelineProcessor
      && latestPipelineProcessor.processedAt >= modifiedAt
    ) {
      processedInputPackets.push({
        fileName: entry.fileName,
        packetKind: classification.packetKind,
        modifiedAt: entry.modifiedAt,
        processedAt: latestPipelineProcessor.processedAt.toISOString(),
        processorFileName: latestPipelineProcessor.processorFileName,
        reason: 'superseded_by_later_signal_pipeline',
      });
      continue;
    }

    candidatePackets.push({
      fileName: entry.fileName,
      packetKind: classification.packetKind,
      reason: classification.reason,
      modifiedAt: entry.modifiedAt,
      generatedAt: isoFrom(
        entry.payload?.generatedAt
          ?? entry.payload?.checkedAt
          ?? entry.payload?.createdAtLocal,
        null,
      ),
      pipelineFlag: PIPELINE_FLAGS[classification.packetKind],
      recommendedCommand: commandFor(classification.packetKind, entry.fileName, reportsDirLabel),
      safety: {
        suppliedPacketOnly: true,
        liveApiCallsProhibited: true,
        outboundProhibited: true,
        cardMutationProhibited: true,
        credentialReadProhibited: true,
      },
    });
  }

  const blockerPackets = scopedEntries
    .map((entry) => detectBlocker(entry, latestHealthyByLane))
    .filter((blocker) => blocker && !blocker.superseded);
  const supersededBlockers = scopedEntries
    .map((entry) => detectBlocker(entry, latestHealthyByLane))
    .filter((blocker) => blocker?.superseded);

  const firstCandidate = candidatePackets[0] ?? null;
  const recommendation = firstCandidate
    ? 'run_signal_event_pipeline_preview'
    : blockerPackets.length > 0
      ? 'await_human_unblock_or_run_source_health_preflight'
      : 'observe_only_no_signal_delta';

  const firstMove = firstCandidate
    ? {
      action: 'run_pipeline_preview',
      command: firstCandidate.recommendedCommand,
      reason: `new_${firstCandidate.packetKind}_packet`,
    }
    : blockerPackets.length > 0
      ? {
        action: 'source_unblock_required',
        command: 'Run the relevant source-health preflight or ask Alejandro for the exact login/auth unblock.',
        reason: blockerPackets[0].reasons[0],
      }
      : {
        action: 'no_delta',
        command: null,
        reason: 'No unprocessed signal packets found in the scan window.',
      };

  return {
    schemaVersion: CRM_VNEXT_SIGNAL_PACKET_INBOX_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_signal_packet_inbox',
    scan: {
      reportsDirLabel,
      sinceDays,
      limit,
      filesAvailable: allEntries.length,
      filesScanned: scopedEntries.length,
      operationsExecuted: 0,
    },
    summary: {
      candidatePackets: candidatePackets.length,
      processedInputPackets: processedInputPackets.length,
      activeBlockers: blockerPackets.length,
      supersededBlockers: supersededBlockers.length,
      observeOnlyFiles: observeOnlyFiles.length,
      parseErrors: parseErrors.length,
      recommendation,
    },
    firstMove,
    candidatePackets,
    processedInputPackets,
    blockerPackets,
    supersededBlockers,
    parseErrors,
    observeOnlyFiles: observeOnlyFiles.slice(0, 40),
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
      externalMutationProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      scoreMutationProhibited: true,
      allowedLocalWrites: [
        'Write this inbox report when the CLI --out or --markdown-out flag is used.',
      ],
      prohibitedActions: [
        'Do not open Instagram, Gmail, MailerLite, Google Drive, Contacts, Shopify, WhatsApp, or ManyChat from this command.',
        'Do not send messages or perform social actions.',
        'Do not mutate CRM cards, Fact Store, source ledgers, score ledgers, or external systems.',
        'Do not read, print, refresh, rotate, or mutate credentials.',
      ],
    },
  };
};

export const scanCrmVNextSignalPacketInboxFiles = async ({
  reportsDir,
} = {}) => {
  const dir = resolve(reportsDir ?? process.env.CRM_VNEXT_MANTIS_REPORTS_DIR ?? `${process.env.HOME}/Documents/Mantis-Reports`);
  const names = await readdir(dir);
  const jsonNames = names.filter((name) => extname(name).toLowerCase() === '.json');
  return Promise.all(jsonNames.map(async (name) => {
    const absolutePath = join(dir, name);
    const fileStat = await stat(absolutePath);
    try {
      return {
        path: absolutePath,
        fileName: name,
        modifiedAt: fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
        payload: JSON.parse(await readFile(absolutePath, 'utf8')),
      };
    } catch (error) {
      return {
        path: absolutePath,
        fileName: name,
        modifiedAt: fileStat.mtime.toISOString(),
        sizeBytes: fileStat.size,
        parseError: cleanString(error.message) ?? 'json_parse_error',
      };
    }
  }));
};

export const buildCrmVNextSignalPacketInboxFromReportsDir = async (input = {}) => {
  const files = await scanCrmVNextSignalPacketInboxFiles({ reportsDir: input.reportsDir });
  return buildCrmVNextSignalPacketInbox({
    ...input,
    files,
    reportsDirLabel: input.reportsDirLabel ?? DEFAULT_REPORTS_DIR_LABEL,
  });
};

export const renderCrmVNextSignalPacketInboxMarkdown = (report) => {
  const lines = [
    '# CRM vNext Signal Packet Inbox',
    '',
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    `Recommendation: ${report.summary.recommendation}`,
    '',
    '## Summary',
    '',
    `- Files scanned: ${report.scan.filesScanned}`,
    `- Candidate packets: ${report.summary.candidatePackets}`,
    `- Already processed inputs: ${report.summary.processedInputPackets}`,
    `- Active blockers: ${report.summary.activeBlockers}`,
    `- Observe-only files: ${report.summary.observeOnlyFiles}`,
    '',
    '## First Move',
    '',
    `- Action: ${report.firstMove.action}`,
    `- Reason: ${report.firstMove.reason}`,
  ];
  if (report.firstMove.command) lines.push(`- Command: \`${report.firstMove.command}\``);

  if (report.candidatePackets.length) {
    lines.push('', '## Candidate Packets', '');
    for (const packet of report.candidatePackets.slice(0, 12)) {
      lines.push(
        `- ${packet.fileName} — ${packet.packetKind}`,
        `  - Command: \`${packet.recommendedCommand}\``,
      );
    }
  }

  if (report.blockerPackets.length) {
    lines.push('', '## Active Blockers', '');
    for (const blocker of report.blockerPackets.slice(0, 12)) {
      lines.push(`- ${blocker.fileName} — ${blocker.lanes.join(', ')} — ${blocker.reasons.join('; ')}`);
    }
  }

  if (report.processedInputPackets.length) {
    lines.push('', '## Already Processed Inputs', '');
    for (const packet of report.processedInputPackets.slice(0, 12)) {
      lines.push(`- ${packet.fileName} — processed by ${packet.processorFileName}`);
    }
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- Read-only local scan.',
    '- No live source calls.',
    '- No outbound messages.',
    '- No CRM card, Fact Store, source, credential, or score mutations.',
    '',
  );
  return `${lines.join('\n')}`;
};
