#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { access, mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-email-render-qa-packet-2026-05-27';

const DEFAULT_CORRECTION_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_HTML = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_corrected_draft_2026-05-27.html';
const DEFAULT_RENDER_DIR = '/Users/alejandrogomez/Documents/Mantis-Reports/brujula_email1_render_qa_2026-05-27';
const MIN_RENDER_PREVIEW_BYTES = 5000;

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-email-render-qa-packet.mjs [options]

Options:
  --correction-packet <path>  Brújula Email 1 correction packet JSON. Defaults to ${DEFAULT_CORRECTION_PACKET}
  --html <path>               Corrected local HTML draft. Defaults to ${DEFAULT_HTML}
  --render-dir <path>         Directory for local Quick Look PNG preview. Defaults to ${DEFAULT_RENDER_DIR}
  --skip-render               Do static QA only; do not call Quick Look
  --out <path>                Write JSON packet
  --markdown-out <path>       Write Markdown packet
  --help                      Show this help

Local-only render QA packet for Brújula Email 1. It checks the corrected HTML
and can generate a local Quick Look PNG preview. It never edits MailerLite,
sends tests, reads or mutates subscribers, changes workflows, publishes Shopify,
appends ledgers, writes CRM cards/scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    correctionPacket: DEFAULT_CORRECTION_PACKET,
    html: DEFAULT_HTML,
    renderDir: DEFAULT_RENDER_DIR,
    skipRender: false,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--correction-packet') options.correctionPacket = argv[++index];
    else if (arg === '--html') options.html = argv[++index];
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

