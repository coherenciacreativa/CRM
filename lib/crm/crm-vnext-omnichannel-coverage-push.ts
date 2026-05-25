import { readFile } from 'node:fs/promises';
import {
  loadPersonCardsVNext,
  publicPersonCardsVNextSource,
  type PublicPersonCardsVNextSource,
} from './community-insights-source';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_OMNICHANNEL_COVERAGE_PUSH_SCHEMA_VERSION =
  'crm-vnext-omnichannel-coverage-push-2026-05-26' as const;

export const DEFAULT_CRM_VNEXT_SOURCE_RESULT_LEDGER_PATH =
  '.crm-vnext/source-result-ledger/ledger.jsonl';

export type CrmVNextOmnichannelCoverageLane =
  | 'ig_to_email'
  | 'email_to_instagram';

export type CrmVNextSourceResultStatus =
  | 'bridge_found'
  | 'found_profile_no_requested_bridge'
  | 'not_found_limited_search'
  | 'not_found_exhaustive'
  | 'blocked'
  | 'unknown';

export type CrmVNextSourceResultLedgerEntry = {
  schemaVersion?: string;
  ledgerEntryId?: string;
  recordedAt?: string | null;
  sourceSystem?: string | null;
  contactKey?: string | null;
  sourceResultStatus?: CrmVNextSourceResultStatus | string | null;
  resultStrength?: string | null;
  sourceExhaustion?: string | null;
  operationalMeaning?: string | null;
  retryPolicy?: string | null;
};

export type CrmVNextCandidateSourceResultHistory = {
  ledgerEntryId: string | null;
  recordedAt: string | null;
  sourceSystem: string | null;
  sourceResultStatus: CrmVNextSourceResultStatus;
  resultStrength: string | null;
  sourceExhaustion: string | null;
  operationalMeaning: string | null;
  retryPolicy: string | null;
};

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
  sourceResultHistory: CrmVNextCandidateSourceResultHistory[];
  sourceResultGuidance: string[];
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
    sourceResultLedgerEntries: number;
    sourceResultAwareCandidates: number;
    sourceResultLimitedSearchRetryCandidates: number;
    sourceResultProfileCheckedNoBridgeCandidates: number;
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
  sourceResultLedgerPath?: string | null;
  sourceResults?: CrmVNextSourceResultLedgerEntry[] | null;
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

const normalizeHandle = (value: string | null | undefined): string | null => {
  const cleaned = value?.trim().replace(/^@+/, '').replace(/^ig:/i, '').toLowerCase();
  return cleaned || null;
};

const normalizeEmail = (value: string | null | undefined): string | null => {
  const cleaned = value?.trim().toLowerCase();
  return cleaned && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned) ? cleaned : null;
};

const normalizePhone = (value: string | null | undefined): string | null => {
  const digits = value?.replace(/[^\d]/g, '') ?? '';
  return digits.length >= 7 ? digits : null;
};

const normalizeContactKey = (value: string | null | undefined): string | null => {
  const cleaned = value?.trim().toLowerCase();
  if (!cleaned) return null;
  if (cleaned.startsWith('ig:')) {
    const handle = normalizeHandle(cleaned.slice(3));
    return handle ? `ig:${handle}` : null;
  }
  if (cleaned.startsWith('@')) {
    const handle = normalizeHandle(cleaned);
    return handle ? `ig:${handle}` : null;
  }
  if (cleaned.startsWith('email:')) {
    const email = normalizeEmail(cleaned.slice(6));
    return email ? `email:${email}` : null;
  }
  if (cleaned.includes('@')) {
    const email = normalizeEmail(cleaned);
    return email ? `email:${email}` : null;
  }
  if (cleaned.startsWith('phone:')) {
    const phone = normalizePhone(cleaned.slice(6));
    return phone ? `phone:${phone}` : null;
  }
  const phone = normalizePhone(cleaned);
  if (phone && /^[+\d\s().-]+$/.test(cleaned)) return `phone:${phone}`;
  return cleaned;
};

const candidateContactKeys = (card: PersonCardVNext): string[] =>
  unique([
    normalizeContactKey(card.personId),
    card.identities.email ? normalizeContactKey(`email:${card.identities.email}`) : null,
    card.identities.instagramHandle ? normalizeContactKey(`ig:${card.identities.instagramHandle}`) : null,
    card.identities.phone ? normalizeContactKey(`phone:${card.identities.phone}`) : null,
  ]);

