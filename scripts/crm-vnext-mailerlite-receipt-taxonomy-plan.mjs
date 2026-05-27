#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-receipt-taxonomy-plan-2026-05-26';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = process.env.MAILERLITE_API_BASE || 'https://connect.mailerlite.com/api';
const DEFAULT_MANIFEST = 'docs/crm-vnext/mailerlite-receipt-taxonomy-v0.md';
const DEFAULT_BRAND_DICTIONARY = process.env.BRAND_MAILERLITE_GROUP_DICTIONARY
  || '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const ALLOWED_API_BASE = 'https://connect.mailerlite.com/api';
const CREATE_APPROVED_BRAND_STATUSES = new Set(['proposed_local', 'live_canonical']);

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-receipt-taxonomy-plan.mjs [options]

Options:
  --manifest <path>      Markdown manifest with JSON block. Defaults to ${DEFAULT_MANIFEST}
  --brand-dictionary <path>
                         Brand Hub group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --service <name>       Keychain service. Defaults to MAILERLITE_KEYCHAIN_SERVICE or ${DEFAULT_SERVICE}
  --account <name>       Keychain account. Defaults to MAILERLITE_KEYCHAIN_ACCOUNT or ${DEFAULT_ACCOUNT}
  --api-base <url>       MailerLite API base. Only ${ALLOWED_API_BASE} is allowed with real credentials.
  --timeout-ms <n>       Per-request timeout. Defaults to 30000
  --out <path>           Write JSON report
  --markdown-out <path>  Write Markdown summary
  --fail-on-blocked      Exit with code 2 if MailerLite read-only probes fail
  --help                 Show this help

