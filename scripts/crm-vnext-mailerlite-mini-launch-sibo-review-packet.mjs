#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-sibo-review-packet-2026-06-02';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PILOT_DISTRIBUTION_DECISION_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_packet_no_send_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CEO_PROPOSAL_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_proposal_packet_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_CEO_REVIEW_READINESS_DELTA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_ceo_review_readiness_delta_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.md`;
const DEFAULT_HTML_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_sibo_review_packet_no_send_current_inteligencia_descansar_2026-06-02.html`;

const STRATEGY_DECISION_PHRASE =
  'Elijo `keep_null_audience_no_public_send` como estrategia no-send para el mini-lanzamiento Inteligencia para descansar; quiero mantener el microproducto como rehearsal/control-plane para seguir construyendo la maquina de Launch OS v0 con simulaciones internas y seed tests bajo aprobaciones separadas, sin enviar correos a personas reales, sin publicar, sin programar, sin asignar audiencia, sin tocar MailerLite, Shopify, CRM, subscribers, groups, workflows, ledgers, cards, scoring ni Fact Store, y manteniendo cerrada cualquier aprobacion de public/audience send.';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-sibo-review-packet.mjs [options]

Options:
  --pilot-distribution-decision-packet <path>  Pilot distribution decision JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_DECISION_PACKET}
  --ceo-proposal-packet <path>                 CEO proposal packet JSON. Defaults to ${DEFAULT_CEO_PROPOSAL_PACKET}
  --ceo-review-readiness-delta <path>          CEO review readiness delta JSON. Defaults to ${DEFAULT_CEO_REVIEW_READINESS_DELTA}
  --out <path>                                 Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                        Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --html-out <path>                            Write CEO-review HTML report. Defaults to ${DEFAULT_HTML_OUTPUT}
  --help                                       Show this help

Local-only SIBO/CEO review packet for the Inteligencia para descansar
mini-launch. It turns the no-send pilot distribution decision packet into a
human-facing review artifact and exact strategy decision phrase. It does not
call live APIs, open UI, read or mutate subscribers, assign audiences, publish,
schedule or send campaigns, touch Shopify or CRM live systems, append ledgers,
write cards/scoring, write Fact Store, or print exact URLs, raw IDs, recipients
or tokens.`;

const parseArgs = (argv) => {
  const options = {
    pilotDistributionDecisionPacket: DEFAULT_PILOT_DISTRIBUTION_DECISION_PACKET,
    ceoProposalPacket: DEFAULT_CEO_PROPOSAL_PACKET,
    ceoReviewReadinessDelta: DEFAULT_CEO_REVIEW_READINESS_DELTA,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    htmlOut: DEFAULT_HTML_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--pilot-distribution-decision-packet') {
      options.pilotDistributionDecisionPacket = argv[++index];
    } else if (arg === '--ceo-proposal-packet') {
      options.ceoProposalPacket = argv[++index];
    } else if (arg === '--ceo-review-readiness-delta') {
      options.ceoReviewReadinessDelta = argv[++index];
    } else if (arg === '--out') {
      options.out = argv[++index];
    } else if (arg === '--markdown-out') {
      options.markdownOut = argv[++index];
    } else if (arg === '--html-out') {
      options.htmlOut = argv[++index];
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
  exactApprovalPhraseAvailable: false,
  exactApprovalPhrasePrinted: false,
  strategyDecisionPhraseAvailable: true,
  strategyDecisionPhrasePrinted: true,
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
});

const TRUE_SAFETY_KEYS = new Set([
  'localOnly',
  'reportsOnly',
  'strategyDecisionPhraseAvailable',
  'strategyDecisionPhrasePrinted',
]);

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (TRUE_SAFETY_KEYS.has(key) ? value === true : value === false));

