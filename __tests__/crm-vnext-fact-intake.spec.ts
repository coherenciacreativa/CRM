import { describe, expect, test } from "vitest";
import { buildCrmFactIntakeDraft } from "../lib/crm/crm-vnext-fact-intake.js";

const NOW = "2026-05-09T12:00:00.000Z";

describe("CRM vNext fact intake", () => {
  test("turns conversational human reports into dry-run CRM facts", () => {
    const draft = buildCrmFactIntakeDraft({
      text: [
        "CRM: Ana Gomez y Carlos Diaz son estudiantes de yoga en el programa mensual de mayo.",
        "CRM: Laura Perez asistio al retiro de Barichara.",
        "CRM: @mariana_luz esta interesada en mentoria 1:1.",
      ].join("\n"),
      sourceKind: "telegram_human_report",
      reporter: "Juana",
      channel: "telegram",
      observedAt: NOW,
    });

    expect(draft.mode).toBe("dry_run_fact_intake");
    expect(draft.safety.recordMutationProhibited).toBe(true);
    expect(draft.summary.linesParsed).toBe(3);
    expect(draft.summary.people).toBe(4);
    expect(draft.summary.factTypes.program_participation).toBe(2);
    expect(draft.summary.factTypes.retreat_attendance).toBe(1);
    expect(draft.summary.factTypes.expressed_interest).toBe(1);
    expect(draft.facts).toHaveLength(4);

    const yogaFacts = draft.facts.filter((fact) => fact.type === "program_participation");
    expect(yogaFacts.map((fact) => fact.person.rawName)).toEqual(["Ana Gomez", "Carlos Diaz"]);
    expect(yogaFacts.every((fact) => fact.subject.program === "yoga")).toBe(true);
    expect(yogaFacts.every((fact) => fact.suggestedCardPatch.scoringHints.participation?.yogaClasses90d === 1)).toBe(true);

    const retreat = draft.facts.find((fact) => fact.type === "retreat_attendance");
    expect(retreat?.person.rawName).toBe("Laura Perez");
    expect(retreat?.subject.eventName).toBe("retiro Barichara");
    expect(retreat?.suggestedCardPatch.scoringHints.participation?.retreatsAttended).toBe(1);

    const interest = draft.facts.find((fact) => fact.type === "expressed_interest");
    expect(interest?.person.instagramHandle).toBe("mariana_luz");
    expect(interest?.person.personIdHint).toBe("ig:mariana_luz");
    expect(interest?.subject.program).toBe("mentoria");
    expect(interest?.requiresHumanReview).toBe(false);
  });

  test("keeps ambiguous lines as reviewable notes", () => {
    const draft = buildCrmFactIntakeDraft({
      text: "CRM: Alguien pregunto por el retiro, revisar despues.",
      sourceKind: "unknown",
      observedAt: NOW,
    });

    expect(draft.facts).toHaveLength(0);
    expect(draft.ambiguities.map((item) => item.code)).toContain("missing_person_hint");
  });

  test("captures handle aliases and flags sensitive relationship context", () => {
    const draft = buildCrmFactIntakeDraft({
      text: [
        "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
        "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología, es amigo y aliado consultor de Coherencia Creativa.",
      ].join("\n"),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      observedAt: NOW,
    });

    const mayerlyFacts = draft.facts.filter((fact) => fact.person.instagramHandle === "mayuyis2626");
    expect(mayerlyFacts).toHaveLength(2);
    expect(mayerlyFacts.every((fact) => fact.person.rawName === "Mayerli")).toBe(true);
    const juanClientStatus = draft.facts.find((fact) =>
      fact.person.rawName === "Juan José Trujillo" && fact.type === "client_status"
    );
    expect(juanClientStatus?.subject.program).toBe("terapia");
    expect(juanClientStatus?.subject.product).toBe("therapy");
    expect(juanClientStatus?.suggestedCardPatch.scoringHints.purchases?.activeClient).toBe(true);

    const codes = draft.ambiguities.map((item) => item.code);
    expect(codes).toContain("sensitive_private_context");
    expect(codes).toContain("relationship_context_not_structured");
  });

  test("keeps adjacent sentence clues from sharing later handles", () => {
    const draft = buildCrmFactIntakeDraft({
      text: "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología. @mayuyis2626 es Mayerli, estudiante de las clases de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      observedAt: NOW,
    });

    expect(draft.summary.linesParsed).toBe(2);
    const juanFacts = draft.facts.filter((fact) => fact.person.rawName === "Juan José Trujillo");
    const mayerlyFacts = draft.facts.filter((fact) => fact.person.instagramHandle === "mayuyis2626");
    expect(juanFacts.length).toBeGreaterThan(0);
    expect(juanFacts.every((fact) => fact.person.instagramHandle === null)).toBe(true);
    expect(mayerlyFacts.length).toBeGreaterThan(0);
    expect(mayerlyFacts.every((fact) => fact.person.rawName === "Mayerli")).toBe(true);
  });

  test("keeps current yoga student batches scoped to the named people", () => {
    const draft = buildCrmFactIntakeDraft({
      text: [
        "CRM: Adriana Bernal es mi tía, ha asistido a retiros, es alumna de las clases de yoga hace más de 10 años, no tiene Instagram.",
        "Amalia de Bedud es estudiante mía también hace más de 10 años, ha asistido a múltiples retiros, está en las clases de yoga, ella sí tiene Instagram.",
        "Santiago Bernal es mi tío, también tiene Instagram, ha asistido a varios retiros, es alumno de las clases de yoga.",
        "Lina María Bernal es mi mamá, ha asistido a múltiples retiros, es asistente de mis clases de yoga, sí tiene Instagram también.",
        "Natalia Cárdenas de Bedut es hija de Amalia, ha asistido a algunos retiros, es estudiante de mis clases desde hace varios años, vive en Nueva York, tiene Instagram.",
        "@cadavid_eli se llama Eliana, asiste a mis clases de yoga desde hace dos meses, vive en Medellín, es muy activa en Instagram y asiste al Encuentro Feliz con alguna regularidad.",
        "Trabaja en casa.",
        "Luis Enrique Lopera ha asistido a varios retiros, vive en El Rosal, Cundinamarca, es amigo, entra a mis clases de yoga y está en una etapa de prueba del producto de encuentros terapéuticos.",
      ].join(" "),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      observedAt: NOW,
    });

    const people = Array.from(new Set(draft.facts.map((fact) => fact.person.rawName))).sort();
    expect(people).toEqual([
      "Adriana Bernal",
      "Amalia de Bedud",
      "Eliana",
      "Lina María Bernal",
      "Luis Enrique Lopera",
      "Natalia Cárdenas de Bedut",
      "Santiago Bernal",
    ].sort());
    expect(people).not.toContain("Cundinamarca");
    expect(people).not.toContain("vive en Rosal");
    expect(people).not.toContain("se llama Eliana");

    const elianaFacts = draft.facts.filter((fact) => fact.person.instagramHandle === "cadavid_eli");
    expect(elianaFacts.length).toBeGreaterThan(0);
    expect(elianaFacts.every((fact) => fact.person.rawName === "Eliana")).toBe(true);

    const nataliaYoga = draft.facts.find((fact) =>
      fact.person.rawName === "Natalia Cárdenas de Bedut"
      && fact.type === "program_participation"
    );
    expect(nataliaYoga?.subject.program).toBe("yoga");

    const luisYoga = draft.facts.find((fact) =>
      fact.person.rawName === "Luis Enrique Lopera"
      && fact.type === "program_participation"
    );
    expect(luisYoga?.subject.program).toBe("yoga");
  });

  test("cleans conversational list lead-ins before creating person subjects", () => {
    const draft = buildCrmFactIntakeDraft({
      text: [
        "Bueno, voy a empezar por los que van a mis clases de yoga regularmente.",
        "Adriana Bernal es mi tía, ha asistido a retiros, es alumna de las clases de yoga hace más de 10 años, no tiene Instagram.",
        "Amalia de Bedud es estudiante mía también hace más de 10 años, ha asistido a múltiples retiros, está en las clases de yoga, ella sí tiene Instagram.",
        "También tenemos a Santiago Bernal, es mi tío, también tiene Instagram, ha asistido a varios retiros, es alumno de las clases de yoga.",
        "Tenemos a Lina María Bernal, que es mi mamá, ha asistido a múltiples retiros, es asistente de mis clases de yoga, sí tiene Instagram también.",
        "Tenemos también a Natalia Cárdenas de Bedut. Es hija de Amalia, ha asistido a algunos retiros, es estudiante de mis clases desde hace varios años, vive en Nueva York, tiene Instagram.",
        "Tenemos a @cadavid_eli Se llama Eliana, asiste a mis clases de yoga desde hace dos meses, vive en Medellín, es muy activa en Instagram y asiste al Encuentro Feliz con alguna regularidad.",
        "También está Luis Enrique Lopera, ha asistido a varios retiros, vive en El Rosal, Cundinamarca, es amigo, entra a mis clases de yoga y está en una etapa de prueba del producto de encuentros terapéuticos.",
      ].join(" "),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      observedAt: NOW,
    });

    const people = Array.from(new Set(draft.facts.map((fact) => fact.person.rawName))).sort();
    expect(people).toEqual([
      "Adriana Bernal",
      "Amalia de Bedud",
      "Eliana",
      "Lina María Bernal",
      "Luis Enrique Lopera",
      "Natalia Cárdenas de Bedut",
      "Santiago Bernal",
    ].sort());
    expect(people).not.toContain("También tenemos a Santiago Bernal");
    expect(people).not.toContain("Tenemos a Lina María Bernal");
    expect(people).not.toContain("que");
    expect(people).not.toContain("Es hija de Amalia");
  });
});
