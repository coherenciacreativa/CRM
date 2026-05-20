import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const card = (overrides: Record<string, unknown>) => ({
  schemaVersion: "person-card-vnext-2026-05-08",
  personId: "email:test@example.com",
  displayName: null,
  identities: {
    email: null,
    instagramHandle: null,
    instagramUserId: null,
    phone: null,
    city: null,
    country: null,
  },
  channels: {
    email: { present: false, status: null },
    instagram: { present: false, status: null },
    whatsapp: { present: false, status: null },
    telegram: { present: false, status: null },
  },
  products: {
    yogaClasses90d: 0,
    happyCircle90d: 0,
    retreatsAttended: 0,
    totalSpend: 0,
    purchaseCount: 0,
    activeClient: false,
  },
  scoring: {
    stage: "SEMILLA",
    priorityScore: 0,
    commercialWarmth: 0,
    communityDepth: 0,
    relationshipEngagement: 0,
    dataConfidence: 0,
    productFit: {
      yoga: 0,
      mentorship: 0,
      therapy: 0,
      digitalProducts: 0,
      retreats: 0,
    },
    nextBestAction: "keep_warming",
    reasons: [],
    risks: [],
  },
  evidence: [],
  nextAction: {
    code: "keep_warming",
    requiresHumanReview: false,
    reason: "test",
  },
  updatedAt: "2026-05-20T00:00:00.000Z",
  ...overrides,
});

describe("CRM vNext ClassBot yoga evidence script", () => {
  test("builds a read-only evidence packet from recipients and idempotency records", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-classbot-yoga-"));
    try {
      const classbotRoot = join(dir, "classbot");
      const dispatcherDir = join(classbotRoot, "dispatcher");
      await mkdir(join(dispatcherDir, "src"), { recursive: true });
      await mkdir(join(dispatcherDir, ".idempotency-cache"), { recursive: true });

      await writeFile(join(dispatcherDir, "src", "recipients.csv"), [
        "class_id,program,displayName,phone,timezone,status",
        ",two_per_week,Alejandro,whatsapp:+573001112222,America/Bogota,",
        ",two_per_week,Lina,whatsapp:+573009999204,America/Bogota,",
        ",two_per_week,Maria Casas,whatsapp:+573004444778,America/Bogota,",
        ",thursday_only,Bibiana Velandia,whatsapp:+573007777172,America/Bogota,",
      ].join("\n"), "utf8");

      await writeFile(join(dispatcherDir, ".idempotency-cache", "records.json"), JSON.stringify({
        lina1: {
          key: "clase-2026-05-14-2056:whatsapp:+573009999204",
          status: "sent",
          timestamp: "2026-05-14T21:17:55-05:00",
        },
        maria1: {
          key: "clase-2026-05-14-2056:whatsapp:+573004444778",
          status: "sent",
          timestamp: "2026-05-14T21:17:55-05:00",
        },
      }), "utf8");

      const cardStorePath = join(dir, "person-cards-vnext.json");
      await writeFile(cardStorePath, JSON.stringify({
        cards: [
          card({
            personId: "email:lina@example.com",
            displayName: "Lina Maria Bernal",
            identities: { email: "lina@example.com", instagramHandle: null, instagramUserId: null, phone: "+573009999204", city: null, country: null },
          }),
          card({
            personId: "email:mariaconsuelocasas@gmail.com",
            displayName: null,
            identities: { email: "mariaconsuelocasas@gmail.com", instagramHandle: null, instagramUserId: null, phone: null, city: null, country: null },
          }),
        ],
      }), "utf8");

      const outPath = join(dir, "out.json");
      const markdownPath = join(dir, "out.md");
      await execFileAsync("node", [
        "scripts/crm-vnext-classbot-yoga-evidence.mjs",
        "--classbot-root",
        classbotRoot,
        "--card-store-path",
        cardStorePath,
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
      ], { cwd: process.cwd() });

      const packet = JSON.parse(await readFile(outPath, "utf8"));
      const markdown = await readFile(markdownPath, "utf8");

      expect(packet.summaryMetrics).toMatchObject({
        contactsProcessed: 3,
        withCrmCandidate: 2,
        withoutCrmCandidate: 1,
        actionEnrichExistingCard: 2,
        actionCreateReviewCard: 1,
      });
      expect(packet.contacts.lina).toMatchObject({
        confidence: "strong",
        recommended_action: "enrich_existing_card",
        crm_candidate_card: { personId: "email:lina@example.com" },
      });
      expect(packet.contacts.maria_casas).toMatchObject({
        confidence: "medium",
        recommended_action: "enrich_existing_card",
        crm_candidate_card: { personId: "email:mariaconsuelocasas@gmail.com" },
      });
      expect(packet.contacts.bibiana_velandia).toMatchObject({
        confidence: "blocked",
        recommended_action: "create_review_card",
        crm_candidate_card: null,
      });
      expect(packet.contacts.lina.ready_write_preview.executed).toBe(false);
      expect(packet.safety.whatsappOutboundExecuted).toBe(false);
      expect(markdown).toContain("ClassBot Yoga Evidence");
      expect(markdown).toContain("Lina");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
