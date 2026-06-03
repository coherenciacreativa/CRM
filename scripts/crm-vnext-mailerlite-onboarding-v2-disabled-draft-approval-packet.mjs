#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-disabled-draft-approval-packet-2026-06-03';
const DEFAULT_PREFLIGHT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_fresh_preflight_current_2026-06-03.json';
const DEFAULT_BOUNDARY_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_boundary_packet_current_2026-06-03.json';
const DEFAULT_MAPPING_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_draft_content_mapping_hardening_2026-06-03.json';
const DEFAULT_OUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_approval_packet_current_2026-06-03.json';
const DEFAULT_MARKDOWN_OUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_disabled_draft_build_approval_packet_current_2026-06-03.md';
const TARGET_WORKFLOW_NAME = 'Onboarding editorial v2 - DRAFT';
const PROTECTED_V1_WORKFLOW_NAME = 'Onboarding flow';

const EXACT_APPROVAL_PHRASE =
  'Apruebo crear o clonar únicamente un workflow draft disabled/inactive de MailerLite llamado Onboarding editorial v2 - DRAFT para preparar Onboarding v2, usando el preflight verde mailerlite_onboarding_v2_disabled_draft_build_fresh_preflight_current_2026-06-03 como evidencia de que Onboarding flow v1 sigue enabled=true, complete=true y broken=false, los 12 grupos v2 requeridos existen con active_count=0 y no hay workflow v2 conflictivo, sin activar el workflow, sin conectarlo a tráfico real, sin tocar productive Onboarding flow v1, sin leer ni mutar subscribers, sin asignar seed contacts, sin crear, renombrar, asignar ni mutar groups, tags, segments, audiences, campaigns o sends, sin enviar correos, sin publicar, sin programar, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store; si antes de ejecutar no se puede garantizar que el workflow quedará disabled/inactive y sin tráfico real, detenerse y reportar; si cualquier QA falla, detenerse y generar recibo local.';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-disabled-draft-approval-packet.mjs [options]

Options:
  --preflight <path>         Fresh read-only preflight JSON. Defaults to ${DEFAULT_PREFLIGHT}
  --boundary-packet <path>   Disabled draft boundary JSON. Defaults to ${DEFAULT_BOUNDARY_PACKET}
  --mapping-packet <path>    Onboarding v2 mapping JSON. Defaults to ${DEFAULT_MAPPING_PACKET}
  --out <path>               Write JSON approval packet. Defaults to ${DEFAULT_OUT}
  --markdown-out <path>      Write Markdown approval packet. Defaults to ${DEFAULT_MARKDOWN_OUT}
  --help                     Show this help

Local-only approval packet for the next Onboarding v2 disabled draft workflow
build boundary. It never calls live APIs, opens UI, creates/clones/edits
workflows, reads subscribers, mutates groups/tags/segments/campaigns/sends,
touches Shopify/CRM, appends ledgers, writes cards/scoring, touches Fact Store,
or prints raw IDs/tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const parseArgs = (argv) => {
  const options = {
    preflight: DEFAULT_PREFLIGHT,
    boundaryPacket: DEFAULT_BOUNDARY_PACKET,
    mappingPacket: DEFAULT_MAPPING_PACKET,
    out: DEFAULT_OUT,
    markdownOut: DEFAULT_MARKDOWN_OUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--preflight') options.preflight = argv[++index];
    else if (arg === '--boundary-packet') options.boundaryPacket = argv[++index];
    else if (arg === '--mapping-packet') options.mappingPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      sha256: sha256(raw),
      consultedFor,
      rawIdsPrinted: false,
      tokensPrinted: false,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  liveApisCalled: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  workflowsOrAutomationsCreatedEditedActivatedPausedOrDisabled: false,
  workflowMutationsPerformed: false,
  productiveOnboardingV1Touched: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  subscriberMutationsPerformed: false,
  groupsTagsSegmentsMutated: false,
  campaignsMutated: false,
  sendsPerformed: false,
  campaignsPublished: false,
  campaignsScheduled: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  crmLiveApiCalled: false,
  ledgersTouched: false,
  cardsTouched: false,
  scoringTouched: false,
  factStoreTouched: false,
  exactUrlsPrinted: false,
  rawIdsPrinted: false,
  tokensPrinted: false,
});

