export const CRM_VNEXT_COMMUNITY_SCORING_POLICY_SCHEMA_VERSION =
  'crm-vnext-community-scoring-policy-2026-05-21' as const;

export type CommunityScoreDimensionKey =
  | 'commercialWarmth'
  | 'communityDepth'
  | 'relationshipEngagement'
  | 'dataConfidence';

export type CommunitySignalImpactLevel = 'none' | 'low' | 'medium' | 'high' | 'restricted';

export type CommunityScoreDimensionPolicy = {
  key: CommunityScoreDimensionKey;
  label: string;
  purpose: string;
  doesNotMean: string;
};

export type CommunitySignalImpactPolicy = {
  id: string;
  label: string;
  sourceFamilies: string[];
  examples: string[];
  dimensionImpact: Record<CommunityScoreDimensionKey, CommunitySignalImpactLevel>;
  operatorMeaning: string;
  nextBestActionBias: string;
  guardrails: string[];
  reusableInfrastructure: string[];
};

export const COMMUNITY_SCORE_DIMENSIONS: CommunityScoreDimensionPolicy[] = [
  {
    key: 'commercialWarmth',
    label: 'Commercial warmth',
    purpose:
      'Near-term evidence that a person may be ready for a product, service, renewal, upgrade, or personal follow-up.',
    doesNotMean:
      'It is not a permission to sell or contact automatically, and it should not rise just because a person is close to the community.',
  },
  {
    key: 'communityDepth',
    label: 'Community depth',
    purpose:
      'Belonging, history, trust, and participation across classes, retreats, Encuentro Feliz, volunteer work, and long relationships.',
    doesNotMean:
      'It is not the same as purchase intent; deep members often need care, continuity, or gratitude rather than an offer.',
  },
  {
    key: 'relationshipEngagement',
    label: 'Relationship engagement',
    purpose:
      'Current two-way attention: replies, DMs, comments, thoughtful email responses, WhatsApp interaction, and fresh participation.',
    doesNotMean:
      'It does not prove the right product or timing by itself; content and context still need review.',
  },
  {
    key: 'dataConfidence',
    label: 'Data confidence',
    purpose:
      'How safely the CRM can identify the person across email, Instagram, phone, location, and evidence sources.',
    doesNotMean:
      'It is not warmth; it only says whether the card is stitched well enough for internal decisions.',
  },
];

export const COMMUNITY_PRIORITY_SCORE_WEIGHTS: Record<CommunityScoreDimensionKey, number> = {
  commercialWarmth: 0.42,
  communityDepth: 0.3,
  relationshipEngagement: 0.2,
  dataConfidence: 0.08,
};

