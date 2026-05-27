#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { buildReport as buildTaxonomyReport, parseArgs as parseTaxonomyArgs } from './crm-vnext-mailerlite-receipt-taxonomy-plan.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-brujula-test-lane-plan-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const BRUJULA_AUTOMATION_ID = '187045644287870306';
const STYLE_CANON_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md';
const EMAIL_EVIDENCE_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/EMAIL_BRAND_EVIDENCE_REPORT_2026-05-11.md';
const BRUJULA_READINESS_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/BRUJULA_PRODUCTION_READINESS_2026-05-25.md';
const BRUJULA_RETRO_QA_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/BRUJULA_RETRO_QA_2026-05-25.md';
const BRAND_OPERATING_SNAPSHOT_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/OPERATING_SNAPSHOT_V0_2.md';
const LEAD_MAGNET_PATTERN_PATH = '/Users/alejandrogomez/Projects/hub-de-marca/05_brand_department_os/LEAD_MAGNET_OPERATING_PATTERN_V0_1.md';

const LIVE_GROUPS = [
  {
    name: 'CC · Source · Resource · Brújula',
    id: '188581887447401645',
    role: 'source receipt for the Brújula test lane',
  },
  {
    name: 'CC · Delivered · Guide · Brújula',
    id: '188581888003147002',
    role: 'delivery receipt for the Brújula guide',
  },
  {
    name: 'CC · Sent · Article · Sobre el amor',
    id: '188581888519046472',
    role: 'sent marker for the continuation article; not proof of reading',
  },
  {
    name: 'CC · Journey · Editorial onboarding · Eligible',
    id: '188581889031800192',
    role: 'future onboarding eligibility marker',
  },
  {
    name: 'CC · Audience · General newsletter · Eligible',
    id: '188581889544553921',
    role: 'future general newsletter audience marker',
  },
];

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-brujula-test-lane-plan.mjs [options]

Options:
  --test-email <email>     Optional target email for a future test-only pilot approval packet.
  --service <name>         Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>         Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>         MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>         Per-request timeout. Defaults to 30000
  --out <path>             Write JSON report
  --markdown-out <path>    Write Markdown report
  --help                   Show this help

