#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-rehearsal-protocol-packet-2026-06-03';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_DECISION_INTAKE =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_SIBO_REVIEW_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_STANDING_DELEGATION_POLICY =
  'docs/crm-vnext/launch-os-standing-delegation-policy.md';
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_launch_rehearsal_protocol_no_send_current_inteligencia_descansar_2026-06-03.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-rehearsal-protocol-packet.mjs [options]

Options:
  --decision-intake <path>             Strategy decision intake JSON. Defaults to ${DEFAULT_DECISION_INTAKE}
  --sibo-review-packet <path>          SIBO review packet JSON. Defaults to ${DEFAULT_SIBO_REVIEW_PACKET}
  --standing-delegation-policy <path>  Standing delegation policy markdown. Defaults to ${DEFAULT_STANDING_DELEGATION_POLICY}
  --out <path>                         Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                               Show this help

Local-only Launch Rehearsal Protocol packet for the Inteligencia para descansar
no-send lane. It defines a repeatable seed/internal rehearsal circuit and next
approval boundaries. It does not call live APIs, open UI, send emails, publish,
schedule, assign audiences, mutate subscribers/groups/workflows, touch Shopify
or CRM live systems, append ledgers, write cards/scoring, write Fact Store, or
print exact URLs, raw IDs, recipients or tokens.`;

const parseArgs = (argv) => {
  const options = {
    decisionIntake: DEFAULT_DECISION_INTAKE,
    siboReviewPacket: DEFAULT_SIBO_REVIEW_PACKET,
    standingDelegationPolicy: DEFAULT_STANDING_DELEGATION_POLICY,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--decision-intake') options.decisionIntake = argv[++index];
    else if (arg === '--sibo-review-packet') options.siboReviewPacket = argv[++index];
    else if (arg === '--standing-delegation-policy') options.standingDelegationPolicy = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readTextWithDigest = async (path, consultedFor, { parseJson = false, privateSource = false } = {}) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: parseJson ? JSON.parse(raw) : raw,
    digest: {
      path: resolved,
      present: true,
      private: privateSource,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  mailerLiteUiUsed: false,
  mailerLiteMutationsPerformed: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  shopifyPublishPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  segmentMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  audienceAssignmentPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
  publicAudienceSendAuthorized: false,
});

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false));

const buildStages = () => [
  {
    id: 'ceo_sibo_review_closed',
    label: 'CEO/SIBO review closed',
    status: 'complete',
    purpose: 'Use the CEO-facing packet as the reviewed source of truth before rehearsal.',
    allowedAction: 'local evidence readback only',
    stopCondition: 'stop if SIBO packet is not green or live gate status changes',
  },
  {
    id: 'rehearsal_preflight_refresh',
    label: 'Fresh rehearsal preflight',
    status: 'next_local_edge',
    purpose: 'Before any future seed/internal run, refresh draft, Null Audience, placeholder and link QA.',
    allowedAction: 'read-only API/local QA and receipt generation',
    stopCondition: 'stop if any delegated seed-test condition fails',
  },
  {
    id: 'delegated_seed_test_if_green',
    label: 'Delegated seed test if green',
    status: 'conditional_future_edge',
    purpose: 'Send only to approved seed recipients under standing delegation after fresh QA is green.',
    allowedAction: 'UI test email to allowlisted seed recipient only',
    stopCondition: 'stop if recipient is not allowlisted or operation becomes audience send',
  },
  {
    id: 'seed_inbox_readback',
    label: 'Seed inbox readback',
    status: 'future_read_only_edge',
    purpose: 'Verify received rendering, links, footer hierarchy and raw URL/token hygiene.',
    allowedAction: 'restricted read-only seed inbox QA',
    stopCondition: 'stop if inbox route would inspect unrelated messages or mutate mailbox',
  },
  {
    id: 'learning_digest',
    label: 'Learning digest',
    status: 'future_local_edge',
    purpose: 'Summarize what the rehearsal proves for Launch OS v0 and future microproducts.',
    allowedAction: 'local report/digest only',
    stopCondition: 'stop if the digest would write CRM, ledgers, cards, scoring or Fact Store',
  },
  {
    id: 'next_ceo_boundary',
    label: 'Next CEO boundary',
    status: 'future_human_edge',
    purpose: 'Choose whether to keep rehearsing, prepare micro-cohort, prepare opt-in testers, or stop.',
    allowedAction: 'decision packet only',
    stopCondition: 'stop before public/audience send or real-person distribution approval',
  },
];

const buildRehearsalProtocolPacket = ({
  decisionIntake,
  siboReviewPacket,
  standingDelegationPolicyDigest,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const intakeReady =
    decisionIntake?.status === 'pilot_distribution_decision_intake_lane_selected_no_live_changes'
    && decisionIntake?.executiveSummary?.selectedPilotLane === 'keep_null_audience_no_public_send'
    && decisionIntake?.executiveSummary?.laneDecisionReady === true
    && decisionIntake?.executiveSummary?.rosterRequiredNext === false
    && decisionIntake?.executiveSummary?.canAskFinalSendApprovalNow === false
    && decisionIntake?.executiveSummary?.liveActionAllowedNow === false
    && decisionIntake?.executiveSummary?.wouldAuthorizeSend === false
    && (decisionIntake?.executiveSummary?.blockerCount ?? 0) === 0;
  const siboReady =
    siboReviewPacket?.status === 'sibo_review_packet_no_send_ready_no_live_changes'
    && siboReviewPacket?.executiveSummary?.reviewPacketReady === true
    && siboReviewPacket?.executiveSummary?.recommendedStrategyChoice === 'keep_null_audience_no_public_send'
    && siboReviewPacket?.executiveSummary?.liveActionAllowedNow === false
    && siboReviewPacket?.executiveSummary?.wouldAuthorizeSend === false
    && (siboReviewPacket?.executiveSummary?.blockerCount ?? 0) === 0;
  const standingDelegationRecorded =
    Boolean(standingDelegationPolicyDigest?.present)
    && (standingDelegationPolicyDigest?.chars ?? 0) > 0;
  const blockers = [
    intakeReady ? null : 'decision_intake_not_no_send_ready',
    siboReady ? null : 'sibo_review_packet_not_no_send_ready',
    standingDelegationRecorded ? null : 'standing_delegation_policy_missing',
    safetyClosed(safety) ? null : 'safety_not_closed',
  ].filter(Boolean);
  const protocolReady = blockers.length === 0;
  const launch = decisionIntake?.launch ?? siboReviewPacket?.launch ?? {
    launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
    resourceName: 'Inteligencia para descansar',
    resourceType: 'quiz',
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_launch_rehearsal_protocol_no_send',
    generatedAt,
    ok: true,
    status: protocolReady
      ? 'launch_rehearsal_protocol_no_send_ready_local_only'
      : 'launch_rehearsal_protocol_no_send_blocked_missing_evidence_local_only',
    launch,
    executiveSummary: {
      protocolReady,
      selectedPilotLane: decisionIntake?.executiveSummary?.selectedPilotLane ?? null,
      decisionIntakeReady: intakeReady,
      siboReviewReady: siboReady,
      standingDelegationRecorded,
      standingSeedTestDelegationAvailable: standingDelegationRecorded,
      firstRunCanSendNow: false,
      freshPreflightRequiredBeforeAnySeedSend: true,
      publicAudienceSendAuthorized: false,
      canAskFinalSendApprovalNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSubscriberMutation: false,
      wouldAuthorizeShopifyMutation: false,
      wouldAuthorizeCrmWrite: false,
      blockerCount: blockers.length,
      blockers,
      nextSafeAction: protocolReady
        ? 'Prepare a fresh rehearsal preflight packet before any delegated seed/internal run.'
        : 'Resolve local evidence blockers before using this protocol.',
    },
    protocol: {
      posture: 'rehearsal_control_plane_no_real_person_distribution',
      targetUse:
        'Keep this microproduct useful for Launch OS v0 operating rehearsal while avoiding public/audience send and real-person distribution.',
      stages: buildStages(),
      approvedSeedRecipientPolicy:
        'Seed/test emails are permitted only under the standing delegation policy after fresh QA; this protocol itself does not send.',
      requiredEvidenceBeforeDelegatedSeedRun: [
        'fresh draft status readback',
        'Null Audience exclusivity',
        'Null Audience active_count=0',
        'approved seed recipient check',
        'placeholder/token/raw URL scan',
        'publish/schedule/workflow/audience-send negative checks',
        'local preflight receipt',
      ],
      rehearsalOutputs: [
        'fresh preflight receipt',
        'delegated seed-test receipt only if a seed run occurs',
        'restricted seed inbox readback QA packet',
        'SIBO/CEO learning digest',
        'next boundary packet',
      ],
    },
    notApprovalFor: [
      'MailerLite send by this protocol packet',
      'public/audience send',
      'audience assignment',
      'subscriber/group/segment mutation',
      'workflow or automation change',
      'Shopify live publish or navigation',
      'CRM write',
      'Signal Ledger append',
      'card or scoring write',
      'Fact Store write',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readTextWithDigest(options.decisionIntake, 'strategy-only no-send decision intake', { parseJson: true }),
    readTextWithDigest(options.siboReviewPacket, 'SIBO no-send review evidence', { parseJson: true }),
    readTextWithDigest(options.standingDelegationPolicy, 'standing seed-test delegation policy'),
  ]);

  return buildRehearsalProtocolPacket({
    decisionIntake: sources[0].value,
    siboReviewPacket: sources[1].value,
    standingDelegationPolicyDigest: sources[2].digest,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# Launch Rehearsal Protocol No-Send',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Protocol ready: ${report.executiveSummary.protocolReady}`,
  `- Selected pilot lane: ${report.executiveSummary.selectedPilotLane}`,
  `- Decision intake ready: ${report.executiveSummary.decisionIntakeReady}`,
  `- SIBO review ready: ${report.executiveSummary.siboReviewReady}`,
  `- Standing delegation recorded: ${report.executiveSummary.standingDelegationRecorded}`,
  `- Standing seed-test delegation available: ${report.executiveSummary.standingSeedTestDelegationAvailable}`,
  `- First run can send now: ${report.executiveSummary.firstRunCanSendNow}`,
  `- Fresh preflight required before any seed send: ${report.executiveSummary.freshPreflightRequiredBeforeAnySeedSend}`,
  `- Public/audience send authorized: ${report.executiveSummary.publicAudienceSendAuthorized}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Would authorize send: ${report.executiveSummary.wouldAuthorizeSend}`,
  `- Would authorize audience assignment: ${report.executiveSummary.wouldAuthorizeAudienceAssignment}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Protocol Posture',
  '',
  report.protocol.posture,
  '',
  report.protocol.targetUse,
  '',
  '## Stages',
  '',
  renderList(report.protocol.stages.map((stage) =>
    `${stage.id}: ${stage.status}; allowed=${stage.allowedAction}; stop=${stage.stopCondition}`
  )),
  '',
  '## Required Evidence Before Delegated Seed Run',
  '',
  renderList(report.protocol.requiredEvidenceBeforeDelegatedSeedRun),
  '',
  '## Rehearsal Outputs',
  '',
  renderList(report.protocol.rehearsalOutputs),
  '',
  '## Not Approval For',
  '',
  renderList(report.notApprovalFor),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Public/audience send authorized: ${report.safety.publicAudienceSendAuthorized}`,
  `- Audience assignment performed: ${report.safety.audienceAssignmentPerformed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  `- Recipients printed: ${report.safety.recipientsPrinted}`,
  `- Tokens printed: ${report.safety.tokensPrinted}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await loadPacketFromFiles(options);
  if (!safetyClosed(report.safety)) throw new Error('safety_not_closed');

  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    protocolReady: report.executiveSummary.protocolReady,
    selectedPilotLane: report.executiveSummary.selectedPilotLane,
    firstRunCanSendNow: report.executiveSummary.firstRunCanSendNow,
    freshPreflightRequiredBeforeAnySeedSend: report.executiveSummary.freshPreflightRequiredBeforeAnySeedSend,
    publicAudienceSendAuthorized: report.executiveSummary.publicAudienceSendAuthorized,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch rehearsal protocol packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildRehearsalProtocolPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
