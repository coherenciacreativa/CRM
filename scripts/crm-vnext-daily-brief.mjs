#!/usr/bin/env node
import { access, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/community-daily-brief';
const DEFAULT_MARKDOWN_PATH = '.crm-vnext/daily-brief/latest.md';
const DEFAULT_JSON_PATH = '.crm-vnext/daily-brief/latest.json';

const usage = `Usage:
  node scripts/crm-vnext-daily-brief.mjs [options]

Options:
  --api-url <url>                 Daily brief API URL. Defaults to ${DEFAULT_API_URL}
  --previous-snapshot-path <path> Local previous queue snapshot path
  --focus-queue-limit <n>         Focus queues to include. Default 3, max 5
  --people-per-queue <n>          People per focus queue. Default 3, max 10
  --markdown-path <path>          Markdown output path. Defaults to ${DEFAULT_MARKDOWN_PATH}
  --json-path <path>              JSON output path. Defaults to ${DEFAULT_JSON_PATH}
  --write                         Write markdown and JSON locally
  --fail-on-notify                Exit with code 2 when notify queues exist
  --help                          Show this help

This script is local-only. It does not send Telegram, Instagram, email, WhatsApp, or any other outbound message.`;

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    previousSnapshotPath: null,
    focusQueueLimit: 3,
    peoplePerQueue: 3,
    markdownPath: DEFAULT_MARKDOWN_PATH,
    jsonPath: DEFAULT_JSON_PATH,
    write: false,
    failOnNotify: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--fail-on-notify') {
      options.failOnNotify = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--previous-snapshot-path') {
      options.previousSnapshotPath = argv[++index];
    } else if (arg === '--focus-queue-limit') {
      options.focusQueueLimit = cleanInt(argv[++index], 3, 5);
    } else if (arg === '--people-per-queue') {
      options.peoplePerQueue = cleanInt(argv[++index], 3, 10);
    } else if (arg === '--markdown-path') {
      options.markdownPath = argv[++index];
    } else if (arg === '--json-path') {
      options.jsonPath = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  return options;
};

const cleanInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const fileExists = async (filePath) => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const buildApiUrl = async (options) => {
  const url = new URL(options.apiUrl);
  url.searchParams.set('focusQueueLimit', String(options.focusQueueLimit));
  url.searchParams.set('peoplePerQueue', String(options.peoplePerQueue));

  if (options.previousSnapshotPath) {
    const absoluteSnapshotPath = resolve(options.previousSnapshotPath);
    if (await fileExists(absoluteSnapshotPath)) {
      url.searchParams.set('previousSnapshotPath', absoluteSnapshotPath);
    }
  }

  return url;
};

const label = (value) =>
  String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identityFor = (person) =>
  person.displayName ||
  person.identities?.email ||
  person.identities?.instagramHandle ||
  person.personId;

const formatEngagementAction = (action) =>
  [
    `- ${action.label}`,
    `count ${action.count}`,
    `category ${label(action.category)}`,
    `review ${action.reviewRequired ? 'yes' : 'no'}`,
    `outbound approval ${action.outboundApprovalRequired ? 'yes' : 'no'}`,
    action.representativeReason ? `reason ${action.representativeReason}` : null,
  ].filter(Boolean).join(' | ');

