import { chmod, mkdtemp, rm } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import * as sourceHost from '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';
import * as sourceArtifact from '../scripts/crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs';
import * as packetMaterializer from '../scripts/crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs';
import * as operator from '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs';

const roots: string[] = [];

const historicalControls = (overrides: Partial<{
  open_scenario: string;
  qualification_scenario: string;
  observation_scenario: string;
  finalize_scenario: string;
}> = {}) => ({
  open_scenario: 'exact',
  qualification_scenario:
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
      .HISTORICAL_EXACT_TWO_PAIRS,
  observation_scenario:
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
  finalize_scenario: 'exact',
  ...overrides,
});

const makeArtifactRoot = async () => {
  const root = await mkdtemp(join(
    tmpdir(),
    sourceArtifact
      .WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_ARTIFACT_SYNTHETIC_PREFIX_V4,
  ));
  await chmod(root, 0o700);
  roots.push(root);
  return root;
};

const packetRequestV3 = () => ({
  schema_version:
    packetMaterializer.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_CANARY_REQUEST_SCHEMA_VERSION_V3,
  status: 'approved_for_no_live_materialization_only',
  mission_id: 'synthetic_historical_catchup_packet_mission_001',
  contract_version: 'synthetic_historical_catchup_packet_contract_v3',
  central_repo_head: 'a'.repeat(40),
  authorization_id: 'synthetic_historical_catchup_no_live_authorization_001',
  expected_source_mission_id:
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_HISTORICAL_SOURCE_HOST_MISSION_ID,
  candidate_cap: 1,
  future_attempt_cap: 1,
  approved_audio_asset_id: 'synthetic_approved_audio_asset_001',
  approved_audio_sha256: 'b'.repeat(64),
  approved_audio_binding_evidence: 'exact_approved_audio_binding_revalidated',
  execution_approval_authorized: false,
  external_effect_authorized: false,
});

afterEach(async () => {
  sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
  operator.resetWelcomeAudioHistoricalCatchupNoSendOperatorStateForTest();
  await Promise.all(roots.splice(0).map((root) => rm(root, {
    recursive: true,
    force: true,
  })));
});

const runQualifiedStage3ForTest = async ({
  artifactRoot,
  observationScenario = sourceHost
    .WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
  nowMs = Date.now(),
  testCleanupScenario = 'exact',
}: {
  artifactRoot: string;
  observationScenario?: string;
  nowMs?: number;
  testCleanupScenario?: string;
}) => {
  const stage2 = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
    command:
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_2_QUALIFICATION,
    now_ms: nowMs,
    scenario_controls: historicalControls(),
  });
  expect(stage2.redacted_receipt.decision).toBe(
    operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
  );
  return operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
    command:
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_3_PREPARATION,
    now_ms: nowMs,
    artifact_root: artifactRoot,
    scenario_controls: historicalControls({ observation_scenario: observationScenario }),
    test_cleanup_scenario: testCleanupScenario,
  });
};

