#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const SCHEMA_VERSION = 'crm-vnext-human-enrichment-response-evidence-2026-05-15';

const usage = `Usage:
  node scripts/crm-vnext-human-enrichment-response-evidence.mjs --answers-md <path> [options]

Options:
  --answers-md <path>     Compact human enrichment markdown answered by Alejandro
  --questions-file <path> Optional original human-enrichment question packet JSON
  --out <path>            Write evidence packet JSON
  --markdown-out <path>   Write compact summary Markdown
  --fail-on-empty         Exit non-zero when no evidence sources or tasks are produced
  --help                  Show this help

This command is read-only. It turns Alejandro's freestyle compact-review answers into structured
human_enrichment_response evidence plus operator tasks. It never mutates cards, writes Fact Store,
calls live APIs, touches credentials, or sends outbound messages.`;

const parseArgs = (argv) => {
  const options = {
    answersMd: null,
    questionsFile: null,
    out: null,
    markdownOut: null,
    failOnEmpty: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') options.help = true;
    else if (arg === '--fail-on-empty') options.failOnEmpty = true;
    else if (arg === '--answers-md') options.answersMd = argv[++index];
    else if (arg === '--questions-file') options.questionsFile = argv[++index];
    else if (arg === '--out') options.out = argv[++index];
    else if (arg === '--markdown-out') options.markdownOut = argv[++index];
    else throw new Error(`unknown_arg:${arg}`);
  }

  if (!options.help && !options.answersMd) throw new Error('answers_md_required');
  return options;
};

