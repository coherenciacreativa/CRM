import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, test } from "vitest";
import handler from "../pages/api/crm-vnext/card-write-approval-packet.js";

type MockReq = {
  method?: string;
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
  socket?: {
    remoteAddress?: string;
  };
};

const NOW = "2026-05-10T12:00:00.000Z";

const originalEnv = {
  NODE_ENV: process.env.NODE_ENV,
  CRM_VNEXT_INSIGHTS_TOKEN: process.env.CRM_VNEXT_INSIGHTS_TOKEN,
};

let dirs: string[] = [];

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

afterEach(async () => {
  process.env.NODE_ENV = originalEnv.NODE_ENV;
  if (originalEnv.CRM_VNEXT_INSIGHTS_TOKEN === undefined) delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
  else process.env.CRM_VNEXT_INSIGHTS_TOKEN = originalEnv.CRM_VNEXT_INSIGHTS_TOKEN;
  await Promise.all(dirs.map((dir) => rm(dir, { recursive: true, force: true })));
  dirs = [];
});

const makeFixture = async () => {
  const dir = await mkdtemp(join(tmpdir(), "crm-vnext-card-write-approval-packet-api-"));
  dirs.push(dir);
  const sourcePath = join(dir, "person-cards-v1.json");
  const mailerBridgePath = join(dir, "mailer-ig-bridge.candidates.enriched.csv");
  const localRootPath = join(dir, "memory");
  const decisionLedgerPath = join(dir, "evidence-review-decisions.jsonl");
  const cardStorePath = join(dir, "person-cards-vnext.json");
  await mkdir(localRootPath, { recursive: true });
  await writeFile(sourcePath, JSON.stringify({ generatedAt: NOW, cards: [] }), "utf8");
  await writeFile(
    cardStorePath,
    JSON.stringify({
      schemaVersion: "crm-vnext-person-card-store-2026-05-10",
      generatedAt: NOW,
      base: {
        kind: "vnext-card-store",
        sourceKind: "legacy-person-cards-v1-derived",
        cardsBeforeApply: 0,
      },
      cards: [],
      mergeReviewQueue: [],
      provenance: [],
    }),
    "utf8",
  );
  await writeFile(
    mailerBridgePath,
    "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status\n",
    "utf8",
  );
  await writeFile(join(localRootPath, "WORKLOG.md"), "No private path here.", "utf8");
  await writeFile(decisionLedgerPath, "", "utf8");
  return { dir, sourcePath, cardStorePath, mailerBridgePath, localRootPath, decisionLedgerPath };
};

