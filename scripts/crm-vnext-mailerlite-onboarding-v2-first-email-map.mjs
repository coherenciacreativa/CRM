#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-first-email-map-2026-05-27';
const DEFAULT_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_RECEIPT_TAXONOMY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md';
const DEFAULT_GROUP_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-first-email-map.mjs [options]

Options:
  --audit <path>            Onboarding v1 audit JSON. Defaults to ${DEFAULT_AUDIT}
  --design-packet <path>    Onboarding v2 design JSON. Defaults to ${DEFAULT_DESIGN_PACKET}
  --receipt-taxonomy <path> Brand Hub MailerLite receipt taxonomy. Defaults to ${DEFAULT_RECEIPT_TAXONOMY}
  --group-dictionary <path> Brand Hub MailerLite group dictionary. Defaults to ${DEFAULT_GROUP_DICTIONARY}
  --email-style-canon <path> Brand Hub email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --out <path>              Write JSON packet
  --markdown-out <path>     Write Markdown packet
  --help                    Show this help

Local-only Brand/CRM mapping packet for Onboarding v2 Email 1. It decides whether
the first onboarding email should get a canonical Sent receipt or remain a
welcome/orientation email tracked by journey/CRM signals only. It never calls
MailerLite, reads subscribers, edits Brand Hub, writes CRM cards, or sends email.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalize = (value) =>
  cleanString(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const parseArgs = (argv) => {
  const options = {
    audit: DEFAULT_AUDIT,
    designPacket: DEFAULT_DESIGN_PACKET,
    receiptTaxonomy: DEFAULT_RECEIPT_TAXONOMY,
    groupDictionary: DEFAULT_GROUP_DICTIONARY,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--audit') options.audit = argv[++index];
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--receipt-taxonomy') options.receiptTaxonomy = argv[++index];
    else if (arg === '--group-dictionary') options.groupDictionary = argv[++index];
    else if (arg === '--email-style-canon') options.emailStyleCanon = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const extractFirstEmail = (auditReport, designPacket) => {
  const fromAudit = auditReport?.workflow?.graph?.emailSequence?.find((email) => email?.order === 1)
    ?? auditReport?.workflow?.graph?.emailSequence?.[0]
    ?? null;
  const fromDesign = designPacket?.workflowBlueprint?.emailReceipts?.find((email) => email?.order === 1)
    ?? designPacket?.workflowBlueprint?.emailReceipts?.[0]
    ?? null;

  return {
    order: 1,
    subject: cleanString(fromAudit?.subject) ?? cleanString(fromDesign?.subject),
    name: cleanString(fromAudit?.name) ?? cleanString(fromDesign?.name),
    contentId: cleanString(fromAudit?.contentId) ?? cleanString(fromDesign?.contentId),
    from: cleanString(fromAudit?.from),
    emailId: cleanString(fromAudit?.emailId),
    stepId: cleanString(fromAudit?.stepId),
    designDictionaryStatus: cleanString(fromDesign?.dictionaryStatus),
    designRecommendedReceiptGroup: cleanString(fromDesign?.recommendedReceiptGroup),
  };
};

const extractKnownContentIds = (taxonomyMarkdown, dictionaryMarkdown) => {
  const ids = new Set();
  for (const content of [taxonomyMarkdown, dictionaryMarkdown]) {
    for (const match of content.matchAll(/`(article_[a-z0-9_]+|guide_[a-z0-9_]+|quiz_[a-z0-9_]+)`/g)) {
      ids.add(match[1]);
    }
  }
  return [...ids].sort();
};

const historicalFirstEmailRule = (dictionaryMarkdown) => {
  const line = dictionaryMarkdown
    .split(/\r?\n/)
    .find((entry) => entry.includes('Se le envió el primer boletín'));
  if (!line) {
    return {
      found: false,
      rule: 'missing_historical_group_rule',
    };
  }
  return {
    found: true,
    rule: line.includes('No usar como recibo canonico')
      ? 'do_not_use_as_canonical_content_receipt'
      : 'review_historical_rule_before_use',
    rawLine: line,
  };
};

const classifyFirstEmail = ({ firstEmail, knownContentIds, historicalRule }) => {
  const subject = normalize(firstEmail.subject);
  const hasKnownContentId = Boolean(firstEmail.contentId && knownContentIds.includes(firstEmail.contentId));
  const looksLikeWelcome = /primera nota|bienvenida|welcome|hola/.test(subject ?? '');
  const historicalGroupBlocksReceipt = historicalRule.rule === 'do_not_use_as_canonical_content_receipt';

  if (hasKnownContentId) {
    return {
      recommendedPosture: 'canonical_content_receipt',
      confidence: 'high',
      reason: 'Email 1 already has a known Brand content_id.',
    };
  }

  if (looksLikeWelcome && historicalGroupBlocksReceipt) {
    return {
      recommendedPosture: 'welcome_orientation_no_sent_receipt',
      confidence: 'high',
      reason: 'Subject and Brand dictionary frame Email 1 as a first note/welcome step, while the historical first-email group is explicitly not a canonical content receipt.',
    };
  }

  return {
    recommendedPosture: 'brand_review_required_before_sent_receipt',
    confidence: 'medium',
    reason: 'No known content_id exists and the welcome signal is not strong enough to close the mapping automatically.',
  };
};

const buildFirstEmailMappingPacket = ({
  auditReport,
  designPacket,
  receiptTaxonomyMarkdown,
  groupDictionaryMarkdown,
  emailStyleCanonMarkdown,
  generatedAt = new Date().toISOString(),
}) => {
  const firstEmail = extractFirstEmail(auditReport, designPacket);
  const knownContentIds = extractKnownContentIds(receiptTaxonomyMarkdown, groupDictionaryMarkdown);
  const historicalRule = historicalFirstEmailRule(groupDictionaryMarkdown);
  const classification = classifyFirstEmail({ firstEmail, knownContentIds, historicalRule });
  const noSentReceipt = classification.recommendedPosture === 'welcome_orientation_no_sent_receipt';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_onboarding_v2_first_email_mapping',
    generatedAt,
    ok: true,
    status: noSentReceipt ? 'first_email_mapping_ready_no_sent_receipt' : 'first_email_mapping_needs_brand_review',
    sourceEvidence: {
      auditStatus: auditReport?.status ?? null,
      designStatus: designPacket?.status ?? null,
      emailStyleCanonPresent: emailStyleCanonMarkdown.includes('Un email de Marca debe sentirse como carta/editorial'),
      knownContentIdsCount: knownContentIds.length,
      historicalFirstEmailRule: historicalRule,
    },
    firstEmail,
    decision: {
      ...classification,
      recommendedContentId: noSentReceipt ? null : firstEmail.contentId ?? null,
      recommendedMailerLiteSentGroup: noSentReceipt ? null : firstEmail.designRecommendedReceiptGroup,
      createNewSentGroup: false,
      addToOnboardingV2MissingGroups: false,
      rationale: [
        'Email 1 cumple una funcion de bienvenida/orientacion dentro del journey editorial.',
        'Los grupos Sent se reservan para contenidos reutilizables o dedupe-critical.',
        'Crear un Sent para una bienvenida inflaria la taxonomia y confundiria contenido con estado de recorrido.',
      ],
    },
    v2ImplementationGuidance: {
      afterEmail1: [
        'Mantener o marcar CC · Journey · Editorial onboarding · In progress.',
        'No asignar CC · Sent · Article · ... para Email 1 en v2.',
        'No inferir contenido canonico desde Se le envió el primer boletín.',
      ],
      crmSignals: [
        {
          event: 'journey_welcome_sent',
          status: 'candidate_event_name',
          meaning: 'El sistema envio la primera nota de bienvenida/orientacion del onboarding editorial.',
          notAContentReceipt: true,
        },
      ],
      futurePromotionRule: 'Si Brand decide luego convertir esta primera nota en carta/articulo reutilizable, crear content_id y grupo Sent en un packet separado.',
    },
    brandHandoff: {
      recommendation: noSentReceipt
        ? 'Adoptar Email 1 como welcome-only/orientacion sin grupo Sent.'
        : 'Revisar si Email 1 merece content_id canonico antes de v2.',
      noLiveChangeRequired: true,
      emailStyleReminder: 'Cuando v2 tenga draft, aplicar email_style_canon antes de cualquier seed/public test.',
    },
    crmHandoff: {
      recommendation: 'Registrar Email 1 como evento de journey si se necesita observabilidad; no como content_sent.',
      noCardOrScoreMutation: true,
    },
    safety: {
      localOnly: true,
      mailerLiteApiCalled: false,
      brandHubMutationsPerformed: false,
      crmCardMutationsPerformed: false,
      subscriberRowsRead: false,
      workflowMutationsPerformed: false,
      sendsPerformed: false,
      outboundPerformed: false,
      tokensPrinted: false,
    },
  };
};

const renderMarkdown = (packet) => [
  '# MailerLite Launch OS v0 - Onboarding v2 First Email Mapping',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  '',
  '## Decision Ejecutiva',
  '',
  `- Email: ${packet.firstEmail.subject}`,
  `- Postura recomendada: ${packet.decision.recommendedPosture}`,
  `- Confianza: ${packet.decision.confidence}`,
  `- Razon: ${packet.decision.reason}`,
  `- content_id recomendado: ${packet.decision.recommendedContentId ?? 'ninguno'}`,
  `- grupo Sent recomendado: ${packet.decision.recommendedMailerLiteSentGroup ?? 'ninguno'}`,
  `- crear nuevo grupo Sent: ${packet.decision.createNewSentGroup}`,
  '',
  '## Rationale',
  '',
  ...packet.decision.rationale.map((item) => `- ${item}`),
  '',
  '## Evidencia',
  '',
  `- Audit status: ${packet.sourceEvidence.auditStatus}`,
  `- Design status: ${packet.sourceEvidence.designStatus}`,
  `- Known content IDs: ${packet.sourceEvidence.knownContentIdsCount}`,
  `- Historical first-email rule: ${packet.sourceEvidence.historicalFirstEmailRule.rule}`,
  `- Email style canon present: ${packet.sourceEvidence.emailStyleCanonPresent}`,
  '',
  '## Guia Para V2',
  '',
  ...packet.v2ImplementationGuidance.afterEmail1.map((item) => `- ${item}`),
  '',
  '## CRM Signals',
  '',
  ...packet.v2ImplementationGuidance.crmSignals.map((signal) =>
    `- ${signal.event}: ${signal.meaning} notAContentReceipt=${signal.notAContentReceipt}`),
  '',
  '## Brand Handoff',
  '',
  `- ${packet.brandHandoff.recommendation}`,
  `- ${packet.brandHandoff.emailStyleReminder}`,
  '',
  '## CRM Handoff',
  '',
  `- ${packet.crmHandoff.recommendation}`,
  '',
  '## Safety',
  '',
  '- Local-only.',
  '- Sin llamadas a MailerLite.',
  '- Sin ediciones a Brand Hub.',
  '- Sin lectura de subscribers.',
  '- Sin workflow edits.',
  '- Sin envios.',
  '- Sin mutacion de CRM cards/scoring.',
  '- Sin outbound.',
].join('\n');

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
  const [auditReport, designPacket, receiptTaxonomyMarkdown, groupDictionaryMarkdown, emailStyleCanonMarkdown] = await Promise.all([
    readFile(resolve(options.audit), 'utf8').then(JSON.parse),
    readFile(resolve(options.designPacket), 'utf8').then(JSON.parse),
    readFile(resolve(options.receiptTaxonomy), 'utf8'),
    readFile(resolve(options.groupDictionary), 'utf8'),
    readFile(resolve(options.emailStyleCanon), 'utf8'),
  ]);

  return buildFirstEmailMappingPacket({
    auditReport,
    designPacket,
    receiptTaxonomyMarkdown,
    groupDictionaryMarkdown,
    emailStyleCanonMarkdown,
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
    firstEmailSubject: packet.firstEmail.subject,
    recommendedPosture: packet.decision.recommendedPosture,
    recommendedContentId: packet.decision.recommendedContentId,
    recommendedMailerLiteSentGroup: packet.decision.recommendedMailerLiteSentGroup,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 first email map failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildFirstEmailMappingPacket,
  classifyFirstEmail,
  extractFirstEmail,
  extractKnownContentIds,
  historicalFirstEmailRule,
  parseArgs,
  renderMarkdown,
};
