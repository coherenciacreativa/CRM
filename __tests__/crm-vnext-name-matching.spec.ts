import { describe, expect, test } from "vitest";
import { crmVNextNameCompatible } from "../lib/crm/crm-vnext-name-matching.js";

describe("CRM vNext name matching", () => {
  test("matches conservative surname variants without accepting first-name-only collisions", () => {
    expect(crmVNextNameCompatible("Amalia de Bedud", "Amalia De Bedout")).toBe(true);
    expect(crmVNextNameCompatible("Natalia Cárdenas de Bedut", "Natalia Cardenas")).toBe(true);
    expect(crmVNextNameCompatible("Lina María Bernal", "Lina Go")).toBe(false);
    expect(crmVNextNameCompatible("Luis Enrique Lopera", "Jorge Luis Lazaro")).toBe(false);
  });
});
