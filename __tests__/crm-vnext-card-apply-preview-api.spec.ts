import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/card-apply-preview.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-apply-preview-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const decisionLedgerPath = join(dir, "evidence-review-decisions.jsonl");
  await mkdir(localRootPath, { recursive: true });
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
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  await writeFile(decisionLedgerPath, "", "utf8");
  return { dir, sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath };
};

describe("/api/crm-vnext/card-apply-preview", () => {
  test("serves non-executed card operation previews without path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        evidenceSources: [
          {
            sourceKind: "gmail_export",
            sourceId: "gmail:mayerli",
            subject: "Mayerli Yoga Colombia",
            snippet: "Mayerli joined Yoga Colombia.",
          },
        ],
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const payload = res.body as {
      source: { liveSources: { gmailLiveApiCalled: boolean; mailerLiteLiveApiCalled: boolean } };
      preview: {
        summary: { previews: number; operations: number; deferredReviewPackets: number };
        previews: Array<{ operations: Array<{ executed: boolean; wouldMutate: boolean }> }>;
        safety: { cardMutationProhibited: boolean; writeImplementationAbsent: boolean };
      };
    };
    expect(payload.source.liveSources).toEqual({
      gmailLiveApiCalled: false,
      mailerLiteLiveApiCalled: false,
    });
    expect(payload.preview.summary.previews).toBe(1);
    expect(payload.preview.summary.operations).toBeGreaterThan(0);
    expect(payload.preview.summary.deferredReviewPackets).toBe(1);
    expect(payload.preview.previews[0].operations.every((operation) => operation.executed === false)).toBe(true);
    expect(payload.preview.previews[0].operations.every((operation) => operation.wouldMutate === true)).toBe(true);
    expect(payload.preview.safety).toMatchObject({
      cardMutationProhibited: true,
      writeImplementationAbsent: true,
    });

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
    expect(missing.body).toEqual({ ok: false, error: "card_apply_preview_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
