import { execFile } from "node:child_process";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const readBody = async (req: IncomingMessage) => new Promise<string>((resolve) => {
  const chunks: Buffer[] = [];
  req.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
  req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
});

const startFakeMailerLite = async (mode: "ok" | "unauthenticated") => {
  const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
    await readBody(req);
    const auth = req.headers.authorization || "";
    if (mode === "unauthenticated" || auth !== "Bearer test-mailerlite-key") {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Unauthenticated." }));
      return;
    }

    const url = new URL(req.url || "/", "http://127.0.0.1");
    if (url.pathname === "/api/groups") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data: [{ id: "group-1", name: "PRIVATE GROUP SHOULD NOT LEAK" }] }));
      return;
    }

    if (url.pathname === "/api/subscribers") {
      const cursor = url.searchParams.get("cursor");
      const next = cursor ? null : `${url.origin}/api/subscribers?cursor=next-page&limit=2`;
      const data = cursor
        ? [{ id: "sub-3", email: "private3@example.com", fields: { name: "Private Three" } }]
        : [
          { id: "sub-1", email: "private1@example.com", fields: { name: "Private One" } },
          { id: "sub-2", email: "private2@example.com", fields: { name: "Private Two" } },
        ];
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ data, links: { next } }));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "not found" }));
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("fake_server_missing_port");
  return {
    apiBase: `http://127.0.0.1:${address.port}/api`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
};

describe("CRM vNext MailerLite healthcheck script", () => {
  test("reports healthy MailerLite lane without leaking subscriber content", async () => {
    const fake = await startFakeMailerLite("ok");
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-mailerlite-healthcheck-"));
    try {
      await mkdir(dir, { recursive: true });
      const out = join(dir, "health.json");
      const markdownOut = join(dir, "health.md");

      const { stdout } = await execFileAsync("node", [
        "scripts/crm-vnext-mailerlite-healthcheck.mjs",
        "--service",
        "__missing__",
        "--account",
        "__missing__",
        "--api-base",
        fake.apiBase,
        "--limit",
        "2",
        "--out",
        out,
        "--markdown-out",
        markdownOut,
        "--fail-on-blocked",
      ], {
        cwd: process.cwd(),
        env: { ...process.env, MAILERLITE_API_KEY: "test-mailerlite-key" },
      });

      const compact = JSON.parse(stdout);
      const report = JSON.parse(await readFile(out, "utf8"));
      const markdown = await readFile(markdownOut, "utf8");

      expect(compact.ok).toBe(true);
      expect(report.status).toBe("ok");
      expect(report.summary.blocked).toBe(0);
      expect(report.summary.subscriberPages).toBe(2);
      expect(report.summary.subscribersScanned).toBe(3);
      expect(report.safety).toMatchObject({
        readOnly: true,
        personalContentPrinted: false,
        tokensPrinted: false,
        outboundPerformed: false,
        mailerLiteMutationsPerformed: false,
        subscriberRowsPrinted: false,
      });
      const serialized = `${stdout}\n${JSON.stringify(report)}\n${markdown}`;
      expect(serialized).not.toContain("private1@example.com");
      expect(serialized).not.toContain("Private One");
      expect(serialized).not.toContain("PRIVATE GROUP SHOULD NOT LEAK");
      expect(serialized).not.toContain("test-mailerlite-key");
    } finally {
      await fake.close();
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("classifies 401 as a credential unblock", async () => {
    const fake = await startFakeMailerLite("unauthenticated");
    try {
      let error: unknown;
      try {
        await execFileAsync("node", [
          "scripts/crm-vnext-mailerlite-healthcheck.mjs",
          "--service",
          "__missing__",
          "--account",
          "__missing__",
          "--api-base",
          fake.apiBase,
          "--fail-on-blocked",
        ], {
          cwd: process.cwd(),
          env: { ...process.env, MAILERLITE_API_KEY: "test-mailerlite-key" },
        });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      const compact = JSON.parse((error as { stdout: string }).stdout);
      expect(compact.ok).toBe(false);
      expect(compact.status).toBe("blocked");
      expect(compact.blockedChecks[0]).toMatchObject({
        service: "groups_probe",
        reason: "mailerlite_unauthenticated",
      });
      expect(compact.blockedChecks[0].unblockAction).toContain("Refresh the MailerLite API key");
    } finally {
      await fake.close();
    }
  });
});
