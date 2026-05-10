import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";
import { buildCrmFactIntakeDraft, type CrmFactType } from "../lib/crm/crm-vnext-fact-intake.js";
import {
  appendCrmFactsToStore,
  type CrmStoredFact,
} from "../lib/crm/crm-vnext-fact-store.js";
import { buildCrmVNextIdentityReview } from "../lib/crm/crm-vnext-identity-review.js";

const NOW = "2026-05-09T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempStorePath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-identity-review-"));
  dirs.push(dir);
  return join(dir, "facts.jsonl");
};

const storedFactsFromText = async (
  text: string,
  typeFilter?: CrmFactType,
): Promise<CrmStoredFact[]> => {
  const draft = buildCrmFactIntakeDraft({
    text,
    sourceKind: "telegram_human_report",
    reporter: "Juana",
    channel: "telegram",
    observedAt: NOW,
  });
  const result = await appendCrmFactsToStore({
    facts: typeFilter ? draft.facts.filter((fact) => fact.type === typeFilter) : draft.facts,
    draft,
    approvedBy: "Alejandro",
    commit: false,
    now: NOW,
    storePath: await tempStorePath(),
  });
  return result.added;
};

describe("CRM vNext identity review", () => {
  test("builds a read-only card-rebuild preview for one stable exact match", async () => {
    const facts = await storedFactsFromText("CRM: @mariana_luz esta interesada en mentoria 1:1.");
    const cards = [
      buildPersonCardVNext({
        personId: "ig:mariana_luz",
        displayName: "Mariana Luz",
        now: NOW,
        identities: { instagramHandle: "mariana_luz" },
      }),
    ];

    const review = buildCrmVNextIdentityReview({ facts, cards, now: NOW });

    expect(review.mode).toBe("read_only_identity_review");
    expect(review.summary.readyForPreview).toBe(1);
    expect(review.summary.exactIdentityMatches).toBe(1);
    expect(review.items[0].status).toBe("ready_for_preview");
    expect(review.items[0].candidates[0]).toMatchObject({
      personId: "ig:mariana_luz",
      confidence: 100,
    });
    expect(review.items[0].preview?.personId).toBe("ig:mariana_luz");
    expect(review.items[0].preview?.safetyNote).toContain("No person card mutation");
  });

  test("keeps name-only matches in identity review instead of applying them", async () => {
    const facts = await storedFactsFromText("CRM: Ana Gomez son estudiantes de yoga.");
    const cards = [
      buildPersonCardVNext({
        personId: "person:ana-gomez",
        displayName: "Ana Gomez",
        now: NOW,
      }),
    ];

    const review = buildCrmVNextIdentityReview({ facts, cards, now: NOW });

    expect(review.summary.needsIdentityReview).toBe(1);
    expect(review.items[0].status).toBe("needs_identity_review");
    expect(review.items[0].candidates[0]).toMatchObject({
      personId: "person:ana-gomez",
      matchReasons: ["display_name_exact"],
    });
    expect(review.items[0].preview).toBeNull();
  });

  test("separates identity matches that still need business review", async () => {
    const facts = await storedFactsFromText("CRM: ana@example.com compro mentoria 1:1.", "purchase");
    const cards = [
      buildPersonCardVNext({
        personId: "email:ana@example.com",
        displayName: "Ana",
        now: NOW,
        identities: { email: "ana@example.com" },
      }),
    ];

    const review = buildCrmVNextIdentityReview({ facts, cards, now: NOW });

    expect(review.summary.needsBusinessReview).toBe(1);
    expect(review.items[0].status).toBe("needs_business_review");
    expect(review.items[0].preview).toBeNull();
  });

  test("marks stable identities as unmatched when no card exists", async () => {
    const facts = await storedFactsFromText("CRM: @persona_nueva esta interesada en yoga.");
    const review = buildCrmVNextIdentityReview({ facts, cards: [], now: NOW });

    expect(review.summary.unmatched).toBe(1);
    expect(review.items[0].status).toBe("unmatched");
    expect(review.items[0].candidates).toHaveLength(0);
  });
});
