#!/usr/bin/env node
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import {
  buildFinalCheckNotReadyContractFields,
  buildFinalCheckReadyContractFields,
  validateFinalCheckReadyReceipt,
} from './crm-vnext-mailerlite-final-check-receipt-contract.mjs';

const execFileAsync = promisify(execFile);

const SCHEMA_VERSION = 'crm-vnext-mailerlite-final-idempotency-suppression-check-2026-07-06-v0';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PRIVATE_MAILERLITE_ROOT = '/Users/alejandrogomez/Documents/Mantis-Private-Source-Artifacts/mailerlite';
const REDACTED_RECEIPT_ROOT = '/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite/controlled-welcome-flow';
const DEFAULT_API_BASE = 'https://connect.mailerlite.com/api';
const DEFAULT_SERVICE = 'CRM-MailerLite';
const DEFAULT_ACCOUNT = 'default';
const DEFAULT_TARGET_GROUP_LABEL = 'CC · Journey · Editorial onboarding · Eligible';
const COMMAND = 'npm run crm:vnext:mailerlite-final-idempotency-suppression-check';

const COMPLETED_LIVE_ROUTE_STATUS = 'completed_live_readonly_packet_final_check';
const PRECHECK_MISSING_EMAIL_ROUTE_STATUS = 'precheck_blocked_missing_private_packet_email_anchor';
const PACKET_SPECIFIC_READONLY_SCOPE = 'packet_specific_subscriber_status_group_membership_readonly';
const MISSING_EMAIL_SCOPE = 'not_called_missing_private_packet_email_anchor';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-final-idempotency-suppression-check.mjs [options]

Fixture/mock mode:
  --fixture-file <path>
  --private-result-json <path>
  --private-result-md <path>
  --redacted-receipt-json <path>
  --redacted-receipt-md <path>

Future live read-only mode:
  --allow-live-packet-final-check
  --private-packet-json <approved private packet path>
  --private-result-json <approved private result JSON path>
  --private-result-md <approved private result MD path>
  --redacted-receipt-json <approved redacted receipt JSON path>
  --redacted-receipt-md <approved redacted receipt MD path>

