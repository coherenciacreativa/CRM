import { describe, expect, it } from "vitest";

import { buildCommunityQueueBrief } from "../lib/crm/community-queue-briefs";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T12:00:00.000Z";

describe("buildCommunityQueueBrief", () => {
  it("builds a read-only brief for a Mantis queue", () => {
    const cards = [
      buildPersonCardVNext({
        personId: "ig:reader",
        displayName: "IG Reader",
        now: NOW,
        identities: {
          instagramHandle: "reader",
          city: "Bogota",
          country: "Colombia",
        },
        scoring: {
          instagram: {
            comments30d: 1,
            likes30d: 4,
            follows: true,
            lastInteractionAt: "2026-05-08T12:00:00.000Z",
          },
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
      buildPersonCardVNext({
        personId: "email:subscriber@example.com",
        displayName: "Email Subscriber",
        now: NOW,
        identities: {
          email: "subscriber@example.com",
        },
        scoring: {
          email: {
            opens30d: 8,
            clicks30d: 2,
            lastOpenAt: "2026-05-08T12:00:00.000Z",
          },
        },
        evidence: [{ source: "mailer-engagement-snapshot" }],
      }),
    ];

    const brief = buildCommunityQueueBrief(cards, "ig_without_email", {
      now: NOW,
      limit: 1,
    });

    expect(brief.queue.id).toBe("ig_without_email");
    expect(brief.queue.counts).toEqual({
      total: 2,
      matched: 1,
      returned: 1,
    });
    expect(brief.queue.status?.level).toBe("watch");
    expect(brief.safety).toMatchObject({
      mode: "read_only_local_brief",
      outboundProhibited: true,
    });
    expect(brief.people).toHaveLength(1);
    expect(brief.people[0]).toMatchObject({
      personId: "ig:reader",
      displayName: "IG Reader",
      identities: {
        email: null,
        instagramHandle: "reader",
        city: "Bogota",
        country: "Colombia",
      },
      nextAction: {
        code: "ask_for_email",
        requiresHumanReview: false,
      },
    });
    expect(brief.people[0].signals.map((signal) => signal.code)).toContain("ig_comments");
    expect(JSON.stringify(brief)).not.toContain("sourcePath");
  });

  it("caps brief rows at 25 people", () => {
    const cards = Array.from({ length: 40 }, (_, index) =>
      buildPersonCardVNext({
        personId: `ig:reader-${index}`,
        displayName: `Reader ${index}`,
        now: NOW,
        identities: {
          instagramHandle: `reader${index}`,
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
    );

    const brief = buildCommunityQueueBrief(cards, "ig_without_email", {
      now: NOW,
      limit: 99,
    });

    expect(brief.queue.counts.matched).toBe(40);
    expect(brief.queue.counts.returned).toBe(25);
    expect(brief.people).toHaveLength(25);
  });
});
