#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { parseDictionaryGroups } from './crm-vnext-mailerlite-onboarding-v2-design-packet.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-onboarding-v2-empty-groups-packet-2026-05-27';
const DEFAULT_DESIGN_PACKET = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_onboarding_v2_decision_design_packet_2026-05-27.json';
const DEFAULT_BRAND_DICTIONARY = process.env.BRAND_MAILERLITE_GROUP_DICTIONARY
  || '/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md';
const DEFAULT_SERVICE = process.env.MAILERLITE_KEYCHAIN_SERVICE || 'CRM-MailerLite';
const DEFAULT_ACCOUNT = process.env.MAILERLITE_KEYCHAIN_ACCOUNT || 'default';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-onboarding-v2-empty-groups-packet.mjs [options]

Options:
  --design-packet <path>     Onboarding v2 design JSON. Defaults to ${DEFAULT_DESIGN_PACKET}
  --brand-dictionary <path>  Brand Hub group dictionary. Defaults to ${DEFAULT_BRAND_DICTIONARY}
  --service <name>           Keychain service. Defaults to ${DEFAULT_SERVICE}
  --account <name>           Keychain account. Defaults to ${DEFAULT_ACCOUNT}
  --api-base <url>           MailerLite API base. Only ${DEFAULT_API_BASE} is supported.
  --timeout-ms <n>           Per-request timeout. Defaults to 30000
  --out <path>               Write JSON packet
  --markdown-out <path>      Write Markdown packet
  --help                     Show this help

