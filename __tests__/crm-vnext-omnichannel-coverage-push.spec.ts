import { describe, expect, test } from 'vitest';
import {
  buildCrmVNextOmnichannelCoveragePushFromCards,
} from '../lib/crm/crm-vnext-omnichannel-coverage-push';
import {
  formatCrmVNextOmnichannelCoveragePushMarkdown,
} from '../lib/crm/crm-vnext-omnichannel-coverage-push-markdown';
import { buildPersonCardVNext, type PersonCardVNext } from '../lib/crm/person-card-vnext';

const NOW = '2026-05-24T12:00:00.000Z';

const buildCard = (input: Parameters<typeof buildPersonCardVNext>[0]): PersonCardVNext =>
  buildPersonCardVNext({ now: NOW, ...input });

const cards = (): PersonCardVNext[] => [
  buildCard({
    personId: 'ig:eliana_cadavid',
    displayName: 'Eliana Cadavid',
    identities: {
      instagramHandle: 'cadavid_eli',
      phone: '+573001112233',
      city: 'Medellin',
      country: 'Colombia',
    },
    scoring: {
      instagram: {
        follows: true,
        storyViews30d: 8,
        inboundDm30d: 2,
        lastInteractionAt: '2026-05-21T12:00:00.000Z',
      },
      participation: {
        yogaClasses90d: 6,
        happyCircle90d: 4,
      },
      tags: ['instagram onboarding', 'yoga'],
    },
    evidence: [
      { source: 'instagram_dm_ui', note: 'Official-flow Instagram thread exists.' },
      { source: 'lead-capture vercel proxy', note: 'ManyChat/proxy trace likely contains email/phone.' },
    ],
  }),
  buildCard({
    personId: 'email:pilar@example.com',
    displayName: 'Pilar Quiñones',
    identities: {
      email: 'pilar@example.com',
      phone: '+573009998877',
      city: 'Bogota',
      country: 'Colombia',
    },
    scoring: {
      email: {
        subscriberStatus: 'active',
        replies30d: 1,
        opens90d: 8,
        lifetimeOpens: 12,
        lastReplyAt: '2026-05-20T12:00:00.000Z',
      },
      tags: ['newsletter reply'],
    },
    evidence: [
      { source: 'mailerlite_export', note: 'Subscriber active with onboarding note.' },
      { source: 'gmail_reply_activity', note: 'Thoughtful newsletter reply.' },
    ],
  }),
  buildCard({
    personId: 'email:adriana@example.com',
    displayName: 'Adriana Bernal',
    identities: {
      email: 'adriana@example.com',
      phone: '+573001110000',
      city: 'Bogota',
      country: 'Colombia',
    },
    scoring: {
      participation: {
        yogaClasses90d: 8,
        retreatsAttended: 3,
      },
      tags: ['yoga', 'retiro'],
    },
    evidence: [
      { source: 'human_confirmed', note: 'Adriana Bernal no tiene Instagram.' },
      { source: 'classbot', note: 'Active yoga class recipient.' },
    ],
  }),
  buildCard({
    personId: 'email:cielo@example.com',
    displayName: 'Cielo Gomez',
    identities: {
      email: 'cielo@example.com',
      instagramHandle: 'cielo_gom_g',
      city: 'Bogota',
      country: 'Colombia',
    },
    evidence: [{ source: 'card_store', note: 'Already omnichannel.' }],
  }),
  buildCard({
    personId: 'phone:unknown',
    displayName: 'Unknown Phone Only',
    identities: {
      phone: '+573004445566',
    },
    evidence: [{ source: 'classbot', note: 'Phone-only yoga context.' }],
  }),
];

