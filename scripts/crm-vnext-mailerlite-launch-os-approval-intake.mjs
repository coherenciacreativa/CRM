#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SCHEMA_VERSION = 'crm-vnext-mailerlite-launch-os-approval-intake-2026-05-28';
const DEFAULT_APPROVAL_QUEUE = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_launch_os_approval_queue_2026-05-28.json';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-launch-os-approval-intake.mjs [options]

Options:
  --approval-queue <path>  Launch OS approval queue JSON. Defaults to ${DEFAULT_APPROVAL_QUEUE}
  --approval-text <text>   Human approval text to check locally
  --approval-file <path>   File containing human approval text to check locally
  --out <path>             Write JSON intake report
  --markdown-out <path>    Write Markdown intake report
  --help                   Show this help

Local-only intake for exact MailerLite Launch OS approval phrases. It detects
whether the supplied text contains one approved phrase from the queue and then
prints the required fresh-evidence plan. It never executes the plan, calls live
APIs, reads subscribers, creates groups, edits workflows, sends emails, appends
ledgers, writes cards, changes scoring, touches Fact Store, or prints tokens.`;

const parseArgs = (argv) => {
  const options = {
    approvalQueue: DEFAULT_APPROVAL_QUEUE,
    approvalText: null,
    approvalFile: null,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--approval-queue') options.approvalQueue = argv[++index];
    else if (arg === '--approval-text') options.approvalText = argv[++index];
    else if (arg === '--approval-file') options.approvalFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (options.approvalText && options.approvalFile) {
    throw new Error('approval_text_and_file_are_mutually_exclusive');
  }

  return options;
};

const sha256 = (value) => createHash('sha256').update(value).digest('hex');

const normalizeApprovalText = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
  return trimmed || null;
};

const readApprovalText = async (options) => {
  if (options.approvalText) return normalizeApprovalText(options.approvalText);
  if (options.approvalFile) return normalizeApprovalText(await readFile(resolve(options.approvalFile), 'utf8'));
  return null;
};

const writeJson = async (path, value) => {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = async (path, value) => {
  await mkdir(dirname(resolve(path)), { recursive: true });
  await writeFile(resolve(path), value);
};

const buildSafety = () => ({
  localOnly: true,
  reportsOnly: true,
  approvalTextPrinted: false,
  exactApprovalPhrasePrinted: false,
  externalMessagesSent: false,
  mailerLiteApiCalled: false,
  shopifyApiCalled: false,
  crmLiveApiCalled: false,
  subscribersRead: false,
  subscriberRowsPrinted: false,
  mailerLiteMutationsPerformed: false,
  shopifyMutationsPerformed: false,
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

const approvalPhraseMatches = ({ approvalText, approvalItems }) => {
  if (!approvalText) return [];
  return (approvalItems ?? [])
    .filter((item) => typeof item.exactApprovalPhrase === 'string' && item.exactApprovalPhrase.trim())
    .filter((item) => approvalText.includes(item.exactApprovalPhrase));
};

const blockedReasonFor = (item) => {
  if (!item) return [];
  const blockers = Array.isArray(item.blockers) ? item.blockers : [];
  if (blockers.length > 0) return blockers;
  if (item.status !== 'ready_for_exact_approval_request') return [`approval_item_not_ready:${item.status ?? 'unknown'}`];
  if (item.canAskAlejandroNow !== true) return ['approval_item_not_marked_can_ask_alejandro_now'];
  return [];
};

const buildOperatorPlan = (item) => {
  if (!item) return [];
  return [
    'Do not execute any live operation from this intake report.',
    ...((item.requiredFreshEvidence ?? []).map((step) => `Fresh evidence required: ${step}`)),
    item.commandAfterApproval
      ? `After fresh evidence passes, use only this scoped command family: ${item.commandAfterApproval}`
      : 'No execution command is available for this item.',
    'Keep every still-closed gate closed even after the exact approval phrase.',
    'Generate a separate execution receipt if a later guarded runner is actually executed.',
  ];
};

const buildUnmatchedApprovalPlan = ({ approvalTextProvided, readyApprovalIds }) => {
  if (!approvalTextProvided) return [];
  return [
    'Human approval text was supplied, but it did not match exactly one queued approval phrase.',
    'Treat broad, approximate, or multi-scope approval as non-executable.',
    `Ready queue items remain separate boundaries: ${(readyApprovalIds ?? []).join(', ') || 'none'}.`,
    'Ask for or route the exact scoped phrase for one queue item before any fresh evidence or guarded runner.',
    'Do not infer whether broad approval applies to mini-launch groups, Onboarding v2 groups, email asset build, Shopify local build, or Brújula builder draft.',
  ];
};

const buildApprovalIntake = ({
  approvalQueue,
  approvalText = null,
  approvalTextSource = 'none',
  generatedAt = new Date().toISOString(),
  sourceDigests = [],
}) => {
  const safety = buildSafety();
  const normalizedText = normalizeApprovalText(approvalText);
  const approvalItems = approvalQueue?.approvalItems ?? [];
  const matches = approvalPhraseMatches({ approvalText: normalizedText, approvalItems });
  const readyApprovalIds = approvalQueue?.executiveSummary?.readyApprovalIds ?? [];
  const blockedApprovalIds = approvalQueue?.executiveSummary?.blockedApprovalIds ?? [];
  const matchedItem = matches.length === 1 ? matches[0] : null;
  const matchedBlockers = blockedReasonFor(matchedItem);
  const matchedReady = Boolean(matchedItem)
    && matchedItem.status === 'ready_for_exact_approval_request'
    && matchedItem.canAskAlejandroNow === true
    && matchedBlockers.length === 0;

  const status = !normalizedText
    ? 'waiting_for_exact_approval_text_no_live_changes'
    : matches.length === 0
      ? 'approval_text_present_but_no_exact_phrase_no_live_changes'
      : matches.length > 1
        ? 'ambiguous_exact_approval_phrase_detected_no_live_changes'
        : matchedReady
          ? 'exact_approval_detected_requires_fresh_evidence_no_live_changes'
          : 'matched_approval_item_not_ready_no_live_changes';
  const approvalTextClassification = !normalizedText
    ? 'none'
    : matches.length === 0
      ? 'unmatched_or_broad_scope'
      : matches.length > 1
        ? 'ambiguous_multiple_exact_matches'
        : matchedReady
          ? 'single_exact_ready_match'
          : 'single_exact_match_not_ready';
  const approvalTextHandling = {
    exactQueuedPhraseRequired: true,
    broadOrApproximateApprovalExecutable: false,
    approvalTextClassification,
    noLiveActionReason: !normalizedText
      ? 'no_approval_text_supplied'
      : matches.length === 0
        ? 'supplied_text_did_not_match_any_exact_queued_approval_phrase'
        : matches.length > 1
          ? 'supplied_text_matched_more_than_one_queued_approval_phrase'
          : matchedReady
            ? 'exact_phrase_detected_but_execution_still_requires_fresh_evidence_and_guarded_runner'
            : 'matched_approval_item_is_not_ready',
    recommendedBoundary: approvalQueue?.executiveSummary?.nextBestHumanBoundary ?? null,
  };

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'local_no_live_approval_intake',
    generatedAt,
    ok: true,
    status,
    executiveSummary: {
      approvalQueueStatus: approvalQueue?.status ?? null,
      approvalTextProvided: Boolean(normalizedText),
      approvalTextSource,
      approvalTextSha256: normalizedText ? sha256(normalizedText) : null,
      matchedApprovalCount: matches.length,
      matchedApprovalId: matchedItem?.id ?? null,
      matchedReadyApproval: matchedReady,
      canProceedToFreshEvidence: matchedReady,
      executionAllowedNow: false,
      liveMutationPerformed: false,
      readyApprovalRequestCount: approvalQueue?.executiveSummary?.readyApprovalRequestCount ?? null,
      blockedApprovalRequestCount: approvalQueue?.executiveSummary?.blockedApprovalRequestCount ?? null,
      openLiveMutationGateCount: approvalQueue?.executiveSummary?.openLiveMutationGateCount ?? null,
      nextBestHumanBoundary: approvalQueue?.executiveSummary?.nextBestHumanBoundary ?? null,
      approvalTextClassification,
      readyApprovalIds,
      blockedApprovalIds,
    },
    approvalTextHandling,
    matchedApproval: matchedItem ? {
      id: matchedItem.id,
      title: matchedItem.title,
      lane: matchedItem.lane,
      operationType: matchedItem.operationType,
      status: matchedItem.status,
      canAskAlejandroNow: matchedItem.canAskAlejandroNow,
      exactApprovalPhraseSha256: matchedItem.exactApprovalPhrase ? sha256(matchedItem.exactApprovalPhrase) : null,
      targetCount: matchedItem.targetCount ?? 0,
      targetNames: matchedItem.targetNames ?? [],
      allowedAfterExactApproval: matchedItem.allowedAfterExactApproval ?? [],
      stillClosed: matchedItem.stillClosed ?? [],
      requiredFreshEvidence: matchedItem.requiredFreshEvidence ?? [],
      commandAfterApproval: matchedItem.commandAfterApproval ?? null,
      blockers: matchedBlockers,
    } : null,
    ambiguousMatches: matches.length > 1
      ? matches.map((item) => ({
        id: item.id,
        title: item.title,
        status: item.status,
        canAskAlejandroNow: item.canAskAlejandroNow,
      }))
      : [],
    operatorPlan: matchedItem
      ? buildOperatorPlan(matchedItem)
      : buildUnmatchedApprovalPlan({
        approvalTextProvided: Boolean(normalizedText),
        readyApprovalIds,
      }),
    safety,
    sourceDigests,
  };
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- None');

const renderMarkdown = (intake) => [
  '# MailerLite Launch OS v0 - Approval Intake',
  '',
  `Generated: ${intake.generatedAt}`,
  `Status: ${intake.status}`,
  '',
  '## Executive Summary',
  '',
  `- Approval text provided: ${intake.executiveSummary.approvalTextProvided}`,
  `- Matched approval count: ${intake.executiveSummary.matchedApprovalCount}`,
  `- Matched approval id: ${intake.executiveSummary.matchedApprovalId ?? 'none'}`,
  `- Can proceed to fresh evidence: ${intake.executiveSummary.canProceedToFreshEvidence}`,
  `- Execution allowed now: ${intake.executiveSummary.executionAllowedNow}`,
  `- Open live mutation gates: ${intake.executiveSummary.openLiveMutationGateCount ?? 'unknown'}`,
  `- Next queue boundary: ${intake.executiveSummary.nextBestHumanBoundary ?? 'none'}`,
  '',
  '## Matched Approval',
  '',
  intake.matchedApproval ? [
    `- ID: ${intake.matchedApproval.id}`,
    `- Title: ${intake.matchedApproval.title}`,
    `- Lane: ${intake.matchedApproval.lane}`,
    `- Operation type: ${intake.matchedApproval.operationType}`,
    `- Target count: ${intake.matchedApproval.targetCount}`,
    '',
    'Targets:',
    renderList(intake.matchedApproval.targetNames),
    '',
    'Allowed after exact approval:',
    renderList(intake.matchedApproval.allowedAfterExactApproval),
    '',
    'Still closed:',
    renderList(intake.matchedApproval.stillClosed),
    '',
    'Required fresh evidence:',
    renderList(intake.matchedApproval.requiredFreshEvidence),
    '',
    'Blockers:',
    renderList(intake.matchedApproval.blockers),
  ].join('\n') : '- None',
  '',
  '## Operator Plan',
  '',
  renderList(intake.operatorPlan),
  '',
  '## Safety',
  '',
  `- Local only: ${intake.safety.localOnly}`,
  `- Reports only: ${intake.safety.reportsOnly}`,
  `- Approval text printed: ${intake.safety.approvalTextPrinted}`,
  `- Exact approval phrase printed: ${intake.safety.exactApprovalPhrasePrinted}`,
  `- MailerLite API called: ${intake.safety.mailerLiteApiCalled}`,
  `- Shopify API called: ${intake.safety.shopifyApiCalled}`,
  `- CRM live API called: ${intake.safety.crmLiveApiCalled}`,
  `- Mutations performed: ${intake.safety.mailerLiteMutationsPerformed || intake.safety.shopifyMutationsPerformed || intake.safety.crmCardMutationsPerformed}`,
  `- Sends performed: ${intake.safety.sendsPerformed}`,
  '',
].join('\n');

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const approvalQueuePath = resolve(options.approvalQueue);
  const approvalQueueRaw = await readFile(approvalQueuePath, 'utf8');
  const approvalQueue = JSON.parse(approvalQueueRaw);
  const approvalText = await readApprovalText(options);
  const sourceDigests = [
    {
      path: approvalQueuePath,
      present: true,
      chars: approvalQueueRaw.length,
      consultedFor: 'exact approval phrases and current queue state',
    },
  ];
  if (options.approvalFile) {
    const approvalFilePath = resolve(options.approvalFile);
    const approvalFileRaw = await readFile(approvalFilePath, 'utf8');
    sourceDigests.push({
      path: approvalFilePath,
      present: true,
      chars: approvalFileRaw.length,
      consultedFor: 'human approval text; content is not printed',
    });
  }

  const intake = buildApprovalIntake({
    approvalQueue,
    approvalText,
    approvalTextSource: options.approvalFile ? 'file' : options.approvalText ? 'cli_text' : 'none',
    sourceDigests,
  });

  if (options.out) await writeJson(options.out, intake);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(intake));

  console.log(JSON.stringify({
    ok: intake.ok,
    status: intake.status,
    generatedAt: intake.generatedAt,
    approvalTextProvided: intake.executiveSummary.approvalTextProvided,
    matchedApprovalCount: intake.executiveSummary.matchedApprovalCount,
    matchedApprovalId: intake.executiveSummary.matchedApprovalId,
    canProceedToFreshEvidence: intake.executiveSummary.canProceedToFreshEvidence,
    executionAllowedNow: intake.executiveSummary.executionAllowedNow,
    openLiveMutationGateCount: intake.executiveSummary.openLiveMutationGateCount,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: intake.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Launch OS approval intake failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildApprovalIntake,
  buildSafety,
  normalizeApprovalText,
  parseArgs,
  renderMarkdown,
};
