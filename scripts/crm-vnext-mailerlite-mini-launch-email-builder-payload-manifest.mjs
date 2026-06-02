#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-email-builder-payload-manifest-2026-05-28';
const DEFAULT_EMAIL_SEQUENCE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json';
const DEFAULT_LOCAL_EMAIL_ASSET_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_local_email_asset_plan_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_scope_packet_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_STYLE_CANON = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-email-builder-payload-manifest.mjs [options]

Options:
  --email-sequence-packet <path>            Mini-launch email sequence JSON. Defaults to ${DEFAULT_EMAIL_SEQUENCE_PACKET}
  --local-email-asset-plan <path>           Local email asset plan JSON. Defaults to ${DEFAULT_LOCAL_EMAIL_ASSET_PLAN}
  --email-asset-build-scope-packet <path>   Future exact build-scope packet JSON. Defaults to ${DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET}
  --email-style-canon <path>                Brand email style canon. Defaults to ${DEFAULT_EMAIL_STYLE_CANON}
  --out <path>                              Write JSON manifest
  --markdown-out <path>                     Write Markdown manifest
  --help                                    Show this help

Local-only payload manifest for future MailerLite draft email builder work. It
maps approved copy, inert placeholders, style hints and QA preconditions into
exact draft payloads. It never calls MailerLite, creates or edits assets, sends
emails, reads subscribers, attaches workflows, creates groups, publishes
Shopify, writes CRM, appends ledgers, scores, or touches Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    emailSequencePacket: DEFAULT_EMAIL_SEQUENCE_PACKET,
    localEmailAssetPlan: DEFAULT_LOCAL_EMAIL_ASSET_PLAN,
    emailAssetBuildScopePacket: DEFAULT_EMAIL_ASSET_BUILD_SCOPE_PACKET,
    emailStyleCanon: DEFAULT_EMAIL_STYLE_CANON,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--email-sequence-packet') options.emailSequencePacket = argv[++index];
    else if (arg === '--local-email-asset-plan') options.localEmailAssetPlan = argv[++index];
    else if (arg === '--email-asset-build-scope-packet') options.emailAssetBuildScopePacket = argv[++index];
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
    localEmailAssetPlanRaw,
    emailAssetBuildScopePacketRaw,
    emailStyleCanon,
  ] = await Promise.all([
    readText(options.emailSequencePacket),
    readText(options.localEmailAssetPlan),
    readText(options.emailAssetBuildScopePacket),
    readText(options.emailStyleCanon),
  ]);

  return {
    values: {
      emailSequencePacket: JSON.parse(emailSequenceRaw),
      localEmailAssetPlan: JSON.parse(localEmailAssetPlanRaw),
      emailAssetBuildScopePacket: JSON.parse(emailAssetBuildScopePacketRaw),
      emailStyleCanon,
    },
    sourceDigests: [
      sourceDigest(options.emailSequencePacket, emailSequenceRaw, 'approved email copy, body paragraphs, CTA destinations and plain text fallbacks'),
      sourceDigest(options.localEmailAssetPlan, localEmailAssetPlanRaw, 'draft asset names, selected subjects/preheaders, style map and placeholders'),
      sourceDigest(options.emailAssetBuildScopePacket, emailAssetBuildScopePacketRaw, 'future exact approval boundary and closed builder/send gates'),
      sourceDigest(options.emailStyleCanon, emailStyleCanon, 'Brand email style defaults for container, typography, CTA, signature, footer and mobile QA'),
    ],
  };
};

const firstText = (items = []) => cleanString(items.find((item) => cleanString(item?.text))?.text);

const canonIncludes = (canon, text) => canon.toLowerCase().includes(text.toLowerCase());

const canonicalClosingText = (value) => {
  const text = cleanString(value);
  if (!text) return 'Un abrazo,';
  if (/^un abrazo,?\s+alejandro\.?$/iu.test(text)) return 'Un abrazo,';
  return text;
};

