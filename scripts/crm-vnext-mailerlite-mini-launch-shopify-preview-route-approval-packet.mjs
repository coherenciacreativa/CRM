#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet-2026-05-31';
const DEFAULT_PREVIEW_ROUTE_DECISION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_decision_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_DECISION_CONFIRMATION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_decision_confirmation_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_preview_route_approval_packet_current_inteligencia_descansar_2026-05-31.md';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-shopify-preview-route-approval-packet.mjs [options]

Options:
  --preview-route-decision <path>      Shopify preview-route decision packet. Defaults to ${DEFAULT_PREVIEW_ROUTE_DECISION}
  --decision-confirmation <path>       Alejandro decision-confirmation receipt. Defaults to ${DEFAULT_DECISION_CONFIRMATION}
  --out <path>                         Write JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                Write Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --help                               Show this help

Local-only approval packet for the Inteligencia para descansar Shopify
unlisted/noindex preview route. It can expose an exact approval phrase only
after a local human decision-confirmation receipt exists. It never opens UI,
publishes Shopify, calls MailerLite/Shopify/CRM APIs, reads or mutates
subscribers, creates groups, edits workflows, sends emails, appends ledgers,
writes cards/scoring, writes Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    previewRouteDecision: DEFAULT_PREVIEW_ROUTE_DECISION,
    decisionConfirmation: DEFAULT_DECISION_CONFIRMATION,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--preview-route-decision') options.previewRouteDecision = argv[++index];
    else if (arg === '--decision-confirmation') options.decisionConfirmation = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor, required = true) => {
  const resolved = resolve(path);
  try {
    const raw = await readFile(resolved, 'utf8');
    return {
      value: JSON.parse(raw),
      digest: {
        path: resolved,
        present: true,
        chars: raw.length,
        sha256: sha256(raw),
        consultedFor,
      },
    };
  } catch (error) {
    if (required || error.code !== 'ENOENT') throw error;
    return {
      value: null,
      digest: {
        path: resolved,
        present: false,
        chars: 0,
        sha256: null,
        consultedFor,
      },
    };
  }
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  uiOpened: false,
  browserOpened: false,
  shopifyApiCalled: false,
  shopifyMutationsPerformed: false,
  shopifyPublishPerformed: false,
  shopifyLiveThemeTouched: false,
  shopifyRepoFilesWritten: false,
  mailerLiteApiCalled: false,
  mailerLiteUiOpened: false,
  mailerLiteMutationsPerformed: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const decisionReady = (decision) =>
  decision?.ok === true
  && decision?.status === 'shopify_preview_route_decision_ready_for_human_explanation_no_live_changes'
  && decision?.executiveSummary?.decisionExplanationReady === true
  && decision?.executiveSummary?.recommendedDecision === 'use_unlisted_noindex_preview_route_for_test_launch_links'
  && decision?.executiveSummary?.recommendedVisibilityTier === 'unlisted_noindex_preview'
  && decision?.executiveSummary?.exactApprovalPhraseAvailable === false
  && decision?.executiveSummary?.exactApprovalPhrasePrinted === false
  && decision?.executiveSummary?.canAskApprovalNow === false
  && decision?.executiveSummary?.canPublishNow === false
  && decision?.safety?.shopifyApiCalled === false
  && decision?.safety?.shopifyRepoFilesWritten === false
  && decision?.safety?.mailerLiteApiCalled === false
  && decision?.safety?.crmLiveApiCalled === false
  && decision?.safety?.sendsPerformed === false;

const confirmationReady = ({ confirmation, decision }) =>
  confirmation?.ok === true
  && confirmation?.status === 'shopify_preview_route_decision_confirmed_by_alejandro_no_live_changes'
  && confirmation?.decision?.id === decision?.executiveSummary?.recommendedDecision
  && confirmation?.decision?.visibilityTier === decision?.executiveSummary?.recommendedVisibilityTier
  && confirmation?.confirmation?.confirmedBy === 'Alejandro'
  && confirmation?.confirmation?.rawTextStored === false
  && confirmation?.confirmation?.exactApprovalPhraseProvided === false
  && confirmation?.safety?.shopifyApiCalled === false
  && confirmation?.safety?.mailerLiteApiCalled === false
  && confirmation?.safety?.crmLiveApiCalled === false
  && confirmation?.safety?.sendsPerformed === false;

const exactApprovalPhraseFor = ({ launch, targetLinks }) => {
  const resourceName = cleanString(launch?.resourceName) ?? 'Inteligencia para descansar';
  const targetLabels = targetLinks.map((target) => target.label).filter(Boolean).join(', ');
  return `Apruebo crear/actualizar únicamente la preview route unlisted/noindex de Shopify para los 3 links del mini-lanzamiento ${resourceName} (${targetLabels}), con URLs accesibles por enlace exacto para QA, sin añadir a navegación, sin permitir indexación SEO, sin formularios reales, sin conexiones MailerLite/CRM, sin tocar MailerLite, sin enviar, programar ni publicar campañas, sin subscribers, sin crear ni asignar grupos, sin workflows/automatizaciones, sin ledgers, sin cards, sin scoring y sin Fact Store, y con re-scan fresco, QA real de navegador y recibo local antes de usarla en correos.`;
};

const targetLinksFrom = (decision) => (decision?.slotScope ?? []).map((slot) => ({
  key: slot.key,
  label: slot.label,
  pathCandidate: slot.pathCandidate,
  currentStage: slot.currentStage,
  nextStageAfterApprovedPreviewRoute: slot.nextStageAfterApprovedPreviewRoute,
  audienceSendReadyAfterApprovedPreviewRoute: slot.audienceSendReadyAfterApprovedPreviewRoute,
  exactUrlStoredInReport: false,
}));

const buildPreviewRouteApprovalPacket = ({
  previewRouteDecision,
  decisionConfirmation = null,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const safety = buildSafety();
  const decisionIsReady = decisionReady(previewRouteDecision);
  const confirmationIsReady = confirmationReady({
    confirmation: decisionConfirmation,
    decision: previewRouteDecision,
  });
  const targetLinks = targetLinksFrom(previewRouteDecision);
  const targetLinksReady = targetLinks.length === 3
    && targetLinks.every((target) => target.nextStageAfterApprovedPreviewRoute === 'preview_url_ready');
  const blockers = [
    ...(decisionIsReady ? [] : [`preview_route_decision_not_ready:${previewRouteDecision?.status ?? 'missing'}`]),
    ...(confirmationIsReady ? [] : [`decision_confirmation_not_ready:${decisionConfirmation?.status ?? 'missing'}`]),
    ...(targetLinksReady ? [] : [`target_link_scope_not_ready:${targetLinks.length}`]),
  ];
  const ready = blockers.length === 0;
  const exactApprovalPhrase = ready
    ? exactApprovalPhraseFor({
      launch: previewRouteDecision?.launch,
      targetLinks,
    })
    : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_shopify_preview_route_approval_packet',
    generatedAt,
    ok: true,
    status: ready
      ? 'shopify_preview_route_approval_packet_ready_for_exact_human_approval_no_live_changes'
      : 'shopify_preview_route_approval_packet_blocked_no_live_changes',
    launch: previewRouteDecision?.launch ?? null,
    executiveSummary: {
      humanDecisionConfirmed: confirmationIsReady,
      recommendedVisibilityTier: previewRouteDecision?.executiveSummary?.recommendedVisibilityTier ?? null,
      targetLinkCount: targetLinks.length,
      exactApprovalPhraseAvailable: ready,
      exactApprovalPhrasePrinted: ready,
      canAskApprovalNow: ready,
      canExecuteNow: false,
      canPublishNow: false,
      publicAudienceSendUrlGateReady: false,
      nextSafeAction: ready
        ? 'ask_alejandro_for_the_exact_preview_route_approval_phrase_before_any_shopify_action'
        : 'record_human_decision_confirmation_or_repair_preview_route_decision_packet',
    },
    humanDecisionConfirmation: decisionConfirmation
      ? {
        status: decisionConfirmation.status,
        confirmedBy: decisionConfirmation.confirmation?.confirmedBy ?? null,
        confirmedAt: decisionConfirmation.confirmation?.confirmedAt ?? null,
        textSha256: decisionConfirmation.confirmation?.textSha256 ?? null,
        rawTextStored: decisionConfirmation.confirmation?.rawTextStored ?? null,
      }
      : null,
    targetLinks,
    approvalBoundary: {
      id: 'shopify_unlisted_noindex_preview_route',
      canAskAlejandroForApproval: ready,
      packetIsApprovalByItself: false,
      exactApprovalPhrase,
      canExecuteNow: false,
      allowedAfterExactApproval: [
        'create_or_update_only_the_shopify_unlisted_noindex_preview_route_for_the_three_named_link_slots',
        'make_the_three_links_accessible_by_exact_url_for_QA',
        'record_redacted_url_hashes_visibility_and_QA_receipt_in_local_reports',
      ],
      stillClosedEvenAfterApproval: [
        'site_navigation_or_menu_linking',
        'seo_indexing',
        'fully_public_site_surface',
        'real_forms_or_crm_live_connections',
        'mailerlite_ui_edit_send_schedule_or_campaign_publish',
        'mailerlite_groups_tags_workflows_subscribers_or_automations',
        'audience_launch_or_public_send',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
      requiredFreshEvidenceBeforeExecution: [
        'freshly re-read the preview-route decision and approval packet',
        'confirm local Shopify files still match the latest local build receipt',
        'confirm no real form action or CRM/MailerLite live connection will be introduced',
        'after any approved route creation, run real browser QA for desktop and mobile',
        'write a local execution receipt before any MailerLite link replacement or send boundary',
      ],
    },
    blockers,
    safety,
    sourceDigests,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (packet) => [
  '# Shopify Preview Route Approval Packet - Inteligencia para descansar',
  '',
  `Generated: ${packet.generatedAt}`,
  `Status: ${packet.status}`,
  '',
  '## Summary',
  '',
  `- Human decision confirmed: ${packet.executiveSummary.humanDecisionConfirmed}`,
  `- Exact approval phrase available: ${packet.executiveSummary.exactApprovalPhraseAvailable}`,
  `- Exact approval phrase printed: ${packet.executiveSummary.exactApprovalPhrasePrinted}`,
  `- Can ask approval now: ${packet.executiveSummary.canAskApprovalNow}`,
  `- Can execute now: ${packet.executiveSummary.canExecuteNow}`,
  `- Can publish now: ${packet.executiveSummary.canPublishNow}`,
  `- Public audience-send URL gate ready: ${packet.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Next safe action: ${packet.executiveSummary.nextSafeAction}`,
  '',
  '## Exact Approval Phrase',
  '',
  packet.approvalBoundary.exactApprovalPhrase
    ? ['```text', packet.approvalBoundary.exactApprovalPhrase, '```'].join('\n')
    : '- Not available.',
  '',
  '## Target Links',
  '',
  renderList(packet.targetLinks.map((target) =>
    `${target.key}: ${target.label} (${target.currentStage} -> ${target.nextStageAfterApprovedPreviewRoute})`,
  )),
  '',
  '## Allowed After Exact Approval',
  '',
  renderList(packet.approvalBoundary.allowedAfterExactApproval),
  '',
  '## Still Closed',
  '',
  renderList(packet.approvalBoundary.stillClosedEvenAfterApproval),
  '',
  '## Required Fresh Evidence',
  '',
  renderList(packet.approvalBoundary.requiredFreshEvidenceBeforeExecution),
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Safety',
  '',
  '- Local-only report.',
  '- No Shopify API/UI/publish action.',
  '- No MailerLite API/UI/send action.',
  '- No CRM live write, subscribers, groups, workflows, ledgers, cards, scoring or Fact Store write.',
  '- No tokens printed.',
  '',
].join('\n');

const writeOutputs = async ({ packet, out, markdownOut }) => {
  if (out) {
    await mkdir(dirname(resolve(out)), { recursive: true });
    await writeFile(resolve(out), `${JSON.stringify(packet, null, 2)}\n`);
  }
  if (markdownOut) {
    await mkdir(dirname(resolve(markdownOut)), { recursive: true });
    await writeFile(resolve(markdownOut), `${renderMarkdown(packet)}\n`);
  }
};

const buildPacketFromFiles = async (options) => {
  const decisionEntry = await readJsonWithDigest(
    options.previewRouteDecision,
    'Shopify preview-route decision packet',
  );
  const confirmationEntry = await readJsonWithDigest(
    options.decisionConfirmation,
    'Alejandro preview-route decision confirmation receipt',
    false,
  );
  return buildPreviewRouteApprovalPacket({
    previewRouteDecision: decisionEntry.value,
    decisionConfirmation: confirmationEntry.value,
    sourceDigests: [decisionEntry.digest, confirmationEntry.digest],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildPacketFromFiles(options);
  await writeOutputs({ packet, out: options.out, markdownOut: options.markdownOut });
  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    humanDecisionConfirmed: packet.executiveSummary.humanDecisionConfirmed,
    exactApprovalPhraseAvailable: packet.executiveSummary.exactApprovalPhraseAvailable,
    canAskApprovalNow: packet.executiveSummary.canAskApprovalNow,
    canExecuteNow: packet.executiveSummary.canExecuteNow,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}

export {
  buildPreviewRouteApprovalPacket,
  buildSafety,
  exactApprovalPhraseFor,
  parseArgs,
  renderMarkdown,
};
