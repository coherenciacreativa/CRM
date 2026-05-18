#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-mantis-batch-audit-2026-05-18';

const usage = `Usage:
  node scripts/crm-vnext-mantis-batch-audit.mjs --expected-prompt-file <path> --report-file <path> [options]

Options:
  --expected-prompt-file <path>  CRM vNext batch prompt JSON with expected contacts
  --report-file <path>           Mantis evidence-hunt JSON report to audit
  --out <path>                   Write audit JSON
  --markdown-out <path>          Write compact Markdown audit
  --fail-on-partial              Exit non-zero when the report is partial or blocked
  --help                         Show this help

This command is read-only. It audits whether a Mantis batch report covered the expected contacts,
turns auth/source blockers into actionable retry guidance, and generates a copy-ready retry prompt.
It never mutates cards, writes Fact Store, calls live APIs, reads credentials, or sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    expectedPromptFile: null,
    reportFile: null,
    out: null,
    markdownOut: null,
    failOnPartial: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-partial') options.failOnPartial = true;
    else if (arg === '--expected-prompt-file') options.expectedPromptFile = argv[++index];
    else if (arg === '--report-file') options.reportFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.expectedPromptFile) throw new Error('expected_prompt_file_required');
  if (!options.help && !options.reportFile) throw new Error('report_file_required');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
};

const normalizeText = (value) =>
  cleanString(value)
    ?.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim() ?? null;

const normalizeHandle = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  const handle = raw
    .replace(/^ig:/i, '')
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle)) return null;
  return handle;
};

const normalizeEmail = (value) =>
  cleanString(value)?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const tokenVariants = (value) => {
  const raw = cleanString(value);
  if (!raw) return [];
  const normalized = normalizeText(raw);
  const email = normalizeEmail(raw);
  const handle = normalizeHandle(raw);
  const variants = [normalized, email];
  if (handle) variants.push(handle, `@${handle}`, `ig:${handle}`);
  return unique(variants);
};

const flattenValues = (value, depth = 0) => {
  if (depth > 4 || value === null || value === undefined) return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    const cleaned = cleanString(value);
    return cleaned ? [cleaned] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => flattenValues(item, depth + 1));
  if (typeof value === 'object') return Object.values(value).flatMap((item) => flattenValues(item, depth + 1));
  return [];
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const expectedContactsFrom = (prompt) => {
  const contacts = Array.isArray(prompt?.contacts) ? prompt.contacts : [];
  return contacts.map((contact, index) => {
    const personId = cleanString(contact?.personId) ?? `expected-contact-${index + 1}`;
    const anchors = unique([
      personId,
      cleanString(contact?.subject),
      ...(Array.isArray(contact?.inputAnchors) ? contact.inputAnchors.map(cleanString) : []),
      cleanString(contact?.known?.email),
      cleanString(contact?.known?.phone),
      cleanString(contact?.known?.instagramHandle)
        ? `@${cleanString(contact.known.instagramHandle)}`
        : null,
    ]);
    return {
      personId,
      subject: cleanString(contact?.subject) ?? personId,
      inputAnchors: anchors,
      missingFields: Array.isArray(contact?.missingFields)
        ? contact.missingFields.map(cleanString).filter(Boolean)
        : [],
      tokens: new Set(anchors.flatMap(tokenVariants)),
    };
  });
};

const reportContactEntries = (report) => {
  if (Array.isArray(report?.contacts)) {
    return report.contacts.map((contact, index) => [`reported-contact-${index + 1}`, contact]);
  }
  if (report?.contacts && typeof report.contacts === 'object') {
    return Object.entries(report.contacts);
  }
  return [];
};

const tokensFromReportContact = (key, contact) => {
  const focusedValues = [
    key,
    contact?.personId,
    contact?.subject,
    contact?.displayName,
    contact?.handle,
    contact?.email,
    ...(Array.isArray(contact?.inputAnchors) ? contact.inputAnchors : []),
    ...flattenValues(contact?.resolvedAnchors),
    ...flattenValues(contact?.knownFieldsBeforeHunt),
  ];
  return new Set(focusedValues.flatMap(tokenVariants));
};

const reportedContactsFrom = (report) =>
  reportContactEntries(report).map(([key, contact]) => ({
    reportKey: cleanString(key) ?? 'unknown',
    tokens: tokensFromReportContact(key, contact),
    raw: contact,
  }));

const intersects = (left, right) => {
  for (const value of left) {
    if (right.has(value)) return true;
  }
  return false;
};

const coverageFor = (expectedContacts, reportedContacts) =>
  expectedContacts.map((expected) => {
    const matches = reportedContacts.filter((reported) => intersects(expected.tokens, reported.tokens));
    return {
      personId: expected.personId,
      subject: expected.subject,
      inputAnchors: expected.inputAnchors,
      missingFields: expected.missingFields,
      status: matches.length ? 'processed' : 'missing_from_report',
      matchedReportKeys: matches.map((match) => match.reportKey),
    };
  });

const statusKind = (status) => {
  const text = normalizeText(status) ?? '';
  if (/(blocked|not_accessible|timeout|timed_out|failed|error|unauth|invalid|no_auth)/.test(text)) return 'blocked';
  if (/(partial|no_exact|checked_no|discarded|review)/.test(text)) return 'partial';
  if (/(hit|ok|found|checked)/.test(text)) return 'hit';
  return 'unknown';
};

const blockerCategoryFor = (blocker) => {
  const text = normalizeText(`${blocker.source} ${blocker.exactBlocker} ${blocker.impact}`) ?? '';
  if (/instagram.*messages|messages ui|relay|chrome|browser/.test(text)) return 'instagram_messages_ui';
  if (/mailerlite|mailer/.test(text)) return 'mailerlite';
  if (/manychat/.test(text)) return 'manychat';
  if (/google|gmail|drive|contacts|gog|oauth|invalid_grant/.test(text)) return 'google_workspace';
  if (/vercel/.test(text)) return 'vercel_historical_logs';
  return normalizeText(blocker.source) ?? 'unknown_source';
};

const mergeBlocker = (existing, incoming) => {
  if (!existing) return incoming;
  const incomingHasExact = Boolean(incoming.exactBlocker && incoming.exactBlocker !== incoming.impact);
  const existingHasExact = Boolean(existing.exactBlocker && existing.exactBlocker !== existing.impact);
  return {
    ...existing,
    source: incomingHasExact && !/^live_|^local_|^google_workspace_gog_/i.test(incoming.source)
      ? incoming.source
      : existing.source,
    status: existing.status ?? incoming.status,
    exactBlocker: incomingHasExact || !existingHasExact
      ? (incoming.exactBlocker ?? existing.exactBlocker)
      : existing.exactBlocker,
    impact: incoming.impact ?? existing.impact,
  };
};

const blockedSourcesFrom = (report) => {
  const fromSources = (Array.isArray(report?.sourcesConsulted) ? report.sourcesConsulted : [])
    .filter((source) => statusKind(source?.status) === 'blocked')
    .map((source) => ({
      source: cleanString(source?.source) ?? 'unknown_source',
      status: cleanString(source?.status),
      exactBlocker: cleanString(source?.exactBlocker ?? source?.resultSummary),
      impact: cleanString(source?.impact ?? source?.query),
    }));

  const fromBlockers = (Array.isArray(report?.blockers) ? report.blockers : [])
    .map((blocker) => ({
      source: cleanString(blocker?.source) ?? 'unknown_source',
      status: 'blocked',
      exactBlocker: cleanString(blocker?.exactBlocker ?? blocker?.blocker ?? blocker?.resultSummary),
      impact: cleanString(blocker?.impact),
    }));

  const byKey = new Map();
  for (const blocker of [...fromSources, ...fromBlockers]) {
    const key = blockerCategoryFor(blocker);
    byKey.set(key, {
      sourceCategory: key,
      ...mergeBlocker(byKey.get(key), blocker),
    });
  }
  return [...byKey.values()];
};

const unblockActionFor = (blocker) => {
  const text = normalizeText(`${blocker.source} ${blocker.exactBlocker} ${blocker.impact}`) ?? '';
  if (/instagram.*messages|messages ui|relay|chrome|browser/.test(text)) {
    return 'Pedir a Alejandro que deje abierta/activa una sesion ya autenticada de Instagram en Chrome o Relay y confirmar "listo, reintenta"; no iniciar login ni permisos por cuenta propia.';
  }
  if (/mailerlite|mailer/.test(text)) {
    return 'Renovar o seleccionar una credencial MailerLite valida en el mecanismo seguro local; no pegar tokens en chat. Si no se desbloquea, usar snapshots/local bridge y marcar MailerLite live como pendiente.';
  }
  if (/manychat/.test(text)) {
    return 'Renovar el token/canal seguro de ManyChat antes de leer inbound/subscriber metadata; no tocar ManyChat LIVE ni automatizaciones.';
  }
  if (/google|gmail|drive|contacts|gog|oauth|invalid_grant/.test(text)) {
    return 'Reautorizar gog/Google Workspace para Gmail, Drive y Contacts con scopes read-only; no imprimir ni rotar credenciales en el reporte.';
  }
  if (/vercel.*historical|vercel logs/.test(text)) {
    return 'No tratar Vercel logs historicos como fuente confiable; buscar exports/local lead-capture/webhook logs o usar MailerLite/ManyChat/IG UI como alternativa.';
  }
  return 'Mantener el blocker visible, preservar anchors/search terms y pedir retry especifico cuando la fuente este disponible.';
};

const sourceStatusSummary = (report) => {
  const sources = Array.isArray(report?.sourcesConsulted) ? report.sourcesConsulted : [];
  const byStatus = {};
  for (const source of sources) {
    const kind = statusKind(source?.status);
    byStatus[kind] = (byStatus[kind] ?? 0) + 1;
  }
  return {
    totalSourcesConsulted: sources.length,
    byStatus,
  };
};

const runStatusFor = ({ expectedCount, processedCount, blockedCount }) => {
  if (expectedCount === 0) return 'no_expected_contacts';
  if (processedCount === 0) return 'blocked_run';
  if (processedCount < expectedCount) return 'partial_run';
  if (blockedCount > 0) return 'complete_with_source_blockers';
  return 'complete';
};

const retryPromptFor = ({ audit, expectedContacts }) => {
  const missing = audit.coverage.filter((item) => item.status === 'missing_from_report');
  const processed = audit.coverage.filter((item) => item.status === 'processed');
  const contactLines = (missing.length ? missing : audit.coverage).map((contact, index) => [
    `${index + 1}. ${contact.subject}`,
    `   - personId: ${contact.personId}`,
    `   - anchors: ${contact.inputAnchors.join(' | ')}`,
    `   - faltantes originales: ${contact.missingFields.join(', ') || 'sin faltantes listados'}`,
  ].join('\n')).join('\n\n');
  const processedLines = processed.length
    ? processed.map((contact) => `- ${contact.subject}: ya tuvo corrida parcial; reabrir solo si se desbloquean fuentes relevantes.`).join('\n')
    : '- Ninguno.';
  const blockerLines = audit.actionableBlockers.length
    ? audit.actionableBlockers.map((blocker) => [
        `- ${blocker.source}: ${blocker.exactBlocker ?? blocker.status ?? 'blocked'}`,
        `  Accion: ${blocker.unblockAction}`,
      ].join('\n')).join('\n')
    : '- Ninguno.';

  return [
    `Mantis, esto es un retry de batch CRM vNext porque la corrida anterior quedo ${audit.summary.runStatus}.`,
    '',
    `Cobertura anterior: procesaste ${audit.summary.processedExpectedContacts}/${audit.summary.expectedContacts} contactos esperados.`,
    '',
    'Reintenta en modo read-only estricto. Cero CRM writes, cero Fact Store, cero ManyChat LIVE, cero outbound, cero mutaciones en MailerLite/Gmail/Drive/Contacts/Instagram, cero credenciales impresas.',
    '',
    'Contactos que faltan por procesar:',
    '',
    contactLines,
    '',
    'Contactos ya procesados en la corrida parcial:',
    '',
    processedLines,
    '',
    'Blockers que debes preservar y escalar de forma accionable si siguen presentes:',
    '',
    blockerLines,
    '',
    'Reglas para cerrar el retry:',
    `- No cierres como batch terminado hasta reportar los ${expectedContacts.length} contactos esperados o explicar por contacto por que no se pudo procesar.`,
    '- Si Instagram Messages UI, MailerLite, ManyChat o gog estan bloqueados, pide el unblock exacto y conserva anchors/search terms.',
    '- Entrega un unico JSON contact-keyed en ~/Documents/Mantis-Reports con schemaVersion mantis.crm_vnext.evidence_hunt.v1, sourcesConsulted por contacto, blockers exactos, strongMatches, weakMatches, discardedCandidates, resolvedAnchors y recommendation.',
  ].join('\n');
};

const markdownFor = (audit) => {
  const lines = [
    '# CRM vNext Mantis Batch Audit',
    '',
    `Generated: ${audit.generatedAt}`,
    `Run status: ${audit.summary.runStatus}`,
    '',
    '## Coverage',
    '',
    `- Expected contacts: ${audit.summary.expectedContacts}`,
    `- Processed expected contacts: ${audit.summary.processedExpectedContacts}`,
    `- Missing expected contacts: ${audit.summary.missingExpectedContacts}`,
    `- Blocked sources: ${audit.summary.blockedSources}`,
    '',
  ];
  for (const item of audit.coverage) {
    lines.push(`- ${item.status === 'processed' ? '[ok]' : '[missing]'} ${item.subject} (${item.personId})`);
  }
  lines.push('', '## Actionable Blockers', '');
  if (!audit.actionableBlockers.length) lines.push('- None.');
  for (const blocker of audit.actionableBlockers) {
    lines.push(`- ${blocker.source}: ${blocker.exactBlocker ?? blocker.status ?? 'blocked'}`);
    lines.push(`  - Action: ${blocker.unblockAction}`);
  }
  lines.push('', '## Copy-Ready Retry Prompt', '', '```text', audit.retryPrompt, '```', '', '## Safety', '');
  lines.push('- Read-only audit.');
  lines.push('- No card writes.');
  lines.push('- No Fact Store writes.');
  lines.push('- No outbound or live API calls.');
  return `${lines.join('\n')}\n`;
};

const buildAudit = ({ prompt, report, expectedPromptFile, reportFile }) => {
  const expectedContacts = expectedContactsFrom(prompt);
  const reportedContacts = reportedContactsFrom(report);
  const coverage = coverageFor(expectedContacts, reportedContacts);
  const processedExpectedContacts = coverage.filter((item) => item.status === 'processed').length;
  const blockedSources = blockedSourcesFrom(report);
  const actionableBlockers = blockedSources.map((blocker) => ({
    ...blocker,
    unblockAction: unblockActionFor(blocker),
  }));
  const runStatus = runStatusFor({
    expectedCount: expectedContacts.length,
    processedCount: processedExpectedContacts,
    blockedCount: actionableBlockers.length,
  });
  const processedReportKeys = new Set(coverage.flatMap((item) => item.matchedReportKeys));
  const unexpectedReportedContacts = reportedContacts
    .filter((contact) => !processedReportKeys.has(contact.reportKey))
    .map((contact) => contact.reportKey);
  const reportSourceSummary = sourceStatusSummary(report);
  const audit = {
    schemaVersion: SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    mode: 'read_only_mantis_batch_audit',
    source: {
      expectedPromptFile: resolve(expectedPromptFile),
      reportFile: resolve(reportFile),
      expectedPromptSchemaVersion: cleanString(prompt?.schemaVersion),
      reportSchemaVersion: cleanString(report?.schemaVersion),
    },
    summary: {
      runStatus,
      expectedContacts: expectedContacts.length,
      reportedContacts: reportedContacts.length,
      processedExpectedContacts,
      missingExpectedContacts: coverage.length - processedExpectedContacts,
      unexpectedReportedContacts: unexpectedReportedContacts.length,
      blockedSources: actionableBlockers.length,
      totalSourcesConsulted: reportSourceSummary.totalSourcesConsulted,
      sourceStatusCounts: reportSourceSummary.byStatus,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    coverage,
    unexpectedReportedContacts,
    actionableBlockers,
    recommendation: runStatus === 'complete'
      ? 'Proceed with the normal import/review loop.'
      : 'Treat this as a partial or blocked run; rerun the missing contacts and preserve exact blockers before importing as a completed batch.',
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      liveApiCallsProhibited: true,
      credentialReadProhibited: true,
      manyChatLiveMutationProhibited: true,
      instagramPermissionMutationProhibited: true,
    },
  };
  return {
    ...audit,
    retryPrompt: retryPromptFor({ audit, expectedContacts }),
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const prompt = await readJson(options.expectedPromptFile);
  const report = await readJson(options.reportFile);
  const audit = buildAudit({
    prompt,
    report,
    expectedPromptFile: options.expectedPromptFile,
    reportFile: options.reportFile,
  });

  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(audit, null, 2)}\n`, 'utf8');
  }
  if (options.markdownOut) {
    const outPath = resolve(options.markdownOut);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, markdownFor(audit), 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    mode: audit.mode,
    generatedAt: audit.generatedAt,
    summary: audit.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    missingContacts: audit.coverage
      .filter((item) => item.status === 'missing_from_report')
      .map((item) => ({ personId: item.personId, subject: item.subject })),
    safety: audit.safety,
  }, null, 2));

  if (
    options.failOnPartial
    && ['partial_run', 'blocked_run', 'complete_with_source_blockers'].includes(audit.summary.runStatus)
  ) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext mantis batch audit failed: ${error.message}`);
  process.exitCode = 1;
});
