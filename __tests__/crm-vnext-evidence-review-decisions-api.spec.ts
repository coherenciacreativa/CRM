import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/evidence-review-decisions.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-evidence-review-decisions-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const ledgerPath = join(dir, "decisions.jsonl");
  await mkdir(localRootPath, { recursive: true });
  await writeFile(sourcePath, JSON.stringify({ generatedAt: NOW, cards: [] }), "utf8");
  await writeFile(
    mailerBridgePath,
    "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status\n",
    "utf8",
  );
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  return { dir, sourcePath, mailerBridgePath, localRootPath, ledgerPath };
};

describe("/api/crm-vnext/evidence-review-decisions", () => {
  test("previews and commits local review decisions without path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath, ledgerPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;

    const preview = mockRes();
    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath, ledgerPath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
        sourceKind: "alejandro_conversation",
        evidenceSources: [
          {
            sourceKind: "retreat_table",
            sourceId: "google-drive:retiro-junio:row-7",
            snippet: [
              "Name: Gladys Mayerli Garcia Ortegon",
              "Email: mayaariana@hotmail.com",
              "Phone: 3115381341",
              "Context: Retiro familiar: Ariana Catalina Torres Garcia comparte correo.",
              "Email ownership review required: email may belong to a family member or companion.",
            ].join(" "),
          },
        ],
        decisions: [{
          candidateEmail: "mayaariana@hotmail.com",
          selectedOptionId: "keep_email_unassigned_family_or_companion",
        }],
        commit: false,
      },
      headers: {},
    } as MockReq, preview as never);

    expect(preview.statusCode).toBe(200);
    expect((preview.body as { result: { committed: boolean; added: unknown[]; summaryAfter: { decisions: number } } }).result.committed).toBe(false);
    expect((preview.body as { result: { added: unknown[] } }).result.added).toHaveLength(1);
    expect((preview.body as { result: { summaryAfter: { decisions: number } } }).result.summaryAfter.decisions).toBe(0);

    const committed = mockRes();
    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath, ledgerPath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
        sourceKind: "alejandro_conversation",
        evidenceSources: [
          {
            sourceKind: "retreat_table",
            sourceId: "google-drive:retiro-junio:row-7",
            snippet: [
              "Name: Gladys Mayerli Garcia Ortegon",
              "Email: mayaariana@hotmail.com",
              "Phone: 3115381341",
              "Context: Retiro familiar: Ariana Catalina Torres Garcia comparte correo.",
              "Email ownership review required: email may belong to a family member or companion.",
            ].join(" "),
          },
        ],
        decisions: [{
          candidateEmail: "mayaariana@hotmail.com",
          selectedOptionId: "keep_email_unassigned_family_or_companion",
        }],
        commit: true,
        approvedBy: "Alejandro",
      },
      headers: {},
    } as MockReq, committed as never);

    expect(committed.statusCode).toBe(200);
    expect((committed.body as { result: { committed: boolean; summaryAfter: { decisions: number; keptFamilyOrCompanion: number } } }).result.committed).toBe(true);
    expect((committed.body as { result: { summaryAfter: { decisions: number; keptFamilyOrCompanion: number } } }).result.summaryAfter).toMatchObject({
      decisions: 1,
      keptFamilyOrCompanion: 1,
    });

    const read = mockRes();
    await handler({
      method: "GET",
      query: { ledgerPath },
      headers: {},
    } as MockReq, read as never);

    expect(read.statusCode).toBe(200);
    expect((read.body as { ledger: { summary: { decisions: number }; decisions: unknown[] } }).ledger.summary.decisions).toBe(1);
    const serialized = JSON.stringify(read.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
    expect(serialized).not.toContain(localRootPath);
    expect(serialized).not.toContain(ledgerPath);
  });

  test("requires approvedBy when committing and rejects unsupported methods", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const { ledgerPath } = await makeFixture();
    const missing = mockRes();
    await handler({
      method: "POST",
      query: { ledgerPath },
      body: {
        packet: { generatedAt: NOW, reviewItems: [] },
        decisions: [{ candidateEmail: "x@example.com", selectedOptionId: "ignore_candidate" }],
        commit: true,
      },
      headers: {},
    } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "evidence_review_decisions_approved_by_required" });

    const method = mockRes();
    await handler({ method: "DELETE", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
