#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-product-value-review-packet-2026-06-01';
const DEFAULT_REPORTS_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports';
const DEFAULT_ASSET_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_CORRECTION_PREVIEW =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json`;
const DEFAULT_PAYLOAD_MANIFEST =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_email_builder_payload_manifest_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.redacted.json`;
const DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_integrated_experience_qa_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-01.json`;
const DEFAULT_MARKDOWN_OUTPUT =
  `${DEFAULT_REPORTS_DIR}/mailerlite_mini_launch_product_value_review_packet_current_inteligencia_descansar_2026-06-01.md`;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-product-value-review-packet.mjs [options]

Options:
  --asset-manifest <path>                    Mini-launch asset manifest JSON. Defaults to ${DEFAULT_ASSET_MANIFEST}
  --correction-preview <path>                Seed inbox correction preview JSON. Defaults to ${DEFAULT_CORRECTION_PREVIEW}
  --payload-manifest <path>                  Redacted email payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --integrated-experience-qa-packet <path>   Integrated experience QA JSON. Defaults to ${DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET}
  --out <path>                               Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                      Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                                     Show this help

Local-only Product/Value review packet for the Inteligencia para descansar
mini-launch. It turns CEO-review product quality into deterministic gates before
any tester, audience, send, Shopify publish, CRM write, ledger/card/scoring or
Fact Store decision. It reads only local reports and local Shopify source files
referenced by the asset manifest; it never opens UI, calls MailerLite/Shopify/CRM
APIs, reads or mutates subscribers, creates groups, edits workflows, sends emails
or prints exact URLs/tokens.`;

