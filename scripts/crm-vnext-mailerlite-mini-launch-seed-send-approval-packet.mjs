#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-send-approval-packet-2026-05-28';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-send-approval-packet.mjs [options]

Options:
  --seed-test-qa-packet <path>       Seed/test QA packet JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --real-mailerlite-render-qa <path> Real MailerLite render QA JSON. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --manual-ui-build-receipt <path>   Manual UI build receipt JSON. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --approval-queue <path>            Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --seed-email <email>               Exact seed recipient. Prefer --seed-email-file for private runs.
  --seed-email-file <path>           File containing exact seed recipient.
  --out <path>                       Write JSON packet
  --markdown-out <path>              Write Markdown packet
  --help                             Show this help

Local-only seed-send approval packet. It can prepare an exact human approval
boundary for sending test emails from the four existing mini-launch drafts to
one seed recipient. It never sends email, schedules campaigns, reads or mutates
subscribers, creates or assigns groups, touches workflows, calls Shopify/CRM
live APIs, appends ledgers, writes cards/scoring/Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    seedEmail: null,
    seedEmailFile: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
    else if (arg === '--manual-ui-build-receipt') options.manualUiBuildReceipt = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--seed-email') options.seedEmail = argv[++index];
    else if (arg === '--seed-email-file') options.seedEmailFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readText(resolved);
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      consultedFor,
      sha256: createHash('sha256').update(raw).digest('hex'),
    },
  };
};

const normalizeEmail = (value) => cleanString(value)?.toLowerCase() ?? null;

const emailLooksValid = (email) =>
  typeof email === 'string'
  && email.length <= 254
  && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  && !/[<>"'`;\\]/.test(email);

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  if (!local || !domain) return null;
  const visible = local.length <= 2 ? local[0] ?? '*' : local.slice(0, 2);
  return `${visible}…@${domain}`;
};

const emailSha256 = (email) => {
  const normalized = normalizeEmail(email);
  return normalized ? createHash('sha256').update(normalized).digest('hex') : null;
};

const manualUiReceiptClosed = (receipt) =>
  receipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
  && receipt?.executiveSummary?.createdOrEditedDraftCount === 4
  && receipt?.executiveSummary?.outboxCountAfterBuild === 0
  && receipt?.executiveSummary?.sendCount === 0
  && receipt?.executiveSummary?.scheduleCount === 0
  && receipt?.executiveSummary?.subscriberReadOrAssignmentCount === 0
  && receipt?.executiveSummary?.groupAssignmentCount === 0
  && receipt?.executiveSummary?.workflowAttachmentCount === 0
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.schedulesCreated === false
  && receipt?.safety?.subscribersReadOrAssigned === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false;

const realQaGreen = (realQa) =>
  realQa?.status === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes'
  && realQa?.executiveSummary?.draftCount === 4
  && realQa?.executiveSummary?.allDraftsPreviewed === true
  && realQa?.executiveSummary?.allRequiredContentExact === true
  && realQa?.executiveSummary?.allSafetyGatesClosed === true
  && realQa?.executiveSummary?.contentMismatchCount === 0
  && realQa?.executiveSummary?.safetyMismatchCount === 0
  && realQa?.safety?.mailerLiteMutationsPerformed === false
  && realQa?.safety?.mailerLiteAssetsCreatedOrEdited === false
  && realQa?.safety?.sendsPerformed === false
  && realQa?.safety?.schedulesCreated === false
  && realQa?.safety?.subscriberMutationsPerformed === false
  && realQa?.safety?.groupsCreatedOrAssigned === false
  && realQa?.safety?.workflowMutationsPerformed === false;

const seedQaPrereqsClosed = (seedQa) =>
  seedQa?.status === 'seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes'
  && seedQa?.readiness?.manualUiDraftsBuilt === true
  && seedQa?.readiness?.localRenderReady === true
  && seedQa?.readiness?.targetGroupsExist === true
  && seedQa?.readiness?.realMailerLiteRenderQaReady === true
  && seedQa?.readiness?.readyForAudienceLaunchNow === false
  && seedQa?.safety?.sendsPerformed === false
  && seedQa?.safety?.subscriberRowsRead === false
  && seedQa?.safety?.mailerLiteMutationsPerformed === false
  && seedQa?.safety?.workflowMutationsPerformed === false
  && seedQa?.safety?.factStoreWritePerformed === false;

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  browserOpened: false,
  mailerLiteApiCalledByThisPacket: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreatedOrAssigned: false,
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

