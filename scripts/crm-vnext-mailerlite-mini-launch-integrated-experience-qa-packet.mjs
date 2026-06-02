#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-integrated-experience-qa-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_CORRECTION_PREVIEW =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PAYLOAD_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_email_builder_payload_manifest_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.redacted.json`;
const DEFAULT_EMAIL_RENDER_QA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_email_render_qa_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_REAL_MAILERLITE_RENDER_QA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_real_mailerlite_render_qa_before_seed_send_inteligencia_descansar_2026-05-31-latest.json`;
const DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_null_audience_seed_inbox_qa_current_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_SEED_INBOX_ARTIFACT_QA_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_artifact_qa_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_public_launch_readiness_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_PRODUCT_VALUE_REVIEW_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_pilot_distribution_decision_intake_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-01.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-integrated-experience-qa-packet.mjs [options]

Options:
  --asset-manifest <path>                    Mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --correction-preview <path>                Seed inbox correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --payload-manifest <path>                  Redacted email payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --email-render-qa <path>                   Local email render QA JSON. Defaults to ${DEFAULT_EMAIL_RENDER_QA}
  --real-mailerlite-render-qa <path>         Real MailerLite render QA JSON. Defaults to ${DEFAULT_REAL_MAILERLITE_RENDER_QA}
  --null-audience-seed-inbox-qa <path>       Null Audience seed inbox QA JSON. Defaults to ${DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA}
  --seed-inbox-artifact-qa-packet <path>     Redacted seed inbox artifact QA JSON. Defaults to ${DEFAULT_SEED_INBOX_ARTIFACT_QA_PACKET}
  --public-launch-readiness-packet <path>    Public launch readiness JSON. Defaults to ${DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET}
  --product-value-review-packet <path>       Product/Value review JSON. Defaults to ${DEFAULT_PRODUCT_VALUE_REVIEW_PACKET}
  --pilot-distribution-decision-intake <path> Pilot distribution decision intake JSON. Defaults to ${DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE}
  --out <path>                               Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                      Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                     Show this help

Local-only integrated experience QA packet for the Inteligencia para descansar
mini-launch. It checks whether the full CEO-review package is ready before any
pilot distribution, tester, audience or send decision. It reads only local
reports and local Shopify source files referenced by the asset manifest. It
never opens UI, calls MailerLite/Shopify/CRM APIs, reads or mutates subscribers,
creates groups, edits workflows, sends emails, publishes pages, appends ledgers,
writes cards/scoring, writes Fact Store, or prints exact URLs/tokens.`;

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    emailRenderQa: DEFAULT_EMAIL_RENDER_QA,
    realMailerLiteRenderQa: DEFAULT_REAL_MAILERLITE_RENDER_QA,
    nullAudienceSeedInboxQa: DEFAULT_NULL_AUDIENCE_SEED_INBOX_QA,
    seedInboxArtifactQaPacket: DEFAULT_SEED_INBOX_ARTIFACT_QA_PACKET,
    publicLaunchReadinessPacket: DEFAULT_PUBLIC_LAUNCH_READINESS_PACKET,
    productValueReviewPacket: DEFAULT_PRODUCT_VALUE_REVIEW_PACKET,
    pilotDistributionDecisionIntake: DEFAULT_PILOT_DISTRIBUTION_DECISION_INTAKE,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--asset-manifest') options.assetManifest = argv[++index];
    else if (arg === '--correction-preview') options.correctionPreview = argv[++index];
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--email-render-qa') options.emailRenderQa = argv[++index];
    else if (arg === '--real-mailerlite-render-qa') options.realMailerLiteRenderQa = argv[++index];
    else if (arg === '--null-audience-seed-inbox-qa') options.nullAudienceSeedInboxQa = argv[++index];
    else if (arg === '--seed-inbox-artifact-qa-packet') options.seedInboxArtifactQaPacket = argv[++index];
    else if (arg === '--public-launch-readiness-packet') options.publicLaunchReadinessPacket = argv[++index];
    else if (arg === '--product-value-review-packet') options.productValueReviewPacket = argv[++index];
    else if (arg === '--pilot-distribution-decision-intake') options.pilotDistributionDecisionIntake = argv[++index];
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

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
    return await readJsonWithDigest(resolved, consultedFor);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        private: false,
        consultedFor,
      },
    };
  }
};

