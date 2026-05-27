#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-asset-build-scope-packet-2026-05-28';
const DEFAULT_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_STYLE_QA_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_style_qa_packet_inteligencia_descansar_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-asset-build-scope-packet.mjs [options]

Options:
  --local-email-asset-plan <path>  Local email asset plan JSON. Defaults to ${DEFAULT_LOCAL_EMAIL_ASSET_PLAN}
  --email-style-qa-packet <path>   Email Style QA JSON. Defaults to ${DEFAULT_EMAIL_STYLE_QA_PACKET}
  --out <path>                     Write JSON packet
  --markdown-out <path>            Write Markdown packet
  --help                           Show this help

Local-only approval scope packet for a future MailerLite draft email asset
build. It converts the local email asset plan into an exact human approval
boundary. It never creates or edits MailerLite assets, sends emails, assigns
subscribers, creates groups, attaches workflows, publishes Shopify, writes CRM,
appends ledgers, scores, touches Fact Store, or calls APIs.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    localEmailAssetPlan: DEFAULT_LOCAL_EMAIL_ASSET_PLAN,
    emailStyleQaPacket: DEFAULT_EMAIL_STYLE_QA_PACKET,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--local-email-asset-plan') options.localEmailAssetPlan = argv[++index];
    else if (arg === '--email-style-qa-packet') options.emailStyleQaPacket = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const readJsonWithRaw = async (path) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
    },
  };
};

const placeholderRowsFrom = (assetRows) => assetRows
  .map((asset) => asset?.cta?.placeholder)
  .filter(Boolean)
  .map((placeholder) => ({
    key: cleanString(placeholder.key),
    value: cleanString(placeholder.value),
    status: cleanString(placeholder.status) ?? 'inert_placeholder_needs_future_exact_source',
  }));

const replyCtaRowsFrom = (assetRows) => assetRows
  .filter((asset) => cleanString(asset?.cta?.destination) === 'reply')
  .map((asset) => ({
    step: asset.step,
    role: cleanString(asset.role),
    assetName: cleanString(asset.mailerLiteAssetNameDraft),
    ctaText: cleanString(asset?.cta?.text),
    destination: 'reply',
  }));

const exactApprovalPhraseFor = ({ launch, assets, placeholders }) => {
  const resourceName = cleanString(launch?.resourceName) ?? 'Inteligencia para descansar';
  const placeholderText = placeholders.length
    ? placeholders.map((placeholder) => placeholder.value).join(', ')
    : 'sin placeholders URL';
  return `Apruebo SOLO crear/editar como borradores en MailerLite los ${assets.length} assets del mini-lanzamiento ${resourceName} listados en este paquete, usando placeholders inertes (${placeholderText}), sin enviar correos, sin publicar, sin workflows, sin subscribers, sin crear grupos, sin Shopify, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.`;
};

const assetBuildRowsFrom = (assetRows) => assetRows.map((asset) => ({
  step: asset.step,
  role: cleanString(asset.role),
  mailerLiteAssetNameDraft: cleanString(asset.mailerLiteAssetNameDraft),
  selectedSubject: cleanString(asset.selectedSubject),
  selectedPreheader: cleanString(asset.selectedPreheader),
  cta: {
    text: cleanString(asset?.cta?.text),
    destination: cleanString(asset?.cta?.destination),
    placeholder: asset?.cta?.placeholder
      ? {
        key: cleanString(asset.cta.placeholder.key),
        value: cleanString(asset.cta.placeholder.value),
        status: cleanString(asset.cta.placeholder.status),
      }
      : null,
  },
  builderBlocks: asset.builderBlocks ?? [],
  styleImplementation: asset.styleImplementation ?? {},
  allowedAfterFutureExactApproval: [
    'create_or_edit_this_named_draft_asset_only',
    'use_inert_placeholders_or_exact_non_live_preview_urls_only',
    'render_review_inside_mailerlite_builder_before_any_seed_send_request',
  ],
  stillClosed: [
    'send_email',
    'attach_workflow_or_automation',
    'assign_or_read_subscribers',
    'create_or_assign_groups',
    'publish_shopify_or_connect_forms',
    'append_signal_ledger',
    'write_crm_cards',
    'change_scoring',
    'write_fact_store',
  ],
}));

