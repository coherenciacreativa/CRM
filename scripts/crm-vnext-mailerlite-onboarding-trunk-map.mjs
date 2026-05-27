#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-trunk-map-2026-05-27';
const DEFAULT_ONBOARDING_V1_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_ONBOARDING_V2_DESIGN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_ONBOARDING_HANDOFF_POLICY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_onboarding_handoff_policy_inteligencia_descansar_2026-05-27.json';
const DEFAULT_CADENCE_BOARD = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-trunk-map.mjs [options]

Options:
  --onboarding-v1-audit <path>       Onboarding v1 audit JSON. Defaults to ${DEFAULT_ONBOARDING_V1_AUDIT}
  --onboarding-v2-design <path>      Onboarding v2 design JSON. Defaults to ${DEFAULT_ONBOARDING_V2_DESIGN}
  --onboarding-handoff-policy <path> Mini-launch to onboarding handoff JSON. Defaults to ${DEFAULT_ONBOARDING_HANDOFF_POLICY}
  --cadence-board <path>             Mini-launch cadence board JSON. Defaults to ${DEFAULT_CADENCE_BOARD}
  --out <path>                       Write JSON packet
  --markdown-out <path>              Write Markdown packet
  --help                             Show this help

Local-only operating map for the productive editorial onboarding trunk. It
summarizes how v1 works today, how v2 should preserve it, and how mini-launches
may recommend a future handoff without routing people into onboarding. It never
calls MailerLite, Shopify or CRM APIs, reads subscriber rows, edits workflows,
creates groups, assigns subscribers, sends emails, appends ledgers, writes
cards, changes scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    onboardingV1Audit: DEFAULT_ONBOARDING_V1_AUDIT,
    onboardingV2Design: DEFAULT_ONBOARDING_V2_DESIGN,
    onboardingHandoffPolicy: DEFAULT_ONBOARDING_HANDOFF_POLICY,
    cadenceBoard: DEFAULT_CADENCE_BOARD,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--onboarding-v1-audit') options.onboardingV1Audit = argv[++index];
    else if (arg === '--onboarding-v2-design') options.onboardingV2Design = argv[++index];
    else if (arg === '--onboarding-handoff-policy') options.onboardingHandoffPolicy = argv[++index];
    else if (arg === '--cadence-board') options.cadenceBoard = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const asArray = (value) => Array.isArray(value) ? value : [];

const groupByName = (groups, name) => asArray(groups).find((group) => group?.name === name) ?? null;

const receiptPlanFor = (design, order) =>
  asArray(design?.workflowBlueprint?.emailReceipts).find((email) => email?.order === order) ?? null;

const groupName = (group) => group?.name ?? null;

const buildCurrentUse = (audit) => {
  const historicalGroups = asArray(audit?.historicalGroups);
  const workflow = audit?.workflow ?? {};
  const trigger = asArray(workflow?.triggers)[0] ?? null;
  const completionGroup = groupByName(historicalGroups, 'Onboarding complete');

  return {
    role: 'protected_relationship_deepening_trunk',
    workflow: {
      id: workflow.id ?? null,
      name: workflow.name ?? null,
      enabled: workflow.enabled === true,
      complete: workflow.complete === true,
      broken: workflow.broken === true,
      stepsCount: workflow.stepsCount ?? null,
      emailsCount: workflow.emailsCount ?? null,
    },
    trigger: {
      type: trigger?.type ?? null,
      historicalGroup: trigger?.groups?.[0]?.name ?? null,
      vNextSourceMapping: groupByName(historicalGroups, 'leads_instagram.csv')?.vNextMapping ?? null,
      posture: groupByName(historicalGroups, 'leads_instagram.csv')?.recommendedPosture ?? null,
    },
    currentAudience: {
      historicalGroup: completionGroup?.name ?? null,
      activeCount: completionGroup?.activeCount ?? null,
      currentRole: completionGroup?.role ?? null,
      vNextMapping: completionGroup?.vNextMapping ?? null,
      posture: completionGroup?.recommendedPosture ?? null,
      caution: completionGroup?.risk ?? null,
    },
    historicalGroups: historicalGroups.map((group) => ({
      name: group.name,
      role: group.role,
      activeCount: group.activeCount ?? null,
      vNextMapping: group.vNextMapping,
      posture: group.recommendedPosture,
      risk: group.risk,
    })),
  };
};

