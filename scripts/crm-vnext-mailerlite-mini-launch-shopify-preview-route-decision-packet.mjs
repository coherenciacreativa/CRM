#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet-2026-05-31';
const DEFAULT_PUBLIC_URL_GATE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_ASSET_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-decision-packet.mjs [options]

Options:
  --shopify-public-url-gate <path>       Current Shopify public URL gate JSON. Defaults to ${DEFAULT_PUBLIC_URL_GATE}
  --asset-manifest <path>                Current mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --shopify-local-build-receipt <path>   Local Shopify build receipt JSON. Defaults to ${DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --out <path>                           Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                  Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                 Show this help

Local-only decision packet for the Inteligencia para descansar Shopify preview
route. It explains the unlisted/noindex preview-route boundary before any exact
approval phrase, Shopify publish/preview action, MailerLite edit/send, CRM live
write, subscriber/group/workflow mutation, ledger/card/scoring write or Fact
Store write. It writes reports only.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    shopifyPublicUrlGate: DEFAULT_PUBLIC_URL_GATE,
    assetManifest: DEFAULT_ASSET_MANIFEST,
    shopifyLocalBuildReceipt: DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--shopify-public-url-gate') options.shopifyPublicUrlGate = argv[++index];
    else if (arg === '--asset-manifest') options.assetManifest = argv[++index];
    else if (arg === '--shopify-local-build-receipt') options.shopifyLocalBuildReceipt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  shopifyApiCalled: false,
  shopifyPublishPerformed: false,
  shopifyLiveThemeTouched: false,
  shopifyRepoFilesWritten: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  publicCampaignPublished: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  exactApprovalPhrasePrinted: false,
  tokensPrinted: false,
});

const buildSlotScope = ({ assetManifest, publicUrlGate }) => {
  const manifestSlots = assetManifest?.finalPublicLinks?.slots ?? [];
  const gateSlots = publicUrlGate?.publicUrlPlan?.slots ?? [];
  return manifestSlots.map((slot) => {
    const gateSlot = gateSlots.find((candidate) => candidate?.key === slot?.key) ?? {};
    return {
      key: slot.key,
      label: slot.label,
      pathCandidate: slot.pathCandidate,
      localEvidenceReady: slot.localEvidenceReady === true,
      publicUrlReady: slot.publicUrlReady === true || gateSlot.publicUrlReady === true,
      currentStage: cleanString(slot.linkLifecycle?.currentStage ?? gateSlot.linkLifecycle?.currentStage),
      nextStageAfterApprovedPreviewRoute: 'preview_url_ready',
      audienceSendReadyAfterApprovedPreviewRoute: false,
      exactUrlStoredInReport: false,
    };
  });
};

const localBuildFiles = (shopifyLocalBuildReceipt) =>
  (shopifyLocalBuildReceipt?.files ?? []).map((file) => ({
    path: file.path,
    status: file.status,
    purpose: file.purpose,
    sha256: file.sha256,
  }));

