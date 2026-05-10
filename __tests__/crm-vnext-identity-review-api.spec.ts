import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import { buildCrmFactIntakeDraft } from "../lib/crm/crm-vnext-fact-intake.js";
import { appendCrmFactsToStore } from "../lib/crm/crm-vnext-fact-store.js";
import handler from "../pages/api/crm-vnext/identity-review.js";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const NOW = "2026-05-09T12:00:00.000Z";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-identity-review-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const storePath = join(dir, "facts.jsonl");
  await writeFile(
    sourcePath,
    JSON.stringify({
      generatedAt: NOW,
      cards: [
        {
          personId: "ig:mariana_luz",
          identities: { igHandle: "mariana_luz" },
          channels: { instagram: true },
          engagement: { ig: { stage: "GERMINADA", lastLeadAt: NOW } },
          evidence: ["test-card"],
        },
      ],
    }),
    "utf8",
  );

  const draft = buildCrmFactIntakeDraft({
    text: "CRM: @mariana_luz esta interesada en mentoria 1:1.",
    sourceKind: "telegram_human_report",
    reporter: "Juana",
    channel: "telegram",
    observedAt: NOW,
  });
  await appendCrmFactsToStore({
    facts: draft.facts,
    draft,
    approvedBy: "Alejandro",
    commit: true,
    now: NOW,
    storePath,
  });

  return { dir, sourcePath, storePath };
};

describe("/api/crm-vnext/identity-review", () => {
  test("serves read-only identity review without local path leaks", async () => {
    const { dir, sourcePath, storePath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "GET",
      query: { sourcePath, storePath },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    expect((res.body as { review: { summary: { readyForPreview: number } } }).review.summary.readyForPreview).toBe(1);
    expect(JSON.stringify(res.body)).not.toContain(dir);
    expect(JSON.stringify(res.body)).not.toContain(sourcePath);
    expect(JSON.stringify(res.body)).not.toContain(storePath);
  });

  test("rejects non-GET methods", async () => {
    const res = mockRes();
    await handler({ method: "POST", query: {}, headers: {} } as MockReq, res as never);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