describe("/api/crm-vnext/card-write-approval-packet", () => {
  test("serves read-only approval packets without live sources or path leaks", async () => {
    const { dir, sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    const res = mockRes();

    await handler({
      method: "POST",
      query: { sourcePath, mailerBridgePath, localRootPath, decisionLedgerPath },
      body: {
        text: "CRM: @mayuyis2626 es Mayerli, estudiante de yoga y asistente a retiros con su familia.",
        sourceKind: "alejandro_conversation",
        evidenceSources: [
          {
            sourceKind: "retreat_table",
            sourceId: "google-drive:retiro-junio:row-7",
            snippet: [
              "Name: Gladys Mayerli Garcia Ortegon",
              "Email: mayaariana@hotmail.com",
              "Phone: 3115381341",
              "Context: Retiro familiar: Ariana Catalina Torres Garcia comparte correo.",
              "Email ownership review required: email may belong to a family member or companion.",
            ].join(" "),
          },
        ],
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    expect((res.body as { ok?: boolean }).ok).toBe(true);
    const payload = res.body as {
      source: {
        liveSources: {
          gmailLiveApiCalled: boolean;
          mailerLiteLiveApiCalled: boolean;
          googleDriveLiveApiCalled: boolean;
        };
      };
      packet: {
        summary: { items: number; blockedOpenEvidenceQuestions: number; operationsExecuted: number };
        approvalItems: Array<{ status: string; operationsExecuted: number }>;
        safety: { cardMutationProhibited: boolean; approvalPacketOnly: boolean };
      };
    };
    expect(payload.source.liveSources).toEqual({
      gmailLiveApiCalled: false,
      mailerLiteLiveApiCalled: false,
      googleDriveLiveApiCalled: false,
    });
    expect(payload.packet.summary).toMatchObject({
      items: 1,
      blockedOpenEvidenceQuestions: 1,
      operationsExecuted: 0,
    });
    expect(payload.packet.approvalItems[0]).toMatchObject({
      status: "blocked_open_evidence_questions",
      operationsExecuted: 0,
    });
    expect(payload.packet.safety).toMatchObject({
      cardMutationProhibited: true,
      approvalPacketOnly: true,
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(mailerBridgePath);
    expect(serialized).not.toContain(localRootPath);
  });

  test("uses the vNext card store to enrich existing cards without re-asking existing email ownership", async () => {
    const { dir, sourcePath, cardStorePath, mailerBridgePath, localRootPath, decisionLedgerPath } = await makeFixture();
    process.env.NODE_ENV = "test";
    delete process.env.CRM_VNEXT_INSIGHTS_TOKEN;
    await writeFile(
      cardStorePath,
      JSON.stringify({
        schemaVersion: "crm-vnext-person-card-store-2026-05-10",
        generatedAt: NOW,
        base: {
          kind: "vnext-card-store",
          sourceKind: "previous-vnext-card-store",
          cardsBeforeApply: 1,
        },
        cards: [
          {
            schemaVersion: "person-card-vnext-2026-05-08",
            personId: "email:eli.cadavid@hotmail.com",
            displayName: "Eliana Cadavid",
            identities: {
              email: "eli.cadavid@hotmail.com",
              instagramHandle: "cadavid_eli",
              instagramUserId: null,
              phone: "+573104954266",
              city: null,
              country: null,
            },
            channels: {
              email: { present: true, status: null },
              instagram: { present: true, status: null },
              whatsapp: { present: false, status: null },
              telegram: { present: false, status: null },
            },
            products: {
              yogaClasses90d: 1,
              happyCircle90d: 1,
              retreatsAttended: 0,
              totalSpend: 0,
              purchaseCount: 0,
              activeClient: false,
            },
            scoring: {
              stage: "SEMILLA",
              priorityScore: 11,
              commercialWarmth: 3,
              communityDepth: 8,
              relationshipEngagement: 5,
              dataConfidence: 80,
              productFit: {
                yoga: 21,
                mentorship: 0,
                therapy: 0,
                digitalProducts: 0,
                retreats: 0,
              },
              nextBestAction: "keep_warming",
              reasons: [],
              risks: [],
            },
            evidence: [],
            nextAction: {
              code: "keep_warming",
              requiresHumanReview: false,
              reason: "Test fixture.",
            },
            updatedAt: NOW,
          },
        ],
        mergeReviewQueue: [],
        provenance: [],
      }),
      "utf8",
    );

    const res = mockRes();
    await handler({
      method: "POST",
      query: { sourcePath, cardStorePath, mailerBridgePath, localRootPath, decisionLedgerPath },
      body: {
        text: "CRM: @cadavid_eli se llama Eliana Cadavid, asiste a Encuentro Feliz y a clases de yoga.",
        sourceKind: "alejandro_conversation",
        connectedEvidenceOnly: true,
        evidenceSources: [
          {
            sourceKind: "lead_capture_export",
            sourceId: "manychat-cache:cadavid_eli",
            text: "Matched clue: @cadavid_eli. Name: Eliana Cadavid. Email: eli.cadavid@hotmail.com. Phone: +573104954266.",
          },
        ],
      },
      headers: {},
    } as MockReq, res as never);

    expect(res.statusCode).toBe(200);
    const payload = res.body as {
      source: { personCards: { kind: string } };
      packet: {
        summary: { readyForHumanApproval: number; blockedOpenEvidenceQuestions: number; openEvidenceQuestions: number };
        approvalItems: Array<{
          status: string;
          recommendedAction: string;
          targetPersonId: string;
          identitySummary: { email: string; instagramHandle: string; phone: string };
          openQuestions: unknown[];
        }>;
      };
    };
    expect(payload.source.personCards.kind).toBe("vnext-person-card-store");
    expect(payload.packet.summary).toMatchObject({
      readyForHumanApproval: 1,
      blockedOpenEvidenceQuestions: 0,
      openEvidenceQuestions: 0,
    });
    expect(payload.packet.approvalItems[0]).toMatchObject({
      status: "ready_for_human_approval",
      recommendedAction: "enrich_existing_card",
      targetPersonId: "email:eli.cadavid@hotmail.com",
      identitySummary: {
        email: "eli.cadavid@hotmail.com",
        instagramHandle: "cadavid_eli",
        phone: "+573104954266",
      },
      openQuestions: [],
    });

    const serialized = JSON.stringify(res.body);
    expect(serialized).not.toContain(dir);
    expect(serialized).not.toContain(sourcePath);
    expect(serialized).not.toContain(cardStorePath);
  });

  test("rejects missing text and non-POST methods", async () => {
    const missing = mockRes();
    await handler({ method: "POST", query: {}, body: {}, headers: {} } as MockReq, missing as never);
    expect(missing.statusCode).toBe(400);
    expect(missing.body).toEqual({ ok: false, error: "card_write_approval_packet_text_required" });

    const method = mockRes();
    await handler({ method: "GET", query: {}, body: {}, headers: {} } as MockReq, method as never);
    expect(method.statusCode).toBe(405);
    expect(method.body).toEqual({ ok: false, error: "method_not_allowed" });
  });
});
