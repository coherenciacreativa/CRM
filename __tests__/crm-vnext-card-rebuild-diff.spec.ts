import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";
import { buildCrmFactIntakeDraft } from "../lib/crm/crm-vnext-fact-intake.js";
import {
  appendCrmFactsToStore,
  type CrmStoredFact,
} from "../lib/crm/crm-vnext-fact-store.js";
import { buildCrmVNextIdentityReview } from "../lib/crm/crm-vnext-identity-review.js";
import { buildCrmVNextCardRebuildDiff } from "../lib/crm/crm-vnext-card-rebuild-diff.js";

const NOW = "2026-05-09T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempStorePath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-rebuild-diff-"));
  dirs.push(dir);
  return join(dir, "facts.jsonl");
};

const storedFactsFromText = async (text: string): Promise<CrmStoredFact[]> => {
  const draft = buildCrmFactIntakeDraft({
    text,
    sourceKind: "telegram_human_report",
    reporter: "Juana",
    channel: "telegram",
    observedAt: NOW,
  });
  const result = await appendCrmFactsToStore({
    facts: draft.facts,
    draft,
    approvedBy: "Alejandro",
    commit: false,
    now: NOW,
    storePath: await tempStorePath(),
  });
  return result.added;
};

describe("CRM vNext card rebuild diff", () => {
  test("groups ready identity-review items into one read-only card diff", async () => {
    const facts = await storedFactsFromText("CRM: @ana_yoga es estudiante de yoga.");
    const cards = [
      buildPersonCardVNext({
        personId: "ig:ana_yoga",
        displayName: "Ana Yoga",
        now: NOW,
        identities: { instagramHandle: "ana_yoga" },
        scoring: { participation: { yogaClasses90d: 2 } },
        evidence: [{ source: "existing-card", observedAt: NOW }],
      }),
    ];
    const review = buildCrmVNextIdentityReview({ facts, cards, now: NOW });

    const report = buildCrmVNextCardRebuildDiff({ review, cards, now: NOW });

    expect(report.mode).toBe("read_only_card_rebuild_diff");
    expect(report.summary.readyItems).toBe(1);
    expect(report.summary.cardsWithDiffs).toBe(1);
    expect(report.summary.blockedItems).toBe(0);
    expect(report.diffs[0].personId).toBe("ig:ana_yoga");
    expect(report.diffs[0].proposed.evidenceToAdd).toHaveLength(1);
    expect(report.diffs[0].proposed.tagsToAdd).toContain("program:yoga");
    expect(report.diffs[0].proposed.productsAfter.yogaClasses90d).toBe(3);
    expect(report.diffs[0].proposed.operations.map((operation) => operation.op)).toContain("increment_product");
    expect(report.diffs[0].safetyNote).toContain("No person card file");
    expect(report.safety.cardMutationProhibited).toBe(true);
  });

  test("keeps non-ready review items as blocked and produces no diff", async () => {
    const facts = await storedFactsFromText("CRM: Ana Gomez es estudiante de yoga.");
    const cards = [
      buildPersonCardVNext({
        personId: "person:ana-gomez",
        displayName: "Ana Gomez",
        now: NOW,
      }),
    ];
    const review = buildCrmVNextIdentityReview({ facts, cards, now: NOW });

    const report = buildCrmVNextCardRebuildDiff({ review, cards, now: NOW });

    expect(report.summary.cardsWithDiffs).toBe(0);
    expect(report.summary.blockedItems).toBe(1);
    expect(report.blockedItems[0].status).toBe("needs_identity_review");
  });
});
