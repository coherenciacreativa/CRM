#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCrmSignalEventLedgerInput } from '../lib/crm/crm-vnext-signal-event-ledger.js';
import { buildCrmSignalEventProjection } from '../lib/crm/crm-vnext-signal-event-projection.js';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-crm-signal-projection-packet-2026-05-28';
const DEFAULT_CRM_RESPONSE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27/crm_response.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_SIGNAL_PROJECTION_DOC = '/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-projection.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-crm-signal-projection-packet.mjs [options]

Options:
  --crm-response <path>                 Final CRM department response JSON. Defaults to ${DEFAULT_CRM_RESPONSE}
  --event-contract <path>               Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --onboarding-handoff-policy <path>    Mini-launch onboarding handoff policy JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --signal-projection-doc <path>        CRM signal projection doc. Defaults to ${DEFAULT_SIGNAL_PROJECTION_DOC}
  --out <path>                          Write JSON packet
  --markdown-out <path>                 Write Markdown packet
  --help                                Show this help

Local-only CRM signal projection packet for one Mini-Launch OS rehearsal. It
replays sample event shapes through the local Signal Event Ledger normalizer and
Signal Event Projection, then separates store-only receipts from projectable
engagement signals. It never appends ledgers, writes cards, changes scoring,
writes Fact Store, calls live APIs, mutates MailerLite/Shopify/CRM, reads
subscribers, edits workflows, sends email, or performs outbound actions.`;

const parseArgs = (argv) => {
  const options = {
    crmResponse: DEFAULT_CRM_RESPONSE,
    eventContract: DEFAULT_EVENT_CONTRACT,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    signalProjectionDoc: DEFAULT_SIGNAL_PROJECTION_DOC,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--crm-response') options.crmResponse = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--signal-projection-doc') options.signalProjectionDoc = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const sourceDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const loadSourceDigests = async (options) => Promise.all([
  sourceDigest(options.crmResponse, 'final CRM department signal-boundary response'),
  sourceDigest(options.eventContract, 'mini-launch event contract and sample event shapes'),
  sourceDigest(options.onboardingHandoffPolicy, 'protected onboarding recommendation boundary'),
  sourceDigest(options.signalProjectionDoc, 'current CRM projection/scoring rules'),
]);

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const eventKindFromSignal = (signal) =>
  (signal.tags ?? [])
    .find((tag) => typeof tag === 'string' && tag.startsWith('event:'))
    ?.slice('event:'.length) ?? null;

const CURRENT_MINI_LAUNCH_PROJECTABLE_EVENT_KINDS = new Set([
  'email_open',
  'email_click',
  'email_reply',
  'instagram_engagement_snapshot',
  'instagram_comment',
  'instagram_like',
]);

const launchFrom = (crmResponse, eventContract) => ({
  launchId: crmResponse?.launchId ?? eventContract?.launch?.launchId ?? null,
  resourceName: eventContract?.launch?.resourceName ?? null,
  resourceType: eventContract?.launch?.resourceType ?? null,
});

const buildProjectionProof = ({ eventContract, generatedAt }) => {
  const sampleSignalEvents = eventContract?.sampleSignalEvents ?? [];
  const normalization = buildCrmSignalEventLedgerInput({ events: sampleSignalEvents }, {
    now: generatedAt,
    sourceLabel: `Mini-launch CRM signal projection ${eventContract?.launch?.launchId ?? 'unknown'}`,
    collector: 'Codex',
  });
  const projection = buildCrmSignalEventProjection({
    events: normalization.events,
    now: generatedAt,
  });

  const rawProjectedEventKinds = unique(projection.signals.map(eventKindFromSignal));
  const normalizedEventKinds = Object.keys(normalization.summary.byKind ?? {});
  const projectedEventKinds = normalizedEventKinds
    .filter((eventKind) => CURRENT_MINI_LAUNCH_PROJECTABLE_EVENT_KINDS.has(eventKind));
  const skippedEventKinds = normalizedEventKinds.filter((eventKind) => !projectedEventKinds.includes(eventKind));

  return {
    normalization: {
      schemaVersion: normalization.schemaVersion,
      mode: normalization.mode,
      recordsRead: normalization.summary.recordsRead,
      eventsGenerated: normalization.summary.eventsGenerated,
      skippedRecords: normalization.summary.skippedRecords,
      eventKinds: normalizedEventKinds,
      channels: Object.keys(normalization.summary.byChannel ?? {}),
      safety: normalization.safety,
    },
    projection: {
      schemaVersion: projection.schemaVersion,
      mode: projection.mode,
      eventsRead: projection.source.eventsRead,
      rawSignalsGenerated: projection.summary.signalsGenerated,
      rawProjectedEventKinds,
      signalsGenerated: projectedEventKinds.length,
      skippedEvents: skippedEventKinds.length,
      projectedEventKinds,
      skippedEventKinds,
      bySourceKind: projection.summary.bySourceKind,
      bySkipReason: projection.summary.bySkipReason,
      safety: projection.safety,
    },
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

const buildApprovalGate = () => ({
  canAppendSignalLedgerNow: false,
  canWriteCardsNow: false,
  canScoreNow: false,
  canWriteFactStoreNow: false,
  canRouteOnboardingNow: false,
  canMutateMailerLiteNow: false,
  canMutateShopifyNow: false,
});

const buildCrmSignalProjectionPacket = ({
  crmResponse,
  eventContract,
  onboardingHandoffPolicy,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(crmResponse, eventContract);
  const proof = buildProjectionProof({ eventContract, generatedAt });
  const currentProjectionReadyFor = proof.projection.projectedEventKinds;
  const storeOnlyNow = proof.normalization.eventKinds.filter((eventKind) => !currentProjectionReadyFor.includes(eventKind));
  const futurePolicyOnlyEvents = (crmResponse?.projectableLaterEvents ?? [])
    .filter((eventKind) => !currentProjectionReadyFor.includes(eventKind));
  const crmApprovedSignalBoundary = crmResponse?.signalBoundaryDecision === 'approve'
    && crmResponse?.liveApprovalGranted === false;
  const proofReady = proof.normalization.eventsGenerated > 0
    && proof.normalization.skippedRecords === 0
    && proof.projection.signalsGenerated >= 1;
  const ok = crmApprovedSignalBoundary && proofReady;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_crm_signal_projection_packet',
    generatedAt,
    ok,
    status: ok
      ? 'ready_for_no_live_signal_projection_design'
      : 'needs_crm_signal_projection_review_no_live_changes',
    launch,
    sourceDecision: {
      department: crmResponse?.department ?? 'crm',
      signalBoundaryDecision: crmResponse?.signalBoundaryDecision ?? null,
      onboardingProtectionStatus: crmResponse?.onboardingProtectionStatus ?? null,
      liveApprovalGranted: crmResponse?.liveApprovalGranted === true,
    },
    projectionProof: proof,
    projectionModel: {
      currentProjectionReadyFor,
      storeOnlyNow,
      crmApprovedStoreOnlyEvents: crmResponse?.storeOnlyEvents ?? [],
      crmApprovedProjectableLaterEvents: crmResponse?.projectableLaterEvents ?? [],
      futurePolicyOnlyEvents,
      interpretationRules: [
        ...(crmResponse?.receiptInterpretationWarnings ?? []),
        'Source/Delivered/Sent receipts preserve operational provenance; they do not prove interest, readiness, purchase intent, psychological state, relationship depth, or permission to contact.',
        'Email opens/clicks/replies and Instagram engagement can project only when real observed evidence exists.',
        'Quiz/result events remain store-only until a reviewed product-fit projection policy exists.',
      ],
    },
    onboardingBoundary: {
      targetGroupIfLaterApproved: crmResponse?.onboardingHandoffTargetGroup
        ?? onboardingHandoffPolicy?.targetGroups?.eligible
        ?? null,
      rule: crmResponse?.onboardingHandoffRule
        ?? onboardingHandoffPolicy?.approvalBoundary?.closedNow?.join(' ')
        ?? 'Recommendation is not routing.',
      productiveOnboardingV1Protected: onboardingHandoffPolicy?.productionOnboardingV1?.protected
        ?? onboardingHandoffPolicy?.readiness?.productiveOnboardingV1Protected
        ?? true,
    },
    approvalGate: buildApprovalGate(),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Mini-Launch - CRM Signal Projection Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: \`${packet.status}\``,
    '',
    `Piloto: \`${packet.launch.resourceName}\` (\`${packet.launch.launchId}\`)`,
    '',
    '## Decision ejecutiva',
    '',
    'CRM aprobo las fronteras de senales en modo review. Este packet prueba localmente que los eventos del mini-lanzamiento pueden normalizarse y separa que senales se pueden proyectar ahora de cuales deben quedar store-only.',
    '',
    'No autoriza Signal Ledger append, tarjetas, scoring, Fact Store, onboarding, MailerLite, Shopify, subscribers, workflows ni envios.',
    '',
    '## Prueba local',
    '',
    `- Eventos normalizados: ${packet.projectionProof.normalization.eventsGenerated}`,
    `- Eventos saltados por normalizacion: ${packet.projectionProof.normalization.skippedRecords}`,
    `- Senales proyectadas ahora: ${packet.projectionProof.projection.signalsGenerated}`,
    `- Eventos store-only/no proyectados ahora: ${packet.projectionProof.projection.skippedEvents}`,
    '',
    '## Proyectable ahora',
    '',
    renderList(packet.projectionModel.currentProjectionReadyFor),
    '',
    '## Store-only ahora',
    '',
    renderList(packet.projectionModel.storeOnlyNow),
    '',
    '## Future policy only',
    '',
    renderList(packet.projectionModel.futurePolicyOnlyEvents),
    '',
    '## Reglas de interpretacion',
    '',
    renderList(packet.projectionModel.interpretationRules),
    '',
    '## Frontera de onboarding',
    '',
    `Target futuro si se aprueba: \`${packet.onboardingBoundary.targetGroupIfLaterApproved ?? 'none'}\``,
    '',
    `Regla: ${packet.onboardingBoundary.rule}`,
    '',
    '## Approval Gate',
    '',
    `- Can append Signal Ledger now: ${packet.approvalGate.canAppendSignalLedgerNow}`,
    `- Can write cards now: ${packet.approvalGate.canWriteCardsNow}`,
    `- Can score now: ${packet.approvalGate.canScoreNow}`,
    `- Can write Fact Store now: ${packet.approvalGate.canWriteFactStoreNow}`,
    `- Can route onboarding now: ${packet.approvalGate.canRouteOnboardingNow}`,
    '',
    '## Fuentes consultadas',
    '',
  ];

  for (const source of packet.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push(
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin MailerLite API calls.',
    '- Sin Shopify API calls.',
    '- Sin CRM live API calls.',
    '- Sin subscribers leidos o modificados.',
    '- Sin grupos/workflows/forms creados o editados.',
    '- Sin Signal Ledger append.',
    '- Sin card writes, scoring, Fact Store u outbound.',
    '- No tokens printed.',
  );

  return lines.join('\n');
};

const writeJson = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const buildPacketFromFiles = async (options) => {
  const [crmResponse, eventContract, onboardingHandoffPolicy, sourceDigests] = await Promise.all([
    readJson(options.crmResponse),
    readJson(options.eventContract),
    readJson(options.onboardingHandoffPolicy),
    loadSourceDigests(options),
  ]);

  return buildCrmSignalProjectionPacket({
    crmResponse,
    eventContract,
    onboardingHandoffPolicy,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch.launchId,
    signalsGenerated: packet.projectionProof.projection.signalsGenerated,
    storeOnlyNowCount: packet.projectionModel.storeOnlyNow.length,
    canAppendSignalLedgerNow: packet.approvalGate.canAppendSignalLedgerNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch CRM signal projection packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCrmSignalProjectionPacket,
  buildProjectionProof,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
