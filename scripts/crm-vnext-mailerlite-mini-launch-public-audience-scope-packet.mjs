#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-public-audience-scope-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_MINI_LAUNCH_OS_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_os_v0_packet_2026-05-27.json`;
const DEFAULT_MINI_LAUNCH_PATH_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_path_packet_2026-05-27.json`;
const DEFAULT_ONBOARDING_TRUNK_MAP = `${DEFAULT_REPORTS_DIR}/mailerlite_onboarding_trunk_map_2026-05-27.json`;
const DEFAULT_ONBOARDING_V2_DESIGN_PACKET = `${DEFAULT_REPORTS_DIR}/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json`;
const DEFAULT_ONBOARDING_HANDOFF_POLICY = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json`;
const DEFAULT_MINI_LAUNCH_GROUP_DRY_RUN = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_group_dry_run_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SHOPIFY_PUBLIC_URL_GATE = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_MARKDOWN_OUTPUT = `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_audience_scope_packet_current_inteligencia_descansar_2026-05-31.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-public-audience-scope-packet.mjs [options]

Options:
  --mini-launch-os-packet <path>                  Mini-launch OS v0 packet JSON. Defaults to ${DEFAULT_MINI_LAUNCH_OS_PACKET}
  --mini-launch-path-packet <path>                Mini-launch path packet JSON. Defaults to ${DEFAULT_MINI_LAUNCH_PATH_PACKET}
  --onboarding-trunk-map <path>                   Onboarding trunk map JSON. Defaults to ${DEFAULT_ONBOARDING_TRUNK_MAP}
  --onboarding-v2-design-packet <path>            Onboarding v2 design packet JSON. Defaults to ${DEFAULT_ONBOARDING_V2_DESIGN_PACKET}
  --onboarding-handoff-policy <path>              Mini-launch onboarding handoff policy JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --mini-launch-group-dry-run <path>              Current mini-launch group dry-run JSON. Defaults to ${DEFAULT_MINI_LAUNCH_GROUP_DRY_RUN}
  --null-audience-replacement-execution-receipt <path> Current Null Audience replacement receipt JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT}
  --null-audience-seed-inbox-qa <path>            Current Null Audience seed inbox QA JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA}
  --shopify-public-url-gate <path>                Current Shopify public URL gate JSON. Defaults to ${DEFAULT_SHOPIFY_PUBLIC_URL_GATE}
  --out <path>                                    Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                           Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                          Show this help

Local-only audience scope packet for the Inteligencia para descansar mini-launch.
It turns the broad "audience scope missing" blocker into explicit, reviewable
scope options. It does not call MailerLite, Shopify or CRM live APIs, open UI,
send emails, publish or schedule campaigns, read or mutate subscribers, create
or assign groups, edit workflows, append ledgers, write cards/scoring, write
Fact Store, or print secrets, raw IDs, recipients or exact URLs.`;

