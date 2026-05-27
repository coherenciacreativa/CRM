#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v1-audit-2026-05-27';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const ALLOWED_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_ONBOARDING_WORKFLOW_ID = '154049547088167956';
const DEFAULT_ONBOARDING_WORKFLOW_NAME = 'Onboarding flow';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v1-audit.mjs [options]

Options:
  --workflow-id <id>       MailerLite onboarding automation id. Defaults to ${DEFAULT_ONBOARDING_WORKFLOW_ID}
  --workflow-name <name>   Fallback workflow name. Defaults to "${DEFAULT_ONBOARDING_WORKFLOW_NAME}"
  --service <name>         Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>         Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>         MailerLite API base. Only ${ALLOWED_API_BASE} is supported.
  --timeout-ms <n>         Per-request timeout. Defaults to 30000
  --out <path>             Write JSON report
  --markdown-out <path>    Write Markdown report
  --fail-on-blocked        Exit with code 2 if required reads fail
  --help                   Show this help

Read-only audit for active MailerLite onboarding v1. It reads groups, automations,
forms/fields/segments where available, and the target automation metadata. It does
not edit workflows, pause/activate automations, read subscriber rows, assign groups,
create/delete groups, send emails, mutate CRM cards, or print tokens.`;

const HISTORICAL_GROUP_RULES = [
  {
    name: 'leads_instagram.csv',
    role: 'trigger_source',
    currentMeaning: 'Trigger historico del onboarding principal, originado en importacion/captura Instagram.',
    vNextMapping: 'CC · Source · IG onboarding',
    recommendedPosture: 'do_not_touch_map_later',
    risk: 'Nombre tecnico historico; no usar como lenguaje semantico nuevo.',
  },
  {
    name: 'will get first email',
    role: 'entry_eligibility',
    currentMeaning: 'Gate historico de elegibilidad para recibir el primer email.',
    vNextMapping: 'CC · Journey · Editorial onboarding · Eligible',
    recommendedPosture: 'do_not_touch_map_later',
    risk: 'Puede contener personas en cola; no limpiar sin snapshot de flujo.',
  },
  {
    name: 'Se le envió el primer boletín',
    role: 'legacy_first_send_marker',
    currentMeaning: 'Marcador historico posterior al primer email.',
    vNextMapping: 'crm_backfill_review_only',
    recommendedPosture: 'crm_backfill_only_until_content_mapping_is_explicit',
    risk: 'No es un recibo canonico de contenido reutilizable.',
  },
  {
    name: 'Received second email',
    role: 'legacy_in_progress_bucket',
    currentMeaning: 'Marcador historico posterior al segundo email y bucket de progreso para la cola restante.',
    vNextMapping: 'CC · Sent · Article · Relaciones que aumentan nuestra energia / CRM journey in_progress review',
    recommendedPosture: 'do_not_use_as_content_receipt',
    risk: 'No significa apertura/lectura y tampoco prueba por si solo que Sobre el amor fue enviado.',
  },
  {
    name: 'Onboarding complete',
    role: 'legacy_completion_and_campaign_audience',
    currentMeaning: 'Final historico del onboarding y audiencia practica para campañas frescas.',
    vNextMapping: 'CC · Journey · Editorial onboarding · Complete + CC · Audience · General newsletter · Eligible',
    recommendedPosture: 'keep_live_until_migration',
    risk: 'Mezcla completion de recorrido con elegibilidad de audiencia.',
  },
];

const CONTENT_ID_BY_SUBJECT = [
  [/relaciones que aumentan nuestra energ/i, 'article_relaciones_aumentan_energia'],
  [/sobre el amor/i, 'article_sobre_el_amor'],
  [/navegar los bajonazos/i, 'article_navegar_bajonazos'],
  [/volver a flu/i, 'article_volver_a_fluir'],
  [/algo para perder el miedo/i, 'article_algo_para_perder_miedo'],
  [/encontrar compa/i, 'article_encontrar_companeros_camino'],
  [/la clave que facilita el trabajo/i, 'article_clave_facilita_trabajo'],
  [/esto mejor/i, 'article_esto_mejoro_mi_relacion'],
  [/qu[eé] hacer cuando no quiero hacer/i, 'article_que_hacer_cuando_no_quiero_hacer'],
  [/esto me sirve para el malestar/i, 'article_esto_me_sirve_malestar'],
];

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

const safeNumber = (value) => (Number.isFinite(Number(value)) ? Number(value) : null);

const validateMailerLiteApiBase = (value) => {
  const normalized = cleanString(value)?.replace(/\/+$/, '');
  if (!normalized) throw new Error('missing_api_base');
  if (normalized !== ALLOWED_API_BASE) throw new Error(`unsafe_api_base_not_mailerlite:${normalized}`);
  return normalized;
};

const parseArgs = (argv) => {
  const options = {
    workflowId: DEFAULT_ONBOARDING_WORKFLOW_ID,
    workflowName: DEFAULT_ONBOARDING_WORKFLOW_NAME,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    out: null,
    markdownOut: null,
    failOnBlocked: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-blocked') options.failOnBlocked = true;
    else if (arg === '--workflow-id') options.workflowId = argv[++index];
    else if (arg === '--workflow-name') options.workflowName = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.workflowId = cleanString(options.workflowId);
  options.workflowName = cleanString(options.workflowName);
  options.service = cleanString(options.service);
  options.account = cleanString(options.account);
  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  options.apiBase = validateMailerLiteApiBase(options.apiBase);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
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
  if (status === 422) return 'mailerlite_unprocessable_request';
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const unblockActionFor = (reason, options) => {
  if (reason === 'missing_mailerlite_credential') {
    return `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}. Do not paste tokens in chat.`;
  }
  if (reason === 'mailerlite_unauthenticated') {
    return `Refresh the MailerLite API key in Keychain service ${options.service}, account ${options.account}.`;
  }
  if (reason === 'mailerlite_forbidden') return 'Check that the MailerLite API key can read automations and groups.';
  if (reason === 'mailerlite_rate_limited') return 'Retry later; the audit is read-only and safe to rerun.';
  return 'Inspect MailerLite/keychain state locally while keeping tokens out of logs.';
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
        'User-Agent': 'CRM-vNext-MailerLite-Onboarding-V1-Audit/1.0',
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
  for (const key of ['data', 'groups', 'automations', 'fields', 'segments', 'forms', 'items', 'results']) {
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

const readOptionalCollection = async ({ options, key, path, label }) => {
  try {
    const items = await scanCollection(options, key, path);
    return { label, path, ok: true, count: items.length, items };
  } catch (error) {
    return {
      label,
      path,
      ok: false,
      count: 0,
      reason: error?.reason || error?.message || 'unknown_mailerlite_error',
      items: [],
    };
  }
};

const readFormsCollection = async ({ options, key }) => {
  const reads = [];
  for (const path of ['/forms/popup', '/forms/embedded', '/forms/promotion']) {
    reads.push(await readOptionalCollection({ options, key, path, label: path.replace('/forms/', 'forms_') }));
  }
  const okReads = reads.filter((read) => read.ok);
  return {
    label: 'forms',
    path: '/forms/{popup,embedded,promotion}',
    ok: okReads.length > 0,
    count: okReads.reduce((total, read) => total + read.count, 0),
    reason: okReads.length ? null : reads.map((read) => `${read.path}:${read.reason}`).join('; '),
    endpointReads: reads.map((read) => ({
      path: read.path,
      ok: read.ok,
      count: read.count,
      reason: read.reason ?? null,
    })),
    items: okReads.flatMap((read) => read.items.map((item) => ({ ...item, formEndpoint: read.path }))),
  };
};

const safeId = (item) => cleanString(item?.id) ?? cleanString(item?.form_id) ?? cleanString(item?.automation_id);
const safeName = (item) =>
  cleanString(item?.name)
  ?? cleanString(item?.title)
  ?? cleanString(item?.label)
  ?? cleanString(item?.key)
  ?? cleanString(item?.identifier);

const groupNameFor = (group) => safeName(group);

const groupSummary = (group) => ({
  id: safeId(group),
  name: groupNameFor(group),
  activeCount: safeNumber(group?.active_count),
  sentCount: safeNumber(group?.sent_count),
  opensCount: safeNumber(group?.opens_count),
  clicksCount: safeNumber(group?.clicks_count),
  unsubscribedCount: safeNumber(group?.unsubscribed_count),
  bouncedCount: safeNumber(group?.bounced_count),
  junkCount: safeNumber(group?.junk_count),
});

const genericSummary = (item) => ({
  id: safeId(item),
  name: safeName(item),
  type: cleanString(item?.type),
  status: cleanString(item?.status) ?? cleanString(item?.state),
});

const cleanStats = (stats) => {
  if (!stats || typeof stats !== 'object') return null;
  return {
    sent: safeNumber(stats.sent),
    deliveries: safeNumber(stats.deliveries_count),
    opens: safeNumber(stats.opens_count),
    clicks: safeNumber(stats.clicks_count),
    unsubscribes: safeNumber(stats.unsubscribes_count),
    hardBounces: safeNumber(stats.hard_bounces_count),
    softBounces: safeNumber(stats.soft_bounces_count),
  };
};

const contentIdForEmail = (step) => {
  const haystack = [step?.subject, step?.name, step?.email?.subject, step?.email?.name]
    .map(cleanString)
    .filter(Boolean)
    .join(' | ');
  for (const [pattern, contentId] of CONTENT_ID_BY_SUBJECT) {
    if (pattern.test(haystack)) return contentId;
  }
  return null;
};

const groupMini = (group) => ({
  id: safeId(group),
  name: groupNameFor(group),
  activeCount: safeNumber(group?.active_count),
});

const summarizeStep = (step) => {
  const base = {
    id: safeId(step),
    type: cleanString(step?.type),
    parentId: cleanString(step?.parent_id),
    complete: step?.complete ?? null,
    broken: step?.broken ?? null,
    description: cleanString(step?.description),
    createdAt: cleanString(step?.created_at),
    updatedAt: cleanString(step?.updated_at),
  };

  if (base.type === 'email') {
    return {
      ...base,
      name: cleanString(step?.name) ?? cleanString(step?.email?.name),
      subject: cleanString(step?.subject) ?? cleanString(step?.email?.subject),
      preheader: cleanString(step?.preheader) ?? cleanString(step?.email?.preheader),
      from: cleanString(step?.from) ?? cleanString(step?.email?.from),
      fromName: cleanString(step?.from_name) ?? cleanString(step?.email?.from_name),
      replyTo: cleanString(step?.reply_to) ?? cleanString(step?.email?.reply_to),
      emailId: cleanString(step?.email_id) ?? cleanString(step?.email?.id),
      contentId: contentIdForEmail(step),
      trackOpens: step?.track_opens ?? step?.email?.track_opens ?? null,
      googleAnalytics: step?.google_analytics ?? null,
      eligibleForSending: step?.eligible_for_sending ?? null,
      hasUnsubscribeUrl: step?.has_unsubscribe_url ?? null,
      builderType: cleanString(step?.builder_type) ?? cleanString(step?.email?.type),
      stats: cleanStats(step?.email?.stats),
    };
  }

  if (base.type === 'delay') {
    return {
      ...base,
      unit: cleanString(step?.unit),
      value: cleanString(step?.value),
      hour: cleanString(step?.hour),
      minute: cleanString(step?.minute),
      weekDays: Array.isArray(step?.week_days) ? step.week_days.map(cleanString).filter(Boolean) : [],
      useTimezone: cleanString(step?.use_timezone),
    };
  }

  if (base.type === 'action') {
    return {
      ...base,
      actionType: cleanString(step?.action_type),
      fromGroups: Array.isArray(step?.from_groups) ? step.from_groups.map(groupMini) : [],
      toGroups: Array.isArray(step?.to_groups) ? step.to_groups.map(groupMini) : [],
    };
  }

  if (base.type === 'condition') {
    return {
      ...base,
      matchingType: cleanString(step?.matching_type),
      yesStepId: cleanString(step?.yes_step_id),
      noStepId: cleanString(step?.no_step_id),
      conditions: Array.isArray(step?.conditions)
        ? step.conditions.map((condition) => ({
          type: cleanString(condition?.type),
          groupId: cleanString(condition?.group_id),
          groupName: groupNameFor(condition?.group),
          segmentId: cleanString(condition?.segment_id),
          segmentName: safeName(condition?.segment),
        }))
        : [],
    };
  }

  return base;
};

const summarizeTrigger = (trigger) => ({
  id: safeId(trigger),
  type: cleanString(trigger?.type),
  groupIds: Array.isArray(trigger?.group_ids) ? trigger.group_ids.map(cleanString).filter(Boolean) : [],
  groups: Array.isArray(trigger?.groups) ? trigger.groups.map(groupMini) : [],
  excludedGroupIds: Array.isArray(trigger?.exclude_group_ids) ? trigger.exclude_group_ids.map(cleanString).filter(Boolean) : [],
  broken: trigger?.broken ?? null,
  complete: trigger?.complete ?? null,
});

const buildStepGraph = (steps) => {
  const summaries = steps.map(summarizeStep);
  const byId = new Map(summaries.map((step) => [step.id, step]));
  const childrenByParent = new Map();
  for (const step of summaries) {
    const parentId = step.parentId;
    if (!parentId) continue;
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(step);
  }
  for (const children of childrenByParent.values()) {
    children.sort((left, right) => {
      const priority = { action: 1, delay: 2, email: 3, condition: 4 };
      return (priority[left.type] ?? 9) - (priority[right.type] ?? 9)
        || (left.createdAt ?? '').localeCompare(right.createdAt ?? '')
        || (left.id ?? '').localeCompare(right.id ?? '');
    });
  }

  const roots = summaries.filter((step) => !step.parentId);
  const visited = new Set();
  const linearPath = [];
  const visit = (step, depth = 0) => {
    if (!step?.id || visited.has(step.id) || depth > 100) return;
    visited.add(step.id);
    linearPath.push(step);
    const nextIds = [step.yesStepId, ...(childrenByParent.get(step.id) ?? []).map((child) => child.id)]
      .filter(Boolean);
    for (const nextId of nextIds) visit(byId.get(nextId), depth + 1);
  };
  for (const root of roots) visit(root);
  for (const step of summaries) visit(step);

  return {
    steps: summaries,
    roots: roots.map((step) => step.id),
    edges: summaries.flatMap((step) => {
      const childEdges = (childrenByParent.get(step.id) ?? []).map((child) => ({
        from: step.id,
        to: child.id,
        type: 'parent_child',
      }));
      if (step.yesStepId) childEdges.push({ from: step.id, to: step.yesStepId, type: 'condition_yes' });
      if (step.noStepId) childEdges.push({ from: step.id, to: step.noStepId, type: 'condition_no' });
      return childEdges;
    }),
    linearPath,
    emailSequence: linearPath.filter((step) => step.type === 'email').map((step, index) => ({
      order: index + 1,
      id: step.id,
      emailId: step.emailId,
      name: step.name,
      subject: step.subject,
      preheader: step.preheader,
      contentId: step.contentId,
      from: step.from,
      fromName: step.fromName,
      replyTo: step.replyTo,
      trackOpens: step.trackOpens,
      googleAnalytics: step.googleAnalytics,
      eligibleForSending: step.eligibleForSending,
      hasUnsubscribeUrl: step.hasUnsubscribeUrl,
      stats: step.stats,
    })),
    actionSequence: linearPath.filter((step) => step.type === 'action'),
    delaySequence: linearPath.filter((step) => step.type === 'delay'),
  };
};

const mapHistoricalGroups = ({ groups, triggers, graph }) => {
  const groupByName = new Map(groups.map((group) => [normalizeName(groupNameFor(group)), group]));
  const triggerGroupIds = new Set(triggers.flatMap((trigger) => trigger.groupIds ?? []));
  const actionGroupNames = new Map();
  for (const action of graph.actionSequence) {
    for (const group of action.fromGroups ?? []) actionGroupNames.set(normalizeName(group.name), 'action_from_group');
    for (const group of action.toGroups ?? []) actionGroupNames.set(normalizeName(group.name), 'action_to_group');
  }

  return HISTORICAL_GROUP_RULES.map((rule) => {
    const live = groupByName.get(normalizeName(rule.name));
    const id = safeId(live);
    return {
      ...rule,
      exists: Boolean(live),
      id: id ?? null,
      activeCount: safeNumber(live?.active_count),
      sentCount: safeNumber(live?.sent_count),
      opensCount: safeNumber(live?.opens_count),
      clicksCount: safeNumber(live?.clicks_count),
      usedAsTrigger: id ? triggerGroupIds.has(id) : false,
      usedInAction: actionGroupNames.get(normalizeName(rule.name)) ?? null,
    };
  });
};

const recommendMigrationOption = ({ workflow, emailSequence, historicalGroups }) => {
  if (!workflow?.found) {
    return {
      option: 'blocked_workflow_missing',
      confidence: 'high',
      reason: 'No active onboarding workflow was found, so migration planning needs a fresh source check.',
    };
  }

  const enabled = workflow.enabled === true;
  const overloadedCompletion = historicalGroups.some((group) =>
    group.name === 'Onboarding complete' && group.exists && group.role === 'legacy_completion_and_campaign_audience');
  const complexSequence = emailSequence.length >= 5;
  const inProgressBucket = historicalGroups.some((group) =>
    group.name === 'Received second email' && group.exists && group.role === 'legacy_in_progress_bucket');

  if (enabled && (complexSequence || overloadedCompletion || inProgressBucket)) {
    return {
      option: 'option_b_light_clone_onboarding_v2_then_switch_entry',
      confidence: 'medium_high',
      reason: 'The current onboarding is active and valuable, but it mixes journey state, content receipts, and audience eligibility. Clone/build v2 is safer than patching the live flow directly.',
    };
  }

  if (enabled) {
    return {
      option: 'option_a_additive_overlay_after_queue_snapshot',
      confidence: 'medium',
      reason: 'The workflow is active, so only additive changes should be considered after queue/step visibility is strong.',
    };
  }

  return {
    option: 'option_a_additive_or_v2_after_creative_qa',
    confidence: 'medium',
    reason: 'Workflow is not active; additive receipt work or v2 rebuild can be considered after QA.',
  };
};

const queueVisibility = ({ workflow, historicalGroups }) => {
  const qualifiedSubscribersCount = safeNumber(
    workflow?.qualifiedSubscribersCount ?? workflow?.qualified_subscribers_count,
  );
  return {
    qualifiedSubscribersCount,
    heyliteInactiveCount: safeNumber(workflow?.heyliteInactiveCount ?? workflow?.heylite_inactive_count),
    groupActiveCountsVisible: historicalGroups
      .filter((group) => group.exists)
      .map((group) => ({
        name: group.name,
        activeCount: group.activeCount,
        interpretation: group.role,
      })),
    subscriberRowsRead: 0,
    confidence: qualifiedSubscribersCount !== null ? 'partial_api_metric_plus_group_counts' : 'group_counts_only',
  };
};

const workflowSummary = (workflow) => {
  if (!workflow) return { found: false };
  const triggers = Array.isArray(workflow.triggers) ? workflow.triggers.map(summarizeTrigger) : [];
  const graph = buildStepGraph(Array.isArray(workflow.steps) ? workflow.steps : []);
  return {
    found: true,
    id: safeId(workflow),
    name: safeName(workflow),
    enabled: workflow.enabled ?? workflow.active ?? workflow.status ?? null,
    complete: workflow.complete ?? null,
    broken: workflow.broken ?? null,
    warnings: Array.isArray(workflow.warnings) ? workflow.warnings.map(cleanString).filter(Boolean) : [],
    emailsCount: safeNumber(workflow.emails_count),
    stepsCount: Array.isArray(workflow.steps) ? workflow.steps.length : 0,
    qualifiedSubscribersCount: safeNumber(workflow.qualified_subscribers_count),
    createdAt: cleanString(workflow.created_at),
    triggers,
    graph,
  };
};

const findWorkflow = (workflows, options) => {
  const byId = workflows.find((workflow) => safeId(workflow) === options.workflowId);
  if (byId) return byId;
  return workflows.find((workflow) => normalizeName(safeName(workflow)) === normalizeName(options.workflowName)) ?? null;
};

const buildAuditFromLiveState = ({ options, collections, workflowDetail }) => {
  const workflow = workflowSummary(workflowDetail);
  const historicalGroups = mapHistoricalGroups({
    groups: collections.groups.items,
    triggers: workflow.triggers ?? [],
    graph: workflow.graph ?? { actionSequence: [] },
  });
  const migrationRecommendation = recommendMigrationOption({
    workflow,
    emailSequence: workflow.graph?.emailSequence ?? [],
    historicalGroups,
  });

  const blockers = [];
  if (!workflow.found) blockers.push('onboarding_workflow_not_found');
  if (collections.groups.ok === false) blockers.push('groups_read_failed');
  if (collections.automations.ok === false) blockers.push('automations_read_failed');

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_onboarding_v1_audit',
    generatedAt: new Date().toISOString(),
    ok: blockers.length === 0,
    status: blockers.length ? 'blocked' : 'completed_read_only_audit',
    targetWorkflow: {
      requestedId: options.workflowId,
      requestedName: options.workflowName,
    },
    collections: {
      groups: {
        ok: collections.groups.ok,
        count: collections.groups.count,
        blockedReason: collections.groups.reason ?? null,
      },
      automations: {
        ok: collections.automations.ok,
        count: collections.automations.count,
        blockedReason: collections.automations.reason ?? null,
      },
      fields: {
        ok: collections.fields.ok,
        count: collections.fields.count,
        blockedReason: collections.fields.reason ?? null,
      },
      segments: {
        ok: collections.segments.ok,
        count: collections.segments.count,
        blockedReason: collections.segments.reason ?? null,
      },
      forms: {
        ok: collections.forms.ok,
        count: collections.forms.count,
        blockedReason: collections.forms.reason ?? null,
        endpointReads: collections.forms.endpointReads ?? [],
      },
    },
    workflow,
    historicalGroups,
    queueVisibility: queueVisibility({ workflow, historicalGroups }),
    migrationRecommendation,
    proposedNextGate: {
      name: 'onboarding_v1_migration_decision_packet',
      requiresHumanApprovalBeforeLiveChange: true,
      recommendedPreparation: [
        'Decide whether Option B-light is accepted as the default migration posture.',
        'If accepted, design onboarding v2 as a draft/clone path before changing v1 entry.',
        'Prepare seed/test contacts and a no-audience test lane.',
        'Keep current onboarding v1 live until v2 is proven and entry switch is explicitly approved.',
      ],
    },
    blockers,
    safety: safetyBlock(),
  };
};

const buildReport = async (options) => {
  const credential = await getCredential(options);
  if (!credential.key) {
    const reason = 'missing_mailerlite_credential';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_onboarding_v1_audit',
      generatedAt: new Date().toISOString(),
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      safety: safetyBlock(),
    };
  }

  const collections = {
    groups: await readOptionalCollection({ options, key: credential.key, path: '/groups', label: 'groups' }),
    automations: await readOptionalCollection({ options, key: credential.key, path: '/automations', label: 'automations' }),
    fields: await readOptionalCollection({ options, key: credential.key, path: '/fields', label: 'fields' }),
    segments: await readOptionalCollection({ options, key: credential.key, path: '/segments', label: 'segments' }),
    forms: await readFormsCollection({ options, key: credential.key }),
  };

  if (!collections.groups.ok || !collections.automations.ok) {
    const reason = !collections.groups.ok ? collections.groups.reason : collections.automations.reason;
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_onboarding_v1_audit',
      generatedAt: new Date().toISOString(),
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      collections: {
        groups: { ok: collections.groups.ok, count: collections.groups.count, reason: collections.groups.reason ?? null },
        automations: { ok: collections.automations.ok, count: collections.automations.count, reason: collections.automations.reason ?? null },
      },
      keychain: safeKeychain(options, credential),
      safety: safetyBlock(),
    };
  }

  const workflowListItem = findWorkflow(collections.automations.items, options);
  let workflowDetail = null;
  if (workflowListItem) {
    try {
      const payload = await fetchJson(options, credential.key, `/automations/${safeId(workflowListItem)}`);
      workflowDetail = payload?.data && typeof payload.data === 'object' ? payload.data : payload;
    } catch (error) {
      const reason = error?.reason || error?.message || 'automation_detail_read_failed';
      return {
        schemaVersion: SCHEMA_VERSION,
        mode: 'read_only_mailerlite_onboarding_v1_audit',
        generatedAt: new Date().toISOString(),
        ok: false,
        status: 'blocked',
        blocker: {
          reason,
          unblockAction: unblockActionFor(reason, options),
        },
        keychain: safeKeychain(options, credential),
        safety: safetyBlock(),
      };
    }
  }

  const report = buildAuditFromLiveState({ options, collections, workflowDetail });
  return {
    ...report,
    apiBase: options.apiBase,
    keychain: safeKeychain(options, credential),
  };
};

const safeKeychain = (options, credential) => ({
  service: options.service,
  account: options.account,
  credentialPresent: Boolean(credential.key),
  credentialSource: credential.source,
});

const safetyBlock = () => ({
  readOnly: true,
  mailerLiteMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  automationActivationChanged: false,
  sendsPerformed: false,
  crmMutationsPerformed: false,
  tokensPrinted: false,
  outboundPerformed: false,
});

const renderMarkdown = (report) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v1 Read-Only Audit',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    '',
  ];

  if (!report.ok) {
    lines.push('## Blocker', '', `- Reason: ${report.blocker?.reason}`, `- Unblock: ${report.blocker?.unblockAction}`, '');
    return lines.join('\n');
  }

  const workflow = report.workflow;
  lines.push(
    '## Executive Summary',
    '',
    '- Onboarding v1 was audited in read-only mode.',
    `- Workflow: ${workflow.name} (${workflow.id})`,
    `- Enabled: ${workflow.enabled}`,
    `- Complete: ${workflow.complete}`,
    `- Broken: ${workflow.broken}`,
    `- Steps: ${workflow.stepsCount}`,
    `- Email sequence items: ${workflow.graph.emailSequence.length}`,
    `- Recommended migration posture: ${report.migrationRecommendation.option}`,
    `- Confidence: ${report.migrationRecommendation.confidence}`,
    '',
    report.migrationRecommendation.reason,
    '',
    '## Live Collections Read',
    '',
    `- Groups: ${report.collections.groups.count} (${report.collections.groups.ok ? 'ok' : report.collections.groups.blockedReason})`,
    `- Automations: ${report.collections.automations.count} (${report.collections.automations.ok ? 'ok' : report.collections.automations.blockedReason})`,
    `- Fields: ${report.collections.fields.count} (${report.collections.fields.ok ? 'ok' : report.collections.fields.blockedReason || 'optional blocked'})`,
    `- Segments: ${report.collections.segments.count} (${report.collections.segments.ok ? 'ok' : report.collections.segments.blockedReason || 'optional blocked'})`,
    `- Forms: ${report.collections.forms.count} (${report.collections.forms.ok ? 'ok' : report.collections.forms.blockedReason || 'optional blocked'})`,
    '',
    '## Trigger',
    '',
  );

  for (const trigger of workflow.triggers) {
    lines.push(`- ${trigger.type}: ${trigger.groups.map((group) => `${group.name} (${group.id})`).join(', ') || trigger.groupIds.join(', ')}`);
  }

  lines.push('', '## Historical Group Map', '');
  for (const group of report.historicalGroups) {
    lines.push(`- ${group.name}`);
    lines.push(`  - Exists: ${group.exists}`);
    lines.push(`  - Role: ${group.role}`);
    lines.push(`  - Active count: ${group.activeCount ?? 'n/a'}`);
    lines.push(`  - vNext mapping: ${group.vNextMapping}`);
    lines.push(`  - Posture: ${group.recommendedPosture}`);
    lines.push(`  - Risk: ${group.risk}`);
  }

  lines.push('', '## Email Sequence', '');
  for (const email of workflow.graph.emailSequence) {
    lines.push(`- ${email.order}. ${email.subject || email.name}`);
    lines.push(`  - Name: ${email.name}`);
    lines.push(`  - content_id candidate: ${email.contentId ?? 'needs_mapping_review'}`);
    lines.push(`  - Preheader: ${email.preheader ?? 'n/a'}`);
    lines.push(`  - From: ${email.fromName ?? 'n/a'} <${email.from ?? 'n/a'}>`);
    lines.push(`  - Reply-to: ${email.replyTo ?? 'n/a'}`);
    lines.push(`  - Sent/open/click counts: ${email.stats?.sent ?? 'n/a'} / ${email.stats?.opens ?? 'n/a'} / ${email.stats?.clicks ?? 'n/a'}`);
  }

  lines.push('', '## Queue Visibility', '');
  lines.push(`- Qualified subscribers count: ${report.queueVisibility.qualifiedSubscribersCount ?? 'not exposed'}`);
  lines.push(`- Subscriber rows read: ${report.queueVisibility.subscriberRowsRead}`);
  lines.push(`- Confidence: ${report.queueVisibility.confidence}`);
  for (const item of report.queueVisibility.groupActiveCountsVisible) {
    lines.push(`- ${item.name}: activeCount=${item.activeCount ?? 'n/a'} (${item.interpretation})`);
  }

  lines.push(
    '',
    '## Recommendation',
    '',
    `- Default path: ${report.migrationRecommendation.option}`,
    `- Reason: ${report.migrationRecommendation.reason}`,
    '',
    'I would not patch the live onboarding casually. Treat the current flow as production v1, then design a clean v2/draft route and switch entry only after seed tests and explicit approval.',
    '',
    '## Next Gate',
    '',
    `- ${report.proposedNextGate.name}`,
    '- Human approval required before any live change: true',
    ...report.proposedNextGate.recommendedPreparation.map((item) => `- ${item}`),
    '',
    '## Safety',
    '',
    '- Read-only audit only.',
    '- No subscriber rows read or printed.',
    '- No workflow edits, pause, activation, or deactivation.',
    '- No group creation, deletion, rename, or assignment.',
    '- No sends and no outbound.',
    '- No CRM card/scoring mutation.',
    '- No tokens printed.',
    '',
  );

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

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const report = await buildReport(options);
  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(report));

  console.log(JSON.stringify({
    ok: report.ok,
    status: report.status,
    generatedAt: report.generatedAt,
    workflow: report.workflow
      ? {
        id: report.workflow.id,
        name: report.workflow.name,
        enabled: report.workflow.enabled,
        complete: report.workflow.complete,
        broken: report.workflow.broken,
        stepsCount: report.workflow.stepsCount,
        emailSequenceCount: report.workflow.graph?.emailSequence?.length ?? null,
      }
      : null,
    migrationRecommendation: report.migrationRecommendation ?? null,
    collections: report.collections ?? null,
    blocker: report.blocker ?? null,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (!report.ok && options.failOnBlocked) process.exitCode = 2;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v1 audit failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildAuditFromLiveState,
  buildReport,
  buildStepGraph,
  mapHistoricalGroups,
  parseArgs,
  recommendMigrationOption,
  renderMarkdown,
  summarizeStep,
  validateMailerLiteApiBase,
};