const buildSequenceMap = ({ audit, design }) => asArray(audit?.workflow?.graph?.emailSequence).map((email) => {
  const plan = receiptPlanFor(design, email.order);
  const recommendedReceiptGroup = plan?.recommendedReceiptGroup ?? null;
  const posture = email.order === 1 && !recommendedReceiptGroup
    ? 'welcome_orientation_no_sent_receipt'
    : recommendedReceiptGroup
      ? 'sent_receipt_after_email_if_v2_action_verified'
      : 'needs_brand_mapping_before_receipt';

  return {
    order: email.order,
    subject: email.subject ?? null,
    name: email.name ?? null,
    contentId: email.contentId ?? plan?.contentId ?? null,
    currentStats: {
      sent: email.stats?.sent ?? null,
      opens: email.stats?.opens ?? null,
      clicks: email.stats?.clicks ?? null,
      unsubscribes: email.stats?.unsubscribes ?? null,
    },
    v2ReceiptPlan: {
      posture,
      recommendedGroup: recommendedReceiptGroup,
      dictionaryStatus: plan?.dictionaryStatus ?? null,
      v2Action: plan?.v2Action ?? null,
      safetyNote: plan?.safetyNote ?? null,
    },
    operatorRule: recommendedReceiptGroup
      ? 'Sent marca que el sistema envio ese contenido; no prueba lectura, apertura, click ni interes.'
      : 'No crear recibo Sent hasta que Brand/CRM tengan un content_id o una razon operativa clara.',
  };
});

const buildFutureArchitecture = ({ design, handoffPolicy, cadenceBoard }) => ({
  v2Posture: {
    recommendedPath: design?.decision?.recommendedOption ?? design?.decision?.option ?? 'option_b_light_clone_onboarding_v2_then_switch_entry',
    productionV1Posture: design?.workflowBlueprint?.productionV1Posture ?? null,
    proposedWorkflowName: design?.workflowBlueprint?.proposedWorkflowName ?? null,
    triggerGroup: groupName(design?.workflowBlueprint?.trigger?.group),
    triggerRationale: design?.workflowBlueprint?.trigger?.rationale ?? null,
    groupsStillNeedingResolution: asArray(design?.groupWorkNeededBeforeV2Pilot?.missingOrProposedGroups).map((group) => ({
      name: group.name,
      layer: group.layer,
      status: group.status,
      meaning: group.meaning,
    })),
    completionActions: asArray(design?.workflowBlueprint?.completionActions).map((action) => ({
      action: action.action,
      group: groupName(action.group),
      status: action.group?.status ?? null,
      note: action.note ?? null,
    })),
  },
  miniLaunchRelationship: {
    role: 'marked_entry_points_and_market_learning_tributaries',
    cadenceNow: cadenceBoard?.cadenceStrategy?.currentCadence ?? cadenceBoard?.cadenceStrategy?.recommendedNow ?? null,
    fasterCadenceCondition: cadenceBoard?.cadenceStrategy?.fasterCadenceCondition ?? null,
    currentPilot: cadenceBoard?.currentPilot?.launchId ?? handoffPolicy?.launch?.launchId ?? null,
    handoffTargetGroup: handoffPolicy?.targetGroups?.eligible ?? null,
    recommendationIsRouting: false,
    requiredBeforeFutureRoute: asArray(handoffPolicy?.recommendationInputs).map((input) => ({
      id: input.id,
      status: input.status,
      meaning: input.meaning,
      notEnoughByItself: input.notEnoughByItself ?? [],
    })),
    handoffLadder: asArray(handoffPolicy?.handoffLadder).map((step) => ({
      step: step.step,
      action: step.action,
      currentState: step.currentState,
      eventKind: step.eventKind,
      closedGate: step.closedGate,
    })),
  },
});

