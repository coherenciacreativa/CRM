import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmVNextActivationRun } from "../lib/crm/crm-vnext-activation-run.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";
import { readCrmFactStore } from "../lib/crm/crm-vnext-fact-store.js";

const NOW = "2026-05-10T12:00:00.000Z";

let dirs: string[] = [];

afterEach(async () => {
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempStorePath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-activation-run-"));
  dirs.push(dir);
  return join(dir, "facts.jsonl");
};

const cards = [
  buildPersonCardVNext({
    personId: "ig:ana_yoga",
    displayName: "Ana Yoga",
    now: NOW,
    identities: { instagramHandle: "ana_yoga" },
    scoring: { participation: { yogaClasses90d: 2 } },
    evidence: [{ source: "existing-card", observedAt: NOW }],
  }),
  buildPersonCardVNext({
    personId: "person:ana-gomez",
    displayName: "Ana Gomez",
    now: NOW,
  }),
];

describe("CRM vNext activation run", () => {
  test("runs a dry local batch through intake, store preview, identity review, and card diff", async () => {
    const storePath = await tempStorePath();

    const report = await buildCrmVNextActivationRun({
      text: [
        "CRM: @ana_yoga es estudiante de yoga.",
        "CRM: Ana Gomez es estudiante de yoga.",
      ].join("\n"),
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      storePath,
      cards,
    });

    expect(report.schemaVersion).toBe("crm-vnext-activation-run-2026-05-10");
    expect(report.mode).toBe("dry_run_activation_run");
    expect(report.committed).toBe(false);
    expect(report.draft.summary.facts).toBe(2);
    expect(report.storeAppend.committed).toBe(false);
    expect(report.storeAppend.added).toHaveLength(2);
    expect(report.identityReview.summary.readyForPreview).toBe(1);
    expect(report.identityReview.summary.needsIdentityReview).toBe(1);
    expect(report.cardDiff.summary.cardsWithDiffs).toBe(1);
    expect(report.cardDiff.diffs[0].personId).toBe("ig:ana_yoga");
    expect(report.cardDiff.diffs[0].proposed.tagsToAdd).toContain("program:yoga");
    expect(report.summary).toMatchObject({
      factsParsed: 2,
      factsAdded: 2,
      readyForPreview: 1,
      blockedFacts: 1,
      cardsWithDiffs: 1,
    });
    expect(report.nextSteps).toContain("Review the draft first; rerun with explicit commit only for real approved facts.");
    expect(report.safety.outboundProhibited).toBe(true);
    expect(report.safety.cardMutationProhibited).toBe(true);

    const store = await readCrmFactStore(storePath, { now: NOW });
    expect(store.summary.facts).toBe(0);
  });

  test("commits only when explicitly requested and dedupes repeated batches", async () => {
    const storePath = await tempStorePath();
    const input = {
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation" as const,
      reporter: "Alejandro",
      channel: "codex",
      approvedBy: "Alejandro",
      commit: true,
      now: NOW,
      storePath,
      cards,
    };

    const first = await buildCrmVNextActivationRun(input);
    expect(first.mode).toBe("local_activation_run");
    expect(first.committed).toBe(true);
    expect(first.storeAppend.summaryAfter.facts).toBe(1);

    const second = await buildCrmVNextActivationRun(input);
    expect(second.storeAppend.added).toHaveLength(0);
    expect(second.storeAppend.duplicatesSkipped).toHaveLength(1);
    expect(second.summary.duplicatesSkipped).toBe(1);
    expect(second.storeAppend.summaryAfter.facts).toBe(1);
  });
});
