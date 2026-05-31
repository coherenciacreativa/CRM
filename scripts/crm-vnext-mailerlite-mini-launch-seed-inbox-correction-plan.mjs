#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-seed-inbox-correction-plan-2026-05-31';
const DEFAULT_SEED_INBOX_QA = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_inbox_qa_inteligencia_descansar_2026-05-31.json';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_current_inteligencia_descansar_2026-05-31.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-plan.mjs [options]

Options:
  --seed-inbox-qa <path>       Seed inbox QA JSON. Defaults to ${DEFAULT_SEED_INBOX_QA}
  --payload-manifest <path>    Local email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --out <path>                 Write JSON correction plan
  --markdown-out <path>        Write Markdown correction plan
  --help                       Show this help

Local-only correction plan for seed inbox QA findings. It reads seed QA and
payload evidence, then prepares a no-live correction plan. It never opens UI,
calls MailerLite/Shopify/CRM APIs, sends emails, mutates subscribers/groups,
edits workflows, appends ledgers, writes cards/scoring, touches Fact Store, or
prints full seed recipients/tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    seedInboxQa: DEFAULT_SEED_INBOX_QA,
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--seed-inbox-qa') options.seedInboxQa = argv[++index];
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
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
      consultedFor,
    },
  };
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  gmailReadOnly: false,
  mailerLiteUiOpened: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscriberMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  mailerLiteSendsPerformed: false,
  publicOrAudienceSendPerformed: false,
  signalLedgerAppendPerformed: false,
  crmCardMutationsPerformed: false,
  crmScoreMutationsPerformed: false,
  factStoreWritePerformed: false,
  tokensPrinted: false,
  fullSeedRecipientPrinted: false,
});

const messageByStep = (seedInboxQa) => new Map((seedInboxQa?.messageQa ?? [])
  .map((message) => [Number(message?.step), message])
  .filter(([step]) => Number.isFinite(step)));

const payloadByStep = (payloadManifest) => new Map((payloadManifest?.payloads ?? [])
  .map((payload) => [Number(payload?.step), payload])
  .filter(([step]) => Number.isFinite(step)));

const targetStepsFor = (correctionId) => {
  if (correctionId === 'footer_sender_name_consistency') return [2, 3, 4];
  if (correctionId === 'spanish_subscription_reason_consistency') return [1, 2, 3, 4];
  if (correctionId === 'feedback_reply_cta_cleanup') return [4];
  if (correctionId === 'replace_inert_placeholders_before_public') return [1, 2, 3];
  return [];
};

const correctionKindFor = (correctionId) => {
  if (correctionId === 'replace_inert_placeholders_before_public') return 'final_link_required_before_public';
  if (correctionId === 'feedback_reply_cta_cleanup') return 'cta_copy_or_reply_behavior_cleanup';
  if (correctionId?.includes('footer')) return 'footer_consistency_cleanup';
  if (correctionId?.includes('subscription')) return 'subscription_reason_consistency';
  return 'copy_cleanup';
};

const actionFor = (correctionId) => {
  if (correctionId === 'footer_sender_name_consistency') {
    return 'Remove or normalize the duplicate standalone sender-name line after the signoff in E02-E04.';
  }
  if (correctionId === 'spanish_subscription_reason_consistency') {
    return 'Choose one consistent Spanish subscription-reason policy across E01-E04 before public use.';
  }
  if (correctionId === 'feedback_reply_cta_cleanup') {
    return 'Replace the raw reply token with polished reply copy or final approved reply behavior in E04.';
  }
  if (correctionId === 'replace_inert_placeholders_before_public') {
    return 'Collect final approved links and replace the inert URL placeholders in E01-E03 before public/audience send.';
  }
  return 'Review and resolve this seed inbox QA finding before public/audience use.';
};

const targetDraftsFor = ({ correctionId, seedInboxQa, payloadManifest }) => {
  const messages = messageByStep(seedInboxQa);
  const payloads = payloadByStep(payloadManifest);
  return targetStepsFor(correctionId).map((step) => {
    const message = messages.get(step);
    const payload = payloads.get(step);
    const placeholders = (payload?.contentBlocks ?? [])
      .map((block) => cleanString(block?.placeholder?.value))
      .filter(Boolean);
    return {
      step,
      role: cleanString(message?.role) ?? cleanString(payload?.role),
      subject: cleanString(message?.subject) ?? cleanString(payload?.subject),
      gmailReceiptId: cleanString(message?.gmailReceiptId),
      payloadRole: cleanString(payload?.role),
      placeholderValues: placeholders,
    };
  });
};

