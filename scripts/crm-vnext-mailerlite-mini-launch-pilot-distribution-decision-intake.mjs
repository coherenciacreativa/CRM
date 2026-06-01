#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-intake-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_INPUT_REQUEST_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_input_request_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-01.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-pilot-distribution-decision-intake.mjs [options]

Options:
  --input-request-packet <path>  Pilot distribution input request JSON. Defaults to ${DEFAULT_INPUT_REQUEST_PACKET}
  --decision-text <text>         Optional strategy-only human lane decision
  --decision-file <path>         Optional file with strategy-only human lane decision
  --out <path>                   Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>          Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                         Show this help

Local-only strategy decision intake for the Inteligencia para descansar pilot
distribution lane. It can accept keep Null Audience, manual micro-cohort, or
opt-in testers as a strategy choice. It is never a send approval phrase, never
assigns an audience, never reads or mutates subscribers, never calls live APIs,
never opens UI, never publishes, schedules or sends campaigns, never touches
Shopify or CRM live systems, never appends ledgers, writes cards/scoring, writes
Fact Store, or prints the raw human decision text.`;

const ALLOWED_LANES = [
  'keep_null_audience_no_public_send',
  'manual_micro_cohort_next',
  'opt_in_testers_next',
];

const LANE_ALIASES = {
  keep_null_audience_no_public_send: [
    'keep_null_audience_no_public_send',
    'keep null audience',
    'mantener null audience',
    'null audience',
    'no public send',
    'sin envio publico',
    'sin envio',
    'mantener sin envio',
  ],
  manual_micro_cohort_next: [
    'manual_micro_cohort_next',
    'manual micro cohort',
    'manual micro-cohort',
    'micro cohort',
    'micro-cohort',
    'micro cohorte',
    'micro-cohorte',
    'micro cohorte manual',
    'micro-cohorte manual',
  ],
  opt_in_testers_next: [
    'opt_in_testers_next',
    'opt in testers',
    'opt-in testers',
    'testers opt in',
    'testers opt-in',
    'opt in',
    'opt-in',
    'probadores opt in',
    'probadores opt-in',
  ],
};

const parseArgs = (argv) => {
  const options = {
    inputRequestPacket: DEFAULT_INPUT_REQUEST_PACKET,
    decisionText: null,
    decisionFile: null,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--input-request-packet') options.inputRequestPacket = argv[++index];
    else if (arg === '--decision-text') options.decisionText = argv[++index];
    else if (arg === '--decision-file') options.decisionFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (options.decisionText && options.decisionFile) {
    throw new Error('decision_text_and_file_are_mutually_exclusive');
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readText = async (path) => readFile(resolve(path), 'utf8');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readText(resolved);
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

const readDecisionSource = async ({ decisionText, decisionFile }) => {
  if (decisionFile) {
    const resolved = resolve(decisionFile);
    const raw = await readText(resolved);
    return {
      source: 'file',
      raw,
      sourceStatus: {
        path: resolved,
        present: true,
        private: true,
        chars: raw.length,
        sha256: sha256(raw),
        consultedFor: 'strategy-only pilot distribution lane decision; raw text not printed',
      },
    };
  }
  if (decisionText) {
    return {
      source: 'cli_text',
      raw: decisionText,
      sourceStatus: {
        path: null,
        present: true,
        private: true,
        chars: decisionText.length,
        sha256: sha256(decisionText),
        consultedFor: 'strategy-only pilot distribution lane decision; raw text not printed',
      },
    };
  }
  return {
    source: 'none',
    raw: null,
    sourceStatus: {
      path: null,
      present: false,
      private: true,
      chars: 0,
      sha256: null,
      consultedFor: 'strategy-only pilot distribution lane decision; no decision supplied',
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  decisionTextPrinted: false,
  exactApprovalPhrasePrinted: false,
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
  liveApprovalGrantedByIntake: false,
});

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false));

const normalizeDecisionText = (value) => {
  if (typeof value !== 'string') return null;
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase()
    .replace(/[_-]+/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim() || null;
};

const normalizeAlias = (value) => normalizeDecisionText(value);

const detectLane = (rawDecision) => {
  const normalized = normalizeDecisionText(rawDecision);
  if (!normalized) {
    return {
      normalizedProvided: false,
      matchedLaneIds: [],
      selectedLaneId: null,
      valid: false,
      ambiguous: false,
    };
  }

  const matchedLaneIds = ALLOWED_LANES.filter((laneId) =>
    LANE_ALIASES[laneId].some((alias) => normalized.includes(normalizeAlias(alias)))
  );

  return {
    normalizedProvided: true,
    matchedLaneIds,
    selectedLaneId: matchedLaneIds.length === 1 ? matchedLaneIds[0] : null,
    valid: matchedLaneIds.length === 1,
    ambiguous: matchedLaneIds.length > 1,
  };
};

const laneLabel = (laneId) => ({
  keep_null_audience_no_public_send: 'Keep Null Audience / no public send',
  manual_micro_cohort_next: 'Prepare manual micro-cohort',
  opt_in_testers_next: 'Prepare explicit opt-in testers',
}[laneId] ?? 'Unknown lane');

const laneNextStep = (laneId) => ({
  keep_null_audience_no_public_send:
    'Keep the four Null Audience replacement drafts inert and continue local-only readiness work.',
  manual_micro_cohort_next:
    'Prepare a future local micro-cohort roster/preflight packet; do not assign audiences or send.',
  opt_in_testers_next:
    'Prepare a future local opt-in tester roster/preflight packet; do not assign audiences or send.',
}[laneId] ?? 'Ask for a clear strategy-only lane decision.');

const laneRequiresRoster = (laneId) =>
  laneId === 'manual_micro_cohort_next' || laneId === 'opt_in_testers_next';

const buildPilotDistributionDecisionIntake = ({
  inputRequestPacket,
  decisionSource,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const inputRequestReady =
    inputRequestPacket?.status === 'pilot_distribution_input_request_packet_ready_no_live_changes'
    && inputRequestPacket?.executiveSummary?.inputRequestReady === true
    && inputRequestPacket?.executiveSummary?.canAskPilotLaneDecisionNow === true
    && inputRequestPacket?.executiveSummary?.canAskFinalSendApprovalNow === false
    && inputRequestPacket?.executiveSummary?.liveActionAllowedNow === false;
  const detected = detectLane(decisionSource.raw);
  const decisionTextProvided = decisionSource.source !== 'none';
  const selectedPilotLane = inputRequestReady && detected.valid ? detected.selectedLaneId : null;
  const laneDecisionReady = Boolean(selectedPilotLane);
  const rosterRequiredNext = selectedPilotLane ? laneRequiresRoster(selectedPilotLane) : false;
  const blockers = [
    inputRequestReady ? null : 'pilot_distribution_input_request_not_ready',
    decisionTextProvided ? null : 'pilot_lane_strategy_decision_missing',
    decisionTextProvided && !detected.valid && detected.ambiguous ? 'pilot_lane_strategy_decision_ambiguous' : null,
    decisionTextProvided && !detected.valid && !detected.ambiguous ? 'pilot_lane_strategy_decision_unrecognized' : null,
    rosterRequiredNext ? `${selectedPilotLane}_roster_needed_before_any_future_audience_step` : null,
  ].filter(Boolean);

  const status = !inputRequestReady
    ? 'pilot_distribution_decision_intake_blocked_missing_input_request_no_live_changes'
    : !decisionTextProvided
      ? 'pilot_distribution_decision_intake_waiting_for_strategy_choice_no_live_changes'
      : detected.valid
        ? rosterRequiredNext
          ? 'pilot_distribution_decision_intake_lane_selected_roster_needed_no_live_changes'
          : 'pilot_distribution_decision_intake_lane_selected_no_live_changes'
        : detected.ambiguous
          ? 'pilot_distribution_decision_intake_ambiguous_choice_no_live_changes'
          : 'pilot_distribution_decision_intake_unrecognized_choice_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_pilot_distribution_decision_intake',
    generatedAt,
    ok: true,
    status,
    launch: inputRequestPacket?.launch ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    },
    executiveSummary: {
      inputRequestReady,
      decisionTextProvided,
      decisionTextSource: decisionSource.source,
      acceptedDecisionOptions: ALLOWED_LANES,
      matchedLaneCount: detected.matchedLaneIds.length,
      selectedPilotLane,
      selectedPilotLaneLabel: selectedPilotLane ? laneLabel(selectedPilotLane) : null,
      laneDecisionReady,
      rosterRequiredNext,
      canAskFinalSendApprovalNow: false,
      exactApprovalPhraseAvailable: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSubscriberMutation: false,
      blockerCount: blockers.length,
      nextLocalOnlyStep: selectedPilotLane
        ? laneNextStep(selectedPilotLane)
        : 'Ask Alejandro for a strategy-only lane decision: keep Null Audience, manual micro-cohort, or opt-in testers.',
    },
    decisionIntake: {
      rawDecisionStoredInReport: false,
      normalizedDecisionStoredInReport: false,
      matchedLaneIds: detected.matchedLaneIds,
      ambiguous: detected.ambiguous,
      allowedLanes: ALLOWED_LANES.map((laneId) => ({
        id: laneId,
        label: laneLabel(laneId),
        aliasesAccepted: LANE_ALIASES[laneId],
      })),
      notApprovalFor: inputRequestPacket?.requestedHumanText?.notApprovalFor ?? [
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
    blockers,
    sourceDigests: [...sourceDigests, decisionSource.sourceStatus],
    safety,
  };
};

const loadFromFiles = async (options) => {
  const input = await readJsonWithDigest(
    options.inputRequestPacket,
    'pilot distribution input request packet; no send approval phrase',
  );
  const decisionSource = await readDecisionSource(options);

  return buildPilotDistributionDecisionIntake({
    inputRequestPacket: input.value,
    decisionSource,
    sourceDigests: [input.digest],
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Pilot Distribution Decision Intake',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Input request ready: ${report.executiveSummary.inputRequestReady}`,
  `- Decision text provided: ${report.executiveSummary.decisionTextProvided}`,
  `- Decision text source: ${report.executiveSummary.decisionTextSource}`,
  `- Selected pilot lane: ${report.executiveSummary.selectedPilotLane ?? 'none'}`,
  `- Selected pilot lane label: ${report.executiveSummary.selectedPilotLaneLabel ?? 'none'}`,
  `- Lane decision ready: ${report.executiveSummary.laneDecisionReady}`,
  `- Roster required next: ${report.executiveSummary.rosterRequiredNext}`,
  `- Can ask final send approval now: ${report.executiveSummary.canAskFinalSendApprovalNow}`,
  `- Exact approval phrase available: ${report.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Would authorize send: ${report.executiveSummary.wouldAuthorizeSend}`,
  `- Would authorize audience assignment: ${report.executiveSummary.wouldAuthorizeAudienceAssignment}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next local-only step: ${report.executiveSummary.nextLocalOnlyStep}`,
  '',
  '## Accepted Options',
  '',
  renderList(report.executiveSummary.acceptedDecisionOptions),
  '',
  '## Matched Lane IDs',
  '',
  renderList(report.decisionIntake.matchedLaneIds),
  '',
  '## Blockers',
  '',
  renderList(report.blockers),
  '',
  '## Not Approval For',
  '',
  renderList(report.decisionIntake.notApprovalFor),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- Decision text printed: ${report.safety.decisionTextPrinted}`,
  `- Exact approval phrase printed: ${report.safety.exactApprovalPhrasePrinted}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Subscriber mutations performed: ${report.safety.subscriberMutationsPerformed}`,
  `- Group mutations performed: ${report.safety.groupMutationsPerformed}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Live approval granted by intake: ${report.safety.liveApprovalGrantedByIntake}`,
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

  const report = await loadFromFiles(options);
  if (!safetyClosed(report.safety)) throw new Error('safety_not_closed');

  const out = await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  const markdownOut = await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    decisionTextProvided: report.executiveSummary.decisionTextProvided,
    selectedPilotLane: report.executiveSummary.selectedPilotLane,
    laneDecisionReady: report.executiveSummary.laneDecisionReady,
    rosterRequiredNext: report.executiveSummary.rosterRequiredNext,
    canAskFinalSendApprovalNow: report.executiveSummary.canAskFinalSendApprovalNow,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch pilot distribution decision intake failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  ALLOWED_LANES,
  buildPilotDistributionDecisionIntake,
  buildSafety,
  detectLane,
  parseArgs,
  renderMarkdown,
};
