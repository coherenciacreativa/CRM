import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from './community-insights-source';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_OMNICHANNEL_COVERAGE_PUSH_SCHEMA_VERSION =
  'crm-vnext-omnichannel-coverage-push-2026-05-24' as const;

export type CrmVNextOmnichannelCoverageLane =
  | 'ig_to_email'
  | 'email_to_instagram';

export type CrmVNextOmnichannelCandidate = {
  rank: number;
  lane: CrmVNextOmnichannelCoverageLane;
  personId: string;
  displayName: string | null;
  identities: {
    email: string | null;
    instagramHandle: string | null;
    phone: string | null;
    city: string | null;
    country: string | null;
  };
  gap: 'missing_email' | 'missing_instagram';
  bridgePotential: 'high' | 'medium' | 'low';
  priorityScore: number;
  scoreBreakdown: {
    crmPriority: number;
    sourceRichness: number;
    officialFlow: number;
    relationshipContext: number;
    dataConfidenceGap: number;
  };
  reasons: string[];
  sourceLanes: string[];
  suggestedMantisAction: string;
  evidenceSources: string[];
};

export type CrmVNextOmnichannelCoveragePush = {
  ok: true;
  schemaVersion: typeof CRM_VNEXT_OMNICHANNEL_COVERAGE_PUSH_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_omnichannel_coverage_push';
  source: PublicPersonCardsVNextSource;
  summary: {
    cards: number;
    emailPresent: number;
    instagramPresent: number;
    omnichannel: number;
    missingEmailWithInstagram: number;
    missingInstagramWithEmail: number;
    selectedCandidates: number;
    selectedIgToEmail: number;
    selectedEmailToInstagram: number;
    maxOmnichannelLiftFromSelected: number;
    projectedOmnichannelIfAllSelectedClose: number;
    projectedOmnichannelCoveragePctIfAllSelectedClose: number;
  };
  lanes: Array<{
    id: CrmVNextOmnichannelCoverageLane;
    title: string;
    gap: 'missing_email' | 'missing_instagram';
    matched: number;
    selected: number;
    operatorRule: string;
    defaultSourceLanes: string[];
  }>;
  candidates: CrmVNextOmnichannelCandidate[];
  mantisPrompt: string;
  recommendedNextStep: {
    owner: 'mantis';
    action: string;
    approvalRequiredBeforeWrites: true;
    reason: string;
  };
  safety: {
    localOnly: true;
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    liveApiCallsProhibited: true;
    credentialAccessProhibited: true;
    externalMutationProhibited: true;
    operationsExecuted: 0;
    allowedLocalWrites: string[];
    prohibitedActions: string[];
  };
};

export type CrmVNextOmnichannelCoveragePushOptions = {
  now?: string | Date | null;
  cardStorePath?: string | null;
  legacyPath?: string | null;
  preferStore?: boolean | null;
  limit?: number | null;
  igToEmailLimit?: number | null;
  emailToInstagramLimit?: number | null;
};

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanLimit = (value: number | null | undefined, fallback: number, max: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.max(1, Math.min(max, Math.round(value)));
};

const pct = (numerator: number, denominator: number): number =>
  denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;

const evidenceText = (card: PersonCardVNext): string =>
  normalize(
    card.evidence
      .map((item) => [item.source, item.note].filter(Boolean).join(' '))
      .join(' '),
  );

const unique = (items: Array<string | null | undefined>): string[] =>
  Array.from(new Set(items.map((item) => item?.trim()).filter((item): item is string => Boolean(item))));

const hasAny = (text: string, terms: string[]): boolean =>
  terms.some((term) => text.includes(term));

const hasKnownNoInstagram = (card: PersonCardVNext): boolean => {
  const text = evidenceText(card);
  return hasAny(text, [
    'no tiene instagram',
    'no tiene ig',
    'sin instagram',
    'sin ig',
    'no usa instagram',
    'does not have instagram',
    "doesn't have instagram",
    'doesnt have instagram',
    'instagram none',
    'instagram: none',
  ]);
};

