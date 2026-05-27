#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCrmSignalEventLedgerInput } from '../lib/crm/crm-vnext-signal-event-ledger.js';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-event-contract-2026-05-27';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_EXECUTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_execution_packet_2026-05-27.json';
const DEFAULT_FIRST_EMAIL_MAPPING = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_mapping_2026-05-27.json';
const DEFAULT_SOURCE_MAP = '/Users/alejandrogomez/CRM/docs/crm-vnext/source-of-truth-map.md';
const DEFAULT_SIGNAL_LEDGER_DOC = '/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-ledger.md';
const DEFAULT_SIGNAL_PROJECTION_DOC = '/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-projection.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-event-contract.mjs [options]

Options:
  --design-packet <path>        Onboarding v2 design JSON. Defaults to ${DEFAULT_DESIGN_PACKET}
  --v1-audit <path>             Onboarding v1 audit JSON. Defaults to ${DEFAULT_V1_AUDIT}
  --execution-packet <path>     Onboarding v2 execution JSON. Defaults to ${DEFAULT_EXECUTION_PACKET}
  --first-email-mapping <path>  First email mapping JSON. Defaults to ${DEFAULT_FIRST_EMAIL_MAPPING}
  --source-map <path>           CRM source-of-truth map. Defaults to ${DEFAULT_SOURCE_MAP}
  --signal-ledger-doc <path>    Signal Event Ledger doc. Defaults to ${DEFAULT_SIGNAL_LEDGER_DOC}
  --signal-projection-doc <path> Signal Event Projection doc. Defaults to ${DEFAULT_SIGNAL_PROJECTION_DOC}
  --out <path>                  Write JSON packet
  --markdown-out <path>         Write Markdown packet
  --help                        Show this help

