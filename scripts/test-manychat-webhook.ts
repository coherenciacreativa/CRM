export {};

process.env.SUPABASE_URL = 'https://example.supabase.co';
process.env.SUPABASE_SERVICE_ROLE = 'dummy-service-role-key';
process.env.SUPABASE_URL_CRM = process.env.SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_CRM = process.env.SUPABASE_SERVICE_ROLE;
process.env.MAILERLITE_API_KEY = 'dummy-mailerlite-key';
process.env.MAILERLITE_GROUP_IDS = '12345';
process.env.MAILERLITE_DEFAULT_NOTES = 'Automated test note';
delete process.env.ALERT_WEBHOOK_URL;

type MockReq = {
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

class MockRes {
  statusCode = 200;
  body: unknown = undefined;

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  json(data: unknown) {
    this.body = data;
    return this;
  }
}

type FetchInput = string | URL | Request;

type FetchHandler = (input: FetchInput, init?: RequestInit) => Promise<Response>;

const originalFetch: FetchHandler = globalThis.fetch as FetchHandler;

const webhookEventStore: Record<string, Record<string, unknown>> = {};
let webhookEventCounter = 0;

globalThis.fetch = (async (input: FetchInput, init?: RequestInit) => {
  const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;

  if (url.includes('/rest/v1/webhook_events')) {
    const method = (init?.method ?? 'GET').toUpperCase();

    if (method === 'POST') {
      const body = init?.body ? JSON.parse(init.body as string) : [{}];
      const incoming = Array.isArray(body) && body.length ? body[0] : {};
      webhookEventCounter += 1;
      const id = `we-${webhookEventCounter}`;
      const stored = { id, ...incoming } as Record<string, unknown>;
      webhookEventStore[id] = stored;
      const dedupeKey = typeof incoming.dedupe_key === 'string' ? incoming.dedupe_key : null;
      if (dedupeKey) {
        webhookEventStore[dedupeKey] = stored;
      }
      return new Response(JSON.stringify([stored]), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'PATCH') {
      const parsedUrl = new URL(url);
      const patchBody = init?.body ? JSON.parse(init.body as string) : {};
      const idFilter = parsedUrl.searchParams.get('id');
      const dedupeFilter = parsedUrl.searchParams.get('dedupe_key');
      let target: Record<string, unknown> | undefined;
      if (idFilter?.startsWith('eq.')) {
        const key = idFilter.slice(3);
        target = webhookEventStore[key];
      }
      if (!target && dedupeFilter?.startsWith('eq.')) {
        const key = dedupeFilter.slice(3);
        target = webhookEventStore[key];
      }
      if (!target) {
        return new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      Object.assign(target, patchBody);
      return new Response(JSON.stringify([target]), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (method === 'GET') {
      const parsedUrl = new URL(url);
      const limitParam = Number(parsedUrl.searchParams.get('limit') ?? '20') || 20;
      const items = Object.values(webhookEventStore)
        .filter((item) => typeof item.id === 'string' && (item as { id: string }).id.startsWith('we-'))
        .slice(0, limitParam);
      return new Response(JSON.stringify(items), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  if (url.includes('/rest/v1/contacts')) {
    const body = init?.body ? JSON.parse(init.body as string) : [{}];
    const incoming = Array.isArray(body) && body.length ? body[0] : {};
    return new Response(
      JSON.stringify([
        {
          id: 'contact-123',
          ...incoming,
        },
      ]),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (url.includes('/rest/v1/interactions')) {
    return new Response(JSON.stringify([{ id: 'interaction-456' }]), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (url.includes('connect.mailerlite.com')) {
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return originalFetch ? originalFetch(input, init) : new Response(null, { status: 200 });
}) as FetchHandler;

const { default: handler } = await import('../api/manychat-webhook.ts');

const dmVariants = [
  {
    label: 'Case A – email on following line',
    message: '¡Hola!\nsepulvedamorajennifer@gmail.com',
  },
  {
    label: 'Case B – hotmail upper-case',
    message: 'Si Gracias\nVind182@hotmail.com',
  },
  {
    label: 'Case C – email only',
    message: 'saludoalsol+check@example.com',
  },
  {
    label: 'Basic lead',
    message:
      'Hola, soy Ana. Mi correo es saludoalsol+testcrm1@gmail.com y vivo en Bogotá, Colombia. Me interesa el programa, gracias!',
  },
  {
    label: 'Multiline with emoji',
    message:
      'Hola!\nQuiero más info 🙏\nEmail: saludoalsol+testcrm2@gmail.com\nTel: +57 300 123 4567',
  },
  {
    label: 'Inline quotes and punctuation',
    message:
      '"Saludos" desde Lima — puedes escribirme a saludoalsol+testcrm3@gmail.com. ¡Gracias!',
  },
  {
    label: 'Extra whitespace and mixed casing',
    message:
      '    Hola equipo, Mi Correo ES   SaludoAlSol+TestCRM4@gmail.com   , necesito detalles del retiro.',
  },
  {
    label: 'Embedded JSON-like text',
    message:
      '{"name":"Carlos"} correo: saludoalsol+testcrm5@gmail.com ciudad: Quito, Ecuador',
  },
];

const buildPayload = (variant: { label: string; message: string }, index: number) => ({
  event: 'instagram_dm',
  timestamp: Date.now(),
  source: 'instagram',
  contact: {
    id: `contact-${index + 1}`,
    name: 'Test Prospect',
    first_name: 'Test',
    last_name: `Prospect ${index + 1}`,
    instagram_username: `test_prospect_${index + 1}`,
    custom_fields: [
      {
        id: 1,
        name: 'last_text_input',
        value: variant.message,
      },
    ],
  },
  message: {
    text: variant.message,
    type: 'text',
  },
  data: {
    channel: 'instagram',
  },
});

const runTest = async () => {
  const results: Array<Record<string, unknown>> = [];

  for (const [index, variant] of dmVariants.entries()) {
    const payload = buildPayload(variant, index);

    const reqString: MockReq = {
      method: 'POST',
      headers: {},
      body: JSON.stringify(payload),
    };
    const resString = new MockRes();

    await handler(reqString as any, resString as any);

    results.push({
      label: `${variant.label} (string body)`,
      status: resString.statusCode,
      response: resString.body,
    });

    const reqObject: MockReq = {
      method: 'POST',
      headers: {},
      body: payload,
    };
    const resObject = new MockRes();

    await handler(reqObject as any, resObject as any);

    results.push({
      label: `${variant.label} (object body)`,
      status: resObject.statusCode,
      response: resObject.body,
    });
  }

  return results;
};

runTest()
  .then((results) => {
    console.log('\nManyChat webhook DM simulation results:\n');
    for (const result of results) {
      console.log(`- ${result.label}: HTTP ${result.status}`);
      console.log(`  Payload: ${JSON.stringify(result.response)}`);
    }
    process.exit(0);
  })
  .catch((error) => {
    console.error('Simulation failed', error);
    process.exit(1);
  });
