import { describe, expect, test } from "vitest";
import { buildCrmVNextGoogleDriveEvidenceHelper } from "../lib/crm/crm-vnext-google-drive-evidence-helper.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext Google Drive evidence helper", () => {
  test("converts matching Drive/Sheets rows into evidence packets and flags family email ambiguity", () => {
    const report = buildCrmVNextGoogleDriveEvidenceHelper({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      googleDriveSearchResults: {
        googleDriveSearchResults: [
          {
            id: "sheet-1",
            spreadsheetTitle: "Programas Coherencia Creativa",
            sheetName: "Respuestas",
            rowNumber: 4,
            name: "Gladys Mayerli García O.",
            email: "mayaariana@hotmail.com",
            phone: "3115381341",
            city: "Bogotá",
            country: "Colombia",
            relationshipContext: "Retiros con familia; email podría ser de Ariana.",
            emailOwnership: "family_or_companion",
            row: {
              Nombre: "Gladys Mayerli García O.",
              Ciudad: "Bogotá",
              Retiros: "X",
            },
          },
        ],
      },
    });

    expect(report.mode).toBe("read_only_google_drive_evidence_helper");
    expect(report.summary).toMatchObject({
      clues: 1,
      queryPlans: 1,
      driveResultsRead: 1,
      driveResultsMatched: 1,
      evidenceSources: 1,
      familyOrCompanionEmailReview: 1,
      authBlocked: false,
    });
    expect(report.evidenceSources[0]).toMatchObject({
      sourceKind: "retreat_table",
      sourceId: "google-drive:sheet-1:Respuestas:row-4",
      title: "Programas Coherencia Creativa",
      email: null,
    });
    expect(report.evidenceSources[0].snippet).toContain("mayaariana@hotmail.com");
    expect(report.evidenceSources[0].snippet).toContain("Email ownership review required");
    expect(report.reviewSignals[0]).toMatchObject({
      code: "family_or_companion_email_review",
      email: "mayaariana@hotmail.com",
    });
    expect(report.safety.googleDriveMutationProhibited).toBe(true);
  });

  test("reports auth blockers without trying to solve credentials inside CRM", () => {
    const report = buildCrmVNextGoogleDriveEvidenceHelper({
      text: "CRM: Mayerli es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      authBlocker: "google_drive_auth_required",
    });

    expect(report.summary.authBlocked).toBe(true);
    expect(report.auth.externalSearchStatus).toBe("blocked");
    expect(report.auth.liveGoogleDriveCalledByHelper).toBe(false);
    expect(report.safety.credentialReadProhibited).toBe(true);
  });
});
