import { describe, expect, test } from 'vitest';
import { buildWebhookIdentityClaims, resolveWebhookIdentity } from '../lib/manychat/webhook-identity.js';

describe('manychat webhook identity stitching', () => {
  test('builds claims from canonical contact fields', () => {
    const claims = buildWebhookIdentityClaims({
      email: ' person@example.com ',
      phone: ' +57 311 555 7788 ',
      manychat_contact_id: 'mc-123',
      ig_user_id: 'ig-45',
      instagram_username: '@ExampleUser',
    });

    expect(claims).toEqual({
      email: 'person@example.com',
      phone: '+57 311 555 7788',
      manychat_contact_id: 'mc-123',
      ig_user_id: 'ig-45',
      instagram_username: '@ExampleUser',
    });
  });

  test('falls back to ig_username when instagram_username is absent (backward compatible)', () => {
    const claims = buildWebhookIdentityClaims({
      ig_username: 'legacy_handle',
    });

    expect(claims.instagram_username).toBe('legacy_handle');
  });

  test('resolves webhook identity using resolver priority and returns match_reason', async () => {
    const result = await resolveWebhookIdentity(
      {
        email: 'priority@example.com',
        phone: '+57 320 111 2233',
      },
      {
        fetchMatches: async (reason, value) => {
          if (reason === 'email' && value === 'priority@example.com') {
            return [{ id: 'contact-priority' }];
          }
          if (reason === 'phone') {
            return [{ id: 'contact-priority' }];
          }
          return [];
        },
      },
    );

    expect(result.status).toBe('matched');
    expect(result.matchReason).toBe('email');
    expect(result.contact?.id).toBe('contact-priority');
  });

  test('blocks unsafe merge when webhook identifiers conflict', async () => {
    const result = await resolveWebhookIdentity(
      {
        email: 'person@example.com',
        manychat_contact_id: 'mc-10',
      },
      {
        fetchMatches: async (reason) => {
          if (reason === 'email') return [{ id: 'contact-email' }];
          if (reason === 'manychat_contact_id') return [{ id: 'contact-manychat' }];
          return [];
        },
      },
    );

    expect(result.status).toBe('conflict');
    expect(result.matchReason).toBeNull();
    expect(result.contact).toBeNull();
  });
});
