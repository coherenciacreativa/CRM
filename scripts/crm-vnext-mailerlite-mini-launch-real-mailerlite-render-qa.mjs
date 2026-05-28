#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-mini-launch-real-mailerlite-render-qa-2026-05-28';
const DEFAULT_PAYLOAD_MANIFEST = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_builder_payload_manifest_inteligencia_descansar_2026-05-28.json';
const DEFAULT_EMAIL_ASSET_BUILD_DRY_RUN = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_asset_build_dry_run_after_manual_ui_inteligencia_descansar_2026-05-28.json';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-mini-launch-real-mailerlite-render-qa.mjs [options]

Options:
  --payload-manifest <path>         Email builder payload manifest JSON. Defaults to ${DEFAULT_PAYLOAD_MANIFEST}
  --email-asset-build-dry-run <path> Fresh MailerLite draft scan with campaign IDs. Defaults to ${DEFAULT_EMAIL_ASSET_BUILD_DRY_RUN}
  --service <name>                  Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>                  Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>                  MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>                  Per-request timeout. Defaults to 30000
  --out <path>                      Write JSON QA report
  --markdown-out <path>             Write Markdown QA report
  --help                            Show this help

Read-only QA for the four real MailerLite UI draft campaigns of Inteligencia
para descansar. It fetches campaign draft metadata/content by ID, checks exact
copy, inert placeholders, draft/no-recipient/no-schedule/no-workflow gates, and
then stops. It never sends, schedules, creates groups, reads or mutates
subscribers, attaches workflows, publishes Shopify, calls CRM live APIs, appends
ledgers, writes cards/scoring, touches Fact Store, or prints tokens.`;

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const parseArgs = (argv) => {
  const options = {
    payloadManifest: DEFAULT_PAYLOAD_MANIFEST,
    emailAssetBuildDryRun: DEFAULT_EMAIL_ASSET_BUILD_DRY_RUN,
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
    else if (arg === '--payload-manifest') options.payloadManifest = argv[++index];
    else if (arg === '--email-asset-build-dry-run') options.emailAssetBuildDryRun = argv[++index];
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

const decodeHtmlEntities = (value) => String(value ?? '')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)));

const stripHtmlToText = (html) => cleanString(decodeHtmlEntities(String(html ?? '')
  .replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<script[\s\S]*?<\/script>/gi, ' ')
  .replace(/<[^>]+>/g, ' '))) ?? '';

const normalizeForScan = (value) => String(value ?? '')
  .normalize('NFD')
  .replace(/\p{Diacritic}/gu, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const expectedFragmentsForPayload = (payload) => {
  const fragments = [];
  for (const block of payload?.contentBlocks ?? []) {
    const type = cleanString(block?.type);
    if (!type || ['preheader', 'signature', 'compliance_footer'].includes(type)) continue;
    const text = cleanString(block?.text);
    if (text) {
      fragments.push({
        id: cleanString(block?.id) ?? `${type}_text`,
        type,
        expected: text,
      });
    }
    if (type === 'cta') {
      const placeholder = cleanString(block?.placeholder?.value) ?? cleanString(block?.destination);
      if (placeholder) {
        fragments.push({
          id: `${cleanString(block?.id) ?? 'cta'}_placeholder`,
          type: 'inert_placeholder',
          expected: placeholder,
        });
      }
    }
  }
  return uniqueBy(fragments, (item) => `${item.id}:${item.expected}`);
};

const campaignIdsFromDryRun = (dryRun) => {
  const byStep = new Map();
  for (const item of dryRun?.targetPlan ?? []) {
    const step = Number(item?.step);
    const id = cleanString(item?.draftCampaignId)
      ?? cleanString(item?.campaignId)
      ?? cleanString(item?.matchingCampaignIds?.[0]);
    if (Number.isFinite(step) && id) byStep.set(step, id);
  }
  return byStep;
};

const emailForCampaign = (campaign) => Array.isArray(campaign?.emails) ? campaign.emails[0] ?? {} : {};

const includesExact = ({ html, text, expected }) => html.includes(expected) || text.includes(expected);
const includesNormalized = ({ html, text, expected }) => {
  const normalizedExpected = normalizeForScan(expected);
  return normalizeForScan(text).includes(normalizedExpected) || normalizeForScan(html).includes(normalizedExpected);
};

const safetyChecksForCampaign = (campaign) => {
  const missingData = Array.isArray(campaign?.missing_data) ? campaign.missing_data : [];
  const warnings = Array.isArray(campaign?.warnings) ? campaign.warnings : [];
  const checks = [
    { id: 'campaign_is_draft', ok: campaign?.status === 'draft', observed: campaign?.status ?? null },
    { id: 'campaign_type_regular', ok: campaign?.type === 'regular', observed: campaign?.type ?? null },
    { id: 'not_scheduled', ok: campaign?.scheduled_for == null, observed: campaign?.scheduled_for ?? null },
    { id: 'not_queued', ok: campaign?.queued_at == null, observed: campaign?.queued_at ?? null },
    { id: 'not_started', ok: campaign?.started_at == null, observed: campaign?.started_at ?? null },
    { id: 'not_finished', ok: campaign?.finished_at == null, observed: campaign?.finished_at ?? null },
    { id: 'not_currently_sending', ok: campaign?.is_currently_sending_out === false, observed: campaign?.is_currently_sending_out ?? null },
    { id: 'not_used_in_automations', ok: campaign?.used_in_automations === false, observed: campaign?.used_in_automations ?? null },
    { id: 'no_recipient_filter', ok: campaign?.filter == null, observed: campaign?.filter ?? null },
    { id: 'no_basic_filter', ok: campaign?.has_basic_filter === false, observed: campaign?.has_basic_filter ?? null },
    { id: 'recipients_missing', ok: missingData.includes('recipients'), observed: missingData },
    { id: 'no_warnings', ok: warnings.length === 0, observed: warnings },
    { id: 'cannot_schedule_without_recipients', ok: campaign?.can_be_scheduled === false, observed: campaign?.can_be_scheduled ?? null },
  ];
  return {
    checks,
    allSafetyGatesClosed: checks.every((check) => check.ok),
    failedSafetyChecks: checks.filter((check) => !check.ok).map((check) => check.id),
  };
};

const evaluateCampaignDraft = ({ payload, campaignId, campaign }) => {
  const email = emailForCampaign(campaign);
  const html = String(email?.content ?? '');
  const text = stripHtmlToText(html);
  const fragments = expectedFragmentsForPayload(payload);
  const fragmentChecks = fragments.map((fragment) => ({
    id: fragment.id,
    type: fragment.type,
    expected: fragment.expected,
    exactPresent: includesExact({ html, text, expected: fragment.expected }),
    normalizedPresent: includesNormalized({ html, text, expected: fragment.expected }),
  }));
  const subjectMatches = cleanString(email?.subject) === cleanString(payload?.subject);
  const preheaderMatches = cleanString(email?.preheader) === cleanString(payload?.preheader);
  const safetyChecks = safetyChecksForCampaign(campaign);
  const missingRequiredFragments = fragmentChecks
    .filter((check) => !check.exactPresent)
    .map((check) => ({
      id: check.id,
      type: check.type,
      expected: check.expected,
      normalizedPresent: check.normalizedPresent,
    }));

  return {
    step: payload.step,
    role: payload.role ?? null,
    campaignId,
    expectedName: payload.name ?? payload.mailerLiteAssetNameDraft ?? null,
    observedName: cleanString(campaign?.name) ?? cleanString(campaign?.title) ?? null,
    status: campaign?.status ?? null,
    type: campaign?.type ?? null,
    subject: {
      expected: cleanString(payload?.subject),
      observed: cleanString(email?.subject),
      matches: subjectMatches,
    },
    preheader: {
      expected: cleanString(payload?.preheader),
      observed: cleanString(email?.preheader),
      matches: preheaderMatches,
    },
    content: {
      htmlLength: html.length,
      textLength: text.length,
      textSample: text.slice(0, 420),
      requiredFragmentCount: fragmentChecks.length,
      exactPresentCount: fragmentChecks.filter((check) => check.exactPresent).length,
      normalizedPresentCount: fragmentChecks.filter((check) => check.normalizedPresent).length,
      allRequiredFragmentsExact: fragmentChecks.every((check) => check.exactPresent),
      missingRequiredFragments,
    },
    safetyChecks,
    readyForSeedSend: false,
  };
};

const statusFor = ({ expectedDraftCount, drafts, blockers }) => {
  if (drafts.length !== expectedDraftCount) return 'mini_launch_real_mailerlite_render_qa_blocked_missing_drafts_no_live_changes';
  if (drafts.some((draft) => !draft.safetyChecks.allSafetyGatesClosed)) return 'mini_launch_real_mailerlite_render_qa_blocked_safety_gate_mismatch_no_live_changes';
  if (drafts.some((draft) => !draft.subject.matches || !draft.preheader.matches || !draft.content.allRequiredFragmentsExact)) {
    return 'mini_launch_real_mailerlite_render_qa_blocked_content_mismatch_no_live_changes';
  }
  return blockers.length === 0
    ? 'mini_launch_real_mailerlite_render_qa_green_no_live_changes'
    : 'mini_launch_real_mailerlite_render_qa_blocked_no_live_changes';
};

const buildRealMailerLiteRenderQa = ({
  payloadManifest,
  emailAssetBuildDryRun,
  campaignsById,
  sourceDigests = [],
  generatedAt = new Date().toISOString(),
}) => {
  const payloads = (payloadManifest?.payloads ?? [])
    .filter((payload) => cleanString(payload?.mailerLiteAssetNameDraft))
    .map((payload) => ({
      ...payload,
      name: cleanString(payload.mailerLiteAssetNameDraft),
    }));
  const campaignIdsByStep = campaignIdsFromDryRun(emailAssetBuildDryRun);
  const drafts = [];
  const blockers = [];

  if (payloadManifest?.status !== 'email_builder_payload_manifest_ready_no_live_changes') {
    blockers.push(`payload_manifest_status_not_ready:${payloadManifest?.status ?? 'missing'}`);
  }
  if (!['dry_run_ready_for_exact_asset_build_approval', 'dry_run_no_create_needed_targets_already_exist'].includes(emailAssetBuildDryRun?.status)) {
    blockers.push(`email_asset_build_dry_run_status_unexpected:${emailAssetBuildDryRun?.status ?? 'missing'}`);
  }

  for (const payload of payloads) {
    const campaignId = campaignIdsByStep.get(Number(payload.step));
    const campaign = campaignId ? campaignsById.get(campaignId) : null;
    if (!campaignId || !campaign) {
      blockers.push(`draft_campaign_missing_for_step_${payload.step}`);
      continue;
    }
    const draft = evaluateCampaignDraft({ payload, campaignId, campaign });
    drafts.push(draft);
    if (!draft.subject.matches) blockers.push(`subject_mismatch_step_${payload.step}`);
    if (!draft.preheader.matches) blockers.push(`preheader_mismatch_step_${payload.step}`);
    if (!draft.content.allRequiredFragmentsExact) blockers.push(`content_mismatch_step_${payload.step}`);
    for (const failed of draft.safetyChecks.failedSafetyChecks) blockers.push(`${failed}_step_${payload.step}`);
  }

  const expectedDraftCount = payloads.length;
  const status = statusFor({ expectedDraftCount, drafts, blockers });
  const allSafetyGatesClosed = drafts.length === expectedDraftCount
    && drafts.every((draft) => draft.safetyChecks.allSafetyGatesClosed);
  const allRequiredContentExact = drafts.length === expectedDraftCount
    && drafts.every((draft) => draft.content.allRequiredFragmentsExact && draft.subject.matches && draft.preheader.matches);

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_real_mailerlite_draft_render_qa',
    generatedAt,
    ok: status === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes',
    status,
    launch: payloadManifest?.launch ?? null,
    executiveSummary: {
      expectedDraftCount,
      draftCount: drafts.length,
      allDraftsPreviewed: drafts.length === expectedDraftCount,
      allRequiredContentExact,
      allSafetyGatesClosed,
      contentMismatchCount: drafts.filter((draft) => !draft.content.allRequiredFragmentsExact || !draft.subject.matches || !draft.preheader.matches).length,
      safetyMismatchCount: drafts.filter((draft) => !draft.safetyChecks.allSafetyGatesClosed).length,
      seedSendReady: false,
      blockerCount: blockers.length,
    },
    drafts,
    blockers: uniqueBy(blockers.map((blocker) => ({ blocker })), (item) => item.blocker).map((item) => item.blocker),
    seedSendBoundary: {
      readyForSeedSendNow: false,
      canAskForSeedSendApprovalNow: status === 'mini_launch_real_mailerlite_render_qa_green_no_live_changes' ? false : false,
      stillRequiresExactSeedRecipient: true,
      stillRequiresExactSeedSendApproval: true,
      stillClosed: [
        'seed_send_or_test_send',
        'public_or_audience_send',
        'schedule',
        'workflow_or_automation_attachment',
        'subscriber_import_or_non_seed_assignment',
        'group_creation_or_assignment',
        'shopify_preview_publish_or_form_connection',
        'crm_signal_ledger_append',
        'crm_card_write',
        'crm_scoring',
        'fact_store_write',
      ],
    },
    sourceDigests,
    safety: {
      mailerLiteApiCalled: true,
      mailerLiteCampaignsRead: campaignsById.size,
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

const buildQaFromFiles = async (options) => {
  const [payloadManifestRaw, emailAssetBuildDryRunRaw] = await Promise.all([
    readText(options.payloadManifest),
    readText(options.emailAssetBuildDryRun),
  ]);
  const payloadManifest = JSON.parse(payloadManifestRaw);
  const emailAssetBuildDryRun = JSON.parse(emailAssetBuildDryRunRaw);
  const token = await tokenFromKeychain(options);
  const campaignIds = [...campaignIdsFromDryRun(emailAssetBuildDryRun).values()];
  const campaignsById = new Map();

  for (const campaignId of campaignIds) {
    const json = await fetchJson({
      apiBase: options.apiBase,
      token,
      path: `/campaigns/${campaignId}`,
      timeoutMs: options.timeoutMs,
    });
    campaignsById.set(campaignId, json.data ?? json);
  }

  return buildRealMailerLiteRenderQa({
    payloadManifest,
    emailAssetBuildDryRun,
    campaignsById,
    sourceDigests: [
      sourceDigest(options.payloadManifest, payloadManifestRaw, 'expected subjects, preheaders, body copy and inert placeholders'),
      sourceDigest(options.emailAssetBuildDryRun, emailAssetBuildDryRunRaw, 'fresh MailerLite campaign IDs and draft-state target plan'),
    ],
  });
};

const renderList = (items) => (items?.length ? items.map((item) => `- ${item}`).join('\n') : '- none');

const renderMarkdown = (packet) => [
  '# Mini-Launch Real MailerLite Render QA',
  '',
  `- Generated: ${packet.generatedAt}`,
  `- Status: ${packet.status}`,
  `- OK: ${packet.ok}`,
  `- Launch: ${packet.launch?.launchId ?? 'unknown'}`,
  `- Drafts inspected: ${packet.executiveSummary.draftCount}/${packet.executiveSummary.expectedDraftCount}`,
  `- Exact content green: ${packet.executiveSummary.allRequiredContentExact}`,
  `- Safety gates closed: ${packet.executiveSummary.allSafetyGatesClosed}`,
  `- Seed send ready: ${packet.executiveSummary.seedSendReady}`,
  '',
  '## Blockers',
  '',
  renderList(packet.blockers),
  '',
  '## Draft Checks',
  '',
  ...packet.drafts.flatMap((draft) => [
    `### E${String(draft.step).padStart(2, '0')} ${draft.role ?? ''}`.trim(),
    '',
    `- Campaign ID: ${draft.campaignId}`,
    `- Status: ${draft.status}`,
    `- Subject matches: ${draft.subject.matches}`,
    `- Preheader matches: ${draft.preheader.matches}`,
    `- Required fragments exact: ${draft.content.exactPresentCount}/${draft.content.requiredFragmentCount}`,
    `- Missing fragments: ${draft.content.missingRequiredFragments.map((item) => item.id).join(', ') || 'none'}`,
    `- Safety gates closed: ${draft.safetyChecks.allSafetyGatesClosed}`,
    `- Failed safety checks: ${draft.safetyChecks.failedSafetyChecks.join(', ') || 'none'}`,
    '',
  ]),
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
  '- Shopify, CRM live APIs, Signal Ledger, cards, scoring and Fact Store remained closed.',
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
    draftCount: packet.executiveSummary.draftCount,
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
    console.error(`crm-vnext MailerLite mini-launch real render QA failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildRealMailerLiteRenderQa,
  campaignIdsFromDryRun,
  evaluateCampaignDraft,
  expectedFragmentsForPayload,
  parseArgs,
  renderMarkdown,
  safetyChecksForCampaign,
  stripHtmlToText,
};
