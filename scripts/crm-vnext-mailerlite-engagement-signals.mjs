#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { buildCrmVNextMailerLiteEngagementSignals } from '../lib/crm/crm-vnext-mailerlite-engagement-signals.js';

const REDACTED_SUMMARY_SCHEMA_VERSION = 'crm-vnext-mailerlite-engagement-redacted-summary-2026-06-04';

const usage = `Usage:
  node scripts/crm-vnext-mailerlite-engagement-signals.mjs --snapshot-file <path> [options]

Options:
  --snapshot-file <path>  JSON from Mantis/MailerLite export with subscriber or campaign activity rows
  --window-days <n>       Engagement window for nested campaign activity. Defaults to 30
  --observed-at <iso>     Override observedAt for records that do not include one
  --out <path>            Write engagement-signals JSON to a local file
  --redacted-summary      Emit aggregate-only JSON; omit signal rows, skipped rows, and identity values
  --fail-on-empty         Exit non-zero when no signals are produced
  --help                  Show this help

This command is read-only. It converts supplied MailerLite subscriber/campaign engagement snapshots into
crm:vnext:engagement-signal-preview input. It never calls MailerLite, reads credentials, mutates subscribers,
mutates CRM cards, writes Fact Store, or sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    snapshotFile: null,
    windowDays: 30,
    observedAt: null,
    out: null,
    redactedSummary: false,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--snapshot-file') options.snapshotFile = argv[++index];
    else if (arg === '--window-days') options.windowDays = Number(argv[++index]);
    else if (arg === '--observed-at') options.observedAt = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--redacted-summary') options.redactedSummary = true;
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.snapshotFile) throw new Error('snapshot_file_required');
  if (!Number.isFinite(options.windowDays) || options.windowDays < 1) throw new Error('invalid_window_days');
  return options;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const writeJson = async (filePath, value) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const compactReport = (report) => ({
  ok: true,
  mode: report.mode,
  schemaVersion: report.schemaVersion,
  generatedAt: report.generatedAt,
  windowDays: report.windowDays,
  summary: report.summary,
  signals: report.signals,
  skippedRecords: report.skippedRecords,
  safety: report.safety,
});

const countBy = (items, picker) => items.reduce((counts, item) => {
  const key = picker(item) ?? 'unknown';
  counts[key] = (counts[key] ?? 0) + 1;
  return counts;
}, {});

const countPresent = (items, key) => items.filter((item) => item[key] !== null && item[key] !== undefined).length;

const sumNumber = (items, key) => items.reduce((total, item) => (
  typeof item[key] === 'number' && Number.isFinite(item[key]) ? total + item[key] : total
), 0);

const latestIso = (items, key) => {
  let latest = null;
  for (const item of items) {
    const value = item[key];
    if (!value) continue;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) continue;
    if (!latest || date.getTime() > new Date(latest).getTime()) latest = date.toISOString();
  }
  return latest;
};

const redactedSummaryReport = (report) => {
  const adapterOutputRecords = report.signals;
  const recordsSkippedByReason = countBy(report.skippedRecords, (record) => record.reason);
  const statusCounts = countBy(adapterOutputRecords, (record) => record.subscriberStatus ?? 'unknown');
  const blockerClasses = [
    report.summary.recordsRead === 0 ? 'no_records_inspected' : null,
    report.summary.signalsGenerated === 0 ? 'no_adapter_output_records' : null,
    report.summary.skippedRecords > 0 ? 'missing_match_identity' : null,
  ].filter(Boolean);

  return {
    ok: true,
    mode: 'read_only_mailerlite_engagement_adapter_redacted_summary',
    schemaVersion: REDACTED_SUMMARY_SCHEMA_VERSION,
    generatedAt: report.generatedAt,
    windowDays: report.windowDays,
    aggregateCounts: {
      recordsInspected: report.summary.recordsRead,
      adapterOutputRecords: report.summary.signalsGenerated,
      recordsSkipped: report.summary.skippedRecords,
      subscriberActivityRecords: report.summary.subscriberSignals,
      campaignActivityRecords: report.summary.campaignSignals,
      suppressedSubscriberRecords: report.summary.suppressedSubscribers,
      liveApiCallsPerformed: report.summary.liveApiCallsPerformed,
      credentialsRead: report.summary.credentialsRead,
      operationsExecuted: report.summary.operationsExecuted,
    },
    identityCoverage: {
      usableIdentityCount: adapterOutputRecords.length,
      missingIdentityCount: report.summary.skippedRecords,
      recordsWithEmailAnchor: countPresent(adapterOutputRecords, 'email'),
      recordsWithInstagramAnchor: countPresent(adapterOutputRecords, 'instagramHandle'),
      recordsWithPhoneAnchor: countPresent(adapterOutputRecords, 'phone'),
      recordsWithPersonIdAnchor: countPresent(adapterOutputRecords, 'personId'),
    },
    recordsSkippedByReason,
    fieldAvailability: {
      engagement: {
        opens30d: countPresent(adapterOutputRecords, 'opens30d'),
        clicks30d: countPresent(adapterOutputRecords, 'clicks30d'),
        opens90d: countPresent(adapterOutputRecords, 'opens90d'),
        clicks90d: countPresent(adapterOutputRecords, 'clicks90d'),
        lifetimeOpens: countPresent(adapterOutputRecords, 'lifetimeOpens'),
        lifetimeClicks: countPresent(adapterOutputRecords, 'lifetimeClicks'),
        lifetimeSent: countPresent(adapterOutputRecords, 'lifetimeSent'),
        openRate: countPresent(adapterOutputRecords, 'openRate'),
        clickRate: countPresent(adapterOutputRecords, 'clickRate'),
      },
      status: {
        subscriberStatus: countPresent(adapterOutputRecords, 'subscriberStatus'),
        suppressionStatusCounts: {
          unsubscribed: statusCounts.unsubscribed ?? 0,
          bounced: statusCounts.bounced ?? 0,
          complained: statusCounts.complained ?? 0,
        },
      },
      freshness: {
        observedAt: countPresent(adapterOutputRecords, 'observedAt'),
        lastOpenAt: countPresent(adapterOutputRecords, 'lastOpenAt'),
        lastClickAt: countPresent(adapterOutputRecords, 'lastClickAt'),
        subscribedAt: countPresent(adapterOutputRecords, 'subscribedAt'),
      },
    },
    freshness: {
      latestObservedAt: latestIso(adapterOutputRecords, 'observedAt'),
      latestOpenAt: latestIso(adapterOutputRecords, 'lastOpenAt'),
      latestClickAt: latestIso(adapterOutputRecords, 'lastClickAt'),
      latestSubscribedAt: latestIso(adapterOutputRecords, 'subscribedAt'),
    },
    aggregateEngagementCounts: {
      opens30d: sumNumber(adapterOutputRecords, 'opens30d'),
      clicks30d: sumNumber(adapterOutputRecords, 'clicks30d'),
      opens90d: sumNumber(adapterOutputRecords, 'opens90d'),
      clicks90d: sumNumber(adapterOutputRecords, 'clicks90d'),
      lifetimeOpens: sumNumber(adapterOutputRecords, 'lifetimeOpens'),
      lifetimeClicks: sumNumber(adapterOutputRecords, 'lifetimeClicks'),
      lifetimeSent: sumNumber(adapterOutputRecords, 'lifetimeSent'),
      recordsWithRepeatedOpens: adapterOutputRecords.filter((record) => (
        (record.opens30d ?? 0) > 1 || (record.opens90d ?? 0) > 1 || (record.lifetimeOpens ?? 0) > 1
      )).length,
      recordsWithRepeatedClicks: adapterOutputRecords.filter((record) => (
        (record.clicks30d ?? 0) > 1 || (record.clicks90d ?? 0) > 1 || (record.lifetimeClicks ?? 0) > 1
      )).length,
    },
    suppressionStatusCounts: {
      active: statusCounts.active ?? 0,
      unsubscribed: statusCounts.unsubscribed ?? 0,
      bounced: statusCounts.bounced ?? 0,
      complained: statusCounts.complained ?? 0,
      unknown: statusCounts.unknown ?? 0,
    },
    blockerClasses,
    dryRunProcessingEligible: report.summary.signalsGenerated > 0,
    outputPolicy: {
      redactedAggregateOnly: true,
      subscriberLevelArraysOmitted: true,
      identityAnchorValuesOmitted: true,
      rawRowsOmitted: true,
      groupTagSegmentDetailOmitted: true,
      campaignBodiesOmitted: true,
    },
    safetyFlags: {
      readOnly: report.safety.readOnly,
      outboundProhibited: report.safety.outboundProhibited,
      cardMutationProhibited: report.safety.cardMutationProhibited,
      factStoreWriteProhibited: report.safety.factStoreWriteProhibited,
      credentialReadProhibited: report.safety.credentialReadProhibited,
      liveApiCallsProhibited: report.safety.liveApiCallsProhibited,
      mailerLiteMutationProhibited: report.safety.mailerLiteMutationProhibited,
    },
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const snapshot = await readJson(options.snapshotFile);
  const report = buildCrmVNextMailerLiteEngagementSignals({
    snapshot,
    windowDays: options.windowDays,
    observedAt: options.observedAt,
  });
  const compact = options.redactedSummary ? redactedSummaryReport(report) : compactReport(report);
  const serialized = JSON.stringify(compact, null, 2);
  console.log(serialized);
  if (options.out) await writeJson(options.out, compact);
  if (options.failOnEmpty && report.summary.signalsGenerated === 0) process.exitCode = 2;
};

main().catch((error) => {
  console.error(`crm-vnext mailerlite-engagement-signals failed: ${error.message}`);
  process.exitCode = 1;
});
