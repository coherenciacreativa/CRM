import { describe, expect, it } from "vitest";

import { buildCommunityDailyBrief } from "../lib/crm/community-daily-brief";
import { formatCommunityDailyBriefMarkdown } from "../lib/crm/community-daily-brief-markdown";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T14:00:00.000Z";

describe("formatCommunityDailyBriefMarkdown", () => {
  it("formats the daily brief as a local read-only report", () => {
    const brief = buildCommunityDailyBrief(
      [
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
              lastInteractionAt: "2026-05-08T14:00:00.000Z",
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
              opens30d: 6,
              clicks30d: 1,
              lastOpenAt: "2026-05-08T14:00:00.000Z",
            },
          },
          evidence: [{ source: "mailer-engagement-snapshot" }],
        }),
      ],
      {
        now: NOW,
        focusQueueLimit: 2,
        peoplePerQueue: 1,
        engagementMovementQueue: {
          source: {
            latestCapturedAt: "2026-05-21T05:00:00.000Z",
            totalSignals: 18,
          },
          summary: {
            rows: 2,
            unmatchedRows: 0,
            reviewRows: 1,
          },
          rows: [
            {
              operatorAction: {
                code: "review_reply_context",
                label: "Review Reply Context",
                category: "human_context",
                reviewRequired: true,
                outboundApprovalRequired: false,
                reason: "Human reply needs context before asking Alejandro again.",
              },
            },
          ],
        },
      },
    );

    const markdown = formatCommunityDailyBriefMarkdown(brief, {
      source: {
        cards: 2,
        generatedAt: NOW,
      },
      previousSnapshot: {
        loaded: false,
        generatedAt: null,
      },
    });

    expect(markdown).toContain("# CRM vNext Daily Brief");
    expect(markdown).toContain("## Community");
    expect(markdown).toContain("- People: 2");
    expect(markdown).toContain("## Queue Status");
    expect(markdown).toContain("## Engagement Actions");
    expect(markdown).toContain("- Movement rows: 2");
    expect(markdown).toContain("Review Reply Context");
    expect(markdown).toContain("## Focus Queues");
    expect(markdown).toContain("IG Reader");
    expect(markdown).toContain("No outbound messages.");
    expect(markdown).toContain("No record mutation.");
    expect(markdown).not.toContain("/Users/");
    expect(markdown).not.toContain(".openclaw");
  });

  it("handles empty next steps without inventing action", () => {
    const brief = buildCommunityDailyBrief([], {
      now: NOW,
    });

    const markdown = formatCommunityDailyBriefMarkdown(brief);

    expect(markdown).toContain("- No next steps selected.");
    expect(markdown).not.toContain("message draft");
  });
});
