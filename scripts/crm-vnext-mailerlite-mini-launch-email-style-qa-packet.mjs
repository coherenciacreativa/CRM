#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { scanDraftText } from './crm-vnext-mailerlite-mini-launch-brand-email-asset-packet.mjs';
import { sequencePublicText } from './crm-vnext-mailerlite-mini-launch-email-sequence-asset-packet.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-style-qa-packet-2026-05-28';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_RESPONSE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_responses_inteligencia_descansar_2026-05-27/brand_response.json';
const DEFAULT_RECONCILIATION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_department_review_reconciliation_after_responses_inteligencia_descansar_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-style-qa-packet.mjs [options]

Options:
  --email-sequence-packet <path>  Mini-launch email sequence JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --brand-response <path>         Final Brand response JSON. Defaults to ${DEFAULT_BRAND_RESPONSE}
  --reconciliation <path>         Department reconciliation JSON. Defaults to ${DEFAULT_RECONCILIATION}
  --email-style-canon <path>      Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --out <path>                    Write JSON packet
  --markdown-out <path>           Write Markdown packet
  --help                          Show this help

Local-only Email Style QA packet for a Brand-approved mini-launch sequence. It
turns final Brand response evidence into style/build criteria and keeps
MailerLite asset build, seed send, audience send, workflows, subscribers,
Shopify, CRM writes, ledgers, scoring and Fact Store closed.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    brandResponse: DEFAULT_BRAND_RESPONSE,
    reconciliation: DEFAULT_RECONCILIATION,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--brand-response') options.brandResponse = argv[++index];
    else if (arg === '--reconciliation') options.reconciliation = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
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

const loadSources = async (options) => {
  const [
    emailSequenceRaw,
    brandResponseRaw,
    reconciliationRaw,
    emailStyleCanon,
  ] = await Promise.all([
    readText(options.emailSequencePacket),
    readText(options.brandResponse),
    readText(options.reconciliation),
    readText(options.emailStyleCanon),
  ]);

  return {
    values: {
      emailSequencePacket: JSON.parse(emailSequenceRaw),
      brandResponse: JSON.parse(brandResponseRaw),
      reconciliation: JSON.parse(reconciliationRaw),
      emailStyleCanon,
    },
    sourceDigests: [
      sourceDigest(options.emailSequencePacket, emailSequenceRaw, 'four-email draft sequence and no-live asset plan'),
      sourceDigest(options.brandResponse, brandResponseRaw, 'final Brand sequence decision and style gaps'),
      sourceDigest(options.reconciliation, reconciliationRaw, 'department reconciliation action plan and live-gate separation'),
      sourceDigest(options.emailStyleCanon, emailStyleCanon, 'email typography, signature, CTA, footer and mobile QA canon'),
    ],
  };
};

const actionById = (reconciliation, id) =>
  (reconciliation?.actionPlan?.actions ?? []).find((action) => action.id === id) ?? null;

const buildBrandApproval = ({ brandResponse, reconciliation }) => {
  const sequenceAction = actionById(reconciliation, 'sequence_ready_for_email_style_qa_or_asset_plan');
  const sequenceApproved = brandResponse?.department === 'brand'
    && brandResponse?.reviewMode === 'no_live_review'
    && brandResponse?.liveApprovalGranted === false
    && brandResponse?.sequenceDecision === 'approve'
    && Array.isArray(brandResponse?.blockers)
    && brandResponse.blockers.length === 0;

  return {
    sequenceApprovedNoLive: sequenceApproved,
    reconciliationReadyForStyleQa: sequenceAction?.status === 'ready_no_live',
    sourceDecision: brandResponse?.sequenceDecision ?? null,
    liveApprovalGranted: brandResponse?.liveApprovalGranted ?? null,
    brandBlockerCount: brandResponse?.blockers?.length ?? null,
    styleGapCount: brandResponse?.emailStyleGaps?.length ?? 0,
    claimsRiskCount: brandResponse?.claimsRiskIssues?.length ?? 0,
    publicInternalLeakIssueCount: brandResponse?.publicInternalLeakIssues?.length ?? 0,
    notes: brandResponse?.sequenceNotes ?? [],
    styleGaps: brandResponse?.emailStyleGaps ?? [],
    claimsRiskIssues: brandResponse?.claimsRiskIssues ?? [],
    publicInternalLeakIssues: brandResponse?.publicInternalLeakIssues ?? [],
  };
};