const sourceRichnessScore = (card: PersonCardVNext): number =>
  Math.min(16, card.evidence.length * 4);

const officialFlowScore = (card: PersonCardVNext): number => {
  const text = evidenceText(card);
  if (hasAny(text, ['manychat', 'lead-capture', 'lead capture', 'vercel', 'proxy', 'onboarding'])) {
    return 18;
  }
  if (hasAny(text, ['instagram_dm_ui', 'instagram dm', 'received second email', 'leads_instagram'])) {
    return 14;
  }
  if (hasAny(text, ['lead-state', 'ig-ui-signal', 'instagram'])) {
    return 8;
  }
  return 0;
};

const relationshipContextScore = (card: PersonCardVNext): number => {
  let score = 0;
  if (card.products.activeClient) score += 12;
  if (card.products.purchaseCount > 0) score += 8;
  if (card.products.yogaClasses90d > 0) score += 8;
  if (card.products.happyCircle90d > 0) score += 6;
  if (card.products.retreatsAttended > 0) score += 8;
  if (card.identities.phone) score += 4;
  if (card.identities.city || card.identities.country) score += 4;
  return Math.min(score, 24);
};

const dataConfidenceGapScore = (card: PersonCardVNext): number => {
  if (card.scoring.dataConfidence < 45) return 4;
  if (card.scoring.dataConfidence < 65) return 8;
  return 12;
};

const scoreCandidate = (card: PersonCardVNext): CrmVNextOmnichannelCandidate['scoreBreakdown'] => ({
  crmPriority: Math.round(card.scoring.priorityScore),
  sourceRichness: sourceRichnessScore(card),
  officialFlow: officialFlowScore(card),
  relationshipContext: relationshipContextScore(card),
  dataConfidenceGap: dataConfidenceGapScore(card),
});

const totalScore = (breakdown: CrmVNextOmnichannelCandidate['scoreBreakdown']): number =>
  breakdown.crmPriority
  + breakdown.sourceRichness
  + breakdown.officialFlow
  + breakdown.relationshipContext
  + breakdown.dataConfidenceGap;

const bridgePotential = (
  breakdown: CrmVNextOmnichannelCandidate['scoreBreakdown'],
): CrmVNextOmnichannelCandidate['bridgePotential'] => {
  const score = totalScore(breakdown);
  if (score >= 42 || (breakdown.officialFlow >= 14 && breakdown.sourceRichness >= 8)) return 'high';
  if (score >= 24 || breakdown.officialFlow >= 8 || breakdown.relationshipContext >= 8) return 'medium';
  return 'low';
};

const reasonLabels = (
  card: PersonCardVNext,
  lane: CrmVNextOmnichannelCoverageLane,
  breakdown: CrmVNextOmnichannelCandidate['scoreBreakdown'],
): string[] => {
  const reasons: string[] = [];
  if (lane === 'ig_to_email') {
    reasons.push('Instagram identity exists but email is missing.');
  } else {
    reasons.push('Email identity exists but Instagram handle is missing.');
  }
  if (breakdown.officialFlow >= 14) reasons.push('Evidence suggests official-flow or Instagram/onboarding trace recovery may close the gap.');
  else if (breakdown.officialFlow > 0) reasons.push('Instagram/source evidence exists, but needs a bounded source-recovery pass.');
  if (breakdown.relationshipContext >= 12) reasons.push('Relationship/product context makes the card worth stitching before broad automation.');
  if (card.evidence.length > 1) reasons.push(`Multiple local evidence sources exist (${card.evidence.length}).`);
  if (card.scoring.dataConfidence < 55) reasons.push('Identity confidence is still thin enough that one good bridge would materially improve the card.');
  return unique(reasons);
};

const evidenceSources = (card: PersonCardVNext): string[] =>
  unique(card.evidence.map((item) => item.source)).slice(0, 8);

