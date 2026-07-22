import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, test } from 'vitest';

import * as sourceHost from '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';
import * as operator from '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs';

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

afterEach(() => {
  sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
});

describe('historical catch-up Stage-2-only no-Send operator', () => {
  test('qualifies only and returns one aggregate receipt with no downstream capability state', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });

    expect(Object.keys(result)).toEqual(['redacted_receipt']);
    expect(result.redacted_receipt).toMatchObject({
      command: 'stage_2_qualification_only',
      stage: 'stage_2',
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
      internal_opaque_registry_used: false,
      internal_opaque_registry_active_at_return: false,
      internal_capabilities_issued: 0,
      internal_capabilities_consumed: 0,
      internal_capabilities_conditionally_held: 0,
      stage_handoff_consumed: false,
      final_draft_admission_capability_consumed: false,
      capability_exposed_to_caller: false,
      capability_persisted: false,
      capability_serialized: false,
      private_material_returned: false,
      execution_approval_published: false,
      external_operation_registry_written: false,
      claim_issued: false,
      preclaim_issued: false,
      pending_effect_recorded: false,
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
      claim_invoked: false,
      preclaim_invoked: false,
      upload_invoked: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/private_candidate|private-notification|private-profile/u);
    expect(serialized).not.toMatch(/age_evidence_raw|visible_time_bucket_utf8/u);
  });

  test('exports only Stage 2 and rejects the removed Stage 3 literal before runtime or source use', async () => {
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND).toEqual({
      STAGE_2_QUALIFICATION: 'stage_2_qualification_only',
    });
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION).toEqual({
      QUALIFIED: 'historical_notification_profile_pairs_qualified_no_send',
      BLOCKED: 'historical_catchup_operator_blocked_no_send',
    });
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER).toEqual({
      INPUT_INVALID: 'blocked_historical_catchup_operator_input_invalid',
      REAL_STAGE_2_AUTHORIZATION_REQUIRED:
        'blocked_historical_catchup_operator_real_stage_2_authorization_required',
      TEST_RUNTIME_INSTALL_FAILED:
        'blocked_historical_catchup_operator_test_runtime_install_failed',
      TEST_RUNTIME_RESET_FAILED:
        'blocked_historical_catchup_operator_test_runtime_reset_failed',
      SOURCE_QUALIFICATION_BLOCKED:
        'blocked_historical_catchup_operator_source_qualification',
    });
    expect(
      'resetWelcomeAudioHistoricalCatchupNoSendOperatorStateForTest' in operator,
    ).toBe(false);

    const removedStage3Literal = 'stage_3_same_process_no_send_preparation';
    const production = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command: removedStage3Literal,
    } as never);
    expect(production.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      source_mode: 'production_environment_facade',
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      internal_capabilities_issued: 0,
      internal_capabilities_conditionally_held: 0,
    });

    const synthetic = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command: removedStage3Literal,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    } as never);
    expect(synthetic.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      source_mode: 'synthetic_test_proof',
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
    });
    expect(sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(false);
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        production.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        synthetic.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('does not retain a handoff or other state between Stage 2 calls', async () => {
    const request = () => ({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });
    const first = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );
    const second = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );

    for (const result of [first, second]) {
      expect(result.redacted_receipt).toMatchObject({
        decision:
          operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 0,
        internal_capabilities_consumed: 0,
        internal_capabilities_conditionally_held: 0,
        stage_handoff_consumed: false,
      });
    }
  });

  test('blocks real Stage 2 before source use even if a facade is available', async () => {
    expect(
      sourceHost.installWelcomeAudioIabSemanticRuntimeFacadeForTest(historicalControls()),
    ).toBe(true);
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
          .REAL_STAGE_2_AUTHORIZATION_REQUIRED,
      ],
      source_mode: 'production_environment_facade',
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      browser_used: null,
      network_used: null,
      external_effect_invoked: false,
    });
    expect(sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('binds blocked source progress to an actually performed read-only action', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls({
        qualification_scenario:
          sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST.ONE_PAIR,
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
      internal_capabilities_issued: 0,
      internal_capabilities_conditionally_held: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      source_read_only_action_performed: false,
    }).ok).toBe(false);
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
    ['artifact_root', '/private/tmp/forbidden'],
    ['packet_request', {}],
  ])('rejects caller-supplied truth or downstream field %s before runtime', async (
    field,
    value,
  ) => {
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
      source_read_only_action_attempted: false,
      external_effect_invoked: false,
    });
    expect(sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(false);
  });

  test('preserves Stage 2 source progress if synthetic runtime reset fails', async () => {
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
      internal_opaque_registry_active_at_return: false,
      internal_capabilities_issued: 0,
      internal_capabilities_consumed: 0,
      internal_capabilities_conditionally_held: 0,
      stage_handoff_consumed: false,
      final_draft_admission_capability_consumed: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('blocks test runtime installation conflicts without source use', async () => {
    expect(
      sourceHost.installWelcomeAudioIabSemanticRuntimeFacadeForTest(historicalControls()),
    ).toBe(true);
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_INSTALL_FAILED,
      ],
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      internal_capabilities_issued: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('rejects receipt promotion, downstream state, or private-field injection', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(),
    });

    for (const mutation of [
      { command: 'stage_3_same_process_no_send_preparation' },
      { stage: 'stage_3' },
      { decision: 'historical_single_candidate_packet_prepared_no_send' },
      { candidates_qualified: 1 },
      { send_allowed: true },
      { send_authorized: true },
      { send_invoked: true },
      { live_access_authorized: true },
      { live_authority: true },
      { live_effect_invoked: true },
      { source_observation_green: true },
      { source_artifact_green: true },
      { packet_admission_green: true },
      { internal_capabilities_issued: 1 },
      { internal_capabilities_conditionally_held: 1 },
      { internal_opaque_registry_used: true },
      { internal_opaque_registry_active_at_return: true },
      { stage_handoff_consumed: true },
      { claim_issued: true },
      { preclaim_issued: true },
      { network_used: true },
      { network_mutation_invoked: true },
      { upload_invoked: true },
      { external_effect_invoked: true },
      { private_identity: 'private_candidate' },
    ]) {
      expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
        ...result.redacted_receipt,
        ...mutation,
      }).ok).toBe(false);
    }
  });

  test('rejects every impossible productive receipt with source progress', async () => {
    const request = (overrides = {}) => ({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
      now_ms: Date.now(),
      scenario_controls: historicalControls(overrides),
    });
    const qualified = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );
    const sourceBlocked = await operator
      .runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(request({
        qualification_scenario:
          sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
            .ONE_PAIR,
      }));
    const resetBlocked = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      ...request(),
      test_cleanup_scenario: 'runtime_already_reset',
    });

    for (const receipt of [
      qualified.redacted_receipt,
      sourceBlocked.redacted_receipt,
      resetBlocked.redacted_receipt,
    ]) {
      expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
        ...receipt,
        source_mode: 'production_environment_facade',
        source_usage_attestation_green: true,
        browser_usage_attested: true,
        network_usage_attested: false,
        browser_used: true,
        network_used: null,
      }).ok).toBe(false);
    }

    const productionBlocked = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
    });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...productionBlocked.redacted_receipt,
      source_mode: 'synthetic_test_proof',
      source_usage_attestation_green: true,
      browser_usage_attested: true,
      network_usage_attested: true,
      browser_used: false,
      network_used: false,
    }).ok).toBe(false);
  });

  test('contains only the source host and no Stage 3, artifact, packet, or live rail', () => {
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
      'node:util',
      './crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
    ]);
    expect(source).not.toMatch(/stage_3|STAGE_3|PREPARED|runStage3/u);
    expect(source).not.toMatch(/artifact-materializer|packet-materializer/u);
    expect(source).not.toMatch(/artifact_root|packet_request/u);
    expect(source).not.toMatch(
      /qualifyWelcomeAudioIabSemanticHistoricalCatchupNotificationProfilePairOnce\(/u,
    );
    expect(source).not.toMatch(
      /consumeWelcomeAudioIabSemanticHistoricalCatchupCompleteSourceCapabilityOnce\(/u,
    );
    expect(source).not.toMatch(/\bfetch\s*\(/u);
    expect(source).not.toMatch(/node:(?:child_process|http|https|net|tls)/u);
    expect(source).not.toMatch(/safari-live-host|live-canary-runner|one-shot-executor/u);
    expect(source).not.toMatch(/live-claim-issuer|preclaim-builder|claim-writer/u);
    expect(source).not.toMatch(/JSON\.stringify|structuredClone/u);
  });
});