Local-only event contract for MailerLite Onboarding v2. It defines how the
editorial onboarding should appear in CRM Signal Event Ledger terms, proves the
sample events normalize without becoming unknown, and keeps all live MailerLite,
workflow, subscriber, send, CRM card, scoring, and Fact Store gates closed.`;

const parseArgs = (argv) => {
  const options = {
    designPacket: DEFAULT_DESIGN_PACKET,
    v1Audit: DEFAULT_V1_AUDIT,
    executionPacket: DEFAULT_EXECUTION_PACKET,
    firstEmailMapping: DEFAULT_FIRST_EMAIL_MAPPING,
    sourceMap: DEFAULT_SOURCE_MAP,
    signalLedgerDoc: DEFAULT_SIGNAL_LEDGER_DOC,
    signalProjectionDoc: DEFAULT_SIGNAL_PROJECTION_DOC,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--v1-audit') options.v1Audit = argv[++index];
    else if (arg === '--execution-packet') options.executionPacket = argv[++index];
    else if (arg === '--first-email-mapping') options.firstEmailMapping = argv[++index];
    else if (arg === '--source-map') options.sourceMap = argv[++index];
    else if (arg === '--signal-ledger-doc') options.signalLedgerDoc = argv[++index];
    else if (arg === '--signal-projection-doc') options.signalProjectionDoc = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const digestSource = (path, content) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor: path.includes('decision_design')
    ? 'Onboarding v2 workflow design and receipt plan'
    : path.includes('v1_audit')
      ? 'Protected production onboarding v1 state and content sequence'
      : path.includes('execution_packet')
        ? 'Current approval gates and v1/v2 execution posture'
        : path.includes('first_email_mapping')
          ? 'Welcome-only first email decision'
          : path.includes('source-of-truth')
            ? 'CRM source-of-truth boundaries'
            : path.includes('signal-event-ledger')
              ? 'Signal Event Ledger supported event kinds and safety'
              : 'Signal Event Projection boundary',
});

const loadSourceDigests = async (options) => {
  const paths = [
    options.designPacket,
    options.v1Audit,
    options.executionPacket,
    options.firstEmailMapping,
    options.sourceMap,
    options.signalLedgerDoc,
    options.signalProjectionDoc,
  ];
  const digests = [];
  for (const path of paths) {
    const content = await readFile(resolve(path), 'utf8');
    digests.push(digestSource(path, content));
  }
  return digests;
};

const groupName = (group) => group?.name ?? null;

const buildOnboardingModel = ({ designPacket, v1Audit, executionPacket, firstEmailMapping }) => {
  const workflowBlueprint = designPacket.workflowBlueprint ?? {};
  const emailReceipts = workflowBlueprint.emailReceipts ?? [];
  const canonicalArticleReceipts = emailReceipts.filter((item) =>
    item.contentId && item.recommendedReceiptGroup && item.dictionaryStatus !== 'needs_brand_content_mapping');
  const welcomeOnlyEmail = emailReceipts.find((item) => item.order === 1) ?? null;
  const gateStatusById = Object.fromEntries((executionPacket.gateQueue ?? []).map((gate) => [gate.id, gate.status]));

  return {
    currentV1: {
      workflowId: v1Audit.workflow?.id ?? null,
      workflowName: v1Audit.workflow?.name ?? null,
      enabled: v1Audit.workflow?.enabled ?? null,
      complete: v1Audit.workflow?.complete ?? null,
      broken: v1Audit.workflow?.broken ?? null,
      emailCount: v1Audit.workflow?.emailsCount ?? null,
      qualifiedSubscribersCount: v1Audit.workflow?.qualifiedSubscribersCount ?? null,
      subscriberRowsRead: v1Audit.queueVisibility?.subscriberRowsRead ?? null,
    },
    v2: {
      workflowName: workflowBlueprint.proposedWorkflowName ?? 'Onboarding editorial v2 - DRAFT',
      triggerGroup: groupName(workflowBlueprint.trigger?.group),
      sourceGroup: groupName(workflowBlueprint.entryAssignmentsExpectedBeforeTrigger?.find((item) => item.group?.layer === 'Source')?.group),
      eligibleGroup: groupName(workflowBlueprint.trigger?.group),
      inProgressGroup: groupName(workflowBlueprint.firstActions?.find((item) => item.action === 'mark_journey_in_progress')?.group),
      completeGroup: groupName(workflowBlueprint.completionActions?.find((item) => item.action === 'mark_journey_complete')?.group),
      audienceEligibleGroup: groupName(workflowBlueprint.completionActions?.find((item) => item.action === 'mark_general_newsletter_eligible')?.group),
    },
    emailPlan: {
      totalEmails: emailReceipts.length,
      welcomeOnlyEmail: welcomeOnlyEmail ? {
        order: welcomeOnlyEmail.order,
        subject: welcomeOnlyEmail.subject,
        contentId: welcomeOnlyEmail.contentId,
        recommendedReceiptGroup: welcomeOnlyEmail.recommendedReceiptGroup,
        mappingStatus: firstEmailMapping.status,
        posture: firstEmailMapping.decision?.recommendedPosture ?? null,
      } : null,
      canonicalArticleReceiptCount: canonicalArticleReceipts.length,
      canonicalArticleReceipts: canonicalArticleReceipts.map((item) => ({
        order: item.order,
        subject: item.subject,
        contentId: item.contentId,
        receiptGroup: item.recommendedReceiptGroup,
        dictionaryStatus: item.dictionaryStatus,
        mailerLiteGroupId: item.mailerLiteGroupId,
      })),
    },
    approvalState: {
      executionStatus: executionPacket.status,
      createEmptyGroups: gateStatusById.create_empty_onboarding_v2_groups ?? null,
      buildDraft: gateStatusById.build_or_clone_disabled_onboarding_v2_draft ?? null,
      seedTest: gateStatusById.seed_test_onboarding_v2 ?? null,
      productionSwitch: gateStatusById.production_entry_switch_to_v2 ?? null,
      firstEmailMapping: gateStatusById.brand_first_email_content_mapping ?? null,
    },
  };
};

const buildEventContract = (model) => [
  {
    stage: 'entry_source',
    eventKind: 'source_assigned',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_onboarding_receipt',
    meaning: 'A person receives the clean Source marker for the origin that led into editorial onboarding.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['sourceGroup', 'journey'],
    projectionPosture: 'store_only; source is attribution, not warmth or permission',
    approvalGate: 'Source group creation/assignment requires separate exact approval.',
  },
  {
    stage: 'eligibility',
    eventKind: 'onboarding_eligibility_assigned',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_onboarding_journey',
    meaning: 'A person is eligible to enter the editorial onboarding v2 journey.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['eligibleGroup', 'journey'],
    projectionPosture: 'store_only; eligibility is routing state',
    approvalGate: 'Eligibility group creation/assignment requires separate exact approval.',
  },
  {
    stage: 'journey_start',
    eventKind: 'onboarding_started',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_onboarding_journey',
    meaning: 'A person starts the editorial onboarding v2 journey or receives the in-progress marker.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['inProgressGroup', 'workflowName'],
    projectionPosture: 'store_only; started does not mean engagement',
    approvalGate: 'Requires disabled v2 draft/seed test approval before real events exist.',
  },
  {
    stage: 'welcome',
    eventKind: 'email_sent',
    channel: 'email',
    direction: 'outbound',
    sourceKind: 'mailerlite_onboarding_email',
    meaning: 'The welcome/orientation email was sent in the onboarding journey.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['emailOrder', 'subject', 'welcomeOnly'],
    projectionPosture: 'store_only; welcome email has no canonical Sent receipt by current Brand decision',
    approvalGate: 'No send without seed or production approval; no Sent group for Email 1 unless Brand later changes canon.',
  },
  {
    stage: 'editorial_content',
    eventKind: 'content_sent',
    channel: 'email',
    direction: 'outbound',
    sourceKind: 'mailerlite_onboarding_content_receipt',
    meaning: 'A canonical article in the editorial onboarding sequence was sent.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['emailOrder', 'contentId', 'receiptGroup'],
    projectionPosture: 'store_only; Sent means system delivery, not read/open/click/interest',
    approvalGate: 'Receipt group creation/use and email send require separate exact approvals.',
  },
  {
    stage: 'engagement',
    eventKind: 'email_open',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'mailerlite_onboarding_engagement',
    meaning: 'A person opened an onboarding email.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['emailOrder', 'contentId'],
    projectionPosture: 'projects through existing email open pipeline',
    approvalGate: 'Read-only engagement import only.',
  },
  {
    stage: 'engagement',
    eventKind: 'email_click',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'mailerlite_onboarding_engagement',
    meaning: 'A person clicked from an onboarding email.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['emailOrder', 'contentId', 'linkKind'],
    projectionPosture: 'projects through existing email click pipeline',
    approvalGate: 'Read-only engagement import only.',
  },
  {
    stage: 'engagement',
    eventKind: 'email_reply',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'gmail_reply_activity',
    meaning: 'A person replied to an onboarding email.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['journey', 'contentId'],
    projectionPosture: 'projects through existing email reply pipeline',
    approvalGate: 'Read-only reply discovery; no outbound without approval.',
  },
  {
    stage: 'deliverability',
    eventKind: 'email_suppression',
    channel: 'email',
    direction: 'inbound',
    sourceKind: 'mailerlite_onboarding_deliverability',
    meaning: 'MailerLite reports bounce, unsubscribe, suppression or subscriber-status risk during onboarding.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['subscriberStatus', 'reason'],
    projectionPosture: 'projects only as suppression/review signal; never as warmth',
    approvalGate: 'Read-only import; no list cleanup or outbound without approval.',
  },
  {
    stage: 'journey_completion',
    eventKind: 'onboarding_completed',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_onboarding_journey',
    meaning: 'A person completed the editorial onboarding journey.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['completeGroup', 'journey'],
    projectionPosture: 'store_only; completion is lifecycle state, not a score by itself',
    approvalGate: 'Completion group creation/use requires separate exact approval.',
  },
  {
    stage: 'audience_eligibility',
    eventKind: 'audience_eligibility_assigned',
    channel: 'mailerlite',
    direction: 'internal',
    sourceKind: 'mailerlite_audience_journey',
    meaning: 'A person becomes eligible for general newsletter campaigns after onboarding.',
    requiredIdentityAnchor: 'email_or_personId',
    metricsRequired: ['audienceEligibleGroup', 'journey'],
    projectionPosture: 'store_only; audience eligibility is not permission for any specific send',
    approvalGate: 'Audience routing and sends remain separate exact approvals.',
  },
  {
    stage: 'mini_launch_handoff',
    eventKind: 'onboarding_handoff_recommended',
    channel: 'crm',
    direction: 'internal',
    sourceKind: 'crm_onboarding_handoff',
    meaning: 'A mini-launch or CRM review recommends that a person may enter editorial onboarding later.',
    requiredIdentityAnchor: 'email_or_personId_or_launch_id',
    metricsRequired: ['reason', 'sourceLaunchId', 'targetJourney'],
    projectionPosture: 'store_only; recommendation is not routing and not contact permission',
    approvalGate: 'Actual MailerLite assignment to onboarding eligibility requires separate exact approval.',
  },
].map((item) => ({
  ...item,
  currentV1Safe: model.currentV1.enabled === true && model.currentV1.complete === true && model.currentV1.broken === false,
}));

const sampleEventFor = ({ contract, model, index, generatedAt }) => {
  const firstReceipt = model.emailPlan.canonicalArticleReceipts[0] ?? {};
  const metrics = {
    sourceGroup: model.v2.sourceGroup,
    eligibleGroup: model.v2.eligibleGroup,
    inProgressGroup: model.v2.inProgressGroup,
    completeGroup: model.v2.completeGroup,
    audienceEligibleGroup: model.v2.audienceEligibleGroup,
    workflowName: model.v2.workflowName,
    journey: 'editorial_onboarding',
    emailOrder: firstReceipt.order ?? 2,
    subject: firstReceipt.subject ?? model.emailPlan.welcomeOnlyEmail?.subject,
    welcomeOnly: contract.eventKind === 'email_sent',
    contentId: firstReceipt.contentId ?? 'sample_content_id',
    receiptGroup: firstReceipt.receiptGroup ?? 'sample_receipt_group',
    linkKind: 'article_or_reply_cta',
    subscriberStatus: 'sample_only',
    reason: 'sample_only',
    sourceLaunchId: 'sample_launch_id',
    targetJourney: 'editorial_onboarding',
  };

  return {
    sourceKind: contract.sourceKind,
    sourceId: `onboarding_v2:${contract.eventKind}:sample-${index + 1}`,
    eventKind: contract.eventKind,
    channel: contract.channel,
    direction: contract.direction,
    observedAt: generatedAt,
    email: 'sample@example.invalid',
    metrics: Object.fromEntries(contract.metricsRequired.map((key) => [key, metrics[key] ?? 'sample'])),
    tags: ['mailerlite', 'onboarding_v2', contract.stage],
    summary: `${contract.meaning} Sample event shape only; not observed from a real subscriber.`,
  };
};

const buildSampleEvents = ({ eventContract, model, generatedAt }) =>
  eventContract.map((item, index) => sampleEventFor({ contract: item, model, index, generatedAt }));

const safetyBlock = () => ({
  localOnly: true,
  signalLedgerAppendPerformed: false,
  cardMutationPerformed: false,
  factStoreWritePerformed: false,
  scoreMutationPerformed: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  onboardingV1Touched: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildEventContractPacket = ({
  designPacket,
  v1Audit,
  executionPacket,
  firstEmailMapping,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const model = buildOnboardingModel({ designPacket, v1Audit, executionPacket, firstEmailMapping });
  const eventContract = buildEventContract(model);
  const sampleSignalEvents = buildSampleEvents({ eventContract, model, generatedAt });
  const normalizationProof = buildCrmSignalEventLedgerInput({ events: sampleSignalEvents }, {
    now: generatedAt,
    sourceLabel: 'Onboarding v2 event contract',
    collector: 'Codex',
  });
  const unknownKinds = normalizationProof.events.filter((event) => event.event.kind === 'unknown');
  const unknownChannels = normalizationProof.events.filter((event) => event.event.channel === 'unknown');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_onboarding_v2_event_contract',
    generatedAt,
    ok: unknownKinds.length === 0 && unknownChannels.length === 0 && normalizationProof.summary.skippedRecords === 0,
    status: unknownKinds.length || unknownChannels.length || normalizationProof.summary.skippedRecords
      ? 'onboarding_v2_event_contract_needs_ledger_review'
      : 'onboarding_v2_event_contract_ready_no_ledger_write',
    model,
    eventContract,
    sampleSignalEvents,
    normalizationProof: {
      schemaVersion: normalizationProof.schemaVersion,
      mode: normalizationProof.mode,
      summary: normalizationProof.summary,
      eventKinds: normalizationProof.events.map((event) => event.event.kind),
      channels: normalizationProof.events.map((event) => event.event.channel),
      skippedRecords: normalizationProof.skippedRecords,
      safety: normalizationProof.safety,
    },
    projectionBoundary: {
      existingProjectionReadyFor: [
        'email_open',
        'email_click',
        'email_reply',
        'email_suppression',
      ],
      storeOnlyForNow: eventContract
        .filter((item) => item.projectionPosture.includes('store_only'))
        .map((item) => item.eventKind),
      rule: 'Journey/source/audience state is stored for observability first. It does not affect warmth, product fit, card state, scoring, outbound permission, or routing until a later reviewed policy says so.',
    },
    approvalBoundary: {
      canNormalizeDryRunNow: true,
      canAppendToLedgerNow: false,
      canAssignMailerLiteGroupsNow: false,
      canTouchOnboardingV1Now: false,
      canUseOnboardingV2WorkflowNow: false,
      appendRequires: '--write --approved-by Alejandro with real observed events after a seed/live approval',
      stillForbidden: [
        'Onboarding v1 edit, pause, activation or entry switch',
        'Onboarding v2 workflow creation, clone, activation or use',
        'MailerLite group creation or subscriber assignment',
        'seed or audience sends',
        'CRM card writes',
        'score mutation',
        'Fact Store write',
        'outbound messages',
      ],
    },
    sourceDigests,
    safety: safetyBlock(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Onboarding v2 - CRM Event Contract',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Onboarding v1 protected: ${packet.model.currentV1.enabled === true && packet.model.currentV1.complete === true && packet.model.currentV1.broken === false}`,
    `V1 workflow: ${packet.model.currentV1.workflowName}`,
    `V2 workflow target: ${packet.model.v2.workflowName}`,
    `Canonical article receipts planned: ${packet.model.emailPlan.canonicalArticleReceiptCount}`,
    `Open live gates from this packet: 0`,
    '',
    'Este packet define como el onboarding editorial v2 deberia registrarse en el CRM: Source, elegibilidad, inicio, envio de contenidos, engagement, completion, audiencia general y handoff desde mini-lanzamientos. No escribe al ledger, no toca MailerLite y no modifica v1.',
    '',
    '## Normalization Proof',
    '',
    `- Records read: ${packet.normalizationProof.summary.recordsRead}`,
    `- Events generated: ${packet.normalizationProof.summary.eventsGenerated}`,
    `- Skipped records: ${packet.normalizationProof.summary.skippedRecords}`,
    `- Event kinds: ${Array.from(new Set(packet.normalizationProof.eventKinds)).join(', ')}`,
    `- Channels: ${Array.from(new Set(packet.normalizationProof.channels)).join(', ')}`,
    '',
    '## Event Contract',
    '',
  ];

  for (const item of packet.eventContract) {
    lines.push(`### ${item.eventKind}`);
    lines.push(`- Stage: ${item.stage}`);
    lines.push(`- Channel: ${item.channel}`);
    lines.push(`- Direction: ${item.direction}`);
    lines.push(`- Source kind: ${item.sourceKind}`);
    lines.push(`- Meaning: ${item.meaning}`);
    lines.push(`- Identity anchor: ${item.requiredIdentityAnchor}`);
    lines.push(`- Metrics required: ${item.metricsRequired.join(', ')}`);
    lines.push(`- Projection posture: ${item.projectionPosture}`);
    lines.push(`- Approval gate: ${item.approvalGate}`);
    lines.push('');
  }

  lines.push('## Content Receipt Plan', '');
  lines.push(`- Welcome-only email: ${packet.model.emailPlan.welcomeOnlyEmail?.subject ?? 'missing'}`);
  lines.push(`- Welcome-only posture: ${packet.model.emailPlan.welcomeOnlyEmail?.posture ?? 'missing'}`);
  lines.push(`- Canonical article receipt count: ${packet.model.emailPlan.canonicalArticleReceiptCount}`);
  for (const receipt of packet.model.emailPlan.canonicalArticleReceipts) {
    lines.push(`- ${receipt.order}. ${receipt.contentId}: ${receipt.receiptGroup} (${receipt.dictionaryStatus})`);
  }

  lines.push('', '## Projection Boundary', '');
  lines.push(`- Existing projection ready for: ${packet.projectionBoundary.existingProjectionReadyFor.join(', ')}`);
  lines.push(`- Store-only for now: ${Array.from(new Set(packet.projectionBoundary.storeOnlyForNow)).join(', ')}`);
  lines.push(`- Rule: ${packet.projectionBoundary.rule}`);

  lines.push('', '## Approval Boundary', '');
  lines.push(`- Can normalize dry-run now: ${packet.approvalBoundary.canNormalizeDryRunNow}`);
  lines.push(`- Can append to ledger now: ${packet.approvalBoundary.canAppendToLedgerNow}`);
  lines.push(`- Can assign MailerLite groups now: ${packet.approvalBoundary.canAssignMailerLiteGroupsNow}`);
  lines.push(`- Can touch Onboarding v1 now: ${packet.approvalBoundary.canTouchOnboardingV1Now}`);
  lines.push(`- Can use Onboarding v2 workflow now: ${packet.approvalBoundary.canUseOnboardingV2WorkflowNow}`);
  lines.push(`- Append requires: ${packet.approvalBoundary.appendRequires}`);
  lines.push('- Still forbidden:');
  for (const item of packet.approvalBoundary.stillForbidden) lines.push(`  - ${item}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push(
    '',
    '## Seguridad',
    '',
    '- Local-only.',
    '- Sin append al Signal Event Ledger.',
    '- Sin card writes.',
    '- Sin Fact Store writes.',
    '- Sin scoring mutation.',
    '- Sin MailerLite/Shopify/CRM live API calls.',
    '- Sin subscriber rows o mutaciones.',
    '- Sin grupos creados.',
    '- Sin workflows/forms/envios.',
    '- Sin tocar Onboarding v1.',
    '- Sin outbound.',
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
  const [designPacket, v1Audit, executionPacket, firstEmailMapping, sourceDigests] = await Promise.all([
    readJson(options.designPacket),
    readJson(options.v1Audit),
    readJson(options.executionPacket),
    readJson(options.firstEmailMapping),
    loadSourceDigests(options),
  ]);
  return buildEventContractPacket({
    designPacket,
    v1Audit,
    executionPacket,
    firstEmailMapping,
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
    v1Workflow: packet.model.currentV1.workflowName,
    eventKinds: packet.normalizationProof.eventKinds,
    eventsGenerated: packet.normalizationProof.summary.eventsGenerated,
    skippedRecords: packet.normalizationProof.summary.skippedRecords,
    openLiveGateCount: 0,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 event contract failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEventContract,
  buildEventContractPacket,
  buildOnboardingModel,
  buildSampleEvents,
  parseArgs,
  renderMarkdown,
};