const buildOperatorContract = ({ handoffPolicy, design }) => ({
  allowedNow: [
    'Use this map as local operator guidance.',
    'Generate reports, dry-runs and department review packets.',
    'Let mini-launches collect Source/Delivered/Sent proposals only inside their own gates.',
  ],
  closedNow: [
    ...asArray(handoffPolicy?.approvalBoundary?.closedNow),
    ...asArray(design?.approvalGates)
      .filter((gate) => gate?.allowedNow === false)
      .map((gate) => `${gate.gate}: ${gate.approvalNeeded}`),
  ],
  invariants: [
    'Onboarding v1 remains live until an exact workflow action is approved.',
    'A mini-launch recommendation is not a MailerLite group assignment.',
    'Sent receipt means system delivery, not reading, interest, trust or readiness to buy.',
    'Onboarding complete remains the current practical campaign audience until v2 migration separates Journey and Audience cleanly.',
    'Brand Hub is canon for semantic group names; CRM is the operational cache and signal interpreter.',
  ],
  laterApprovalMustName: [
    'exact group(s)',
    'subscriber/test cohort',
    'workflow posture',
    'test-only or audience-facing scope',
    'rollback/reinsert plan if any production onboarding state is touched',
  ],
});

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  groupsMutated: false,
  workflowsMutated: false,
  sendsPerformed: false,
  signalLedgerAppended: false,
  cardsOrScoringMutated: false,
  factStoreMutated: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildOnboardingTrunkMap = ({
  onboardingV1Audit,
  onboardingV2Design,
  onboardingHandoffPolicy,
  cadenceBoard,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const currentUse = buildCurrentUse(onboardingV1Audit);
  const sequenceMap = buildSequenceMap({ audit: onboardingV1Audit, design: onboardingV2Design });
  const futureArchitecture = buildFutureArchitecture({
    design: onboardingV2Design,
    handoffPolicy: onboardingHandoffPolicy,
    cadenceBoard,
  });
  const operatorContract = buildOperatorContract({
    handoffPolicy: onboardingHandoffPolicy,
    design: onboardingV2Design,
  });

  const isProtected = currentUse.workflow.enabled
    && currentUse.workflow.complete
    && !currentUse.workflow.broken
    && futureArchitecture.miniLaunchRelationship.recommendationIsRouting === false;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_onboarding_trunk_map',
    generatedAt,
    ok: true,
    status: isProtected
      ? 'onboarding_trunk_map_ready_no_live_changes'
      : 'onboarding_trunk_map_needs_review_no_live_changes',
    executiveSummary: {
      currentOnboardingRole: currentUse.role,
      workflow: currentUse.workflow.name,
      enabled: currentUse.workflow.enabled,
      sequenceItems: sequenceMap.length,
      currentAudienceGroup: currentUse.currentAudience.historicalGroup,
      currentAudienceActiveCount: currentUse.currentAudience.activeCount,
      futureHandoffTarget: futureArchitecture.miniLaunchRelationship.handoffTargetGroup,
      recommendationIsRouting: false,
      liveActionAllowedNow: false,
      nextUsefulMove: 'Use this map before department reviews, v2 group approval packets, seed tests or any mini-launch-to-onboarding route.',
    },
    currentUse,
    sequenceMap,
    futureArchitecture,
    operatorContract,
    safety: buildSafety(),
    sourceDigests,
  };
};

const sourceDigest = async (path, consultedFor) => {
  const content = await readFile(resolve(path), 'utf8');
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    consultedFor,
  };
};

const buildMapFromFiles = async (options) => {
  const [
    onboardingV1Audit,
    onboardingV2Design,
    onboardingHandoffPolicy,
    cadenceBoard,
    ...sourceDigests
  ] = await Promise.all([
    readFile(resolve(options.onboardingV1Audit), 'utf8').then(JSON.parse),
    readFile(resolve(options.onboardingV2Design), 'utf8').then(JSON.parse),
    readFile(resolve(options.onboardingHandoffPolicy), 'utf8').then(JSON.parse),
    readFile(resolve(options.cadenceBoard), 'utf8').then(JSON.parse),
    sourceDigest(options.onboardingV1Audit, 'current productive onboarding workflow, sequence and historical groups'),
    sourceDigest(options.onboardingV2Design, 'target v2 trigger, receipts and approval gates'),
    sourceDigest(options.onboardingHandoffPolicy, 'mini-launch to onboarding recommendation boundary'),
    sourceDigest(options.cadenceBoard, 'mini-launch cadence and pipeline posture'),
  ]);

  return buildOnboardingTrunkMap({
    onboardingV1Audit,
    onboardingV2Design,
    onboardingHandoffPolicy,
    cadenceBoard,
    sourceDigests,
  });
};

