import {
  type CrmVNextEngagementDecisionBrief,
  type CrmVNextEngagementDecisionBriefCandidate,
} from './crm-vnext-engagement-decision-brief';
import { labelCrmVNextEngagementMovementCode } from './crm-vnext-engagement-movement-queue';

const label = (value: string | null | undefined): string =>
  labelCrmVNextEngagementMovementCode(value || 'unknown');

const signed = (value: number): string => (value > 0 ? `+${value}` : String(value));

const formatList = (items: string[], empty: string): string[] =>
  items.length ? items.map((item) => `  - ${item}`) : [`  - ${empty}`];

const identityLine = (candidate: CrmVNextEngagementDecisionBriefCandidate): string => {
  const bits = [
    candidate.identities.email ? `email:${candidate.identities.email}` : null,
    candidate.identities.instagramHandle ? `ig:${candidate.identities.instagramHandle}` : null,
    candidate.identities.city,
    candidate.identities.country,
  ].filter(Boolean);
  return bits.length ? bits.join(' | ') : 'No confirmed identity fields in this brief.';
};

const formatCandidate = (candidate: CrmVNextEngagementDecisionBriefCandidate): string[] => [
  `### ${candidate.displayName}`,
  `- Person id: ${candidate.personId || 'unknown'}`,
  `- Identity: ${identityLine(candidate)}`,
  `- Movement: ${label(candidate.movement)} (${signed(candidate.priority.delta)} priority; ${candidate.priority.before} -> ${candidate.priority.after})`,
  `- Source family: ${label(candidate.sourceFamily)}`,
  `- Operator action: ${candidate.operatorAction.label}`,
  `- Decision need: ${label(candidate.decisionNeed)}`,
  `- Suggested question: ${candidate.suggestedQuestion}`,
  `- Suggested internal next step: ${candidate.suggestedInternalNextStep}`,
  '- Primary signals:',
  ...formatList(candidate.primarySignals, 'No primary signals returned.'),
  '- Reason codes:',
  ...formatList(candidate.reasonCodes.map(label), 'No reason codes returned.'),
  '- Risk codes:',
  ...formatList(candidate.riskCodes.map(label), 'No risk codes returned.'),
];

export const formatCrmVNextEngagementDecisionBriefMarkdown = (
  brief: CrmVNextEngagementDecisionBrief,
  options: { title?: string } = {},
): string => {
  const lines: string[] = [
    `# ${options.title || 'CRM vNext Engagement Decision Brief'}`,
    '',
    `Generated: ${brief.generatedAt}`,
    `Mode: ${brief.mode}`,
    '',
    '## Source',
    `- Movement rows: ${brief.source.movementRows}`,
    `- Warmed rows: ${brief.source.warmedRows}`,
    `- Cooled rows: ${brief.source.cooledRows}`,
    `- Unmatched rows: ${brief.source.unmatchedRows}`,
    `- Source snapshots: ${brief.source.sourceSnapshots}`,
    `- Latest captured at: ${brief.source.latestCapturedAt || 'unknown'}`,
    '',
    '## Decision',
    `- Urgency: ${label(brief.summary.urgency)}`,
    `- Requires Alejandro decision: ${brief.summary.requiresAlejandroDecision ? 'yes' : 'no'}`,
    `- Total candidates: ${brief.summary.totalCandidates}`,
    `- Returned candidates: ${brief.summary.returnedCandidates}`,
    `- Recommended question: ${brief.summary.recommendedQuestion}`,
    `- Approval boundary: ${brief.summary.approvalBoundary}`,
    '',
    '## Options',
  ];

  for (const option of brief.decisionOptions) {
    lines.push(
      '',
      `### ${option.title}`,
      `- Id: ${option.id}`,
      `- Approval required: ${option.approvalRequired ? 'yes' : 'no'}`,
      `- Description: ${option.description}`,
      '- Allowed without approval:',
      ...formatList(option.allowedWithoutApproval, 'None.'),
      '- Blocked until approval:',
      ...formatList(option.blockedUntilApproval, 'None.'),
    );
  }

  lines.push('', '## Candidates');
  if (brief.candidates.length) {
    for (const candidate of brief.candidates) {
      lines.push('', ...formatCandidate(candidate));
    }
  } else {
    lines.push('- No engagement candidates require a decision right now.');
  }

  lines.push(
    '',
    '## Safety',
    '- Read-only local engagement decision brief.',
    '- No outbound messages.',
    '- No CRM record mutation.',
    '- No score mutation.',
    ...brief.safety.prohibitedActions.map((action) => `- ${action}`),
    '',
  );

  return lines.join('\n');
};

