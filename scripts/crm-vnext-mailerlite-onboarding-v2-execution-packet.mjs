#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-execution-packet-2026-05-27';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_EMPTY_GROUPS_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_dry_run_packet_2026-05-27.json';
const DEFAULT_EMPTY_GROUPS_CREATE_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_empty_groups_create_dry_run_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_os_v0_packet_2026-05-27.json';
const DEFAULT_MINI_LAUNCH_REHEARSAL = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_FIRST_EMAIL_MAPPING = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_first_email_mapping_2026-05-27.json';
const DEFAULT_BLUEPRINT = 'docs/crm-vnext/mailerlite-onboarding-vnext-migration-blueprint.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-execution-packet.mjs [options]

Options:
  --design-packet <path>            Onboarding v2 design JSON. Defaults to ${DEFAULT_DESIGN_PACKET}
  --empty-groups-packet <path>      Onboarding v2 empty-groups dry-run JSON. Defaults to ${DEFAULT_EMPTY_GROUPS_PACKET}
  --empty-groups-create-run <path>  Empty-groups create runner dry-run JSON. Defaults to ${DEFAULT_EMPTY_GROUPS_CREATE_RUN}
  --mini-launch-packet <path>       Mini-Launch OS v0 JSON. Defaults to ${DEFAULT_MINI_LAUNCH_PACKET}
  --mini-launch-rehearsal <path>    Concrete mini-launch rehearsal JSON. Defaults to ${DEFAULT_MINI_LAUNCH_REHEARSAL}
  --first-email-mapping <path>      First email Brand/CRM mapping JSON. Defaults to ${DEFAULT_FIRST_EMAIL_MAPPING}
  --blueprint <path>                Onboarding migration blueprint. Defaults to ${DEFAULT_BLUEPRINT}
  --out <path>                      Write JSON packet
  --markdown-out <path>             Write Markdown packet
  --help                            Show this help

Local-only execution packet for MailerLite Launch OS v0 / Onboarding v2. It reads
existing design and dry-run reports, builds the current decision queue, and keeps
all live MailerLite, Shopify, CRM, workflow, subscriber, and send gates closed
unless a later exact human approval is provided to a separate guarded runner.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    designPacket: DEFAULT_DESIGN_PACKET,
    emptyGroupsPacket: DEFAULT_EMPTY_GROUPS_PACKET,
    emptyGroupsCreateRun: DEFAULT_EMPTY_GROUPS_CREATE_RUN,
    miniLaunchPacket: DEFAULT_MINI_LAUNCH_PACKET,
    miniLaunchRehearsal: DEFAULT_MINI_LAUNCH_REHEARSAL,
    firstEmailMapping: DEFAULT_FIRST_EMAIL_MAPPING,
    blueprint: DEFAULT_BLUEPRINT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--empty-groups-packet') options.emptyGroupsPacket = argv[++index];
    else if (arg === '--empty-groups-create-run') options.emptyGroupsCreateRun = argv[++index];
    else if (arg === '--mini-launch-packet') options.miniLaunchPacket = argv[++index];
    else if (arg === '--mini-launch-rehearsal') options.miniLaunchRehearsal = argv[++index];
    else if (arg === '--first-email-mapping') options.firstEmailMapping = argv[++index];
    else if (arg === '--blueprint') options.blueprint = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const readOptionalJson = async (path) => {
  if (!path) return null;
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
};

const targetIsSafeEmptyCreate = (target) =>
  Boolean(target?.canCreateEmptyAfterExplicitApproval)
  && target?.existsInFreshScan === false
  && target?.workflowUseAllowed === false
  && target?.subscriberAssignmentAllowed === false;

