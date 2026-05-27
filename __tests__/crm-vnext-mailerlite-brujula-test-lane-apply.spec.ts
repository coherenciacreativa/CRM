import { describe, expect, test } from "vitest";

import {
  normalizeApprovalPhrase,
  safeSubscriberStatus,
} from "../scripts/crm-vnext-mailerlite-brujula-test-lane-apply.mjs";

describe("CRM vNext MailerLite Brújula test lane apply", () => {
  test("normalizes approval phrase spacing and smart quotes", () => {
    expect(normalizeApprovalPhrase("  Apruebo   “test”  ")).toBe('Apruebo "test"');
  });

  test("blocks unsafe subscriber statuses from API reactivation attempts", () => {
    expect(safeSubscriberStatus("active")).toBe(true);
    expect(safeSubscriberStatus("unconfirmed")).toBe(true);
    expect(safeSubscriberStatus(null)).toBe(true);
    expect(safeSubscriberStatus("unsubscribed")).toBe(false);
    expect(safeSubscriberStatus("bounced")).toBe(false);
    expect(safeSubscriberStatus("junk")).toBe(false);
  });
});
