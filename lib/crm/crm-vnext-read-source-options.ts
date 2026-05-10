import type { NextApiRequest } from 'next';
import {
  DEFAULT_CRM_VNEXT_PERSON_CARD_STORE_PATH,
  DEFAULT_LEGACY_PERSON_CARDS_V1_PATH,
} from './community-insights-source';
import { allowCrmVNextLocalQueryOverrides } from './crm-vnext-api-guard';

export type CrmVNextReadSourceOptions = {
  legacyPath: string;
  cardStorePath: string;
  preferStore: boolean;
};

const getQueryString = (value: string | string[] | undefined): string | null => {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  return trimmed || null;
};

export const resolveCrmVNextReadSourceOptions = (req: NextApiRequest): CrmVNextReadSourceOptions => {
  const allowLocalQueryOverrides = allowCrmVNextLocalQueryOverrides(req);
  const legacyPathOverride = allowLocalQueryOverrides ? getQueryString(req.query.sourcePath) : null;
  const cardStorePathOverride = allowLocalQueryOverrides ? getQueryString(req.query.cardStorePath) : null;
  const preferStoreOverride = getQueryString(req.query.preferStore);

  const legacyPath =
    legacyPathOverride
    || process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH
    || DEFAULT_LEGACY_PERSON_CARDS_V1_PATH;
  const cardStorePath =
    cardStorePathOverride
    || process.env.CRM_VNEXT_PERSON_CARD_STORE_PATH
    || DEFAULT_CRM_VNEXT_PERSON_CARD_STORE_PATH;

  return {
    legacyPath,
    cardStorePath,
    preferStore:
      preferStoreOverride === '0'
        ? false
        : preferStoreOverride === '1'
          ? true
          : !legacyPathOverride || Boolean(cardStorePathOverride),
  };
};
