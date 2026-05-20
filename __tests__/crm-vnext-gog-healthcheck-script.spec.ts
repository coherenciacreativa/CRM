import { execFile } from "node:child_process";
import { chmod, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const writeFakeGog = async (dir: string, mode: "ok" | "invalid_grant") => {
  const path = join(dir, "fake-gog.mjs");
  await writeFile(
    path,
    `#!/usr/bin/env node
const args = process.argv.slice(2);
const emit = (value) => console.log(JSON.stringify(value));
if (${JSON.stringify(mode)} === 'invalid_grant') {
  console.error('oauth2: "invalid_grant" "Token has been expired or revoked."');
  process.exit(1);
}
if (args[0] === 'auth' && args[1] === 'list') {
  emit({ accounts: [{ email: 'saludoalsol@gmail.com', valid: true }] });
} else if (args[0] === 'people' && args[1] === 'me') {
  emit({ email: 'saludoalsol@gmail.com' });
} else if (args[0] === 'gmail' && args[1] === 'search') {
  emit({ threads: [{ id: 'thread-1', subject: 'PRIVATE SUBJECT SHOULD NOT LEAK' }] });
} else if (args[0] === 'contacts' && args[1] === 'list') {
  emit({ connections: [{ names: [{ displayName: 'Private Person' }] }] });
} else if (args[0] === 'drive' && args[1] === 'search' && args.join(' ').includes('document')) {
  emit({ files: [{ id: 'doc-1', name: 'Private Doc Name' }] });
} else if (args[0] === 'docs' && args[1] === 'info') {
  emit({ documentId: 'doc-1', title: 'Private Doc Name' });
} else if (args[0] === 'drive' && args[1] === 'search' && args.join(' ').includes('spreadsheet')) {
  emit({ files: [{ id: 'sheet-1', name: 'Private Sheet Name' }] });
} else if (args[0] === 'sheets' && args[1] === 'metadata') {
  emit({ spreadsheetId: 'sheet-1', properties: { title: 'Private Sheet Name' } });
} else {
  console.error('unexpected args: ' + args.join(' '));
  process.exit(1);
}
`,
    "utf8",
  );
  await chmod(path, 0o755);
  return path;
};

describe("CRM vNext gog healthcheck script", () => {
  test("reports healthy gog lanes without leaking personal content", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-gog-healthcheck-"));
    try {
      await mkdir(dir, { recursive: true });
      const fakeGog = await writeFakeGog(dir, "ok");
      const out = join(dir, "health.json");
      const markdownOut = join(dir, "health.md");

      const { stdout } = await execFileAsync("node", [
        "scripts/crm-vnext-gog-healthcheck.mjs",
        "--gog-bin",
        fakeGog,
        "--account",
        "saludoalsol@gmail.com",
        "--out",
        out,
        "--markdown-out",
        markdownOut,
        "--fail-on-blocked",
      ], { cwd: process.cwd() });

      const compact = JSON.parse(stdout);
      const report = JSON.parse(await readFile(out, "utf8"));
      const markdown = await readFile(markdownOut, "utf8");

      expect(compact.ok).toBe(true);
      expect(report.status).toBe("ok");
      expect(report.summary.blocked).toBe(0);
      expect(report.checks.map((item: { service: string }) => item.service)).toContain("gmail_search");
      expect(report.safety).toMatchObject({
        readOnly: true,
        personalContentPrinted: false,
        tokensPrinted: false,
        outboundPerformed: false,
        googleMutationsPerformed: false,
      });
      const serialized = `${stdout}\n${JSON.stringify(report)}\n${markdown}`;
      expect(serialized).not.toContain("PRIVATE SUBJECT");
      expect(serialized).not.toContain("Private Person");
      expect(serialized).not.toContain("Private Doc Name");
      expect(serialized).not.toContain("Private Sheet Name");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  test("classifies invalid_grant as a human unblock when requested to fail", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-gog-healthcheck-"));
    try {
      const fakeGog = await writeFakeGog(dir, "invalid_grant");
      let error: unknown;
      try {
        await execFileAsync("node", [
          "scripts/crm-vnext-gog-healthcheck.mjs",
          "--gog-bin",
          fakeGog,
          "--account",
          "saludoalsol@gmail.com",
          "--fail-on-blocked",
        ], { cwd: process.cwd() });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      const compact = JSON.parse((error as { stdout: string }).stdout);
      expect(compact.ok).toBe(false);
      expect(compact.status).toBe("blocked");
      expect(compact.blockedChecks[0]).toMatchObject({
        service: "auth_token_exchange",
        reason: "oauth_invalid_grant",
      });
      expect(compact.blockedChecks[0].unblockAction).toContain("gog auth add saludoalsol@gmail.com");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