const approvalPhraseFor = ({ seedEmail, seedQa }) => {
  const launchName = cleanString(seedQa?.launch?.resourceName) ?? 'Inteligencia para descansar';
  return `Apruebo enviar únicamente test emails desde los 4 borradores del mini-lanzamiento ${launchName} al seed recipient exacto ${seedEmail}, después de re-scan fresco y QA real verde en MailerLite, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;
};

const buildSeedSendApprovalPacket = ({
  seedTestQaPacket,
  realMailerLiteRenderQa,
  manualUiBuildReceipt,
  approvalQueue,
  seedEmail = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const normalizedSeedEmail = normalizeEmail(seedEmail);
  const blockers = [];
  const hasSeedEmail = Boolean(normalizedSeedEmail);

  if (!seedQaPrereqsClosed(seedTestQaPacket)) blockers.push(`seed_test_qa_prereqs_not_closed:${seedTestQaPacket?.status ?? 'missing'}`);
  if (!realQaGreen(realMailerLiteRenderQa)) blockers.push(`real_mailerlite_render_qa_not_green:${realMailerLiteRenderQa?.status ?? 'missing'}`);
  if (!manualUiReceiptClosed(manualUiBuildReceipt)) blockers.push(`manual_ui_build_receipt_not_closed:${manualUiBuildReceipt?.status ?? 'missing'}`);
  if (approvalQueue?.executiveSummary?.openLiveMutationGateCount !== 0) blockers.push('approval_queue_open_live_gate_count_not_zero');
  if (approvalQueue?.safety?.sendsPerformed !== false) blockers.push('approval_queue_reports_send');
  if (!hasSeedEmail) blockers.push('exact_seed_recipient_missing');
  else if (!emailLooksValid(normalizedSeedEmail)) blockers.push('seed_email_invalid_or_unsafe');

  const uniqueBlockers = [...new Set(blockers)];
  const ready = uniqueBlockers.length === 0;
  const waitingOnlyForSeed = uniqueBlockers.length === 1 && uniqueBlockers[0] === 'exact_seed_recipient_missing';
  const status = ready
    ? 'seed_send_approval_packet_ready_for_exact_human_approval_no_live_changes'
    : waitingOnlyForSeed
      ? 'seed_send_approval_packet_waiting_exact_seed_recipient_no_live_changes'
      : 'seed_send_approval_packet_blocked_no_live_changes';
  const exactApprovalPhrase = ready
    ? approvalPhraseFor({ seedEmail: normalizedSeedEmail, seedQa: seedTestQaPacket })
    : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_private_seed_send_approval_packet',
    generatedAt,
    ok: true,
    status,
    launch: seedTestQaPacket?.launch ?? null,
    executiveSummary: {
      canAskAlejandroForApproval: ready,
      canExecuteSendNow: false,
      packetIsApprovalByItself: false,
      seedRecipientSupplied: hasSeedEmail,
      seedRecipientValid: hasSeedEmail ? emailLooksValid(normalizedSeedEmail) : false,
      targetDraftCount: seedTestQaPacket?.readiness?.manualUiDraftCount ?? null,
      realMailerLiteRenderQaReady: seedTestQaPacket?.readiness?.realMailerLiteRenderQaReady ?? false,
      targetGroupsExist: seedTestQaPacket?.readiness?.targetGroupsExist ?? false,
      approvalQueueReadyCount: approvalQueue?.executiveSummary?.readyApprovalRequestCount ?? null,
      approvalQueueBlockedCount: approvalQueue?.executiveSummary?.blockedApprovalRequestCount ?? null,
      openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? 0,
      blockerCount: uniqueBlockers.length,
    },
    seedIdentity: {
      supplied: hasSeedEmail,
      redactedEmail: redactEmail(normalizedSeedEmail),
      sha256: emailSha256(normalizedSeedEmail),
      exactEmailStoredInThisPacket: hasSeedEmail,
      exactEmail: normalizedSeedEmail,
      handlingRule: 'Private execution packet: do not paste or forward publicly; reports may use redactedEmail only.',
    },
    approvalBoundary: {
      canAskAlejandroForApproval: ready,
      packetIsApprovalByItself: false,
      canExecuteSendNow: false,
      exactApprovalPhrase,
      exactApprovalPhraseTemplate: seedTestQaPacket?.seedSendApprovalBoundary?.exactApprovalPhraseTemplate ?? null,
      allowedAfterExactApproval: [
        'send test emails only from the four existing mini-launch draft campaigns to the exact seed recipient',
        'use MailerLite UI/API only for the scoped test-send operation after fresh read-only checks',
      ],
      stillClosedEvenAfterApproval: seedTestQaPacket?.seedSendApprovalBoundary?.stillClosedEvenAfterApproval ?? [
        'public_or_audience_send',
        'schedule',
        'workflow_or_automation_attachment',
        'subscriber_import_or_non_seed_assignment',
        'group_creation_or_assignment',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'rerun real MailerLite render QA and confirm all four drafts remain exact and safety-green',
        'freshly confirm the four campaigns are still drafts and Outbox is empty',
        'verify the seed recipient in the MailerLite test-send UI/API request before sending',
        'confirm no audience, groups, segments, workflow, automation or schedule is selected',
      ],
    },
    postSeedRunbook: {
      afterSeedSendRunInOrder: [
        'record a receipt with campaign ids, redacted seed recipient and MailerLite accepted-send evidence',
        'verify seed inbox/readback without publishing or scheduling',
        'regenerate seed/test QA, approval queue, runbook, goal audit and validation receipt',
        'prepare CRM observed-event packet only from real seed observations and exact people; do not write CRM yet',
      ],
    },
    blockers: uniqueBlockers,
    hardStops: [
      'This packet is not approval.',
      'Supplying a seed email is not approval to send.',
      'Seed-send approval does not authorize audience sends, schedules, workflows, subscribers, groups, Shopify, CRM, ledgers, cards, scoring or Fact Store work.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (packet) => [
  '# Mini-Launch Seed-Send Approval Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  `Can ask Alejandro now: ${packet.approvalBoundary.canAskAlejandroForApproval}`,
  `Seed recipient supplied: ${packet.seedIdentity.supplied}`,
  `Seed recipient: ${packet.seedIdentity.redactedEmail ?? 'missing'}`,
  `Open live mutation gates: ${packet.executiveSummary.openLiveMutationGateCount}`,
  '',
  '## Exact Approval Phrase',
  '',
  packet.approvalBoundary.exactApprovalPhrase
    ? ['```text', packet.approvalBoundary.exactApprovalPhrase, '```'].join('\n')
    : 'none - exact seed recipient is still required',
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Allowed After Exact Approval',
  '',
  renderList(packet.approvalBoundary.allowedAfterExactApproval),
  '',
  '## Still Closed',
  '',
  renderList(packet.approvalBoundary.stillClosedEvenAfterApproval),
  '',
  '## Required Fresh Evidence Before Execution',
  '',
  renderList(packet.approvalBoundary.requiredFreshEvidenceBeforeExecution),
  '',
  '## Safety',
  '',
  '- Local-only packet.',
  '- No browser opened by this packet.',
  '- No MailerLite/Shopify/CRM live mutation.',
  '- No sends, schedules, subscribers, workflows, group assignments, ledgers, cards, scoring or Fact Store writes.',
  '- No tokens printed.',
  '',
].join('\n');

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

const seedEmailFromOptions = async (options) => {
  if (options.seedEmailFile) return cleanString(await readText(options.seedEmailFile));
  return cleanString(options.seedEmail);
};

const buildPacketFromFiles = async (options) => {
  const [
    seedEntry,
    realQaEntry,
    receiptEntry,
    queueEntry,
    seedEmail,
  ] = await Promise.all([
    readJsonWithDigest(options.seedTestQaPacket, 'seed/test QA packet and send approval boundary'),
    readJsonWithDigest(options.realMailerLiteRenderQa, 'real MailerLite render QA proving drafts are exact and safety-green'),
    readJsonWithDigest(options.manualUiBuildReceipt, 'manual UI receipt proving four drafts exist with no sends/workflows/subscriber operations'),
    readJsonWithDigest(options.approvalQueue, 'Launch OS approval queue proving live gates are closed'),
    seedEmailFromOptions(options),
  ]);

  return buildSeedSendApprovalPacket({
    seedTestQaPacket: seedEntry.value,
    realMailerLiteRenderQa: realQaEntry.value,
    manualUiBuildReceipt: receiptEntry.value,
    approvalQueue: queueEntry.value,
    seedEmail,
    sourceDigests: [seedEntry.digest, realQaEntry.digest, receiptEntry.digest, queueEntry.digest],
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
    canAskAlejandroForApproval: packet.approvalBoundary.canAskAlejandroForApproval,
    seedRecipientSupplied: packet.seedIdentity.supplied,
    seedRecipientRedacted: packet.seedIdentity.redactedEmail,
    blockerCount: packet.blockers.length,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed-send approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSeedSendApprovalPacket,
  emailLooksValid,
  manualUiReceiptClosed,
  parseArgs,
  realQaGreen,
  redactEmail,
  renderMarkdown,
  seedQaPrereqsClosed,
};
