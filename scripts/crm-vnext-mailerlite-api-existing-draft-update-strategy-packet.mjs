#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-api-existing-draft-update-strategy-packet-2026-05-31';
const DEFAULT_API_EDIT_DIAGNOSTIC = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_edit_diagnostic_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_API_INERT_DRAFT_LAB = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_inert_draft_lab_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_UI_EDIT_APPROVAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_API_REPLACEMENT_CLEANUP_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_api_replacement_cleanup_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_existing_draft_update_strategy_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_api_existing_draft_update_strategy_current_inteligencia_descansar_2026-05-31.md';

const OFFICIAL_SOURCES = [
  {
    id: 'mailerlite_campaigns_api',
    title: 'MailerLite Campaigns API',
    url: 'https://developers.mailerlite.com/docs/campaigns',
    evidence: [
      'The official Campaigns API documents creating campaigns and updating campaign drafts.',
      'It also documents campaign scheduling as a separate endpoint.',
      'It documents email content fields for Advanced accounts, but does not document a no-audience or unschedulable draft creation flag.',
    ],
  },
  {
    id: 'mailerlite_mcp_campaign_tools',
    title: 'MailerLite MCP campaign tools',
    url: 'https://developers.mailerlite.com/mcp/',
    evidence: [
      'The official MCP tool list includes update_campaign for campaign metadata/content changes.',
      'The tool list does not establish a separate no-audience draft creation recipe.',
    ],
  },
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-api-existing-draft-update-strategy-packet.mjs [options]

Options:
  --api-edit-diagnostic <path>                Read-only API edit diagnostic JSON. Defaults to ${DEFAULT_API_EDIT_DIAGNOSTIC}
  --api-inert-draft-lab <path>                Disposable API inert draft lab receipt. Defaults to ${DEFAULT_API_INERT_DRAFT_LAB}
  --ui-edit-approval-packet <path>            Existing UI edit approval packet. Defaults to ${DEFAULT_UI_EDIT_APPROVAL_PACKET}
  --api-replacement-cleanup-receipt <path>    Unsafe replacement cleanup receipt. Defaults to ${DEFAULT_API_REPLACEMENT_CLEANUP_RECEIPT}
  --out <path>                                Write JSON strategy packet. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                       Write Markdown strategy packet. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                      Show this help

Local-only strategy packet for deciding whether MailerLite API leverage should
continue through existing-draft updates instead of real draft creation. It reads
local receipts and official-doc source metadata only. It never calls MailerLite,
Shopify or CRM live APIs, opens UI, sends emails, schedules campaigns, reads or
mutates subscribers, creates or assigns groups/segments, edits workflows,
appends ledgers, writes cards/scoring, touches Fact Store, prints tokens, or
stores exact preview URLs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const countRows = (value) => Array.isArray(value) ? value.length : 0;

const parseArgs = (argv) => {
  const options = {
    apiEditDiagnostic: DEFAULT_API_EDIT_DIAGNOSTIC,
    apiInertDraftLab: DEFAULT_API_INERT_DRAFT_LAB,
    uiEditApprovalPacket: DEFAULT_UI_EDIT_APPROVAL_PACKET,
    apiReplacementCleanupReceipt: DEFAULT_API_REPLACEMENT_CLEANUP_RECEIPT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--api-edit-diagnostic') options.apiEditDiagnostic = argv[++index];
    else if (arg === '--api-inert-draft-lab') options.apiInertDraftLab = argv[++index];
    else if (arg === '--ui-edit-approval-packet') options.uiEditApprovalPacket = argv[++index];
    else if (arg === '--api-replacement-cleanup-receipt') options.apiReplacementCleanupReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
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
        chars: raw.length,
        consultedFor,
        exactUrlsStoredInReport: false,
      },
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        chars: 0,
        consultedFor,
        exactUrlsStoredInReport: false,
      },
    };
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  officialDocsConsultedAsMetadataOnly: true,
  browserOpened: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
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
  exactUrlsStoredInReport: false,
  exactUrlsPrinted: false,
  tokensPrinted: false,
});

