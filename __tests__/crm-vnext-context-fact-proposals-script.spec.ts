import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, test } from "vitest";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const execFileAsync = promisify(execFile);
const NOW = "2026-05-14T12:00:00.000Z";

describe("CRM vNext context fact proposals script", () => {
  test("turns rich Mantis IG evidence into reviewed context proposals without writes", async () => {
    const dir = await mkdtemp(join(tmpdir(), "crm-vnext-context-facts-"));
    try {
      const evidencePath = join(dir, "evidence.json");
      const cardStorePath = join(dir, "person-cards-vnext.json");
      const outPath = join(dir, "context-proposals.json");
      const markdownPath = join(dir, "context-proposals.md");

      const cards = [
        buildPersonCardVNext({
          personId: "email:martha.otremba@icloud.com",
          displayName: "Martha Otremba",
          now: NOW,
          identities: {
            email: "martha.otremba@icloud.com",
            instagramHandle: "marthaotremba",
            country: "Alemania",
          },
          evidence: [{ source: "existing-card", observedAt: NOW, note: "Initial identity bridge." }],
        }),
        buildPersonCardVNext({
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
        }),
        buildPersonCardVNext({
          personId: "ig:_._only_lu_._",
          displayName: null,
          now: NOW,
          identities: { instagramHandle: "_._only_lu_._" },
          evidence: [{ source: "existing-card", observedAt: NOW, note: "Initial IG handle." }],
        }),
      ];

      await writeFile(cardStorePath, JSON.stringify({
        schemaVersion: "crm-vnext-person-card-store-2026-05-10",
        generatedAt: NOW,
        cards,
      }), "utf8");

      await writeFile(evidencePath, JSON.stringify({
        evidenceSources: [
          {
            sourceKind: "lead_capture_export",
            sourceId: "mantis_evidence:martha:lead_capture_export:4",
            title: "Mantis evidence for @marthaotremba",
            email: "martha.otremba@icloud.com",
            handle: "marthaotremba",
            text: [
              "Handle: @marthaotremba",
              "Name: Martha Otremba",
              "Email: martha.otremba@icloud.com",
              "Country: Alemania",
              "Confidence: high",
              "Finding: Onboarding IG-origin: vínculo previo con Kamadhenu; experiencia maravillosa e inolvidable; correo actualizado.",
              "flowName: Orgánico exitoso en 2025 / Instagram onboarding",
            ].join(" | "),
          },
          {
            sourceKind: "instagram_dm_ui_export",
            sourceId: "mantis_evidence:email_edwclaros1998_gmail_com:instagram_dm_ui_export:4",
            title: "Mantis evidence for Edwin Velasquez",
            email: "edwclaros1998@gmail.com",
            text: [
              "Name: Edwin Velasquez",
              "Email: edwclaros1998@gmail.com",
              "Phone: +573108010473",
              "City: Bogotá",
              "Country: Colombia",
              "Confidence: high",
              "Finding: Email appeared in search; handle not recoverable from visible UI.",
              "Finding: Email was visible in IG Messages search, but the UI did not expose a recoverable handle.",
            ].join(" | "),
          },
          {
            sourceKind: "instagram_dm_ui_export",
            sourceId: "mantis_evidence:_._only_lu_._:instagram_dm_ui_export:2",
            title: "Mantis evidence for @_._only_lu_._",
            handle: "_._only_lu_._",
            text: [
              "Handle: @_._only_lu_._",
              "Name: Rosalinda Ramirez",
              "Country: Guatemala",
              "Finding: A separate visible result shows Lu Márquez / 4 matched messages; identity relationship to @_._only_lu_._ is not proven and must not be auto-merged.",
            ].join(" | "),
          },
        ],
      }), "utf8");

      await execFileAsync("node", [
        "scripts/crm-vnext-context-fact-proposals.mjs",
        "--evidence-file",
        evidencePath,
        "--card-store-path",
        cardStorePath,
        "--out",
        outPath,
        "--markdown-out",
        markdownPath,
        "--fail-on-empty",
      ], { cwd: process.cwd() });

      const report = JSON.parse(await readFile(outPath, "utf8"));
      expect(report.mode).toBe("read_only_context_fact_proposals");
      expect(report.summary).toMatchObject({
        evidenceSourcesRead: 3,
        cardsAvailable: 3,
        proposals: 4,
        readyForHumanApproval: 1,
        reviewOnly: 3,
        operationsExecuted: 0,
        cardMutationReady: false,
      });

      const martha = report.proposals.find((proposal: { targetPersonId: string }) =>
        proposal.targetPersonId === "email:martha.otremba@icloud.com"
      );
      expect(martha).toMatchObject({
        contextKind: "origin_story",
        promotionAction: "promote_to_card_evidence",
        approvalRequired: true,
      });
      expect(martha.statement).toContain("Kamadhenu");
      expect(martha.suggestedCardEvidence.note).toContain("Kamadhenu");

      const edwinProposals = report.proposals.filter((proposal: { targetPersonId: string }) =>
        proposal.targetPersonId === "email:edwclaros1998@gmail.com"
      );
      expect(edwinProposals).toHaveLength(2);
      expect(edwinProposals.every((proposal: { contextKind: string; promotionAction: string }) =>
        proposal.contextKind === "identity_gap" && proposal.promotionAction === "hold_review_only"
      )).toBe(true);
      expect(edwinProposals[0]).toMatchObject({
        contextKind: "identity_gap",
        promotionAction: "hold_review_only",
      });
      expect(edwinProposals[0].suggestedCardEvidence).toBeNull();

      const onlyLu = report.proposals.find((proposal: { targetPersonId: string }) =>
        proposal.targetPersonId === "ig:_._only_lu_._"
      );
      expect(onlyLu).toMatchObject({
        contextKind: "review_only_collision",
        promotionAction: "hold_review_only",
      });
      expect(JSON.stringify(report)).not.toContain("/Users/");

      const markdown = await readFile(markdownPath, "utf8");
      expect(markdown).toContain("Ready For Approval");
      expect(markdown).toContain("Kamadhenu");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
