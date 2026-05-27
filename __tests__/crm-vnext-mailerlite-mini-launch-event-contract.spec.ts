import { describe, expect, test } from "vitest";

import {
  buildEventContract,
  buildEventContractPacket,
  buildSampleEvents,
  launchFrom,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-event-contract.mjs";

const rehearsalPacket = {
  launch: {
    launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    resourceName: "Inteligencia para descansar",
    resourceType: "quiz",
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
};

const sourceDigests = [
  {
    path: "/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json",
    present: true,
    chars: 1000,
    consultedFor: "mini-launch rehearsal event map and handoff",
  },
  {
    path: "/Users/alejandrogomez/CRM/docs/crm-vnext/signal-event-ledger.md",
    present: true,
    chars: 1000,
    consultedFor: "canonical event storage shape and safety",
  },
];

describe("CRM vNext MailerLite mini-launch event contract", () => {
  test("normalizes default args without live options", () => {
    const parsed = parseArgs([]);

    expect(parsed.rehearsalPacket).toContain("mailerlite_mini_launch_rehearsal_inteligencia_descansar_2026-05-27.json");
    expect(parsed.sourceMap).toContain("source-of-truth-map.md");
    expect(parsed.signalLedgerDoc).toContain("signal-event-ledger.md");
    expect(parsed.signalProjectionDoc).toContain("signal-event-projection.md");
    expect(parsed.out).toBeNull();
    expect(parsed.markdownOut).toBeNull();
  });

  test("extracts launch and receipt candidates from rehearsal packet", () => {
    expect(launchFrom(rehearsalPacket)).toMatchObject({
      launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
      resourceName: "Inteligencia para descansar",
      resourceType: "quiz",
      sourceGroupCandidate: "CC · Source · Quiz · Inteligencia para descansar",
      deliveredGroupCandidate: "CC · Delivered · Quiz result · Inteligencia para descansar",
    });
  });

  test("covers launch, receipt, engagement, social and learning events", () => {
    const contract = buildEventContract(launchFrom(rehearsalPacket));
    const eventKinds = contract.map((item) => item.eventKind);

    expect(eventKinds).toEqual(expect.arrayContaining([
      "mini_launch_intake_created",
      "email_submitted",
      "source_assigned",
      "quiz_or_game_completed",
      "resource_delivered",
      "content_sent",
      "email_open",
      "email_click",
      "email_reply",
      "instagram_engagement_snapshot",
      "instagram_comment",
      "instagram_like",
      "market_signal_reviewed",
      "continue_or_archive_decision",
    ]));
    expect(contract.every((item) => item.approvalGate)).toBe(true);
    expect(contract.find((item) => item.eventKind === "resource_delivered")).toMatchObject({
      projectionPosture: "store_only; delivery is not open/click/interest",
    });
  });

  test("builds sample events with launch metrics and no production identity", () => {
    const launch = launchFrom(rehearsalPacket);
    const contract = buildEventContract(launch);
    const events = buildSampleEvents({
      contract,
      launch,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(events).toHaveLength(contract.length);
    expect(events.every((event) => event.metrics.launchId === launch.launchId)).toBe(true);
    expect(events.find((event) => event.eventKind === "instagram_like")).toMatchObject({
      instagramHandle: "sample_handle",
    });
    expect(events.find((event) => event.eventKind === "email_click")).toMatchObject({
      email: "sample@example.invalid",
    });
  });

  test("proves all sample events normalize through Signal Event Ledger without writes", () => {
    const packet = buildEventContractPacket({
      rehearsalPacket,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderMarkdown(packet);

    expect(packet.ok).toBe(true);
    expect(packet.status).toBe("mini_launch_event_contract_ready_no_ledger_write");
    expect(packet.normalizationProof.summary).toMatchObject({
      recordsRead: packet.eventContract.length,
      eventsGenerated: packet.eventContract.length,
      skippedRecords: 0,
    });
    expect(new Set(packet.normalizationProof.eventKinds).has("unknown")).toBe(false);
    expect(new Set(packet.normalizationProof.channels).has("unknown")).toBe(false);
    expect(packet.approvalBoundary).toMatchObject({
      canNormalizeDryRunNow: true,
      canAppendToLedgerNow: false,
    });
    expect(packet.safety).toMatchObject({
      signalLedgerAppendPerformed: false,
      cardMutationPerformed: false,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
    });
    expect(markdown).toContain("Mini-Launch Event Contract");
    expect(markdown).toContain("launch_id: mini_2026_06_rehearsal_inteligencia_para_descansar");
    expect(markdown).toContain("Sin append al Signal Event Ledger");
  });
});