const cleanupCompleted = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'seed_inbox_correction_api_replacement_cleanup_execution_completed_no_sends'
  && receipt?.postScan?.goneCount === 2
  && receipt?.safety?.mailerLiteApiCalled === true
  && receipt?.safety?.mailerLiteDraftsDeleted === 2
  && receipt?.safety?.sendsPerformed === false
  && receipt?.safety?.campaignsPublished === false
  && receipt?.safety?.campaignsScheduled === false
  && receipt?.safety?.subscriberMutationsPerformed === false
  && receipt?.safety?.groupsCreatedOrAssigned === false
  && receipt?.safety?.segmentsCreatedOrAssigned === false
  && receipt?.safety?.workflowMutationsPerformed === false
  && receipt?.safety?.tokensPrinted === false
  && receipt?.safety?.exactUrlsPrinted === false;

const apiLabCompleted = (lab) =>
  lab?.ok === true
  && typeof lab?.status === 'string'
  && lab.status.startsWith('mailerlite_api_inert_draft_lab_completed_')
  && lab?.executiveSummary?.cleanupComplete === true
  && lab?.safety?.sendsPerformed === false
  && lab?.safety?.campaignsPublished === false
  && lab?.safety?.campaignsScheduled === false
  && lab?.safety?.subscriberMutationsPerformed === false
  && lab?.safety?.groupsCreatedOrAssigned === false
  && lab?.safety?.segmentsCreatedOrAssigned === false
  && lab?.safety?.workflowMutationsPerformed === false
  && lab?.safety?.tokensPrinted === false;

const summarizeDraftSafety = (diagnostic) => (diagnostic?.draftDiagnostics ?? []).map((draft) => ({
  step: draft.step,
  safetyClosed: draft.currentCampaign?.safety?.allClosed === true,
  failedSafetyCheckCount: countRows(draft.currentCampaign?.safety?.failed),
  failedSafetyChecks: draft.currentCampaign?.safety?.failed ?? [],
  apiPayloadReady: draft.apiPayload?.expectedPreviewUrlHashPresentAfterReplacement === true
    && draft.apiPayload?.totalPlaceholderCountAfterReplacement === 0,
  exactUrlStoredInReport: false,
}));

