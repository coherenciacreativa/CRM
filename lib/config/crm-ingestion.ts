export type CrmIngestionFlags = {
  enabled: boolean;
  shadowOnly: boolean;
  allowlist: Set<string>;
  directFallback: boolean;
};

const TRUE_VALUES = new Set(['1', 'true', 'yes', 'on']);

const toBoolean = (value: string | undefined, fallback: boolean): boolean => {
  if (typeof value !== 'string') return fallback;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return fallback;
  return TRUE_VALUES.has(normalized);
};

const normalizeToken = (value: string): string => value.trim().toLowerCase();

export const parseAllowlist = (value: string | undefined): Set<string> => {
  if (!value) return new Set<string>();
  return new Set(
    value
      .split(',')
      .map((entry) => normalizeToken(entry))
      .filter(Boolean),
  );
};

export const getCrmIngestionFlags = (): CrmIngestionFlags => ({
  enabled: toBoolean(process.env.CRM_INGESTION_ENABLED, false),
  shadowOnly: toBoolean(process.env.CRM_INGESTION_SHADOW_ONLY, true),
  allowlist: parseAllowlist(process.env.CRM_FLOW_ALLOWLIST),
  directFallback: toBoolean(process.env.MANYCHAT_DIRECT_FALLBACK, true),
});

export const isFlowAllowed = (
  flowId: string | undefined,
  flowName: string | undefined,
  allowlist: Set<string>,
): boolean => {
  if (!allowlist.size) return false;
  const normalizedId = flowId ? normalizeToken(flowId) : '';
  const normalizedName = flowName ? normalizeToken(flowName) : '';
  if (normalizedId && allowlist.has(normalizedId)) return true;
  if (normalizedName && allowlist.has(normalizedName)) return true;
  return false;
};
