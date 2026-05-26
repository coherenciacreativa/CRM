import type {
  CrmVNextOmnichannelCandidate,
  CrmVNextOmnichannelCoveragePush,
} from './crm-vnext-omnichannel-coverage-push';

const label = (value: string): string =>
  value
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

const identityFor = (candidate: CrmVNextOmnichannelCandidate): string =>
  candidate.displayName
  || candidate.identities.email
  || (candidate.identities.instagramHandle ? `@${candidate.identities.instagramHandle}` : null)
  || candidate.identities.phone
  || candidate.personId;

const formatCandidate = (candidate: CrmVNextOmnichannelCandidate): string[] => [
  `### ${candidate.rank}. ${identityFor(candidate)}`,
  '',
  `- Lane: ${label(candidate.lane)}`,
  `- Gap: ${label(candidate.gap)}`,
  `- Bridge potential: ${label(candidate.bridgePotential)}`,
  `- Priority score: ${candidate.priorityScore}`,
  `- Person id: ${candidate.personId}`,
  `- Email: ${candidate.identities.email ?? 'missing'}`,
  `- Instagram: ${candidate.identities.instagramHandle ? `@${candidate.identities.instagramHandle}` : 'missing'}`,
  `- Phone: ${candidate.identities.phone ?? 'missing'}`,
  `- Location: ${[candidate.identities.city, candidate.identities.country].filter(Boolean).join(', ') || 'missing'}`,
  `- Score breakdown: CRM ${candidate.scoreBreakdown.crmPriority}, source ${candidate.scoreBreakdown.sourceRichness}, official-flow ${candidate.scoreBreakdown.officialFlow}, relationship ${candidate.scoreBreakdown.relationshipContext}, confidence-gap ${candidate.scoreBreakdown.dataConfidenceGap}`,
  '',
  'Reasons:',
  ...(candidate.reasons.length ? candidate.reasons.map((reason) => `- ${reason}`) : ['- No specific reason returned.']),
  '',
  'Source lanes:',
  ...candidate.sourceLanes.map((lane) => `- ${lane}`),
  '',
  'Source result memory:',
  ...(candidate.sourceResultHistory.length
    ? candidate.sourceResultHistory.map((entry) =>
      `- ${entry.sourceSystem ?? 'source'}: ${entry.sourceResultStatus} / ${entry.sourceExhaustion ?? 'unknown'}${entry.retryPolicy ? ` — ${entry.retryPolicy}` : ''}`
    )
    : ['- No prior source-result receipts for this candidate.']),
  '',
  `Suggested Mantis action: ${candidate.suggestedMantisAction}`,
  '',
  'Evidence sources:',
  ...(candidate.evidenceSources.length
    ? candidate.evidenceSources.map((source) => `- ${source}`)
    : ['- No evidence sources returned.']),
  '',
];

export const formatCrmVNextOmnichannelCoveragePushMarkdown = (
  report: CrmVNextOmnichannelCoveragePush,
): string => [
  '# CRM vNext - Omnichannel Coverage Push',
  '',
  `Generated: ${report.generatedAt}`,
  `Mode: ${report.mode}`,
  '',
  '## Summary',
  '',
  `- Cards: ${report.summary.cards}`,
  `- Email present: ${report.summary.emailPresent}`,
  `- Instagram present: ${report.summary.instagramPresent}`,
  `- Omnichannel email+Instagram: ${report.summary.omnichannel}`,
  `- Missing email with Instagram: ${report.summary.missingEmailWithInstagram}`,
  `- Missing Instagram with email: ${report.summary.missingInstagramWithEmail}`,
  `- Selected candidates: ${report.summary.selectedCandidates}`,
  `- Selected IG -> email: ${report.summary.selectedIgToEmail}`,
  `- Selected email -> IG: ${report.summary.selectedEmailToInstagram}`,
  `- Max lift if selected gaps close: +${report.summary.maxOmnichannelLiftFromSelected}`,
  `- Projected omnichannel if all selected close: ${report.summary.projectedOmnichannelIfAllSelectedClose} (${report.summary.projectedOmnichannelCoveragePctIfAllSelectedClose}%)`,
  `- Source-result ledger entries read: ${report.summary.sourceResultLedgerEntries}`,
  `- Candidates with source-result memory: ${report.summary.sourceResultAwareCandidates}`,
  `- Limited-search retry candidates: ${report.summary.sourceResultLimitedSearchRetryCandidates}`,
  `- Profile-checked/no-bridge candidates: ${report.summary.sourceResultProfileCheckedNoBridgeCandidates}`,
  `- Exhausted immediate-rerun candidates: ${report.summary.sourceResultExhaustedCandidates}`,
  '',
  '## Source',
  '',
  `- Kind: ${report.source.kind}`,
  `- Cards: ${report.source.cards}`,
  `- Generated at: ${report.source.generatedAt ?? 'unknown'}`,
  '',
  '## Lanes',
  '',
  ...report.lanes.flatMap((lane) => [
    `### ${lane.title}`,
    '',
    `- Gap: ${label(lane.gap)}`,
    `- Matched: ${lane.matched}`,
    `- Selected: ${lane.selected}`,
    `- Operator rule: ${lane.operatorRule}`,
    '',
    'Default source lanes:',
    ...lane.defaultSourceLanes.map((sourceLane) => `- ${sourceLane}`),
    '',
  ]),
  '## Candidates',
  '',
  ...(report.candidates.length
    ? report.candidates.flatMap(formatCandidate)
    : ['- No candidates selected.', '']),
  '## Mantis Prompt',
  '',
  '```text',
  report.mantisPrompt,
  '```',
  '',
  '## Recommended Next Step',
  '',
  `- Owner: ${label(report.recommendedNextStep.owner)}`,
  `- Action: ${report.recommendedNextStep.action}`,
  `- Approval required before writes: ${report.recommendedNextStep.approvalRequiredBeforeWrites ? 'yes' : 'no'}`,
  `- Reason: ${report.recommendedNextStep.reason}`,
  '',
  '## Safety',
  '',
  '- Read-only local report.',
  '- No outbound messages.',
  '- No CRM card writes.',
  '- No Fact Store writes.',
  '- No live API calls.',
  '- No credential access or mutation.',
  '- No external mutations.',
  ...report.safety.prohibitedActions.map((action) => `- ${action}`),
  '',
].join('\n');
