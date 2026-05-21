import type {
  CrmVNextDailyOperatorHandoff,
  CrmVNextDailyOperatorHandoffTask,
} from './crm-vnext-daily-operator-handoff';

const label = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const formatTask = (task: CrmVNextDailyOperatorHandoffTask, index: number): string[] => [
  `## ${index + 1}. ${task.title}`,
  '',
  `- Priority: ${label(task.priority)}`,
  `- Lane: ${label(task.lane)}`,
  `- Owner: ${label(task.owner)}`,
  `- Status: ${label(task.status)}`,
  `- Approval required: ${task.approvalRequired ? 'yes' : 'no'}`,
  `- Reason: ${task.reason}`,
  '',
  'Recommended surface:',
  task.recommendedSurface.api ? `- API: \`${task.recommendedSurface.api}\`` : '- API: none',
  task.recommendedSurface.command ? `- Command: \`${task.recommendedSurface.command}\`` : '- Command: none',
  task.recommendedSurface.browserRoute ? `- Browser: \`${task.recommendedSurface.browserRoute}\`` : '- Browser: none',
  '',
  'Allowed now:',
  ...task.allowedNow.map((item) => `- ${item}`),
  '',
  'Blocked until approval:',
  ...task.blockedUntilApproval.map((item) => `- ${item}`),
  '',
];

export const formatCrmVNextDailyOperatorHandoffMarkdown = (
  handoff: CrmVNextDailyOperatorHandoff,
): string => [
  '# CRM vNext - Daily Operator Handoff',
  '',
  `Generated: ${handoff.generatedAt}`,
  `Mode: ${handoff.mode}`,
  `Urgency: ${label(handoff.summary.urgency)}`,
  '',
  '## Executive Brief',
  '',
  handoff.mantisBrief,
  '',
  '## Source',
  '',
  `- Cards: ${handoff.source.cards}`,
  `- Daily brief generated at: ${handoff.source.dailyBriefGeneratedAt}`,
  `- Source generated at: ${handoff.source.sourceGeneratedAt ?? 'unknown'}`,
  `- Engagement rows: ${handoff.source.engagementRows}`,
  `- Engagement latest captured at: ${handoff.source.engagementLatestCapturedAt ?? 'unknown'}`,
  `- Resolution loop included: ${handoff.source.resolutionLoopIncluded ? 'yes' : 'no'}`,
  '',
  '## Summary',
  '',
  `- Tasks: ${handoff.summary.tasks}`,
  `- High priority: ${handoff.summary.highPriority}`,
  `- Approval boundaries: ${handoff.summary.approvalBoundaries}`,
  `- Human ask recommended: ${handoff.summary.humanAskRecommended ? 'yes' : 'no'}`,
  `- Operations executed: ${handoff.summary.operationsExecuted}`,
  `- First move: ${handoff.summary.firstMove}`,
  '',
  ...(handoff.tasks.length ? handoff.tasks.flatMap(formatTask) : ['## Tasks', '', '- No operator task selected.', '']),
  '## Do Not Do',
  '',
  ...handoff.doNotDo.map((item) => `- ${item}`),
  '',
  '## Safety',
  '',
  '- Read-only local handoff.',
  '- No outbound messages.',
  '- No CRM card writes.',
  '- No Fact Store writes.',
  '- No score mutation.',
  '- No live API calls or credential access.',
  '',
].join('\n');
