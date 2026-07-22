import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, test } from 'vitest';

import * as sourceHost from '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs';
import * as stage2AuthorityGate from '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs';
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

const request = (overrides = {}) => ({
  command:
    operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
      .STAGE_2_QUALIFICATION,
  now_ms: Date.now(),
  scenario_controls: historicalControls(),
  ...overrides,
});

const runProductionChild = (
  sourceMode: 'exact' | 'missing' | 'open_invalid' | 'row_cap_10' | 'three_pairs',
) => {
  const gateUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
    import.meta.url,
  ).href;
  const sourceUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
    import.meta.url,
  ).href;
  const operatorUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs',
    import.meta.url,
  ).href;
  const script = `
    const now = Date.now();
    const counts = { authority: 0, open: 0, qualify: 0, finalize: 0 };
    let authority = null;
    const authorityRuntime = {};
    Object.defineProperties(authorityRuntime, {
      brand: {
        value: 'crm_core_historical_catchup_stage2_authority_runtime_v1',
        writable: false,
        enumerable: false,
        configurable: false,
      },
      consume_historical_catchup_stage2_authority_once: {
        value: async (...args) => {
          counts.authority += 1;
          return args.length === 0 && counts.authority === 1 ? authority : null;
        },
        writable: false,
        enumerable: false,
        configurable: false,
      },
    });
    Object.freeze(authorityRuntime);
    for (const key of [
      Symbol.for('crm-core/historical-catchup-stage2-authority-runtime/v1'),
      'crmCoreHistoricalCatchupStage2AuthorityRuntimeV1',
    ]) Object.defineProperty(globalThis, key, {
      value: authorityRuntime,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    if (${JSON.stringify(sourceMode)} !== 'missing') {
      const pair = (ordinal, token) => Object.freeze({
        row_ordinal: ordinal,
        notification_identity_utf8: 'synthetic_' + token,
        profile_identity_utf8: 'synthetic_' + token,
        notification_reference: 'synthetic-notification-' + ordinal,
        profile_reference: 'synthetic-profile-' + ordinal,
        visible_time_bucket_utf8: ordinal === 1 ? '8d' : '1w',
        notification_profile_binding: 'exact',
        follower_event_binding: 'started_following_owner',
      });
      const sourceRuntime = Object.freeze({
        brand: 'crm_core_iab_semantic_source_runtime_facade_v1',
        open_isolated_instagram_tab_once: async (...args) => {
          counts.open += 1;
          if (${JSON.stringify(sourceMode)} === 'open_invalid') return Object.freeze({
            isolated_tab_opened: 'unknown',
            source_backend: 'codex_in_app_browser_semantic_read_only_v1',
          });
          return args.length === 0 ? Object.freeze({
            isolated_tab_opened: true,
            source_backend: 'codex_in_app_browser_semantic_read_only_v1',
          }) : null;
        },
        qualify_notification_profile_pairs_once: async (...args) => {
          counts.qualify += 1;
          return args.length === 0 ? Object.freeze({
            rows_scanned: ${JSON.stringify(sourceMode)} === 'row_cap_10' ? 10 : 8,
            thread_open_count: 0,
            seen_transition_count: 0,
            challenge_or_error_status: 'absent',
            pairs: Object.freeze(${JSON.stringify(sourceMode)} === 'three_pairs'
              ? [pair(1, 'one'), pair(2, 'two'), pair(3, 'three')]
              : [pair(1, 'one'), pair(2, 'two')]),
          }) : null;
        },
        observe_follower_candidate_once: async () => null,
        finalize_isolated_tab_once: async (...args) => {
          counts.finalize += 1;
          return args.length === 0 ? Object.freeze({
            isolated_tab_finalized: true,
            finalize_count: counts.finalize,
          }) : null;
        },
      });
      for (const key of [
        Symbol.for('crm-core/iab-semantic-source-runtime/v1'),
        'crmCoreIabSemanticSourceRuntimeV1',
      ]) Object.defineProperty(globalThis, key, {
        value: sourceRuntime,
        writable: false,
        enumerable: false,
        configurable: false,
      });
    }

    const gate = await import(${JSON.stringify(gateUrl)});
    const source = await import(${JSON.stringify(sourceUrl)});
    authority = gate.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
      { approval_instance_sha256: 'd'.repeat(64) },
      { now_ms: now },
    );
    const operator = await import(${JSON.stringify(operatorUrl)});
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command: operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_2_QUALIFICATION,
    });
    process.stdout.write(JSON.stringify({ counts, receipt: result.redacted_receipt }));
  `;
  const child = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });
  expect(child.status, child.stderr).toBe(0);
  expect(child.signal).toBeNull();
  return JSON.parse(child.stdout) as {
    counts: { authority: number; open: number; qualify: number; finalize: number };
    receipt: Record<string, unknown>;
  };
};