const buildStrategyPacket = ({
  apiEditDiagnostic,
  apiInertDraftLab,
  uiEditApprovalPacket,
  apiReplacementCleanupReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = [];
  const safety = buildSafety();
  const diagnosticReady = apiEditDiagnostic?.ok === true
    && apiEditDiagnostic?.mode === 'read_only_mailerlite_api_edit_diagnostic'
    && apiEditDiagnostic?.safety?.mailerLiteApiCalled === true
    && apiEditDiagnostic?.safety?.mailerLiteMutationsPerformed === false
    && apiEditDiagnostic?.safety?.sendsPerformed === false
    && apiEditDiagnostic?.safety?.tokensPrinted === false
    && apiEditDiagnostic?.safety?.exactUrlsPrinted === false;
  const apiConnectionStableForRead = diagnosticReady
    && apiEditDiagnostic?.executiveSummary?.campaignReadCount === 4
    && apiEditDiagnostic?.executiveSummary?.apiErrorCount === 0;
  const allApiPayloadReady = apiEditDiagnostic?.executiveSummary?.allApiPayloadReady === true;
  const allDraftsInertByApi = apiEditDiagnostic?.executiveSummary?.allDraftsInertByApi === true;
  const apiEditCandidate = apiEditDiagnostic?.executiveSummary?.apiEditCandidate === true;
  const labCompleted = apiLabCompleted(apiInertDraftLab);
  const cleanupDone = cleanupCompleted(apiReplacementCleanupReceipt);
  const uiApprovalReady = uiEditApprovalPacket?.status === 'seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes'
    && uiEditApprovalPacket?.executiveSummary?.canAskAlejandroForApproval === true;
  const labFoundInertRecipe = apiInertDraftLab?.executiveSummary?.readyToUseApiRecipeForRealDrafts === true;

  if (!diagnosticReady) blockers.push(`api_edit_diagnostic_not_ready:${apiEditDiagnostic?.status ?? 'missing'}`);
  if (!apiConnectionStableForRead) blockers.push('api_read_diagnostic_not_stable_for_four_campaigns');
  if (!allApiPayloadReady) blockers.push('api_payload_not_ready');
  if (!allDraftsInertByApi) blockers.push('existing_drafts_not_all_inert_by_api');
  if (!labCompleted) blockers.push(`api_inert_draft_lab_not_completed:${apiInertDraftLab?.status ?? 'missing'}`);
  if (labFoundInertRecipe) blockers.push('unexpected_api_lab_found_real_draft_creation_recipe_review_before_strategy');
  if (!cleanupDone) blockers.push(`api_replacement_cleanup_not_confirmed:${apiReplacementCleanupReceipt?.status ?? 'missing'}`);
  if (!uiApprovalReady) blockers.push(`ui_edit_packet_not_ready:${uiEditApprovalPacket?.status ?? 'missing'}`);

  const canPrepareExistingDraftApiUpdateApproval = diagnosticReady
    && apiConnectionStableForRead
    && allApiPayloadReady
    && allDraftsInertByApi
    && cleanupDone
    && uiApprovalReady;
  const apiExistingDraftUpdateRecommendedNow = canPrepareExistingDraftApiUpdateApproval;
  const apiCreateRealDraftsRecommendedNow = false;
  const currentRecommendedRoute = apiExistingDraftUpdateRecommendedNow
    ? 'prepare_separate_existing_draft_api_update_approval_packet'
    : 'do_not_mutate_existing_e02_e03_by_api_until_recipient_gate_is_closed_or_use_existing_ui_edit_route';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_api_existing_draft_update_strategy_packet',
    generatedAt,
    ok: true,
    status: apiExistingDraftUpdateRecommendedNow
      ? 'mailerlite_api_existing_draft_update_strategy_ready_for_separate_approval_packet_no_live_changes'
      : 'mailerlite_api_existing_draft_update_strategy_blocked_existing_drafts_not_inert_no_live_changes',
    executiveSummary: {
      apiConnectionStableForRead,
      apiEditDiagnosticStatus: apiEditDiagnostic?.status ?? null,
      apiReadCampaignCount: apiEditDiagnostic?.executiveSummary?.campaignReadCount ?? null,
      apiReadErrorCount: apiEditDiagnostic?.executiveSummary?.apiErrorCount ?? null,
      allCorrectedHtmlReady: apiEditDiagnostic?.executiveSummary?.allCorrectedHtmlReady ?? null,
      allApiPayloadReady,
      allDraftsInertByApi,
      apiEditCandidate,
      apiLabCompleted: labCompleted,
      apiLabReadyToUseCreateRecipeForRealDrafts: apiInertDraftLab?.executiveSummary?.readyToUseApiRecipeForRealDrafts ?? null,
      cleanupDone,
      uiEditPacketReady: uiApprovalReady,
      apiCreateRealDraftsRecommendedNow,
      apiExistingDraftUpdateRecommendedNow,
      currentRecommendedRoute,
      blockerCount: blockers.length,
      nextBestMove: apiExistingDraftUpdateRecommendedNow
        ? 'Generate a separate exact approval packet for content-only API update of existing drafts; do not mutate yet.'
        : 'Keep API for read-only QA and future update attempts, but do not edit current E02/E03 by API while MailerLite reports their recipient/schedule gate open.',
    },
    officialDocsInterpretation: {
      sources: OFFICIAL_SOURCES,
      updateDraftCampaignDocumented: true,
      advancedHtmlContentFieldDocumented: true,
      scheduleSendEndpointSeparate: true,
      noAudienceOrUnschedulableCreationFlagDocumented: false,
      inferredSafeUse: [
        'Use API for read-only campaign QA and post-edit verification.',
        'Use API for content-only updates only when the pre-update campaign metadata is already inert.',
        'Do not use API-created real replacement drafts from the current lab evidence.',
      ],
    },
    localEvidenceInterpretation: {
      apiCreateRealDraftLab: {
        status: apiInertDraftLab?.status ?? null,
        completed: labCompleted,
        variantCount: apiInertDraftLab?.executiveSummary?.variantCount ?? null,
        inertVariantCount: apiInertDraftLab?.executiveSummary?.inertVariantCount ?? null,
        readyToUseApiRecipeForRealDrafts: apiInertDraftLab?.executiveSummary?.readyToUseApiRecipeForRealDrafts ?? null,
      },
      readOnlyExistingDraftDiagnostic: {
        status: apiEditDiagnostic?.status ?? null,
        apiEditCandidate,
        campaignReadCount: apiEditDiagnostic?.executiveSummary?.campaignReadCount ?? null,
        allCorrectedHtmlReady: apiEditDiagnostic?.executiveSummary?.allCorrectedHtmlReady ?? null,
        allApiPayloadReady,
        allDraftsInertByApi,
        blockerCount: apiEditDiagnostic?.executiveSummary?.blockerCount ?? null,
        draftSafety: summarizeDraftSafety(apiEditDiagnostic),
      },
      unsafeReplacementCleanup: {
        status: apiReplacementCleanupReceipt?.status ?? null,
        completed: cleanupDone,
        deletedDraftCount: countRows(apiReplacementCleanupReceipt?.deletedDrafts),
        goneCount: apiReplacementCleanupReceipt?.postScan?.goneCount ?? null,
      },
      uiFallback: {
        approvalPacketStatus: uiEditApprovalPacket?.status ?? null,
        readyIfHumanChoosesUiRoute: uiApprovalReady,
      },
    },
    decisionBoundary: {
      packetIsApprovalByItself: false,
      canEditByApiNow: false,
      canCreateDraftsByApiNow: false,
      canSendNow: false,
      exactApprovalPhraseAvailable: false,
      approvalPhrasePrinted: false,
      beforeAnyFutureApiMutation: [
        'fresh read-only MailerLite re-scan by campaign id',
        'confirm every target campaign remains status=draft and not scheduled/not queued/not sending/not used in automations',
        'confirm every target campaign is inert: no recipient filter, no basic filter, recipients missing, cannot schedule',
        'prepare a separate exact approval packet for one named mutation route',
        'stop if any recipient/schedule gate is open',
      ],
    },
    blockers: [...new Set(blockers)],
    safety,
    sourceDigests,
  };
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (packet) => [
  '# MailerLite API Existing Draft Update Strategy',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  '',
  '## Summary',
  '',
  `- API connection stable for read: ${packet.executiveSummary.apiConnectionStableForRead}`,
  `- Campaigns read by diagnostic: ${packet.executiveSummary.apiReadCampaignCount}`,
  `- Corrected HTML ready: ${packet.executiveSummary.allCorrectedHtmlReady}`,
  `- API payload ready: ${packet.executiveSummary.allApiPayloadReady}`,
  `- Existing drafts inert by API: ${packet.executiveSummary.allDraftsInertByApi}`,
  `- API create real drafts recommended now: ${packet.executiveSummary.apiCreateRealDraftsRecommendedNow}`,
  `- API existing-draft update recommended now: ${packet.executiveSummary.apiExistingDraftUpdateRecommendedNow}`,
  `- Current recommended route: ${packet.executiveSummary.currentRecommendedRoute}`,
  '',
  '## Official Docs Interpretation',
  '',
  `- Draft update documented: ${packet.officialDocsInterpretation.updateDraftCampaignDocumented}`,
  `- Advanced content field documented: ${packet.officialDocsInterpretation.advancedHtmlContentFieldDocumented}`,
  `- Schedule/send endpoint separate: ${packet.officialDocsInterpretation.scheduleSendEndpointSeparate}`,
  `- No-audience/unschedulable creation flag documented: ${packet.officialDocsInterpretation.noAudienceOrUnschedulableCreationFlagDocumented}`,
  '',
  'Sources:',
  ...packet.officialDocsInterpretation.sources.map((source) => `- ${source.title}: ${source.url}`),
  '',
  '## Local Evidence',
  '',
  `- API lab status: ${packet.localEvidenceInterpretation.apiCreateRealDraftLab.status}`,
  `- API lab ready recipe for real drafts: ${packet.localEvidenceInterpretation.apiCreateRealDraftLab.readyToUseApiRecipeForRealDrafts}`,
  `- Existing-draft diagnostic status: ${packet.localEvidenceInterpretation.readOnlyExistingDraftDiagnostic.status}`,
  `- Existing-draft diagnostic candidate: ${packet.localEvidenceInterpretation.readOnlyExistingDraftDiagnostic.apiEditCandidate}`,
  `- Unsafe replacement cleanup completed: ${packet.localEvidenceInterpretation.unsafeReplacementCleanup.completed}`,
  `- UI fallback packet ready: ${packet.localEvidenceInterpretation.uiFallback.readyIfHumanChoosesUiRoute}`,
  '',
  'Draft safety:',
  ...packet.localEvidenceInterpretation.readOnlyExistingDraftDiagnostic.draftSafety.map((draft) =>
    `- E${String(draft.step).padStart(2, '0')}: safetyClosed=${draft.safetyClosed}, failed=${draft.failedSafetyChecks.join(', ') || 'none'}, apiPayloadReady=${draft.apiPayloadReady}`),
  '',
  '## Decision Boundary',
  '',
  `- Packet is approval by itself: ${packet.decisionBoundary.packetIsApprovalByItself}`,
  `- Can edit by API now: ${packet.decisionBoundary.canEditByApiNow}`,
  `- Can create drafts by API now: ${packet.decisionBoundary.canCreateDraftsByApiNow}`,
  `- Can send now: ${packet.decisionBoundary.canSendNow}`,
  `- Exact approval phrase available: ${packet.decisionBoundary.exactApprovalPhraseAvailable}`,
  '',
  'Before any future API mutation:',
  renderList(packet.decisionBoundary.beforeAnyFutureApiMutation),
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Safety',
  '',
  `- MailerLite API called by this packet: ${packet.safety.mailerLiteApiCalled}`,
  `- MailerLite mutations performed: ${packet.safety.mailerLiteMutationsPerformed}`,
  `- Sends performed: ${packet.safety.sendsPerformed}`,
  `- Subscribers read/mutated: ${packet.safety.subscribersRead}/${packet.safety.subscriberMutationsPerformed}`,
  `- Groups/segments/workflows mutated: ${packet.safety.groupsCreatedOrAssigned || packet.safety.segmentsCreatedOrAssigned || packet.safety.workflowMutationsPerformed}`,
  `- Exact URLs stored/printed: ${packet.safety.exactUrlsStoredInReport}/${packet.safety.exactUrlsPrinted}`,
  `- Tokens printed: ${packet.safety.tokensPrinted}`,
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

const buildPacketFromFiles = async (options) => {
  const entries = await Promise.all([
    readOptionalJsonWithDigest(options.apiEditDiagnostic, 'read-only MailerLite API diagnostic for existing draft update viability'),
    readOptionalJsonWithDigest(options.apiInertDraftLab, 'disposable API create/inspect/delete lab result'),
    readOptionalJsonWithDigest(options.uiEditApprovalPacket, 'current UI edit fallback approval packet'),
    readOptionalJsonWithDigest(options.apiReplacementCleanupReceipt, 'cleanup receipt for unsafe API replacement drafts'),
  ]);

  const [
    apiEditDiagnostic,
    apiInertDraftLab,
    uiEditApprovalPacket,
    apiReplacementCleanupReceipt,
  ] = entries.map((entry) => entry.value);

  return buildStrategyPacket({
    apiEditDiagnostic,
    apiInertDraftLab,
    uiEditApprovalPacket,
    apiReplacementCleanupReceipt,
    sourceDigests: entries.map((entry) => entry.digest),
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  await writeOutputs(packet, options);
  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    apiConnectionStableForRead: packet.executiveSummary.apiConnectionStableForRead,
    apiExistingDraftUpdateRecommendedNow: packet.executiveSummary.apiExistingDraftUpdateRecommendedNow,
    apiCreateRealDraftsRecommendedNow: packet.executiveSummary.apiCreateRealDraftsRecommendedNow,
    blockerCount: packet.executiveSummary.blockerCount,
    out: resolve(options.out),
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite API existing draft update strategy packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildStrategyPacket,
  cleanupCompleted,
  parseArgs,
  renderMarkdown,
  summarizeDraftSafety,
};
