declare module '@vercel/node' {
  import type { IncomingMessage, ServerResponse } from 'http';

  export type VercelRequest = IncomingMessage & {
    query: Record<string, string | string[]>;
    body?: any;
    cookies: Record<string, string>;
  };

  export type VercelResponse = ServerResponse & {
    status: (statusCode: number) => VercelResponse;
    json: (body: any) => VercelResponse;
    send: (body: any) => VercelResponse;
  };
}
