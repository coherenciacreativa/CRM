#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-design-packet-2026-05-27';
const DEFAULT_AUDIT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v1_audit_2026-05-27.json';
const DEFAULT_BRAND_DICTIONARY = process.env.BRAND_MAILERLITE_GROUP_DICTIONARY
  || '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-design-packet.mjs [options]

Options:
  --audit <path>             Onboarding v1 audit JSON. Defaults to ${DEFAULT_AUDIT}
  --brand-dictionary <path>  Brand Hub MailerLite group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --out <path>               Write JSON packet
  --markdown-out <path>      Write Markdown packet
  --help                     Show this help

Local-only design packet for Onboarding v2. It does not call MailerLite, does not
create groups, does not edit workflows, does not read subscribers, does not send
emails, and does not mutate CRM cards.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalizeName = (value) =>
  cleanString(value)
    ?.normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim() ?? null;

const parseArgs = (argv) => {
  const options = {
    audit: DEFAULT_AUDIT,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--audit') options.audit = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.audit) throw new Error('missing_audit');
  if (!options.brandDictionary) throw new Error('missing_brand_dictionary');
  return options;
};

const stripBackticks = (value) => cleanString(value)?.replace(/^`|`$/g, '') ?? null;

const parseMarkdownTableRow = (line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
  if (/^\|\s*-+/.test(trimmed)) return null;
  const cells = trimmed
    .slice(1, -1)
    .split('|')
    .map((cell) => cell.trim());
  if (cells.length < 3) return null;
  const name = stripBackticks(cells[0]);
  if (!name || name === 'Nombre de grupo') return null;
  return {
    name,
    layer: stripBackticks(cells[1]),
    status: stripBackticks(cells[2]),
    meaning: stripBackticks(cells[3]),
    primaryUse: stripBackticks(cells[4]),
    crmMapping: stripBackticks(cells[5]),
    rawCells: cells,
  };
};

const parseDictionaryGroups = (dictionaryMarkdown) => {
  const rows = dictionaryMarkdown
    .split(/\r?\n/)
    .map(parseMarkdownTableRow)
    .filter(Boolean);

  const idByName = new Map();
  const verificationPattern = /^-\s+`([^`]+)`:\s+`mailerLiteGroupId=([^`]+)`/;
  for (const line of dictionaryMarkdown.split(/\r?\n/)) {
    const match = line.match(verificationPattern);
    if (match) idByName.set(match[1], match[2]);
  }

  return rows.map((row) => ({
    ...row,
    mailerLiteGroupId: idByName.get(row.name) ?? null,
  }));
};

const dictionaryByName = (groups) =>
  new Map(groups.map((group) => [normalizeName(group.name), group]));

const groupStatus = (groupsByName, name) => {
  const group = groupsByName.get(normalizeName(name));
  if (!group) {
    return {
      name,
      status: 'missing_from_brand_dictionary',
      layer: null,
      mailerLiteGroupId: null,
      existsInBrandDictionary: false,
    };
  }
  return {
    name: group.name,
    status: group.status,
    layer: group.layer,
    mailerLiteGroupId: group.mailerLiteGroupId,
    existsInBrandDictionary: true,
    meaning: group.meaning,
    crmMapping: group.crmMapping,
  };
};

const articleGroupFor = (email) => {
  if (!email?.contentId?.startsWith('article_')) return null;
  if (email.contentId === 'article_sobre_el_amor') return 'CC · Sent · Article · Sobre el amor';
  const subject = cleanString(email.subject)
    ?.replace(/[🔋🚣🏻🦦👥🗝️😣📚🥹👻🍫🧭]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!subject) return null;
  const canonical = {
    article_relaciones_aumentan_energia: 'CC · Sent · Article · Relaciones que aumentan nuestra energia',
    article_navegar_bajonazos: 'CC · Sent · Article · Navegar los bajonazos',
    article_volver_a_fluir: 'CC · Sent · Article · Volver a fluir',
    article_algo_para_perder_miedo: 'CC · Sent · Article · Algo para perder el miedo',
    article_encontrar_companeros_camino: 'CC · Sent · Article · Encontrar compañeros de camino',
    article_clave_facilita_trabajo: 'CC · Sent · Article · La clave que facilita el trabajo',
    article_esto_mejoro_mi_relacion: 'CC · Sent · Article · Esto mejoro mi relacion',
    article_que_hacer_cuando_no_quiero_hacer: 'CC · Sent · Article · Que hacer cuando no quiero hacer',
    article_esto_me_sirve_malestar: 'CC · Sent · Article · Esto me sirve para el malestar',
  };
  return canonical[email.contentId] ?? null;
};

const buildEmailReceiptPlan = ({ emailSequence, groupsByName }) =>
  emailSequence.map((email) => {
    const groupName = articleGroupFor(email);
    const dictionary = groupName ? groupStatus(groupsByName, groupName) : null;
    return {
      order: email.order,
      subject: email.subject ?? email.name,
      name: email.name,
      contentId: email.contentId ?? null,
      recommendedReceiptGroup: groupName,
      dictionaryStatus: dictionary?.status ?? 'needs_brand_content_mapping',
      mailerLiteGroupId: dictionary?.mailerLiteGroupId ?? null,
      v2Action: groupName
        ? 'mark_sent_after_email_in_v2_if_persistent_add_action_is_verified'
        : 'ask_brand_to_define_content_id_before_receipt_group',
      safetyNote: groupName
        ? 'Sent marca envio/flujo del sistema; no significa lectura, apertura, click ni interes.'
        : 'No inventar un grupo de recibo para este email hasta que Brand mapee el contenido.',
    };
  });

const buildWorkflowBlueprint = ({ groupsByName, emailReceiptPlan }) => ({
  status: 'proposed_local_design_only',
  productionV1Posture: 'keep_live_untouched',
  proposedWorkflowName: 'Onboarding editorial v2 - DRAFT',
  trigger: {
    group: groupStatus(groupsByName, 'CC · Journey · Editorial onboarding · Eligible'),
    rationale: 'Disparar por elegibilidad limpia de recorrido, no por el grupo historico CSV/import. Source queda separado del estado de journey.',
    requiredBeforeLiveUse: [
      'Existe un workflow v2 draft/apagado y ya fue inspeccionado.',
      'El contacto seed entra solo al carril draft/test de v2.',
      'Alejandro aprueba explicitamente cualquier cambio de entrada productiva.',
    ],
  },
  entryAssignmentsExpectedBeforeTrigger: [
    groupStatus(groupsByName, 'CC · Source · IG onboarding'),
    groupStatus(groupsByName, 'CC · Journey · Editorial onboarding · Eligible'),
  ],
  firstActions: [
    {
      action: 'mark_journey_in_progress',
      group: groupStatus(groupsByName, 'CC · Journey · Editorial onboarding · In progress'),
      primitiveRisk: 'El tipo de accion de MailerLite debe probarse en un draft apagado. Add/copy persistente sirve; un move destructivo no basta para recibos durables.',
    },
  ],
  emailReceipts: emailReceiptPlan,
  completionActions: [
    {
      action: 'mark_journey_complete',
      group: groupStatus(groupsByName, 'CC · Journey · Editorial onboarding · Complete'),
    },
    {
      action: 'mark_general_newsletter_eligible',
      group: groupStatus(groupsByName, 'CC · Audience · General newsletter · Eligible'),
    },
    {
      action: 'remove_or_ignore_in_progress_after_completion',
      group: groupStatus(groupsByName, 'CC · Journey · Editorial onboarding · In progress'),
      note: 'Solo despues de verificar comportamiento en draft apagado; no remover grupos historicos v1 en este packet.',
    },
  ],
});

const buildLegacyBackfillRules = ({ historicalGroups }) =>
  historicalGroups.map((group) => {
    if (group.name === 'Received second email') {
      return {
        legacyGroup: group.name,
        posture: 'crm_review_only_not_content_receipt',
        evidenceStrength: 'medium_for_progress_weak_for_specific_content',
        explicitNonInference: 'No inferir CC · Sent · Article · Sobre el amor desde este grupo.',
      };
    }
    if (group.name === 'Onboarding complete') {
      return {
        legacyGroup: group.name,
        posture: 'keep_live_until_v2_entry_switch_and_audience_migration',
        evidenceStrength: 'medium_for_journey_completion_and_current_audience',
        explicitNonInference: 'No tratarlo como marcador limpio de audiencia vNext hasta separarlo.',
      };
    }
    return {
      legacyGroup: group.name,
      posture: group.recommendedPosture ?? 'review_before_use',
      evidenceStrength: 'review',
      explicitNonInference: group.risk ?? 'Ninguna mutacion vNext automatica desde un grupo historico por si solo.',
    };
  });

const buildApprovalGates = () => [
  {
    gate: 'create_missing_empty_groups',
    status: 'not_approved_here',
    allowedNow: false,
    approvalNeeded: 'Aprobacion humana exacta despues de re-scan fresco del planner.',
  },
  {
    gate: 'clone_or_build_disabled_v2_workflow',
    status: 'design_ready_not_approved_here',
    allowedNow: false,
    approvalNeeded: 'Aprobacion humana para crear/clonar un workflow draft apagado; nunca activarlo.',
  },
  {
    gate: 'test_seed_contact_in_v2',
    status: 'blocked_until_disabled_v2_exists_and_test_email_is_named',
    allowedNow: false,
    approvalNeeded: 'Aprobacion de un solo contacto seed, email exacto, grupos exactos y alcance exacto de test/envio.',
  },
  {
    gate: 'production_entry_switch',
    status: 'blocked_until_seed_tests_and_rollout_packet',
    allowedNow: false,
    approvalNeeded: 'Aprobacion explicita separada para conectar trafico real/entrada productiva a v2.',
  },
];

const safetyBlock = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  mailerLiteMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  crmMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildOnboardingV2Packet = ({ auditReport, dictionaryGroups, generatedAt = new Date().toISOString() }) => {
  const groupsByName = dictionaryByName(dictionaryGroups);
  const emailSequence = auditReport?.workflow?.graph?.emailSequence ?? [];
  const historicalGroups = auditReport?.historicalGroups ?? [];
  const emailReceiptPlan = buildEmailReceiptPlan({ emailSequence, groupsByName });
  const workflowBlueprint = buildWorkflowBlueprint({ groupsByName, emailReceiptPlan });
  const needsBrandMapping = emailReceiptPlan.filter((email) => email.dictionaryStatus === 'needs_brand_content_mapping');
  const missingOrProposedGroups = [
    ...workflowBlueprint.entryAssignmentsExpectedBeforeTrigger,
    workflowBlueprint.trigger.group,
    ...workflowBlueprint.firstActions.map((action) => action.group),
    ...workflowBlueprint.completionActions.map((action) => action.group),
    ...emailReceiptPlan
      .filter((email) => email.recommendedReceiptGroup)
      .map((email) => groupStatus(groupsByName, email.recommendedReceiptGroup)),
  ]
    .filter((group, index, all) => group?.name && all.findIndex((candidate) => candidate.name === group.name) === index)
    .filter((group) => group.status !== 'live_canonical');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_onboarding_v2_decision_design_packet',
    generatedAt,
    ok: true,
    status: 'ready_for_human_architecture_review',
    sourceEvidence: {
      onboardingV1AuditStatus: auditReport?.status ?? null,
      onboardingV1WorkflowId: auditReport?.workflow?.id ?? null,
      onboardingV1WorkflowName: auditReport?.workflow?.name ?? null,
      onboardingV1Enabled: auditReport?.workflow?.enabled ?? null,
      onboardingV1StepsCount: auditReport?.workflow?.stepsCount ?? null,
      onboardingV1EmailCount: emailSequence.length,
      onboardingV1ReportRecommendation: auditReport?.migrationRecommendation?.option ?? null,
      brandDictionaryGroupsParsed: dictionaryGroups.length,
    },
    decision: {
      recommendedOption: 'option_b_light_clone_onboarding_v2_then_switch_entry',
      why: 'V1 esta activo y es valioso, pero sus grupos historicos mezclan source, estado de recorrido, recibos de contenido y elegibilidad de audiencia. Un v2 draft conserva produccion mientras le da semantica limpia a MailerLite/CRM.',
      doNotDo: [
        'No intervenir directamente el Onboarding flow activo como siguiente movimiento por defecto.',
        'No usar Received second email como prueba de Sobre el amor.',
        'No conectar trafico real a v2 hasta aprobar seed tests y un rollout packet.',
      ],
    },
    workflowBlueprint,
    legacyBackfillRules: buildLegacyBackfillRules({ historicalGroups }),
    groupWorkNeededBeforeV2Pilot: {
      missingOrProposedGroups,
      needsFreshPlannerBeforeAnyCreation: true,
      createEmptyGroupApprovalIncludedHere: false,
    },
    brandHandoff: {
      needsReview: [
        'Mapear el primer email de onboarding a un content_id o declararlo welcome-only sin recibo Sent.',
        'Aplicar el canon visual/editorial de email antes de cualquier envio publico/audiencia de v2.',
        'Revisar inconsistencia de sender-name observada en v1: "Sender Alejandro Gómez" en un email.',
      ],
      needsBrandMapping,
    },
    crmHandoff: {
      needsReview: [
        'Tratar el diccionario Brand Hub como canon y este packet como diseno operativo derivado.',
        'Backfill de grupos historicos v1 en CRM solo como evidencia con niveles de fuerza, no como asignaciones automaticas de grupos MailerLite.',
        'Preparar nombres de evento para v2: source_assigned, journey_eligible, content_sent, journey_complete, audience_eligible.',
      ],
      mustNotInfer: [
        'No content_sent=article_sobre_el_amor desde Received second email.',
        'No audience.general_newsletter.eligible desde Onboarding complete hasta aprobar la regla de migracion.',
      ],
    },
    approvalGates: buildApprovalGates(),
    nextRecommendedStep: {
      name: 'disabled_v2_draft_build_packet',
      description: 'Preparar un packet exacto de implementacion sin cambios vivos para crear/clonar un draft apagado de Onboarding v2 y su carril seed-test.',
      requiresHumanApprovalBeforeMailerLiteMutation: true,
    },
    safety: safetyBlock(),
  };
};