const styleTokensFromCanon = (emailStyleCanon) => ({
  outerBackground: canonIncludes(emailStyleCanon, '#F4F7FA') ? '#F4F7FA' : 'review_canon_background',
  containerBackground: canonIncludes(emailStyleCanon, '#FFFFFF') ? '#FFFFFF' : 'review_canon_container',
  bodyColor: canonIncludes(emailStyleCanon, '#474747') ? '#474747' : 'review_canon_body_color',
  bodyFont: canonIncludes(emailStyleCanon, 'Poppins') ? 'Poppins, sans-serif' : 'review_canon_body_font',
  accentFont: canonIncludes(emailStyleCanon, 'Georgia') ? 'Georgia, serif' : 'review_canon_accent_font',
  outerWidthPx: 640,
  contentWidthPx: 540,
  bodyFontSizePx: 16,
  bodyLineHeight: '165%',
  footerFontSizePx: 13,
  ctaPosture: 'one restrained CTA; editorial text link or sober brand button only when functionally useful',
  signaturePosture: canonIncludes(emailStyleCanon, 'firma visual de Alejandro')
    ? 'use Alejandro visual signature asset or explicit text-signature fallback'
    : 'declare signature asset or text-signature fallback before builder work',
  footerPosture: 'Spanish/legal footer reviewed; keep unsubscribe compliance and intentional social links only',
});

const placeholderForDestination = ({ destination, scopeAsset }) => {
  const cleaned = cleanString(destination);
  if (!cleaned || cleaned === 'reply') return null;
  return scopeAsset?.cta?.placeholder
    ? {
      key: cleanString(scopeAsset.cta.placeholder.key),
      value: cleanString(scopeAsset.cta.placeholder.value),
      status: cleanString(scopeAsset.cta.placeholder.status),
    }
    : {
      key: cleaned.replace(/_placeholder$/, ''),
      value: cleaned,
      status: 'inert_placeholder_needs_future_exact_source',
    };
};

const contentBlocksFor = ({ email, planAsset, scopeAsset }) => {
  const body = email?.publicCopy?.emailBody ?? {};
  const paragraphs = Array.isArray(body.paragraphs) ? body.paragraphs.map(cleanString).filter(Boolean) : [];
  const ctaText = cleanString(planAsset?.cta?.text) ?? cleanString(body.cta?.text);
  const destination = cleanString(planAsset?.cta?.destination) ?? cleanString(body.cta?.destination);
  const placeholder = placeholderForDestination({ destination, scopeAsset });
  const blocks = [
    {
      id: `email_${email.step}_preheader`,
      type: 'preheader',
      text: cleanString(planAsset?.selectedPreheader) ?? firstText(email?.publicCopy?.preheaderOptions),
    },
    {
      id: `email_${email.step}_greeting`,
      type: 'greeting',
      text: cleanString(body.greeting) ?? 'Hola,',
    },
    ...paragraphs.map((paragraph, index) => ({
      id: `email_${email.step}_paragraph_${index + 1}`,
      type: 'paragraph',
      text: paragraph,
    })),
  ];

  if (ctaText) {
    blocks.push({
      id: `email_${email.step}_cta`,
      type: destination === 'reply' ? 'reply_cta' : 'cta',
      text: ctaText,
      destination,
      placeholder,
    });
  }

  blocks.push({
    id: `email_${email.step}_closing`,
    type: 'closing',
    text: canonicalClosingText(body.closing),
  });
  blocks.push({
    id: `email_${email.step}_signature`,
    type: 'signature',
    text: 'Alejandro signature asset or text-signature fallback',
    assetStatus: 'must_be_declared_before_future_builder_work',
  });
  blocks.push({
    id: `email_${email.step}_footer`,
    type: 'compliance_footer',
    text: 'MailerLite unsubscribe footer and Brand-reviewed legal/social posture',
    assetStatus: 'must_remain_compliant_before_any_seed_send',
  });

  return blocks;
};