const parseArgs = (argv) => {
  const options = {
    assetManifest: DEFAULT_ASSET_MANIFEST,
    correctionPreview: DEFAULT_CORRECTION_PREVIEW,
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    integratedExperienceQaPacket: DEFAULT_INTEGRATED_EXPERIENCE_QA_PACKET,
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
    else if (arg === '--integrated-experience-qa-packet') options.integratedExperienceQaPacket = argv[++index];
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

const FORBIDDEN_CLAIM_PATTERNS = [
  { id: 'diagnosis_claim', pattern: /\bdiagn[oó]stic[oa]\b/iu },
  { id: 'cure_claim', pattern: /\b(cura|curar|curarte|sanar para siempre)\b/iu },
  { id: 'guarantee_claim', pattern: /\b(garantiz[ao]|resultado garantizado|siempre funciona)\b/iu },
  { id: 'therapy_replacement_claim', pattern: /reemplaza (terapia|tratamiento|acompa[ñn]amiento profesional)/iu },
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
      sanitizedText: sanitizeExcerpt(raw).toLowerCase(),
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
    searchableText: results.map((result) => result.sanitizedText).join('\n'),
  };
};

const collectStrings = (value) => {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (value && typeof value === 'object') return Object.values(value).flatMap((item) => collectStrings(item));
  return [];
};

const payloadTexts = (payloadManifest) => (payloadManifest?.payloads ?? [])
  .flatMap((payload) => [
    payload.subject,
    payload.preheader,
    payload.plainTextFallback,
    payload.contentBlocks,
    payload.cta,
  ])
  .flatMap((item) => collectStrings(item))
  .map((value) => sanitizeExcerpt(value))
  .filter(Boolean);

const countMatches = (text, patterns) => patterns.filter((pattern) => pattern.test(text)).length;
const isSafeClaimContext = (claimId, text) => {
  if (claimId !== 'diagnosis_claim') return false;
  return /no es (un )?diagn[oó]stic[oa]|sin diagn[oó]stic[oa]|no diagn[oó]stic[oa]/iu.test(text);
};

const gate = ({ id, label, ready, evidence = {}, blockers = [], recommendation }) => ({
  id,
  label,
  ready: Boolean(ready),
  status: ready ? 'ready' : 'blocked',
  evidence,
  blockers: ready ? [] : unique(blockers),
  recommendation: recommendation ?? null,
});

const buildProductValueReviewPacket = async ({
  assetManifest,
  correctionPreview,
  payloadManifest,
  integratedExperienceQaPacket,
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const shopifySourceScan = await scanShopifySourceFiles(assetManifest);
  const text = [
    ...payloadTexts(payloadManifest),
    shopifySourceScan.searchableText,
    assetManifest?.launch?.resourceName,
    assetManifest?.launch?.resourceType,
  ].join('\n').toLowerCase();
  const forbiddenClaims = FORBIDDEN_CLAIM_PATTERNS
    .filter((check) => check.pattern.test(text) && !isSafeClaimContext(check.id, text))
    .map((check) => check.id);
  const integratedBlockers = integratedExperienceQaPacket?.executiveSummary?.blockers ?? [];
  const visibleUrlTextCount =
    integratedExperienceQaPacket?.emailHtmlVisibleUrlScan?.visibleUrlTextCount ?? null;
  const clickthroughVerified =
    integratedExperienceQaPacket?.gateMatrix
      ?.find((entry) => entry.id === 'cta_clickthrough_experience')
      ?.evidence?.clickthroughVerified === true;

  const painSignalCount = countMatches(text, [
    /descans/iu,
    /cansanc|agotad|sobrecarga|ruido|exigenc|tensi[oó]n|ansiedad|pausa/iu,
    /dormir|sue[ñn]o|energ[ií]a|claridad|cuerpo/iu,
  ]);
  const actionableSignalCount = countMatches(text, [
    /pr[aá]ctica|ejercicio|paso|pausa|respira|observa|escribe|pregunta|elige/iu,
    /haz|toma|mira|nombra|marca|responde|vuelve/iu,
    /minuto|breve|peque[ñn]a|simple/iu,
  ]);
  const brandDepthSignalCount = countMatches(text, [
    /descansar|descanso|cuerpo|claridad|inteligencia/iu,
    /un abrazo|alejandro|camino|pr[aá]ctica|vida/iu,
    /suave|honesto|humano|real|cuidado/iu,
  ]);
  const crmLearningSignalReady =
    assetManifest?.launch?.resourceType === 'quiz'
    || payloadManifest?.launch?.resourceType === 'quiz'
    || /source .* quiz|delivered .* quiz|resultado|recurso|se[ñn]al|crm/iu.test(text);

  const finalPublicLinksReady = assetManifest?.executiveSummary?.finalPublicLinksReady === true
    && correctionPreview?.executiveSummary?.finalPublicLinksReady === true;
  const redactedPayloadManifestReady = correctionPreview?.executiveSummary?.redactedPayloadManifestReady === true
    && payloadManifest?.executiveSummary?.payloadCount === 4
    && payloadManifest?.executiveSummary?.contentBlockCount >= 40;
  const shopifySourceComplete =
    shopifySourceScan.inspectedFileCount > 0 && shopifySourceScan.placeholderHitCount === 0;
  const ctaIntegrityReady =
    finalPublicLinksReady
    && clickthroughVerified === true
    && visibleUrlTextCount === 0
    && !integratedBlockers.includes('real_seed_clickthrough_not_verified');

  const gateMatrix = [
    gate({
      id: 'audience_pain_fit',
      label: 'Audience pain and promise fit',
      ready: painSignalCount >= 2,
      evidence: { painSignalCount },
      blockers: ['audience_pain_fit_not_explicit_enough'],
      recommendation: 'Sharpen the launch promise around the concrete fatigue/rest problem before CEO review.',
    }),
    gate({
      id: 'ethical_scope_and_claims',
      label: 'Ethical scope and claim safety',
      ready: forbiddenClaims.length === 0,
      evidence: {
        forbiddenClaimCount: forbiddenClaims.length,
        forbiddenClaims,
      },
      blockers: forbiddenClaims.map((claim) => `forbidden_claim_${claim}`),
      recommendation: 'Remove diagnostic, cure, guarantee or therapy-replacement claims.',
    }),
    gate({
      id: 'actionability',
      label: 'Concrete actionability',
      ready: actionableSignalCount >= 2,
      evidence: { actionableSignalCount },
      blockers: ['actionability_not_concrete_enough'],
      recommendation: 'Make the reader/player leave with a practical next step, not only an idea.',
    }),
    gate({
      id: 'asset_completeness',
      label: 'Asset completeness',
      ready: finalPublicLinksReady && redactedPayloadManifestReady && shopifySourceComplete,
      evidence: {
        finalPublicLinksReady,
        redactedPayloadManifestReady,
        inspectedShopifyFileCount: shopifySourceScan.inspectedFileCount,
        shopifyPlaceholderHitCount: shopifySourceScan.placeholderHitCount,
      },
      blockers: [
        finalPublicLinksReady ? null : 'final_public_links_not_ready',
        redactedPayloadManifestReady ? null : 'redacted_payload_manifest_not_ready',
        shopifySourceScan.inspectedFileCount > 0 ? null : 'shopify_local_source_not_inspected',
        shopifySourceScan.placeholderHitCount === 0 ? null : 'shopify_asset_placeholders_visible',
      ],
      recommendation: 'Finish the preview resource copy and remove internal placeholder language before CEO review.',
    }),
    gate({
      id: 'cta_and_delivery_integrity',
      label: 'CTA and delivery integrity',
      ready: ctaIntegrityReady,
      evidence: {
        finalPublicLinksReady,
        clickthroughVerified,
        visibleUrlTextCount,
      },
      blockers: [
        finalPublicLinksReady ? null : 'final_public_links_not_ready',
        clickthroughVerified ? null : 'real_seed_clickthrough_not_verified',
        visibleUrlTextCount === 0 ? null : 'visible_raw_url_text_present_in_local_html',
      ],
      recommendation: 'Verify the button path end-to-end in seed QA before asking for CEO review.',
    }),
    gate({
      id: 'brand_voice_depth',
      label: 'Brand voice and depth',
      ready: brandDepthSignalCount >= 2,
      evidence: { brandDepthSignalCount },
      blockers: ['brand_voice_depth_not_evident_enough'],
      recommendation: 'Strengthen the voice so the piece feels like Alejandro, not generic wellness copy.',
    }),
    gate({
      id: 'crm_learning_value',
      label: 'CRM learning value',
      ready: crmLearningSignalReady,
      evidence: {
        resourceType: assetManifest?.launch?.resourceType ?? payloadManifest?.launch?.resourceType ?? null,
        sourceGroupCandidate: payloadManifest?.launch?.sourceGroupCandidate ?? null,
        deliveredGroupCandidate: payloadManifest?.launch?.deliveredGroupCandidate ?? null,
      },
      blockers: ['crm_learning_value_not_mapped'],
      recommendation: 'Keep the launch tied to clean source/delivered signals so market resonance can become CRM evidence.',
    }),
  ];

  const blockers = unique(gateMatrix.flatMap((entry) => entry.blockers));
  const readyGateCount = gateMatrix.filter((entry) => entry.ready).length;
  const blockedGateCount = gateMatrix.length - readyGateCount;
  const productValueReviewPassed = blockedGateCount === 0 && safetyClosed(safety);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_report_only',
    generatedAt,
    ok: safetyClosed(safety),
    status: productValueReviewPassed
      ? 'product_value_review_ready_for_ceo_review_no_live_changes'
      : 'product_value_review_blocked_before_ceo_review_no_live_changes',
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
      productValueReviewPassed,
      ceoReviewValueReady: productValueReviewPassed,
      readyGateCount,
      blockedGateCount,
      blockerCount: blockers.length,
      blockers,
      shopifyPlaceholderHitCount: shopifySourceScan.placeholderHitCount,
      visibleUrlTextCount,
      clickthroughVerified,
      liveActionAllowedNow: false,
      canAskPilotDistributionDecisionNow: false,
      canAskPublicSendApprovalNow: false,
      nextSafeAction: productValueReviewPassed
        ? 'feed_integrated_experience_qa_before_ceo_review'
        : 'repair_value_and_delivery_assets_before_ceo_review',
    },
    gateMatrix,
    shopifySourceScan: {
      inspectedFileCount: shopifySourceScan.inspectedFileCount,
      placeholderHitCount: shopifySourceScan.placeholderHitCount,
      inspectedFiles: shopifySourceScan.inspectedFiles,
      hits: shopifySourceScan.hits,
    },
    sourceDigests: [],
    safety,
    hardStops: [
      'Do not treat Product/Value review as approval for any tester, audience, send, publish or workflow action.',
      'Do not ask for a distribution decision while product value or delivery integrity is blocked.',
      'Do not call MailerLite, Shopify or CRM live APIs from this packet.',
      'Exact URLs, recipients, raw IDs and tokens must remain unprinted.',
    ],
  };
};

