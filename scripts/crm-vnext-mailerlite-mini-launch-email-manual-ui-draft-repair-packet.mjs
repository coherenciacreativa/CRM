#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-manual-ui-draft-repair-packet-2026-05-28';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SEED_TEST_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-manual-ui-draft-repair-packet.mjs [options]

Options:
  --real-mailerlite-render-qa <path> Real MailerLite draft render QA JSON. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --payload-manifest <path>          Local email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --manual-ui-build-receipt <path>   Manual UI draft build receipt JSON. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --seed-test-qa-packet <path>       Seed/test QA preflight JSON. Defaults to ${DEFAULT_SEED_TEST_QA_PACKET}
  --out <path>                       Write JSON repair packet
  --markdown-out <path>              Write Markdown repair packet
  --help                             Show this help

Local-only packet for repairing exact-copy mismatches in already-created
MailerLite UI drafts. It reads existing reports and prepares an exact human
approval boundary. It never opens a browser, calls MailerLite/Shopify/CRM live
APIs, sends emails, schedules campaigns, reads or mutates subscribers, creates
or assigns groups, edits workflows, appends ledgers, writes cards/scoring,
touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    seedTestQaPacket: DEFAULT_SEED_TEST_QA_PACKET,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--manual-ui-build-receipt') options.manualUiBuildReceipt = argv[++index];
    else if (arg === '--seed-test-qa-packet') options.seedTestQaPacket = argv[++index];
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
    },
  };
};

const payloadByStep = (manifest) => new Map((manifest?.payloads ?? [])
  .map((payload) => [Number(payload?.step), payload])
  .filter(([step]) => Number.isFinite(step)));

const blockById = (payload) => new Map((payload?.contentBlocks ?? [])
  .map((block) => [cleanString(block?.id), block])
  .filter(([id]) => id));

const blockExpectedText = (block) => cleanString(block?.text)
  ?? cleanString(block?.placeholder?.value)
  ?? cleanString(block?.destination)
  ?? null;

