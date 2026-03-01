import {
  resolveContactIdentity,
  type ContactIdentityClaims,
  type ContactIdentityResolution,
  type ContactIdentityResolverDeps,
} from '../crm/contact-identity-resolver.js';

const toSafeString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') return String(value);
  return undefined;
};

export const buildWebhookIdentityClaims = (
  record: Record<string, unknown>,
): ContactIdentityClaims => {
  const instagramUsername =
    toSafeString(record.instagram_username) ??
    toSafeString(record.ig_username) ??
    null;

  return {
    email: toSafeString(record.email) ?? null,
    phone: toSafeString(record.phone) ?? null,
    manychat_contact_id: toSafeString(record.manychat_contact_id) ?? null,
    ig_user_id: toSafeString(record.ig_user_id) ?? null,
    instagram_username: instagramUsername,
  };
};

export const resolveWebhookIdentity = async (
  record: Record<string, unknown>,
  deps: ContactIdentityResolverDeps = {},
): Promise<ContactIdentityResolution> => {
  const claims = buildWebhookIdentityClaims(record);
  return resolveContactIdentity(claims, deps);
};
