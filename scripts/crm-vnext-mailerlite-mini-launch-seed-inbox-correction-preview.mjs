#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCorrectionInputsState } from './crm-vnext-mailerlite-launch-os-missing-inputs-intake.mjs';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview-2026-05-31';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_PLAN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_plan_inteligencia_descansar_2026-05-31.json';
const DEFAULT_CORRECTION_INPUTS_FILE = '/Users/alejandrogomez/Documents/Mantis-Reports/private/mailerlite_mini_launch_correction_inputs_inteligencia_descansar_2026-05-31.json';
const DEFAULT_LAUNCH_ASSET_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_asset_manifest_current_inteligencia_descansar_2026-05-31.json';
const DEFAULT_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.json';
const DEFAULT_MARKDOWN_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.md';
const DEFAULT_REDACTED_PAYLOAD_MANIFEST_OUTPUT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_after_seed_inbox_correction_preview_inteligencia_descansar_2026-05-31.redacted.json';

const FINAL_PUBLIC_LINK_KEYS = ['result_or_resource_link', 'practice_link', 'editorial_note_link'];
const LINK_KEY_BY_STEP = new Map([
  [1, 'result_or_resource_link'],
  [2, 'practice_link'],
  [3, 'editorial_note_link'],
]);
const unique = (items) => [...new Set((items ?? []).filter(Boolean))];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-preview.mjs [options]

Options:
  --payload-manifest <path>                 Email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --correction-plan <path>                  Seed inbox correction plan JSON. Defaults to ${DEFAULT_CORRECTION_PLAN}
  --correction-inputs-file <path>           Private correction inputs JSON. Defaults to ${DEFAULT_CORRECTION_INPUTS_FILE}
  --launch-asset-manifest <path>            Local launch asset manifest JSON. Defaults to ${DEFAULT_LAUNCH_ASSET_MANIFEST}
  --out <path>                              Write public/redacted JSON report. Defaults to ${DEFAULT_OUTPUT}
  --markdown-out <path>                     Write public/redacted Markdown report. Defaults to ${DEFAULT_MARKDOWN_OUTPUT}
  --redacted-payload-manifest-out <path>    Write redacted payload manifest only when inputs are ready. Defaults to ${DEFAULT_REDACTED_PAYLOAD_MANIFEST_OUTPUT}
  --no-redacted-payload-manifest            Do not write the redacted payload manifest.
  --help                                    Show this help

Local-only correction preview for the Inteligencia para descansar seed inbox QA
findings. It validates private correction inputs, prepares a redacted corrected
payload preview, and writes no exact public URLs to shared reports. It never
opens MailerLite UI, calls MailerLite/Shopify/CRM APIs, sends emails, reads or
mutates subscribers/groups/workflows, publishes Shopify, appends ledgers, writes
cards/scoring, or touches Fact Store.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    correctionPlan: DEFAULT_CORRECTION_PLAN,
    correctionInputsFile: DEFAULT_CORRECTION_INPUTS_FILE,
    launchAssetManifest: DEFAULT_LAUNCH_ASSET_MANIFEST,
    out: DEFAULT_OUTPUT,
    markdownOut: DEFAULT_MARKDOWN_OUTPUT,
    redactedPayloadManifestOut: DEFAULT_REDACTED_PAYLOAD_MANIFEST_OUTPUT,
    writeRedactedPayloadManifest: true,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--correction-plan') options.correctionPlan = argv[++index];
    else if (arg === '--correction-inputs-file') options.correctionInputsFile = argv[++index];
    else if (arg === '--launch-asset-manifest') options.launchAssetManifest = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else if (arg === '--redacted-payload-manifest-out') options.redactedPayloadManifestOut = argv[++index];
    else if (arg === '--no-redacted-payload-manifest') options.writeRedactedPayloadManifest = false;
    else throw new Error(`unknown_arg:${arg}`);
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(String(value)).digest('hex');

const readJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  const raw = await readFile(resolved, 'utf8');
  return {
    value: JSON.parse(raw),
    read: {
      present: true,
      value: JSON.parse(raw),
      error: null,
      chars: raw.length,
    },
    digest: {
      path: resolved,
      present: true,
      chars: raw.length,
      consultedFor,
    },
  };
};

