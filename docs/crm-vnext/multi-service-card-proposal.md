# CRM vNext Multi-Service Card Proposal

Date: 2026-05-10
Status: v0 read-only proposal builder

## Purpose

Multi-Service Card Proposal turns identity research into a reviewable card plan.

It exists for contacts who belong to several parts of the community at once:

```text
CRM: Juan Jose Trujillo es estudiante de yoga, asistio a multiples retiros,
es paciente de psicologia, es amigo y aliado consultor.
```

The important design rule is: a person is not forced into one bucket.

Juan Jose can be, at the same time:

- yoga student,
- retreat attendee,
- therapy consultation client/patient,
- friend, ally, or consultant context.

## Surfaces

- Browser route: `/crm-vnext/multi-service-card-proposal`
- API: `POST /api/crm-vnext/multi-service-card-proposal`
- CLI:

```bash
npm run crm:vnext:multi-service-card-proposal -- --text "CRM: Juan Jose Trujillo es estudiante de yoga y paciente de psicologia."
npm run crm:vnext:multi-service-card-proposal -- --source-kind alejandro_conversation --reporter Alejandro --channel codex --text-file ./batch.txt
```

## Inputs

The proposal builder reuses the same conversational report format as Fact Intake and Identity Stitching Research.

It searches only local sources:

- local Person Cards V1 snapshot,
- local MailerLite/IG bridge enriched CSV.

It does not call live MailerLite, Instagram, ManyChat, WhatsApp, Telegram, Gmail, or email APIs.

## What It Produces

Each proposal includes:

- a target card plan:
  - existing card,
  - new card from Mailer bridge candidate,
  - new card from stable identity,
  - review candidates first,
  - or ask for more identity;
- service relationships:
  - `yoga_classes`,
  - `retreats`,
  - `therapy_consultations`,
  - `mentorship`,
  - `happy_circle`,
  - `digital_products`;
- relationship context, such as friend, ally, consultant, or family, as review-only nuance;
- privacy warnings;
- proposed operations, all read-only.

## Restricted Service Context

`therapy_consultations` is a real service relationship, not a discarded fact.

It is marked as restricted:

- useful for internal CRM profile enrichment,
- useful for care continuity and private product/service fit,
- not usable for automated outbound copy without human review,
- not a place for clinical notes or intimate therapeutic details.

## Response Shape

```json
{
  "ok": true,
  "proposal": {
    "schemaVersion": "crm-vnext-multi-service-card-proposal-2026-05-10",
    "mode": "read_only_multi_service_card_proposal",
    "summary": {
      "proposals": 2,
      "serviceRelationships": 5,
      "restrictedServiceRelationships": 1,
      "multiServiceProposals": 2
    },
    "proposals": []
  }
}
```

The response excludes local filesystem paths and secret values.

## Safety

- Read-only.
- No person-card mutation.
- No Fact Store write.
- No outbound channels.
- No live API calls.
- No credential reads or refreshes.
- All operations are proposal-only until Alejandro approves a card-write policy.

## Operator Rule

Use this after Identity Stitching Research and Deep Local Stitching.

Mantis should use it to prepare a clean review package before creating, merging, or enriching cards. The proposal can say what should happen; it cannot apply it yet.