const buildCreateEmptyGroupsGate = ({ emptyGroupsPacket, emptyGroupsCreateRun }) => {
  const packetTargets = emptyGroupsPacket?.targetPlan ?? [];
  const runTargets = emptyGroupsCreateRun?.decision?.targetPlan ?? [];
  const targets = runTargets.length ? runTargets : packetTargets;
  const packetReady = emptyGroupsPacket?.status === 'ready_for_exact_human_approval_to_create_empty_groups';
  const runReady = emptyGroupsCreateRun?.status === 'dry_run_ready_for_exact_approval';
  const noBlockers = (emptyGroupsPacket?.blockers ?? []).length === 0
    && (emptyGroupsCreateRun?.decision?.blockers ?? []).length === 0
    && (emptyGroupsCreateRun?.errors ?? []).length === 0;
  const allTargetsSafe = targets.length > 0 && targets.every(targetIsSafeEmptyCreate);
  const readyForHumanApproval = packetReady && runReady && noBlockers && allTargetsSafe;

  return {
    id: 'create_empty_onboarding_v2_groups',
    lane: 'MailerLite',
    status: readyForHumanApproval ? 'ready_for_exact_human_approval' : 'blocked_or_stale_dry_run',
    readyForHumanApproval,
    allowedWithoutHumanApproval: false,
    liveMutationIfApproved: true,
    targetCount: targets.length,
    targetNames: targets.map((target) => target.name),
    evidence: [
      `emptyGroupsPacket.status=${emptyGroupsPacket?.status ?? 'missing'}`,
      `emptyGroupsCreateRun.status=${emptyGroupsCreateRun?.status ?? 'missing'}`,
      `blockers=${readyForHumanApproval ? 0 : [...(emptyGroupsPacket?.blockers ?? []), ...(emptyGroupsCreateRun?.decision?.blockers ?? [])].length}`,
      `errors=${(emptyGroupsCreateRun?.errors ?? []).length}`,
    ],
    exactApprovalPhrase: readyForHumanApproval ? emptyGroupsCreateRun?.decision?.expectedPhrase ?? null : null,
    allowedOperationAfterApproval: 'create_named_empty_groups_only',
    stillForbiddenAfterApproval: [
      'assign subscribers',
      'create or edit workflows',
      'activate automations',
      'send tests or live emails',
      'touch Onboarding v1',
      'route real audience',
    ],
  };
};

const firstEmailMappedAsWelcomeOnly = (firstEmailMapping) =>
  firstEmailMapping?.status === 'first_email_mapping_ready_no_sent_receipt'
  && firstEmailMapping?.decision?.recommendedPosture === 'welcome_orientation_no_sent_receipt'
  && firstEmailMapping?.decision?.recommendedContentId === null
  && firstEmailMapping?.decision?.recommendedMailerLiteSentGroup === null;

const miniLaunchRehearsalReady = (miniLaunchRehearsal) =>
  miniLaunchRehearsal?.status === 'mini_launch_rehearsal_ready_no_live_changes'
  && miniLaunchRehearsal?.safety?.mailerLiteApiCalled === false
  && miniLaunchRehearsal?.safety?.shopifyApiCalled === false
  && miniLaunchRehearsal?.safety?.crmLiveApiCalled === false
  && miniLaunchRehearsal?.safety?.sendsPerformed === false
  && miniLaunchRehearsal?.safety?.crmCardMutationsPerformed === false;

