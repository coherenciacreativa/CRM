#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-shopify-public-url-gate-2026-05-31';
const DEFAULT_ASSET_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_public_url_gate_current_inteligencia_descansar_2026-05-31.md';

const REQUIRED_LINK_KEYS = ['result_or_resource_link', 'practice_link', 'editorial_note_link'];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-shopify-public-url-gate.mjs [options]

Options:
  --asset-manifest <path>                 Local mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --shopify-local-build-receipt <path>    Local Shopify build receipt JSON. Defaults to ${DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --out <path>                            Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                   Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                  Show this help

Local-only public URL gate for Inteligencia para descansar. It reads local
reports, explains the Shopify/Web public URL boundary, and keeps the exact
approval phrase unavailable until that decision is explained. It does not open
UI, publish Shopify, call MailerLite/Shopify/CRM APIs, read or mutate
subscribers, create groups, edit workflows, send emails, append ledgers, write
cards/scoring, write Fact Store, or print tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    shopifyLocalBuildReceipt: DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
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
      private: false,
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
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const shopifyLocalBuildReady = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes';

const assetManifestReady = (manifest) =>
  manifest?.ok === true
  && manifest?.mode === 'local_only_mailerlite_mini_launch_asset_manifest'
  && Array.isArray(manifest?.finalPublicLinks?.slots);

const normalizeSlot = (slot) => {
  const key = cleanString(slot?.key);
  const pathCandidate = cleanString(slot?.pathCandidate);
  return {
    key,
    label: cleanString(slot?.label),
    status: slot?.publicUrlReady === true
      ? 'public_url_ready_redacted_no_live_changes'
      : slot?.localEvidenceReady === true
        ? 'local_asset_ready_public_url_missing_no_live_changes'
        : 'local_asset_or_public_url_missing_no_live_changes',
    localEvidenceReady: slot?.localEvidenceReady === true,
    publicUrlReady: slot?.publicUrlReady === true,
    pathCandidate,
    anchorCandidate: Boolean(pathCandidate?.includes('#')),
    publicUrlSha256: cleanString(slot?.publicUrlSha256),
    exactPublicUrlStoredInReport: slot?.exactPublicUrlStoredInReport === true,
    owner: cleanString(slot?.owner) ?? 'web_design_or_shopify_publish_receipt',
    nextOwner: cleanString(slot?.nextOwner) ?? 'web_design_or_shopify_publish_receipt',
    blockers: Array.isArray(slot?.blockers) ? slot.blockers.map(cleanString).filter(Boolean) : [],
  };
};

const buildShopifyPublicUrlGate = ({
  assetManifest,
  shopifyLocalBuildReceipt,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const manifestReady = assetManifestReady(assetManifest);
  const receiptReady = shopifyLocalBuildReady(shopifyLocalBuildReceipt);
  const slots = REQUIRED_LINK_KEYS.map((key) => {
    const found = assetManifest?.finalPublicLinks?.slots?.find((slot) => slot?.key === key);
    return normalizeSlot(found ?? { key });
  });
  const localAssetSlotReadyCount = slots.filter((slot) => slot.localEvidenceReady).length;
  const publicUrlReadyCount = slots.filter((slot) => slot.publicUrlReady).length;
  const publicUrlsReady = publicUrlReadyCount === REQUIRED_LINK_KEYS.length;
  const localAssetsReady = localAssetSlotReadyCount === REQUIRED_LINK_KEYS.length;
  const blockers = [
    ...(manifestReady ? [] : ['asset_manifest_missing_or_invalid']),
    ...(receiptReady ? [] : ['shopify_local_build_receipt_not_ready']),
    ...(localAssetsReady ? [] : ['local_asset_slots_not_ready']),
    ...(publicUrlsReady ? [] : [
      'public_shopify_url_missing',
      'shopify_public_url_decision_not_explained',
      'fresh_public_route_qa_missing',
    ]),
    ...slots.flatMap((slot) => slot.blockers),
  ].filter(Boolean);
  const uniqueBlockers = [...new Set(blockers)];
  const status = publicUrlsReady
    ? 'shopify_public_url_gate_reference_only_public_urls_ready_no_live_changes'
    : localAssetsReady && receiptReady && manifestReady
      ? 'shopify_public_url_gate_waiting_decision_no_live_changes'
      : 'shopify_public_url_gate_blocked_missing_local_evidence_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_shopify_public_url_gate',
    generatedAt,
    ok: true,
    status,
    launch: assetManifest?.launch ?? shopifyLocalBuildReceipt?.launch ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    },
    executiveSummary: {
      finalPublicLinksReady: publicUrlsReady,
      localAssetSlotReadyCount,
      publicUrlReadyCount,
      requiredPublicUrlCount: REQUIRED_LINK_KEYS.length,
      requiresAlejandroManualLinks: false,
      decisionExplanationRequiredBeforeApprovalPhrase: !publicUrlsReady,
      approvalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      readyForShopifyPublishApprovalPhrase: false,
      readyForMiniLaunchCorrectionPreview: publicUrlsReady,
      canPublishNow: false,
      nextSafeAction: publicUrlsReady
        ? 'rerun_missing_inputs_intake_and_seed_inbox_correction_preview_without_ui_or_send'
        : 'explain_shopify_public_url_decision_before_any_approval_phrase',
    },
    publicUrlPlan: {
      source: 'asset_manifest_local_slots',
      exactUrlsStoredInReport: false,
      proposedPublicRouteType: 'shopify_public_page_or_equivalent_public_preview_route',
      requiresShopifyPublishOrPublicRoute: !publicUrlsReady,
      requiresFreshPublicQa: !publicUrlsReady,
      slots,
      notes: [
        'The local Shopify build supplies the three required asset slots, but local path candidates are not final public URLs.',
        'The practice and editorial-note links are anchor candidates; they need public page QA before any public/audience send.',
        'Alejandro should not manually invent routine links when Web/Shopify can produce a receipt.',
      ],
    },
    decisionBoundary: {
      id: 'shopify_public_url_or_publish_route',
      decisionRequired: !publicUrlsReady,
      explanationRequiredBeforeApprovalPhrase: !publicUrlsReady,
      approvalPhraseAvailable: false,
      exactApprovalPhrasePrinted: false,
      canAskApprovalNow: false,
      canPublishNow: false,
      packetIsApprovalByItself: false,
      currentHumanBoundary: !publicUrlsReady
        ? 'Codex must explain the Shopify public URL decision before requesting or using any exact approval phrase.'
        : 'No public URL approval phrase is needed from this gate because public URLs are already represented as ready evidence.',
      whyThisMatters: 'Final email links must resolve publicly before corrected MailerLite drafts or audience sends can be trusted; creating those URLs can expose Shopify pages and is therefore a public/live boundary.',
    },
    stillClosedGates: [
      'shopify_publish',
      'shopify_live_theme_or_public_page_mutation',
      'shopify_api_call',
      'mailerlite_ui_edit',
      'mailerlite_test_send',
      'mailerlite_public_or_audience_send',
      'mailerlite_workflow_subscriber_or_group_mutation',
      'crm_live_write',
      'signal_ledger_append',
      'crm_card_or_scoring_write',
      'fact_store_write',
    ],
    sourceDigests,
    safety,
    blockers: uniqueBlockers,
    hardStops: [
      'This gate is not approval to publish Shopify, open UI, edit MailerLite drafts, send tests or send to an audience.',
      'Do not print or request an exact approval phrase until the public URL decision has been explained.',
      'Do not treat local Shopify path candidates as final public URLs.',
      'Do not touch subscribers, groups, workflows, CRM, Signal Ledger, cards, scoring or Fact Store from this gate.',
    ],
  };
};

