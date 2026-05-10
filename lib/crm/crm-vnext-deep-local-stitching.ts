import { createHash } from 'node:crypto';
import { readdir, readFile, stat } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';
import { homedir } from 'node:os';
import type { CrmFactIntakeInput } from './crm-vnext-fact-intake';
import {
  buildCrmVNextIdentityStitchingResearch,
  type CrmIdentityStitchingClue,
  type CrmIdentityStitchingResearchInput,
  type CrmIdentityStitchingResearchReport,
} from './crm-vnext-identity-stitching-research';
import { crmVNextExpandNameToken, crmVNextNameCompatible } from './crm-vnext-name-matching';
import type { PersonCardVNext } from './person-card-vnext';

export const CRM_VNEXT_DEEP_LOCAL_STITCHING_SCHEMA_VERSION =
  'crm-vnext-deep-local-stitching-2026-05-10' as const;

const MEMORY_ROOT = join(homedir(), '.openclaw-lakshmi', 'workspace', 'memory');
const DOWNLOADS_ROOT = join(homedir(), 'Downloads');
const DOCUMENTS_ROOT = join(homedir(), 'Documents');
const DOCUMENTS_CONTACTS_ROOT = join(DOCUMENTS_ROOT, 'Contactos');
const DOCUMENTS_SOCIAL_ROOT = join(DOCUMENTS_ROOT, 'Social');
const DOCUMENTS_MANTIS_REPORTS_ROOT = join(DOCUMENTS_ROOT, 'Mantis-Reports');
const DOCUMENTS_CREATIVO_TALLERES_ROOT = join(DOCUMENTS_ROOT, 'Creativo', 'Talleres');

export const DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS = [
  MEMORY_ROOT,
] as const;

export type CrmDeepLocalSourceKind =
  | 'crm_memory_fabric'
  | 'telegram_chat_memory'
  | 'daily_memory'
  | 'workspace_memory'
  | 'local_csv'
  | 'retreat_table'
  | 'contacts_export'
  | 'gmail_export'
  | 'contacts_app_export'
  | 'mailerlite_export'
  | 'google_drive_export'
  | 'lead_capture_export'
  | 'downloaded_file'
  | 'local_fixture';

export type CrmDeepLocalSourceRoot = {
  root: string;
  sourceKind?: CrmDeepLocalSourceKind | null;
  sourceIdPrefix?: string | null;
  maxFiles?: number | null;
  maxFileBytes?: number | null;
};

export type CrmDeepLocalSourceRootInput = string | CrmDeepLocalSourceRoot;

export const DEFAULT_CRM_VNEXT_EXPANDED_LOCAL_EVIDENCE_ROOTS: CrmDeepLocalSourceRootInput[] = [
  {
    root: DOWNLOADS_ROOT,
    sourceKind: 'downloaded_file',
    sourceIdPrefix: 'downloads',
    maxFiles: 600,
  },
  {
    root: DOCUMENTS_CONTACTS_ROOT,
    sourceKind: 'contacts_export',
    sourceIdPrefix: 'documents-contacts',
    maxFiles: 600,
  },
  {
    root: DOCUMENTS_SOCIAL_ROOT,
    sourceKind: 'contacts_export',
    sourceIdPrefix: 'documents-social',
    maxFiles: 250,
  },
  {
    root: DOCUMENTS_MANTIS_REPORTS_ROOT,
    sourceKind: 'downloaded_file',
    sourceIdPrefix: 'mantis-reports',
    maxFiles: 250,
  },
  {
    root: DOCUMENTS_CREATIVO_TALLERES_ROOT,
    sourceKind: 'downloaded_file',
    sourceIdPrefix: 'documents-creativo-talleres',
    maxFiles: 250,
  },
  {
    root: MEMORY_ROOT,
    sourceIdPrefix: 'memory',
  },
];

export type CrmDeepLocalSource = {
  sourceId: string;
  sourceKind: CrmDeepLocalSourceKind;
  text: string;
};

export type CrmConnectedEvidenceSourceInput = {
  sourceKind?: CrmDeepLocalSourceKind | null;
  sourceId?: string | null;
  title?: string | null;
  subject?: string | null;
  sender?: string | null;
  recipient?: string | null;
  email?: string | null;
  handle?: string | null;
  observedAt?: string | null;
  snippet?: string | null;
  text?: string | null;
};

export type CrmDeepLocalStitchingHit = {
  hitId: string;
  sourceId: string;
  sourceKind: CrmDeepLocalSourceKind;
  lineNumber: number | null;
  snippet: string;
  score: number;
  confidence: 'strong' | 'medium' | 'weak';
  matchedIdentityTerms: string[];
  contextSignals: string[];
  identitySignals: {
    fullNameCandidates: string[];
    emails: string[];
    phones: string[];
    instagramHandles: string[];
  };
  evidenceUse: 'identity_stitching_context_only';
};

export type CrmDeepLocalIdentityField =
  | 'fullName'
  | 'email'
  | 'phone'
  | 'instagramHandle';

export type CrmDeepLocalIdentitySummary = {
  fullNameCandidates: string[];
  emails: string[];
  phones: string[];
  instagramHandles: string[];
  presentFields: CrmDeepLocalIdentityField[];
  missingContactFields: Array<'email' | 'phone' | 'instagramHandle'>;
  sourceKindsWithIdentitySignals: Partial<Record<CrmDeepLocalSourceKind, number>>;
};

export type CrmDeepLocalStitchingClue = {
  clueId: string;
  person: CrmIdentityStitchingClue['person'];
  identityResearchRecommendation: CrmIdentityStitchingClue['recommendation']['action'];
  searchTerms: string[];
  hits: CrmDeepLocalStitchingHit[];
  identitySummary: CrmDeepLocalIdentitySummary;
  recommendation: {
    action:
      | 'review_deep_local_evidence'
      | 'defer_new_card_creation'
      | 'new_card_creation_not_blocked_by_deep_search'
      | 'needs_more_identity';
    requiresHumanDecision: boolean;
    reason: string;
    suggestedNextSteps: string[];
  };
};

