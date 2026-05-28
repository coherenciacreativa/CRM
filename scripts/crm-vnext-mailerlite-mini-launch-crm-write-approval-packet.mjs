#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-crm-write-approval-packet-2026-05-28';
const DEFAULT_SIGNAL_PROJECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_crm_signal_projection_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_GROUP_CREATE_EXECUTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_execution_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-crm-write-approval-packet.mjs [options]

Options:
  --signal-projection-packet <path>  CRM signal projection packet. Defaults to ${DEFAULT_SIGNAL_PROJECTION_PACKET}
  --event-contract <path>            Mini-launch event contract. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --manual-ui-build-receipt <path>   MailerLite manual UI build receipt. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --group-create-execution <path>    Mini-launch empty group execution receipt. Defaults to ${DEFAULT_GROUP_CREATE_EXECUTION}
  --shopify-local-build-receipt <path> Shopify no-live local build receipt. Defaults to ${DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --observed-events-file <path>      Optional real observed CRM events file for future approval readiness
  --out <path>                       Write JSON packet
  --markdown-out <path>              Write Markdown packet
  --help                             Show this help

Local-only CRM write approval packet for one MailerLite mini-launch. It converts
the no-live signal projection into an exact future approval boundary and names
what is still missing before Alejandro can approve Signal Event Ledger, card,
scoring or Fact Store writes. It never appends ledgers, writes cards, changes
scoring, writes Fact Store, calls live APIs, touches subscribers, changes
MailerLite/Shopify, sends email, or performs outbound actions.`;

const parseArgs = (argv) => {
  const options = {
    signalProjectionPacket: DEFAULT_SIGNAL_PROJECTION_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    groupCreateExecution: DEFAULT_GROUP_CREATE_EXECUTION,
    shopifyLocalBuildReceipt: DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT,
    observedEventsFile: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--signal-projection-packet') options.signalProjectionPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--manual-ui-build-receipt') options.manualUiBuildReceipt = argv[++index];
    else if (arg === '--group-create-execution') options.groupCreateExecution = argv[++index];
    else if (arg === '--shopify-local-build-receipt') options.shopifyLocalBuildReceipt = argv[++index];
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

const unique = (values) => [...new Set(values.filter(Boolean))];
const countRows = (value) => Array.isArray(value) ? value.length : 0;

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const sourceDigest = async (path, consultedFor, optional = false) => {
  const resolved = resolve(path);
  try {
    const content = await readFile(resolved, 'utf8');
    return {
      path: resolved,
      present: true,
      chars: content.length,
      consultedFor,
    };
  } catch (error) {
    if (optional && error.code === 'ENOENT') {
      return {
        path: resolved,
        present: false,
        chars: 0,
        consultedFor,
      };
    }
    throw error;
  }
};

const loadSourceDigests = async (options) => Promise.all([
  sourceDigest(options.signalProjectionPacket, 'no-live CRM signal projection packet'),
  sourceDigest(options.eventContract, 'mini-launch event contract and sample-only event shapes'),
  sourceDigest(options.manualUiBuildReceipt, 'manual UI draft build receipt proving email assets exist without sends', true),
  sourceDigest(options.groupCreateExecution, 'approved empty group creation receipt proving receipt groups exist', true),
  sourceDigest(options.shopifyLocalBuildReceipt, 'Shopify no-live local build receipt proving inert web surface exists', true),
  ...(options.observedEventsFile
    ? [sourceDigest(options.observedEventsFile, 'optional real observed events supplied for future CRM write approval')]
    : []),
]);

const launchFrom = (projectionPacket, eventContract) => ({
  launchId: projectionPacket?.launch?.launchId ?? eventContract?.launch?.launchId ?? null,
  resourceName: projectionPacket?.launch?.resourceName ?? eventContract?.launch?.resourceName ?? null,
  resourceType: projectionPacket?.launch?.resourceType ?? eventContract?.launch?.resourceType ?? null,
});

const eventLaunchId = (event) =>
  cleanString(event?.launchId)
  ?? cleanString(event?.metrics?.launchId)
  ?? cleanString(event?.evidence?.launchId);

const identityForEvent = (event) => {
  const email = cleanString(event?.email ?? event?.subject?.email);
  const instagramHandle = cleanString(event?.instagramHandle ?? event?.subject?.instagramHandle);
  const personId = cleanString(event?.personId ?? event?.subject?.personId);
  return {
    email,
    instagramHandle,
    personId,
    label: personId ?? email ?? (instagramHandle ? `@${instagramHandle.replace(/^@/, '')}` : null),
  };
};

const isSampleIdentity = (identity) =>
  !identity.label
  || identity.email?.endsWith('.invalid')
  || identity.email === 'sample@example.invalid'
  || identity.instagramHandle === 'sample_handle'
  || identity.personId === 'sample_person';

const isWritableObservedEvent = (event, launchId) => {
  const identity = identityForEvent(event);
  return cleanString(event?.eventKind)
    && cleanString(event?.sourceKind)
    && cleanString(event?.channel)
    && cleanString(event?.sourceId)
    && cleanString(event?.observedAt)
    && eventLaunchId(event) === launchId
    && !isSampleIdentity(identity);
};

const observedEventsFrom = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.events)) return payload.events;
  if (Array.isArray(payload.sampleSignalEvents)) return payload.sampleSignalEvents;
  if (Array.isArray(payload.signals)) return payload.signals;
  return [];
};

const summarizeObservedEvents = (events, launchId) => {
  const writable = events.filter((event) => isWritableObservedEvent(event, launchId));
  const rejected = events.filter((event) => !isWritableObservedEvent(event, launchId));
  const identities = unique(writable.map((event) => identityForEvent(event).label));
  const eventKinds = unique(writable.map((event) => cleanString(event.eventKind)));
  const fieldPaths = unique(writable.flatMap((event) => [
    'eventKind',
    'sourceKind',
    'channel',
    'sourceId',
    'observedAt',
    eventLaunchId(event) ? 'metrics.launchId' : null,
    identityForEvent(event).email ? 'email' : null,
    identityForEvent(event).instagramHandle ? 'instagramHandle' : null,
    identityForEvent(event).personId ? 'personId' : null,
  ]));

  return {
    supplied: events.length > 0,
    total: events.length,
    writableCount: writable.length,
    rejectedCount: rejected.length,
    exactPersonCount: identities.length,
    exactPeople: identities,
    eventKinds,
    fieldPaths,
    allWritable: events.length > 0 && rejected.length === 0,
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
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
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildLaunchEvidenceState = ({
  signalProjectionPacket,
  eventContract,
  manualUiBuildReceipt,
  groupCreateExecution,
  shopifyLocalBuildReceipt,
}) => ({
  projectionPacketStatus: signalProjectionPacket?.status ?? null,
  projectionReady: signalProjectionPacket?.status === 'ready_for_no_live_signal_projection_design',
  sampleEventContractStatus: eventContract?.status ?? null,
  sampleEventCount: countRows(eventContract?.sampleSignalEvents),
  sampleEventsAreWritable: false,
  sampleEventReason: 'sample events use sample@example.invalid/sample_handle and cannot be written as observed person history',
  currentProjectableEventKinds: signalProjectionPacket?.projectionModel?.currentProjectionReadyFor ?? [],
  storeOnlyEventKinds: signalProjectionPacket?.projectionModel?.storeOnlyNow ?? [],
  createdReceiptGroups: (groupCreateExecution?.createdGroups ?? []).map((group) => ({
    id: cleanString(group?.id),
    name: cleanString(group?.name),
  })),
  targetGroupsExist: groupCreateExecution?.status === 'executed_mini_launch_empty_group_creation'
    || groupCreateExecution?.status === 'reference_only_empty_group_creation_already_completed',
  manualUiDraftsBuilt: manualUiBuildReceipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && manualUiBuildReceipt?.executiveSummary?.createdOrEditedDraftCount === 4,
  manualUiDraftCount: manualUiBuildReceipt?.executiveSummary?.createdOrEditedDraftCount ?? null,
  manualUiOutboxCount: manualUiBuildReceipt?.executiveSummary?.outboxCountAfterBuild ?? null,
  shopifyLocalBuildClosed: shopifyLocalBuildReceipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes',
  shopifyLocalFileCount: shopifyLocalBuildReceipt?.shopifyRepo?.localFilesCreatedOrUpdated
    ?? countRows(shopifyLocalBuildReceipt?.files),
  inertPlaceholders: shopifyLocalBuildReceipt?.placeholders?.inert ?? null,
});

const writeFamily = ({
  id,
  title,
  operationType,
  candidateEventKinds,
  allowedFields,
  blockers,
  requiredBeforeApproval,
  approvalPhraseTemplate,
}) => ({
  id,
  title,
  operationType,
  status: blockers.length === 0
    ? 'ready_for_future_exact_approval_request'
    : 'blocked_before_approval_request',
  canAskAlejandroForApproval: blockers.length === 0,
  exactApprovalPhrase: null,
  exactApprovalPhraseTemplate: approvalPhraseTemplate,
  candidateEventKinds,
  allowedFields,
  requiredBeforeApproval,
  blockers,
  operationsPreviewed: 0,
  operationsExecuted: 0,
});

const buildWriteFamilies = ({ projectionPacket, observedSummary }) => {
  const noObservedBlockers = [
    ...(observedSummary.supplied ? [] : ['real_observed_event_file_missing']),
    ...(observedSummary.writableCount > 0 ? [] : ['exact_observed_events_missing']),
    ...(observedSummary.exactPersonCount > 0 ? [] : ['exact_person_identity_missing']),
    ...(observedSummary.allWritable ? [] : ['observed_events_not_all_writable_or_contain_samples']),
  ];
  const projectableKinds = projectionPacket?.projectionModel?.currentProjectionReadyFor ?? [];
  const storeOnlyKinds = projectionPacket?.projectionModel?.storeOnlyNow ?? [];

  return [
    writeFamily({
      id: 'signal_event_ledger_append',
      title: 'Append observed mini-launch events to CRM Signal Event Ledger',
      operationType: 'local_crm_signal_event_ledger_append_after_future_exact_approval',
      candidateEventKinds: unique([...storeOnlyKinds, ...projectableKinds]),
      allowedFields: [
        'eventKind',
        'sourceKind',
        'channel',
        'sourceId',
        'observedAt',
        'metrics.launchId',
        'email or instagramHandle or personId',
        'summary',
        'tags',
        'evidenceSourcePath',
      ],
      blockers: noObservedBlockers,
      requiredBeforeApproval: [
        'Provide a real observed event file, not the sample event contract.',
        'Each event must name one exact person identity: email, Instagram handle, or CRM personId.',
        'Each event must preserve launch_id and evidence provenance.',
        'Approval must authorize Signal Event Ledger append only; no cards, scoring, Fact Store, subscribers, workflows or sends.',
      ],
      approvalPhraseTemplate: 'Apruebo SOLO appendear al CRM Signal Event Ledger estos <N> eventos observados del mini-lanzamiento Inteligencia para descansar, para estas personas exactas: <lista>, sin card writes, sin scoring, sin Fact Store, sin MailerLite, sin Shopify, sin subscribers, sin workflows y sin envios.',
    }),
    writeFamily({
      id: 'person_card_signal_history',
      title: 'Write mini-launch signal history onto CRM person cards',
      operationType: 'local_crm_person_card_enrichment_after_future_exact_approval',
      candidateEventKinds: projectableKinds,
      allowedFields: [
        'personId',
        'launchId',
        'signal.eventKind',
        'signal.observedAt',
        'signal.sourceId',
        'signal.evidenceSourcePath',
      ],
      blockers: [
        ...noObservedBlockers,
        'card_write_policy_packet_missing',
        'identity_stitching_packet_missing',
      ],
      requiredBeforeApproval: [
        'Run the normal CRM card-write approval packet for each person.',
        'Show exact target card ids and exact fields to add before asking Alejandro.',
        'Keep this separate from ledger append, scoring, Fact Store and any MailerLite action unless separately approved.',
      ],
      approvalPhraseTemplate: 'Apruebo SOLO escribir estos eventos del mini-lanzamiento en estas tarjetas CRM exactas: <personId + campos>, sin scoring, sin Fact Store, sin MailerLite, sin Shopify, sin subscribers, sin workflows y sin envios.',
    }),
    writeFamily({
      id: 'score_projection',
      title: 'Project engagement signals into CRM scoring',
      operationType: 'local_crm_score_projection_after_future_exact_policy_approval',
      candidateEventKinds: projectableKinds,
      allowedFields: [
        'personId',
        'scoreDimension',
        'delta',
        'evidenceEventId',
        'policyVersion',
      ],
      blockers: [
        ...noObservedBlockers,
        'scoring_policy_for_mini_launch_missing',
        'source_delivered_receipts_must_not_score_by_themselves',
      ],
      requiredBeforeApproval: [
        'Define a scoring policy for mini-launch engagement dimensions.',
        'Exclude Source/Delivered/Sent receipts as direct interest or intent scoring.',
        'Preview exact score deltas per person before approval.',
      ],
      approvalPhraseTemplate: 'Apruebo SOLO aplicar esta proyeccion de scoring CRM para estas personas y deltas exactos: <lista>, basada en eventos observados, sin Fact Store, sin card notes no listadas, sin MailerLite, sin Shopify, sin subscribers, sin workflows y sin envios.',
    }),
    writeFamily({
      id: 'fact_store_market_learning',
      title: 'Write aggregate launch learning to Fact Store',
      operationType: 'local_crm_fact_store_write_after_future_exact_approval',
      candidateEventKinds: ['market_signal_reviewed', 'continue_or_archive_decision'],
      allowedFields: [
        'launchId',
        'factKind',
        'summary',
        'evidenceEventIds',
        'decision',
        'approvedBy',
      ],
      blockers: [
        'aggregate_market_review_missing',
        'exact_fact_store_facts_missing',
        'fact_store_write_approval_missing',
      ],
      requiredBeforeApproval: [
        'Produce an aggregate market review from real observed events.',
        'List exact Fact Store facts and evidence ids.',
        'Keep Fact Store write separate from person-card/scoring/subscriber actions.',
      ],
      approvalPhraseTemplate: 'Apruebo SOLO escribir estos facts agregados del mini-lanzamiento en Fact Store: <lista exacta>, sin card writes, sin scoring, sin MailerLite, sin Shopify, sin subscribers, sin workflows y sin envios.',
    }),
  ];
};

const buildApprovalBoundary = ({ observedSummary, writeFamilies }) => {
  const blockers = unique(writeFamilies.flatMap((family) => family.blockers));
  return {
    canAskAlejandroForApproval: false,
    packetIsApprovalByItself: false,
    exactApprovalPhrase: null,
    exactApprovalPhrasePresent: false,
    blockersBeforeApprovalRequest: blockers,
    requiredBeforeApprovalRequest: [
      'Supply a real observed-events file with exact people and exact event fields.',
      'Choose one write family at a time: ledger append, card write, scoring, or Fact Store.',
      'Rerun this packet and the Launch OS approval queue after the observed event file exists.',
      'Keep subscribers, workflows, sends, MailerLite mutations and Shopify live changes out of the CRM approval.',
    ],
    observedEventsSummary: observedSummary,
  };
};

const buildCrmWriteApprovalPacket = ({
  signalProjectionPacket,
  eventContract,
  manualUiBuildReceipt = null,
  groupCreateExecution = null,
  shopifyLocalBuildReceipt = null,
  observedEventsPayload = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(signalProjectionPacket, eventContract);
  const observedEvents = observedEventsFrom(observedEventsPayload);
  const observedSummary = summarizeObservedEvents(observedEvents, launch.launchId);
  const launchEvidenceState = buildLaunchEvidenceState({
    signalProjectionPacket,
    eventContract,
    manualUiBuildReceipt,
    groupCreateExecution,
    shopifyLocalBuildReceipt,
  });
  const writeFamilies = buildWriteFamilies({ projectionPacket: signalProjectionPacket, observedSummary });
  const approvalBoundary = buildApprovalBoundary({ observedSummary, writeFamilies });
  const safety = buildSafety();

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_crm_write_approval_packet',
    generatedAt,
    ok: true,
    status: approvalBoundary.blockersBeforeApprovalRequest.length > 0
      ? 'crm_write_approval_packet_blocked_missing_observed_events_no_live_changes'
      : 'crm_write_approval_packet_ready_for_exact_human_approval_no_live_changes',
    launch,
    executiveSummary: {
      approvalRequestReady: false,
      exactEventCountReady: observedSummary.writableCount,
      exactPersonCountReady: observedSummary.exactPersonCount,
      candidateWriteFamilyCount: writeFamilies.length,
      blockedWriteFamilyCount: writeFamilies.filter((family) => family.blockers.length > 0).length,
      operationsPreviewed: 0,
      operationsExecuted: 0,
      blockers: approvalBoundary.blockersBeforeApprovalRequest,
    },
    launchEvidenceState,
    observedEventInputContract: {
      acceptedShape: '{ "events": [ { eventKind, sourceKind, channel, sourceId, observedAt, metrics.launchId, email|instagramHandle|personId, evidenceSourcePath } ] }',
      sampleEventsWritable: false,
      exactIdentityRequired: true,
      launchIdRequired: launch.launchId,
      requiredFields: [
        'eventKind',
        'sourceKind',
        'channel',
        'sourceId',
        'observedAt',
        'metrics.launchId',
        'email or instagramHandle or personId',
        'evidenceSourcePath or equivalent provenance',
      ],
    },
    writeFamilies,
    approvalBoundary,
    hardStops: [
      'This packet is not approval to write CRM.',
      'Sample event-contract events are not writable person history.',
      'Do not bundle CRM writes with subscribers, workflows, sends, MailerLite group assignments, Shopify publish, ledgers, cards, scoring or Fact Store beyond the one explicitly approved family.',
    ],
    sourceDigests,
    safety,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Mini-Launch - CRM Write Approval Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: \`${packet.status}\``,
    '',
    `Launch: \`${packet.launch.resourceName}\` (\`${packet.launch.launchId}\`)`,
    '',
    '## Executive Summary',
    '',
    `- Approval request ready: ${packet.executiveSummary.approvalRequestReady}`,
    `- Exact writable events ready: ${packet.executiveSummary.exactEventCountReady}`,
    `- Exact people ready: ${packet.executiveSummary.exactPersonCountReady}`,
    `- Candidate write families: ${packet.executiveSummary.candidateWriteFamilyCount}`,
    `- Operations executed: ${packet.executiveSummary.operationsExecuted}`,
    '',
    '## Blockers Before Asking Alejandro',
    '',
    renderList(packet.approvalBoundary.blockersBeforeApprovalRequest),
    '',
    '## Required Before Approval Request',
    '',
    renderList(packet.approvalBoundary.requiredBeforeApprovalRequest),
    '',
    '## Write Families',
    '',
  ];

  for (const family of packet.writeFamilies) {
    lines.push(`### ${family.id}`);
    lines.push(`- Status: ${family.status}`);
    lines.push(`- Operation: ${family.operationType}`);
    lines.push(`- Event kinds: ${family.candidateEventKinds.join(', ') || 'none'}`);
    lines.push(`- Blockers: ${family.blockers.join(', ') || 'none'}`);
    lines.push(`- Approval phrase template: ${family.exactApprovalPhraseTemplate}`);
    lines.push('');
  }

  lines.push('## Safety');
  lines.push('');
  lines.push('- Local-only report packet.');
  lines.push('- No Signal Ledger append, card write, scoring, Fact Store write, subscriber action, workflow change, send, MailerLite mutation, Shopify live action or outbound.');

  return `${lines.join('\n')}\n`;
};

