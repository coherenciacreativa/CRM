import { describe, expect, test } from "vitest";
import { parseMailerBridgeCandidatesCsv } from "../lib/crm/crm-vnext-identity-stitching-research.js";
import { buildCrmVNextMultiServiceCardProposal } from "../lib/crm/crm-vnext-multi-service-card-proposal.js";
import { buildPersonCardVNext } from "../lib/crm/person-card-vnext.js";

const NOW = "2026-05-10T12:00:00.000Z";

const mailerCsv = [
  "email,firstName,lastName,company,labels,source,language,notes,igHandle,confidence,updatedAt,status",
  "juanjotru@gmail.com,Juan José,trujillo,,Estudiantes;Consejeros;Asistentes a retiros;Aliados importantes;Amigos de la Fundación;Medellín,External App,,,,0.0,2026-04-06T13:08:11Z,pending_join_key",
].join("\n");

describe("CRM vNext multi-service card proposal", () => {
  test("preserves Juan Jose as one multi-service card proposal", () => {
    const report = buildCrmVNextMultiServiceCardProposal({
      text: "CRM: Juan José Trujillo es estudiante de las clases de yoga, ha asistido a múltiples retiros, es paciente de psicología, es amigo y aliado consultor de Coherencia Creativa.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: parseMailerBridgeCandidatesCsv(mailerCsv),
    });

    expect(report.mode).toBe("read_only_multi_service_card_proposal");
    expect(report.summary.proposals).toBe(1);
    expect(report.summary.mailerBasedNewCardTargets).toBe(1);
    expect(report.summary.multiServiceProposals).toBe(1);
    expect(report.summary.restrictedServiceRelationships).toBe(1);

    const proposal = report.proposals[0];
    expect(proposal.target).toMatchObject({
      type: "new_card_from_mailer_candidate",
      personId: "email:juanjotru@gmail.com",
      displayName: "Juan José trujillo",
    });
    expect(proposal.multiService).toBe(true);
    expect(proposal.identityApprovalRequired).toBe(true);
    expect(proposal.privacyApprovalRequired).toBe(true);
    expect(proposal.cardWritePolicyRequired).toBe(true);
    expect(proposal.serviceRelationships.map((service) => service.serviceKey).sort()).toEqual([
      "retreats",
      "therapy_consultations",
      "yoga_classes",
    ]);
    expect(proposal.serviceRelationships.find((service) => service.serviceKey === "therapy_consultations")).toMatchObject({
      role: "client_patient",
      privacy: "restricted",
    });
    expect(proposal.relationshipContexts.map((context) => context.code)).toContain("relationship_context");
    expect(proposal.proposedOperations.map((operation) => operation.type)).toEqual(expect.arrayContaining([
      "create_person_card_candidate",
      "link_mailer_identity_candidate",
      "add_service_relationship",
      "mark_restricted_service_context",
      "add_relationship_context",
      "require_human_approval",
    ]));
  });

  test("uses a stable Instagram handle to propose a new multi-service card", () => {
    const report = buildCrmVNextMultiServiceCardProposal({
      text: "CRM: @mayuyis2626 es Mayerli, estudiante de las clases de yoga, ha asistido a varios retiros con su familia desde hace unos cinco años.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [],
      mailerBridgeRows: [],
    });

    const proposal = report.proposals[0];
    expect(proposal.target).toMatchObject({
      type: "new_card_from_stable_identity",
      personId: "ig:mayuyis2626",
      displayName: "Mayerli",
    });
    expect(proposal.serviceRelationships.map((service) => service.serviceKey).sort()).toEqual([
      "retreats",
      "yoga_classes",
    ]);
    expect(proposal.relationshipContexts.map((context) => context.code)).toContain("relationship_context");
    expect(proposal.privacyApprovalRequired).toBe(false);
  });

  test("can enrich an exact existing card without requiring identity approval", () => {
    const report = buildCrmVNextMultiServiceCardProposal({
      text: "CRM: @ana_yoga es estudiante de yoga.",
      sourceKind: "alejandro_conversation",
      reporter: "Alejandro",
      channel: "codex",
      now: NOW,
      cards: [
        buildPersonCardVNext({
          personId: "ig:ana_yoga",
          displayName: "Ana Yoga",
          identities: { instagramHandle: "ana_yoga" },
          now: NOW,
        }),
      ],
      mailerBridgeRows: [],
    });

    const proposal = report.proposals[0];
    expect(proposal.target).toMatchObject({
      type: "existing_card",
      personId: "ig:ana_yoga",
    });
    expect(proposal.identityApprovalRequired).toBe(false);
    expect(proposal.privacyApprovalRequired).toBe(false);
    expect(proposal.cardWritePolicyRequired).toBe(true);
    expect(proposal.proposedOperations[0]).toMatchObject({
      type: "use_existing_person_card",
      approvalLevel: "operator_can_preview",
    });
    expect(report.safety.cardMutationProhibited).toBe(true);
  });
});