describe('historical catch-up no-Send operator', () => {
  test('Stage 2 qualifies only and returns one aggregate redacted receipt', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });

    expect(Object.keys(result)).toEqual(['redacted_receipt']);
    expect(result.redacted_receipt).toMatchObject({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
      max_candidates: 1,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      candidates_qualified: 0,
      source_qualification_green: true,
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      source_mode: 'synthetic_test_proof',
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      source_usage_attestation_green: true,
      browser_usage_attested: true,
      network_usage_attested: true,
      internal_opaque_registry_used: true,
      internal_opaque_registry_active_at_return: true,
      internal_capabilities_issued: 1,
      internal_capabilities_consumed: 0,
      internal_capabilities_conditionally_held: 1,
      stage_handoff_consumed: false,
      final_draft_admission_capability_consumed: false,
      external_operation_registry_written: false,
      capability_exposed_to_caller: false,
      capability_persisted: false,
      capability_serialized: false,
      private_material_returned: false,
      send_authorized: false,
      send_allowed: false,
      send_invoked: false,
      live_access_authorized: false,
      live_authority: false,
      live_effect_invoked: false,
      browser_used: false,
      browser_runtime_created: false,
      new_browser_backend_selected: false,
      browser_fallback_invoked: false,
      network_used: false,
      network_mutation_invoked: false,
      claim_issued: false,
      claim_invoked: false,
      preclaim_issued: false,
      preclaim_invoked: false,
      pending_effect_recorded: false,
      upload_invoked: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/private_candidate|private-notification|private-profile/u);
    expect(serialized).not.toMatch(/capability.*clone_guard|exact_target_utf8/u);
    expect(serialized).not.toMatch(/age_evidence_raw|visible_time_bucket_utf8/u);
  });

  test('blocks a repeated Stage 2 before source use and preserves the first handoff', async () => {
    const nowMs = Date.now();
    const first = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
    });
    expect(first.redacted_receipt.decision).toBe(
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    );

    const repeated = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
    });
    expect(repeated.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_HANDOFF_ALREADY_PENDING,
      ],
      rows_scanned: 0,
      notification_profile_pairs_qualified: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      internal_opaque_registry_used: true,
      internal_opaque_registry_active_at_return: true,
      internal_capabilities_issued: 0,
      internal_capabilities_consumed: 0,
      internal_capabilities_conditionally_held: 1,
      stage_handoff_consumed: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        repeated.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });

    const artifactRoot = await makeArtifactRoot();
    const stage3 = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_3_PREPARATION,
      now_ms: nowMs,
      artifact_root: artifactRoot,
      scenario_controls: historicalControls(),
    });
    expect(stage3.redacted_receipt.decision).toBe(
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.PREPARED,
    );
  });

  test('fails closed when the production environment facade is absent', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      source_qualification_green: false,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
      external_effect_invoked: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      browser_used: true,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      internal_capabilities_issued: 3,
      internal_capabilities_consumed: 3,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      internal_opaque_registry_used: true,
    }).ok).toBe(false);
  });

  test('binds blocked Stage 2 source progress to an actually performed read-only action', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls({
        qualification_scenario:
          sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
            .ONE_PAIR,
      }),
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
      rows_scanned: 8,
      notification_profile_pairs_qualified: 0,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      rows_scanned: 0,
      notification_profile_pairs_qualified: 1,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      rows_scanned: 1,
      notification_profile_pairs_qualified: 2,
    }).ok).toBe(false);
  });

  test('Stage 3 is conditionally blocked without a same-process Stage 2 handoff', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION,
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      rows_scanned: 0,
      candidates_qualified: 0,
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_SEQUENCE_REQUIRED,
      ],
      source_mode: 'production_environment_facade',
      network_used: null,
      internal_opaque_registry_used: true,
      stage_handoff_consumed: false,
      external_effect_invoked: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      internal_capabilities_issued: 3,
      internal_capabilities_consumed: 3,
    }).ok).toBe(false);
  });

  test('burns a Stage 2 handoff when the Stage 3 clock predates its issuance', async () => {
    const baseNowMs = Date.now();
    const issuedAtMs = baseNowMs + 10_000;
    const stage2 = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: issuedAtMs,
      scenario_controls: historicalControls(),
    });
    expect(stage2.redacted_receipt.decision).toBe(
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    );

    const artifactRoot = await makeArtifactRoot();
    const stage3 = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_3_PREPARATION,
      now_ms: baseNowMs,
      artifact_root: artifactRoot,
      scenario_controls: historicalControls(),
    });
    expect(stage3.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_SEQUENCE_REQUIRED,
      ],
      rows_scanned: 0,
      stage_handoff_consumed: true,
      internal_capabilities_consumed: 1,
      internal_capabilities_conditionally_held: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        stage3.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test.each([
    ['identity', 'private_candidate'],
    ['age', '8d'],
    ['selection_policy', 'historical_catchup_pilot_v1'],
    ['relationship', 'follows_owner'],
    ['runtime', {}],
    ['browser', {}],
    ['private_complete_source_capability', {}],
    ['private_source_artifact_capability', {}],
  ])('rejects caller-supplied truth field %s before installing a runtime', async (field, value) => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
      [field]: value,
    } as never);

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      rows_scanned: 0,
      external_effect_invoked: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('rejects receipt promotion or private-field injection', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });

    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      send_allowed: true,
    })).toMatchObject({ ok: false });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      private_identity: 'private_candidate',
    })).toMatchObject({ ok: false });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      packet_admission_green: true,
    })).toMatchObject({ ok: false });
  });

  test('contains no browser, live-runner, Send, claim, network, or serialization rail', () => {
    const source = readFileSync(
      new URL(
        '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs',
        import.meta.url,
      ),
      'utf8',
    );
    const importSpecifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/gu)]
      .map((match) => match[1]);

    expect(importSpecifiers).toEqual([
      'node:os',
      'node:path',
      'node:util',
      './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
      './crm-vnext-instagram-welcome-audio-ui-attested-follower-source-artifact-materializer.mjs',
      './crm-vnext-instagram-welcome-audio-ui-attested-canary-packet-materializer.mjs',
    ]);
    expect(source).not.toMatch(/\bfetch\s*\(/u);
    expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/u);
    expect(source).not.toMatch(/safari-live-host|live-canary-runner|one-shot-executor/u);
    expect(source).not.toMatch(/live-claim-issuer|preclaim-builder|claim-writer/u);
    expect(source).not.toMatch(/JSON\.stringify|structuredClone/u);
  });

  test.each([
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_8D,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_30D,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_1W,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_4W,
  ])('Stage 3 composes accepted boundary %s through v4 artifact and inert v3 packet', async (
    observation,
  ) => {
    const artifactRoot = await makeArtifactRoot();
    const result = await runQualifiedStage3ForTest({
      artifactRoot,
      observationScenario: observation,
    });

    expect(Object.keys(result)).toEqual(['redacted_receipt']);
    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.PREPARED,
      max_candidates: 1,
      rows_scanned: 8,
      candidates_qualified: 1,
      source_qualification_green: false,
      source_observation_green: true,
      source_artifact_green: true,
      packet_admission_green: true,
      source_mode: 'synthetic_test_proof',
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      source_usage_attestation_green: true,
      browser_usage_attested: true,
      network_usage_attested: true,
      internal_opaque_registry_used: true,
      internal_opaque_registry_active_at_return: false,
      internal_capabilities_issued: 3,
      internal_capabilities_consumed: 4,
      internal_capabilities_conditionally_held: 0,
      stage_handoff_consumed: true,
      final_draft_admission_capability_consumed: true,
      external_operation_registry_written: false,
      capability_exposed_to_caller: false,
      capability_persisted: false,
      capability_serialized: false,
      private_material_returned: false,
      send_authorized: false,
      send_allowed: false,
      send_invoked: false,
      live_access_authorized: false,
      live_authority: false,
      live_effect_invoked: false,
      browser_used: false,
      browser_runtime_created: false,
      new_browser_backend_selected: false,
      browser_fallback_invoked: false,
      network_used: false,
      network_mutation_invoked: false,
      claim_issued: false,
      claim_invoked: false,
      preclaim_issued: false,
      preclaim_invoked: false,
      pending_effect_recorded: false,
      upload_invoked: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/private_candidate|private-notification|private-profile/u);
    expect(serialized).not.toMatch(/age_evidence_raw|visible_time_bucket_utf8/u);
    expect(serialized).not.toMatch(
      /private_(?:artifact|draft|source_artifact_capability|draft_admission_capability)|clone_guard/u,
    );
  });

  test('burns the conditional handoff and every downstream capability exactly once', async () => {
    const firstRoot = await makeArtifactRoot();
    const first = await runQualifiedStage3ForTest({ artifactRoot: firstRoot });
    expect(first.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.PREPARED,
      internal_capabilities_issued: 3,
      internal_capabilities_consumed: 4,
      internal_capabilities_conditionally_held: 0,
      internal_opaque_registry_active_at_return: false,
      stage_handoff_consumed: true,
      final_draft_admission_capability_consumed: true,
    });

    const secondRoot = await makeArtifactRoot();
    const second = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_3_PREPARATION,
      now_ms: Date.now(),
      artifact_root: secondRoot,
      scenario_controls: historicalControls(),
    });
    expect(second.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_SEQUENCE_REQUIRED,
      ],
      internal_capabilities_issued: 0,
      internal_capabilities_consumed: 0,
      internal_opaque_registry_active_at_return: false,
      stage_handoff_consumed: false,
    });
  });

  test('preserves Stage 2 progress and burns its held handoff when test reset fails', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
      test_cleanup_scenario: 'runtime_already_reset',
    });
    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED,
      ],
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      source_qualification_green: true,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      internal_capabilities_issued: 1,
      internal_capabilities_consumed: 1,
      internal_capabilities_conditionally_held: 0,
      internal_opaque_registry_active_at_return: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('preserves Stage 3 preparation progress when test reset fails', async () => {
    const artifactRoot = await makeArtifactRoot();
    const result = await runQualifiedStage3ForTest({
      artifactRoot,
      testCleanupScenario: 'runtime_already_reset',
    });
    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED,
      ],
      rows_scanned: 8,
      candidates_qualified: 1,
      source_observation_green: true,
      source_artifact_green: true,
      packet_admission_green: true,
      stage_handoff_consumed: true,
      final_draft_admission_capability_consumed: true,
      internal_capabilities_issued: 3,
      internal_capabilities_consumed: 4,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('accepts only the exact reachable capability matrix for every blocker family', async () => {
    const nowMs = Date.now();
    const stage2Command =
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_2_QUALIFICATION;
    const stage3Command =
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_3_PREPARATION;
    const blockedDecision =
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED;
    const blockers = operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER;
    const asBlocked = (
      receipt: Record<string, unknown>,
      blocker: string,
      overrides: Record<string, unknown> = {},
    ) => ({
      ...receipt,
      decision: blockedDecision,
      blocker_codes: [blocker],
      ...overrides,
    });

    const inputInvalid = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage2Command,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
      identity: 'synthetic_forbidden_caller_truth',
    } as never);
    const sourceQualification = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command: stage2Command,
    });
    const stageSequence = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command: stage3Command,
    });
    const resetFailure = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage2Command,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
      test_cleanup_scenario: 'runtime_already_reset',
    });

    const qualified = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage2Command,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
    });
    const pending = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage2Command,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
    });
    const preparedRoot = await makeArtifactRoot();
    const prepared = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage3Command,
      now_ms: nowMs,
      artifact_root: preparedRoot,
      scenario_controls: historicalControls(),
    });

    const observationStage2 = await operator
      .runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
        command: stage2Command,
        now_ms: nowMs,
        scenario_controls: historicalControls(),
      });
    expect(observationStage2.redacted_receipt.decision).toBe(
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    );
    const observationRoot = await makeArtifactRoot();
    const observation = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: stage3Command,
      now_ms: nowMs,
      artifact_root: observationRoot,
      scenario_controls: historicalControls({
        observation_scenario:
          sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
            .HISTORICAL_AMBIGUOUS,
      }),
    });

    const qualifiedReceipt = qualified.redacted_receipt as Record<string, unknown>;
    const preparedReceipt = prepared.redacted_receipt as Record<string, unknown>;
    const stageSequenceReceipt = stageSequence.redacted_receipt as Record<string, unknown>;
    const environmentUnavailableReceipt = asBlocked(
      stageSequenceReceipt,
      blockers.ENVIRONMENT_BINDING_UNAVAILABLE,
      {
        internal_opaque_registry_used: true,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 0,
        internal_capabilities_consumed: 1,
        internal_capabilities_conditionally_held: 0,
        stage_handoff_consumed: true,
      },
    );
    const fixtures = [
      ['input_invalid', inputInvalid.redacted_receipt],
      [
        'test_runtime_install_failed',
        asBlocked(inputInvalid.redacted_receipt, blockers.TEST_RUNTIME_INSTALL_FAILED),
      ],
      ['test_runtime_reset_failed', resetFailure.redacted_receipt],
      ['stage_sequence_required', stageSequence.redacted_receipt],
      ['stage_handoff_already_pending', pending.redacted_receipt],
      [
        'stage_handoff_issue_failed',
        asBlocked(qualifiedReceipt, blockers.STAGE_HANDOFF_ISSUE_FAILED, {
          internal_opaque_registry_used: true,
          internal_opaque_registry_active_at_return: true,
          internal_capabilities_issued: 0,
          internal_capabilities_consumed: 0,
          internal_capabilities_conditionally_held: 1,
        }),
      ],
      ['environment_binding_unavailable', environmentUnavailableReceipt],
      ['source_qualification_blocked', sourceQualification.redacted_receipt],
      ['source_observation_blocked', observation.redacted_receipt],
      [
        'source_artifact_blocked',
        asBlocked(preparedReceipt, blockers.SOURCE_ARTIFACT_BLOCKED, {
          source_artifact_green: false,
          packet_admission_green: false,
          internal_capabilities_issued: 1,
          internal_capabilities_consumed: 2,
          final_draft_admission_capability_consumed: false,
        }),
      ],
      [
        'packet_admission_blocked',
        asBlocked(preparedReceipt, blockers.PACKET_ADMISSION_BLOCKED, {
          packet_admission_green: false,
          internal_capabilities_issued: 2,
          internal_capabilities_consumed: 3,
          final_draft_admission_capability_consumed: false,
        }),
      ],
    ] as const;

    expect(fixtures.map(([, receipt]) => (receipt as { blocker_codes: string[] })
      .blocker_codes[0])).toEqual(Object.values(blockers));
    for (const [label, receipt] of fixtures) {
      expect(
        operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(receipt),
        `${label} reachable matrix`,
      ).toEqual({ ok: true, reason: null });
      const forged = {
        ...receipt,
        internal_opaque_registry_used: true,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 3,
        internal_capabilities_consumed: 3,
        internal_capabilities_conditionally_held: 0,
        stage_handoff_consumed: false,
        final_draft_admission_capability_consumed: false,
      };
      expect(
        operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(forged).ok,
        `${label} forged matrix`,
      ).toBe(false);
    }
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
      asBlocked(qualifiedReceipt, blockers.TEST_RUNTIME_RESET_FAILED, {
        internal_opaque_registry_used: false,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 0,
        internal_capabilities_consumed: 0,
        internal_capabilities_conditionally_held: 0,
        stage_handoff_consumed: false,
      }),
    ).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
      asBlocked(qualifiedReceipt, blockers.STAGE_HANDOFF_ISSUE_FAILED, {
        internal_opaque_registry_used: true,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 0,
        internal_capabilities_consumed: 0,
        internal_capabilities_conditionally_held: 0,
      }),
    ).ok).toBe(false);
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        asBlocked(qualifiedReceipt, blockers.TEST_RUNTIME_RESET_FAILED, {
          internal_opaque_registry_used: true,
          internal_opaque_registry_active_at_return: false,
          internal_capabilities_issued: 0,
          internal_capabilities_consumed: 1,
          internal_capabilities_conditionally_held: 0,
          stage_handoff_consumed: true,
        }),
      ),
    ).toEqual({ ok: true, reason: null });
    for (const blocker of [
      blockers.SOURCE_ARTIFACT_BLOCKED,
      blockers.TEST_RUNTIME_RESET_FAILED,
    ]) {
      expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        asBlocked(preparedReceipt, blocker, {
          source_artifact_green: false,
          packet_admission_green: false,
          internal_capabilities_issued: 2,
          internal_capabilities_consumed: 3,
          final_draft_admission_capability_consumed: false,
        }),
      ).ok).toBe(false);
    }
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...observation.redacted_receipt,
      source_mode: 'production_environment_facade',
      browser_usage_attested: true,
      network_usage_attested: false,
      browser_used: true,
      network_used: null,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...environmentUnavailableReceipt,
      source_mode: 'synthetic_test_proof',
      source_usage_attestation_green: true,
      browser_usage_attested: true,
      network_usage_attested: true,
      browser_used: false,
      network_used: false,
    }).ok).toBe(false);
  });

  test.each([
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_7D,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_31D,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST.HISTORICAL_5W,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_AMBIGUOUS,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_8_DIA_UNACCENTED,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_8_DIAS_UNACCENTED,
    sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_OBSERVATION_SCENARIO_FOR_TEST
      .HISTORICAL_RELATIONSHIP_UNKNOWN,
  ])('blocks rejected historical boundary %s before artifact creation', async (observation) => {
    const artifactRoot = await makeArtifactRoot();
    const result = await runQualifiedStage3ForTest({
      artifactRoot,
      observationScenario: observation,
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      candidates_qualified: 0,
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_OBSERVATION_BLOCKED,
      ],
      external_effect_invoked: false,
      stage_handoff_consumed: true,
      internal_capabilities_consumed: 1,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(result.redacted_receipt.rows_scanned).toBeGreaterThan(0);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
  });

  test('rejects caller-supplied packet binding truth before source observation', async () => {
    const artifactRoot = await makeArtifactRoot();
    const nowMs = Date.now();
    const stage2 = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: nowMs,
      scenario_controls: historicalControls(),
    });
    expect(stage2.redacted_receipt.decision).toBe(
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
    );
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION,
      now_ms: nowMs,
      artifact_root: artifactRoot,
      packet_request: {
        ...packetRequestV3(),
        expected_source_mission_id: 'mismatched_source_mission',
      },
      scenario_controls: historicalControls(),
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .INPUT_INVALID,
      ],
      candidates_qualified: 0,
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      stage_handoff_consumed: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('rejects non-temp and caller-controlled artifact roots before source observation', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION,
      now_ms: Date.now(),
      artifact_root: '/Users/private/caller-controlled-root',
      scenario_controls: historicalControls(),
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      rows_scanned: 0,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      source_observation_green: false,
      external_effect_invoked: false,
    });
  });

  test.each([
    ['exact_target_utf8', 'private_candidate'],
    ['age_evidence_raw', '8d'],
    ['selection_policy', 'historical_catchup_pilot_v1'],
    ['relationship_binding', 'follows_owner'],
    ['execution_approval_authorized', true],
    ['external_effect_authorized', true],
  ])('rejects packet-request truth or authority field %s before source observation', async (
    field,
    value,
  ) => {
    const artifactRoot = await makeArtifactRoot();
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND.STAGE_3_PREPARATION,
      now_ms: Date.now(),
      artifact_root: artifactRoot,
      packet_request: {
        ...packetRequestV3(),
        [field]: value,
      },
      scenario_controls: historicalControls(),
    });

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      rows_scanned: 0,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      external_effect_invoked: false,
    });
  });
});
