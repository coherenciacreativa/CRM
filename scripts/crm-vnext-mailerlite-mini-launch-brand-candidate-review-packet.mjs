#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { readBrandDictionary } from './crm-vnext-mailerlite-receipt-taxonomy-plan.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-brand-candidate-review-packet-2026-05-27';
const DEFAULT_GROUP_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_EMAIL_ASSET_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_email_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_BRAND_DICTIONARY = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-brand-candidate-review-packet.mjs [options]

Options:
  --group-dry-run <path>             Mini-launch group dry-run JSON. Defaults to ${DEFAULT_GROUP_DRY_RUN}
  --brand-email-asset-packet <path>  Brand/email asset packet JSON. Defaults to ${DEFAULT_BRAND_EMAIL_ASSET_PACKET}
  --brand-dictionary <path>          Brand group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --out <path>                       Write JSON packet
  --markdown-out <path>              Write Markdown packet
  --help                             Show this help

Local-only handoff packet for Brand Hub review of missing MailerLite group
candidates from a Mini-Launch OS dry-run. It never calls MailerLite, Shopify,
CRM live APIs, browsers, subscribers, workflows, sends, ledgers, card writes,
scoring, or Fact Store.`;

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
    groupDryRun: DEFAULT_GROUP_DRY_RUN,
    brandEmailAssetPacket: DEFAULT_BRAND_EMAIL_ASSET_PACKET,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--group-dry-run') options.groupDryRun = argv[++index];
    else if (arg === '--brand-email-asset-packet') options.brandEmailAssetPacket = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJson = async (path) => JSON.parse(await readFile(resolve(path), 'utf8'));

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const loadSourceDigests = async (options) => {
  const groupDryRunRaw = await readFile(resolve(options.groupDryRun), 'utf8');
  const brandEmailAssetRaw = await readFile(resolve(options.brandEmailAssetPacket), 'utf8');
  const brandDictionaryRaw = await readFile(resolve(options.brandDictionary), 'utf8');

  return {
    brandDictionaryRaw,
    sourceDigests: [
      sourceDigest(options.groupDryRun, groupDryRunRaw, 'source of missing candidate rows and live-read safety gates'),
      sourceDigest(options.brandEmailAssetPacket, brandEmailAssetRaw, 'creative and copy readiness context for Brand review'),
      sourceDigest(options.brandDictionary, brandDictionaryRaw, 'Brand semantic canon for concrete MailerLite group names and statuses'),
    ],
  };
};

const extractCandidateRows = (groupDryRun) => {
  if (Array.isArray(groupDryRun?.proposedBrandDictionaryRows)) {
    return groupDryRun.proposedBrandDictionaryRows.filter((row) => row?.name);
  }
  return (groupDryRun?.plannedGroups ?? [])
    .map((group) => group?.proposedBrandDictionaryRow)
    .filter((row) => row?.name);
};

const dictionaryStateFor = (candidateRows, brandDictionary) => candidateRows.map((candidate) => {
  const brandRow = brandDictionary.groupsByNormalized.get(normalizeName(candidate.name));
  return {
    name: candidate.name,
    currentlyInBrandDictionary: Boolean(brandRow),
    currentBrandStatus: brandRow?.status ?? null,
    currentBrandLayer: brandRow?.layer ?? null,
    currentBrandPurpose: brandRow?.purpose ?? null,
  };
});

const buildBrandDecisionOptions = () => [
  {
    id: 'add_as_candidate',
    recommended: true,
    allowsLiveMailerLiteChanges: false,
    meaning: 'Register the rows in Brand Hub as candidate names only. This unblocks semantic review, not platform creation.',
    consequence: 'After this, CRM can rerun the dry-run and should still block empty group creation until Brand promotes or explicitly rejects/renames the rows.',
  },
  {
    id: 'rename_candidates',
    recommended: false,
    allowsLiveMailerLiteChanges: false,
    meaning: 'Brand proposes better names, layers, object labels, or CRM mappings before any MailerLite plan continues.',
    consequence: 'CRM must regenerate the launch group dry-run with the new names.',
  },
  {
    id: 'reject_mailerlite_groups_for_now',
    recommended: false,
    allowsLiveMailerLiteChanges: false,
    meaning: 'Keep this mini-launch CRM-first and do not create MailerLite receipt groups for this launch yet.',
    consequence: 'The launch can keep creative/research planning, but MailerLite receipt testing stays closed.',
  },
  {
    id: 'promote_to_proposed_local_later',
    recommended: false,
    allowsLiveMailerLiteChanges: false,
    meaning: 'A later Brand decision may promote accepted candidate rows to proposed_local if MailerLite groups become operationally necessary.',
    consequence: 'Promotion is not bundled with this packet and still would not create groups without Alejandro approval.',
  },
];

const buildCopyAndCreativeContext = (brandEmailAssetPacket) => ({
  assetPacketStatus: brandEmailAssetPacket?.status ?? null,
  brandReviewStatus: brandEmailAssetPacket?.readiness?.brandReviewStatus ?? null,
  voiceQaVerdict: brandEmailAssetPacket?.voiceQa?.verdict ?? null,
  publicDraftScan: {
    bannedInternalTermHits: brandEmailAssetPacket?.voiceQa?.publicTextScan?.bannedTermHits?.length ?? null,
    sometimesFormulaCount: brandEmailAssetPacket?.voiceQa?.publicTextScan?.sometimesFormulaCount ?? null,
    okForBrandReviewDraft: brandEmailAssetPacket?.voiceQa?.publicTextScan?.okForBrandReviewDraft ?? null,
  },
  readyForMailerLiteAssetBuildNow: brandEmailAssetPacket?.readiness?.readyForMailerLiteAssetBuildNow ?? false,
  readyForSeedSendNow: brandEmailAssetPacket?.readiness?.readyForSeedSendNow ?? false,
  readyForReceiptSeedTestNow: brandEmailAssetPacket?.readiness?.readyForReceiptSeedTestNow ?? false,
  readyForAudienceLaunchNow: brandEmailAssetPacket?.readiness?.readyForAudienceLaunchNow ?? false,
});

const buildSafety = () => ({
  localOnly: true,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  browserUsed: false,
  mailerLiteGroupsReadLiveInThisPacket: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
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

const buildOperatorHandoff = ({ launch, candidateRows }) => [
  'Brand/Mantis: revisa este packet como decision semantica, no como permiso operativo.',
  `Mini-lanzamiento: ${launch.resourceName} (${launch.launchId}).`,
  'CRM detecto que el dry-run de grupos esta bloqueado porque estos nombres no viven aun en el diccionario de Brand:',
  ...candidateRows.map((row) => `- ${row.name} | ${row.layer} | status sugerido: ${row.recommendedStatus} | mapping: ${row.crmMapping}`),
  'Decision pedida: agregarlos como candidate, proponer nombres mejores, o rechazarlos por ahora como grupos MailerLite.',
  'No autorices creacion de grupos, workflows, subscribers, envios ni uso en onboarding desde este packet.',
].join('\n');

const buildReviewPacket = ({
  groupDryRun,
  brandEmailAssetPacket,
  brandDictionary,
  brandDictionaryRaw,
  sourceDigests,
  generatedAt = new Date().toISOString(),
}) => {
  const candidateRows = extractCandidateRows(groupDryRun);
  const launch = {
    launchId: groupDryRun?.launch?.launchId ?? brandEmailAssetPacket?.launch?.launchId ?? null,
    resourceName: groupDryRun?.launch?.resourceName ?? brandEmailAssetPacket?.launch?.resourceName ?? null,
    resourceType: groupDryRun?.launch?.resourceType ?? brandEmailAssetPacket?.launch?.resourceType ?? null,
  };
  const dictionaryState = dictionaryStateFor(candidateRows, brandDictionary);
  const missingCandidateRows = dictionaryState.filter((row) => !row.currentlyInBrandDictionary);
  const allCandidatesAlreadyRegistered = candidateRows.length > 0 && missingCandidateRows.length === 0;
  const groupDryRunBlocked = groupDryRun?.status === 'blocked_until_brand_dictionary_candidates';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_launch_os_brand_candidate_review_packet',
    generatedAt,
    ok: candidateRows.length > 0,
    status: candidateRows.length
      ? 'brand_candidate_review_packet_ready_no_live_changes'
      : 'brand_candidate_review_packet_has_no_candidate_rows',
    launch,
    reviewReason: {
      sourceStatus: groupDryRun?.status ?? null,
      sourceSummary: groupDryRun?.summary ?? null,
      groupDryRunBlockedByMissingBrandCandidates: groupDryRunBlocked,
      reason: groupDryRunBlocked
        ? 'The mini-launch group dry-run cannot move toward even future empty-group creation until Brand decides what these candidate names mean.'
        : 'This packet preserves Brand review context for candidate rows already surfaced by the dry-run.',
    },
    brandDecisionRequest: {
      requestedDecision: 'choose_one_semantic_option_no_live_changes',
      recommendedDecision: allCandidatesAlreadyRegistered ? 'no_action_or_promote_later' : 'add_as_candidate',
      options: buildBrandDecisionOptions(),
      decisionDoesNotAuthorize: [
        'creating MailerLite groups',
        'assigning subscribers',
        'editing or attaching workflows',
        'sending seed or audience emails',
        'touching active onboarding',
        'writing CRM cards, scores, Signal Event Ledger or Fact Store',
      ],
    },
    candidateRows,
    dictionaryState: {
      brandDictionaryPath: brandDictionary.dictionaryPath,
      brandDictionaryChars: brandDictionaryRaw.length,
      currentKnownGroupCount: brandDictionary.names.length,
      missingCandidateCount: missingCandidateRows.length,
      allCandidatesAlreadyRegistered,
      rows: dictionaryState,
    },
    copyAndCreativeContext: buildCopyAndCreativeContext(brandEmailAssetPacket),
    gatesAfterCandidateOnly: {
      ifBrandAddsRowsAsCandidate: {
        canCreateGroups: false,
        canCreateNamedEmptyGroupsAfterExplicitApproval: false,
        canUseWorkflow: false,
        canAssignSubscribers: false,
        canSendEmail: false,
        nextRequiredGate: 'Brand must later promote accepted rows to proposed_local, then CRM must rerun the live read-only group dry-run.',
      },
      noApprovalPhraseAvailableFromThisPacket: true,
    },
    forbiddenInterpretations: [
      'candidate does not mean approved to create in MailerLite',
      'Delivered does not mean opened, read, clicked, liked or interested',
      'Source does not mean consent or proof of purchase',
      'a semantic Brand decision does not authorize subscriber/workflow/send mutations',
    ],
    operatorHandoff: buildOperatorHandoff({ launch, candidateRows }),
    sourceDigests,
    safety: buildSafety(),
  };
};

const renderMarkdownTableRows = (rows) => rows
  .map((row) => `| \`${row.name}\` | ${row.layer} | \`${row.recommendedStatus}\` | ${row.meaning} | ${row.usage} | \`${row.crmMapping}\` |`)
  .join('\n');