const renderList = (items) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (report) => [
  '# MailerLite Mini-launch Product/Value Review Packet',
  '',
  `Generated: ${report.generatedAt}`,
  `Status: ${report.status}`,
  '',
  '## Executive Summary',
  '',
  `- Product/value review passed: ${report.executiveSummary.productValueReviewPassed}`,
  `- CEO review value ready: ${report.executiveSummary.ceoReviewValueReady}`,
  `- Ready gates: ${report.executiveSummary.readyGateCount}`,
  `- Blocked gates: ${report.executiveSummary.blockedGateCount}`,
  `- Blockers: ${report.executiveSummary.blockerCount}`,
  `- Shopify placeholder hits: ${report.executiveSummary.shopifyPlaceholderHitCount}`,
  `- Visible URL text hits: ${report.executiveSummary.visibleUrlTextCount}`,
  `- Click-through verified: ${report.executiveSummary.clickthroughVerified}`,
  `- Live action allowed now: ${report.executiveSummary.liveActionAllowedNow}`,
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
    integratedExperienceQaPacket,
  ] = await Promise.all([
    readJsonWithDigest(options.assetManifest, 'asset manifest, link lifecycle and Shopify source pointers'),
    readJsonWithDigest(options.correctionPreview, 'seed inbox correction preview and redacted local payload readiness'),
    readJsonWithDigest(options.payloadManifest, 'redacted email payload content and CRM learning hooks'),
    readOptionalJsonWithDigest(options.integratedExperienceQaPacket, 'integrated experience QA click-through and URL text evidence'),
  ]);

  const report = await buildProductValueReviewPacket({
    assetManifest: assetManifest.value,
    correctionPreview: correctionPreview.value,
    payloadManifest: payloadManifest.value,
    integratedExperienceQaPacket: integratedExperienceQaPacket.value,
  });

  report.sourceDigests = [
    assetManifest.digest,
    correctionPreview.digest,
    payloadManifest.digest,
    integratedExperienceQaPacket.digest,
    ...report.shopifySourceScan.inspectedFiles.map((source) => ({
      ...source,
      private: false,
      consultedFor: 'local Shopify source product/value completeness scan',
    })),
  ];

  await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    productValueReviewPassed: report.executiveSummary.productValueReviewPassed,
    ceoReviewValueReady: report.executiveSummary.ceoReviewValueReady,
    readyGateCount: report.executiveSummary.readyGateCount,
    blockedGateCount: report.executiveSummary.blockedGateCount,
    blockerCount: report.executiveSummary.blockerCount,
    blockers: report.executiveSummary.blockers,
    shopifyPlaceholderHitCount: report.executiveSummary.shopifyPlaceholderHitCount,
    visibleUrlTextCount: report.executiveSummary.visibleUrlTextCount,
    clickthroughVerified: report.executiveSummary.clickthroughVerified,
    liveActionAllowedNow: report.executiveSummary.liveActionAllowedNow,
    out: resolve(options.out),
    markdownOut: resolve(options.markdownOut),
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch product/value review packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildProductValueReviewPacket,
  parseArgs,
  renderMarkdown,
  scanSourceText,
};