const sourceLanesFor = (
  lane: CrmVNextOmnichannelCoverageLane,
  card: PersonCardVNext | null | undefined,
): string[] => {
  const text = card ? evidenceText(card) : '';
  if (lane === 'ig_to_email') {
    return unique([
      'Instagram Messages UI read-only search by handle/name; capture compact thread context only.',
      hasAny(text, ['manychat', 'lead-capture', 'vercel', 'proxy', 'onboarding'])
        ? 'ManyChat / Vercel proxy / lead-capture traces read-only.'
        : 'Lead-capture / ManyChat / Vercel traces if the person appears to be official-flow origin.',
      'MailerLite cursor scan + local filter by handle/display name; do not use subscriber search as sole source.',
      'Gmail / Drive / Contacts read-only only if the first lanes do not close the email bridge.',
      'Local Mantis-Reports and CRM ledgers before asking Alejandro.',
    ]);
  }

  return unique([
    'MailerLite subscriber fields/groups/source_of_subscriber read-only; cursor pagination + local filtering.',
    'Instagram Messages UI read-only search by email/name/phone if available.',
    hasAny(text, ['gmail', 'reply'])
      ? 'Gmail reply metadata/snippet review for handle clues, without full-body export.'
      : 'Gmail reply metadata/snippets only if the person has newsletter-reply evidence.',
    'ManyChat / Vercel proxy / lead-capture traces when the email looks official-flow origin.',
    'Contacts and Drive/Sheets read-only for phone/location/name bridges.',
  ]);
};

const candidateAction = (
  lane: CrmVNextOmnichannelCoverageLane,
  potential: CrmVNextOmnichannelCandidate['bridgePotential'],
): string => {
  if (lane === 'ig_to_email') {
    if (potential === 'high') return 'Run source recovery for email bridge before asking Alejandro or planning capture outreach.';
    return 'Keep in source-recovery backlog; search local official-flow lanes before any outbound email request.';
  }
  if (potential === 'high') return 'Run identity stitching search for Instagram bridge using email/name anchors.';
  return 'Keep in identity-stitching backlog; prefer source-rich cohorts before manual review.';
};

const toCandidate = (
  card: PersonCardVNext,
  lane: CrmVNextOmnichannelCoverageLane,
): Omit<CrmVNextOmnichannelCandidate, 'rank'> => {
  const breakdown = scoreCandidate(card);
  const potential = bridgePotential(breakdown);
  return {
    lane,
    personId: card.personId,
    displayName: card.displayName,
    identities: {
      email: card.identities.email,
      instagramHandle: card.identities.instagramHandle,
      phone: card.identities.phone,
      city: card.identities.city,
      country: card.identities.country,
    },
    gap: lane === 'ig_to_email' ? 'missing_email' : 'missing_instagram',
    bridgePotential: potential,
    priorityScore: totalScore(breakdown),
    scoreBreakdown: breakdown,
    reasons: reasonLabels(card, lane, breakdown),
    sourceLanes: sourceLanesFor(lane, card),
    suggestedMantisAction: candidateAction(lane, potential),
    evidenceSources: evidenceSources(card),
  };
};

const rankCandidates = (
  candidates: Array<Omit<CrmVNextOmnichannelCandidate, 'rank'>>,
): CrmVNextOmnichannelCandidate[] =>
  candidates
    .sort((a, b) =>
      b.priorityScore - a.priorityScore
      || b.scoreBreakdown.officialFlow - a.scoreBreakdown.officialFlow
      || b.scoreBreakdown.relationshipContext - a.scoreBreakdown.relationshipContext
      || a.personId.localeCompare(b.personId),
    )
    .map((candidate, index) => ({ ...candidate, rank: index + 1 }));

const laneMatched = (
  cards: PersonCardVNext[],
  lane: CrmVNextOmnichannelCoverageLane,
): PersonCardVNext[] =>
  cards.filter((card) => {
    const hasEmail = card.channels.email.present || Boolean(card.identities.email);
    const hasInstagram = card.channels.instagram.present || Boolean(card.identities.instagramHandle);
    if (lane === 'ig_to_email') return hasInstagram && !hasEmail;
    return hasEmail && !hasInstagram && !hasKnownNoInstagram(card);
  });

