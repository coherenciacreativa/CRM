import { describe, expect, test } from 'vitest';
import { buildWhatsAppGroupRosterEvidencePacket } from '../lib/crm/crm-vnext-whatsapp-group-roster-evidence.js';

const card = (overrides: Record<string, unknown> = {}) => ({
  schemaVersion: 'person-card-vnext-2026-05-08',
  personId: 'email:known@example.com',
  displayName: 'Known Person',
  identities: {
    email: 'known@example.com',
    instagramHandle: null,
    instagramUserId: null,
    phone: null,
    city: null,
    country: null,
    ...(overrides.identities as Record<string, unknown> | undefined),
  },
  channels: {
    email: { present: true, status: 'known' },
    instagram: { present: false, status: null },
    whatsapp: { present: false, status: null },
    telegram: { present: false, status: null },
    ...(overrides.channels as Record<string, unknown> | undefined),
  },
  evidence: [],
  updatedAt: '2026-05-27T00:00:00.000Z',
  ...overrides,
});

describe('CRM vNext WhatsApp group roster evidence', () => {
  test('uses exact phone evidence to enrich an existing card without overwriting', () => {
    const packet = buildWhatsAppGroupRosterEvidencePacket({
      now: '2026-05-27T00:00:00.000Z',
      rosterEntries: [{ displayNameRaw: 'Known Person', phone: '+57 300 1112233' }],
      cardStore: { cards: [card({ identities: { email: 'known@example.com', phone: '+573001112233' } })] },
      contacts: [],
    });

    expect(packet.summary.rosterEntries).toBe(1);
    expect(packet.items[0].match.matchKind).toBe('phone_exact_last10');
    expect(packet.items[0].readyWritePreview.status).toBe('ready_for_write_review');
    expect(packet.items[0].readyWritePreview.operations).toContainEqual(
      expect.objectContaining({ operation: 'mark_whatsapp_channel_present' }),
    );
  });

  test('bridges a roster name through Contacts before proposing a card enrichment', () => {
    const packet = buildWhatsAppGroupRosterEvidencePacket({
      now: '2026-05-27T00:00:00.000Z',
      rosterEntries: [{ displayNameRaw: 'Known Person' }],
      contacts: [{
        sourceId: 'contacts:known',
        fullName: 'Known Person',
        emails: ['known@example.com'],
        phones: ['+57 300 1112233'],
      }],
      cardStore: { cards: [card()] },
    });

    expect(packet.items[0].contactsBridge?.matchKind).toBe('contacts_name_exact');
    expect(packet.items[0].identity.phone).toBe('+573001112233');
    expect(packet.items[0].match.matchKind).toBe('email_exact');
    expect(packet.items[0].readyWritePreview.status).toBe('ready_for_write_review');
  });

  test('keeps name-only matches out of the write-ready lane', () => {
    const packet = buildWhatsAppGroupRosterEvidencePacket({
      now: '2026-05-27T00:00:00.000Z',
      rosterEntries: [{ displayNameRaw: 'Known Person' }],
      contacts: [],
      cardStore: { cards: [card()] },
    });

    expect(packet.items[0].match.matchKind).toBe('name_only_existing_card_candidate');
    expect(packet.items[0].readyWritePreview.status).toBe('review_only_or_unresolved');
    expect(packet.summary.readyExistingEnrichments).toBe(0);
  });
});
