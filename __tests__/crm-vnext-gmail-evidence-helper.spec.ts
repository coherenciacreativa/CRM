import { describe, expect, test } from "vitest";
import { buildCrmVNextGmailEvidenceHelper } from "../lib/crm/crm-vnext-gmail-evidence-helper.js";

const NOW = "2026-05-10T12:00:00.000Z";

describe("CRM vNext Gmail evidence helper", () => {
  test("plans Gmail queries and converts matching results into redacted evidenceSources", () => {
    const report = buildCrmVNextGmailEvidenceHelper({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      gmailSearchResults: {
        emails: [
          {
            id: "zoom-1",
            from_: "Zoom <no-reply@zoom.us>",
            subject: "Gladys Mayerli Garcia Ortegon has joined your meeting - Yoga Colombia",
            snippet: "Gladys Mayerli Garcia Ortegon has joined your meeting: Topic Yoga Colombia.",
            labels: ["INBOX"],
            email_ts: "2026-05-08T00:27:05Z",
          },
          {
            id: "payment-1",
            from_: "Bancolombia",
            subject: "Alertas y Notificaciones",
            snippet: "Recibiste un pago por $400000.00 de GLADYS MAYERLI a tu cuenta AHORROS 123456.",
            labels: ["INBOX"],
            email_ts: "2026-04-17T20:20:18Z",
          },
          {
            id: "unrelated",
            from_: "Someone Else",
            subject: "Other topic",
            snippet: "No useful identity evidence here.",
          },
        ],
      },
    });

    expect(report.mode).toBe("read_only_gmail_evidence_helper");
    expect(report.queryPlans[0].primaryQuery).toContain("mayuyis2626");
    expect(report.queryPlans[0].primaryQuery).toContain("Mayerli");
    expect(report.queryPlans[0].contextualQueries.join(" ")).toContain("Yoga Colombia");
    expect(report.summary).toMatchObject({
      clues: 1,
      gmailResultsRead: 3,
      gmailResultsMatched: 2,
      evidenceSources: 2,
      authBlocked: false,
    });
    expect(report.evidenceSources.map((source) => source.sourceKind)).toEqual(["gmail_export", "gmail_export"]);
    const serialized = JSON.stringify(report);
    expect(serialized).toContain("[amount-redacted]");
    expect(serialized).toContain("[account-redacted]");
    expect(serialized).not.toContain("$400000");
    expect(serialized).not.toContain("AHORROS 123456");
    expect(report.safety.outboundProhibited).toBe(true);
  });

  test("reports auth blockers without trying to solve credentials inside CRM", () => {
    const report = buildCrmVNextGmailEvidenceHelper({
      text: "CRM: Mayerli es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
      authBlocker: 'oauth2: "invalid_grant" "Token has been expired or revoked."',
    });

    expect(report.summary.authBlocked).toBe(true);
    expect(report.auth.externalSearchStatus).toBe("blocked");
    expect(report.auth.liveGmailCalledByHelper).toBe(false);
    expect(report.auth.suggestedUnblockAction).toContain("Refresh");
  });
});
