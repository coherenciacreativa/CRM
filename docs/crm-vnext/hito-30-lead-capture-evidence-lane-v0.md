# Hito 30 - Lead Capture Evidence Lane v0

Date: 2026-05-10

## Why

Alejandro flagged `@cadavid_eli` / Eliana as a pattern case: she came through Instagram, gave email/phone during the normal welcome capture, was inserted into MailerLite through the existing pipeline, later joined yoga classes, and receives class material by WhatsApp.

The system should not treat this as "no data exists" or create a new card too early. It should know how to search the capture trail.

## What changed

- Added `lead_capture_export` as a first-class Deep Local Stitching evidence source kind.
- Added `buildCrmVNextLeadCaptureEvidenceHelper`.
- Added API `POST /api/crm-vnext/lead-capture-evidence-helper`.
- Added CLI `npm run crm:vnext:lead-capture-evidence`.
- Added operator capability entries so Mantis knows this lane exists.
- Added tests for helper, API, and operator capability exposure.

## What it does

The helper:

- parses the CRM clue through the existing identity research layer
- creates source-specific search suggestions for ManyChat, CRM webhook events, Vercel proxy traces, WhatsApp automations, and MailerLite follow-up
- accepts selected read-only rows/exports as input
- extracts Instagram handle, name, email, phone, flow/contact ids, tags/groups, and message snippets
- emits `lead_capture_export` evidence packets for later stitching/review

## What it does not do

- no live ManyChat calls
- no Instagram API calls
- no MailerLite mutation
- no WhatsApp sends or reads
- no credential reads or refreshes
- no person-card writes
- no Fact Store writes
- no outbound messaging

## Strategic use

Use this before accepting a new-card recommendation for Instagram-origin people whose contact data should have been captured by onboarding. Eliana is the current exemplar. If Mantis finds a ManyChat/webhook/proxy row linking `@cadavid_eli` to email/phone, the CRM can carry that proof forward without guessing.
