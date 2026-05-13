import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext human enrichment questions script", () => {
  test("builds person-by-person questions from a batch loop and extra person ids", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-human-enrichment-"));
    try {
      const cardStorePath = join(dir, "cards.json");
      const loopPath = join(dir, "loop.json");
      const outPath = join(dir, "questions.json");
      const markdownPath = join(dir, "questions.md");

      await writeFile(cardStorePath, JSON.stringify({
        schemaVersion: "crm-vnext-person-card-store-2026-05-10",
        cards: [
          {
            personId: "ig:mayuyis2626",
            displayName: "Gladys Mayerli Garcia Ortegon / Mayerli Garcia",
            identities: {
              email: null,
              instagramHandle: "mayuyis2626",
              instagramUserId: null,
              phone: "3115381341",
              city: "Bogotá",
              country: "Colombia",
            },
            products: {
              yogaClasses90d: 1,
              happyCircle90d: 0,
              retreatsAttended: 1,
              totalSpend: 0,
              purchaseCount: 0,
              activeClient: false,
            },
            evidence: [{ source: "test" }],
            nextAction: { code: "complete_profile" },
          },
          {
            personId: "ig:cielo_gom_g",
            displayName: "Cielo Gómez",
            identities: {
              email: "cielotago@gmail.com",
              instagramHandle: "cielo_gom_g",
              instagramUserId: null,
              phone: "+573143011712",
              city: "Bogotá",
              country: "Colombia",
            },
            products: {
              yogaClasses90d: 0,
              happyCircle90d: 0,
              retreatsAttended: 1,
              totalSpend: 0,
              purchaseCount: 0,
              activeClient: false,
            },
            evidence: [{ source: "test" }, { source: "test-2" }, { source: "test-3" }],
            nextAction: { code: "keep_warming" },
          },
        ],
      }), "utf8");

      await writeFile(loopPath, JSON.stringify({
        readyApprovalItems: [
          {
            targetPersonId: "ig:mayuyis2626",
            recommendedAction: "enrich_existing_card",
          },
        ],
        blockedIdentityQueue: [
          {
            targetPersonId: "ig:luzestellariatizabal",
            status: "blocked_needs_more_identity",
            recommendedAction: "enrich_existing_card",
            identitySummary: { missingContactFields: ["email", "phone"] },
            operatorPrompt: "Search read-only evidence for Luz.",
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-human-enrichment-questions.mjs",
        "--card-store-path",
        cardStorePath,
        "--batch-loop-file",
        loopPath,
        "--person-id",
        "ig:cielo_gom_g",
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");
      expect(packet.summary).toMatchObject({
        questions: 3,
        highPriority: 1,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.questions.map((question: { personId: string }) => question.personId)).toEqual([
        "ig:mayuyis2626",
        "ig:luzestellariatizabal",
        "ig:cielo_gom_g",
      ]);
      expect(packet.questions[0].prompt).toContain("Que mas recuerdas");
      expect(packet.questions[0].known.identity).toContain("Telefono: 3115381341");
      expect(packet.questions[1].missingFields).toEqual(expect.arrayContaining(["card_missing"]));
      expect(packet.questions[2].subject.label).toBe("Cielo Gómez (@cielo_gom_g)");
      expect(markdown).toContain("## 3. Cielo Gómez (@cielo_gom_g)");
      expect(JSON.stringify(packet)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("can seed questions from the latest committed card-write ledger entries", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-human-enrichment-ledger-"));
    try {
      const cardStorePath = join(dir, "cards.json");
      const ledgerPath = join(dir, "ledger.jsonl");
      const outPath = join(dir, "questions.json");
      const markdownPath = join(dir, "questions.md");

      await writeFile(cardStorePath, JSON.stringify({
        schemaVersion: "crm-vnext-person-card-store-2026-05-10",
        cards: [
          {
            personId: "email:katy@example.com",
            displayName: "Katy Giraldo Aristizabal",
            identities: {
              email: "katy@example.com",
              instagramHandle: null,
              instagramUserId: null,
              phone: null,
              city: "Medellín",
              country: "Colombia",
            },
            products: {
              yogaClasses90d: 0,
              happyCircle90d: 0,
              retreatsAttended: 0,
              totalSpend: 0,
              purchaseCount: 0,
              activeClient: false,
            },
            evidence: [{ source: "lead-capture" }],
          },
          {
            personId: "email:edwin@example.com",
            displayName: "Edwin Velasquez",
            identities: {
              email: "edwin@example.com",
              instagramHandle: null,
              instagramUserId: null,
              phone: "+573108010473",
              city: "Bogotá",
              country: "Colombia",
            },
            products: {
              yogaClasses90d: 0,
              happyCircle90d: 0,
              retreatsAttended: 0,
              totalSpend: 0,
              purchaseCount: 0,
              activeClient: false,
            },
            evidence: [{ source: "lead-capture" }],
          },
          {
            personId: "ig:oldmerge",
            displayName: "Old Merge",
            identities: {
              email: null,
              instagramHandle: "oldmerge",
              instagramUserId: null,
              phone: null,
              city: null,
              country: null,
            },
            products: {},
            evidence: [],
          },
        ],
      }), "utf8");

      await writeFile(ledgerPath, [
        JSON.stringify({
          committedAt: "2026-05-10T10:00:00.000Z",
          mutationKind: "upsert_vnext_card",
          cardPersonId: "ig:oldmerge",
          targetPersonId: "ig:oldmerge",
        }),
        JSON.stringify({
          committedAt: "2026-05-11T10:00:00.000Z",
          mutationKind: "stage_merge_review",
          cardPersonId: null,
          targetPersonId: "email:merge@example.com",
        }),
        JSON.stringify({
          committedAt: "2026-05-12T10:00:00.000Z",
          mutationKind: "upsert_vnext_card",
          cardPersonId: "email:edwin@example.com",
          targetPersonId: "email:edwin@example.com",
        }),
        JSON.stringify({
          committedAt: "2026-05-12T10:01:00.000Z",
          mutationKind: "upsert_vnext_card",
          cardPersonId: "email:katy@example.com",
          targetPersonId: "email:katy@example.com",
        }),
      ].join("\n"), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-human-enrichment-questions.mjs",
        "--card-store-path",
        cardStorePath,
        "--card-write-ledger-path",
        ledgerPath,
        "--latest-writes",
        "2",
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");
      expect(packet.source).toMatchObject({
        cardWriteLedgerLoaded: true,
        cardWriteLedgerRows: 4,
        cardWriteLedgerPeopleSelected: 2,
      });
      expect(packet.questions.map((question: { personId: string }) => question.personId)).toEqual([
        "email:katy@example.com",
        "email:edwin@example.com",
      ]);
      expect(packet.summary).toMatchObject({
        questions: 2,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(markdown).toContain("## 1. Katy Giraldo Aristizabal");
      expect(JSON.stringify(packet)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
