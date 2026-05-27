import { describe, expect, test } from "vitest";

import {
  buildApprovalGates,
  buildLaunchIdentity,
  buildMailerLitePlan,
  buildQaContract,
  buildCrmSignalMap,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-path-packet.mjs";

describe("CRM vNext MailerLite mini-launch path packet", () => {
  test("builds a stable launch identity and template mode when details are missing", () => {
    expect(buildLaunchIdentity({ launchId: null, name: null, resourceType: "guide" })).toMatchObject({
      launchId: "mini_<YYYY_MM_DD>_<slug>",
      displayName: "<Nombre del mini-producto>",
      resourceType: "guide",
      contentStem: "<slug>",
      templateMode: true,
    });

    expect(buildLaunchIdentity({
      launchId: "mini_2026_06_01_brujula",
      name: "Brújula de claridad",
      resourceType: "guide",
    })).toMatchObject({
      launchId: "mini_2026_06_01_brujula",
      displayName: "Brújula De Claridad",
      contentStem: "brujula_de_claridad",
      templateMode: false,
    });
  });

  test("keeps Experiment CRM-first and MailerLite-only-if-needed", () => {
    const identity = buildLaunchIdentity({
      launchId: "mini_2026_06_07_inteligencia_descanso",
      name: "Inteligencia para descansar",
      resourceType: "quiz",
    });
    const plan = buildMailerLitePlan(identity);

    expect(plan.sourceGroup).toBe("CC · Source · Quiz · Inteligencia Para Descansar");
    expect(plan.deliveredGroup).toBe("CC · Delivered · Quiz result · Inteligencia Para Descansar");
    expect(plan.experimentGroup).toMatchObject({
      default: "crm_first",
      mailerLiteOnlyIfNeeded: "CC · Experiment · mini_2026_06_07_inteligencia_descanso",
      allowedReason: "routing, dedupe, or exclusion inside MailerLite only",
    });
    expect(plan.journeyGroups.default).toBe("crm_first_by_launch_id");
  });

  test("approval gates do not authorize live work by themselves", () => {
    const gates = buildApprovalGates();

    expect(gates).toHaveLength(5);
    expect(gates.every((gate) => gate.allowedByThisPacket === false)).toBe(true);
    expect(gates.map((gate) => gate.gate)).toEqual([
      "create_empty_groups",
      "create_or_edit_draft_workflow",
      "assign_seed_subscriber",
      "send_test_email",
      "publish_shopify_or_send_audience",
    ]);
  });

  test("CRM signal map separates market learning from MailerLite receipts", () => {
    const identity = buildLaunchIdentity({
      launchId: "mini_2026_06_07_inteligencia_descanso",
      name: "Inteligencia para descansar",
      resourceType: "game",
    });
    const map = buildCrmSignalMap(identity);

    expect(map.launchId).toBe("mini_2026_06_07_inteligencia_descanso");
    expect(map.events).toContain("resource_delivered");
    expect(map.events).toContain("quiz_or_game_completed_if_applicable");
    expect(map.marketLearning).toContain("reply quality");
  });

  test("QA contract blocks internal language from public copy", () => {
    const qa = buildQaContract();

    expect(qa.functionalStatusRequired).toBe(true);
    expect(qa.creativeStatusRequired).toBe(true);
    expect(qa.publicCopyBannedTerms).toEqual(expect.arrayContaining([
      "lead magnet",
      "CRM",
      "MailerLite",
      "automatizacion",
    ]));
  });

  test("rendered markdown includes safety and approval gates", () => {
    const identity = buildLaunchIdentity({
      launchId: "mini_2026_06_07_inteligencia_descanso",
      name: "Inteligencia para descansar",
      resourceType: "guide",
    });
    const packet = {
      generatedAt: "2026-05-27T00:00:00.000Z",
      status: "mini_launch_path_defined_no_live_changes",
      identity,
      sourceReceipt: [{ label: "brand_dictionary", path: "/x" }],
      operatingStages: [],
      mailerLitePlan: buildMailerLitePlan(identity),
      crmSignalMap: buildCrmSignalMap(identity),
      qaContract: buildQaContract(),
      approvalGates: buildApprovalGates(),
      nextAction: "next",
      safety: {},
    };
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Mini-Launch Path Packet");
    expect(markdown).toContain("allowedByThisPacket=false");
    expect(markdown).toContain("No MailerLite API calls.");
    expect(markdown).toContain("Experiment default: crm_first");
  });
});