const formatMarkdown = (payload) => {
  const brief = payload.brief;
  const source = payload.source;
  const snapshot = payload.snapshot;
  const lines = [
    '# CRM vNext Daily Brief',
    '',
    `Generated: ${brief.generatedAt}`,
    `Mode: ${brief.mode}`,
    '',
    '## Source',
    `- Local cards: ${source.cards}`,
    `- Source generated at: ${source.generatedAt ?? 'unknown'}`,
    `- Previous queue snapshot: ${snapshot.previousLoaded ? snapshot.previousGeneratedAt ?? 'loaded' : 'not loaded'}`,
    '',
    '## Community',
    `- People: ${brief.summary.totals.cards}`,
    `- Email present: ${brief.summary.totals.emailPresent}`,
    `- Instagram present: ${brief.summary.totals.instagramPresent}`,
    `- Omnichannel: ${brief.summary.totals.omnichannel}`,
    `- Missing email with Instagram: ${brief.summary.identityGaps.missingEmailWithInstagram}`,
    `- Missing Instagram with email: ${brief.summary.identityGaps.missingInstagramWithEmail}`,
    '',
    '## Queue Status',
    `- Notify: ${brief.queues.totals.notify}`,
    `- Watch: ${brief.queues.totals.watch}`,
    `- Ok: ${brief.queues.totals.ok}`,
    '',
    '## Highlights',
    ...brief.highlights.map((highlight) => `- [${label(highlight.level)}] ${highlight.title}: ${highlight.detail}`),
    '',
    '## Next Steps',
    ...(brief.nextSteps.length
      ? brief.nextSteps.map((step) => `- [${label(step.priority)} | ${label(step.owner)}] ${step.action} Approval: ${step.requiresApproval ? 'yes' : 'no'}.`)
      : ['- No next steps selected.']),
    '',
  ];

  if (brief.engagement) {
    lines.push(
      '## Engagement Actions',
      `- Movement rows: ${brief.engagement.totals.rows}`,
      `- Unmatched rows: ${brief.engagement.totals.unmatchedRows}`,
      `- Review rows: ${brief.engagement.totals.reviewRows}`,
      `- Latest captured at: ${brief.engagement.source.latestCapturedAt ?? 'unknown'}`,
      `- Operator note: ${brief.engagement.operatorNote}`,
      '',
      'Top actions:',
      ...(brief.engagement.topActions.length
        ? brief.engagement.topActions.map(formatEngagementAction)
        : ['- No engagement actions available.']),
      '',
    );
  }

  lines.push('## Focus Queues');

  for (const focusQueue of brief.focusQueues) {
    lines.push(
      '',
      `### ${focusQueue.queue.title}`,
      `- Status: ${label(focusQueue.queue.status?.level ?? 'ok')}`,
      `- Matched: ${focusQueue.queue.counts.matched}`,
      `- Shown: ${focusQueue.queue.counts.returned}`,
      `- Purpose: ${focusQueue.queue.purpose}`,
      `- Operator note: ${focusQueue.queue.operatorNote}`,
      '',
      'People:',
      ...(focusQueue.people.length
        ? focusQueue.people.map((person) =>
            [
              `- ${identityFor(person)}`,
              `stage ${person.stage.label}`,
              `priority ${person.scores.priority}`,
              `action ${label(person.nextAction.code)}`,
            ].join(' | '),
          )
        : ['- No people returned.']),
    );
  }

  lines.push(
    '',
    '## Safety',
    '- Read-only local brief.',
    '- No outbound messages.',
    '- No record mutation.',
    ...brief.safety.prohibitedActions.map((action) => `- ${action}`),
    '',
  );

  return lines.join('\n');
};

const writeTextFile = async (filePath, text) => {
  const absolutePath = resolve(filePath);
  await mkdir(dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, text, 'utf8');
  return absolutePath;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const apiUrl = await buildApiUrl(options);
  const headers = {};
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    headers['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`daily_brief_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`daily_brief_api_error:${payload.error ?? 'unknown'}`);
  }

  const markdown = formatMarkdown(payload);
  const writes = {
    markdownPath: null,
    jsonPath: null,
  };

  if (options.write) {
    writes.markdownPath = await writeTextFile(options.markdownPath, `${markdown.trimEnd()}\n`);
    writes.jsonPath = await writeTextFile(options.jsonPath, `${JSON.stringify(payload, null, 2)}\n`);
  }

  console.log(JSON.stringify({
    ok: true,
    mode: options.write ? 'write' : 'dry-run',
    generatedAt: payload.brief.generatedAt,
    cards: payload.source.cards,
    queues: payload.brief.queues.totals,
    focusQueues: payload.brief.focusQueues.map((queue) => ({
      id: queue.queue.id,
      matched: queue.queue.counts.matched,
      shown: queue.queue.counts.returned,
      status: queue.queue.status?.level ?? 'ok',
    })),
    engagementActions: payload.brief.engagement
      ? {
          rows: payload.brief.engagement.totals.rows,
          unmatchedRows: payload.brief.engagement.totals.unmatchedRows,
          reviewRows: payload.brief.engagement.totals.reviewRows,
          byAction: payload.brief.engagement.byAction,
        }
      : null,
    writes,
    markdownPreview: markdown.split('\n').slice(0, 12),
  }, null, 2));

  if (payload.brief.queues.totals.notify > 0 && options.failOnNotify) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext daily brief failed: ${error.message}`);
  process.exitCode = 1;
});
