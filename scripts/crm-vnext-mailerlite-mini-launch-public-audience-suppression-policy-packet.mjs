#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-public-audience-suppression-policy-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_PUBLIC_AUDIENCE_SCAN_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scan_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_suppression_policy_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_suppression_policy_packet_current_inteligencia_descansar_2026-05-31.md`;

const SUPPRESSION_RISK_STATUSES = [
  'unsubscribed',
  'bounced',
  'junk',
  'complained',
  'inactive',
  'unconfirmed',
  'unknown',
  'other',
];

const SENDABLE_STATUSES = ['active', 'subscribed'];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-public-audience-suppression-policy-packet.mjs [options]

Options:
  --public-audience-scan-packet <path>    Current read-only public audience scan JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCAN_PACKET}
  --public-audience-scope-packet <path>   Current public audience scope packet JSON. Defaults to ${DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET}
  --out <path>                            Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                   Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                  Show this help

Local-only suppression/exclusion policy packet for the Inteligencia para
descansar mini-launch. It converts the aggregate suppression-status scan into
a conservative launch rule: only active/subscribed recipients may ever be used
for a later audience send, and every suppressed, unknown, internal, seed or QA
recipient remains excluded. It does not call MailerLite, Shopify or CRM live
APIs, open UI, send emails, publish or schedule campaigns, read or mutate
subscribers, create or assign groups, edit workflows, append ledgers, write
cards/scoring, write Fact Store, or print secrets, raw IDs, recipients or
exact URLs.`;

const parseArgs = (argv) => {
  const options = {
    publicAudienceScanPacket: DEFAULT_PUBLIC_AUDIENCE_SCAN_PACKET,
    publicAudienceScopePacket: DEFAULT_PUBLIC_AUDIENCE_SCOPE_PACKET,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--public-audience-scan-packet') options.publicAudienceScanPacket = argv[++index];
    else if (arg === '--public-audience-scope-packet') options.publicAudienceScopePacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
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
  outboundPerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const closedSafety = (safety) => Object.entries(safety)
  .every(([key, value]) => key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false);

const unique = (items) => [...new Set(items.filter(Boolean))];
const countForStatuses = (statusCounts = {}, statuses = []) =>
  statuses.reduce((sum, status) => sum + (Number(statusCounts?.[status]) || 0), 0);

const scanSafetyReady = (scan) => scan?.ok === true
  && scan?.status === 'public_audience_scan_packet_ready_read_only_no_mutations'
  && scan?.executiveSummary?.freshAudienceScanReady === true
  && scan?.executiveSummary?.membershipScanReady === true
  && scan?.executiveSummary?.suppressionStatusScanReady === true
  && scan?.safety?.readOnly === true
  && scan?.safety?.mailerLiteMutationsPerformed === false
  && scan?.safety?.subscriberRowsPrinted === false
  && scan?.safety?.rawIdsPrinted === false
  && scan?.safety?.recipientsPrinted === false
  && scan?.safety?.tokensPrinted === false;

const summarizeCandidateGroups = (scan) => (scan?.candidateAudienceGroups ?? []).map((group) => {
  const statusCounts = group?.statusCounts ?? {};
  const sendableMembershipCount = countForStatuses(statusCounts, SENDABLE_STATUSES);
  const suppressionRiskMembershipCount = Number(group?.suppressionRiskCountFromScan)
    || countForStatuses(statusCounts, SUPPRESSION_RISK_STATUSES);
  return {
    name: group?.name ?? null,
    existsInMailerLite: group?.existsInMailerLite ?? null,
    referencedByOptionIds: group?.referencedByOptionIds ?? [],
    apiActiveCount: group?.apiActiveCount ?? null,
    subscriberMembershipCountFromScan: group?.subscriberMembershipCountFromScan ?? null,
    sendableMembershipCount,
    suppressionRiskMembershipCount,
    unknownOrOtherCount: countForStatuses(statusCounts, ['unknown', 'other']),
    exactSubscriberRowsPrinted: group?.exactSubscriberRowsPrinted === true,
    rawIdsPrinted: group?.rawIdsPrinted === true,
    recipientsPrinted: group?.recipientsPrinted === true,
    policyVerdict: 'sendable_statuses_only_exclude_all_suppression_risk',
  };
});

const buildPolicyRules = () => [
  {
    id: 'include_only_active_or_subscribed',
    decision: 'include_only_if_mailerlite_status_is_active_or_subscribed',
    effect: 'allows only sendable status rows in any later audience-send candidate',
  },
  {
    id: 'exclude_suppression_risk_statuses',
    decision: `exclude_statuses:${SUPPRESSION_RISK_STATUSES.join(',')}`,
    effect: 'suppressed, bounced, complained, unknown or non-sendable rows cannot be used for a public send',
  },
  {
    id: 'exclude_internal_seed_qa',
    decision: 'exclude_internal_seed_test_and_qa_recipients_from_public_audience',
    effect: 'test delivery evidence cannot become production audience scope',
  },
  {
    id: 'do_not_mutate_suppression_state',
    decision: 'read_and_respect_mailerlite_suppression_state_only',
    effect: 'no unsubscribe, suppression, subscriber or group mutation is permitted by this packet',
  },
  {
    id: 'require_fresh_scan_before_exact_send_approval',
    decision: 'refresh_read_only_membership_and_suppression_scan_before_any_exact_send_boundary',
    effect: 'later approval must be backed by fresh aggregate evidence rather than stale memory',
  },
  {
    id: 'require_separate_scope_url_and_send_gates',
    decision: 'policy_ready_is_not_audience_scope_or_send_approval',
    effect: 'exact audience, URL lifecycle and live send approval remain separate gates',
  },
];

const buildPublicAudienceSuppressionPolicyPacket = ({
  publicAudienceScanPacket,
  publicAudienceScopePacket,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const candidateGroupPolicies = summarizeCandidateGroups(publicAudienceScanPacket);
  const candidateLeaksClosed = candidateGroupPolicies.every((group) =>
    group.exactSubscriberRowsPrinted === false
    && group.rawIdsPrinted === false
    && group.recipientsPrinted === false);
  const scanReady = scanSafetyReady(publicAudienceScanPacket) && candidateLeaksClosed;
  const policyRules = buildPolicyRules();
  const inheritedBlockers = publicAudienceScopePacket?.blockersBeforeScopeReady
    ?? publicAudienceScanPacket?.audienceScopeProgress?.remainingBlockers
    ?? [];
  const resolvedBlockers = scanReady ? ['suppression_exclusion_policy_missing'] : [];
  const remainingBlockersAfterPolicy = inheritedBlockers
    .filter((blocker) => blocker !== 'suppression_exclusion_policy_missing');
  const suppressionRiskMembershipCount = candidateGroupPolicies
    .reduce((sum, group) => sum + group.suppressionRiskMembershipCount, 0);
  const sendableMembershipObservations = candidateGroupPolicies
    .reduce((sum, group) => sum + group.sendableMembershipCount, 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_public_audience_suppression_policy_packet',
    generatedAt,
    ok: true,
    status: scanReady
      ? 'public_audience_suppression_policy_packet_ready_no_live_changes'
      : 'public_audience_suppression_policy_packet_blocked_missing_scan_no_live_changes',
    launch: {
      launchId: publicAudienceScopePacket?.launch?.launchId ?? null,
      resourceName:
        publicAudienceScopePacket?.launch?.resourceName
        ?? publicAudienceScanPacket?.launch?.resourceName
        ?? 'Inteligencia para descansar',
      resourceType:
        publicAudienceScopePacket?.launch?.resourceType
        ?? publicAudienceScanPacket?.launch?.resourceType
        ?? 'quiz',
    },
    executiveSummary: {
      suppressionPolicyPacketReady: true,
      freshAudienceScanReady: publicAudienceScanPacket?.executiveSummary?.freshAudienceScanReady === true,
      suppressionStatusScanReady: publicAudienceScanPacket?.executiveSummary?.suppressionStatusScanReady === true,
      suppressionExclusionPolicyReady: scanReady,
      policyRuleCount: policyRules.length,
      candidateGroupCount: candidateGroupPolicies.length,
      sendableMembershipObservations,
      suppressionRiskMembershipCount,
      unknownOrOtherMembershipCount: candidateGroupPolicies
        .reduce((sum, group) => sum + group.unknownOrOtherCount, 0),
      resolvedBlockerCount: resolvedBlockers.length,
      remainingBlockerCountAfterPolicy: remainingBlockersAfterPolicy.length,
      publicAudienceScopeStillRequired: true,
      publicAudienceSendAllowedNow: false,
      liveActionAllowedNow: false,
      nextSafeAction: scanReady
        ? 'Treat the suppression/exclusion policy as ready, then keep exact audience scope, URL gate, CRM observed-event posture and live send approval blocked.'
        : 'Refresh the read-only audience scan before treating any suppression/exclusion policy as ready.',
    },
    policyRules,
    candidateGroupPolicies,
    audienceScopeProgress: {
      inheritedBlockers,
      resolvedBlockers,
      remainingBlockersAfterPolicy,
      publicAudienceScopeReadyAfterPolicy: false,
      canAskAudienceScopeApprovalNowAfterPolicy: false,
    },
    hardStops: [
      'No public or audience send.',
      'No subscriber import, update, unsubscribe, suppression change or deletion.',
      'No group or segment creation or assignment.',
      'No workflow or automation changes.',
      'No Shopify publish or form connection.',
      'No CRM live API writes, Signal Ledger append, card writes, scoring changes or Fact Store writes.',
      'No exact public/audience send phrase printed or requested from this packet.',
    ],
    sourceDigests,
    safety,
    upstreamReadOnlyScanEvidence: {
      mailerLiteApiCalledByScanPacket: publicAudienceScanPacket?.safety?.mailerLiteApiCalled ?? null,
      mailerLiteGroupsReadByScanPacket: publicAudienceScanPacket?.safety?.mailerLiteGroupsRead ?? null,
      mailerLiteSubscribersReadByScanPacket: publicAudienceScanPacket?.safety?.mailerLiteSubscribersRead ?? null,
      subscriberRowsPrintedByScanPacket: publicAudienceScanPacket?.safety?.subscriberRowsPrinted ?? null,
      rawIdsPrintedByScanPacket: publicAudienceScanPacket?.safety?.rawIdsPrinted ?? null,
      recipientsPrintedByScanPacket: publicAudienceScanPacket?.safety?.recipientsPrinted ?? null,
      tokensPrintedByScanPacket: publicAudienceScanPacket?.safety?.tokensPrinted ?? null,
    },
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.publicAudienceScanPacket, 'aggregate read-only membership and suppression-status scan'),
    readOptionalJsonWithDigest(options.publicAudienceScopePacket, 'current audience scope blockers before suppression policy'),
  ]);

  return buildPublicAudienceSuppressionPolicyPacket({
    publicAudienceScanPacket: sources[0].value,
    publicAudienceScopePacket: sources[1].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items) => (items.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Public Audience Suppression Policy Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Suppression policy packet ready: ${report.executiveSummary.suppressionPolicyPacketReady}`,
  `- Fresh audience scan ready: ${report.executiveSummary.freshAudienceScanReady}`,
  `- Suppression status scan ready: ${report.executiveSummary.suppressionStatusScanReady}`,
  `- Suppression/exclusion policy ready: ${report.executiveSummary.suppressionExclusionPolicyReady}`,
  `- Policy rule count: ${report.executiveSummary.policyRuleCount}`,
  `- Candidate group count: ${report.executiveSummary.candidateGroupCount}`,
  `- Sendable membership observations: ${report.executiveSummary.sendableMembershipObservations}`,
  `- Suppression-risk membership observations: ${report.executiveSummary.suppressionRiskMembershipCount}`,
  `- Remaining blockers after policy: ${report.executiveSummary.remainingBlockerCountAfterPolicy}`,
  `- Public/audience send allowed now: ${report.executiveSummary.publicAudienceSendAllowedNow}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Policy Rules',
  '',
  renderList(report.policyRules.map((rule) => `${rule.id}: ${rule.decision}; effect=${rule.effect}`)),
  '',
  '## Candidate Group Policy Summary',
  '',
  renderList(report.candidateGroupPolicies.map((group) =>
    `${group.name}: sendable=${group.sendableMembershipCount}; suppressionRisk=${group.suppressionRiskMembershipCount}; verdict=${group.policyVerdict}`)),
  '',
  '## Audience Scope Progress',
  '',
  `- Resolved blockers: ${report.audienceScopeProgress.resolvedBlockers.join(', ') || 'none'}`,
  `- Remaining blockers: ${report.audienceScopeProgress.remainingBlockersAfterPolicy.join(', ') || 'none'}`,
  `- Public/audience scope ready after policy: ${report.audienceScopeProgress.publicAudienceScopeReadyAfterPolicy}`,
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
  '## Upstream Read-Only Scan Evidence',
  '',
  `- MailerLite API called by scan packet: ${report.upstreamReadOnlyScanEvidence.mailerLiteApiCalledByScanPacket}`,
  `- MailerLite groups read by scan packet: ${report.upstreamReadOnlyScanEvidence.mailerLiteGroupsReadByScanPacket}`,
  `- MailerLite subscribers read by scan packet: ${report.upstreamReadOnlyScanEvidence.mailerLiteSubscribersReadByScanPacket}`,
  `- Subscriber rows printed by scan packet: ${report.upstreamReadOnlyScanEvidence.subscriberRowsPrintedByScanPacket}`,
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
  if (!closedSafety(report.safety)) throw new Error('safety_not_closed');

  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    suppressionExclusionPolicyReady: report.executiveSummary.suppressionExclusionPolicyReady,
    policyRuleCount: report.executiveSummary.policyRuleCount,
    candidateGroupCount: report.executiveSummary.candidateGroupCount,
    sendableMembershipObservations: report.executiveSummary.sendableMembershipObservations,
    suppressionRiskMembershipCount: report.executiveSummary.suppressionRiskMembershipCount,
    resolvedBlockerCount: report.executiveSummary.resolvedBlockerCount,
    remainingBlockerCountAfterPolicy: report.executiveSummary.remainingBlockerCountAfterPolicy,
    publicAudienceSendAllowedNow: report.executiveSummary.publicAudienceSendAllowedNow,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch public audience suppression policy packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPublicAudienceSuppressionPolicyPacket,
  buildPolicyRules,
  buildSafety,
  parseArgs,
  renderMarkdown,
  scanSafetyReady,
  summarizeCandidateGroups,
};
