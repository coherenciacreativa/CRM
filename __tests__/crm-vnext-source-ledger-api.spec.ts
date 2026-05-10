import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/source-ledger.js";

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

const makeFiles = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-source-ledger-api-"));
  dirs.push(dir);
  const paths = {
    personCardsPath: join(dir, "person-cards-v1.json"),
    mailerSnapshotPath: join(dir, "mailer-engagement-snapshot.json"),
    mailerBridgePath: join(dir, "mailer-ig-bridge.csv"),
    skippedMailerRowsPath: join(dir, "person-cards-v1-skipped-mailer-rows.json"),
    igUiSignalsPath: join(dir, "ig-ui-signals-state.json"),
    igApiInboxPath: join(dir, "ig-api-inbox-snapshot.json"),
    igWebProbePath: join(dir, "ig-web-probe-state.json"),
    factStorePath: join(dir, "facts.jsonl"),
  };
  await writeFile(paths.personCardsPath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z", cards: [{ personId: "email:a@example.com" }] }), "utf8");
  await writeFile(paths.mailerSnapshotPath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z", profiles: [{ email: "a@example.com" }] }), "utf8");
  await writeFile(paths.mailerBridgePath, "email,igHandle\n", "utf8");
  await writeFile(paths.skippedMailerRowsPath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z", rows: [] }), "utf8");
  await writeFile(paths.igUiSignalsPath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z" }), "utf8");
  await writeFile(paths.igApiInboxPath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z", status: "ok", health: "green" }), "utf8");
  await writeFile(paths.igWebProbePath, JSON.stringify({ generatedAt: "2026-05-09T00:00:00.000Z", status: "ok", health: "green" }), "utf8");
  return { dir, paths };
};

describe("/api/crm-vnext/source-ledger", () => {
  test("serves source ledger without local path leaks", async () => {
    const { dir, paths } = await makeFiles();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "GET",
      query: {
        ...paths,
        expectedMailerLiteContacts: "2",
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    expect((res.body as { ledger: { sources: unknown[] } }).ledger.sources.length).toBeGreaterThan(0);
    expect(JSON.stringify(res.body)).not.toContain(dir);
  });

  test("rejects non-GET methods", async () => {
    const res = mockRes();
    await handler({ method: "POST", query: {}, headers: {} } as MockReq, res as never);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
