import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/evidence-approval-application.js";

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
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-evidence-approval-application-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const decisionLedgerPath = join(dir, "evidence-review-decisions.jsonl");
  await mkdir(localRootPath, { recursive: true });
  await writeFile(sourcePath, JSON.stringify({ generatedAt: NOW, cards: [] }), "utf8");
  await writeFile(
    mailerBridgePath,
    "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status\n",
    "utf8",
  );
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  await writeFile(decisionLedgerPath, "", "utf8");
  return { dir, sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath };
};

describe("/api/crm-vnext/evidence-approval-application", () => {
  test("applies evidence decisions locally without live sources or path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath },
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
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const payload = res.body as {
      source: {
        liveSources: {
          gmailLiveApiCalled: boolean;
          mailerLiteLiveApiCalled: boolean;
          googleDriveLiveApiCalled: boolean;
        };
      };
      application: {
        committed: boolean;
        delta: { openEvidenceQuestions: number; resolvedEvidenceQuestions: number };
        before: { summary: { openEvidenceQuestions: number } };
        after: { summary: { openEvidenceQuestions: number; operationsExecuted: number } };
        safety: { cardMutationProhibited: boolean; decisionLedgerOnly: boolean };
      };
    };
    expect(payload.source.liveSources).toEqual({
      gmailLiveApiCalled: false,
      mailerLiteLiveApiCalled: false,
      googleDriveLiveApiCalled: false,
    });
    expect(payload.application.committed).toBe(false);
    expect(payload.application.before.summary.openEvidenceQuestions).toBe(1);
    expect(payload.application.after.summary.openEvidenceQuestions).toBe(0);
    expect(payload.application.after.summary.operationsExecuted).toBe(0);
    expect(payload.application.delta).toMatchObject({
      openEvidenceQuestions: -1,
      resolvedEvidenceQuestions: 1,
    });
    expect(payload.application.safety).toMatchObject({
      cardMutationProhibited: true,
      decisionLedgerOnly: true,
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
    expect(serialized).not.toContain(localRootPath);
    expect(serialized).not.toContain(decisionLedgerPath);
  });

  test("requires text, decisions, and approvedBy for committed writes", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const { decisionLedgerPath } = await makeFixture();

    const missingText = mockRes();
    await handler({
      method: "POST",
      query: { decisionLedgerPath },
      body: { decisions: [{ candidateEmail: "x@example.com", selectedOptionId: "ignore_candidate" }] },
      headers: {},
    } as MockReq, missingText as never);
    expect(missingText.statusCode).toBe(400);
    expect(missingText.body).toEqual({ ok: false, error: "evidence_approval_application_text_required" });

    const missingApprover = mockRes();
    await handler({
      method: "POST",
      query: { decisionLedgerPath },
      body: {
        text: "CRM: Amalia de Bedud es estudiante de yoga.",
        decisions: [{ candidateEmail: "amaliadbg@hotmail.com", selectedOptionId: "confirm_email_for_subject" }],
        commit: true,
      },
      headers: {},
    } as MockReq, missingApprover as never);
    expect(missingApprover.statusCode).toBe(400);
    expect(missingApprover.body).toEqual({ ok: false, error: "evidence_approval_application_approved_by_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