const runCrashLedgerChild = ({
  claimPath,
  attemptPath,
  crashAfterSourceAttempt,
}: {
  claimPath: string;
  attemptPath: string;
  crashAfterSourceAttempt: boolean;
}) => {
  const gateUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
    import.meta.url,
  ).href;
  const sourceUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-iab-semantic-follower-source-host.mjs',
    import.meta.url,
  ).href;
  const operatorUrl = new URL(
    '../scripts/crm-vnext-instagram-welcome-audio-historical-catchup-no-send-operator.mjs',
    import.meta.url,
  ).href;
  const script = `
    import {
      closeSync,
      openSync,
      readFileSync,
      writeFileSync,
      writeSync,
    } from 'node:fs';
    const claimPath = ${JSON.stringify(claimPath)};
    const attemptPath = ${JSON.stringify(attemptPath)};
    const crashAfterSourceAttempt = ${JSON.stringify(crashAfterSourceAttempt)};
    const now = Date.now();
    let authority = null;

    const authorityRuntime = {};
    Object.defineProperties(authorityRuntime, {
      brand: {
        value: 'crm_core_historical_catchup_stage2_authority_runtime_v1',
        writable: false,
        enumerable: false,
        configurable: false,
      },
      consume_historical_catchup_stage2_authority_once: {
        value: async (...args) => {
          if (args.length !== 0) return null;
          try {
            const descriptor = openSync(claimPath, 'wx', 0o600);
            try {
              writeSync(descriptor, 'claimed');
            } finally {
              closeSync(descriptor);
            }
            return authority;
          } catch (error) {
            if (error?.code === 'EEXIST') return null;
            throw error;
          }
        },
        writable: false,
        enumerable: false,
        configurable: false,
      },
    });
    Object.freeze(authorityRuntime);
    for (const key of [
      Symbol.for('crm-core/historical-catchup-stage2-authority-runtime/v1'),
      'crmCoreHistoricalCatchupStage2AuthorityRuntimeV1',
    ]) Object.defineProperty(globalThis, key, {
      value: authorityRuntime,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    const pair = (ordinal, token) => Object.freeze({
      row_ordinal: ordinal,
      notification_identity_utf8: 'synthetic_' + token,
      profile_identity_utf8: 'synthetic_' + token,
      notification_reference: 'synthetic-notification-' + ordinal,
      profile_reference: 'synthetic-profile-' + ordinal,
      visible_time_bucket_utf8: ordinal === 1 ? '8d' : '1w',
      notification_profile_binding: 'exact',
      follower_event_binding: 'started_following_owner',
    });
    const sourceRuntime = Object.freeze({
      brand: 'crm_core_iab_semantic_source_runtime_facade_v1',
      open_isolated_instagram_tab_once: async (...args) => {
        if (args.length !== 0) return null;
        let priorAttemptCount = 0;
        try {
          priorAttemptCount = Number.parseInt(readFileSync(attemptPath, 'utf8'), 10) || 0;
        } catch (error) {
          if (error?.code !== 'ENOENT') throw error;
        }
        writeFileSync(attemptPath, String(priorAttemptCount + 1), {
          encoding: 'utf8',
          flag: 'w',
          mode: 0o600,
        });
        if (crashAfterSourceAttempt) process.exit(73);
        return Object.freeze({
          isolated_tab_opened: true,
          source_backend: 'codex_in_app_browser_semantic_read_only_v1',
        });
      },
      qualify_notification_profile_pairs_once: async (...args) => args.length === 0
        ? Object.freeze({
          rows_scanned: 8,
          thread_open_count: 0,
          seen_transition_count: 0,
          challenge_or_error_status: 'absent',
          pairs: Object.freeze([pair(1, 'one'), pair(2, 'two')]),
        })
        : null,
      observe_follower_candidate_once: async () => null,
      finalize_isolated_tab_once: async (...args) => args.length === 0
        ? Object.freeze({ isolated_tab_finalized: true, finalize_count: 1 })
        : null,
    });
    for (const key of [
      Symbol.for('crm-core/iab-semantic-source-runtime/v1'),
      'crmCoreIabSemanticSourceRuntimeV1',
    ]) Object.defineProperty(globalThis, key, {
      value: sourceRuntime,
      writable: false,
      enumerable: false,
      configurable: false,
    });

    const gate = await import(${JSON.stringify(gateUrl)});
    await import(${JSON.stringify(sourceUrl)});
    authority = gate.buildWelcomeAudioHistoricalCatchupStage2AuthorityForTest(
      { approval_instance_sha256: 'e'.repeat(64) },
      { now_ms: now },
    );
    const operator = await import(${JSON.stringify(operatorUrl)});
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command: operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
        .STAGE_2_QUALIFICATION,
    });
    process.stdout.write(JSON.stringify({
      attempt_count: Number.parseInt(readFileSync(attemptPath, 'utf8'), 10) || 0,
      receipt: result.redacted_receipt,
    }));
  `;
  return spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: process.cwd(),
    encoding: 'utf8',
    timeout: 20_000,
    maxBuffer: 1024 * 1024,
  });
};