const unique = (items) => [...new Set(items.filter(Boolean))];

const sanitizeExcerpt = (value) => String(value)
  .replace(/https?:\/\/[^\s"'<>)]*/giu, '[redacted_url]')
  .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/giu, '[redacted_email]')
  .trim();

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  shopifyRepoReadOnlyInspection: true,
  uiOpened: false,
  browserOpened: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  mailerLiteUiUsed: false,
  mailerLiteMutationsPerformed: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  shopifyPublishPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
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
    key === 'localOnly' || key === 'reportsOnly' || key === 'shopifyRepoReadOnlyInspection'
      ? value === true
      : value === false
  ));

const PLACEHOLDER_PATTERNS = [
  { id: 'literal_placeholder', pattern: /\bplaceholder\b/iu },
  { id: 'pending_copy', pattern: /\bpendiente\b/iu },
  { id: 'pending_connection', pattern: /pendiente de conexi[oó]n/iu },
  { id: 'flow_approval_copy', pattern: /flujo real sea aprobado|cuando .* sea aprobado/iu },
  { id: 'closed_connection_copy', pattern: /conexi[oó]n real queda cerrada/iu },
  { id: 'prepared_placeholder_copy', pattern: /recursos preparados como placeholders/iu },
  { id: 'placeholder_data_attribute', pattern: /data-[\w-]*placeholder=/iu },
];

const scanSourceText = ({ path, text }) => {
  const hits = [];
  const lines = text.split(/\r?\n/u);
  for (const [index, line] of lines.entries()) {
    for (const check of PLACEHOLDER_PATTERNS) {
      if (check.pattern.test(line)) {
        hits.push({
          path: resolve(path),
          line: index + 1,
          checkId: check.id,
          excerpt: sanitizeExcerpt(line).slice(0, 240),
        });
      }
    }
  }
  return hits;
};

const scanShopifySourceFiles = async (assetManifest) => {
  const sourceDigests = assetManifest?.sourceDigests ?? [];
  const shopifySources = sourceDigests
    .filter((source) => typeof source?.path === 'string')
    .filter((source) => /local shopify asset slot|placeholder evidence/iu.test(source?.consultedFor ?? ''))
    .filter((source) => /\.(liquid|json|html|md)$/iu.test(source.path));

  const results = [];
  for (const source of shopifySources) {
    const path = resolve(source.path);
    const raw = await readText(path);
    results.push({
      path,
      present: true,
      chars: raw.length,
      sha256: sha256(raw),
      hits: scanSourceText({ path, text: raw }),
    });
  }

  return {
    inspectedFileCount: results.length,
    placeholderHitCount: results.reduce((sum, result) => sum + result.hits.length, 0),
    inspectedFiles: results.map((result) => ({
      path: result.path,
      present: result.present,
      chars: result.chars,
      sha256: result.sha256,
      hitCount: result.hits.length,
    })),
    hits: results.flatMap((result) => result.hits).slice(0, 40),
  };
};

const payloadBlockTexts = (payloadManifest) => (payloadManifest?.payloads ?? [])
  .flatMap((payload) => payload.contentBlocks ?? [])
  .map((block) => block.value ?? block.text ?? block.label ?? '')
  .filter((value) => typeof value === 'string');

const localRenderCheckIsGreen = (entry, checkId) =>
  (entry?.staticQa?.checks ?? []).some((check) => check.id === checkId && check.status === 'green');

const localRenderEmailCount = (emailRenderQa) =>
  emailRenderQa?.executiveSummary?.emailCount ?? (emailRenderQa?.emailQa ?? []).length;