const canonIncludes = (canon, text) => canon.toLowerCase().includes(text.toLowerCase());

const buildStyleChecks = ({ brandApproval, emailStyleCanon, publicTextScan }) => [
  {
    id: 'brand_sequence_approval',
    status: brandApproval.sequenceApprovedNoLive ? 'green_no_live' : 'red_blocker',
    evidence: brandApproval.sequenceApprovedNoLive
      ? 'Final Brand response approves the four-email sequence for no-live continuation.'
      : 'Final Brand no-live sequence approval is missing.',
    requiredBeforeMailerLiteBuild: brandApproval.sequenceApprovedNoLive ? [] : ['Collect a final Brand response approving the sequence direction.'],
  },
  {
    id: 'public_internal_language',
    status: publicTextScan.bannedTermHits.length === 0 && brandApproval.publicInternalLeakIssueCount === 0
      ? 'green_for_review'
      : 'red_blocker',
    evidence: `${publicTextScan.bannedTermHits.length} internal term hits in draft scan; ${brandApproval.publicInternalLeakIssueCount} Brand leak issues.`,
    requiredBeforeMailerLiteBuild: publicTextScan.bannedTermHits.length === 0 && brandApproval.publicInternalLeakIssueCount === 0
      ? []
      : ['Remove all internal operating vocabulary from reader-facing copy.'],
  },
  {
    id: 'claims_and_medical_risk',
    status: brandApproval.claimsRiskCount > 0 ? 'yellow_guardrail' : 'green_for_review',
    evidence: brandApproval.claimsRiskCount
      ? 'Brand listed claims-risk guardrails around sleep, anxiety, diagnosis and guaranteed transformation.'
      : 'No Brand claims-risk issues listed.',
    requiredBeforeMailerLiteBuild: brandApproval.claimsRiskIssues,
  },
  {
    id: 'typography_and_container',
    status: canonIncludes(emailStyleCanon, 'Poppins, sans-serif')
      && canonIncludes(emailStyleCanon, 'Georgia, serif')
      && canonIncludes(emailStyleCanon, '#F4F7FA')
      ? 'yellow_requires_builder_mapping'
      : 'needs_review',
    evidence: 'Email Style Canon requires Poppins body, Georgia editorial accent, #F4F7FA outer background and white container.',
    requiredBeforeMailerLiteBuild: [
      'Map Poppins body text and Georgia editorial accent into the local/MailerLite builder draft.',
      'Use #F4F7FA outer background and white content container where the builder allows it.',
      'Keep body copy around 16px and 165% line-height.',
    ],
  },
  {
    id: 'signature_footer_socials',
    status: canonIncludes(emailStyleCanon, 'firma visual de Alejandro') ? 'yellow_requires_asset_or_declared_fallback' : 'needs_review',
    evidence: 'Canon requires Alejandro visual signature when the email is in his voice and footer/social links must be intentional.',
    requiredBeforeMailerLiteBuild: [
      'Use Alejandro visual signature asset or declare a deliberate text-signature fallback.',
      'Review legal/unsubscribe footer language without breaking compliance.',
      'Keep only intentional social links/icons.',
    ],
  },
  {
    id: 'cta_treatment',
    status: 'yellow_requires_design_choice',
    evidence: 'Brand response asks for correspondence/invitation posture; canon allows one sober CTA only when functionally useful.',
    requiredBeforeMailerLiteBuild: [
      'Use one restrained CTA per email.',
      'Avoid urgency, scarcity, all-caps, funnel language or default MailerLite blue.',
      'Prefer reply/text-link posture where the email is correspondence.',
    ],
  },
  {
    id: 'mobile_inbox_render',
    status: 'yellow_requires_future_render_qa',
    evidence: 'Brand explicitly asked for mobile/inbox rendering once a local or MailerLite draft exists.',
    requiredBeforeMailerLiteBuild: [
      'Run local render QA before any future exact MailerLite builder/test-send approval.',
      'Verify spacing, CTA, signature and footer on mobile-sized preview.',
    ],
  },
];

