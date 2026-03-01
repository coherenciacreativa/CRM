import { describe, expect, test } from 'vitest';
import {
  CONTACT_IDENTITY_PRIORITY,
  resolveContactIdentity,
  type IdentityMatchReason,
} from '../lib/crm/contact-identity-resolver.js';

type Contact = Record<string, unknown>;

const contact = (id: string, extras: Record<string, unknown> = {}): Contact => ({ id, ...extras });

describe('contact identity resolver', () => {
  test('keeps the configured trusted identifier priority order', () => {
    expect(CONTACT_IDENTITY_PRIORITY).toEqual([
      'email',
      'phone',
      'manychat_contact_id',
      'ig_user_id',
      'instagram_username',
    ]);
  });

  test('selects highest-priority matched identifier when multiple identifiers map to same contact', async () => {
    const rows: Record<string, Array<Contact>> = {
      'email:a@example.com': [contact('c-1')],
      'phone:573001112233': [contact('c-1')],
      'manychat_contact_id:mc-9': [contact('c-1')],
    };

    const calls: IdentityMatchReason[] = [];
    const result = await resolveContactIdentity(
      {
        email: 'A@EXAMPLE.COM',
        phone: '+57 300 111 2233',
        manychat_contact_id: 'mc-9',
      },
      {
        fetchMatches: async (reason, value) => {
          calls.push(reason);
          return rows[`${reason}:${value}`] ?? [];
        },
      },
    );

    expect(calls).toEqual(['email', 'phone', 'manychat_contact_id']);
    expect(result.status).toBe('matched');
    expect(result.matchReason).toBe('email');
    expect(result.contact?.id).toBe('c-1');
  });

  test('returns conflict when trusted identifiers map to different contacts', async () => {
    const rows: Record<string, Array<Contact>> = {
      'email:person@example.com': [contact('c-email')],
      'phone:+573009998877': [contact('c-phone')],
    };

    const result = await resolveContactIdentity(
      {
        email: 'person@example.com',
        phone: '+57 300 999 8877',
      },
      {
        fetchMatches: async (reason, value) => rows[`${reason}:${value}`] ?? [],
      },
    );

    expect(result.status).toBe('conflict');
    expect(result.matchReason).toBeNull();
    expect(result.contact).toBeNull();
    expect(result.conflictReasons).toEqual([{ reason: 'phone', contactId: 'c-phone' }]);
  });

  test('returns ambiguous when any identifier lookup returns multiple records', async () => {
    const result = await resolveContactIdentity(
      {
        email: 'dup@example.com',
      },
      {
        fetchMatches: async () => [contact('c-1'), contact('c-2')],
      },
    );

    expect(result.status).toBe('ambiguous');
    expect(result.matchReason).toBeNull();
    expect(result.contact).toBeNull();
  });

  test('never resolves by name-only payloads (no trusted identifiers)', async () => {
    const result = await resolveContactIdentity(
      {
        // Intentionally no trusted keys
      },
      {
        fetchMatches: async () => [contact('c-1')],
      },
    );

    expect(result.status).toBe('none');
    expect(result.matchReason).toBeNull();
    expect(result.contact).toBeNull();
  });
});
