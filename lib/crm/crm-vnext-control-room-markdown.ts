import type { CrmVNextControlRoom } from './crm-vnext-control-room';

const label = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const formatCrmVNextControlRoomMarkdown = (
  report: CrmVNextControlRoom,
): string => [
  '# CRM vNext - Control Room',
  '',
  `Generated: ${report.generatedAt}`,
  `Mode: ${report.mode}`,
  `State: ${label(report.state)}`,
  '',
  '## First Move',
  '',
  report.summary.firstMove,
  '',
  '## Operating Snapshot',
  '',
  `- Cards: ${report.summary.cards}`,
  `- Email coverage: ${report.summary.emailCoveragePct}%`,
  `- Instagram coverage: ${report.summary.instagramCoveragePct}%`,
  `- Omnichannel identities: ${report.summary.omnichannel}`,
  `- Readiness: ${label(report.summary.readinessStatus)}`,
  `- Source ledger: ${label(report.summary.sourceLedgerStatus)}`,
  `- Signal candidate packets: ${report.summary.signalCandidatePackets}`,
  `- Active source blockers: ${report.summary.activeSourceBlockers}`,
  `- Operator tasks: ${report.summary.operatorTasks}`,
  `- High-priority tasks: ${report.summary.highPriorityTasks}`,
  `- Human ask recommended: ${report.summary.humanAskRecommended ? 'yes' : 'no'}`,
  '',
  '## Tiles',
  '',
  ...report.tiles.flatMap((tile) => [
    `- ${tile.title}: ${label(tile.status)} (${tile.value})`,
    `  - ${tile.detail}`,
  ]),
  '',
  '## Signal Router',
  '',
  `- Recommendation: ${report.signalRouter.recommendation}`,
  `- Candidate packets: ${report.signalRouter.candidatePackets.length}`,
  `- Processed inputs shown: ${report.signalRouter.processedInputPackets.length}`,
  `- Active blockers shown: ${report.signalRouter.activeBlockers.length}`,
  `- Superseded blockers shown: ${report.signalRouter.supersededBlockers.length}`,
  '',
  ...(report.signalRouter.candidatePackets.length
    ? [
        '### Candidate Packets',
        '',
        ...report.signalRouter.candidatePackets.map((packet: any) =>
          `- ${packet.fileName} -> ${packet.pipelineFlag ?? packet.packetKind}`,
        ),
        '',
      ]
    : []),
  '## Operator Plan',
  '',
  `- Urgency: ${label(report.operatorPlan.urgency)}`,
  `- First move: ${report.operatorPlan.firstMove}`,
  '',
  ...(report.operatorPlan.tasks.length
    ? report.operatorPlan.tasks.flatMap((task, index) => [
        `### ${index + 1}. ${task.title}`,
        '',
        `- Lane: ${label(task.lane)}`,
        `- Priority: ${label(task.priority)}`,
        `- Owner: ${label(task.owner)}`,
        `- Approval required: ${task.approvalRequired ? 'yes' : 'no'}`,
        `- Reason: ${task.reason}`,
        task.recommendedSurface.command ? `- Command: \`${task.recommendedSurface.command}\`` : '- Command: none',
        task.recommendedSurface.browserRoute ? `- Browser: \`${task.recommendedSurface.browserRoute}\`` : '- Browser: none',
        '',
      ])
    : ['- No operator tasks selected.', '']),
  '## Source Health',
  '',
  ...report.sourceHealth.map((source) =>
    `- ${source.title}: ${label(source.freshness)} / ${label(source.trust)}; records ${source.recordCount ?? 'unknown'}${source.operatorAction ? `; action: ${source.operatorAction}` : ''}`,
  ),
  '',
  '## Product Discipline',
  '',
  `- Current rule: ${report.productDiscipline.currentRule}`,
  '',
  'Big picture:',
  ...report.productDiscipline.bigPicture.map((item) => `- ${item}`),
  '',
  'Do not build next:',
  ...report.productDiscipline.whatNotToBuildNext.map((item) => `- ${item}`),
  '',
  '## Safety',
  '',
  '- Read-only local report.',
  '- No live API calls.',
  '- No outbound messages.',
  '- No CRM card writes.',
  '- No Fact Store writes.',
  '- No score mutation.',
  '- No credential access or mutation.',
  '',
].join('\n');
