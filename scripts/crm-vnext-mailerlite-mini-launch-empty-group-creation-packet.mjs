#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-empty-group-creation-packet-2026-05-28';
const DEFAULT_GROUP_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-empty-group-creation-packet.mjs [options]

Options:
  --group-dry-run <path>  Fresh mini-launch group dry-run JSON. Defaults to ${DEFAULT_GROUP_DRY_RUN}
  --out <path>            Write JSON packet
  --markdown-out <path>   Write Markdown packet
  --help                  Show this help

Local-only approval packet for creating the two missing empty MailerLite groups
for one mini-launch after Brand promotion and a fresh read-only group dry-run.
It never calls MailerLite, reads subscribers, creates groups, edits workflows,
assigns groups, sends email, writes CRM cards, appends ledgers, scores people,
touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    groupDryRun: DEFAULT_GROUP_DRY_RUN,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--group-dry-run') options.groupDryRun = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const safeTargetsFromDryRun = (dryRun) =>
  (dryRun?.plannedGroups ?? [])
    .filter((group) =>
      group?.emptyGroupCreationStatus === 'safe_to_create_empty_after_explicit_approval'
      && group?.allowedOperation === 'create_named_empty_group_only_after_explicit_approval')
    .map((group) => ({
      name: cleanString(group.name),
      layer: cleanString(group.layer),
      object: cleanString(group.object),
      detail: cleanString(group.detail),
      brandStatus: cleanString(group.brandStatus),
      existsInMailerLite: group.existsInMailerLite === true,
      liveGroupId: cleanString(group.liveGroupId),
      plannedOperation: 'create_named_empty_group_after_exact_human_approval',
      allowedOperation: 'create_named_empty_group_only_after_explicit_approval',
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
      sendAllowed: false,
    }))
    .filter((target) => target.name);

const alreadyLiveTargetsFromDryRun = (dryRun) =>
  (dryRun?.plannedGroups ?? [])
    .filter((group) =>
      group?.emptyGroupCreationStatus === 'exists_in_mailerlite'
      || group?.existsInMailerLite === true)
    .map((group) => ({
      name: cleanString(group.name),
      layer: cleanString(group.layer),
      object: cleanString(group.object),
      detail: cleanString(group.detail),
      brandStatus: cleanString(group.brandStatus),
      existsInMailerLite: group.existsInMailerLite === true,
      liveGroupId: cleanString(group.liveGroupId),
      plannedOperation: 'no_empty_group_creation_needed_already_exists',
      allowedOperation: 'already_exists_no_create_needed',
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
      sendAllowed: false,
    }))
    .filter((target) => target.name);

const validateDryRunReadiness = (dryRun) => {
  const issues = [];
  const alreadyComplete = dryRun?.status === 'mini_launch_groups_already_exist_no_create_needed';
  const targets = alreadyComplete ? alreadyLiveTargetsFromDryRun(dryRun) : safeTargetsFromDryRun(dryRun);

  if (dryRun?.ok !== true) issues.push('group_dry_run_not_ok');
  if (![
    'mini_launch_group_dry_run_ready_for_future_empty_group_decision',
    'mini_launch_groups_already_exist_no_create_needed',
  ].includes(dryRun?.status)) {
    issues.push(`group_dry_run_status_not_ready:${dryRun?.status ?? 'missing'}`);
  }
  if (!alreadyComplete && dryRun?.readiness?.canCreateNamedEmptyGroupsAfterExplicitApproval !== true) {
    issues.push('dry_run_cannot_create_named_empty_groups_after_explicit_approval');
  }
  if (alreadyComplete && dryRun?.readiness?.canCreateNamedEmptyGroupsAfterExplicitApproval !== false) {
    issues.push('dry_run_reports_create_approval_open_after_targets_exist');
  }
  if (!alreadyComplete && dryRun?.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval !== true) {
    issues.push('approval_gate_missing_create_empty_after_approval');
  }
  if (alreadyComplete && dryRun?.approvalGate?.canCreateNamedEmptyGroupsAfterExplicitApproval !== false) {
    issues.push('approval_gate_reports_create_empty_open_after_targets_exist');
  }
  if (dryRun?.approvalGate?.canCreateGroups !== false) issues.push('approval_gate_can_create_groups_now_unexpectedly_open');
  if (dryRun?.approvalGate?.canUseWorkflow !== false) issues.push('workflow_use_gate_unexpectedly_open');
  if (dryRun?.approvalGate?.canAssignSubscribers !== false) issues.push('subscriber_assignment_gate_unexpectedly_open');
  if (dryRun?.approvalGate?.canSendEmail !== false) issues.push('send_gate_unexpectedly_open');
  if (!alreadyComplete && !cleanString(dryRun?.futureApprovalPhrase)) issues.push('missing_future_approval_phrase');
  if (!alreadyComplete && targets.length === 0) issues.push('no_safe_empty_group_targets');
  if (alreadyComplete && targets.length === 0) issues.push('no_already_live_target_groups');

  for (const target of targets) {
    if (!alreadyComplete && (target.existsInMailerLite || target.liveGroupId)) issues.push(`target_already_live:${target.name}`);
    if (alreadyComplete && (!target.existsInMailerLite || !target.liveGroupId)) issues.push(`target_not_live_after_completed_dry_run:${target.name}`);
    if (target.brandStatus !== 'proposed_local' && target.brandStatus !== 'live_canonical') {
      issues.push(`target_brand_status_not_promoted:${target.name}:${target.brandStatus ?? 'missing'}`);
    }
  }

  const safety = dryRun?.safety ?? {};
  if (safety.mailerLiteMutationsPerformed !== false) issues.push('dry_run_reports_mailerlite_mutation');
  if (safety.mailerLiteGroupsCreated !== false) issues.push('dry_run_reports_group_creation');
  if (safety.mailerLiteSubscribersRead !== false) issues.push('dry_run_reports_subscriber_read');
  if (safety.workflowMutationsPerformed !== false) issues.push('dry_run_reports_workflow_mutation');
  if (safety.sendsPerformed !== false) issues.push('dry_run_reports_send');

  return {
    ok: issues.length === 0,
    issues,
    targets,
    alreadyComplete,
  };
};