const localRenderSignatureFooterEvidence = (emailRenderQa) => {
  const emailCount = localRenderEmailCount(emailRenderQa);
  const rows = emailRenderQa?.emailQa ?? [];
  const allRowsHaveCanonicalFooter = emailCount > 0
    && rows.length === emailCount
    && rows.every((entry) => localRenderCheckIsGreen(entry, 'canonical_author_footer'));
  const allRowsHaveCompactFooter = emailCount > 0
    && rows.length === emailCount
    && rows.every((entry) => localRenderCheckIsGreen(entry, 'footer_compact_hierarchy'));
  const visualSignatureAssetVerified = emailRenderQa?.executiveSummary?.localRenderReady === true
    && emailRenderQa?.executiveSummary?.visualSignatureAssetReadyCount === emailCount
    && emailCount > 0;
  const signatureFallbackClear = emailRenderQa?.executiveSummary?.localRenderReady === true
    && emailRenderQa?.executiveSummary?.signatureFallbackCount === 0
    && emailCount > 0;
  const canonicalMailerLiteFooterVerified = emailRenderQa?.executiveSummary?.localRenderReady === true
    && allRowsHaveCanonicalFooter
    && allRowsHaveCompactFooter;

  return {
    emailCount,
    visualSignatureAssetVerified,
    signatureFallbackClear,
    canonicalMailerLiteFooterVerified,
    allRowsHaveCanonicalFooter,
    allRowsHaveCompactFooter,
  };
};

const countVisibleUrlTextInHtml = async (emailRenderQa) => {
  const htmlPaths = (emailRenderQa?.emailQa ?? [])
    .map((entry) => entry?.htmlPath)
    .filter(Boolean);
  let visibleUrlTextCount = 0;
  let inspectedHtmlCount = 0;
  const htmlDigests = [];

  for (const path of htmlPaths) {
    const raw = await readText(path);
    inspectedHtmlCount += 1;
    const textOnly = raw
      .replace(/<a\b[^>]*>[\s\S]*?<\/a>/giu, '')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/giu, '')
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/giu, '')
      .replace(/<[^>]+>/gu, ' ');
    const matches = textOnly.match(/https?:\/\/[^\s<>"']+/giu) ?? [];
    visibleUrlTextCount += matches.length;
    htmlDigests.push({
      path: resolve(path),
      present: true,
      chars: raw.length,
      sha256: sha256(raw),
      visibleUrlTextCount: matches.length,
      consultedFor: 'local email HTML visible URL text check; exact URLs not printed',
    });
  }

  return { inspectedHtmlCount, visibleUrlTextCount, htmlDigests };
};

const gate = ({ id, label, ready, evidence = {}, blockers = [] }) => ({
  id,
  label,
  ready: Boolean(ready),
  status: ready ? 'ready' : 'blocked',
  evidence,
  blockers: ready ? [] : unique(blockers),
});

