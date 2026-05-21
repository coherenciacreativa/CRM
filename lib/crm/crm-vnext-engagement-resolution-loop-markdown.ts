import type { buildCrmVNextEngagementResolutionLoopFromBrief } from './crm-vnext-engagement-resolution-loop';

type ResolutionLoop = ReturnType<typeof buildCrmVNextEngagementResolutionLoopFromBrief>;
type ResolutionQuestion = ResolutionLoop['questions'][number];

const compactInline = (values: Array<string | null | undefined>, fallback: string): string => {
  const cleaned = values
    .map((value) => (typeof value === 'string' ? value.trim() : null))
    .filter(Boolean) as string[];
  return cleaned.length ? cleaned.join(' | ') : fallback;
};

const knownLines = (question: ResolutionQuestion): string[] => [
  ...question.known.identity,
  ...question.known.programs,
  ...question.known.memoryCues,
  question.known.nextAction ? `Next action: ${question.known.nextAction}` : null,
].filter(Boolean) as string[];

const missingLines = (question: ResolutionQuestion): string[] =>
  question.missingFields?.length
    ? question.missingFields
    : ['contexto humano', 'programas/intereses', 'siguiente paso'];

const contextCoveredLines = (packet: ResolutionLoop): string[] => {
  if (!packet.contextCoveredItems?.length) return [];
  return [
    '## Resueltos internamente',
    '',
    'Estos contactos ya tienen contexto humano suficiente. No conviene hacer una pregunta amplia; Mantis debe revisar la señal nueva y escalar solo si hay una decision minima o un futuro follow-up que aprobar.',
    '',
    ...packet.contextCoveredItems.flatMap((item) => {
      const lines = [
        `### ${item.subject.label}`,
        '',
        `Motivo: ${item.redundancyReview.reason}`,
        `Manejo: ${item.redundancyReview.recommendedHandling}`,
        `Contexto humano guardado: ${item.redundancyReview.humanContextEvidenceCount}`,
      ];
      if (item.redundancyReview.latestHumanContextAt) {
        lines.push(`Ultimo contexto humano: ${item.redundancyReview.latestHumanContextAt}`);
      }
      if (item.redundancyReview.samples?.length) {
        lines.push(`Ejemplos: ${compactInline(item.redundancyReview.samples, 'Sin ejemplos compactos')}`);
      }
      lines.push(`Señal nueva: ${compactInline(item.known.memoryCues.slice(0, 5), 'Sin senal compacta')}`);
      lines.push('');
      return lines;
    }),
  ];
};

export const formatCrmVNextEngagementResolutionLoopMarkdown = (
  packet: ResolutionLoop,
): string => [
  '# CRM vNext - Engagement Resolution Loop',
  '',
  `Generado: ${packet.generatedAt}`,
  `Preguntas: ${packet.summary.questions}`,
  `Candidatos revisados: ${packet.summary.candidatesReviewed ?? packet.summary.questions}`,
  `Preguntas amplias suprimidas: ${packet.summary.broadQuestionsSuppressed ?? 0}`,
  '',
  'Responde libremente debajo de cada persona. Una frase, una memoria o un audio transcrito sirve.',
  'Este archivo no aprueba mensajes ni cambios de CRM; solo captura contexto para propuestas internas.',
  '',
  ...(packet.questions.length ? [] : [
    'No hay preguntas nuevas para Alejandro en este paquete.',
    '',
  ]),
  ...packet.questions.flatMap((question, index) => [
    `## ${index + 1}. ${question.subject.label}`,
    '',
    `Prioridad: ${question.priority}`,
    `Person ID: ${question.personId || 'unknown'}`,
    `Datos: ${compactInline(knownLines(question), 'Sin datos seguros todavia')}`,
    `Completar: ${compactInline(missingLines(question), 'Contexto humano y siguiente paso')}`,
    '',
    'Pregunta:',
    question.prompt,
    '',
    'Respuesta libre:',
    '> ',
    '',
  ]),
  ...contextCoveredLines(packet),
  '## Uso posterior',
  '',
  'Cuando Alejandro responda, Mantis/Codex debe correr:',
  '',
  '```bash',
  'npm run crm:vnext:human-enrichment-response-evidence -- \\',
  '  --answers-md <este-archivo-respondido.md> \\',
  '  --questions-file <engagement-resolution-loop.json> \\',
  '  --out <response-evidence.json> \\',
  '  --markdown-out <response-evidence.md>',
  '```',
  '',
  'Luego ese evidence packet puede pasar a context-fact-proposals. Ningun paso envia mensajes o escribe tarjetas sin aprobacion explicita.',
  '',
  '## Safety',
  '',
  '- Read-only local packet.',
  '- No outbound.',
  '- No CRM card writes.',
  '- No Fact Store writes.',
  '- No score mutation.',
  '- No live API calls or credential access.',
  '',
].join('\n');
