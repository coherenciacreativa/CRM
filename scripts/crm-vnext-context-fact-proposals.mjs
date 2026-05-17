#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-context-fact-proposals-2026-05-14';
const DEFAULT_CARD_STORE_PATH = '.crm-vnext/person-card-store/person-cards-vnext.json';

const usage = `Usage:
  node scripts/crm-vnext-context-fact-proposals.mjs --evidence-file <path> [options]

Options:
  --evidence-file <path>       JSON array or object with evidenceSources
  --card-store-path <path>     Local vNext person-card store. Defaults to ${DEFAULT_CARD_STORE_PATH}
  --out <path>                 Write proposal packet JSON
  --markdown-out <path>        Write human review Markdown
  --fail-on-empty              Exit non-zero when no context proposals are produced
  --help                       Show this help

This command is read-only. It converts rich Mantis/connector evidence into context/fact promotion proposals. It never mutates cards, writes Fact Store, sends outbound messages, calls live APIs, reads credentials, or touches ManyChat LIVE.`;

const CONTEXT_KINDS = [
  'origin_story',
  'onboarding_context',
  'relationship_context',
  'engagement_context',
  'product_interest',
  'location_context',
  'identity_bridge_context',
  'identity_gap',
  'review_only_collision',
  'tone_preference_context',
  'general_note',
];

const parseArgs = (argv) => {
  const options = {
    evidenceFile: null,
    cardStorePath: DEFAULT_CARD_STORE_PATH,
    out: null,
    markdownOut: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--evidence-file') options.evidenceFile = argv[++index];
    else if (arg === '--card-store-path') options.cardStorePath = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.evidenceFile) throw new Error('evidence_file_required');
  return options;
};

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = value
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || null;
};

const normalizeText = (value) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeEmail = (value) => {
  const email = cleanString(value)?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
};

const normalizeHandle = (value) => {
  const cleaned = cleanString(value);
  if (!cleaned) return null;
  const instagramUrl = cleaned.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})/i)?.[1];
  const handle = (instagramUrl ?? cleaned)
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+$/g, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle)) return null;
  if (/^\d+$/.test(handle)) return null;
  return handle;
};

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const isoNow = (value) => {
  const raw = cleanString(value);
  const date = raw ? new Date(raw) : new Date();
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
};

const uniqueBy = (items, keyFn) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }
  return result;
};

const evidenceSourcesFrom = (parsed) => {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && typeof parsed === 'object') {
    if (Array.isArray(parsed.evidenceSources)) return parsed.evidenceSources;
    if (Array.isArray(parsed.sources)) return parsed.sources;
    if (Array.isArray(parsed.connectedEvidenceSources)) return parsed.connectedEvidenceSources;
  }
  return [];
};

const readEvidenceSources = async (filePath) => {
  const parsed = JSON.parse(await readFile(resolve(filePath), 'utf8'));
  return evidenceSourcesFrom(parsed).map((source, index) => ({
    sourceKind: cleanString(source?.sourceKind ?? source?.kind) ?? 'unknown',
    sourceId: cleanString(source?.sourceId ?? source?.id) ?? `evidence-source-${index + 1}`,
    title: cleanString(source?.title),
    subject: cleanString(source?.subject),
    email: normalizeEmail(source?.email),
    handle: normalizeHandle(source?.handle ?? source?.instagramHandle),
    observedAt: cleanString(source?.observedAt),
    text: cleanString(source?.text ?? source?.snippet ?? source?.finding) ?? '',
  })).filter((source) => source.text);
};

const readCards = async (cardStorePath) => {
  try {
    const parsed = JSON.parse(await readFile(resolve(cardStorePath), 'utf8'));
    const cards = Array.isArray(parsed?.cards) ? parsed.cards : Array.isArray(parsed) ? parsed : [];
    return cards.filter((card) => card && typeof card === 'object');
  } catch {
    return [];
  }
};

const splitEvidenceSegments = (text) =>
  cleanString(text)
    ?.split(/\s*\|\s*|\r?\n/)
    .map((segment) => cleanString(segment))
    .filter(Boolean) ?? [];

