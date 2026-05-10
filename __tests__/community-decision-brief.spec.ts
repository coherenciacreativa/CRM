import { describe, expect, it } from "vitest";

import { buildCommunityDecisionBrief } from "../lib/crm/community-decision-brief";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T14:00:00.000Z";

describe("buildCommunityDecisionBrief", () => {
  it("builds a no-send decision brief for an Instagram email-capture queue", () => {
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
            likes30d: 5,
            follows: true,
            lastInteractionAt: "2026-05-08T14:00:00.000Z",
          },
        },
        evidence: [{ source: "ig-ui-signal" }],
      }),
    ];

    const brief = buildCommunityDecisionBrief(cards, "ig_without_email", {
      now: NOW,
      limit: 1,
    });

    expect(brief.mode).toBe("read_only_decision_brief");
    expect(brief.queue.id).toBe("ig_without_email");
    expect(brief.summary).toMatchObject({
      urgency: "watch",
      totalCandidates: 1,
      returnedCandidates: 1,
      requiresAlejandroDecision: true,
    });
    expect(brief.summary.recommendedQuestion).toContain("email-capture strategy");
    expect(brief.decisionOptions.map((option) => option.id)).toEqual([
      "approve_email_capture_strategy",
      "keep_observing",
    ]);
    expect(brief.candidates[0]).toMatchObject({
      personId: "ig:reader",
      decisionNeed: "email_capture_strategy",
      nextAction: {
        code: "ask_for_email",
      },
    });
    expect(brief.safety.outboundProhibited).toBe(true);
    expect(JSON.stringify(brief)).not.toContain("sourcePath");
  });

  it("marks commercial follow-up as a notify-level human decision surface", () => {
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
            opens30d: 12,
            clicks30d: 4,
            replies30d: 2,
            lastReplyAt: "2026-05-08T14:00:00.000Z",
          },
          instagram: {
            inboundDm30d: 3,
            comments30d: 3,
            likes30d: 8,
            follows: true,
            lastInteractionAt: "2026-05-08T14:00:00.000Z",
          },
          participation: {
            yogaClasses90d: 4,
            happyCircle90d: 2,
            lastAttendanceAt: "2026-05-08T14:00:00.000Z",
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

    const brief = buildCommunityDecisionBrief(cards, "commercial_follow_up", {
      now: NOW,
      limit: 3,
    });

    expect(brief.summary.urgency).toBe("notify");
    expect(brief.summary.requiresAlejandroDecision).toBe(true);
    expect(brief.decisionOptions[0]).toMatchObject({
      id: "approve_human_follow_up_plan",
      approvalRequired: true,
    });
    expect(brief.candidates[0]).toMatchObject({
      personId: "email:warm@example.com",
      decisionNeed: "person_next_action_requires_human_review",
      nextAction: {
        code: "human_follow_up",
        requiresHumanReview: true,
      },
    });
    expect(brief.candidates[0].primarySignals).toContain("Has inbound Instagram DMs");
    expect(brief.safety.prohibitedActions).toContain("Do not mutate CRM records from this brief.");
  });

  it("does not require Alejandro when an identity queue has no candidates", () => {
    const brief = buildCommunityDecisionBrief([], "identity_stitching", {
      now: NOW,
      limit: 3,
    });

    expect(brief.summary).toMatchObject({
      urgency: "planning",
      totalCandidates: 0,
      returnedCandidates: 0,
      requiresAlejandroDecision: false,
    });
    expect(brief.candidates).toEqual([]);
  });
});
