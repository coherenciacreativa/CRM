# CRM vNext Mantis Batch Audit

Date: 2026-05-18
Status: v0 local read-only command

## Purpose

`crm:vnext:mantis-batch-audit` checks whether a Mantis evidence-hunt report actually covered the batch that Codex/Mantis asked for.

This protects the stitching loop from a common failure mode:

- the prompt asked for 5 contacts,
- the returned JSON only processed 1 contact,
- several sources were blocked by auth or UI availability,
- and the operator report still sounded like the batch was complete.

The audit turns that into a clear `partial_run`, lists missing contacts, preserves exact blockers, and generates a copy-ready retry prompt.

## CLI

```bash
npm run crm:vnext:mantis-batch-audit -- \
  --expected-prompt-file ~/Documents/Mantis-Reports/crm_vnext_net_new_ig_origin_batch_prompt_2026-05-18.json \
  --report-file ~/Documents/Mantis-Reports/crm_vnext_marcelarojas_bienestar_evidence_hunt_2026-05-18.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_net_new_ig_origin_batch_audit_2026-05-18.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_net_new_ig_origin_batch_audit_2026-05-18.md
```

Use `--fail-on-partial` in automation when a partial or source-blocked report should stop the next write/import step.

## Output

The report includes:

- `runStatus`: `complete`, `complete_with_source_blockers`, `partial_run`, `blocked_run`, or `no_expected_contacts`,
- expected vs processed contact counts,
- per-contact coverage,
- actionable blockers,
- source status counts,
- a copy-ready retry prompt for Mantis.

## Safety

- Read-only.
- No card writes.
- No Fact Store writes.
- No live API calls.
- No credential reads or mutations.
- No outbound messages.

This command is a gate before import/review, not a write lane.