Read-only planner for MailerLite receipt taxonomy. It compares the local CC receipt
manifest with Brand Hub canon and live MailerLite groups/workflows. It never creates
groups, never edits workflows, never reads subscribers, never mutates MailerLite,
and never prints tokens.`;

const parseArgs = (argv) => {
  const options = {
    manifest: DEFAULT_MANIFEST,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
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
    else if (arg === '--manifest') options.manifest = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.manifest) throw new Error('missing_manifest');
  if (!options.brandDictionary) throw new Error('missing_brand_dictionary');
  if (!options.service) throw new Error('missing_keychain_service');
  if (!options.account) throw new Error('missing_keychain_account');
  if (!options.apiBase) throw new Error('missing_api_base');
  options.apiBase = validateMailerLiteApiBase(options.apiBase);
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const validateMailerLiteApiBase = (value) => {
  const normalized = cleanString(value)?.replace(/\/+$/, '');
  if (!normalized) throw new Error('missing_api_base');
  if (normalized !== ALLOWED_API_BASE) {
    throw new Error(`unsafe_api_base_not_mailerlite:${normalized}`);
  }
  return normalized;
};

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
  if (status === 429 || /rate.?limit|too many requests/i.test(text)) return 'mailerlite_rate_limited';
  if (status === 0 || /timeout|network|fetch failed/i.test(text)) return 'mailerlite_network_or_timeout';
  return `mailerlite_http_${status || 'unknown'}`;
};

const unblockActionFor = (reason, options) => {
  if (reason === 'missing_mailerlite_credential') {
    return `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}, or provide MAILERLITE_API_KEY locally. Do not paste tokens in chat.`;
  }
  if (reason === 'mailerlite_unauthenticated') {
    return `Refresh the MailerLite API key in Keychain service ${options.service}, account ${options.account}.`;
  }
  if (reason === 'mailerlite_forbidden') {
    return 'Check that the MailerLite API key can read group and automation endpoints.';
  }
  if (reason === 'mailerlite_rate_limited') {
    return 'Retry later; planner is read-only and can be rerun safely.';
  }
  return 'Inspect MailerLite API/keychain state locally while keeping tokens out of logs.';
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
        'User-Agent': 'CRM-vNext-MailerLite-Receipt-Taxonomy-Plan/1.0',
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
        // No-op. Treat malformed pagination as terminal.
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

const readManifest = async (path) => {
  const manifestPath = resolve(path);
  const raw = await readFile(manifestPath, 'utf8');
  const block = raw.match(/```json\s*([\s\S]*?)```/);
  if (!block) throw new Error(`manifest_json_block_missing:${manifestPath}`);
  const manifest = JSON.parse(block[1]);
  if (!Array.isArray(manifest.groups)) throw new Error('manifest_groups_required');
  return { manifestPath, manifest };
};

const stripMarkdownCode = (value) => cleanString(value)?.replace(/^`+|`+$/g, '') ?? null;

const normalizeHeader = (value) =>
  stripMarkdownCode(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '') ?? null;

const extractContentId = (value) => {
  const text = stripMarkdownCode(value);
  if (!text) return null;
  const direct = text.match(/^(article|guide|quiz|access|resource)_[a-z0-9_]+$/i);
  if (direct) return text;
  const mapped = text.match(/content\.(?:sent|delivered|received)\s*=\s*([a-z0-9_]+)/i);
  return mapped?.[1] ?? null;
};

const parseMarkdownTableRow = (line) =>
  line.split('|').slice(1, -1).map((cell) => stripMarkdownCode(cell.trim()) ?? '');

const isMarkdownSeparator = (cells) =>
  cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell.trim()));

const readBrandDictionary = async (path) => {
  const dictionaryPath = resolve(path);
  const raw = await readFile(dictionaryPath, 'utf8');
  const groups = [];
  const duplicateNames = [];
  const groupsByNormalized = new Map();
  let headers = null;

  for (const line of raw.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = parseMarkdownTableRow(line);
    if (isMarkdownSeparator(cells)) continue;
    if (cells.some((cell) => normalizeHeader(cell) === 'nombre_de_grupo')) {
      headers = cells.map(normalizeHeader);
      continue;
    }
    if (!headers) continue;

    const row = Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? '']));
    const name = stripMarkdownCode(row.nombre_de_grupo);
    if (!name?.startsWith('CC · ')) continue;

    const brandGroup = {
      name,
      layer: stripMarkdownCode(row.capa),
      status: stripMarkdownCode(row.estado),
      purpose: [row.significado, row.uso_principal, row.uso].map(stripMarkdownCode).filter(Boolean).join(' | ') || null,
      crmMapping: stripMarkdownCode(row.crm_mapping),
      contentId: extractContentId(row.content_id) ?? extractContentId(row.crm_mapping),
    };
    const normalized = normalizeName(name);
    if (groupsByNormalized.has(normalized)) duplicateNames.push(name);
    groupsByNormalized.set(normalized, brandGroup);
    groups.push(brandGroup);
  }

  return {
    dictionaryPath,
    groups,
    duplicateNames,
    groupsByNormalized,
    names: groups.map((group) => group.name),
    namesByNormalized: new Set(groups.map((group) => normalizeName(group.name)).filter(Boolean)),
  };
};

const workflowNameFor = (workflow) =>
  cleanString(workflow?.name)
  ?? cleanString(workflow?.title)
  ?? cleanString(workflow?.workflow_name)
  ?? cleanString(workflow?.automation_name);

const groupNameFor = (group) =>
  cleanString(group?.name)
  ?? cleanString(group?.title)
  ?? cleanString(group?.label);

const groupIdFor = (group) => cleanString(group?.id) ?? cleanString(group?.group_id);

const buildIndexes = ({ groups, workflows }) => {
  const groupsByName = new Map();
  for (const group of groups) {
    const name = groupNameFor(group);
    const normalized = normalizeName(name);
    if (normalized) groupsByName.set(normalized, group);
  }

  const workflowsByName = new Map();
  for (const workflow of workflows) {
    const name = workflowNameFor(workflow);
    const normalized = normalizeName(name);
    if (normalized) workflowsByName.set(normalized, workflow);
  }

  return { groupsByName, workflowsByName };
};

const liveWorkflowSummary = (workflow) => {
  if (!workflow) return null;
  return {
    id: cleanString(workflow.id),
    name: workflowNameFor(workflow),
    enabled: workflow.enabled ?? workflow.active ?? workflow.status ?? null,
    complete: workflow.complete ?? null,
  };
};

const brandStatusAllowsEmptyCreate = (status) =>
  CREATE_APPROVED_BRAND_STATUSES.has(cleanString(status));

const validateBrandAlignment = ({ manifest, brandDictionary }) => {
  const issues = [];
  for (const duplicateName of brandDictionary.duplicateNames) {
    issues.push({
      severity: 'error',
      type: 'brand_duplicate_group_name',
      groupName: duplicateName,
      message: 'Brand dictionary contains duplicate group names.',
    });
  }

  for (const entry of manifest.groups) {
    const name = cleanString(entry.name);
    const normalized = normalizeName(name);
    const brandGroup = brandDictionary.groupsByNormalized.get(normalized);

    if (!brandGroup) {
      issues.push({
        severity: 'error',
        type: 'missing_from_brand_canon',
        groupName: name,
        message: 'Manifest group is not registered in Brand Hub dictionary.',
      });
      continue;
    }

    const manifestLayer = cleanString(entry.layer);
    if (normalizeName(manifestLayer) !== normalizeName(brandGroup.layer)) {
      issues.push({
        severity: 'error',
        type: 'layer_mismatch',
        groupName: name,
        manifestLayer,
        brandLayer: brandGroup.layer,
      });
    }

    const manifestContentId = cleanString(entry.contentId);
    if (manifestContentId && brandGroup.contentId && manifestContentId !== brandGroup.contentId) {
      issues.push({
        severity: 'error',
        type: 'content_id_mismatch',
        groupName: name,
        manifestContentId,
        brandContentId: brandGroup.contentId,
      });
    }
    if (manifestContentId && !brandGroup.contentId) {
      issues.push({
        severity: 'error',
        type: 'brand_content_id_missing',
        groupName: name,
        manifestContentId,
      });
    }

    if (!brandGroup.status) {
      issues.push({
        severity: 'error',
        type: 'brand_status_missing',
        groupName: name,
      });
    }

    if (!brandGroup.purpose) {
      issues.push({
        severity: 'error',
        type: 'brand_purpose_missing',
        groupName: name,
      });
    }

    if (!cleanString(entry.purpose)) {
      issues.push({
        severity: 'error',
        type: 'manifest_purpose_missing',
        groupName: name,
      });
    }

    if (entry.safeToCreateEmpty && !brandStatusAllowsEmptyCreate(brandGroup.status)) {
      issues.push({
        severity: 'error',
        type: 'brand_status_not_approved_for_empty_create',
        groupName: name,
        brandStatus: brandGroup.status,
        message: 'Manifest marks group safe to create, but Brand status is not approved for empty creation.',
      });
    }
  }

  const blockingIssues = issues.filter((issue) => issue.severity === 'error');
  const issuesByGroup = new Map();
  for (const issue of issues) {
    const normalized = normalizeName(issue.groupName);
    if (!normalized) continue;
    if (!issuesByGroup.has(normalized)) issuesByGroup.set(normalized, []);
    issuesByGroup.get(normalized).push(issue);
  }

  return {
    ok: blockingIssues.length === 0,
    issueCount: issues.length,
    blockingIssueCount: blockingIssues.length,
    issues,
    blockingIssues,
    issuesByGroup,
  };
};

const statusForGroup = ({ entry, liveGroup, registeredInBrandCanon, brandGroup, brandIssues }) => {
  if (brandIssues.length) return 'blocked_by_brand_canon_drift';
  if (!registeredInBrandCanon) return 'blocked_by_brand_canon_drift';
  if (!brandStatusAllowsEmptyCreate(brandGroup?.status)) return 'needs_human_naming_review';
  if (liveGroup) return 'exists';
  if (!entry.safeToCreateEmpty) return 'needs_review';
  return 'safe_to_create_empty_after_approval';
};

const isWorkflowDisabledOrInactive = (workflowSummary) => {
  if (!workflowSummary) return false;
  const value = workflowSummary.enabled;
  if (value === false) return true;
  if (value === true) return false;
  const text = cleanString(value)?.toLowerCase();
  if (!text) return false;
  if (['false', 'disabled', 'inactive', 'draft', 'paused', 'off'].includes(text)) return true;
  if (['true', 'enabled', 'active', 'running', 'on'].includes(text)) return false;
  return false;
};

const workflowUseStatusFor = ({ entry, touchesProtectedWorkflow, registeredInBrandCanon, brandIssues, relatedWorkflows, manifest }) => {
  if (brandIssues.length || !registeredInBrandCanon) return 'blocked_by_brand_canon_drift';
  if (touchesProtectedWorkflow) return 'protected_active_workflow_related';
  if (entry.safeToUseInDisabledPilotAfterQa) {
    const pilotWorkflowNames = new Set((manifest.policy?.pilotWorkflows ?? []).map(normalizeName).filter(Boolean));
    const pilotWorkflows = relatedWorkflows.filter((workflow) => pilotWorkflowNames.has(normalizeName(workflow.name)));
    if (!pilotWorkflows.length) return 'pilot_workflow_not_declared_or_related';
    if (pilotWorkflows.some((workflow) => !workflow.exists || !isWorkflowDisabledOrInactive(workflow.live))) {
      return 'pilot_workflow_not_verified_disabled';
    }
    return 'safe_to_use_in_disabled_pilot_after_qa';
  }
  return 'not_ready_for_workflow_use';
};

const planGroups = ({ manifest, brandDictionary, brandAlignment, groups, workflows }) => {
  const indexes = buildIndexes({ groups, workflows });
  return manifest.groups.map((entry) => {
    const name = cleanString(entry.name);
    const liveGroup = indexes.groupsByName.get(normalizeName(name));
    const relatedHistoricGroups = (entry.relatedHistoricGroups ?? []).map((historicName) => {
      const live = indexes.groupsByName.get(normalizeName(historicName));
      return {
        name: historicName,
        exists: Boolean(live),
        id: live ? groupIdFor(live) : null,
      };
    });
    const relatedWorkflows = (entry.relatedWorkflows ?? []).map((workflowName) => {
      const live = indexes.workflowsByName.get(normalizeName(workflowName));
      return {
        name: workflowName,
        exists: Boolean(live),
        live: liveWorkflowSummary(live),
      };
    });
    const touchesProtectedWorkflow = relatedWorkflows.some((workflow) =>
      workflow.exists && (manifest.policy?.doNotTouchActiveWorkflows ?? [])
        .some((protectedName) => normalizeName(protectedName) === normalizeName(workflow.name)),
    );
    const normalizedName = normalizeName(name);
    const brandGroup = brandDictionary.groupsByNormalized.get(normalizedName) ?? null;
    const registeredInBrandCanon = Boolean(brandGroup);
    const brandIssues = brandAlignment.issuesByGroup.get(normalizedName) ?? [];
    const status = statusForGroup({ entry, liveGroup, registeredInBrandCanon, brandGroup, brandIssues });
    const workflowUseStatus = workflowUseStatusFor({
      entry,
      touchesProtectedWorkflow,
      registeredInBrandCanon,
      brandIssues,
      relatedWorkflows,
      manifest,
    });
    const requiresSeparateWorkflowMigrationGate = relatedWorkflows.length > 0;
    const requiresProtectedWorkflowMigrationGate = touchesProtectedWorkflow;
    const workflowAttachmentAllowed = false;

    return {
      name,
      layer: cleanString(entry.layer),
      object: cleanString(entry.object),
      detail: cleanString(entry.detail),
      contentId: cleanString(entry.contentId),
      purpose: cleanString(entry.purpose),
      existsInMailerLite: Boolean(liveGroup),
      liveGroupId: liveGroup ? groupIdFor(liveGroup) : null,
      registeredInBrandCanon,
      brandLayer: brandGroup?.layer ?? null,
      brandStatus: brandGroup?.status ?? null,
      brandContentId: brandGroup?.contentId ?? null,
      brandPurpose: brandGroup?.purpose ?? null,
      brandIssues,
      safeToCreateEmpty: Boolean(entry.safeToCreateEmpty),
      safeToUseInDisabledPilotAfterQa: Boolean(entry.safeToUseInDisabledPilotAfterQa),
      pilotPriority: Number.isFinite(entry.pilotPriority) ? entry.pilotPriority : null,
      status,
      emptyGroupCreationStatus: status,
      workflowUseStatus,
      workflowAttachmentAllowed,
      requiresSeparateWorkflowMigrationGate,
      requiresProtectedWorkflowMigrationGate,
      allowedOperation: status === 'safe_to_create_empty_after_approval'
        ? 'create_named_empty_group_only_after_explicit_approval'
        : 'none',
      useGuard: touchesProtectedWorkflow
        ? 'do_not_edit_or_use_inside_protected_workflow_without_separate_gate'
        : 'no_protected_workflow_gate_detected',
      recommendedAction: liveGroup
        ? 'no_create_needed'
        : entry.safeToCreateEmpty
          ? 'create_empty_group_only_after_explicit_approval_no_workflow_attachment'
          : 'manual_review_before_create',
      relatedHistoricGroups,
      relatedWorkflows,
    };
  });
};

const buildLiveGroupInventory = ({ manifest, brandDictionary, groups }) => {
  const manifestNames = new Set((manifest.groups ?? []).map((entry) => normalizeName(entry.name)).filter(Boolean));
  const brandNames = brandDictionary.namesByNormalized;
  const historicalNames = new Set([
    ...(manifest.policy?.doNotTouchHistoricGroups ?? []),
    ...(manifest.groups ?? []).flatMap((entry) => entry.relatedHistoricGroups ?? []),
  ].map(normalizeName).filter(Boolean));

  const liveGroups = groups
    .map((group) => {
      const name = groupNameFor(group);
      const normalized = normalizeName(name);
      const knownInManifest = manifestNames.has(normalized);
      const registeredInBrandCanon = brandNames.has(normalized);
      const listedAsHistorical = historicalNames.has(normalized);
      let classification = 'unknown_live_historical_review';
      if (knownInManifest) classification = 'live_manifest_group';
      else if (registeredInBrandCanon) classification = 'live_brand_canon_group';
      else if (listedAsHistorical) classification = 'live_known_historical';
      return {
        id: groupIdFor(group),
        name,
        classification,
        knownInManifest,
        registeredInBrandCanon,
        listedAsHistorical,
      };
    })
    .filter((group) => group.name)
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    liveGroups,
    liveGroupsNotInManifestOrBrandCanon: liveGroups.filter((group) =>
      !group.knownInManifest && !group.registeredInBrandCanon,
    ),
    unknownLiveGroups: liveGroups.filter((group) => group.classification === 'unknown_live_historical_review'),
  };
};

const buildReport = async (options) => {
  const { manifestPath, manifest } = await readManifest(options.manifest);
  let brandDictionary;
  try {
    brandDictionary = await readBrandDictionary(options.brandDictionary);
  } catch {
    const reason = 'brand_dictionary_unreadable';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_receipt_taxonomy_plan',
      generatedAt: new Date().toISOString(),
      manifestPath,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: `Restore or pass --brand-dictionary for the Brand Hub group dictionary: ${options.brandDictionary}`,
      },
      safety: safetyBlock(),
    };
  }
  const brandAlignment = validateBrandAlignment({ manifest, brandDictionary });
  const credential = await getCredential(options);
  if (!credential.key) {
    const reason = 'missing_mailerlite_credential';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_receipt_taxonomy_plan',
      generatedAt: new Date().toISOString(),
      manifestPath,
      ok: false,
      status: 'blocked',
      blocker: {
        reason,
        unblockAction: unblockActionFor(reason, options),
      },
      safety: safetyBlock(),
    };
  }

  let groups = [];
  let workflows = [];
  try {
    groups = await scanCollection(options, credential.key, '/groups');
    workflows = await scanCollection(options, credential.key, '/automations');
  } catch (error) {
    const reason = error?.reason || error?.message || 'mailerlite_read_blocked';
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_mailerlite_receipt_taxonomy_plan',
      generatedAt: new Date().toISOString(),
      manifestPath,
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

  const plannedGroups = planGroups({ manifest, brandDictionary, brandAlignment, groups, workflows });
  const inventory = buildLiveGroupInventory({ manifest, brandDictionary, groups });
  const firstSafeCreateSet = brandAlignment.ok
    ? plannedGroups
      .filter((item) => item.pilotPriority === 1 && item.status === 'safe_to_create_empty_after_approval')
      .map((item) => ({
        name: item.name,
        emptyGroupCreationStatus: item.emptyGroupCreationStatus,
        workflowUseStatus: item.workflowUseStatus,
        allowedOperation: item.allowedOperation,
        workflowAttachmentAllowed: item.workflowAttachmentAllowed,
        requiresSeparateWorkflowMigrationGate: item.requiresSeparateWorkflowMigrationGate,
        requiresProtectedWorkflowMigrationGate: item.requiresProtectedWorkflowMigrationGate,
      }))
    : [];
  const activeFlowRelated = plannedGroups
    .filter((item) => item.useGuard === 'do_not_edit_or_use_inside_protected_workflow_without_separate_gate')
    .map((item) => item.name);
  const manifestNotInBrandCanon = brandAlignment.issues
    .filter((issue) => issue.type === 'missing_from_brand_canon')
    .map((issue) => issue.groupName);
  const status = brandAlignment.ok ? 'ready_for_human_review' : 'blocked_by_brand_canon_drift';

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_mailerlite_receipt_taxonomy_plan',
    generatedAt: new Date().toISOString(),
    manifestPath,
    brandDictionaryPath: brandDictionary.dictionaryPath,
    ok: true,
    status,
    approvalGate: {
      canCreateGroups: false,
      canCreateNamedEmptyGroupsAfterExplicitApproval: brandAlignment.ok,
      canUseWorkflow: false,
      canMutateMailerLite: false,
      canAttachToProtectedWorkflow: false,
      reason: brandAlignment.ok
        ? 'ready_for_human_review_only_named_empty_group_creation_still_requires_explicit_approval'
        : 'brand_canon_drift_unresolved',
    },
    apiBase: options.apiBase,
    keychain: safeKeychain(options, credential),
    liveScan: {
      groupsRead: groups.length,
      workflowsRead: workflows.length,
      subscribersRead: 0,
      subscriberRowsPrinted: 0,
    },
    manifest: {
      schemaVersion: manifest.schemaVersion,
      groupCount: manifest.groups.length,
      contentIdCount: Array.isArray(manifest.contentIds) ? manifest.contentIds.length : 0,
      doNotTouchHistoricGroups: manifest.policy?.doNotTouchHistoricGroups ?? [],
      doNotTouchActiveWorkflows: manifest.policy?.doNotTouchActiveWorkflows ?? [],
      pilotWorkflows: manifest.policy?.pilotWorkflows ?? [],
    },
    brandCanon: {
      groupCount: brandDictionary.names.length,
      alignmentOk: brandAlignment.ok,
      issueCount: brandAlignment.issueCount,
      blockingIssueCount: brandAlignment.blockingIssueCount,
      issues: brandAlignment.issues,
      manifestGroupsNotRegisteredInBrandCanon: manifestNotInBrandCanon,
    },
    liveGroupInventory: {
      liveGroupCount: inventory.liveGroups.length,
      notInManifestOrBrandCanonCount: inventory.liveGroupsNotInManifestOrBrandCanon.length,
      unknownLiveGroupCount: inventory.unknownLiveGroups.length,
      liveGroupsNotInManifestOrBrandCanon: inventory.liveGroupsNotInManifestOrBrandCanon,
      unknownLiveGroups: inventory.unknownLiveGroups,
    },
    summary: {
      plannedGroups: plannedGroups.length,
      alreadyExist: plannedGroups.filter((item) => item.existsInMailerLite).length,
      missing: plannedGroups.filter((item) => !item.existsInMailerLite).length,
      safeToCreateEmptyAfterApproval: plannedGroups.filter((item) => item.status === 'safe_to_create_empty_after_approval').length,
      needsReviewActiveFlowRelated: activeFlowRelated.length,
      blockedByBrandCanonDrift: plannedGroups.filter((item) => item.status === 'blocked_by_brand_canon_drift').length,
      needsHumanNamingReview: plannedGroups.filter((item) => item.status === 'needs_human_naming_review').length,
      firstSafeCreateSetCount: firstSafeCreateSet.length,
    },
    firstSafeCreateSet,
    firstSafeEmptyGroupCreateSet: firstSafeCreateSet,
    futureLiveCreateRequirements: {
      explicitNamedAllowlistRequired: true,
      freshMailerLiteRescanRequired: true,
      normalizedNameMustNotAlreadyExist: true,
      brandDictionaryMustMatchPlannerCanon: true,
      plannedGroupMustStillBeSafeToCreateEmptyAfterApproval: true,
      operationMustBeCreateEmptyOnly: true,
      subscriberAssignmentAllowed: false,
      workflowAttachmentAllowed: false,
      workflowMutationAllowed: false,
      protectedWorkflowMigrationGateRequiredForAnyWorkflowUse: true,
    },
    activeFlowRelated,
    plannedGroups,
    safety: safetyBlock(),
    nextAction: !brandAlignment.ok
      ? 'Resolve Brand canon drift before asking Alejandro for any MailerLite group creation approval.'
      : firstSafeCreateSet.length
      ? 'Ask Alejandro whether to create the first empty CC receipt groups, or adjust naming before any MailerLite mutation.'
      : 'Review naming; no group creation recommended yet.',
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
  subscriberReadsPerformed: false,
  subscriberRowsPrinted: false,
  workflowMutationsPerformed: false,
  groupMutationsPerformed: false,
  tokensPrinted: false,
  outboundPerformed: false,
});

const renderMarkdown = (report) => {
  const lines = [
    '# CRM vNext - MailerLite Receipt Taxonomy Plan',
    '',
    `Generated: ${report.generatedAt}`,
    `Status: ${report.status}`,
    `Manifest: ${report.manifestPath}`,
    `Brand dictionary: ${report.brandDictionaryPath}`,
    '',
  ];

  if (!report.ok) {
    lines.push('## Blocker', '', `- Reason: ${report.blocker?.reason}`, `- Unblock: ${report.blocker?.unblockAction}`, '');
    return lines.join('\n');
  }

  if (report.status === 'blocked_by_brand_canon_drift') {
    lines.push(
      '## No Aprobar Creacion Todavia',
      '',
      '- Brand canon drift unresolved.',
      '- `approvalGate.canCreateGroups=false`.',
      '- `approvalGate.canCreateNamedEmptyGroupsAfterExplicitApproval=false`.',
      '- `firstSafeCreateSet` is intentionally empty while drift exists.',
      '',
    );
  }

  lines.push(
    '## Summary',
    '',
    `- Live groups read: ${report.liveScan.groupsRead}`,
    `- Live workflows read: ${report.liveScan.workflowsRead}`,
    `- Manifest groups: ${report.summary.plannedGroups}`,
    `- Already exist: ${report.summary.alreadyExist}`,
    `- Missing: ${report.summary.missing}`,
    `- Safe empty-create after approval: ${report.summary.safeToCreateEmptyAfterApproval}`,
    `- Needs review because active-flow related: ${report.summary.needsReviewActiveFlowRelated}`,
    `- Blocked by Brand canon drift: ${report.summary.blockedByBrandCanonDrift}`,
    `- Needs human naming review: ${report.summary.needsHumanNamingReview}`,
    `- Unknown live groups: ${report.liveGroupInventory.unknownLiveGroupCount}`,
    `- Approval gate can create generic groups: ${report.approvalGate.canCreateGroups}`,
    `- Approval gate can create named empty groups after explicit approval: ${report.approvalGate.canCreateNamedEmptyGroupsAfterExplicitApproval}`,
    `- Approval gate can use workflow: ${report.approvalGate.canUseWorkflow}`,
    `- Approval gate can attach to protected workflow: ${report.approvalGate.canAttachToProtectedWorkflow}`,
    '',
    '## First Safe Empty Group Create Set',
    '',
  );

  if (report.firstSafeCreateSet.length) {
    lines.push('These are empty group creation candidates only. This is not permission to attach any group to a workflow, subscriber, automation, or audience.', '');
    for (const item of report.firstSafeCreateSet) {
      lines.push(`- ${item.name}`);
      lines.push(`  - Allowed operation: ${item.allowedOperation}`);
      lines.push(`  - Workflow use: ${item.workflowUseStatus}`);
      lines.push(`  - Workflow attachment allowed: ${item.workflowAttachmentAllowed}`);
      lines.push(`  - Requires separate workflow migration gate: ${item.requiresSeparateWorkflowMigrationGate}`);
    }
  } else {
    lines.push('- None yet.');
  }

  if (report.brandCanon.manifestGroupsNotRegisteredInBrandCanon.length) {
    lines.push('', '## Brand Canon Drift', '');
    for (const name of report.brandCanon.manifestGroupsNotRegisteredInBrandCanon) lines.push(`- ${name}`);
  }

  if (report.brandCanon.issues.length) {
    lines.push('', '## Brand Canon Issues', '');
    for (const issue of report.brandCanon.issues) {
      lines.push(`- ${issue.type}: ${issue.groupName}`);
      if (issue.message) lines.push(`  - ${issue.message}`);
    }
  }

  lines.push('', '## Planner Table', '');
  for (const item of report.plannedGroups) {
    lines.push(`- ${item.status}: ${item.name}`);
    lines.push(`  - Brand canon: ${item.registeredInBrandCanon ? 'yes' : 'no'}`);
    lines.push(`  - Brand status: ${item.brandStatus ?? 'n/a'}`);
    lines.push(`  - Empty group creation: ${item.emptyGroupCreationStatus}`);
    lines.push(`  - Workflow use: ${item.workflowUseStatus}`);
    lines.push(`  - Workflow attachment allowed: ${item.workflowAttachmentAllowed}`);
    lines.push(`  - Requires separate workflow migration gate: ${item.requiresSeparateWorkflowMigrationGate}`);
    if (item.brandIssues.length) {
      lines.push(`  - Brand issues: ${item.brandIssues.map((issue) => issue.type).join(', ')}`);
    }
    if (item.relatedHistoricGroups.some((group) => group.exists)) {
      const names = item.relatedHistoricGroups.filter((group) => group.exists).map((group) => group.name).join(', ');
      lines.push(`  - Existing historical groups: ${names}`);
    }
    if (item.relatedWorkflows.some((workflow) => workflow.exists)) {
      const names = item.relatedWorkflows.filter((workflow) => workflow.exists).map((workflow) => workflow.name).join(', ');
      lines.push(`  - Related workflows found: ${names}`);
    }
  }

  lines.push(
    '',
    '## Future Live Create Requirements',
    '',
    '- Explicit named allowlist required.',
    '- Fresh MailerLite re-scan required.',
    '- Normalized group name must not already exist.',
    '- Brand dictionary must still match planner canon.',
    '- Operation must be create-empty only.',
    '- Subscriber assignment is not allowed from this plan.',
    '- Workflow attachment/mutation is not allowed from this plan.',
    '- Protected workflow use requires a separate migration gate.',
    '',
  );

  lines.push('', '## Unknown Live Groups Inventory', '');
  if (report.liveGroupInventory.unknownLiveGroups.length) {
    for (const group of report.liveGroupInventory.unknownLiveGroups) {
      lines.push(`- ${group.name}${group.id ? ` (${group.id})` : ''}`);
    }
  } else {
    lines.push('- None.');
  }

  lines.push(
    '',
    '## Do Not Touch',
    '',
    ...report.manifest.doNotTouchHistoricGroups.map((name) => `- Group: ${name}`),
    ...report.manifest.doNotTouchActiveWorkflows.map((name) => `- Workflow: ${name}`),
    '',
    '## Safety',
    '',
    '- Read-only planner only.',
    '- No subscribers read or printed.',
    '- No groups created, renamed, deleted, or assigned.',
    '- No workflows edited.',
    '- No tokens printed.',
    '- No outbound.',
    '',
    `Next action: ${report.nextAction}`,
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
    approvalGate: report.approvalGate ?? null,
    summary: report.summary ?? null,
    brandCanon: report.brandCanon
      ? {
        alignmentOk: report.brandCanon.alignmentOk,
        issueCount: report.brandCanon.issueCount,
        blockingIssueCount: report.brandCanon.blockingIssueCount,
      }
      : null,
    blocker: report.blocker ?? null,
    firstSafeCreateSet: report.firstSafeCreateSet ?? [],
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnBlocked && (!report.ok || report.status === 'blocked_by_brand_canon_drift')) {
    process.exitCode = 2;
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite receipt taxonomy planner failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildLiveGroupInventory,
  buildReport,
  isWorkflowDisabledOrInactive,
  parseArgs,
  planGroups,
  readBrandDictionary,
  readManifest,
  validateBrandAlignment,
  validateMailerLiteApiBase,
  workflowUseStatusFor,
};
