import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/contacts-evidence-helper.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-contacts-evidence-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  await mkdir(dir, { recursive: true });
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
  return { dir, sourcePath, mailerBridgePath };
};

describe("/api/crm-vnext/contacts-evidence-helper", () => {
  test("builds read-only Contacts evidence packets without calling live Contacts", async () => {
    const { dir, sourcePath, mailerBridgePath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
        contactsSearchResults: [
          {
            id: "contact-1",
            fullName: "Mayerli Garcia Estudiante Mama De Mango 2022",
            phones: ["+573115381341"],
          },
        ],
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const payload = res.body as {
      source: { contacts: { liveContactsCalledByApi: boolean; searchResultsSupplied: number } };
      helper: { summary: { evidenceSources: number }; evidenceSources: Array<{ sourceKind: string }> };
    };
    expect(payload.source.contacts).toEqual({
      liveContactsCalledByApi: false,
      searchResultsSupplied: 1,
    });
    expect(payload.helper.summary.evidenceSources).toBe(1);
    expect(payload.helper.evidenceSources[0].sourceKind).toBe("contacts_app_export");

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "contacts_evidence_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
