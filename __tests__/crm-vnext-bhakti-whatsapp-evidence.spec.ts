import { describe, expect, test } from 'vitest';
import {
  buildBhaktiWhatsappEvidencePacket,
  cleanEmail,
  normalizePhone,
} from '../lib/crm/crm-vnext-bhakti-whatsapp-evidence.js';

const card = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 'person-card-vnext-2026-05-08',
  personId: 'email:ana@example.com',
  displayName: 'Ana Example',
  identities: {
    email: 'ana@example.com',
    instagramHandle: null,
    instagramUserId: null,
    phone: null,
    city: null,
    country: null,
  },
  channels: {
    email: { present: true, status: 'known' },
    instagram: { present: false, status: null },
    whatsapp: { present: false, status: null },
    telegram: { present: false, status: null },
  },
  products: {
    yogaClasses90d: 0,
    happyCircle90d: 0,
    retreatsAttended: 0,
    totalSpend: 0,
    purchaseCount: 0,
    activeClient: false,
  },
  scoring: {},
  evidence: [],
  nextAction: { code: 'keep_warming', requiresHumanReview: false, reason: '' },
  updatedAt: '2026-05-01T00:00:00.000Z',
  ...overrides,
});

const user = (overrides: Record<string, unknown> = {}) => ({
  id: 1,
  email: 'ana@example.com',
  phone_e164: '+573001112233',
  name: 'Ana Example',
  status: 'active',
  source: 'mailerlite',
  day_index: 4,
  route_mode: 'marketing',
  time_code: 'morning',
  tz: 'America/Bogota',
  trial_started_at: '2026-05-01T00:00:00.000Z',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-05T00:00:00.000Z',
  last_inbound_at: '2026-05-04T00:00:00.000Z',
  links_sent_at: '2026-05-03T00:00:00.000Z',
  qa_sent_at: '2026-05-02T00:00:00.000Z',
  ...overrides,
});

describe('Bhakti WhatsApp evidence adapter', () => {
  test('normalizes email and phone anchors', () => {
    expect(cleanEmail('  Ana@Example.COM  ')).toBe('ana@example.com');
    expect(normalizePhone('whatsapp:+57 300 111 2233')).toBe('+573001112233');
  });

  test('proposes phone enrichment when Bhakti email matches a CRM card missing phone', () => {
    const packet = buildBhaktiWhatsappEvidencePacket({
      users: [user()],
      cardStore: { cards: [card()] },
      now: '2026-05-27T00:00:00.000Z',
    });

    expect(packet.summary.usersRead).toBe(1);
    expect(packet.summary.matchedByEmail).toBe(1);
    expect(packet.summary.readyExistingEnrichments).toBe(1);
    expect(packet.readyWriteItems[0].readyWritePreview.operations.map((op: any) => op.operation)).toContain('set_identity_phone_if_absent');
    expect(packet.signalEvents.map((event: any) => event.eventKind)).toEqual(['recording_delivery', 'unknown']);
  });

  test('does not overwrite an existing conflicting phone', () => {
    const packet = buildBhaktiWhatsappEvidencePacket({
      users: [user()],
      cardStore: {
        cards: [
          card({
            identities: {
              email: 'ana@example.com',
              instagramHandle: null,
              instagramUserId: null,
              phone: '+573009998888',
              city: null,
              country: null,
            },
          }),
          card({
            personId: 'phone:+573001112233',
            identities: {
              email: null,
              instagramHandle: null,
              instagramUserId: null,
              phone: '+573001112233',
              city: null,
              country: null,
            },
          }),
        ],
      },
      now: '2026-05-27T00:00:00.000Z',
    });

    expect(packet.summary.reviewOnly).toBe(1);
    expect(packet.summary.readyForWriteReview).toBe(0);
    expect(packet.reviewOnlyItems[0].match.matchKind).toBe('email_match_phone_points_elsewhere');
  });

  test('proposes review-card creation only when email and phone are both present', () => {
    const packet = buildBhaktiWhatsappEvidencePacket({
      users: [user({ id: 2, email: 'nuevo@example.com', phone_e164: '+573009991111' })],
      cardStore: { cards: [card()] },
      now: '2026-05-27T00:00:00.000Z',
    });

    expect(packet.summary.readyNewCardProposals).toBe(1);
    expect(packet.readyWriteItems[0].readyWritePreview.recommendedAction).toBe('stage_create_review_card');
    expect(packet.readyWriteItems[0].readyWritePreview.operations[0].card.identities.email).toBe('nuevo@example.com');
  });

  test('excludes internal test users from write and signal packets', () => {
    const packet = buildBhaktiWhatsappEvidencePacket({
      users: [user({ id: 3, name: 'Alejandro Test', email: 'saludoalsol+something@gmail.com', phone_e164: '+573102862163' })],
      cardStore: { cards: [] },
      now: '2026-05-27T00:00:00.000Z',
    });

    expect(packet.summary.excludedInternalTestUsers).toBe(1);
    expect(packet.summary.readyForWriteReview).toBe(0);
    expect(packet.summary.signalEventsPrepared).toBe(0);
  });
});
