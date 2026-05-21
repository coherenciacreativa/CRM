import type {
  CommunityDailyBrief,
  CommunityDailyBriefEngagementActionSummary,
  CommunityDailyBriefHighlight,
  CommunityDailyBriefNextStep,
} from './community-daily-brief';
import type { CommunityQueueBriefPerson } from './community-queue-briefs';

export type CommunityDailyBriefMarkdownOptions = {
  title?: string;
  source?: {
    cards: number;
    generatedAt: string | null;
  };
  previousSnapshot?: {
    loaded: boolean;
    generatedAt: string | null;
  };
};

const label = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identityFor = (person: CommunityQueueBriefPerson): string =>
  person.displayName ||
  person.identities.email ||
  person.identities.instagramHandle ||
  person.personId;

const formatHighlight = (highlight: CommunityDailyBriefHighlight): string =>
  `- [${label(highlight.level)}] ${highlight.title}: ${highlight.detail}`;

const formatStep = (step: CommunityDailyBriefNextStep): string =>
  `- [${label(step.priority)} | ${label(step.owner)}] ${step.action} Approval: ${step.requiresApproval ? 'yes' : 'no'}.`;

const formatEngagementAction = (action: CommunityDailyBriefEngagementActionSummary): string =>
  [
    `- ${action.label}`,
    `count ${action.count}`,
    `category ${label(action.category)}`,
    `review ${action.reviewRequired ? 'yes' : 'no'}`,
    `outbound approval ${action.outboundApprovalRequired ? 'yes' : 'no'}`,
    action.representativeReason ? `reason ${action.representativeReason}` : null,
  ].filter(Boolean).join(' | ');

const formatPerson = (person: CommunityQueueBriefPerson): string =>
  [
    `- ${identityFor(person)}`,
    `stage ${person.stage.label}`,
    `priority ${person.scores.priority}`,
    `action ${label(person.nextAction.code)}`,
    person.topProductFit.length
      ? `fit ${person.topProductFit.map((item) => `${label(item.key)} ${item.score}`).join(', ')}`
      : 'fit none',
  ].join(' | ');

export const formatCommunityDailyBriefMarkdown = (
  brief: CommunityDailyBrief,
  options: CommunityDailyBriefMarkdownOptions = {},
): string => {
  const source = options.source;
  const previousSnapshot = options.previousSnapshot;
  const title = options.title ?? 'CRM vNext Daily Brief';
  const lines: string[] = [
    `# ${title}`,
    '',
    `Generated: ${brief.generatedAt}`,
    `Mode: ${brief.mode}`,
    '',
    '## Source',
    source
      ? `- Local cards: ${source.cards}`
      : `- Local cards: ${brief.summary.totals.cards}`,
    source?.generatedAt
      ? `- Source generated at: ${source.generatedAt}`
      : '- Source generated at: unknown',
    previousSnapshot
      ? `- Previous queue snapshot: ${previousSnapshot.loaded ? previousSnapshot.generatedAt ?? 'loaded' : 'not loaded'}`
      : '- Previous queue snapshot: unknown',
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
    ...brief.highlights.map(formatHighlight),
    '',
    '## Next Steps',
    ...(brief.nextSteps.length ? brief.nextSteps.map(formatStep) : ['- No next steps selected.']),
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
      ...(focusQueue.people.length ? focusQueue.people.map(formatPerson) : ['- No people returned.']),
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
