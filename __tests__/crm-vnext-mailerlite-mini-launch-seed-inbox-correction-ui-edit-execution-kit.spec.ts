import { mkdtemp, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { describe, expect, test } from "vitest";

import {
  buildExecutionKit,
  buildReceiptTemplate,
  buildSafety,
  parseArgs,
  renderMarkdown,
  validateSources,
} from "../scripts/crm-vnext-mailerlite-mini-launch-seed-inbox-correction-ui-edit-execution-kit.mjs";

const exactApprovalPhrase =
  "Apruebo editar manualmente en MailerLite UI únicamente los 4 borradores existentes del mini-lanzamiento Inteligencia para descansar para aplicar el payload corregido local QA-green y reemplazar solo los placeholders inertes result_or_resource_link_placeholder, practice_link_placeholder y editorial_note_link_placeholder por las 3 URLs preview unlisted/noindex registradas en el Shopify preview route execution receipt, sin enviar correos, sin publicar, sin programar, sin workflows, sin subscribers, sin crear ni asignar grupos, sin Shopify adicional, sin CRM, sin ledgers, sin cards, sin scoring y sin Fact Store.";

const draftNames = [
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E01 Delivery orientation",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E02 Practice",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E03 Editorial depth",
  "ML Draft · mini_2026_06_rehearsal_inteligencia_para_descansar · E04 Feedback invitation",
];

const approvalPacket = {
  status: "seed_inbox_correction_ui_edit_approval_packet_ready_for_exact_human_approval_no_live_changes",
  executiveSummary: {
    canAskAlejandroForApproval: true,
    targetDraftCount: 4,
  },
  targetDrafts: draftNames.map((draftName, index) => ({
    step: index + 1,
    draftName,
    uiVisibleInDrafts: true,
  })),
  decision: {
    canAskAlejandroForApproval: true,
    packetIsApprovalByItself: false,
    canOpenMailerLiteUiNow: false,
    canEditDraftsNow: false,
    canSendNow: false,
    exactApprovalPhrase,
  },
  approvalBoundary: {
    allowedAfterExactApproval: [
      "open_mailerlite_ui_manually_prefer_safari",
      "edit_only_the_four_existing_target_drafts",
    ],
    stillClosedEvenAfterApproval: [
      "test_send_or_seed_send",
      "subscriber_read_assignment_import_or_mutation",
      "workflow_or_automation_attachment",
    ],
  },
  safety: {
    mailerLiteApiCalled: false,
    mailerLiteUiOpened: false,
    mailerLiteMutationsPerformed: false,
    sendsPerformed: false,
  },
};

const correctionPreview = {
  status: "seed_inbox_correction_preview_ready_no_live_changes",
  launch: {
    id: "mini_2026_06_rehearsal_inteligencia_para_descansar",
    name: "Inteligencia para descansar",
  },
  executiveSummary: {
    redactedPayloadManifestReady: true,
    finalPublicLinksReady: true,
    publicAudienceSendUrlGateReady: false,
    exactUrlsStoredInReport: false,
  },
  previewRows: [
    {
      step: 1,
      role: "delivery_and_orientation",
      draftName: draftNames[0],
      subject: "Tu lectura",
      finalPublicLinkKey: "result_or_resource_link",
    },
    {
      step: 2,
      role: "practice_or_value",
      draftName: draftNames[1],
      subject: "Una practica",
      finalPublicLinkKey: "practice_link",
    },
    {
      step: 3,
      role: "story_or_editorial_depth",
      draftName: draftNames[2],
      subject: "El descanso pide criterio",
      finalPublicLinkKey: "editorial_note_link",
    },
    {
      step: 4,
      role: "invitation_or_feedback",
      draftName: draftNames[3],
      subject: "Que notaste",
      finalPublicLinkKey: null,
    },
  ],
};

const makeRenderQa = (htmlPaths) => ({
  status: "mini_launch_email_render_qa_green_no_live_changes",
  executiveSummary: {
    localRenderReady: true,
    emailCount: 4,
    htmlWrittenCount: 4,
    renderPreviewNonEmptyCount: 4,
    redCheckCount: 0,
    publicUseReady: false,
    seedSendReady: false,
  },
  emailQa: htmlPaths.map((htmlPath, index) => ({
    step: index + 1,
    role: correctionPreview.previewRows[index].role,
    htmlPath,
  })),
});

const makeLocalFiles = async () => {
  const dir = await mkdtemp(join(tmpdir(), "ml-ui-edit-kit-"));
  const htmlPaths = [];
  for (let index = 0; index < 4; index += 1) {
    const htmlPath = join(dir, `email_${index + 1}.html`);
    htmlPaths.push(htmlPath);
    await writeFile(htmlPath, `<p>Email ${index + 1}</p>`, "utf8");
    await writeFile(`${htmlPath}.png`, `png-${index + 1}`, "utf8");
  }
  return htmlPaths;
};

describe("CRM vNext MailerLite seed inbox correction UI edit execution kit", () => {
  test("normalizes default args", () => {
    const parsed = parseArgs(["--out", "/tmp/kit.json", "--markdown-out", "/tmp/kit.md"]);

    expect(parsed.approvalPacket).toContain(
      "mailerlite_mini_launch_seed_inbox_correction_ui_edit_approval_packet_current_inteligencia_descansar_2026-05-31.json",
    );
    expect(parsed.out).toBe("/tmp/kit.json");
    expect(parsed.markdownOut).toBe("/tmp/kit.md");
  });

  test("builds a ready local-only execution kit without opening MailerLite", async () => {
    const htmlPaths = await makeLocalFiles();
    const kit = await buildExecutionKit({
      approvalPacket,
      correctionPreview,
      emailRenderQa: makeRenderQa(htmlPaths),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });

    expect(kit.status).toBe("seed_inbox_correction_ui_edit_execution_kit_ready_no_live_changes");
    expect(kit.executiveSummary).toMatchObject({
      targetDraftCount: 4,
      htmlSourceReadyCount: 4,
      previewReadyCount: 4,
      exactApprovalPhrasePresent: true,
      preferredUiBrowser: "Safari",
      executionKitIsApprovalByItself: false,
      canOpenBrowserNow: false,
      canEditDraftsNow: false,
      canSendNow: false,
      openLiveMutationGateCount: 0,
      blockerCount: 0,
    });
    expect(kit.executionBoundary.approvalIdExpected).toBe("mini_launch_seed_inbox_correction_ui_edit");
    expect(kit.executionBoundary.exactApprovalPhraseRequired).toBe(exactApprovalPhrase);
    expect(kit.operatorRoute.route).toBe("manual_mailerlite_ui_existing_draft_correction_edit");
    expect(kit.perDraftSteps[0].placeholderToReplace).toBe("result_or_resource_link_placeholder");
    expect(kit.perDraftSteps[3].placeholderToReplace).toBe(null);
    expect(kit.postEditReceiptTemplate.requiredNoLiveEvidence).toContain("no_test_send_or_public_send");
  });

  test("renders markdown with hard stops and no URL disclosure", async () => {
    const htmlPaths = await makeLocalFiles();
    const kit = await buildExecutionKit({
      approvalPacket,
      correctionPreview,
      emailRenderQa: makeRenderQa(htmlPaths),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const markdown = renderMarkdown(kit);

    expect(buildSafety()).toMatchObject({
      mailerLiteApiCalled: false,
      mailerLiteUiOpened: false,
      mailerLiteMutationsPerformed: false,
      sendsPerformed: false,
      exactUrlsPrinted: false,
    });
    expect(markdown).toContain("Seed Inbox Correction UI Edit Execution Kit");
    expect(markdown).toContain("Can open browser now: false");
    expect(markdown).toContain("Browser: Safari");
    expect(markdown).toContain(exactApprovalPhrase);
    expect(markdown).toContain("Sin URLs exactas impresas");
  });

  test("blocks if the approval packet self-opens UI execution", async () => {
    const htmlPaths = await makeLocalFiles();
    const perDraftSteps = (await buildExecutionKit({
      approvalPacket,
      correctionPreview,
      emailRenderQa: makeRenderQa(htmlPaths),
      generatedAt: "2026-05-31T00:00:00.000Z",
    })).perDraftSteps;

    expect(validateSources({
      approvalPacket: {
        ...approvalPacket,
        decision: {
          ...approvalPacket.decision,
          canEditDraftsNow: true,
        },
      },
      correctionPreview,
      emailRenderQa: makeRenderQa(htmlPaths),
      perDraftSteps,
    })).toContain("approval_packet_edit_gate_unexpectedly_open");
  });

  test("receipt template keeps all live gates closed", async () => {
    const htmlPaths = await makeLocalFiles();
    const kit = await buildExecutionKit({
      approvalPacket,
      correctionPreview,
      emailRenderQa: makeRenderQa(htmlPaths),
      generatedAt: "2026-05-31T00:00:00.000Z",
    });
    const template = buildReceiptTemplate(kit.perDraftSteps);

    expect(template).toMatchObject({
      status: "seed_inbox_correction_ui_edit_receipt_template_not_executed",
      executed: false,
      editedDraftCount: 0,
      sendCount: 0,
      scheduleCount: 0,
      subscriberReadOrAssignmentCount: 0,
      groupOrSegmentAssignmentCount: 0,
      workflowAttachmentCount: 0,
    });
    expect(template.draftReceipts).toHaveLength(4);
  });
});