const buildSafety = ({ dryRun }) => ({
  localOnly: true,
  readOnly: true,
  sourceDryRunReadOnly: dryRun?.safety?.readOnly === true,
  sourceDryRunMailerLiteGroupsRead: dryRun?.summary?.liveGroupsRead ?? dryRun?.safety?.mailerLiteGroupsRead ?? null,
  mailerLiteApiCalledByThisPacket: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersReadByThisPacket: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteGroupsCreated: false,
  subscriberAssignmentsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildPacketFromDryRun = ({
  dryRun,
  dryRunPath = DEFAULT_GROUP_DRY_RUN,
  generatedAt = new Date().toISOString(),
}) => {
  const readiness = validateDryRunReadiness(dryRun);
  const alreadyComplete = readiness.ok && readiness.alreadyComplete === true;
  const canAskApproval = readiness.ok && !alreadyComplete;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_empty_group_creation_approval_packet',
    generatedAt,
    ok: readiness.ok,
    status: canAskApproval
      ? 'ready_for_exact_human_approval_to_create_mini_launch_empty_groups'
      : alreadyComplete
        ? 'reference_only_empty_group_creation_already_completed'
        : 'blocked_before_exact_empty_group_approval',
    launch: dryRun?.launch ?? null,
    sourceDryRun: {
      path: resolve(dryRunPath),
      status: dryRun?.status ?? null,
      generatedAt: dryRun?.generatedAt ?? null,
      summary: dryRun?.summary ?? null,
      futureApprovalPhrasePresent: Boolean(cleanString(dryRun?.futureApprovalPhrase)),
      alreadyComplete,
    },
    decision: {
      canAskAlejandroForApproval: canAskApproval,
      recommendedDecision: canAskApproval
        ? 'approve_or_decline_named_empty_group_creation'
        : alreadyComplete
          ? 'no_approval_needed_target_groups_already_exist'
          : 'resolve_blockers_before_asking_for_approval',
      exactApprovalPhrase: canAskApproval ? cleanString(dryRun.futureApprovalPhrase) : null,
      exactApprovalPhraseSource: canAskApproval ? 'fresh_mini_launch_group_dry_run' : null,
      requiresFreshRerunBeforeExecution: !alreadyComplete,
      packetIsApprovalByItself: false,
    },
    targetGroups: readiness.targets,
    approvalBoundary: {
      allowedAfterExactApproval: canAskApproval
        ? ['create_these_named_empty_mailerlite_groups_only_after_fresh_rescan']
        : [],
      stillClosedEvenAfterThisApproval: [
        'subscriber_reads_or_assignment',
        'workflow_or_automation_use',
        'email_asset_build_or_send',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
        'onboarding_routing_or_handoff',
      ],
      requiredBeforeAnyExecutorRun: [
        ...(alreadyComplete
          ? ['do not run --execute for this closed empty-group creation boundary']
          : [
            'rerun mini-launch group dry-run immediately before execution',
            'confirm target groups are still missing',
            'provide the exact approval phrase unchanged',
            'execute only a create-empty-groups-only runner',
          ]),
      ],
    },
    blockers: readiness.issues,
    safety: buildSafety({ dryRun }),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Empty Group Creation Approval Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    packet.decision.canAskAlejandroForApproval
      ? 'El paquete de aprobacion exacta esta listo. Esto no crea grupos; solo deja clara la frontera humana para crear grupos vacios nombrados.'
      : packet.status === 'reference_only_empty_group_creation_already_completed'
        ? 'La creacion de estos grupos ya esta cerrada: los grupos objetivo existen en MailerLite y no hay aprobacion de creacion pendiente.'
        : 'El paquete no esta listo para aprobacion; primero hay que resolver bloqueos.',
    '',
    `Mini-lanzamiento: ${packet.launch?.resourceName ?? 'unknown'}`,
    `launch_id: ${packet.launch?.launchId ?? 'unknown'}`,
    '',
    '## Grupos Objetivo',
    '',
  ];

  if (packet.targetGroups.length) {
    for (const target of packet.targetGroups) {
      lines.push(`- ${target.name}`);
      lines.push(`  - Layer: ${target.layer ?? 'unknown'}`);
      lines.push(`  - Brand status: ${target.brandStatus ?? 'unknown'}`);
      lines.push(`  - Planned operation: ${target.plannedOperation}`);
      lines.push('  - Subscribers/workflows/sends: closed');
    }
  } else {
    lines.push('- No safe target groups available.');
  }

  lines.push(
    '',
    '## Approval Phrase',
    '',
    packet.decision.exactApprovalPhrase
      ? `\`${packet.decision.exactApprovalPhrase}\``
      : packet.status === 'reference_only_empty_group_creation_already_completed'
        ? '- No approval phrase needed; target groups already exist.'
        : '- No approval phrase until blockers are resolved.',
    '',
    '## Boundary',
    '',
    `- Can ask Alejandro for approval: ${packet.decision.canAskAlejandroForApproval}`,
    `- Packet is approval by itself: ${packet.decision.packetIsApprovalByItself}`,
    `- Requires fresh rerun before execution: ${packet.decision.requiresFreshRerunBeforeExecution}`,
    '',
    'Allowed after exact approval:',
    '',
    ...(packet.approvalBoundary.allowedAfterExactApproval.length
      ? packet.approvalBoundary.allowedAfterExactApproval.map((item) => `- ${item}`)
      : packet.status === 'reference_only_empty_group_creation_already_completed'
        ? ['- None; this empty-group creation boundary is already closed.']
        : ['- None until blockers resolve.']),
    '',
    'Still closed even after this approval:',
    '',
    ...packet.approvalBoundary.stillClosedEvenAfterThisApproval.map((item) => `- ${item}`),
    '',
    '## Blockers',
    '',
    ...(packet.blockers.length ? packet.blockers.map((item) => `- ${item}`) : ['- none']),
    '',
    '## Source Dry-Run',
    '',
    `- Path: ${packet.sourceDryRun.path}`,
    `- Status: ${packet.sourceDryRun.status}`,
    `- Generated: ${packet.sourceDryRun.generatedAt}`,
    `- Live groups read by source dry-run: ${packet.sourceDryRun.summary?.liveGroupsRead ?? 'unknown'}`,
    '',
    '## Seguridad',
    '',
    '- Local-only packet generation.',
    '- No MailerLite API call by this packet.',
    '- No subscribers read or printed.',
    '- No groups created, renamed, deleted, or assigned.',
    '- No workflows, automations, forms, Shopify, CRM cards, Signal Event Ledger, scoring, Fact Store, sends, or outbound touched.',
    '- No tokens printed.',
    '',
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

  const dryRun = await readJson(options.groupDryRun);
  const packet = buildPacketFromDryRun({
    dryRun,
    dryRunPath: options.groupDryRun,
  });
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch?.launchId ?? null,
    targetGroupCount: packet.targetGroups.length,
    canAskAlejandroForApproval: packet.decision.canAskAlejandroForApproval,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch empty-group approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPacketFromDryRun,
  parseArgs,
  renderMarkdown,
  safeTargetsFromDryRun,
  validateDryRunReadiness,
};
