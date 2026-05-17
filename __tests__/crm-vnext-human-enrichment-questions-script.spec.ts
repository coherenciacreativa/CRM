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
          {
            personId: "email:reply@example.com",
            displayName: "Reply Person",
            identities: {
              email: "reply@example.com",
              instagramHandle: null,
              instagramUserId: null,
              phone: null,
              city: null,
              country: null,
            },
            products: {},
            evidence: [{
              source: "crm-vnext-deep-local-stitching:gmail_export",
              note: "Reply signal 1 of 1 | From: Reply Person | Subject: Re: Una nota | Gracias Alejandro, esto me llegó justo hoy.",
            }],
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
        "ig:cielo_gom_g,email:reply@example.com",
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");
      expect(packet.summary).toMatchObject({
        questions: 4,
        highPriority: 1,
        operationsExecuted: 0,
        cardMutationReady: false,
      });
      expect(packet.questions.map((question: { personId: string }) => question.personId)).toEqual([
        "ig:mayuyis2626",
        "ig:luzestellariatizabal",
        "ig:cielo_gom_g",
        "email:reply@example.com",
      ]);
      expect(packet.questions[0].prompt).toContain("Que mas recuerdas");
      expect(packet.questions[0].known.identity).toContain("Telefono: 3115381341");
      expect(packet.questions[1].missingFields).toEqual(expect.arrayContaining(["card_missing"]));
      expect(packet.questions[2].subject.label).toBe("Cielo Gómez (@cielo_gom_g)");
      expect(packet.questions[3].known.memoryCues[0]).toContain("Gracias Alejandro");
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

  test("can re-render an existing packet as a compact review sheet with profile screenshots", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-human-enrichment-compact-"));
    try {
      const packetPath = join(dir, "questions.json");
      const manifestPath = join(dir, "screenshots.json");
      const markdownPath = join(dir, "compact.md");
      const screenshotPath = join(dir, "cielo-profile.png");

      await writeFile(packetPath, JSON.stringify({
        schemaVersion: "crm-vnext-human-enrichment-questions-2026-05-11",
        generatedAt: "2026-05-15T12:00:00.000Z",
        mode: "read_only_human_enrichment_questions",
        summary: {
          questions: 1,
          highPriority: 0,
          mediumPriority: 1,
          lowPriority: 0,
          operationsExecuted: 0,
          cardMutationReady: false,
        },
        questions: [
          {
            questionId: "human_enrichment_01_ig_cielo_gom_g",
            priority: "medium",
            personId: "ig:cielo_gom_g",
            subject: {
              label: "Cielo Gómez (@cielo_gom_g)",
              displayName: "Cielo Gómez",
              instagramHandle: "cielo_gom_g",
            },
            batchStatus: { status: "manual_follow_up" },
            known: {
              identity: [
                "Nombre: Cielo Gómez",
                "Instagram: @cielo_gom_g",
                "Email: cielotago@gmail.com",
                "Ciudad: Bogotá",
              ],
              programs: ["Retiros: 1"],
              memoryCues: ["Pista: Gracias Alejandro, esto me sirvio mucho."],
              evidenceCount: 4,
              nextAction: "keep_warming",
            },
            missingFields: ["telefono"],
            questionFocus: [],
            prompt: "Sobre Cielo...",
            suggestedAnswerFormat: "CRM: Cielo...",
          },
        ],
        safety: {
          readOnly: true,
          outboundProhibited: true,
          cardMutationProhibited: true,
          factStoreWriteProhibited: true,
          credentialReadProhibited: true,
          liveApiCallsProhibited: true,
        },
      }), "utf8");
      await writeFile(manifestPath, JSON.stringify({
        "ig:cielo_gom_g": screenshotPath,
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-human-enrichment-questions.mjs",
        "--questions-file",
        packetPath,
        "--format",
        "compact",
        "--profile-screenshot-manifest",
        manifestPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const markdown = await readFile(markdownPath, "utf8");
      expect(markdown).toContain("# CRM vNext - Revision Compacta Para Alejandro");
      expect(markdown).toContain("![Perfil IG - Cielo Gómez (@cielo_gom_g)]");
      expect(markdown).toContain(screenshotPath);
      expect(markdown).toContain("Datos: Nombre: Cielo Gómez");
      expect(markdown).toContain("Email: cielotago@gmail.com");
      expect(markdown).toContain("Pista: Gracias Alejandro");
      expect(markdown).toContain("Completar: telefono");
      expect(markdown).toContain("Respuesta libre:");
      expect(markdown).not.toContain("Suggested answer format");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