const buildGateQueue = ({
  designPacket,
  emptyGroupsPacket,
  emptyGroupsCreateRun,
  miniLaunchPacket,
  miniLaunchRehearsal,
  firstEmailMapping,
}) => {
  const createEmptyGroups = buildCreateEmptyGroupsGate({ emptyGroupsPacket, emptyGroupsCreateRun });
  const v2Draft = emptyGroupsPacket?.sourceEvidence?.onboardingV2Draft ?? null;
  const v2DraftExists = v2Draft && v2Draft.found !== false;
  const v1 = emptyGroupsPacket?.sourceEvidence?.onboardingV1 ?? {};
  const needsBrandMappingCount = designPacket?.brandHandoff?.needsBrandMapping?.length ?? 0;
  const email1MappedWelcomeOnly = firstEmailMappedAsWelcomeOnly(firstEmailMapping);
  const rehearsalReady = miniLaunchRehearsalReady(miniLaunchRehearsal);

  return [
    createEmptyGroups,
    {
      id: 'build_or_clone_disabled_onboarding_v2_draft',
      lane: 'MailerLite UI / future guarded runner',
      status: createEmptyGroups.readyForHumanApproval
        ? 'blocked_until_empty_groups_are_created_or_explicitly_skipped'
        : 'blocked_until_group_preflight_is_ready',
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: false,
      liveMutationIfApproved: true,
      evidence: [
        `v2DraftExists=${v2DraftExists}`,
        `onboardingV1.enabled=${v1.enabled ?? 'unknown'}`,
        `onboardingV1.complete=${v1.complete ?? 'unknown'}`,
        `onboardingV1.broken=${v1.broken ?? 'unknown'}`,
      ],
      requiredBeforeApproval: [
        'The 12 v2 groups are live or a revised design intentionally skips them.',
        'A fresh read-only MailerLite scan still shows Onboarding v1 healthy.',
        'The draft workflow creation/cloning mechanism is named and scoped.',
        'The approval phrase forbids activation, real audience, sends, and v1 edits.',
      ],
    },
    {
      id: 'seed_test_onboarding_v2',
      lane: 'MailerLite + Gmail verification',
      status: 'blocked_until_disabled_v2_draft_exists_and_seed_email_is_approved',
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: false,
      liveMutationIfApproved: true,
      requiredBeforeApproval: [
        'Disabled v2 draft exists and is verified inactive.',
        'Alejandro approves exact seed email and exact test scope.',
        'Only seed subscriber/group assignments are permitted.',
        'No public/audience send is included.',
      ],
    },
    {
      id: 'production_entry_switch_to_v2',
      lane: 'MailerLite production routing',
      status: 'closed_until_seed_tests_and_rollout_packet',
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: false,
      liveMutationIfApproved: true,
      requiredBeforeApproval: [
        'Seed tests prove entry, in-progress marker, content receipts, completion, and audience eligibility.',
        'A separate affected-subscriber/rollback packet exists.',
        'V1 drain or migration posture is explicit.',
        'Alejandro approves the production entry switch separately.',
      ],
    },
    {
      id: 'non_live_mini_launch_rehearsal',
      lane: 'Brand + CRM + MailerLite planning',
      status: rehearsalReady
        ? 'rehearsal_ready_no_live_changes'
        : miniLaunchPacket?.status === 'mini_launch_architecture_ready_for_reuse'
        ? 'ready_without_live_approval'
        : 'blocked_missing_mini_launch_os_packet',
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: !rehearsalReady && miniLaunchPacket?.status === 'mini_launch_architecture_ready_for_reuse',
      liveMutationIfApproved: false,
      evidence: [
        `miniLaunchPacket.status=${miniLaunchPacket?.status ?? 'missing'}`,
        `miniLaunchRehearsal.status=${miniLaunchRehearsal?.status ?? 'missing'}`,
        `miniLaunchRehearsal.launchId=${miniLaunchRehearsal?.launch?.launchId ?? 'missing'}`,
        `defaultEmailSteps=${miniLaunchPacket?.defaultEmailSequence?.length ?? 'unknown'}`,
      ],
      outputIfRun: rehearsalReady
        ? 'No further rehearsal needed for this idea; next no-live moves are Brand/Web/email asset drafting or CRM event schema detail.'
        : 'A no-live rehearsal packet for one concrete idea with Brand/Web/MailerLite/CRM handoff and gates.',
    },
    {
      id: 'brand_first_email_content_mapping',
      lane: 'Brand Hub / Email canon',
      status: email1MappedWelcomeOnly
        ? 'mapped_as_welcome_only_no_sent_receipt'
        : needsBrandMappingCount
        ? 'ready_for_brand_review_no_live_change'
        : 'not_needed_or_already_mapped',
      readyForHumanApproval: false,
      allowedWithoutHumanApproval: !email1MappedWelcomeOnly && needsBrandMappingCount > 0,
      liveMutationIfApproved: false,
      evidence: [
        `needsBrandMapping=${needsBrandMappingCount}`,
        `firstEmailMapping.status=${firstEmailMapping?.status ?? 'missing'}`,
        `firstEmailMapping.recommendedPosture=${firstEmailMapping?.decision?.recommendedPosture ?? 'missing'}`,
      ],
      outputIfRun: email1MappedWelcomeOnly
        ? 'No further mapping needed unless Brand later promotes Email 1 into a reusable article/content_id.'
        : 'A Brand/CRM note deciding whether Email 1 is welcome-only or receives a canonical content_id later.',
    },
  ];
};

const buildOperatingContracts = () => ({
  onboardingV1Preservation: [
    'Onboarding flow v1 stays live and untouched until a separate approval says otherwise.',
    'Historical groups are evidence and routing context, not clean vNext semantics.',
    'Onboarding complete remains usable as the current general campaign audience until migration separates Journey and Audience.',
  ],
  miniLaunchToOnboardingHandoff: [
    'Mini-launches can create Source/Delivered receipts for the resource after their own dry-run and approval.',
    'A mini-launch may route a person toward editorial onboarding by assigning Journey Eligible only when the route is deliberate.',
    'Experiment identity stays CRM-first by launch_id unless MailerLite needs routing, dedupe, or exclusion.',
  ],
  receiptSemantics: [
    'Sent means the system marked content as sent; it does not mean opened, read, clicked, interested, or transformed.',
    'Delivered means a promised resource was delivered; it does not replace CRM engagement signals.',
    'Do not infer Sobre el amor from Received second email.',
  ],
});

