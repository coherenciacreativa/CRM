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

  test("skips low-signal and owned IG-only fallback cards", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-ig-origin-prompt-hygiene-"));
    try {
      const cardStorePath = join(dir, "cards.json");
      const ledgerPath = join(dir, "ledger.jsonl");
      const outPath = join(dir, "packet.json");

      await writeFile(cardStorePath, JSON.stringify({
        cards: [
          {
            personId: "email:edwin@example.com",
            displayName: "Edwin Velasquez",
            identities: {
              email: "edwin@example.com",
              instagramHandle: null,
              phone: "+573001112233",
              city: "Bogotá",
              country: "Colombia",
            },
            evidence: [
              {
                source: "crm-vnext-deep-local-stitching:lead_capture_export",
                note: "Instagram onboarding via Vercel proxy; captured message from YouTube meditation/yoga lead.",
              },
            ],
          },
          {
            personId: "ig:anachbrown",
            displayName: "Ana Ch",
            identities: {
              email: null,
              instagramHandle: "anachbrown",
              phone: null,
              city: null,
              country: null,
            },
            evidence: [
              {
                source: "crm-vnext-context-fact-proposals:instagram_dm_ui_export",
                note: "Exact account result visible in Instagram Messages search.",
              },
            ],
          },
          {
            personId: "ig:random_low_signal",
            displayName: null,
            identities: {
              email: null,
              instagramHandle: "random_low_signal",
              phone: null,
              city: null,
              country: null,
            },
            evidence: [{ source: "lead-state" }],
          },
          {
            personId: "ig:alejandro_gomez_bernal",
            displayName: null,
            identities: {
              email: null,
              instagramHandle: "alejandro_gomez_bernal",
              phone: null,
              city: null,
              country: null,
            },
            evidence: [{ source: "ig-api-inbox-snapshot" }],
          },
        ],
      }), "utf8");
      await writeFile(ledgerPath, "", "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-ig-origin-batch-prompt.mjs",
        "--card-store-path",
        cardStorePath,
        "--card-write-ledger-path",
        ledgerPath,
        "--limit",
        "5",
        "--out",
        outPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const personIds = packet.contacts.map((contact: { personId: string }) => contact.personId);

      expect(personIds).toEqual(["email:edwin@example.com", "ig:anachbrown"]);
      expect(packet.summary.excludedLowSignalFallbacks).toBe(2);
      expect(JSON.stringify(packet)).not.toContain("alejandro_gomez_bernal");
      expect(JSON.stringify(packet)).not.toContain("random_low_signal");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("keeps explicit person ids ahead of fallback candidates", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-ig-origin-prompt-explicit-"));
    try {
      const cardStorePath = join(dir, "cards.json");
      const ledgerPath = join(dir, "ledger.jsonl");
      const outPath = join(dir, "packet.json");

      await writeFile(cardStorePath, JSON.stringify({
        cards: [
          {
            personId: "ig:explicit_one",
            displayName: "Explicit One",
            identities: { instagramHandle: "explicit_one" },
            evidence: [{ source: "lead-state" }],
          },
          {
            personId: "ig:explicit_two",
            displayName: "Explicit Two",
            identities: { instagramHandle: "explicit_two" },
            evidence: [{ source: "lead-state" }],
          },
          {
            personId: "email:high-priority@example.com",
            displayName: "High Priority Fallback",
            identities: {
              email: "high-priority@example.com",
              instagramHandle: null,
              phone: "+573009998877",
              city: "Bogotá",
              country: "Colombia",
            },
            evidence: [
              {
                source: "crm-vnext-deep-local-stitching:lead_capture_export",
                note: "Instagram onboarding via Vercel proxy.",
              },
            ],
          },
        ],
      }), "utf8");
      await writeFile(ledgerPath, "", "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-ig-origin-batch-prompt.mjs",
        "--card-store-path",
        cardStorePath,
        "--card-write-ledger-path",
        ledgerPath,
        "--person-id",
        "ig:explicit_one,ig:explicit_two",
        "--limit",
        "2",
        "--out",
        outPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));

      expect(packet.contacts.map((contact: { personId: string }) => contact.personId)).toEqual([
        "ig:explicit_one",
        "ig:explicit_two",
      ]);
      expect(packet.summary.explicitSeeds).toBe(2);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
