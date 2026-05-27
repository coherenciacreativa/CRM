#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-onboarding-handoff-policy-2026-05-27';

const DEFAULT_MINI_LAUNCH_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_event_contract_2026-05-27.json';
const DEFAULT_EMAIL_SEQUENCE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_READINESS_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json';
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_DESIGN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_BRAND_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-onboarding-handoff-policy.mjs [options]

Options:
  --mini-launch-event-contract <path>  Mini-launch event contract JSON. Defaults to ${DEFAULT_MINI_LAUNCH_EVENT_CONTRACT}
  --onboarding-event-contract <path>   Onboarding v2 event contract JSON. Defaults to ${DEFAULT_ONBOARDING_EVENT_CONTRACT}
  --email-sequence <path>              Mini-launch email sequence asset JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE}
  --readiness-board <path>             Mini-launch readiness board JSON. Defaults to ${DEFAULT_READINESS_BOARD}
  --onboarding-v1-audit <path>         Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-v2-design <path>        Onboarding v2 design JSON. Defaults to ${DEFAULT_ONBOARDING_V2_DESIGN}
  --brand-taxonomy <path>              Brand Hub MailerLite taxonomy doc. Defaults to ${DEFAULT_BRAND_TAXONOMY}
  --brand-dictionary <path>            Brand Hub concrete group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --out <path>                         Write JSON report
  --markdown-out <path>                Write Markdown report
  --help                               Show this help

