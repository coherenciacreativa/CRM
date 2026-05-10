import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/operator-capabilities.js";

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

afterEach(() => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
});

describe("/api/crm-vnext/operator-capabilities", () => {
  test("serves the safe operator capability map without reading person artifacts", () => {
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    handler({ method: "GET", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const capabilities = (res.body as { capabilities: { mode: string; apiEndpoints: Array<{ id: string; method: string; outbound: boolean }>; safety: { outboundProhibited: boolean } } }).capabilities;
    expect(capabilities.mode).toBe("read_only_operator_capabilities");
    expect(capabilities.apiEndpoints).toContainEqual(
      expect.objectContaining({
        id: "operator_capabilities",
        method: "GET",
        outbound: false,
      }),
    );
    expect(capabilities.safety.outboundProhibited).toBe(true);
    expect(JSON.stringify(res.body)).not.toContain("/Users/");
    expect(JSON.stringify(res.body)).not.toContain(".openclaw");
  });

  test("fails closed in production when no internal token is configured", () => {
    process.env.NODE_ENV = "production";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    handler({ method: "GET", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(503);
    expect(res.body).toEqual({ ok: false, error: "internal_token_not_configured" });
  });

  test("rejects non-GET methods", () => {
    const res = mockRes();

    handler({ method: "POST", query: {}, headers: {} } as MockReq, res as never);

    expect(res.statusCode).toBe(405);
    expect(res.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