describe('CRM vNext Omnichannel Coverage Push', () => {
  test('prioritizes bounded email and Instagram identity gaps without writes', () => {
    const report = buildCrmVNextOmnichannelCoveragePushFromCards(cards(), {
      now: NOW,
      limit: 2,
      igToEmailLimit: 1,
      emailToInstagramLimit: 1,
    });

    expect(report.schemaVersion).toBe('crm-vnext-omnichannel-coverage-push-2026-05-26');
    expect(report.mode).toBe('read_only_omnichannel_coverage_push');
    expect(report.generatedAt).toBe(NOW);
    expect(report.summary).toMatchObject({
      cards: 5,
      emailPresent: 3,
      instagramPresent: 2,
      omnichannel: 1,
      missingEmailWithInstagram: 1,
      missingInstagramWithEmail: 1,
      selectedCandidates: 2,
      selectedIgToEmail: 1,
      selectedEmailToInstagram: 1,
      maxOmnichannelLiftFromSelected: 2,
      projectedOmnichannelIfAllSelectedClose: 3,
      projectedOmnichannelCoveragePctIfAllSelectedClose: 60,
      sourceResultLedgerEntries: 0,
      sourceResultAwareCandidates: 0,
    });

    expect(report.candidates.map((candidate) => candidate.lane).sort()).toEqual([
      'email_to_instagram',
      'ig_to_email',
    ]);
    expect(report.candidates.find((candidate) => candidate.lane === 'ig_to_email')).toMatchObject({
      personId: 'ig:eliana_cadavid',
      gap: 'missing_email',
      identities: { instagramHandle: 'cadavid_eli', email: null },
      bridgePotential: 'high',
    });
    expect(report.candidates.find((candidate) => candidate.lane === 'email_to_instagram')).toMatchObject({
      personId: 'email:pilar@example.com',
      gap: 'missing_instagram',
      identities: { email: 'pilar@example.com', instagramHandle: null },
    });
    expect(report.candidates.map((candidate) => candidate.personId)).not.toContain('email:adriana@example.com');

    expect(report.mantisPrompt).toContain('cursor pagination + filtrado local');
    expect(report.mantisPrompt).toContain('Instagram UI pide login');
    expect(report.mantisPrompt).toContain('weak_name_only_hit');
    expect(report.mantisPrompt).toContain('email/teléfono dentro de Instagram Messages UI');
    expect(report.mantisPrompt).toContain('bridge_found, found_profile_no_requested_bridge');
    expect(report.safety).toMatchObject({
      localOnly: true,
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      operationsExecuted: 0,
    });
    expect(JSON.stringify(report)).not.toContain('/Users/');
  });

  test('renders a Mantis-ready Markdown report', () => {
    const report = buildCrmVNextOmnichannelCoveragePushFromCards(cards(), {
      now: NOW,
      limit: 2,
      igToEmailLimit: 1,
      emailToInstagramLimit: 1,
    });
    const markdown = formatCrmVNextOmnichannelCoveragePushMarkdown(report);

    expect(markdown).toContain('# CRM vNext - Omnichannel Coverage Push');
    expect(markdown).toContain('## Mantis Prompt');
    expect(markdown).toContain('Eliana Cadavid');
    expect(markdown).toContain('Pilar Quiñones');
    expect(markdown).toContain('No outbound messages.');
  });

  test('injects source-result memory into candidate guidance', () => {
    const report = buildCrmVNextOmnichannelCoveragePushFromCards(cards(), {
      now: NOW,
      limit: 2,
      igToEmailLimit: 1,
      emailToInstagramLimit: 1,
      sourceResults: [
        {
          ledgerEntryId: 'source_result_test_eliana',
          recordedAt: NOW,
          sourceSystem: 'ManyChat Contacts UI',
          contactKey: 'ig:cadavid_eli',
          sourceResultStatus: 'found_profile_no_requested_bridge',
          resultStrength: 'negative_strong_for_visible_profile_fields',
          sourceExhaustion: 'exhausted_for_visible_manychat_profile_fields',
          retryPolicy: 'Do not repeat the same profile read.',
        },
        {
          ledgerEntryId: 'source_result_test_pilar',
          recordedAt: NOW,
          sourceSystem: 'ManyChat Contacts UI',
          contactKey: 'email:pilar@example.com',
          sourceResultStatus: 'not_found_limited_search',
          resultStrength: 'negative_weak_due_to_ui_capability',
          sourceExhaustion: 'not_exhausted',
          retryPolicy: 'Retry only with custom-field filter or export.',
        },
      ],
    });

    expect(report.summary).toMatchObject({
      sourceResultLedgerEntries: 2,
      sourceResultAwareCandidates: 2,
      sourceResultLimitedSearchRetryCandidates: 1,
      sourceResultProfileCheckedNoBridgeCandidates: 1,
    });

    const eliana = report.candidates.find((candidate) => candidate.personId === 'ig:eliana_cadavid');
    expect(eliana?.sourceResultHistory[0]).toMatchObject({
      sourceResultStatus: 'found_profile_no_requested_bridge',
      sourceExhaustion: 'exhausted_for_visible_manychat_profile_fields',
    });
    expect(eliana?.suggestedMantisAction).toContain('Skip repeated profile-read work');

    const pilar = report.candidates.find((candidate) => candidate.personId === 'email:pilar@example.com');
    expect(pilar?.sourceResultHistory[0]).toMatchObject({
      sourceResultStatus: 'not_found_limited_search',
      sourceExhaustion: 'not_exhausted',
    });
    expect(pilar?.sourceLanes[0]).toContain('previous source search was limited');
    expect(report.mantisPrompt).toContain('source-result memory');
  });

  test('handles an empty card store as observe-only planning', () => {
    const report = buildCrmVNextOmnichannelCoveragePushFromCards([], {
      now: NOW,
      limit: 5,
    });

    expect(report.summary).toMatchObject({
      cards: 0,
      selectedCandidates: 0,
      projectedOmnichannelCoveragePctIfAllSelectedClose: 0,
    });
    expect(report.candidates).toEqual([]);
    expect(report.mantisPrompt).toContain('No candidates selected.');
  });
});
