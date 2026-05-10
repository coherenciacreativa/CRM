import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/person-card.js";
import { CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION } from "../lib/crm/crm-vnext-card-write-apply.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-08T12:00:00.000Z";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
  CRM_VNEXT_PERSON_CARDS_V1_PATH: process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH,
  CRM_VNEXT_PERSON_CARD_STORE_PATH: process.env.CRM_VNEXT_PERSON_CARD_STORE_PATH,
};

const mockRes = () => {
  const response = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      response.statusCode = code;
      return response;
    },
    json(payload: unknown) {
      response.body = payload;
      return response;
    },
  };
  return response;
};

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
  if (originalEnv.CRM_VNEXT_PERSON_CARDS_V1_PATH === undefined) delete process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH;
  else process.env.CRM_VNEXT_PERSON_CARDS_V1_PATH = originalEnv.CRM_VNEXT_PERSON_CARDS_V1_PATH;
  if (originalEnv.CRM_VNEXT_PERSON_CARD_STORE_PATH === undefined) delete process.env.CRM_VNEXT_PERSON_CARD_STORE_PATH;
  else process.env.CRM_VNEXT_PERSON_CARD_STORE_PATH = originalEnv.CRM_VNEXT_PERSON_CARD_STORE_PATH;
});

describe("/api/crm-vnext/person-card", () => {
  test("serves one exact local person card without leaking source path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-person-card-"));
    const filePath = join(dir, "person-cards-v1.json");
    await writeFile(
      filePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: "ig:wrong",
            identities: { igHandle: "wrong" },
            channels: { instagram: true },
          },
          {
            personId: "ig:reader",
            displayName: "IG Reader",
            identities: { igHandle: "reader", city: "Bogota", country: "Colombia" },
            channels: { instagram: true },
            confidence: 0.8,
            engagement: {
              ig: {
                stage: "GERMINADA",
                lastLeadAt: "2026-05-07T12:00:00.000Z",
              },
            },
            evidence: ["ig-ui-signal"],
          },
        ],
      }),
      "utf8",
    );

    try {
      process.env.NODE_ENV = "test";
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: "GET",
          query: { sourcePath: filePath, personId: "ig:reader" },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      expect((res.body as { source: { path?: string; cards: number } }).source).toEqual({
        kind: "legacy-person-cards-v1",
        generatedAt: NOW,
        cards: 2,
      });
      expect((res.body as { card: { personId: string; identities: { instagramHandle: string } } }).card.personId).toBe("ig:reader");
      expect((res.body as { card: { personId: string; identities: { instagramHandle: string } } }).card.identities.instagramHandle).toBe("reader");
      expect(JSON.stringify(res.body)).not.toContain(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("returns 404 when exact person card is absent", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-person-card-missing-"));
    const filePath = join(dir, "person-cards-v1.json");
    await writeFile(
      filePath,
      JSON.stringify({ generatedAt: NOW, cards: [{ personId: "ig:reader" }] }),
      "utf8",
    );

    try {
      process.env.NODE_ENV = "test";
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: "GET",
          query: { sourcePath: filePath, personId: "ig:missing" },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(404);
      expect(res.body).toEqual({ ok: false, error: "person_card_not_found" });
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("serves exact cards from the vNext local store without leaking store path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-person-card-store-"));
    const cardStorePath = join(dir, "person-cards-vnext.json");
    const card = buildPersonCardVNext({
      personId: "email:store@example.com",
      displayName: "Store Reader",
      now: NOW,
      identities: { email: "store@example.com" },
    });
    await writeFile(
      cardStorePath,
      JSON.stringify({
        schemaVersion: CRM_VNEXT_CARD_WRITE_STORE_SCHEMA_VERSION,
        generatedAt: NOW,
        base: {
          kind: "vnext-card-store",
          sourceKind: "legacy-person-cards-v1-derived",
          cardsBeforeApply: 1,
        },
        cards: [card],
        mergeReviewQueue: [],
        provenance: [],
      }),
      "utf8",
    );

    try {
      process.env.NODE_ENV = "test";
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: "GET",
          query: { cardStorePath, personId: "email:store@example.com" },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { source: { kind: string; cards: number } }).source).toMatchObject({
        kind: "vnext-person-card-store",
        cards: 1,
      });
      expect((res.body as { card: { displayName: string } }).card.displayName).toBe("Store Reader");
      expect(JSON.stringify(res.body)).not.toContain(cardStorePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rejects missing person id", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: "GET", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "invalid_person_id" });
  });

  test("fails closed in production when no internal token is configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: "GET", query: { personId: "ig:reader" }, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "internal_token_not_configured" });
  });

  test("rejects non-GET methods", async () => {
    const res = mockRes();

    await handler({ method: "POST", query: { personId: "ig:reader" }, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
