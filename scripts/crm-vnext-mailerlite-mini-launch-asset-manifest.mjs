#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-asset-manifest-2026-05-31';
const DEFAULT_SHOPIFY_REPO = '/Users/alejandrogomez/Projects/coherenciacreativa-shopifywebsite';
const DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_local_build_receipt_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_execution_receipt_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.md';

const FINAL_PUBLIC_LINK_KEYS = ['result_or_resource_link', 'practice_link', 'editorial_note_link'];
const LINK_LIFECYCLE_POLICY = {
  id: 'single_slot_preview_to_live_lifecycle',
  singleSlotLifecycle: true,
  noSeparateUrlSetsRequired: true,
  stages: ['local_candidate', 'preview_url_ready', 'live_url_ready', 'preview_promoted_to_live'],
  previewQaAllowedStages: ['preview_url_ready', 'live_url_ready', 'preview_promoted_to_live'],
  audienceSendAllowedStages: ['live_url_ready', 'preview_promoted_to_live'],
  defaultNextStage: 'preview_url_ready',
  rationale: 'Each link slot matures from local candidate to preview URL and then either live URL or preview-promoted-to-live; this avoids creating two independent URL sets.',
};

const LOCAL_SLOT_SPECS = {
  result_or_resource_link: {
    label: 'Result/resource page',
    localSourcePath: 'sections/result-inteligencia-para-descansar.liquid',
    templatePath: 'templates/page.result-inteligencia-para-descansar.json',
    pathCandidate: '/pages/result-inteligencia-para-descansar',
    requiredPlaceholder: 'result_or_resource_link_placeholder',
    owner: 'web_design_or_shopify_publish_receipt',
  },
  practice_link: {
    label: 'Practice section',
    localSourcePath: 'sections/result-inteligencia-para-descansar.liquid',
    templatePath: 'templates/page.result-inteligencia-para-descansar.json',
    pathCandidate: '/pages/result-inteligencia-para-descansar#practice',
    requiredPlaceholder: 'practice_link_placeholder',
    owner: 'web_design_or_shopify_publish_receipt',
  },
  editorial_note_link: {
    label: 'Editorial note section',
    localSourcePath: 'sections/result-inteligencia-para-descansar.liquid',
    templatePath: 'templates/page.result-inteligencia-para-descansar.json',
    pathCandidate: '/pages/result-inteligencia-para-descansar#editorial-note',
    requiredPlaceholder: 'editorial_note_link_placeholder',
    owner: 'web_design_or_shopify_publish_receipt',
  },
};

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-asset-manifest.mjs [options]

Options:
  --shopify-repo <path>                 Local Shopify repo. Defaults to ${DEFAULT_SHOPIFY_REPO}
  --shopify-local-build-receipt <path>  Local Shopify build receipt JSON. Defaults to ${DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT}
  --shopify-preview-route-execution-receipt <path> Shopify preview route execution receipt JSON. Defaults to ${DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT}
  --out <path>                          Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                 Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                Show this help

Local-only asset manifest for Inteligencia para descansar. It reads local
Shopify files and local receipts, maps inert link placeholders to system-owned
asset slots, and records the default subscription/footer policy. It does not
publish Shopify, open UI, call MailerLite/Shopify/CRM APIs, read or mutate
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
    shopifyRepo: DEFAULT_SHOPIFY_REPO,
    shopifyLocalBuildReceipt: DEFAULT_SHOPIFY_LOCAL_BUILD_RECEIPT,
    shopifyPreviewRouteExecutionReceipt: DEFAULT_SHOPIFY_PREVIEW_ROUTE_EXECUTION_RECEIPT,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--shopify-repo') options.shopifyRepo = argv[++index];
    else if (arg === '--shopify-local-build-receipt') options.shopifyLocalBuildReceipt = argv[++index];
    else if (arg === '--shopify-preview-route-execution-receipt') options.shopifyPreviewRouteExecutionReceipt = argv[++index];
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

