import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const execFileAsync = promisify(execFile);
const NOW = "2026-05-14T12:00:00.000Z";

describe("CRM vNext context fact apply script", () => {
  test("appends explicitly approved context evidence with backup and ledger", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-context-fact-apply-"));
    try {
      const cardStorePath = join(dir, "person-cards-vnext.json");
      const proposalPath = join(dir, "context-proposals.json");
      const ledgerPath = join(dir, "ledger.jsonl");
      const backupDir = join(dir, "backups");
      const outPath = join(dir, "apply-report.json");

      const martha = buildPersonCardVNext({
        personId: "email:martha.otremba@icloud.com",
        displayName: "Martha Otremba",
        now: NOW,
        identities: {
          email: "martha.otremba@icloud.com",
          instagramHandle: "marthaotremba",
          country: "Alemania",
        },
        evidence: [{ source: "existing-card", observedAt: NOW, note: "Initial identity bridge." }],
      });
      const edwin = buildPersonCardVNext({
        personId: "email:edwclaros1998@gmail.com",
        displayName: "Edwin Velasquez",
        now: NOW,
        identities: {
          email: "edwclaros1998@gmail.com",
          phone: "+573108010473",
          city: "Bogotá",
          country: "Colombia",
        },
        evidence: [{ source: "existing-card", observedAt: NOW, note: "Initial lead capture." }],
      });

      await writeFile(cardStorePath, `${JSON.stringify({
        schemaVersion: "crm-vnext-person-card-store-2026-05-10",
        generatedAt: NOW,
        base: {
          kind: "vnext-card-store",
          sourceKind: "previous-vnext-card-store",
          cardsBeforeApply: 2,
        },
        cards: [martha, edwin],
        mergeReviewQueue: [],
        provenance: [],
      }, null, 2)}\n`, "utf8");

      await writeFile(proposalPath, JSON.stringify({
        schemaVersion: "crm-vnext-context-fact-proposals-2026-05-14",
        generatedAt: NOW,
        summary: { proposals: 2 },
        proposals: [
          {
            proposalId: "context_fact_martha_kamadhenu",
            targetPersonId: "email:martha.otremba@icloud.com",
            target: {
              displayName: "Martha Otremba",
              email: "martha.otremba@icloud.com",
              instagramHandle: "marthaotremba",
              currentEvidenceCount: 1,
            },
            contextKind: "origin_story",
            statement: "Onboarding IG-origin: vínculo previo con Kamadhenu; experiencia maravillosa e inolvidable.",
            confidence: "high",
            sensitivity: "normal",
            promotionAction: "promote_to_card_evidence",
            suggestedCardEvidence: {
              source: "crm-vnext-context-fact-proposals:lead_capture_export:martha",
              observedAt: NOW,
              note: "Onboarding IG-origin: vínculo previo con Kamadhenu; experiencia maravillosa e inolvidable.",
            },
          },
          {
            proposalId: "context_fact_edwin_missing_handle",
            targetPersonId: "email:edwclaros1998@gmail.com",
            target: {
              displayName: "Edwin Velasquez",
              email: "edwclaros1998@gmail.com",
              currentEvidenceCount: 1,
            },
            contextKind: "identity_gap",
            statement: "Email appeared in search; handle not recoverable from visible UI.",
            confidence: "medium",
            sensitivity: "normal",
            promotionAction: "hold_review_only",
            suggestedCardEvidence: null,
          },
        ],
      }), "utf8");

      const dryRun = await execFileAsync("node", [
        "scripts/crm-vnext-context-fact-apply.mjs",
        "--proposal-file",
        proposalPath,
        "--proposal-id",
        "context_fact_martha_kamadhenu",
        "--card-store-path",
        cardStorePath,
        "--ledger-path",
        ledgerPath,
        "--backup-dir",
        backupDir,
        "--out",
        outPath,
      ], { cwd: process.cwd() });
      const dryPayload = JSON.parse(dryRun.stdout);
      expect(dryPayload.summary).toMatchObject({
        selectedItems: 1,
        readyToCommit: 1,
        operationsExecuted: 0,
        committed: false,
      });

      await execFileAsync("node", [
        "scripts/crm-vnext-context-fact-apply.mjs",
        "--proposal-file",
        proposalPath,
        "--proposal-id",
        "context_fact_martha_kamadhenu",
        "--card-store-path",
        cardStorePath,
        "--ledger-path",
        ledgerPath,
        "--backup-dir",
        backupDir,
        "--approved-by",
        "Alejandro",
        "--write",
        "--fail-on-blocked",
      ], { cwd: process.cwd() });

      const updatedStore = JSON.parse(await readFile(cardStorePath, "utf8"));
      const updatedMartha = updatedStore.cards.find((card: { personId: string }) =>
        card.personId === "email:martha.otremba@icloud.com"
      );
      expect(updatedMartha.evidence).toHaveLength(2);
      expect(updatedMartha.evidence[1].note).toContain("Kamadhenu");
      expect(updatedStore.provenance).toHaveLength(1);

      const ledger = (await readFile(ledgerPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
      expect(ledger).toHaveLength(1);
      expect(ledger[0]).toMatchObject({
        schemaVersion: "crm-vnext-context-fact-apply-ledger-entry-2026-05-14",
        proposalId: "context_fact_martha_kamadhenu",
        targetPersonId: "email:martha.otremba@icloud.com",
        committedBy: "Alejandro",
      });
      expect(await readdir(backupDir)).toHaveLength(1);

      const blocked = await execFileAsync("node", [
        "scripts/crm-vnext-context-fact-apply.mjs",
        "--proposal-file",
        proposalPath,
        "--proposal-id",
        "context_fact_edwin_missing_handle",
        "--card-store-path",
        cardStorePath,
        "--ledger-path",
        ledgerPath,
        "--backup-dir",
        backupDir,
        "--approved-by",
        "Alejandro",
        "--write",
      ], { cwd: process.cwd() });
      const blockedPayload = JSON.parse(blocked.stdout);
      expect(blockedPayload.summary).toMatchObject({
        committed: false,
        commitBlocked: true,
      });
      expect(blockedPayload.summary.commitBlockers).toContain("blocked_not_promotable");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});

