#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-local-email-asset-plan-2026-05-28';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-local-email-asset-plan.mjs [options]

Options:
  --email-sequence-packet <path>  Mini-launch email sequence JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --email-style-qa-packet <path>  Email Style QA JSON. Defaults to ${DEFAULT_EMAIL_STYLE_QA_PACKET}
  --email-style-canon <path>      Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --out <path>                    Write JSON packet
  --markdown-out <path>           Write Markdown packet
  --help                          Show this help

Local-only asset implementation plan for a Brand-approved mini-launch email
sequence. It turns Email Style QA into builder-ready instructions, placeholders,
style mapping and future approval boundaries. It never creates or edits
MailerLite assets, sends emails, assigns subscribers, attaches workflows,
publishes Shopify, writes CRM, appends ledgers, scores, or touches Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    emailStyleQaPacket: DEFAULT_EMAIL_STYLE_QA_PACKET,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--email-style-qa-packet') options.emailStyleQaPacket = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
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
    emailSequenceRaw,
    emailStyleQaRaw,
    emailStyleCanon,
  ] = await Promise.all([
    readText(options.emailSequencePacket),
    readText(options.emailStyleQaPacket),
    readText(options.emailStyleCanon),
  ]);

  return {
    values: {
      emailSequencePacket: JSON.parse(emailSequenceRaw),
      emailStyleQaPacket: JSON.parse(emailStyleQaRaw),
      emailStyleCanon,
    },
    sourceDigests: [
      sourceDigest(options.emailSequencePacket, emailSequenceRaw, 'approved four-email sequence draft and MailerLite asset names'),
      sourceDigest(options.emailStyleQaPacket, emailStyleQaRaw, 'Email Style QA status, yellow checks, claims guardrails and approval boundaries'),
      sourceDigest(options.emailStyleCanon, emailStyleCanon, 'Brand email typography, container, CTA, signature, footer and mobile QA defaults'),
    ],
  };
};

const firstText = (items = []) => cleanString(items.find((item) => cleanString(item?.text))?.text);

const canonIncludes = (canon, text) => canon.toLowerCase().includes(text.toLowerCase());

const canonicalStyleMap = (emailStyleCanon) => ({
  outerBackground: canonIncludes(emailStyleCanon, '#F4F7FA') ? '#F4F7FA' : 'review_canon_background',
  containerBackground: canonIncludes(emailStyleCanon, '#FFFFFF') ? '#FFFFFF' : 'review_canon_container',
  outerWidthPx: 640,
  contentWidthPx: 540,
  bodyColor: canonIncludes(emailStyleCanon, '#474747') ? '#474747' : 'review_canon_body_color',
  bodyFont: canonIncludes(emailStyleCanon, 'Poppins') ? 'Poppins, sans-serif' : 'review_canon_body_font',
  bodyFontSizePx: 16,
  bodyLineHeight: '165%',
  accentFont: canonIncludes(emailStyleCanon, 'Georgia') ? 'Georgia, serif' : 'review_canon_accent_font',
  footerFontSizePx: 13,
  ctaPosture: 'one restrained CTA; editorial text link or sober brand button only when functionally useful',
  signaturePosture: canonIncludes(emailStyleCanon, 'firma visual de Alejandro')
    ? 'use Alejandro visual signature asset or declare text-signature fallback'
    : 'review_signature_canon',
  footerPosture: 'Spanish/legal footer reviewed; keep unsubscribe compliance; only intentional social links',
  mobileQaPosture: 'verify spacing, CTA, signature and footer on mobile-sized preview before any seed send',
});

const placeholderFromDestination = (destination) => {
  const cleaned = cleanString(destination);
  if (!cleaned || cleaned === 'reply') return null;
  return {
    key: cleaned.replace(/_placeholder$/, ''),
    value: cleaned,
    status: 'inert_placeholder_needs_future_exact_source',
  };
};