const renderGroupLine = (group) =>
  `${group.name} (${group.status}${group.mailerLiteGroupId ? `, id ${group.mailerLiteGroupId}` : ''})`;

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v2 Decision/Design Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `- Opcion recomendada: ${packet.decision.recommendedOption}`,
    `- Por que: ${packet.decision.why}`,
    '',
    'No hacer:',
    '',
    ...packet.decision.doNotDo.map((item) => `- ${item}`),
    '',
    '## Evidencia Usada',
    '',
    `- Estado auditoria v1: ${packet.sourceEvidence.onboardingV1AuditStatus}`,
    `- Workflow v1: ${packet.sourceEvidence.onboardingV1WorkflowName} (${packet.sourceEvidence.onboardingV1WorkflowId})`,
    `- V1 enabled: ${packet.sourceEvidence.onboardingV1Enabled}`,
    `- Conteo pasos/emails v1: ${packet.sourceEvidence.onboardingV1StepsCount} / ${packet.sourceEvidence.onboardingV1EmailCount}`,
    `- Recomendacion v1: ${packet.sourceEvidence.onboardingV1ReportRecommendation}`,
    `- Grupos leidos del diccionario Brand: ${packet.sourceEvidence.brandDictionaryGroupsParsed}`,
    '',
    '## Workflow V2 Propuesto',
    '',
    `- Nombre de workflow: ${packet.workflowBlueprint.proposedWorkflowName}`,
    `- Postura produccion v1: ${packet.workflowBlueprint.productionV1Posture}`,
    `- Grupo trigger: ${renderGroupLine(packet.workflowBlueprint.trigger.group)}`,
    `- Criterio trigger: ${packet.workflowBlueprint.trigger.rationale}`,
    '',
    'Asignaciones esperadas antes del trigger:',
    '',
    ...packet.workflowBlueprint.entryAssignmentsExpectedBeforeTrigger.map((group) => `- ${renderGroupLine(group)}`),
    '',
    'Primera accion:',
    '',
    ...packet.workflowBlueprint.firstActions.map((action) =>
      `- ${action.action}: ${renderGroupLine(action.group)}. Riesgo: ${action.primitiveRisk}`),
    '',
    '## Plan de Recibos de Email',
    '',
  ];

  for (const email of packet.workflowBlueprint.emailReceipts) {
    lines.push(`- ${email.order}. ${email.subject}`);
    lines.push(`  - content_id: ${email.contentId ?? 'needs_brand_mapping'}`);
    lines.push(`  - grupo de recibo: ${email.recommendedReceiptGroup ?? 'ninguno todavia'}`);
    lines.push(`  - estado en diccionario: ${email.dictionaryStatus}`);
    lines.push(`  - accion v2: ${email.v2Action}`);
    lines.push(`  - seguridad: ${email.safetyNote}`);
  }

  lines.push('', '## Acciones de Cierre', '');
  for (const action of packet.workflowBlueprint.completionActions) {
    lines.push(`- ${action.action}: ${renderGroupLine(action.group)}`);
    if (action.note) lines.push(`  - ${action.note}`);
  }

  lines.push('', '## Reglas de Backfill Legacy', '');
  for (const rule of packet.legacyBackfillRules) {
    lines.push(`- ${rule.legacyGroup}: ${rule.posture}`);
    lines.push(`  - Evidencia: ${rule.evidenceStrength}`);
    lines.push(`  - No inferir: ${rule.explicitNonInference}`);
  }

  lines.push('', '## Grupos Por Resolver Antes del Piloto V2', '');
  if (!packet.groupWorkNeededBeforeV2Pilot.missingOrProposedGroups.length) {
    lines.push('- No hay grupos faltantes/propuestos para este packet.');
  } else {
    for (const group of packet.groupWorkNeededBeforeV2Pilot.missingOrProposedGroups) {
      lines.push(`- ${renderGroupLine(group)}`);
    }
  }
  lines.push('- Re-scan fresco del planner requerido antes de cualquier creacion de grupos: true');
  lines.push('- Este packet aprueba crear grupos vacios: false');

  lines.push('', '## Brand Handoff', '');
  for (const item of packet.brandHandoff.needsReview) lines.push(`- ${item}`);

  lines.push('', '## CRM Handoff', '');
  for (const item of packet.crmHandoff.needsReview) lines.push(`- ${item}`);
  for (const item of packet.crmHandoff.mustNotInfer) lines.push(`- No inferir: ${item}`);

  lines.push('', '## Gates de Aprobacion', '');
  for (const gate of packet.approvalGates) {
    lines.push(`- ${gate.gate}: allowedNow=${gate.allowedNow}; ${gate.approvalNeeded}`);
  }

  lines.push(
    '',
    '## Siguiente Paso Recomendado',
    '',
    `- ${packet.nextRecommendedStep.name}: ${packet.nextRecommendedStep.description}`,
    '- Requiere aprobacion humana antes de cualquier mutacion MailerLite: true',
    '',
    '## Seguridad',
    '',
    '- Packet local-only.',
    '- Sin llamadas a la API de MailerLite.',
    '- Sin ediciones, activacion, pausa ni desactivacion de workflows.',
    '- Sin creacion, borrado, renombre ni asignacion de grupos.',
    '- Sin lectura ni impresion de filas de subscribers.',
    '- Sin envios ni outbound.',
    '- Sin mutacion de CRM cards/scoring.',
  );

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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const auditReport = JSON.parse(await readFile(resolve(options.audit), 'utf8'));
  const dictionaryMarkdown = await readFile(resolve(options.brandDictionary), 'utf8');
  const dictionaryGroups = parseDictionaryGroups(dictionaryMarkdown);
  const packet = buildOnboardingV2Packet({ auditReport, dictionaryGroups });

  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    recommendedOption: packet.decision.recommendedOption,
    emailReceipts: packet.workflowBlueprint.emailReceipts.length,
    groupsNeedingWork: packet.groupWorkNeededBeforeV2Pilot.missingOrProposedGroups.length,
    nextRecommendedStep: packet.nextRecommendedStep.name,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 design packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEmailReceiptPlan,
  buildOnboardingV2Packet,
  buildWorkflowBlueprint,
  parseArgs,
  parseDictionaryGroups,
  renderMarkdown,
};