Read-only Brújula test-lane planner. It does not send email, create/update
subscribers, assign groups, activate workflows, edit automations, or mutate MailerLite.`;

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

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const redactEmail = (email) => {
  const normalized = normalizeEmail(email);
  if (!normalized) return null;
  const [local, domain] = normalized.split('@');
  const shownLocal = local.length <= 2 ? `${local[0] ?? '*'}*` : `${local.slice(0, 2)}***`;
  const [domainName, ...rest] = domain.split('.');
  return `${shownLocal}@${domainName[0] ?? '*'}***.${rest.at(-1) ?? '***'}`;
};

const parseArgs = (argv) => {
  const options = {
    testEmail: null,
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
    else if (arg === '--test-email') options.testEmail = argv[++index];
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
  const normalizedEmail = normalizeEmail(options.testEmail);
  if (options.testEmail && !normalizedEmail) throw new Error('invalid_test_email');
  options.testEmail = normalizedEmail;
  return options;
};

const getKeychainSecret = async (service, account) => {
  try {
    const { stdout } = await execFileAsync('security', [
      'find-generic-password',
      '-w',
      '-s',
      service,
      '-a',
      account,
    ], {
      timeout: 10_000,
      maxBuffer: 1024 * 1024,
    });
    const key = stdout.trim();
    return key ? { key, source: `keychain:${service}/${account}` } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return keychain;
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key, source: `env:${name}` };
  }
  return { key: null, source: null };
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 404) return 'mailerlite_endpoint_not_found';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const urlWithParams = (base, path, params = {}) => {
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }
  return url;
};

const fetchJson = async (options, key, path, params = {}) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetch(urlWithParams(options.apiBase, path, params), {
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-vNext-MailerLite-Brujula-Test-Lane-Plan/1.0',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try {
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }
    if (!response.ok) {
      const reason = classifyFailure(response.status, text);
      const error = new Error(reason);
      error.status = response.status;
      error.reason = reason;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.reason) throw error;
    const reason = classifyFailure(0, error instanceof Error ? error.message : String(error));
    const wrapped = new Error(reason);
    wrapped.status = 0;
    wrapped.reason = reason;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
};

const extractItems = (payload) => {
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  for (const key of ['data', 'groups', 'automations', 'items', 'results']) {
    const value = payload?.[key];
    if (Array.isArray(value)) return value.filter((item) => item && typeof item === 'object');
  }
  return [];
};

const extractNextCursor = (payload) => {
  for (const container of [payload, payload?.meta]) {
    if (!container || typeof container !== 'object') continue;
    for (const key of ['next_cursor', 'nextCursor']) {
      if (typeof container[key] === 'string' && container[key]) return container[key];
    }
    const nextLink = container.links?.next;
    if (typeof nextLink === 'string' && nextLink) {
      try {
        const parsed = new URL(nextLink);
        for (const key of ['cursor', 'next_cursor', 'page[cursor]']) {
          const value = parsed.searchParams.get(key);
          if (value) return value;
        }
      } catch {
        // Treat malformed pagination as terminal.
      }
    }
  }
  return null;
};

const scanCollection = async (options, key, path) => {
  const items = [];
  let cursor = null;
  for (let page = 0; page < 25; page += 1) {
    const params = { limit: 100 };
    if (cursor) params.cursor = cursor;
    const payload = await fetchJson(options, key, path, params);
    items.push(...extractItems(payload));
    cursor = extractNextCursor(payload);
    if (!cursor) break;
  }
  return items;
};

const safeId = (item) => cleanString(item?.id) ?? cleanString(item?.form_id) ?? cleanString(item?.automation_id);
const safeName = (item) => cleanString(item?.name) ?? cleanString(item?.title) ?? cleanString(item?.label);

const readTextIfExists = async (path) => {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
};

const evidenceFlag = (text, pattern) => Boolean(text && pattern.test(text));

const buildLocalEvidence = async () => {
  const [styleCanon, emailEvidence, readiness, retroQa, operatingSnapshot, leadMagnetPattern] = await Promise.all([
    readTextIfExists(STYLE_CANON_PATH),
    readTextIfExists(EMAIL_EVIDENCE_PATH),
    readTextIfExists(BRUJULA_READINESS_PATH),
    readTextIfExists(BRUJULA_RETRO_QA_PATH),
    readTextIfExists(BRAND_OPERATING_SNAPSHOT_PATH),
    readTextIfExists(LEAD_MAGNET_PATTERN_PATH),
  ]);
  const brujulaStateText = `${readiness ?? ''}\n${retroQa ?? ''}\n${operatingSnapshot ?? ''}\n${leadMagnetPattern ?? ''}`;

  return {
    sources: [
      { path: STYLE_CANON_PATH, present: Boolean(styleCanon) },
      { path: EMAIL_EVIDENCE_PATH, present: Boolean(emailEvidence) },
      { path: BRUJULA_READINESS_PATH, present: Boolean(readiness) },
      { path: BRUJULA_RETRO_QA_PATH, present: Boolean(retroQa) },
      { path: BRAND_OPERATING_SNAPSHOT_PATH, present: Boolean(operatingSnapshot) },
      { path: LEAD_MAGNET_PATTERN_PATH, present: Boolean(leadMagnetPattern) },
    ],
    emailStyle: {
      hasCanonicalStyle: Boolean(styleCanon) || Boolean(emailEvidence),
      bodyFont: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /Poppins/i) ? 'Poppins' : null,
      headingAccent: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /Georgia/i) ? 'Georgia' : null,
      background: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /#F4F7FA/i) ? '#F4F7FA' : null,
      bodyTextColor: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /#474747/i) ? '#474747' : null,
      signatureRequired: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /firma visual|imagen de firma/i),
      brujulaCurrentAntiEvidence: evidenceFlag(`${styleCanon ?? ''}\n${emailEvidence ?? ''}`, /Brújula actual.*anti-evidencia|renderiza Inter|usa Inter/is),
    },
    brujulaState: {
      prototypeNotLaunch: evidenceFlag(brujulaStateText, /prototipo|no.*canon final|no.*produccion|no.*producción/i),
      currentWorkflowOffOrIncomplete: evidenceFlag(brujulaStateText, /workflow\.complete=false|form\.active=false|desactivad|apagado/i),
      doNotTouchActiveOnboarding: evidenceFlag(brujulaStateText, /No tocar onboarding principal|modificar onboarding principal|onboarding activo|active onboarding/i),
    },
  };
};

const buildLiveSnapshot = async (options) => {
  const credential = await getCredential(options);
  if (!credential.key) {
    return {
      ok: false,
      status: 'blocked_missing_mailerlite_credential',
      keychain: {
        service: options.service,
        account: options.account,
        credentialPresent: false,
        credentialSource: null,
      },
      groups: [],
      automation: null,
      subscriberProbe: null,
    };
  }

  const groups = await scanCollection(options, credential.key, '/groups');
  let automation = null;
  try {
    const payload = await fetchJson(options, credential.key, `/automations/${BRUJULA_AUTOMATION_ID}`);
    const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    automation = {
      found: true,
      id: safeId(data) ?? BRUJULA_AUTOMATION_ID,
      name: safeName(data),
      enabled: data?.enabled ?? data?.active ?? data?.status ?? null,
      complete: data?.complete ?? null,
      broken: data?.broken ?? null,
      stepsCount: Array.isArray(data?.steps) ? data.steps.length : null,
      emails: extractAutomationEmailSteps(data),
    };
  } catch (error) {
    automation = {
      found: false,
      id: BRUJULA_AUTOMATION_ID,
      reason: error?.reason || error?.message || 'automation_read_failed',
    };
  }

  let subscriberProbe = null;
  if (options.testEmail) {
    try {
      const payload = await fetchJson(options, credential.key, `/subscribers/${encodeURIComponent(options.testEmail)}`);
      const data = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
      subscriberProbe = {
        lookedUp: true,
        found: true,
        id: safeId(data),
        email: redactEmail(data?.email ?? options.testEmail),
        status: cleanString(data?.status),
        groups: Array.isArray(data?.groups)
          ? data.groups.map((group) => ({ id: safeId(group), name: safeName(group) })).filter((group) => group.id || group.name)
          : [],
      };
    } catch (error) {
      subscriberProbe = {
        lookedUp: true,
        found: false,
        email: redactEmail(options.testEmail),
        reason: error?.reason || error?.message || 'subscriber_lookup_failed',
      };
    }
  }

  return {
    ok: true,
    status: 'ok',
    keychain: {
      service: options.service,
      account: options.account,
      credentialPresent: true,
      credentialSource: credential.source,
    },
    groups,
    automation,
    subscriberProbe,
  };
};

const extractAutomationEmailSteps = (automation) => {
  const steps = Array.isArray(automation?.steps)
    ? automation.steps
    : Array.isArray(automation?.workflow?.steps)
      ? automation.workflow.steps
      : [];
  return steps
    .filter((step) => /email/i.test(cleanString(step?.type) ?? cleanString(step?.action) ?? cleanString(step?.description) ?? ''))
    .map((step) => ({
      id: safeId(step),
      name: safeName(step) ?? cleanString(step?.description),
      subject: cleanString(step?.subject) ?? cleanString(step?.email?.subject),
      complete: step?.complete ?? step?.email?.complete ?? null,
      broken: step?.broken ?? step?.email?.broken ?? null,
    }));
};

const groupReadiness = (groups) => {
  const liveByName = new Map();
  const liveById = new Map();
  for (const group of groups) {
    const id = safeId(group);
    const name = safeName(group);
    if (normalizeName(name)) liveByName.set(normalizeName(name), group);
    if (id) liveById.set(id, group);
  }
  return LIVE_GROUPS.map((expected) => {
    const byId = liveById.get(expected.id);
    const byName = liveByName.get(normalizeName(expected.name));
    const live = byId ?? byName ?? null;
    return {
      ...expected,
      exists: Boolean(live),
      liveName: live ? safeName(live) : null,
      activeCount: live?.active_count ?? live?.subscribers_count ?? live?.total ?? null,
    };
  });
};

const buildPilotStages = ({ testEmail }) => [
  {
    stage: 'visual_email_test',
    status: 'ready_after_email_style_review',
    surface: 'MailerLite UI test email',
    target: testEmail ? redactEmail(testEmail) : 'needs_test_email',
    allowedAfterApproval: [
      'Send MailerLite UI test email for Email 1 to the approved test address only.',
      'Optionally send MailerLite UI test email for Email 2/Sobre el amor to the same approved test address only.',
    ],
    notAllowed: [
      'No audience send.',
      'No workflow activation.',
      'No active onboarding change.',
      'No subscriber/group mutation from this visual test.',
    ],
  },
  {
    stage: 'single_subscriber_receipt_rehearsal',
    status: testEmail ? 'ready_for_explicit_approval_packet' : 'blocked_until_test_email',
    surface: 'MailerLite API subscriber/group receipts',
    target: testEmail ? redactEmail(testEmail) : 'needs_test_email',
    allowedAfterApproval: [
      'Find or create/update only the approved test subscriber.',
      'Assign only Brújula source/delivered receipts to that test subscriber unless Email 2 is actually tested.',
      'Assign Sent Article Sobre el amor only if the approved test includes the Sobre el amor email.',
    ],
    notAllowed: [
      'No subscriber other than the approved test address.',
      'No bulk import.',
      'No workflow trigger group.',
      'No active workflow attachment.',
      'No sends from this receipt rehearsal.',
    ],
  },
  {
    stage: 'crm_signal_readiness',
    status: 'local_design_only',
    surface: 'CRM event/read model',
    target: 'no_live_crm_write',
    allowedAfterApproval: [
      'Define how CRM will read these receipts as source/content/journey/audience facts.',
      'Prepare a later read-only evidence adapter for the test subscriber.',
    ],
    notAllowed: [
      'No person-card mutation.',
      'No scoring update.',
      'No production audience routing.',
    ],
  },
];

const exactApprovalPhraseFor = (testEmail) => {
  const target = normalizeEmail(testEmail);
  if (!target) return null;
  return `Apruebo el piloto test-only de Brújula únicamente para ${target}: puedes enviar test emails de MailerLite a ese correo y, si hace falta, crear/actualizar solo ese subscriber de prueba y asignarlo únicamente a los grupos CC · Source · Resource · Brújula y CC · Delivered · Guide · Brújula; puedes asignar CC · Sent · Article · Sobre el amor solo si también se envía/testea ese email. No activar workflows, no tocar onboarding activo, no enviar a audiencia real, no modificar otros subscribers y no publicar nada.`;
};

const buildPlan = async (options) => {
  const [taxonomy, localEvidence, liveSnapshot] = await Promise.all([
    buildTaxonomyReport(parseTaxonomyArgs([
      '--service',
      options.service,
      '--account',
      options.account,
      '--api-base',
      options.apiBase,
      '--timeout-ms',
      String(options.timeoutMs),
    ])),
    buildLocalEvidence(),
    buildLiveSnapshot(options),
  ]);

  const groups = liveSnapshot.ok ? groupReadiness(liveSnapshot.groups) : [];
  const blockers = [
    ...(taxonomy.brandCanon?.alignmentOk ? [] : ['brand_canon_drift']),
    ...(groups.every((group) => group.exists) ? [] : ['missing_required_live_canonical_groups']),
    ...(liveSnapshot.automation?.found ? [] : ['brujula_automation_not_found']),
    ...((liveSnapshot.automation?.enabled === false || liveSnapshot.automation?.enabled === 'false' || liveSnapshot.automation?.enabled === 0)
      ? []
      : ['brujula_automation_not_confirmed_disabled']),
    ...(localEvidence.emailStyle.hasCanonicalStyle ? [] : ['email_style_canon_missing']),
    ...(localEvidence.brujulaState.doNotTouchActiveOnboarding ? [] : ['active_onboarding_guard_not_confirmed']),
  ];

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_brujula_test_lane_plan',
    generatedAt: new Date().toISOString(),
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked_or_needs_review' : 'ready_for_test_only_approval',
    target: {
      testEmailProvided: Boolean(options.testEmail),
      testEmail: redactEmail(options.testEmail),
    },
    taxonomy: {
      status: taxonomy.status,
      brandCanonAlignmentOk: taxonomy.brandCanon?.alignmentOk,
      existingCanonicalGroups: taxonomy.summary?.alreadyExist,
      approvalGate: taxonomy.approvalGate,
    },
    localEvidence,
    mailerLite: {
      credentialPresent: liveSnapshot.keychain?.credentialPresent,
      credentialSource: liveSnapshot.keychain?.credentialSource,
      groupsRead: liveSnapshot.groups?.length ?? 0,
      requiredGroups: groups,
      brujulaAutomation: liveSnapshot.automation,
      subscriberProbe: liveSnapshot.subscriberProbe,
    },
    stages: buildPilotStages({ testEmail: options.testEmail }),
    blockers,
    exactApprovalPhrase: exactApprovalPhraseFor(options.testEmail),
    nextAction: options.testEmail
      ? 'Ask Alejandro to approve the exact test-only phrase before any send/subscriber/group mutation.'
      : 'Ask Alejandro for the exact test email address, then rerun this planner with --test-email before any live action.',
    safety: {
      readOnly: true,
      mailerLiteMutationsPerformed: false,
      subscribersMutated: false,
      subscriberRowsPrinted: false,
      groupAssignmentsPerformed: false,
      workflowMutationsPerformed: false,
      automationMutationsPerformed: false,
      sendsPerformed: false,
      tokensPrinted: false,
      outboundPerformed: false,
    },
  };
};

const renderMarkdown = (plan) => [
  '# MailerLite vNext - Brújula Test Lane Plan',
  '',
  `Generated: ${plan.generatedAt}`,
  `Status: ${plan.status}`,
  `Mode: ${plan.mode}`,
  '',
  '## Executive Summary',
  '',
  plan.ok
    ? 'The controlled Brújula test lane is ready for a test-only approval packet.'
    : 'The Brújula test lane needs the listed blockers resolved before live action.',
  '',
  'This is not a campaign launch. It is a controlled rehearsal using only Alejandro/test context.',
  '',
  '## Target',
  '',
  `- Test email provided: ${plan.target.testEmailProvided}`,
  `- Test email: ${plan.target.testEmail ?? 'not_provided'}`,
  '',
  '## Canon And Assets',
  '',
  `- Brand canon alignment: ${plan.taxonomy.brandCanonAlignmentOk}`,
  `- Existing canonical groups: ${plan.taxonomy.existingCanonicalGroups}`,
  `- Email style evidence present: ${plan.localEvidence.emailStyle.hasCanonicalStyle}`,
  `- Email style: body=${plan.localEvidence.emailStyle.bodyFont ?? 'unknown'}, heading=${plan.localEvidence.emailStyle.headingAccent ?? 'unknown'}, background=${plan.localEvidence.emailStyle.background ?? 'unknown'}, text=${plan.localEvidence.emailStyle.bodyTextColor ?? 'unknown'}`,
  `- Signature required by evidence: ${plan.localEvidence.emailStyle.signatureRequired}`,
  `- Brújula current visual anti-evidence: ${plan.localEvidence.emailStyle.brujulaCurrentAntiEvidence}`,
  `- Brújula treated as prototype/test lane: ${plan.localEvidence.brujulaState.prototypeNotLaunch}`,
  '',
  '## MailerLite Live Snapshot',
  '',
  `- Groups read: ${plan.mailerLite.groupsRead}`,
  `- Brújula automation found: ${plan.mailerLite.brujulaAutomation?.found}`,
  `- Brújula automation enabled: ${plan.mailerLite.brujulaAutomation?.enabled ?? 'unknown'}`,
  `- Brújula automation complete: ${plan.mailerLite.brujulaAutomation?.complete ?? 'unknown'}`,
  `- Brújula automation steps count: ${plan.mailerLite.brujulaAutomation?.stepsCount ?? 'unknown'}`,
  '',
  '## Required Groups',
  '',
  ...plan.mailerLite.requiredGroups.map((group) =>
    `- ${group.name}: exists=${group.exists}, id=${group.id}, activeCount=${group.activeCount ?? 'unknown'}, role=${group.role}`,
  ),
  '',
  '## Pilot Stages',
  '',
  ...plan.stages.flatMap((stage) => [
    `### ${stage.stage}`,
    '',
    `- Status: ${stage.status}`,
    `- Surface: ${stage.surface}`,
    `- Target: ${stage.target}`,
    `- Allowed after approval: ${stage.allowedAfterApproval.join('; ')}`,
    `- Not allowed: ${stage.notAllowed.join('; ')}`,
    '',
  ]),
  '## Blockers',
  '',
  plan.blockers.length ? plan.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None.',
  '',
  '## Exact Approval Phrase',
  '',
  plan.exactApprovalPhrase ? `\`${plan.exactApprovalPhrase}\`` : '- Rerun with `--test-email <email>` to generate the exact approval phrase.',
  '',
  '## Safety',
  '',
  '- Read-only plan only.',
  '- No subscribers created, updated, assigned, read in bulk, or printed.',
  '- No groups assigned.',
  '- No workflows or automations edited or activated.',
  '- No emails sent.',
  '- No tokens printed.',
  '',
  `Next action: ${plan.nextAction}`,
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

  const plan = await buildPlan(options);
  if (options.out) await writeJson(options.out, plan);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(plan));

  console.log(JSON.stringify({
    ok: plan.ok,
    status: plan.status,
    generatedAt: plan.generatedAt,
    target: plan.target,
    groupsRead: plan.mailerLite.groupsRead,
    requiredGroupsExist: plan.mailerLite.requiredGroups.every((group) => group.exists),
    brujulaAutomation: {
      found: plan.mailerLite.brujulaAutomation?.found,
      enabled: plan.mailerLite.brujulaAutomation?.enabled,
      complete: plan.mailerLite.brujulaAutomation?.complete,
    },
    blockers: plan.blockers,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: plan.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite Brújula test lane plan failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPlan,
  buildPilotStages,
  exactApprovalPhraseFor,
  groupReadiness,
  normalizeEmail,
  redactEmail,
};