Local-only policy packet for mini-launch-to-onboarding handoff. It defines when
a mini-launch can recommend editorial onboarding, what evidence is required, and
which gates stay closed. It does not assign groups, edit workflows, append CRM
events, send email, or call live APIs.`;

const parseArgs = (argv) => {
  const options = {
    miniLaunchEventContract: DEFAULT_MINI_LAUNCH_EVENT_CONTRACT,
    onboardingEventContract: DEFAULT_ONBOARDING_EVENT_CONTRACT,
    emailSequence: DEFAULT_EMAIL_SEQUENCE,
    readinessBoard: DEFAULT_READINESS_BOARD,
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingV2Design: DEFAULT_ONBOARDING_V2_DESIGN,
    brandTaxonomy: DEFAULT_BRAND_TAXONOMY,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--mini-launch-event-contract') options.miniLaunchEventContract = argv[++index];
    else if (arg === '--onboarding-event-contract') options.onboardingEventContract = argv[++index];
    else if (arg === '--email-sequence') options.emailSequence = argv[++index];
    else if (arg === '--readiness-board') options.readinessBoard = argv[++index];
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-v2-design') options.onboardingV2Design = argv[++index];
    else if (arg === '--brand-taxonomy' || arg === '--taxonomy') options.brandTaxonomy = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
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
  sourceDigest(options.miniLaunchEventContract, 'mini-launch events and CRM signal boundary'),
  sourceDigest(options.onboardingEventContract, 'onboarding v2 events and handoff recommendation event'),
  sourceDigest(options.emailSequence, 'current launch email sequence and onboarding handoff posture'),
  sourceDigest(options.readinessBoard, 'closed live gates and launch readiness state'),
  sourceDigest(options.onboardingV1Audit, 'production onboarding v1 protection state'),
  sourceDigest(options.onboardingV2Design, 'target onboarding v2 trigger and group model'),
  sourceDigest(options.brandTaxonomy, 'Brand Hub canonical MailerLite group semantics'),
  sourceDigest(options.brandDictionary, 'Brand Hub concrete group dictionary and live/candidate states'),
]);

const eventKindsFrom = (contract) => (contract?.eventContract ?? [])
  .map((event) => event.eventKind)
  .filter(Boolean);

const findEvent = (contract, eventKind) =>
  (contract?.eventContract ?? []).find((event) => event.eventKind === eventKind) ?? null;

const groupFromDesign = (design, key, fallback) => {
  const text = JSON.stringify(design ?? {});
  if (text.includes(fallback)) return fallback;
  if (design?.workflowBlueprint?.trigger?.group?.name && key === 'eligible') {
    return design.workflowBlueprint.trigger.group.name;
  }
  return fallback;
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildRecommendationInputs = ({ launch, targetGroups }) => [
  {
    id: 'consent_and_identity_anchor',
    status: 'required_before_any_future_route',
    meaning: 'The person has a stable email/personId and has not unsubscribed or been suppressed.',
    acceptableEvidence: ['email_submitted', 'email_reply', 'known_personId', 'no email_suppression'],
    notEnoughByItself: ['instagram_like', 'email_open', 'Source receipt', 'Delivered receipt'],
  },
  {
    id: 'launch_delivery_completed',
    status: 'required_for_recommendation',
    meaning: 'The promised mini-launch result/resource was actually delivered.',
    acceptableEvidence: ['resource_delivered', launch.deliveredGroupCandidate].filter(Boolean),
    notEnoughByItself: ['form submission without delivery', 'landing_preview_ready'],
  },
  {
    id: 'engagement_or_explicit_interest',
    status: 'recommended_before_handoff_recommendation',
    meaning: 'There is a real signal that onboarding would deepen the relationship rather than feel like an automatic funnel.',
    acceptableEvidence: ['email_reply', 'email_click', 'quiz_or_game_completed with result', 'market_signal_reviewed'],
    notEnoughByItself: ['single email_open', 'receipt assignment'],
  },
  {
    id: 'onboarding_capacity_and_boundary',
    status: 'required_before_route',
    meaning: 'Production onboarding v1 remains protected; v2 trigger route is explicit and not attached to active v1 by default.',
    acceptableEvidence: [targetGroups.eligible],
    notEnoughByItself: ['onboarding_handoff_recommended event'],
  },
];

const buildHandoffLadder = ({ launch, targetGroups }) => [
  {
    step: 1,
    action: 'store_or_preview_market_signal',
    currentAllowedState: 'local_or_crm_review_only',
    eventKind: 'market_signal_reviewed',
    effect: 'Supports product learning and possible future handoff recommendation.',
    closedGate: 'No Signal Ledger append unless separately approved.',
  },
  {
    step: 2,
    action: 'recommend_onboarding_handoff',
    currentAllowedState: 'store_only_event_contract',
    eventKind: 'onboarding_handoff_recommended',
    effect: `Creates a recommendation toward ${targetGroups.eligible}, not a MailerLite assignment.`,
    closedGate: 'No MailerLite group assignment, workflow trigger or subscriber mutation.',
  },
  {
    step: 3,
    action: 'assign_onboarding_eligibility_group',
    currentAllowedState: 'closed_until_exact_approval',
    eventKind: 'onboarding_eligibility_assigned',
    effect: `Would assign ${targetGroups.eligible} later if approved.`,
    closedGate: 'Requires exact Alejandro approval, fresh scan, protected workflow check and subscriber scope.',
  },
  {
    step: 4,
    action: 'start_onboarding_v2',
    currentAllowedState: 'closed_until_v2_activation_approval',
    eventKind: 'onboarding_started',
    effect: 'Would start the protected editorial onboarding journey after v2 exists.',
    closedGate: 'No activation/switch from production v1 in this packet.',
  },
  {
    step: 5,
    action: 'complete_onboarding_and_enter_newsletter_audience',
    currentAllowedState: 'future_state_only',
    eventKind: 'onboarding_completed',
    effect: `Later lifecycle can lead to ${targetGroups.audienceEligible}.`,
    closedGate: 'Audience sends remain separate approval.',
  },
].map((item) => ({
  ...item,
  sourceLaunchId: launch.launchId,
}));

const buildApprovalBoundary = () => ({
  allowedNow: [
    'Use this policy as local operator guidance.',
    'Use it in Brand/Web/CRM review context.',
    'Use it to design dry-runs and future approval packets.',
  ],
  closedNow: [
    'Assign any subscriber to onboarding eligibility.',
    'Attach mini-launch participants to active onboarding v1.',
    'Activate or edit an onboarding workflow.',
    'Append onboarding_handoff_recommended to Signal Ledger.',
    'Create groups, modify subscribers, send emails, score contacts or write Fact Store.',
  ],
  approvalPhraseNeededLater: 'Exact approval must name the group, subscriber/test cohort, workflow posture, and whether the action is test-only or audience-facing.',
});

const buildPolicy = ({
  miniLaunchEventContract,
  onboardingEventContract,
  emailSequence,
  readinessBoard,
  onboardingV1Audit,
  onboardingV2Design,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const launch = {
    ...(miniLaunchEventContract?.launch ?? emailSequence?.launch ?? readinessBoard?.launch ?? {}),
    sourceGroupCandidate: miniLaunchEventContract?.launch?.sourceGroupCandidate
      ?? emailSequence?.launch?.sourceGroupCandidate
      ?? null,
    deliveredGroupCandidate: miniLaunchEventContract?.launch?.deliveredGroupCandidate
      ?? emailSequence?.launch?.deliveredGroupCandidate
      ?? null,
  };
  const targetGroups = {
    eligible: groupFromDesign(onboardingV2Design, 'eligible', 'CC · Journey · Editorial onboarding · Eligible'),
    inProgress: groupFromDesign(onboardingV2Design, 'in_progress', 'CC · Journey · Editorial onboarding · In progress'),
    complete: groupFromDesign(onboardingV2Design, 'complete', 'CC · Journey · Editorial onboarding · Complete'),
    audienceEligible: 'CC · Audience · General newsletter · Eligible',
  };
  const miniLaunchEvents = eventKindsFrom(miniLaunchEventContract);
  const onboardingEvents = eventKindsFrom(onboardingEventContract);
  const handoffEvent = findEvent(onboardingEventContract, 'onboarding_handoff_recommended');
  const requiredMiniLaunchEvents = [
    'email_submitted',
    'source_assigned',
    'quiz_or_game_completed',
    'resource_delivered',
    'email_click',
    'email_reply',
    'market_signal_reviewed',
  ];
  const requiredOnboardingEvents = [
    'onboarding_handoff_recommended',
    'onboarding_eligibility_assigned',
    'onboarding_started',
    'onboarding_completed',
    'audience_eligibility_assigned',
  ];
  const missingEvents = [
    ...requiredMiniLaunchEvents.filter((eventKind) => !miniLaunchEvents.includes(eventKind)),
    ...requiredOnboardingEvents.filter((eventKind) => !onboardingEvents.includes(eventKind)),
  ];
  const v1Protected = onboardingV1Audit?.workflow?.enabled === true
    && onboardingV1Audit?.workflow?.complete === true
    && onboardingV1Audit?.workflow?.broken === false;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_onboarding_handoff_policy',
    generatedAt,
    ok: true,
    status: missingEvents.length
      ? 'blocked_missing_handoff_event_contracts_no_live_changes'
      : 'mini_launch_onboarding_handoff_policy_ready_no_live_changes',
    launch,
    targetGroups,
    v1Protection: {
      productionV1Protected: v1Protected,
      workflowName: onboardingV1Audit?.workflow?.name ?? null,
      workflowEnabled: onboardingV1Audit?.workflow?.enabled ?? null,
      workflowComplete: onboardingV1Audit?.workflow?.complete ?? null,
      workflowBroken: onboardingV1Audit?.workflow?.broken ?? null,
      rule: 'Mini-launches may recommend onboarding but cannot insert anyone into production v1 automatically.',
    },
    contractCoverage: {
      miniLaunchEvents,
      onboardingEvents,
      missingEvents,
      handoffEventProjectionPosture: handoffEvent?.projectionPosture ?? null,
      handoffEventApprovalGate: handoffEvent?.approvalGate ?? null,
    },
    recommendationInputs: buildRecommendationInputs({ launch, targetGroups }),
    handoffLadder: buildHandoffLadder({ launch, targetGroups }),
    approvalBoundary: buildApprovalBoundary(),
    operatorRule: 'Recommendation is not routing. Routing requires a later exact approval and a fresh protected workflow/subscriber scan.',
    nextSafeStep: missingEvents.length
      ? 'Fix event contracts before using this policy.'
      : 'Use this policy in CRM/Brand review and future dry-runs; do not route any subscriber into onboarding yet.',
    safety: buildSafety(),
    sourceDigests,
  };
};

const buildPolicyFromFiles = async (options) => {
  const [
    miniLaunchEventContract,
    onboardingEventContract,
    emailSequence,
    readinessBoard,
    onboardingV1Audit,
    onboardingV2Design,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.miniLaunchEventContract),
    readJson(options.onboardingEventContract),
    readJson(options.emailSequence),
    readJson(options.readinessBoard),
    readJson(options.onboardingV1Audit),
    readJson(options.onboardingV2Design),
    loadSourceDigests(options),
  ]);

  return buildPolicy({
    miniLaunchEventContract,
    onboardingEventContract,
    emailSequence,
    readinessBoard,
    onboardingV1Audit,
    onboardingV2Design,
    sourceDigests,
  });
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (policy) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-launch to Onboarding Handoff Policy',
    '',
    `Generated: ${policy.generatedAt}`,
    `Status: ${policy.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete define el puente seguro entre mini-lanzamientos y onboarding editorial: una recomendacion puede existir, pero no equivale a enrutar a una persona a MailerLite ni a activar un workflow.',
    '',
    '## Launch',
    '',
    `- Launch ID: ${policy.launch.launchId}`,
    `- Resource: ${policy.launch.resourceName}`,
    `- Source candidate: ${policy.launch.sourceGroupCandidate}`,
    `- Delivered candidate: ${policy.launch.deliveredGroupCandidate}`,
    '',
    '## Target Groups',
    '',
  ];

  for (const [key, value] of Object.entries(policy.targetGroups)) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push('', '## Handoff Ladder', '');
  for (const step of policy.handoffLadder) {
    lines.push(`### ${step.step}. ${step.action}`);
    lines.push(`- Current state: ${step.currentAllowedState}`);
    lines.push(`- Event: ${step.eventKind}`);
    lines.push(`- Effect: ${step.effect}`);
    lines.push(`- Closed gate: ${step.closedGate}`);
    lines.push('');
  }

  lines.push('## Required Inputs', '');
  for (const input of policy.recommendationInputs) {
    lines.push(`### ${input.id}`);
    lines.push(`- Status: ${input.status}`);
    lines.push(`- Meaning: ${input.meaning}`);
    lines.push(`- Acceptable evidence: ${input.acceptableEvidence.join(', ')}`);
    lines.push(`- Not enough by itself: ${input.notEnoughByItself.join(', ')}`);
    lines.push('');
  }

  lines.push('## Approval Boundary', '');
  lines.push('Allowed now:');
  lines.push(renderList(policy.approvalBoundary.allowedNow));
  lines.push('');
  lines.push('Closed now:');
  lines.push(renderList(policy.approvalBoundary.closedNow));
  lines.push('');
  lines.push(`Later approval phrase: ${policy.approvalBoundary.approvalPhraseNeededLater}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of policy.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo reportes; no escribe ledgers ni respuestas finales.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, cards, scoring ni Fact Store.');

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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const policy = await buildPolicyFromFiles(options);
  if (options.out) await writeJson(options.out, policy);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(policy));

  console.log(JSON.stringify({
    ok: policy.ok,
    status: policy.status,
    generatedAt: policy.generatedAt,
    launchId: policy.launch.launchId,
    targetEligibleGroup: policy.targetGroups.eligible,
    missingEvents: policy.contractCoverage.missingEvents,
    productionV1Protected: policy.v1Protection.productionV1Protected,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: policy.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch onboarding handoff policy failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalBoundary,
  buildHandoffLadder,
  buildPolicy,
  buildRecommendationInputs,
  buildSafety,
  eventKindsFrom,
  parseArgs,
  renderMarkdown,
};