export type CrmDeepLocalStitchingReport = {
  schemaVersion: typeof CRM_VNEXT_DEEP_LOCAL_STITCHING_SCHEMA_VERSION;
  generatedAt: string;
  mode: 'read_only_deep_local_stitching';
  research: CrmIdentityStitchingResearchReport;
  sourceCoverage: {
    localSources: {
      searched: true;
      sources: number;
      filesScanned: number;
      filesSkipped: number;
      roots: number;
      connectedEvidenceSources: number;
      localPathsRedacted: true;
      sourceKinds: Partial<Record<CrmDeepLocalSourceKind, number>>;
    };
  };
  summary: {
    clues: number;
    cluesWithHits: number;
    hits: number;
    strongHits: number;
    mediumHits: number;
    weakHits: number;
    newCardCreationsDeferred: number;
    newCardCreationsNotBlocked: number;
    sourcesWithHits: number;
  };
  clues: CrmDeepLocalStitchingClue[];
  safety: {
    readOnly: true;
    outboundProhibited: true;
    cardMutationProhibited: true;
    factStoreWriteProhibited: true;
    credentialReadProhibited: true;
    liveApiCallsProhibited: true;
    localPathsRedacted: true;
    allowedUse: string[];
    prohibitedActions: string[];
  };
};

export type CrmDeepLocalStitchingInput = CrmFactIntakeInput & {
  cards: PersonCardVNext[];
  research?: CrmIdentityStitchingResearchReport | null;
  mailerBridgeRows?: CrmIdentityStitchingResearchInput['mailerBridgeRows'];
  localSources?: CrmDeepLocalSource[] | null;
  sourceCoverage?: {
    filesScanned?: number;
    filesSkipped?: number;
    roots?: number;
    connectedEvidenceSources?: number;
  } | null;
  now?: string | Date | null;
  maxHitsPerClue?: number | null;
};

export type CrmDeepLocalSourceLoadOptions = {
  maxFiles?: number | null;
  maxFileBytes?: number | null;
};

export type CrmDeepLocalSourceLoadResult = {
  sources: CrmDeepLocalSource[];
  filesScanned: number;
  filesSkipped: number;
  roots: number;
};

type SearchTerm = {
  value: string;
  code: string;
  weight: number;
};

const ALLOWED_EXTENSIONS = new Set(['.md', '.txt', '.json', '.jsonl', '.csv', '.tsv', '.rtf', '.vcf', '.contact']);
const CONNECTED_EVIDENCE_SOURCE_KINDS = new Set<CrmDeepLocalSourceKind>([
  'gmail_export',
  'contacts_app_export',
  'mailerlite_export',
  'google_drive_export',
  'lead_capture_export',
  'contacts_export',
  'retreat_table',
  'local_csv',
  'downloaded_file',
  'local_fixture',
]);
const DEFAULT_MAX_FILES = 2500;
const DEFAULT_MAX_FILE_BYTES = 1_000_000;
const DEFAULT_MAX_CONNECTED_EVIDENCE_SOURCES = 50;
const DEFAULT_MAX_CONNECTED_EVIDENCE_TEXT = 5_000;

const isoNow = (value: string | Date | null | undefined): string => {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed || null;
};

const cleanPublicText = (value: string): string =>
  value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const normalize = (value: string | null | undefined): string =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const hashId = (parts: Array<string | null | undefined>): string =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

const wordCount = (value: string | null | undefined): number =>
  cleanPublicText(value ?? '').split(/\s+/).filter(Boolean).length;

const confidenceForScore = (score: number): CrmDeepLocalStitchingHit['confidence'] => {
  if (score >= 78) return 'strong';
  if (score >= 48) return 'medium';
  return 'weak';
};

const cleanConnectedSourceKind = (value: unknown): CrmDeepLocalSourceKind => {
  const raw = cleanString(value);
  if (raw && CONNECTED_EVIDENCE_SOURCE_KINDS.has(raw as CrmDeepLocalSourceKind)) {
    return raw as CrmDeepLocalSourceKind;
  }
  return 'local_fixture';
};