This guard is packet-specific, read-only, and redaction-safe. Live mode must not
be used without exact Alejandro approval and approved output paths.`;

const LOOKUP_STATUS = new Set(['found', 'not_found', 'ambiguous', 'blocked', 'unknown']);
const SUBSCRIBER_STATUS_CLASS = new Set(['active', 'unsubscribed', 'bounced', 'complained', 'junk', 'unknown', 'not_found', 'ambiguous']);
const GROUP_MEMBERSHIP_STATUS = new Set(['present', 'absent', 'unknown', 'not_found', 'ambiguous']);
const DUPLICATE_STATUS = new Set(['safe_new_or_not_in_group', 'blocked_already_in_group_retrigger_unknown', 'unknown']);
const SAFETY_STATUS = new Set(['pass', 'blocked', 'unknown']);
const READINESS = new Set([
  'ready_for_exact_mutation_approval',
  'blocked_already_in_onboarding_group',
  'blocked_suppression_status',
  'blocked_subscriber_status_unknown',
  'blocked_lookup_ambiguous',
  'blocked_idempotency_unknown',
  'blocked_missing_private_packet_email_anchor',
  'blocked_route_not_redaction_safe',
  'blocked_existing_subscriber_path_not_supported_by_v1_guard',
]);
const SAFE_STATUS_CLASSES = new Set(['active']);
const BLOCKING_STATUS_CLASSES = new Set(['unsubscribed', 'bounced', 'complained', 'junk']);

const parseArgs = (argv) => {
  const options = {
    fixtureFile: null,
    allowLivePacketFinalCheck: false,
    privatePacketJson: null,
    privateResultJson: null,
    privateResultMd: null,
    redactedReceiptJson: null,
    redactedReceiptMd: null,
    service: DEFAULT_SERVICE,
    account: DEFAULT_ACCOUNT,
    apiBase: DEFAULT_API_BASE,
    timeoutMs: 30_000,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fixture-file') options.fixtureFile = argv[++index];
    else if (arg === '--allow-live-packet-final-check') options.allowLivePacketFinalCheck = true;
    else if (arg === '--private-packet-json') options.privatePacketJson = argv[++index];
    else if (arg === '--private-result-json') options.privateResultJson = argv[++index];
    else if (arg === '--private-result-md') options.privateResultMd = argv[++index];
    else if (arg === '--redacted-receipt-json') options.redactedReceiptJson = argv[++index];
    else if (arg === '--redacted-receipt-md') options.redactedReceiptMd = argv[++index];
    else if (arg === '--service') options.service = argv[++index];
    else if (arg === '--account') options.account = argv[++index];
    else if (arg === '--api-base') options.apiBase = argv[++index];
    else if (arg === '--timeout-ms') options.timeoutMs = Number.parseInt(argv[++index], 10);
    else if (/debug|raw|env|credential|header|token/i.test(arg)) throw new Error(`forbidden_flag:${arg}`);
    else throw new Error(`unknown_arg:${arg}`);
  }

  options.apiBase = String(options.apiBase || DEFAULT_API_BASE).replace(/\/+$/, '');
  options.timeoutMs = Number.isFinite(options.timeoutMs) && options.timeoutMs > 0 ? options.timeoutMs : 30_000;
  return options;
};

const rootsWithDefaults = (roots = {}) => ({
  repoRoot: roots.repoRoot ?? REPO_ROOT,
  privateMailerLiteRoot: roots.privateMailerLiteRoot ?? PRIVATE_MAILERLITE_ROOT,
  redactedReceiptRoot: roots.redactedReceiptRoot ?? REDACTED_RECEIPT_ROOT,
});

const isInside = (targetPath, rootPath) => {
  if (!targetPath) return false;
  const resolvedTarget = resolve(targetPath);
  const resolvedRoot = resolve(rootPath);
  const rel = relative(resolvedRoot, resolvedTarget);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
};

const assertOutsideRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (isInside(targetPath, rootPath)) throw new Error(`${label}_inside_repo_rejected`);
};

const assertUnderRoot = (targetPath, rootPath, label) => {
  if (!targetPath) throw new Error(`missing_${label}`);
  if (!isInside(targetPath, rootPath) || resolve(targetPath) === resolve(rootPath)) {
    throw new Error(`${label}_outside_approved_root_rejected`);
  }
};

const validateFixtureOutputPaths = (options, { roots = {} } = {}) => {
  const resolvedRoots = rootsWithDefaults(roots);
  for (const [key, label] of [
    ['privateResultJson', 'private_result_json'],
    ['privateResultMd', 'private_result_md'],
    ['redactedReceiptJson', 'redacted_receipt_json'],
    ['redactedReceiptMd', 'redacted_receipt_md'],
  ]) {
    assertOutsideRoot(options[key], resolvedRoots.repoRoot, label);
  }
  return {
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
  };
};

const validateLivePrechecks = (options, { roots = {} } = {}) => {
  if (!options.allowLivePacketFinalCheck) throw new Error('live_packet_final_check_requires_explicit_approval');
  const resolvedRoots = rootsWithDefaults(roots);
  assertOutsideRoot(options.privatePacketJson, resolvedRoots.repoRoot, 'private_packet_json');
  assertOutsideRoot(options.privateResultJson, resolvedRoots.repoRoot, 'private_result_json');
  assertOutsideRoot(options.privateResultMd, resolvedRoots.repoRoot, 'private_result_md');
  assertOutsideRoot(options.redactedReceiptJson, resolvedRoots.repoRoot, 'redacted_receipt_json');
  assertOutsideRoot(options.redactedReceiptMd, resolvedRoots.repoRoot, 'redacted_receipt_md');
  assertUnderRoot(options.privatePacketJson, resolvedRoots.privateMailerLiteRoot, 'private_packet_json');
  assertUnderRoot(options.privateResultJson, resolvedRoots.privateMailerLiteRoot, 'private_result_json');
  assertUnderRoot(options.privateResultMd, resolvedRoots.privateMailerLiteRoot, 'private_result_md');
  assertUnderRoot(options.redactedReceiptJson, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_json');
  assertUnderRoot(options.redactedReceiptMd, resolvedRoots.redactedReceiptRoot, 'redacted_receipt_md');
  return {
    privatePacketJson: resolve(options.privatePacketJson),
    privateResultJson: resolve(options.privateResultJson),
    privateResultMd: resolve(options.privateResultMd),
    redactedReceiptJson: resolve(options.redactedReceiptJson),
    redactedReceiptMd: resolve(options.redactedReceiptMd),
  };
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const trimmed = value.replace(/\s+/g, ' ').trim();
  return trimmed || null;
};

const normalize = (value) => cleanString(value)
  ?.normalize('NFKD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim() ?? null;

const getPath = (record, key) => {
  if (!record || typeof record !== 'object') return null;
  if (!key.includes('.')) return record[key] ?? null;
  let cursor = record;
  for (const part of key.split('.')) {
    if (!cursor || typeof cursor !== 'object') return null;
    cursor = cursor[part];
  }
  return cursor ?? null;
};

const firstValue = (record, keys) => {
  for (const key of keys) {
    const value = getPath(record, key);
    if (value !== null && value !== undefined && value !== '') return value;
  }
  return null;
};

const packetIdOf = (packet) => cleanString(firstValue(packet, ['packet_id', 'packetId', 'run_id', 'runId'])) ?? 'unknown_packet';
const targetGroupLabelOf = (packet) => cleanString(firstValue(packet, ['onboarding_group_label', 'target_onboarding_group_label', 'targetGroupLabel', 'planned_group_label'])) ?? DEFAULT_TARGET_GROUP_LABEL;

const privateEmailForLookup = (packet) => cleanString(firstValue(packet, [
  'private_lookup.email',
  'privateLookup.email',
  'privateEmailForLookup',
  'email_for_lookup',
  'top_level_email',
]));

const packetEmailAnchorPresent = (packet) => {
  if (privateEmailForLookup(packet)) return true;
  const explicit = firstValue(packet, ['private_email_anchor_label_present', 'privateEmailAnchorLabelPresent', 'top_level_email_presence_status']);
  return explicit === true || explicit === 'true' || explicit === 'present';
};

const packetDuplicateEvidenceClear = (packet) => {
  const status = cleanString(firstValue(packet, [
    'packet_duplicate_evidence_status',
    'duplicate_evidence_status',
    'idempotency_evidence_status',
    'private_duplicate_evidence_status',
  ]));
  if (!status) return true;
  return ['clear', 'not_recorded', 'not_duplicate', 'new_private_email_evidence'].includes(status);
};

const statusClassFor = (subscriber) => {
  if (!subscriber) return 'not_found';
  const raw = normalize(firstValue(subscriber, ['status', 'state', 'subscriber.status', 'data.status']));
  if (!raw) return 'unknown';
  if (['active', 'subscribed', 'confirmed'].includes(raw)) return 'active';
  if (['unsubscribed', 'unsubscribe'].includes(raw)) return 'unsubscribed';
  if (['bounced', 'hard_bounced', 'soft_bounced'].includes(raw)) return 'bounced';
  if (['complained', 'complaint', 'spam_complaint'].includes(raw)) return 'complained';
  if (['junk', 'spam'].includes(raw)) return 'junk';
  return 'unknown';
};

const groupLabelOf = (group) => cleanString(firstValue(group, ['name', 'label', 'title', 'group.name', 'group.label']));
const groupsOf = (subscriber) => Array.isArray(subscriber?.groups) ? subscriber.groups : Array.isArray(subscriber?.data?.groups) ? subscriber.data.groups : [];

const membershipStatusFor = (subscriber, targetGroupLabel) => {
  if (!subscriber) return 'not_found';
  const groups = groupsOf(subscriber);
  if (!Array.isArray(groups)) return 'unknown';
  const wanted = normalize(targetGroupLabel);
  if (!wanted) return 'unknown';
  return groups.some((group) => normalize(groupLabelOf(group)) === wanted) ? 'present' : 'absent';
};

const isSuppressed = (subscriber) => {
  if (!subscriber) return false;
  return Boolean(firstValue(subscriber, ['suppressed', 'is_suppressed', 'suppression.blocked', 'data.suppressed']));
};

const ensureAllowed = (value, allowed, fallback) => allowed.has(value) ? value : fallback;

const missingEmailAnchorDecision = ({ packetId, routeStatus = PRECHECK_MISSING_EMAIL_ROUTE_STATUS }) => normalizedDecision({
  packetId,
  checkRan: false,
  liveLookupRan: false,
  routeStatus,
  mailerLiteApiCalled: false,
  mailerLiteApiCallScope: MISSING_EMAIL_SCOPE,
  subscriberLookupStatus: 'blocked',
  subscriberStatusClass: 'unknown',
  onboardingGroupMembershipStatus: 'unknown',
  duplicateReaddStatus: 'unknown',
  suppressionStatus: 'unknown',
  idempotencyStatus: 'unknown',
  mutationReadinessAfterFinalCheck: 'blocked_missing_private_packet_email_anchor',
  blockers: ['missing_private_packet_email_anchor'],
});

const buildDecision = ({ packet, lookupResult, routeStatus = 'fixture_mock_redaction_safe' }) => {
  const packetId = packetIdOf(packet);
  const hasResolvableEmailAnchor = Boolean(privateEmailForLookup(packet));
  const targetGroupLabel = targetGroupLabelOf(packet);
  const blockers = [];
  const explicitLookupStatus = ensureAllowed(cleanString(lookupResult?.subscriber_lookup_status ?? lookupResult?.lookupStatus), LOOKUP_STATUS, null);
  let subscriberLookupStatus = explicitLookupStatus;
  let records = Array.isArray(lookupResult?.records) ? lookupResult.records : Array.isArray(lookupResult?.subscribers) ? lookupResult.subscribers : [];
  if (!subscriberLookupStatus) {
    if (records.length > 1) subscriberLookupStatus = 'ambiguous';
    else if (records.length === 1) subscriberLookupStatus = 'found';
    else subscriberLookupStatus = 'not_found';
  }

  if (!hasResolvableEmailAnchor) {
    return missingEmailAnchorDecision({ packetId, routeStatus: PRECHECK_MISSING_EMAIL_ROUTE_STATUS });
  }

  if (subscriberLookupStatus === 'blocked') {
    blockers.push('lookup_blocked');
    return normalizedDecision({
      packetId,
      checkRan: false,
      liveLookupRan: false,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'not_called_lookup_blocked',
      subscriberLookupStatus: 'blocked',
      subscriberStatusClass: 'unknown',
      onboardingGroupMembershipStatus: 'unknown',
      duplicateReaddStatus: 'unknown',
      suppressionStatus: 'unknown',
      idempotencyStatus: 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_route_not_redaction_safe',
      blockers,
    });
  }

  if (subscriberLookupStatus === 'ambiguous' || records.length > 1) {
    blockers.push('lookup_ambiguous');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'ambiguous',
      subscriberStatusClass: 'ambiguous',
      onboardingGroupMembershipStatus: 'ambiguous',
      duplicateReaddStatus: 'unknown',
      suppressionStatus: 'unknown',
      idempotencyStatus: 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_lookup_ambiguous',
      blockers,
    });
  }

  if (subscriberLookupStatus === 'not_found' || (!explicitLookupStatus && records.length === 0)) {
    const idempotencyOk = packetDuplicateEvidenceClear(packet);
    const liveLookupRan = Boolean(lookupResult?.mailerlite_api_called);
    if (!idempotencyOk) blockers.push('idempotency_unknown_or_duplicate_evidence_present');
    if (!liveLookupRan) blockers.push('live_lookup_not_completed');
    return normalizedDecision({
      packetId,
      checkRan: liveLookupRan,
      liveLookupRan,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'not_found',
      subscriberStatusClass: liveLookupRan ? 'not_found' : 'unknown',
      onboardingGroupMembershipStatus: liveLookupRan ? 'not_found' : 'unknown',
      duplicateReaddStatus: liveLookupRan ? 'safe_new_or_not_in_group' : 'unknown',
      suppressionStatus: liveLookupRan ? 'pass' : 'unknown',
      idempotencyStatus: liveLookupRan && idempotencyOk ? 'pass' : 'unknown',
      mutationReadinessAfterFinalCheck: liveLookupRan && idempotencyOk ? 'ready_for_exact_mutation_approval' : 'blocked_idempotency_unknown',
      blockers,
    });
  }

  if (subscriberLookupStatus !== 'found') {
    blockers.push('lookup_unknown_or_blocked');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: ensureAllowed(subscriberLookupStatus, LOOKUP_STATUS, 'unknown'),
      subscriberStatusClass: 'unknown',
      onboardingGroupMembershipStatus: 'unknown',
      duplicateReaddStatus: 'unknown',
      suppressionStatus: 'unknown',
      idempotencyStatus: 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_lookup_ambiguous',
      blockers,
    });
  }

  const subscriber = records[0];
  const subscriberStatusClass = statusClassFor(subscriber);
  const onboardingGroupMembershipStatus = membershipStatusFor(subscriber, targetGroupLabel);
  const suppressed = isSuppressed(subscriber);
  const idempotencyOk = packetDuplicateEvidenceClear(packet);

  if (BLOCKING_STATUS_CLASSES.has(subscriberStatusClass) || suppressed) {
    blockers.push('suppression_or_blocked_subscriber_status');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'found',
      subscriberStatusClass,
      onboardingGroupMembershipStatus,
      duplicateReaddStatus: onboardingGroupMembershipStatus === 'present' ? 'blocked_already_in_group_retrigger_unknown' : 'unknown',
      suppressionStatus: 'blocked',
      idempotencyStatus: idempotencyOk ? 'pass' : 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_suppression_status',
      blockers,
    });
  }

  if (!SAFE_STATUS_CLASSES.has(subscriberStatusClass)) {
    blockers.push('subscriber_status_unknown');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'found',
      subscriberStatusClass,
      onboardingGroupMembershipStatus,
      duplicateReaddStatus: 'unknown',
      suppressionStatus: 'unknown',
      idempotencyStatus: idempotencyOk ? 'pass' : 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_subscriber_status_unknown',
      blockers,
    });
  }

  if (onboardingGroupMembershipStatus === 'present') {
    blockers.push('already_in_onboarding_group_retrigger_unknown');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'found',
      subscriberStatusClass,
      onboardingGroupMembershipStatus,
      duplicateReaddStatus: 'blocked_already_in_group_retrigger_unknown',
      suppressionStatus: 'pass',
      idempotencyStatus: idempotencyOk ? 'pass' : 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_already_in_onboarding_group',
      blockers,
    });
  }

  if (onboardingGroupMembershipStatus !== 'absent') {
    blockers.push('group_membership_unknown');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'found',
      subscriberStatusClass,
      onboardingGroupMembershipStatus,
      duplicateReaddStatus: 'unknown',
      suppressionStatus: 'pass',
      idempotencyStatus: idempotencyOk ? 'pass' : 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_idempotency_unknown',
      blockers,
    });
  }

  if (!idempotencyOk) {
    blockers.push('idempotency_unknown_or_duplicate_evidence_present');
    return normalizedDecision({
      packetId,
      checkRan: true,
      routeStatus,
      mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
      mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
      subscriberLookupStatus: 'found',
      subscriberStatusClass,
      onboardingGroupMembershipStatus,
      duplicateReaddStatus: 'safe_new_or_not_in_group',
      suppressionStatus: 'pass',
      idempotencyStatus: 'unknown',
      mutationReadinessAfterFinalCheck: 'blocked_idempotency_unknown',
      blockers,
    });
  }

  const completedPacketSpecificLookup = routeStatus === COMPLETED_LIVE_ROUTE_STATUS
    && Boolean(lookupResult?.mailerlite_api_called)
    && lookupResult?.mailerlite_api_call_scope === PACKET_SPECIFIC_READONLY_SCOPE;
  if (completedPacketSpecificLookup) blockers.push('existing_subscriber_path_not_supported_by_v1_guard');
  return normalizedDecision({
    packetId,
    checkRan: true,
    routeStatus,
    mailerLiteApiCalled: Boolean(lookupResult?.mailerlite_api_called),
    mailerLiteApiCallScope: lookupResult?.mailerlite_api_call_scope ?? 'fixture_mock_no_network',
    subscriberLookupStatus: 'found',
    subscriberStatusClass,
    onboardingGroupMembershipStatus: 'absent',
    duplicateReaddStatus: 'safe_new_or_not_in_group',
    suppressionStatus: 'pass',
    idempotencyStatus: 'pass',
    mutationReadinessAfterFinalCheck: completedPacketSpecificLookup
      ? 'blocked_existing_subscriber_path_not_supported_by_v1_guard'
      : 'ready_for_exact_mutation_approval',
    blockers,
  });
};

const normalizedDecision = (input) => {
  const routeStatus = input.routeStatus;
  const mailerLiteApiCalled = Boolean(input.mailerLiteApiCalled);
  const mailerLiteApiCallScope = input.mailerLiteApiCallScope ?? 'fixture_mock_no_network';
  const liveLookupRan = Boolean(input.liveLookupRan ?? (mailerLiteApiCalled && routeStatus === COMPLETED_LIVE_ROUTE_STATUS));
  const blockers = new Set(input.blockers ?? []);
  let mutationReadiness = ensureAllowed(input.mutationReadinessAfterFinalCheck, READINESS, 'blocked_route_not_redaction_safe');
  const subscriberLookupStatus = ensureAllowed(input.subscriberLookupStatus, LOOKUP_STATUS, 'unknown');
  const subscriberStatusClass = ensureAllowed(input.subscriberStatusClass, SUBSCRIBER_STATUS_CLASS, 'unknown');
  const onboardingGroupMembershipStatus = ensureAllowed(input.onboardingGroupMembershipStatus, GROUP_MEMBERSHIP_STATUS, 'unknown');
  const duplicateReaddStatus = ensureAllowed(input.duplicateReaddStatus, DUPLICATE_STATUS, 'unknown');
  const suppressionStatus = ensureAllowed(input.suppressionStatus, SAFETY_STATUS, 'unknown');
  const idempotencyStatus = ensureAllowed(input.idempotencyStatus, SAFETY_STATUS, 'unknown');
  if (mutationReadiness === 'ready_for_exact_mutation_approval') {
    const readyAllowed = routeStatus === COMPLETED_LIVE_ROUTE_STATUS
      && mailerLiteApiCalled
      && liveLookupRan
      && mailerLiteApiCallScope === PACKET_SPECIFIC_READONLY_SCOPE
      && ['found', 'not_found'].includes(subscriberLookupStatus)
      && ['active', 'not_found'].includes(subscriberStatusClass)
      && ['absent', 'not_found'].includes(onboardingGroupMembershipStatus)
      && duplicateReaddStatus === 'safe_new_or_not_in_group'
      && suppressionStatus === 'pass'
      && idempotencyStatus === 'pass'
      && blockers.size === 0;
    if (!readyAllowed) {
      blockers.add('ready_state_without_completed_live_lookup');
      mutationReadiness = 'blocked_route_not_redaction_safe';
    }
  }
  const blockerList = [...blockers].sort();
  return {
    packet_id: input.packetId,
    check_ran: Boolean(input.checkRan),
    live_lookup_ran: liveLookupRan,
    route_status: routeStatus,
    mailerlite_api_called: mailerLiteApiCalled,
    mailerlite_api_call_scope: mailerLiteApiCallScope,
    subscriber_lookup_status: subscriberLookupStatus,
    subscriber_status_class: subscriberStatusClass,
    onboarding_group_membership_status: onboardingGroupMembershipStatus,
    duplicate_readd_status: duplicateReaddStatus,
    suppression_status: suppressionStatus,
    idempotency_status: idempotencyStatus,
    mutation_readiness_after_final_check: mutationReadiness,
    blockers: blockerList,
    recommended_next_step: mutationReadiness === 'ready_for_exact_mutation_approval'
      ? 'prepare_exact_mailerlite_mutation_approval_packet'
      : mutationReadiness === 'blocked_missing_private_packet_email_anchor'
        ? 'repair_private_packet_email_anchor_or_regenerate_no_write_packet'
        : 'pause',
  };
};

const closedGates = () => ({
  mailerlite_ui_used: false,
  subscriber_rows_printed: false,
  subscriber_mutation: false,
  group_assignment: false,
  field_creation: false,
  automation_mutation: false,
  campaign_send: false,
  crm_source_writes: false,
  credential_values_printed: false,
  raw_payloads_printed: false,
  private_subscriber_content_printed: false,
  private_message_text_printed: false,
});

const finalCheckContractFieldsFor = ({ decision, completedAt }) => {
  const readyCandidate = {
    completed_at: completedAt,
    route_status: decision.route_status,
    live_lookup_ran: decision.live_lookup_ran,
    mailerlite_api_called: decision.mailerlite_api_called,
    mailerlite_api_call_scope: decision.mailerlite_api_call_scope,
    subscriber_lookup_status: decision.subscriber_lookup_status,
    subscriber_status_class: decision.subscriber_status_class,
    onboarding_group_membership_status: decision.onboarding_group_membership_status,
    duplicate_readd_status: decision.duplicate_readd_status,
    suppression_status: decision.suppression_status,
    idempotency_status: decision.idempotency_status,
    mutation_readiness_after_final_check: decision.mutation_readiness_after_final_check,
    blockers: decision.blockers,
    ...buildFinalCheckReadyContractFields({ completedAt }),
  };
  const validation = validateFinalCheckReadyReceipt(readyCandidate, {
    nowMs: Number.isNaN(Date.parse(completedAt)) ? Date.now() : Date.parse(completedAt),
    maxAgeMs: Number.POSITIVE_INFINITY,
  });
  return validation.ok
    ? buildFinalCheckReadyContractFields({ completedAt })
    : buildFinalCheckNotReadyContractFields({ completedAt });
};

const buildReceipt = ({ runId, decision, mode, privateResultPathLabels = [], completedAt = new Date().toISOString() }) => ({
  schema_version: SCHEMA_VERSION,
  run_id: runId,
  completed_at: completedAt,
  ...finalCheckContractFieldsFor({ decision, completedAt }),
  packet_id: decision.packet_id,
  check_ran: decision.check_ran,
  live_lookup_ran: decision.live_lookup_ran,
  route_status: decision.route_status,
  mode,
  command: COMMAND,
  mailerlite_api_called: decision.mailerlite_api_called,
  mailerlite_api_call_scope: decision.mailerlite_api_call_scope,
  subscriber_lookup_status: decision.subscriber_lookup_status,
  subscriber_status_class: decision.subscriber_status_class,
  onboarding_group_membership_status: decision.onboarding_group_membership_status,
  duplicate_readd_status: decision.duplicate_readd_status,
  suppression_status: decision.suppression_status,
  idempotency_status: decision.idempotency_status,
  mutation_readiness_after_final_check: decision.mutation_readiness_after_final_check,
  blockers: decision.blockers,
  recommended_next_step: decision.recommended_next_step,
  private_result_path_labels: privateResultPathLabels,
  closed_gates: closedGates(),
});

const buildPrivateResult = ({ runId, decision, mode }) => ({
  schema_version: `${SCHEMA_VERSION}-private-result`,
  run_id: runId,
  packet_id: decision.packet_id,
  mode,
  route_status: decision.route_status,
  check_ran: decision.check_ran,
  live_lookup_ran: decision.live_lookup_ran,
  private_lookup_material_included: false,
  raw_email_included: false,
  raw_ids_included: false,
  raw_payloads_included: false,
  subscriber_rows_included: false,
  result: {
    subscriber_lookup_status: decision.subscriber_lookup_status,
    subscriber_status_class: decision.subscriber_status_class,
    onboarding_group_membership_status: decision.onboarding_group_membership_status,
    duplicate_readd_status: decision.duplicate_readd_status,
    suppression_status: decision.suppression_status,
    idempotency_status: decision.idempotency_status,
    mutation_readiness_after_final_check: decision.mutation_readiness_after_final_check,
    blockers: decision.blockers,
  },
  closed_gates: closedGates(),
});

const renderMarkdown = (receipt) => `# MailerLite Final Idempotency / Suppression Check Redacted Receipt\n\n` +
  `- run_id: \`${receipt.run_id}\`\n` +
  `- completed_at: \`${receipt.completed_at}\`\n` +
  `- freshness_timestamp_status: \`${receipt.freshness_timestamp_status}\`\n` +
  `- receipt_contract_version: \`${receipt.receipt_contract_version}\`\n` +
  `- receipt_contract_check: \`${receipt.receipt_contract_check}\`\n` +
  `- receipt_contract_check_result: \`${receipt.receipt_contract_check_result}\`\n` +
  `- receipt_consistency_check: \`${receipt.receipt_consistency_check}\`\n` +
  `- packet_id: \`${receipt.packet_id}\`\n` +
  `- check_ran: \`${receipt.check_ran}\`\n` +
  `- live_lookup_ran: \`${receipt.live_lookup_ran}\`\n` +
  `- route_status: \`${receipt.route_status}\`\n` +
  `- mode: \`${receipt.mode}\`\n` +
  `- mailerlite_api_called: \`${receipt.mailerlite_api_called}\`\n` +
  `- mailerlite_api_call_scope: \`${receipt.mailerlite_api_call_scope}\`\n` +
  `- subscriber_lookup_status: \`${receipt.subscriber_lookup_status}\`\n` +
  `- subscriber_status_class: \`${receipt.subscriber_status_class}\`\n` +
  `- onboarding_group_membership_status: \`${receipt.onboarding_group_membership_status}\`\n` +
  `- duplicate_readd_status: \`${receipt.duplicate_readd_status}\`\n` +
  `- suppression_status: \`${receipt.suppression_status}\`\n` +
  `- idempotency_status: \`${receipt.idempotency_status}\`\n` +
  `- mutation_readiness_after_final_check: \`${receipt.mutation_readiness_after_final_check}\`\n` +
  `- blockers: \`${receipt.blockers.length ? receipt.blockers.join('; ') : 'none'}\`\n` +
  `- recommended_next_step: \`${receipt.recommended_next_step}\`\n\n` +
  `## Closed Gates\n\n` +
  Object.entries(receipt.closed_gates).map(([key, value]) => `- \`${key}\`: ${value}`).join('\n') +
  `\n`;