const parseArgs = (argv) => {
  const options = {
    miniLaunchOsPacket: DEFAULT_MINI_LAUNCH_OS_PACKET,
    miniLaunchPathPacket: DEFAULT_MINI_LAUNCH_PATH_PACKET,
    onboardingTrunkMap: DEFAULT_ONBOARDING_TRUNK_MAP,
    onboardingV2DesignPacket: DEFAULT_ONBOARDING_V2_DESIGN_PACKET,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    miniLaunchGroupDryRun: DEFAULT_MINI_LAUNCH_GROUP_DRY_RUN,
    nullAudienceReplacementExecutionReceipt: DEFAULT_NULL_AUDIENCE_REPLACEMENT_EXECUTION_RECEIPT,
    nullAudienceSeedInboxQa: DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA,
    shopifyPublicUrlGate: DEFAULT_SHOPIFY_PUBLIC_URL_GATE,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--mini-launch-os-packet') options.miniLaunchOsPacket = argv[++index];
    else if (arg === '--mini-launch-path-packet') options.miniLaunchPathPacket = argv[++index];
    else if (arg === '--onboarding-trunk-map') options.onboardingTrunkMap = argv[++index];
    else if (arg === '--onboarding-v2-design-packet') options.onboardingV2DesignPacket = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--mini-launch-group-dry-run') options.miniLaunchGroupDryRun = argv[++index];
    else if (arg === '--null-audience-replacement-execution-receipt') options.nullAudienceReplacementExecutionReceipt = argv[++index];
    else if (arg === '--null-audience-seed-inbox-qa') options.nullAudienceSeedInboxQa = argv[++index];
    else if (arg === '--shopify-public-url-gate') options.shopifyPublicUrlGate = argv[++index];
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

const closedSafety = (safety) => Object.entries(safety)
  .every(([key, value]) => key === 'localOnly' || key === 'reportsOnly' ? value === true : value === false);

const unique = (items) => [...new Set(items.filter(Boolean))];

const groupActiveCount = (groupDryRun, name) => {
  const group = (groupDryRun?.plannedGroups ?? []).find((item) => item?.name === name);
  return Number.isFinite(group?.activeCount) ? group.activeCount : null;
};

const buildAudienceScopeOption = ({
  id,
  label,
  posture,
  groupName = null,
  knownActiveCount = null,
  recommendedFor = null,
  blockers = [],
  stillRequires = [],
}) => ({
  id,
  label,
  posture,
  groupName,
  knownActiveCount,
  recommendedFor,
  publicSendReadyNow: false,
  blockers,
  stillRequires,
});

const buildPublicAudienceScopePacket = ({
  miniLaunchOsPacket,
  miniLaunchPathPacket,
  onboardingTrunkMap,
  onboardingV2DesignPacket,
  onboardingHandoffPolicy,
  miniLaunchGroupDryRun,
  nullAudienceReplacementExecutionReceipt,
  nullAudienceSeedInboxQa,
  shopifyPublicUrlGate,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const launchId = miniLaunchOsPacket?.launch?.launchId
    ?? miniLaunchGroupDryRun?.launch?.launchId
    ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar';
  const resourceName = miniLaunchOsPacket?.launch?.resourceName
    ?? miniLaunchGroupDryRun?.launch?.resourceName
    ?? 'Inteligencia para descansar';
  const audienceCandidate = miniLaunchOsPacket?.receiptPlan?.audienceCandidate
    ?? miniLaunchOsPacket?.audiencePosture?.possibleFutureGroup
    ?? miniLaunchPathPacket?.taxonomy?.audienceImplication?.possibleFuture
    ?? 'CC · Audience · Mini-launches · Eligible';
  const currentLegacyAudienceGroup = onboardingTrunkMap?.executiveSummary?.currentAudienceGroup
    ?? onboardingTrunkMap?.currentState?.currentAudience?.historicalGroup
    ?? 'Onboarding complete';
  const currentLegacyAudienceActiveCount = onboardingTrunkMap?.executiveSummary?.currentAudienceActiveCount
    ?? null;
  const futureGeneralNewsletterGroup = onboardingHandoffPolicy?.targetGroups?.audienceEligible
    ?? onboardingV2DesignPacket?.workflowBlueprint?.completionActions
      ?.find((item) => item?.action === 'mark_general_newsletter_eligible')?.group?.name
    ?? 'CC · Audience · General newsletter · Eligible';
  const handoffTargetGroup = onboardingHandoffPolicy?.targetGroups?.eligible
    ?? onboardingTrunkMap?.executiveSummary?.futureHandoffTarget
    ?? 'CC · Journey · Editorial onboarding · Eligible';
  const safetyGroupName = nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupName
    ?? 'CC · Safety · Null audience · DO NOT SEND';
  const safetyGroupActiveCount = nullAudienceReplacementExecutionReceipt?.preflight?.safetyGroupActiveCount ?? null;
  const seedInboxQaGreen =
    nullAudienceSeedInboxQa?.status === 'mailerlite_null_audience_seed_inbox_qa_completed_green_no_live_changes'
    && nullAudienceSeedInboxQa?.deliverySummary?.seedInboxQaGreen === true;
  const publicAudienceSendUrlGateReady = shopifyPublicUrlGate?.executiveSummary?.publicAudienceSendUrlGateReady === true;

  const sourceReceiptGroup = miniLaunchGroupDryRun?.launch?.sourceGroupCandidate
    ?? 'CC · Source · Quiz · Inteligencia para descansar';
  const deliveredReceiptGroup = miniLaunchGroupDryRun?.launch?.deliveredGroupCandidate
    ?? 'CC · Delivered · Quiz result · Inteligencia para descansar';

  const options = [
    buildAudienceScopeOption({
      id: 'keep_null_audience_no_public_send',
      label: 'Keep replacement drafts assigned only to the empty safety audience',
      posture: 'safe_current_state',
      groupName: safetyGroupName,
      knownActiveCount: safetyGroupActiveCount,
      recommendedFor: 'continued QA, archive, or iteration without audience send',
      blockers: ['not_a_public_audience'],
      stillRequires: ['separate public audience decision before any audience send'],
    }),
    buildAudienceScopeOption({
      id: 'existing_legacy_onboarding_complete_campaign_audience',
      label: 'Use the existing practical campaign audience only if Alejandro chooses a broad first public rehearsal',
      posture: 'candidate_requires_exact_decision',
      groupName: currentLegacyAudienceGroup,
      knownActiveCount: currentLegacyAudienceActiveCount,
      recommendedFor: 'broad existing-community send after URL and suppression gates are ready',
      blockers: [
        'exact_public_audience_scope_decision_missing',
        'fresh_audience_membership_scan_missing',
        'suppression_exclusion_policy_missing',
        'public_audience_url_gate_not_ready',
      ],
      stillRequires: [
        'fresh read-only membership/count evidence',
        'unsubscribe/suppression/exclusion check',
        'exact audience-send approval phrase',
      ],
    }),
    buildAudienceScopeOption({
      id: 'future_general_newsletter_eligible',
      label: 'Use the future general newsletter eligibility group after onboarding v2 migration separates Journey from Audience',
      posture: 'future_after_migration',
      groupName: futureGeneralNewsletterGroup,
      knownActiveCount: null,
      recommendedFor: 'stable frequent-launch audience after v2 audience migration',
      blockers: [
        'onboarding_v2_audience_migration_not_complete',
        'fresh_audience_membership_scan_missing',
        'public_audience_url_gate_not_ready',
      ],
      stillRequires: [
        'Onboarding v2 migration/audience eligibility gate',
        'fresh read-only membership/count evidence',
        'exact audience-send approval phrase',
      ],
    }),
    buildAudienceScopeOption({
      id: 'future_mini_launches_eligible',
      label: 'Create/use a dedicated mini-launch audience only if later strategy proves it is needed',
      posture: 'future_optional',
      groupName: audienceCandidate,
      knownActiveCount: null,
      recommendedFor: 'dedicated mini-launch lane after Brand/CRM audience semantics are approved',
      blockers: [
        'dedicated_mini_launch_audience_not_approved',
        'group_creation_or_population_policy_missing',
        'fresh_audience_membership_scan_missing',
      ],
      stillRequires: [
        'Brand/CRM taxonomy decision',
        'fresh group dry-run before any creation',
        'exact group/audience approval phrase',
      ],
    }),
    buildAudienceScopeOption({
      id: 'manual_micro_cohort',
      label: 'Use an exact micro-cohort selected from CRM evidence',
      posture: 'candidate_requires_exact_people',
      groupName: null,
      knownActiveCount: null,
      recommendedFor: 'small first live rehearsal if broad audience feels too large',
      blockers: [
        'exact_people_missing',
        'fresh_audience_membership_scan_missing',
        'suppression_exclusion_policy_missing',
        'public_audience_url_gate_not_ready',
      ],
      stillRequires: [
        'exact people/subscribers evidence',
        'explicit inclusion/exclusion list',
        'exact audience-send approval phrase',
      ],
    }),
  ];

  const blockersBeforeScopeReady = unique([
    'exact_public_audience_scope_decision_missing',
    publicAudienceSendUrlGateReady ? null : 'public_audience_url_gate_not_ready',
    'fresh_audience_membership_scan_missing',
    'suppression_exclusion_policy_missing',
    'current_drafts_point_only_to_empty_safety_group',
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_public_audience_scope_packet',
    generatedAt,
    ok: true,
    status: 'public_audience_scope_packet_ready_blocked_no_live_changes',
    launch: {
      launchId,
      resourceName,
      resourceType: miniLaunchGroupDryRun?.launch?.resourceType ?? 'quiz',
    },
    executiveSummary: {
      audienceScopePacketReady: true,
      seedInboxQaGreen,
      currentDraftAudience: 'null_audience_safety_group_only',
      currentSafetyGroupName: safetyGroupName,
      currentSafetyGroupActiveCount: safetyGroupActiveCount,
      publicAudienceScopeReady: false,
      readyForExactAudienceScopeApproval: false,
      canAskAudienceScopeApprovalNow: false,
      selectedAudienceScopeId: null,
      recommendedDefaultNow: 'keep_null_audience_no_public_send',
      recommendedFutureDecisionPath: 'choose_existing_legacy_audience_micro_cohort_or_archive_after_url_gate_and_fresh_scan',
      candidateOptionCount: options.length,
      blockerCount: blockersBeforeScopeReady.length,
      nextSafeAction: 'Keep Null Audience drafts inert and collect a fresh audience-scope decision packet before any public/audience send request.',
    },
    currentSafeState: {
      draftAudience: safetyGroupName,
      safetyGroupActiveCount,
      seedInboxQaGreen,
      receiptGroupsExistButAreNotAudienceScope: true,
      sourceReceiptGroup: {
        name: sourceReceiptGroup,
        activeCount: groupActiveCount(miniLaunchGroupDryRun, sourceReceiptGroup),
        role: 'receipt_after_source_capture_not_send_audience',
      },
      deliveredReceiptGroup: {
        name: deliveredReceiptGroup,
        activeCount: groupActiveCount(miniLaunchGroupDryRun, deliveredReceiptGroup),
        role: 'receipt_after_result_delivery_not_send_audience',
      },
    },
    audienceScopeOptions: options,
    audienceDecisionRequirements: [
      'Exact selected group, segment or micro-cohort.',
      'Fresh read-only membership/count evidence before send approval.',
      'Suppression, unsubscribe and exclusion posture checked before send approval.',
      'URL lifecycle gate green for audience sending.',
      `No silent assignment to ${handoffTargetGroup} or production onboarding v1.`,
      'Separate exact public/audience send approval before any send.',
    ],
    blockersBeforeScopeReady,
    hardStops: [
      'No public or audience send.',
      'No subscriber import, assignment, suppression change or segment mutation.',
      'No group creation or assignment.',
      'No workflow or automation changes.',
      'No Shopify publish or form connection.',
      'No CRM live API writes, Signal Ledger append, card writes, scoring changes or Fact Store writes.',
      'No exact public/audience send phrase printed or requested from this packet.',
    ],
    sourceDigests,
    safety,
  };
};

const loadPacketFromFiles = async (options) => {
  const sources = await Promise.all([
    readJsonWithDigest(options.miniLaunchOsPacket, 'mini-launch audience posture and candidate audience group'),
    readJsonWithDigest(options.miniLaunchPathPacket, 'mini-launch path audience implication'),
    readJsonWithDigest(options.onboardingTrunkMap, 'current practical campaign audience and future onboarding handoff target'),
    readJsonWithDigest(options.onboardingV2DesignPacket, 'future audience eligibility group and migration blockers'),
    readJsonWithDigest(options.onboardingHandoffPolicy, 'mini-launch to onboarding boundary and audience eligible target'),
    readJsonWithDigest(options.miniLaunchGroupDryRun, 'receipt groups and active counts without subscriber rows'),
    readJsonWithDigest(options.nullAudienceReplacementExecutionReceipt, 'current Null Audience safety draft assignment'),
    readJsonWithDigest(options.nullAudienceSeedInboxQa, 'seed inbox QA status as test-only evidence'),
    readJsonWithDigest(options.shopifyPublicUrlGate, 'URL lifecycle gate before any audience scope can be used'),
  ]);

  return buildPublicAudienceScopePacket({
    miniLaunchOsPacket: sources[0].value,
    miniLaunchPathPacket: sources[1].value,
    onboardingTrunkMap: sources[2].value,
    onboardingV2DesignPacket: sources[3].value,
    onboardingHandoffPolicy: sources[4].value,
    miniLaunchGroupDryRun: sources[5].value,
    nullAudienceReplacementExecutionReceipt: sources[6].value,
    nullAudienceSeedInboxQa: sources[7].value,
    shopifyPublicUrlGate: sources[8].value,
    sourceDigests: sources.map((source) => source.digest),
  });
};

const renderList = (items) => (items.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (report) => [
  '# MailerLite Mini-Launch Public Audience Scope Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  `Launch: ${report.launch.resourceName}`,
  '',
  '## Executive Summary',
  '',
  `- Audience scope packet ready: ${report.executiveSummary.audienceScopePacketReady}`,
  `- Seed inbox QA green: ${report.executiveSummary.seedInboxQaGreen}`,
  `- Current draft audience: ${report.executiveSummary.currentDraftAudience}`,
  `- Current safety group active count: ${report.executiveSummary.currentSafetyGroupActiveCount}`,
  `- Public/audience scope ready: ${report.executiveSummary.publicAudienceScopeReady}`,
  `- Ready for exact audience scope approval: ${report.executiveSummary.readyForExactAudienceScopeApproval}`,
  `- Can ask audience scope approval now: ${report.executiveSummary.canAskAudienceScopeApprovalNow}`,
  `- Recommended default now: ${report.executiveSummary.recommendedDefaultNow}`,
  `- Recommended future decision path: ${report.executiveSummary.recommendedFutureDecisionPath}`,
  `- Blocker count: ${report.executiveSummary.blockerCount}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Audience Scope Options',
  '',
  renderList(report.audienceScopeOptions.map((option) =>
    `${option.id}: ${option.posture}; group=${option.groupName ?? 'none'}; count=${option.knownActiveCount ?? 'unknown'}; blockers=${option.blockers.join('|') || 'none'}`)),
  '',
  '## Decision Requirements',
  '',
  renderList(report.audienceDecisionRequirements),
  '',
  '## Blockers Before Scope Ready',
  '',
  renderList(report.blockersBeforeScopeReady),
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
  if (!closedSafety(report.safety)) throw new Error('safety_not_closed');

  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    publicAudienceScopeReady: report.executiveSummary.publicAudienceScopeReady,
    readyForExactAudienceScopeApproval: report.executiveSummary.readyForExactAudienceScopeApproval,
    canAskAudienceScopeApprovalNow: report.executiveSummary.canAskAudienceScopeApprovalNow,
    recommendedDefaultNow: report.executiveSummary.recommendedDefaultNow,
    recommendedFutureDecisionPath: report.executiveSummary.recommendedFutureDecisionPath,
    candidateOptionCount: report.executiveSummary.candidateOptionCount,
    blockerCount: report.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch public audience scope packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPublicAudienceScopePacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
