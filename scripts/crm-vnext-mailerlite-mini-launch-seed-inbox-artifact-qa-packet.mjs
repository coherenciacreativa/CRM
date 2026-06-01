#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-artifact-qa-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_SEED_INBOX_OBSERVATION =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_artifact_observation_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_current_inteligencia_descansar_2026-06-01.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-artifact-qa-packet.mjs [options]

Options:
  --asset-manifest <path>          Mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --seed-inbox-observation <path>  Redacted seed inbox observation JSON. Defaults to ${DEFAULT_SEED_INBOX_OBSERVATION}
  --out <path>                     Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>            Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                           Show this help

Local-only seed inbox artifact QA packet for the Inteligencia para descansar
mini-launch. It converts read-only Gmail/seed-inbox and preview-link HTTP
observations into redacted readiness evidence. It never opens UI, calls Gmail,
MailerLite, Shopify or CRM live APIs, reads or mutates subscribers, creates
groups, edits workflows, sends emails, publishes pages, appends ledgers, writes
cards/scoring, writes Fact Store, or prints exact URLs/recipients/tokens.`;

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    seedInboxObservation: DEFAULT_SEED_INBOX_OBSERVATION,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--asset-manifest') options.assetManifest = argv[++index];
    else if (arg === '--seed-inbox-observation') options.seedInboxObservation = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');
const readText = async (path) => readFile(resolve(path), 'utf8');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readText(resolved);
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

const unique = (items) => [...new Set(items.filter(Boolean))];

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  gmailReadOnlyEvidenceReferenced: true,
  httpPreviewUrlGetEvidenceReferenced: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  gmailApiCalledByThisScript: false,
  gmailMutationsPerformed: false,
  mailerLiteApiCalled: false,
  mailerLiteUiUsed: false,
  mailerLiteMutationsPerformed: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  shopifyPublishPerformed: false,
  crmLiveApiCalled: false,
  subscribersReadByThisScript: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  segmentMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  rawIdsPrinted: false,
  exactUrlsPrinted: false,
  recipientsPrinted: false,
  tokensPrinted: false,
});

const safetyClosed = (safety) => Object.entries(safety)
  .every(([key, value]) => (
    [
      'localOnly',
      'reportsOnly',
      'gmailReadOnlyEvidenceReferenced',
      'httpPreviewUrlGetEvidenceReferenced',
    ].includes(key)
      ? value === true
      : value === false
  ));

const isHttpOk = (status) => Number.isInteger(status) && status >= 200 && status < 300;

const normalizeSeedMessages = (seedInboxObservation) => (seedInboxObservation?.seedMessages ?? [])
  .map((message) => ({
    messageKey: message.messageKey ?? message.key ?? null,
    messageSha256: message.messageSha256 ?? null,
    deliveredToApprovedSeed: message.deliveredToApprovedSeed === true,
    ctaSlot: message.cta?.slot ?? message.ctaSlot ?? null,
    ctaLabelPresent: message.cta?.labelPresent === true || message.ctaLabelPresent === true,
    ctaUrlSha256: message.cta?.urlSha256 ?? message.ctaUrlSha256 ?? null,
    ctaHttpStatus: message.cta?.httpStatus ?? message.ctaHttpStatus ?? null,
    ctaNoindexObserved: message.cta?.hasNoindex === true || message.ctaNoindexObserved === true,
    expectedPreviewAnchorObserved:
      message.cta?.expectedPreviewAnchorObserved === true
      || message.expectedPreviewAnchorObserved === true,
    rawUrlVisibleInBody: message.rawUrlVisibleInBody === true,
    footerUnsubscribeTextPresent: message.footerUnsubscribeTextPresent === true,
    footerPostalAddressPresent: message.footerPostalAddressPresent === true,
    footerSubscriptionReasonLinePresent: message.footerSubscriptionReasonLinePresent === true,
    canonicalFooterMatchesReference: message.canonicalFooterMatchesReference === true,
    visualSignatureImagePresent: message.visualSignatureImagePresent === true,
    textSignaturePresent: message.textSignaturePresent === true,
    replyCtaPresent: message.replyCtaPresent === true,
  }));

const buildSeedInboxArtifactQaPacket = ({
  assetManifest,
  seedInboxObservation,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const seedMessages = normalizeSeedMessages(seedInboxObservation);
  const expectedSeedMessageCount = seedInboxObservation?.expectedSeedMessageCount ?? 4;
  const expectedClickthroughCount = seedInboxObservation?.expectedClickthroughCount ?? 3;
  const clickthroughMessages = seedMessages.filter((message) => message.ctaSlot);
  const deliveredToApprovedSeedCount = seedMessages.filter((message) => message.deliveredToApprovedSeed).length;
  const clickthroughHttpOkCount = clickthroughMessages.filter((message) => isHttpOk(message.ctaHttpStatus)).length;
  const clickthroughNoindexCount = clickthroughMessages.filter((message) => message.ctaNoindexObserved).length;
  const clickthroughExpectedAnchorCount =
    clickthroughMessages.filter((message) => message.expectedPreviewAnchorObserved).length;
  const visibleRawUrlTextCount = seedMessages.filter((message) => message.rawUrlVisibleInBody).length;
  const footerCompliancePresent =
    seedMessages.length >= expectedSeedMessageCount
    && seedMessages.every((message) =>
      message.footerUnsubscribeTextPresent
      && message.footerPostalAddressPresent
      && message.footerSubscriptionReasonLinePresent
    );
  const canonicalMailerLiteFooterVerified =
    seedMessages.length >= expectedSeedMessageCount
    && seedMessages.every((message) => message.canonicalFooterMatchesReference);
  const visualSignatureAssetVerified =
    seedMessages.length >= expectedSeedMessageCount
    && seedMessages.every((message) => message.visualSignatureImagePresent);
  const signatureFallbackPresent =
    seedMessages.some((message) => message.textSignaturePresent && !message.visualSignatureImagePresent);
  const realSeedClickthroughVerified =
    clickthroughMessages.length === expectedClickthroughCount
    && clickthroughHttpOkCount === expectedClickthroughCount
    && clickthroughNoindexCount === expectedClickthroughCount
    && clickthroughExpectedAnchorCount === expectedClickthroughCount
    && clickthroughMessages.every((message) => /^[a-f0-9]{64}$/u.test(message.ctaUrlSha256 ?? ''));
  const seedInboxArtifactQaPassed =
    deliveredToApprovedSeedCount === expectedSeedMessageCount
    && realSeedClickthroughVerified
    && visibleRawUrlTextCount === 0
    && footerCompliancePresent
    && canonicalMailerLiteFooterVerified
    && visualSignatureAssetVerified
    && signatureFallbackPresent === false
    && safetyClosed(safety);

  const blockers = unique([
    deliveredToApprovedSeedCount === expectedSeedMessageCount ? null : 'seed_delivery_not_complete_or_not_seed_only',
    realSeedClickthroughVerified ? null : 'real_seed_clickthrough_not_verified',
    visibleRawUrlTextCount > 0 ? 'visible_raw_url_text_present_in_seed_inbox_body' : null,
    footerCompliancePresent ? null : 'footer_compliance_elements_not_present',
    canonicalMailerLiteFooterVerified ? null : 'canonical_mailerlite_footer_not_verified',
    visualSignatureAssetVerified ? null : 'visual_signature_asset_not_verified',
    signatureFallbackPresent ? 'signature_fallback_still_present_in_payload' : null,
  ]);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_report_only_redacted',
    generatedAt,
    ok: safetyClosed(safety),
    status: seedInboxArtifactQaPassed
      ? 'seed_inbox_artifact_qa_ready_for_ceo_review_no_live_changes'
      : 'seed_inbox_artifact_qa_blocked_before_ceo_review_no_live_changes',
    launch: {
      launchId: assetManifest?.launch?.launchId
        ?? seedInboxObservation?.launch?.launchId
        ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: assetManifest?.launch?.resourceName
        ?? seedInboxObservation?.launch?.resourceName
        ?? 'Inteligencia para descansar',
      resourceType: assetManifest?.launch?.resourceType
        ?? seedInboxObservation?.launch?.resourceType
        ?? 'quiz',
    },
    executiveSummary: {
      seedInboxArtifactQaPassed,
      deliveredToApprovedSeedCount,
      expectedSeedMessageCount,
      realSeedClickthroughVerified,
      clickthroughHttpOkCount,
      clickthroughNoindexCount,
      clickthroughExpectedAnchorCount,
      expectedClickthroughCount,
      visibleRawUrlTextCount,
      footerCompliancePresent,
      canonicalMailerLiteFooterVerified,
      visualSignatureAssetVerified,
      signatureFallbackPresent,
      blockerCount: blockers.length,
      blockers,
      liveActionAllowedNow: false,
      nextSafeAction: seedInboxArtifactQaPassed
        ? 'feed_integrated_experience_qa_before_ceo_review'
        : 'repair_seed_inbox_artifacts_before_ceo_review',
    },
    seedMessageFindings: seedMessages.map((message) => ({
      messageKey: message.messageKey,
      messageSha256: message.messageSha256,
      deliveredToApprovedSeed: message.deliveredToApprovedSeed,
      ctaSlot: message.ctaSlot,
      ctaLabelPresent: message.ctaLabelPresent,
      ctaUrlSha256: message.ctaUrlSha256,
      ctaHttpStatus: message.ctaHttpStatus,
      ctaNoindexObserved: message.ctaNoindexObserved,
      expectedPreviewAnchorObserved: message.expectedPreviewAnchorObserved,
      rawUrlVisibleInBody: message.rawUrlVisibleInBody,
      footerUnsubscribeTextPresent: message.footerUnsubscribeTextPresent,
      footerPostalAddressPresent: message.footerPostalAddressPresent,
      footerSubscriptionReasonLinePresent: message.footerSubscriptionReasonLinePresent,
      canonicalFooterMatchesReference: message.canonicalFooterMatchesReference,
      visualSignatureImagePresent: message.visualSignatureImagePresent,
      textSignaturePresent: message.textSignaturePresent,
      replyCtaPresent: message.replyCtaPresent,
    })),
    referenceComparison: {
      canonicalReferenceSha256: seedInboxObservation?.canonicalReference?.messageSha256 ?? null,
      identitySignatureLinePresent: seedInboxObservation?.canonicalReference?.identitySignatureLinePresent ?? null,
      bioLinePresent: seedInboxObservation?.canonicalReference?.bioLinePresent ?? null,
      newsletterSubscriptionLinePresent:
        seedInboxObservation?.canonicalReference?.newsletterSubscriptionLinePresent ?? null,
      unsubscribeTextPresent: seedInboxObservation?.canonicalReference?.unsubscribeTextPresent ?? null,
      visualSignatureImagePresent: seedInboxObservation?.canonicalReference?.visualSignatureImagePresent ?? null,
    },
    sourceDigests: [],
    safety,
    hardStops: [
      'This packet is evidence only; it is not approval to edit MailerLite drafts or send emails.',
      'Do not use seed-inbox delivery as audience-send approval.',
      'Do not print exact URLs, recipients, raw IDs or tokens from this packet.',
      'Keep MailerLite, Shopify, CRM, subscribers, groups, workflows, ledgers, cards, scoring and Fact Store closed.',
    ],
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => [
  '# MailerLite Mini-launch Seed Inbox Artifact QA Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Executive Summary',
  '',
  `- Seed inbox artifact QA passed: ${report.executiveSummary.seedInboxArtifactQaPassed}`,
  `- Delivered to approved seed: ${report.executiveSummary.deliveredToApprovedSeedCount}/${report.executiveSummary.expectedSeedMessageCount}`,
  `- Real seed click-through verified: ${report.executiveSummary.realSeedClickthroughVerified}`,
  `- Click-through HTTP OK: ${report.executiveSummary.clickthroughHttpOkCount}/${report.executiveSummary.expectedClickthroughCount}`,
  `- Visible raw URL text hits in seed inbox body: ${report.executiveSummary.visibleRawUrlTextCount}`,
  `- Footer compliance elements present: ${report.executiveSummary.footerCompliancePresent}`,
  `- Canonical MailerLite footer verified: ${report.executiveSummary.canonicalMailerLiteFooterVerified}`,
  `- Visual signature asset verified: ${report.executiveSummary.visualSignatureAssetVerified}`,
  `- Signature fallback present: ${report.executiveSummary.signatureFallbackPresent}`,
  `- Blockers: ${report.executiveSummary.blockerCount}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Blockers',
  '',
  report.executiveSummary.blockers.length > 0 ? renderList(report.executiveSummary.blockers) : '- None.',
  '',
  '## Seed Message Findings',
  '',
  ...report.seedMessageFindings.map((message) =>
    `- ${message.messageKey}: ctaSlot=${message.ctaSlot ?? 'none'}; http=${message.ctaHttpStatus ?? 'none'}; rawUrlVisible=${message.rawUrlVisibleInBody}; footerCanonical=${message.canonicalFooterMatchesReference}; visualSignature=${message.visualSignatureImagePresent}`
  ),
  '',
  '## Safety',
  '',
  '- Local-only/report-only packet.',
  '- Gmail evidence referenced: read-only.',
  '- HTTP preview URL evidence referenced: GET only.',
  '- MailerLite API called: false.',
  '- Shopify API called: false.',
  '- CRM live API called: false.',
  '- Sends/subscriber/group/workflow mutations: false.',
  '- Exact URLs printed: false.',
  '- Recipients printed: false.',
  '- Tokens printed: false.',
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
].join('\n');

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content);
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const [assetManifest, seedInboxObservation] = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'asset manifest launch metadata and link lifecycle status'),
    readJsonWithDigest(options.seedInboxObservation, 'redacted Gmail seed inbox and HTTP preview-link observations'),
  ]);

  const report = buildSeedInboxArtifactQaPacket({
    assetManifest: assetManifest.value,
    seedInboxObservation: seedInboxObservation.value,
  });

  report.sourceDigests = [
    assetManifest.digest,
    seedInboxObservation.digest,
  ];

  await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    seedInboxArtifactQaPassed: report.executiveSummary.seedInboxArtifactQaPassed,
    realSeedClickthroughVerified: report.executiveSummary.realSeedClickthroughVerified,
    visibleRawUrlTextCount: report.executiveSummary.visibleRawUrlTextCount,
    canonicalMailerLiteFooterVerified: report.executiveSummary.canonicalMailerLiteFooterVerified,
    visualSignatureAssetVerified: report.executiveSummary.visualSignatureAssetVerified,
    blockerCount: report.executiveSummary.blockerCount,
    blockers: report.executiveSummary.blockers,
    out: resolve(options.out),
    markdownOut: resolve(options.markdownOut),
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed inbox artifact QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildSeedInboxArtifactQaPacket,
  parseArgs,
  renderMarkdown,
  safetyClosed,
};