const buildApprovalGate = () => ({
  readyForLocalAssetPlanNow: true,
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
  nextNoLiveMove: 'Prepare local email asset plan/style implementation from this QA packet; do not build in MailerLite or send until exact scope approval.',
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

const buildEmailStyleQaPacket = ({
  emailSequencePacket,
  brandResponse,
  reconciliation,
  emailStyleCanon,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const brandApproval = buildBrandApproval({ brandResponse, reconciliation });
  const emailSequence = emailSequencePacket?.emailSequence ?? [];
  const publicText = sequencePublicText(emailSequence);
  const publicTextScan = scanDraftText(publicText);
  const styleChecks = buildStyleChecks({ brandApproval, emailStyleCanon, publicTextScan });
  const hardBlockerCount = styleChecks.filter((check) => check.status === 'red_blocker').length;
  const yellowCheckCount = styleChecks.filter((check) => check.status.startsWith('yellow_')).length;
  const ok = brandApproval.sequenceApprovedNoLive
    && brandApproval.reconciliationReadyForStyleQa
    && hardBlockerCount === 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_mini_launch_email_style_qa_packet',
    generatedAt,
    ok,
    status: ok
      ? 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes'
      : 'mini_launch_email_style_qa_blocked_before_asset_plan',
    launch: emailSequencePacket?.launch ?? {
      launchId: brandResponse?.launchId ?? null,
      resourceName: null,
      resourceType: null,
    },
    brandApproval,
    publicTextScan,
    styleChecks,
    executiveSummary: {
      brandSequenceApprovedNoLive: brandApproval.sequenceApprovedNoLive,
      readyForLocalAssetPlanNow: ok,
      hardBlockerCount,
      yellowCheckCount,
      emailCount: emailSequence.length,
      publicInternalLeakIssueCount: brandApproval.publicInternalLeakIssueCount,
      claimsRiskCount: brandApproval.claimsRiskCount,
      styleGapCount: brandApproval.styleGapCount,
      publicUseReady: false,
      mailerLiteBuildReady: false,
      seedSendReady: false,
    },
    localAssetPlanInputs: {
      sequencePacketStatus: emailSequencePacket?.status ?? null,
      sequenceQaVerdict: emailSequencePacket?.sequenceQa?.verdict ?? null,
      assetCount: emailSequencePacket?.mailerLiteAssetPlan?.assetCount ?? null,
      assetNames: (emailSequencePacket?.mailerLiteAssetPlan?.assets ?? []).map((asset) => asset.mailerLiteAssetNameDraft),
      styleGapInputs: brandApproval.styleGaps,
      canonicalQaChecklist: [
        'Cuerpo Poppins 16px / #474747',
        'Acento editorial Georgia cuando aplica',
        'Fondo #F4F7FA + contenedor blanco',
        'CTA textual/discreto o boton justificado',
        'Firma visual de Alejandro si aplica',
        'Footer/legal revisado',
        'Mobile/inbox revisado',
        'Lenguaje interno visible: cero',
      ],
    },
    approvalGate: buildApprovalGate(),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Mini-Launch Email Style QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch?.resourceName ?? packet.launch?.launchId}`,
    `launch_id interno: ${packet.launch?.launchId}`,
    `Brand sequence approved no-live: ${packet.executiveSummary.brandSequenceApprovedNoLive}`,
    `Ready for local asset plan now: ${packet.executiveSummary.readyForLocalAssetPlanNow}`,
    `Ready for MailerLite build now: ${packet.approvalGate.readyForMailerLiteAssetBuildNow}`,
    `Ready for seed send now: ${packet.approvalGate.readyForSeedSendNow}`,
    '',
    'Este packet convierte la respuesta final de Brand en QA de estilo y plan local. No crea assets en MailerLite, no envia correos, no asigna subscribers, no conecta workflows y no toca CRM vivo.',
    '',
    '## Brand Approval',
    '',
    `- Source decision: ${packet.brandApproval.sourceDecision}`,
    `- Live approval granted: ${packet.brandApproval.liveApprovalGranted}`,
    `- Brand blocker count: ${packet.brandApproval.brandBlockerCount}`,
    `- Style gap count: ${packet.brandApproval.styleGapCount}`,
    `- Claims risk count: ${packet.brandApproval.claimsRiskCount}`,
    `- Public/internal leak issue count: ${packet.brandApproval.publicInternalLeakIssueCount}`,
    '',
    '## Style Checks',
    '',
  ];

  for (const check of packet.styleChecks) {
    lines.push(`### ${check.id}`);
    lines.push(`- Status: ${check.status}`);
    lines.push(`- Evidence: ${check.evidence}`);
    if (check.requiredBeforeMailerLiteBuild.length) {
      lines.push('- Required before MailerLite build:');
      for (const item of check.requiredBeforeMailerLiteBuild) lines.push(`  - ${item}`);
    }
    lines.push('');
  }

  lines.push('## Local Asset Plan Inputs', '');
  lines.push(`- Sequence packet status: ${packet.localAssetPlanInputs.sequencePacketStatus}`);
  lines.push(`- Sequence QA verdict: ${packet.localAssetPlanInputs.sequenceQaVerdict}`);
  lines.push(`- Asset count: ${packet.localAssetPlanInputs.assetCount}`);
  for (const name of packet.localAssetPlanInputs.assetNames) lines.push(`- Asset draft: ${name}`);
  lines.push('');
  lines.push('## Approval Gate', '');
  lines.push(`- Ready for local asset plan now: ${packet.approvalGate.readyForLocalAssetPlanNow}`);
  lines.push(`- Can create/edit MailerLite assets now: ${packet.approvalGate.canCreateOrEditMailerLiteAssetsNow}`);
  lines.push(`- Can assign subscribers now: ${packet.approvalGate.canAssignSubscribersNow}`);
  lines.push(`- Can attach workflow now: ${packet.approvalGate.canAttachWorkflowNow}`);
  lines.push(`- Can send seed now: ${packet.approvalGate.readyForSeedSendNow}`);
  lines.push(`- Next no-live move: ${packet.approvalGate.nextNoLiveMove}`);
  lines.push('');
  lines.push('## Fuentes Consultadas', '');
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

const buildPacketFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  return buildEmailStyleQaPacket({
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

  const packet = await buildPacketFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    launchId: packet.launch?.launchId ?? null,
    brandSequenceApprovedNoLive: packet.executiveSummary.brandSequenceApprovedNoLive,
    readyForLocalAssetPlanNow: packet.executiveSummary.readyForLocalAssetPlanNow,
    hardBlockerCount: packet.executiveSummary.hardBlockerCount,
    yellowCheckCount: packet.executiveSummary.yellowCheckCount,
    readyForMailerLiteAssetBuildNow: packet.approvalGate.readyForMailerLiteAssetBuildNow,
    readyForSeedSendNow: packet.approvalGate.readyForSeedSendNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email style QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBrandApproval,
  buildEmailStyleQaPacket,
  buildStyleChecks,
  parseArgs,
  renderMarkdown,
};