const buildCorrections = ({ seedInboxQa, payloadManifest }) => (seedInboxQa?.recommendedCorrectionsBeforePublic ?? [])
  .map((correction) => {
    const id = cleanString(correction?.id);
    return {
      id,
      severity: cleanString(correction?.severity),
      kind: correctionKindFor(id),
      scope: cleanString(correction?.scope),
      recommendation: cleanString(correction?.recommendation),
      localPlanAction: actionFor(id),
      targetDrafts: targetDraftsFor({ correctionId: id, seedInboxQa, payloadManifest }),
      requiresFinalLinkInput: id === 'replace_inert_placeholders_before_public',
      requiresBrandOrHumanContentChoice: id === 'spanish_subscription_reason_consistency',
      requiresMailerLiteUiEditLater: true,
      canExecuteNow: false,
    };
  });

const requiredInputsFor = (corrections) => {
  const inputs = [];
  if (corrections.some((correction) => correction.requiresFinalLinkInput)) {
    inputs.push({
      id: 'final_public_links',
      label: 'Final approved public links',
      requiredFor: 'Replacing inert placeholders before any public/audience send.',
      acceptableForm: '{ result_or_resource_link, practice_link, editorial_note_link }',
    });
  }
  if (corrections.some((correction) => correction.requiresBrandOrHumanContentChoice)) {
    inputs.push({
      id: 'subscription_reason_policy',
      label: 'Footer/subscription-reason policy',
      requiredFor: 'Making the Spanish subscription-reason line consistent across E01-E04.',
      acceptableForm: 'include_once_in_all_emails or remove_custom_line_and_rely_on_platform_footer',
    });
  }
  return inputs;
};

const buildSeedInboxCorrectionPlan = ({
  seedInboxQa,
  payloadManifest,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const corrections = buildCorrections({ seedInboxQa, payloadManifest });
  const seedQaCompleted = cleanString(seedInboxQa?.status)?.startsWith('seed_inbox_qa_completed') ?? false;
  const correctionRecommended = seedInboxQa?.executiveSummary?.correctionRecommendedBeforePublicLaunch === true;
  const requiredInputs = requiredInputsFor(corrections);
  const blockerIds = [
    ...(!seedQaCompleted ? ['seed_inbox_qa_not_completed'] : []),
    ...(correctionRecommended ? ['public_readiness_yellow'] : []),
    ...requiredInputs.map((input) => `${input.id}_missing`),
    'exact_mailerlite_ui_edit_approval_missing',
    'fresh_post_correction_qa_missing',
  ];
  const status = !seedQaCompleted
    ? 'seed_inbox_correction_plan_blocked_missing_seed_qa_no_live_changes'
    : correctionRecommended
      ? 'seed_inbox_correction_plan_ready_no_live_changes'
      : 'seed_inbox_correction_plan_reference_only_no_corrections_needed';

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'local_only_seed_inbox_correction_plan',
    ok: seedQaCompleted,
    status,
    launch: {
      id: cleanString(seedInboxQa?.launch?.id) ?? cleanString(payloadManifest?.launch?.launchId),
      name: cleanString(seedInboxQa?.launch?.name) ?? cleanString(payloadManifest?.launch?.resourceName),
    },
    executiveSummary: {
      deliveryStatus: seedInboxQa?.executiveSummary?.deliveryStatus ?? null,
      publicReadinessBeforeCorrections: seedInboxQa?.executiveSummary?.readerFacingPublicReadiness ?? null,
      correctionRecommendedBeforePublicLaunch: correctionRecommended,
      correctionCount: corrections.length,
      requiredInputCount: requiredInputs.length,
      canAskMailerLiteUiEditApprovalNow: false,
      canAskAdditionalTestSendApprovalNow: false,
      canAskPublicSendApprovalNow: false,
      nextSafeAction: corrections.length > 0
        ? 'collect_required_inputs_and_prepare_local_corrected_payload_preview'
        : 'keep_public_launch_closed_until_fresh_public_send_approval',
    },
    corrections,
    requiredInputsBeforeUiEditApproval: requiredInputs,
    blockersBeforeAnyMailerLiteUiEditApproval: blockerIds,
    allowedLocalWorkNow: [
      'write_local_corrected_payload_preview',
      'review_footer_policy',
      'collect_final_public_links',
      'regenerate_local_render_or_text_qa',
      'refresh_runbook_goal_audit_validation_receipt',
    ],
    stillClosed: [
      'mailerlite_ui_draft_edit',
      'additional_test_send',
      'public_or_audience_send',
      'publish_or_schedule',
      'workflow_or_automation_attachment',
      'subscriber_import_assignment_or_mutation',
      'group_creation_or_assignment',
      'shopify_preview_publish_or_form_connection',
      'crm_signal_ledger_append',
      'crm_card_write',
      'crm_scoring',
      'fact_store_write',
    ],
    safety: buildSafety(),
    sourceDigests,
  };
};