const buildMantisPrompt = (
  candidates: CrmVNextOmnichannelCandidate[],
): string => {
  const anchors = candidates
    .slice(0, 20)
    .map((candidate) => {
      const identity = [
        candidate.displayName,
        candidate.identities.instagramHandle ? `@${candidate.identities.instagramHandle}` : null,
        candidate.identities.email,
        candidate.identities.phone,
      ].filter(Boolean).join(' / ');
      return `- ${identity || candidate.personId}: ${candidate.gap}; source lanes: ${candidate.sourceLanes.slice(0, 3).join(' | ')}`;
    })
    .join('\n');

  return [
    'Mantis, corre un Omnichannel Coverage Push read-only para CRM vNext.',
    '',
    'Objetivo: buscar puentes email<->Instagram para estos candidatos priorizados sin writes, sin outbound, sin ManyChat LIVE y sin mutaciones externas.',
    '',
    'Reglas:',
    '- Usa cursor pagination + filtrado local para MailerLite; no confiar solo en search.',
    '- Si Instagram UI pide login, Relay, checkpoint o permiso, pausa en awaiting_human_unblock y pide desbloqueo antes de cerrar reporte final.',
    '- En Instagram Messages UI, no eleves un resultado name-only o handle parecido a candidato plausible de stitching. Ese tipo de resultado debe quedar como weak_name_only_hit/no_write o descarte, salvo que el hilo o una fuente oficial muestre el email, teléfono, handle, nombre inequívoco, o contexto conversacional fuerte.',
    '- Prioriza búsquedas por email/teléfono dentro de Instagram Messages UI para contactos con origen IG/ManyChat/proxy/Vercel/MailerLite. Si el correo o teléfono aparece dentro del hilo, abre el hilo read-only y captura el puente compacto.',
    '- Captura evidencia compacta: fuente, anchor buscado, candidato, confianza, descartes y por que se cierra o no el gap.',
    '- No escribas tarjetas, Fact Store, MailerLite, Gmail, Drive, Contacts, Instagram ni ManyChat.',
    '',
    'Candidatos:',
    anchors || '- No candidates selected.',
    '',
    'Entrega JSON contact-keyed y resumen Markdown en ~/Documents/Mantis-Reports.',
  ].join('\n');
};

