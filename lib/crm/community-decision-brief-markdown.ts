import type {
  CommunityDecisionBrief,
  CommunityDecisionBriefCandidate,
  CommunityDecisionOption,
} from './community-decision-brief';

export type CommunityDecisionBriefMarkdownOptions = {
  title?: string;
  source?: {
    cards: number;
    generatedAt: string | null;
  };
};

const label = (value: string): string =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identityFor = (candidate: CommunityDecisionBriefCandidate): string =>
  candidate.displayName ||
  candidate.identities.email ||
  candidate.identities.instagramHandle ||
  candidate.personId;

const formatList = (items: string[], empty: string): string[] =>
  items.length ? items.map((item) => `  - ${item}`) : [`  - ${empty}`];

const formatOption = (option: CommunityDecisionOption): string[] => [
  `### ${option.title}`,
  `- Id: ${option.id}`,
  `- Approval required: ${option.approvalRequired ? 'yes' : 'no'}`,
  `- Description: ${option.description}`,
  '- Allowed without approval:',
  ...formatList(option.allowedWithoutApproval, 'None.'),
  '- Blocked until approval:',
  ...formatList(option.blockedUntilApproval, 'None.'),
];

const formatCandidate = (candidate: CommunityDecisionBriefCandidate): string[] => [
  `### ${identityFor(candidate)}`,
  `- Person id: ${candidate.personId}`,
  `- Stage: ${candidate.stage.label}`,
  `- Priority: ${candidate.scores.priority}`,
  `- Next action: ${label(candidate.nextAction.code)}`,
  `- Requires human review: ${candidate.nextAction.requiresHumanReview ? 'yes' : 'no'}`,
  `- Decision need: ${label(candidate.decisionNeed)}`,
  `- Suggested internal next step: ${candidate.suggestedInternalNextStep}`,
  candidate.topProductFit.length
    ? `- Product fit: ${candidate.topProductFit.map((item) => `${label(item.key)} ${item.score}`).join(', ')}`
    : '- Product fit: none',
  '- Primary signals:',
  ...formatList(candidate.primarySignals, 'No primary signals returned.'),
  '- Risks:',
  ...formatList(candidate.risks, 'No risks returned.'),
  '- Evidence sources:',
  ...formatList(candidate.evidenceSources, 'No evidence sources returned.'),
];

export const formatCommunityDecisionBriefMarkdown = (
  brief: CommunityDecisionBrief,
  options: CommunityDecisionBriefMarkdownOptions = {},
): string => {
  const title = options.title ?? 'CRM vNext Decision Brief';
  const source = options.source;
  const lines: string[] = [
    `# ${title}`,
    '',
    `Generated: ${brief.generatedAt}`,
    `Mode: ${brief.mode}`,
    '',
    '## Source',
    source ? `- Local cards: ${source.cards}` : '- Local cards: unknown',
    source?.generatedAt ? `- Source generated at: ${source.generatedAt}` : '- Source generated at: unknown',
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
