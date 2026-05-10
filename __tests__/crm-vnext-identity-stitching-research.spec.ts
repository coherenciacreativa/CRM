import { describe, expect, test } from "vitest";
import {
  buildCrmVNextIdentityStitchingResearch,
  parseMailerBridgeCandidatesCsv,
} from "../lib/crm/crm-vnext-identity-stitching-research.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mailerCsv = [
  "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
  "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Consejeros;Asistentes a retiros;Aliados importantes;Amigos de la Fundación;Medellín,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
  "adelaidatrujillo@yahoo.com,Adelaida,Trujillo,,Asistentes a retiros,Contact Import,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
].join("\n");

describe("CRM vNext identity stitching research", () => {
  test("finds strong local Mailer bridge candidates and flags restricted service context", () => {
    const report = buildCrmVNextIdentityStitchingResearch({
      text: "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología, es amigo y aliado consultor de Coherencia Creativa.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "email:adelaidatrujillo@yahoo.com",
          displayName: "Adelaida Trujillo",
          identities: { email: "adelaidatrujillo@yahoo.com" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv(mailerCsv),
    });

    expect(report.mode).toBe("read_only_identity_stitching_research");
    expect(report.sourceCoverage.mailerBridge).toMatchObject({
      searched: true,
      rows: 2,
      liveApiCalled: false,
    });
    expect(report.draft.summary.factTypes.client_status).toBe(1);
    expect(report.summary.clues).toBe(1);
    expect(report.summary.privacyRestrictedSignals).toBe(1);
    expect(report.summary.relationshipSignals).toBe(1);

    const clue = report.clues[0];
    expect(clue.recommendation.action).toBe("review_mailer_candidate");
    expect(clue.recommendation.requiresHumanDecision).toBe(true);
    expect(clue.privacySignals[0].code).toBe("restricted_therapy_service_context");
    expect(clue.candidates[0]).toMatchObject({
      source: "mailer_bridge_candidates_enriched",
      personId: "email:juanjotru@gmail.com",
      displayName: "Juan José trujillo",
      confidence: "strong",
    });
    expect(clue.candidates[0].score).toBeGreaterThanOrEqual(90);
    expect(clue.candidates[0].evidence).toContain("source_labels_support_retreat_attendance");
  });

  test("recommends new-card review when a stable handle has no local candidate", () => {
    const report = buildCrmVNextIdentityStitchingResearch({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
    });

    expect(report.summary.clues).toBe(1);
    expect(report.summary.createCardRecommendations).toBe(1);
    expect(report.clues[0].person).toMatchObject({
      rawName: "Mayerli",
      instagramHandle: "mayuyis2626",
      personIdHint: "ig:mayuyis2626",
    });
    expect(report.clues[0].recommendation.action).toBe("create_new_card_candidate");
    expect(report.clues[0].relationshipSignals.map((signal) => signal.code)).toContain("relationship_context");
  });

  test("keeps a reported stable email as target instead of promoting weak name-only candidates", () => {
    const report = buildCrmVNextIdentityStitchingResearch({
      text: "CRM: Adriana Bernal es estudiante de yoga y su email confirmado es adrianabv86@hotmail.com.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "email:a_cuellara@hotmail.com",
          displayName: "Adriana Cuellar",
          identities: { email: "a_cuellara@hotmail.com" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
    });

    expect(report.clues[0].person).toMatchObject({
      rawName: "Adriana Bernal",
      email: "adrianabv86@hotmail.com",
      personIdHint: "email:adrianabv86@hotmail.com",
    });
    expect(report.clues[0].candidates[0]).toMatchObject({
      personId: "email:a_cuellara@hotmail.com",
      confidence: "weak",
    });
    expect(report.clues[0].recommendation.action).toBe("create_new_card_candidate");
    expect(report.clues[0].recommendation.reason).toContain("stable identity");
  });

  test("treats known surname spelling variants as reviewable MailerLite evidence", () => {
    const report = buildCrmVNextIdentityStitchingResearch({
      text: "CRM: Amalia de Bedud es estudiante de yoga hace más de 10 años y ha asistido a múltiples retiros.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv([
        "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
        "amaliadbg@hotmail.com,Amalia,De Bedout,,Estudiantes;Asistentes a retiros,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
      ].join("\n")),
    });

    expect(report.summary.candidates).toBe(1);
    expect(report.clues[0].candidates[0]).toMatchObject({
      source: "mailer_bridge_candidates_enriched",
      personId: "email:amaliadbg@hotmail.com",
      displayName: "Amalia De Bedout",
    });
    expect(report.clues[0].candidates[0].matchReasons).toContain("mailer_all_name_tokens:amalia+bedud");
    expect(report.clues[0].recommendation.action).toBe("review_possible_candidates");
  });

  test("detects exact existing person-card matches without proposing a merge write", () => {
    const report = buildCrmVNextIdentityStitchingResearch({
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "ig:ana_yoga",
          displayName: "Ana Yoga",
          identities: { instagramHandle: "ana_yoga" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
    });

    expect(report.clues[0].recommendation.action).toBe("stitch_to_existing_card");
    expect(report.clues[0].recommendation.requiresHumanDecision).toBe(false);
    expect(report.clues[0].candidates[0]).toMatchObject({
      source: "person_cards_v1",
      personId: "ig:ana_yoga",
      score: 100,
      confidence: "strong",
    });
    expect(report.safety.cardMutationProhibited).toBe(true);
  });
});