const renderDecisionOptions = (options) => options
  .map((option) => [
    `### ${option.id}${option.recommended ? ' (recommended)' : ''}`,
    `- Allows live MailerLite changes: ${option.allowsLiveMailerLiteChanges}`,
    `- Meaning: ${option.meaning}`,
    `- Consequence: ${option.consequence}`,
  ].join('\n'))
  .join('\n\n');

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Brand Candidate Review Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch.resourceName}`,
    `launch_id interno: ${packet.launch.launchId}`,
    '',
    'Este packet no toca MailerLite. Convierte el bloqueo del dry-run en una decision concreta para Brand: aceptar estos nombres como candidatos semanticos, renombrarlos o rechazarlos por ahora.',
    '',
    '## Por Que Existe',
    '',
    `- Dry-run source status: ${packet.reviewReason.sourceStatus}`,
    `- Blocked by missing Brand candidates: ${packet.reviewReason.groupDryRunBlockedByMissingBrandCandidates}`,
    `- Reason: ${packet.reviewReason.reason}`,
    '',
    '## Decision Pedida A Brand',
    '',
    `- Requested decision: ${packet.brandDecisionRequest.requestedDecision}`,
    `- Recommended decision: ${packet.brandDecisionRequest.recommendedDecision}`,
    '',
    renderDecisionOptions(packet.brandDecisionRequest.options),
    '',
    '## Candidate Rows',
    '',
    '| Nombre de grupo | Capa | Estado sugerido | Significado | Uso principal | CRM mapping |',
    '|---|---|---|---|---|---|',
    renderMarkdownTableRows(packet.candidateRows),
    '',
    '## Estado Actual En Diccionario Brand',
    '',
    `- Brand dictionary path: ${packet.dictionaryState.brandDictionaryPath}`,
    `- Known group count: ${packet.dictionaryState.currentKnownGroupCount}`,
    `- Missing candidate count: ${packet.dictionaryState.missingCandidateCount}`,
    `- All candidates already registered: ${packet.dictionaryState.allCandidatesAlreadyRegistered}`,
    '',
  ];

  for (const row of packet.dictionaryState.rows) {
    lines.push(`### ${row.name}`);
    lines.push(`- Currently in Brand dictionary: ${row.currentlyInBrandDictionary}`);
    lines.push(`- Current Brand status: ${row.currentBrandStatus}`);
    lines.push(`- Current Brand layer: ${row.currentBrandLayer}`);
    lines.push(`- Current Brand purpose: ${row.currentBrandPurpose}`);
    lines.push('');
  }

  lines.push('## Contexto Creativo', '');
  lines.push(`- Asset packet status: ${packet.copyAndCreativeContext.assetPacketStatus}`);
  lines.push(`- Brand review status: ${packet.copyAndCreativeContext.brandReviewStatus}`);
  lines.push(`- Voice QA verdict: ${packet.copyAndCreativeContext.voiceQaVerdict}`);
  lines.push(`- Banned internal term hits in public draft: ${packet.copyAndCreativeContext.publicDraftScan.bannedInternalTermHits}`);
  lines.push(`- "a veces" formula count: ${packet.copyAndCreativeContext.publicDraftScan.sometimesFormulaCount}`);
  lines.push(`- Ready for MailerLite asset build now: ${packet.copyAndCreativeContext.readyForMailerLiteAssetBuildNow}`);
  lines.push(`- Ready for seed send now: ${packet.copyAndCreativeContext.readyForSeedSendNow}`);
  lines.push(`- Ready for receipt seed test now: ${packet.copyAndCreativeContext.readyForReceiptSeedTestNow}`);
  lines.push(`- Ready for audience launch now: ${packet.copyAndCreativeContext.readyForAudienceLaunchNow}`);
  lines.push('');

  lines.push('## Gates Que Siguen Cerrados', '');
  lines.push('- Candidate-only decision cannot create groups.');
  lines.push('- Candidate-only decision cannot assign subscribers.');
  lines.push('- Candidate-only decision cannot attach or edit workflows.');
  lines.push('- Candidate-only decision cannot send seed or audience emails.');
  lines.push('- Candidate-only decision cannot touch onboarding.');
  lines.push(`- Next required gate: ${packet.gatesAfterCandidateOnly.ifBrandAddsRowsAsCandidate.nextRequiredGate}`);
  lines.push('');

  lines.push('## Forbidden Interpretations', '');
  for (const item of packet.forbiddenInterpretations) lines.push(`- ${item}`);
  lines.push('');

  lines.push('## Operator Handoff', '');
  lines.push('```text');
  lines.push(packet.operatorHandoff);
  lines.push('```');
  lines.push('');

  lines.push('## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);
  lines.push('');

  lines.push('## Seguridad', '');
  lines.push('- Local-only.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin Shopify API calls.');
  lines.push('- Sin browser.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin test email enviado.');
  lines.push('- Sin append al Signal Event Ledger.');
  lines.push('- Sin card writes, scoring, Fact Store u outbound.');

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
  const [groupDryRun, brandEmailAssetPacket, brandDictionary, { brandDictionaryRaw, sourceDigests }] = await Promise.all([
    readJson(options.groupDryRun),
    readJson(options.brandEmailAssetPacket),
    readBrandDictionary(options.brandDictionary),
    loadSourceDigests(options),
  ]);

  return buildReviewPacket({
    groupDryRun,
    brandEmailAssetPacket,
    brandDictionary,
    brandDictionaryRaw,
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
    launchId: packet.launch.launchId,
    recommendedDecision: packet.brandDecisionRequest.recommendedDecision,
    candidateCount: packet.candidateRows.length,
    missingCandidateCount: packet.dictionaryState.missingCandidateCount,
    readyForSeedSendNow: packet.copyAndCreativeContext.readyForSeedSendNow,
    readyForReceiptSeedTestNow: packet.copyAndCreativeContext.readyForReceiptSeedTestNow,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch Brand candidate review packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBrandDecisionOptions,
  buildReviewPacket,
  extractCandidateRows,
  parseArgs,
  renderMarkdown,
};
