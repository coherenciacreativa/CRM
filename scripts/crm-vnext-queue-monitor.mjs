#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/community-queues';
const DEFAULT_SNAPSHOT_PATH = '.crm-vnext/community-queue-snapshot.json';

const usage = `Usage:
  node scripts/crm-vnext-queue-monitor.mjs [options]

Options:
  --api-url <url>             Queue API URL. Defaults to ${DEFAULT_API_URL}
  --snapshot-path <path>      Local snapshot path. Defaults to CRM_VNEXT_QUEUE_SNAPSHOT_PATH or ${DEFAULT_SNAPSHOT_PATH}
  --write-snapshot            Persist snapshot.current locally
  --alert-output-path <path>  Write alert payload locally when notify queues exist
  --fail-on-notify            Exit with code 2 when an Alejandro alert is needed
  --help                      Show this help

This script is local-only. It does not send Telegram, Instagram, email, WhatsApp, or any other outbound message.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    snapshotPath: process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH || DEFAULT_SNAPSHOT_PATH,
    writeSnapshot: false,
    alertOutputPath: null,
    failOnNotify: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--write-snapshot') {
      options.writeSnapshot = true;
    } else if (arg === '--fail-on-notify') {
      options.failOnNotify = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--snapshot-path') {
      options.snapshotPath = argv[++index];
    } else if (arg === '--alert-output-path') {
      options.alertOutputPath = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  if (!options.snapshotPath) throw new Error('missing_snapshot_path');
  return options;
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const buildApiUrl = async (apiUrl, snapshotPath) => {
  const url = new URL(apiUrl);
  const absoluteSnapshotPath = resolve(snapshotPath);
  if (await fileExists(absoluteSnapshotPath)) {
    url.searchParams.set('previousSnapshotPath', absoluteSnapshotPath);
  }
  return url;
};

const writeJsonFile = async (filePath, payload) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  return absolutePath;
};

const buildAlert = (payload) => {
  const alertStatuses = (payload.status?.statuses ?? []).filter(
    (status) => status.level === 'notify' && status.shouldAlertAlejandro && status.alertAction,
  );
  if (alertStatuses.length === 0) return null;

  const queueList = alertStatuses
    .map((status) => `${status.title}: ${status.matched}`)
    .join('; ');

  return {
    title: 'CRM vNext queue alert',
    message: `CRM vNext requires review: ${queueList}.`,
    generatedAt: payload.status.generatedAt,
    statuses: alertStatuses.map((status) => ({
      id: status.id,
      title: status.title,
      matched: status.matched,
      level: status.level,
      reason: status.reason,
      alertAction: status.alertAction,
    })),
  };
};

const buildReport = (payload, options, writes) => {
  const alert = buildAlert(payload);
  return {
    ok: true,
    generatedAt: payload.status?.generatedAt ?? new Date().toISOString(),
    mode: options.writeSnapshot ? 'write-snapshot' : 'dry-run',
    totals: payload.status?.totals ?? null,
    snapshot: {
      previousLoaded: Boolean(payload.snapshot?.previousLoaded),
      previousGeneratedAt: payload.snapshot?.previousGeneratedAt ?? null,
      written: writes.snapshotWritten,
      path: writes.snapshotPath,
    },
    alert: {
      shouldAlertAlejandro: Boolean(alert),
      written: writes.alertWritten,
      path: writes.alertPath,
      payload: alert,
    },
  };
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const apiUrl = await buildApiUrl(options.apiUrl, options.snapshotPath);
  const headers = {};
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    headers['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`queue_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`queue_api_error:${payload.error ?? 'unknown'}`);
  }

  const writes = {
    snapshotWritten: false,
    snapshotPath: null,
    alertWritten: false,
    alertPath: null,
  };

  if (options.writeSnapshot) {
    if (!payload.snapshot?.current) throw new Error('missing_current_snapshot');
    writes.snapshotPath = await writeJsonFile(options.snapshotPath, payload.snapshot.current);
    writes.snapshotWritten = true;
  }

  const alert = buildAlert(payload);
  if (alert && options.alertOutputPath) {
    writes.alertPath = await writeJsonFile(options.alertOutputPath, alert);
    writes.alertWritten = true;
  }

  const report = buildReport(payload, options, writes);
  console.log(JSON.stringify(report, null, 2));

  if (alert && options.failOnNotify) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext queue monitor failed: ${error.message}`);
  process.exitCode = 1;
});
