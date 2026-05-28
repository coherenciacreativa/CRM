#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-missing-inputs-intake-2026-05-28';

const DEFAULT_MISSING_INPUTS_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_OPERATOR_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_CRM_WRITE_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_write_approval_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_PRIVATE_SEED_EMAIL_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/private/mailerlite_seed_recipient_inteligencia_descansar.txt';
const DEFAULT_OBSERVED_EVENTS_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/private/mailerlite_mini_launch_observed_events_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs [options]

Options:
  --missing-inputs-kit <path>       Missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --operator-runbook <path>         Operator runbook JSON. Defaults to ${DEFAULT_OPERATOR_RUNBOOK}
  --crm-write-approval-packet <path> CRM write approval packet JSON. Defaults to ${DEFAULT_CRM_WRITE_APPROVAL_PACKET}
  --seed-email-file <path>          Private seed email file. Defaults to ${DEFAULT_PRIVATE_SEED_EMAIL_FILE}
  --observed-events-file <path>     Private observed events JSON. Defaults to ${DEFAULT_OBSERVED_EVENTS_FILE}
  --out <path>                      Write JSON intake report
  --markdown-out <path>             Write Markdown intake report
  --help                            Show this help

Local-only missing-inputs intake validator for MailerLite Launch OS v0. It
checks whether private/local inputs exist and are shaped well enough for later
packet regeneration, while redacting exact identities. It creates no private
input files, asks for no approval, opens no UI, calls no APIs, reads no
subscribers, mutates no groups/workflows/cards, sends no emails, appends no
ledgers, changes no scoring and writes nothing to Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    missingInputsKit: DEFAULT_MISSING_INPUTS_KIT,
    operatorRunbook: DEFAULT_OPERATOR_RUNBOOK,
    crmWriteApprovalPacket: DEFAULT_CRM_WRITE_APPROVAL_PACKET,
    seedEmailFile: DEFAULT_PRIVATE_SEED_EMAIL_FILE,
    observedEventsFile: DEFAULT_OBSERVED_EVENTS_FILE,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--missing-inputs-kit') options.missingInputsKit = argv[++index];
    else if (arg === '--operator-runbook') options.operatorRunbook = argv[++index];
    else if (arg === '--crm-write-approval-packet') options.crmWriteApprovalPacket = argv[++index];
    else if (arg === '--seed-email-file') options.seedEmailFile = argv[++index];
    else if (arg === '--observed-events-file') options.observedEventsFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned || null;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const readOptionalText = async (path) => {
  try {
    return { present: true, content: await readText(path), error: null };
  } catch (error) {
    if (error.code === 'ENOENT') return { present: false, content: null, error: null };
    return { present: false, content: null, error: error.message };
  }
};

const readOptionalJson = async (path) => {
  const read = await readOptionalText(path);
  if (!read.present) return { present: false, value: null, error: read.error, chars: 0 };
  try {
    return {
      present: true,
      value: JSON.parse(read.content),
      error: null,
      chars: read.content.length,
    };
  } catch (error) {
    return {
      present: true,
      value: null,
      error: `invalid_json:${error.message}`,
      chars: read.content.length,
    };
  }
};

const publicDigest = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    private: false,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const privateSourceStatus = ({ path, read, consultedFor }) => ({
  path: resolve(path),
  present: read.present,
  private: true,
  chars: read.chars ?? (read.content?.length ?? 0),
  sha256: null,
  consultedFor,
  error: read.error ?? null,
});

const normalizeEmail = (value) => cleanString(value)?.toLowerCase() ?? null;