const buildEvidenceChecks = ({ pilotDistributionDecisionPacket, ceoProposalPacket, ceoReviewReadinessDelta }) => {
  const decisionSummary = pilotDistributionDecisionPacket?.executiveSummary ?? {};
  const ceoSummary = ceoProposalPacket?.executiveSummary ?? {};
  const deltaSummary = ceoReviewReadinessDelta?.executiveSummary ?? {};

  const decisionPacketReady =
    pilotDistributionDecisionPacket?.status === 'pilot_distribution_decision_packet_no_send_ready_no_live_changes'
    && decisionSummary.decisionPacketReady === true
    && decisionSummary.canAskPilotLaneDecisionNow === true
    && decisionSummary.asksPublicSendApprovalNow === false
    && decisionSummary.canAskFinalSendApprovalNow === false
    && decisionSummary.exactApprovalPhraseAvailable === false
    && decisionSummary.liveActionAllowedNow === false
    && decisionSummary.wouldAuthorizeSend === false
    && decisionSummary.wouldAuthorizeAudienceAssignment === false
    && decisionSummary.currentDefault === 'keep_null_audience_no_public_send'
    && (decisionSummary.blockerCount ?? 0) === 0;
  const ceoProposalReady =
    ceoProposalPacket?.status === 'ceo_proposal_packet_ready_for_ceo_review_no_live_changes'
    && ceoSummary.ceoProposalReviewReady === true
    && ceoSummary.ceoProposalReviewReadyWithSeedCaveat === false
    && ceoSummary.publicSendApprovalReady === false
    && ceoSummary.liveActionAllowedNow === false
    && (ceoSummary.blockerCount ?? 0) === 0;
  const ceoReadinessReady =
    ceoReviewReadinessDelta?.status === 'ceo_review_readiness_delta_ready_no_live_changes'
    && deltaSummary.ceoReviewPackageReady === true
    && deltaSummary.readyForPilotDistributionDecisionNow === true
    && deltaSummary.readyForPublicSendApprovalNow === false
    && deltaSummary.liveActionAllowedNow === false
    && (deltaSummary.blockerCount ?? 0) === 0;

  return {
    decisionPacketReady,
    ceoProposalReady,
    ceoReadinessReady,
  };
};

const buildDecisionOptions = () => [
  {
    id: 'keep_null_audience_no_public_send',
    label: 'Keep Null Audience / no public send',
    recommendedForCurrentStrategy: true,
    why:
      'Alejandro clarified that the current goal is to keep building the frequent-launch machine through internal simulation, not expose this microproduct to real people yet.',
    whatHappensNext:
      'Record a local no-send hold, keep all drafts inert, and prepare a reusable Launch Rehearsal protocol for seed-only/internal review loops.',
    wouldAuthorizeSend: false,
    wouldAuthorizeAudienceAssignment: false,
    wouldAuthorizeLiveMutation: false,
  },
  {
    id: 'manual_micro_cohort_next',
    label: 'Prepare manual micro-cohort',
    recommendedForCurrentStrategy: false,
    why:
      'Useful later when Launch OS is ready to learn from a deliberately selected tiny real audience.',
    whatHappensNext:
      'Would only prepare a local roster/preflight packet; it would still not send or assign audience.',
    wouldAuthorizeSend: false,
    wouldAuthorizeAudienceAssignment: false,
    wouldAuthorizeLiveMutation: false,
  },
  {
    id: 'opt_in_testers_next',
    label: 'Prepare opt-in testers',
    recommendedForCurrentStrategy: false,
    why:
      'Useful later when there is an explicit opt-in tester roster and a real exposure rehearsal is desired.',
    whatHappensNext:
      'Would only prepare a local opt-in roster/preflight packet; it would still not send or assign audience.',
    wouldAuthorizeSend: false,
    wouldAuthorizeAudienceAssignment: false,
    wouldAuthorizeLiveMutation: false,
  },
];