const buildNextAutonomousMoves = (gateQueue) => {
  const readyNoLive = gateQueue.filter((gate) => gate.allowedWithoutHumanApproval && !gate.liveMutationIfApproved);
  return [
    ...readyNoLive.map((gate) => ({
      gate: gate.id,
      action: gate.outputIfRun,
      reason: 'Moves the Launch OS forward without touching live MailerLite, Shopify, CRM cards, subscribers, workflows, or sends.',
    })),
    {
      gate: 'create_empty_onboarding_v2_groups',
      action: 'Pause for exact human approval if Alejandro wants to create the 12 empty groups now.',
      reason: 'This is the first live MailerLite mutation in the Onboarding v2 lane and must remain human-approved.',
    },
  ];
};

const safetyBlock = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  crmCardMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildExecutionPacket = ({
  designPacket,
  emptyGroupsPacket,
  emptyGroupsCreateRun,
  miniLaunchPacket,
  miniLaunchRehearsal,
  firstEmailMapping,
  blueprintText,
  sourcePaths = {},
  generatedAt = new Date().toISOString(),
}) => {
  const gateQueue = buildGateQueue({
    designPacket,
    emptyGroupsPacket,
    emptyGroupsCreateRun,
    miniLaunchPacket,
    miniLaunchRehearsal,
    firstEmailMapping,
  });
  const createGate = gateQueue.find((gate) => gate.id === 'create_empty_onboarding_v2_groups');
  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_onboarding_v2_execution_packet',
    generatedAt,
    ok: true,
    status: createGate?.readyForHumanApproval
      ? 'ready_for_human_decision_or_non_live_continuation'
      : 'continue_non_live_until_preflight_ready',
    sourceEvidence: {
      designPacket: {
        path: sourcePaths.designPacket,
        status: designPacket?.status ?? null,
        recommendedOption: designPacket?.decision?.recommendedOption ?? null,
        v1Posture: designPacket?.workflowBlueprint?.productionV1Posture ?? null,
        groupsNeedingWork: designPacket?.groupWorkNeededBeforeV2Pilot?.missingOrProposedGroups?.length ?? null,
      },
      emptyGroupsPacket: {
        path: sourcePaths.emptyGroupsPacket,
        status: emptyGroupsPacket?.status ?? null,
        targetCount: emptyGroupsPacket?.targetPlan?.length ?? null,
        blockers: emptyGroupsPacket?.blockers ?? [],
        onboardingV1: emptyGroupsPacket?.sourceEvidence?.onboardingV1 ?? null,
        onboardingV2Draft: emptyGroupsPacket?.sourceEvidence?.onboardingV2Draft ?? null,
      },
      emptyGroupsCreateRun: {
        path: sourcePaths.emptyGroupsCreateRun,
        status: emptyGroupsCreateRun?.status ?? null,
        mode: emptyGroupsCreateRun?.mode ?? null,
        createdCount: emptyGroupsCreateRun?.createdGroups?.length ?? null,
        blockers: emptyGroupsCreateRun?.decision?.blockers ?? [],
        errors: emptyGroupsCreateRun?.errors ?? [],
      },
      miniLaunchPacket: {
        path: sourcePaths.miniLaunchPacket,
        status: miniLaunchPacket?.status ?? null,
        launchTemplate: miniLaunchPacket?.launchTemplate ?? null,
      },
      miniLaunchRehearsal: {
        path: sourcePaths.miniLaunchRehearsal,
        status: miniLaunchRehearsal?.status ?? null,
        launchId: miniLaunchRehearsal?.launch?.launchId ?? null,
        resourceName: miniLaunchRehearsal?.launch?.resourceName ?? null,
        sourceCandidate: miniLaunchRehearsal?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name ?? null,
        deliveredCandidate: miniLaunchRehearsal?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name ?? null,
      },
      firstEmailMapping: {
        path: sourcePaths.firstEmailMapping,
        status: firstEmailMapping?.status ?? null,
        recommendedPosture: firstEmailMapping?.decision?.recommendedPosture ?? null,
        recommendedContentId: firstEmailMapping?.decision?.recommendedContentId ?? null,
        recommendedMailerLiteSentGroup: firstEmailMapping?.decision?.recommendedMailerLiteSentGroup ?? null,
      },
      blueprint: {
        path: sourcePaths.blueprint,
        present: Boolean(blueprintText),
        chars: blueprintText?.length ?? 0,
      },
    },
    executiveDecision: {
      currentBestPath: 'Keep v1 live, create only missing v2 groups if Alejandro approves, then build a disabled v2 draft and seed-test before any production switch.',
      noApprovalDefault: 'Continue with non-live work: concrete mini-launch rehearsal; Brand first-email mapping only if the mapping report is missing or stale.',
      humanApprovalRequiredFor: [
        'creating the 12 empty v2 groups',
        'creating or cloning a disabled v2 workflow',
        'assigning a seed subscriber',
        'sending test emails',
        'switching production entry',
        'touching Onboarding v1',
      ],
    },
    gateQueue,
    operatingContracts: buildOperatingContracts(),
    nextAutonomousMoves: buildNextAutonomousMoves(gateQueue),
    safety: safetyBlock(),
  };
};