const sourceResultStatus = (value: string | null | undefined): CrmVNextSourceResultStatus => {
  const status = value?.trim() as CrmVNextSourceResultStatus | undefined;
  if ([
    'bridge_found',
    'found_profile_no_requested_bridge',
    'not_found_limited_search',
    'not_found_exhaustive',
    'blocked',
  ].includes(status ?? '')) return status as CrmVNextSourceResultStatus;
  return 'unknown';
};

const parseDateMs = (value: string | null | undefined): number => {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
};

const safeSourceResult = (
  entry: CrmVNextSourceResultLedgerEntry,
): CrmVNextCandidateSourceResultHistory => ({
  ledgerEntryId: entry.ledgerEntryId ?? null,
  recordedAt: entry.recordedAt ?? null,
  sourceSystem: entry.sourceSystem ?? null,
  sourceResultStatus: sourceResultStatus(entry.sourceResultStatus),
  resultStrength: entry.resultStrength ?? null,
  sourceExhaustion: entry.sourceExhaustion ?? null,
  operationalMeaning: entry.operationalMeaning ?? null,
  retryPolicy: entry.retryPolicy ?? null,
});

const sourceResultHistoryFor = (
  card: PersonCardVNext,
  entries: CrmVNextSourceResultLedgerEntry[],
): CrmVNextCandidateSourceResultHistory[] => {
  const keys = new Set(candidateContactKeys(card));
  const seen = new Set<string>();
  return entries
    .filter((entry) => {
      const key = normalizeContactKey(entry.contactKey ?? null);
      return key ? keys.has(key) : false;
    })
    .sort((left, right) => parseDateMs(right.recordedAt ?? null) - parseDateMs(left.recordedAt ?? null))
    .flatMap((entry) => {
      const safe = safeSourceResult(entry);
      const dedupeKey = safe.ledgerEntryId ?? [
        safe.recordedAt,
        safe.sourceSystem,
        safe.sourceResultStatus,
        safe.resultStrength,
      ].join('|');
      if (seen.has(dedupeKey)) return [];
      seen.add(dedupeKey);
      return [safe];
    })
    .slice(0, 5);
};

const sourceResultGuidanceFor = (
  history: CrmVNextCandidateSourceResultHistory[],
): string[] => {
  const guidance: string[] = [];
  if (history.some((entry) => entry.sourceResultStatus === 'found_profile_no_requested_bridge')) {
    guidance.push('Source-result ledger: exact source profile was already opened and visible checked fields did not contain the requested bridge. Do not repeat the same profile read; continue with other lanes or new export/API/custom-field evidence.');
  }
  if (history.some((entry) => entry.sourceResultStatus === 'not_found_limited_search')) {
    guidance.push('Source-result ledger: previous source search was limited/not exhaustive. Retry only with a stronger exact-anchor route such as custom-field filter, API/export if available, or another official-flow source.');
  }
  if (history.some((entry) => entry.sourceResultStatus === 'blocked')) {
    guidance.push('Source-result ledger: a previous source check was blocked. Pause into awaiting_human_unblock before treating this lane as complete.');
  }
  if (history.some((entry) => entry.sourceResultStatus === 'bridge_found')) {
    guidance.push('Source-result ledger: a prior source reported a bridge. Route through normal evidence import/card-write approval before rerunning discovery.');
  }
  return unique(guidance);
};

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
  sourceResultGuidance: string[] = [],
): string[] => {
  const text = card ? evidenceText(card) : '';
  const lanes = lane === 'ig_to_email'
    ? [
      ...sourceResultGuidance,
      'Instagram Messages UI read-only search by handle/name; capture compact thread context only.',
      hasAny(text, ['manychat', 'lead-capture', 'vercel', 'proxy', 'onboarding'])
        ? 'ManyChat / Vercel proxy / lead-capture traces read-only.'
        : 'Lead-capture / ManyChat / Vercel traces if the person appears to be official-flow origin.',
      'MailerLite cursor scan + local filter by handle/display name; do not use subscriber search as sole source.',
      'Gmail / Drive / Contacts read-only only if the first lanes do not close the email bridge.',
      'Local Mantis-Reports and CRM ledgers before asking Alejandro.',
    ]
    : [
      ...sourceResultGuidance,
      'MailerLite subscriber fields/groups/source_of_subscriber read-only; cursor pagination + local filtering.',
      'Instagram Messages UI read-only search by email/name/phone if available.',
      hasAny(text, ['gmail', 'reply'])
        ? 'Gmail reply metadata/snippet review for handle clues, without full-body export.'
        : 'Gmail reply metadata/snippets only if the person has newsletter-reply evidence.',
      'ManyChat / Vercel proxy / lead-capture traces when the email looks official-flow origin.',
      'Contacts and Drive/Sheets read-only for phone/location/name bridges.',
    ];

  return unique(lanes);
};

