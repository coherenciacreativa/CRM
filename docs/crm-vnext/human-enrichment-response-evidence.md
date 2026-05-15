# CRM vNext Human Enrichment Response Evidence

Date: 2026-05-15
Status: v0 local read-only command

## Purpose

`crm:vnext:human-enrichment-response-evidence` turns Alejandro's compact-review freestyle answers into structured CRM evidence.

It separates two things:

- facts/context that can become `human_enrichment_response` evidence,
- operator tasks that should trigger more read-only research before any card update.

## Command

```bash
npm run crm:vnext:human-enrichment-response-evidence -- \
  --answers-md ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_compact_review_2026-05-15.md \
  --questions-file ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_questions_2026-05-15.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_response_evidence_2026-05-15.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_response_evidence_2026-05-15.md
```

Then pass the JSON into context fact proposals:

```bash
npm run crm:vnext:context-fact-proposals -- \
  --evidence-file ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_response_evidence_2026-05-15.json \
  --out ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_context_fact_proposals_2026-05-15.json \
  --markdown-out ~/Documents/Mantis-Reports/crm_vnext_stitching_enrichment_batch_human_context_fact_proposals_2026-05-15.md
```

## Output

The evidence packet contains:

- `evidenceSources`: selected findings in the same evidence contract used by `context-fact-proposals`,
- `operatorTasks`: source investigations, identity follow-ups, or awaiting-human-update items,
- `skippedAnswers`: answers that did not produce a structured delta,
- safety flags.

## Safety

Read-only:

- no card mutation,
- no Fact Store write,
- no live APIs,
- no credentials,
- no outbound.

The output is not approval. Card evidence writes still require a separate `context-fact-apply` approval flow with explicit proposal selection or `--apply-all-ready`, `--approved-by`, backup, and ledger.