const labelValues = (text, label) => {
  const pattern = new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*:\\s*(.+)$`, 'i');
  return splitEvidenceSegments(text)
    .map((segment) => segment.match(pattern)?.[1])
    .map(cleanString)
    .filter(Boolean);
};

const firstLabel = (text, labels) => {
  for (const label of labels) {
    const value = labelValues(text, label)[0];
    if (value) return value;
  }
  return null;
};

const sourceIdentity = (source) => {
  const email = source.email ?? normalizeEmail(firstLabel(source.text, ['Email', 'Search term']));
  const handle = source.handle
    ?? normalizeHandle(firstLabel(source.text, ['Handle', 'Instagram', 'Matched Instagram']));
  const name = firstLabel(source.text, ['Name', 'Thread display name', 'Matched display name'])
    ?? source.subject
    ?? source.title;
  const phone = firstLabel(source.text, ['Phone']);
  return { email, handle, name, phone };
};

const matchCard = (cards, identity) => {
  const email = normalizeEmail(identity.email);
  const handle = normalizeHandle(identity.handle);
  const phoneDigits = cleanString(identity.phone)?.replace(/\D/g, '') ?? null;
  return cards.find((card) => {
    const identities = card?.identities ?? {};
    const cardEmail = normalizeEmail(identities.email);
    const cardHandle = normalizeHandle(identities.instagramHandle);
    const cardPhoneDigits = cleanString(identities.phone)?.replace(/\D/g, '') ?? null;
    return Boolean(
      (email && cardEmail === email)
      || (handle && cardHandle === handle)
      || (phoneDigits && cardPhoneDigits && phoneDigits === cardPhoneDigits)
    );
  }) ?? null;
};

const targetFor = (source, cards) => {
  const identity = sourceIdentity(source);
  const card = matchCard(cards, identity);
  const targetPersonId = card?.personId
    ?? (identity.email ? `email:${identity.email}` : null)
    ?? (identity.handle ? `ig:${identity.handle}` : null);
  return {
    targetPersonId,
    matchStatus: card ? 'existing_card' : targetPersonId ? 'inferred_identity' : 'unresolved',
    displayName: cleanString(card?.displayName) ?? cleanString(identity.name) ?? identity.handle ?? identity.email ?? 'Unknown contact',
    email: identity.email,
    instagramHandle: identity.handle,
    currentEvidenceCount: Array.isArray(card?.evidence) ? card.evidence.length : 0,
  };
};

const stripBoilerplate = (statement) => {
  let cleaned = cleanString(statement);
  if (!cleaned) return null;
  cleaned = cleaned
    .replace(/^Contact key:\s*[^.]+$/i, '')
    .replace(/^Bucket:\s*[^.]+$/i, '')
    .replace(/^Source system:\s*[^.]+$/i, '')
    .replace(/^Record sourceId:\s*[^.]+$/i, '')
    .replace(/^Confidence:\s*[^.]+$/i, '')
    .replace(/^Source:\s*[^.]+$/i, '')
    .replace(/^Type:\s*[^.]+$/i, '')
    .replace(/^Search term:\s*[^.]+$/i, '')
    .replace(/^Matched display name:\s*[^.]+$/i, '')
    .replace(/^Matched Instagram:\s*[^.]+$/i, '')
    .replace(/^Handle:\s*[^.]+$/i, '')
    .replace(/^Email:\s*[^.]+$/i, '')
    .trim();
  if (!cleaned) return null;
  if (/^Contact key:/i.test(cleaned)) return null;
  if (cleaned.length > 360) cleaned = `${cleaned.slice(0, 357).trim()}...`;
  return cleaned;
};

const sensitivityFor = (statement) => {
  const text = normalizeText(statement);
  if (/\b(paciente|psicolog|terapia|terapeutic|diagnostico|diagnóstico|trauma|clinica|clínica|salud mental)\b/.test(text)) {
    return 'restricted';
  }
  if (/\b(familia|hija|hijo|espos[ao]|tono|preferencias?|espiritual|vidente|personal)\b/.test(text)) {
    return 'sensitive_review';
  }
  return 'normal';
};

const classifyStatement = (statement, sourceKind) => {
  const text = normalizeText(statement);
  const source = normalizeText(sourceKind);
  if (/\b(collision|colision|colisión|review-only|review only|weak_review|required|not proven|no se promueve|do not|different display|must not)\b/.test(text)) {
    return 'review_only_collision';
  }
  if (
    /\b(no recoverable handle|handle not recoverable|sin handle|without handle|no visible match|no visible .*match|no recoverable|not recoverable|no expuso|no expose)\b/.test(text)
    || /\bdid not expose\b.*\bhandle\b/.test(text)
    || /\b0\b.*\bmatched\b/.test(text)
  ) {
    return 'identity_gap';
  }
  if (/\b(email\s*[-=]?>\s*ig|email-to-handle|ig handle bridge|messages search|matched instagram|visible thread\/account)\b/.test(text)) {
    return 'identity_bridge_context';
  }
  if (/\b(onboarding|lead[-_ ]capture|saludo inicial|welcome|org[aá]nico exitoso|lleg[oó]|conoci[oó]|empez[oó] a seguir|agradeci[oó] el contacto)\b/.test(text)) {
    return 'origin_story';
  }
  if (/\b(kamadhenu|relationship context|vinculo|vínculo|relaci[oó]n|familia|amig[oa]|aliad[oa]|referencia|voluntari[oa]|companera|compañera|coherencia creativa)\b/.test(text)) {
    return 'relationship_context';
  }
  if (/\b(stories|story|react|reacciona|activa|engagement|coment[oó]|like|dm|mensaje)\b/.test(text)) {
    return 'engagement_context';
  }
  if (/\b(life stage|age bracket|mayor de 50|jubilaci[oó]n|retiro laboral|profesional\/comunitario|mundo del arte)\b/.test(text)) {
    return 'general_note';
  }
  if (/\b(retiro|retreat|producto|curso|meditaci[oó]n|yoga|inversi[oó]n|compr[oó]|inter[eé]s|interesada|pregunt[oó])\b/.test(text)) {
    return 'product_interest';
  }
  if (/\b(city|ciudad|country|pa[ií]s|bio includes|guatemala|colombia|m[eé]xico|alemania|chile|c[uú]cuta|cucuteno|cucuteño|medell[ií]n|bogot[aá])\b/.test(text)) {
    return 'location_context';
  }
  if (/\b(tone|tono|preferences?|preferencias?|interests?|intereses?)\b/.test(text)) {
    return 'tone_preference_context';
  }
  if (source.includes('lead_capture') || source.includes('instagram_dm_ui')) return 'general_note';
  return 'general_note';
};

const actionFor = (contextKind, sensitivity) => {
  if (sensitivity === 'restricted') return 'hold_review_only';
  if (contextKind === 'identity_gap' || contextKind === 'review_only_collision') return 'hold_review_only';
  if (contextKind === 'tone_preference_context' && sensitivity !== 'normal') return 'hold_review_only';
  return 'promote_to_card_evidence';
};

const confidenceFor = (statement, source) => {
  const text = `${statement} ${source.text}`.toLowerCase();
  if (/\b(strong|confirmed|confirmad[ao]|visible|exact account|active)\b/.test(text)) return 'high';
  if (/\b(review|weak|candidate|candidato|possible|posible)\b/.test(text)) return 'medium';
  return 'medium';
};

const statementCandidatesFor = (source) => {
  const statements = [];
  for (const finding of labelValues(source.text, 'Finding')) {
    const cleaned = stripBoilerplate(finding);
    if (cleaned) statements.push(cleaned);
  }

  const threadContext = firstLabel(source.text, ['Thread context', 'Context']);
  if (threadContext) statements.push(`Thread context: ${threadContext}`);
  const preferences = firstLabel(source.text, ['Preferences', 'Interests']);
  if (preferences) statements.push(`Preferences: ${preferences}`);
  const tone = firstLabel(source.text, ['Tone']);
  if (tone) statements.push(`Tone: ${tone}`);

  const country = firstLabel(source.text, ['Country']);
  const city = firstLabel(source.text, ['City']);
  if (/bio includes|exact account result/i.test(source.text) && (city || country)) {
    statements.push(`Location clue from Instagram UI: ${[city, country].filter(Boolean).join(', ')}`);
  }

  return uniqueBy(statements.map(stripBoilerplate).filter(Boolean), (item) => normalizeText(item));
};

const duplicateAgainstCard = (cardEvidenceCount, statement, currentCard) => {
  if (!currentCard || !Array.isArray(currentCard.evidence)) return false;
  const normalized = normalizeText(statement).slice(0, 80);
  if (!normalized) return false;
  return currentCard.evidence.some((item) => normalizeText(item?.note).includes(normalized));
};

const proposalFor = (source, statement, target, currentCard, generatedAt) => {
  const contextKind = classifyStatement(statement, source.sourceKind);
  const sensitivity = sensitivityFor(statement);
  const duplicate = duplicateAgainstCard(target.currentEvidenceCount, statement, currentCard);
  const promotionAction = duplicate ? 'ignore_duplicate' : actionFor(contextKind, sensitivity);
  const confidence = confidenceFor(statement, source);
  const proposalId = `context_fact_${hashId([
    target.targetPersonId,
    source.sourceId,
    contextKind,
    statement,
  ])}`;

  return {
    proposalId,
    targetPersonId: target.targetPersonId,
    target: {
      matchStatus: target.matchStatus,
      displayName: target.displayName,
      email: target.email,
      instagramHandle: target.instagramHandle,
      currentEvidenceCount: target.currentEvidenceCount,
    },
    contextKind,
    statement,
    confidence,
    sensitivity,
    promotionAction,
    approvalRequired: promotionAction !== 'ignore_duplicate',
    source: {
      sourceKind: source.sourceKind,
      sourceId: source.sourceId,
      title: source.title,
      observedAt: source.observedAt,
    },
    suggestedCardEvidence: promotionAction === 'promote_to_card_evidence'
      ? {
          source: `crm-vnext-context-fact-proposals:${source.sourceKind}:${source.sourceId}`,
          observedAt: isoNow(source.observedAt ?? generatedAt),
          note: statement,
        }
      : null,
    suggestedHumanQuestion: promotionAction === 'hold_review_only'
      ? `Review before promoting this context for ${target.displayName}: ${statement}`
      : null,
    safetyNote: promotionAction === 'promote_to_card_evidence'
      ? 'Needs explicit approval before any local card evidence write.'
      : 'Preserve as review-only context until Alejandro approves a safer handling.',
  };
};

const summarize = (proposals, evidenceSources, cards) => {
  const byKind = Object.fromEntries(CONTEXT_KINDS.map((kind) => [kind, 0]));
  const byAction = {
    promote_to_card_evidence: 0,
    hold_review_only: 0,
    ignore_duplicate: 0,
  };
  for (const proposal of proposals) {
    byKind[proposal.contextKind] = (byKind[proposal.contextKind] ?? 0) + 1;
    byAction[proposal.promotionAction] = (byAction[proposal.promotionAction] ?? 0) + 1;
  }
  return {
    evidenceSourcesRead: evidenceSources.length,
    cardsAvailable: cards.length,
    proposals: proposals.length,
    readyForHumanApproval: proposals.filter((item) => item.promotionAction === 'promote_to_card_evidence').length,
    reviewOnly: proposals.filter((item) => item.promotionAction === 'hold_review_only').length,
    duplicatesIgnored: proposals.filter((item) => item.promotionAction === 'ignore_duplicate').length,
    targetPeople: new Set(proposals.map((item) => item.targetPersonId ?? item.target.displayName)).size,
    byKind,
    byAction,
    operationsExecuted: 0,
    cardMutationReady: false,
  };
};

const safety = () => ({
  readOnly: true,
  outboundProhibited: true,
  cardMutationProhibited: true,
  factStoreWriteProhibited: true,
  credentialReadProhibited: true,
  liveApiCallsProhibited: true,
  manyChatLiveMutationProhibited: true,
  instagramPermissionMutationProhibited: true,
  approvalRequiredBeforePromotion: true,
  allowedUse: [
    'Convert rich CRM vNext evidence into reviewed context/fact promotion proposals.',
    'Let Mantis and Alejandro decide what should become card evidence later.',
    'Keep identity gaps and weak/collision candidates visible without mutating cards.',
  ],
  prohibitedActions: [
    'Do not write person cards.',
    'Do not write Fact Store.',
    'Do not send outbound messages.',
    'Do not call live Gmail, Drive, MailerLite, Instagram, ManyChat, WhatsApp, Telegram, or Contacts APIs.',
    'Do not read, print, rotate, or mutate credentials.',
    'Do not treat a proposal as approval.',
  ],
});

const buildReport = ({ evidenceSources, cards, now }) => {
  const generatedAt = isoNow(now);
  const proposals = evidenceSources.flatMap((source) => {
    const target = targetFor(source, cards);
    const currentCard = target.targetPersonId
      ? cards.find((card) => card.personId === target.targetPersonId) ?? null
      : null;
    return statementCandidatesFor(source)
      .map((statement) => proposalFor(source, statement, target, currentCard, generatedAt));
  });
  const deduped = uniqueBy(proposals, (proposal) =>
    [proposal.targetPersonId, proposal.contextKind, normalizeText(proposal.statement)].join('|')
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_context_fact_proposals',
    summary: summarize(deduped, evidenceSources, cards),
    proposals: deduped,
    nextStep: deduped.length
      ? 'Review promote_to_card_evidence items with Alejandro before building the local context/fact write lane.'
      : 'No context proposals were produced; inspect whether the evidence packet only contains identity fields.',
    safety: safety(),
  };
};

const markdownFor = (report) => {
  const lines = [
    '# CRM vNext Context Fact Proposals',
    '',
    `Generated: ${report.generatedAt}`,
    '',
    '## Summary',
    '',
    `- Evidence sources read: ${report.summary.evidenceSourcesRead}`,
    `- Proposals: ${report.summary.proposals}`,
    `- Ready for human approval: ${report.summary.readyForHumanApproval}`,
    `- Review-only: ${report.summary.reviewOnly}`,
    `- Operations executed: ${report.summary.operationsExecuted}`,
    '',
    '## Ready For Approval',
    '',
  ];
  const ready = report.proposals.filter((item) => item.promotionAction === 'promote_to_card_evidence');
  if (!ready.length) lines.push('- None.');
  for (const item of ready) {
    lines.push(`- ${item.target.displayName} (${item.contextKind}): ${item.statement}`);
  }
  lines.push('', '## Hold / Review Only', '');
  const review = report.proposals.filter((item) => item.promotionAction === 'hold_review_only');
  if (!review.length) lines.push('- None.');
  for (const item of review) {
    lines.push(`- ${item.target.displayName} (${item.contextKind}, ${item.sensitivity}): ${item.statement}`);
  }
  lines.push('', '## Safety', '');
  lines.push('- Read-only.');
  lines.push('- No card writes.');
  lines.push('- No Fact Store writes.');
  lines.push('- No outbound or live API calls.');
  return `${lines.join('\n')}\n`;
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const evidenceSources = await readEvidenceSources(options.evidenceFile);
  const cards = await readCards(options.cardStorePath);
  const report = buildReport({ evidenceSources, cards });

  if (options.out) {
    const outPath = resolve(options.out);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  }
  if (options.markdownOut) {
    const outPath = resolve(options.markdownOut);
    await mkdir(dirname(outPath), { recursive: true });
    await writeFile(outPath, markdownFor(report), 'utf8');
  }

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    generatedAt: report.generatedAt,
    summary: report.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnEmpty && report.summary.proposals === 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext context fact proposals failed: ${error.message}`);
  process.exitCode = 1;
});
