import { describe, expect, test } from "vitest";

import {
  buildDepartmentReviews,
  buildDispatchPacket,
  buildSafety,
  groupCandidatesFrom,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-dispatch.mjs";

const options = {
  readinessBoard: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json",
  cadenceBoard: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_cadence_board_2026-05-27.json",
  emailSequencePacket: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json",
  brandCandidateReviewPacket: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_brand_candidate_review_packet_inteligencia_descansar_2026-05-27.json",
  shopifyHandoffPacket: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_shopify_handoff_packet_inteligencia_descansar_2026-05-27.json",
  groupDryRun: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_group_dry_run_inteligencia_descansar_2026-05-27.json",
  eventContract: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_event_contract_inteligencia_descansar_2026-05-27.json",
  seedTestQaPacket: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_seed_test_qa_packet_inteligencia_descansar_2026-05-27.json",
  out: null,
  markdownOut: null,
};

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const readinessBoard = {
  ok: true,
  launch,
  executiveSummary: {
    overallState: "ready_for_department_reviews_not_ready_for_live_operation",
  },
};

const cadenceBoard = {
  ok: true,
  currentPilot: { launch },
  operatingRhythm: {
    activeCadenceNow: "weekly",
    every3DaysStatus: "designed_but_not_active",
  },
};

const emailSequencePacket = {
  ok: true,
  launch,
};

const brandCandidateReviewPacket = {
  ok: true,
  brandDecisionRequest: {
    candidates: [
      { name: "CC · Source · Quiz · Inteligencia para descansar" },
      { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
    ],
  },
};

const shopifyHandoffPacket = { ok: true, launch };
const groupDryRun = { ok: true };
const eventContract = { ok: true, launch };
const seedTestQaPacket = { ok: true, launch };

const sourceDigests = [
  {
    path: options.readinessBoard,
    present: true,
    chars: 1000,
    consultedFor: "current pilot readiness and live-gate posture",
  },
];

describe("CRM vNext MailerLite mini-launch department review dispatch", () => {
  test("normalizes default args and report outputs", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/dispatch.json",
      "--markdown-out",
      "/tmp/dispatch.md",
    ]);

    expect(parsed.readinessBoard).toContain("mailerlite_mini_launch_readiness_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.cadenceBoard).toContain("mailerlite_mini_launch_cadence_board_2026-05-27.json");
    expect(parsed.emailSequencePacket).toContain("mailerlite_mini_launch_email_sequence_asset_packet_inteligencia_descansar_2026-05-27.json");
    expect(parsed.out).toBe("/tmp/dispatch.json");
    expect(parsed.markdownOut).toBe("/tmp/dispatch.md");
  });

  test("extracts launch and group candidates from packets", () => {
    expect(launchFrom(readinessBoard, {}, {})).toEqual(launch);
    expect(groupCandidatesFrom(brandCandidateReviewPacket, {})).toEqual([
      "CC · Source · Quiz · Inteligencia para descansar",
      "CC · Delivered · Quiz result · Inteligencia para descansar",
    ]);
    expect(groupCandidatesFrom({
      candidateRows: [
        { name: "CC · Source · Quiz · Inteligencia para descansar" },
        { name: "CC · Delivered · Quiz result · Inteligencia para descansar" },
      ],
    }, {})).toEqual([
      "CC · Source · Quiz · Inteligencia para descansar",
      "CC · Delivered · Quiz result · Inteligencia para descansar",
    ]);
  });

  test("builds Brand, Web and CRM review requests with closed actions", () => {
    const reviews = buildDepartmentReviews({
      launch,
      options,
      readinessBoard,
      cadenceBoard,
      emailSequencePacket,
      brandCandidateReviewPacket,
      shopifyHandoffPacket,
      groupDryRun,
      eventContract,
      seedTestQaPacket,
    });
    const byDepartment = new Map(reviews.map((review) => [review.department, review]));

    expect(reviews.map((review) => review.department)).toEqual(["brand", "web_design", "crm"]);
    expect(byDepartment.get("brand")?.dispatchBlock).toContain("Decisión semántica");
    expect(byDepartment.get("brand")?.closedActions).toContain("Do not create MailerLite groups.");
    expect(byDepartment.get("web_design")?.dispatchBlock).toContain("No edites Shopify todavía");
    expect(byDepartment.get("crm")?.dispatchBlock).toContain("No escribas Signal Ledger");
  });

  test("builds dispatch packet with no live gates open and no external send", () => {
    const packet = buildDispatchPacket({
      readinessBoard,
      cadenceBoard,
      emailSequencePacket,
      brandCandidateReviewPacket,
      shopifyHandoffPacket,
      groupDryRun,
      eventContract,
      seedTestQaPacket,
      sourceDigests,
      options,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("mini_launch_department_review_dispatch_ready_no_live_changes");
    expect(packet.liveGateSummary).toMatchObject({
      openLiveGateCount: 0,
      reviewOnlyDepartmentCount: 3,
      liveApprovalNeededNow: false,
    });
    expect(packet.safety).toMatchObject({
      externalMessagesSent: false,
      mailerLiteApiCalled: false,
      shopifyApiCalled: false,
      crmCardMutationsPerformed: false,
    });
    expect(packet.nextNoLiveMoves.join(" ")).toContain("rerun the mini-launch group dry-run");
  });

  test("safety contract is strictly local only", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      externalMessagesSent: false,
      subscribersRead: false,
      groupsCreated: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
      factStoreWritePerformed: false,
    });
  });

  test("renders copy-pasteable department blocks without granting live permissions", () => {
    const packet = buildDispatchPacket({
      readinessBoard,
      cadenceBoard,
      emailSequencePacket,
      brandCandidateReviewPacket,
      shopifyHandoffPacket,
      groupDryRun,
      eventContract,
      seedTestQaPacket,
      sourceDigests,
      options,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(markdown).toContain("Department Review Dispatch");
    expect(markdown).toContain("```text");
    expect(markdown).toContain("Modo: revisión Brand no-viva");
    expect(markdown).toContain("Modo: revisión Web Design no-viva");
    expect(markdown).toContain("Modo: revisión CRM no-viva");
    expect(markdown).toContain("Sin envio de mensajes externos");
    expect(markdown).not.toContain("puedes crear grupos");
  });
});