const buildPreviewRouteDecisionPacket = ({
  shopifyPublicUrlGate,
  assetManifest,
  shopifyLocalBuildReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const recommendedTier = cleanString(shopifyPublicUrlGate?.executiveSummary?.recommendedVisibilityTier);
  const slotScope = buildSlotScope({ assetManifest, publicUrlGate: shopifyPublicUrlGate });
  const localAssetSlotsReady = slotScope.length === 3 && slotScope.every((slot) => slot.localEvidenceReady);
  const publicUrlGateReady =
    shopifyPublicUrlGate?.ok === true
    && shopifyPublicUrlGate?.status === 'shopify_public_url_gate_waiting_decision_no_live_changes';
  const readyForExplanation = publicUrlGateReady && localAssetSlotsReady && recommendedTier === 'unlisted_noindex_preview';
  const blockers = [
    ...(publicUrlGateReady ? [] : ['shopify_public_url_gate_not_ready']),
    ...(localAssetSlotsReady ? [] : ['local_asset_slots_not_ready']),
    ...(recommendedTier === 'unlisted_noindex_preview' ? [] : [`unexpected_visibility_tier:${recommendedTier ?? 'missing'}`]),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_shopify_preview_route_decision_packet',
    generatedAt,
    ok: readyForExplanation,
    status: readyForExplanation
      ? 'shopify_preview_route_decision_ready_for_human_explanation_no_live_changes'
      : 'shopify_preview_route_decision_blocked_no_live_changes',
    launch: assetManifest?.launch ?? shopifyPublicUrlGate?.launch ?? null,
    executiveSummary: {
      recommendedDecision: 'use_unlisted_noindex_preview_route_for_test_launch_links',
      recommendedVisibilityTier: recommendedTier,
      localAssetSlotReadyCount: slotScope.filter((slot) => slot.localEvidenceReady).length,
      requiredPublicUrlCount: slotScope.length,
      finalPublicLinksReady: shopifyPublicUrlGate?.executiveSummary?.finalPublicLinksReady === true,
      publicAudienceSendUrlGateReady: false,
      decisionExplanationReady: readyForExplanation,
      decisionExplanationRequiredBeforeApprovalPhrase: true,
      exactApprovalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      canAskApprovalNow: false,
      canPublishNow: false,
      readyForPreviewRouteApprovalPhraseGenerationAfterHumanConfirmsDecision: readyForExplanation,
      nextSafeAction: readyForExplanation
        ? 'explain_preview_route_decision_to_alejandro_before_generating_exact_approval_phrase'
        : 'repair_local_public_url_gate_or_asset_manifest_before_decision_explanation',
    },
    decisionExplanation: {
      plainLanguage:
        'Use an exact-link preview route that real email clients can open, without adding it to site navigation, SEO, forms, CRM live writes or MailerLite automations. It is a QA bridge, not an audience launch.',
      whyThisHelpsFrequentLaunches: [
        'It lets Web/Shopify create the reusable public-link layer without asking Alejandro to invent URLs by memory.',
        'It gives MailerLite correction QA clickable links while keeping public/audience sends closed.',
        'It keeps preview and live in the same link slots, so later promotion or replacement is auditable.',
      ],
      tradeoffs: [
        'The route becomes internet-accessible to anyone with the exact URL.',
        'It should not appear in navigation or search, but noindex/unlisted is not secrecy.',
        'A later audience send still requires fresh QA and a separate approval gate.',
      ],
    },
    proposedScopeIfLaterApproved: {
      allowedActions: [
        'create_or_update_shopify_preview_route_for_existing_local_inteligencia_para_descansar_assets',
        'make_result_practice_and_editorial_note_links_clickable_by_exact_url_for_QA',
        'record_redacted_url_hashes_and_visibility_receipt_in_local_reports',
      ],
      forbiddenActions: [
        'do_not_add_to_site_navigation',
        'do_not_enable_seo_indexing',
        'do_not_connect_real_forms_or_crm_live_writes',
        'do_not_connect_mailerlite_groups_tags_workflows_or_subscribers',
        'do_not_send_or_schedule_any_mailerlite_email',
        'do_not_publish_or_promote_as_audience_launch',
      ],
      requiredReceiptFields: [
        'visibility_tier=unlisted_noindex_preview',
        'not_linked_from_site_navigation=true',
        'seo_indexing_allowed=false',
        'fresh_real_browser_qa=green',
        'forms_and_crm_live_connections=false',
        'exact_public_urls_not_printed_in_shared_reports',
      ],
    },
    linkLifecycle: {
      policy: assetManifest?.finalPublicLinks?.lifecyclePolicy ?? shopifyPublicUrlGate?.linkLifecycleGuard?.policy ?? null,
      noSeparateUrlSetsRequired: true,
      slotStateSource: 'same_final_public_link_slots',
      previewRouteWouldSetStage: 'preview_url_ready',
      audienceSendAllowedStages: ['live_url_ready', 'preview_promoted_to_live'],
      rule: 'Preview route URLs can support QA; audience send remains blocked until each slot is live_url_ready or preview_promoted_to_live.',
    },
    slotScope,
    localBuildFiles: localBuildFiles(shopifyLocalBuildReceipt),
    approvalPhrasePolicy: {
      exactApprovalPhraseAvailableNow: false,
      exactApprovalPhrasePrinted: false,
      reason: 'Alejandro must first receive and understand the preview-route decision; only then should a separate exact approval phrase be generated.',
      canGenerateExactPhraseAfterHumanConfirmsDecision: readyForExplanation,
    },
    blockers,
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (packet) => [
  '# Shopify Preview Route Decision Packet - Inteligencia para descansar',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  '',
  '## Summary',
  '',
  `- Recommended decision: ${packet.executiveSummary.recommendedDecision}`,
  `- Recommended visibility tier: ${packet.executiveSummary.recommendedVisibilityTier}`,
  `- Decision explanation ready: ${packet.executiveSummary.decisionExplanationReady}`,
  `- Exact approval phrase available: ${packet.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Exact approval phrase printed: ${packet.executiveSummary.exactApprovalPhrasePrinted}`,
  `- Can ask approval now: ${packet.executiveSummary.canAskApprovalNow}`,
  `- Can publish now: ${packet.executiveSummary.canPublishNow}`,
  `- Public audience-send URL gate ready: ${packet.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Next safe action: ${packet.executiveSummary.nextSafeAction}`,
  '',
  '## Decision Explanation',
  '',
  packet.decisionExplanation.plainLanguage,
  '',
  'Why this helps frequent launches:',
  renderList(packet.decisionExplanation.whyThisHelpsFrequentLaunches),
  '',
  'Tradeoffs:',
  renderList(packet.decisionExplanation.tradeoffs),
  '',
  '## Proposed Scope If Later Approved',
  '',
  'Allowed actions:',
  renderList(packet.proposedScopeIfLaterApproved.allowedActions),
  '',
  'Forbidden actions:',
  renderList(packet.proposedScopeIfLaterApproved.forbiddenActions),
  '',
  'Required receipt fields:',
  renderList(packet.proposedScopeIfLaterApproved.requiredReceiptFields),
  '',
  '## Link Slots',
  '',
  renderList(packet.slotScope.map((slot) =>
    `${slot.key}: currentStage=${slot.currentStage}, nextStageAfterApprovedPreviewRoute=${slot.nextStageAfterApprovedPreviewRoute}, audienceSendReadyAfterApprovedPreviewRoute=${slot.audienceSendReadyAfterApprovedPreviewRoute}, candidate=${slot.pathCandidate}`)),
  '',
  '## Approval Phrase Policy',
  '',
  `- Exact approval phrase available now: ${packet.approvalPhrasePolicy.exactApprovalPhraseAvailableNow}`,
  `- Exact approval phrase printed: ${packet.approvalPhrasePolicy.exactApprovalPhrasePrinted}`,
  `- Can generate after human confirms decision: ${packet.approvalPhrasePolicy.canGenerateExactPhraseAfterHumanConfirmsDecision}`,
  `- Reason: ${packet.approvalPhrasePolicy.reason}`,
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Safety',
  '',
  '- Local-only report.',
  '- No UI/browser opened.',
  '- No Shopify API call, publish, live theme touch or repo write.',
  '- No MailerLite API/UI mutation, subscribers, groups, workflows or sends.',
  '- No CRM live API, Signal Ledger, cards, scoring or Fact Store writes.',
  '- No exact approval phrase printed.',
  '',
  '## Source Digests',
  '',
  renderList(packet.sourceDigests.map((source) => `${source.path} (${source.consultedFor})`)),
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
    publicUrlGateRead,
    assetManifestRead,
    shopifyLocalBuildReceiptRead,
  ] = await Promise.all([
    readJsonWithDigest(options.shopifyPublicUrlGate, 'Shopify public URL gate and unlisted/noindex boundary'),
    readJsonWithDigest(options.assetManifest, 'mini-launch asset slots and link lifecycle policy'),
    readJsonWithDigest(options.shopifyLocalBuildReceipt, 'local Shopify files already created without live changes'),
  ]);

  return buildPreviewRouteDecisionPacket({
    shopifyPublicUrlGate: publicUrlGateRead.value,
    assetManifest: assetManifestRead.value,
    shopifyLocalBuildReceipt: shopifyLocalBuildReceiptRead.value,
    sourceDigests: [
      publicUrlGateRead.digest,
      assetManifestRead.digest,
      shopifyLocalBuildReceiptRead.digest,
    ],
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
    recommendedVisibilityTier: packet.executiveSummary.recommendedVisibilityTier,
    decisionExplanationReady: packet.executiveSummary.decisionExplanationReady,
    exactApprovalPhraseAvailable: packet.executiveSummary.exactApprovalPhraseAvailable,
    exactApprovalPhrasePrinted: packet.executiveSummary.exactApprovalPhrasePrinted,
    canAskApprovalNow: packet.executiveSummary.canAskApprovalNow,
    canPublishNow: packet.executiveSummary.canPublishNow,
    publicAudienceSendUrlGateReady: packet.executiveSummary.publicAudienceSendUrlGateReady,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch Shopify preview route decision packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPreviewRouteDecisionPacket,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
