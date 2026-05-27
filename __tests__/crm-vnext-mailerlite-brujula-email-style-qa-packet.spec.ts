import { describe, expect, test } from "vitest";

import {
  buildEvidenceFlags,
  buildPacket,
  buildQaChecks,
  buildSafety,
  hasAssignedReceipts,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-brujula-email-style-qa-packet.mjs";

const brujulaPlan = {
  localEvidence: {
    emailStyle: {
      brujulaCurrentAntiEvidence: true,
    },
    brujulaState: {
      currentWorkflowOffOrIncomplete: true,
    },
  },
};

const brujulaApply = {
  assignedGroups: [
    { name: "CC · Source · Resource · Brújula" },
    { name: "CC · Delivered · Guide · Brújula" },
  ],
};

const emailStyleCanon = `
Un email de Marca debe sentirse como carta/editorial.
Cuerpo Poppins, sans-serif. Acento Georgia, serif.
Usar firma visual de Alejandro.
`;

const emailEvidence = `
Brújula usa Inter. Falta la firma visual. footer default en inglés.
`;

const canonHandoff = "Brújula actual queda marcada como anti-evidencia visual.";
const brujulaProposal = "Email 2 debe ser Carta de continuidad.";

const sourceDigests = [
  {
    path: "/tmp/email_style_canon.md",
    present: true,
    chars: 100,
    consultedFor: "test source",
  },
];

describe("CRM vNext MailerLite Brújula email style QA packet", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs([
      "--out",
      "/tmp/brujula-email-qa.json",
      "--markdown-out",
      "/tmp/brujula-email-qa.md",
    ]);

    expect(parsed.brujulaPlan).toContain("mailerlite_brujula_test_lane_plan_post_inbox_verify_2026-05-27.json");
    expect(parsed.emailStyleCanon).toContain("email_style_canon.md");
    expect(parsed.emailEvidence).toContain("EMAIL_BRAND_EVIDENCE_REPORT_2026-05-11.md");
    expect(parsed.out).toBe("/tmp/brujula-email-qa.json");
  });

  test("detects approved test receipts", () => {
    expect(hasAssignedReceipts(brujulaApply)).toBe(true);
    expect(hasAssignedReceipts({ assignedGroups: [] })).toBe(false);
  });

  test("builds evidence flags from Brand canon and Brújula anti-evidence", () => {
    const flags = buildEvidenceFlags({
      brujulaPlan,
      brujulaApply,
      emailStyleCanon,
      emailEvidence,
      brujulaProposal,
    });

    expect(flags).toMatchObject({
      testDeliveryFunctional: true,
      currentWorkflowProtected: true,
      currentAntiEvidencePresent: true,
      canonSaysEditorialLetter: true,
      canonBodyPoppins: true,
      canonGeorgiaAccent: true,
      canonSignatureRequired: true,
      evidenceInterMismatch: true,
      evidenceSignatureMissing: true,
      evidenceFooterDefault: true,
      brujulaProposalHasContinuityLetter: true,
    });
  });

  test("turns yellow creative status into concrete blockers", () => {
    const flags = buildEvidenceFlags({
      brujulaPlan,
      brujulaApply,
      emailStyleCanon,
      emailEvidence,
      brujulaProposal,
    });
    const checks = buildQaChecks(flags);
    const byId = Object.fromEntries(checks.map((check) => [check.id, check]));

    expect(byId.functional_test_lane.status).toBe("green");
    expect(byId.workflow_boundary.status).toBe("green");
    expect(byId.typography_alignment.status).toBe("yellow_blocker");
    expect(byId.signature_identity.status).toBe("yellow_blocker");
    expect(byId.footer_and_socials.requiredBeforePublicUse.join(" ")).toContain("unsubscribe");
  });

  test("builds and renders local-only packet with public use closed", () => {
    const packet = buildPacket({
      brujulaPlan,
      brujulaApply,
      emailStyleCanon,
      emailEvidence,
      canonHandoff,
      brujulaProposal,
      sourceDigests,
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(packet.status).toBe("brujula_email_style_qa_yellow_no_live_changes");
    expect(packet.executiveSummary).toMatchObject({
      functionalStatus: "green_test_delivery_verified",
      creativeStatus: "yellow_needs_email_style_alignment",
      publicUseReady: false,
    });
    expect(packet.approvalBoundary.closedNow).toContain("No MailerLite email edit or send from this packet.");
    expect(packet.safety).toMatchObject({
      localOnly: true,
      mailerLiteApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
    });

    const markdown = renderMarkdown(packet);
    expect(markdown).toContain("Brújula Email Style QA Packet");
    expect(markdown).toContain("typography_alignment");
    expect(markdown).toContain("Sin MailerLite, Shopify o CRM live API calls");
    expect(buildSafety().reportsOnly).toBe(true);
  });
});
