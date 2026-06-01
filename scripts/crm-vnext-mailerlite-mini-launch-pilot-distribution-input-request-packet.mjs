#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-pilot-distribution-input-request-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_strategy_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_input_request_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_input_request_packet_current_inteligencia_descansar_2026-06-01.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-input-request-packet.mjs [options]

Options:
  --pilot-distribution-strategy-packet <path>     Pilot distribution strategy JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET}
  --public-send-preflight-decision-packet <path> Public send preflight decision JSON. Defaults to ${DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET}
  --public-audience-scope-packet <path>          Public audience scope JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --out <path>                                   Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                          Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                         Show this help

Local-only pilot distribution input request packet for the Inteligencia para
descansar mini-launch. It turns the strategy-only boundary into explicit
next inputs: keep Null Audience, prepare a manual micro-cohort, or prepare an
opt-in tester roster. It never asks for a send approval phrase, calls live APIs,
opens UI, reads or mutates subscribers, assigns groups, publishes, schedules or
sends campaigns, touches Shopify or CRM live systems, appends ledgers, writes
cards/scoring, writes Fact Store, or prints secrets, raw IDs, exact URLs or
recipients.`;

const parseArgs = (argv) => {
  const options = {
    pilotDistributionStrategyPacket: DEFAULT_PILOT_DISTRIBUTION_STRATEGY_PACKET,
    publicSendPreflightDecisionPacket: DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET,
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--pilot-distribution-strategy-packet') {
      options.pilotDistributionStrategyPacket = argv[++index];
    } else if (arg === '--public-send-preflight-decision-packet') {
      options.publicSendPreflightDecisionPacket = argv[++index];
    } else if (arg === '--public-audience-scope-packet') {
      options.publicAudienceScopePacket = argv[++index];
    } else if (arg === '--out') {
      options.out = argv[++index];
    } else if (arg === '--markdown-out') {
      options.markdownOut = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      private: false,
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
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false));

const optionById = (scopePacket, id) =>
  (scopePacket?.audienceScopeOptions ?? []).find((option) => option?.id === id) ?? null;

const buildInputRequest = ({
  id,
  label,
  target,
  recommendedNow,
  acceptableForm,
  privacy,
  why,
  wouldAuthorizeLiveAction = false,
  wouldAuthorizeAudienceAssignment = false,
  wouldAuthorizeSend = false,
  blockers = [],
  nextLocalOnlyStep,
}) => ({
  id,
  label,
  target,
  recommendedNow,
  acceptableForm,
  privacy,
  why,
  asksForApprovalPhrase: false,
  wouldAuthorizeLiveAction,
  wouldAuthorizeAudienceAssignment,
  wouldAuthorizeSend,
  blockers,
  nextLocalOnlyStep,
});

const buildPilotDistributionInputRequestPacket = ({
  pilotDistributionStrategyPacket,
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const strategyReady =
    pilotDistributionStrategyPacket?.status === 'pilot_distribution_strategy_packet_ready_no_live_changes'
    && pilotDistributionStrategyPacket?.executiveSummary?.strategyDecisionReadyForExplanation === true
    && pilotDistributionStrategyPacket?.executiveSummary?.recommendedStrategyId ===
      'keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send'
    && pilotDistributionStrategyPacket?.executiveSummary?.canAskFinalSendApprovalNow === false
    && pilotDistributionStrategyPacket?.executiveSummary?.liveActionAllowedNow === false;
  const preflightAligned =
    publicSendPreflightDecisionPacket?.executiveSummary?.recommendedAudienceScopeId ===
      'keep_null_audience_no_public_send'
    && publicSendPreflightDecisionPacket?.executiveSummary?.massSubscriberSendRecommendedNow === false
    && publicSendPreflightDecisionPacket?.executiveSummary?.exactApprovalPhraseAvailable === false
    && publicSendPreflightDecisionPacket?.executiveSummary?.canExecuteNow === false;
  const scopeAligned =
    publicAudienceScopePacket?.executiveSummary?.recommendedDefaultNow === 'keep_null_audience_no_public_send'
    && publicAudienceScopePacket?.executiveSummary?.currentDraftsRemainInertUntilExactApproval === true;
  const blockersBeforeInputRequestReady = [
    strategyReady ? null : 'pilot_distribution_strategy_not_ready',
    preflightAligned ? null : 'public_send_preflight_not_pilot_aligned',
    scopeAligned ? null : 'public_audience_scope_not_pilot_aligned',
  ].filter(Boolean);
  const inputRequestReady = blockersBeforeInputRequestReady.length === 0;
  const launch = pilotDistributionStrategyPacket?.launch
    ?? publicSendPreflightDecisionPacket?.launch
    ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    };
  const nullAudienceOption = optionById(publicAudienceScopePacket, 'keep_null_audience_no_public_send');
  const microCohortOption = optionById(publicAudienceScopePacket, 'manual_micro_cohort');
  const optInOption = optionById(publicAudienceScopePacket, 'opt_in_testers');
  const existingAudienceOption = optionById(
    publicAudienceScopePacket,
    'existing_legacy_onboarding_complete_campaign_audience',
  );

  const inputRequests = [
    buildInputRequest({
      id: 'pilot_lane_strategy_decision',
      label: 'Choose pilot learning lane',
      target: 'strategy_decision_only',
      recommendedNow: inputRequestReady,
      acceptableForm:
        'one of keep_null_audience_no_public_send, manual_micro_cohort_next, opt_in_testers_next; not a send approval',
      privacy: 'non_private_strategy_choice',
      why:
        'The system needs to know whether to keep the launch inert, prepare exact micro-cohort evidence, or prepare opt-in tester evidence before any later send packet.',
      nextLocalOnlyStep: 'regenerate this packet and the current-state refresh after the lane choice is recorded locally',
    }),
    buildInputRequest({
      id: 'manual_micro_cohort_candidate_roster',
      label: 'Manual micro-cohort candidate roster',
      target: 'private_or_internal_roster',
      recommendedNow: false,
      acceptableForm:
        'small exact list of people or subscriber identities selected by Alejandro/operator, with why each person belongs in the pilot',
      privacy: 'private_or_internal_evidence',
      why:
        'This lane tests resonance with a deliberately small human-selected group instead of treating the full active list as the first market.',
      blockers: microCohortOption == null ? ['manual_micro_cohort_option_missing'] : ['exact_people_missing'],
      nextLocalOnlyStep: 'prepare a future scoped micro-cohort preflight packet; do not assign audiences or send',
    }),
    buildInputRequest({
      id: 'opt_in_tester_roster',
      label: 'Explicit opt-in tester roster',
      target: 'private_or_internal_roster',
      recommendedNow: false,
      acceptableForm:
        'list of people who explicitly opted into this pilot/test, with evidence of opt-in source and suppression-safe identity',
      privacy: 'private_or_internal_evidence',
      why:
        'This lane keeps the first real exposure consensual and clean while the launch machine is still being proven.',
      blockers: optInOption == null ? ['opt_in_testers_option_missing'] : ['opt_in_tester_roster_missing'],
      nextLocalOnlyStep: 'prepare a future scoped opt-in tester preflight packet; do not assign audiences or send',
    }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_pilot_distribution_input_request_packet',
    generatedAt,
    ok: true,
    status: inputRequestReady
      ? 'pilot_distribution_input_request_packet_ready_no_live_changes'
      : 'pilot_distribution_input_request_packet_blocked_missing_evidence_no_live_changes',
    launch,
    executiveSummary: {
      inputRequestReady,
      strategyReady,
      preflightAligned,
      scopeAligned,
      canAskPilotLaneDecisionNow: inputRequestReady,
      canAskFinalSendApprovalNow: false,
      exactApprovalPhraseAvailable: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      currentDefault: 'keep_null_audience_no_public_send',
      currentDefaultKnownActiveCount: nullAudienceOption?.knownActiveCount ?? 0,
      recommendedDecisionKind: 'strategy_input_only_no_send',
      recommendedDecisionOptions: [
        'keep_null_audience_no_public_send',
        'manual_micro_cohort_next',
        'opt_in_testers_next',
      ],
      recommendedNextIfNoHumanRoster: 'keep_null_audience_no_public_send',
      recommendedNextLearningLanes: ['manual_micro_cohort_next', 'opt_in_testers_next'],
      broadActiveSubscriberSendRecommendedNow: false,
      existingActiveSubscriberAudienceFutureOnly: true,
      existingActiveSubscriberAudienceKnownActiveCount: existingAudienceOption?.knownActiveCount ?? null,
      inputRequestCount: inputRequests.length,
      blockerCount: blockersBeforeInputRequestReady.length,
      nextSafeAction: inputRequestReady
        ? 'Ask for a strategy-only lane decision or collect a private pilot roster; do not ask for a send approval phrase.'
        : 'Regenerate pilot distribution evidence before asking for a lane decision.',
    },
    inputRequests,
    requestedHumanText: {
      purpose: 'strategy_only_no_send',
      safeQuestion:
        'Para el siguiente aprendizaje real, elige solo la estrategia: mantener Null Audience, preparar micro-cohorte manual o preparar opt-in testers. Esto no aprueba envio ni asignacion de audiencia.',
      notApprovalFor: [
        'MailerLite send',
        'audience assignment',
        'subscriber/group/segment mutation',
        'workflow or automation change',
        'Shopify live publish or navigation',
        'CRM write',
        'Signal Ledger append',
        'card or scoring write',
        'Fact Store write',
      ],
    },
    blockersBeforeInputRequestReady,
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.pilotDistributionStrategyPacket, 'strategy-only pilot distribution boundary'),
    readJsonWithDigest(options.publicSendPreflightDecisionPacket, 'pilot-aligned public send preflight boundary'),
    readJsonWithDigest(options.publicAudienceScopePacket, 'Null Audience, micro-cohort and opt-in tester options'),
  ]);

  return buildPilotDistributionInputRequestPacket({
    pilotDistributionStrategyPacket: sources[0].value,
    publicSendPreflightDecisionPacket: sources[1].value,
    publicAudienceScopePacket: sources[2].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Pilot Distribution Input Request Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Input request ready: ${report.executiveSummary.inputRequestReady}`,
  `- Can ask pilot lane decision now: ${report.executiveSummary.canAskPilotLaneDecisionNow}`,
  `- Can ask final send approval now: ${report.executiveSummary.canAskFinalSendApprovalNow}`,
  `- Exact approval phrase available: ${report.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Current default: ${report.executiveSummary.currentDefault}`,
  `- Current default known active count: ${report.executiveSummary.currentDefaultKnownActiveCount}`,
  `- Recommended decision kind: ${report.executiveSummary.recommendedDecisionKind}`,
  `- Recommended decision options: ${report.executiveSummary.recommendedDecisionOptions.join(', ')}`,
  `- Recommended next if no human roster: ${report.executiveSummary.recommendedNextIfNoHumanRoster}`,
  `- Recommended next learning lanes: ${report.executiveSummary.recommendedNextLearningLanes.join(', ')}`,
  `- Broad active subscriber send recommended now: ${report.executiveSummary.broadActiveSubscriberSendRecommendedNow}`,
  `- Existing active subscriber audience future only: ${report.executiveSummary.existingActiveSubscriberAudienceFutureOnly}`,
  `- Existing active subscriber audience known active count: ${report.executiveSummary.existingActiveSubscriberAudienceKnownActiveCount}`,
  `- Input request count: ${report.executiveSummary.inputRequestCount}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Input Requests',
  '',
  renderList(report.inputRequests.map((request) =>
    `${request.id}: recommendedNow=${request.recommendedNow}; target=${request.target}; asksForApprovalPhrase=${request.asksForApprovalPhrase}; wouldAuthorizeSend=${request.wouldAuthorizeSend}; blockers=${request.blockers.join('|') || 'none'}`)),
  '',
  '## Safe Human Text',
  '',
  report.requestedHumanText.safeQuestion,
  '',
  '## Not Approval For',
  '',
  renderList(report.requestedHumanText.notApprovalFor),
  '',
  '## Blockers Before Input Request Ready',
  '',
  renderList(report.blockersBeforeInputRequestReady),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Subscriber rows printed: ${report.safety.subscriberRowsPrinted}`,
  `- Subscriber mutations performed: ${report.safety.subscriberMutationsPerformed}`,
  `- Group mutations performed: ${report.safety.groupMutationsPerformed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Exact URLs printed: ${report.safety.exactUrlsPrinted}`,
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
    inputRequestReady: report.executiveSummary.inputRequestReady,
    canAskPilotLaneDecisionNow: report.executiveSummary.canAskPilotLaneDecisionNow,
    canAskFinalSendApprovalNow: report.executiveSummary.canAskFinalSendApprovalNow,
    currentDefault: report.executiveSummary.currentDefault,
    recommendedDecisionOptions: report.executiveSummary.recommendedDecisionOptions,
    broadActiveSubscriberSendRecommendedNow:
      report.executiveSummary.broadActiveSubscriberSendRecommendedNow,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch pilot distribution input request packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPilotDistributionInputRequestPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
