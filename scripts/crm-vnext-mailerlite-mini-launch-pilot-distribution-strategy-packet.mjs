#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-pilot-distribution-strategy-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_send_preflight_decision_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_CADENCE_BOARD =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_cadence_board_current_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_strategy_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_strategy_packet_current_inteligencia_descansar_2026-05-31.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-strategy-packet.mjs [options]

Options:
  --public-send-preflight-decision-packet <path>  Public send preflight decision JSON. Defaults to ${DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET}
  --public-audience-scope-packet <path>           Public audience scope JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --public-launch-readiness-packet <path>         Public launch readiness JSON. Defaults to ${DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET}
  --cadence-board <path>                          Current cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --out <path>                                    Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                           Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                          Show this help

Local-only pilot distribution strategy packet for the Inteligencia para
descansar mini-launch. It records the strategy boundary after seed QA:
keep Null Audience/no public send as the current default, use exact
micro-cohort or opt-in testers before any broad send, and keep active
subscriber audiences as a future-only option. It never calls MailerLite,
Shopify or CRM live APIs, opens UI, reads or mutates subscribers, assigns
groups, publishes, schedules or sends campaigns, appends ledgers, writes
cards/scoring, writes Fact Store, or prints secrets, raw IDs, recipients or
exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    publicSendPreflightDecisionPacket: DEFAULT_PUBLIC_SEND_PREFLIGHT_DECISION_PACKET,
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    publicLaunchReadinessPacket: DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET,
    cadenceBoard: DEFAULT_CADENCE_BOARD,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--public-send-preflight-decision-packet') {
      options.publicSendPreflightDecisionPacket = argv[++index];
    } else if (arg === '--public-audience-scope-packet') {
      options.publicAudienceScopePacket = argv[++index];
    } else if (arg === '--public-launch-readiness-packet') {
      options.publicLaunchReadinessPacket = argv[++index];
    } else if (arg === '--cadence-board') {
      options.cadenceBoard = argv[++index];
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

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
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
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        private: false,
        chars: 0,
        sha256: null,
        consultedFor,
      },
    };
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
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

const optionById = (scopePacket, id) =>
  (scopePacket?.audienceScopeOptions ?? []).find((option) => option?.id === id) ?? null;

const strategyOption = ({
  id,
  label,
  posture,
  recommendedNow,
  knownActiveCount = null,
  sourceOptionId = null,
  why,
  blockers = [],
  requiredBeforeUse = [],
}) => ({
  id,
  label,
  posture,
  recommendedNow,
  knownActiveCount,
  sourceOptionId,
  why,
  liveActionAllowedNow: false,
  audienceAssignmentAllowedNow: false,
  sendAllowedNow: false,
  blockers,
  requiredBeforeUse,
});