const renderMarkdown = (plan) => {
  const lines = [
    `# Seed Inbox Correction Plan - ${plan.launch.name ?? 'Mini-launch'}`,
    '',
    `Status: \`${plan.status}\``,
    '',
    '## Summary',
    '',
    `- Delivery status: ${plan.executiveSummary.deliveryStatus ?? 'unknown'}`,
    `- Public readiness before corrections: ${plan.executiveSummary.publicReadinessBeforeCorrections ?? 'unknown'}`,
    `- Corrections: ${plan.executiveSummary.correctionCount}`,
    `- Required inputs before UI edit approval: ${plan.executiveSummary.requiredInputCount}`,
    `- Can ask MailerLite UI edit approval now: ${plan.executiveSummary.canAskMailerLiteUiEditApprovalNow}`,
    `- Can ask public send approval now: ${plan.executiveSummary.canAskPublicSendApprovalNow}`,
    '',
    '## Corrections',
    '',
  ];

  for (const correction of plan.corrections) {
    lines.push(`- ${correction.id}: ${correction.localPlanAction}`);
    lines.push(`  - Severity: ${correction.severity}`);
    lines.push(`  - Targets: ${correction.targetDrafts.map((draft) => `E${draft.step}`).join(', ') || 'none'}`);
    lines.push(`  - Requires final link input: ${correction.requiresFinalLinkInput}`);
    lines.push(`  - Requires Brand/human content choice: ${correction.requiresBrandOrHumanContentChoice}`);
  }

  lines.push('', '## Inputs Needed Before Any UI Edit Approval', '');
  if (plan.requiredInputsBeforeUiEditApproval.length === 0) {
    lines.push('- none');
  } else {
    for (const input of plan.requiredInputsBeforeUiEditApproval) {
      lines.push(`- ${input.id}: ${input.acceptableForm}`);
    }
  }

  lines.push('', '## Blockers', '');
  for (const blocker of plan.blockersBeforeAnyMailerLiteUiEditApproval) lines.push(`- ${blocker}`);

  lines.push('', '## Safety', '');
  lines.push('- Local-only.');
  lines.push('- No MailerLite UI opened.');
  lines.push('- No MailerLite, Shopify or CRM API calls.');
  lines.push('- No sends, schedules, subscribers, groups, workflows, ledgers, cards, scoring or Fact Store writes.');
  lines.push('- Full seed recipient and tokens not printed.');

  return `${lines.join('\n')}\n`;
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

const buildPlanFromFiles = async (options) => {
  const [seedInboxQaEntry, payloadManifestEntry] = await Promise.all([
    readJsonWithDigest(options.seedInboxQa, 'seed inbox QA findings and correction recommendations'),
    readJsonWithDigest(options.payloadManifest, 'local payload manifest with target steps and inert placeholders'),
  ]);
  return buildSeedInboxCorrectionPlan({
    seedInboxQa: seedInboxQaEntry.value,
    payloadManifest: payloadManifestEntry.value,
    sourceDigests: [seedInboxQaEntry.digest, payloadManifestEntry.digest],
  });
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const plan = await buildPlanFromFiles(options);
  if (options.out) await writeJson(options.out, plan);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(plan));

  console.log(JSON.stringify({
    ok: plan.ok,
    status: plan.status,
    generatedAt: plan.generatedAt,
    correctionCount: plan.executiveSummary.correctionCount,
    requiredInputCount: plan.executiveSummary.requiredInputCount,
    canAskMailerLiteUiEditApprovalNow: plan.executiveSummary.canAskMailerLiteUiEditApprovalNow,
    canAskPublicSendApprovalNow: plan.executiveSummary.canAskPublicSendApprovalNow,
    blockers: plan.blockersBeforeAnyMailerLiteUiEditApproval,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: plan.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite mini-launch seed inbox correction plan failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildCorrections,
  buildSeedInboxCorrectionPlan,
  parseArgs,
  renderMarkdown,
  requiredInputsFor,
  targetStepsFor,
};
