#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-email-style-qa-packet-2026-05-27';

const DEFAULT_BRUJULA_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json';
const DEFAULT_BRUJULA_APPLY = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_test_lane_apply_saludoalsol_pruebasmayo2026_2026-05-27.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const DEFAULT_EMAIL_EVIDENCE = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/EMAIL_BRAND_EVIDENCE_REPORT_2026-05-11.md';
const DEFAULT_CANON_HANDOFF = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/EMAIL_STYLE_CANONICALIZATION_HANDOFF_2026-05-11.md';
const DEFAULT_BRUJULA_PROPOSAL = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/BRUJULA_EMAIL_CANON_PROPOSAL_2026-05-11.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-email-style-qa-packet.mjs [options]

Options:
  --brujula-plan <path>       Brújula post-inbox verification JSON. Defaults to ${DEFAULT_BRUJULA_PLAN}
  --brujula-apply <path>      Brújula test-lane apply JSON. Defaults to ${DEFAULT_BRUJULA_APPLY}
  --email-style-canon <path>  Brand Hub email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --email-evidence <path>     Brand email evidence report. Defaults to ${DEFAULT_EMAIL_EVIDENCE}
  --canon-handoff <path>      Canonicalization handoff. Defaults to ${DEFAULT_CANON_HANDOFF}
  --brujula-proposal <path>   Brújula email canon proposal. Defaults to ${DEFAULT_BRUJULA_PROPOSAL}
  --out <path>                Write JSON packet
  --markdown-out <path>       Write Markdown packet
  --help                      Show this help

