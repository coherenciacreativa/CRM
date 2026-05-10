import { describe, expect, it } from "vitest";

import { buildCommunityDailyBrief } from "../lib/crm/community-daily-brief";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T13:00:00.000Z";

describe("buildCommunityDailyBrief", () => {
  it("builds a read-only operator brief from local cards", () => {
    const cards = [
      buildPersonCardVNext({
        personId: "ig:reader",
        displayName: "IG Reader",
        now: NOW,
        identities: {
          instagramHandle: "reader",
        },
        scoring: {
          identity: {
            trustedMatchCount: 2,
            sourceCount: 2,
          },
          instagram: {
            comments30d: 1,
            likes30d: 3,
            follows: true,
            lastInteractionAt: "2026-05-08T13:00:00.000Z",
          },
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
      buildPersonCardVNext({
        personId: "email:subscriber@example.com",
        displayName: "Subscriber",
        now: NOW,
        identities: {
          email: "subscriber@example.com",
        },
        scoring: {
          email: {
            opens30d: 8,
            clicks30d: 2,
            lastOpenAt: "2026-05-08T13:00:00.000Z",
          },
        },
        evidence: [{ source: "mailer-engagement-snapshot" }],
      }),
    ];

    const brief = buildCommunityDailyBrief(cards, {
      now: NOW,
      focusQueueLimit: 2,
      peoplePerQueue: 1,
    });

    expect(brief.mode).toBe("read_only_daily_brief");
    expect(brief.summary.totals.cards).toBe(2);
    expect(brief.queues.totals).toEqual({
      queues: 5,
      notify: 0,
      watch: 2,
      ok: 3,
    });
    expect(brief.highlights.map((item) => item.code)).toContain("ig_email_gap");
    expect(brief.nextSteps.map((item) => item.code)).toContain("plan_email_capture");
    expect(brief.focusQueues.map((queue) => queue.queue.id)).toEqual([
      "identity_stitching",
      "ig_without_email",
    ]);
    expect(brief.focusQueues[0].people).toHaveLength(1);
    expect(brief.safety).toMatchObject({
      outboundProhibited: true,
      recordMutationProhibited: true,
    });
  });

  it("prioritizes notify queues in focus briefs", () => {
    const cards = [
      buildPersonCardVNext({
        personId: "email:warm@example.com",
        displayName: "Warm Lead",
        now: NOW,
        identities: {
          email: "warm@example.com",
          instagramHandle: "warmlead",
        },
        scoring: {
          email: {
            opens30d: 15,
            clicks30d: 4,
            replies30d: 2,
            lastReplyAt: "2026-05-08T13:00:00.000Z",
          },
          instagram: {
            inboundDm30d: 3,
            comments30d: 3,
            likes30d: 8,
            follows: true,
            lastInteractionAt: "2026-05-08T13:00:00.000Z",
          },
          participation: {
            yogaClasses90d: 4,
            happyCircle90d: 2,
            lastAttendanceAt: "2026-05-08T13:00:00.000Z",
          },
          purchases: {
            totalSpend: 6000,
            purchaseCount: 5,
            activeClient: true,
            mentorshipSessions: 4,
          },
        },
        evidence: [{ source: "mailer-engagement-snapshot" }],
      }),
    ];

    const brief = buildCommunityDailyBrief(cards, {
      now: NOW,
      focusQueueLimit: 1,
      peoplePerQueue: 1,
    });

    expect(brief.queues.totals.notify).toBeGreaterThanOrEqual(1);
    expect(brief.focusQueues[0].queue.id).toBe("commercial_follow_up");
    expect(brief.highlights).toContainEqual(
      expect.objectContaining({
        code: "queue_notify",
        level: "notify",
      }),
    );
    expect(brief.nextSteps).toContainEqual(
      expect.objectContaining({
        code: "prepare_human_decision_brief",
        requiresApproval: true,
      }),
    );
  });

  it("caps focus queues and people per queue", () => {
    const cards = Array.from({ length: 20 }, (_, index) =>
      buildPersonCardVNext({
        personId: `ig:reader-${index}`,
        now: NOW,
        identities: {
          instagramHandle: `reader${index}`,
        },
        scoring: {
          identity: {
            trustedMatchCount: 2,
            sourceCount: 2,
          },
          instagram: {
            likes30d: 1,
            follows: true,
          },
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
    );

    const brief = buildCommunityDailyBrief(cards, {
      now: NOW,
      focusQueueLimit: 99,
      peoplePerQueue: 99,
    });

    expect(brief.focusQueues.length).toBeLessThanOrEqual(5);
    expect(brief.focusQueues.every((queue) => queue.people.length <= 10)).toBe(true);
  });
});