const manualUiReceiptClosed = (receipt) => {
  const drafts = receipt?.draftReceipts ?? [];
  return receipt?.status === 'manual_ui_build_receipt_executed_drafts_created_no_sends'
    && receipt?.executiveSummary?.createdOrEditedDraftCount === 4
    && receipt?.executiveSummary?.outboxCountAfterBuild === 0
    && drafts.length === 4
    && drafts.every((draft) => draft?.uiVisibleInDrafts === true
      && draft?.contentCopiedFromLocalHtmlPath === true
      && draft?.noRecipientsSelectedChecked === true
      && draft?.noGroupsOrSegmentsSelectedChecked === true
      && draft?.noWorkflowOrAutomationAttachedChecked === true
      && draft?.notScheduledChecked === true
      && draft?.notSentChecked === true)
    && receipt?.safety?.sendsPerformed === false
    && receipt?.safety?.schedulesCreated === false
    && receipt?.safety?.subscribersReadOrAssigned === false
    && receipt?.safety?.groupsCreatedOrAssigned === false
    && receipt?.safety?.workflowMutationsPerformed === false
    && receipt?.safety?.factStoreWritePerformed === false
    && (receipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send');
};

const safetyClosedInRealQa = (realQa) =>
  realQa?.executiveSummary?.allSafetyGatesClosed === true
  && realQa?.safety?.mailerLiteMutationsPerformed === false
  && realQa?.safety?.mailerLiteAssetsCreatedOrEdited === false
  && realQa?.safety?.sendsPerformed === false
  && realQa?.safety?.schedulesCreated === false
  && realQa?.safety?.subscriberMutationsPerformed === false
  && realQa?.safety?.groupsCreatedOrAssigned === false
  && realQa?.safety?.workflowMutationsPerformed === false
  && realQa?.safety?.shopifyLiveApiCalled === false
  && realQa?.safety?.crmLiveApiCalled === false
  && realQa?.safety?.signalLedgerAppendPerformed === false
  && realQa?.safety?.crmCardMutationsPerformed === false
  && realQa?.safety?.scoringMutationsPerformed === false
  && realQa?.safety?.factStoreWritePerformed === false;

const repairableDraftsFrom = ({ realQa, manifest }) => {
  const byStep = payloadByStep(manifest);
  const repairs = [];
  const blockers = [];

  for (const draft of realQa?.drafts ?? []) {
    const missing = draft?.content?.missingRequiredFragments ?? [];
    if (missing.length === 0) continue;
    const step = Number(draft?.step);
    const payload = byStep.get(step);
    if (!payload) {
      blockers.push(`payload_missing_for_step_${draft?.step ?? 'unknown'}`);
      continue;
    }
    if (draft?.subject?.matches !== true) blockers.push(`subject_mismatch_step_${draft?.step ?? 'unknown'}`);
    if (draft?.preheader?.matches !== true) blockers.push(`preheader_mismatch_step_${draft?.step ?? 'unknown'}`);
    if (draft?.safetyChecks?.allSafetyGatesClosed !== true) blockers.push(`safety_gates_not_closed_step_${draft?.step ?? 'unknown'}`);

    const blocks = blockById(payload);
    const missingFragments = missing.map((fragment) => {
      const block = blocks.get(cleanString(fragment?.id));
      const expected = cleanString(fragment?.expected);
      const payloadExpected = blockExpectedText(block);
      if (!block) blockers.push(`missing_fragment_not_in_payload:${fragment?.id ?? 'unknown'}`);
      else if (payloadExpected !== expected) blockers.push(`missing_fragment_payload_text_mismatch:${fragment?.id ?? 'unknown'}`);
      return {
        id: cleanString(fragment?.id),
        type: cleanString(fragment?.type),
        expected,
        normalizedPresentInMailerLiteDraft: fragment?.normalizedPresent === true,
        payloadBlockType: cleanString(block?.type),
        payloadDestination: cleanString(block?.destination),
        inertPlaceholder: cleanString(block?.placeholder?.value),
        repairAction: 'replace_or_repaste_exact_payload_text_in_existing_mailerlite_draft',
      };
    });

    repairs.push({
      step,
      role: cleanString(draft?.role),
      campaignId: cleanString(draft?.campaignId),
      draftName: cleanString(draft?.observedName) ?? cleanString(draft?.expectedName),
      subject: draft?.subject ?? null,
      preheader: draft?.preheader ?? null,
      missingFragmentCount: missingFragments.length,
      missingFragments,
    });
  }

  return { repairs, blockers };
};

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

const approvalPhraseFor = ({ launch, repairs }) => {
  if (repairs.length !== 1) return null;
  const repair = repairs[0];
  const resourceName = cleanString(launch?.resourceName) ?? 'Inteligencia para descansar';
  const stepLabel = `Email ${repair.step}`;
  const campaignId = repair.campaignId;
  const fragmentCount = repair.missingFragmentCount;
  const placeholders = [...new Set(repair.missingFragments
    .map((fragment) => fragment.inertPlaceholder)
    .filter(Boolean))];
  const placeholderText = placeholders.length > 0
    ? ` y usando el placeholder inerte ${placeholders.join(', ')}`
    : '';

  return `Apruebo reparar manualmente en MailerLite UI únicamente el borrador ${stepLabel} del mini-lanzamiento ${resourceName}, campaña ${campaignId}, corrigiendo solo estos ${fragmentCount} fragmentos de cuerpo/CTA para que coincidan con el payload local${placeholderText}, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;
};

const statusFor = ({ realQa, repairs, blockers }) => {
  if (realQa?.status === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes' && blockers.length === 0) {
    return 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed';
  }
  if (repairs.length > 0 && blockers.length === 0) {
    return 'mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes';
  }
  return 'mini_launch_email_manual_ui_draft_repair_packet_blocked_no_live_changes';
};

const buildRepairPacket = ({
  realMailerLiteRenderQa,
  payloadManifest,
  manualUiBuildReceipt,
  seedTestQaPacket,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = [];

  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    blockers.push(`payload_manifest_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (!manualUiReceiptClosed(manualUiBuildReceipt)) {
    blockers.push(`manual_ui_build_receipt_not_closed:${manualUiBuildReceipt?.status ?? 'missing'}`);
  }
  if (![
    'mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes',
    'mini_launch_real_mailerlite_render_qa_green_no_live_changes',
  ].includes(realMailerLiteRenderQa?.status)) {
    blockers.push(`real_mailerlite_render_qa_status_not_repairable:${realMailerLiteRenderQa?.status ?? 'missing'}`);
  }
  if (realMailerLiteRenderQa?.executiveSummary?.expectedDraftCount !== 4) blockers.push('real_qa_expected_draft_count_not_4');
  if (realMailerLiteRenderQa?.executiveSummary?.draftCount !== 4) blockers.push('real_qa_draft_count_not_4');
  if (realMailerLiteRenderQa?.executiveSummary?.allDraftsPreviewed !== true) blockers.push('real_qa_all_drafts_not_previewed');
  if (!safetyClosedInRealQa(realMailerLiteRenderQa)) blockers.push('real_qa_safety_gates_not_closed');
  if (realMailerLiteRenderQa?.executiveSummary?.safetyMismatchCount !== 0) blockers.push('real_qa_safety_mismatch_present');

  const { repairs, blockers: repairBlockers } = repairableDraftsFrom({
    realQa: realMailerLiteRenderQa,
    manifest: payloadManifest,
  });
  blockers.push(...repairBlockers);

  if (realMailerLiteRenderQa?.status !== 'mini_launch_real_mailerlite_render_qa_green_no_live_changes') {
    if (repairs.length === 0) blockers.push('no_repair_targets_found');
    if (repairs.length > 1) blockers.push(`repair_target_count_not_1:${repairs.length}`);
    if (repairs.some((repair) => !repair.campaignId)) blockers.push('repair_target_campaign_id_missing');
  }

  const uniqueBlockers = [...new Set(blockers)];
  const status = statusFor({ realQa: realMailerLiteRenderQa, repairs, blockers: uniqueBlockers });
  const ready = status === 'mini_launch_email_manual_ui_draft_repair_packet_ready_for_exact_human_approval_no_live_changes';
  const exactApprovalPhrase = ready
    ? approvalPhraseFor({ launch: payloadManifest?.launch ?? realMailerLiteRenderQa?.launch, repairs })
    : null;
  const missingFragmentCount = repairs.reduce((sum, repair) => sum + repair.missingFragmentCount, 0);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_manual_ui_draft_repair_packet',
    generatedAt,
    ok: ready || status === 'mini_launch_email_manual_ui_draft_repair_packet_reference_only_no_repair_needed',
    status,
    launch: payloadManifest?.launch ?? realMailerLiteRenderQa?.launch ?? null,
    executiveSummary: {
      canAskAlejandroForApproval: ready,
      canRepairNow: false,
      packetIsApprovalByItself: false,
      targetDraftCount: repairs.length,
      missingFragmentCount,
      realMailerLiteRenderQaStatus: realMailerLiteRenderQa?.status ?? null,
      manualUiBuildReceiptStatus: manualUiBuildReceipt?.status ?? null,
      seedTestQaPacketStatus: seedTestQaPacket?.status ?? null,
      seedTestQaCanAskApprovalNow: seedTestQaPacket?.readiness?.canAskSeedSendApprovalNow ?? false,
      seedTestQaBlockerCount: countRows(seedTestQaPacket?.readiness?.machineBlockersBeforeSeedSendApprovalRequest),
      openLiveMutationGateCount: 0,
    },
    repairTargets: repairs,
    decision: {
      canAskAlejandroForApproval: ready,
      packetIsApprovalByItself: false,
      canRepairNow: false,
      exactApprovalPhrase,
      approvalOpensOnly: [
        'open MailerLite UI manually, prefer Safari',
        'edit only the existing draft campaign named in this packet',
        'repair only the listed body/CTA fragments from the local payload manifest',
        'keep every listed placeholder inert',
        'save or keep the campaign as draft',
      ],
      stillClosedEvenAfterApproval: [
        'send_email_or_test_email',
        'publish_or_schedule',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_import_or_mutation',
        'group_creation_or_assignment',
        'shopify_preview_publish_form_connection_or_api',
        'crm_live_api_call',
        'signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
        'audience_launch',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'open the target campaign in MailerLite Drafts UI and confirm campaign id/name match this packet',
        'confirm Outbox is still empty before repair',
        'confirm no recipients/groups/segments/workflows/schedule are selected before saving',
      ],
    },
    postApprovalRunbook: {
      afterRepairRunInOrder: [
        'rerun real MailerLite render QA on all four draft campaigns',
        'regenerate mini-launch seed/test QA packet',
        'regenerate Launch OS approval queue',
        'regenerate operator runbook, goal audit and validation receipt',
        'stop before seed/test send until exact seed recipient and exact seed-send approval exist',
      ],
    },
    blockers: uniqueBlockers,
    hardStops: [
      'This packet is not approval.',
      'The repair approval phrase opens only the listed draft-copy repair.',
      'A repair approval does not authorize test send, public send, schedule, workflow, subscriber, group, Shopify, CRM, ledger, card, scoring or Fact Store work.',
    ],
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (packet) => [
  '# Mini-Launch Manual UI Draft Repair Packet',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  `Can ask Alejandro now: ${packet.decision.canAskAlejandroForApproval}`,
  `Target drafts: ${packet.executiveSummary.targetDraftCount}`,
  `Missing fragments: ${packet.executiveSummary.missingFragmentCount}`,
  '',
  '## Repair Targets',
  '',
  ...packet.repairTargets.flatMap((target) => [
    `### Email ${target.step}`,
    '',
    `- Campaign ID: ${target.campaignId}`,
    `- Draft name: ${target.draftName}`,
    `- Role: ${target.role}`,
    `- Missing fragments: ${target.missingFragmentCount}`,
    '',
    ...target.missingFragments.flatMap((fragment) => [
      `- ${fragment.id} (${fragment.type}): ${fragment.expected}`,
    ]),
    '',
  ]),
  '## Exact Approval Phrase',
  '',
  packet.decision.exactApprovalPhrase
    ? ['```text', packet.decision.exactApprovalPhrase, '```'].join('\n')
    : 'none',
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Still Closed',
  '',
  renderList(packet.decision.stillClosedEvenAfterApproval),
  '',
  '## Post-Approval Runbook',
  '',
  renderList(packet.postApprovalRunbook.afterRepairRunInOrder),
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

const buildPacketFromFiles = async (options) => {
  const [
    realQaEntry,
    payloadEntry,
    receiptEntry,
    seedEntry,
  ] = await Promise.all([
    readJsonWithDigest(options.realMailerLiteRenderQa, 'real MailerLite read-only render QA with exact content mismatches'),
    readJsonWithDigest(options.payloadManifest, 'local payload manifest with exact expected copy and inert placeholders'),
    readJsonWithDigest(options.manualUiBuildReceipt, 'manual UI build receipt proving drafts exist and sends/workflows/subscribers stayed closed'),
    readJsonWithDigest(options.seedTestQaPacket, 'seed/test QA packet proving seed send remains blocked before repair'),
  ]);

  return buildRepairPacket({
    realMailerLiteRenderQa: realQaEntry.value,
    payloadManifest: payloadEntry.value,
    manualUiBuildReceipt: receiptEntry.value,
    seedTestQaPacket: seedEntry.value,
    sourceDigests: [realQaEntry.digest, payloadEntry.digest, receiptEntry.digest, seedEntry.digest],
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
    canAskAlejandroForApproval: packet.decision.canAskAlejandroForApproval,
    targetDraftCount: packet.executiveSummary.targetDraftCount,
    missingFragmentCount: packet.executiveSummary.missingFragmentCount,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch manual UI draft repair packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildRepairPacket,
  manualUiReceiptClosed,
  parseArgs,
  renderMarkdown,
  repairableDraftsFrom,
  safetyClosedInRealQa,
};