Read-only dry-run packet for the 12 empty groups needed before an Onboarding v2
pilot. It performs a fresh MailerLite group scan and validates Brand Hub status.
It never creates groups, reads subscribers, edits workflows, assigns groups,
sends emails, mutates CRM cards, or prints tokens.`;

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

const parseArgs = (argv) => {
  const options = {
    designPacket: DEFAULT_DESIGN_PACKET,
    brandDictionary: DEFAULT_BRAND_DICTIONARY,
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
    else if (arg === '--design-packet') options.designPacket = argv[++index];
    else if (arg === '--brand-dictionary') options.brandDictionary = argv[++index];
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

const extractV2TargetGroups = (designPacket) => {
  const targets = designPacket?.groupWorkNeededBeforeV2Pilot?.missingOrProposedGroups ?? [];
  const unique = [];
  const seen = new Set();
  for (const target of targets) {
    const name = cleanString(target?.name);
    const normalized = normalizeName(name);
    if (!name || !normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push({
      name,
      designStatus: cleanString(target?.status),
      designLayer: cleanString(target?.layer),
      designMailerLiteGroupId: cleanString(target?.mailerLiteGroupId),
    });
  }
  return unique;
};

const validateTargetsAgainstBrand = ({ targets, dictionaryGroups }) => {
  const dictionaryByName = new Map(dictionaryGroups.map((group) => [normalizeName(group.name), group]));
  return targets.map((target) => {
    const dictionary = dictionaryByName.get(normalizeName(target.name));
    const issues = [];
    if (!dictionary) issues.push('missing_from_brand_dictionary');
    if (dictionary && dictionary.status !== 'proposed_local') issues.push(`brand_status_not_proposed_local:${dictionary.status}`);
    if (target.designStatus && target.designStatus !== 'proposed_local') issues.push(`design_status_not_proposed_local:${target.designStatus}`);
    if (dictionary?.mailerLiteGroupId) issues.push('brand_dictionary_already_has_live_id');
    return {
      ...target,
      brand: dictionary
        ? {
          name: dictionary.name,
          layer: dictionary.layer,
          status: dictionary.status,
          crmMapping: dictionary.crmMapping,
          mailerLiteGroupId: dictionary.mailerLiteGroupId,
        }
        : null,
      brandValidationOk: issues.length === 0,
      brandValidationIssues: issues,
    };
  });
};

const groupId = (group) => cleanString(group?.id);
const groupName = (group) => cleanString(group?.name);
const groupActiveCount = (group) => {
  const value = group?.active_count ?? group?.subscribers_count ?? group?.total;
  return Number.isFinite(Number(value)) ? Number(value) : null;
};

const buildTargetPlan = ({ validatedTargets, liveGroups }) => {
  const liveByName = new Map();
  for (const group of liveGroups) {
    const normalized = normalizeName(groupName(group));
    if (normalized) liveByName.set(normalized, group);
  }

  return validatedTargets.map((target) => {
    const live = liveByName.get(normalizeName(target.name));
    const canCreateEmptyAfterApproval = target.brandValidationOk && !live;
    return {
      name: target.name,
      layer: target.brand?.layer ?? target.designLayer ?? null,
      brandStatus: target.brand?.status ?? null,
      existsInFreshScan: Boolean(live),
      liveGroupId: live ? groupId(live) : null,
      liveActiveCount: live ? groupActiveCount(live) : null,
      brandValidationOk: target.brandValidationOk,
      brandValidationIssues: target.brandValidationIssues,
      plannedOperation: canCreateEmptyAfterApproval
        ? 'create_empty_group_after_exact_human_approval'
        : live
          ? 'block_existing_target_group'
          : 'block_until_brand_dictionary_alignment',
      canCreateEmptyAfterExplicitApproval: canCreateEmptyAfterApproval,
      workflowUseAllowed: false,
      workflowAttachmentAllowed: false,
      subscriberAssignmentAllowed: false,
    };
  });
};

const exactApprovalPhraseFor = (targets) =>
  `Apruebo crear únicamente estos ${targets.length} grupos vacíos de Onboarding v2 en MailerLite, sin subscribers, sin workflows, sin automatizaciones, sin envíos, sin tocar Onboarding v1 y con re-scan fresco previo: ${targets.map((target) => target.name).join('; ')}.`;

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
        'User-Agent': 'CRM-vNext-MailerLite-Onboarding-V2-Empty-Groups-Packet/1.0',
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

const workflowSummary = (workflow) => ({
  id: cleanString(workflow?.id),
  name: cleanString(workflow?.name),
  enabled: workflow?.enabled ?? workflow?.active ?? null,
  complete: workflow?.complete ?? null,
  broken: workflow?.broken ?? null,
});

const safetyBlock = () => ({
  readOnly: true,
  mailerLiteApiCalled: true,
  mailerLiteMutationsPerformed: false,
  groupMutationsPerformed: false,
  workflowMutationsPerformed: false,
  automationMutationsPerformed: false,
  subscriberRowsRead: false,
  subscriberRowsPrinted: false,
  subscriberAssignmentsPerformed: false,
  sendsPerformed: false,
  crmMutationsPerformed: false,
  outboundPerformed: false,
  tokensPrinted: false,
});

const buildPacketFromState = ({ designPacket, dictionaryGroups, liveGroups, liveAutomations, generatedAt = new Date().toISOString() }) => {
  const targets = extractV2TargetGroups(designPacket);
  const validatedTargets = validateTargetsAgainstBrand({ targets, dictionaryGroups });
  const targetPlan = buildTargetPlan({ validatedTargets, liveGroups });
  const blockers = [
    ...(targets.length ? [] : ['no_v2_target_groups_found_in_design_packet']),
    ...targetPlan.flatMap((target) => target.brandValidationIssues.map((issue) => `${target.name}:${issue}`)),
    ...targetPlan.filter((target) => target.existsInFreshScan).map((target) => `${target.name}:already_exists_in_fresh_scan`),
  ];
  const readyTargets = targetPlan.filter((target) => target.canCreateEmptyAfterExplicitApproval);
  const workflowsByName = new Map(liveAutomations.map((workflow) => [normalizeName(workflow.name), workflow]));
  const v1 = workflowsByName.get(normalizeName('Onboarding flow'));
  const v2Draft = workflowsByName.get(normalizeName('Onboarding editorial v2 - DRAFT'));
  const exactApprovalPhrase = readyTargets.length === targetPlan.length && targetPlan.length > 0
    ? exactApprovalPhraseFor(targetPlan)
    : null;

  return {
    schemaVersion: SCHEMA_VERSION,
    mode: 'read_only_onboarding_v2_empty_group_dry_run_packet',
    generatedAt,
    ok: blockers.length === 0,
    status: blockers.length === 0
      ? 'ready_for_exact_human_approval_to_create_empty_groups'
      : 'blocked_before_empty_group_approval',
    sourceEvidence: {
      designPacketStatus: designPacket?.status ?? null,
      designRecommendedOption: designPacket?.decision?.recommendedOption ?? null,
      targetGroupCount: targets.length,
      brandDictionaryGroupsParsed: dictionaryGroups.length,
      liveGroupsRead: liveGroups.length,
      liveAutomationsRead: liveAutomations.length,
      onboardingV1: v1 ? workflowSummary(v1) : { name: 'Onboarding flow', found: false },
      onboardingV2Draft: v2Draft ? workflowSummary(v2Draft) : { name: 'Onboarding editorial v2 - DRAFT', found: false },
    },
    targetPlan,
    approvalGate: {
      canAskAlejandroForApproval: blockers.length === 0,
      canCreateOnlyNamedEmptyGroupsAfterExplicitApproval: blockers.length === 0,
      canUseWorkflow: false,
      canAttachToProtectedWorkflow: false,
      canAssignSubscribers: false,
      canSendEmails: false,
      exactApprovalPhrase,
    },
    blockers,
    nextAction: blockers.length === 0
      ? 'Ask Alejandro for the exact approval phrase only if ready to create these named empty groups; otherwise stop here.'
      : 'Resolve blockers and rerun the read-only packet.',
    safety: safetyBlock(),
  };
};

const buildPacket = async (options) => {
  const designPacket = JSON.parse(await readFile(resolve(options.designPacket), 'utf8'));
  const dictionaryMarkdown = await readFile(resolve(options.brandDictionary), 'utf8');
  const dictionaryGroups = parseDictionaryGroups(dictionaryMarkdown);
  const credential = await getCredential(options);
  if (!credential.key) {
    return {
      schemaVersion: SCHEMA_VERSION,
      mode: 'read_only_onboarding_v2_empty_group_dry_run_packet',
      generatedAt: new Date().toISOString(),
      ok: false,
      status: 'blocked_missing_mailerlite_credential',
      blocker: {
        reason: 'missing_mailerlite_credential',
        unblockAction: `Store a valid MailerLite API key in Keychain service ${options.service}, account ${options.account}. Do not paste tokens in chat.`,
      },
      safety: {
        ...safetyBlock(),
        mailerLiteApiCalled: false,
      },
    };
  }

  const liveGroups = await scanCollection(options, credential.key, '/groups');
  const liveAutomations = await scanCollection(options, credential.key, '/automations');
  return buildPacketFromState({ designPacket, dictionaryGroups, liveGroups, liveAutomations });
};

const renderMarkdown = (packet) => {
  const lines = [
    '# MailerLite Launch OS v0 - Onboarding v2 Empty Groups Dry-Run Packet',
    '',
    `Generated: ${packet.generatedAt}`,
    `Status: ${packet.status}`,
    '',
  ];

  if (!packet.ok && packet.blocker) {
    lines.push('## Blocker', '', `- Reason: ${packet.blocker.reason}`, `- Unblock: ${packet.blocker.unblockAction}`, '');
    return lines.join('\n');
  }

  lines.push(
    '## Decision Ejecutiva',
    '',
    packet.ok
      ? 'Listo para pedir aprobacion exacta si Alejandro decide crear solo estos grupos vacios.'
      : 'No esta listo para aprobacion; resolver blockers primero.',
    '',
    'Este packet no crea grupos ni autoriza workflow use, subscriber assignment, automatizaciones, envios ni cambios en Onboarding v1.',
    '',
    '## Evidencia',
    '',
    `- Design packet status: ${packet.sourceEvidence.designPacketStatus}`,
    `- Opcion recomendada: ${packet.sourceEvidence.designRecommendedOption}`,
    `- Target groups: ${packet.sourceEvidence.targetGroupCount}`,
    `- Brand dictionary groups parsed: ${packet.sourceEvidence.brandDictionaryGroupsParsed}`,
    `- Live groups read: ${packet.sourceEvidence.liveGroupsRead}`,
    `- Live automations read: ${packet.sourceEvidence.liveAutomationsRead}`,
    `- Onboarding v1: ${packet.sourceEvidence.onboardingV1.name} enabled=${packet.sourceEvidence.onboardingV1.enabled ?? 'n/a'} complete=${packet.sourceEvidence.onboardingV1.complete ?? 'n/a'} broken=${packet.sourceEvidence.onboardingV1.broken ?? 'n/a'}`,
    `- Onboarding v2 draft exists: ${packet.sourceEvidence.onboardingV2Draft.found === false ? 'false' : 'true'}`,
    '',
    '## Target Plan',
    '',
  );

  for (const target of packet.targetPlan ?? []) {
    lines.push(`- ${target.name}`);
    lines.push(`  - Layer: ${target.layer ?? 'n/a'}`);
    lines.push(`  - Brand status: ${target.brandStatus ?? 'n/a'}`);
    lines.push(`  - Exists in fresh scan: ${target.existsInFreshScan}`);
    lines.push(`  - Planned operation: ${target.plannedOperation}`);
    lines.push(`  - Workflow attachment allowed: ${target.workflowAttachmentAllowed}`);
    lines.push(`  - Subscriber assignment allowed: ${target.subscriberAssignmentAllowed}`);
    if (target.brandValidationIssues.length) lines.push(`  - Issues: ${target.brandValidationIssues.join(', ')}`);
  }

  lines.push('', '## Gates', '');
  lines.push(`- canAskAlejandroForApproval: ${packet.approvalGate.canAskAlejandroForApproval}`);
  lines.push(`- canCreateOnlyNamedEmptyGroupsAfterExplicitApproval: ${packet.approvalGate.canCreateOnlyNamedEmptyGroupsAfterExplicitApproval}`);
  lines.push(`- canUseWorkflow: ${packet.approvalGate.canUseWorkflow}`);
  lines.push(`- canAttachToProtectedWorkflow: ${packet.approvalGate.canAttachToProtectedWorkflow}`);
  lines.push(`- canAssignSubscribers: ${packet.approvalGate.canAssignSubscribers}`);
  lines.push(`- canSendEmails: ${packet.approvalGate.canSendEmails}`);

  lines.push('', '## Approval Phrase', '');
  lines.push(packet.approvalGate.exactApprovalPhrase
    ? `\`${packet.approvalGate.exactApprovalPhrase}\``
    : '- No approval phrase until blockers are resolved.');

  lines.push('', '## Blockers', '');
  lines.push(packet.blockers.length ? packet.blockers.map((blocker) => `- ${blocker}`).join('\n') : '- None.');

  lines.push(
    '',
    '## Safety',
    '',
    '- Read-only packet.',
    '- MailerLite API used only for group/automation scan.',
    '- No groups created, renamed, deleted, or assigned.',
    '- No subscribers read or printed.',
    '- No workflows or automations edited.',
    '- No sends and no outbound.',
    '- No tokens printed.',
    '',
    `Next action: ${packet.nextAction}`,
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

  const packet = await buildPacket(options);
  if (options.out) await writeJson(options.out, packet);
  if (options.markdownOut) await writeText(options.markdownOut, renderMarkdown(packet));

  console.log(JSON.stringify({
    ok: packet.ok,
    status: packet.status,
    generatedAt: packet.generatedAt,
    targetCount: packet.targetPlan?.length ?? null,
    liveGroupsRead: packet.sourceEvidence?.liveGroupsRead ?? null,
    liveAutomationsRead: packet.sourceEvidence?.liveAutomationsRead ?? null,
    canAskApproval: packet.approvalGate?.canAskAlejandroForApproval ?? false,
    blockers: packet.blockers ?? [],
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: packet.safety,
  }, null, 2));
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`crm-vnext MailerLite onboarding v2 empty groups packet failed: ${error.message}`);
    process.exitCode = 1;
  });
}

export {
  buildPacket,
  buildPacketFromState,
  buildTargetPlan,
  exactApprovalPhraseFor,
  extractV2TargetGroups,
  parseArgs,
  renderMarkdown,
  validateTargetsAgainstBrand,
};
