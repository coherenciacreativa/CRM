# MailerLite Onboarding Existing Subscriber Active Trigger Correction Guard Design v0

Status: implemented and mock-tested; no live correction run
Date: 2026-07-11

## Purpose

This guard prepares the safe future correction route for the controlled E2E candidate whose MailerLite mutation completed technically but did not verify enrollment into the active live onboarding trigger path.

The future operation class is:

`existing_subscriber_add_to_active_live_onboarding_trigger_group_if_not_present`

It is intentionally separate from the original exact onboarding mutation guard. The original guard supports the not-found subscriber upsert path; this guard supports the existing-subscriber correction path only after a private correction packet, exact approval phrase, fresh lookup, and mocked preflight are all valid.

## Current Mismatch Context

CRM Core recorded that the controlled E2E flow completed technically, welcome audio and reply observation occurred, the MailerLite mutation executed, and post-mutation verification passed for the group/reference used by that mutation. A later active-trigger reconciliation found that the mutation target did not match the active live onboarding trigger. Therefore active onboarding enrollment remains unverified and correction is required before claiming the live onboarding capability.

No MailerLite API call, MailerLite UI use, subscriber mutation, group assignment, CRM/source write, or central integration occurred during this guard implementation.

## Correction Operation Class

`existing_subscriber_add_to_active_live_onboarding_trigger_group_if_not_present`

The guard may support one future exact correction that adds only the confirmed active live trigger group/reference to one explicitly approved existing subscriber, if and only if a fresh packet-specific check confirms:

- the subscriber exists;
- the subscriber status is active/safe;
- the active trigger membership is absent;
- the prior non-active group and all other existing groups are preserved;
- no destructive mutation is required.

If active trigger membership is already present, the guard returns an idempotent no-op success and performs no mutation.

## Endpoint Scope

Allowed future route set:

- `GET /api/subscribers/{id_or_email}` for packet-specific lookup;
- `POST /api/subscribers/{subscriber_id}/groups/{group_id}` at most once;
- `GET /api/subscribers/{id_or_email}` for immediate packet-specific verification.

Explicitly closed:

- broad subscriber listing;
- subscriber upsert POST for this correction;
- subscriber PUT/status updates;
- group removal or group replacement;
- field, automation, campaign, segment, form, webhook, account, bulk import, and batch endpoints;
- any second mutation attempt.

## Non-Destructive Group Policy

The correction adds only the active live trigger group. It never removes the prior non-active group, never replaces the complete group set, and never mutates fields, status, resubscribe, automations, campaigns, segments, forms, webhooks, or account settings.

## Shared Contracts

Implemented modules:

- `scripts/crm-vnext-mailerlite-active-trigger-correction-contract.mjs`
- `scripts/crm-vnext-mailerlite-active-trigger-correction-approval-contract.mjs`
- `scripts/crm-vnext-mailerlite-existing-subscriber-active-trigger-correction.mjs`

Packet contract version:

`mailerlite_existing_subscriber_active_trigger_correction_packet_v1`

Approval phrase contract version:

`mailerlite_active_trigger_correction_approval_phrase_v1_2026-07-11`

Future prompts should obtain the exact approval phrase through `--print-approval-template`, not by retyping it manually.

## Safe Modes

Implemented safe modes:

- `--help`
- `--print-approval-template`
- `--validate-approval-phrase-file <path>`
- `--preflight-only`

Preflight-only validates the correction packet, approval phrase when provided, operation class, closed gates, and output path policy. It does not invoke credentials, call network clients, or mutate anything.

## Atomic Future Live Design

After all local prechecks pass, the future live route is:

1. invoke credential provider;
2. fetch exactly one packet-specific subscriber;
3. classify found/not found/ambiguous, active/safe/unsafe, and active-trigger membership;
4. block if subscriber is missing, ambiguous, unsafe, or membership is unknown;
5. return idempotent no-op if active trigger membership is already present;
6. if absent, perform exactly one group-assignment POST;
7. fetch the same subscriber again;
8. confirm active trigger membership is present;
9. confirm the prior non-active group remains preserved when known;
10. write private result artifacts plus redacted aggregate receipts;
11. stop.

## Test Coverage

Synthetic vitest coverage proves:

- packet contract exports and validation;
- approval phrase contract exports and exact validation;
- safe template and validation modes;
- invalid packets block before credentials;
- output paths inside the repo block;
- preflight-only does not call credentials, network, or mutation clients;
- mocked live route performs the intended GET -> POST -> GET sequence;
- subscriber-not-found and unsafe statuses block with zero mutation calls;
- already-present membership returns idempotent no-op with zero mutation calls;
- active-trigger-absent membership performs exactly one POST;
- unsafe endpoints are rejected;
- prior non-active group preservation is verified;
- post-correction verification is mandatory;
- redacted JSON/Markdown/stdout do not contain synthetic private values;
- `package.json` remains valid and `package-lock.json` remains unchanged.

## Closed Gates

- Live correction run: not run.
- Actual correction status: not executed.
- MailerLite API: not called.
- MailerLite UI: not used.
- Real credentials: not inspected.
- Real private packets/artifacts/reports: not read.
- CRM/source writes: not performed.
- Central integration: not started.

## Next Safe Step

Central integration of the existing-subscriber active-trigger correction guard, followed by an exact private correction review packet and separate Alejandro approval before any live correction run.
