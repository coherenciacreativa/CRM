#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-continuation-guard-2026-05-28';

const DEFAULT_RUNBOOK = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_operator_runbook_2026-05-28.json';
const DEFAULT_GOAL_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_v0_goal_audit_2026-05-28.json';
const DEFAULT_MISSING_INPUTS_KIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_missing_inputs_kit_2026-05-28.json';
const DEFAULT_VALIDATION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_validation_receipt_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-continuation-guard.mjs [options]

Options:
  --runbook <path>              Operator runbook JSON. Defaults to ${DEFAULT_RUNBOOK}
  --goal-audit <path>           Goal audit JSON. Defaults to ${DEFAULT_GOAL_AUDIT}
  --missing-inputs-kit <path>   Missing-inputs kit JSON. Defaults to ${DEFAULT_MISSING_INPUTS_KIT}
  --validation-receipt <path>   Validation receipt JSON. Defaults to ${DEFAULT_VALIDATION_RECEIPT}
  --out <path>                  Write JSON continuation guard
  --markdown-out <path>         Write Markdown continuation guard
  --help                        Show this help

Local-only continuation guard for MailerLite Launch OS v0. It records which
hitos are closed, which missing inputs are still active, and which old actions
must not be recycled after context compaction. It opens no browser, uses no UI,
calls no APIs, reads no subscribers, mutates no groups/workflows/cards, sends no
emails, appends no ledgers, changes no scoring and writes nothing to Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    runbook: DEFAULT_RUNBOOK,
    goalAudit: DEFAULT_GOAL_AUDIT,
    missingInputsKit: DEFAULT_MISSING_INPUTS_KIT,
    validationReceipt: DEFAULT_VALIDATION_RECEIPT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--runbook') options.runbook = argv[++index];
    else if (arg === '--goal-audit') options.goalAudit = argv[++index];
    else if (arg === '--missing-inputs-kit') options.missingInputsKit = argv[++index];
    else if (arg === '--validation-receipt') options.validationReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const writeTextFile = async (path, content) => {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), content, 'utf8');
};

const writeJson = async (path, data) => {
  await writeTextFile(path, `${JSON.stringify(data, null, 2)}\n`);
};

const digestFor = async (path, consultedFor) => {
  const content = await readText(path);
  return {
    path: resolve(path),
    present: true,
    chars: content.length,
    sha256: createHash('sha256').update(content).digest('hex'),
    consultedFor,
  };
};

const boolClosedBoundary = ({
  id,
  label,
  closed,
  evidence,
  doNotReopenUnless,
}) => ({
  id,
  label,
  closed: Boolean(closed),
  status: closed ? 'closed_do_not_recycle' : 'not_closed_refresh_evidence',
  evidence,
  doNotReopenUnless,
});