const buildIntegratedExperienceQaPacket = async ({
  assetManifest,
  correctionPreview,
  payloadManifest,
  emailRenderQa,
  realMailerLiteRenderQa,
  nullAudienceSeedInboxQa,
  seedInboxArtifactQaPacket,
  publicLaunchReadinessPacket,
  productValueReviewPacket,
  pilotDistributionDecisionIntake,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const shopifySourceScan = await scanShopifySourceFiles(assetManifest);
  const htmlVisibleUrlScan = await countVisibleUrlTextInHtml(emailRenderQa);
  const blockTexts = payloadBlockTexts(payloadManifest);
  const allPayloadText = blockTexts.join('\n').toLowerCase();
  const seedArtifactSummary = seedInboxArtifactQaPacket?.executiveSummary ?? {};
  const seedEvidenceAppliesToCurrentReplacement =
    publicLaunchReadinessPacket?.executiveSummary?.seedInboxQaAppliesToCurrentReplacementReceipt !== false;
  const rawSeedRawUrlVisibleCount =
    typeof seedArtifactSummary.visibleRawUrlTextCount === 'number'
      ? seedArtifactSummary.visibleRawUrlTextCount
      : null;
  const seedRawUrlVisibleCount = seedEvidenceAppliesToCurrentReplacement
    ? rawSeedRawUrlVisibleCount
    : null;
  const seedRawUrlsClear = seedRawUrlVisibleCount === null ? true : seedRawUrlVisibleCount === 0;
  const seedClickthroughVerified =
    seedEvidenceAppliesToCurrentReplacement && seedArtifactSummary.realSeedClickthroughVerified === true;
  const localRenderSignatureFooter = localRenderSignatureFooterEvidence(emailRenderQa);

  const payloadAndLocalRenderReady =
    correctionPreview?.executiveSummary?.finalPublicLinksReady === true
    && correctionPreview?.executiveSummary?.redactedPayloadManifestReady === true
    && payloadManifest?.executiveSummary?.payloadCount === 4
    && payloadManifest?.executiveSummary?.contentBlockCount >= 40
    && emailRenderQa?.executiveSummary?.localRenderReady === true
    && emailRenderQa?.executiveSummary?.redCheckCount === 0;

  const realMailerLiteRenderReady =
    realMailerLiteRenderQa?.executiveSummary?.allDraftsPreviewed === true
    && realMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact === true
    && realMailerLiteRenderQa?.executiveSummary?.allSafetyGatesClosed === true;

  const signatureFallbackMentioned = /signature asset or text-signature fallback|text-signature fallback/iu
    .test(allPayloadText);
  const signatureAssetVerified =
    payloadManifest?.executiveSummary?.visualSignatureAssetVerified === true
    || realMailerLiteRenderQa?.executiveSummary?.visualSignatureAssetVerified === true
    || seedArtifactSummary.visualSignatureAssetVerified === true
    || localRenderSignatureFooter.visualSignatureAssetVerified === true;
  const canonicalFooterVerified =
    payloadManifest?.executiveSummary?.canonicalMailerLiteFooterVerified === true
    || realMailerLiteRenderQa?.executiveSummary?.canonicalMailerLiteFooterVerified === true
    || seedArtifactSummary.canonicalMailerLiteFooterVerified === true
    || localRenderSignatureFooter.canonicalMailerLiteFooterVerified === true;
  const seedArtifactSignatureFallbackPresent = seedArtifactSummary.signatureFallbackPresent === true;
  const effectiveSeedArtifactSignatureFallbackPresent =
    seedEvidenceAppliesToCurrentReplacement && seedArtifactSignatureFallbackPresent === true;
  const signatureFallbackEffectivelyPresent =
    effectiveSeedArtifactSignatureFallbackPresent === true
    || (signatureFallbackMentioned === true && localRenderSignatureFooter.signatureFallbackClear !== true);
  const platformFooterPolicyOnly = /use mailerlite platform unsubscribe\/footer only|platform footer only/iu
    .test(allPayloadText);
  const platformFooterPolicyEffectivelyOnly =
    platformFooterPolicyOnly === true
    && localRenderSignatureFooter.canonicalMailerLiteFooterVerified !== true;
  const canonicalSignatureAndFooterReady =
    signatureAssetVerified === true
    && signatureFallbackEffectivelyPresent === false
    && canonicalFooterVerified === true
    && platformFooterPolicyEffectivelyOnly === false;

  const clickthroughVerified =
    productValueReviewPacket?.executiveSummary?.clickthroughVerified === true
    || (seedEvidenceAppliesToCurrentReplacement && nullAudienceSeedInboxQa?.deliverySummary?.ctaClickthroughGreen === true)
    || (seedEvidenceAppliesToCurrentReplacement && nullAudienceSeedInboxQa?.deliverySummary?.buttonClickthroughVerified === true)
    || realMailerLiteRenderQa?.executiveSummary?.ctaClickthroughVerified === true
    || seedClickthroughVerified;
  const ctaClickthroughReady =
    clickthroughVerified && htmlVisibleUrlScan.visibleUrlTextCount === 0 && seedRawUrlsClear;

  const shopifyResourceComplete =
    assetManifest?.executiveSummary?.finalPublicLinksReady === true
    && shopifySourceScan.inspectedFileCount > 0
    && shopifySourceScan.placeholderHitCount === 0;

  const productValueReviewPassed =
    productValueReviewPacket?.executiveSummary?.productValueReviewPassed === true
    || payloadManifest?.executiveSummary?.productValueReviewPassed === true
    || publicLaunchReadinessPacket?.executiveSummary?.productValueReviewPassed === true;
  const productValueReviewPresent = productValueReviewPacket != null;
  const productValueReviewBlockers = productValueReviewPacket?.executiveSummary?.blockers ?? [];
  const productValueReviewStatus = productValueReviewPacket?.status ?? null;

  const publicDistributionClosed =
    publicLaunchReadinessPacket?.executiveSummary?.readyForExactPublicSendApproval === false
    && publicLaunchReadinessPacket?.executiveSummary?.liveActionAllowedNow === false
    && pilotDistributionDecisionIntake?.executiveSummary?.wouldAuthorizeSend === false;

  const gateMatrix = [
    gate({
      id: 'email_payload_and_local_render',
      label: 'Email payload and local render QA',
      ready: payloadAndLocalRenderReady,
      evidence: {
        correctionPreviewStatus: correctionPreview?.status ?? null,
        payloadCount: payloadManifest?.executiveSummary?.payloadCount ?? null,
        localRenderReady: emailRenderQa?.executiveSummary?.localRenderReady ?? null,
        redCheckCount: emailRenderQa?.executiveSummary?.redCheckCount ?? null,
      },
      blockers: ['email_payload_or_local_render_not_green'],
    }),
    gate({
      id: 'real_mailerlite_render',
      label: 'Real MailerLite render QA',
      ready: realMailerLiteRenderReady,
      evidence: {
        status: realMailerLiteRenderQa?.status ?? null,
        allDraftsPreviewed: realMailerLiteRenderQa?.executiveSummary?.allDraftsPreviewed ?? null,
        allRequiredContentExact: realMailerLiteRenderQa?.executiveSummary?.allRequiredContentExact ?? null,
        allSafetyGatesClosed: realMailerLiteRenderQa?.executiveSummary?.allSafetyGatesClosed ?? null,
      },
      blockers: ['real_mailerlite_render_not_green'],
    }),
    gate({
      id: 'canonical_signature_and_footer',
      label: 'Canonical signature asset and MailerLite footer',
      ready: canonicalSignatureAndFooterReady,
      evidence: {
        signatureAssetVerified,
        signatureFallbackMentioned,
        seedArtifactSignatureFallbackPresent,
        effectiveSeedArtifactSignatureFallbackPresent,
        seedEvidenceAppliesToCurrentReplacement,
        signatureFallbackEffectivelyPresent,
        canonicalMailerLiteFooterVerified: canonicalFooterVerified,
        seedInboxArtifactQaStatus: seedInboxArtifactQaPacket?.status ?? null,
        localRenderVisualSignatureAssetVerified: localRenderSignatureFooter.visualSignatureAssetVerified,
        localRenderSignatureFallbackClear: localRenderSignatureFooter.signatureFallbackClear,
        localRenderCanonicalMailerLiteFooterVerified: localRenderSignatureFooter.canonicalMailerLiteFooterVerified,
        localRenderEmailCount: localRenderSignatureFooter.emailCount,
        footerCompliancePresent: seedArtifactSummary.footerCompliancePresent ?? null,
        platformFooterPolicyOnly,
        platformFooterPolicyEffectivelyOnly,
      },
      blockers: [
        signatureAssetVerified ? null : 'visual_signature_asset_not_verified',
        signatureFallbackEffectivelyPresent
          ? 'signature_fallback_still_present_in_payload'
          : null,
        canonicalFooterVerified ? null : 'canonical_mailerlite_footer_not_verified',
        platformFooterPolicyEffectivelyOnly ? 'platform_footer_policy_is_not_canonical_footer_proof' : null,
      ],
    }),
    gate({
      id: 'cta_clickthrough_experience',
      label: 'CTA click-through experience',
      ready: ctaClickthroughReady,
      evidence: {
        clickthroughVerified,
        seedInboxArtifactQaStatus: seedInboxArtifactQaPacket?.status ?? null,
        seedClickthroughVerified,
        seedEvidenceAppliesToCurrentReplacement,
        rawSeedRawUrlVisibleCount,
        seedRawUrlVisibleCount,
        inspectedHtmlCount: htmlVisibleUrlScan.inspectedHtmlCount,
        visibleUrlTextCount: htmlVisibleUrlScan.visibleUrlTextCount,
      },
      blockers: [
        clickthroughVerified ? null : 'real_seed_clickthrough_not_verified',
        htmlVisibleUrlScan.visibleUrlTextCount > 0 ? 'visible_raw_url_text_present_in_local_html' : null,
        seedRawUrlVisibleCount > 0 ? 'visible_raw_url_text_present_in_seed_inbox_body' : null,
      ],
    }),
    gate({
      id: 'shopify_resource_completeness',
      label: 'Shopify resource completeness',
      ready: shopifyResourceComplete,
      evidence: {
        finalPublicLinksReady: assetManifest?.executiveSummary?.finalPublicLinksReady ?? null,
        inspectedFileCount: shopifySourceScan.inspectedFileCount,
        placeholderHitCount: shopifySourceScan.placeholderHitCount,
      },
      blockers: [
        assetManifest?.executiveSummary?.finalPublicLinksReady === true ? null : 'final_public_links_not_ready',
        shopifySourceScan.inspectedFileCount > 0 ? null : 'shopify_local_source_not_inspected',
        shopifySourceScan.placeholderHitCount === 0 ? null : 'shopify_asset_placeholders_visible',
      ],
    }),
    gate({
      id: 'product_value_review',
      label: 'Product/value review',
      ready: productValueReviewPassed,
      evidence: {
        productValueReviewStatus,
        productValueReviewPassed,
        productValueReviewBlockerCount: productValueReviewBlockers.length,
        productValueReviewBlockers,
        reviewSource: productValueReviewPacket?.executiveSummary?.productValueReviewPassed === true
          ? 'product_value_review_packet'
          : productValueReviewPassed
            ? 'legacy_payload_or_public_readiness_evidence'
            : null,
      },
      blockers: [
        productValueReviewPresent ? null : 'product_value_review_gate_missing',
        productValueReviewPresent && !productValueReviewPassed ? 'product_value_review_not_green' : null,
        ...productValueReviewBlockers.map((blocker) => `product_value_${blocker}`),
      ],
    }),
    gate({
      id: 'public_distribution_boundary',
      label: 'Public distribution remains closed',
      ready: publicDistributionClosed,
      evidence: {
        readyForExactPublicSendApproval:
          publicLaunchReadinessPacket?.executiveSummary?.readyForExactPublicSendApproval ?? null,
        publicLaunchLiveActionAllowedNow:
          publicLaunchReadinessPacket?.executiveSummary?.liveActionAllowedNow ?? null,
        pilotDecisionWouldAuthorizeSend:
          pilotDistributionDecisionIntake?.executiveSummary?.wouldAuthorizeSend ?? null,
      },
      blockers: ['public_distribution_boundary_not_closed_or_unknown'],
    }),
  ];

  const blockers = unique(gateMatrix.flatMap((entry) => entry.blockers));
  const readyGateCount = gateMatrix.filter((entry) => entry.ready).length;
  const blockedGateCount = gateMatrix.length - readyGateCount;
  const ceoReviewReady = blockedGateCount === 0 && safetyClosed(safety);
  const integratedExperienceReady = ceoReviewReady;
  const distributionDecisionShouldWait = !integratedExperienceReady;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_report_only',
    generatedAt,
    ok: safetyClosed(safety),
    status: ceoReviewReady
      ? 'integrated_experience_qa_ready_for_ceo_review_no_live_changes'
      : 'integrated_experience_qa_blocked_before_ceo_review_no_live_changes',
    launch: {
      launchId: assetManifest?.launch?.launchId
        ?? payloadManifest?.launch?.launchId
        ?? 'mini_2026_06_rehearsal_inteligencia_para_descansar',
      resourceName: assetManifest?.launch?.resourceName
        ?? payloadManifest?.launch?.resourceName
        ?? 'Inteligencia para descansar',
      resourceType: assetManifest?.launch?.resourceType
        ?? payloadManifest?.launch?.resourceType
        ?? 'quiz',
    },
    executiveSummary: {
      ceoReviewReady,
      integratedExperienceReady,
      distributionDecisionShouldWait,
      canAskPilotDistributionDecisionNow: ceoReviewReady,
      canAskPublicSendApprovalNow: false,
      liveActionAllowedNow: false,
      readyGateCount,
      blockedGateCount,
      blockerCount: blockers.length,
      blockers,
      productValueReviewStatus,
      productValueReviewPassed,
      productValueReviewBlockerCount: productValueReviewBlockers.length,
      productValueReviewBlockers,
      nextSafeAction: ceoReviewReady
        ? 'prepare_ceo_review_packet_before_any_later_distribution_choice'
        : 'repair_integrated_experience_before_distribution_decision',
    },
    gateMatrix,
    shopifySourceScan,
    emailHtmlVisibleUrlScan: {
      inspectedHtmlCount: htmlVisibleUrlScan.inspectedHtmlCount,
      visibleUrlTextCount: htmlVisibleUrlScan.visibleUrlTextCount,
      htmlDigests: htmlVisibleUrlScan.htmlDigests,
    },
    sourceDigests: [],
    safety,
    hardStops: [
      'Do not request pilot distribution, tester roster or audience/send approval until CEO-review readiness is green.',
      'Do not use this packet as approval for MailerLite sends, publishing, scheduling, workflows, subscribers, groups or segments.',
      'Do not call Shopify, CRM or MailerLite live APIs from this packet.',
      'Exact URLs, recipients, raw IDs and tokens must remain unprinted.',
    ],
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => [
  '# MailerLite Mini-launch Integrated Experience QA Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Executive Summary',
  '',
  `- CEO review ready: ${report.executiveSummary.ceoReviewReady}`,
  `- Integrated experience ready: ${report.executiveSummary.integratedExperienceReady}`,
  `- Distribution decision should wait: ${report.executiveSummary.distributionDecisionShouldWait}`,
  `- Can ask pilot distribution decision now: ${report.executiveSummary.canAskPilotDistributionDecisionNow}`,
  `- Can ask public send approval now: ${report.executiveSummary.canAskPublicSendApprovalNow}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
  `- Ready gates: ${report.executiveSummary.readyGateCount}`,
  `- Blocked gates: ${report.executiveSummary.blockedGateCount}`,
  `- Blockers: ${report.executiveSummary.blockerCount}`,
  `- Product/value review status: ${report.executiveSummary.productValueReviewStatus ?? 'missing'}`,
  `- Product/value review passed: ${report.executiveSummary.productValueReviewPassed}`,
  `- Product/value review blockers: ${report.executiveSummary.productValueReviewBlockerCount}`,
  `- Seed inbox visible raw URL text hits: ${report.gateMatrix.find((entry) => entry.id === 'cta_clickthrough_experience')?.evidence?.seedRawUrlVisibleCount ?? 'unknown'}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Gate Matrix',
  '',
  ...report.gateMatrix.map((entry) =>
    `- ${entry.id}: ${entry.status}; blockers=${entry.blockers.join(', ') || 'none'}`
  ),
  '',
  '## Shopify Source Scan',
  '',
  `- Inspected files: ${report.shopifySourceScan.inspectedFileCount}`,
  `- Placeholder hit count: ${report.shopifySourceScan.placeholderHitCount}`,
  report.shopifySourceScan.hits.length > 0
    ? renderList(report.shopifySourceScan.hits.map((hit) =>
      `${hit.path}:${hit.line} ${hit.checkId} - ${hit.excerpt}`
    ))
    : '- No placeholder hits.',
  '',
  '## Safety',
  '',
  '- Local-only/report-only packet.',
  '- MailerLite API called: false.',
  '- Shopify API called: false.',
  '- CRM live API called: false.',
  '- Sends/subscriber/group/workflow mutations: false.',
  '- Exact URLs printed: false.',
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

  const [
    assetManifest,
    correctionPreview,
    payloadManifest,
    emailRenderQa,
    realMailerLiteRenderQa,
    nullAudienceSeedInboxQa,
    seedInboxArtifactQaPacket,
    publicLaunchReadinessPacket,
    productValueReviewPacket,
    pilotDistributionDecisionIntake,
  ] = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'asset manifest, link lifecycle, footer policy and Shopify source pointers'),
    readJsonWithDigest(options.correctionPreview, 'seed inbox correction preview and redacted local payload readiness'),
    readJsonWithDigest(options.payloadManifest, 'redacted email payload content blocks and closed send gates'),
    readJsonWithDigest(options.emailRenderQa, 'local HTML render QA and HTML output paths'),
    readJsonWithDigest(options.realMailerLiteRenderQa, 'real MailerLite render QA readback and safety gate state'),
    readJsonWithDigest(options.nullAudienceSeedInboxQa, 'seed inbox QA evidence after Null Audience replacement tests'),
    readOptionalJsonWithDigest(options.seedInboxArtifactQaPacket, 'redacted seed inbox artifact QA evidence from Gmail read-only and preview-link GET checks'),
    readJsonWithDigest(options.publicLaunchReadinessPacket, 'public launch readiness gates and live-action posture'),
    readOptionalJsonWithDigest(options.productValueReviewPacket, 'Product/Value review gates before CEO review'),
    readJsonWithDigest(options.pilotDistributionDecisionIntake, 'pilot distribution decision posture and no-send boundary'),
  ]);

  const report = await buildIntegratedExperienceQaPacket({
    assetManifest: assetManifest.value,
    correctionPreview: correctionPreview.value,
    payloadManifest: payloadManifest.value,
    emailRenderQa: emailRenderQa.value,
    realMailerLiteRenderQa: realMailerLiteRenderQa.value,
    nullAudienceSeedInboxQa: nullAudienceSeedInboxQa.value,
    seedInboxArtifactQaPacket: seedInboxArtifactQaPacket.value,
    publicLaunchReadinessPacket: publicLaunchReadinessPacket.value,
    productValueReviewPacket: productValueReviewPacket.value,
    pilotDistributionDecisionIntake: pilotDistributionDecisionIntake.value,
  });

  report.sourceDigests = [
    assetManifest.digest,
    correctionPreview.digest,
    payloadManifest.digest,
    emailRenderQa.digest,
    realMailerLiteRenderQa.digest,
    nullAudienceSeedInboxQa.digest,
    seedInboxArtifactQaPacket.digest,
    publicLaunchReadinessPacket.digest,
    productValueReviewPacket.digest,
    pilotDistributionDecisionIntake.digest,
    ...report.shopifySourceScan.inspectedFiles.map((source) => ({
      ...source,
      private: false,
      consultedFor: 'local Shopify source placeholder scan',
    })),
    ...report.emailHtmlVisibleUrlScan.htmlDigests.map((source) => ({
      ...source,
      private: false,
    })),
  ];

  await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    ceoReviewReady: report.executiveSummary.ceoReviewReady,
    integratedExperienceReady: report.executiveSummary.integratedExperienceReady,
    distributionDecisionShouldWait: report.executiveSummary.distributionDecisionShouldWait,
    canAskPilotDistributionDecisionNow: report.executiveSummary.canAskPilotDistributionDecisionNow,
    canAskPublicSendApprovalNow: report.executiveSummary.canAskPublicSendApprovalNow,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    readyGateCount: report.executiveSummary.readyGateCount,
    blockedGateCount: report.executiveSummary.blockedGateCount,
    blockerCount: report.executiveSummary.blockerCount,
    blockers: report.executiveSummary.blockers,
    productValueReviewStatus: report.executiveSummary.productValueReviewStatus,
    productValueReviewPassed: report.executiveSummary.productValueReviewPassed,
    productValueReviewBlockerCount: report.executiveSummary.productValueReviewBlockerCount,
    shopifyPlaceholderHitCount: report.shopifySourceScan.placeholderHitCount,
    visibleUrlTextCount: report.emailHtmlVisibleUrlScan.visibleUrlTextCount,
    seedRawUrlVisibleCount: report.gateMatrix
      .find((entry) => entry.id === 'cta_clickthrough_experience')
      ?.evidence?.seedRawUrlVisibleCount ?? null,
    out: resolve(options.out),
    markdownOut: resolve(options.markdownOut),
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch integrated experience QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildIntegratedExperienceQaPacket,
  countVisibleUrlTextInHtml,
  parseArgs,
  renderMarkdown,
  scanSourceText,
  scanShopifySourceFiles,
  safetyClosed,
};