const buildAssetRows = ({ emailSequencePacket, emailStyleCanon }) => {
  const styleMap = canonicalStyleMap(emailStyleCanon);
  const sequence = emailSequencePacket?.emailSequence ?? [];
  const assetPlanByStep = new Map((emailSequencePacket?.mailerLiteAssetPlan?.assets ?? []).map((asset) => [asset.step, asset]));

  return sequence.map((email) => {
    const cta = email?.publicCopy?.emailBody?.cta ?? {};
    const placeholder = placeholderFromDestination(cta.destination);
    const assetPlan = assetPlanByStep.get(email.step) ?? {};
    return {
      step: email.step,
      role: email.role,
      mailerLiteAssetNameDraft: assetPlan.mailerLiteAssetNameDraft ?? email.mailerLiteAssetNameDraft ?? null,
      sourceStatus: email.status ?? assetPlan.sourceStatus ?? null,
      selectedSubject: firstText(email.publicCopy?.subjectOptions),
      selectedPreheader: firstText(email.publicCopy?.preheaderOptions),
      bodyParagraphCount: email.publicCopy?.emailBody?.paragraphs?.length ?? 0,
      cta: {
        text: cleanString(cta.text),
        destination: cleanString(cta.destination),
        posture: cleanString(cta.posture) ?? styleMap.ctaPosture,
        placeholder,
      },
      builderBlocks: [
        'preheader',
        'greeting',
        'body_copy',
        cta?.text ? 'single_cta' : 'no_cta',
        'alejandro_signature_or_text_fallback',
        'compliance_footer',
      ],
      styleImplementation: {
        outerBackground: styleMap.outerBackground,
        containerBackground: styleMap.containerBackground,
        bodyFont: styleMap.bodyFont,
        bodyColor: styleMap.bodyColor,
        accentFont: styleMap.accentFont,
        ctaPosture: styleMap.ctaPosture,
      },
      localTasksBeforeMailerLiteBuildScope: [
        'Confirm selected subject and preheader from the approved options.',
        'Map copy into the editorial email container with one clear CTA maximum.',
        'Declare final URL/merge placeholders without connecting live forms or workflows.',
        'Declare visual signature asset path or text-signature fallback.',
        'Map footer/legal/social posture before builder work.',
      ],
      liveActionAllowedNow: false,
    };
  });
};

const buildApprovalBoundary = ({ emailStyleQaPacket, assetRows }) => ({
  readyForLocalAssetPlanNow: true,
  readyForExactAssetBuildScopeRequestNow: true,
  readyForMailerLiteAssetBuildNow: false,
  readyForSeedSendNow: false,
  readyForReceiptSeedTestNow: false,
  readyForAudienceLaunchNow: false,
  canCreateOrEditMailerLiteAssetsNow: false,
  canAssignSubscribersNow: false,
  canAttachWorkflowNow: false,
  canAppendSignalLedgerNow: false,
  canWriteCardsNow: false,
  canScoreNow: false,
  canWriteFactStoreNow: false,
  futureExactScopeMustName: [
    `${assetRows.length} draft assets and their exact MailerLite names`,
    'allowed operation: create/edit draft assets only',
    'inert URL placeholders or exact non-live preview URLs',
    'signature asset or explicit text fallback',
    'footer/social posture',
    'explicit exclusions: subscribers, workflows, sends, audience launch, CRM writes',
  ],
  inheritedClosedGates: {
    mailerLiteBuildReadyFromStyleQa: emailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow ?? false,
    seedSendReadyFromStyleQa: emailStyleQaPacket?.approvalGate?.readyForSeedSendNow ?? false,
  },
});

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  mailerLiteAssetsCreatedOrEdited: false,
  groupsCreated: false,
  subscriberAssignmentsPerformed: false,
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