const buildPayloadRows = ({ emailSequencePacket, localEmailAssetPlan, emailAssetBuildScopePacket, emailStyleCanon }) => {
  const styleTokens = styleTokensFromCanon(emailStyleCanon);
  const sequence = Array.isArray(emailSequencePacket?.emailSequence) ? emailSequencePacket.emailSequence : [];
  const planByStep = new Map((localEmailAssetPlan?.assetRows ?? []).map((asset) => [asset.step, asset]));
  const scopeByStep = new Map((emailAssetBuildScopePacket?.assetBuildScope?.assets ?? []).map((asset) => [asset.step, asset]));

  return sequence.map((email) => {
    const planAsset = planByStep.get(email.step) ?? {};
    const scopeAsset = scopeByStep.get(email.step) ?? {};
    const subject = cleanString(planAsset.selectedSubject)
      ?? cleanString(scopeAsset.selectedSubject)
      ?? firstText(email?.publicCopy?.subjectOptions);
    const preheader = cleanString(planAsset.selectedPreheader)
      ?? cleanString(scopeAsset.selectedPreheader)
      ?? firstText(email?.publicCopy?.preheaderOptions);
    const ctaDestination = cleanString(planAsset?.cta?.destination)
      ?? cleanString(scopeAsset?.cta?.destination)
      ?? cleanString(email?.publicCopy?.emailBody?.cta?.destination);
    const blocks = contentBlocksFor({ email, planAsset, scopeAsset });
    const placeholder = blocks.find((block) => block.type === 'cta')?.placeholder ?? null;

    return {
      step: email.step,
      role: cleanString(email.role),
      mailerLiteAssetNameDraft: cleanString(planAsset.mailerLiteAssetNameDraft)
        ?? cleanString(scopeAsset.mailerLiteAssetNameDraft)
        ?? cleanString(email.mailerLiteAssetNameDraft),
      sourceStatus: cleanString(email.status) ?? cleanString(planAsset.sourceStatus),
      subject,
      preheader,
      contentBlocks: blocks,
      builderBlockOrder: blocks.map((block) => block.type),
      plainTextFallback: cleanString(email?.publicCopy?.plainTextFallback),
      cta: {
        text: cleanString(planAsset?.cta?.text)
          ?? cleanString(scopeAsset?.cta?.text)
          ?? cleanString(email?.publicCopy?.emailBody?.cta?.text),
        destination: ctaDestination,
        destinationType: ctaDestination === 'reply'
          ? 'reply_to_email'
          : placeholder
            ? 'inert_url_placeholder'
            : 'none_or_review_needed',
        placeholder,
      },
      styleTokens: {
        ...styleTokens,
        ...(planAsset.styleImplementation ?? {}),
      },
      personalizationPolicy: {
        allowedMailerLiteVariables: ['{$name}'],
        requiredMailerLiteVariables: [],
        inertContentPlaceholders: placeholder ? [placeholder.value] : [],
        rule: 'Use only declared placeholders; do not infer CRM fields, scoring, segmentation or subscriber data.',
      },
      qaPreconditions: [
        'Confirm subject and preheader still match the approved sequence.',
        'Confirm every URL placeholder is still inert or explicitly replaced by a non-live preview URL named in approval.',
        'Confirm one CTA maximum and no extra sales CTA.',
        'Confirm Alejandro signature asset or text fallback before builder work.',
        'Confirm footer, unsubscribe and social-link posture before any later seed-send request.',
        'Run render QA after builder work and before any separate seed-send approval.',
      ],
      hardExclusions: [
        'send_email',
        'attach_workflow_or_automation',
        'read_or_assign_subscribers',
        'create_or_assign_groups',
        'publish_shopify_or_connect_forms',
        'append_signal_ledger',
        'write_crm_cards',
        'change_scoring',
        'write_fact_store',
      ],
      liveActionAllowedNow: false,
    };
  });
};