const candidateAction = (
  lane: CrmVNextOmnichannelCoverageLane,
  potential: CrmVNextOmnichannelCandidate['bridgePotential'],
  sourceResultGuidance: string[] = [],
): string => {
  if (sourceResultGuidance.some((item) => item.includes('previous source search was limited'))) {
    return 'Run a stronger exact-anchor retry, not a repeat of the weak search; preserve result class in the source-result ledger.';
  }
  if (sourceResultGuidance.some((item) => item.includes('exact source profile was already opened'))) {
    return 'Skip repeated profile-read work for that source and continue with other high-value lanes before asking Alejandro.';
  }
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
  sourceResults: CrmVNextSourceResultLedgerEntry[] = [],
): Omit<CrmVNextOmnichannelCandidate, 'rank'> => {
  const breakdown = scoreCandidate(card);
  const potential = bridgePotential(breakdown);
  const sourceResultHistory = sourceResultHistoryFor(card, sourceResults);
  const sourceResultGuidance = sourceResultGuidanceFor(sourceResultHistory);
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
    sourceLanes: sourceLanesFor(lane, card, sourceResultGuidance),
    sourceResultHistory,
    sourceResultGuidance,
    suggestedMantisAction: candidateAction(lane, potential, sourceResultGuidance),
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
      const history = candidate.sourceResultGuidance.length
        ? `; source-result memory: ${candidate.sourceResultGuidance.join(' ')}`
        : '';
      return `- ${identity || candidate.personId}: ${candidate.gap}; source lanes: ${candidate.sourceLanes.slice(0, 3).join(' | ')}${history}`;
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
    '- Clasifica resultados por fuente: bridge_found, found_profile_no_requested_bridge, not_found_limited_search, not_found_exhaustive o blocked. No trates una busqueda limitada como fuente agotada.',
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
  const sourceResults = options.sourceResults ?? [];

  const igToEmailAll = laneMatched(cards, 'ig_to_email');
  const emailToInstagramAll = laneMatched(cards, 'email_to_instagram');
  const igToEmail = rankCandidates(igToEmailAll.map((card) => toCandidate(card, 'ig_to_email', sourceResults)))
    .slice(0, Math.min(igToEmailLimit, limit));
  const remainingCandidateSlots = Math.max(0, limit - igToEmail.length);
  const emailToInstagram = rankCandidates(emailToInstagramAll.map((card) => toCandidate(card, 'email_to_instagram', sourceResults)))
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
      sourceResultLedgerEntries: sourceResults.length,
      sourceResultAwareCandidates: candidates.filter((candidate) => candidate.sourceResultHistory.length).length,
      sourceResultLimitedSearchRetryCandidates: candidates.filter((candidate) =>
        candidate.sourceResultHistory.some((entry) => entry.sourceResultStatus === 'not_found_limited_search'),
      ).length,
      sourceResultProfileCheckedNoBridgeCandidates: candidates.filter((candidate) =>
        candidate.sourceResultHistory.some((entry) => entry.sourceResultStatus === 'found_profile_no_requested_bridge'),
      ).length,
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

export const readCrmVNextSourceResultLedger = async (
  filePath: string | null | undefined = DEFAULT_CRM_VNEXT_SOURCE_RESULT_LEDGER_PATH,
): Promise<CrmVNextSourceResultLedgerEntry[]> => {
  if (!filePath) return [];
  try {
    const text = await readFile(filePath, 'utf8');
    return text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .flatMap((line) => {
        try {
          const parsed = JSON.parse(line) as CrmVNextSourceResultLedgerEntry;
          return parsed && typeof parsed === 'object' ? [parsed] : [];
        } catch {
          return [];
        }
      });
  } catch {
    return [];
  }
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
  const sourceResults = options.sourceResults ?? await readCrmVNextSourceResultLedger(options.sourceResultLedgerPath);
  const report = buildCrmVNextOmnichannelCoveragePushFromCards(sourceResult.cards, {
    ...options,
    sourceResults,
  });
  return {
    ...report,
    source: publicPersonCardsVNextSource(sourceResult.source),
  };
};
