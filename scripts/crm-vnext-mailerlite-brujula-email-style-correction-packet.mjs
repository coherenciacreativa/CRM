#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-email-style-correction-packet-2026-05-27';

const DEFAULT_EMAIL_STYLE_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_qa_packet_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_EMAIL_EVIDENCE = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/EMAIL_BRAND_EVIDENCE_REPORT_2026-05-11.md';
const DEFAULT_BRUJULA_PROPOSAL = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/BRUJULA_EMAIL_CANON_PROPOSAL_2026-05-11.md';
const DEFAULT_BRAND_ASSET_REGISTRY = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/brand_identity_asset_registry.md';
const DEFAULT_PLAIN_TEXT_OUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_corrected_draft_2026-05-27.txt';
const DEFAULT_HTML_OUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_corrected_draft_2026-05-27.html';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-email-style-correction-packet.mjs [options]

Options:
  --email-style-qa <path>       Brújula email style QA JSON. Defaults to ${DEFAULT_EMAIL_STYLE_QA}
  --email-style-canon <path>    Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --email-evidence <path>       Brand email evidence report. Defaults to ${DEFAULT_EMAIL_EVIDENCE}
  --brujula-proposal <path>     Brújula email canon proposal. Defaults to ${DEFAULT_BRUJULA_PROPOSAL}
  --brand-asset-registry <path> Brand asset registry. Defaults to ${DEFAULT_BRAND_ASSET_REGISTRY}
  --plain-text-out <path>       Write public plain-text draft. Defaults to ${DEFAULT_PLAIN_TEXT_OUT}
  --html-out <path>             Write local HTML preview. Defaults to ${DEFAULT_HTML_OUT}
  --out <path>                  Write JSON packet
  --markdown-out <path>         Write Markdown packet
  --help                        Show this help

