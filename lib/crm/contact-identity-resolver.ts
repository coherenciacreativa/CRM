import { sbSelect } from '../utils/sb.js';

export type IdentityMatchReason =
  | 'email'
  | 'phone'
  | 'manychat_contact_id'
  | 'ig_user_id'
  | 'instagram_username';

export type ContactIdentityClaims = {
  email?: string | null;
  phone?: string | null;
  manychat_contact_id?: string | null;
  ig_user_id?: string | null;
  instagram_username?: string | null;
};

export type ContactIdentityResolutionStatus = 'matched' | 'none' | 'ambiguous' | 'conflict';

export type ContactIdentityLookupHit = {
  reason: IdentityMatchReason;
  value: string;
  hitCount: number;
  contactIds: string[];
};

export type ContactIdentityResolution = {
  status: ContactIdentityResolutionStatus;
  matchReason: IdentityMatchReason | null;
  contact: Record<string, unknown> | null;
  lookedUp: ContactIdentityLookupHit[];
  conflictReasons?: Array<{
    reason: IdentityMatchReason;
    contactId: string;
  }>;
};

export type ContactIdentityResolverDeps = {
  fetchMatches?: (reason: IdentityMatchReason, value: string) => Promise<Array<Record<string, unknown>>>;
};

const PRIORITY_ORDER: IdentityMatchReason[] = [
  'email',
  'phone',
  'manychat_contact_id',
  'ig_user_id',
  'instagram_username',
];

const toSafeString = (value: unknown): string | undefined => {
  if (value == null) return undefined;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || undefined;
  }
  if (typeof value === 'number') return String(value);
  return undefined;
};

const normalizeEmail = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.toLowerCase();
};

const normalizePhone = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const plus = value.trim().startsWith('+');
  const digits = value.replace(/[^\d]/g, '');
  if (!digits) return undefined;
  return plus ? `+${digits}` : digits;
};

const normalizeInstagramUsername = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  const normalized = value.trim().replace(/^@+/, '').toLowerCase();
  return normalized || undefined;
};

const normalizeIdentifier = (value: string | undefined): string | undefined => {
  if (!value) return undefined;
  return value.trim() || undefined;
};

const getContactId = (record: Record<string, unknown>): string | undefined => {
  const raw = toSafeString(record.id);
  return raw?.trim() || undefined;
};

const defaultFetchMatches = async (
  reason: IdentityMatchReason,
  value: string,
): Promise<Array<Record<string, unknown>>> => {
  const result = await sbSelect(
    `contacts?select=*&${reason}=eq.${encodeURIComponent(value)}&limit=2`,
  );
  if (!result.ok || !Array.isArray(result.json)) return [];
  return result.json as Array<Record<string, unknown>>;
};

const normalizeClaims = (claims: ContactIdentityClaims): Partial<Record<IdentityMatchReason, string>> => {
  const email = normalizeEmail(toSafeString(claims.email));
  const phone = normalizePhone(toSafeString(claims.phone));
  const manychatId = normalizeIdentifier(toSafeString(claims.manychat_contact_id));
  const igUserId = normalizeIdentifier(toSafeString(claims.ig_user_id));
  const instagramUsername = normalizeInstagramUsername(toSafeString(claims.instagram_username));

  return {
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
    ...(manychatId ? { manychat_contact_id: manychatId } : {}),
    ...(igUserId ? { ig_user_id: igUserId } : {}),
    ...(instagramUsername ? { instagram_username: instagramUsername } : {}),
  };
};

export const resolveContactIdentity = async (
  claims: ContactIdentityClaims,
  deps: ContactIdentityResolverDeps = {},
): Promise<ContactIdentityResolution> => {
  const normalized = normalizeClaims(claims);
  const fetchMatches = deps.fetchMatches ?? defaultFetchMatches;

  const lookedUp: ContactIdentityLookupHit[] = [];
  const singleMatches: Array<{
    reason: IdentityMatchReason;
    value: string;
    contact: Record<string, unknown>;
    contactId: string;
  }> = [];

  for (const reason of PRIORITY_ORDER) {
    const value = normalized[reason];
    if (!value) continue;

    const matches = await fetchMatches(reason, value);
    const contactIds = matches.map((item) => getContactId(item)).filter((id): id is string => Boolean(id));
    lookedUp.push({
      reason,
      value,
      hitCount: matches.length,
      contactIds,
    });

    if (matches.length > 1) {
      return {
        status: 'ambiguous',
        matchReason: null,
        contact: null,
        lookedUp,
      };
    }

    if (matches.length === 1) {
      const contact = matches[0];
      const contactId = getContactId(contact);
      if (!contactId) {
        return {
          status: 'ambiguous',
          matchReason: null,
          contact: null,
          lookedUp,
        };
      }

      singleMatches.push({
        reason,
        value,
        contact,
        contactId,
      });
    }
  }

  if (!singleMatches.length) {
    return {
      status: 'none',
      matchReason: null,
      contact: null,
      lookedUp,
    };
  }

  const primaryMatch = singleMatches[0];
  const conflicts = singleMatches
    .slice(1)
    .filter((match) => match.contactId !== primaryMatch.contactId)
    .map((match) => ({ reason: match.reason, contactId: match.contactId }));

  if (conflicts.length) {
    return {
      status: 'conflict',
      matchReason: null,
      contact: null,
      lookedUp,
      conflictReasons: conflicts,
    };
  }

  return {
    status: 'matched',
    matchReason: primaryMatch.reason,
    contact: primaryMatch.contact,
    lookedUp,
  };
};

export const CONTACT_IDENTITY_PRIORITY = [...PRIORITY_ORDER];
