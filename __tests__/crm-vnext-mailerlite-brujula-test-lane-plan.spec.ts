import { describe, expect, test } from "vitest";

import {
  buildPilotStages,
  exactApprovalPhraseFor,
  groupReadiness,
  normalizeEmail,
  redactEmail,
} from "../scripts/crm-vnext-mailerlite-brujula-test-lane-plan.mjs";

describe("CRM vNext MailerLite Brújula test lane planner", () => {
  test("normalizes and redacts the test email without exposing the full address", () => {
    expect(normalizeEmail("  ALEJANDRO@example.COM ")).toBe("alejandro@example.com");
    expect(normalizeEmail("not-an-email")).toBeNull();
    expect(redactEmail("alejandro@example.com")).toBe("al***@e***.com");
  });

  test("requires a concrete test email before live pilot approval", () => {
    const stages = buildPilotStages({ testEmail: null });

    expect(stages[0]).toMatchObject({
      stage: "visual_email_test",
      target: "needs_test_email",
    });
    expect(stages[1]).toMatchObject({
      stage: "single_subscriber_receipt_rehearsal",
      status: "blocked_until_test_email",
      target: "needs_test_email",
    });
    expect(exactApprovalPhraseFor(null)).toBeNull();
  });

  test("generates a narrow approval phrase for one test address only", () => {
    const phrase = exactApprovalPhraseFor("alejandro@example.com");

    expect(phrase).toContain("únicamente para alejandro@example.com");
    expect(phrase).toContain("solo ese subscriber de prueba");
    expect(phrase).toContain("CC · Source · Resource · Brújula");
    expect(phrase).toContain("CC · Delivered · Guide · Brújula");
    expect(phrase).toContain("No activar workflows");
    expect(phrase).toContain("no enviar a audiencia real");
    expect(phrase).not.toContain("todos");
  });

  test("checks that every required live canonical group exists by id or name", () => {
    const readiness = groupReadiness([
      { id: "188581887447401645", name: "Different display", active_count: 0 },
      { id: "x", name: "CC · Delivered · Guide · Brújula", active_count: 0 },
    ]);

    expect(readiness.find((group) => group.name === "CC · Source · Resource · Brújula")).toMatchObject({
      exists: true,
      liveName: "Different display",
    });
    expect(readiness.find((group) => group.name === "CC · Delivered · Guide · Brújula")).toMatchObject({
      exists: true,
      liveName: "CC · Delivered · Guide · Brújula",
    });
    expect(readiness.filter((group) => group.exists)).toHaveLength(2);
  });
});
