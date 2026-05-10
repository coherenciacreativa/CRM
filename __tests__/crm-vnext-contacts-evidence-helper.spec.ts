import { describe, expect, test } from "vitest";
import { buildCrmVNextContactsEvidenceHelper } from "../lib/crm/crm-vnext-contacts-evidence-helper.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext Contacts evidence helper", () => {
  test("plans Contacts queries and converts matching results into evidenceSources", () => {
    const report = buildCrmVNextContactsEvidenceHelper({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      contactsSearchResults: {
        contacts: [
          {
            id: "contact-1",
            fullName: "Mayerli Garcia Estudiante Mama De Mango 2022",
            phones: ["+573115381341"],
          },
          {
            id: "unrelated",
            fullName: "Ana Yoga",
            phones: ["+570000000000"],
          },
        ],
      },
    });

    expect(report.mode).toBe("read_only_contacts_evidence_helper");
    expect(report.queryPlans[0].searchTerms).toEqual(expect.arrayContaining(["mayuyis2626", "Mayerli"]));
    expect(report.summary).toMatchObject({
      clues: 1,
      contactsResultsRead: 2,
      contactsResultsMatched: 1,
      evidenceSources: 1,
      authBlocked: false,
    });
    expect(report.evidenceSources[0]).toMatchObject({
      sourceKind: "contacts_app_export",
      title: "Mayerli Garcia Estudiante Mama De Mango 2022",
    });
    expect(report.evidenceSources[0].snippet).toContain("+573115381341");
    expect(report.safety.outboundProhibited).toBe(true);
    expect(report.safety.credentialReadProhibited).toBe(true);
  });

  test("reports Contacts blockers without mutating contacts or credentials", () => {
    const report = buildCrmVNextContactsEvidenceHelper({
      text: "CRM: Mayerli es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      authBlocker: "contacts_permission_denied",
    });

    expect(report.summary.authBlocked).toBe(true);
    expect(report.auth.externalSearchStatus).toBe("blocked");
    expect(report.auth.liveContactsCalledByHelper).toBe(false);
    expect(report.auth.suggestedUnblockAction).toContain("Grant Contacts read permission");
  });

  test("assigns shared-surname contacts to the strongest identity clue", () => {
    const report = buildCrmVNextContactsEvidenceHelper({
      text: [
        "CRM: Adriana Bernal es alumna de yoga.",
        "Santiago Bernal es alumno de yoga.",
        "Lina María Bernal es alumna de yoga.",
      ].join(" "),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      contactsSearchResults: [
        {
          id: "bloated-contact-export",
          emails: [
            "adriana.bernal@epm.com.co",
            "bernallinamaria@hotmail.com",
            "santiagobernal676@gmail.com",
            "someone-else@example.com",
            "someone-else-2@example.com",
            "someone-else-3@example.com",
            "someone-else-4@example.com",
            "someone-else-5@example.com",
            "someone-else-6@example.com",
          ],
        },
        {
          id: "adriana-email-only",
          emails: ["adriana.bernal@epm.com.co"],
        },
        {
          id: "david-bernal",
          fullName: "David Bernal",
          emails: ["davidber2002@gmail.com"],
        },
        {
          id: "santiago",
          fullName: "Santiago Bernal",
          emails: ["santiagobernal676@gmail.com"],
        },
        {
          id: "lina",
          fullName: "Lina María Bernal Vélez",
          emails: ["bernallinamaria@hotmail.com", "lina.bernal@icbf.gov.co"],
          phones: ["+57 (314) 517-9204"],
        },
      ],
    });

    expect(report.summary.contactsResultsMatched).toBe(3);
    expect(report.evidenceSources.map((source) => source.sourceId)).toEqual([
      "contacts:record:adriana-email-only",
      "contacts:record:santiago",
      "contacts:record:lina",
    ]);
    expect(report.evidenceSources.find((source) => source.sourceId === "contacts:record:santiago")?.text).toContain(
      "Matched clue: Santiago Bernal",
    );
    expect(report.evidenceSources.find((source) => source.sourceId === "contacts:record:lina")?.text).toContain(
      "Matched clue: Lina María Bernal",
    );
    expect(JSON.stringify(report.evidenceSources)).not.toContain("David Bernal");
  });
});