Local-only QA packet for Brújula email style. It turns the current yellow
creative status into concrete blockers and green criteria. It does not call
MailerLite, Shopify or CRM APIs, does not read subscribers, does not mutate
groups/workflows, and does not send email.`;

const parseArgs = (argv) => {
  const options = {
    brujulaPlan: DEFAULT_BRUJULA_PLAN,
    brujulaApply: DEFAULT_BRUJULA_APPLY,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    emailEvidence: DEFAULT_EMAIL_EVIDENCE,
    canonHandoff: DEFAULT_CANON_HANDOFF,
    brujulaProposal: DEFAULT_BRUJULA_PROPOSAL,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--brujula-plan') options.brujulaPlan = argv[++index];
    else if (arg === '--brujula-apply') options.brujulaApply = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--email-evidence') options.emailEvidence = argv[++index];
    else if (arg === '--canon-handoff') options.canonHandoff = argv[++index];
    else if (arg === '--brujula-proposal') options.brujulaProposal = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));
const readText = async (path) => readFile(resolve(path), 'utf8');

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const loadSources = async (options) => {
  const [
    brujulaPlanContent,
    brujulaApplyContent,
    emailStyleCanon,
    emailEvidence,
    canonHandoff,
    brujulaProposal,
  ] = await Promise.all([
    readText(options.brujulaPlan),
    readText(options.brujulaApply),
    readText(options.emailStyleCanon),
    readText(options.emailEvidence),
    readText(options.canonHandoff),
    readText(options.brujulaProposal),
  ]);

  return {
    values: {
      brujulaPlan: JSON.parse(brujulaPlanContent),
      brujulaApply: JSON.parse(brujulaApplyContent),
      emailStyleCanon,
      emailEvidence,
      canonHandoff,
      brujulaProposal,
    },
    sourceDigests: [
      sourceDigest(options.brujulaPlan, brujulaPlanContent, 'current Brújula post-inbox verification and creative anti-evidence'),
      sourceDigest(options.brujulaApply, brujulaApplyContent, 'approved test subscriber and receipt assignments'),
      sourceDigest(options.emailStyleCanon, emailStyleCanon, 'canonical email typography, signature, CTA and footer rules'),
      sourceDigest(options.emailEvidence, emailEvidence, 'real MailerLite campaign evidence and Brújula anti-evidence'),
      sourceDigest(options.canonHandoff, canonHandoff, 'implementation handoff for canonizing MailerLite email style'),
      sourceDigest(options.brujulaProposal, brujulaProposal, 'Brújula-specific email direction and copy/visual proposal'),
    ],
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
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

const hasAssignedReceipts = (brujulaApply) => {
  const assigned = (brujulaApply?.assignedGroups ?? []).map((group) => group.name);
  return assigned.includes('CC · Source · Resource · Brújula')
    && assigned.includes('CC · Delivered · Guide · Brújula');
};

const buildEvidenceFlags = ({ brujulaPlan, brujulaApply, emailStyleCanon, emailEvidence, brujulaProposal }) => ({
  testDeliveryFunctional: hasAssignedReceipts(brujulaApply),
  currentWorkflowProtected: brujulaPlan?.localEvidence?.brujulaState?.currentWorkflowOffOrIncomplete === true,
  currentAntiEvidencePresent: brujulaPlan?.localEvidence?.emailStyle?.brujulaCurrentAntiEvidence === true,
  canonSaysEditorialLetter: emailStyleCanon.includes('debe sentirse como carta/editorial'),
  canonBodyPoppins: emailStyleCanon.includes('Poppins, sans-serif'),
  canonGeorgiaAccent: emailStyleCanon.includes('Georgia, serif'),
  canonSignatureRequired: emailStyleCanon.includes('firma visual de Alejandro'),
  evidenceInterMismatch: emailEvidence.includes('Brújula usa Inter') || emailEvidence.includes('renderiza Inter'),
  evidenceSignatureMissing: emailEvidence.includes('sin imagen de firma') || emailEvidence.includes('Falta la firma visual'),
  evidenceFooterDefault: emailEvidence.includes('footer default') || emailEvidence.includes('texto legal en inglés'),
  brujulaProposalHasContinuityLetter: brujulaProposal.includes('Carta de continuidad'),
});

const buildQaChecks = (flags) => [
  {
    id: 'functional_test_lane',
    status: flags.testDeliveryFunctional ? 'green' : 'red',
    evidence: flags.testDeliveryFunctional
      ? 'Approved test subscriber has Source + Delivered Brújula receipts.'
      : 'Approved test subscriber receipt assignment is missing or incomplete.',
    requiredBeforePublicUse: flags.testDeliveryFunctional ? [] : ['Restore test-lane proof before expanding Brújula.'],
  },
  {
    id: 'workflow_boundary',
    status: flags.currentWorkflowProtected ? 'green' : 'red',
    evidence: flags.currentWorkflowProtected
      ? 'Current Brújula workflow is still off/incomplete and protected.'
      : 'Workflow protection is not proven.',
    requiredBeforePublicUse: flags.currentWorkflowProtected ? [] : ['Re-check workflow state before any test/public action.'],
  },
  {
    id: 'typography_alignment',
    status: flags.evidenceInterMismatch && flags.canonBodyPoppins && flags.canonGeorgiaAccent ? 'yellow_blocker' : 'unknown',
    evidence: 'Current Brújula renders Inter; canon expects Poppins body and Georgia editorial accent.',
    requiredBeforePublicUse: [
      'Replace Inter/default template styling with Poppins body text.',
      'Use Georgia for editorial greeting/title/author accent where MailerLite allows.',
    ],
  },
  {
    id: 'signature_identity',
    status: flags.evidenceSignatureMissing && flags.canonSignatureRequired ? 'yellow_blocker' : 'unknown',
    evidence: 'Current Brújula test/readback lacks Alejandro visual signature; canon treats signature as email identity asset.',
    requiredBeforePublicUse: [
      'Add the observed Alejandro signature asset or declare an intentional fallback.',
      'Verify signature renders on mobile and desktop before audience use.',
    ],
  },
  {
    id: 'cta_style',
    status: 'yellow_blocker',
    evidence: 'Canon permits a button for guide delivery, but it must be sober and not default MailerLite blue/template style.',
    requiredBeforePublicUse: [
      'Use one CTA only for guide delivery.',
      'Use sober brand-aligned button styling or a textual fallback link.',
      'Avoid funnel/lead-magnet language in CTA and surrounding copy.',
    ],
  },
  {
    id: 'footer_and_socials',
    status: flags.evidenceFooterDefault ? 'yellow_blocker' : 'needs_review',
    evidence: 'Evidence report flags default/legal footer issues and social icons that need intentional review.',
    requiredBeforePublicUse: [
      'Review footer language in Spanish where MailerLite allows.',
      'Confirm unsubscribe/legal requirements remain compliant.',
      'Keep only intentional social links/icons.',
    ],
  },
  {
    id: 'copy_framing',
    status: flags.brujulaProposalHasContinuityLetter ? 'green_for_review' : 'needs_review',
    evidence: 'Brújula proposal reframes Email 2 as carta de continuidad instead of bonus/regalo/funnel.',
    requiredBeforePublicUse: [
      'Keep Email 1 as clean guide delivery.',
      'Keep Email 2 as editorial continuity, not an upsell or generic nurture sequence.',
    ],
  },
];

const buildImplementationPlan = () => [
  {
    step: 1,
    action: 'Rebuild or edit Brújula Email 1 template against email_style_canon.',
    scope: 'local_or_mailerlite_draft_only_after_explicit_tooling_approval',
    liveGate: 'closed_now',
  },
  {
    step: 2,
    action: 'Run a visual QA readback: typography, signature, CTA, footer, mobile/inbox.',
    scope: 'read_only_after_test_render_exists',
    liveGate: 'closed_now',
  },
  {
    step: 3,
    action: 'Send another test email only to approved test address if Alejandro explicitly approves the exact test.',
    scope: 'test_only',
    liveGate: 'requires_exact_approval',
  },
  {
    step: 4,
    action: 'Promote Brújula creative from yellow to green only after Brand email style QA passes.',
    scope: 'status_update_only',
    liveGate: 'no_public_use',
  },
];

const buildPacket = ({
  brujulaPlan,
  brujulaApply,
  emailStyleCanon,
  emailEvidence,
  canonHandoff,
  brujulaProposal,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const flags = buildEvidenceFlags({
    brujulaPlan,
    brujulaApply,
    emailStyleCanon,
    emailEvidence,
    canonHandoff,
    brujulaProposal,
  });
  const checks = buildQaChecks(flags);
  const blockerCount = checks.filter((check) => check.status.includes('blocker') || check.status === 'red').length;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_brujula_email_style_qa_packet',
    generatedAt,
    ok: true,
    status: 'brujula_email_style_qa_yellow_no_live_changes',
    executiveSummary: {
      functionalStatus: flags.testDeliveryFunctional ? 'green_test_delivery_verified' : 'not_verified',
      creativeStatus: 'yellow_needs_email_style_alignment',
      blockerCount,
      publicUseReady: false,
      nextBestMove: 'Use this QA packet as Brand/Web/MailerLite implementation criteria; do not send or publish until a later exact test-only approval exists.',
    },
    evidenceFlags: flags,
    qaChecks: checks,
    greenCriteria: [
      'Poppins body text, #474747, 16px/165%, #F4F7FA outer background and white content container are visible in render/readback.',
      'Georgia editorial accent is used where appropriate or a MailerLite limitation is declared.',
      'Alejandro signature asset or approved fallback is present.',
      'CTA is sober, functional, single-purpose and not default MailerLite blue/template style.',
      'Footer/legal/social area is intentional and compliant.',
      'No public/internal leakage: no lead magnet, funnel, CRM, tag, workflow or MailerLite language in customer-facing copy.',
    ],
    implementationPlan: buildImplementationPlan(),
    approvalBoundary: {
      allowedNow: [
        'Use this packet as local QA guidance.',
        'Route it to Brand/Web/CRM no-live review.',
        'Use it to prepare a future exact test-only approval packet.',
      ],
      closedNow: [
        'No MailerLite email edit or send from this packet.',
        'No workflow activation or production onboarding touch.',
        'No subscriber/group mutation.',
        'No Shopify publish or public launch.',
      ],
    },
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderList = (items = []) => items.map((item) => `- ${item}`).join('\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Brújula Email Style QA Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    `Functional status: ${packet.executiveSummary.functionalStatus}`,
    `Creative status: ${packet.executiveSummary.creativeStatus}`,
    `Public use ready: ${packet.executiveSummary.publicUseReady}`,
    `Blockers: ${packet.executiveSummary.blockerCount}`,
    '',
    '## Decision Ejecutiva',
    '',
    'Brújula funciona como prueba controlada de entrega, pero todavía no cumple el canon visual/editorial de email. Este paquete convierte el amarillo creativo en criterios concretos de corrección sin abrir MailerLite ni tocar audiencia.',
    '',
    '## QA Checks',
    '',
  ];

  for (const check of packet.qaChecks) {
    lines.push(`### ${check.id}`);
    lines.push(`- Status: ${check.status}`);
    lines.push(`- Evidence: ${check.evidence}`);
    lines.push('- Required before public use:');
    lines.push(renderList(check.requiredBeforePublicUse.length ? check.requiredBeforePublicUse : ['None.']));
    lines.push('');
  }

  lines.push('## Green Criteria', '');
  lines.push(renderList(packet.greenCriteria));

  lines.push('', '## Implementation Plan', '');
  for (const step of packet.implementationPlan) {
    lines.push(`- ${step.step}. ${step.action} Scope: ${step.scope}. Gate: ${step.liveGate}.`);
  }

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
  lines.push('- Solo reportes.');
  lines.push('- Sin MailerLite, Shopify o CRM live API calls.');
  lines.push('- Sin subscribers, grupos, workflows, envios, ledgers, cards, scoring ni Fact Store.');

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
  return buildPacket({
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
    functionalStatus: packet.executiveSummary.functionalStatus,
    creativeStatus: packet.executiveSummary.creativeStatus,
    blockerCount: packet.executiveSummary.blockerCount,
    publicUseReady: packet.executiveSummary.publicUseReady,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula email style QA packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEvidenceFlags,
  buildImplementationPlan,
  buildPacket,
  buildQaChecks,
  buildSafety,
  hasAssignedReceipts,
  parseArgs,
  renderMarkdown,
};