const emailLooksValid = (email) =>
  typeof email === 'string'
  && email.length <= 254
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  && !/[<>"'`;\\]/.test(email);

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized || !normalized.includes('@')) return null;
  const [local, domain] = normalized.split('@');
  const [domainRoot, ...rest] = domain.split('.');
  const localPrefix = local.length <= 2 ? local.slice(0, 1) : local.slice(0, 2);
  const domainPrefix = domainRoot?.slice(0, 1) ?? '*';
  const suffix = rest.length > 0 ? `.${rest.at(-1)}` : '';
  return `${localPrefix}...@${domainPrefix}...${suffix}`;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const buildSeedState = ({ path, read }) => {
  const raw = read.present ? cleanString(read.content) : null;
  const normalized = normalizeEmail(raw);
  const candidateCount = raw ? raw.split(/[,\s]+/).filter(Boolean).length : 0;
  const valid = Boolean(normalized) && candidateCount === 1 && emailLooksValid(normalized);
  const blockers = [
    ...(read.present ? [] : ['seed_email_file_missing']),
    ...(read.error ? [`seed_email_file_read_error:${read.error}`] : []),
    ...(read.present && !raw ? ['seed_email_file_empty'] : []),
    ...(read.present && candidateCount > 1 ? ['seed_email_file_must_contain_one_email_only'] : []),
    ...(raw && !emailLooksValid(normalized) ? ['seed_email_invalid_or_unsafe'] : []),
  ];

  return {
    id: 'exact_seed_recipient',
    status: valid
      ? 'ready_redacted_no_live_changes'
      : read.present
        ? 'present_invalid_no_live_changes'
        : 'missing_no_live_changes',
    present: read.present,
    valid,
    path,
    redactedEmail: valid ? redactEmail(normalized) : null,
    sha256: valid ? sha256(normalized) : null,
    exactValueStoredInReport: false,
    candidateCount,
    blockers,
    nextLocalCommandAllowed: valid,
  };
};

const observedEventsFrom = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.sampleSignalEvents)) return payload.sampleSignalEvents;
  if (Array.isArray(payload.signals)) return payload.signals;
  return [];
};

const eventLaunchId = (event) =>
  cleanString(event?.launchId)
  ?? cleanString(event?.metrics?.launchId)
  ?? cleanString(event?.evidence?.launchId);

const identityForEvent = (event) => {
  const email = normalizeEmail(event?.email ?? event?.subject?.email);
  const instagramHandle = cleanString(event?.instagramHandle ?? event?.subject?.instagramHandle)?.replace(/^@/, '');
  const personId = cleanString(event?.personId ?? event?.subject?.personId);
  const kind = personId ? 'personId' : email ? 'email' : instagramHandle ? 'instagramHandle' : null;
  const value = personId ?? email ?? instagramHandle ?? null;
  return { kind, value };
};

const isSampleIdentity = (identity) =>
  !identity.value
  || identity.value === 'sample@example.invalid'
  || identity.value.endsWith?.('.invalid')
  || identity.value === 'sample_handle'
  || identity.value === 'sample_person';

const requiredEventFields = ['eventKind', 'sourceKind', 'channel', 'sourceId', 'observedAt'];

const eventIssues = (event, launchId) => {
  const identity = identityForEvent(event);
  return [
    ...requiredEventFields
      .filter((field) => !cleanString(event?.[field]))
      .map((field) => `missing_${field}`),
    ...(eventLaunchId(event) === launchId ? [] : ['launch_id_mismatch_or_missing']),
    ...(identity.value ? [] : ['exact_identity_missing']),
    ...(isSampleIdentity(identity) ? ['sample_or_placeholder_identity'] : []),
  ];
};

const summarizeObservedEvents = ({ payload, launchId }) => {
  const events = observedEventsFrom(payload);
  const eventSummaries = events.map((event, index) => {
    const identity = identityForEvent(event);
    const issues = eventIssues(event, launchId);
    return {
      index,
      writable: issues.length === 0,
      eventKind: cleanString(event?.eventKind),
      sourceKind: cleanString(event?.sourceKind),
      channel: cleanString(event?.channel),
      launchIdMatches: eventLaunchId(event) === launchId,
      identityKind: identity.kind,
      identitySha256: identity.value ? sha256(`${identity.kind}:${identity.value}`) : null,
      exactIdentityStoredInReport: false,
      issues,
    };
  });
  const writable = eventSummaries.filter((event) => event.writable);
  const identityHashes = [...new Set(writable.map((event) => event.identitySha256).filter(Boolean))];
  const identityKinds = writable.reduce((counts, event) => {
    if (event.identityKind) counts[event.identityKind] = (counts[event.identityKind] ?? 0) + 1;
    return counts;
  }, {});

  return {
    eventCount: events.length,
    writableCount: writable.length,
    rejectedCount: eventSummaries.length - writable.length,
    exactPersonCount: identityHashes.length,
    identityKinds,
    identityHashes,
    eventKinds: [...new Set(writable.map((event) => event.eventKind).filter(Boolean))],
    allWritable: events.length > 0 && eventSummaries.every((event) => event.writable),
    fullIdentitiesStoredInReport: false,
    events: eventSummaries,
  };
};

