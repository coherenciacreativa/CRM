import { describe, expect, it } from "vitest";

import { buildCrmVNextOperatorCapabilities } from "../lib/crm/crm-vnext-operator-capabilities";

describe("buildCrmVNextOperatorCapabilities", () => {
  it("maps the safe read-only CRM vNext surfaces for Mantis", () => {
    const capabilities = buildCrmVNextOperatorCapabilities({
      now: "2026-05-09T12:00:00.000Z",
    });

    expect(capabilities.schemaVersion).toBe("crm-vnext-operator-capabilities-2026-05-11");
    expect(capabilities.generatedAt).toBe("2026-05-09T12:00:00.000Z");
    expect(capabilities.mode).toBe("read_only_operator_capabilities");
    expect(capabilities.operatingModel).toEqual({
      dayToDayOperator: "Mantis via OpenClaw",
      builderRole: "repository contracts, code, docs, and local verification",
      humanDecisionOwner: "Alejandro",
    });

    expect(capabilities.apiEndpoints.map((endpoint) => endpoint.id)).toEqual([
      "operator_capabilities",
      "readiness",
      "control_room",
      "source_ledger",
      "fact_intake",
      "fact_store",
      "activation_run",
      "identity_stitching_research",
      "gmail_evidence_helper",
      "contacts_evidence_helper",
      "mailerlite_evidence_helper",
      "google_drive_evidence_helper",
      "lead_capture_evidence_helper",
      "deep_local_stitching",
      "multi_service_card_proposal",
      "card_write_merge_policy",
      "card_apply_preview",
      "evidence_review_packet",
      "evidence_review_decisions",
      "evidence_approval_workbench",
      "evidence_approval_application",
      "stitch_batch_review",
      "card_write_approval_packet",
      "batch_operating_loop",
      "engagement_signal_preview",
      "engagement_snapshots",
      "engagement_movement_queue",
      "engagement_decision_brief",
      "engagement_resolution_loop",
      "card_write_apply",
      "card_merge_review_resolver",
      "identity_review",
      "card_rebuild_diff",
      "community_insights",
      "community_queues",
      "community_queue_brief",
      "community_decision_brief",
      "community_daily_brief",
      "daily_operator_handoff",
      "person_card",
    ]);
    expect(capabilities.browserRoutes.map((route) => route.path)).toEqual([
      "/crm-vnext",
      "/crm-vnext/control-room",
      "/crm-vnext/daily-brief",
      "/crm-vnext/queues",
      "/crm-vnext/engagement-movement",
      "/crm-vnext/people",
      "/crm-vnext/sources",
      "/crm-vnext/fact-intake",
      "/crm-vnext/fact-store",
      "/crm-vnext/activation-run",
      "/crm-vnext/identity-stitching-research",
      "/crm-vnext/deep-local-stitching",
      "/crm-vnext/multi-service-card-proposal",
      "/crm-vnext/evidence-approval-workbench",
      "/crm-vnext/identity-review",
      "/crm-vnext/card-rebuild-diff",
      "/crm-vnext/person/[personId]",
    ]);
    expect(capabilities.localCommands.map((command) => command.command)).toEqual([
      "npm run crm:vnext:source-ledger",
      "npm run crm:vnext:fact-intake -- --text <text>",
      "npm run crm:vnext:fact-store",
      "npm run crm:vnext:activation-run -- --text <text>",
      "npm run crm:vnext:identity-stitching-research -- --text <text>",
      "npm run crm:vnext:gmail-evidence -- --text <text>",
      "npm run crm:vnext:gog-healthcheck",
      "npm run crm:vnext:mailerlite-healthcheck",
      "npm run crm:vnext:contacts-evidence -- --use-macos-contacts-db --text <text>",
      "npm run crm:vnext:mailerlite-evidence -- --text <text>",
      "npm run crm:vnext:mailerlite-engagement-signals -- --snapshot-file <json>",
      "npm run crm:vnext:google-drive-evidence -- --text <text>",
      "npm run crm:vnext:lead-capture-evidence -- --text <text>",
      "npm run crm:vnext:instagram-dm-ui-evidence -- --observations-file <json>",
      "npm run crm:vnext:instagram-signal-events -- --observations-file <json>",
      "npm run crm:vnext:signal-packet-inbox",
      "npm run crm:vnext:ig-origin-batch-prompt -- --latest-writes <n> --limit <n>",
      "npm run crm:vnext:context-fact-proposals -- --evidence-file <json>",
      "npm run crm:vnext:context-fact-apply -- --proposal-file <json> --proposal-id <id>",
      "npm run crm:vnext:deep-local-stitching -- --include-expanded-sources --evidence-file <json> --text <text>",
      "npm run crm:vnext:multi-service-card-proposal -- --text <text>",
      "npm run crm:vnext:card-write-merge-policy -- --include-expanded-sources --evidence-file <json> --text <text>",
      "npm run crm:vnext:card-apply-preview -- --include-expanded-sources --evidence-file <json> --text <text>",
      "npm run crm:vnext:evidence-review-packet -- --include-expanded-sources --evidence-file <json> --text <text>",
      "npm run crm:vnext:evidence-review-decisions -- --packet-file <json> --select-email <email=option>",
      "npm run crm:vnext:evidence-approval-workbench -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text>",
      "npm run crm:vnext:evidence-approval-application -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text> --select-email <email=option>",
      "npm run crm:vnext:stitch-batch-review -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text>",
      "npm run crm:vnext:card-write-approval-packet -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text>",
      "npm run crm:vnext:batch-operating-loop -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text>",
      "npm run crm:vnext:signal-event-pipeline -- --mailerlite-snapshot-file <json> --gmail-reply-discovery-file <json>",
      "npm run crm:vnext:engagement-signal-preview -- --signals-file <json>",
      "npm run crm:vnext:engagement-snapshot-ledger -- --preview-file <json>",
      "npm run crm:vnext:engagement-movement-queue",
      "npm run crm:vnext:engagement-decision-brief",
      "npm run crm:vnext:engagement-resolution-loop",
      "npm run crm:vnext:human-enrichment-questions -- --batch-loop-file <json> --person-id <personId> | --latest-writes <n>",
      "npm run crm:vnext:human-enrichment-response-evidence -- --answers-md <md> --questions-file <json>",
      "npm run crm:vnext:card-write-apply -- --include-expanded-sources --evidence-file <json> --decision-ledger-path <jsonl> --text <text>",
      "npm run crm:vnext:card-merge-review-resolver -- --review-id <reviewId>",
      "npm run crm:vnext:identity-review",
      "npm run crm:vnext:card-rebuild-diff",
      "npm run crm:vnext:readiness",
      "npm run crm:vnext:control-room",
      "npm run crm:vnext:queue-monitor",
      "npm run crm:vnext:daily-brief",
      "npm run crm:vnext:daily-operator-handoff",
      "npm run crm:vnext:decision-brief -- --queue-id <queueId>",
    ]);
  });

  it("keeps every exposed API endpoint non-outbound and write-gated", () => {
    const capabilities = buildCrmVNextOperatorCapabilities();

    expect(capabilities.apiEndpoints.every((endpoint) => ["GET", "POST"].includes(endpoint.method))).toBe(true);
    expect(capabilities.apiEndpoints.filter((endpoint) => !endpoint.readOnly).map((endpoint) => endpoint.id)).toEqual([
      "card_write_apply",
      "card_merge_review_resolver",
    ]);
    expect(capabilities.apiEndpoints.every((endpoint) => endpoint.writesFiles === false || endpoint.writesFiles === "only_with_commit")).toBe(true);
    expect(capabilities.apiEndpoints.filter((endpoint) => endpoint.mutatesRecords !== false).map((endpoint) => endpoint.id)).toEqual([
      "card_write_apply",
      "card_merge_review_resolver",
    ]);
    expect(capabilities.apiEndpoints.every((endpoint) => endpoint.outbound === false)).toBe(true);
    expect(capabilities.browserRoutes.every((route) => route.readOnly && route.outbound === false)).toBe(true);
    expect(capabilities.localCommands.every((command) => command.outbound === false)).toBe(true);
    expect(capabilities.safety).toMatchObject({
      outboundProhibited: true,
      recordMutationRequiresExplicitApproval: true,
      credentialMutationProhibited: true,
      manyChatLiveMutationProhibited: true,
      instagramPermissionMutationProhibited: true,
      mailerLiteCredentialMutationProhibited: true,
    });
  });

  it("declares escalation triggers and avoids local path or secret leakage", () => {
    const capabilities = buildCrmVNextOperatorCapabilities({
      now: new Date("2026-05-09T12:00:00.000Z"),
    });
    const serialized = JSON.stringify(capabilities);

    expect(capabilities.guardrails.map((guardrail) => guardrail.code)).toContain("do_not_touch_manychat_live");
    expect(capabilities.escalationTriggers.map((trigger) => trigger.code)).toContain("credential_or_permission_refresh");
    expect(capabilities.escalationTriggers.map((trigger) => trigger.code)).toContain("source_recovery_preflight_blocked");
    expect(capabilities.escalationTriggers.every((trigger) => trigger.alertAlejandro === true)).toBe(true);
    expect(serialized).toContain("docs/crm-vnext/mantis-natural-batch-protocol.md");
    expect(serialized).toContain("source-health preflight");
    expect(serialized).toContain("contact-keyed evidence JSON");
    expect(serialized).not.toContain("/Users/");
    expect(serialized).not.toContain(".openclaw");
    expect(serialized).not.toContain("CRM_VNEXT_INSIGHTS_TOKEN");
  });
});