export const COMMUNITY_SIGNAL_IMPACT_POLICY: CommunitySignalImpactPolicy[] = [
  {
    id: 'classbot_yoga_activity',
    label: 'ClassBot yoga attendance and recording delivery',
    sourceFamilies: ['classbot', 'bhakti_whatsapp', 'whatsapp_recording_delivery'],
    examples: ['class_attendance', 'recording_delivery', 'active_yoga_student'],
    dimensionImpact: {
      commercialWarmth: 'low',
      communityDepth: 'high',
      relationshipEngagement: 'medium',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'Treat as service continuity, care, retention, and yoga product fit. It should not overpower a recent thoughtful email reply as sales heat.',
    nextBestActionBias:
      'Prefer care, continuity, attendance review, gratitude, or recording hygiene before any offer.',
    guardrails: [
      'Do not infer upsell readiness from attendance alone.',
      'If payment or cancellation risk is involved, route to a human decision brief.',
      'Keep therapy or restricted service context out of automated outreach.',
    ],
    reusableInfrastructure: [
      'scripts/crm-vnext-classbot-yoga-evidence.mjs',
      'docs/crm-vnext/classbot-yoga-evidence.md',
      'lib/crm/crm-vnext-signal-event-projection.js',
    ],
  },
  {
    id: 'newsletter_reply_activity',
    label: 'Gmail/newsletter reply activity',
    sourceFamilies: ['gmail', 'respuestas@coherenciacreativa.com', 'newsletter_reply'],
    examples: ['email_reply', 'thoughtful_reply', 'reply_to_article'],
    dimensionImpact: {
      commercialWarmth: 'medium',
      communityDepth: 'medium',
      relationshipEngagement: 'high',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'A thoughtful reply is a strong relational signal and may become commercial warmth if the content shows desire, pain, timing, or product interest.',
    nextBestActionBias:
      'Prefer reviewing reply context and preparing a human note; no automatic email follow-up.',
    guardrails: [
      'Use metadata/snippets first; avoid full body export unless explicitly needed.',
      'A reply can trigger review priority but not automatic outbound.',
      'Preserve the original newsletter/reply-to context when storing evidence.',
    ],
    reusableInfrastructure: [
      'scripts/crm-vnext-gmail-reply-engagement-signals.mjs',
      'docs/crm-vnext/signal-event-ledger.md',
      'docs/crm-vnext/engagement-resolution-loop.md',
    ],
  },
  {
    id: 'mailerlite_engagement_activity',
    label: 'MailerLite opens, clicks, groups, and subscriber status',
    sourceFamilies: ['mailerlite', 'email_engagement_snapshot'],
    examples: ['email_open', 'email_click', 'subscriber_status', 'campaign_history'],
    dimensionImpact: {
      commercialWarmth: 'low',
      communityDepth: 'medium',
      relationshipEngagement: 'medium',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'Open history is relationship memory; clicks and recent repeated opens can raise review priority, but replies or explicit intent are stronger.',
    nextBestActionBias:
      'Prefer keep observing, stitch identity, or review topical interest before a human follow-up.',
    guardrails: [
      'Use cursor pagination and local filtering, not the unreliable search endpoint.',
      'Respect unsubscribed, bounced, or complained status.',
      'Do not mutate MailerLite groups, subscribers, automations, or credentials from CRM scoring.',
    ],
    reusableInfrastructure: [
      'scripts/crm-vnext-mailerlite-engagement-signals.mjs',
      'lib/crm/crm-vnext-mailerlite-engagement-signals.js',
      'docs/crm-vnext/signal-event-pipeline.md',
    ],
  },
  {
    id: 'instagram_activity',
    label: 'Instagram follows, story views, likes, comments, and DMs',
    sourceFamilies: ['instagram', 'manychat', 'instagram_messages_ui'],
    examples: ['instagram_follow', 'instagram_story_view', 'instagram_like', 'instagram_comment', 'instagram_dm'],
    dimensionImpact: {
      commercialWarmth: 'medium',
      communityDepth: 'medium',
      relationshipEngagement: 'high',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'DMs and comments are strong relationship signals; story views and likes are lighter attention signals unless repeated or tied to product intent.',
    nextBestActionBias:
      'Prefer internal review, stitching, or gentle human decision prep; Meta/UI access issues must pause into human unblock rather than degrade silently.',
    guardrails: [
      'Do not send DMs, react, follow, unfollow, or change Instagram credentials from scoring work.',
      'Capture city/country if explicitly present in the conversation.',
      'Treat legacy ManyChat/live flows as read-only evidence unless Alejandro explicitly approves otherwise.',
    ],
    reusableInfrastructure: [
      'lib/crm/crm-vnext-signal-event-projection.js',
      'scripts/crm-vnext-instagram-dm-ui-evidence.mjs',
      'docs/crm-vnext/instagram-dm-ui-evidence.md',
      'docs/ops/ig-assistant-playbook.md',
    ],
  },
  {
    id: 'commerce_purchase_activity',
    label: 'Purchases, payments, Shopify-like commerce, and paid product participation',
    sourceFamilies: ['shopify', 'stripe', 'mercadopago', 'payment', 'commerce'],
    examples: ['purchase', 'active_client', 'digital_product_purchase', 'retreat_purchase'],
    dimensionImpact: {
      commercialWarmth: 'high',
      communityDepth: 'high',
      relationshipEngagement: 'medium',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'Purchases prove client history and product fit. Recent purchase can be warmth for care, retention, or complementary offers, not a blanket upsell license.',
    nextBestActionBias:
      'Prefer thank-you, fulfillment, retention, or next-product review depending on product family and timing.',
    guardrails: [
      'Do not expose payment details in operator summaries.',
      'Do not infer ability or desire to buy again from past spend alone.',
      'Route refunds, failed payments, or sensitive service purchases to human review.',
    ],
    reusableInfrastructure: [
      'lib/crm/crm-vnext-signal-event-ledger.js',
      'lib/crm/crm-vnext-signal-event-projection.js',
      'docs/crm-vnext/signal-event-projection.md',
    ],
  },
  {
    id: 'manual_context_activity',
    label: 'Alejandro/Juana/Mantis human context',
    sourceFamilies: ['manual', 'telegram_report', 'human_enrichment_response', 'fact_store'],
    examples: ['human_report', 'manual_observation', 'relationship_context', 'product_interest'],
    dimensionImpact: {
      commercialWarmth: 'medium',
      communityDepth: 'high',
      relationshipEngagement: 'medium',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'Human context is high-value memory, but it should enter scoring through explicit reviewed facts rather than silently from raw chat.',
    nextBestActionBias:
      'Prefer fact proposal, approval, then scoring preview. Do not skip the provenance layer.',
    guardrails: [
      'Store only approved, useful facts with provenance.',
      'Do not let anecdotal context silently mutate scores.',
      'Avoid asking Alejandro broad questions when the card already has enough human context.',
    ],
    reusableInfrastructure: [
      'scripts/crm-vnext-context-fact-proposals.mjs',
      'scripts/crm-vnext-context-fact-apply.mjs',
      'lib/crm/crm-vnext-engagement-resolution-loop.ts',
    ],
  },
  {
    id: 'restricted_service_context',
    label: 'Therapy or restricted service context',
    sourceFamilies: ['therapy', 'psicoterapia', 'restricted_service'],
    examples: ['therapy_client', 'consultation_context', 'sensitive_service_history'],
    dimensionImpact: {
      commercialWarmth: 'restricted',
      communityDepth: 'medium',
      relationshipEngagement: 'restricted',
      dataConfidence: 'medium',
    },
    operatorMeaning:
      'This can confirm that the person is a client of a real service, but it must not drive automated outbound or casual summaries.',
    nextBestActionBias:
      'Prefer restricted human review only. No automated nurture, no public/channel outreach, no casual inference.',
    guardrails: [
      'Require restricted-service acknowledgement before local card writes where applicable.',
      'Never use therapy context for automatic offers or public-channel actions.',
      'Keep summaries minimal and need-to-know.',
    ],
    reusableInfrastructure: [
      'lib/crm/crm-vnext-multi-service-card-proposal.ts',
      'lib/crm/crm-vnext-card-write-approval-packet.ts',
      'lib/crm/crm-vnext-card-merge-review-resolver.js',
    ],
  },
];

export const priorityScoreWeightTotal = (): number =>
  Object.values(COMMUNITY_PRIORITY_SCORE_WEIGHTS).reduce((sum, value) => sum + value, 0);

export const findCommunitySignalImpactPolicy = (
  idOrSourceFamily: string,
): CommunitySignalImpactPolicy | null => {
  const needle = idOrSourceFamily.trim().toLowerCase();
  if (!needle) return null;
  return (
    COMMUNITY_SIGNAL_IMPACT_POLICY.find((policy) => {
      if (policy.id.toLowerCase() === needle) return true;
      return policy.sourceFamilies.some((source) => source.toLowerCase() === needle);
    }) ?? null
  );
};
