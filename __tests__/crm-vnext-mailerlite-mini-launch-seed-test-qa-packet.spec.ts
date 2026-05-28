import { describe, expect, test } from "vitest";

import {
  buildApprovalMatrix,
  buildQaChecklist,
  buildSeedTestModes,
  buildSeedTestQaPacket,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-test-qa-packet.mjs";

const rehearsalPacket = {
  ok: true,
  status: "mini_launch_rehearsal_ready_no_live_changes",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
  },
  dataPlan: {
    primaryKey: "experiment.launch_id=mini_2026_06_rehearsal_inteligencia_para_descansar",
  },
  handoffs: {
    mailerLite: {
      candidates: {
        sourceGroupCandidate: {
          name: "CC · Source · Quiz · Inteligencia para descansar",
        },
        deliveredGroupCandidate: {
          name: "CC · Delivered · Quiz result · Inteligencia para descansar",
        },
      },
    },
  },
  publicSurfaceGuardrails: {
    publicSurfaces: ["landing", "email body"],
    internalSurfaces: ["CRM fields", "MailerLite groups"],
    bannedInternalTermsInPublicCopy: ["lead magnet", "CRM", "MailerLite"],
  },
  approvalQueue: [
    { gate: "brand_approve_brief_and_public_copy", allowedNow: false },
    { gate: "create_empty_mailerlite_groups", allowedNow: false },
    { gate: "audience_launch", allowedNow: false },
  ],
};

const eventContract = {
  ok: true,
  status: "mini_launch_event_contract_ready_no_ledger_write",
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
    sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
    deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
  },
  eventContract: [
    { eventKind: "email_submitted" },
    { eventKind: "quiz_or_game_completed" },
    { eventKind: "resource_delivered" },
    { eventKind: "email_click" },
    { eventKind: "market_signal_reviewed" },
  ],
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "mini-launch rehearsal or event contract state",
  },
  {
    path: "/Users/alejandrogomez/Projects/hub-de-marca/02_visual_system/email_style_canon.md",
    present: true,
    chars: 1000,
    consultedFor: "Email creative QA and visual/editorial canon",
  },
];

describe("CRM vNext MailerLite mini-launch seed-test QA packet", () => {
  test("normalizes default args and validates optional seed email", () => {
    const parsed = parseArgs(["--test-email", "Seed@Test.com"]);

    expect(parsed.testEmail).toBe("seed@test.com");
    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.eventContract).toContain("mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json");
    expect(() => parseArgs(["--test-email", "not-an-email"])).toThrow("invalid_test_email");
  });

  test("extracts launch and receipt candidates from rehearsal first", () => {
    expect(launchFrom(rehearsalPacket, eventContract)).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
    });
  });

  test("defines seed modes without authorizing sends or receipts", () => {
    const launch = launchFrom(rehearsalPacket, eventContract);
    const modes = buildSeedTestModes({ launch, testEmailRedacted: "se***@t***.com" });

    expect(modes).toHaveLength(3);
    expect(modes.map((mode) => mode.id)).toEqual([
      "asset_only_seed_preview",
      "receipt_seed_test",
      "crm_signal_dry_run",
    ]);
    expect(modes[0].doesNotTest).toContain("Source receipt assignment");
    expect(modes[1].currentReadiness).toBe("blocked_until_candidate_groups_and_seed_scope_are_approved");
  });

  test("builds QA checklist from event contract and style boundaries", () => {
    const launch = launchFrom(rehearsalPacket, eventContract);
    const checklist = buildQaChecklist({ launch, rehearsalPacket, eventContract });

    expect(checklist.brandCreativeQa.join(" ")).toContain("editorial letter");
    expect(checklist.mailerLiteFunctionalQa.join(" ")).toContain("Fresh read-only scan");
    expect(checklist.crmDataQa).toEqual(expect.arrayContaining([
      "Email capture event exists in contract.",
      "Quiz completion/result event exists in contract.",
      "Delivery receipt event exists in contract and remains store-only.",
      "Email click can project through existing engagement pipeline.",
      "Market-learning review event exists and stays store-only.",
    ]));
  });

  test("keeps all approval gates closed until explicit future approval", () => {
    const launch = launchFrom(rehearsalPacket, eventContract);
    const matrix = buildApprovalMatrix({ rehearsalPacket, launch, testEmailRedacted: null });

    expect(matrix.find((gate) => gate.id === "asset_only_seed_email_send")).toMatchObject({
      currentStatus: "needs_seed_email_assets_render_qa_and_exact_send_approval",
      liveMutationIfApproved: true,
      approvalNeededFromAlejandro: true,
    });
    expect(matrix.find((gate) => gate.id === "candidate_group_creation_dry_run")).toMatchObject({
      liveMutationIfApproved: false,
      approvalNeededFromAlejandro: false,
    });
    expect(matrix.find((gate) => gate.id === "audience_launch")).toMatchObject({
      currentStatus: "closed",
      approvalNeededFromAlejandro: true,
    });
  });

  test("builds and renders a local-only packet with no live readiness", () => {
    const packet = buildSeedTestQaPacket({
      rehearsalPacket,
      eventContract,
      sourceDigests,
      testEmail: "seed@test.com",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("seed_test_qa_packet_ready_no_live_changes");
    expect(packet.seedIdentity).toMatchObject({
      supplied: true,
      redactedEmail: "se***@t***.com",
    });
    expect(packet.readiness).toMatchObject({
      readyForLocalAssetDrafting: true,
      readyForAssetOnlySeedSendNow: false,
      readyForReceiptSeedTestNow: false,
      readyForAudienceLaunchNow: false,
    });
    expect(packet.safety).toMatchObject({
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
      crmCardMutationsPerformed: false,
    });
    expect(markdown).toContain("Mini-Launch Seed-Test QA Packet");
    expect(markdown).toContain("asset_only_seed_preview");
    expect(markdown).toContain("Sin test email enviado");
  });
});