const readLocalFileEvidence = async ({ shopifyRepo, relativePath, consultedFor }) => {
  const resolved = resolve(shopifyRepo, relativePath);
  try {
    const raw = await readFile(resolved, 'utf8');
    return {
      relativePath,
      path: resolved,
      present: true,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
      content: raw,
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        relativePath,
        path: resolved,
        present: false,
        chars: 0,
        sha256: null,
        consultedFor,
        content: null,
      };
    }
    throw error;
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  shopifyRepoReadOnlyInspection: true,
  shopifyApiCalled: false,
  shopifyPublishPerformed: false,
  shopifyRepoEdited: false,
  uiOpened: false,
  browserOpened: false,
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

const localBuildReceiptReady = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'shopify_local_build_receipt_executed_files_created_no_live_changes';

const previewRouteExecutionReady = (receipt) =>
  receipt?.ok === true
  && receipt?.status === 'shopify_preview_route_execution_completed_unlisted_noindex_no_live_mailerlite_crm'
  && receipt?.executionSummary?.previewRouteReady === true
  && receipt?.executionSummary?.publicAudienceSendUrlGateReady === false
  && receipt?.safety?.scopedLiveShopifyMutationApproved === true
  && receipt?.safety?.shopifyApiCalled === true
  && receipt?.safety?.shopifyMutationsPerformed === true
  && receipt?.safety?.siteNavigationUpdated === false
  && receipt?.safety?.seoIndexingAllowed === false
  && receipt?.safety?.realFormsCreated === false
  && receipt?.safety?.mailerLiteApiCalled === false
  && receipt?.safety?.mailerLiteMutationsPerformed === false
  && receipt?.safety?.crmLiveApiCalled === false
  && receipt?.safety?.sendsPerformed === false;

const previewExecutionLinkByKey = (receipt) => new Map(
  Array.isArray(receipt?.targetLinks)
    ? receipt.targetLinks
      .filter((link) => FINAL_PUBLIC_LINK_KEYS.includes(link?.key))
      .map((link) => [link.key, link])
    : [],
);

const buildLinkLifecycle = ({ localEvidenceReady, publicUrlReady = false, previewUrlReady = false }) => {
  const currentStage = publicUrlReady
    ? previewUrlReady
      ? 'preview_url_ready'
      : 'live_url_ready'
    : localEvidenceReady
      ? 'local_candidate'
      : 'missing_local_asset';
  return {
    policyId: LINK_LIFECYCLE_POLICY.id,
    currentStage,
    singleSlotLifecycle: true,
    previewUrlReady,
    liveUrlReady: publicUrlReady && !previewUrlReady,
    previewPromotedToLive: false,
    publicAudienceSendReady: LINK_LIFECYCLE_POLICY.audienceSendAllowedStages.includes(currentStage),
    nextExpectedStage: publicUrlReady ? 'preview_promoted_to_live_or_public_send_gate' : 'preview_url_ready',
    noSeparateUrlSetRequired: true,
  };
};

const buildSlot = ({ key, receiptReady, filesByRelativePath, previewExecutionReady, previewLinksByKey }) => {
  const spec = LOCAL_SLOT_SPECS[key];
  const source = filesByRelativePath.get(spec.localSourcePath);
  const template = filesByRelativePath.get(spec.templatePath);
  const placeholderPresent = Boolean(source?.content?.includes(spec.requiredPlaceholder));
  const placeholderEvidenceSatisfied = placeholderPresent || previewExecutionReady;
  const localEvidenceReady =
    receiptReady
    && source?.present === true
    && template?.present === true
    && placeholderEvidenceSatisfied;
  const previewLink = previewLinksByKey.get(key) ?? null;
  const previewUrlReady = previewExecutionReady
    && previewLink?.stageAfter === 'preview_url_ready'
    && previewLink?.audienceSendReady === false
    && cleanString(previewLink?.urlSha256);
  const publicUrlReady = Boolean(previewUrlReady);
  const blockers = [
    ...(receiptReady ? [] : ['shopify_local_build_receipt_not_ready']),
    ...(source?.present ? [] : [`local_source_missing:${spec.localSourcePath}`]),
    ...(template?.present ? [] : [`template_missing:${spec.templatePath}`]),
    ...(placeholderEvidenceSatisfied ? [] : [`placeholder_missing:${spec.requiredPlaceholder}`]),
    ...(publicUrlReady ? ['preview_url_not_live_or_promoted_for_audience_send'] : ['public_shopify_url_missing']),
  ];

  return {
    key,
    label: spec.label,
    owner: spec.owner,
    status: publicUrlReady
      ? 'preview_url_ready_redacted_no_live_mailerlite_crm'
      : localEvidenceReady
      ? 'local_asset_slot_ready_waiting_for_public_url_no_live_changes'
      : 'local_asset_slot_blocked_missing_local_evidence_no_live_changes',
    localEvidenceReady,
    publicUrlReady,
    previewUrlReady,
    liveUrlReady: false,
    previewPromotedToLive: false,
    pathCandidate: spec.pathCandidate,
    publicUrlSha256: cleanString(previewLink?.urlSha256),
    exactPublicUrlStoredInReport: false,
    previewRouteSource: previewUrlReady ? 'shopify_preview_route_execution_receipt' : null,
    linkLifecycle: buildLinkLifecycle({ localEvidenceReady, publicUrlReady, previewUrlReady }),
    requiredPlaceholder: spec.requiredPlaceholder,
    placeholderPresent,
    source: {
      localSourcePath: spec.localSourcePath,
      templatePath: spec.templatePath,
      sourceSha256: source?.sha256 ?? null,
      templateSha256: template?.sha256 ?? null,
    },
    humanInputRequired: false,
    nextOwner: spec.owner,
    blockers,
  };
};

const buildAssetManifest = ({
  shopifyLocalBuildReceipt,
  shopifyPreviewRouteExecutionReceipt,
  fileEvidence,
  sourceDigests = [],
  shopifyRepo = DEFAULT_SHOPIFY_REPO,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const receiptReady = localBuildReceiptReady(shopifyLocalBuildReceipt);
  const previewExecutionReady = previewRouteExecutionReady(shopifyPreviewRouteExecutionReceipt);
  const previewLinksByKey = previewExecutionLinkByKey(shopifyPreviewRouteExecutionReceipt);
  const filesByRelativePath = new Map(fileEvidence.map((file) => [file.relativePath, file]));
  const slots = FINAL_PUBLIC_LINK_KEYS.map((key) =>
    buildSlot({ key, receiptReady, filesByRelativePath, previewExecutionReady, previewLinksByKey }));
  const localAssetSlotReadyCount = slots.filter((slot) => slot.localEvidenceReady).length;
  const publicUrlReadyCount = slots.filter((slot) => slot.publicUrlReady).length;
  const previewUrlReadyCount = slots.filter((slot) => slot.linkLifecycle.previewUrlReady).length;
  const liveUrlReadyCount = slots.filter((slot) => slot.linkLifecycle.liveUrlReady).length;
  const previewPromotedToLiveCount = slots.filter((slot) => slot.linkLifecycle.previewPromotedToLive).length;
  const publicAudienceSendReadyCount = slots.filter((slot) => slot.linkLifecycle.publicAudienceSendReady).length;
  const blockers = [...new Set(slots.flatMap((slot) => slot.blockers))];
  const localAssetsReady = localAssetSlotReadyCount === FINAL_PUBLIC_LINK_KEYS.length;
  const readyForCorrectionInputs = publicUrlReadyCount === FINAL_PUBLIC_LINK_KEYS.length;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_asset_manifest',
    generatedAt,
    ok: true,
    status: readyForCorrectionInputs
      ? 'mini_launch_asset_manifest_ready_for_correction_inputs_no_live_changes'
      : localAssetsReady
        ? 'mini_launch_asset_manifest_waiting_for_web_public_urls_no_live_changes'
        : 'mini_launch_asset_manifest_blocked_missing_local_asset_evidence_no_live_changes',
    launch: shopifyLocalBuildReceipt?.launch ?? {
      launchId: 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: 'Inteligencia para descansar',
      resourceType: 'quiz',
    },
    executiveSummary: {
      shopifyRepo: resolve(shopifyRepo),
      shopifyLocalBuildReceiptStatus: shopifyLocalBuildReceipt?.status ?? null,
      shopifyPreviewRouteExecutionReceiptStatus: shopifyPreviewRouteExecutionReceipt?.status ?? null,
      shopifyPreviewRouteReady: previewExecutionReady,
      localAssetSlotReadyCount,
      publicUrlReadyCount,
      previewUrlReadyCount,
      liveUrlReadyCount,
      previewPromotedToLiveCount,
      publicAudienceSendReadyCount,
      requiredPublicUrlCount: FINAL_PUBLIC_LINK_KEYS.length,
      finalPublicLinksReady: readyForCorrectionInputs,
      publicAudienceSendUrlGateReady: publicAudienceSendReadyCount === FINAL_PUBLIC_LINK_KEYS.length,
      linkLifecyclePolicy: LINK_LIFECYCLE_POLICY.id,
      requiresAlejandroManualLinks: false,
      finalLinkOwner: 'web_design_or_shopify_publish_receipt',
      subscriptionReasonPolicyReady: true,
      subscriptionReasonPolicy: 'remove_custom_line_and_rely_on_platform_footer',
      readyForMiniLaunchCorrectionPreview: readyForCorrectionInputs,
      nextSafeAction: readyForCorrectionInputs
        ? 'rerun_missing_inputs_intake_and_seed_inbox_correction_preview_without_ui_or_send'
        : 'wait_for_web_or_shopify_publish_receipt_public_urls_without_asking_alejandro_for_routine_links',
    },
    finalPublicLinks: {
      id: 'final_public_links',
      status: readyForCorrectionInputs
        ? 'ready_redacted_no_live_changes'
        : 'system_pending_public_urls_no_live_changes',
      source: 'launch_asset_manifest',
      humanInputRequired: false,
      exactUrlsStoredInReport: false,
      urlSource: previewExecutionReady ? 'shopify_preview_route_execution_receipt_redacted_hashes' : 'local_path_candidates_only',
      requiredKeys: FINAL_PUBLIC_LINK_KEYS,
      slots,
      lifecyclePolicy: LINK_LIFECYCLE_POLICY,
      publicAudienceSendUrlGateReady: publicAudienceSendReadyCount === FINAL_PUBLIC_LINK_KEYS.length,
      audienceSendAllowedStages: LINK_LIFECYCLE_POLICY.audienceSendAllowedStages,
      blockers,
    },
    subscriptionReasonPolicy: {
      id: 'subscription_reason_policy',
      status: 'ready_no_live_changes',
      policy: 'remove_custom_line_and_rely_on_platform_footer',
      source: 'launch_asset_manifest_default',
      humanInputRequired: false,
      rationale: 'Use the existing MailerLite platform footer/unsubscribe/address pattern and remove the extra custom subscription-reason line from these mini-launch email bodies.',
      approvalEffect: 'does_not_approve_mailerlite_ui_edit_test_send_or_public_send',
    },
    sourceDigests,
    safety,
    hardStops: [
      'This manifest is not approval for Shopify publish, MailerLite UI edits, test sends or public sends.',
      'Local path candidates are not final public URLs.',
      'Do not ask Alejandro to manually invent routine links when Web/Shopify can produce the asset receipt.',
      'Do not touch subscribers, groups, workflows, Shopify live pages, CRM, Signal Ledger, cards, scoring or Fact Store from this manifest.',
    ],
  };
};

const buildManifestFromFiles = async (options) => {
  const receiptEntry = await readJsonWithDigest(
    options.shopifyLocalBuildReceipt,
    'local Shopify build receipt and launch identity',
  );
  const previewRouteExecutionEntry = await readJsonWithDigest(
    options.shopifyPreviewRouteExecutionReceipt,
    'executed Shopify preview route receipt and redacted URL hashes',
  );
  const paths = [...new Set(Object.values(LOCAL_SLOT_SPECS).flatMap((spec) => [spec.localSourcePath, spec.templatePath]))];
  const fileEvidence = await Promise.all(paths.map((relativePath) =>
    readLocalFileEvidence({
      shopifyRepo: options.shopifyRepo,
      relativePath,
      consultedFor: 'local Shopify asset slot and placeholder evidence',
    })));
  const publicFileEvidence = fileEvidence.map(({ content, ...file }) => file);
  return buildAssetManifest({
    shopifyLocalBuildReceipt: receiptEntry.value,
    shopifyPreviewRouteExecutionReceipt: previewRouteExecutionEntry.value,
    fileEvidence,
    shopifyRepo: options.shopifyRepo,
    sourceDigests: [
      receiptEntry.digest,
      previewRouteExecutionEntry.digest,
      ...publicFileEvidence,
    ],
  });
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  `# Mini-launch Asset Manifest - ${report.launch?.resourceName ?? 'Inteligencia para descansar'}`,
  '',
  `Generated: ${report.generatedAt}`,
  `Status: \`${report.status}\``,
  '',
  '## Summary',
  '',
  `- Final public links ready: ${report.executiveSummary.finalPublicLinksReady}`,
  `- Local asset slots ready: ${report.executiveSummary.localAssetSlotReadyCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Public URLs ready: ${report.executiveSummary.publicUrlReadyCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Preview URLs ready: ${report.executiveSummary.previewUrlReadyCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Live URLs ready/promoted: ${report.executiveSummary.liveUrlReadyCount + report.executiveSummary.previewPromotedToLiveCount}/${report.executiveSummary.requiredPublicUrlCount}`,
  `- Audience-send URL gate ready: ${report.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Requires Alejandro manual links: ${report.executiveSummary.requiresAlejandroManualLinks}`,
  `- Link lifecycle policy: ${report.executiveSummary.linkLifecyclePolicy}`,
  `- Final link owner: ${report.executiveSummary.finalLinkOwner}`,
  `- Subscription policy: ${report.executiveSummary.subscriptionReasonPolicy}`,
  `- Ready for correction preview: ${report.executiveSummary.readyForMiniLaunchCorrectionPreview}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Link Slots',
  '',
  renderList(report.finalPublicLinks.slots.map((slot) =>
    `${slot.key}: ${slot.status}, stage=${slot.linkLifecycle.currentStage}, candidate=${slot.pathCandidate}, publicUrlReady=${slot.publicUrlReady}, owner=${slot.owner}`)),
  '',
  '## Blockers',
  '',
  renderList(report.finalPublicLinks.blockers),
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

  const report = await buildManifestFromFiles(options);
  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    finalPublicLinksReady: report.executiveSummary.finalPublicLinksReady,
    localAssetSlotReadyCount: report.executiveSummary.localAssetSlotReadyCount,
    publicUrlReadyCount: report.executiveSummary.publicUrlReadyCount,
    requiresAlejandroManualLinks: report.executiveSummary.requiresAlejandroManualLinks,
    subscriptionReasonPolicy: report.executiveSummary.subscriptionReasonPolicy,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch asset manifest failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildAssetManifest,
  buildSafety,
  parseArgs,
  renderMarkdown,
};
