import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/fact-store.js";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
};

let dirs: string[] = [];

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

afterEach(async () => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const tempStorePath = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-fact-store-api-"));
  dirs.push(dir);
  return join(dir, "facts.jsonl");
};

describe("/api/crm-vnext/fact-store", () => {
  test("previews and commits local fact-store appends", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const storePath = await tempStorePath();

    const preview = mockRes();
    await handler({
      method: "POST",
      query: { storePath },
      body: {
        text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
        sourceKind: "telegram_human_report",
        reporter: "Juana",
        channel: "telegram",
        commit: false,
      },
      headers: {},
    } as MockReq, preview as never);

    expect(preview.statusCode).toBe(200);
    expect((preview.body as { result: { committed: boolean; added: unknown[] } }).result.committed).toBe(false);
    expect((preview.body as { result: { added: unknown[] } }).result.added).toHaveLength(1);

    const committed = mockRes();
    await handler({
      method: "POST",
      query: { storePath },
      body: {
        text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
        sourceKind: "telegram_human_report",
        reporter: "Juana",
        channel: "telegram",
        commit: true,
        approvedBy: "Alejandro",
      },
      headers: {},
    } as MockReq, committed as never);

    expect(committed.statusCode).toBe(200);
    expect((committed.body as { result: { committed: boolean; summaryAfter: { facts: number } } }).result.committed).toBe(true);
    expect((committed.body as { result: { summaryAfter: { facts: number } } }).result.summaryAfter.facts).toBe(1);

    const read = mockRes();
    await handler({
      method: "GET",
      query: { storePath },
      headers: {},
    } as MockReq, read as never);

    expect(read.statusCode).toBe(200);
    expect((read.body as { store: { summary: { facts: number }; facts: unknown[] } }).store.summary.facts).toBe(1);
    expect(JSON.stringify(read.body)).not.toContain(storePath);
  });

  test("requires approvedBy when committing", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();
    await handler({
      method: "POST",
      query: { storePath: await tempStorePath() },
      body: {
        text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
        commit: true,
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "fact_store_approved_by_required" });
  });

  test("rejects unsupported methods", async () => {
    const res = mockRes();
    await handler({ method: "DELETE", query: {}, body: {}, headers: {} } as MockReq, res as never);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
