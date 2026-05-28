#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-test-qa-packet-2026-05-28';
const DEFAULT_REHEARSAL_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EVENT_CONTRACT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_MANUAL_UI_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_manual_ui_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_empty_group_create_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';
const DEFAULT_REAL_MAILERLITE_RENDER_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_real_mailerlite_render_qa_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_SHOPIFY_PROTOCOL = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/SHOPIFY_PREVIEW_PROTOCOL.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_CONTROL_ROOM = '/Users/alejandrogomez/CRM/docs/crm-vnext/mailerlite-launch-os-v0-control-room.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs [options]

Options:
  --rehearsal-packet <path>     Mini-launch rehearsal JSON. Defaults to ${DEFAULT_REHEARSAL_PACKET}
  --event-contract <path>       Mini-launch event contract JSON. Defaults to ${DEFAULT_EVENT_CONTRACT}
  --email-style-qa <path>       Mini-launch Email Style QA JSON. Defaults to ${DEFAULT_EMAIL_STYLE_QA}
  --email-render-qa <path>      Mini-launch local render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --manual-ui-build-receipt <path> Mini-launch MailerLite UI draft build receipt. Defaults to ${DEFAULT_MANUAL_UI_BUILD_RECEIPT}
  --empty-group-create-dry-run <path> Mini-launch group create dry-run/post-execution scan. Defaults to ${DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN}
  --approval-queue <path>       Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --real-mailerlite-render-qa <path> Optional real MailerLite draft render QA JSON. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --email-style-canon <path>    Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --shopify-protocol <path>     Shopify preview protocol. Defaults to ${DEFAULT_SHOPIFY_PROTOCOL}
  --group-dictionary <path>     Brand MailerLite group dictionary. Defaults to ${DEFAULT_GROUP_DICTIONARY}
  --control-room <path>         CRM MailerLite Launch OS control room. Defaults to ${DEFAULT_CONTROL_ROOM}
  --test-email <email>          Optional future seed email. Redacted in report.
  --out <path>                  Write JSON packet
  --markdown-out <path>         Write Markdown packet
  --help                        Show this help

