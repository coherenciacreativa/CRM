import { describe, expect, test } from "vitest";
import { buildCrmVNextMailerLiteEvidenceHelper } from "../lib/crm/crm-vnext-mailerlite-evidence-helper.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext MailerLite evidence helper", () => {
  test("plans MailerLite searches and converts matching subscriber results into evidenceSources", () => {
    const report = buildCrmVNextMailerLiteEvidenceHelper({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      mailerLiteSearchResults: {
        data: [
          {
            id: "sub-1",
            email: "mayerli@example.com",
            name: "Gladys Mayerli Garcia Ortegon",
            phone: "+573115381341",
            city: "Bogota",
            country: "Colombia",
            status: "active",
            groups: [{ id: "g1", name: "Yoga Colombia" }, { id: "g2", name: "Retiros" }],
          },
          {
            id: "unrelated",
            email: "other@example.com",
            name: "Other Person",
          },
        ],
      },
    });

    expect(report.mode).toBe("read_only_mailerlite_evidence_helper");
    expect(report.queryPlans[0].searchTerms).toContain("mayuyis2626");
    expect(report.queryPlans[0].searchTerms).toContain("Mayerli");
    expect(report.summary).toMatchObject({
      clues: 1,
      queryPlans: 1,
      mailerLiteResultsRead: 2,
      mailerLiteResultsMatched: 1,
      evidenceSources: 1,
      authBlocked: false,
    });
    expect(report.evidenceSources[0]).toMatchObject({
      sourceKind: "mailerlite_export",
      sourceId: "mailerlite:subscriber:sub-1",
      title: "Gladys Mayerli Garcia Ortegon",
      email: "mayerli@example.com",
    });
    expect(report.evidenceSources[0].snippet).toContain("+573115381341");
    expect(report.evidenceSources[0].snippet).toContain("Yoga Colombia");
    expect(report.safety.mailerLiteMutationProhibited).toBe(true);
    expect(report.auth.liveMailerLiteCalledByHelper).toBe(false);
  });

  test("reports auth blockers without trying to solve credentials inside CRM", () => {
    const report = buildCrmVNextMailerLiteEvidenceHelper({
      text: "CRM: Mayerli es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      authBlocker: "HTTP 401: Unauthenticated.",
    });

    expect(report.summary.authBlocked).toBe(true);
    expect(report.auth.externalSearchStatus).toBe("blocked");
    expect(report.auth.liveMailerLiteCalledByHelper).toBe(false);
    expect(report.auth.suggestedUnblockAction).toContain("MailerLite connector");
    expect(report.safety.credentialReadProhibited).toBe(true);
  });

  test("does not match relatives only because they share a surname", () => {
    const report = buildCrmVNextMailerLiteEvidenceHelper({
      text: "Adriana Bernal es mi tía, alumna de yoga. Santiago Bernal es mi tío, alumno de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      mailerLiteSearchResults: {
        data: [
          {
            id: "santiago",
            email: "santiagobernal676@gmail.com",
            name: "Santiago",
            fields: [{ key: "last_name", value: "Bernal" }],
          },
          {
            id: "adriana",
            email: "adrianabv86@hotmail.com",
            name: "Adriana",
            fields: [{ key: "last_name", value: "Bernal" }],
          },
        ],
      },
    });

    expect(report.evidenceSources).toHaveLength(2);
    expect(report.evidenceSources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceId: "mailerlite:subscriber:santiago",
          title: "Santiago Bernal",
          text: expect.stringContaining("Santiago Bernal"),
        }),
        expect.objectContaining({
          sourceId: "mailerlite:subscriber:adriana",
          title: "Adriana Bernal",
          text: expect.stringContaining("Adriana Bernal"),
        }),
      ]),
    );
    expect(
      report.evidenceSources.find((source) => source.sourceId === "mailerlite:subscriber:santiago")?.text,
    ).not.toContain("Adriana Bernal");
  });

  test("ignores relational parser noise as MailerLite identity evidence", () => {
    const report = buildCrmVNextMailerLiteEvidenceHelper({
      text: "Tenemos también a Natalia Cárdenas de Bedut. Es hija de Amalia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      research: {
        schemaVersion: "crm-vnext-identity-stitching-research-2026-05-09",
        generatedAt: NOW,
        mode: "identity_stitching_research",
        source: {
          kind: "alejandro_conversation",
          reporter: "Alejandro",
          channel: "codex",
          observedAt: NOW,
          occurredAt: null,
          textHash: "test",
        },
        clues: [
          {
            clueId: "noise",
            person: { rawName: "Es hija de Amalia", email: null, instagramHandle: null, phone: null },
            evidenceSources: [],
            candidateCards: [],
            recommendation: {
              action: "needs_more_evidence",
              confidence: 0.1,
              rationale: "test",
            },
            openQuestions: [],
          },
        ],
        summary: {
          clues: 1,
          resolved: 0,
          needsReview: 1,
          needsMoreEvidence: 1,
          blockedByAmbiguity: 0,
          autoMergeEligible: 0,
          evidenceSources: 0,
        },
        safety: {
          readOnly: true,
          noCardWrites: true,
          noFactWrites: true,
          noOutboundMessages: true,
          allowedActions: [],
          prohibitedActions: [],
        },
      },
      mailerLiteSearchResults: {
        data: [
          {
            id: "amalia",
            email: "amaliadbg@hotmail.com",
            name: "Amalia",
            fields: [{ key: "last_name", value: "de Bedout" }],
          },
        ],
      },
    });

    expect(report.evidenceSources).toHaveLength(0);
    expect(report.summary.mailerLiteResultsMatched).toBe(0);
  });
});
