import { describe, expect, test } from "vitest";

import {
  buildActionPlan,
  buildPostInputOrchestrator,
  buildSafety,
  commandAllowed,
  parseArgs,
  renderMarkdown,
} from "../scripts/crm-vnext-mailerlite-launch-os-post-input-orchestrator.mjs";

const requestBundle = {
  status: "missing_inputs_request_bundle_ready_no_live_changes",
};

const privateInputTemplatePack = {
  status: "private_input_template_pack_ready_no_live_changes",
};

const waitingIntake = {
  status: "missing_inputs_intake_waiting_for_inputs_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    readyInputCount: 0,
    readyForSeedApprovalPacket: false,
    readyForCrmWritePacketRegeneration: false,
    readyForMiniLaunchCorrectionPreview: false,
    canAskApprovalNow: false,
  },
  postInputCommands: {
    seedApprovalPacket: null,
    crmWriteApprovalPacket: null,
    miniLaunchCorrectionPreview: null,
  },
};

const readyIntake = {
  status: "missing_inputs_intake_all_inputs_ready_no_live_changes",
  executiveSummary: {
    inputCount: 5,
    readyInputCount: 5,
    readyForSeedApprovalPacket: true,
    readyForCrmWritePacketRegeneration: true,
    readyForMiniLaunchCorrectionPreview: true,
    canAskApprovalNow: false,
  },
  postInputCommands: {
    seedApprovalPacket: "npm run crm:vnext:mailerlite-mini-launch-seed-send-approval-packet -- --seed-email-file /tmp/private/seed.txt --out /tmp/seed.json",
    crmWriteApprovalPacket: "npm run crm:vnext:mailerlite-mini-launch-crm-write-approval-packet -- --observed-events-file /tmp/private/events.json --out /tmp/crm.json",
    miniLaunchCorrectionPreview: "npm run crm:vnext:mailerlite-mini-launch-seed-inbox-correction-preview -- --correction-inputs-file /tmp/private/correction-inputs.json",
  },
};

describe("CRM vNext MailerLite Launch OS post-input orchestrator", () => {
  test("normalizes args and defaults", () => {
    const parsed = parseArgs([
      "--missing-inputs-intake",
      "/tmp/intake.json",
      "--out",
      "/tmp/orchestrator.json",
      "--markdown-out",
      "/tmp/orchestrator.md",
    ]);

    expect(parsed.missingInputsIntake).toBe("/tmp/intake.json");
    expect(parsed.missingInputsRequestBundle).toContain("mailerlite_launch_os_missing_inputs_request_bundle_2026-05-28.json");
    expect(parsed.privateInputTemplatePack).toContain("mailerlite_launch_os_private_input_template_pack_2026-05-28.json");
    expect(parsed.out).toBe("/tmp/orchestrator.json");
  });

  test("waits safely when no private inputs are ready", () => {
    const report = buildPostInputOrchestrator({
      intake: waitingIntake,
      requestBundle,
      privateInputTemplatePack,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });
    const markdown = renderMarkdown(report);

    expect(report.status).toBe("post_input_orchestrator_waiting_for_inputs_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      readyInputCount: 0,
      readyCommandCount: 0,
      canAskApprovalNow: false,
      commandsExecuted: false,
      nextSafeAction: "keep_collecting_missing_inputs_without_approval_or_execution",
    });
    expect(report.actionPlan.commands).toEqual([]);
    expect(report.safety).toMatchObject({
      commandsExecuted: false,
      mailerLiteApiCalled: false,
      crmLiveApiCalled: false,
      sendsPerformed: false,
      factStoreWritePerformed: false,
      exactPrivateValuesStored: false,
    });
    expect(markdown).toContain("Ready commands: 0");
  });

  test("plans only whitelisted local packet regenerations when inputs are ready", () => {
    const actionPlan = buildActionPlan({ intake: readyIntake });
    const report = buildPostInputOrchestrator({
      intake: readyIntake,
      requestBundle,
      privateInputTemplatePack,
      generatedAt: "2026-05-28T00:00:00.000Z",
    });

    expect(actionPlan.readyCommandCount).toBe(3);
    expect(actionPlan.allReadyCommandsAllowed).toBe(true);
    expect(actionPlan.commands.map((command) => command.id)).toEqual([
      "regenerate_seed_send_approval_packet",
      "regenerate_crm_write_approval_packet",
      "prepare_mini_launch_seed_inbox_correction_preview",
    ]);
    expect(report.status).toBe("post_input_orchestrator_ready_for_local_packet_regeneration_no_live_changes");
    expect(report.executiveSummary).toMatchObject({
      readyInputCount: 5,
      readyCommandCount: 3,
      canAskApprovalNow: false,
      commandsExecuted: false,
      nextSafeAction: "operator_may_run_listed_local_packet_regeneration_commands_then_refresh_control_room",
    });
    expect(JSON.stringify(report)).not.toContain("seed.person@example.com");
  });

  test("rejects non-whitelisted command families", () => {
    expect(commandAllowed("npm run crm:vnext:mailerlite-mini-launch-seed-send-approval-packet -- --seed-email-file /tmp/seed.txt")).toBe(true);
    expect(commandAllowed("npm run crm:vnext:mailerlite-mini-launch-seed-inbox-correction-preview -- --correction-inputs-file /tmp/private/correction-inputs.json")).toBe(true);
    expect(commandAllowed("npm run crm:vnext:mailerlite-mini-launch-empty-group-create -- --execute")).toBe(false);
    expect(commandAllowed("curl https://example.com")).toBe(false);
    expect(buildSafety()).toMatchObject({
      localOnly: true,
      commandsExecuted: false,
      asksApproval: false,
      outboundPerformed: false,
    });
  });
});
