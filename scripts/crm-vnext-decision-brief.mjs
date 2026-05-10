#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const DEFAULT_API_URL = 'http://localhost:3000/api/crm-vnext/community-decision-brief';
const DEFAULT_MARKDOWN_PATH = '.crm-vnext/decision-brief/latest.md';
const DEFAULT_JSON_PATH = '.crm-vnext/decision-brief/latest.json';
const QUEUE_IDS = new Set([
  'ig_without_email',
  'email_engaged',
  'human_review_required',
  'identity_stitching',
  'commercial_follow_up',
]);

const usage = `Usage:
  node scripts/crm-vnext-decision-brief.mjs --queue-id <queueId> [options]

Options:
  --queue-id <queueId>       Required. One CRM vNext queue id
  --api-url <url>            Decision brief API URL. Defaults to ${DEFAULT_API_URL}
  --limit <n>                Candidates to include. Default 5, max 10
  --markdown-path <path>     Markdown output path. Defaults to ${DEFAULT_MARKDOWN_PATH}
  --json-path <path>         JSON output path. Defaults to ${DEFAULT_JSON_PATH}
  --write                    Write markdown and JSON locally
  --fail-on-decision         Exit with code 2 when Alejandro decision is required
  --help                     Show this help

This script is local-only. It does not send Telegram, Instagram, email, WhatsApp, ManyChat, or any other outbound message.`;

const cleanInt = (value, fallback, max) => {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(parsed, max);
};

const parseArgs = (argv) => {
  const options = {
    apiUrl: DEFAULT_API_URL,
    queueId: null,
    limit: 5,
    markdownPath: DEFAULT_MARKDOWN_PATH,
    jsonPath: DEFAULT_JSON_PATH,
    write: false,
    failOnDecision: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') {
      options.help = true;
    } else if (arg === '--write') {
      options.write = true;
    } else if (arg === '--fail-on-decision') {
      options.failOnDecision = true;
    } else if (arg === '--api-url') {
      options.apiUrl = argv[++index];
    } else if (arg === '--queue-id') {
      options.queueId = argv[++index];
    } else if (arg === '--limit') {
      options.limit = cleanInt(argv[++index], 5, 10);
    } else if (arg === '--markdown-path') {
      options.markdownPath = argv[++index];
    } else if (arg === '--json-path') {
      options.jsonPath = argv[++index];
    } else {
      throw new Error(`unknown_arg:${arg}`);
    }
  }

  if (!options.apiUrl) throw new Error('missing_api_url');
  if (!options.help && !QUEUE_IDS.has(options.queueId)) {
    throw new Error('missing_or_invalid_queue_id');
  }
  return options;
};

const buildApiUrl = (options) => {
  const url = new URL(options.apiUrl);
  url.searchParams.set('queueId', options.queueId);
  url.searchParams.set('limit', String(options.limit));
  return url;
};

const label = (value) =>
  String(value)
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identityFor = (candidate) =>
  candidate.displayName ||
  candidate.identities?.email ||
  candidate.identities?.instagramHandle ||
  candidate.personId;

const formatList = (items, empty) =>
  items?.length ? items.map((item) => `  - ${item}`) : [`  - ${empty}`];

const formatOption = (option) => [
  `### ${option.title}`,
  `- Id: ${option.id}`,
  `- Approval required: ${option.approvalRequired ? 'yes' : 'no'}`,
  `- Description: ${option.description}`,
  '- Allowed without approval:',
  ...formatList(option.allowedWithoutApproval, 'None.'),
  '- Blocked until approval:',
  ...formatList(option.blockedUntilApproval, 'None.'),
];

const formatCandidate = (candidate) => [
  `### ${identityFor(candidate)}`,
  `- Person id: ${candidate.personId}`,
  `- Stage: ${candidate.stage.label}`,
  `- Priority: ${candidate.scores.priority}`,
  `- Next action: ${label(candidate.nextAction.code)}`,
  `- Requires human review: ${candidate.nextAction.requiresHumanReview ? 'yes' : 'no'}`,
  `- Decision need: ${label(candidate.decisionNeed)}`,
  `- Suggested internal next step: ${candidate.suggestedInternalNextStep}`,
  candidate.topProductFit?.length
    ? `- Product fit: ${candidate.topProductFit.map((item) => `${label(item.key)} ${item.score}`).join(', ')}`
    : '- Product fit: none',
  '- Primary signals:',
  ...formatList(candidate.primarySignals, 'No primary signals returned.'),
  '- Risks:',
  ...formatList(candidate.risks, 'No risks returned.'),
  '- Evidence sources:',
  ...formatList(candidate.evidenceSources, 'No evidence sources returned.'),
];

const formatMarkdown = (payload) => {
  const brief = payload.brief;
  const source = payload.source;
  const lines = [
    '# CRM vNext Decision Brief',
    '',
    `Generated: ${brief.generatedAt}`,
    `Mode: ${brief.mode}`,
    '',
    '## Source',
    `- Local cards: ${source.cards}`,
    `- Source generated at: ${source.generatedAt ?? 'unknown'}`,
    '',
    '## Queue',
    `- Id: ${brief.queue.id}`,
    `- Title: ${brief.queue.title}`,
    `- Status: ${label(brief.queue.status?.level ?? 'ok')}`,
    `- Matched: ${brief.queue.counts.matched}`,
    `- Shown: ${brief.queue.counts.returned}`,
    `- Purpose: ${brief.queue.purpose}`,
    `- Operator note: ${brief.queue.operatorNote}`,
    '',
    '## Decision',
    `- Urgency: ${label(brief.summary.urgency)}`,
    `- Requires Alejandro decision: ${brief.summary.requiresAlejandroDecision ? 'yes' : 'no'}`,
    `- Recommended question: ${brief.summary.recommendedQuestion}`,
    `- Approval boundary: ${brief.summary.approvalBoundary}`,
    '',
    '## Options',
  ];

  for (const option of brief.decisionOptions) {
    lines.push('', ...formatOption(option));
  }

  lines.push('', '## Candidates');
  if (brief.candidates.length) {
    for (const candidate of brief.candidates) {
      lines.push('', ...formatCandidate(candidate));
    }
  } else {
    lines.push('- No candidates returned.');
  }

  lines.push(
    '',
    '## Safety',
    '- Read-only decision brief.',
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

  const apiUrl = buildApiUrl(options);
  const headers = {};
  if (process.env.CRM_VNEXT_INSIGHTS_TOKEN) {
    headers['x-crm-vnext-token'] = process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  }

  const response = await fetch(apiUrl, { headers });
  if (!response.ok) {
    throw new Error(`decision_brief_api_failed:${response.status}`);
  }

  const payload = await response.json();
  if (!payload.ok) {
    throw new Error(`decision_brief_api_error:${payload.error ?? 'unknown'}`);
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
    queue: {
      id: payload.brief.queue.id,
      matched: payload.brief.queue.counts.matched,
      shown: payload.brief.queue.counts.returned,
      status: payload.brief.queue.status?.level ?? 'ok',
    },
    decision: {
      urgency: payload.brief.summary.urgency,
      requiresAlejandroDecision: payload.brief.summary.requiresAlejandroDecision,
    },
    writes,
    markdownPreview: markdown.split('\n').slice(0, 14),
  }, null, 2));

  if (payload.brief.summary.requiresAlejandroDecision && options.failOnDecision) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext decision brief failed: ${error.message}`);
  process.exitCode = 1;
});
