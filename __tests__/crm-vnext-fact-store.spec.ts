import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmFactIntakeDraft } from "../lib/crm/crm-vnext-fact-intake.js";
import {
  appendCrmFactsToStore,
  readCrmFactStore,
} from "../lib/crm/crm-vnext-fact-store.js";

const NOW = "2026-05-09T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempStore = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-fact-store-"));
  dirs.push(dir);
  return join(dir, "facts.jsonl");
};

describe("CRM vNext fact store", () => {
  test("appends approved facts locally without mutating cards", async () => {
    const storePath = await tempStore();
    const draft = buildCrmFactIntakeDraft({
      text: [
        "CRM: Ana Gomez y Carlos Diaz son estudiantes de yoga.",
        "CRM: @mariana_luz esta interesada en mentoria 1:1.",
      ].join("\n"),
      sourceKind: "telegram_human_report",
      reporter: "Juana",
      channel: "telegram",
      observedAt: NOW,
    });

    const preview = await appendCrmFactsToStore({
      facts: draft.facts,
      draft,
      approvedBy: "Alejandro",
      commit: false,
      now: NOW,
      storePath,
    });
    expect(preview.committed).toBe(false);
    expect(preview.added).toHaveLength(3);
    expect(preview.summaryAfter.facts).toBe(0);

    const committed = await appendCrmFactsToStore({
      facts: draft.facts,
      draft,
      approvedBy: "Alejandro",
      commit: true,
      now: NOW,
      storePath,
    });
    expect(committed.committed).toBe(true);
    expect(committed.added).toHaveLength(3);
    expect(committed.summaryAfter.facts).toBe(3);
    expect(committed.safety.cardMutationProhibited).toBe(true);

    const store = await readCrmFactStore(storePath, { now: NOW });
    expect(store.summary.facts).toBe(3);
    expect(store.summary.readyForCardApply).toBe(1);
    expect(store.summary.needsReview).toBe(2);
    expect(store.summary.factTypes.program_participation).toBe(2);
    expect(store.summary.factTypes.expressed_interest).toBe(1);
  });

  test("skips duplicate facts by factId", async () => {
    const storePath = await tempStore();
    const draft = buildCrmFactIntakeDraft({
      text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
      sourceKind: "telegram_human_report",
      reporter: "Juana",
      channel: "telegram",
      observedAt: NOW,
    });

    await appendCrmFactsToStore({
      facts: draft.facts,
      draft,
      approvedBy: "Alejandro",
      commit: true,
      now: NOW,
      storePath,
    });
    const second = await appendCrmFactsToStore({
      facts: draft.facts,
      draft,
      approvedBy: "Alejandro",
      commit: true,
      now: NOW,
      storePath,
    });

    expect(second.added).toHaveLength(0);
    expect(second.duplicatesSkipped).toHaveLength(1);
    expect(second.summaryAfter.facts).toBe(1);
  });

  test("requires an approver for append attempts", async () => {
    const storePath = await tempStore();
    const draft = buildCrmFactIntakeDraft({
      text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
      sourceKind: "telegram_human_report",
      observedAt: NOW,
    });

    await expect(appendCrmFactsToStore({
      facts: draft.facts,
      approvedBy: "",
      commit: true,
      storePath,
    })).rejects.toThrow("fact_store_approved_by_required");
  });
});