const buildClosedBoundaries = ({ runbook }) => {
  const currentState = runbook?.currentState ?? {};
  const miniLaunch = currentState.miniLaunch ?? {};
  const brujula = currentState.brujulaPilot ?? {};
  const onboarding = currentState.onboarding ?? {};

  return [
    boolClosedBoundary({
      id: 'mini_launch_manual_ui_draft_build',
      label: 'Mini-launch 4 MailerLite UI drafts',
      closed: miniLaunch.emailManualUiBuildClosed === true
        && miniLaunch.emailManualUiDraftVisibleCount === 4
        && miniLaunch.emailManualUiSeedSendStillClosed === true,
      evidence: [
        `emailManualUiBuildReceiptStatus=${miniLaunch.emailManualUiBuildReceiptStatus ?? 'missing'}`,
        `emailManualUiDraftVisibleCount=${miniLaunch.emailManualUiDraftVisibleCount ?? 'unknown'}`,
        `emailManualUiBuildClosed=${miniLaunch.emailManualUiBuildClosed ?? 'unknown'}`,
        `emailManualUiSeedSendStillClosed=${miniLaunch.emailManualUiSeedSendStillClosed ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A later real MailerLite render QA names a concrete draft mismatch or Alejandro gives a new exact repair scope.',
    }),
    boolClosedBoundary({
      id: 'mini_launch_manual_ui_draft_repair',
      label: 'Mini-launch manual UI draft repair',
      closed: miniLaunch.emailManualUiDraftRepairPacketStatus === 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed'
        && miniLaunch.emailManualUiDraftRepairTargetCount === 0
        && miniLaunch.emailManualUiDraftRepairMissingFragmentCount === 0
        && miniLaunch.emailManualUiDraftRepairCanAskApproval === false,
      evidence: [
        `emailManualUiDraftRepairPacketStatus=${miniLaunch.emailManualUiDraftRepairPacketStatus ?? 'missing'}`,
        `emailManualUiDraftRepairCanAskApproval=${miniLaunch.emailManualUiDraftRepairCanAskApproval ?? 'unknown'}`,
        `emailManualUiDraftRepairTargetCount=${miniLaunch.emailManualUiDraftRepairTargetCount ?? 'unknown'}`,
        `emailManualUiDraftRepairMissingFragmentCount=${miniLaunch.emailManualUiDraftRepairMissingFragmentCount ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A new QA packet reports missing fragments or a named draft needs repair.',
    }),
    boolClosedBoundary({
      id: 'brujula_email1_manual_ui_draft_build',
      label: 'Brújula Email 1 corrected MailerLite UI draft',
      closed: brujula.manualUiBuildClosed === true
        && brujula.manualUiOutboxCount === 0
        && Boolean(brujula.manualUiCampaignId),
      evidence: [
        `manualUiBuildReceiptStatus=${brujula.manualUiBuildReceiptStatus ?? 'missing'}`,
        `manualUiBuildClosed=${brujula.manualUiBuildClosed ?? 'unknown'}`,
        `manualUiCampaignId=${brujula.manualUiCampaignId ?? 'missing'}`,
        `manualUiOutboxCount=${brujula.manualUiOutboxCount ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A later Brújula render QA names a concrete mismatch or Alejandro gives a new exact edit/test scope.',
    }),
    boolClosedBoundary({
      id: 'brujula_real_mailerlite_render_qa',
      label: 'Brújula real MailerLite render QA',
      closed: brujula.realMailerLiteRenderReady === true
        && brujula.realMailerLiteRenderExactContent === true
        && brujula.realMailerLiteRenderSafetyClosed === true
        && brujula.realMailerLiteRenderBlockerCount === 0,
      evidence: [
        `realMailerLiteRenderQaStatus=${brujula.realMailerLiteRenderQaStatus ?? 'missing'}`,
        `realMailerLiteRenderReady=${brujula.realMailerLiteRenderReady ?? 'unknown'}`,
        `realMailerLiteRenderExactContent=${brujula.realMailerLiteRenderExactContent ?? 'unknown'}`,
        `realMailerLiteRenderSafetyClosed=${brujula.realMailerLiteRenderSafetyClosed ?? 'unknown'}`,
        `realMailerLiteRenderBlockerCount=${brujula.realMailerLiteRenderBlockerCount ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A new Brújula draft or new exact-send scope requires fresh render QA.',
    }),
    boolClosedBoundary({
      id: 'mini_launch_empty_group_creation',
      label: 'Mini-launch Source/Delivered empty groups',
      closed: miniLaunch.emptyGroupCreateDryRunStatus === 'dry_run_no_create_needed_targets_already_exist'
        && miniLaunch.emptyGroupCreateDryRunTargetExistingCount === 2
        && miniLaunch.emptyGroupCreateDryRunTargetMissingCount === 0
        && miniLaunch.emptyGroupCreateDryRunCreatedCount === 0
        && miniLaunch.emptyGroupCreateDryRunCanExecute === false,
      evidence: [
        `emptyGroupCreateDryRunStatus=${miniLaunch.emptyGroupCreateDryRunStatus ?? 'missing'}`,
        `emptyGroupCreateDryRunTargetExistingCount=${miniLaunch.emptyGroupCreateDryRunTargetExistingCount ?? 'unknown'}`,
        `emptyGroupCreateDryRunTargetMissingCount=${miniLaunch.emptyGroupCreateDryRunTargetMissingCount ?? 'unknown'}`,
        `emptyGroupCreateDryRunCreatedCount=${miniLaunch.emptyGroupCreateDryRunCreatedCount ?? 'unknown'}`,
        `emptyGroupCreateDryRunCanExecute=${miniLaunch.emptyGroupCreateDryRunCanExecute ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A future fresh read-only scan says one of the two target groups no longer exists.',
    }),
    boolClosedBoundary({
      id: 'onboarding_v2_empty_group_creation',
      label: 'Onboarding v2 12 empty groups',
      closed: onboarding.v2EmptyGroupsLifecycleStatus === 'executed_and_verified_all_targets_exist_no_live_followup'
        && onboarding.v2EmptyGroupsPostExecutionAllExist === true
        && onboarding.v2EmptyGroupsExistingTargetCount === 12
        && onboarding.v2EmptyGroupsTargetCount === 12
        && onboarding.v2EmptyGroupsCanAskApproval === false,
      evidence: [
        `v2EmptyGroupsLifecycleStatus=${onboarding.v2EmptyGroupsLifecycleStatus ?? 'missing'}`,
        `v2EmptyGroupsExecutedCount=${onboarding.v2EmptyGroupsExecutedCount ?? 'unknown'}`,
        `v2EmptyGroupsPostExecutionAllExist=${onboarding.v2EmptyGroupsPostExecutionAllExist ?? 'unknown'}`,
        `v2EmptyGroupsExistingTargetCount=${onboarding.v2EmptyGroupsExistingTargetCount ?? 'unknown'}`,
        `v2EmptyGroupsCanAskApproval=${onboarding.v2EmptyGroupsCanAskApproval ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A future fresh read-only scan says one of the 12 target groups no longer exists.',
    }),
    boolClosedBoundary({
      id: 'shopify_no_live_local_build',
      label: 'Shopify no-live local build',
      closed: miniLaunch.shopifyLocalBuildClosed === true
        && miniLaunch.shopifyLocalBuildFileCount === 5
        && miniLaunch.shopifyLocalBuildNoPublish === true
        && miniLaunch.shopifyLocalBuildNoApi === true
        && miniLaunch.shopifyLocalBuildNoRealForms === true,
      evidence: [
        `shopifyLocalBuildReceiptStatus=${miniLaunch.shopifyLocalBuildReceiptStatus ?? 'missing'}`,
        `shopifyLocalBuildFileCount=${miniLaunch.shopifyLocalBuildFileCount ?? 'unknown'}`,
        `shopifyLocalBuildClosed=${miniLaunch.shopifyLocalBuildClosed ?? 'unknown'}`,
        `shopifyLocalBuildNoPublish=${miniLaunch.shopifyLocalBuildNoPublish ?? 'unknown'}`,
        `shopifyLocalBuildNoApi=${miniLaunch.shopifyLocalBuildNoApi ?? 'unknown'}`,
        `shopifyLocalBuildNoRealForms=${miniLaunch.shopifyLocalBuildNoRealForms ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'Alejandro gives a new exact no-live Shopify scope or later launch surface changes require local-only edits.',
    }),
    boolClosedBoundary({
      id: 'department_final_response_collection',
      label: 'Brand/Web/CRM final response collection',
      closed: (miniLaunch.pendingDepartments ?? []).length === 0
        && (miniLaunch.acceptedFinalDepartments ?? []).length === 3
        && miniLaunch.responseWatcherMissingFinalCount === 0
        && miniLaunch.responseWatcherFinalFilePresentCount === 3,
      evidence: [
        `departmentReviewStatus=${miniLaunch.departmentReviewStatus ?? 'missing'}`,
        `pendingDepartments=${(miniLaunch.pendingDepartments ?? []).join('|') || 'none'}`,
        `acceptedFinalDepartments=${(miniLaunch.acceptedFinalDepartments ?? []).join('|') || 'none'}`,
        `responseWatcherMissingFinalCount=${miniLaunch.responseWatcherMissingFinalCount ?? 'unknown'}`,
        `responseWatcherFinalFilePresentCount=${miniLaunch.responseWatcherFinalFilePresentCount ?? 'unknown'}`,
      ],
      doNotReopenUnless: 'A department publishes a new explicit final response that supersedes the accepted one.',
    }),
  ];
};

const inputRequestsFrom = (missingInputsKit, runbook) => {
  const packetRequests = missingInputsKit?.inputRequests ?? [];
  if (packetRequests.length > 0) return packetRequests;
  return (runbook?.currentState?.missingInputsKit?.inputIds ?? []).map((id) => ({ id }));
};

const buildActiveInputs = ({ missingInputsKit, runbook }) =>
  inputRequestsFrom(missingInputsKit, runbook).map((input) => ({
    id: input.id,
    gateId: input.gateId ?? null,
    label: input.label ?? input.id,
    privacy: input.privacy ?? null,
    captureMode: input.captureMode ?? null,
    sampleOnly: input.sampleOnly ?? null,
    mustReplaceBeforeUse: input.mustReplaceBeforeUse ?? null,
    approvalEffect: input.approvalEffect ?? 'does_not_approve_execution',
  }));

const buildRecycledActionBlocks = () => [
  {
    id: 'do_not_reopen_closed_mailerlite_ui_drafts',
    status: 'blocked_until_new_concrete_mismatch',
    reason: 'The mini-launch and Brújula UI draft work is closed evidence, not a current repair task.',
    appliesTo: [
      'mini_launch_manual_ui_draft_build',
      'mini_launch_manual_ui_draft_repair',
      'brujula_email1_manual_ui_draft_build',
      'brujula_real_mailerlite_render_qa',
    ],
  },
  {
    id: 'do_not_rerun_empty_group_execute_for_existing_targets',
    status: 'blocked_until_fresh_scan_missing_target',
    reason: 'Current read-only scans say the mini-launch and Onboarding v2 groups already exist.',
    appliesTo: [
      'mini_launch_empty_group_creation',
      'onboarding_v2_empty_group_creation',
    ],
  },
  {
    id: 'do_not_request_seed_send_approval_without_seed_recipient',
    status: 'blocked_until_exact_seed_recipient_exists',
    reason: 'The next seed/test boundary needs an exact private seed recipient before an approval phrase is useful.',
    appliesTo: ['exact_seed_recipient'],
  },
  {
    id: 'do_not_request_crm_write_approval_without_real_events_and_people',
    status: 'blocked_until_real_events_people_screen_exist',
    reason: 'CRM writes remain blocked until real observed events, exact people, writable-event screen and Fact Store review are supplied as applicable.',
    appliesTo: [
      'real_observed_events_file',
      'exact_people',
      'writable_event_screen',
      'fact_store_market_review',
    ],
  },
  {
    id: 'do_not_treat_approval_packets_as_execution',
    status: 'always_blocked_without_exact_fresh_scope',
    reason: 'Packets, queues, guards and receipts are local evidence only. They cannot approve or execute live actions.',
    appliesTo: ['all_live_or_live_adjacent_gates'],
  },
];

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  tokensPrinted: false,
});

const maxNumber = (...values) => Math.max(...values.filter(Number.isFinite), 0);

const buildContinuationGuard = ({
  runbook,
  goalAudit,
  missingInputsKit,
  validationReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const closedBoundaries = buildClosedBoundaries({ runbook });
  const activeInputs = buildActiveInputs({ missingInputsKit, runbook });
  const recycledActionBlocks = buildRecycledActionBlocks();
  const safety = buildSafety();
  const closedBoundaryCount = closedBoundaries.filter((boundary) => boundary.closed).length;
  const allTrackedBoundariesClosed = closedBoundaryCount === closedBoundaries.length;
  const oldUiWorkClosed = ['mini_launch_manual_ui_draft_build', 'mini_launch_manual_ui_draft_repair', 'brujula_email1_manual_ui_draft_build', 'brujula_real_mailerlite_render_qa']
    .every((id) => closedBoundaries.find((boundary) => boundary.id === id)?.closed === true);
  const openLiveMutationGateCount = maxNumber(
    runbook?.currentState?.liveGates?.openLiveGateCount,
    runbook?.currentState?.approvalQueue?.openLiveMutationGateCount,
    missingInputsKit?.executiveSummary?.openLiveMutationGateCount,
    goalAudit?.executiveSummary?.openLiveGateCount,
  );
  const missingInputsKitReady = (missingInputsKit?.status ?? runbook?.currentState?.missingInputsKit?.status) === 'missing_inputs_kit_ready_no_live_changes';
  const validationPassed = validationReceipt?.validationStatus === 'passed'
    || goalAudit?.executiveSummary?.effectiveValidationStatus === 'passed';
  const status = allTrackedBoundariesClosed && oldUiWorkClosed && missingInputsKitReady && openLiveMutationGateCount === 0
    ? 'mailerlite_launch_os_continuation_guard_ready_no_live_changes'
    : 'mailerlite_launch_os_continuation_guard_needs_refresh_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_continuation_guard',
    generatedAt,
    ok: true,
    status,
    executiveSummary: {
      allTrackedBoundariesClosed,
      closedBoundaryCount,
      trackedBoundaryCount: closedBoundaries.length,
      oldUiWorkClosed,
      activeInputCount: activeInputs.length,
      activeInputIds: activeInputs.map((input) => input.id),
      recycledActionBlockCount: recycledActionBlocks.length,
      openLiveMutationGateCount,
      missingInputsKitReady,
      validationPassed,
      nextSafeAction: missingInputsKit?.executiveSummary?.nextSafeAction
        ?? runbook?.currentState?.missingInputsKit?.nextSafeAction
        ?? 'collect_missing_inputs_without_approval_or_execution',
      uiWorkAction: oldUiWorkClosed
        ? 'do_not_open_ui_or_repair_drafts_without_new_concrete_mismatch'
        : 'refresh_closed_boundary_evidence_before_ui_decision',
    },
    closedBoundaries,
    activeInputs,
    recycledActionBlocks,
    hardStops: [
      'Do not inspect or repair closed MailerLite UI drafts unless a new concrete mismatch is documented.',
      'Do not rerun execute paths for groups that current fresh scans say already exist.',
      'Do not ask seed-send approval before exact_seed_recipient exists.',
      'Do not ask CRM write approval before real events, exact people and writable screens exist.',
      'Do not touch live MailerLite, Shopify, CRM, workflows, subscribers, sends, ledgers, cards, scoring or Fact Store without a later exact approval.',
    ],
    sourceDigests,
    safety,
  };
};

const renderMarkdown = (guard) => {
  const lines = [
    '# MailerLite Launch OS Continuation Guard',
    '',
    `- Status: ${guard.status}`,
    `- Generated at: ${guard.generatedAt}`,
    `- Old UI work closed: ${guard.executiveSummary.oldUiWorkClosed}`,
    `- Closed boundaries: ${guard.executiveSummary.closedBoundaryCount}/${guard.executiveSummary.trackedBoundaryCount}`,
    `- Active inputs: ${guard.executiveSummary.activeInputIds.join(', ') || 'none'}`,
    `- Next safe action: ${guard.executiveSummary.nextSafeAction}`,
    `- UI action: ${guard.executiveSummary.uiWorkAction}`,
    `- Open live mutation gates: ${guard.executiveSummary.openLiveMutationGateCount}`,
    '',
    '## Closed Boundaries',
    '',
  ];

  for (const boundary of guard.closedBoundaries) {
    lines.push(`- ${boundary.id}: ${boundary.status}`);
    lines.push(`  - ${boundary.label}`);
    lines.push(`  - Do not reopen unless: ${boundary.doNotReopenUnless}`);
    lines.push(`  - Evidence: ${boundary.evidence.join('; ')}`);
  }

  lines.push('', '## Active Inputs', '');
  for (const input of guard.activeInputs) {
    lines.push(`- ${input.id}: ${input.label}`);
    lines.push(`  - Gate: ${input.gateId ?? 'unknown'}`);
    lines.push(`  - Privacy: ${input.privacy ?? 'unknown'}`);
    lines.push(`  - Approval effect: ${input.approvalEffect}`);
  }

  lines.push('', '## Do Not Recycle', '');
  for (const block of guard.recycledActionBlocks) {
    lines.push(`- ${block.id}: ${block.status}`);
    lines.push(`  - ${block.reason}`);
  }

  lines.push('', '## Safety', '');
  lines.push('- No UI opened.');
  lines.push('- No browser opened.');
  lines.push('- No live APIs called.');
  lines.push('- No subscribers, groups, workflows, sends, ledgers, cards, scoring or Fact Store touched.');
  lines.push('');

  return `${lines.join('\n')}\n`;
};

const buildContinuationGuardFromFiles = async (options) => {
  const [runbook, goalAudit, missingInputsKit, validationReceipt, ...sourceDigests] = await Promise.all([
    readJson(options.runbook),
    readJson(options.goalAudit),
    readJson(options.missingInputsKit),
    readJson(options.validationReceipt),
    digestFor(options.runbook, 'operator runbook current state and closed hito evidence'),
    digestFor(options.goalAudit, 'goal audit status and partial requirements'),
    digestFor(options.missingInputsKit, 'active missing inputs and safe next action'),
    digestFor(options.validationReceipt, 'latest local validation receipt'),
  ]);

  return buildContinuationGuard({
    runbook,
    goalAudit,
    missingInputsKit,
    validationReceipt,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const guard = await buildContinuationGuardFromFiles(options);
  if (options.out) await writeJson(options.out, guard);
  if (options.markdownOut) await writeTextFile(options.markdownOut, renderMarkdown(guard));

  console.log(JSON.stringify({
    ok: guard.ok,
    status: guard.status,
    generatedAt: guard.generatedAt,
    closedBoundaryCount: guard.executiveSummary.closedBoundaryCount,
    activeInputCount: guard.executiveSummary.activeInputCount,
    oldUiWorkClosed: guard.executiveSummary.oldUiWorkClosed,
    nextSafeAction: guard.executiveSummary.nextSafeAction,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: guard.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS continuation guard failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildActiveInputs,
  buildClosedBoundaries,
  buildContinuationGuard,
  buildContinuationGuardFromFiles,
  buildRecycledActionBlocks,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
