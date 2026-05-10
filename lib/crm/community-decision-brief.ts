import {
  buildCommunityQueueBrief,
  type CommunityQueueBrief,
  type CommunityQueueBriefPerson,
} from './community-queue-briefs';
import type { CommunityQueueId } from './community-queues';
import type { PersonCardVNext } from './person-card-vnext';

export type CommunityDecisionBriefUrgency = 'planning' | 'watch' | 'notify';

export type CommunityDecisionOption = {
  id: string;
  title: string;
  description: string;
  approvalRequired: boolean;
  allowedWithoutApproval: string[];
  blockedUntilApproval: string[];
};

export type CommunityDecisionBriefCandidate = {
  personId: string;
  displayName: string | null;
  identities: CommunityQueueBriefPerson['identities'];
  stage: CommunityQueueBriefPerson['stage'];
  scores: CommunityQueueBriefPerson['scores'];
  nextAction: CommunityQueueBriefPerson['nextAction'];
  topProductFit: CommunityQueueBriefPerson['topProductFit'];
  decisionNeed: string;
  primarySignals: string[];
  risks: string[];
  evidenceSources: string[];
  suggestedInternalNextStep: string;
};

export type CommunityDecisionBrief = {
  generatedAt: string;
  mode: 'read_only_decision_brief';
  queue: CommunityQueueBrief['queue'];
  summary: {
    urgency: CommunityDecisionBriefUrgency;
    totalCandidates: number;
    returnedCandidates: number;
    requiresAlejandroDecision: boolean;
    recommendedQuestion: string;
    approvalBoundary: string;
  };
  decisionOptions: CommunityDecisionOption[];
  candidates: CommunityDecisionBriefCandidate[];
  safety: {
    outboundProhibited: true;
    recordMutationProhibited: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CommunityDecisionBriefOptions = {
  now?: string | Date | null;
  limit?: number | null;
};

type QueueDecisionPolicy = {
  urgencyWhenMatched: CommunityDecisionBriefUrgency;
  requiresAlejandroDecision: boolean;
  recommendedQuestion: string;
  approvalBoundary: string;
  candidateDecisionNeed: string;
  defaultInternalNextStep: string;
  options: CommunityDecisionOption[];
};

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanLimit = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 5;
  return Math.max(1, Math.min(10, Math.round(value)));
};

const QUEUE_POLICIES: Record<CommunityQueueId, QueueDecisionPolicy> = {
  ig_without_email: {
    urgencyWhenMatched: 'watch',
    requiresAlejandroDecision: true,
    recommendedQuestion:
      'Do we want to approve a safe email-capture strategy for Instagram-known people, preserving the current ManyChat flow until a replacement is explicitly approved?',
    approvalBoundary:
      'Planning is allowed. Any Instagram message, ManyChat edit, or email-capture outreach needs explicit approval.',
    candidateDecisionNeed: 'email_capture_strategy',
    defaultInternalNextStep:
      'Prepare a no-send email-capture plan and inspect whether the person already appears in another trusted source.',
    options: [
      {
        id: 'approve_email_capture_strategy',
        title: 'Approve email-capture strategy',
        description:
          'Alejandro approves the strategy, audience, channel, and one-run scope before any outreach is sent.',
        approvalRequired: true,
        allowedWithoutApproval: ['Segment candidates locally.', 'Prepare an internal strategy note.'],
        blockedUntilApproval: ['Instagram DM send.', 'ManyChat LIVE change.', 'Email or WhatsApp send.'],
      },
      {
        id: 'keep_observing',
        title: 'Keep observing',
        description:
          'Leave the queue as a planning backlog while the working ManyChat onboarding flow remains untouched.',
        approvalRequired: false,
        allowedWithoutApproval: ['Monitor count changes.', 'Improve identity matching locally.'],
        blockedUntilApproval: ['Outbound follow-up.', 'Replacing the current onboarding flow.'],
      },
    ],
  },
  email_engaged: {
    urgencyWhenMatched: 'planning',
    requiresAlejandroDecision: false,
    recommendedQuestion:
      'Is there a useful newsletter or community-care segment emerging from recently engaged email readers?',
    approvalBoundary:
      'Segmentation and analysis are allowed. Sending a campaign or personal message needs approval.',
    candidateDecisionNeed: 'email_nurture_review',
    defaultInternalNextStep:
      'Review topic fit and recent engagement before proposing any newsletter or community-care segment.',
    options: [
      {
        id: 'review_segment',
        title: 'Review nurture segment',
        description:
          'Mantis groups the readers and prepares internal notes about possible content or care angles.',
        approvalRequired: false,
        allowedWithoutApproval: ['Analyze local engagement.', 'Prepare segment notes.'],
        blockedUntilApproval: ['Campaign send.', 'Personal outbound message.'],
      },
    ],
  },
  human_review_required: {
    urgencyWhenMatched: 'notify',
    requiresAlejandroDecision: true,
    recommendedQuestion:
      'Which sensitive cases should Alejandro or an approved human review before any contact or record change?',
    approvalBoundary:
      'Only internal inspection is allowed. No outreach or record mutation until Alejandro decides.',
    candidateDecisionNeed: 'sensitive_human_review',
    defaultInternalNextStep:
      'Prepare a concise internal case note with signals, risks, and the exact decision needed.',
    options: [
      {
        id: 'review_case_by_case',
        title: 'Review case by case',
        description:
          'Alejandro or an approved human reviews each candidate before any follow-up or CRM mutation.',
        approvalRequired: true,
        allowedWithoutApproval: ['Prepare internal case notes.', 'Rank by risk and urgency.'],
        blockedUntilApproval: ['Outbound follow-up.', 'CRM record mutation.'],
      },
    ],
  },
  identity_stitching: {
    urgencyWhenMatched: 'watch',
    requiresAlejandroDecision: false,
    recommendedQuestion:
      'Which identity gaps can be enriched safely from existing trusted sources before asking anyone for more data?',
    approvalBoundary:
      'Analysis and proposed matches are allowed. Writing profile changes needs an approved mutation workflow.',
    candidateDecisionNeed: 'identity_enrichment',
    defaultInternalNextStep:
      'Prepare a proposed identity match or enrichment note, with evidence, without writing it to CRM yet.',
    options: [
      {
        id: 'prepare_identity_match_notes',
        title: 'Prepare identity match notes',
        description:
          'Mantis can propose likely identity links for later approval or a future safe mutation workflow.',
        approvalRequired: false,
        allowedWithoutApproval: ['Compare local evidence.', 'Prepare proposed match notes.'],
        blockedUntilApproval: ['CRM record mutation.', 'External lookup requiring credentials.'],
      },
    ],
  },
  commercial_follow_up: {
    urgencyWhenMatched: 'notify',
    requiresAlejandroDecision: true,
    recommendedQuestion:
      'Does Alejandro want a human follow-up plan for these commercially warm contacts, and with what offer/context?',
    approvalBoundary:
      'Mantis may prepare context. Any sales or care outreach needs Alejandro approval of message, channel, and scope.',
    candidateDecisionNeed: 'commercial_follow_up_decision',
    defaultInternalNextStep:
      'Prepare an internal follow-up rationale that includes relationship context, product fit, and risks.',
    options: [
      {
        id: 'approve_human_follow_up_plan',
        title: 'Approve human follow-up plan',
        description:
          'Alejandro chooses whether to follow up, which offer/context is appropriate, and who should send it.',
        approvalRequired: true,
        allowedWithoutApproval: ['Prepare internal rationale.', 'Rank candidates by fit and care risk.'],
        blockedUntilApproval: ['Sales outreach.', 'Personal message.', 'Automated follow-up.'],
      },
      {
        id: 'defer_commercial_follow_up',
        title: 'Defer follow-up',
        description:
          'Leave the candidate in watch mode and keep gathering relationship signals before any offer.',
        approvalRequired: false,
        allowedWithoutApproval: ['Monitor future engagement.', 'Keep internal notes.'],
        blockedUntilApproval: ['Outbound follow-up.'],
      },
    ],
  },
};

const urgencyFromQueue = (
  queue: CommunityQueueBrief['queue'],
  policy: QueueDecisionPolicy,
): CommunityDecisionBriefUrgency => {
  if (queue.status?.level === 'notify') return 'notify';
  if (queue.status?.level === 'watch') return 'watch';
  if (queue.counts.matched > 0) return policy.urgencyWhenMatched;
  return 'planning';
};

const suggestedInternalNextStep = (
  person: CommunityQueueBriefPerson,
  policy: QueueDecisionPolicy,
): string => {
  if (person.nextAction.requiresHumanReview) {
    return 'Prepare a human-review note before any contact or CRM mutation.';
  }
  if (person.nextAction.code === 'ask_for_email') {
    return 'Check whether email already exists in another trusted source, then keep any capture plan internal until approved.';
  }
  if (person.nextAction.code === 'nurture_by_email') {
    return 'Review topic fit and recent engagement before proposing a nurture segment.';
  }
  return policy.defaultInternalNextStep;
};

const toCandidate = (
  person: CommunityQueueBriefPerson,
  policy: QueueDecisionPolicy,
): CommunityDecisionBriefCandidate => ({
  personId: person.personId,
  displayName: person.displayName,
  identities: person.identities,
  stage: person.stage,
  scores: person.scores,
  nextAction: person.nextAction,
  topProductFit: person.topProductFit,
  decisionNeed: person.nextAction.requiresHumanReview
    ? 'person_next_action_requires_human_review'
    : policy.candidateDecisionNeed,
  primarySignals: person.signals.map((signal) => signal.label).slice(0, 4),
  risks: person.risks.map((risk) => risk.label).slice(0, 4),
  evidenceSources: person.evidenceSources.slice(0, 5),
  suggestedInternalNextStep: suggestedInternalNextStep(person, policy),
});

export const buildCommunityDecisionBrief = (
  cards: PersonCardVNext[],
  queueId: CommunityQueueId,
  options: CommunityDecisionBriefOptions = {},
): CommunityDecisionBrief => {
  const generatedAt = isoNow(options.now);
  const limit = cleanLimit(options.limit);
  const policy = QUEUE_POLICIES[queueId];
  const queueBrief = buildCommunityQueueBrief(cards, queueId, {
    now: generatedAt,
    limit,
  });
  const urgency = urgencyFromQueue(queueBrief.queue, policy);
  const requiresAlejandroDecision =
    queueBrief.queue.counts.matched > 0
      && (urgency === 'notify' || policy.requiresAlejandroDecision);

  return {
    generatedAt,
    mode: 'read_only_decision_brief',
    queue: queueBrief.queue,
    summary: {
      urgency,
      totalCandidates: queueBrief.queue.counts.matched,
      returnedCandidates: queueBrief.queue.counts.returned,
      requiresAlejandroDecision,
      recommendedQuestion: policy.recommendedQuestion,
      approvalBoundary: policy.approvalBoundary,
    },
    decisionOptions: policy.options,
    candidates: queueBrief.people.map((person) => toCandidate(person, policy)),
    safety: {
      outboundProhibited: true,
      recordMutationProhibited: true,
      allowedUse: [
        'Prepare internal decision notes.',
        'Rank local candidates for human review.',
        'Clarify what approval is needed before action.',
      ],
      prohibitedActions: [
        'Do not send Instagram messages.',
        'Do not send email, WhatsApp, Telegram, or ManyChat messages.',
        'Do not change ManyChat LIVE.',
        'Do not mutate CRM records from this brief.',
        'Do not change Instagram, MailerLite, or outbound-channel credentials.',
      ],
    },
  };
};
