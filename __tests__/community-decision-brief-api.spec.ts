import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/community-decision-brief.js";

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
});

describe("/api/crm-vnext/community-decision-brief", () => {
  test("serves a bounded local decision brief without leaking source path", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-decision-brief-"));
    const filePath = join(dir, "person-cards-v1.json");
    await writeFile(
      filePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: "ig:reader",
            displayName: "IG Reader",
            identities: { igHandle: "reader" },
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
          query: { sourcePath: filePath, queueId: "ig_without_email", limit: "1" },
          headers: {},
        } as MockReq,
        res as never,
      );

      expect(res.statusCode).toBe(200);
      expect((res.body as { ok?: boolean }).ok).toBe(true);
      expect((res.body as { source: { path?: string; cards: number } }).source).toEqual({
        kind: "legacy-person-cards-v1",
        generatedAt: NOW,
        cards: 1,
      });
      const brief = (res.body as { brief: { mode: string; queue: { id: string }; candidates: unknown[]; safety: { outboundProhibited: boolean } } }).brief;
      expect(brief.mode).toBe("read_only_decision_brief");
      expect(brief.queue.id).toBe("ig_without_email");
      expect(brief.candidates).toHaveLength(1);
      expect(brief.safety.outboundProhibited).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("rejects invalid queue ids", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: "GET", query: { queueId: "unknown" }, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "invalid_queue_id" });
  });

  test("fails closed in production when no internal token is configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: "GET", query: { queueId: "ig_without_email" }, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "internal_token_not_configured" });
  });

  test("rejects non-GET methods", async () => {
    const res = mockRes();

    await handler({ method: "POST", query: { queueId: "ig_without_email" }, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