const cleanSourceId = (
  value: string | null | undefined,
  sourceKind: CrmDeepLocalSourceKind,
  index: number,
): string => {
  const fallback = `${sourceKind}:source-${index + 1}`;
  const raw = cleanString(value) ?? fallback;
  const cleaned = cleanPublicText(raw)
    .replace(/[^\w:./@+-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 180);
  if (!cleaned) return fallback;
  return cleaned.includes(':') ? cleaned : `${sourceKind}:${cleaned}`;
};

export const normalizeCrmVNextConnectedEvidenceSources = (
  value: unknown,
  options: {
    maxSources?: number | null;
    maxTextLength?: number | null;
  } = {},
): CrmDeepLocalSource[] => {
  const maxSources = Math.max(0, Math.min(200, Math.floor(options.maxSources ?? DEFAULT_MAX_CONNECTED_EVIDENCE_SOURCES)));
  const maxTextLength = Math.max(100, Math.min(50_000, Math.floor(options.maxTextLength ?? DEFAULT_MAX_CONNECTED_EVIDENCE_TEXT)));
  if (!Array.isArray(value) || maxSources === 0) return [];

  const sources: CrmDeepLocalSource[] = [];
  for (const [index, item] of value.slice(0, maxSources).entries()) {
    if (!item || typeof item !== 'object') continue;
    const row = item as CrmConnectedEvidenceSourceInput;
    const sourceKind = cleanConnectedSourceKind(row.sourceKind);
    const parts = [
      cleanString(row.title) ? `Title: ${cleanString(row.title)}` : null,
      cleanString(row.subject) ? `Subject: ${cleanString(row.subject)}` : null,
      cleanString(row.sender) ? `From: ${cleanString(row.sender)}` : null,
      cleanString(row.recipient) ? `To: ${cleanString(row.recipient)}` : null,
      cleanString(row.email) ? `Email: ${cleanString(row.email)}` : null,
      cleanString(row.handle) ? `Handle: ${cleanString(row.handle)}` : null,
      cleanString(row.observedAt) ? `Observed at: ${cleanString(row.observedAt)}` : null,
      cleanString(row.snippet) ? `Snippet: ${cleanString(row.snippet)}` : null,
      cleanString(row.text),
    ].filter((part): part is string => Boolean(part));
    const text = cleanPublicText(parts.join('\n')).slice(0, maxTextLength);
    if (!text) continue;
    sources.push({
      sourceId: cleanSourceId(row.sourceId, sourceKind, index),
      sourceKind,
      text,
    });
  }

  return sources;
};

const hasHiddenSegment = (filePath: string): boolean =>
  filePath.split(sep).some((part) => part.startsWith('.') && part !== '.');

const isAllowedFile = (relativePath: string): boolean => {
  if (hasHiddenSegment(relativePath)) return false;
  const base = basename(relativePath).toLowerCase();
  if (base.startsWith('.env')) return false;
  if (base.includes('credential') || base.includes('secret') || base.includes('token')) return false;
  if (relativePath.includes(`${sep}node_modules${sep}`) || relativePath.includes(`${sep}.next${sep}`)) return false;
  if (relativePath.includes(`${sep}tmp${sep}`) || relativePath.includes(`${sep}.git${sep}`)) return false;
  return ALLOWED_EXTENSIONS.has(extname(relativePath).toLowerCase());
};

const sourceKindForRelativePath = (
  relativePath: string,
  fallbackKind: CrmDeepLocalSourceKind | null = null,
): CrmDeepLocalSourceKind => {
  const normalizedPath = relativePath.split(sep).join('/');
  const normalizedName = normalize(normalizedPath);
  const extension = extname(relativePath).toLowerCase();
  if (normalizedPath.startsWith('projects/crm-memory-fabric/')) return 'crm_memory_fabric';
  if (normalizedPath.startsWith('chats/')) return 'telegram_chat_memory';
  if (/^\d{4}-\d{2}-\d{2}\.md$/.test(normalizedPath)) return 'daily_memory';
  if (
    extension === '.vcf'
    || extension === '.contact'
    || normalizedName.includes('contact')
    || normalizedName.includes('contacto')
    || normalizedName.includes('mailerlite')
    || normalizedName.includes('subscriber')
  ) {
    return 'contacts_export';
  }
  if (
    normalizedName.includes('retiro')
    || normalizedName.includes('retreat')
    || normalizedName.includes('asistente')
    || normalizedName.includes('inscrito')
    || normalizedName.includes('registrationreport')
    || normalizedName.includes('registration report')
    || normalizedName.includes('beca')
  ) {
    return 'retreat_table';
  }
  if (extension === '.csv' || extension === '.tsv') return 'local_csv';
  if (fallbackKind) return fallbackKind;
  return 'workspace_memory';
};

const normalizeSourceRoot = (input: CrmDeepLocalSourceRootInput): CrmDeepLocalSourceRoot | null => {
  if (typeof input === 'string') {
    const root = cleanString(input);
    return root ? { root, sourceIdPrefix: 'memory' } : null;
  }

  const root = cleanString(input.root);
  if (!root) return null;
  return {
    root,
    sourceKind: input.sourceKind ?? null,
    sourceIdPrefix: cleanString(input.sourceIdPrefix) ?? 'local',
    maxFiles: input.maxFiles ?? null,
    maxFileBytes: input.maxFileBytes ?? null,
  };
};

const collectFiles = async (
  root: string,
  options: Required<CrmDeepLocalSourceLoadOptions>,
): Promise<{ files: string[]; skipped: number }> => {
  const files: string[] = [];
  let skipped = 0;

  const walk = async (dir: string): Promise<void> => {
    if (files.length >= options.maxFiles) return;
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      skipped += 1;
      return;
    }

    for (const entry of entries) {
      if (files.length >= options.maxFiles) break;
      const nextPath = join(dir, entry.name);
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'tmp') {
        skipped += 1;
        continue;
      }
      if (entry.isDirectory()) {
        await walk(nextPath);
        continue;
      }
      if (!entry.isFile() || !isAllowedFile(relative(root, nextPath))) {
        skipped += 1;
        continue;
      }
      files.push(nextPath);
    }
  };

  await walk(root);
  return { files, skipped };
};

