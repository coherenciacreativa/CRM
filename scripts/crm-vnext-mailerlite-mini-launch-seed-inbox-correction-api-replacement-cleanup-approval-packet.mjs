#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet-2026-05-31';
const DEFAULT_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_approval_packet_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-api-replacement-cleanup-approval-packet.mjs [options]

Options:
  --execution-receipt <path> API replacement execution receipt JSON. Defaults to ${DEFAULT_EXECUTION_RECEIPT}
  --out <path>               Write JSON approval packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>      Write Markdown approval packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                     Show this help

Local-only approval packet for cleaning up the two unsafe API replacement drafts
created during the E02/E03 correction route. It never calls MailerLite, Shopify
or CRM live APIs, opens UI, sends emails, schedules campaigns, reads or mutates
subscribers, creates or assigns groups/segments, edits workflows, appends
ledgers, writes cards/scoring, touches Fact Store, prints tokens, or stores
exact URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    executionReceipt: DEFAULT_EXECUTION_RECEIPT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--execution-receipt') options.executionReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      consultedFor,
      exactUrlsStoredInReport: false,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  exactUrlsStoredInReport: false,
  exactUrlsPrinted: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteDraftsDeleted: 0,
  mailerLiteAssetsCreatedOrEdited: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
  segmentsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildExactApprovalPhrase = () =>
  'Apruebo eliminar por API únicamente los 2 borradores de reemplazo E02 y E03 creados en MailerLite durante la ruta API fallida del mini-lanzamiento Inteligencia para descansar, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos o segmentos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store, con re-scan fresco posterior y recibo local.';

const targetRowsFrom = (executionReceipt) => {
  const postScanById = new Map((executionReceipt?.postScan?.replacementDrafts ?? [])
    .map((row) => [cleanString(row?.id), row])
    .filter(([id]) => Boolean(id)));

  return (executionReceipt?.createdDrafts ?? []).map((created) => {
    const id = cleanString(created?.campaignId);
    const observed = postScanById.get(id) ?? {};
    return {
      step: Number(created?.step),
      label: cleanString(created?.label),
      campaignId: id,
      name: cleanString(created?.name ?? observed?.name),
      oldCampaignId: cleanString(created?.oldCampaignId),
      oldDraftLeftIntact: created?.oldDraftLeftIntact === true,
      status: cleanString(observed?.status ?? created?.status),
      canBeScheduled: observed?.canBeScheduled ?? null,
      hasBasicFilter: observed?.hasBasicFilter ?? null,
      filterIsEmptyArray: observed?.filterIsEmptyArray ?? null,
      scheduledFor: observed?.scheduledFor ?? null,
      queuedAt: observed?.queuedAt ?? null,
      usedInAutomations: observed?.usedInAutomations ?? null,
      contentHasPlaceholder: observed?.contentHasPlaceholder ?? null,
      contentHasExpectedUrl: observed?.contentHasExpectedUrl ?? null,
      exactUrlPrinted: created?.exactUrlPrinted === false,
    };
  });
};

const executionReceiptShowsUnsafeCreatedDrafts = (receipt, cleanupTargets) =>
  receipt?.mode === 'execute_requested'
  && receipt?.safety?.mailerLiteDraftsCreated === 2
  && receipt?.safety?.mailerLiteMutationsPerformed === true
  && receipt?.safety?.oldDraftsEdited === false
  && receipt?.safety?.oldDraftsDeletedOrArchived === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.subscribersRead === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.segmentsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.shopifyMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.signalLedgerAppendPerformed === false
  && receipt?.safety?.crmCardMutationsPerformed === false
  && receipt?.safety?.crmScoreMutationsPerformed === false
  && receipt?.safety?.factStoreWritePerformed === false
  && receipt?.safety?.tokensPrinted === false
  && receipt?.safety?.exactUrlsPrinted === false
  && cleanupTargets.length === 2
  && cleanupTargets.every((target) =>
    target.status === 'draft'
    && target.canBeScheduled === true
    && target.hasBasicFilter === true
    && target.filterIsEmptyArray === true
    && target.scheduledFor === null
    && target.queuedAt === null
    && target.usedInAutomations === false
    && target.contentHasExpectedUrl === true
    && target.contentHasPlaceholder === false
    && target.oldDraftLeftIntact === true
    && target.exactUrlPrinted === true);