const v1Green = (preflight) =>
  preflight?.qa?.productiveV1StillGreen?.ok === true
  && preflight?.qa?.productiveV1StillGreen?.workflow?.name === PROTECTED_V1_WORKFLOW_NAME
  && preflight?.qa?.productiveV1StillGreen?.workflow?.enabled === true
  && preflight?.qa?.productiveV1StillGreen?.workflow?.complete === true
  && preflight?.qa?.productiveV1StillGreen?.workflow?.broken === false;

const v2GroupsGreen = (preflight) =>
  preflight?.qa?.v2GroupsStillEmptyAndAvailable?.ok === true
  && preflight?.qa?.v2GroupsStillEmptyAndAvailable?.targetCount === 12
  && preflight?.qa?.v2GroupsStillEmptyAndAvailable?.foundCount === 12
  && preflight?.qa?.v2GroupsStillEmptyAndAvailable?.emptyCount === 12
  && Array.isArray(preflight?.qa?.v2GroupsStillEmptyAndAvailable?.targets)
  && preflight.qa.v2GroupsStillEmptyAndAvailable.targets.every((target) => target?.ok === true && target?.activeCount === 0);

const noV2WorkflowConflict = (preflight) =>
  preflight?.qa?.noConflictingV2Workflow?.ok === true
  && preflight?.qa?.noConflictingV2Workflow?.workflowName === TARGET_WORKFLOW_NAME
  && preflight?.qa?.noConflictingV2Workflow?.exactMatchCount === 0;

const buildBlockers = ({ preflight, boundaryPacket, mappingPacket }) => [
  ...(preflight?.ok === true ? [] : ['fresh_preflight_not_ok']),
  ...(preflight?.status === 'onboarding_v2_disabled_draft_build_fresh_preflight_green' ? [] : [`fresh_preflight_status_not_green:${preflight?.status ?? 'missing'}`]),
  ...(v1Green(preflight) ? [] : ['productive_v1_not_green']),
  ...(v2GroupsGreen(preflight) ? [] : ['required_v2_groups_not_all_empty']),
  ...(noV2WorkflowConflict(preflight) ? [] : ['v2_workflow_conflict_or_unknown']),
  ...(boundaryPacket?.ok === true ? [] : ['boundary_packet_not_ok']),
  ...(boundaryPacket?.futureBuildScope?.workflowName === TARGET_WORKFLOW_NAME ? [] : ['boundary_packet_target_workflow_mismatch']),
  ...(mappingPacket?.ok === true ? [] : ['mapping_packet_not_ok']),
  ...(mappingPacket?.draftSkeleton?.workflowName === TARGET_WORKFLOW_NAME ? [] : ['mapping_packet_workflow_name_mismatch']),
];