export const loadCrmVNextDeepLocalSources = async (
  roots: readonly CrmDeepLocalSourceRootInput[] = DEFAULT_CRM_VNEXT_DEEP_LOCAL_STITCHING_ROOTS,
  options: CrmDeepLocalSourceLoadOptions = {},
): Promise<CrmDeepLocalSourceLoadResult> => {
  const resolvedOptions = {
    maxFiles: Math.max(1, Math.floor(options.maxFiles ?? DEFAULT_MAX_FILES)),
    maxFileBytes: Math.max(1, Math.floor(options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES)),
  };
  const uniqueRoots = unique(
    roots
      .map((root) => normalizeSourceRoot(root))
      .filter((root): root is CrmDeepLocalSourceRoot => Boolean(root))
      .map((root) => JSON.stringify(root)),
  ).map((root) => JSON.parse(root) as CrmDeepLocalSourceRoot);
  const sources: CrmDeepLocalSource[] = [];
  let filesScanned = 0;
  let filesSkipped = 0;

  for (const sourceRoot of uniqueRoots) {
    const rootOptions = {
      maxFiles: Math.max(1, Math.floor(sourceRoot.maxFiles ?? resolvedOptions.maxFiles)),
      maxFileBytes: Math.max(1, Math.floor(sourceRoot.maxFileBytes ?? resolvedOptions.maxFileBytes)),
    };
    const { files, skipped } = await collectFiles(sourceRoot.root, rootOptions);
    filesSkipped += skipped;
    for (const filePath of files) {
      if (sources.length >= resolvedOptions.maxFiles) break;
      try {
        const fileStat = await stat(filePath);
        if (fileStat.size > rootOptions.maxFileBytes) {
          filesSkipped += 1;
          continue;
        }
        const text = await readFile(filePath, 'utf8');
        const relativePath = relative(sourceRoot.root, filePath);
        const sourceIdPrefix = cleanString(sourceRoot.sourceIdPrefix) ?? 'local';
        sources.push({
          sourceId: `${sourceIdPrefix}:${relativePath.split(sep).join('/')}`,
          sourceKind: sourceKindForRelativePath(relativePath, sourceRoot.sourceKind ?? null),
          text,
        });
        filesScanned += 1;
      } catch {
        filesSkipped += 1;
      }
    }
  }

  return {
    sources,
    filesScanned,
    filesSkipped,
    roots: uniqueRoots.length,
  };
};

const tokenStem = (token: string): string | null => {
  const normalized = normalize(token);
  if (normalized.length < 6) return null;
  return normalized.replace(/[aeiouy]+$/i, '');
};

const searchTermsForClue = (clue: CrmIdentityStitchingClue): SearchTerm[] => {
  const terms: SearchTerm[] = [];
  const add = (value: string | null | undefined, code: string, weight: number) => {
    const normalized = normalize(value?.replace(/^@+/, ''));
    if (normalized.length >= 3) terms.push({ value: normalized, code, weight });
  };

  add(clue.person.email, 'email_exact', 95);
  add(clue.person.phone?.replace(/\D/g, ''), 'phone_exact', 92);
  add(clue.person.instagramHandle, 'instagram_handle_exact', 90);
  add(clue.person.rawName, 'raw_name_exact', 58);

  const rawName = normalize(clue.person.rawName);
  for (const token of rawName.split(/\s+/).filter(Boolean)) {
    if (token.length >= 5) add(token, `name_token:${token}`, 28);
    for (const alias of crmVNextExpandNameToken(token).filter((aliasToken) => aliasToken !== token)) {
      if (alias.length >= 5) add(alias, `name_alias:${token}->${alias}`, 44);
    }
    const stem = tokenStem(token);
    if (stem && stem.length >= 5) add(stem, `name_stem:${stem}`, 46);
  }

  return unique(terms.map((term) => JSON.stringify(term))).map((item) => JSON.parse(item) as SearchTerm);
};

const contextSignalsFor = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
  sourceKind: CrmDeepLocalSourceKind,
): string[] => {
  const normalized = normalize(snippet);
  const signals: string[] = [];
  if (clue.factTypes.includes('retreat_attendance') && /\b(retiro|asist|agenda|evento)\b/.test(normalized)) {
    signals.push('supports_retreat_context');
  }
  if (clue.factTypes.includes('program_participation') && /\b(yoga|estudiant|clase)\b/.test(normalized)) {
    signals.push('supports_yoga_context');
  }
  if (/\b(esposo|familia|familiar)\b/.test(normalized)) {
    signals.push('supports_family_context');
  }
  if (/\b(juana|asistente|reporta|recibido)\b/.test(normalized)) {
    signals.push('human_assistant_report_context');
  }
  if (
    sourceKind === 'contacts_export'
    || /\b(email|correo|phone|telefono|whatsapp|label|labels|tag|tags|subscriber)\b/.test(normalized)
  ) {
    signals.push('contact_registry_context');
  }
  if (
    sourceKind === 'mailerlite_export'
    || /\b(mailerlite|subscriber|suscriptor|group|groups|tag|tags|campaign|open|click)\b/.test(normalized)
  ) {
    signals.push('mailer_lite_context');
  }
  if (
    sourceKind === 'google_drive_export'
    || /\b(google drive|google docs|google sheets|spreadsheet|sheet|document|drive)\b/.test(normalized)
  ) {
    signals.push('google_drive_context');
  }
  if (
    sourceKind === 'lead_capture_export'
    || /\b(manychat|webhook|vercel|lead capture|instagram dm|last text input|flow|automation|whatsapp)\b/.test(normalized)
  ) {
    signals.push('lead_capture_context');
  }
  if (/\b(email ownership review required|family_email_review_required|family or companion|familiar|acompanante|acompañante)\b/.test(normalized)) {
    signals.push('family_email_review_required');
  }
  if (/\b(identity bridge review required|identity_bridge_review_required|pending bridge|bridge pending|handle bridge|puente de identidad|puente pendiente)\b/.test(normalized)) {
    signals.push('identity_bridge_review_required');
  }
  if (
    sourceKind === 'gmail_export'
    || /\b(subject|from|to|gmail|inbox|sent|thread|correo|email)\b/.test(normalized)
  ) {
    signals.push('email_thread_context');
  }
  if (
    sourceKind === 'retreat_table'
    || /\b(registration|approval|approved|asistencia|inscripcion|beca)\b/.test(normalized)
  ) {
    signals.push('retreat_attendee_table_context');
  }
  return signals;
};

const clueIdentityTerms = (clue: CrmIdentityStitchingClue): string[] => unique([
  clue.person.rawName,
  clue.person.instagramHandle,
  clue.person.email,
  ...(clue.person.rawName ?? '').split(/\s+/),
]
  .map((term) => normalize(term?.replace(/^@+/, '')))
  .filter((term) => term.length >= 5));

const hasClueIdentityTerm = (clue: CrmIdentityStitchingClue, value: string): boolean => {
  const normalized = normalize(value);
  return clueIdentityTerms(clue).some((term) => normalized.includes(term));
};