const writeOutput = async (path, content) => {
  const absolutePath = resolve(path);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, content, 'utf8');
  return absolutePath;
};

const buildFromFiles = async (options) => {
  const [
    signalProjectionPacket,
    eventContract,
    manualUiBuildReceipt,
    groupCreateExecution,
    shopifyLocalBuildReceipt,
    observedEventsPayload,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.signalProjectionPacket),
    readJson(options.eventContract),
    readOptionalJson(options.manualUiBuildReceipt),
    readOptionalJson(options.groupCreateExecution),
    readOptionalJson(options.shopifyLocalBuildReceipt),
    readOptionalJson(options.observedEventsFile),
    loadSourceDigests(options),
  ]);

  return buildCrmWriteApprovalPacket({
    signalProjectionPacket,
    eventContract,
    manualUiBuildReceipt,
    groupCreateExecution,
    shopifyLocalBuildReceipt,
    observedEventsPayload,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildFromFiles(options);
  if (options.out) await writeOutput(options.out, `${JSON.stringify(packet, null, 2)}\n`);
  if (options.markdownOut) await writeOutput(options.markdownOut, renderMarkdown(packet));
  console.log(JSON.stringify({
    status: packet.status,
    approvalRequestReady: packet.executiveSummary.approvalRequestReady,
    exactEventCountReady: packet.executiveSummary.exactEventCountReady,
    exactPersonCountReady: packet.executiveSummary.exactPersonCountReady,
    blockerCount: packet.approvalBoundary.blockersBeforeApprovalRequest.length,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext mailerlite mini-launch CRM write approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalBoundary,
  buildCrmWriteApprovalPacket,
  buildLaunchEvidenceState,
  buildWriteFamilies,
  identityForEvent,
  isWritableObservedEvent,
  parseArgs,
  renderMarkdown,
  summarizeObservedEvents,
};