const buildPacket = ({
  preflight,
  boundaryPacket,
  mappingPacket,
  evidenceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = buildBlockers({ preflight, boundaryPacket, mappingPacket });
  const ready = blockers.length === 0;
  const draftSkeleton = mappingPacket?.draftSkeleton ?? {};
  const contentReceiptMap = Array.isArray(mappingPacket?.contentReceiptMap) ? mappingPacket.contentReceiptMap : [];
  const v2GroupTargets = preflight?.qa?.v2GroupsStillEmptyAndAvailable?.targets ?? [];

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'local_approval_packet_no_live_changes',
    ok: ready,
    status: ready
      ? 'onboarding_v2_disabled_draft_build_approval_packet_ready_no_live_changes'
      : 'onboarding_v2_disabled_draft_build_approval_packet_blocked_no_live_changes',
    executiveSummary: {
      canAskAlejandroForApproval: ready,
      exactApprovalPhraseAvailable: ready,
      exactApprovalPhrasePrinted: ready,
      packetIsApprovalByItself: false,
      canExecuteNow: false,
      blockerCount: blockers.length,
      targetWorkflowName: TARGET_WORKFLOW_NAME,
      protectedV1WorkflowName: PROTECTED_V1_WORKFLOW_NAME,
      preflightGreen: preflight?.ok === true,
      productiveV1Green: v1Green(preflight),
      v2GroupsFound: preflight?.qa?.v2GroupsStillEmptyAndAvailable?.foundCount ?? null,
      v2GroupsEmpty: preflight?.qa?.v2GroupsStillEmptyAndAvailable?.emptyCount ?? null,
      v2WorkflowConflictCount: preflight?.qa?.noConflictingV2Workflow?.exactMatchCount ?? null,
      routeMustGuaranteeDisabledInactiveBeforeMutation: true,
      seedTestAuthorized: false,
      productionEntrySwitchAuthorized: false,
      liveActionAllowedNow: false,
    },
    sourceEvidence: {
      preflightStatus: preflight?.status ?? null,
      boundaryPacketStatus: boundaryPacket?.status ?? null,
      mappingPacketStatus: mappingPacket?.status ?? null,
      groupsRead: preflight?.sourceEvidence?.groupsRead ?? null,
      automationsRead: preflight?.sourceEvidence?.automationsRead ?? null,
      evidenceDigests,
    },
    approvalBoundary: {
      humanBoundaryId: 'onboarding_v2_disabled_draft_build_live_mutation',
      exactApprovalPhrase: ready ? EXACT_APPROVAL_PHRASE : null,
      expectedApprovalPhraseSha256: ready ? sha256(EXACT_APPROVAL_PHRASE) : null,
      exactApprovalPhraseAvailable: ready,
      packetIsApprovalByItself: false,
      canExecuteNow: false,
    },
    mutationScopeIfLaterApproved: {
      operation: 'create_or_clone_one_disabled_inactive_workflow_draft_only',
      targetWorkflowName: TARGET_WORKFLOW_NAME,
      requiredState: 'disabled_or_draft_inactive',
      triggerGroup: draftSkeleton?.trigger?.group ?? boundaryPacket?.futureBuildScope?.triggerGroup ?? null,
      mustNotUseTrigger: draftSkeleton?.trigger?.mustNotUse ?? [boundaryPacket?.futureBuildScope?.mustNotUseTrigger].filter(Boolean),
      firstAction: draftSkeleton?.firstAction ?? null,
      completionActions: draftSkeleton?.completionActions ?? [],
      emailCount: contentReceiptMap.length,
      welcomeOnlyEmailCount: contentReceiptMap.filter((item) => item?.receiptPosture === 'welcome_orientation_no_sent_receipt').length,
      canonicalArticleReceiptCount: contentReceiptMap.filter((item) => item?.receiptPosture === 'canonical_article_sent_receipt').length,
      v2GroupNames: v2GroupTargets.map((target) => target.name),
    },
    routeRequirementsBeforeExecution: [
      'Operator must be able to create or clone the workflow while keeping it disabled/inactive.',
      'Operator must stop if MailerLite requires activation, real traffic routing, subscriber assignment, group mutation, seed contact assignment or v1 edits as part of the build.',
      'Operator must verify the resulting workflow remains disabled/inactive before recording success.',
      'Operator must produce a local receipt with before/after QA and no subscriber rows printed.',
    ],
    stillClosedAfterThisApproval: [
      'workflow activation',
      'productive Onboarding v1 edits',
      'subscriber read, import, assignment or mutation',
      'seed contact test',
      'production entry switch',
      'group, tag, segment, audience, campaign or send mutation outside the single disabled draft workflow build',
      'email send, publish or schedule',
      'Shopify mutation',
      'CRM write',
      'ledger append',
      'card write',
      'scoring change',
      'Fact Store write',
    ],
    hardStops: [
      ...blockers,
      'stop_if_route_cannot_guarantee_disabled_inactive_workflow',
      'stop_if_mailerlite_requires_activation_or_real_traffic_to_create_or_clone',
      'stop_if_any_subscriber_row_read_or_assignment_is_needed',
      'stop_if_productive_onboarding_v1_would_be_touched',
      'stop_if_seed_test_or_production_entry_switch_is_requested_in_same_operation',
    ],
    blockers,
    safety: buildSafety(),
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v2 Disabled Draft Build Approval Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    packet.ok
      ? 'El packet esta listo para que Alejandro apruebe o difiera el build de un unico workflow draft disabled/inactive de Onboarding v2.'
      : 'El packet no esta listo para aprobacion; resolver blockers primero.',
    '',
    'Este packet no ejecuta nada y no autoriza por si mismo ningun cambio vivo.',
    '',
    '## Evidencia',
    '',
    `- Preflight status: ${packet.sourceEvidence.preflightStatus}`,
    `- Boundary packet status: ${packet.sourceEvidence.boundaryPacketStatus}`,
    `- Mapping packet status: ${packet.sourceEvidence.mappingPacketStatus}`,
    `- Groups read: ${packet.sourceEvidence.groupsRead ?? 'n/a'}`,
    `- Automations read: ${packet.sourceEvidence.automationsRead ?? 'n/a'}`,
    `- Productive v1 green: ${packet.executiveSummary.productiveV1Green}`,
    `- V2 groups found: ${packet.executiveSummary.v2GroupsFound ?? 'n/a'}`,
    `- V2 groups empty: ${packet.executiveSummary.v2GroupsEmpty ?? 'n/a'}`,
    `- V2 workflow conflict count: ${packet.executiveSummary.v2WorkflowConflictCount ?? 'n/a'}`,
    '',
    '## Scope If Later Approved',
    '',
    `- Operation: ${packet.mutationScopeIfLaterApproved.operation}`,
    `- Target workflow: ${packet.mutationScopeIfLaterApproved.targetWorkflowName}`,
    `- Required state: ${packet.mutationScopeIfLaterApproved.requiredState}`,
    `- Trigger group: ${packet.mutationScopeIfLaterApproved.triggerGroup ?? 'n/a'}`,
    `- Email count: ${packet.mutationScopeIfLaterApproved.emailCount}`,
    `- Welcome-only email count: ${packet.mutationScopeIfLaterApproved.welcomeOnlyEmailCount}`,
    `- Canonical article receipt count: ${packet.mutationScopeIfLaterApproved.canonicalArticleReceiptCount}`,
    '',
    '## Route Requirements',
    '',
    ...packet.routeRequirementsBeforeExecution.map((item) => `- ${item}`),
    '',
    '## Still Closed After This Approval',
    '',
    ...packet.stillClosedAfterThisApproval.map((item) => `- ${item}`),
    '',
    '## Approval Phrase',
    '',
    packet.approvalBoundary.exactApprovalPhrase
      ? `\`${packet.approvalBoundary.exactApprovalPhrase}\``
      : '- No approval phrase until blockers are resolved.',
    '',
    '## Blockers',
    '',
    packet.blockers.length ? packet.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None.',
    '',
    '## Hard Stops',
    '',
    ...packet.hardStops.map((item) => `- ${item}`),
    '',
    '## Safety',
    '',
    '- Local/report-only packet.',
    '- No MailerLite API/UI call.',
    '- No workflow created, cloned, edited, activated, paused or disabled.',
    '- No subscribers read or printed.',
    '- No groups/tags/segments/campaigns/sends mutated.',
    '- No Shopify, CRM, ledgers, cards, scoring or Fact Store.',
    '- No raw IDs or tokens printed.',
    '',
  ];

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

  const preflightEvidence = await readJsonWithDigest(options.preflight, 'fresh disabled draft build preflight');
  const boundaryEvidence = await readJsonWithDigest(options.boundaryPacket, 'disabled draft build boundary packet');
  const mappingEvidence = await readJsonWithDigest(options.mappingPacket, 'Onboarding v2 mapping packet');
  const packet = buildPacket({
    preflight: preflightEvidence.value,
    boundaryPacket: boundaryEvidence.value,
    mappingPacket: mappingEvidence.value,
    evidenceDigests: [preflightEvidence.digest, boundaryEvidence.digest, mappingEvidence.digest],
  });

  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    canAskAlejandroForApproval: packet.executiveSummary.canAskAlejandroForApproval,
    exactApprovalPhraseAvailable: packet.executiveSummary.exactApprovalPhraseAvailable,
    canExecuteNow: packet.executiveSummary.canExecuteNow,
    blockerCount: packet.executiveSummary.blockerCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 disabled draft approval packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  EXACT_APPROVAL_PHRASE,
  buildBlockers,
  buildPacket,
  parseArgs,
  renderMarkdown,
  v1Green,
  v2GroupsGreen,
  noV2WorkflowConflict,
};