const cleanNameCandidate = (value: string): string | null => {
  const cleaned = value
    .replace(/\b(?:Logo|Subject|Snippet|Title|From|To|Hi|Hola|Name|Email|Phone|City|Country|File|Sheet|Row|Context)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[.,;:()[\]{}]+$/g, '')
    .trim();
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length < 2 || words.length > 6) return null;
  if (words.some((word) => !/^[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+$/u.test(word))) return null;
  const normalized = normalize(cleaned);
  if (/\b(yoga|colombia|meeting|topic|start|thank|linkedin|instagram|estudiante|student|mama|mamá|mango|retiro|retreat|cliente|client)\b/i.test(cleaned)) return null;
  if (/\b(no-reply|gmail|hotmail|yahoo|zoom)\b/.test(normalized)) return null;
  return cleaned;
};

const extractFullNameCandidates = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
): string[] => {
  const candidates: string[] = [];
  const namePart = String.raw`[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+`;
  const specificPatterns = [
    new RegExp(String.raw`(${namePart}(?:\s+${namePart}){1,5})\s+has joined your meeting`, 'gu'),
    new RegExp(String.raw`(?:^|\s)(?:\d{1,2}:\d{2}(?::\d{2})?\s+)?(${namePart}(?:\s+${namePart}){1,5})\s*:`, 'gu'),
    new RegExp(String.raw`\b(?:de|from)\s+(${namePart}(?:\s+${namePart}){1,5})\b`, 'gu'),
  ];
  const genericPattern = new RegExp(String.raw`\b(${namePart}(?:\s+${namePart}){1,5})\b`, 'gu');

  for (const pattern of [...specificPatterns, genericPattern]) {
    for (const match of snippet.matchAll(pattern)) {
      const candidate = cleanNameCandidate(match[1] ?? '');
      if (!candidate) continue;
      const wordCount = candidate.split(/\s+/).length;
      if (wordCount < 3 && !/^gladys\s+mayerl/i.test(candidate)) continue;
      if (!hasClueIdentityTerm(clue, candidate)) continue;
      candidates.push(candidate);
    }
  }

  return unique(candidates)
    .sort((a, b) => b.split(/\s+/).length - a.split(/\s+/).length || b.length - a.length)
    .slice(0, 3);
};

const extractEmails = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
  sourceKind: CrmDeepLocalSourceKind,
): string[] => {
  const matches = snippet.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
  if (sourceKind === 'daily_memory' && matches.length !== 1) return [];
  return unique(matches
    .map((email) => email.toLowerCase())
    .filter((email) => !/\b(no-reply|noreply|notification|notificaciones?|zoom)\b/.test(email))
    .filter((email) => !/@(?:example\.com|example\.org|example\.net)$/i.test(email))
    .filter((email) => {
      if (['contacts_export', 'contacts_app_export', 'mailerlite_export', 'google_drive_export', 'lead_capture_export', 'retreat_table', 'local_csv'].includes(sourceKind)) return true;
      const index = snippet.toLowerCase().indexOf(email.toLowerCase());
      const window = index >= 0 ? snippet.slice(Math.max(0, index - 90), index + email.length + 90) : snippet;
      return hasClueIdentityTerm(clue, window);
    }))
    .slice(0, 3);
};

const looksLikeDateOrTimestamp = (value: string): boolean => {
  const trimmed = value.trim();
  if (
    /\b(?:19|20)\d{2}[-/.](?:0?[1-9]|1[0-2])[-/.](?:0?[1-9]|[12]\d|3[01])(?:[T\s]+(?:[01]?\d|2[0-3])(?::?[0-5]\d){0,2})?\b/.test(trimmed)
  ) {
    return true;
  }
  const digits = trimmed.replace(/\D/g, '');
  return /^(?:19|20)\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])(?:[01]\d|2[0-3])?(?:[0-5]\d){0,2}$/.test(digits);
};

const normalizePhoneCandidate = (value: string): string | null => {
  if (looksLikeDateOrTimestamp(value)) return null;
  const phone = value.replace(/[^\d+]/g, '');
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 8 || digits.length > 15) return null;
  if (/^(\d)\1+$/.test(digits)) return null;
  return phone;
};

const extractPhones = (
  snippet: string,
  sourceKind: CrmDeepLocalSourceKind,
): string[] => {
  const normalized = normalize(snippet);
  if (sourceKind === 'lead_capture_export') {
    const matches: string[] = [];
    const labeledPattern = /\b(?:phone|telefono|teléfono|whatsapp|celular|movil|móvil)\b\s*[:=]\s*([+\d][+\d\s().-]{7,}\d)/gi;
    for (const match of snippet.matchAll(labeledPattern)) {
      if (match[1]) matches.push(match[1]);
    }
    return unique(matches
      .map((phone) => normalizePhoneCandidate(phone))
      .filter((phone): phone is string => Boolean(phone)))
      .slice(0, 3);
  }

  if (
    !['contacts_export', 'contacts_app_export', 'mailerlite_export', 'google_drive_export', 'lead_capture_export', 'retreat_table', 'local_csv'].includes(sourceKind)
    && !/\b(phone|telefono|teléfono|whatsapp|celular|movil|móvil)\b/.test(normalized)
  ) {
    return [];
  }

  const matches = snippet.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) ?? [];
  return unique(matches
    .map((phone) => normalizePhoneCandidate(phone))
    .filter((phone): phone is string => Boolean(phone)))
    .slice(0, 3);
};

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const handleAliasesSubject = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
  handle: string,
): boolean => {
  const rawName = cleanString(clue.person.rawName);
  if (!rawName) return false;
  const pattern = new RegExp(`@${escapeRegExp(handle)}\\s+(?:es|se llama)\\s+([^,.;]+)`, 'i');
  const alias = cleanString(snippet.match(pattern)?.[1]);
  return Boolean(alias && crmVNextNameCompatible(rawName, alias));
};

