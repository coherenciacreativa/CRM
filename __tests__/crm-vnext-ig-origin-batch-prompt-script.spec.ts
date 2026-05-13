import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

describe("CRM vNext IG-origin batch prompt script", () => {
  test("builds a read-only Mantis prompt from latest committed IG-origin writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-ig-origin-prompt-"));
    try {
      const cardStorePath = join(dir, "cards.json");
      const ledgerPath = join(dir, "ledger.jsonl");
      const outPath = join(dir, "packet.json");
      const markdownPath = join(dir, "packet.md");

      await writeFile(cardStorePath, JSON.stringify({
        cards: [
          {
            personId: "email:rocio@example.com",
            displayName: "Rocío Martínez",
            identities: {
              email: "rocio@example.com",
              instagramHandle: null,
              phone: null,
              city: null,
              country: "México",
            },
            products: {},
            evidence: [
              {
                source: "crm-vnext-deep-local-stitching:lead_capture_export",
                note: "Source: mailerlite_form Flow: Instagram onboarding Captured message: quiere recibir correos.",
              },
            ],
            nextAction: { code: "keep_warming" },
          },
          {
            personId: "email:katy@example.com",
            displayName: "Katy Giraldo",
            identities: {
              email: "katy@example.com",
              instagramHandle: "katyg",
              phone: null,
              city: "Medellín",
              country: "Colombia",
            },
            products: {},
            evidence: [
              {
                source: "crm-vnext-deep-local-stitching:lead_capture_export",
                note: "Instagram onboarding via Vercel proxy.",
              },
            ],
            nextAction: { code: "keep_warming" },
          },
          {
            personId: "email:plain@example.com",
            displayName: "Plain Contact",
            identities: {
              email: "plain@example.com",
              instagramHandle: null,
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
          mutationKind: "upsert_vnext_card",
          committedAt: "2026-05-14T01:00:00.000Z",
          cardPersonId: "email:plain@example.com",
        }),
        JSON.stringify({
          mutationKind: "upsert_vnext_card",
          committedAt: "2026-05-14T02:00:00.000Z",
          cardPersonId: "email:rocio@example.com",
        }),
        JSON.stringify({
          mutationKind: "upsert_vnext_card",
          committedAt: "2026-05-14T03:00:00.000Z",
          cardPersonId: "email:katy@example.com",
        }),
      ].join("\n"), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-ig-origin-batch-prompt.mjs",
        "--card-store-path",
        cardStorePath,
        "--card-write-ledger-path",
        ledgerPath,
        "--latest-writes",
        "3",
        "--limit",
        "2",
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");

      expect(packet.mode).toBe("read_only_ig_origin_batch_prompt");
      expect(packet.summary).toMatchObject({
        contactsSelected: 2,
        latestWriteSeeds: 3,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.contacts.map((contact: { personId: string }) => contact.personId)).toEqual([
        "email:rocio@example.com",
        "email:katy@example.com",
      ]);
      expect(packet.mantisPrompt).toContain("Instagram Messages UI");
      expect(packet.mantisPrompt).toContain("threadContext");
      expect(packet.mantisPrompt).toContain("no copiar conversaciones completas");
      expect(packet.contacts[0].searchTasks.join(" ")).toContain("Buscar el email rocio@example.com");
      expect(markdown).toContain("Copy-ready prompt for Mantis");
      expect(JSON.stringify(packet)).not.toContain("/Users/");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