const scanPublicText = (html) => {
  const text = stripTags(html);
  const normalized = normalizeForScan(text);
  const bannedTerms = [
    'lead magnet',
    'funnel',
    'embudo',
    'captura',
    'crm',
    'tag',
    'automatizacion',
    'automatización',
    'mailerlite',
    'workflow',
    'simulado',
    'review',
    'launch_id',
  ];
  const bannedTermHits = bannedTerms
    .map((term) => ({ term, count: normalized.split(normalizeForScan(term)).length - 1 }))
    .filter((hit) => hit.count > 0);

  return {
    text,
    chars: text.length,
    bannedTermHits,
    sometimesFormulaCount: (normalized.match(/\ba veces\b/g) ?? []).length,
    ok: bannedTermHits.length === 0 && !(normalized.match(/\ba veces\b/g) ?? []).length,
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

const buildStaticChecks = (html) => {
  const publicTextScan = scanPublicText(html);
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
      status: defaultBlueHits(html).length === 0 && html.includes('background: #2F3E63')
        ? 'green'
        : 'red',
      evidence: defaultBlueHits(html).length
        ? `Default-blue-like hits: ${defaultBlueHits(html).join(', ')}`
        : 'CTA uses #2F3E63 and no common default blue values were found.',
    },
    {
      id: 'mobile_constraints',
      status: html.includes('@media (max-width: 640px)') && html.includes('max-width: 640px') && html.includes('padding: 36px 24px 32px')
        ? 'green'
        : 'yellow',
      evidence: 'Mobile media query, 640px container and mobile padding are present.',
    },
    {
      id: 'public_copy_boundary',
      status: publicTextScan.ok ? 'green' : 'red',
      evidence: `Internal term hits=${publicTextScan.bannedTermHits.length}; "a veces" count=${publicTextScan.sometimesFormulaCount}.`,
    },
    {
      id: 'signature_identity',
      status: html.includes('class="signature"') && html.includes('Alejandro')
        ? 'yellow_text_signature_only'
        : 'red',
      evidence: 'Local draft has text signature; real visual signature asset is still MailerLite/Brand QA dependent.',
    },
  ];

  return {
    checks,
    publicTextScan,
    greenCount: checks.filter((check) => check.status === 'green').length,
    redCount: checks.filter((check) => check.status === 'red').length,
    yellowCount: checks.filter((check) => String(check.status).startsWith('yellow')).length,
    staticGreenEnoughForLocalRender: checks.every((check) => check.status === 'green' || check.status === 'yellow_text_signature_only'),
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

const buildSafety = ({ quickLookUsed = false } = {}) => ({
  localOnly: true,
  reportsAndLocalPreviewOnly: true,
  quickLookUsed,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupsCreated: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  sendsPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildPacket = ({
  correctionPacket,
  correctionPacketPath = null,
  html,
  htmlPath,
  renderPreview,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const staticQa = buildStaticChecks(html);
  const correctionReady = correctionPacket?.status === 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes';
  const renderPreviewNonEmpty = renderPreview?.status === 'rendered'
    && renderPreview?.dimensions?.ok === true
    && renderPreview?.fileSizeOk !== false
    && (renderPreview?.fileSizeBytes === undefined || renderPreview.fileSizeBytes >= MIN_RENDER_PREVIEW_BYTES);
  const localRenderReady = correctionReady
    && staticQa.staticGreenEnoughForLocalRender
    && renderPreviewNonEmpty;
  const status = localRenderReady
    ? 'brujula_email1_local_render_qa_green_no_live_changes'
    : correctionReady && staticQa.staticGreenEnoughForLocalRender
      ? 'brujula_email1_static_qa_green_render_missing_no_live_changes'
      : 'brujula_email1_render_qa_needs_fixes_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_brujula_email_render_qa_packet',
    generatedAt,
    ok: true,
    status,
    executiveSummary: {
      correctionPacketStatus: correctionPacket?.status ?? null,
      staticGreenEnoughForLocalRender: staticQa.staticGreenEnoughForLocalRender,
      renderPreviewNonEmpty,
      localRenderReady,
      renderStatus: renderPreview?.status ?? 'not_attempted',
      publicUseReady: false,
      testSendReady: false,
      nextBestMove: localRenderReady
        ? 'Use this local render QA as evidence before any later exact MailerLite builder/test-send approval; still verify real MailerLite render before public use.'
        : 'Fix static/render blockers before using the corrected draft as MailerLite builder input.',
    },
    inputs: {
      htmlPath: resolve(htmlPath),
      correctionPacketPath: correctionPacketPath ? resolve(correctionPacketPath) : null,
    },
    renderPreview,
    staticQa,
    remainingBeforePublicUse: [
      'Build or paste this draft into MailerLite only after exact approval.',
      'Verify the real MailerLite render on mobile and desktop.',
      'Add or explicitly waive the real Alejandro visual signature asset.',
      'Send a test email only after exact test-only approval names recipient and scope.',
      'Keep workflow activation, audience sends, Shopify publish and CRM writes closed.',
    ],
    approvalBoundary: {
      allowedNow: [
        'Review local HTML and local Quick Look PNG preview.',
        'Use this packet as no-live implementation guidance for Brand/Web/CRM review.',
      ],
      closedNow: [
        'No MailerLite builder edit.',
        'No MailerLite test send.',
        'No workflow activation.',
        'No subscriber or group mutation.',
        'No Shopify publish or CRM write.',
      ],
    },
    safety: buildSafety({ quickLookUsed: renderPreview?.attempted === true }),
    sourceDigests,
  };
};

const loadSources = async (options) => {
  const [correctionContent, html] = await Promise.all([
    readText(options.correctionPacket),
    readText(options.html),
  ]);
  return {
    values: {
      correctionPacket: JSON.parse(correctionContent),
      html,
    },
    sourceDigests: [
      sourceDigest(options.correctionPacket, correctionContent, 'corrected Brújula Email 1 packet and safety boundary'),
      sourceDigest(options.html, html, 'corrected local HTML draft to render-check'),
    ],
  };
};

const buildPacketFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
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
    : await renderQuickLookPreview({ htmlPath: options.html, renderDir: options.renderDir });

  return buildPacket({
    ...values,
    correctionPacketPath: options.correctionPacket,
    htmlPath: options.html,
    renderPreview,
    sourceDigests,
  });
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Brújula Email 1 Render QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    `Local render ready: ${packet.executiveSummary.localRenderReady}`,
    `Public use ready: ${packet.executiveSummary.publicUseReady}`,
    `Test send ready: ${packet.executiveSummary.testSendReady}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete revisa el HTML local corregido de Brújula Email 1 y genera una vista PNG local con Quick Look. No toca MailerLite, no envia pruebas y no autoriza uso publico.',
    '',
    '## Render Preview',
    '',
    `- Status: ${packet.renderPreview?.status ?? 'unknown'}`,
    `- Path: ${packet.renderPreview?.path ?? 'none'}`,
    `- Width: ${packet.renderPreview?.dimensions?.width ?? 'unknown'}`,
    `- Height: ${packet.renderPreview?.dimensions?.height ?? 'unknown'}`,
    `- File size: ${packet.renderPreview?.fileSizeBytes ?? 'unknown'}`,
    `- File size ok: ${packet.renderPreview?.fileSizeOk ?? 'unknown'}`,
    '',
    '## Static QA',
    '',
    `- Green: ${packet.staticQa.greenCount}`,
    `- Yellow: ${packet.staticQa.yellowCount}`,
    `- Red: ${packet.staticQa.redCount}`,
    `- Static green enough for local render: ${packet.staticQa.staticGreenEnoughForLocalRender}`,
  ];

  for (const check of packet.staticQa.checks) {
    lines.push(`- ${check.id}: ${check.status}; ${check.evidence}`);
  }

  lines.push('', '## Public Copy Boundary', '');
  lines.push(`- Chars: ${packet.staticQa.publicTextScan.chars}`);
  lines.push(`- Banned internal term hits: ${packet.staticQa.publicTextScan.bannedTermHits.length}`);
  lines.push(`- "a veces" formula count: ${packet.staticQa.publicTextScan.sometimesFormulaCount}`);

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
  lines.push('- Solo reporte y preview local.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

  return lines.join('\n');
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
    renderStatus: packet.executiveSummary.renderStatus,
    renderPreviewNonEmpty: packet.executiveSummary.renderPreviewNonEmpty,
    renderPath: packet.renderPreview?.path ?? null,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    publicUseReady: packet.executiveSummary.publicUseReady,
    testSendReady: packet.executiveSummary.testSendReady,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula email render QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPacket,
  buildPacketFromFiles,
  buildSafety,
  buildStaticChecks,
  parseArgs,
  renderMarkdown,
  scanPublicText,
};