const factReviewFrom = (payload) =>
  payload?.factStoreMarketReview
  ?? payload?.aggregateMarketReview
  ?? payload?.marketReview
  ?? null;

const summarizeFactReview = (payload) => {
  const review = factReviewFrom(payload);
  const facts = review?.facts ?? review?.exactFacts ?? review?.factStoreFacts ?? [];
  const supplied = Boolean(review);
  const reviewed = review?.reviewed === true
    || cleanString(review?.status)?.includes('reviewed')
    || Boolean(cleanString(review?.reviewedBy));
  const validFactCount = Array.isArray(facts)
    ? facts.filter((fact) => cleanString(fact?.summary ?? fact?.fact ?? fact?.statement)).length
    : 0;
  return {
    supplied,
    reviewed,
    validFactCount,
    ready: supplied && reviewed && validFactCount > 0,
    requiredOnlyForFactStoreWrite: true,
    exactFactsStoredInReport: false,
  };
};

const buildObservedState = ({ path, read, launchId }) => {
  const summary = read.present && read.value
    ? summarizeObservedEvents({ payload: read.value, launchId })
    : summarizeObservedEvents({ payload: null, launchId });
  const factReview = read.present && read.value
    ? summarizeFactReview(read.value)
    : summarizeFactReview(null);
  const parsed = read.present && !read.error && Boolean(read.value);
  const fileBlockers = [
    ...(read.present ? [] : ['observed_events_file_missing']),
    ...(read.error ? [read.error] : []),
    ...(parsed && summary.eventCount === 0 ? ['observed_events_empty'] : []),
  ];

  return {
    file: {
      path,
      present: read.present,
      parsed,
      chars: read.chars ?? 0,
      exactPayloadStoredInReport: false,
      blockers: fileBlockers,
    },
    observedEvents: summary,
    factReview,
  };
};

const stateFromInputs = ({ kit, seedState, observedState }) => {
  const byId = new Map((kit?.inputRequests ?? []).map((input) => [input.id, input]));
  const eventFileReady = observedState.file.present && observedState.file.parsed && observedState.observedEvents.eventCount > 0;
  const exactPeopleReady = observedState.observedEvents.exactPersonCount > 0;
  const writableReady = observedState.observedEvents.allWritable;
  const factReady = observedState.factReview.ready;
  const states = [
    {
      id: 'exact_seed_recipient',
      gateId: byId.get('exact_seed_recipient')?.gateId ?? 'mini_launch_seed_send',
      status: seedState.valid ? 'ready_redacted_no_live_changes' : seedState.status,
      readyForPacketRegeneration: seedState.valid,
      approvalEffect: byId.get('exact_seed_recipient')?.approvalEffect ?? 'does_not_approve_send_or_execution',
      blockers: seedState.blockers,
    },
    {
      id: 'real_observed_events_file',
      gateId: byId.get('real_observed_events_file')?.gateId ?? 'crm_signal_writes',
      status: eventFileReady ? 'ready_redacted_no_live_changes' : observedState.file.present ? 'present_invalid_or_empty_no_live_changes' : 'missing_no_live_changes',
      readyForPacketRegeneration: observedState.file.present && observedState.file.parsed,
      approvalEffect: byId.get('real_observed_events_file')?.approvalEffect ?? 'does_not_approve_crm_writes',
      blockers: observedState.file.blockers,
    },
    {
      id: 'exact_people',
      gateId: byId.get('exact_people')?.gateId ?? 'crm_signal_writes',
      status: exactPeopleReady ? 'ready_redacted_no_live_changes' : 'missing_no_live_changes',
      readyForPacketRegeneration: exactPeopleReady,
      approvalEffect: byId.get('exact_people')?.approvalEffect ?? 'does_not_approve_crm_writes',
      blockers: exactPeopleReady ? [] : ['exact_people_missing_from_observed_events'],
    },
    {
      id: 'writable_event_screen',
      gateId: byId.get('writable_event_screen')?.gateId ?? 'crm_signal_writes',
      status: writableReady
        ? 'ready_no_live_changes'
        : observedState.file.present
          ? 'present_invalid_or_empty_no_live_changes'
          : 'missing_no_live_changes',
      readyForPacketRegeneration: writableReady,
      approvalEffect: byId.get('writable_event_screen')?.approvalEffect ?? 'does_not_approve_crm_writes',
      blockers: writableReady ? [] : ['writable_event_screen_not_green'],
    },
    {
      id: 'fact_store_market_review',
      gateId: byId.get('fact_store_market_review')?.gateId ?? 'crm_signal_writes',
      status: factReady ? 'ready_redacted_no_live_changes' : observedState.factReview.supplied ? 'present_invalid_no_live_changes' : 'missing_no_live_changes',
      readyForPacketRegeneration: factReady,
      approvalEffect: byId.get('fact_store_market_review')?.approvalEffect ?? 'does_not_approve_fact_store_write',
      requiredOnlyForFactStoreWrite: true,
      blockers: factReady ? [] : ['fact_store_market_review_missing_or_not_reviewed'],
    },
  ];
  return states;
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  createsPrivateFiles: false,
  asksApproval: false,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  tokensPrinted: false,
  exactPrivateValuesPrinted: false,
});