Local-only QA and seed-test packet for one Mini-Launch OS rehearsal. It defines
the gates, QA checklist, and approval boundaries before any MailerLite,
Shopify, CRM, subscriber, workflow, form, ledger, or send mutation.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  const [domainName, ...domainRest] = domain.split('.');
  const localPrefix = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`;
  return `${localPrefix}@${domainName[0] ?? '*'}***.${domainRest.at(-1) ?? '***'}`;
};

const parseArgs = (argv) => {
  const options = {
    rehearsalPacket: DEFAULT_REHEARSAL_PACKET,
    eventContract: DEFAULT_EVENT_CONTRACT,
    emailStyleQa: DEFAULT_EMAIL_STYLE_QA,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    manualUiBuildReceipt: DEFAULT_MANUAL_UI_BUILD_RECEIPT,
    emptyGroupCreateDryRun: DEFAULT_EMPTY_GROUP_CREATE_DRY_RUN,
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    shopifyProtocol: DEFAULT_SHOPIFY_PROTOCOL,
    groupDictionary: DEFAULT_GROUP_DICTIONARY,
    controlRoom: DEFAULT_CONTROL_ROOM,
    testEmail: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--rehearsal-packet') options.rehearsalPacket = argv[++index];
    else if (arg === '--event-contract') options.eventContract = argv[++index];
    else if (arg === '--email-style-qa') options.emailStyleQa = argv[++index];
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
    else if (arg === '--manual-ui-build-receipt') options.manualUiBuildReceipt = argv[++index];
    else if (arg === '--empty-group-create-dry-run') options.emptyGroupCreateDryRun = argv[++index];
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--shopify-protocol') options.shopifyProtocol = argv[++index];
    else if (arg === '--group-dictionary') options.groupDictionary = argv[++index];
    else if (arg === '--control-room') options.controlRoom = argv[++index];
    else if (arg === '--test-email') options.testEmail = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  const normalizedEmail = normalizeEmail(options.testEmail);
  if (options.testEmail && !normalizedEmail) throw new Error('invalid_test_email');
  options.testEmail = normalizedEmail;
  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const readOptionalJson = async (path) => {
  try {
    return JSON.parse(await readFile(resolve(path), 'utf8'));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
};

const purposeFor = (path) => path.includes('email_style_qa')
  ? 'mini-launch Email Style QA state before any seed send'
  : path.includes('email_render_qa')
    ? 'local render QA evidence before MailerLite builder/render QA'
    : path.includes('manual_ui_build_receipt')
      ? 'MailerLite UI draft build receipt and closed send/subscriber/workflow gates'
      : path.includes('empty_group_create')
        ? 'fresh group scan proving receipt groups exist or remain missing'
        : path.includes('approval_queue')
          ? 'current exact approval queue and seed-send blockers'
          : path.includes('real_mailerlite_render_qa')
            ? 'future real MailerLite draft render QA evidence'
            : path.includes('email_style_canon')
              ? 'Email creative QA and visual/editorial canon'
              : path.includes('SHOPIFY_PREVIEW')
                ? 'Shopify preview default and live-publish boundary'
                : path.includes('GROUP_DICTIONARY')
                  ? 'MailerLite group status and naming authority'
                  : path.includes('control-room')
                    ? 'current Launch OS board map and approval gates'
                    : 'mini-launch rehearsal or event contract state';

const digestSource = (path, content, present = true) => ({
  path: resolve(path),
  present,
  chars: content?.length ?? 0,
  consultedFor: purposeFor(path),
});

const loadSourceDigests = async (options) => {
  const sources = [
    [options.rehearsalPacket, true],
    [options.eventContract, true],
    [options.emailStyleQa, false],
    [options.emailRenderQa, false],
    [options.manualUiBuildReceipt, false],
    [options.emptyGroupCreateDryRun, false],
    [options.approvalQueue, false],
    [options.realMailerLiteRenderQa, false],
    [options.emailStyleCanon, true],
    [options.shopifyProtocol, true],
    [options.groupDictionary, true],
    [options.controlRoom, true],
  ];
  const digests = [];
  for (const [path, required] of sources) {
    try {
      const content = await readFile(resolve(path), 'utf8');
      digests.push(digestSource(path, content, true));
    } catch (error) {
      if (error.code !== 'ENOENT' || required) throw error;
      digests.push(digestSource(path, null, false));
    }
  }
  return digests;
};

const launchFrom = (rehearsalPacket, eventContract) => ({
  launchId: rehearsalPacket?.launch?.launchId ?? eventContract?.launch?.launchId,
  resourceName: rehearsalPacket?.launch?.resourceName ?? eventContract?.launch?.resourceName,
  resourceType: rehearsalPacket?.launch?.resourceType ?? eventContract?.launch?.resourceType,
  sourceGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.sourceGroupCandidate?.name
    ?? eventContract?.launch?.sourceGroupCandidate
    ?? null,
  deliveredGroupCandidate:
    rehearsalPacket?.handoffs?.mailerLite?.candidates?.deliveredGroupCandidate?.name
    ?? eventContract?.launch?.deliveredGroupCandidate
    ?? null,
});

const findApprovalGate = (rehearsalPacket, gate) =>
  rehearsalPacket?.approvalQueue?.find((item) => item?.gate === gate) ?? null;

const buildQaSurfaces = (rehearsalPacket) => ({
  publicSurfaces: rehearsalPacket?.publicSurfaceGuardrails?.publicSurfaces ?? [
    'landing',
    'resource',
    'email body',
    'thank-you page',
    'caption_or_dm_copy',
  ],
  internalSurfaces: rehearsalPacket?.publicSurfaceGuardrails?.internalSurfaces ?? [
    'strategy notes',
    'CRM fields',
    'MailerLite groups',
    'tags',
    'automation plan',
    'QA receipt',
  ],
  bannedInternalTermsInPublicCopy: rehearsalPacket?.publicSurfaceGuardrails?.bannedInternalTermsInPublicCopy ?? [
    'lead magnet',
    'CRM',
    'MailerLite',
    'tag',
    'automatizacion',
  ],
});

const buildSeedTestModes = ({ launch, testEmailRedacted }) => [
  {
    id: 'asset_only_seed_preview',
    purpose: 'Verify copy, visual style, footer/legal, links and mobile rendering before receipts or automation routing.',
    allowedOnlyAfterApproval: [
      'send exactly one MailerLite UI/API test email to the approved seed address',
      'read the seed inbox or supplied screenshot for QA evidence',
    ],
    doesNotTest: [
      'Source receipt assignment',
      'Delivered receipt assignment',
      'subscriber routing',
      'workflow activation',
      'public capture',
    ],
    currentReadiness: testEmailRedacted ? 'needs_assets_and_exact_send_approval' : 'needs_seed_email_assets_and_exact_send_approval',
  },
  {
    id: 'receipt_seed_test',
    purpose: 'Verify the minimum end-to-end receipt lane for one approved test subscriber only.',
    allowedOnlyAfterApproval: [
      `create/update only the approved seed subscriber${testEmailRedacted ? ` (${testEmailRedacted})` : ''}`,
      `assign Source candidate only if live and approved: ${launch.sourceGroupCandidate}`,
      `assign Delivered candidate only if live and approved: ${launch.deliveredGroupCandidate}`,
      'send only the approved seed test email step',
      'verify receipt/inbox/readback without touching audience',
    ],
    doesNotTest: [
      'real audience launch',
      'active onboarding handoff',
      'public Shopify form capture',
      'CRM card/scoring mutation',
    ],
    currentReadiness: 'blocked_until_candidate_groups_and_seed_scope_are_approved',
  },
  {
    id: 'crm_signal_dry_run',
    purpose: 'Convert seed-test observations into sample Signal Event Ledger input without appending to the ledger.',
    allowedOnlyAfterApproval: [
      'normalize supplied seed observations locally',
      'compare observed events against the mini-launch event contract',
      'produce a market-learning review packet',
    ],
    doesNotTest: [
      'CRM card writes',
      'score mutation',
      'Fact Store write',
      'outbound follow-up',
    ],
    currentReadiness: 'ready_after_seed_observations_exist_no_live_write',
  },
];

const manualUiDraftsBuiltFrom = (receipt) => {
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
    && (receipt?.stillClosedAfterThisReceipt ?? []).includes('seed_send_or_test_send');
};

const targetDraftsFrom = (receipt) => (receipt?.draftReceipts ?? []).map((draft) => ({
  step: draft.step,
  role: draft.role,
  draftName: draft.draftName,
  expectedSubject: draft.expectedSubject,
  expectedPreheader: draft.expectedPreheader,
  draftUiReferencePresent: Boolean(draft.draftUiReference),
}));

const localRenderReadyFrom = (renderQa) => renderQa?.status === 'mini_launch_email_render_qa_green_no_live_changes'
  && renderQa?.executiveSummary?.localRenderReady === true
  && renderQa?.executiveSummary?.emailCount === 4
  && renderQa?.executiveSummary?.renderPreviewNonEmptyCount === 4
  && renderQa?.executiveSummary?.publicUseReady === false
  && renderQa?.executiveSummary?.seedSendReady === false
  && renderQa?.safety?.mailerLiteApiCalled === false
  && renderQa?.safety?.sendsPerformed === false;

const groupsExistFrom = (dryRun) => dryRun?.status === 'dry_run_no_create_needed_targets_already_exist'
  && dryRun?.freshScan?.targetGroupsExistingCount === 2
  && dryRun?.freshScan?.targetGroupsMissingCount === 0
  && dryRun?.safety?.mailerLiteMutationsPerformed === false
  && dryRun?.safety?.groupMutationsPerformed === false
  && dryRun?.safety?.sendsPerformed === false;

const styleQaReadyForAssetsFrom = (styleQa) => styleQa?.status === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes'
  && styleQa?.approvalGate?.readyForLocalAssetPlanNow === true
  && styleQa?.approvalGate?.readyForSeedSendNow === false
  && styleQa?.safety?.mailerLiteApiCalled === false
  && styleQa?.safety?.sendsPerformed === false;

const realMailerLiteRenderReadyFrom = (realQa) => realQa?.status === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes'
  && realQa?.executiveSummary?.draftCount === 4
  && realQa?.executiveSummary?.allDraftsPreviewed === true
  && realQa?.executiveSummary?.seedSendReady === false
  && realQa?.safety?.sendsPerformed === false
  && realQa?.safety?.subscriberMutationsPerformed === false
  && realQa?.safety?.workflowMutationsPerformed === false;

const buildQaChecklist = ({ launch, rehearsalPacket, eventContract }) => {
  const eventKinds = new Set(eventContract?.eventContract?.map((item) => item.eventKind) ?? []);
  return {
    brandCreativeQa: [
      'Email feels like an editorial letter from Alejandro, not a generic MailerLite template.',
      'Poppins body, Georgia accent where useful, #474747 body text, #F4F7FA outer background and white container are approximated or limitation is declared.',
      'One main CTA; no default MailerLite blue button if a button is used.',
      'Visual signature of Alejandro is included when available, or marked explicitly pending.',
      'Footer/legal is reviewed, intentional, and not visually broken.',
      'Public copy avoids internal terms and does not overuse the AI-ish "a veces" formula.',
    ],
    shopifyWebQa: [
      'Preview/draft is Shopify-first or exact Web Design handoff; loose HTML is not treated as final.',
      'Mobile-first check is done for landing, quiz, result and thank-you states.',
      'No live form, payment, public publish, or real CRM tag is connected without separate approval.',
      `All public surfaces keep launch_id ${launch.launchId} out of customer-facing copy.`,
    ],
    mailerLiteFunctionalQa: [
      'Fresh read-only scan is required before any live create/assign/send operation.',
      `Source group candidate is treated as candidate until explicitly created/verified: ${launch.sourceGroupCandidate}`,
      `Delivered group candidate is treated as candidate until explicitly created/verified: ${launch.deliveredGroupCandidate}`,
      'A seed send may test creative rendering before receipts, but it must be labeled asset-only.',
      'A receipt seed test may touch only the approved seed subscriber and approved candidate groups.',
      'No workflow activation, no audience send, no Onboarding v1/V2 routing.',
    ],
    crmDataQa: [
      `Primary key is ${rehearsalPacket?.dataPlan?.primaryKey ?? `experiment.launch_id=${launch.launchId}`}.`,
      eventKinds.has('email_submitted') ? 'Email capture event exists in contract.' : 'Email capture event is missing from contract.',
      eventKinds.has('quiz_or_game_completed') ? 'Quiz completion/result event exists in contract.' : 'Quiz completion/result event is missing from contract.',
      eventKinds.has('resource_delivered') ? 'Delivery receipt event exists in contract and remains store-only.' : 'Delivery receipt event is missing from contract.',
      eventKinds.has('email_click') ? 'Email click can project through existing engagement pipeline.' : 'Email click projection is missing.',
      eventKinds.has('market_signal_reviewed') ? 'Market-learning review event exists and stays store-only.' : 'Market-learning review event is missing.',
      'No card write, score mutation, Fact Store write or outbound is allowed from seed evidence alone.',
    ],
  };
};

const seedSendStatusFor = ({ seedReadiness = {}, testEmailRedacted }) => {
  if (seedReadiness.canAskSeedSendApprovalNow) return 'ready_for_exact_seed_send_approval_request';
  if (seedReadiness.manualUiDraftsBuilt && seedReadiness.localRenderReady && !seedReadiness.realMailerLiteRenderQaReady) {
    return 'blocked_until_real_mailerlite_render_qa';
  }
  if (seedReadiness.realMailerLiteRenderQaReady && !testEmailRedacted) return 'needs_exact_seed_recipient';
  return testEmailRedacted ? 'needs_assets_render_qa_and_exact_send_approval' : 'needs_seed_email_assets_render_qa_and_exact_send_approval';
};

const buildApprovalMatrix = ({ rehearsalPacket, launch, testEmailRedacted, seedReadiness = {} }) => {
  const gate = (id) => findApprovalGate(rehearsalPacket, id);
  return [
    {
      id: 'brand_approve_brief_and_public_copy',
      owner: 'Brand Hub',
      currentStatus: gate('brand_approve_brief_and_public_copy')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'any public-facing asset, Shopify preview, or MailerLite seed test reuse',
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'shopify_preview_draft',
      owner: 'Web Design / Shopify',
      currentStatus: 'closed_until_brand_copy_and_preview_scope',
      requiredBefore: 'any web/quiz preview outside local handoff',
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'candidate_group_creation_dry_run',
      owner: 'CRM / MailerLite planner',
      currentStatus: 'not_run_for_this_launch',
      requiredBefore: `creating ${launch.sourceGroupCandidate} or ${launch.deliveredGroupCandidate}`,
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: false,
    },
    {
      id: 'create_empty_mailerlite_groups',
      owner: 'MailerLite',
      currentStatus: gate('create_empty_mailerlite_groups')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'receipt seed test with Source/Delivered assignment',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'asset_only_seed_email_send',
      owner: 'MailerLite UI/API',
      currentStatus: seedSendStatusFor({ seedReadiness, testEmailRedacted }),
      requiredBefore: 'sending one creative/rendering test email to a seed address',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'receipt_seed_subscriber_and_groups',
      owner: 'MailerLite',
      currentStatus: 'closed_until_groups_seed_email_and_exact_scope',
      requiredBefore: 'creating/updating one seed subscriber and assigning candidate receipt groups',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'crm_signal_ledger_append',
      owner: 'CRM',
      currentStatus: 'closed_until_real_seed_observations_and_write_approval',
      requiredBefore: 'persisting seed observations to Signal Event Ledger',
      liveMutationIfApproved: false,
      localMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
    {
      id: 'audience_launch',
      owner: 'Alejandro',
      currentStatus: gate('audience_launch')?.allowedNow === false ? 'closed' : 'unknown',
      requiredBefore: 'public send, form connection, Shopify publish, or audience routing',
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    },
  ];
};

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
  workflowMutationsPerformed: false,
  formMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildSeedTestQaPacket = ({
  rehearsalPacket,
  eventContract,
  emailStyleQa = null,
  emailRenderQa = null,
  manualUiBuildReceipt = null,
  emptyGroupCreateDryRun = null,
  approvalQueue = null,
  realMailerLiteRenderQa = null,
  sourceDigests,
  testEmail = null,
  generatedAt = new Date().toISOString(),
}) => {
  const launch = launchFrom(rehearsalPacket, eventContract);
  const testEmailRedacted = redactEmail(testEmail);
  const eventContractReady = eventContract?.status === 'mini_launch_event_contract_ready_no_ledger_write'
    && eventContract?.ok === true;
  const rehearsalReady = rehearsalPacket?.status === 'mini_launch_rehearsal_ready_no_live_changes'
    && rehearsalPacket?.ok === true;
  const emailStyleReadyForAssets = styleQaReadyForAssetsFrom(emailStyleQa);
  const localRenderReady = localRenderReadyFrom(emailRenderQa);
  const manualUiDraftsBuilt = manualUiDraftsBuiltFrom(manualUiBuildReceipt);
  const targetDrafts = targetDraftsFrom(manualUiBuildReceipt);
  const targetGroupsExist = groupsExistFrom(emptyGroupCreateDryRun);
  const realMailerLiteRenderQaReady = realMailerLiteRenderReadyFrom(realMailerLiteRenderQa);
  const approvalQueueSeedItem = approvalQueue?.approvalItems?.find((item) => item.id === 'mini_launch_seed_send') ?? null;
  const machineBlockersBeforeSeedSendApprovalRequest = [
    ...(rehearsalReady ? [] : ['rehearsal_packet_not_ready']),
    ...(eventContractReady ? [] : ['event_contract_not_ready']),
    ...(emailStyleReadyForAssets ? [] : ['email_style_qa_not_ready_for_assets']),
    ...(localRenderReady ? [] : ['local_render_qa_not_green']),
    ...(manualUiDraftsBuilt ? [] : ['manual_ui_drafts_not_built']),
    ...(targetGroupsExist ? [] : ['receipt_groups_not_proven_existing']),
    ...(realMailerLiteRenderQaReady ? [] : ['real_mailerlite_render_qa_missing']),
    ...(testEmailRedacted ? [] : ['exact_seed_recipient_missing']),
  ];
  const canAskSeedSendApprovalNow = machineBlockersBeforeSeedSendApprovalRequest.length === 0;
  const qaChecklist = buildQaChecklist({ launch, rehearsalPacket, eventContract });
  const seedReadinessSnapshot = {
    manualUiDraftsBuilt,
    localRenderReady,
    realMailerLiteRenderQaReady,
    canAskSeedSendApprovalNow,
  };
  const approvalMatrix = buildApprovalMatrix({
    rehearsalPacket,
    launch,
    testEmailRedacted,
    seedReadiness: seedReadinessSnapshot,
  });
  const blockerLabels = {
    rehearsal_packet_not_ready: 'Mini-launch rehearsal packet is not ready.',
    event_contract_not_ready: 'Mini-launch event contract is not ready.',
    email_style_qa_not_ready_for_assets: 'Email Style QA is not ready for asset use.',
    local_render_qa_not_green: 'Local render QA is not green for all four emails.',
    manual_ui_drafts_not_built: 'The four MailerLite UI drafts are not proven built.',
    receipt_groups_not_proven_existing: 'The two receipt groups are not proven existing in the current group scan.',
    real_mailerlite_render_qa_missing: 'Real MailerLite render QA on the four UI drafts is missing.',
    exact_seed_recipient_missing: 'No exact seed recipient is supplied in this packet.',
    exact_seed_send_approval_missing: 'No exact seed-send approval has been given.',
  };
  const blockersBeforeSeedSendApprovalRequest = machineBlockersBeforeSeedSendApprovalRequest
    .map((blocker) => blockerLabels[blocker] ?? blocker);
  const machineBlockersBeforeAnySeedSend = [
    ...machineBlockersBeforeSeedSendApprovalRequest,
    'exact_seed_send_approval_missing',
  ];
  const blockersBeforeAnySeedSend = machineBlockersBeforeAnySeedSend
    .map((blocker) => blockerLabels[blocker] ?? blocker);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_seed_test_qa_packet',
    generatedAt,
    ok: rehearsalReady && eventContractReady,
    status: rehearsalReady && eventContractReady && manualUiDraftsBuilt
      ? 'seed_test_qa_packet_updated_after_manual_ui_build_no_live_changes'
      : rehearsalReady && eventContractReady
      ? 'seed_test_qa_packet_ready_no_live_changes'
      : 'seed_test_qa_packet_needs_rehearsal_or_event_contract',
    launch,
    seedIdentity: {
      supplied: Boolean(testEmailRedacted),
      redactedEmail: testEmailRedacted,
      rule: 'Never print full seed email in reports unless the user explicitly asks for a private execution packet.',
    },
    readiness: {
      rehearsalReady,
      eventContractReady,
      emailStyleReadyForAssets,
      localRenderReady,
      manualUiDraftsBuilt,
      manualUiDraftCount: targetDrafts.length,
      targetGroupsExist,
      realMailerLiteRenderQaReady,
      approvalQueueSeedItemStatus: approvalQueueSeedItem?.status ?? null,
      approvalQueueSeedItemBlockers: approvalQueueSeedItem?.blockers ?? [],
      canAskSeedSendApprovalNow,
      readyForLocalAssetDrafting: rehearsalReady && eventContractReady,
      readyForAssetOnlySeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
      machineBlockersBeforeSeedSendApprovalRequest,
      blockersBeforeSeedSendApprovalRequest,
      machineBlockersBeforeAnySeedSend,
      blockersBeforeAnySeedSend,
      blockersBeforeReceiptSeedTest: [
        ...(targetGroupsExist ? [] : [
          'Source/Delivered candidate groups are not proven live for this launch.',
          'No fresh read-only MailerLite scan exists for this launch-specific group plan.',
        ]),
        ...(realMailerLiteRenderQaReady ? [] : ['Real MailerLite render QA on the four UI drafts is missing.']),
        ...(testEmailRedacted ? [] : ['No exact seed recipient is supplied in this packet.']),
        'No exact approval exists to create/update the seed subscriber or assign groups.',
        'No exact approval exists to send a seed email for this launch.',
      ],
    },
    targetDrafts,
    sourceEvidence: {
      emailStyleQaStatus: emailStyleQa?.status ?? null,
      emailRenderQaStatus: emailRenderQa?.status ?? null,
      manualUiBuildReceiptStatus: manualUiBuildReceipt?.status ?? null,
      emptyGroupCreateDryRunStatus: emptyGroupCreateDryRun?.status ?? null,
      approvalQueueStatus: approvalQueue?.status ?? null,
      realMailerLiteRenderQaStatus: realMailerLiteRenderQa?.status ?? null,
      localRenderPreviewNonEmptyCount: emailRenderQa?.executiveSummary?.renderPreviewNonEmptyCount ?? null,
      manualUiOutboxCountAfterBuild: manualUiBuildReceipt?.executiveSummary?.outboxCountAfterBuild ?? null,
      manualUiPlanObserved: manualUiBuildReceipt?.uiEvidence?.mailerLiteAccountPlanObserved ?? null,
      targetGroupsExistingCount: emptyGroupCreateDryRun?.freshScan?.targetGroupsExistingCount ?? null,
      targetGroupsMissingCount: emptyGroupCreateDryRun?.freshScan?.targetGroupsMissingCount ?? null,
    },
    seedTestModes: buildSeedTestModes({ launch, testEmailRedacted }),
    qaSurfaces: buildQaSurfaces(rehearsalPacket),
    qaChecklist,
    approvalMatrix,
    seedSendApprovalBoundary: {
      canAskAlejandroForApproval: canAskSeedSendApprovalNow,
      packetIsApprovalByItself: false,
      exactApprovalPhrase: null,
      exactApprovalPhraseTemplate: 'Apruebo enviar únicamente test emails desde los 4 borradores del mini-lanzamiento Inteligencia para descansar al seed recipient exacto aprobado, después de re-scan fresco y QA real verde en MailerLite, sin publicar, sin programar, sin workflows, sin audience send, sin subscribers fuera del seed recipient, sin crear ni asignar grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.',
      requiredBeforeApprovalRequest: [
        'real MailerLite render QA green for all four UI drafts',
        'exact seed recipient captured in a private execution packet',
        'fresh Drafts/Outbox scan confirming the four drafts are still drafts and Outbox is empty',
        'exact approval phrase naming seed/test send only',
      ],
      stillClosedEvenAfterApproval: [
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
    },
    nextActionRecommendation: {
      id: realMailerLiteRenderQaReady ? 'collect_exact_seed_recipient_private_scope' : 'run_real_mailerlite_render_qa_before_seed',
      reason: manualUiDraftsBuilt
        ? 'The four MailerLite UI drafts exist, but local HTML render QA is not enough evidence for a seed/test send.'
        : 'A seed test is only useful after the MailerLite draft assets exist and can be inspected.',
      nextNoLiveMove: realMailerLiteRenderQaReady
        ? 'Prepare a private seed-send approval packet with the exact recipient and no audience/workflow/subscriber expansion.'
        : 'Open the four MailerLite drafts read-only, verify real preview/render state, record evidence, and keep send/schedule/recipient controls untouched.',
    },
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Seed-Test QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id: ${packet.launch.launchId}`,
    '',
    'Este packet deja preparado el ensayo sin tocar produccion. Separa prueba de assets, prueba de recibos, señales CRM y lanzamiento publico para que Mantis no confunda un test con un lanzamiento real.',
    '',
    '## Readiness',
    '',
    `- Rehearsal ready: ${packet.readiness.rehearsalReady}`,
    `- Event contract ready: ${packet.readiness.eventContractReady}`,
    `- Email Style QA ready for assets: ${packet.readiness.emailStyleReadyForAssets}`,
    `- Local render QA ready: ${packet.readiness.localRenderReady}`,
    `- Manual UI drafts built: ${packet.readiness.manualUiDraftsBuilt}`,
    `- Receipt groups exist: ${packet.readiness.targetGroupsExist}`,
    `- Real MailerLite render QA ready: ${packet.readiness.realMailerLiteRenderQaReady}`,
    `- Seed recipient supplied: ${packet.seedIdentity.supplied}`,
    `- Can ask seed-send approval now: ${packet.readiness.canAskSeedSendApprovalNow}`,
    `- Ready for local asset drafting: ${packet.readiness.readyForLocalAssetDrafting}`,
    `- Ready for asset-only seed send now: ${packet.readiness.readyForAssetOnlySeedSendNow}`,
    `- Ready for receipt seed test now: ${packet.readiness.readyForReceiptSeedTestNow}`,
    `- Ready for audience launch now: ${packet.readiness.readyForAudienceLaunchNow}`,
    '',
    'Blockers before asking for seed-send approval:',
    renderList(packet.readiness.blockersBeforeSeedSendApprovalRequest),
    '',
    'Blockers before any seed send:',
    renderList(packet.readiness.blockersBeforeAnySeedSend),
    '',
    'Blockers before receipt seed test:',
    renderList(packet.readiness.blockersBeforeReceiptSeedTest),
    '',
    '## Seed-Test Modes',
    '',
  ];

  for (const mode of packet.seedTestModes) {
    lines.push(`### ${mode.id}`);
    lines.push(`- Purpose: ${mode.purpose}`);
    lines.push(`- Current readiness: ${mode.currentReadiness}`);
    lines.push('- Allowed only after approval:');
    for (const item of mode.allowedOnlyAfterApproval) lines.push(`  - ${item}`);
    lines.push('- Does not test:');
    for (const item of mode.doesNotTest) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## QA Checklist', '');
  for (const [section, items] of Object.entries(packet.qaChecklist)) {
    lines.push(`### ${section}`);
    for (const item of items) lines.push(`- ${item}`);
    lines.push('');
  }

  lines.push('## Approval Matrix', '');
  for (const gate of packet.approvalMatrix) {
    lines.push(`### ${gate.id}`);
    lines.push(`- Owner: ${gate.owner}`);
    lines.push(`- Current status: ${gate.currentStatus}`);
    lines.push(`- Required before: ${gate.requiredBefore}`);
    lines.push(`- Live mutation if approved: ${Boolean(gate.liveMutationIfApproved)}`);
    lines.push(`- Local mutation if approved: ${Boolean(gate.localMutationIfApproved)}`);
    lines.push(`- Approval needed from Alejandro: ${gate.approvalNeededFromAlejandro}`);
    lines.push('');
  }

  lines.push('## Seed Send Approval Boundary', '');
  lines.push(`- Can ask Alejandro now: ${packet.seedSendApprovalBoundary.canAskAlejandroForApproval}`);
  lines.push(`- Packet is approval by itself: ${packet.seedSendApprovalBoundary.packetIsApprovalByItself}`);
  lines.push('- Required before approval request:');
  for (const item of packet.seedSendApprovalBoundary.requiredBeforeApprovalRequest) lines.push(`- ${item}`);
  lines.push('- Still closed even after a seed approval:');
  for (const item of packet.seedSendApprovalBoundary.stillClosedEvenAfterApproval) lines.push(`- ${item}`);

  lines.push('## Next Recommended Move', '');
  lines.push(`- ${packet.nextActionRecommendation.id}: ${packet.nextActionRecommendation.nextNoLiveMove}`);
  lines.push(`- Reason: ${packet.nextActionRecommendation.reason}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

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
  const [
    rehearsalPacket,
    eventContract,
    emailStyleQa,
    emailRenderQa,
    manualUiBuildReceipt,
    emptyGroupCreateDryRun,
    approvalQueue,
    realMailerLiteRenderQa,
    sourceDigests,
  ] = await Promise.all([
    readJson(options.rehearsalPacket),
    readJson(options.eventContract),
    readOptionalJson(options.emailStyleQa),
    readOptionalJson(options.emailRenderQa),
    readOptionalJson(options.manualUiBuildReceipt),
    readOptionalJson(options.emptyGroupCreateDryRun),
    readOptionalJson(options.approvalQueue),
    readOptionalJson(options.realMailerLiteRenderQa),
    loadSourceDigests(options),
  ]);

  return buildSeedTestQaPacket({
    rehearsalPacket,
    eventContract,
    emailStyleQa,
    emailRenderQa,
    manualUiBuildReceipt,
    emptyGroupCreateDryRun,
    approvalQueue,
    realMailerLiteRenderQa,
    sourceDigests,
    testEmail: options.testEmail,
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
    launchId: packet.launch.launchId,
    readyForLocalAssetDrafting: packet.readiness.readyForLocalAssetDrafting,
    manualUiDraftsBuilt: packet.readiness.manualUiDraftsBuilt,
    localRenderReady: packet.readiness.localRenderReady,
    realMailerLiteRenderQaReady: packet.readiness.realMailerLiteRenderQaReady,
    canAskSeedSendApprovalNow: packet.readiness.canAskSeedSendApprovalNow,
    readyForAssetOnlySeedSendNow: packet.readiness.readyForAssetOnlySeedSendNow,
    readyForReceiptSeedTestNow: packet.readiness.readyForReceiptSeedTestNow,
    readyForAudienceLaunchNow: packet.readiness.readyForAudienceLaunchNow,
    seedEmailSupplied: packet.seedIdentity.supplied,
    blockersBeforeSeedSendApprovalRequest: packet.readiness.machineBlockersBeforeSeedSendApprovalRequest,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed-test QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalMatrix,
  buildQaChecklist,
  buildSeedTestModes,
  buildSeedTestQaPacket,
  launchFrom,
  parseArgs,
  renderMarkdown,
};