const buildPacket = ({
  executionReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const cleanupTargets = targetRowsFrom(executionReceipt);
  const blockers = [];
  const safety = buildSafety();

  if (!executionReceipt) blockers.push('execution_receipt_missing');
  if (!executionReceiptShowsUnsafeCreatedDrafts(executionReceipt, cleanupTargets)) {
    blockers.push('execution_receipt_does_not_prove_exact_two_unsafe_replacement_drafts');
  }
  if (cleanupTargets.length !== 2) blockers.push(`cleanup_target_count_not_2:${cleanupTargets.length}`);
  for (const target of cleanupTargets) {
    if (![2, 3].includes(target.step)) blockers.push(`cleanup_target_unexpected_step:${target.step}`);
    if (!target.campaignId) blockers.push(`cleanup_target_${target.label ?? target.step}_missing_campaign_id`);
    if (!target.name) blockers.push(`cleanup_target_${target.label ?? target.step}_missing_name`);
    if (target.oldDraftLeftIntact !== true) blockers.push(`cleanup_target_${target.label ?? target.step}_old_draft_not_confirmed_intact`);
  }

  const canAskAlejandroForApproval = blockers.length === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_api_replacement_cleanup_approval_packet',
    generatedAt,
    ok: true,
    status: canAskAlejandroForApproval
      ? 'seed_inbox_correction_api_replacement_cleanup_approval_packet_ready_for_exact_human_approval_no_live_changes'
      : 'seed_inbox_correction_api_replacement_cleanup_approval_packet_blocked_no_live_changes',
    executiveSummary: {
      canAskAlejandroForApproval,
      cleanupTargetCount: cleanupTargets.length,
      cleanupReason: 'API-created replacement drafts are draft content-correct but not inert because MailerLite reports canBeScheduled=true and hasBasicFilter=true.',
      executionReceiptStatus: executionReceipt?.status ?? null,
      executionReceiptOk: executionReceipt?.ok ?? null,
      createdDraftCount: executionReceipt?.createdDrafts?.length ?? null,
      inertDraftCount: executionReceipt?.postScan?.inertDraftCount ?? null,
      allOldDraftsLeftIntact: cleanupTargets.every((target) => target.oldDraftLeftIntact === true),
      openLiveMutationGateCount: 0,
      blockerCount: blockers.length,
      nextBestMove: canAskAlejandroForApproval
        ? 'Ask Alejandro for exact cleanup approval before deleting the two unsafe replacement drafts.'
        : 'Resolve local evidence blockers before asking for cleanup approval.',
    },
    cleanupTargets,
    decision: {
      canAskAlejandroForApproval,
      packetIsApprovalByItself: false,
      canDeleteNow: false,
      canCreateReplacementDraftsNow: false,
      canEditExistingDraftsNow: false,
      canSendNow: false,
      exactApprovalPhrase: canAskAlejandroForApproval ? buildExactApprovalPhrase() : null,
    },
    approvalBoundary: {
      allowedAfterExactApproval: [
        'fresh_rescan_mailerlite_campaigns_for_the_two_cleanup_campaign_ids',
        'delete_only_the_two_named_api_replacement_drafts_created_by_the_failed_route',
        'leave_original_e02_e03_drafts_intact',
        'perform_no_sends_no_publish_no_schedule_no_subscriber_group_segment_workflow_mutations',
        'record_fresh_local_cleanup_receipt_and_rescan',
      ],
      stillClosedEvenAfterApproval: [
        'creating_new_replacement_drafts',
        'editing_old_e02_e03_drafts',
        'editing_any_other_mailerlite_campaign',
        'test_send_or_seed_send',
        'public_or_audience_send',
        'publish_or_schedule_campaign',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'group_or_segment_creation_or_assignment',
        'shopify_mutation_or_publish',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'freshly scan MailerLite and confirm both cleanup targets still exist as draft campaigns',
        'confirm target ids and names match the local execution receipt',
        'confirm no schedule, send or automation state is present before deletion',
        'after deletion, re-scan and verify both target campaign ids are gone',
        'record a local cleanup receipt with zero sends, zero schedules, zero subscriber mutations and zero group/segment assignments',
      ],
    },
    blockers,
    safety,
    sourceDigests,
  };
};

