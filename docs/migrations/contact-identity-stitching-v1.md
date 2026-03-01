# Contact Identity Stitching v1

## Purpose

This migration defines **safe contact stitching** for CRM-first ingestion in the ManyChat webhook path.

Goal: link incoming records to an existing `contacts` row using only trusted identifiers, with deterministic priority and conflict safety.

## Trusted Identifiers (strict priority)

1. `email`
2. `phone`
3. `manychat_contact_id`
4. `ig_user_id`
5. `instagram_username`

> Rule: **never merge by name-only** (`name`, `first_name`, `last_name`, or display name are not identity keys).

## Resolver Behavior

For each available trusted identifier (in the order above):

- Query contacts for exact matches.
- Record lookup metadata (`reason`, value, hit count, contact IDs).

Resolution outcomes:

- `matched`: one contact selected and all other matched keys point to the same contact.
- `none`: no trusted key matched any existing contact.
- `ambiguous`: any key lookup returns multiple contacts.
- `conflict`: different trusted keys map to different contacts.

Safety policy:

- `ambiguous` and `conflict` are **unsafe to auto-merge**.
- Webhook keeps existing idempotency path and only reconciles duplicates when resolver returns `matched`.

## Webhook Integration (Batch 3)

When contact upsert hits a duplicate/unique conflict:

1. Run identity resolver using webhook record claims.
2. If resolver returns `matched`, patch matched contact row (preserving current name-protection logic).
3. If resolver returns `ambiguous` or `conflict`, do not auto-merge and surface as fallback failure path.

Added metadata/logging:

- `identity_resolution_status`
- `match_reason`

These are included in pipeline logs and webhook responses (simulate + normal response payload).

## Backward Compatibility Notes

- Existing ingestion route flags (`legacy`, `shadow`, `crm`) are unchanged.
- Existing dedupe/idempotency flow remains unchanged.
- Legacy `ig_username` is still accepted as a fallback source for `instagram_username` matching input.

## Examples

### Example A: deterministic match via email

Incoming claims:

- email: `ana@example.com`
- phone: `+57 300 111 2233`

Lookups:

- email -> contact `c_001`
- phone -> contact `c_001`

Result:

- status: `matched`
- match_reason: `email`
- action: patch `c_001`

### Example B: conflict safety

Incoming claims:

- email: `lead@example.com`
- manychat_contact_id: `mc_889`

Lookups:

- email -> `c_101`
- manychat_contact_id -> `c_303`

Result:

- status: `conflict`
- action: no auto-merge (manual review / existing error path)

### Example C: ambiguity safety

Incoming claims:

- instagram_username: `growth_handle`

Lookups:

- instagram_username -> `c_701`, `c_918`

Result:

- status: `ambiguous`
- action: no auto-merge

### Example D: no trusted keys matched

Incoming claims:

- phone: `+57 322 000 1111`

Lookups:

- phone -> no rows

Result:

- status: `none`
- action: proceed with normal insert path (subject to existing DB constraints)

## Cutover Considerations

Before hard CRM-first cutover:

- Confirm uniqueness guarantees for trusted keys where possible.
- Add dashboard/alerting on `identity_resolution_status in ("ambiguous", "conflict")`.
- Backfill/normalize historical `phone` and `instagram_username` values to reduce false negatives.