Local-only correction packet for Brújula Email 1. It writes a corrected draft
and preview files, but it never edits MailerLite, sends tests, reads/mutates
subscribers, changes workflows, publishes Shopify, appends ledgers, writes CRM
cards/scoring, or touches Fact Store.`;

const parseArgs = (argv) => {
  const options = {
    emailStyleQa: DEFAULT_EMAIL_STYLE_QA,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    emailEvidence: DEFAULT_EMAIL_EVIDENCE,
    brujulaProposal: DEFAULT_BRUJULA_PROPOSAL,
    brandAssetRegistry: DEFAULT_BRAND_ASSET_REGISTRY,
    plainTextOut: DEFAULT_PLAIN_TEXT_OUT,
    htmlOut: DEFAULT_HTML_OUT,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--email-style-qa') options.emailStyleQa = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--email-evidence') options.emailEvidence = argv[++index];
    else if (arg === '--brujula-proposal') options.brujulaProposal = argv[++index];
    else if (arg === '--brand-asset-registry') options.brandAssetRegistry = argv[++index];
    else if (arg === '--plain-text-out') options.plainTextOut = argv[++index];
    else if (arg === '--html-out') options.htmlOut = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const loadSources = async (options) => {
  const [
    emailStyleQaContent,
    emailStyleCanon,
    emailEvidence,
    brujulaProposal,
    brandAssetRegistry,
  ] = await Promise.all([
    readText(options.emailStyleQa),
    readText(options.emailStyleCanon),
    readText(options.emailEvidence),
    readText(options.brujulaProposal),
    readText(options.brandAssetRegistry),
  ]);

  return {
    values: {
      emailStyleQa: JSON.parse(emailStyleQaContent),
      emailStyleCanon,
      emailEvidence,
      brujulaProposal,
      brandAssetRegistry,
    },
    sourceDigests: [
      sourceDigest(options.emailStyleQa, emailStyleQaContent, 'current Brújula QA blockers and green criteria'),
      sourceDigest(options.emailStyleCanon, emailStyleCanon, 'canonical email layout, typography, CTA, signature and footer rules'),
      sourceDigest(options.emailEvidence, emailEvidence, 'real newsletter evidence and current Brújula anti-evidence'),
      sourceDigest(options.brujulaProposal, brujulaProposal, 'Brújula Email 1 public copy and implementation direction'),
      sourceDigest(options.brandAssetRegistry, brandAssetRegistry, 'brand color/channel decisions and email identity registry'),
    ],
  };
};

const normalizeForScan = (value) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const scanPublicText = (text) => {
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
    chars: text.length,
    bannedTermHits,
    sometimesFormulaCount: (normalized.match(/\ba veces\b/g) ?? []).length,
    ok: bannedTermHits.length === 0 && !(normalized.match(/\ba veces\b/g) ?? []).length,
  };
};

const buildEmailDraft = () => ({
  emailStep: 1,
  role: 'guide_delivery',
  subject: 'Aquí está La Brújula de Claridad',
  preheader: 'Una práctica breve para mirar una decisión con más calma.',
  ctaText: 'Abrir la guía',
  guideUrl: 'https://coherenciacreativa.com/pages/guia-brujula-de-claridad',
  bodyParagraphs: [
    'Gracias por pedir La Brújula de Claridad.',
    'Te la dejo aquí:',
    'Es una práctica breve para cuando una decisión empieza a hacer demasiado ruido. No busca decidir por ti. Busca ayudarte a ordenar lo que sientes, lo que sabes y lo que hoy sí puedes mirar con honestidad.',
    'Si puedes, resérvate veinte minutos, algo para escribir y un poco de silencio. No hace falta responder bonito. Solo responder de verdad.',
    'Si hoy no es el día, guárdala. La claridad suele entrar mejor cuando uno deja de apurarse.',
  ],
  closing: 'Un abrazo,',
  signatureText: 'Alejandro',
});

const htmlEscape = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const renderPlainText = (draft) => [
  `Asunto: ${draft.subject}`,
  `Preheader: ${draft.preheader}`,
  '',
  'Hola,',
  '',
  draft.bodyParagraphs[0],
  '',
  draft.bodyParagraphs[1],
  `${draft.ctaText}: ${draft.guideUrl}`,
  '',
  draft.bodyParagraphs[2],
  '',
  draft.bodyParagraphs[3],
  '',
  draft.bodyParagraphs[4],
  '',
  draft.closing,
  draft.signatureText,
].join('\n');

const renderHtml = (draft) => `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${htmlEscape(draft.subject)}</title>
  <style>
    body { margin: 0; padding: 0; background: #F4F7FA; color: #474747; font-family: Poppins, Arial, sans-serif; }
    .outer { width: 100%; background: #F4F7FA; padding: 32px 0; }
    .container { max-width: 640px; margin: 0 auto; background: #FFFFFF; }
    .content { max-width: 540px; margin: 0 auto; padding: 48px 50px 40px; }
    .eyebrow { font-family: Georgia, serif; font-size: 15px; line-height: 1.5; color: #2F3E63; margin: 0 0 22px; }
    p { font-size: 16px; line-height: 1.65; margin: 0 0 18px; color: #474747; }
    a { color: #2F3E63; }
    .button-wrap { margin: 24px 0 28px; }
    .button { display: inline-block; background: #2F3E63; color: #FFFFFF !important; text-decoration: none; border-radius: 7px; padding: 13px 22px; font-size: 15px; font-weight: 500; letter-spacing: 0; }
    .signature { font-family: Georgia, serif; color: #2F3E63; font-size: 23px; line-height: 1.25; margin-top: 4px; }
    .footer { max-width: 540px; margin: 0 auto; padding: 24px 50px 38px; color: #6A6A6A; font-size: 13px; line-height: 1.5; font-family: Poppins, Arial, sans-serif; }
    @media (max-width: 640px) {
      .outer { padding: 0; }
      .content { padding: 36px 24px 32px; }
      .footer { padding: 22px 24px 32px; }
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <div class="content">
        <p class="eyebrow">Hola,</p>
        <p>${htmlEscape(draft.bodyParagraphs[0])}</p>
        <p>${htmlEscape(draft.bodyParagraphs[1])}</p>
        <div class="button-wrap">
          <a class="button" href="${htmlEscape(draft.guideUrl)}">${htmlEscape(draft.ctaText)}</a>
        </div>
        <p>${htmlEscape(draft.bodyParagraphs[2])}</p>
        <p>${htmlEscape(draft.bodyParagraphs[3])}</p>
        <p>${htmlEscape(draft.bodyParagraphs[4])}</p>
        <p>${htmlEscape(draft.closing)}</p>
        <div class="signature">${htmlEscape(draft.signatureText)}</div>
      </div>
      <div class="footer">
        Recibes este correo porque pediste La Brújula de Claridad. Puedes darte de baja desde el enlace legal de MailerLite.
      </div>
    </div>
  </div>
</body>
</html>
`;

const buildStyleChecks = ({ html, emailStyleQa }) => {
  const blockerIds = (emailStyleQa?.qaChecks ?? [])
    .filter((check) => String(check.status).includes('blocker') || check.status === 'red')
    .map((check) => check.id);

  const checks = [
    {
      id: 'poppins_body',
      status: html.includes('font-family: Poppins') ? 'specified' : 'missing',
    },
    {
      id: 'georgia_editorial_accent',
      status: html.includes('font-family: Georgia') ? 'specified' : 'missing',
    },
    {
      id: 'background_container_text',
      status: html.includes('#F4F7FA') && html.includes('#FFFFFF') && html.includes('#474747')
        ? 'specified'
        : 'missing',
    },
    {
      id: 'cta_not_default_mailerlite_blue',
      status: html.includes('background: #2F3E63') ? 'specified_needs_render_check' : 'missing',
    },
    {
      id: 'signature_identity',
      status: 'text_fallback_specified_visual_signature_asset_still_pending',
    },
    {
      id: 'footer_language',
      status: 'localized_draft_specified_legal_unsubscribe_still_mailerlite_dependent',
    },
  ];

  return {
    previousBlockerIds: blockerIds,
    checks,
    remainingBeforeGreen: [
      'Rebuild or paste into a MailerLite draft with the real visual signature asset if available.',
      'Verify actual MailerLite render on mobile and desktop.',
      'Confirm MailerLite legal unsubscribe/footer remains compliant and visually intentional.',
      'Send a new test email only after Alejandro approves exact test-only scope.',
    ],
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsAndDraftFilesOnly: true,
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
  emailStyleQa,
  emailStyleCanon,
  emailEvidence,
  brujulaProposal,
  brandAssetRegistry,
  plainTextPath,
  htmlPath,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const draft = buildEmailDraft();
  const plainText = renderPlainText(draft);
  const html = renderHtml(draft);
  const publicTextScan = scanPublicText(plainText);
  const styleQa = buildStyleChecks({ html, emailStyleQa });

  const upstreamReady = emailStyleQa?.status === 'brujula_email_style_qa_yellow_no_live_changes'
    && emailStyleCanon.includes('Poppins, sans-serif')
    && emailStyleCanon.includes('Georgia, serif')
    && emailEvidence.includes('Brújula usa Inter')
    && brujulaProposal.includes('Email 1')
    && brandAssetRegistry.includes('Emails / newsletter');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_brujula_email_style_correction_packet',
    generatedAt,
    ok: upstreamReady && publicTextScan.ok,
    status: upstreamReady && publicTextScan.ok
      ? 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes'
      : 'brujula_email1_corrected_draft_needs_source_or_copy_review',
    executiveSummary: {
      functionalLane: emailStyleQa?.executiveSummary?.functionalStatus ?? 'unknown',
      previousCreativeStatus: emailStyleQa?.executiveSummary?.creativeStatus ?? 'unknown',
      correctedDraftStatus: 'ready_for_mailerlite_builder_or_brand_review_not_render_verified',
      publicUseReady: false,
      testSendReady: false,
      nextBestMove: 'Use the HTML/plain-text draft as the next MailerLite builder input after exact approval; then run render QA and a test-only send.',
    },
    draft,
    outputs: {
      plainTextPath: resolve(plainTextPath),
      htmlPath: resolve(htmlPath),
    },
    publicTextScan,
    styleQa,
    approvalBoundary: {
      allowedNow: [
        'Review local HTML/plain-text draft.',
        'Route this correction packet to Brand/Web as no-live implementation guidance.',
      ],
      closedNow: [
        'No MailerLite email edit.',
        'No MailerLite test send.',
        'No workflow activation.',
        'No subscriber/group mutation.',
        'No Shopify publish or CRM write.',
      ],
    },
    sourceDigests,
    safety: buildSafety(),
    generatedDrafts: {
      plainText,
      html,
    },
  };
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Brújula Email 1 Style Correction Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    `Public use ready: ${packet.executiveSummary.publicUseReady}`,
    `Test send ready: ${packet.executiveSummary.testSendReady}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Este paquete convierte el QA amarillo de Brújula en un borrador local de Email 1 con canon aplicado: Poppins, Georgia, fondo #F4F7FA, contenedor blanco, CTA sobrio y copy público limpio. No toca MailerLite y no autoriza test ni producción.',
    '',
    '## Outputs',
    '',
    `- Plain text draft: ${packet.outputs.plainTextPath}`,
    `- HTML preview: ${packet.outputs.htmlPath}`,
    '',
    '## Public Copy',
    '',
    `- Subject: ${packet.draft.subject}`,
    `- Preheader: ${packet.draft.preheader}`,
    `- CTA: ${packet.draft.ctaText}`,
    '',
    '```text',
    packet.generatedDrafts.plainText,
    '```',
    '',
    '## Style QA',
    '',
    `- Previous blockers: ${packet.styleQa.previousBlockerIds.join(', ') || 'none'}`,
  ];

  for (const check of packet.styleQa.checks) {
    lines.push(`- ${check.id}: ${check.status}`);
  }

  lines.push('', '## Remaining Before Green', '');
  lines.push(renderList(packet.styleQa.remainingBeforeGreen));

  lines.push('', '## Public Text Scan', '');
  lines.push(`- Chars: ${packet.publicTextScan.chars}`);
  lines.push(`- Banned internal term hits: ${packet.publicTextScan.bannedTermHits.length}`);
  lines.push(`- "a veces" formula count: ${packet.publicTextScan.sometimesFormulaCount}`);

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
  lines.push('- Solo reportes y borradores locales.');
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

const buildPacketFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  return buildPacket({
    ...values,
    plainTextPath: options.plainTextOut,
    htmlPath: options.htmlOut,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  await writeText(options.plainTextOut, packet.generatedDrafts.plainText);
  await writeText(options.htmlOut, packet.generatedDrafts.html);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    plainTextOut: resolve(options.plainTextOut),
    htmlOut: resolve(options.htmlOut),
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    publicUseReady: packet.executiveSummary.publicUseReady,
    testSendReady: packet.executiveSummary.testSendReady,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula email style correction packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEmailDraft,
  buildPacket,
  buildPacketFromFiles,
  buildSafety,
  buildStyleChecks,
  parseArgs,
  renderHtml,
  renderMarkdown,
  renderPlainText,
  scanPublicText,
};