const renderGate = (gate) => {
  const lines = [
    `### ${gate.id}`,
    '',
    `- Lane: ${gate.lane}`,
    `- Status: ${gate.status}`,
    `- Ready for human approval: ${gate.readyForHumanApproval}`,
    `- Allowed without human approval: ${gate.allowedWithoutHumanApproval}`,
    `- Live mutation if approved: ${gate.liveMutationIfApproved}`,
  ];
  if (gate.targetCount !== undefined) lines.push(`- Target count: ${gate.targetCount}`);
  if (gate.targetNames?.length) {
    lines.push('- Targets:');
    for (const name of gate.targetNames) lines.push(`  - ${name}`);
  }
  if (gate.evidence?.length) {
    lines.push('- Evidence:');
    for (const item of gate.evidence) lines.push(`  - ${item}`);
  }
  if (gate.requiredBeforeApproval?.length) {
    lines.push('- Required before approval:');
    for (const item of gate.requiredBeforeApproval) lines.push(`  - ${item}`);
  }
  if (gate.stillForbiddenAfterApproval?.length) {
    lines.push('- Still forbidden after this approval:');
    for (const item of gate.stillForbiddenAfterApproval) lines.push(`  - ${item}`);
  }
  if (gate.exactApprovalPhrase) {
    lines.push('- Exact approval phrase:');
    lines.push(`  - \`${gate.exactApprovalPhrase}\``);
  }
  if (gate.outputIfRun) lines.push(`- Output if run: ${gate.outputIfRun}`);
  return lines.join('\n');
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v2 Execution Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `- Ruta actual: ${packet.executiveDecision.currentBestPath}`,
    `- Si no hay aprobacion viva: ${packet.executiveDecision.noApprovalDefault}`,
    '',
    'Requiere aprobacion humana separada:',
    '',
    ...packet.executiveDecision.humanApprovalRequiredFor.map((item) => `- ${item}`),
    '',
    '## Evidencia',
    '',
    `- Design packet: ${packet.sourceEvidence.designPacket.status}; opcion=${packet.sourceEvidence.designPacket.recommendedOption}`,
    `- Empty-groups packet: ${packet.sourceEvidence.emptyGroupsPacket.status}; targets=${packet.sourceEvidence.emptyGroupsPacket.targetCount}; blockers=${packet.sourceEvidence.emptyGroupsPacket.blockers.length}`,
    `- Empty-groups create runner: ${packet.sourceEvidence.emptyGroupsCreateRun.status}; created=${packet.sourceEvidence.emptyGroupsCreateRun.createdCount}; errors=${packet.sourceEvidence.emptyGroupsCreateRun.errors.length}`,
    `- Onboarding v1: enabled=${packet.sourceEvidence.emptyGroupsPacket.onboardingV1?.enabled ?? 'unknown'} complete=${packet.sourceEvidence.emptyGroupsPacket.onboardingV1?.complete ?? 'unknown'} broken=${packet.sourceEvidence.emptyGroupsPacket.onboardingV1?.broken ?? 'unknown'}`,
    `- Onboarding v2 draft exists: ${packet.sourceEvidence.emptyGroupsPacket.onboardingV2Draft?.found === false ? 'false' : 'unknown_or_true'}`,
    `- Mini-Launch OS: ${packet.sourceEvidence.miniLaunchPacket.status}`,
    `- Mini-Launch rehearsal: ${packet.sourceEvidence.miniLaunchRehearsal.status}; launch_id=${packet.sourceEvidence.miniLaunchRehearsal.launchId ?? 'none'}`,
    `- First email mapping: ${packet.sourceEvidence.firstEmailMapping.status}; posture=${packet.sourceEvidence.firstEmailMapping.recommendedPosture}; sentGroup=${packet.sourceEvidence.firstEmailMapping.recommendedMailerLiteSentGroup ?? 'none'}`,
    `- Blueprint chars: ${packet.sourceEvidence.blueprint.chars}`,
    '',
    '## Gate Queue',
    '',
    ...packet.gateQueue.map(renderGate),
    '',
    '## Operating Contracts',
    '',
    '### Onboarding v1 Preservation',
    '',
    ...packet.operatingContracts.onboardingV1Preservation.map((item) => `- ${item}`),
    '',
    '### Mini-Launch To Onboarding Handoff',
    '',
    ...packet.operatingContracts.miniLaunchToOnboardingHandoff.map((item) => `- ${item}`),
    '',
    '### Receipt Semantics',
    '',
    ...packet.operatingContracts.receiptSemantics.map((item) => `- ${item}`),
    '',
    '## Next Autonomous Moves',
    '',
    ...packet.nextAutonomousMoves.map((move) => `- ${move.gate}: ${move.action} Reason: ${move.reason}`),
    '',
    '## Safety',
    '',
    '- Local-only.',
    '- Sin MailerLite API calls.',
    '- Sin Shopify API calls.',
    '- Sin CRM live API calls.',
    '- Sin lectura ni impresion de subscribers.',
    '- Sin grupos/workflows/automations/envios.',
    '- Sin CRM card/scoring mutation.',
    '- Sin outbound.',
    '- No tokens printed.',
    '',
    '## Sources',
    '',
    `- ${packet.sourceEvidence.designPacket.path}`,
    `- ${packet.sourceEvidence.emptyGroupsPacket.path}`,
    `- ${packet.sourceEvidence.emptyGroupsCreateRun.path}`,
    `- ${packet.sourceEvidence.miniLaunchPacket.path}`,
    `- ${packet.sourceEvidence.miniLaunchRehearsal.path}`,
    `- ${packet.sourceEvidence.firstEmailMapping.path}`,
    `- ${packet.sourceEvidence.blueprint.path}`,
  ];
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
  const [designPacket, emptyGroupsPacket, emptyGroupsCreateRun, miniLaunchPacket, miniLaunchRehearsal, firstEmailMapping, blueprintText] = await Promise.all([
    readJson(options.designPacket),
    readJson(options.emptyGroupsPacket),
    readJson(options.emptyGroupsCreateRun),
    readJson(options.miniLaunchPacket),
    readOptionalJson(options.miniLaunchRehearsal),
    readOptionalJson(options.firstEmailMapping),
    readFile(resolve(options.blueprint), 'utf8'),
  ]);

  return buildExecutionPacket({
    designPacket,
    emptyGroupsPacket,
    emptyGroupsCreateRun,
    miniLaunchPacket,
    miniLaunchRehearsal,
    firstEmailMapping,
    blueprintText,
    sourcePaths: {
      designPacket: resolve(options.designPacket),
      emptyGroupsPacket: resolve(options.emptyGroupsPacket),
      emptyGroupsCreateRun: resolve(options.emptyGroupsCreateRun),
      miniLaunchPacket: resolve(options.miniLaunchPacket),
      miniLaunchRehearsal: resolve(options.miniLaunchRehearsal),
      firstEmailMapping: resolve(options.firstEmailMapping),
      blueprint: resolve(options.blueprint),
    },
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
    gateCount: packet.gateQueue.length,
    readyForHumanApproval: packet.gateQueue
      .filter((gate) => gate.readyForHumanApproval)
      .map((gate) => gate.id),
    allowedWithoutHumanApproval: packet.gateQueue
      .filter((gate) => gate.allowedWithoutHumanApproval)
      .map((gate) => gate.id),
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 execution packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCreateEmptyGroupsGate,
  buildExecutionPacket,
  buildGateQueue,
  buildNextAutonomousMoves,
  parseArgs,
  renderMarkdown,
  targetIsSafeEmptyCreate,
};
