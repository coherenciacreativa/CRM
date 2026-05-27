import { describe, expect, test } from "vitest";

import {
  buildDepartmentPacket,
  buildPacketIndex,
  buildSafety,
  parseArgs,
  renderDepartmentPacketMarkdown,
  renderIndexMarkdown,
} from "../scripts/crm-vnext-mailerlite-mini-launch-department-review-packets.mjs";

const launch = {
  launchId: "mini_2026_06_rehearsal_inteligencia_para_descansar",
  resourceName: "Inteligencia para descansar",
  resourceType: "quiz",
};

const review = {
  department: "brand",
  owner: "Brand Hub / Brand Department OS",
  status: "ready_to_dispatch_no_live_review",
  objective: "Review voice and group semantics.",
  evidencePaths: ["/tmp/email.md", "/tmp/groups.md"],
  requiredOutput: ["Review copy.", "Decide groups."],
  closedActions: ["Do not create MailerLite groups."],
  dispatchBlock: "Modo: revisión Brand no-viva.",
};

const dispatchPacket = {
  ok: true,
  launch,
  departmentReviews: [
    review,
    {
      ...review,
      department: "web_design",
      owner: "Web Design / Shopify",
      dispatchBlock: "Modo: revisión Web Design no-viva.",
    },
    {
      ...review,
      department: "crm",
      owner: "CRM / Signal OS",
      dispatchBlock: "Modo: revisión CRM no-viva.",
    },
  ],
};

const intakeBoard = {
  ok: true,
  launch,
  responseTemplates: {
    brand: {
      department: "brand",
      liveApprovalGranted: false,
    },
    web_design: {
      department: "web_design",
      liveApprovalGranted: false,
    },
    crm: {
      department: "crm",
      liveApprovalGranted: false,
    },
  },
};

const reconciliationBoard = {
  ok: true,
  launch,
  responseState: {
    acceptedDepartments: [],
    pendingDepartments: ["brand", "web_design", "crm"],
    unsafeDepartments: [],
    validations: {
      brand: { department: "brand", status: "awaiting_response" },
      web_design: { department: "web_design", status: "awaiting_response" },
      crm: { department: "crm", status: "awaiting_response" },
    },
  },
};

const sourceDigests = [
  {
    path: "/tmp/dispatch.json",
    present: true,
    chars: 1000,
    consultedFor: "master review requests and evidence",
  },
];

describe("CRM vNext MailerLite mini-launch department review packets", () => {
  test("normalizes default args and output options", () => {
    const parsed = parseArgs([
      "--out-dir",
      "/tmp/packets",
      "--index-out",
      "/tmp/index.json",
      "--markdown-out",
      "/tmp/index.md",
    ]);

    expect(parsed.dispatchPacket).toContain("mailerlite_mini_launch_department_review_dispatch_inteligencia_descansar_2026-05-27.json");
    expect(parsed.intakeBoard).toContain("mailerlite_mini_launch_department_review_intake_board_inteligencia_descansar_2026-05-27.json");
    expect(parsed.reconciliationBoard).toContain("mailerlite_mini_launch_department_review_reconciliation_inteligencia_descansar_2026-05-27.json");
    expect(parsed.outDir).toBe("/tmp/packets");
    expect(parsed.indexOut).toBe("/tmp/index.json");
    expect(parsed.markdownOut).toBe("/tmp/index.md");
  });

  test("builds individual department packet with matching response template", () => {
    const packet = buildDepartmentPacket({
      review,
      intakeBoard,
      reconciliationBoard,
      outDir: "/tmp/packets",
    });

    expect(packet).toMatchObject({
      department: "brand",
      owner: "Brand Hub / Brand Department OS",
      status: "awaiting_response",
      responseTemplate: {
        department: "brand",
        liveApprovalGranted: false,
      },
      liveGateSummary: {
        openLiveGateCount: 0,
      },
    });
    expect(packet.outputPaths.markdown).toContain("brand_review_packet.md");
  });

  test("builds index for Brand, Web Design and CRM packets", () => {
    const index = buildPacketIndex({
      dispatchPacket,
      intakeBoard,
      reconciliationBoard,
      sourceDigests,
      outDir: "/tmp/packets",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });

    expect(index.status).toBe("mini_launch_department_review_packets_ready_no_live_changes");
    expect(index.packetCount).toBe(3);
    expect(index.packets.map((packet) => packet.department)).toEqual(["brand", "web_design", "crm"]);
    expect(index.pendingDepartments).toEqual(["brand", "web_design", "crm"]);
    expect(index.liveGateSummary.openLiveGateCount).toBe(0);
    expect(index.safety.externalMessagesSent).toBe(false);
  });

  test("renders department packet with dispatch block and response template", () => {
    const packet = buildDepartmentPacket({
      review,
      intakeBoard,
      reconciliationBoard,
      outDir: "/tmp/packets",
    });
    const markdown = renderDepartmentPacketMarkdown(packet);

    expect(markdown).toContain("brand Review Packet");
    expect(markdown).toContain("Modo: revisión Brand no-viva.");
    expect(markdown).toContain("liveApprovalGranted");
    expect(markdown).toContain("Sin MailerLite API calls");
  });

  test("renders index without implying messages were sent", () => {
    const index = buildPacketIndex({
      dispatchPacket,
      intakeBoard,
      reconciliationBoard,
      sourceDigests,
      outDir: "/tmp/packets",
      generatedAt: "2026-05-27T00:00:00.000Z",
    });
    const markdown = renderIndexMarkdown(index);

    expect(markdown).toContain("Department Review Packets Index");
    expect(markdown).toContain("No envian mensajes");
    expect(markdown).toContain("Pending: brand, web_design, crm");
  });

  test("safety contract stays local-only", () => {
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      filesWrittenOnly: true,
      externalMessagesSent: false,
      groupsCreated: false,
      sendsPerformed: false,
      signalLedgerAppendPerformed: false,
    });
  });
});