const buildMissingInputsIntake = ({
  missingInputsKit,
  operatorRunbook,
  crmWriteApprovalPacket,
  seedEmailRead,
  seedEmailFile,
  observedEventsRead,
  observedEventsFile,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const launch = crmWriteApprovalPacket?.launch
    ?? operatorRunbook?.currentState?.miniLaunch?.currentPilot
    ?? null;
  const launchId = launch?.launchId ?? null;
  const seedState = buildSeedState({ path: seedEmailFile, read: seedEmailRead });
  const observedState = buildObservedState({ path: observedEventsFile, read: observedEventsRead, launchId });
  const inputStates = stateFromInputs({ kit: missingInputsKit, seedState, observedState });
  const readyInputCount = inputStates.filter((state) => state.status.startsWith('ready')).length;
  const presentInputCount = inputStates.filter((state) =>
    !['missing_no_live_changes', 'not_ready_no_live_changes'].includes(state.status)).length;
  const readyForSeedApprovalPacket = seedState.valid;
  const readyForCrmWritePacketRegeneration = observedState.file.present && observedState.file.parsed;
  const readyForCrmApprovalRequest = ['real_observed_events_file', 'exact_people', 'writable_event_screen']
    .every((id) => inputStates.find((state) => state.id === id)?.status.startsWith('ready'));
  const blockerIds = inputStates
    .filter((state) => !state.status.startsWith('ready'))
    .map((state) => state.id);
  const status = readyInputCount === inputStates.length
    ? 'missing_inputs_intake_all_inputs_ready_no_live_changes'
    : presentInputCount > 0
      ? 'missing_inputs_intake_partial_no_live_changes'
      : 'missing_inputs_intake_waiting_for_inputs_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_missing_inputs_intake',
    generatedAt,
    ok: true,
    status,
    launch,
    executiveSummary: {
      inputCount: inputStates.length,
      presentInputCount,
      readyInputCount,
      blockerIds,
      readyForSeedApprovalPacket,
      readyForCrmWritePacketRegeneration,
      readyForCrmApprovalRequest,
      factStoreReviewReady: observedState.factReview.ready,
      fullPrivateValuesStoredInReport: false,
      canAskApprovalNow: false,
      openLiveMutationGateCount: 0,
      nextSafeAction: readyForSeedApprovalPacket || readyForCrmWritePacketRegeneration
        ? 'regenerate_relevant_packet_without_execution_or_approval'
        : 'collect_missing_inputs_without_approval_or_execution',
    },
    inputStates,
    seedRecipient: seedState,
    observedEvents: observedState.observedEvents,
    factStoreMarketReview: observedState.factReview,
    postInputCommands: {
      seedApprovalPacket: readyForSeedApprovalPacket
        ? missingInputsKit?.inputRequests?.find((input) => input.id === 'exact_seed_recipient')?.nextLocalCommandAfterInput ?? null
        : null,
      crmWriteApprovalPacket: readyForCrmWritePacketRegeneration
        ? missingInputsKit?.inputRequests?.find((input) => input.id === 'real_observed_events_file')?.nextLocalCommandAfterInput ?? null
        : null,
    },
    hardStops: [
      'This intake report is not approval.',
      'Presence of private inputs does not authorize sends or writes.',
      'Full seed email, exact people and exact facts are not printed in this report.',
      'Do not touch live MailerLite, Shopify, CRM, subscribers, workflows, sends, ledgers, cards, scoring or Fact Store from this intake.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
};

const writeJson = async (path, value) => {
  await writeText(path, `${JSON.stringify(value, null, 2)}\n`);
};

const buildMissingInputsIntakeFromFiles = async (options) => {
  const [missingInputsKit, operatorRunbook, crmWriteApprovalPacket, seedEmailRead, observedEventsRead] = await Promise.all([
    readJson(options.missingInputsKit),
    readJson(options.operatorRunbook),
    readJson(options.crmWriteApprovalPacket),
    readOptionalText(options.seedEmailFile),
    readOptionalJson(options.observedEventsFile),
  ]);
  const sourceDigests = [
    await publicDigest(options.missingInputsKit, 'missing-inputs kit and expected private input specs'),
    await publicDigest(options.operatorRunbook, 'current runbook state for active launch and gates'),
    await publicDigest(options.crmWriteApprovalPacket, 'current CRM write approval boundary and launch id'),
    privateSourceStatus({ path: options.seedEmailFile, read: seedEmailRead, consultedFor: 'private seed recipient file presence and validation only' }),
    privateSourceStatus({ path: options.observedEventsFile, read: observedEventsRead, consultedFor: 'private observed events file presence and shape validation only' }),
  ];

  return buildMissingInputsIntake({
    missingInputsKit,
    operatorRunbook,
    crmWriteApprovalPacket,
    seedEmailRead,
    seedEmailFile: options.seedEmailFile,
    observedEventsRead,
    observedEventsFile: options.observedEventsFile,
    sourceDigests,
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS Missing Inputs Intake',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    '',
    '## Summary',
    '',
    `- Inputs ready: ${report.executiveSummary.readyInputCount}/${report.executiveSummary.inputCount}`,
    `- Inputs present: ${report.executiveSummary.presentInputCount}/${report.executiveSummary.inputCount}`,
    `- Ready for seed packet regeneration: ${report.executiveSummary.readyForSeedApprovalPacket}`,
    `- Ready for CRM packet regeneration: ${report.executiveSummary.readyForCrmWritePacketRegeneration}`,
    `- Ready for CRM approval request: ${report.executiveSummary.readyForCrmApprovalRequest}`,
    `- Can ask approval now: ${report.executiveSummary.canAskApprovalNow}`,
    `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
    '',
    '## Input States',
    '',
  ];

  for (const state of report.inputStates) {
    lines.push(`- ${state.id}: ${state.status}`);
    lines.push(`  - Approval effect: ${state.approvalEffect}`);
    lines.push(`  - Blockers: ${state.blockers.join(', ') || 'none'}`);
  }

  lines.push('', '## Redaction', '');
  lines.push(`- Seed recipient redacted: ${report.seedRecipient.redactedEmail ?? 'missing'}`);
  lines.push(`- Seed exact value stored in report: ${report.seedRecipient.exactValueStoredInReport}`);
  lines.push(`- Observed exact identities stored in report: ${report.observedEvents.fullIdentitiesStoredInReport}`);
  lines.push(`- Exact facts stored in report: ${report.factStoreMarketReview.exactFactsStoredInReport}`);
  lines.push('', '## Hard Stops', '');
  lines.push(renderList(report.hardStops));
  lines.push('', '## Safety', '');
  lines.push('- Local-only report.');
  lines.push('- No private input files created.');
  lines.push('- No approval requested.');
  lines.push('- No live APIs, UI, subscribers, groups, workflows, sends, CRM writes, scoring or Fact Store writes.');
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildMissingInputsIntakeFromFiles(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    readyInputCount: report.executiveSummary.readyInputCount,
    presentInputCount: report.executiveSummary.presentInputCount,
    readyForSeedApprovalPacket: report.executiveSummary.readyForSeedApprovalPacket,
    readyForCrmWritePacketRegeneration: report.executiveSummary.readyForCrmWritePacketRegeneration,
    canAskApprovalNow: report.executiveSummary.canAskApprovalNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS missing-inputs intake failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildMissingInputsIntake,
  buildMissingInputsIntakeFromFiles,
  buildObservedState,
  buildSafety,
  buildSeedState,
  parseArgs,
  redactEmail,
  renderMarkdown,
  summarizeFactReview,
  summarizeObservedEvents,
};
