import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/activation-run.js";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const NOW = "2026-05-10T12:00:00.000Z";

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

const makeFixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-activation-run-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const storePath = join(dir, "facts.jsonl");
  await writeFile(
    sourcePath,
    JSON.stringify({
      generatedAt: NOW,
      cards: [
        {
          personId: "ig:ana_yoga",
          identities: { igHandle: "ana_yoga" },
          channels: { instagram: true },
          engagement: { ig: { stage: "GERMINADA", lastLeadAt: NOW } },
          evidence: ["test-card"],
        },
      ],
    }),
    "utf8",
  );
  return { dir, sourcePath, storePath };
};

describe("/api/crm-vnext/activation-run", () => {
  test("serves a dry-run activation report without local path leaks", async () => {
    const { dir, sourcePath, storePath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, storePath },
      body: {
        text: "CRM: @ana_yoga es estudiante de yoga.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        commit: false,
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const activation = (res.body as { activation: { mode: string; summary: { factsParsed: number; cardsWithDiffs: number } } }).activation;
    expect(activation.mode).toBe("dry_run_activation_run");
    expect(activation.summary.factsParsed).toBe(1);
    expect(activation.summary.cardsWithDiffs).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain(dir);
    expect(JSON.stringify(res.body)).not.toContain(sourcePath);
    expect(JSON.stringify(res.body)).not.toContain(storePath);
  });

  test("requires approvedBy for committed writes", async () => {
    const { sourcePath, storePath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, storePath },
      body: {
        text: "CRM: @ana_yoga es estudiante de yoga.",
        commit: true,
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "activation_approved_by_required" });
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "activation_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