const renderPrivateMarkdown = (privateResult) => `# MailerLite Final Idempotency / Suppression Check Private Result\n\n` +
  `- run_id: \`${privateResult.run_id}\`\n` +
  `- packet_id: \`${privateResult.packet_id}\`\n` +
  `- route_status: \`${privateResult.route_status}\`\n` +
  `- check_ran: \`${privateResult.check_ran}\`\n` +
  `- live_lookup_ran: \`${privateResult.live_lookup_ran}\`\n` +
  `- private_lookup_material_included: \`false\`\n` +
  `- raw_email_included: \`false\`\n` +
  `- raw_ids_included: \`false\`\n` +
  `- raw_payloads_included: \`false\`\n` +
  `- subscriber_rows_included: \`false\`\n` +
  `- mutation_readiness_after_final_check: \`${privateResult.result.mutation_readiness_after_final_check}\`\n`;

const writeOutputs = async ({ paths, receipt, privateResult }) => {
  await mkdir(dirname(paths.privateResultJson), { recursive: true });
  await mkdir(dirname(paths.privateResultMd), { recursive: true });
  await mkdir(dirname(paths.redactedReceiptJson), { recursive: true });
  await mkdir(dirname(paths.redactedReceiptMd), { recursive: true });
  await writeFile(paths.privateResultJson, `${JSON.stringify(privateResult, null, 2)}\n`, 'utf8');
  await writeFile(paths.privateResultMd, renderPrivateMarkdown(privateResult), 'utf8');
  await writeFile(paths.redactedReceiptJson, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
  await writeFile(paths.redactedReceiptMd, renderMarkdown(receipt), 'utf8');
};

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'));

const compactStdout = (receipt) => ({
  ok: true,
  run_id: receipt.run_id,
  check_ran: receipt.check_ran,
  live_lookup_ran: receipt.live_lookup_ran,
  route_status: receipt.route_status,
  mailerlite_api_called: receipt.mailerlite_api_called,
  subscriber_lookup_status: receipt.subscriber_lookup_status,
  subscriber_status_class: receipt.subscriber_status_class,
  onboarding_group_membership_status: receipt.onboarding_group_membership_status,
  duplicate_readd_status: receipt.duplicate_readd_status,
  suppression_status: receipt.suppression_status,
  idempotency_status: receipt.idempotency_status,
  mutation_readiness_after_final_check: receipt.mutation_readiness_after_final_check,
  redacted_receipts_written: true,
});

const runFixtureMode = async (options, deps = {}) => {
  if (!options.fixtureFile) throw new Error('missing_fixture_file');
  const paths = validateFixtureOutputPaths(options, { roots: deps.roots });
  const fixture = await readJson(options.fixtureFile);
  const packet = fixture.packet ?? {};
  const lookupResult = fixture.lookupResult ?? fixture.mailerLiteLookup ?? {};
  const runId = fixture.run_id ?? 'crm_core_mailerlite_final_idempotency_suppression_check_fixture';
  const decision = buildDecision({ packet, lookupResult, routeStatus: 'fixture_mock_redaction_safe' });
  const privateResult = buildPrivateResult({ runId, decision, mode: 'fixture_mock' });
  const receipt = buildReceipt({ runId, decision, mode: 'fixture_mock', privateResultPathLabels: [paths.privateResultJson, paths.privateResultMd], completedAt: deps.completedAt });
  await writeOutputs({ paths, receipt, privateResult });
  return receipt;
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
    ], { timeout: 10_000, maxBuffer: 1024 * 1024 });
    const key = stdout.trim();
    return key ? { key } : null;
  } catch {
    return null;
  }
};

