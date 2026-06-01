#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildHtmlForPayload,
  buildTargetPayloads,
} from './crm-vnext-mailerlite-mini-launch-email-asset-build.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-render-qa-packet-2026-05-28';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_ASSET_BUILD_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_dry_run_inteligencia_descansar_2026-05-28.json';
const DEFAULT_RENDER_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_render_qa_inteligencia_descansar_2026-05-28';
const MIN_RENDER_PREVIEW_BYTES = 5000;
const ACCEPTED_PAYLOAD_MANIFEST_STATUSES = new Set([
  'email_builder_payload_manifest_ready_no_live_changes',
  'email_builder_payload_manifest_redacted_after_seed_inbox_correction_preview_no_live_changes',
]);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-render-qa-packet.mjs [options]

Options:
  --payload-manifest <path>      Email builder payload manifest. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --asset-build-dry-run <path>   Email asset-build dry-run. Defaults to ${DEFAULT_ASSET_BUILD_DRY_RUN}
  --signature-asset-reference <path>
                                  Optional private local visual signature asset reference.
  --render-dir <path>            Directory for generated local HTML and Quick Look PNG previews. Defaults to ${DEFAULT_RENDER_DIR}
  --skip-render                  Write local HTML and run static QA only; do not call Quick Look
  --out <path>                   Write JSON packet
  --markdown-out <path>          Write Markdown packet
  --help                         Show this help

