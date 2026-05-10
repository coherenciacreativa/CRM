import { describe, expect, it } from "vitest";

import {
  buildCrmVNextReadiness,
  buildCrmVNextUnavailableReadiness,
} from "../lib/crm/crm-vnext-readiness";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T16:00:00.000Z";

describe("buildCrmVNextReadiness", () => {
  it("builds a path-redacted local readiness report", () => {
    const cards = [
      buildPersonCardVNext({
        personId: "ig:reader",
        displayName: "IG Reader",
        now: NOW,
        identities: {
          instagramHandle: "reader",
        },
        scoring: {
          instagram: {
            likes30d: 2,
            follows: true,
          },
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
      buildPersonCardVNext({
        personId: "email:reader@example.com",
        now: NOW,
        identities: {
          email: "reader@example.com",
        },
        scoring: {
          email: {
            opens30d: 4,
          },
        },
        evidence: [{ source: "mailer-engagement-snapshot" }],
      }),
    ];

    const readiness = buildCrmVNextReadiness(
      cards,
      {
        kind: "legacy-person-cards-v1",
        path: "/Users/example/person-cards-v1.json",
        generatedAt: NOW,
        cards: 2,
      },
      { now: NOW },
    );

    expect(readiness.schemaVersion).toBe("crm-vnext-readiness-2026-05-09");
    expect(readiness.generatedAt).toBe(NOW);
    expect(readiness.mode).toBe("read_only_readiness");
    expect(readiness.status).toBe("ready");
    expect(readiness.source).toEqual({
      kind: "legacy-person-cards-v1",
      generatedAt: NOW,
      cards: 2,
    });
    expect(readiness.totals).toMatchObject({
      cards: 2,
      emailPresent: 1,
      instagramPresent: 1,
    });
    expect(readiness.queues.totals.queues).toBe(5);
    expect(readiness.checks.map((check) => check.id)).toContain("outbound_adapters_not_enabled");
    expect(readiness.safety).toMatchObject({
      outboundProhibited: true,
      recordMutationProhibited: true,
      localPathsRedacted: true,
    });
    expect(JSON.stringify(readiness)).not.toContain("/Users/");
    expect(JSON.stringify(readiness)).not.toContain(".openclaw");
  });

  it("marks readiness as blocked when cards are unavailable", () => {
    const readiness = buildCrmVNextUnavailableReadiness({
      now: NOW,
      reason: "source missing",
    });

    expect(readiness.status).toBe("blocked");
    expect(readiness.source).toEqual({
      kind: "legacy-person-cards-v1",
      generatedAt: null,
      cards: 0,
    });
    expect(readiness.checks[0]).toMatchObject({
      id: "person_cards_source_loaded",
      level: "blocked",
      detail: "source missing",
    });
  });
});
