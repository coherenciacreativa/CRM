# CRM vNext Mantis Natural Batch Protocol

Date: 2026-05-11
Status: v0 operator contract

## Purpose

This protocol lets Alejandro ask Mantis in natural language for a new CRM batch without writing a long technical prompt every time.

Canonical examples:

```text
Mantis, probemos otro batch de contactos para CRM.
Mantis, mira estos nombres y busca que sabemos de ellos.
Mantis, arma un batch de leads recientes de Instagram.
Mantis, prueba un batch con asistentes a retiros recientes.
```

Mantis owns the day-to-day hunt. CRM vNext owns the guarded import, review, approval, and local write path.

## Operating Contract

When Mantis receives a natural CRM batch request, she should:

1. Read `GET /api/crm-vnext/operator-capabilities` or this document if operating from the repo.
2. Keep the work read-only unless Alejandro explicitly approves a local CRM write in a later step.
3. Choose a bounded batch:
   - if Alejandro names people, use those people;
   - if Alejandro gives a source, sample that source;
   - if Alejandro only says "probemos otro batch", select 3 to 10 useful candidates from recent CRM queues, retreat lists, lead-capture traces, Juana reports, Instagram-memory reports, MailerLite groups, or other local evidence.
4. Search available sources read-only.
5. If a source is blocked by auth, permissions, or stale credentials, record the blocker and keep going with the sources that are available.
6. Save one contact-keyed JSON report under `~/Documents/Mantis-Reports/`.
7. Reply to Alejandro/Codex with a concise summary, the saved file path, and the exact blockers if any.

Mantis should not create person cards, mutate Fact Store, touch ManyChat LIVE, alter credentials, refresh OAuth, change Instagram permissions, update MailerLite, or send outbound messages from this protocol.

## Read-Only Search Lanes

Preferred lanes, when available:

- MailerLite subscribers via cursor pagination plus local filtering, not naive `page` pagination and not blind `search` trust.
- Gmail replies and identity traces, especially replies to Notas de Alejandro and automations.
- Google Drive, Docs, and Sheets, especially retreat attendee tables and past program rosters.
- macOS Contacts or exported contacts.
- Local CSVs, downloads, and old CRM artifacts.
- Existing person-card stores and CRM vNext card store.
- ManyChat, Vercel proxy, lead-capture, WhatsApp-automation, or Instagram-memory archives, read-only only.
- Local memory/project reports written by Mantis, Juana, or previous CRM jobs.

If Chrome is the only working way for Mantis to inspect Gmail/Drive, she may use it for read-only evidence gathering, but should still report the result as structured evidence. She must not perform live mutations or send messages.

## Output Shape

Mantis should emit contact-keyed JSON. This is the preferred shape for `npm run crm:vnext:mantis-evidence-import`.

```json
{
  "schemaVersion": "mantis.crm_vnext.evidence_hunt.v1",
  "mode": "read_only_evidence_hunt",
  "createdAt": "2026-05-11T00:00:00.000Z",
  "mutationsPerformed": false,
  "outboundPerformed": false,
  "batch": {
    "request": "probemos otro batch de asistentes a retiros recientes",
    "selectionReason": "Bounded sample from recent retreat/Instagram clues.",
    "contactCount": 3
  },
  "sourcesConsulted": [
    {
      "source": "mailerlite",
      "status": "available",
      "method": "cursor_pagination_local_filter",
      "recordsScanned": 1369
    }
  ],
  "authenticationBlockers": [
    {
      "source": "google_workspace",
      "status": "blocked",
      "reason": "OAuth invalid_grant",
      "unblockAction": "Reauthorize Google Workspace locally; do not paste tokens in chat."
    }
  ],
  "contacts": {
    "ig:lavivirozo": {
      "inputAnchors": ["@lavivirozo", "Viviana Rozo"],
      "strongMatches": [
        {
          "source": "mailerlite",
          "sourceId": "subscriber:example",
          "strength": "strong",
          "confidence": "high",
          "evidence": {
            "name": "Viviana Rozo Maldonado",
            "email": "viviana.rozo@example.com",
            "phone": null,
            "city": null,
            "country": null,
            "groups": ["Asistentes a retiros"]
          },
          "whyItMatters": "Email and retreat evidence belong to the same named subject."
        }
      ],
      "weakMatches": [],
      "discardedCandidates": [],
      "resolvedAnchors": {
        "primaryEmail": "viviana.rozo@example.com",
        "emails": ["viviana.rozo@example.com"],
        "phone": null,
        "instagramHandle": "lavivirozo",
        "nameCandidates": ["Viviana Rozo Maldonado"],
        "familyOrCompanionEmailsReviewOnly": []
      },
      "recommendation": "ready_for_batch_loop",
      "batchLoopGuidance": "Import evidence, run Batch Operating Loop, then ask Alejandro for explicit card-write approval."
    }
  },
  "recommendedNextStep": "Run crm:vnext:mantis-evidence-import, then crm:vnext:batch-operating-loop."
}
```

## Evidence Rules

- A family, child, partner, assistant, or companion email is evidence context only. Never assign it as the subject primary email without explicit human approval.
- A phone/email found in MailerLite, Gmail, Contacts, Drive, or a lead-capture archive is still evidence until the CRM review path approves it.
- A strong match should explain why the source belongs to the same person, not only that a name is similar.
- Weak matches should remain reviewable and should not trigger automatic stitching.
- Discarded candidates are useful. Include why they were discarded when the false positive risk is meaningful.
- Restricted service context can be recorded as business history when Alejandro provides it, but sensitive details should stay out of broad summaries.
- Do not include secrets, tokens, raw cookies, credential paths, or unnecessary local filesystem paths.

## CRM Import Path

After Mantis saves the report:

```bash
npm run crm:vnext:mantis-evidence-import -- \
  --report-file ~/Documents/Mantis-Reports/<report>.json \
  --min-confidence high \
  --out tmp/crm-vnext/<slug>_import.json \
  --text-out tmp/crm-vnext/<slug>_import.txt
```

Then run the standard operating loop:

```bash
npm run crm:vnext:batch-operating-loop -- \
  --text-file tmp/crm-vnext/<slug>_import.txt \
  --evidence-file tmp/crm-vnext/<slug>_import.json \
  --decision-ledger-path ./.crm-vnext/evidence-review-decisions/decisions.jsonl \
  --include-expanded-sources \
  --source-kind manual_import \
  --reporter Mantis \
  --channel codex \
  --out tmp/crm-vnext/<slug>_loop.json
```

If the loop returns evidence questions, Mantis asks Alejandro only those focused questions. If it returns blocked identity work, Mantis uses the suggested read-only search lanes and produces a follow-up evidence report. If it returns approval-ready items, Alejandro must still explicitly approve any local card write.

## Good Batch Sizes

- 1 contact for a difficult identity case such as a missing email/phone with many possible candidates.
- 3 to 5 contacts for high-confidence retreat or program evidence.
- 5 to 10 contacts for shallow lead discovery where many items may be deferred.

Stop the batch when the next step would require authentication, credential refresh, live API permission changes, outbound contact, or a business policy decision.

## Known Model Cases

- Juan Jose Trujillo: MailerLite cursor pagination found the real subscriber record after the first page-based scan missed it.
- Eliana Cadavid: Lead-capture and Instagram-origin traces are first-class evidence lanes, not side notes.
- Mayerli / Ariana: family or child emails must remain review-only until Alejandro approves assignment.
- Santiago Bernal: an old company-related email clue is still evidence; do not discard it only because it looks unusual.
