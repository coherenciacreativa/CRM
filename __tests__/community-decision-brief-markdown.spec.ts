import { describe, expect, it } from "vitest";

import { buildCommunityDecisionBrief } from "../lib/crm/community-decision-brief";
import { formatCommunityDecisionBriefMarkdown } from "../lib/crm/community-decision-brief-markdown";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext";

const NOW = "2026-05-09T15:00:00.000Z";

describe("formatCommunityDecisionBriefMarkdown", () => {
  it("formats a no-send decision brief for local operator use", () => {
    const brief = buildCommunityDecisionBrief(
      [
        buildPersonCardVNext({
          personId: "ig:reader",
          displayName: "IG Reader",
          now: NOW,
          identities: {
            instagramHandle: "reader",
          },
          scoring: {
            instagram: {
              comments30d: 1,
              likes30d: 4,
              follows: true,
              lastInteractionAt: "2026-05-08T15:00:00.000Z",
            },
          },
          evidence: [{ source: "ig-ui-signal" }],
        }),
      ],
      "ig_without_email",
      { now: NOW, limit: 1 },
    );

    const markdown = formatCommunityDecisionBriefMarkdown(brief, {
      source: {
        cards: 1,
        generatedAt: NOW,
      },
    });

    expect(markdown).toContain("# CRM vNext Decision Brief");
    expect(markdown).toContain("## Decision");
    expect(markdown).toContain("Requires Alejandro decision: yes");
    expect(markdown).toContain("email-capture strategy");
    expect(markdown).toContain("## Options");
    expect(markdown).toContain("Approve email-capture strategy");
    expect(markdown).toContain("## Candidates");
    expect(markdown).toContain("IG Reader");
    expect(markdown).toContain("No outbound messages.");
    expect(markdown).toContain("No record mutation.");
    expect(markdown).not.toContain("/Users/");
    expect(markdown).not.toContain(".openclaw");
    expect(markdown).not.toContain("message draft");
  });

  it("handles empty decision queues without inventing candidates", () => {
    const brief = buildCommunityDecisionBrief([], "identity_stitching", {
      now: NOW,
      limit: 3,
    });

    const markdown = formatCommunityDecisionBriefMarkdown(brief);

    expect(markdown).toContain("- No candidates returned.");
    expect(markdown).toContain("Requires Alejandro decision: no");
  });
});
