# CRM vNext Community Person Search

Date: 2026-05-08
Status: Implemented local read-only explorer

## Purpose

Let Alejandro and Mantis move from aggregate dashboard metrics into specific local person cards without depending on a top-priority shortlist.

## Routes

- `/crm-vnext/people`
- `/crm-vnext/person/[personId]`

## Search Inputs

- Text query across person id, display name, email, Instagram handle, phone, city, and country.
- Lifecycle stage: `SEMILLA`, `GERMINADA`, `FLORECIDA`, `COSECHA`.
- Next action: `complete_profile`, `ask_for_email`, `human_follow_up`, `nurture_by_email`, `invite_to_community_space`, `respect_suppression`, `keep_warming`.
- Channel filter: email, Instagram, WhatsApp, Telegram, email+IG, IG without email, email without IG.
- Product fit: yoga, mentorship, therapy, digital products, retreats.
- Minimum priority and result limit.

## Data Flow

`Person Cards V1 artifact -> legacy adapter -> Person Card vNext -> community person search -> SSR explorer`

## Safety

- Reads local files only.
- Exact person detail lookup by stable `personId`.
- No ManyChat calls.
- No Instagram calls.
- No MailerLite calls.
- No outbound messages.
- Non-localhost requests stay disabled unless `CRM_VNEXT_DASHBOARD_ENABLED=1`.