const buildSiboReviewPacket = ({
  pilotDistributionDecisionPacket,
  ceoProposalPacket,
  ceoReviewReadinessDelta,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const evidenceChecks = buildEvidenceChecks({
    pilotDistributionDecisionPacket,
    ceoProposalPacket,
    ceoReviewReadinessDelta,
  });
  const blockers = [
    evidenceChecks.decisionPacketReady ? null : 'pilot_distribution_decision_packet_not_ready',
    evidenceChecks.ceoProposalReady ? null : 'ceo_proposal_packet_not_ready',
    evidenceChecks.ceoReadinessReady ? null : 'ceo_review_readiness_delta_not_ready',
    safetyClosed(safety) ? null : 'safety_not_closed',
  ].filter(Boolean);
  const reviewPacketReady = blockers.length === 0;
  const launch = pilotDistributionDecisionPacket?.launch
    ?? ceoProposalPacket?.launch
    ?? ceoReviewReadinessDelta?.launch
    ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    };

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_sibo_review_packet_no_send',
    generatedAt,
    ok: true,
    status: reviewPacketReady
      ? 'sibo_review_packet_no_send_ready_no_live_changes'
      : 'sibo_review_packet_no_send_blocked_missing_evidence_no_live_changes',
    launch,
    executiveSummary: {
      reviewPacketReady,
      decisionPacketReady: evidenceChecks.decisionPacketReady,
      ceoProposalReady: evidenceChecks.ceoProposalReady,
      ceoReadinessReady: evidenceChecks.ceoReadinessReady,
      audiencePostureNow: 'Null Audience / no public send',
      recommendedStrategyChoice: 'keep_null_audience_no_public_send',
      recommendedStrategyReason:
        'Current CEO priority is Launch OS machine-building through rehearsal/control-plane simulation, not real-person distribution.',
      strategyDecisionPhraseAvailable: true,
      exactApprovalPhraseAvailable: false,
      asksPublicSendApprovalNow: false,
      canAskFinalSendApprovalNow: false,
      canExecuteNow: false,
      liveActionAllowedNow: false,
      wouldAuthorizeSend: false,
      wouldAuthorizeAudienceAssignment: false,
      wouldAuthorizeSubscriberMutation: false,
      wouldAuthorizeShopifyMutation: false,
      wouldAuthorizeCrmWrite: false,
      blockerCount: blockers.length,
      blockers,
      nextSafeAction: reviewPacketReady
        ? 'Present this SIBO review packet to Alejandro and, if he agrees, ingest only the strategy decision phrase locally.'
        : 'Resolve local evidence blockers before presenting a SIBO review packet.',
    },
    siboReview: {
      reader: 'Alejandro / CEO-SIBO',
      estimatedReviewTime: '2 minutes',
      decisionBeingAsked:
        'Choose the current no-send distribution posture for the compact-footer v2 mini-launch.',
      recommendedDecision:
        'Keep Null Audience / no public send and use the microproduct as rehearsal/control-plane evidence while Launch OS v0 is hardened.',
      whyThisPassesThroughHumanEyes:
        'A Launch OS package is not considered reviewed just because it exists on disk; the CEO-facing artifact must be presented, read, and converted into a local decision receipt.',
      evidenceInPlainLanguage: [
        'The compact-footer v2 received-email package is green for CEO review.',
        'The current drafts remain inert in the empty Null Audience safety group.',
        'No public/audience send approval is being requested.',
        'Real-person distribution can remain closed while the launch machine is rehearsed with seed-only/internal paths.',
      ],
      decisionOptions: buildDecisionOptions(),
      exactStrategyDecisionPhrase: STRATEGY_DECISION_PHRASE,
      afterDecisionNextStep:
        'If accepted, run only local strategy-decision intake and prepare a Launch Rehearsal protocol packet. Seed emails or personal-email simulations remain separate future approvals.',
    },
    notApprovalFor: [
      'MailerLite send or resend',
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
    readJsonWithDigest(
      options.pilotDistributionDecisionPacket,
      'no-send pilot distribution decision evidence',
    ),
    readJsonWithDigest(options.ceoProposalPacket, 'compact-footer v2 CEO proposal evidence'),
    readJsonWithDigest(options.ceoReviewReadinessDelta, 'compact-footer v2 CEO readiness evidence'),
  ]);

  return buildSiboReviewPacket({
    pilotDistributionDecisionPacket: sources[0].value,
    ceoProposalPacket: sources[1].value,
    ceoReviewReadinessDelta: sources[2].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  '# SIBO Review Packet No-Send',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## CEO Read',
  '',
  `- Decision: ${report.siboReview.decisionBeingAsked}`,
  `- Recommended decision: ${report.siboReview.recommendedDecision}`,
  `- Audience posture now: ${report.executiveSummary.audiencePostureNow}`,
  `- Review packet ready: ${report.executiveSummary.reviewPacketReady}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Asks public send approval now: ${report.executiveSummary.asksPublicSendApprovalNow}`,
  `- Would authorize send: ${report.executiveSummary.wouldAuthorizeSend}`,
  `- Would authorize audience assignment: ${report.executiveSummary.wouldAuthorizeAudienceAssignment}`,
  '',
  '## Why This Exists',
  '',
  report.siboReview.whyThisPassesThroughHumanEyes,
  '',
  '## Evidence In Plain Language',
  '',
  renderList(report.siboReview.evidenceInPlainLanguage),
  '',
  '## Decision Options',
  '',
  renderList(report.siboReview.decisionOptions.map((option) =>
    `${option.id}: ${option.label}; recommended=${option.recommendedForCurrentStrategy}; wouldAuthorizeSend=${option.wouldAuthorizeSend}; next=${option.whatHappensNext}`
  )),
  '',
  '## Exact Strategy Decision Phrase',
  '',
  '```text',
  report.siboReview.exactStrategyDecisionPhrase,
  '```',
  '',
  '## What This Does Not Approve',
  '',
  renderList(report.notApprovalFor),
  '',
  '## After Decision',
  '',
  report.siboReview.afterDecisionNextStep,
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Reports only: ${report.safety.reportsOnly}`,
  `- Strategy decision phrase available: ${report.safety.strategyDecisionPhraseAvailable}`,
  `- Exact approval phrase available: ${report.safety.exactApprovalPhraseAvailable}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- MailerLite UI used: ${report.safety.mailerLiteUiUsed}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Subscribers read: ${report.safety.subscribersRead}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- Audience assignment performed: ${report.safety.audienceAssignmentPerformed}`,
  `- Exact URLs printed: ${report.safety.exactUrlsPrinted}`,
  `- Recipients printed: ${report.safety.recipientsPrinted}`,
  `- Tokens printed: ${report.safety.tokensPrinted}`,
  '',
].join('\n');

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;');

const renderHtmlList = (items = []) => `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;

const renderHtml = (report) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>SIBO Review Packet - Inteligencia para descansar</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #27272a;
      --muted: #5f666a;
      --line: #d7dce0;
      --paper: #fffdf9;
      --band: #f3f6f4;
      --accent: #30436c;
      --good: #166534;
    }
    body {
      margin: 0;
      background: #eef1f3;
      color: var(--ink);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      line-height: 1.45;
    }
    main {
      max-width: 840px;
      margin: 0 auto;
      background: var(--paper);
      min-height: 100vh;
      padding: 56px 48px 64px;
    }
    h1 {
      font-size: 36px;
      line-height: 1.08;
      margin: 0 0 12px;
      letter-spacing: 0;
    }
    h2 {
      font-size: 18px;
      line-height: 1.2;
      margin: 34px 0 12px;
      letter-spacing: 0;
      color: var(--accent);
    }
    p {
      margin: 0 0 14px;
      color: var(--muted);
      font-size: 17px;
    }
    .status {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      color: var(--good);
      border: 1px solid #b7d6c1;
      background: #edf8f0;
      padding: 8px 10px;
      font-size: 14px;
      margin: 12px 0 22px;
    }
    .decision {
      border-top: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      padding: 22px 0;
      margin: 22px 0;
    }
    .phrase {
      white-space: pre-wrap;
      overflow-wrap: anywhere;
      font: 15px/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      background: var(--band);
      padding: 18px;
      border: 1px solid var(--line);
    }
    ul {
      padding-left: 22px;
      margin: 0;
      color: var(--muted);
      font-size: 16px;
    }
    li + li {
      margin-top: 8px;
    }
    strong {
      color: var(--ink);
    }
  </style>
</head>
<body>
  <main>
    <h1>SIBO Review Packet No-Send</h1>
    <p><strong>${escapeHtml(report.launch.resourceName)}</strong></p>
    <div class="status">Ready for CEO/SIBO review: ${escapeHtml(report.executiveSummary.reviewPacketReady)}</div>

    <section class="decision">
      <h2>Decision</h2>
      <p>${escapeHtml(report.siboReview.decisionBeingAsked)}</p>
      <p><strong>Recommended now:</strong> ${escapeHtml(report.siboReview.recommendedDecision)}</p>
      <p><strong>Live action allowed now:</strong> ${escapeHtml(report.executiveSummary.liveActionAllowedNow)}</p>
      <p><strong>Would authorize send:</strong> ${escapeHtml(report.executiveSummary.wouldAuthorizeSend)}</p>
    </section>

    <h2>Why This Exists</h2>
    <p>${escapeHtml(report.siboReview.whyThisPassesThroughHumanEyes)}</p>

    <h2>Evidence In Plain Language</h2>
    ${renderHtmlList(report.siboReview.evidenceInPlainLanguage)}

    <h2>Exact Strategy Decision Phrase</h2>
    <div class="phrase">${escapeHtml(report.siboReview.exactStrategyDecisionPhrase)}</div>

    <h2>What This Does Not Approve</h2>
    ${renderHtmlList(report.notApprovalFor)}

    <h2>After Decision</h2>
    <p>${escapeHtml(report.siboReview.afterDecisionNextStep)}</p>
  </main>
</body>
</html>`;

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
  const htmlOut = await writeText(options.htmlOut, renderHtml(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    reviewPacketReady: report.executiveSummary.reviewPacketReady,
    recommendedStrategyChoice: report.executiveSummary.recommendedStrategyChoice,
    asksPublicSendApprovalNow: report.executiveSummary.asksPublicSendApprovalNow,
    exactApprovalPhraseAvailable: report.executiveSummary.exactApprovalPhraseAvailable,
    strategyDecisionPhraseAvailable: report.executiveSummary.strategyDecisionPhraseAvailable,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    blockerCount: report.executiveSummary.blockerCount,
    out,
    markdownOut,
    htmlOut,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch SIBO review packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  STRATEGY_DECISION_PHRASE,
  buildSafety,
  buildSiboReviewPacket,
  parseArgs,
  renderHtml,
  renderMarkdown,
  safetyClosed,
};