const renderList = (items) => asArray(items).map((item) => `- ${item}`).join('\n');

const renderMarkdown = (map) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding Trunk Map',
    '',
    `Generated: ${map.generatedAt}`,
    `Status: ${map.status}`,
    '',
    '## Executive Summary',
    '',
    `- Current onboarding role: ${map.executiveSummary.currentOnboardingRole}`,
    `- Workflow: ${map.executiveSummary.workflow}`,
    `- Enabled: ${map.executiveSummary.enabled}`,
    `- Sequence items: ${map.executiveSummary.sequenceItems}`,
    `- Current audience group: ${map.executiveSummary.currentAudienceGroup} (${map.executiveSummary.currentAudienceActiveCount})`,
    `- Future handoff target: ${map.executiveSummary.futureHandoffTarget}`,
    `- Recommendation is routing: ${map.executiveSummary.recommendationIsRouting}`,
    `- Live action allowed now: ${map.executiveSummary.liveActionAllowedNow}`,
    '',
    '## Current Productive Trunk',
    '',
    `- Workflow id: ${map.currentUse.workflow.id}`,
    `- Steps/emails: ${map.currentUse.workflow.stepsCount} / ${map.currentUse.workflow.emailsCount}`,
    `- Trigger: ${map.currentUse.trigger.type} via ${map.currentUse.trigger.historicalGroup}`,
    `- vNext source mapping: ${map.currentUse.trigger.vNextSourceMapping}`,
    `- Completion/audience group: ${map.currentUse.currentAudience.historicalGroup}`,
    `- Audience caution: ${map.currentUse.currentAudience.caution}`,
    '',
    '## Sequence Map',
    '',
  ];

  for (const item of map.sequenceMap) {
    lines.push(`- ${item.order}. ${item.subject}`);
    lines.push(`  - content_id: ${item.contentId ?? 'none'}`);
    lines.push(`  - receipt posture: ${item.v2ReceiptPlan.posture}`);
    lines.push(`  - receipt group: ${item.v2ReceiptPlan.recommendedGroup ?? 'none'}`);
    lines.push(`  - stats sent/open/click: ${item.currentStats.sent}/${item.currentStats.opens}/${item.currentStats.clicks}`);
  }

  lines.push(
    '',
    '## Mini-Launch Relationship',
    '',
    `- Role: ${map.futureArchitecture.miniLaunchRelationship.role}`,
    `- Current pilot: ${map.futureArchitecture.miniLaunchRelationship.currentPilot}`,
    `- Handoff target: ${map.futureArchitecture.miniLaunchRelationship.handoffTargetGroup}`,
    '- Recommendation is not routing.',
    '',
    '## Operator Contract',
    '',
    'Allowed now:',
    renderList(map.operatorContract.allowedNow),
    '',
    'Closed now:',
    renderList(map.operatorContract.closedNow),
    '',
    'Invariants:',
    renderList(map.operatorContract.invariants),
    '',
    'Later approval must name:',
    renderList(map.operatorContract.laterApprovalMustName),
    '',
    '## Fuentes Consultadas',
    '',
  );

  for (const source of map.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push(
    '',
    '## Safety',
    '',
    '- Local-only.',
    '- No MailerLite, Shopify or CRM live API calls.',
    '- No subscriber rows read.',
    '- No group, workflow, send, ledger, card, scoring or Fact Store mutation.',
    '- No outbound.'
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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const map = await buildMapFromFiles(options);
  if (options.out) await writeJson(options.out, map);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(map));

  console.log(JSON.stringify({
    ok: map.ok,
    status: map.status,
    generatedAt: map.generatedAt,
    workflow: map.executiveSummary.workflow,
    sequenceItems: map.executiveSummary.sequenceItems,
    currentAudienceGroup: map.executiveSummary.currentAudienceGroup,
    futureHandoffTarget: map.executiveSummary.futureHandoffTarget,
    recommendationIsRouting: map.executiveSummary.recommendationIsRouting,
    liveActionAllowedNow: map.executiveSummary.liveActionAllowedNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: map.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding trunk map failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCurrentUse,
  buildFutureArchitecture,
  buildOnboardingTrunkMap,
  buildOperatorContract,
  buildSequenceMap,
  parseArgs,
  renderMarkdown,
};