const buildGateFromFiles = async (options) => {
  const [assetManifestEntry, shopifyLocalBuildReceiptEntry] = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'current mini-launch asset manifest and link-slot readiness'),
    readJsonWithDigest(options.shopifyLocalBuildReceipt, 'local Shopify build receipt and launch identity'),
  ]);

  return buildShopifyPublicUrlGate({
    assetManifest: assetManifestEntry.value,
    shopifyLocalBuildReceipt: shopifyLocalBuildReceiptEntry.value,
    sourceDigests: [
      assetManifestEntry.digest,
      shopifyLocalBuildReceiptEntry.digest,
    ],
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  `# Shopify Public URL Gate - ${report.launch?.resourceName ?? 'Inteligencia para descansar'}`,
  '',
  `Generated: ${report.generatedAt}`,
  `Status: \`${report.status}\``,
  '',
  '## Summary',
  '',
  `- Final public links ready: ${report.executiveSummary.finalPublicLinksReady}`,
  `- Local asset slots ready: ${report.executiveSummary.localAssetSlotReadyCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Public URLs ready: ${report.executiveSummary.publicUrlReadyCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Requires Alejandro manual links: ${report.executiveSummary.requiresAlejandroManualLinks}`,
  `- Decision explanation required before approval phrase: ${report.executiveSummary.decisionExplanationRequiredBeforeApprovalPhrase}`,
  `- Approval phrase available: ${report.executiveSummary.approvalPhraseAvailable}`,
  `- Can publish now: ${report.executiveSummary.canPublishNow}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Link Slots',
  '',
  renderList(report.publicUrlPlan.slots.map((slot) =>
    `${slot.key}: ${slot.status}, candidate=${slot.pathCandidate}, anchorCandidate=${slot.anchorCandidate}, publicUrlReady=${slot.publicUrlReady}`)),
  '',
  '## Decision Boundary',
  '',
  `- Boundary: ${report.decisionBoundary.id}`,
  `- Decision required: ${report.decisionBoundary.decisionRequired}`,
  `- Explanation required before approval phrase: ${report.decisionBoundary.explanationRequiredBeforeApprovalPhrase}`,
  `- Exact approval phrase printed: ${report.decisionBoundary.exactApprovalPhrasePrinted}`,
  `- Can ask approval now: ${report.decisionBoundary.canAskApprovalNow}`,
  `- Why: ${report.decisionBoundary.whyThisMatters}`,
  '',
  '## Still Closed Gates',
  '',
  renderList(report.stillClosedGates),
  '',
  '## Blockers',
  '',
  renderList(report.blockers),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Shopify API called: ${report.safety.shopifyApiCalled}`,
  `- Shopify publish performed: ${report.safety.shopifyPublishPerformed}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildGateFromFiles(options);
  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    finalPublicLinksReady: report.executiveSummary.finalPublicLinksReady,
    localAssetSlotReadyCount: report.executiveSummary.localAssetSlotReadyCount,
    publicUrlReadyCount: report.executiveSummary.publicUrlReadyCount,
    approvalPhraseAvailable: report.executiveSummary.approvalPhraseAvailable,
    decisionExplanationRequiredBeforeApprovalPhrase: report.executiveSummary.decisionExplanationRequiredBeforeApprovalPhrase,
    canPublishNow: report.executiveSummary.canPublishNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch Shopify public URL gate failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSafety,
  buildShopifyPublicUrlGate,
  parseArgs,
  renderMarkdown,
};