const extractInstagramHandles = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
): string[] => {
  const handles: string[] = [];
  const pattern = /@[a-zA-Z0-9._]{2,30}/g;
  for (const match of snippet.matchAll(pattern)) {
    const start = match.index ?? 0;
    const before = start > 0 ? snippet[start - 1] : '';
    if (before && /[A-Za-z0-9._%+-]/.test(before)) continue;
    handles.push(match[0].replace(/^@+/, '').toLowerCase());
  }
  const clueHandle = normalize(clue.person.instagramHandle?.replace(/^@+/, '') ?? null);
  if (clueHandle) return unique(handles.filter((handle) => normalize(handle) === clueHandle)).slice(0, 3);
  return unique(handles.filter((handle) => handleAliasesSubject(clue, snippet, handle))).slice(0, 3);
};

const structuredOwnerNameCandidates = (snippet: string): string[] => {
  const patterns = [
    /\bName\s*:\s*([^<\n\r]+?)(?=\s+(?:Email|Phone|City|Country|Context)\s*:|<|$)/gi,
    /\bFrom\s*:\s*([^<\n\r]+?)(?=<|\s+Subject\s*:|$)/gi,
    /\b(?:Contact|Subscriber)\s*:\s*([^<\n\r]+?)(?=\s+(?:Email|Phone|City|Country|Context)\s*:|<|$)/gi,
  ];
  const candidates: string[] = [];
  for (const pattern of patterns) {
    for (const match of snippet.matchAll(pattern)) {
      const cleaned = cleanPublicText(match[1] ?? '')
        .replace(/\b(?:Email|Phone|City|Country|Context|Subject)\b.*$/i, '')
        .replace(/[<>"'()[\]{}]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (wordCount(cleaned) >= 2 && wordCount(cleaned) <= 6) candidates.push(cleaned);
    }
  }
  return unique(candidates);
};

const structuredIdentityBelongsToDifferentPerson = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
): boolean => {
  const rawName = cleanString(clue.person.rawName);
  if (!rawName) return false;
  if (!/\b(?:Name|From|Contact|Subscriber)\s*:/i.test(snippet)) return false;
  const owners = structuredOwnerNameCandidates(snippet);
  if (!owners.length) return false;
  return !owners.some((owner) => crmVNextNameCompatible(rawName, owner));
};

const blocksIdentityAssignment = (snippet: string): boolean => {
  const normalized = normalize(snippet);
  return /\b(ambiguous|ambiguo|ambigua|not assigned|not assign|no asignad|sin asignar|do not assign|dont assign|don't assign)\b/.test(normalized);
};

const identitySignalsFor = (
  clue: CrmIdentityStitchingClue,
  snippet: string,
  sourceKind: CrmDeepLocalSourceKind,
): CrmDeepLocalStitchingHit['identitySignals'] => {
  if (blocksIdentityAssignment(snippet) || structuredIdentityBelongsToDifferentPerson(clue, snippet)) {
    return {
      fullNameCandidates: [],
      emails: [],
      phones: [],
      instagramHandles: [],
    };
  }
  return {
    fullNameCandidates: extractFullNameCandidates(clue, snippet),
    emails: extractEmails(clue, snippet, sourceKind),
    phones: extractPhones(snippet, sourceKind),
    instagramHandles: extractInstagramHandles(clue, snippet),
  };
};

const hasIdentitySignals = (hit: CrmDeepLocalStitchingHit): boolean =>
  Boolean(
    hit.identitySignals.fullNameCandidates.length
    || hit.identitySignals.emails.length
    || hit.identitySignals.phones.length
    || hit.identitySignals.instagramHandles.length,
  );

const identitySignalsHaveValues = (
  identitySignals: CrmDeepLocalStitchingHit['identitySignals'],
): boolean =>
  Boolean(
    identitySignals.fullNameCandidates.length
    || identitySignals.emails.length
    || identitySignals.phones.length
    || identitySignals.instagramHandles.length,
  );

const selectDiverseHits = (
  sortedHits: CrmDeepLocalStitchingHit[],
  maxHits: number,
): CrmDeepLocalStitchingHit[] => {
  if (sortedHits.length <= maxHits) return sortedHits;

  const selected = new Map<string, CrmDeepLocalStitchingHit>();
  const keyFor = (hit: CrmDeepLocalStitchingHit): string => `${hit.hitId}:${hit.sourceId}:${hit.lineNumber ?? ''}`;
  const add = (hit: CrmDeepLocalStitchingHit): boolean => {
    if (selected.size >= maxHits) return false;
    selected.set(keyFor(hit), hit);
    return selected.size < maxHits;
  };

  add(sortedHits[0]);

  const selectedIdentityKinds = new Set<CrmDeepLocalSourceKind>();
  for (const hit of sortedHits) {
    if (!hasIdentitySignals(hit) || selectedIdentityKinds.has(hit.sourceKind)) continue;
    selectedIdentityKinds.add(hit.sourceKind);
    if (!add(hit)) return Array.from(selected.values()).sort(hitSort);
  }

  const selectedKinds = new Set(Array.from(selected.values()).map((hit) => hit.sourceKind));
  for (const hit of sortedHits) {
    if (selectedKinds.has(hit.sourceKind)) continue;
    selectedKinds.add(hit.sourceKind);
    if (!add(hit)) return Array.from(selected.values()).sort(hitSort);
  }

  for (const hit of sortedHits) {
    if (!add(hit)) break;
  }

  return Array.from(selected.values()).sort(hitSort);
};

const countIdentitySourceKinds = (
  hits: CrmDeepLocalStitchingHit[],
): Partial<Record<CrmDeepLocalSourceKind, number>> => {
  const counts: Partial<Record<CrmDeepLocalSourceKind, number>> = {};
  for (const hit of hits) {
    if (!hasIdentitySignals(hit)) continue;
    counts[hit.sourceKind] = (counts[hit.sourceKind] ?? 0) + 1;
  }
  return counts;
};

const identitySummaryFor = (
  clue: CrmIdentityStitchingClue,
  hits: CrmDeepLocalStitchingHit[],
): CrmDeepLocalIdentitySummary => {
  const fullNameCandidates = unique(hits.flatMap((hit) => hit.identitySignals.fullNameCandidates));
  const emails = unique([
    clue.person.email,
    ...hits.flatMap((hit) => hit.identitySignals.emails),
  ].filter((value): value is string => Boolean(cleanString(value))));
  const phones = unique([
    clue.person.phone,
    ...hits.flatMap((hit) => hit.identitySignals.phones),
  ].filter((value): value is string => Boolean(cleanString(value))));
  const instagramHandles = unique([
    clue.person.instagramHandle,
    ...hits.flatMap((hit) => hit.identitySignals.instagramHandles),
  ]
    .filter((value): value is string => Boolean(cleanString(value)))
    .map((handle) => handle.replace(/^@+/, '').toLowerCase()));
  const presentFields: CrmDeepLocalIdentityField[] = [];
  if (fullNameCandidates.length || (cleanString(clue.person.rawName) && wordCount(clue.person.rawName) >= 2)) presentFields.push('fullName');
  if (emails.length) presentFields.push('email');
  if (phones.length) presentFields.push('phone');
  if (instagramHandles.length) presentFields.push('instagramHandle');

  return {
    fullNameCandidates,
    emails,
    phones,
    instagramHandles,
    presentFields,
    missingContactFields: ([
      emails.length ? null : 'email',
      phones.length ? null : 'phone',
      instagramHandles.length ? null : 'instagramHandle',
    ].filter(Boolean) as Array<'email' | 'phone' | 'instagramHandle'>),
    sourceKindsWithIdentitySignals: countIdentitySourceKinds(hits),
  };
};

const sourceBonus = (sourceKind: CrmDeepLocalSourceKind): number => {
  if (sourceKind === 'telegram_chat_memory') return 10;
  if (sourceKind === 'crm_memory_fabric') return 8;
  if (sourceKind === 'contacts_export') return 12;
  if (sourceKind === 'contacts_app_export') return 12;
  if (sourceKind === 'mailerlite_export') return 12;
  if (sourceKind === 'google_drive_export') return 10;
  if (sourceKind === 'lead_capture_export') return 13;
  if (sourceKind === 'gmail_export') return 10;
  if (sourceKind === 'retreat_table') return 12;
  if (sourceKind === 'local_csv') return 6;
  if (sourceKind === 'workspace_memory') return 4;
  if (sourceKind === 'downloaded_file') return 2;
  if (sourceKind === 'daily_memory') return -8;
  return 0;
};

const lineMatches = (
  text: string,
  terms: SearchTerm[],
): Array<{ lineNumber: number; line: string; terms: SearchTerm[] }> => {
  const matches: Array<{ lineNumber: number; line: string; terms: SearchTerm[] }> = [];
  const lines = text.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const normalizedLine = normalize(line);
    const matchedTerms = terms.filter((term) => normalizedLine.includes(term.value));
    if (matchedTerms.length) {
      matches.push({ lineNumber: index + 1, line, terms: matchedTerms });
    }
  }
  return matches;
};

const cleanSnippet = (value: string): string =>
  cleanPublicText(value)
    .slice(0, 320);

const hitSort = (a: CrmDeepLocalStitchingHit, b: CrmDeepLocalStitchingHit): number =>
  b.score - a.score || a.sourceId.localeCompare(b.sourceId) || (a.lineNumber ?? 0) - (b.lineNumber ?? 0);

const hitsForClue = (
  clue: CrmIdentityStitchingClue,
  sources: CrmDeepLocalSource[],
  maxHits: number,
): CrmDeepLocalStitchingHit[] => {
  const terms = searchTermsForClue(clue);
  if (!terms.length) return [];
  const hits: CrmDeepLocalStitchingHit[] = [];

  for (const source of sources) {
    const matches = lineMatches(source.text, terms);
    for (const match of matches.slice(0, 3)) {
      const matchedCodes = unique(match.terms.map((term) => term.code));
      const maxTermWeight = Math.max(...match.terms.map((term) => term.weight));
      const snippet = cleanSnippet(match.line);
      const contextSignals = contextSignalsFor(clue, snippet, source.sourceKind);
      const identitySignals = identitySignalsFor(clue, snippet, source.sourceKind);
      if (identitySignalsHaveValues(identitySignals)) {
        contextSignals.push('identity_field_context');
      }
      const score = Math.max(0, Math.min(100, Math.round(
        maxTermWeight
        + sourceBonus(source.sourceKind)
        + (contextSignals.length * 8)
      )));
      hits.push({
        hitId: `deep_hit_${hashId([clue.clueId, source.sourceId, String(match.lineNumber), matchedCodes.join('+')])}`,
        sourceId: source.sourceId,
        sourceKind: source.sourceKind,
        lineNumber: match.lineNumber,
        snippet,
        score,
        confidence: confidenceForScore(score),
        matchedIdentityTerms: matchedCodes,
        contextSignals: unique(contextSignals),
        identitySignals,
        evidenceUse: 'identity_stitching_context_only',
      });
    }
  }

  return selectDiverseHits(hits.sort(hitSort), maxHits);
};

const recommendationFor = (
  clue: CrmIdentityStitchingClue,
  hits: CrmDeepLocalStitchingHit[],
): CrmDeepLocalStitchingClue['recommendation'] => {
  if (hits.length) {
    const strongOrMedium = hits.some((hit) => hit.confidence === 'strong' || hit.confidence === 'medium');
    if (clue.recommendation.action === 'create_new_card_candidate') {
      return {
        action: 'defer_new_card_creation',
        requiresHumanDecision: true,
        reason: strongOrMedium
          ? 'Deep local memory found evidence for this person, so new-card creation should wait for evidence review.'
          : 'Deep local memory found weak contextual evidence; review it before creating a new card.',
        suggestedNextSteps: [
          'Review the local evidence snippets.',
          'If they refer to the same person, enrich or stitch the card plan with that context.',
          'Only create a new card after confirming no existing local identity should be linked.',
        ],
      };
    }
    return {
      action: 'review_deep_local_evidence',
      requiresHumanDecision: true,
      reason: 'Deep local memory found additional context that should be reviewed before stitching decisions.',
      suggestedNextSteps: [
        'Review the local evidence snippets.',
        'Use them as context only; do not mutate cards or send outbound messages.',
      ],
    };
  }

  if (clue.recommendation.action === 'create_new_card_candidate') {
    return {
      action: 'new_card_creation_not_blocked_by_deep_search',
      requiresHumanDecision: true,
      reason: 'No additional local evidence was found in the configured safe memory corpus.',
      suggestedNextSteps: [
        'A new-card proposal can proceed after normal identity and card-write approval.',
        'Expand search roots manually if Alejandro expects evidence outside the configured corpus.',
      ],
    };
  }

  return {
    action: 'needs_more_identity',
    requiresHumanDecision: true,
    reason: 'No useful local evidence was found; the system still needs a stronger identifier or human confirmation.',
    suggestedNextSteps: ['Ask for email, Instagram handle, phone, or another stable identifier.'],
  };
};

const safety = (): CrmDeepLocalStitchingReport['safety'] => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  localPathsRedacted: true,
  allowedUse: [
    'Search configured local memory sources for identity stitching evidence.',
    'Search configured local CSVs, retreat tables, and contact exports when explicitly enabled.',
    'Use supplied Gmail/contact evidence packets as read-only context when explicitly provided.',
    'Defer premature new-card creation when local context exists.',
    'Prepare a human review packet for Mantis and Alejandro.',
  ],
  prohibitedActions: [
    'Do not mutate person cards.',
    'Do not write to Fact Store.',
    'Do not send outbound messages.',
    'Do not call MailerLite, Instagram, ManyChat, WhatsApp, Telegram, Gmail, or email APIs.',
    'Do not expose absolute local filesystem paths in API responses.',
    'Do not treat local snippets as final truth without review.',
  ],
});

