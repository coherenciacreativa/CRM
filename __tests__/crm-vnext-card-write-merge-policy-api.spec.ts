import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/card-write-merge-policy.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-write-policy-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  await mkdir(localRootPath, { recursive: true });
  await writeFile(
    sourcePath,
    JSON.stringify({ generatedAt: NOW, cards: [] }),
    "utf8",
  );
  await writeFile(
    mailerBridgePath,
    [
      "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
      "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Asistentes a retiros;Aliados importantes,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
    ].join("\n"),
    "utf8",
  );
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  return { dir, sourcePath, mailerBridgePath, localRootPath };
};

describe("/api/crm-vnext/card-write-merge-policy", () => {
  test("serves read-only policy decisions without live Gmail/MailerLite calls or path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath },
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
      source: {
        liveSources: { gmailLiveApiCalled: boolean; mailerLiteLiveApiCalled: boolean };
        localSearch: { connectedEvidenceSources: number };
      };
      policy: {
        summary: { decisions: number; deferredWrites: number };
        policyRules: { mantisChromeGmailRouteAccepted: boolean; mailerLiteConsultationRecommended: boolean };
        decisions: Array<{ recommendedWrite: { automaticWriteAllowed: boolean }; evidenceAssessment: { sourceSignals: string[] } }>;
      };
    };
    expect(payload.source.liveSources).toEqual({
      gmailLiveApiCalled: false,
      mailerLiteLiveApiCalled: false,
    });
    expect(payload.source.localSearch.connectedEvidenceSources).toBe(1);
    expect(payload.policy.summary.decisions).toBe(1);
    expect(payload.policy.summary.deferredWrites).toBe(1);
    expect(payload.policy.policyRules).toMatchObject({
      mantisChromeGmailRouteAccepted: true,
      mailerLiteConsultationRecommended: true,
    });
    expect(payload.policy.decisions[0].recommendedWrite.automaticWriteAllowed).toBe(false);
    expect(payload.policy.decisions[0].evidenceAssessment.sourceSignals).toContain("gmail_evidence_present");

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
    expect(missing.body).toEqual({ ok: false, error: "card_write_merge_policy_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