const validateReadiness = ({ emailSequencePacket, localEmailAssetPlan, emailAssetBuildScopePacket }) => {
  const issues = [];
  const sequence = Array.isArray(emailSequencePacket?.emailSequence) ? emailSequencePacket.emailSequence : [];
  const planRows = Array.isArray(localEmailAssetPlan?.assetRows) ? localEmailAssetPlan.assetRows : [];
  const scopeRows = Array.isArray(emailAssetBuildScopePacket?.assetBuildScope?.assets) ? emailAssetBuildScopePacket.assetBuildScope.assets : [];

  if (emailSequencePacket?.status !== 'email_sequence_asset_packet_ready_for_brand_review_no_live_changes') {
    issues.push(`email_sequence_status_not_ready:${emailSequencePacket?.status ?? 'missing'}`);
  }
  if (localEmailAssetPlan?.status !== 'mini_launch_local_email_asset_plan_ready_no_live_changes') {
    issues.push(`local_email_asset_plan_status_not_ready:${localEmailAssetPlan?.status ?? 'missing'}`);
  }
  if (emailAssetBuildScopePacket?.status !== 'email_asset_build_scope_packet_ready_for_exact_human_approval_no_live_changes') {
    issues.push(`email_asset_build_scope_status_not_ready:${emailAssetBuildScopePacket?.status ?? 'missing'}`);
  }
  if (emailAssetBuildScopePacket?.requestedFutureScope?.canAskAlejandroForApproval !== true) {
    issues.push('email_asset_build_scope_cannot_ask_approval');
  }
  if (emailAssetBuildScopePacket?.requestedFutureScope?.packetIsApprovalByItself !== false) {
    issues.push('email_asset_build_scope_self_authorizes_unexpectedly');
  }
  if (emailAssetBuildScopePacket?.requestedFutureScope?.canExecuteBuildNow !== false) {
    issues.push('email_asset_build_scope_can_execute_now_unexpectedly_open');
  }
  if (emailAssetBuildScopePacket?.executiveSummary?.readyForSeedSendNow !== false) {
    issues.push('email_asset_build_scope_seed_send_gate_unexpectedly_open');
  }
  if (localEmailAssetPlan?.approvalBoundary?.readyForMailerLiteAssetBuildNow !== false) {
    issues.push('local_email_asset_plan_builder_gate_unexpectedly_open');
  }
  if (localEmailAssetPlan?.approvalBoundary?.readyForSeedSendNow !== false) {
    issues.push('local_email_asset_plan_seed_send_gate_unexpectedly_open');
  }
  if (sequence.length !== 4) issues.push(`email_sequence_expected_4:${sequence.length}`);
  if (planRows.length !== sequence.length) issues.push(`local_asset_plan_count_mismatch:${planRows.length}:${sequence.length}`);
  if (scopeRows.length !== sequence.length) issues.push(`scope_asset_count_mismatch:${scopeRows.length}:${sequence.length}`);
  if (localEmailAssetPlan?.safety?.mailerLiteApiCalled !== false) issues.push('local_email_asset_plan_reports_mailerlite_api_call');
  if (localEmailAssetPlan?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('local_email_asset_plan_reports_asset_mutation');
  if (emailAssetBuildScopePacket?.safety?.mailerLiteApiCalled !== false) issues.push('scope_packet_reports_mailerlite_api_call');
  if (emailAssetBuildScopePacket?.safety?.mailerLiteAssetsCreatedOrEdited !== false) issues.push('scope_packet_reports_asset_mutation');
  if (emailAssetBuildScopePacket?.safety?.sendsPerformed !== false) issues.push('scope_packet_reports_send');

  return {
    ok: issues.length === 0,
    issues,
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

const buildEmailBuilderPayloadManifest = ({
  emailSequencePacket,
  localEmailAssetPlan,
  emailAssetBuildScopePacket,
  emailStyleCanon,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const readiness = validateReadiness({ emailSequencePacket, localEmailAssetPlan, emailAssetBuildScopePacket });
  const payloads = buildPayloadRows({
    emailSequencePacket,
    localEmailAssetPlan,
    emailAssetBuildScopePacket,
    emailStyleCanon,
  });
  const inertUrlPlaceholders = payloads
    .map((payload) => payload.cta.placeholder)
    .filter(Boolean);
  const replyCtas = payloads
    .filter((payload) => payload.cta.destinationType === 'reply_to_email')
    .map((payload) => ({
      step: payload.step,
      role: payload.role,
      assetName: payload.mailerLiteAssetNameDraft,
      ctaText: payload.cta.text,
      destination: payload.cta.destination,
    }));
  const contentBlockCount = payloads.reduce((total, payload) => total + payload.contentBlocks.length, 0);
  const ok = readiness.ok && payloads.length > 0;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_email_builder_payload_manifest',
    generatedAt,
    ok,
    status: ok
      ? 'email_builder_payload_manifest_ready_no_live_changes'
      : 'email_builder_payload_manifest_blocked_before_future_builder_work',
    launch: emailSequencePacket?.launch ?? localEmailAssetPlan?.launch ?? emailAssetBuildScopePacket?.launch ?? null,
    executiveSummary: {
      payloadCount: payloads.length,
      contentBlockCount,
      inertUrlPlaceholderCount: inertUrlPlaceholders.length,
      replyCtaCount: replyCtas.length,
      readyForExactAssetBuildApprovalReviewNow: ok,
      canExecuteBuilderNow: false,
      canCreateOrEditMailerLiteAssetsNow: false,
      readyForSeedSendNow: false,
      openLiveMutationGateCount: 0,
    },
    sourceScope: {
      emailSequenceStatus: emailSequencePacket?.status ?? null,
      localEmailAssetPlanStatus: localEmailAssetPlan?.status ?? null,
      emailAssetBuildScopePacketStatus: emailAssetBuildScopePacket?.status ?? null,
      exactApprovalPhrasePresent: Boolean(cleanString(emailAssetBuildScopePacket?.requestedFutureScope?.exactApprovalPhrase)),
    },
    approvalBoundary: {
      manifestIsApprovalByItself: false,
      exactAssetBuildApprovalStillRequired: true,
      canUseForFutureBuilderAfterExactApproval: ok,
      canExecuteBuilderNow: false,
      canSendNow: false,
      canAttachWorkflowNow: false,
      canReadOrAssignSubscribersNow: false,
      canCreateGroupsNow: false,
      futureAllowedAfterExactAssetBuildApproval: ok
        ? [
          'create_or_edit_exactly_the_named_mailerlite_draft_assets',
          'use_only_payloads_and_placeholders_in_this_manifest_or exact non-live preview URLs named in approval',
          'keep drafts unpublished, unattached and unsent',
          'run builder/render QA before any later seed-send request',
        ]
        : [],
      stillClosedEvenAfterAssetBuildApproval: [
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
    payloads,
    inertUrlPlaceholders,
    replyCtas,
    globalQaChecklist: [
      'Check MailerLite builder previews for desktop and mobile before any seed-send approval request.',
      'Confirm all inert URL placeholders are still visibly placeholders or exact non-live preview URLs named in approval.',
      'Confirm reply CTA points to reply behavior only and does not create a hidden form/workflow path.',
      'Confirm no Sent receipt group is introduced by these four assets.',
      'Confirm Source/Delivered receipt groups stay separate from email asset build.',
      'Confirm no CRM score, card, ledger or Fact Store write is implied by open/click/reply events.',
    ],
    hardStops: [
      'This manifest is not approval.',
      'Exact Alejandro asset-build approval is still required before any MailerLite builder mutation.',
      'Asset-build approval cannot send email, attach workflows, read or assign subscribers, create groups, publish Shopify, append ledgers, write cards, score, or touch Fact Store.',
      'Seed send remains a later separate approval after builder/render QA.',
    ],
    blockers: readiness.issues,
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (manifest) => {
  const lines = [
    '# MailerLite Launch OS v0 - Email Builder Payload Manifest',
    '',
    `Generated: ${manifest.generatedAt}`,
    `Status: ${manifest.status}`,
    '',
    '## Decision Ejecutiva',
    '',
    `Mini-lanzamiento: ${manifest.launch?.resourceName ?? manifest.launch?.launchId ?? 'unknown'}`,
    `Payload count: ${manifest.executiveSummary.payloadCount}`,
    `Content blocks: ${manifest.executiveSummary.contentBlockCount}`,
    `Inert URL placeholders: ${manifest.executiveSummary.inertUrlPlaceholderCount}`,
    `Reply CTAs: ${manifest.executiveSummary.replyCtaCount}`,
    `Can execute builder now: ${manifest.executiveSummary.canExecuteBuilderNow}`,
    `Ready for seed send now: ${manifest.executiveSummary.readyForSeedSendNow}`,
    '',
    'Este manifiesto deja los payloads listos para una aprobacion futura. No crea ni edita assets, no envia correos y no toca workflows, subscribers, grupos, Shopify o CRM.',
    '',
    '## Payloads',
    '',
  ];

  for (const payload of manifest.payloads) {
    lines.push(`### Email ${payload.step}: ${payload.role}`);
    lines.push(`- Draft asset: ${payload.mailerLiteAssetNameDraft}`);
    lines.push(`- Subject: ${payload.subject}`);
    lines.push(`- Preheader: ${payload.preheader}`);
    lines.push(`- CTA: ${payload.cta.text ?? 'none'} (${payload.cta.destination ?? 'none'})`);
    lines.push(`- Placeholder: ${payload.cta.placeholder?.value ?? 'none'}`);
    lines.push(`- Blocks: ${payload.builderBlockOrder.join(', ')}`);
    lines.push('');
  }

  lines.push('## Approval Boundary', '');
  lines.push(`- Manifest is approval by itself: ${manifest.approvalBoundary.manifestIsApprovalByItself}`);
  lines.push(`- Exact asset-build approval still required: ${manifest.approvalBoundary.exactAssetBuildApprovalStillRequired}`);
  lines.push(`- Can execute builder now: ${manifest.approvalBoundary.canExecuteBuilderNow}`);
  lines.push(`- Can send now: ${manifest.approvalBoundary.canSendNow}`);
  lines.push('- Still closed even after asset-build approval:');
  for (const item of manifest.approvalBoundary.stillClosedEvenAfterAssetBuildApproval) lines.push(`  - ${item}`);

  lines.push('', '## Global QA Checklist', '');
  for (const item of manifest.globalQaChecklist) lines.push(`- ${item}`);

  lines.push('', '## Blockers', '');
  if (manifest.blockers.length) {
    for (const blocker of manifest.blockers) lines.push(`- ${blocker}`);
  } else {
    lines.push('- none');
  }

  lines.push('', '## Hard Stops', '');
  for (const item of manifest.hardStops) lines.push(`- ${item}`);

  lines.push('', '## Fuentes Consultadas', '');
  for (const source of manifest.sourceDigests) lines.push(`- ${source.path} (${source.consultedFor})`);

  lines.push('', '## Seguridad', '');
  lines.push('- Local-only.');
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

const buildManifestFromFiles = async (options) => {
  const { values, sourceDigests } = await loadSources(options);
  return buildEmailBuilderPayloadManifest({
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

  const manifest = await buildManifestFromFiles(options);
  if (options.out) await writeJson(options.out, manifest);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(manifest));

  console.log(JSON.stringify({
    ok: manifest.ok,
    status: manifest.status,
    generatedAt: manifest.generatedAt,
    launchId: manifest.launch?.launchId ?? null,
    payloadCount: manifest.executiveSummary.payloadCount,
    contentBlockCount: manifest.executiveSummary.contentBlockCount,
    inertUrlPlaceholderCount: manifest.executiveSummary.inertUrlPlaceholderCount,
    replyCtaCount: manifest.executiveSummary.replyCtaCount,
    canExecuteBuilderNow: manifest.executiveSummary.canExecuteBuilderNow,
    blockers: manifest.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: manifest.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch email builder payload manifest failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildEmailBuilderPayloadManifest,
  buildPayloadRows,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateReadiness,
};