export const buildCrmVNextOmnichannelCoveragePushFromCards = (
  cards: PersonCardVNext[],
  options: CrmVNextOmnichannelCoveragePushOptions = {},
): CrmVNextOmnichannelCoveragePush => {
  const generatedAt = isoNow(options.now);
  const limit = cleanLimit(options.limit, 40, 80);
  const defaultPerLane = Math.max(1, Math.ceil(limit / 2));
  const igToEmailLimit = cleanLimit(options.igToEmailLimit, defaultPerLane, limit);
  const emailToInstagramLimit = cleanLimit(options.emailToInstagramLimit, limit - Math.min(defaultPerLane, limit - 1), limit);

  const igToEmailAll = laneMatched(cards, 'ig_to_email');
  const emailToInstagramAll = laneMatched(cards, 'email_to_instagram');
  const igToEmail = rankCandidates(igToEmailAll.map((card) => toCandidate(card, 'ig_to_email')))
    .slice(0, Math.min(igToEmailLimit, limit));
  const remainingCandidateSlots = Math.max(0, limit - igToEmail.length);
  const emailToInstagram = rankCandidates(emailToInstagramAll.map((card) => toCandidate(card, 'email_to_instagram')))
    .slice(0, Math.min(emailToInstagramLimit, remainingCandidateSlots));
  const candidates = rankCandidates([...igToEmail, ...emailToInstagram]);

  const emailPresent = cards.filter((card) => card.channels.email.present || card.identities.email).length;
  const instagramPresent = cards.filter((card) => card.channels.instagram.present || card.identities.instagramHandle).length;
  const omnichannel = cards.filter((card) =>
    (card.channels.email.present || card.identities.email)
    && (card.channels.instagram.present || card.identities.instagramHandle),
  ).length;
  const maxLift = candidates.length;

  return {
    ok: true,
    schemaVersion: CRM_VNEXT_OMNICHANNEL_COVERAGE_PUSH_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_omnichannel_coverage_push',
    source: {
      kind: 'vnext-person-card-store',
      generatedAt: null,
      cards: cards.length,
      base: null,
    },
    summary: {
      cards: cards.length,
      emailPresent,
      instagramPresent,
      omnichannel,
      missingEmailWithInstagram: igToEmailAll.length,
      missingInstagramWithEmail: emailToInstagramAll.length,
      selectedCandidates: candidates.length,
      selectedIgToEmail: candidates.filter((candidate) => candidate.lane === 'ig_to_email').length,
      selectedEmailToInstagram: candidates.filter((candidate) => candidate.lane === 'email_to_instagram').length,
      maxOmnichannelLiftFromSelected: maxLift,
      projectedOmnichannelIfAllSelectedClose: omnichannel + maxLift,
      projectedOmnichannelCoveragePctIfAllSelectedClose: pct(omnichannel + maxLift, cards.length),
    },
    lanes: [
      {
        id: 'ig_to_email',
        title: 'Instagram known, email missing',
        gap: 'missing_email',
        matched: igToEmailAll.length,
        selected: candidates.filter((candidate) => candidate.lane === 'ig_to_email').length,
        operatorRule:
          'Treat as source recovery first, not outreach. Search official-flow lanes before asking Alejandro or contacting the person.',
        defaultSourceLanes: sourceLanesFor('ig_to_email', igToEmailAll[0] ?? cards[0]).filter(Boolean),
      },
      {
        id: 'email_to_instagram',
        title: 'Email known, Instagram missing',
        gap: 'missing_instagram',
        matched: emailToInstagramAll.length,
        selected: candidates.filter((candidate) => candidate.lane === 'email_to_instagram').length,
        operatorRule:
          'Treat as identity stitching. Use source evidence and approval packets before any card write.',
        defaultSourceLanes: sourceLanesFor('email_to_instagram', emailToInstagramAll[0] ?? cards[0]).filter(Boolean),
      },
    ],
    candidates,
    mantisPrompt: buildMantisPrompt(candidates),
    recommendedNextStep: {
      owner: 'mantis',
      action: 'Run the supplied read-only Mantis source hunt for the top coverage candidates, then return contact-keyed evidence for Codex/card-write approval review.',
      approvalRequiredBeforeWrites: true,
      reason:
        'Omnichannel identity coverage is the current bottleneck for useful Instagram/email scoring and future operator recommendations.',
    },
    safety: {
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      liveApiCallsProhibited: true,
      credentialAccessProhibited: true,
      externalMutationProhibited: true,
      operationsExecuted: 0,
      allowedLocalWrites: [
        'Write this local JSON/Markdown report when CLI output flags are used.',
      ],
      prohibitedActions: [
        'Do not write CRM cards from this report.',
        'Do not write Fact Store from this report.',
        'Do not send Instagram, WhatsApp, Telegram, email, or ManyChat messages.',
        'Do not mutate ManyChat LIVE.',
        'Do not call live Instagram, Gmail, Google, MailerLite, Shopify, payment, or WhatsApp APIs.',
        'Do not read, print, refresh, rotate, or mutate credentials.',
      ],
    },
  };
};

export const buildCrmVNextOmnichannelCoveragePush = async (
  options: CrmVNextOmnichannelCoveragePushOptions = {},
): Promise<CrmVNextOmnichannelCoveragePush> => {
  const sourceResult = await loadPersonCardsVNext({
    cardStorePath: options.cardStorePath,
    legacyPath: options.legacyPath,
    preferStore: options.preferStore,
    now: options.now,
  });
  const report = buildCrmVNextOmnichannelCoveragePushFromCards(sourceResult.cards, options);
  return {
    ...report,
    source: publicPersonCardsVNextSource(sourceResult.source),
  };
};
