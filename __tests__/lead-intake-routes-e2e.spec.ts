import { afterEach, describe, expect, it, vi } from 'vitest';
import parseNameHandler from '../pages/api/parse-name';
import detectEmailHandler from '../api/detect-email';
import perfectWeekLeadHandler from '../pages/api/perfect-week/lead';
import manychatWebhookHandler from '../api/manychat-webhook';

type MockRes = {
  statusCode: number;
  headers: Record<string, string | string[]>;
  body: unknown;
  ended: boolean;
  status: (code: number) => MockRes;
  json: (payload: unknown) => MockRes;
  setHeader: (name: string, value: string | string[]) => void;
  end: () => MockRes;
};

function createMockRes(): MockRes {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    ended: false,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
    setHeader(name: string, value: string | string[]) {
      this.headers[name] = value;
    },
    end() {
      this.ended = true;
      return this;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  delete process.env.MAILERLITE_API_KEY;
  delete process.env.PERFECT_WEEK_GROUP_ID;
  delete process.env.PERFECT_WEEK_EMAIL0_GROUP_ID;
  delete process.env.PERFECT_WEEK_FORM_SOURCE;
  delete process.env.PERFECT_WEEK_SENDER_NAME;
  delete process.env.DEBUG_TOKEN;
});

describe('Lead intake hardening routes (sandbox e2e-style)', () => {
  it('A) /api/detect-email accepts payload variants and extracts normalized email', async () => {
    const req = {
      method: 'POST',
      body: {
        payload: {
          dm_buffer: 'Hola, mi correo es CAMILA.LOPEZ+demo@Example.com.',
        },
      },
    } as any;
    const res = createMockRes() as any;

    await detectEmailHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      hasEmail: true,
      email: 'CAMILA.LOPEZ+demo@Example.com',
      emails: ['CAMILA.LOPEZ+demo@Example.com'],
    });
  });

  it('B) /api/perfect-week/lead rejects invalid input (privacy not accepted)', async () => {
    const req = {
      method: 'POST',
      body: {
        name: 'Camila López',
        email: 'camila@example.com',
        acceptedPrivacy: false,
      },
    } as any;
    const res = createMockRes() as any;

    await perfectWeekLeadHandler(req, res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toMatchObject({
      ok: false,
      error: 'privacy_required',
    });
  });

  it('C) /api/parse-name parses full name in one line (name + lastname)', async () => {
    const req = {
      method: 'POST',
      body: {
        data: {
          last_text_input: 'Hola, mi nombre es Camila López',
        },
      },
    } as any;
    const res = createMockRes() as any;

    parseNameHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
      hasSurname: true,
      firstName: 'Camila',
      lastName: 'López',
      normalized: 'Camila López',
    });
  });

  it('D) /api/manychat-webhook tolerates missing phone (simulate+dry) and still resolves lead', async () => {
    process.env.DEBUG_TOKEN = 'sandbox-token';

    const req = {
      method: 'POST',
      query: { simulate: '1', dry: '1' },
      headers: {
        'x-debug-token': 'sandbox-token',
      },
      body: {
        event: 'message_received',
        contact: { id: '998877' },
        full_name: 'Camila López',
        instagram_username: 'camila.lopez',
        last_text_input: 'Hola, mi correo es camila@example.com',
      },
    } as any;
    const res = createMockRes() as any;

    await manychatWebhookHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      dry: true,
      finalName: 'Camila López',
    });

    const wouldWrite = (res.body as any).would_write as Record<string, unknown>;
    expect(Object.prototype.hasOwnProperty.call(wouldWrite, 'phone')).toBe(false);
    expect((res.body as any).mailerlite_plan?.phone ?? '').toBe('');
  });

  it('A-valid sanity) /api/perfect-week/lead accepts valid payload without phone', async () => {
    process.env.MAILERLITE_API_KEY = 'ml-key';
    process.env.PERFECT_WEEK_GROUP_ID = '1234567';
    process.env.PERFECT_WEEK_EMAIL0_GROUP_ID = '7654321';

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: { id: 'sub-1' } }),
    } as Response);

    const req = {
      method: 'POST',
      body: {
        name: 'Camila López',
        email: 'camila@example.com',
        acceptedPrivacy: true,
      },
    } as any;
    const res = createMockRes() as any;

    await perfectWeekLeadHandler(req, res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toMatchObject({
      ok: true,
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