const buildPilotDistributionStrategyPacket = ({
  publicSendPreflightDecisionPacket,
  publicAudienceScopePacket,
  publicLaunchReadinessPacket,
  cadenceBoard = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const nullAudienceOption = optionById(publicAudienceScopePacket, 'keep_null_audience_no_public_send');
  const microCohortOption = optionById(publicAudienceScopePacket, 'manual_micro_cohort');
  const optInOption = optionById(publicAudienceScopePacket, 'opt_in_testers');
  const existingAudienceOption = optionById(
    publicAudienceScopePacket,
    'existing_legacy_onboarding_complete_campaign_audience',
  );
  const launch = publicSendPreflightDecisionPacket?.launch
    ?? publicLaunchReadinessPacket?.launch
    ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    };

  const preflightReady =
    publicSendPreflightDecisionPacket?.status ===
      'public_send_preflight_decision_packet_ready_for_human_explanation_no_live_changes'
    && publicSendPreflightDecisionPacket?.executiveSummary?.decisionExplanationReady === true
    && publicSendPreflightDecisionPacket?.executiveSummary?.recommendedAudienceScopeId ===
      'keep_null_audience_no_public_send'
    && publicSendPreflightDecisionPacket?.executiveSummary?.massSubscriberSendRecommendedNow === false
    && publicSendPreflightDecisionPacket?.executiveSummary?.existingActiveSubscriberAudienceFutureOptionOnly === true
    && publicSendPreflightDecisionPacket?.executiveSummary?.exactApprovalPhraseAvailable === false
    && publicSendPreflightDecisionPacket?.executiveSummary?.canExecuteNow === false;
  const audienceScopeAligned =
    publicAudienceScopePacket?.executiveSummary?.recommendedDefaultNow === 'keep_null_audience_no_public_send'
    && publicAudienceScopePacket?.executiveSummary?.currentDraftsRemainInertUntilExactApproval === true
    && nullAudienceOption != null
    && microCohortOption != null
    && optInOption != null
    && existingAudienceOption != null;
  const readinessAligned =
    publicLaunchReadinessPacket?.executiveSummary?.seedInboxQaGreen === true
    && publicLaunchReadinessPacket?.executiveSummary?.readyForExactPublicSendApproval === false
    && publicLaunchReadinessPacket?.executiveSummary?.liveActionAllowedNow === false;
  const cadenceAligned =
    cadenceBoard == null
    || (
      cadenceBoard?.operatingRhythm?.activeCadenceNow === 'weekly'
      && cadenceBoard?.operatingRhythm?.every3DaysStatus === 'designed_but_not_active'
    );
  const blockersBeforeStrategyReady = [
    preflightReady ? null : 'public_send_preflight_not_pilot_aligned',
    audienceScopeAligned ? null : 'audience_scope_packet_not_pilot_aligned',
    readinessAligned ? null : 'public_launch_readiness_not_closed',
    cadenceAligned ? null : 'cadence_board_not_aligned',
  ].filter(Boolean);
  const strategyDecisionReadyForExplanation = blockersBeforeStrategyReady.length === 0;

  const options = [
    strategyOption({
      id: 'keep_null_audience_no_public_send',
      label: 'Keep current replacement drafts inert on Null Audience',
      posture: 'selected_current_default',
      recommendedNow: true,
      knownActiveCount: nullAudienceOption?.knownActiveCount ?? 0,
      sourceOptionId: nullAudienceOption?.id ?? null,
      why: 'This preserves the green seed-tested drafts while the system learns and chooses the smallest responsible exposure.',
      blockers: [],
      requiredBeforeUse: ['none_for_current_safe_state'],
    }),
    strategyOption({
      id: 'manual_micro_cohort_next',
      label: 'Use a hand-picked exact micro-cohort before any broad send',
      posture: 'preferred_next_learning_lane_when_exact_people_exist',
      recommendedNow: false,
      knownActiveCount: microCohortOption?.knownActiveCount ?? null,
      sourceOptionId: microCohortOption?.id ?? null,
      why: 'A small explicit cohort can test resonance without treating the full active list as the first market.',
      blockers: ['exact_people_missing', 'exact_micro_cohort_scope_missing'],
      requiredBeforeUse: [
        'exact people/subscribers evidence',
        'fresh suppression/exclusion review for those people',
        'fresh draft and URL QA',
        'separate exact send approval',
      ],
    }),
    strategyOption({
      id: 'opt_in_testers_next',
      label: 'Use only people who explicitly opt into the pilot/test',
      posture: 'preferred_next_learning_lane_when_opt_in_roster_exists',
      recommendedNow: false,
      knownActiveCount: optInOption?.knownActiveCount ?? null,
      sourceOptionId: optInOption?.id ?? null,
      why: 'An opt-in roster keeps the experiment consensual and useful while the asset is still being learned.',
      blockers: ['opt_in_tester_roster_missing'],
      requiredBeforeUse: [
        'explicit opt-in tester list',
        'fresh suppression/exclusion review for those people',
        'fresh draft and URL QA',
        'separate exact send approval',
      ],
    }),
    strategyOption({
      id: 'broad_existing_active_subscribers_future_only',
      label: 'Treat existing active subscribers as a later campaign option only',
      posture: 'future_option_requires_separate_campaign_strategy_gate',
      recommendedNow: false,
      knownActiveCount: existingAudienceOption?.knownActiveCount ?? null,
      sourceOptionId: existingAudienceOption?.id ?? null,
      why: 'The active list is valuable relationship capital; it should not be the default audience for a pilot experiment.',
      blockers: [
        'campaign_strategy_gate_missing',
        'broad_send_value_risk_rationale_missing',
        'public_audience_send_url_gate_not_ready',
        'exact_public_send_approval_missing',
      ],
      requiredBeforeUse: [
        'separate campaign strategy gate',
        'exact value proposition and segment rationale',
        'fresh audience and suppression scan',
        'fresh public/audience URL gate',
        'separate exact public-send approval',
      ],
    }),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_pilot_distribution_strategy_packet',
    generatedAt,
    ok: true,
    status: strategyDecisionReadyForExplanation
      ? 'pilot_distribution_strategy_packet_ready_no_live_changes'
      : 'pilot_distribution_strategy_packet_blocked_missing_evidence_no_live_changes',
    launch,
    executiveSummary: {
      strategyPacketReady: strategyDecisionReadyForExplanation,
      strategyDecisionReadyForExplanation,
      exactApprovalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      finalSendPhraseAvailable: false,
      canAskFinalSendApprovalNow: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      recommendedStrategyId: 'keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send',
      currentDefault: 'keep_null_audience_no_public_send',
      currentDefaultKnownActiveCount: nullAudienceOption?.knownActiveCount ?? 0,
      nextLearningLanes: ['manual_micro_cohort_next', 'opt_in_testers_next'],
      broadActiveSubscriberSendRecommendedNow: false,
      existingActiveSubscriberAudienceFutureOnly: true,
      existingActiveSubscriberAudienceKnownActiveCount: existingAudienceOption?.knownActiveCount ?? null,
      every3DaysCadenceActiveNow: false,
      blockerCount: blockersBeforeStrategyReady.length,
      nextSafeAction: strategyDecisionReadyForExplanation
        ? 'Use this packet to explain the pilot distribution strategy; do not request a final send phrase or audience assignment.'
        : 'Regenerate aligned preflight, audience scope and readiness evidence before explaining a pilot strategy decision.',
    },
    strategyOptions: options,
    decisionRecordTemplate: {
      decisionId: 'pilot_distribution_strategy_decision_inteligencia_descansar',
      decisionKind: 'strategy_only_no_send',
      recommendedValue: 'keep_null_audience_then_micro_cohort_or_opt_in_before_broad_send',
      wouldAuthorizeLiveAction: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeSubscriberMutation: false,
      wouldAuthorizeShopifyMutation: false,
      wouldAuthorizeCrmWrite: false,
      notesRequiredBeforeFutureExecution: [
        'Select exact micro-cohort or explicit opt-in roster before any audience assignment.',
        'Keep broad existing-subscriber send behind a separate campaign strategy gate.',
        'Generate a fresh exact approval packet only after strategy, roster, URL gate and QA are all green.',
      ],
    },
    blockedLiveBoundaries: [
      'MailerLite audience assignment',
      'public_or_audience_send',
      'mass_subscriber_or_existing_active_audience_send',
      'workflow_or_automation_changes',
      'subscriber_import_update_or_suppression_mutation',
      'group_or_segment_creation_assignment',
      'Shopify navigation or SEO publication',
      'CRM live writes',
      'Signal Ledger append',
      'card or scoring writes',
      'Fact Store writes',
    ],
    blockersBeforeStrategyReady,
    hardStops: [
      'No approval phrase is generated by this packet.',
      'No MailerLite audience assignment, public send, publish or schedule.',
      'No subscriber, group, segment, suppression, workflow or automation mutation.',
      'No Shopify navigation, SEO or theme publish change.',
      'No CRM live API write, Signal Ledger append, card/scoring write or Fact Store write.',
      'Do not print exact URLs, recipients, raw IDs or tokens.',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.publicSendPreflightDecisionPacket, 'pilot-aligned public send preflight strategy boundary'),
    readJsonWithDigest(options.publicAudienceScopePacket, 'Null Audience default, micro-cohort and opt-in tester options'),
    readJsonWithDigest(options.publicLaunchReadinessPacket, 'current public launch readiness closure state'),
    readOptionalJsonWithDigest(options.cadenceBoard, 'weekly vs every-3-days cadence posture'),
  ]);

  return buildPilotDistributionStrategyPacket({
    publicSendPreflightDecisionPacket: sources[0].value,
    publicAudienceScopePacket: sources[1].value,
    publicLaunchReadinessPacket: sources[2].value,
    cadenceBoard: sources[3].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Pilot Distribution Strategy Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Strategy packet ready: ${report.executiveSummary.strategyPacketReady}`,
  `- Strategy decision ready for explanation: ${report.executiveSummary.strategyDecisionReadyForExplanation}`,
  `- Exact approval phrase available: ${report.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Final send phrase available: ${report.executiveSummary.finalSendPhraseAvailable}`,
  `- Can ask final send approval now: ${report.executiveSummary.canAskFinalSendApprovalNow}`,
  `- Can execute now: ${report.executiveSummary.canExecuteNow}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Recommended strategy: ${report.executiveSummary.recommendedStrategyId}`,
  `- Current default: ${report.executiveSummary.currentDefault}`,
  `- Current default known active count: ${report.executiveSummary.currentDefaultKnownActiveCount}`,
  `- Next learning lanes: ${report.executiveSummary.nextLearningLanes.join(', ')}`,
  `- Broad active subscriber send recommended now: ${report.executiveSummary.broadActiveSubscriberSendRecommendedNow}`,
  `- Existing active subscriber audience future only: ${report.executiveSummary.existingActiveSubscriberAudienceFutureOnly}`,
  `- Existing active subscriber audience known active count: ${report.executiveSummary.existingActiveSubscriberAudienceKnownActiveCount}`,
  `- Every-3-days cadence active now: ${report.executiveSummary.every3DaysCadenceActiveNow}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Strategy Options',
  '',
  renderList(report.strategyOptions.map((option) =>
    `${option.id}: ${option.posture}; recommendedNow=${option.recommendedNow}; knownActiveCount=${option.knownActiveCount ?? 'unknown'}; blockers=${option.blockers.join('|') || 'none'}`)),
  '',
  '## Decision Record Template',
  '',
  `- Decision id: ${report.decisionRecordTemplate.decisionId}`,
  `- Decision kind: ${report.decisionRecordTemplate.decisionKind}`,
  `- Recommended value: ${report.decisionRecordTemplate.recommendedValue}`,
  `- Would authorize live action: ${report.decisionRecordTemplate.wouldAuthorizeLiveAction}`,
  `- Would authorize audience assignment: ${report.decisionRecordTemplate.wouldAuthorizeAudienceAssignment}`,
  `- Would authorize send: ${report.decisionRecordTemplate.wouldAuthorizeSend}`,
  `- Would authorize CRM write: ${report.decisionRecordTemplate.wouldAuthorizeCrmWrite}`,
  '',
  '## Blocked Live Boundaries',
  '',
  renderList(report.blockedLiveBoundaries),
  '',
  '## Blockers Before Strategy Ready',
  '',
  renderList(report.blockersBeforeStrategyReady),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
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
  `- Raw IDs printed: ${report.safety.rawIdsPrinted}`,
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
  if (!Object.entries(report.safety)
    .every(([key, value]) => key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false)) {
    throw new Error('safety_not_closed');
  }

  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    strategyPacketReady: report.executiveSummary.strategyPacketReady,
    recommendedStrategyId: report.executiveSummary.recommendedStrategyId,
    currentDefault: report.executiveSummary.currentDefault,
    nextLearningLanes: report.executiveSummary.nextLearningLanes,
    broadActiveSubscriberSendRecommendedNow:
      report.executiveSummary.broadActiveSubscriberSendRecommendedNow,
    finalSendPhraseAvailable: report.executiveSummary.finalSendPhraseAvailable,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch pilot distribution strategy packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPilotDistributionStrategyPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