const renderMarkdown = (packet) => [
  '# MailerLite Mini-Launch API Replacement Cleanup Approval Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  `OK: ${packet.ok}`,
  '',
  '## Summary',
  '',
  `- Can ask Alejandro for approval: ${packet.executiveSummary.canAskAlejandroForApproval}`,
  `- Cleanup target count: ${packet.executiveSummary.cleanupTargetCount}`,
  `- Created draft count in execution receipt: ${packet.executiveSummary.createdDraftCount}`,
  `- Inert draft count in execution receipt: ${packet.executiveSummary.inertDraftCount}`,
  `- All old drafts left intact: ${packet.executiveSummary.allOldDraftsLeftIntact}`,
  `- Open live mutation gate count: ${packet.executiveSummary.openLiveMutationGateCount}`,
  '',
  '## Cleanup Targets',
  '',
  ...packet.cleanupTargets.flatMap((target) => [
    `- ${target.label}: ${target.name}`,
    `  - campaignId: ${target.campaignId}`,
    `  - canBeScheduled: ${target.canBeScheduled}`,
    `  - hasBasicFilter: ${target.hasBasicFilter}`,
    `  - old draft left intact: ${target.oldDraftLeftIntact}`,
  ]),
  '',
  '## Approval Boundary',
  '',
  `- Packet is approval by itself: ${packet.decision.packetIsApprovalByItself}`,
  `- Can delete now: ${packet.decision.canDeleteNow}`,
  `- Can send now: ${packet.decision.canSendNow}`,
  `- Exact approval phrase available: ${Boolean(packet.decision.exactApprovalPhrase)}`,
  '',
  'Allowed after exact approval:',
  ...packet.approvalBoundary.allowedAfterExactApproval.map((item) => `- ${item}`),
  '',
  'Still closed even after approval:',
  ...packet.approvalBoundary.stillClosedEvenAfterApproval.map((item) => `- ${item}`),
  '',
  '## Safety',
  '',
  `- MailerLite API called by this packet: ${packet.safety.mailerLiteApiCalled}`,
  `- MailerLite UI opened by this packet: ${packet.safety.mailerLiteUiOpened}`,
  `- MailerLite mutations performed: ${packet.safety.mailerLiteMutationsPerformed}`,
  `- Drafts deleted by this packet: ${packet.safety.mailerLiteDraftsDeleted}`,
  `- Sends performed: ${packet.safety.sendsPerformed}`,
  `- Subscribers read: ${packet.safety.subscribersRead}`,
  `- Exact URLs printed: ${packet.safety.exactUrlsPrinted}`,
  `- Tokens printed: ${packet.safety.tokensPrinted}`,
  '',
  '## Blockers',
  '',
  ...(packet.blockers.length ? packet.blockers.map((item) => `- ${item}`) : ['- none']),
  '',
].join('\n');

const writeOutputs = async (packet, options) => {
  await mkdir(dirname(resolve(options.out)), { recursive: true });
  await writeFile(resolve(options.out), `${JSON.stringify(packet, null, 2)}\n`, 'utf8');
  if (options.markdownOut) {
    await mkdir(dirname(resolve(options.markdownOut)), { recursive: true });
    await writeFile(resolve(options.markdownOut), `${renderMarkdown(packet)}\n`, 'utf8');
  }
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const executionReceipt = await readJsonWithDigest(
    options.executionReceipt,
    'partial API replacement execution receipt and cleanup target evidence',
  );
  const packet = buildPacket({
    executionReceipt: executionReceipt.value,
    sourceDigests: [executionReceipt.digest],
  });

  await writeOutputs(packet, options);
  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    canAskAlejandroForApproval: packet.executiveSummary.canAskAlejandroForApproval,
    cleanupTargetCount: packet.executiveSummary.cleanupTargetCount,
    blockerCount: packet.executiveSummary.blockerCount,
    out: resolve(options.out),
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}

export {
  buildExactApprovalPhrase,
  buildPacket,
  buildSafety,
  executionReceiptShowsUnsafeCreatedDrafts,
  parseArgs,
  renderMarkdown,
  targetRowsFrom,
};