const countSourceKinds = (
  sources: CrmDeepLocalSource[],
): Partial<Record<CrmDeepLocalSourceKind, number>> => {
  const counts: Partial<Record<CrmDeepLocalSourceKind, number>> = {};
  for (const source of sources) {
    counts[source.sourceKind] = (counts[source.sourceKind] ?? 0) + 1;
  }
  return counts;
};

export const buildCrmVNextDeepLocalStitching = (
  input: CrmDeepLocalStitchingInput,
): CrmDeepLocalStitchingReport => {
  const generatedAt = isoNow(input.now ?? input.observedAt);
  const research = input.research ?? buildCrmVNextIdentityStitchingResearch({
    text: input.text,
    sourceKind: input.sourceKind,
    reporter: input.reporter,
    channel: input.channel,
    observedAt: generatedAt,
    occurredAt: input.occurredAt,
    cards: input.cards,
    mailerBridgeRows: input.mailerBridgeRows,
  });
  const sources = input.localSources ?? [];
  const maxHits = Math.max(1, Math.min(20, Math.floor(input.maxHitsPerClue ?? 8)));
  const clues = research.clues.map((clue): CrmDeepLocalStitchingClue => {
    const hits = hitsForClue(clue, sources, maxHits);
    return {
      clueId: clue.clueId,
      person: clue.person,
      identityResearchRecommendation: clue.recommendation.action,
      searchTerms: searchTermsForClue(clue).map((term) => term.value),
      hits,
      identitySummary: identitySummaryFor(clue, hits),
      recommendation: recommendationFor(clue, hits),
    };
  });
  const allHits = clues.flatMap((clue) => clue.hits);
  const sourceCoverage = input.sourceCoverage ?? {};

  return {
    schemaVersion: CRM_VNEXT_DEEP_LOCAL_STITCHING_SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_deep_local_stitching',
    research,
    sourceCoverage: {
      localSources: {
        searched: true,
        sources: sources.length,
        filesScanned: Math.max(0, Math.floor(sourceCoverage.filesScanned ?? sources.length)),
        filesSkipped: Math.max(0, Math.floor(sourceCoverage.filesSkipped ?? 0)),
        roots: Math.max(0, Math.floor(sourceCoverage.roots ?? 0)),
        connectedEvidenceSources: Math.max(0, Math.floor(sourceCoverage.connectedEvidenceSources ?? 0)),
        localPathsRedacted: true,
        sourceKinds: countSourceKinds(sources),
      },
    },
    summary: {
      clues: clues.length,
      cluesWithHits: clues.filter((clue) => clue.hits.length > 0).length,
      hits: allHits.length,
      strongHits: allHits.filter((hit) => hit.confidence === 'strong').length,
      mediumHits: allHits.filter((hit) => hit.confidence === 'medium').length,
      weakHits: allHits.filter((hit) => hit.confidence === 'weak').length,
      newCardCreationsDeferred: clues.filter((clue) => clue.recommendation.action === 'defer_new_card_creation').length,
      newCardCreationsNotBlocked: clues.filter((clue) => clue.recommendation.action === 'new_card_creation_not_blocked_by_deep_search').length,
      sourcesWithHits: new Set(allHits.map((hit) => hit.sourceId)).size,
    },
    clues,
    safety: safety(),
  };
};