const cleanPublicText = (value) =>
  String(value ?? '')
    .replace(/\/Users\/[^\s`'"<>),;]+/g, '[local-path]')
    .replace(/\.openclaw[-\w.]*/g, '[private-workspace]')
    .replace(/\s+/g, ' ')
    .trim();

const cleanString = (value) => {
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value !== 'string') return null;
  const cleaned = cleanPublicText(value);
  return cleaned || null;
};

const normalizeText = (value) =>
  cleanPublicText(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const hashId = (parts) =>
  createHash('sha256')
    .update(parts.filter(Boolean).join('|'))
    .digest('hex')
    .slice(0, 16);

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const normalizeHandle = (value) => {
  const raw = cleanString(value);
  if (!raw) return null;
  const handle = raw
    .replace(/^@+/, '')
    .replace(/[/?#].*$/, '')
    .replace(/\.+$/g, '')
    .trim()
    .toLowerCase();
  if (!/^[a-z0-9._]{2,30}$/.test(handle)) return null;
  if (/^\d+$/.test(handle)) return null;
  return handle;
};

const normalizeEmail = (value) => {
  const raw = cleanString(value);
  const email = raw?.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]?.toLowerCase() ?? null;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
};

const readJson = async (filePath) => JSON.parse(await readFile(resolve(filePath), 'utf8'));

const readQuestions = async (filePath) => {
  if (!filePath) return [];
  const parsed = await readJson(filePath);
  return Array.isArray(parsed?.questions) ? parsed.questions : [];
};

const parseAnswerSections = (markdown) => {
  const matches = Array.from(markdown.matchAll(/^##\s+(\d+)\.\s+(.+)$/gm));
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : markdown.length;
    const body = markdown.slice(start, end);
    const responseMatch = body.match(/Respuesta libre:\s*([\s\S]*)$/i);
    const answer = cleanString(
      (responseMatch?.[1] ?? '')
        .split(/\r?\n/)
        .map((line) => line.replace(/^>\s?/, '').trim())
        .filter(Boolean)
        .join(' '),
    );
    return {
      index: Number(match[1]),
      label: cleanString(match[2]) ?? `Contact ${match[1]}`,
      answer: answer ?? '',
    };
  });
};

const questionForSection = (questions, section) =>
  questions[section.index - 1] ?? questions.find((question) => cleanString(question.subject?.label) === section.label) ?? null;

const subjectHandle = (section, question) =>
  normalizeHandle(question?.subject?.instagramHandle)
  ?? normalizeHandle(section.label.match(/@([a-zA-Z0-9._]{2,30})/)?.[1]);

const subjectEmail = (question) => {
  for (const line of question?.known?.identity ?? []) {
    const email = normalizeEmail(line);
    if (email) return email;
  }
  return null;
};

const subjectName = (section, question) =>
  cleanString(question?.subject?.displayName)
  ?? cleanString(section.label.replace(/\s*\(@[a-zA-Z0-9._]{2,30}\)\s*$/, ''));

const addIf = (items, condition, value) => {
  if (condition) items.push(value);
};

const answerFindings = (answer, section, question) => {
  const text = normalizeText(answer);
  const findings = [];
  const tasks = [];
  const handle = subjectHandle(section, question);
  const subject = cleanString(question?.subject?.label) ?? section.label;

  addIf(findings, /prima de .*jorge luis lazaro|jorge luis lazaro/.test(text),
    'Relacion: es prima de Jorge Luis Lazaro, amigo muy cercano de Alejandro.');
  addIf(findings, /ve las stories|ve.*stories|stories con frecuencia/.test(text),
    'Engagement: ve stories de Instagram con frecuencia.');
  addIf(findings, /inter[eé]s.*casual|algo de interes|no se ha animado/.test(text),
    'Producto/interes: ha mostrado interes casual en clases o retiros, pero todavia no ha participado.');
  addIf(findings, /abogada/.test(text), 'Contexto profesional: es abogada.');
  addIf(findings, /vive en bogota|bogota, colombia|bogot[aá]/.test(text),
    'Ciudad/pais: vive en Bogota, Colombia.');
  addIf(tasks, /via el primo|v[ií]a el primo|conseguir el email/.test(text), {
    taskKind: 'identity_follow_up',
    priority: 'medium',
    task: `Email pendiente para ${subject}; Alejandro dice que podria conseguirse via Jorge Luis Lazaro.`,
  });

  addIf(findings, /agradeci/.test(text),
    'Onboarding: agradecio el mensaje de bienvenida en Instagram.');
  addIf(findings, /bayern/.test(text),
    'Contexto personal liviano: perfil muestra afinidad por Bayern Munich.');

  addIf(findings, /satyananda/.test(text),
    'Relacion/comunidad: Alejandro la ha encontrado en eventos de la academia de yoga Satyananda en Bogota.');
  addIf(findings, /retiro/.test(text) && /encantaria|pendiente|me le apuntaria|proximo/.test(text),
    'Producto/interes: respondio con interes fuerte en futuros retiros, aunque no pudo asistir al retiro mencionado por un compromiso.');
  addIf(findings, /negocio de comida/.test(text),
    'Contexto: la cuenta parece ser de un negocio de comida.');
  addIf(findings, /dunna|maria adelaida|contactos en comun/.test(text),
    'Relacion/comunidad: hay contactos en comun dentro de la comunidad Satyananda, incluyendo Dunna y Maria Adelaida Lopez.');
  addIf(findings, /shanti/.test(text),
    'Review-only candidate: la persona detras de la cuenta podria llamarse Shanti, pero requiere confirmacion.');
  addIf(tasks, /preguntar a alguien|completar mejor su tarjeta|comunidad satyananda/.test(text), {
    taskKind: 'identity_follow_up',
    priority: 'medium',
    task: `Completar identidad/contacto de ${subject} consultando a alguien de la comunidad Satyananda antes de promover nombre/email.`,
  });

  addIf(tasks, /no la encontre con el handle|no la encontr[eé] en instagram|no encontre/.test(text), {
    taskKind: 'identity_gap',
    priority: 'medium',
    task: `Alejandro no encontro ${subject} por el handle en Instagram; revalidar handle/posible cambio de cuenta antes de pedirle mas datos.`,
  });

  addIf(findings, /pregunt[oó] por el retiro/.test(text),
    'Producto/interes: pregunto por el retiro, pero no continuo la conversacion despues.');

  addIf(tasks, /manychat|vercel|mailer|flujo oficial/.test(text), {
    taskKind: 'source_investigation',
    priority: 'high',
    task: `${subject} parece haber seguido el flujo oficial de ManyChat y haber entregado email; revisar IG Messages, ManyChat, Vercel proxy y MailerLite para completar la tarjeta.`,
  });
  addIf(findings, /flujo oficial manychat/.test(text),
    'Review-only source gap: Alejandro recuerda que siguio el flujo oficial de ManyChat y entrego email, pero la tarjeta sigue incompleta.');

  addIf(findings, /kamadhenu/.test(text),
    'Relacion/comunidad: visito Kamadhenu hace varios anos.');
  addIf(findings, /subachoque/.test(text),
    'Ciudad: vivia en Subachoque cuando visito Kamadhenu.');
  addIf(findings, /arquitecta/.test(text),
    'Contexto profesional: es arquitecta.');
  addIf(findings, /fue a un retiro/.test(text),
    'Producto/interes: asistio a un retiro.');
  addIf(findings, /alemania/.test(text),
    'Ciudad/pais: ahora vive en Alemania.');

  addIf(tasks, /buen material en esos mensajes|mensajes.*instagram|capturar en los mensajes/.test(text), {
    taskKind: 'source_investigation',
    priority: 'medium',
    task: `Revisar mensajes de Instagram de ${subject} en modo read-only para extraer contexto util antes de pedir mas memoria a Alejandro.`,
  });

  addIf(tasks, /falta conseguir su correo|ya le escribi|reporto cuando me responda/.test(text), {
    taskKind: 'awaiting_human_update',
    priority: 'medium',
    task: `${subject}: email primario pendiente; Alejandro ya escribio directamente y reportara cuando responda.`,
  });

  addIf(findings, /no lo conozco|no la conozco|no conozco/.test(text),
    'Review-only context: Alejandro no conoce personalmente a esta persona todavia.');

  const taskOnlyAnswer = /no la encontre|no la encontr[eé]|no lo conozco|no la conozco|nada que agregar|no tengo m[aá]s|falta conseguir|ya le escribi|ya le escrib[ií]/.test(text);
  const noUsefulEvidence = !findings.length && answer && !taskOnlyAnswer;
  addIf(findings, noUsefulEvidence,
    `General note: ${answer.length > 260 ? `${answer.slice(0, 257).trim()}...` : answer}`);

  return {
    findings: unique(findings),
    tasks: tasks.map((task) => ({
      taskId: `human_enrichment_task_${hashId([handle, subject, task.task])}`,
      personId: cleanString(question?.personId),
      label: subject,
      instagramHandle: handle,
      ...task,
      operationsExecuted: 0,
    })),
  };
};

const evidenceSourceFor = (section, question, findings, generatedAt) => {
  if (!findings.length) return null;
  const personId = cleanString(question?.personId);
  const handle = subjectHandle(section, question);
  const email = subjectEmail(question);
  const name = subjectName(section, question);
  const sourceId = `human_enrichment_response:${hashId([personId, handle, email, section.label, findings.join('|')])}`;
  const lines = [
    name ? `Name: ${name}` : null,
    handle ? `Handle: ${handle}` : null,
    email ? `Email: ${email}` : null,
    ...findings.map((finding) => `Finding: ${finding}`),
  ].filter(Boolean);
  return {
    sourceKind: 'human_enrichment_response',
    sourceId,
    title: `Alejandro compact review: ${section.label}`,
    subject: name,
    email,
    handle,
    observedAt: generatedAt,
    text: lines.join(' | '),
  };
};

const buildReport = ({ markdown, questions, now }) => {
  const generatedAt = now ?? new Date().toISOString();
  const sections = parseAnswerSections(markdown);
  const answered = sections.filter((section) => section.answer);
  const evidenceSources = [];
  const operatorTasks = [];
  const skippedAnswers = [];

  for (const section of answered) {
    const question = questionForSection(questions, section);
    const result = answerFindings(section.answer, section, question);
    const evidenceSource = evidenceSourceFor(section, question, result.findings, generatedAt);
    if (evidenceSource) evidenceSources.push(evidenceSource);
    operatorTasks.push(...result.tasks);
    if (!evidenceSource && !result.tasks.length) {
      skippedAnswers.push({
        index: section.index,
        label: section.label,
        reason: 'no_structured_delta_detected',
        answer: section.answer,
      });
    }
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    generatedAt,
    mode: 'read_only_human_enrichment_response_evidence',
    summary: {
      sectionsRead: sections.length,
      answersFound: answered.length,
      evidenceSources: evidenceSources.length,
      operatorTasks: operatorTasks.length,
      skippedAnswers: skippedAnswers.length,
      operationsExecuted: 0,
      cardMutationReady: false,
    },
    evidenceSources,
    operatorTasks,
    skippedAnswers,
    safety: {
      readOnly: true,
      outboundProhibited: true,
      cardMutationProhibited: true,
      factStoreWriteProhibited: true,
      credentialReadProhibited: true,
      liveApiCallsProhibited: true,
      approvalRequiredBeforePromotion: true,
    },
  };
};

const markdownFor = (report) => [
  '# CRM vNext Human Enrichment Response Evidence',
  '',
  `Generated: ${report.generatedAt}`,
  '',
  '## Summary',
  '',
  `- Answers found: ${report.summary.answersFound}`,
  `- Evidence sources: ${report.summary.evidenceSources}`,
  `- Operator tasks: ${report.summary.operatorTasks}`,
  `- Skipped answers: ${report.summary.skippedAnswers}`,
  `- Operations executed: ${report.summary.operationsExecuted}`,
  '',
  '## Evidence Sources',
  '',
  ...(report.evidenceSources.length
    ? report.evidenceSources.flatMap((source) => [
      `- ${source.title}`,
      ...source.text.split(/\s*\|\s*/).filter((line) => /^Finding:/.test(line)).map((line) => `  - ${line.replace(/^Finding:\s*/, '')}`),
    ])
    : ['- None.']),
  '',
  '## Operator Tasks',
  '',
  ...(report.operatorTasks.length
    ? report.operatorTasks.map((task) => `- [${task.priority}] ${task.label}: ${task.task}`)
    : ['- None.']),
  '',
  '## Safety',
  '',
  '- Read-only.',
  '- No card writes.',
  '- No Fact Store writes.',
  '- No outbound or live API calls.',
].join('\n');

const writeJson = async (filePath, value) => {
  const outPath = resolve(filePath);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const writeText = async (filePath, value) => {
  const outPath = resolve(filePath);
  await mkdir(dirname(outPath), { recursive: true });
  await writeFile(outPath, `${value}\n`, 'utf8');
};

const main = async () => {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(usage);
    return;
  }

  const markdown = await readFile(resolve(options.answersMd), 'utf8');
  const questions = await readQuestions(options.questionsFile);
  const report = buildReport({ markdown, questions });

  if (options.out) await writeJson(options.out, report);
  if (options.markdownOut) await writeText(options.markdownOut, markdownFor(report));

  console.log(JSON.stringify({
    ok: true,
    mode: report.mode,
    generatedAt: report.generatedAt,
    summary: report.summary,
    out: options.out ? resolve(options.out) : null,
    markdownOut: options.markdownOut ? resolve(options.markdownOut) : null,
    safety: report.safety,
  }, null, 2));

  if (options.failOnEmpty && report.summary.evidenceSources === 0 && report.summary.operatorTasks === 0) {
    process.exitCode = 2;
  }
};

main().catch((error) => {
  console.error(`crm-vnext human-enrichment-response-evidence failed: ${error.message}`);
  process.exitCode = 1;
});
