#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  evaluateCampaignDraft,
} from './crm-vnext-mailerlite-mini-launch-real-mailerlite-render-qa.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-real-mailerlite-render-qa-2026-05-28';
const DEFAULT_CORRECTION = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email_style_correction_packet_2026-05-27.json';
const DEFAULT_MANUAL_UI_RECEIPT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_brujula_email1_manual_ui_build_receipt_2026-05-28.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-real-mailerlite-render-qa.mjs [options]

Options:
  --correction <path>          Brújula corrected Email 1 packet. Defaults to ${DEFAULT_CORRECTION}
  --manual-ui-receipt <path>   Brújula manual UI build receipt. Defaults to ${DEFAULT_MANUAL_UI_RECEIPT}
  --service <name>             Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>             Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>             MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>             Per-request timeout. Defaults to 30000
  --out <path>                 Write JSON QA report
  --markdown-out <path>        Write Markdown QA report
  --help                       Show this help

Read-only QA for the real MailerLite Brújula Email 1 draft. It fetches the
campaign by the ID recorded in the manual UI build receipt, checks exact copy,
draft/no-recipient/no-schedule/no-workflow gates, and stops. It never sends,
schedules, creates groups, reads or mutates subscribers, attaches workflows,
publishes Shopify, calls CRM live APIs, appends ledgers, writes cards/scoring,
touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    correction: DEFAULT_CORRECTION,
    manualUiReceipt: DEFAULT_MANUAL_UI_RECEIPT,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: null,
    markdownOut: null,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--correction') options.correction = argv[++index];
    else if (arg === '--manual-ui-receipt') options.manualUiReceipt = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = cleanString(options.apiBase)?.replace(/\/+$/, '');
  if (options.apiBase !== DEFAULT_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${options.apiBase}`);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const readText = async (path) => readFile(resolve(path), 'utf8');
const readJson = async (path) => JSON.parse(await readText(path));

const sourceDigest = (path, content, consultedFor) => ({
  path: resolve(path),
  present: true,
  chars: content.length,
  consultedFor,
});

const tokenFromKeychain = async ({ service, account }) => {
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    if (cleanString(process.env[name])) return process.env[name].trim();
  }
  const { stdout } = await execFileAsync('/usr/bin/security', [
    'find-generic-password',
    '-s',
    service,
    '-a',
    account,
    '-w',
  ], { timeout: 10_000 });
  const token = cleanString(stdout);
  if (!token) throw new Error(`missing_mailerlite_token:${service}:${account}`);
  return token;
};

const fetchJson = async ({ apiBase, token, path, timeoutMs }) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${apiBase}${path}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
      signal: controller.signal,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(`mailerlite_get_failed:${path}:${response.status}:${body?.message ?? 'unknown'}`);
    return body;
  } finally {
    clearTimeout(timeout);
  }
};

const campaignIdFromReceipt = (receipt) =>
  cleanString(receipt?.campaign?.id)
  ?? cleanString(receipt?.executiveSummary?.campaignId)
  ?? cleanString(receipt?.scope?.campaignId);

const campaignNameFromReceipt = (receipt) =>
  cleanString(receipt?.campaign?.name)
  ?? cleanString(receipt?.executiveSummary?.campaignName)
  ?? cleanString(receipt?.scope?.campaignName);

const receiptClosed = (receipt) =>
  ['brujula_email1_manual_ui_build_receipt_green_draft_created_no_sends', 'brujula_email1_manual_ui_build_receipt_executed_draft_created_no_sends']
    .includes(receipt?.status)
  && campaignIdFromReceipt(receipt)
  && (receipt?.campaign?.sent === false || receipt?.safety?.sendsPerformed === false)
  && (receipt?.campaign?.scheduled === false || receipt?.safety?.schedulesCreated === false || receipt?.safety?.schedulesPerformed === false);

const payloadFromCorrection = ({ correction, receipt }) => {
  const draft = correction?.draft ?? {};
  const bodyParagraphs = Array.isArray(draft.bodyParagraphs) ? draft.bodyParagraphs : [];
  const contentBlocks = [
    { id: 'brujula_email1_greeting', type: 'greeting', text: 'Hola,' },
    ...bodyParagraphs.map((text, index) => ({
      id: `brujula_email1_paragraph_${index + 1}`,
      type: 'paragraph',
      text,
    })),
    {
      id: 'brujula_email1_cta',
      type: 'cta',
      text: draft.ctaText,
      destination: draft.guideUrl,
      placeholder: { value: draft.guideUrl },
    },
    { id: 'brujula_email1_closing', type: 'closing', text: draft.closing },
    { id: 'brujula_email1_signature', type: 'closing', text: draft.signatureText },
  ].filter((block) => cleanString(block.text) || cleanString(block.placeholder?.value));

  return {
    step: Number(draft.emailStep ?? 1),
    role: cleanString(draft.role) ?? 'guide_delivery',
    mailerLiteAssetNameDraft: campaignNameFromReceipt(receipt) ?? cleanString(draft.subject),
    subject: draft.subject,
    preheader: draft.preheader,
    contentBlocks,
  };
};

const statusFor = ({ draft, blockers }) => {
  if (!draft) return 'brujula_email1_real_mailerlite_render_qa_blocked_missing_draft_no_live_changes';
  if (!draft.safetyChecks.allSafetyGatesClosed) return 'brujula_email1_real_mailerlite_render_qa_blocked_safety_gate_mismatch_no_live_changes';
  if (!draft.subject.matches || !draft.preheader.matches || !draft.content.allRequiredFragmentsExact) {
    return 'brujula_email1_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes';
  }
  return blockers.length === 0
    ? 'brujula_email1_real_mailerlite_render_qa_green_no_live_changes'
    : 'brujula_email1_real_mailerlite_render_qa_blocked_no_live_changes';
};

const buildBrujulaRealMailerLiteRenderQa = ({
  correction,
  manualUiReceipt,
  campaign,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const blockers = [];
  const campaignId = campaignIdFromReceipt(manualUiReceipt);
  const expectedName = campaignNameFromReceipt(manualUiReceipt);

  if (correction?.status !== 'brujula_email1_corrected_draft_ready_for_mailerlite_builder_no_live_changes') {
    blockers.push(`correction_not_ready:${correction?.status ?? 'missing'}`);
  }
  if (!receiptClosed(manualUiReceipt)) {
    blockers.push(`manual_ui_receipt_not_closed:${manualUiReceipt?.status ?? 'missing'}`);
  }
  if (!campaignId) blockers.push('campaign_id_missing');
  if (!campaign) blockers.push('campaign_missing_from_mailerlite_read');

  const payload = payloadFromCorrection({ correction, receipt: manualUiReceipt });
  const draft = campaign && campaignId
    ? evaluateCampaignDraft({ payload, campaignId, campaign })
    : null;

  if (draft) {
    if (expectedName && draft.observedName !== expectedName) blockers.push('campaign_name_mismatch');
    if (!draft.subject.matches) blockers.push('subject_mismatch');
    if (!draft.preheader.matches) blockers.push('preheader_mismatch');
    if (!draft.content.allRequiredFragmentsExact) blockers.push('content_mismatch');
    for (const failed of draft.safetyChecks.failedSafetyChecks) blockers.push(failed);
  }

  const uniqueBlockers = [...new Set(blockers)];
  const status = statusFor({ draft, blockers: uniqueBlockers });
  const green = status === 'brujula_email1_real_mailerlite_render_qa_green_no_live_changes';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_real_mailerlite_brujula_email1_render_qa',
    generatedAt,
    ok: green,
    status,
    campaign: {
      id: campaignId,
      expectedName,
      observedName: draft?.observedName ?? cleanString(campaign?.name) ?? null,
      status: draft?.status ?? campaign?.status ?? null,
      type: draft?.type ?? campaign?.type ?? null,
    },
    executiveSummary: {
      correctionPacketStatus: correction?.status ?? null,
      manualUiBuildReceiptStatus: manualUiReceipt?.status ?? null,
      realMailerLiteRenderReady: green,
      allRequiredContentExact: draft?.content?.allRequiredFragmentsExact ?? false,
      exactPresentCount: draft?.content?.exactPresentCount ?? 0,
      requiredFragmentCount: draft?.content?.requiredFragmentCount ?? payload.contentBlocks.length,
      allSafetyGatesClosed: draft?.safetyChecks?.allSafetyGatesClosed ?? false,
      contentMismatchCount: draft && (!draft.content.allRequiredFragmentsExact || !draft.subject.matches || !draft.preheader.matches) ? 1 : 0,
      safetyMismatchCount: draft && !draft.safetyChecks.allSafetyGatesClosed ? 1 : 0,
      blockerCount: uniqueBlockers.length,
      testSendReady: false,
      publicUseReady: false,
    },
    draft,
    blockers: uniqueBlockers,
    testSendBoundary: {
      readyForTestSendNow: false,
      canAskForTestSendApprovalNow: false,
      stillRequiresExactRecipient: true,
      stillRequiresExactTestSendApproval: true,
      stillClosed: [
        'test_send_or_public_send',
        'schedule',
        'workflow_activation_or_attachment',
        'subscriber_import_assignment_or_mutation',
        'group_creation_or_assignment',
        'shopify_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
    },
    sourceDigests,
    safety: {
      mailerLiteApiCalled: true,
      mailerLiteCampaignsRead: campaign ? 1 : 0,
      mailerLiteMutationsPerformed: false,
      mailerLiteAssetsCreatedOrEdited: false,
      sendsPerformed: false,
      schedulesCreated: false,
      subscriberMutationsPerformed: false,
      groupsCreatedOrAssigned: false,
      workflowMutationsPerformed: false,
      shopifyLiveApiCalled: false,
      crmLiveApiCalled: false,
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
      scoringMutationsPerformed: false,
      factStoreWritePerformed: false,
      tokensPrinted: false,
    },
  };
};

const buildQaFromFiles = async (options) => {
  const [correctionRaw, receiptRaw] = await Promise.all([
    readText(options.correction),
    readText(options.manualUiReceipt),
  ]);
  const correction = JSON.parse(correctionRaw);
  const manualUiReceipt = JSON.parse(receiptRaw);
  const campaignId = campaignIdFromReceipt(manualUiReceipt);
  if (!campaignId) throw new Error('campaign_id_missing_from_manual_ui_receipt');

  const token = await tokenFromKeychain(options);
  const json = await fetchJson({
    apiBase: options.apiBase,
    token,
    path: `/campaigns/${campaignId}`,
    timeoutMs: options.timeoutMs,
  });

  return buildBrujulaRealMailerLiteRenderQa({
    correction,
    manualUiReceipt,
    campaign: json.data ?? json,
    sourceDigests: [
      sourceDigest(options.correction, correctionRaw, 'expected Brújula subject, preheader, body copy, CTA and guide URL'),
      sourceDigest(options.manualUiReceipt, receiptRaw, 'real MailerLite campaign id and closed manual UI build receipt'),
    ],
  });
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (packet) => [
  '# Brújula Real MailerLite Render QA',
  '',
  `- Generated: ${packet.generatedAt}`,
  `- Status: ${packet.status}`,
  `- OK: ${packet.ok}`,
  `- Campaign ID: ${packet.campaign?.id ?? 'missing'}`,
  `- Exact content green: ${packet.executiveSummary.allRequiredContentExact}`,
  `- Safety gates closed: ${packet.executiveSummary.allSafetyGatesClosed}`,
  `- Test send ready: ${packet.executiveSummary.testSendReady}`,
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Draft Check',
  '',
  `- Observed name: ${packet.campaign?.observedName ?? 'missing'}`,
  `- Status: ${packet.campaign?.status ?? 'missing'}`,
  `- Subject matches: ${packet.draft?.subject?.matches ?? false}`,
  `- Preheader matches: ${packet.draft?.preheader?.matches ?? false}`,
  `- Required fragments exact: ${packet.executiveSummary.exactPresentCount}/${packet.executiveSummary.requiredFragmentCount}`,
  `- Missing fragments: ${packet.draft?.content?.missingRequiredFragments?.map((item) => item.id).join(', ') || 'none'}`,
  `- Failed safety checks: ${packet.draft?.safetyChecks?.failedSafetyChecks?.join(', ') || 'none'}`,
  '',
  '## Boundary',
  '',
  '- This QA does not authorize a test send.',
  '- Exact recipient and exact test-send approval are still required.',
  '- No subscribers, groups, workflows, Shopify, CRM, ledgers, cards, scoring or Fact Store actions were performed.',
  '',
  '## Safety',
  '',
  `- MailerLite API called: ${packet.safety.mailerLiteApiCalled}`,
  `- MailerLite campaigns read: ${packet.safety.mailerLiteCampaignsRead}`,
  `- MailerLite mutations performed: ${packet.safety.mailerLiteMutationsPerformed}`,
  `- Sends performed: ${packet.safety.sendsPerformed}`,
  `- Schedules created: ${packet.safety.schedulesCreated}`,
  `- Subscriber mutations performed: ${packet.safety.subscriberMutationsPerformed}`,
  `- Groups created or assigned: ${packet.safety.groupsCreatedOrAssigned}`,
  `- Workflow mutations performed: ${packet.safety.workflowMutationsPerformed}`,
  '- No tokens printed.',
  '',
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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const packet = await buildQaFromFiles(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    campaignId: packet.campaign?.id ?? null,
    allRequiredContentExact: packet.executiveSummary.allRequiredContentExact,
    allSafetyGatesClosed: packet.executiveSummary.allSafetyGatesClosed,
    blockers: packet.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula real render QA failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildBrujulaRealMailerLiteRenderQa,
  campaignIdFromReceipt,
  parseArgs,
  payloadFromCorrection,
  renderMarkdown,
  receiptClosed,
};
