# Hito 13 - Card Write / Merge Policy v0

Date: 2026-05-10
Status: Implemented and verified locally

## What Was Built

CRM vNext now has a read-only policy evaluator for future card writes and merges.

New pieces:

- pure helper: `lib/crm/crm-vnext-card-write-merge-policy.ts`,
- API: `POST /api/crm-vnext/card-write-merge-policy`,
- CLI: `npm run crm:vnext:card-write-merge-policy`,
- tests for policy and API,
- operator capabilities entry and recommended-flow step,
- docs: `card-write-merge-policy.md`.

## Why It Matters

Alejandro wants a living CRM, but not a sloppy one.

Before Mantis can create, enrich, or merge person cards, the system needs a clear rule layer:

```text
evidence -> proposal -> policy decision -> human approval boundary -> future write
```

This hito builds that rule layer without opening the write path yet.

## Key Policy Decisions

The policy can recommend:

- enrich an existing card,
- create a new card after review,
- create or merge from a MailerLite candidate after review,
- defer writing and prepare a review packet,
- ask for more identity.

It always sets:

```text
automaticWriteAllowed = false
automaticMergeAllowed = false
```

## Gmail and Chrome

Alejandro confirmed that Mantis can also use her authenticated Chrome browser to read Gmail.

The policy now treats this as a viable alternate evidence route:

```text
Mantis Chrome/Gmail read-only -> selected snippet -> gmail_export evidence packet -> CRM policy/stitching
```

This is allowed only while read-only. If auth, permission, sending, labeling, deleting, archiving, or modifying appears, Mantis must stop.

## MailerLite

MailerLite is now explicitly recommended before final card creation/merge when email, tags, groups, campaign metrics, or subscriber history can settle identity.

The current safe order is:

1. local MailerLite bridge rows,
2. read-only MailerLite UI/export when available,
3. live API/credential work only as a separate approved auth/infrastructure hito.

## Guardrails

- No card mutation.
- No Fact Store write.
- No outbound channels.
- No automatic merge.
- No Gmail/MailerLite live API calls from the policy API.
- No credential reads.
- Restricted service context requires human review.
- Therapy/psychology is valid service context, but clinical details stay out of cards.

## Verification

Focused tests pass for:

- Juan Jose as MailerLite-based create/merge review with yoga, retreats, and restricted therapy service,
- Mayerli as deferred write when Gmail evidence exists,
- exact existing-card enrichment without automatic write,
- API response without live Gmail/MailerLite calls or local path leaks,
- operator-capabilities map.

## Follow-On Implemented

Run this policy against a small real batch and review decisions.

Implemented as **Card Apply Preview v0**:

- still no direct writes by default,
- generate exact patch operations,
- all operations have `executed=false`,
- no write command exists yet,
- docs: `card-apply-preview.md` and `hito-14-card-apply-preview-v0.md`.