const readOptionalJsonWithDigest = async (path, consultedFor) => {
  const resolved = resolve(path);
  try {
    const raw = await readFile(resolved, 'utf8');
    return {
      value: JSON.parse(raw),
      read: {
        present: true,
        value: JSON.parse(raw),
        error: null,
        chars: raw.length,
      },
      digest: {
        path: resolved,
        present: true,
        chars: raw.length,
        consultedFor,
        exactPayloadStoredInReport: false,
      },
    };
  } catch (error) {
    if (error.code === 'ENOENT') {
      return {
        value: null,
        read: {
          present: false,
          value: null,
          error: null,
          chars: 0,
        },
        digest: {
          path: resolved,
          present: false,
          chars: 0,
          consultedFor,
          exactPayloadStoredInReport: false,
        },
      };
    }
    if (error instanceof SyntaxError) {
      return {
        value: null,
        read: {
          present: true,
          value: null,
          error: 'correction_inputs_json_parse_error',
          chars: 0,
        },
        digest: {
          path: resolved,
          present: true,
          chars: 0,
          consultedFor,
          exactPayloadStoredInReport: false,
          error: 'correction_inputs_json_parse_error',
        },
      };
    }
    throw error;
  }
};

const buildSafety = ({ redactedPayloadManifestWritten = false } = {}) => ({
  localOnly: true,
  reportsOnly: true,
  redactedPayloadManifestWritten,
  exactUrlsStoredInReport: false,
  exactUrlsStoredInRedactedPayloadManifest: false,
  uiOpened: false,
  browserOpened: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  sendsPerformed: false,
  schedulesCreated: false,
  publicCampaignPublished: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const redactedLinkToken = (key) => `final_public_link_ready_redacted:${key}`;

const normalizeFooterBlock = ({ block, policy }) => {
  if (block?.type !== 'compliance_footer') return block;
  if (policy === 'remove_custom_line_and_rely_on_platform_footer') {
    return {
      ...block,
      text: 'Use MailerLite platform unsubscribe/footer only; do not add a custom subscription-reason line.',
      renderPolicy: 'platform_footer_only',
      correctionStatus: 'custom_subscription_reason_removed_in_preview',
    };
  }
  return {
    ...block,
    text: 'Recibes este correo porque pediste recursos de Coherencia Creativa. Puedes darte de baja desde el enlace de suscripcion incluido por la plataforma.',
    renderPolicy: 'include_custom_subscription_reason_once',
    correctionStatus: 'subscription_reason_line_included_once_in_preview',
  };
};

const redactPayloadForPreview = ({ payload, correctionState }) => {
  const step = Number(payload?.step);
  const linkKey = LINK_KEY_BY_STEP.get(step) ?? null;
  const policy = correctionState.subscriptionReasonPolicy.policy;
  const linkHash = linkKey ? correctionState.finalPublicLinks.urlSha256ByKey[linkKey] ?? null : null;
  const blocks = (payload?.contentBlocks ?? []).map((block) => {
    if (block?.type === 'cta' && linkKey) {
      return {
        ...block,
        destination: redactedLinkToken(linkKey),
        placeholder: {
          key: linkKey,
          value: redactedLinkToken(linkKey),
          status: 'final_public_url_present_redacted_sha256_only',
          sha256: linkHash,
        },
        correctionStatus: 'final_url_ready_redacted',
      };
    }
    if (block?.type === 'reply_cta') {
      return {
        ...block,
        destination: 'reply',
        placeholder: null,
        correctionStatus: 'reply_cta_text_only_no_raw_destination_token',
      };
    }
    return normalizeFooterBlock({ block, policy });
  });

  return {
    ...payload,
    contentBlocks: blocks,
    cta: payload?.cta && linkKey
      ? {
        ...payload.cta,
        destination: redactedLinkToken(linkKey),
        destinationType: 'final_public_url_present_redacted_sha256_only',
        placeholder: {
          key: linkKey,
          value: redactedLinkToken(linkKey),
          status: 'final_public_url_present_redacted_sha256_only',
          sha256: linkHash,
        },
      }
      : payload?.cta,
    correctionPreview: {
      finalPublicLinkKey: linkKey,
      finalPublicLinkSha256: linkHash,
      finalPublicLinkLifecycleStage: linkKey
        ? correctionState.finalPublicLinks.linkLifecycle.slots.find((slot) => slot.key === linkKey)?.currentStage ?? null
        : null,
      exactUrlStoredHere: false,
      subscriptionReasonPolicy: policy,
      footerPolicyApplied: policy,
      rawReplyDestinationTokenRendered: false,
    },
  };
};

const buildRedactedPayloadManifest = ({ payloadManifest, correctionState, generatedAt }) => {
  const payloads = (payloadManifest?.payloads ?? [])
    .map((payload) => redactPayloadForPreview({ payload, correctionState }));
  return {
    ...payloadManifest,
    schemaVersion: `${payloadManifest?.schemaVersion ?? 'payload-manifest'}+seed-inbox-correction-preview-redacted`,
    mode: 'local_only_redacted_seed_inbox_correction_payload_manifest',
    generatedAt,
    status: 'email_builder_payload_manifest_redacted_after_seed_inbox_correction_preview_no_live_changes',
    executiveSummary: {
      ...(payloadManifest?.executiveSummary ?? {}),
      finalPublicLinkReadyRedactedCount: FINAL_PUBLIC_LINK_KEYS.length,
      publicAudienceSendUrlGateReady: correctionState.finalPublicLinks.publicAudienceSendReady,
      previewOnlyLinkCount: correctionState.finalPublicLinks.linkLifecycle.previewUrlReadyCount,
      liveOrPromotedLinkCount:
        correctionState.finalPublicLinks.linkLifecycle.liveUrlReadyCount
        + correctionState.finalPublicLinks.linkLifecycle.previewPromotedToLiveCount,
      subscriptionReasonPolicy: correctionState.subscriptionReasonPolicy.policy,
      exactUrlsStoredInReport: false,
      canExecuteBuilderNow: false,
      canSendNow: false,
      openLiveMutationGateCount: 0,
    },
    payloads,
    correctionPreviewBoundary: {
      redactedOnly: true,
      exactUrlsStoredInReport: false,
      exactUrlsRemainOnlyInPrivateCorrectionInputsFile: true,
      mailerLiteUiEditApproved: false,
      additionalTestSendApproved: false,
      publicAudienceSendApproved: false,
      publicAudienceSendUrlGateReady: correctionState.finalPublicLinks.publicAudienceSendReady,
      blockersBeforeAudienceSend: correctionState.finalPublicLinks.blockersBeforeAudienceSend,
    },
  };
};

const buildPreviewRows = ({ redactedPayloadManifest }) =>
  (redactedPayloadManifest?.payloads ?? []).map((payload) => ({
    step: payload.step,
    role: payload.role,
    draftName: payload.mailerLiteAssetNameDraft,
    subject: payload.subject,
    finalPublicLinkKey: payload.correctionPreview?.finalPublicLinkKey ?? null,
    finalPublicLinkSha256: payload.correctionPreview?.finalPublicLinkSha256 ?? null,
    finalPublicLinkLifecycleStage: payload.correctionPreview?.finalPublicLinkLifecycleStage ?? null,
    exactUrlStoredHere: false,
    subscriptionReasonPolicy: payload.correctionPreview?.subscriptionReasonPolicy ?? null,
    footerPolicyApplied: payload.correctionPreview?.footerPolicyApplied ?? null,
    rawReplyDestinationTokenRendered: false,
  }));

const buildBlockers = ({ payloadManifest, correctionPlan, correctionState }) => unique([
  ...(payloadManifest?.status === 'email_builder_payload_manifest_ready_no_live_changes'
    ? []
    : [`payload_manifest_not_ready:${payloadManifest?.status ?? 'missing'}`]),
  ...(correctionPlan?.status === 'seed_inbox_correction_plan_ready_no_live_changes'
    ? []
    : [`correction_plan_not_ready:${correctionPlan?.status ?? 'missing'}`]),
  ...correctionState.finalPublicLinks.blockers,
  ...correctionState.subscriptionReasonPolicy.blockers,
]);

const buildSeedInboxCorrectionPreview = ({
  payloadManifest,
  correctionPlan,
  correctionState,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
  redactedPayloadManifestOut = DEFAULT_REDACTED_PAYLOAD_MANIFEST_OUTPUT,
}) => {
  const blockers = buildBlockers({ payloadManifest, correctionPlan, correctionState });
  const ready = blockers.length === 0;
  const waitingForWebPublicUrls =
    correctionState.finalPublicLinks.status === 'system_pending_public_urls_no_live_changes';
  const redactedPayloadManifest = ready
    ? buildRedactedPayloadManifest({ payloadManifest, correctionState, generatedAt })
    : null;
  const previewRows = ready ? buildPreviewRows({ redactedPayloadManifest }) : [];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_only_mailerlite_mini_launch_seed_inbox_correction_preview',
    generatedAt,
    ok: ready,
    status: ready
      ? 'seed_inbox_correction_preview_ready_no_live_changes'
      : waitingForWebPublicUrls
        ? 'seed_inbox_correction_preview_waiting_for_web_public_urls_no_live_changes'
        : 'seed_inbox_correction_preview_blocked_missing_inputs_no_live_changes',
    launch: correctionPlan?.launch ?? payloadManifest?.launch ?? null,
    executiveSummary: {
      correctionPlanStatus: correctionPlan?.status ?? null,
      payloadManifestStatus: payloadManifest?.status ?? null,
      finalPublicLinksReady: correctionState.finalPublicLinks.valid,
      finalPublicLinkCount: correctionState.finalPublicLinks.linkCount,
      finalPublicUrlHashesByKey: correctionState.finalPublicLinks.urlSha256ByKey,
      publicAudienceSendUrlGateReady: correctionState.finalPublicLinks.publicAudienceSendReady,
      previewOnlyLinkCount: correctionState.finalPublicLinks.linkLifecycle.previewUrlReadyCount,
      liveOrPromotedLinkCount:
        correctionState.finalPublicLinks.linkLifecycle.liveUrlReadyCount
        + correctionState.finalPublicLinks.linkLifecycle.previewPromotedToLiveCount,
      exactUrlsStoredInReport: false,
      subscriptionReasonPolicyReady: correctionState.subscriptionReasonPolicy.valid,
      subscriptionReasonPolicy: correctionState.subscriptionReasonPolicy.policy,
      redactedPayloadManifestReady: ready,
      redactedPayloadManifestOut: ready ? resolve(redactedPayloadManifestOut) : null,
      canAskMailerLiteUiEditApprovalNow: false,
      canAskAdditionalTestSendApprovalNow: false,
      canAskPublicSendApprovalNow: false,
      nextSafeAction: ready
        ? 'run_local_render_or_text_qa_on_redacted_payload_preview_before_any_ui_edit_approval'
        : waitingForWebPublicUrls
          ? 'wait_for_web_or_shopify_publish_receipt_public_urls_without_approval_or_execution'
          : 'collect_final_public_links_and_subscription_reason_policy_without_approval_or_execution',
    },
    previewRows,
    redactedPayloadManifest,
    blockers,
    hardStops: [
      'This preview is not approval for MailerLite UI edits.',
      'Final links being present does not approve another test send or a public/audience send.',
      'Preview-only links can support correction preview/test QA, but they must be promoted or replaced in the same slots before audience send.',
      'Use exact URLs only from the private correction inputs file at a later approved UI-edit boundary.',
      'Shared reports and redacted payload manifests must store hashes/redacted tokens only, never full final URLs.',
      'Do not touch subscribers, groups, workflows, Shopify, CRM, Signal Ledger, cards, scoring or Fact Store.',
    ],
    safety: buildSafety({ redactedPayloadManifestWritten: false }),
    sourceDigests,
  };
};

const renderList = (items = []) => items.length ? items.map((item) => `- ${item}`).join('\n') : '- none';

const renderMarkdown = (report) => [
  `# Seed Inbox Correction Preview - ${report.launch?.name ?? report.launch?.resourceName ?? 'Mini-launch'}`,
  '',
  `Generated: ${report.generatedAt}`,
  `Status: \`${report.status}\``,
  '',
  '## Summary',
  '',
  `- Final public links ready: ${report.executiveSummary.finalPublicLinksReady}`,
  `- Public audience-send URL gate ready: ${report.executiveSummary.publicAudienceSendUrlGateReady}`,
  `- Preview-only link count: ${report.executiveSummary.previewOnlyLinkCount}`,
  `- Live/promoted link count: ${report.executiveSummary.liveOrPromotedLinkCount}`,
  `- Final public URL hashes: ${Object.keys(report.executiveSummary.finalPublicUrlHashesByKey ?? {}).join(', ') || 'none'}`,
  `- Exact URLs stored in report: ${report.executiveSummary.exactUrlsStoredInReport}`,
  `- Subscription policy ready: ${report.executiveSummary.subscriptionReasonPolicyReady}`,
  `- Subscription policy: ${report.executiveSummary.subscriptionReasonPolicy ?? 'missing'}`,
  `- Redacted payload manifest ready: ${report.executiveSummary.redactedPayloadManifestReady}`,
  `- Can ask MailerLite UI edit approval now: ${report.executiveSummary.canAskMailerLiteUiEditApprovalNow}`,
  `- Can ask test/public send approval now: ${report.executiveSummary.canAskAdditionalTestSendApprovalNow}/${report.executiveSummary.canAskPublicSendApprovalNow}`,
  `- Next safe action: ${report.executiveSummary.nextSafeAction}`,
  '',
  '## Preview Rows',
  '',
  renderList(report.previewRows.map((row) =>
    `E${row.step} ${row.role}: linkKey=${row.finalPublicLinkKey ?? 'none'}, stage=${row.finalPublicLinkLifecycleStage ?? 'none'}, hash=${row.finalPublicLinkSha256 ?? 'none'}, policy=${row.subscriptionReasonPolicy ?? 'missing'}`)),
  '',
  '## Blockers',
  '',
  renderList(report.blockers),
  '',
  '## Hard Stops',
  '',
  renderList(report.hardStops),
  '',
  '## Safety',
  '',
  `- Local only: ${report.safety.localOnly}`,
  `- Exact URLs stored in report: ${report.safety.exactUrlsStoredInReport}`,
  `- MailerLite API called: ${report.safety.mailerLiteApiCalled}`,
  `- Sends performed: ${report.safety.sendsPerformed}`,
  `- CRM live API called: ${report.safety.crmLiveApiCalled}`,
  `- Fact Store write performed: ${report.safety.factStoreWritePerformed}`,
  '',
].join('\n');

const assertNoExactUrlsStored = ({ report, correctionInputs }) => {
  const finalLinks = correctionInputs?.finalPublicLinks
    ?? correctionInputs?.final_public_links
    ?? correctionInputs?.links
    ?? {};
  const serialized = JSON.stringify(report);
  for (const key of FINAL_PUBLIC_LINK_KEYS) {
    const value = cleanString(finalLinks?.[key]);
    if (value && serialized.includes(value)) {
      throw new Error(`exact_url_leaked_in_report:${key}:${sha256(value)}`);
    }
  }
};

const writeText = async (path, content) => {
  const resolved = resolve(path);
  await mkdir(dirname(resolved), { recursive: true });
  await writeFile(resolved, content, 'utf8');
  return resolved;
};

const buildPreviewFromFiles = async (options) => {
  const [payloadManifestEntry, correctionPlanEntry, correctionInputsEntry, launchAssetManifestEntry] = await Promise.all([
    readJsonWithDigest(options.payloadManifest, 'current email builder payload manifest'),
    readJsonWithDigest(options.correctionPlan, 'seed inbox correction plan and required input ids'),
    readOptionalJsonWithDigest(options.correctionInputsFile, 'private final public links and subscription policy validation only'),
    readOptionalJsonWithDigest(options.launchAssetManifest, 'system-owned launch asset manifest and footer policy defaults'),
  ]);
  const correctionState = buildCorrectionInputsState({
    path: options.correctionInputsFile,
    read: correctionInputsEntry.read,
    launchAssetManifestRead: launchAssetManifestEntry.read,
    launchAssetManifestFile: options.launchAssetManifest,
  });
  return buildSeedInboxCorrectionPreview({
    payloadManifest: payloadManifestEntry.value,
    correctionPlan: correctionPlanEntry.value,
    correctionState,
    sourceDigests: [
      payloadManifestEntry.digest,
      correctionPlanEntry.digest,
      correctionInputsEntry.digest,
      launchAssetManifestEntry.digest,
    ],
    redactedPayloadManifestOut: options.redactedPayloadManifestOut,
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildPreviewFromFiles(options);
  assertNoExactUrlsStored({
    report,
    correctionInputs: report.sourceDigests.find((source) => source.consultedFor.includes('private final'))?.present
      ? (await readOptionalJsonWithDigest(options.correctionInputsFile, 'leak check')).value
      : null,
  });

  const redactedPayloadManifestWritten = Boolean(
    report.ok
    && options.writeRedactedPayloadManifest
    && options.redactedPayloadManifestOut
    && report.redactedPayloadManifest
  );
  report.safety.redactedPayloadManifestWritten = redactedPayloadManifestWritten;

  if (options.out) await writeText(options.out, `${JSON.stringify(report, null, 2)}\n`);
  if (options.markdownOut) await writeText(options.markdownOut, `${renderMarkdown(report)}\n`);
  if (redactedPayloadManifestWritten) {
    await writeText(options.redactedPayloadManifestOut, `${JSON.stringify(report.redactedPayloadManifest, null, 2)}\n`);
  }

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    finalPublicLinksReady: report.executiveSummary.finalPublicLinksReady,
    subscriptionReasonPolicyReady: report.executiveSummary.subscriptionReasonPolicyReady,
    redactedPayloadManifestWritten,
    redactedPayloadManifestOut: redactedPayloadManifestWritten ? resolve(options.redactedPayloadManifestOut) : null,
    canAskMailerLiteUiEditApprovalNow: report.executiveSummary.canAskMailerLiteUiEditApprovalNow,
    canAskPublicSendApprovalNow: report.executiveSummary.canAskPublicSendApprovalNow,
    blockers: report.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed inbox correction preview failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildRedactedPayloadManifest,
  buildSeedInboxCorrectionPreview,
  buildSafety,
  parseArgs,
  redactPayloadForPreview,
  renderMarkdown,
};