Local-only render QA packet for the four Inteligencia para descansar mini-launch
email payloads. It writes local HTML previews, can generate local Quick Look PNG
previews, and checks inert placeholder boundaries. It never edits MailerLite,
sends tests, reads or mutates subscribers, creates groups, changes workflows,
publishes Shopify, calls CRM live APIs, appends ledgers, writes cards/scoring,
or touches Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    assetBuildDryRun: DEFAULT_ASSET_BUILD_DRY_RUN,
    signatureAssetReference: null,
    renderDir: DEFAULT_RENDER_DIR,
    skipRender: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--asset-build-dry-run') options.assetBuildDryRun = argv[++index];
    else if (arg === '--signature-asset-reference') options.signatureAssetReference = argv[++index];
    else if (arg === '--render-dir') options.renderDir = argv[++index];
    else if (arg === '--skip-render') options.skipRender = true;
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const signatureAssetSummaryFor = (signatureAssetReference) => {
  const selected = signatureAssetReference?.selected ?? null;
  const srcSha256 = cleanString(selected?.srcSha256);
  const src = cleanString(selected?.src);
  if (!selected || !src || !srcSha256) {
    return {
      present: false,
      ready: false,
      selectedSrcSha256: null,
      host: null,
      width: null,
      height: null,
      exactSrcPrinted: false,
    };
  }
  return {
    present: true,
    ready: true,
    selectedSrcSha256: srcSha256,
    host: cleanString(selected.host),
    width: selected.width ?? null,
    height: selected.height ?? null,
    exactSrcPrinted: false,
  };
};

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const normalizeForScan = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const stripTags = (html) => String(html ?? '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const LINK_TOKEN_PATTERN = /(https?:\/\/|\{\{\s*(?:result_or_resource_link|practice_link|editorial_note_link)\s*\}\}|\b(?:result_or_resource_link|practice_link|editorial_note_link)_placeholder\b|final_public_link_ready_redacted:)/giu;

const classifyLinkTokenHit = (value) => {
  const text = String(value ?? '');
  if (/^https?:\/\//iu.test(text)) return 'url';
  if (/^\{\{/u.test(text)) return 'handlebar_link_token';
  if (/final_public_link_ready_redacted:/iu.test(text)) return 'redacted_final_link_token';
  if (/_placeholder\b/iu.test(text)) return 'placeholder_token';
  return 'link_token';
};

const linkTokenHits = (value) => [...String(value ?? '').matchAll(LINK_TOKEN_PATTERN)]
  .map((match) => classifyLinkTokenHit(match[0]));

const hrefValues = (html) => [...String(html ?? '').matchAll(/\shref\s*=\s*["']([^"']+)["']/giu)]
  .map((match) => cleanString(match[1]))
  .filter(Boolean);

const plainTextFallbackScan = (value) => {
  const hits = linkTokenHits(value);
  return {
    present: cleanString(value) != null,
    linkTokenHitCount: hits.length,
    linkTokenHitTypes: [...new Set(hits)],
    clean: hits.length === 0,
  };
};

const scanPublicText = (html) => {
  const text = stripTags(html);
  const normalized = normalizeForScan(text);
  const bannedTerms = [
    'lead magnet',
    'funnel',
    'embudo',
    'crm',
    'tag',
    'automatizacion',
    'automatización',
    'mailerlite',
    'workflow',
    'simulado',
    'launch_id',
    'subscriber',
    'suscriptor',
  ];
  const bannedTermHits = bannedTerms
    .map((term) => ({ term, count: normalized.split(normalizeForScan(term)).length - 1 }))
    .filter((hit) => hit.count > 0);

  return {
    text,
    chars: text.length,
    bannedTermHits,
    ok: bannedTermHits.length === 0,
  };
};

const defaultBlueHits = (html) => [
  '#09c',
  '#0099cc',
  '#0066ff',
  '#007bff',
  '#1a73e8',
  '#348eda',
].filter((color) => normalizeForScan(html).includes(color));

const expectedUrlPlaceholdersFor = (target) => (target.contentBlocks ?? [])
  .filter((block) => block?.type === 'cta')
  .map((block) => cleanString(block?.placeholder?.value) ?? cleanString(block?.destination))
  .filter(Boolean);

const hasReplyCtaFor = (target) => (target.contentBlocks ?? [])
  .some((block) => block?.type === 'reply_cta');

const rendersRawReplyDestination = (html) =>
  /<span class="placeholder-note">\s*reply\s*<\/span>/i.test(String(html ?? ''));

const buildStaticChecksForEmail = ({ target, html }) => {
  const publicTextScan = scanPublicText(html);
  const urlPlaceholders = expectedUrlPlaceholdersFor(target);
  const missingPlaceholders = urlPlaceholders.filter((placeholder) => !html.includes(placeholder));
  const visibleLinkTokenHits = linkTokenHits(publicTextScan.text);
  const fallbackScan = plainTextFallbackScan(target.plainTextFallback);
  const unsafeHrefValues = hrefValues(html).filter((value) => /^https?:\/\//iu.test(value));
  const blueHits = defaultBlueHits(html);
  const hasReplyCta = hasReplyCtaFor(target);
  const rawReplyDestinationRendered = hasReplyCta && rendersRawReplyDestination(html);
  const visualSignatureAssetVerified = /class="signature-image"/iu.test(html)
    && /data-signature-asset-sha256="[a-f0-9]{64}"/iu.test(html);
  const textSignatureFallbackPresent = !visualSignatureAssetVerified
    && html.includes('class="signature"')
    && html.includes('Alejandro');
  const checks = [
    {
      id: 'html_document_basics',
      status: /<!doctype html>/i.test(html) && /<html[^>]+lang="es"/i.test(html) && /viewport/i.test(html)
        ? 'green'
        : 'red',
      evidence: 'doctype, lang=es and viewport meta are present.',
    },
    {
      id: 'brand_typography',
      status: html.includes('font-family: Poppins') && html.includes('font-family: Georgia')
        ? 'green'
        : 'red',
      evidence: 'Poppins body and Georgia editorial accent are specified.',
    },
    {
      id: 'brand_color_surface',
      status: html.includes('#F4F7FA') && html.includes('#FFFFFF') && html.includes('#474747') && html.includes('#2F3E63')
        ? 'green'
        : 'red',
      evidence: 'Outer background, white content surface, body text and sober CTA color are specified.',
    },
    {
      id: 'cta_not_default_mailerlite_blue',
      status: blueHits.length === 0 && html.includes('background: #2F3E63') ? 'green' : 'red',
      evidence: blueHits.length
        ? `Default-blue-like hits: ${blueHits.join(', ')}`
        : 'CTA uses #2F3E63 and no common default blue values were found.',
    },
    {
      id: 'mobile_constraints',
      status: html.includes('@media (max-width: 640px)') && html.includes('max-width: 640px') && html.includes('padding: 36px 24px 32px')
        ? 'green'
        : 'yellow_mobile_review',
      evidence: 'Mobile media query, 640px container and mobile padding are present.',
    },
    {
      id: 'no_script_or_live_link',
      status: !/<script/i.test(html) && unsafeHrefValues.length === 0 ? 'green' : 'red',
      evidence: `Local preview contains no script tag and no exact http(s) href; exact-live href count=${unsafeHrefValues.length}.`,
    },
    {
      id: 'placeholder_boundary',
      status: missingPlaceholders.length === 0 && (urlPlaceholders.length > 0 || hasReplyCta)
        ? 'green'
        : 'red',
      evidence: urlPlaceholders.length
        ? `URL placeholders present=${urlPlaceholders.length}; missing=${missingPlaceholders.length}.`
        : hasReplyCta
          ? 'Reply CTA is text-only and does not require a URL placeholder.'
        : 'No CTA boundary found.',
    },
    {
      id: 'cta_destination_not_visible_text',
      status: visibleLinkTokenHits.length === 0 ? 'green' : 'red',
      evidence: `Visible URL/link token hits in reader-facing text=${visibleLinkTokenHits.length}.`,
    },
    {
      id: 'plain_text_fallback_no_visible_link_token',
      status: fallbackScan.clean ? 'green' : 'red',
      evidence: `Plain-text fallback link token hits=${fallbackScan.linkTokenHitCount}.`,
    },
    {
      id: 'reply_cta_no_raw_destination_token',
      status: hasReplyCta && rawReplyDestinationRendered ? 'red' : 'green',
      evidence: hasReplyCta
        ? `Reply CTA raw destination token rendered=${rawReplyDestinationRendered}.`
        : 'No reply CTA in this email.',
    },
    {
      id: 'public_copy_boundary',
      status: publicTextScan.ok ? 'green' : 'red',
      evidence: `Internal term hits=${publicTextScan.bannedTermHits.length}.`,
    },
    {
      id: 'signature_identity',
      status: visualSignatureAssetVerified
        ? 'green'
        : textSignatureFallbackPresent
        ? 'yellow_text_signature_only'
        : 'red',
      evidence: visualSignatureAssetVerified
        ? 'Local draft references the visual signature asset through a private asset digest; exact asset URL is not printed in this packet.'
        : 'Local draft has text signature; real visual signature asset is still MailerLite/Brand QA dependent.',
    },
  ];

  return {
    checks,
    publicTextScan,
    expectedUrlPlaceholders: urlPlaceholders,
    missingPlaceholders,
    visibleLinkTokenHitCount: visibleLinkTokenHits.length,
    visibleLinkTokenHitTypes: [...new Set(visibleLinkTokenHits)],
    plainTextFallbackScan: fallbackScan,
    hasReplyCta,
    rawReplyDestinationRendered,
    visualSignatureAssetVerified,
    signatureFallbackPresent: textSignatureFallbackPresent,
    greenCount: checks.filter((check) => check.status === 'green').length,
    redCount: checks.filter((check) => check.status === 'red').length,
    yellowCount: checks.filter((check) => String(check.status).startsWith('yellow')).length,
    staticGreenEnoughForLocalRender: checks.every((check) => check.status === 'green' || String(check.status).startsWith('yellow')),
  };
};

const pathExists = async (path) => {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
};

const dimensionsFromSips = async (imagePath) => {
  try {
    const { stdout } = await execFileAsync('/usr/bin/sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imagePath], { timeout: 10000 });
    const width = Number(stdout.match(/pixelWidth:\s*(\d+)/)?.[1] ?? 0);
    const height = Number(stdout.match(/pixelHeight:\s*(\d+)/)?.[1] ?? 0);
    return { width, height, ok: width > 0 && height > 0 };
  } catch (error) {
    return { width: null, height: null, ok: false, error: error.message };
  }
};

const renderQuickLookPreview = async ({ htmlPath, renderDir }) => {
  const fullHtml = resolve(htmlPath);
  const fullRenderDir = resolve(renderDir);
  await mkdir(fullRenderDir, { recursive: true });
  const expectedPath = join(fullRenderDir, `${basename(fullHtml)}.png`);

  try {
    await execFileAsync('/usr/bin/qlmanage', ['-t', '-s', '1200', '-o', fullRenderDir, fullHtml], { timeout: 20000 });
    const exists = await pathExists(expectedPath);
    const dimensions = exists ? await dimensionsFromSips(expectedPath) : { width: null, height: null, ok: false };
    const fileSizeBytes = exists ? (await stat(expectedPath)).size : 0;
    const fileSizeOk = fileSizeBytes >= MIN_RENDER_PREVIEW_BYTES;
    return {
      attempted: true,
      status: exists && dimensions.ok && fileSizeOk ? 'rendered' : 'render_missing_or_unreadable',
      path: exists ? expectedPath : null,
      dimensions,
      fileSizeBytes,
      fileSizeOk,
      minFileSizeBytes: MIN_RENDER_PREVIEW_BYTES,
    };
  } catch (error) {
    return {
      attempted: true,
      status: 'render_failed',
      path: null,
      dimensions: { width: null, height: null, ok: false },
      fileSizeBytes: 0,
      fileSizeOk: false,
      minFileSizeBytes: MIN_RENDER_PREVIEW_BYTES,
      error: error.message,
    };
  }
};

const slugify = (value) => String(value ?? 'email')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '_')
  .replace(/^_+|_+$/g, '')
  .slice(0, 80) || 'email';

const htmlFileNameFor = (target) => `email_${String(target.step).padStart(2, '0')}_${slugify(target.role ?? target.name)}.html`;

const writeLocalHtmlForTargets = async ({ payloadManifest, renderDir, signatureAssetReference = null }) => {
  const fullRenderDir = resolve(renderDir);
  await mkdir(fullRenderDir, { recursive: true });
  const targets = buildTargetPayloads(payloadManifest);
  const generatedEmails = [];

  for (const target of targets) {
    const html = buildHtmlForPayload(target, { signatureAssetReference });
    const htmlPath = join(fullRenderDir, htmlFileNameFor(target));
    await writeFile(htmlPath, html, 'utf8');
    generatedEmails.push({
      step: target.step,
      role: target.role,
      name: target.name,
      subject: target.subject,
      htmlPath,
      html,
      staticQa: buildStaticChecksForEmail({ target, html }),
    });
  }

  return generatedEmails;
};

const buildSourceReadiness = ({ payloadManifest, assetBuildDryRun }) => {
  const issues = [];
  if (!ACCEPTED_PAYLOAD_MANIFEST_STATUSES.has(payloadManifest?.status)) {
    issues.push(`payload_manifest_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (payloadManifest?.approvalBoundary?.manifestIsApprovalByItself !== false) {
    issues.push('payload_manifest_self_authorizes_unexpectedly');
  }
  if (payloadManifest?.approvalBoundary?.exactAssetBuildApprovalStillRequired !== true) {
    issues.push('payload_manifest_missing_exact_approval_gate');
  }
  if (payloadManifest?.approvalBoundary?.canExecuteBuilderNow !== false) issues.push('payload_manifest_builder_gate_open');
  if (payloadManifest?.approvalBoundary?.canSendNow !== false) issues.push('payload_manifest_send_gate_open');
  if (payloadManifest?.approvalBoundary?.canAttachWorkflowNow !== false) issues.push('payload_manifest_workflow_gate_open');
  if (payloadManifest?.approvalBoundary?.canReadOrAssignSubscribersNow !== false) issues.push('payload_manifest_subscriber_gate_open');
  if (payloadManifest?.approvalBoundary?.canCreateGroupsNow !== false) issues.push('payload_manifest_group_gate_open');
  if (!Array.isArray(payloadManifest?.payloads) || payloadManifest.payloads.length !== 4) {
    issues.push(`payload_manifest_expected_4_payloads:${payloadManifest?.payloads?.length ?? 'missing'}`);
  }
  if (assetBuildDryRun?.status !== 'dry_run_ready_for_exact_asset_build_approval') {
    issues.push(`asset_build_dry_run_not_ready:${assetBuildDryRun?.status ?? 'missing'}`);
  }
  if ((assetBuildDryRun?.freshScan?.conflictCount ?? 0) > 0) issues.push('asset_build_dry_run_has_campaign_conflicts');
  if ((assetBuildDryRun?.assetMutations ?? []).length !== 0) issues.push('asset_build_dry_run_reports_asset_mutations');
  if (assetBuildDryRun?.safety?.mailerLiteMutationsPerformed !== false) issues.push('asset_build_dry_run_reports_mailerlite_mutation');
  if (assetBuildDryRun?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('asset_build_dry_run_reports_asset_create_or_edit');
  if (assetBuildDryRun?.safety?.sendsPerformed !== false) issues.push('asset_build_dry_run_reports_send');
  if (assetBuildDryRun?.safety?.subscribersRead !== false) issues.push('asset_build_dry_run_reports_subscriber_read');
  if (assetBuildDryRun?.safety?.groupsCreatedOrAssigned !== false) issues.push('asset_build_dry_run_reports_group_create_or_assignment');

  return {
    ok: issues.length === 0,
    issues,
    payloadManifestStatus: payloadManifest?.status ?? null,
    assetBuildDryRunStatus: assetBuildDryRun?.status ?? null,
  };
};

const buildSafety = ({ quickLookUsed = false, htmlWrittenCount = 0 } = {}) => ({
  localOnly: true,
  reportsAndLocalPreviewOnly: true,
  htmlWrittenCount,
  quickLookUsed,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  sendsPerformed: false,
  schedulesPerformed: false,
  campaignDeletesPerformed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  groupsCreatedOrAssigned: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  onboardingTouched: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const renderPreviewNonEmptyFor = (renderPreview) => renderPreview?.status === 'rendered'
  && renderPreview?.dimensions?.ok === true
  && renderPreview?.fileSizeOk !== false
  && (renderPreview?.fileSizeBytes === undefined || renderPreview.fileSizeBytes >= MIN_RENDER_PREVIEW_BYTES);

const buildPacket = ({
  payloadManifest,
  assetBuildDryRun,
  signatureAssetReference = null,
  generatedEmails,
  renderPreviews = [],
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
  renderDir = DEFAULT_RENDER_DIR,
}) => {
  const sourceReadiness = buildSourceReadiness({ payloadManifest, assetBuildDryRun });
  const previewByHtmlPath = new Map(renderPreviews.map((preview) => [preview.htmlPath, preview.renderPreview]));
  const emailQa = generatedEmails.map((email) => {
    const renderPreview = previewByHtmlPath.get(email.htmlPath) ?? {
      attempted: false,
      status: 'skipped',
      path: null,
      dimensions: { width: null, height: null, ok: false },
      fileSizeBytes: 0,
      fileSizeOk: false,
      minFileSizeBytes: MIN_RENDER_PREVIEW_BYTES,
    };
    const renderPreviewNonEmpty = renderPreviewNonEmptyFor(renderPreview);
    return {
      step: email.step,
      role: email.role,
      name: email.name,
      subject: email.subject,
      htmlPath: email.htmlPath,
      staticQa: email.staticQa,
      renderPreview,
      renderPreviewNonEmpty,
      localRenderReady: email.staticQa.staticGreenEnoughForLocalRender && renderPreviewNonEmpty,
    };
  });
  const emailCount = emailQa.length;
  const htmlWrittenCount = generatedEmails.length;
  const renderPreviewNonEmptyCount = emailQa.filter((email) => email.renderPreviewNonEmpty).length;
  const staticGreenCount = emailQa.filter((email) => email.staticQa.staticGreenEnoughForLocalRender).length;
  const redCheckCount = emailQa.reduce((sum, email) => sum + email.staticQa.redCount, 0);
  const visibleLinkTokenHitCount = emailQa.reduce((sum, email) => sum + (email.staticQa.visibleLinkTokenHitCount ?? 0), 0);
  const plainTextFallbackCleanCount = emailQa.filter((email) => email.staticQa.plainTextFallbackScan?.clean === true).length;
  const plainTextFallbackLinkTokenHitCount = emailQa
    .reduce((sum, email) => sum + (email.staticQa.plainTextFallbackScan?.linkTokenHitCount ?? 0), 0);
  const visualSignatureAssetReadyCount = emailQa
    .filter((email) => email.staticQa.visualSignatureAssetVerified === true).length;
  const signatureFallbackCount = emailQa
    .filter((email) => email.staticQa.signatureFallbackPresent === true).length;
  const signatureAssetReferenceSummary = signatureAssetSummaryFor(signatureAssetReference);
  const localRenderReady = sourceReadiness.ok
    && emailCount === 4
    && staticGreenCount === 4
    && renderPreviewNonEmptyCount === 4;
  const staticGreenEnough = sourceReadiness.ok && emailCount === 4 && staticGreenCount === 4;
  const status = localRenderReady
    ? 'mini_launch_email_render_qa_green_no_live_changes'
    : staticGreenEnough
      ? 'mini_launch_email_render_qa_static_green_render_missing_no_live_changes'
      : 'mini_launch_email_render_qa_needs_fixes_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_email_render_qa_packet',
    generatedAt,
    ok: true,
    status,
    launch: payloadManifest?.launch ?? assetBuildDryRun?.launch ?? null,
    executiveSummary: {
      payloadManifestStatus: payloadManifest?.status ?? null,
      assetBuildDryRunStatus: assetBuildDryRun?.status ?? null,
      emailCount,
      htmlWrittenCount,
      staticGreenCount,
      renderPreviewNonEmptyCount,
      redCheckCount,
      visibleLinkTokenHitCount,
      plainTextFallbackCleanCount,
      plainTextFallbackLinkTokenHitCount,
      visualSignatureAssetReadyCount,
      signatureFallbackCount,
      localRenderReady,
      publicUseReady: false,
      mailerLiteBuilderReady: false,
      seedSendReady: false,
      openLiveMutationGateCount: 0,
      nextBestMove: localRenderReady
        ? 'Use this local render QA as evidence before any later exact MailerLite builder draft approval; still verify real MailerLite render before seed send or public use.'
        : 'Fix static/render blockers before using the payloads as MailerLite builder input.',
    },
    inputs: {
      payloadManifestPath: sourceDigests.find((source) => source.consultedFor.includes('payload manifest'))?.path ?? null,
      assetBuildDryRunPath: sourceDigests.find((source) => source.consultedFor.includes('asset-build dry-run'))?.path ?? null,
      signatureAssetReference: signatureAssetReferenceSummary,
      renderDir: resolve(renderDir),
    },
    sourceReadiness,
    emailQa,
    remainingBeforePublicUse: [
      'Create or edit the four MailerLite drafts only after exact asset-build approval.',
      'Replace inert placeholders with exact approved URLs only under a later specific boundary.',
      'Verify the real MailerLite builder render on mobile and desktop.',
      'Send any seed/test email only after separate exact seed-send approval names recipient and scope.',
      'Keep workflows, subscribers, Shopify publish, CRM writes, ledgers, cards, scoring and Fact Store closed.',
    ],
    approvalBoundary: {
      allowedNow: [
        'Review generated local HTML files and local Quick Look PNG previews.',
        'Use this packet as no-live evidence for asset-build approval review.',
      ],
      closedNow: [
        'No MailerLite builder edit.',
        'No MailerLite test send.',
        'No workflow or automation activation.',
        'No subscriber or group mutation.',
        'No Shopify publish or CRM write.',
        'No ledger, card, scoring or Fact Store write.',
      ],
    },
    safety: buildSafety({
      quickLookUsed: emailQa.some((email) => email.renderPreview?.attempted === true),
      htmlWrittenCount,
    }),
    sourceDigests,
  };
};

const loadSources = async (options) => {
  const [payloadManifestContent, assetBuildDryRunContent, signatureAssetReferenceContent] = await Promise.all([
    readText(options.payloadManifest),
    readText(options.assetBuildDryRun),
    options.signatureAssetReference ? readText(options.signatureAssetReference) : null,
  ]);
  const signatureAssetReference = signatureAssetReferenceContent
    ? JSON.parse(signatureAssetReferenceContent)
    : null;
  const sourceDigests = [
    sourceDigest(options.payloadManifest, payloadManifestContent, 'mini-launch email builder payload manifest and approval boundary'),
    sourceDigest(options.assetBuildDryRun, assetBuildDryRunContent, 'mini-launch email asset-build dry-run and fresh campaign scan'),
  ];
  if (options.signatureAssetReference) {
    sourceDigests.push(sourceDigest(
      options.signatureAssetReference,
      signatureAssetReferenceContent,
      'private visual signature asset reference; exact URL intentionally omitted from packet',
    ));
  }
  return {
    values: {
      payloadManifest: JSON.parse(payloadManifestContent),
      assetBuildDryRun: JSON.parse(assetBuildDryRunContent),
      signatureAssetReference,
    },
    sourceDigests,
  };
};

const buildPacketFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  const generatedEmails = await writeLocalHtmlForTargets({
    payloadManifest: values.payloadManifest,
    renderDir: options.renderDir,
    signatureAssetReference: values.signatureAssetReference,
  });
  const renderPreviews = [];

  for (const email of generatedEmails) {
    const renderPreview = options.skipRender
      ? {
          attempted: false,
          status: 'skipped',
          path: null,
          dimensions: { width: null, height: null, ok: false },
          fileSizeBytes: 0,
          fileSizeOk: false,
          minFileSizeBytes: MIN_RENDER_PREVIEW_BYTES,
        }
      : await renderQuickLookPreview({ htmlPath: email.htmlPath, renderDir: options.renderDir });
    renderPreviews.push({ htmlPath: email.htmlPath, renderPreview });
  }

  return buildPacket({
    ...values,
    generatedEmails,
    renderPreviews,
    sourceDigests,
    renderDir: options.renderDir,
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-launch Email Render QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    `Local render ready: ${packet.executiveSummary.localRenderReady}`,
    `Public use ready: ${packet.executiveSummary.publicUseReady}`,
    `MailerLite builder ready: ${packet.executiveSummary.mailerLiteBuilderReady}`,
    `Seed send ready: ${packet.executiveSummary.seedSendReady}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete genera y revisa previews locales de los 4 emails de Inteligencia para descansar. No toca MailerLite, no envia pruebas y no autoriza uso publico.',
    '',
    '## Summary',
    '',
    `- Email count: ${packet.executiveSummary.emailCount}`,
    `- HTML written: ${packet.executiveSummary.htmlWrittenCount}`,
    `- Static green count: ${packet.executiveSummary.staticGreenCount}`,
    `- Render preview non-empty count: ${packet.executiveSummary.renderPreviewNonEmptyCount}`,
    `- Red check count: ${packet.executiveSummary.redCheckCount}`,
    `- Visible URL/link token hits: ${packet.executiveSummary.visibleLinkTokenHitCount}`,
    `- Plain-text fallback clean count: ${packet.executiveSummary.plainTextFallbackCleanCount}`,
    `- Plain-text fallback link token hits: ${packet.executiveSummary.plainTextFallbackLinkTokenHitCount}`,
    `- Visual signature asset ready count: ${packet.executiveSummary.visualSignatureAssetReadyCount}`,
    `- Signature fallback count: ${packet.executiveSummary.signatureFallbackCount}`,
    `- Open live mutation gates: ${packet.executiveSummary.openLiveMutationGateCount}`,
    '',
    '## Email QA',
    '',
  ];

  for (const email of packet.emailQa) {
    lines.push(
      `### E${String(email.step).padStart(2, '0')} - ${email.role}`,
      '',
      `- Name: ${email.name}`,
      `- Subject: ${email.subject}`,
      `- HTML: ${email.htmlPath}`,
      `- Render status: ${email.renderPreview?.status ?? 'unknown'}`,
      `- Render preview: ${email.renderPreview?.path ?? 'none'}`,
      `- Width: ${email.renderPreview?.dimensions?.width ?? 'unknown'}`,
      `- Height: ${email.renderPreview?.dimensions?.height ?? 'unknown'}`,
      `- File size: ${email.renderPreview?.fileSizeBytes ?? 'unknown'}`,
      `- File size ok: ${email.renderPreview?.fileSizeOk ?? 'unknown'}`,
      `- Static green enough: ${email.staticQa.staticGreenEnoughForLocalRender}`,
      `- Local render ready: ${email.localRenderReady}`,
      '',
      'Checks:',
    );
    for (const check of email.staticQa.checks) {
      lines.push(`- ${check.id}: ${check.status}; ${check.evidence}`);
    }
    lines.push('');
  }

  lines.push('## Source Readiness', '');
  lines.push(`- Source ready: ${packet.sourceReadiness.ok}`);
  lines.push(`- Payload manifest: ${packet.sourceReadiness.payloadManifestStatus ?? 'unknown'}`);
  lines.push(`- Asset-build dry-run: ${packet.sourceReadiness.assetBuildDryRunStatus ?? 'unknown'}`);
  if (packet.sourceReadiness.issues.length) {
    lines.push('- Issues:');
    lines.push(renderList(packet.sourceReadiness.issues));
  }

  lines.push('', '## Remaining Before Public Use', '');
  lines.push(renderList(packet.remainingBeforePublicUse));

  lines.push('', '## Approval Boundary', '');
  lines.push('Allowed now:');
  lines.push(renderList(packet.approvalBoundary.allowedNow));
  lines.push('');
  lines.push('Closed now:');
  lines.push(renderList(packet.approvalBoundary.closedNow));

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) {
    lines.push(`- ${source.path} (${source.consultedFor})`);
  }

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Solo HTML local, reporte y preview local.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return `${lines.join('\n')}\n`;
};

const writeText = async (path, value) => {
  const fullPath = resolve(path);
  await mkdir(dirname(fullPath), { recursive: true });
  await writeFile(fullPath, value, 'utf8');
};

const writeJson = async (path, value) => writeText(path, `${JSON.stringify(value, null, 2)}\n`);

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
    localRenderReady: packet.executiveSummary.localRenderReady,
    emailCount: packet.executiveSummary.emailCount,
    renderPreviewNonEmptyCount: packet.executiveSummary.renderPreviewNonEmptyCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    publicUseReady: packet.executiveSummary.publicUseReady,
    mailerLiteBuilderReady: packet.executiveSummary.mailerLiteBuilderReady,
    seedSendReady: packet.executiveSummary.seedSendReady,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email render QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPacket,
  buildPacketFromFiles,
  buildSafety,
  buildSourceReadiness,
  buildStaticChecksForEmail,
  parseArgs,
  renderMarkdown,
  scanPublicText,
  writeLocalHtmlForTargets,
};