const validateReadiness = ({ localEmailAssetPlan, emailStyleQaPacket }) => {
  const issues = [];
  const assets = Array.isArray(localEmailAssetPlan?.assetRows) ? localEmailAssetPlan.assetRows : [];

  if (localEmailAssetPlan?.ok !== true) issues.push('local_email_asset_plan_not_ok');
  if (localEmailAssetPlan?.status !== 'mini_launch_local_email_asset_plan_ready_no_live_changes') {
    issues.push(`local_email_asset_plan_status_not_ready:${localEmailAssetPlan?.status ?? 'missing'}`);
  }
  if (assets.length === 0) issues.push('local_email_asset_plan_has_no_assets');
  if (localEmailAssetPlan?.approvalBoundary?.readyForExactAssetBuildScopeRequestNow !== true) {
    issues.push('local_email_asset_plan_not_ready_for_exact_build_scope_request');
  }
  if (localEmailAssetPlan?.approvalBoundary?.readyForMailerLiteAssetBuildNow !== false) {
    issues.push('local_email_asset_plan_build_gate_unexpectedly_open');
  }
  if (localEmailAssetPlan?.approvalBoundary?.readyForSeedSendNow !== false) {
    issues.push('local_email_asset_plan_seed_send_gate_unexpectedly_open');
  }
  if (localEmailAssetPlan?.approvalBoundary?.canCreateOrEditMailerLiteAssetsNow !== false) {
    issues.push('local_email_asset_plan_can_create_or_edit_assets_now_unexpectedly_open');
  }
  if (localEmailAssetPlan?.safety?.mailerLiteApiCalled !== false) issues.push('local_email_asset_plan_reports_mailerlite_api_call');
  if (localEmailAssetPlan?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('local_email_asset_plan_reports_asset_mutation');
  if (localEmailAssetPlan?.safety?.sendsPerformed !== false) issues.push('local_email_asset_plan_reports_send');
  if (emailStyleQaPacket?.status !== 'mini_launch_email_style_qa_ready_for_local_asset_plan_no_live_changes') {
    issues.push(`email_style_qa_status_not_ready:${emailStyleQaPacket?.status ?? 'missing'}`);
  }
  if (emailStyleQaPacket?.approvalGate?.readyForMailerLiteAssetBuildNow !== false) {
    issues.push('email_style_qa_build_gate_unexpectedly_open');
  }
  if (emailStyleQaPacket?.approvalGate?.readyForSeedSendNow !== false) {
    issues.push('email_style_qa_seed_send_gate_unexpectedly_open');
  }

  for (const asset of assets) {
    if (!cleanString(asset?.mailerLiteAssetNameDraft)) issues.push(`asset_missing_draft_name:${asset?.step ?? 'unknown'}`);
    if (!cleanString(asset?.selectedSubject)) issues.push(`asset_missing_subject:${asset?.step ?? 'unknown'}`);
    if (!cleanString(asset?.selectedPreheader)) issues.push(`asset_missing_preheader:${asset?.step ?? 'unknown'}`);
  }

  return {
    ok: issues.length === 0,
    issues,
    assets,
  };
};

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

const buildEmailAssetBuildScopePacket = ({
  localEmailAssetPlan,
  emailStyleQaPacket,
  localEmailAssetPlanPath = DEFAULT_LOCAL_EMAIL_ASSET_PLAN,
  emailStyleQaPacketPath = DEFAULT_EMAIL_STYLE_QA_PACKET,
  generatedAt = new Date().toISOString(),
}) => {
  const readiness = validateReadiness({ localEmailAssetPlan, emailStyleQaPacket });
  const assets = assetBuildRowsFrom(readiness.assets);
  const placeholders = placeholderRowsFrom(readiness.assets);
  const replyCtas = replyCtaRowsFrom(readiness.assets);
  const canAskApproval = readiness.ok;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_email_asset_build_scope_packet',
    generatedAt,
    ok: canAskApproval,
    status: canAskApproval
      ? 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes'
      : 'email_asset_build_scope_packet_blocked_before_exact_human_approval',
    launch: localEmailAssetPlan?.launch ?? emailStyleQaPacket?.launch ?? null,
    executiveSummary: {
      assetCount: assets.length,
      inertUrlPlaceholderCount: placeholders.length,
      replyCtaCount: replyCtas.length,
      readyForExactAssetBuildApprovalRequestNow: canAskApproval,
      readyForMailerLiteAssetBuildNow: false,
      readyForSeedSendNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      openLiveMutationGateCount: 0,
    },
    sourcePlans: {
      localEmailAssetPlan: {
        path: resolve(localEmailAssetPlanPath),
        status: localEmailAssetPlan?.status ?? null,
        generatedAt: localEmailAssetPlan?.generatedAt ?? null,
      },
      emailStyleQaPacket: {
        path: resolve(emailStyleQaPacketPath),
        status: emailStyleQaPacket?.status ?? null,
        generatedAt: emailStyleQaPacket?.generatedAt ?? null,
      },
    },
    requestedFutureScope: {
      canAskAlejandroForApproval: canAskApproval,
      packetIsApprovalByItself: false,
      canExecuteBuildNow: false,
      exactApprovalPhrase: canAskApproval
        ? exactApprovalPhraseFor({
          launch: localEmailAssetPlan?.launch ?? emailStyleQaPacket?.launch,
          assets,
          placeholders,
        })
        : null,
      allowedAfterExactApproval: canAskApproval
        ? [
          `create_or_edit_exactly_${assets.length}_named_mailerlite_draft_email_assets`,
          'use_inert_placeholders_or_exact_non_live_preview_urls_only',
          'keep_assets_unpublished_unattached_and_unsent',
        ]
        : [],
      stillClosedEvenAfterThisApproval: [
        'seed_send_or_test_send',
        'workflow_or_automation_attachment',
        'subscriber_read_assignment_or_import',
        'group_creation_or_assignment',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
        'audience_launch',
      ],
    },
    assetBuildScope: {
      assets,
      inertUrlPlaceholders: placeholders,
      replyCtas,
    },
    preExecutionChecklist: [
      'Verify every draft asset name still matches the approved local email asset plan.',
      'Confirm selected subject and preheader for all four emails.',
      'Confirm signature asset path or text-signature fallback before builder work.',
      'Confirm footer, legal and social posture before builder work.',
      'Keep URL placeholders inert or replace only with exact non-live preview URLs named in approval.',
      'Run render QA before any separate seed-send approval request.',
      'Do not attach assets to workflows, groups or subscribers while building drafts.',
    ],
    hardStops: [
      'This packet is not approval.',
      'Exact Alejandro approval is still required before any MailerLite builder mutation.',
      'Asset-build approval cannot send email, attach workflow, assign or read subscribers, create groups, launch audience, publish Shopify, append ledgers, write cards, score, or touch Fact Store.',
      'Seed send remains a later separate approval after builder/render QA.',
    ],
    blockers: readiness.issues,
    safety: buildSafety(),
    sourceDigests: [
      {
        path: resolve(localEmailAssetPlanPath),
        present: true,
        consultedFor: 'local email asset plan, exact draft asset names, placeholders and closed build/send gates',
      },
      {
        path: resolve(emailStyleQaPacketPath),
        present: true,
        consultedFor: 'Email Style QA approval boundary and closed build/send gates',
      },
    ],
  };
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Email Asset Build Scope Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${packet.launch?.resourceName ?? packet.launch?.launchId ?? 'unknown'}`,
    `launch_id interno: ${packet.launch?.launchId ?? 'unknown'}`,
    `Asset count: ${packet.executiveSummary.assetCount}`,
    `Inert URL placeholders: ${packet.executiveSummary.inertUrlPlaceholderCount}`,
    `Reply CTAs: ${packet.executiveSummary.replyCtaCount}`,
    `Ready for exact asset-build approval request now: ${packet.executiveSummary.readyForExactAssetBuildApprovalRequestNow}`,
    `Ready for MailerLite build now: ${packet.executiveSummary.readyForMailerLiteAssetBuildNow}`,
    `Ready for seed send now: ${packet.executiveSummary.readyForSeedSendNow}`,
    `Can create/edit MailerLite assets now: ${packet.executiveSummary.canCreateOrEditMailerLiteAssetsNow}`,
    '',
    'Este paquete prepara la frontera humana. No crea ni edita assets en MailerLite y no autoriza envios, workflows, subscribers, grupos, Shopify o CRM.',
    '',
    '## Future Exact Approval Phrase',
    '',
    packet.requestedFutureScope.exactApprovalPhrase
      ? `\`${packet.requestedFutureScope.exactApprovalPhrase}\``
      : '- No approval phrase until blockers are resolved.',
    '',
    '## Assets In Scope',
    '',
  ];

  for (const asset of packet.assetBuildScope.assets) {
    lines.push(`### Email ${asset.step}: ${asset.role}`);
    lines.push(`- Draft asset name: ${asset.mailerLiteAssetNameDraft}`);
    lines.push(`- Subject: ${asset.selectedSubject}`);
    lines.push(`- Preheader: ${asset.selectedPreheader}`);
    lines.push(`- CTA: ${asset.cta.text ?? 'none'} (${asset.cta.destination ?? 'none'})`);
    lines.push(`- Placeholder: ${asset.cta.placeholder?.value ?? 'none'}`);
    lines.push('- Still closed:');
    for (const item of asset.stillClosed) lines.push(`  - ${item}`);
    lines.push('');
  }

  lines.push('## Pre-Execution Checklist', '');
  for (const item of packet.preExecutionChecklist) lines.push(`- ${item}`);

  lines.push('', '## Approval Boundary', '');
  lines.push(`- Can ask Alejandro for approval: ${packet.requestedFutureScope.canAskAlejandroForApproval}`);
  lines.push(`- Packet is approval by itself: ${packet.requestedFutureScope.packetIsApprovalByItself}`);
  lines.push(`- Can execute build now: ${packet.requestedFutureScope.canExecuteBuildNow}`);
  lines.push('- Allowed after exact approval:');
  for (const item of packet.requestedFutureScope.allowedAfterExactApproval) lines.push(`  - ${item}`);
  lines.push('- Still closed even after this approval:');
  for (const item of packet.requestedFutureScope.stillClosedEvenAfterThisApproval) lines.push(`  - ${item}`);

  lines.push('', '## Blockers', '');
  if (packet.blockers.length) {
    for (const blocker of packet.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- none');
  }

  lines.push('', '## Hard Stops', '');
  for (const item of packet.hardStops) lines.push(`- ${item}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of packet.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only packet generation.');
  lines.push('- Sin MailerLite API calls.');
  lines.push('- Sin MailerLite assets creados o editados.');
  lines.push('- Sin subscribers leidos o modificados.');
  lines.push('- Sin grupos/workflows/forms creados o editados.');
  lines.push('- Sin Shopify API calls o publish.');
  lines.push('- Sin CRM live API calls, Signal Event Ledger, cards, scoring o Fact Store.');
  lines.push('- Sin test email enviado.');

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
  const [
    localEmailAssetPlan,
    emailStyleQaPacket,
  ] = await Promise.all([
    readJsonWithRaw(options.localEmailAssetPlan),
    readJsonWithRaw(options.emailStyleQaPacket),
  ]);

  const packet = buildEmailAssetBuildScopePacket({
    localEmailAssetPlan: localEmailAssetPlan.value,
    emailStyleQaPacket: emailStyleQaPacket.value,
    localEmailAssetPlanPath: options.localEmailAssetPlan,
    emailStyleQaPacketPath: options.emailStyleQaPacket,
  });

  packet.sourceDigests = [
    {
      ...localEmailAssetPlan.digest,
      consultedFor: 'local email asset plan, exact draft asset names, placeholders and closed build/send gates',
    },
    {
      ...emailStyleQaPacket.digest,
      consultedFor: 'Email Style QA approval boundary and closed build/send gates',
    },
  ];

  return packet;
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
    assetCount: packet.executiveSummary.assetCount,
    inertUrlPlaceholderCount: packet.executiveSummary.inertUrlPlaceholderCount,
    replyCtaCount: packet.executiveSummary.replyCtaCount,
    canAskAlejandroForApproval: packet.requestedFutureScope.canAskAlejandroForApproval,
    canExecuteBuildNow: packet.requestedFutureScope.canExecuteBuildNow,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email asset build scope packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  assetBuildRowsFrom,
  buildEmailAssetBuildScopePacket,
  exactApprovalPhraseFor,
  parseArgs,
  renderMarkdown,
  validateReadiness,
};