const buildLocalEmailAssetPlan = ({
  emailSequencePacket,
  emailStyleQaPacket,
  emailStyleCanon,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const assetRows = buildAssetRows({ emailSequencePacket, emailStyleCanon });
  const styleQaReady = emailStyleQaPacket?.status === 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes'
    && emailStyleQaPacket?.approvalGate?.readyForLocalAssetPlanNow === true
    && emailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow === false
    && emailStyleQaPacket?.approvalGate?.readyForSeedSendNow === false
    && emailStyleQaPacket?.executiveSummary?.hardBlockerCount === 0;
  const sequenceReady = emailSequencePacket?.status === 'email_sequence_asset_packet_ready_for_brand_review_no_live_changes'
    && assetRows.length > 0;
  const ok = styleQaReady && sequenceReady;
  const approvalBoundary = buildApprovalBoundary({ emailStyleQaPacket, assetRows });

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_local_email_asset_plan',
    generatedAt,
    ok,
    status: ok
      ? 'mini_launch_local_email_asset_plan_ready_no_live_changes'
      : 'mini_launch_local_email_asset_plan_blocked_before_scope_request',
    launch: emailSequencePacket?.launch ?? emailStyleQaPacket?.launch ?? null,
    executiveSummary: {
      assetCount: assetRows.length,
      styleQaStatus: emailStyleQaPacket?.status ?? null,
      styleQaHardBlockerCount: emailStyleQaPacket?.executiveSummary?.hardBlockerCount ?? null,
      styleQaYellowCheckCount: emailStyleQaPacket?.executiveSummary?.yellowCheckCount ?? null,
      readyForLocalAssetPlanNow: ok,
      readyForExactAssetBuildScopeRequestNow: ok,
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      placeholderCount: assetRows.filter((row) => row.cta.placeholder).length,
    },
    globalStyleMap: canonicalStyleMap(emailStyleCanon),
    assetRows,
    crossAssetChecks: [
      'All emails use one CTA maximum.',
      'No internal CRM/MailerLite/workflow/launch_id language appears in reader-facing copy.',
      'Claims stay modest: no sleep cure, anxiety relief, diagnosis or guaranteed transformation.',
      'Sent groups stay off unless Brand canonizes reusable follow-up content.',
      'Onboarding handoff remains recommendation-only until a separate onboarding gate.',
    ],
    approvalBoundary,
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Local Email Asset Plan',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch?.resourceName ?? packet.launch?.launchId}`,
    `launch_id interno: ${packet.launch?.launchId}`,
    `Asset count: ${packet.executiveSummary.assetCount}`,
    `Ready for local asset plan now: ${packet.executiveSummary.readyForLocalAssetPlanNow}`,
    `Ready for exact asset-build scope request now: ${packet.executiveSummary.readyForExactAssetBuildScopeRequestNow}`,
    `Ready for MailerLite build now: ${packet.executiveSummary.readyForMailerLiteAssetBuildNow}`,
    `Ready for seed send now: ${packet.executiveSummary.readyForSeedSendNow}`,
    '',
    'Este plan deja armado el mapa local de implementacion. No crea ni edita assets en MailerLite, no envia correos, no asigna subscribers y no conecta workflows.',
    '',
    '## Style Map',
    '',
  ];

  for (const [key, value] of Object.entries(packet.globalStyleMap)) {
    lines.push(`- ${key}: ${value}`);
  }

  lines.push('', '## Assets', '');
  for (const asset of packet.assetRows) {
    lines.push(`### Email ${asset.step}: ${asset.role}`);
    lines.push(`- Draft asset name: ${asset.mailerLiteAssetNameDraft}`);
    lines.push(`- Subject: ${asset.selectedSubject}`);
    lines.push(`- Preheader: ${asset.selectedPreheader}`);
    lines.push(`- CTA: ${asset.cta.text ?? 'none'} (${asset.cta.destination ?? 'none'})`);
    lines.push(`- Placeholder: ${asset.cta.placeholder?.value ?? 'none'}`);
    lines.push(`- Live action allowed now: ${asset.liveActionAllowedNow}`);
    lines.push('- Local tasks before build scope:');
    for (const task of asset.localTasksBeforeMailerLiteBuildScope) lines.push(`  - ${task}`);
    lines.push('');
  }

  lines.push('## Cross-Asset Checks', '');
  for (const check of packet.crossAssetChecks) lines.push(`- ${check}`);

  lines.push('', '## Approval Boundary', '');
  lines.push(`- Ready for MailerLite asset build now: ${packet.approvalBoundary.readyForMailerLiteAssetBuildNow}`);
  lines.push(`- Ready for seed send now: ${packet.approvalBoundary.readyForSeedSendNow}`);
  lines.push(`- Can create/edit MailerLite assets now: ${packet.approvalBoundary.canCreateOrEditMailerLiteAssetsNow}`);
  lines.push('- Future exact scope must name:');
  for (const item of packet.approvalBoundary.futureExactScopeMustName) lines.push(`  - ${item}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only reports only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin CRM live API calls.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin assets/grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
  lines.push('- Sin Signal Event Ledger, card writes, scoring, Fact Store u outbound.');

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

const buildPlanFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  return buildLocalEmailAssetPlan({
    ...values,
    sourceDigests,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPlanFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch?.launchId ?? null,
    assetCount: packet.executiveSummary.assetCount,
    readyForLocalAssetPlanNow: packet.executiveSummary.readyForLocalAssetPlanNow,
    readyForExactAssetBuildScopeRequestNow: packet.executiveSummary.readyForExactAssetBuildScopeRequestNow,
    readyForMailerLiteAssetBuildNow: packet.executiveSummary.readyForMailerLiteAssetBuildNow,
    readyForSeedSendNow: packet.executiveSummary.readyForSeedSendNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch local email asset plan failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildAssetRows,
  buildLocalEmailAssetPlan,
  canonicalStyleMap,
  parseArgs,
  renderMarkdown,
};
