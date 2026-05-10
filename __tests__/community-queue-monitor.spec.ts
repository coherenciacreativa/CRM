import { describe, expect, it } from "vitest";

import {
  buildCommunityQueueMonitorReport,
  type CommunityQueueMonitorInput,
} from "../lib/crm/community-queue-monitor";

const generatedAt = "2026-05-09T10:00:00.000Z";

function makeInput(
  overrides: Partial<CommunityQueueMonitorInput> = {},
): CommunityQueueMonitorInput {
  return {
    ok: true,
    status: {
      generatedAt,
      totals: {
        queues: 2,
        notify: 0,
        watch: 1,
        ok: 1,
      },
      statuses: [
        {
          id: "ig_without_email",
          title: "IG profiles without email",
          level: "watch",
          matched: 14,
          reason: "Standing backlog is visible.",
          alertAction: null,
          shouldAlertAlejandro: false,
        },
        {
          id: "email_engaged",
          title: "Email engaged",
          level: "ok",
          matched: 2,
          reason: "No action required.",
          alertAction: null,
          shouldAlertAlejandro: false,
        },
      ],
    },
    snapshot: {
      current: {
        schemaVersion: "community-queue-snapshot-2026-05-09",
        generatedAt,
        source: {
          schemaVersion: "crm-community-insights-v1",
          generatedAt,
          cards: 16,
        },
        queues: [
          {
            id: "ig_without_email",
            title: "IG profiles without email",
            matched: 14,
          },
        ],
      },
      previousLoaded: false,
      previousGeneratedAt: null,
    },
    ...overrides,
  };
}

describe("buildCommunityQueueMonitorReport", () => {
  it("builds a quiet monitor report for watch-only queues", () => {
    const report = buildCommunityQueueMonitorReport(makeInput());

    expect(report.ok).toBe(true);
    expect(report.generatedAt).toBe(generatedAt);
    expect(report.alert).toBeNull();
    expect(report.totals).toEqual({
      queues: 2,
      notify: 0,
      watch: 1,
      ok: 1,
    });
    expect(report.snapshot).toEqual({
      available: true,
      schema: "community-queue-snapshot-2026-05-09",
      currentGeneratedAt: generatedAt,
      previousLoaded: false,
      previousGeneratedAt: null,
    });
  });

  it("builds a compact alert payload for notify queues", () => {
    const input = makeInput({
      status: {
        generatedAt,
        totals: {
          queues: 2,
          notify: 1,
          watch: 0,
          ok: 1,
        },
        statuses: [
          {
            id: "commercial_follow_up",
            title: "Commercial follow-up",
            level: "notify",
            matched: 3,
            reason: "People are ready for commercial follow-up.",
            alertAction: "Review this queue before next outreach.",
            shouldAlertAlejandro: true,
          },
          {
            id: "email_engaged",
            title: "Email engaged",
            level: "ok",
            matched: 1,
            reason: "No action required.",
            alertAction: null,
            shouldAlertAlejandro: false,
          },
        ],
      },
    });

    const report = buildCommunityQueueMonitorReport(input);

    expect(report.alert).toEqual({
      title: "CRM vNext queue alert",
      message: "CRM vNext requires review: Commercial follow-up: 3.",
      generatedAt,
      statuses: [
        {
          id: "commercial_follow_up",
          title: "Commercial follow-up",
          matched: 3,
          level: "notify",
          reason: "People are ready for commercial follow-up.",
          alertAction: "Review this queue before next outreach.",
        },
      ],
    });
  });

  it("does not leak person rows into the report", () => {
    const report = buildCommunityQueueMonitorReport(makeInput());

    expect(JSON.stringify(report)).not.toContain("people");
    expect(JSON.stringify(report)).not.toContain("cards\":[");
  });
});
