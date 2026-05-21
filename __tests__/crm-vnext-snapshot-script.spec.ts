import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";

const execFileAsync = promisify(execFile);

const scriptPath = resolve("scripts/crm-vnext-snapshot.mjs");

const makeRepo = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-snapshot-repo-"));
  await mkdir(join(dir, ".crm-vnext/person-card-store"), { recursive: true });
  await mkdir(join(dir, ".crm-vnext/card-write-apply"), { recursive: true });
  await mkdir(join(dir, ".crm-vnext/backups/card-write-apply"), { recursive: true });
  await writeFile(join(dir, ".crm-vnext/person-card-store/person-cards-vnext.json"), JSON.stringify({
    schemaVersion: "crm-vnext-person-card-store-2026-05-10",
    cards: [
      {
        personId: "email:private@example.com",
        displayName: "Private Person",
        identities: { email: "private@example.com" },
      },
    ],
  }, null, 2));
  await writeFile(join(dir, ".crm-vnext/card-write-apply/ledger.jsonl"), "{\"ok\":true}\n");
  await writeFile(join(dir, ".crm-vnext/backups/card-write-apply/store.bak"), "private@example.com\n");
  return dir;
};

describe("CRM vNext snapshot script", () => {
  test("creates encrypted cloud snapshot and verifies restore without leaking CRM data", async () => {
    const repo = await makeRepo();
    const localDir = join(repo, "local-snapshots");
    const destDir = join(repo, "cloud-snapshots");
    const reportsDir = join(repo, "reports");
    try {
      const { stdout } = await execFileAsync("node", [
        scriptPath,
        "--repo-root",
        repo,
        "--local-dir",
        localDir,
        "--dest-dir",
        destDir,
        "--reports-dir",
        reportsDir,
        "--verify",
      ], {
        cwd: repo,
        env: {
          ...process.env,
          CRM_VNEXT_SNAPSHOT_SECRET: "test-only-secret",
        },
        maxBuffer: 4 * 1024 * 1024,
      });

      const compact = JSON.parse(stdout);
      expect(compact.ok).toBe(true);
      expect(compact.cards).toBe(1);
      expect(compact.verify).toMatchObject({
        ok: true,
        restoredCardCount: 1,
        plaintextSha256Matches: true,
      });
      expect(compact.cloudPath).toContain(destDir);
      expect(compact.safety).toMatchObject({
        cloudCopyEncryptedOnly: true,
        crmPersonalContentPrinted: false,
        encryptionSecretPrinted: false,
        outboundPerformed: false,
        externalMutationsPerformed: false,
      });

      const encrypted = await readFile(compact.cloudPath);
      expect(encrypted.toString("utf8")).not.toContain("private@example.com");
      expect(encrypted.toString("utf8")).not.toContain("Private Person");

      const report = JSON.parse(await readFile(compact.report.jsonPath, "utf8"));
      const markdown = await readFile(compact.report.markdownPath, "utf8");
      const serialized = `${stdout}\n${JSON.stringify(report)}\n${markdown}`;
      expect(serialized).not.toContain("private@example.com");
      expect(serialized).not.toContain("Private Person");
      expect(serialized).not.toContain("test-only-secret");
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });

  test("blocks when no snapshot secret is configured", async () => {
    const repo = await makeRepo();
    try {
      let error: unknown;
      try {
        await execFileAsync("node", [
          scriptPath,
          "--repo-root",
          repo,
          "--no-cloud-copy",
        ], {
          cwd: repo,
          env: {
            ...process.env,
            CRM_VNEXT_SNAPSHOT_SECRET: "",
            CRM_VNEXT_SNAPSHOT_KEYCHAIN_SERVICE: "missing-test-service",
            CRM_VNEXT_SNAPSHOT_KEYCHAIN_ACCOUNT: "missing-test-account",
          },
          maxBuffer: 4 * 1024 * 1024,
        });
      } catch (caught) {
        error = caught;
      }

      expect(error).toBeTruthy();
      expect((error as { stderr: string }).stderr).toContain("snapshot_secret_missing");
    } finally {
      await rm(repo, { recursive: true, force: true });
    }
  });
});
