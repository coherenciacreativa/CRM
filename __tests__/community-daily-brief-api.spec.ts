import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/community-daily-brief.js";
import {
  buildCommunityQueueSnapshot,
  writeCommunityQueueSnapshot,
} from "../lib/crm/community-queue-snapshots.js";

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
  CRM_VNEXT_QUEUE_SNAPSHOT_PATH: process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH,
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
  if (originalEnv.CRM_VNEXT_QUEUE_SNAPSHOT_PATH === undefined) delete process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH;
  else process.env.CRM_VNEXT_QUEUE_SNAPSHOT_PATH = originalEnv.CRM_VNEXT_QUEUE_SNAPSHOT_PATH;
});

describe("/api/crm-vnext/community-daily-brief", () => {
  test("serves a local daily brief with bounded focus queues", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-daily-brief-"));
    const filePath = join(dir, "person-cards-v1.json");
    const previousSnapshotPath = join(dir, "previous-queue-snapshot.json");
    await writeFile(
      filePath,
      JSON.stringify({
        generatedAt: NOW,
        cards: [
          {
            personId: "ig:reader",
            identities: { igHandle: "reader" },
            channels: { instagram: true },
            confidence: 0.8,
            engagement: {
              ig: {
                stage: "SEMILLA",
                lastLeadAt: "2026-05-07T12:00:00.000Z",
              },
            },
            evidence: ["ig-ui-signal"],
          },
          {
            personId: "email:subscriber@example.com",
            identities: { email: "subscriber@example.com" },
            channels: { email: true },
            engagement: {
              email: {
                opens30d: 7,
                clicks30d: 2,
                lastOpenAt: "2026-05-07T12:00:00.000Z",
              },
            },
            evidence: ["mailer-engagement-snapshot"],
          },
        ],
      }),
      "utf8",
    );
    await writeCommunityQueueSnapshot(
      previousSnapshotPath,
      buildCommunityQueueSnapshot(
        [
          {
            id: "ig_without_email",
            title: "IG without email",
            purpose: "test",
            operatorNote: "test",
            filters: { limit: 12 },
            counts: {
              total: 2,
              matched: 1,
              returned: 1,
            },
          },
        ],
        {
          kind: "legacy-person-cards-v1",
          path: filePath,
          generatedAt: NOW,
          cards: 2,
        },
        { now: "2026-05-08T11:00:00.000Z" },
      ),
    );

    try {
      process.env.NODE_ENV = "test";
      delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
      const res = mockRes();

      await handler(
        {
          method: "GET",
          query: {
            sourcePath: filePath,
            previousSnapshotPath,
            focusQueueLimit: "2",
            peoplePerQueue: "1",
          },
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
      expect((res.body as { snapshot: { previousLoaded: boolean } }).snapshot.previousLoaded).toBe(true);
      const brief = (res.body as { brief: { mode: string; focusQueues: Array<{ people: unknown[] }>; safety: { outboundProhibited: boolean } } }).brief;
      expect(brief.mode).toBe("read_only_daily_brief");
      expect(brief.focusQueues.length).toBeLessThanOrEqual(2);
      expect(brief.focusQueues.every((queue) => queue.people.length <= 1)).toBe(true);
      expect(brief.safety.outboundProhibited).toBe(true);
      expect(JSON.stringify(res.body)).not.toContain(filePath);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("fails closed in production when no internal token is configured", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({ method: "GET", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "internal_token_not_configured" });
  });

  test("rejects non-GET methods", async () => {
    const res = mockRes();

    await handler({ method: "POST", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
