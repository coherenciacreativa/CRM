import { describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/fact-intake.js";

type MockReq = {
  method?: string;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

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

describe("/api/crm-vnext/fact-intake", () => {
  test("returns a dry-run draft for POST bodies", async () => {
    const res = mockRes();

    await handler({
      method: "POST",
      body: {
        text: "CRM: Ana Gomez es estudiante de yoga.",
        sourceKind: "alejandro_conversation",
        reporter: "Alejandro",
        channel: "codex",
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    expect((res.body as { draft: { mode: string; summary: { facts: number } } }).draft.mode).toBe("dry_run_fact_intake");
    expect((res.body as { draft: { summary: { facts: number } } }).draft.summary.facts).toBe(1);
  });

  test("rejects missing text", async () => {
    const res = mockRes();
    await handler({ method: "POST", body: {}, headers: {} } as MockReq, res as never);
    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ ok: false, error: "fact_intake_text_required" });
  });

  test("rejects non-POST methods", async () => {
    const res = mockRes();
    await handler({ method: "GET", body: {}, headers: {} } as MockReq, res as never);
    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
