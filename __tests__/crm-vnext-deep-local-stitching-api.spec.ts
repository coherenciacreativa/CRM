import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/deep-local-stitching.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-deep-local-stitching-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const worklogDir = join(localRootPath, "chats", "telegram-group-5162126138", "topics", "crm-coordination-juana");
  await mkdir(worklogDir, { recursive: true });
  await writeFile(
    sourcePath,
    JSON.stringify({ generatedAt: NOW, cards: [] }),
    "utf8",
  );
  await writeFile(
    mailerBridgePath,
    "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status\n",
    "utf8",
  );
  await writeFile(
    join(worklogDir, "WORKLOG.md"),
    [
      "- 2026-03-10T15:58:00-05:00 [lead-status-mayerli-no-asiste][Juana]",
      "  - Juana reporta que Mayerli y su esposo no podrán asistir al retiro por cruce con otro evento.",
    ].join("\n"),
    "utf8",
  );
  return { dir, sourcePath, mailerBridgePath, localRootPath };
};

describe("/api/crm-vnext/deep-local-stitching", () => {
  test("serves read-only deep local evidence without absolute path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        evidenceSources: [
          {
            sourceKind: "gmail_export",
            sourceId: "gmail:thread:mayerli",
            subject: "Mayerli retiro",
            snippet: "Mayerli escribió sobre el retiro y las clases de yoga.",
          },
        ],
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const stitching = (res.body as {
      stitching: {
        summary: { newCardCreationsDeferred: number; hits: number };
        sourceCoverage: { localSources: { connectedEvidenceSources: number; sourceKinds: Record<string, number> } };
        clues: Array<{ recommendation: { action: string }; hits: Array<{ sourceKind: string }> }>;
      };
    }).stitching;
    expect(stitching.summary.newCardCreationsDeferred).toBe(1);
    expect(stitching.summary.hits).toBeGreaterThanOrEqual(1);
    expect(stitching.sourceCoverage.localSources.connectedEvidenceSources).toBe(1);
    expect(stitching.sourceCoverage.localSources.sourceKinds.gmail_export).toBe(1);
    expect(stitching.clues[0].recommendation.action).toBe("defer_new_card_creation");
    expect(stitching.clues[0].hits.map((hit) => hit.sourceKind)).toEqual(expect.arrayContaining([
      "telegram_chat_memory",
      "gmail_export",
    ]));

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
    expect(serialized).not.toContain(localRootPath);
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "deep_local_stitching_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
