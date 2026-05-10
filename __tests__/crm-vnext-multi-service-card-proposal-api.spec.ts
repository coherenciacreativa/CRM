import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/multi-service-card-proposal.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-multi-service-card-proposal-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  await writeFile(
    sourcePath,
    JSON.stringify({
      generatedAt: NOW,
      cards: [
        {
          personId: "ig:ana_yoga",
          identities: { igHandle: "ana_yoga" },
          channels: { instagram: true },
          evidence: ["test-card"],
        },
      ],
    }),
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
  return { dir, sourcePath, mailerBridgePath };
};

describe("/api/crm-vnext/multi-service-card-proposal", () => {
  test("serves proposal-only multi-service card plans without local path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath },
      body: {
        text: "CRM: Juan José Trujillo es estudiante de yoga, ha asistido a retiros y es paciente de psicología.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const proposal = (res.body as {
      proposal: {
        summary: { proposals: number; restrictedServiceRelationships: number };
        proposals: Array<{ target: { type: string; personId: string | null }; multiService: boolean }>;
      };
    }).proposal;
    expect(proposal.summary.proposals).toBe(1);
    expect(proposal.summary.restrictedServiceRelationships).toBe(1);
    expect(proposal.proposals[0]).toMatchObject({
      target: { type: "new_card_from_mailer_candidate", personId: "email:juanjotru@gmail.com" },
      multiService: true,
    });
    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "multi_service_card_proposal_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