const getCredential = async (options) => {
  const keychain = await getKeychainSecret(options.service, options.account);
  if (keychain?.key) return { key: keychain.key };
  for (const name of ['MAILERLITE_API_KEY', 'MAILERLITE_TOKEN', 'ML_API_KEY']) {
    const key = process.env[name]?.trim();
    if (key) return { key };
  }
  return { key: null };
};

const classifyFailure = (status, bodyText = '') => {
  const text = bodyText.replace(/\s+/g, ' ').trim();
  if (status === 401 || /Unauthenticated|unauthorized|token is required/i.test(text)) return 'mailerlite_unauthenticated';
  if (status === 403 || /forbidden|permission/i.test(text)) return 'mailerlite_forbidden';
  if (status === 404 || /not found/i.test(text)) return 'mailerlite_not_found';
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

const MUTATION_PATH_PATTERNS = [
  /\/groups\/[^/]+\/subscribers/i,
  /\/subscribers\/[^/]+\/groups/i,
  /\/fields(?:\/|$)/i,
  /\/automations(?:\/|$)/i,
  /\/campaigns(?:\/|$)/i,
  /\/segments(?:\/|$)/i,
  /\/forms(?:\/|$)/i,
  /\/webhooks(?:\/|$)/i,
];

const assertSafeFinalCheckRequest = ({ method = 'GET', path }) => {
  const upper = String(method).toUpperCase();
  if (upper !== 'GET') throw new Error('blocked_route_not_redaction_safe');
  if (!path || typeof path !== 'string') throw new Error('blocked_route_not_redaction_safe');
  if (MUTATION_PATH_PATTERNS.some((pattern) => pattern.test(path))) throw new Error('blocked_route_not_redaction_safe');
  if (!/^\/subscribers\/[^/?#]+(?:\?|$)/i.test(path)) throw new Error('blocked_route_not_redaction_safe');
};

const fetchJson = async ({ options, key, path, params = {}, fetchImpl = fetch }) => {
  assertSafeFinalCheckRequest({ method: 'GET', path });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
  try {
    const response = await fetchImpl(urlWithParams(options.apiBase, path, params), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${key}`,
        Accept: 'application/json',
        'User-Agent': 'CRM-Core-MailerLite-Final-Idempotency-Suppression-Check/1.0',
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let payload = {};
    try { payload = text ? JSON.parse(text) : {}; } catch { payload = {}; }
    if (!response.ok) {
      const reason = classifyFailure(response.status, text);
      const error = new Error(reason);
      error.status = response.status;
      error.reason = reason;
      throw error;
    }
    return payload;
  } catch (error) {
    if (error?.reason || error?.message === 'blocked_route_not_redaction_safe') throw error;
    const reason = classifyFailure(0, error instanceof Error ? error.message : String(error));
    const wrapped = new Error(reason);
    wrapped.status = 0;
    wrapped.reason = reason;
    throw wrapped;
  } finally {
    clearTimeout(timeout);
  }
};

const extractSubscriberRecords = (payload) => {
  if (!payload || typeof payload !== 'object') return [];
  if (Array.isArray(payload)) return payload.filter((item) => item && typeof item === 'object');
  if (payload.data && !Array.isArray(payload.data) && typeof payload.data === 'object') return [payload.data];
  for (const key of ['data', 'subscribers', 'items', 'results']) {
    if (Array.isArray(payload[key])) return payload[key].filter((item) => item && typeof item === 'object');
  }
  return [payload];
};

const createMailerLiteFinalCheckClient = ({ options, key, fetchImpl = fetch, calls = [] }) => ({
  calls,
  lookupSubscriberByEmail: async (email) => {
    if (!email) return { subscriber_lookup_status: 'blocked', records: [], mailerlite_api_called: false, mailerlite_api_call_scope: MISSING_EMAIL_SCOPE };
    const path = `/subscribers/${encodeURIComponent(email)}`;
    assertSafeFinalCheckRequest({ method: 'GET', path });
    calls.push({ method: 'GET', path: '/subscribers/<private-email-anchor>' });
    try {
      const payload = await fetchJson({ options, key, path, params: { include: 'groups' }, fetchImpl });
      return { subscriber_lookup_status: 'found', records: extractSubscriberRecords(payload), mailerlite_api_called: true, mailerlite_api_call_scope: PACKET_SPECIFIC_READONLY_SCOPE };
    } catch (error) {
      if (error?.reason === 'mailerlite_not_found' || error?.status === 404) {
        return { subscriber_lookup_status: 'not_found', records: [], mailerlite_api_called: true, mailerlite_api_call_scope: PACKET_SPECIFIC_READONLY_SCOPE };
      }
      throw error;
    }
  },
});

const runLiveMode = async (options, deps = {}) => {
  const paths = validateLivePrechecks(options, { roots: deps.roots });
  const packet = await readJson(paths.privatePacketJson);
  const email = privateEmailForLookup(packet);
  if (!email) {
    const decision = buildDecision({ packet, lookupResult: { subscriber_lookup_status: 'blocked', records: [], mailerlite_api_called: false, mailerlite_api_call_scope: MISSING_EMAIL_SCOPE }, routeStatus: PRECHECK_MISSING_EMAIL_ROUTE_STATUS });
    const runId = deps.runId ?? 'crm_core_mailerlite_final_idempotency_suppression_check_2026-07-06';
    const privateResult = buildPrivateResult({ runId, decision, mode: 'live_readonly_precheck' });
    const receipt = buildReceipt({ runId, decision, mode: 'live_readonly_precheck', privateResultPathLabels: [paths.privateResultJson, paths.privateResultMd], completedAt: deps.completedAt });
    await writeOutputs({ paths, receipt, privateResult });
    return receipt;
  }

  const credentialProvider = deps.credentialProvider ?? getCredential;
  const credential = await credentialProvider(options);
  if (!credential?.key) {
    const error = new Error('blocked_missing_mailerlite_credential');
    error.exitCode = 2;
    throw error;
  }
  const client = deps.finalCheckClient ?? createMailerLiteFinalCheckClient({
    options,
    key: credential.key,
    fetchImpl: deps.fetchImpl ?? fetch,
    calls: deps.calls ?? [],
  });
  const lookupResult = await client.lookupSubscriberByEmail(email);
  const decision = buildDecision({ packet, lookupResult, routeStatus: COMPLETED_LIVE_ROUTE_STATUS });
  const runId = deps.runId ?? 'crm_core_mailerlite_final_idempotency_suppression_check_2026-07-06';
  const privateResult = buildPrivateResult({ runId, decision, mode: 'live_readonly_packet_specific' });
  const receipt = buildReceipt({ runId, decision, mode: 'live_readonly_packet_specific', privateResultPathLabels: [paths.privateResultJson, paths.privateResultMd], completedAt: deps.completedAt });
  await writeOutputs({ paths, receipt, privateResult });
  return receipt;
};

const run = async (argv = process.argv.slice(2), deps = {}) => {
  const options = parseArgs(argv);
  if (options.help) {
    console.log(usage);
    return { ok: true, help: true };
  }
  const receipt = options.fixtureFile ? await runFixtureMode(options, deps) : await runLiveMode(options, deps);
  console.log(JSON.stringify(compactStdout(receipt)));
  return receipt;
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run().catch((error) => {
    console.log(JSON.stringify({ ok: false, status: 'blocked', reason: error?.message ?? 'unknown_error' }));
    process.exitCode = Number.isInteger(error?.exitCode) ? error.exitCode : 1;
  });
}

export {
  COMPLETED_LIVE_ROUTE_STATUS,
  DEFAULT_TARGET_GROUP_LABEL,
  MISSING_EMAIL_SCOPE,
  PACKET_SPECIFIC_READONLY_SCOPE,
  PRECHECK_MISSING_EMAIL_ROUTE_STATUS,
  PRIVATE_MAILERLITE_ROOT,
  REDACTED_RECEIPT_ROOT,
  REPO_ROOT,
  assertSafeFinalCheckRequest,
  buildDecision,
  buildReceipt,
  createMailerLiteFinalCheckClient,
  packetEmailAnchorPresent,
  privateEmailForLookup,
  renderMarkdown,
  run,
  validateFixtureOutputPaths,
  validateLivePrechecks,
};
