# Hito 53 - Stitching Batch Governance v0

Date: 2026-05-15
Status: Implemented as operator protocol

## Why

CRM vNext has enough stitching infrastructure that Mantis can now run real batches. The next risk is not lack of tools; it is operational drift:

- asking Alejandro too early before using a high-value source,
- repeating the same familiar contacts until the batch loop stops discovering new community members,
- treating Instagram Messages UI as an optional afterthought even when it is exactly the lane that can close a missing handle, email, phone, city, country, or thread-context gap.

## What Changed

`docs/crm-vnext/mantis-natural-batch-protocol.md` now includes two new rules.

### Batch Portfolio Rule

Natural requests like "probemos otro batch" should not default to the same contacts already worked many times.

Mantis should classify each batch as:

- `close_known_open_loops`
- `net_new_discovery`
- `mixed_portfolio`

Default mixed batches should be roughly:

- 60-80% net-new discovery contacts,
- 20-40% known open-loop cleanup contacts.

Known contacts remain useful as regression and cleanup cases, but they should not crowd out new discovery.

### Second-Pass High-Value Source Rule

If a contact ends in `ask_alejandro` because a field is missing and Instagram Messages UI has a plausible search anchor, Mantis should run a bounded read-only Instagram UI complement before asking Alejandro, unless auth/risk blocks it.

Allowed skip reasons must be explicit:

- `not_needed`
- `no_search_anchor`
- `too_low_signal`
- `blocked_by_instagram_ui_auth`
- `deferred_to_instagram_ui_complement`

## Safety

No new mutation authority was added.

The protocol still prohibits:

- CRM card writes,
- Fact Store writes,
- ManyChat LIVE mutation,
- MailerLite mutation,
- Gmail/Drive/Contacts mutation,
- Instagram sends/reactions/follows/permission changes,
- outbound messages,
- credential printing or refresh.

## Operator Effect

Mantis should now do two things better:

1. Before escalating missing fields to Alejandro, check whether a known high-value lane can close the gap.
2. When asked for another batch, keep opening new surface area in the community instead of only revisiting the same model cases.