afterEach(() => {
  sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest();
  stage2AuthorityGate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest();
  stage2AuthorityGate.resetWelcomeAudioHistoricalCatchupStage2ApprovalNonceLedgerForTest();
});

describe('historical catch-up productive Stage-2 authority operator', () => {
  test('consumes one synthetic authority, qualifies exactly two pairs, and returns only v2 aggregate truth', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );

    expect(Object.keys(result)).toEqual(['redacted_receipt']);
    expect(result.redacted_receipt).toMatchObject({
      receipt_schema_version:
        'crm_core_instagram_welcome_audio_historical_catchup_no_send_operator_receipt_v2',
      command: 'stage_2_qualification_only',
      stage: 'stage_2',
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      max_candidates: 1,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      threads_opened: 0,
      seen_transitions: 0,
      challenge_or_error_absent: true,
      candidates_qualified: 0,
      source_qualification_green: true,
      source_observation_green: false,
      source_artifact_green: false,
      packet_admission_green: false,
      source_mode: 'synthetic_test_proof',
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: false,
      primary_source_blocker: null,
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
      blocker_codes: [],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toMatch(/private_authority|private_candidate|private-notification/u);
    expect(serialized).not.toMatch(/approval_instance|owner_account|mission_contract_sha256/u);
    expect(serialized).not.toMatch(/age_evidence_raw|visible_time_bucket_utf8/u);
  });

  test('keeps the public command surface Stage-2-only and exposes the v2 blocker vocabulary', async () => {
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND).toEqual({
      STAGE_2_QUALIFICATION: 'stage_2_qualification_only',
    });
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION).toEqual({
      QUALIFIED: 'historical_notification_profile_pairs_qualified_no_send',
      BLOCKED: 'historical_catchup_operator_blocked_no_send',
    });
    expect(operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER).toEqual({
      INPUT_INVALID: 'blocked_historical_catchup_operator_input_invalid',
      STAGE_2_AUTHORITY_REJECTED:
        'blocked_historical_catchup_operator_stage_2_authority_rejected',
      TEST_AUTHORITY_RUNTIME_INSTALL_FAILED:
        'blocked_historical_catchup_operator_test_authority_runtime_install_failed',
      TEST_AUTHORITY_RUNTIME_RESET_FAILED:
        'blocked_historical_catchup_operator_test_authority_runtime_reset_failed',
      TEST_RUNTIME_INSTALL_FAILED:
        'blocked_historical_catchup_operator_test_runtime_install_failed',
      TEST_RUNTIME_RESET_FAILED:
        'blocked_historical_catchup_operator_test_runtime_reset_failed',
      SOURCE_RESULT_INVALID:
        'blocked_historical_catchup_operator_source_result_invalid',
      SOURCE_QUALIFICATION_BLOCKED:
        'blocked_historical_catchup_operator_source_qualification',
    });
    expect(
      'resetWelcomeAudioHistoricalCatchupNoSendOperatorStateForTest' in operator,
    ).toBe(false);

    const removedStage3Literal = 'stage_3_same_process_no_send_preparation';
    for (const result of [
      await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
        command: removedStage3Literal,
      } as never),
      await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
        ...request(),
        command: removedStage3Literal,
      } as never),
    ]) {
      expect(result.redacted_receipt).toMatchObject({
        decision:
          operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
        blocker_codes: [
          operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
        ],
        authority_recognized: false,
        authority_consumed: false,
        authority_valid: false,
        source_host_invoked: false,
        rows_scanned: 0,
        source_read_only_action_attempted: false,
        source_read_only_action_performed: false,
      });
      expect(
        operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
          result.redacted_receipt,
        ),
      ).toEqual({ ok: true, reason: null });
    }
  });

  test('blocks production before source when the environment authority is absent', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnce({
      command:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_COMMAND
          .STAGE_2_QUALIFICATION,
    });

    expect(result.redacted_receipt).toMatchObject({
      source_mode: 'production_environment_facade',
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_2_AUTHORITY_REJECTED,
      ],
      authority_recognized: false,
      authority_consumed: false,
      authority_valid: false,
      source_host_invoked: false,
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      isolated_tab_finalize_attempts: 0,
      browser_used: false,
      network_used: null,
      external_effect_invoked: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('runs the exact productive path once when authority and source facades preexist', () => {
    const child = runProductionChild('exact');

    expect(child.counts).toEqual({ authority: 1, open: 1, qualify: 1, finalize: 1 });
    expect(child.receipt).toMatchObject({
      source_mode: 'production_environment_facade',
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
      threads_opened: 0,
      seen_transitions: 0,
      challenge_or_error_absent: true,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: false,
      primary_source_blocker: null,
      browser_used: true,
      browser_usage_attested: true,
      network_used: null,
      network_usage_attested: false,
      blocker_codes: [],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(child.receipt),
    ).toEqual({ ok: true, reason: null });
    for (const mutation of [
      { source_read_only_action_performed: false },
      { isolated_tab_opened: false },
      { browser_used: null, browser_usage_attested: false },
    ]) expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...child.receipt,
      ...mutation,
    }).ok).toBe(false);
  });

  test('burns valid productive authority but performs zero source action when runtime is absent', () => {
    const child = runProductionChild('missing');

    expect(child.counts).toEqual({ authority: 1, open: 0, qualify: 0, finalize: 0 });
    expect(child.receipt).toMatchObject({
      source_mode: 'production_environment_facade',
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      rows_scanned: 0,
      notification_profile_pairs_qualified: 0,
      distinct_pairs_proven: false,
      threads_opened: 0,
      seen_transitions: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      isolated_tab_opened: false,
      isolated_tab_finalized: false,
      isolated_tab_finalize_attempts: 0,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: false,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_INVALID,
      browser_used: false,
      browser_usage_attested: true,
      network_used: null,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(child.receipt),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...child.receipt,
      browser_used: null,
      browser_usage_attested: false,
    }).ok).toBe(false);
  });

  test('marks production browser use unknown when open was attempted but not proven', () => {
    const child = runProductionChild('open_invalid');

    expect(child.counts).toEqual({ authority: 1, open: 1, qualify: 0, finalize: 1 });
    expect(child.receipt).toMatchObject({
      authority_valid: true,
      source_host_invoked: true,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: false,
      isolated_tab_opened: false,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
      external_effect_invoked: false,
      external_effect_possible_or_unknown: true,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ISOLATED_TAB_OPEN_INVALID,
      browser_used: null,
      browser_usage_attested: false,
      network_used: null,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(child.receipt),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...child.receipt,
      browser_used: false,
      browser_usage_attested: true,
    }).ok).toBe(false);
  });

  test('preserves a row-cap count above nine and validates it through the source contract', () => {
    const child = runProductionChild('row_cap_10');

    expect(child.counts).toEqual({ authority: 1, open: 1, qualify: 1, finalize: 1 });
    expect(child.receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      rows_scanned: 10,
      notification_profile_pairs_qualified: 2,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.ROW_CAP_EXCEEDED,
      source_qualification_green: false,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
      browser_used: true,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(child.receipt),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...child.receipt,
      rows_scanned: 8,
    }).ok).toBe(false);
  });

  test('preserves a truthful three-pair blocked count through the source contract', () => {
    const child = runProductionChild('three_pairs');

    expect(child.counts).toEqual({ authority: 1, open: 1, qualify: 1, finalize: 1 });
    expect(child.receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 3,
      distinct_pairs_proven: false,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER
          .QUALIFICATION_PAIR_COUNT_INVALID,
      source_qualification_green: false,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(child.receipt),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...child.receipt,
      notification_profile_pairs_qualified: 2,
      distinct_pairs_proven: true,
    }).ok).toBe(false);
  });

  test.each([
    stage2AuthorityGate
      .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST
      .THROWS_AFTER_CLAIM,
    stage2AuthorityGate
      .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST
      .MALFORMED_AFTER_CLAIM,
  ])('burns a recognized %s authority and stops before source', async (scenario) => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ authority_consume_scenario: scenario }),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_2_AUTHORITY_REJECTED,
      ],
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: false,
      source_host_invoked: false,
      source_read_only_action_attempted: false,
      rows_scanned: 0,
      browser_used: false,
      network_used: false,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('binds blocked qualification progress and the fixed source blocker after authority consumption', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({
        scenario_controls: historicalControls({
          qualification_scenario:
            sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
              .ONE_PAIR,
        }),
      }),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 0,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER
          .QUALIFICATION_REPORT_INVALID,
      internal_capabilities_issued: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test.each([
    {
      scenario:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
          .THREAD_OPENED,
      blocker: sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.THREAD_OPEN_FORBIDDEN,
      threads: 1,
      seen: 0,
      effectInvoked: false,
    },
    {
      scenario:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
          .SEEN_TRANSITION,
      blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.SEEN_TRANSITION_FORBIDDEN,
      threads: 0,
      seen: 1,
      effectInvoked: true,
    },
  ])('preserves and binds thread/Seen/effect truth for $blocker', async ({
    scenario,
    blocker,
    threads,
    seen,
    effectInvoked,
  }) => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({
        scenario_controls: historicalControls({ qualification_scenario: scenario }),
      }),
    );
    const receipt = result.redacted_receipt;

    expect(receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      primary_source_blocker: blocker,
      threads_opened: threads,
      seen_transitions: seen,
      external_effect_invoked: effectInvoked,
      external_effect_possible_or_unknown: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(receipt),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...receipt,
      threads_opened: 0,
    }).ok).toBe(threads === 0);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...receipt,
      seen_transitions: 0,
    }).ok).toBe(seen === 0);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...receipt,
      external_effect_invoked: !effectInvoked,
    }).ok).toBe(false);
  });

  test('preserves source progress and an unsuccessful finalize after one attempt', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({
        scenario_controls: historicalControls({ finalize_scenario: 'invalid' }),
      }),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_QUALIFICATION_BLOCKED,
      ],
      authority_consumed: true,
      source_host_invoked: true,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalized: false,
      isolated_tab_finalize_attempts: 1,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.FINALIZE_INVALID,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      isolated_tab_finalized: true,
    }).ok).toBe(false);
  });

  test('persistent approval ledger blocks a second source call after a post-open failure', async () => {
    const now = Date.now();
    const first = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({
        now_ms: now,
        scenario_controls: historicalControls({
          qualification_scenario:
            sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_QUALIFICATION_SCENARIO_FOR_TEST
              .ACTION_THROWS,
        }),
      }),
    );
    expect(first.redacted_receipt).toMatchObject({
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      source_read_only_action_attempted: true,
      source_read_only_action_performed: true,
      isolated_tab_opened: true,
      isolated_tab_finalize_attempts: 1,
      external_effect_possible_or_unknown: true,
      primary_source_blocker:
        sourceHost.WELCOME_AUDIO_IAB_SEMANTIC_SOURCE_BLOCKER.RUNTIME_ACTION_FAILED,
    });

    const second = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ now_ms: now }),
    );
    expect(second.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .STAGE_2_AUTHORITY_REJECTED,
      ],
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: false,
      source_host_invoked: false,
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      isolated_tab_finalize_attempts: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        second.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
  });

  test('an owner-only productive claim survives a crash before receipt and blocks a second source attempt', () => {
    const ledgerRoot = mkdtempSync(join(tmpdir(), 'crm-core-stage2-crash-ledger-'));
    const claimPath = join(ledgerRoot, 'approval.claim');
    const attemptPath = join(ledgerRoot, 'source-attempt.count');
    try {
      const first = runCrashLedgerChild({
        claimPath,
        attemptPath,
        crashAfterSourceAttempt: true,
      });
      expect(first.status, first.stderr).toBe(73);
      expect(first.signal).toBeNull();
      expect(readFileSync(attemptPath, 'utf8')).toBe('1');
      expect(statSync(claimPath).mode & 0o777).toBe(0o600);
      expect(statSync(attemptPath).mode & 0o777).toBe(0o600);

      const second = runCrashLedgerChild({
        claimPath,
        attemptPath,
        crashAfterSourceAttempt: false,
      });
      expect(second.status, second.stderr).toBe(0);
      expect(second.signal).toBeNull();
      const parsed = JSON.parse(second.stdout) as {
        attempt_count: number;
        receipt: Record<string, unknown>;
      };
      expect(parsed.attempt_count).toBe(1);
      expect(readFileSync(attemptPath, 'utf8')).toBe('1');
      expect(parsed.receipt).toMatchObject({
        blocker_codes: [
          operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
            .STAGE_2_AUTHORITY_REJECTED,
        ],
        authority_recognized: true,
        authority_consumed: true,
        authority_valid: false,
        source_host_invoked: false,
        source_read_only_action_attempted: false,
        source_read_only_action_performed: false,
        isolated_tab_finalize_attempts: 0,
      });
      expect(
        operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
          parsed.receipt,
        ),
      ).toEqual({ ok: true, reason: null });
    } finally {
      rmSync(ledgerRoot, { recursive: true, force: true });
    }
  });

  test.each([
    ['identity', 'private_candidate'],
    ['age', '8d'],
    ['selection_policy', 'historical_catchup_pilot_v1'],
    ['relationship', 'follows_owner'],
    ['runtime', {}],
    ['authority', {}],
    ['browser', {}],
    ['private_complete_source_capability', {}],
    ['private_source_artifact_capability', {}],
    ['artifact_root', '/private/tmp/forbidden'],
    ['packet_request', {}],
  ])('rejects caller-supplied truth or authority field %s before any gate use', async (
    field,
    value,
  ) => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest({
      ...request(),
      [field]: value,
    } as never);

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER.INPUT_INVALID,
      ],
      authority_recognized: false,
      authority_consumed: false,
      authority_valid: false,
      source_host_invoked: false,
      rows_scanned: 0,
      source_read_only_action_attempted: false,
      external_effect_invoked: false,
    });
    expect(sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(false);
    expect(
      stage2AuthorityGate.resetWelcomeAudioHistoricalCatchupStage2AuthorityFacadeForTest(),
    ).toBe(false);
  });

  test('preserves qualified source progress if the test source runtime reset fails', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ test_cleanup_scenario: 'runtime_already_reset' }),
    );

    expect(result.redacted_receipt).toMatchObject({
      decision:
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_RESET_FAILED,
      ],
      authority_consumed: true,
      source_host_invoked: true,
      rows_scanned: 8,
      notification_profile_pairs_qualified: 2,
      source_qualification_green: true,
      isolated_tab_finalized: true,
      isolated_tab_finalize_attempts: 1,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    for (const mutation of [
      { authority_recognized: false },
      { authority_consumed: false },
      { authority_valid: false },
    ]) expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      ...mutation,
    }).ok).toBe(false);
  });

  test('preserves qualified source progress if the test authority runtime reset fails', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ test_cleanup_scenario: 'authority_already_reset' }),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_AUTHORITY_RUNTIME_RESET_FAILED,
      ],
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: true,
      source_host_invoked: true,
      source_qualification_green: true,
      isolated_tab_finalized: true,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    for (const mutation of [
      { authority_recognized: false },
      { authority_consumed: false },
      { authority_valid: false },
    ]) expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      ...mutation,
    }).ok).toBe(false);
  });

  test.each([
    [
      'runtime_already_reset',
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_RUNTIME_RESET_FAILED,
    ],
    [
      'authority_already_reset',
      operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
        .TEST_AUTHORITY_RUNTIME_RESET_FAILED,
    ],
  ])('binds %s to consumed invalid authority and zero source progress', async (
    testCleanupScenario,
    blocker,
  ) => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({
        authority_consume_scenario:
          stage2AuthorityGate
            .WELCOME_AUDIO_HISTORICAL_CATCHUP_STAGE2_AUTHORITY_CONSUME_SCENARIO_FOR_TEST
            .MALFORMED_AFTER_CLAIM,
        test_cleanup_scenario: testCleanupScenario,
      }),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [blocker],
      authority_recognized: true,
      authority_consumed: true,
      authority_valid: false,
      source_host_invoked: false,
      rows_scanned: 0,
      notification_profile_pairs_qualified: 0,
      source_read_only_action_attempted: false,
      source_read_only_action_performed: false,
      isolated_tab_finalize_attempts: 0,
    });
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    for (const mutation of [
      { authority_recognized: false },
      { authority_consumed: false },
      { source_host_invoked: true },
    ]) expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      ...mutation,
    }).ok).toBe(false);
  });

  test('blocks test source runtime installation conflicts without authority consumption', async () => {
    expect(
      sourceHost.installWelcomeAudioIabSemanticRuntimeFacadeForTest(historicalControls()),
    ).toBe(true);
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );

    expect(result.redacted_receipt).toMatchObject({
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .TEST_RUNTIME_INSTALL_FAILED,
      ],
      authority_recognized: false,
      authority_consumed: false,
      authority_valid: false,
      source_host_invoked: false,
      source_read_only_action_attempted: false,
    });
    expect(sourceHost.resetWelcomeAudioIabSemanticRuntimeFacadeForTest()).toBe(true);
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(
        result.redacted_receipt,
      ),
    ).toEqual({ ok: true, reason: null });
    for (const mutation of [
      { authority_recognized: true, authority_consumed: true },
      { authority_recognized: true, authority_consumed: true, authority_valid: true },
    ]) expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...result.redacted_receipt,
      ...mutation,
    }).ok).toBe(false);
  });

  test('does not retain authority, handoff, or source state between synthetic calls', async () => {
    const firstNow = Date.now();
    const first = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ now_ms: firstNow }),
    );
    const second = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request({ now_ms: firstNow + 1 }),
    );

    for (const result of [first, second]) {
      expect(result.redacted_receipt).toMatchObject({
        decision:
          operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.QUALIFIED,
        authority_recognized: true,
        authority_consumed: true,
        authority_valid: true,
        internal_opaque_registry_active_at_return: false,
        internal_capabilities_issued: 0,
        internal_capabilities_consumed: 0,
        internal_capabilities_conditionally_held: 0,
        stage_handoff_consumed: false,
      });
    }
  });

  test('rejects receipt promotion, authority lies, impossible progress, or private-field injection', async () => {
    const result = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );

    for (const mutation of [
      { command: 'stage_3_same_process_no_send_preparation' },
      { stage: 'stage_3' },
      { decision: 'historical_single_candidate_packet_prepared_no_send' },
      { authority_recognized: false },
      { authority_consumed: false },
      { authority_valid: false },
      { source_host_invoked: false },
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
      { isolated_tab_finalize_attempts: 0 },
      { isolated_tab_finalized: false },
      { distinct_pairs_proven: false },
      { threads_opened: 1 },
      { seen_transitions: 1 },
      { challenge_or_error_absent: false },
      { external_effect_invoked: true },
      { external_effect_possible_or_unknown: true },
      { primary_source_blocker: 'unknown_source_blocker' },
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

  test('accepts the conservative malformed-source state but rejects false certainty', async () => {
    const valid = await operator.runWelcomeAudioHistoricalCatchupNoSendOperatorOnceForTest(
      request(),
    );
    const malformed = {
      ...valid.redacted_receipt,
      decision: operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_DECISION.BLOCKED,
      source_qualification_green: false,
      rows_scanned: 0,
      notification_profile_pairs_qualified: 0,
      distinct_pairs_proven: false,
      threads_opened: 0,
      seen_transitions: 0,
      challenge_or_error_absent: false,
      source_read_only_action_performed: false,
      isolated_tab_opened: null,
      isolated_tab_finalized: null,
      isolated_tab_finalize_attempts: null,
      external_effect_invoked: null,
      external_effect_possible_or_unknown: true,
      primary_source_blocker: null,
      blocker_codes: [
        operator.WELCOME_AUDIO_HISTORICAL_CATCHUP_NO_SEND_OPERATOR_BLOCKER
          .SOURCE_RESULT_INVALID,
      ],
    };
    expect(
      operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt(malformed),
    ).toEqual({ ok: true, reason: null });
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...malformed,
      external_effect_possible_or_unknown: false,
    }).ok).toBe(false);
    expect(operator.validateWelcomeAudioHistoricalCatchupNoSendOperatorReceipt({
      ...malformed,
      isolated_tab_finalize_attempts: 0,
    }).ok).toBe(false);
  });

  test('contains only the authority gate and existing source host, with no downstream or live rail', () => {
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
      './crm-vnext-instagram-welcome-audio-historical-catchup-stage2-authority-gate.mjs',
    ]);
    expect(source).not.toMatch(/stage_3|STAGE_3|PREPARED|runStage3/u);
    expect(source).not.toMatch(/artifact-materializer|packet-materializer/u);
    expect(source).not.toMatch(/artifact_root|packet_request/u);
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
