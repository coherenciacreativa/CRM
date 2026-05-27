# MailerLite Receipt Taxonomy v0

Status: local manifest / operating cache derived from Brand Hub.

This manifest is a CRM-side operating cache derived from Brand Hub. It defines the first `CC · ...` MailerLite groups that CRM vNext can use as operational receipts, but Brand Hub remains the semantic authority. MailerLite should route, deliver, and dedupe; CRM should keep the richer intelligence, scoring, replies, purchases, and channel history.

No live MailerLite workflows, subscribers, tags, or automations are changed by this document. Five empty `CC · ...` groups were created after explicit human approval on 2026-05-27 and are documented below.

Checkpoint 2026-05-27: after a separate explicit test-only approval, one approved test subscriber (`saludoalsol+pruebasmayo2026@gmail.com`) was created/updated and assigned only to `CC · Source · Resource · Brújula` and `CC · Delivered · Guide · Brújula`. Email 1 was sent as a MailerLite UI test and verified in Gmail. This did not touch active onboarding, activate workflows, send to audience, or assign `CC · Sent · Article · Sobre el amor`.

## Rules

- Do not rename, delete, or repurpose historical groups.
- Do not edit the active `Onboarding flow` directly from this manifest.
- Create empty groups only after explicit human approval.
- Apply first in disabled or draft flows, especially Brújula, before touching active onboarding.
- Treat `Received second email` as a journey-position marker, not as proof that a specific canonical article was sent, opened, read, or clicked.
- Use `Sent` for article/editorial content markers; do not create new `Received` groups.
- Use `Resource` or `Guide` in Source group names; CRM can store `source_type=lead_magnet` internally.
- Use `Experiment` groups in MailerLite only when routing/dedupe/exclusion needs them.
- Use CRM event ledgers for rich signal detail; use MailerLite groups only for routing, delivery receipts, dedupe, and coarse journey state.

## Machine Manifest

```json
{
  "schemaVersion": "crm-vnext-mailerlite-receipt-taxonomy-v0-2026-05-26",
  "generatedFrom": "Brand Hub MailerLite taxonomy/dictionary v0, reconciled with Brand + CRM audits 2026-05-26",
  "semanticAuthority": "Brand Hub",
  "canonicalSourcePaths": [
    "/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_RECEIPT_TAXONOMY_V0.md",
    "/Users/alejandrogomez/Projects/hub-de-marca/90_sources/email/MAILERLITE_GROUP_DICTIONARY_V0.md"
  ],
  "policy": {
    "liveMutationsAllowedByPlanner": false,
    "safeToCreateEmptyRequiresHumanApproval": true,
    "doNotTouchHistoricGroups": [
      "leads_instagram.csv",
      "Instagram",
      "will get first email",
      "Se le envió el primer boletín",
      "Received second email",
      "Onboarding complete",
      "Perfect Week Leads",
      "Quiz Subscribers",
      "Arte de no reventar — Compradores"
    ],
    "doNotTouchActiveWorkflows": [
      "Onboarding flow",
      "Onboarding for legacy subscribers",
      "Perfect Week — Email 0 + handoff 24h"
    ],
    "pilotWorkflows": [
      "Brújula de Claridad - Guía gratuita Workflow"
    ]
  },
  "contentIds": [
    {
      "contentId": "article_sobre_el_amor",
      "type": "article",
      "publicName": "Sobre el amor"
    },
    {
      "contentId": "article_relaciones_aumentan_energia",
      "type": "article",
      "publicName": "Relaciones que aumentan nuestra energia"
    },
    {
      "contentId": "article_navegar_bajonazos",
      "type": "article",
      "publicName": "Navegar los bajonazos"
    },
    {
      "contentId": "article_volver_a_fluir",
      "type": "article",
      "publicName": "Volver a fluir"
    },
    {
      "contentId": "article_algo_para_perder_miedo",
      "type": "article",
      "publicName": "Algo para perder el miedo"
    },
    {
      "contentId": "guide_brujula_claridad",
      "type": "guide",
      "publicName": "La Brújula de Claridad"
    },
    {
      "contentId": "guide_perfect_week",
      "type": "guide",
      "publicName": "Perfect Week"
    },
    {
      "contentId": "quiz_energia_renovada",
      "type": "quiz",
      "publicName": "Test energia renovada"
    }
  ],
  "groups": [
    {
      "name": "CC · Source · IG onboarding",
      "layer": "Source",
      "object": "IG onboarding",
      "purpose": "Marks people who entered through the Instagram welcome/email capture route.",
      "relatedHistoricGroups": ["leads_instagram.csv", "Instagram"],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Source · Resource · Brújula",
      "liveGroupId": "188581887447401645",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Source",
      "object": "Resource",
      "detail": "Brújula",
      "purpose": "Marks people who entered via the Brújula guide opt-in.",
      "relatedHistoricGroups": ["Brújula de Claridad — Guía gratuita", "Notas de Alejandro — opt-in Brújula"],
      "relatedWorkflows": ["Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Source · Resource · Perfect Week",
      "layer": "Source",
      "object": "Resource",
      "detail": "Perfect Week",
      "purpose": "Marks people who entered via the Perfect Week resource opt-in.",
      "relatedHistoricGroups": ["Perfect Week Leads"],
      "relatedWorkflows": ["Perfect Week — Email 0 + handoff 24h"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 3
    },
    {
      "name": "CC · Source · Quiz · Energia renovada",
      "layer": "Source",
      "object": "Quiz",
      "detail": "Energia renovada",
      "purpose": "Candidate marker for people who entered via the energy/renewal quiz route; requires verification of real quiz name before creation.",
      "relatedHistoricGroups": ["Quiz Subscribers"],
      "relatedWorkflows": [],
      "safeToCreateEmpty": false,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Source · Product · Arte de No Reventar",
      "layer": "Source",
      "object": "Product",
      "detail": "Arte de No Reventar",
      "purpose": "Review-only candidate; the historical group appears to describe buyers and may belong in CRM/customer/audience semantics instead of Source.",
      "relatedHistoricGroups": ["Arte de no reventar — Compradores"],
      "relatedWorkflows": [],
      "safeToCreateEmpty": false,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Source · Event · Encuentro Feliz",
      "layer": "Source",
      "object": "Event",
      "detail": "Encuentro Feliz",
      "purpose": "Candidate marker for people entering through Encuentro Feliz registration or event route; create only if routing need becomes concrete.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Encuentro Feliz"],
      "safeToCreateEmpty": false,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Delivered · Guide · Brújula",
      "liveGroupId": "188581888003147002",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Delivered",
      "object": "Guide",
      "detail": "Brújula",
      "contentId": "guide_brujula_claridad",
      "purpose": "Receipt that the Brújula guide delivery step has completed.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Delivered · Guide · Perfect Week",
      "layer": "Delivered",
      "object": "Guide",
      "detail": "Perfect Week",
      "contentId": "guide_perfect_week",
      "purpose": "Receipt that Perfect Week delivery has completed.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Perfect Week — Email 0 + handoff 24h"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 3
    },
    {
      "name": "CC · Delivered · Quiz result · Energia renovada",
      "layer": "Delivered",
      "object": "Quiz result",
      "detail": "Energia renovada",
      "contentId": "quiz_energia_renovada",
      "purpose": "Receipt that a quiz result was delivered.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Delivered · Access · Encuentro Feliz",
      "layer": "Delivered",
      "object": "Access",
      "detail": "Encuentro Feliz",
      "purpose": "Candidate marker that Encuentro Feliz access was delivered; replaces the fragile generic Link wording if routing needs it.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Encuentro Feliz"],
      "safeToCreateEmpty": false,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Sent · Article · Sobre el amor",
      "liveGroupId": "188581888519046472",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Sent",
      "object": "Article",
      "detail": "Sobre el amor",
      "contentId": "article_sobre_el_amor",
      "purpose": "Canonical marker that this reusable article has been sent, independent of its position in any workflow. It does not imply opened, read, clicked, or interested.",
      "relatedHistoricGroups": ["Received second email"],
      "relatedWorkflows": ["Onboarding flow", "Onboarding for legacy subscribers", "Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Sent · Article · Relaciones que aumentan nuestra energia",
      "layer": "Sent",
      "object": "Article",
      "detail": "Relaciones que aumentan nuestra energia",
      "contentId": "article_relaciones_aumentan_energia",
      "purpose": "Canonical sent marker for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Sent · Article · Navegar los bajonazos",
      "layer": "Sent",
      "object": "Article",
      "detail": "Navegar los bajonazos",
      "contentId": "article_navegar_bajonazos",
      "purpose": "Canonical sent marker for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Sent · Article · Volver a fluir",
      "layer": "Sent",
      "object": "Article",
      "detail": "Volver a fluir",
      "contentId": "article_volver_a_fluir",
      "purpose": "Canonical sent marker for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Sent · Article · Algo para perder el miedo",
      "layer": "Sent",
      "object": "Article",
      "detail": "Algo para perder el miedo",
      "contentId": "article_algo_para_perder_miedo",
      "purpose": "Canonical sent marker for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Journey · Editorial onboarding · Eligible",
      "liveGroupId": "188581889031800192",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Journey",
      "object": "Editorial onboarding",
      "detail": "Eligible",
      "purpose": "Marks that a person is eligible to enter editorial onboarding after receiving a resource.",
      "relatedHistoricGroups": ["will get first email"],
      "relatedWorkflows": ["Onboarding flow", "Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Journey · Editorial onboarding · In progress",
      "layer": "Journey",
      "object": "Editorial onboarding",
      "detail": "In progress",
      "purpose": "Marks that a person is currently in editorial onboarding.",
      "relatedHistoricGroups": ["will get first email", "Se le envió el primer boletín", "Received second email"],
      "relatedWorkflows": ["Onboarding flow", "Onboarding for legacy subscribers"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Journey · Editorial onboarding · Complete",
      "layer": "Journey",
      "object": "Editorial onboarding",
      "detail": "Complete",
      "purpose": "Marks completion of editorial onboarding.",
      "relatedHistoricGroups": ["Onboarding complete"],
      "relatedWorkflows": ["Onboarding flow", "Onboarding for legacy subscribers"],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Audience · General newsletter · Eligible",
      "liveGroupId": "188581889544553921",
      "liveStatus": "live_canonical_empty_created_2026-05-27",
      "layer": "Audience",
      "object": "General newsletter",
      "detail": "Eligible",
      "purpose": "Coarse audience marker for people who can receive fresh general campaigns.",
      "relatedHistoricGroups": ["Onboarding complete"],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 1
    },
    {
      "name": "CC · Audience · Mini-launches · Eligible",
      "layer": "Audience",
      "object": "Mini-launches",
      "detail": "Eligible",
      "purpose": "Coarse audience marker for people who can receive future mini-launch invitations or continuities.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInDisabledPilotAfterQa": false,
      "pilotPriority": 3
    }
  ]
}
```

## First Live Canonical Set

The first group creation batch was approved by Alejandro and executed on 2026-05-27 as empty groups only:

- `CC · Source · Resource · Brújula` — `188581887447401645`
- `CC · Delivered · Guide · Brújula` — `188581888003147002`
- `CC · Sent · Article · Sobre el amor` — `188581888519046472`
- `CC · Journey · Editorial onboarding · Eligible` — `188581889031800192`
- `CC · Audience · General newsletter · Eligible` — `188581889544553921`

Execution report: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_vnext_empty_group_create_EXECUTED_2026-05-27.md`.

Post-create planner verification: `/Users/alejandrogomez/Documents/Mantis-Reports/mailerlite_vnext_post_create_planner_verify_2026-05-27.md`.

These groups prepare the Brújula pilot and future onboarding split without touching active onboarding, subscribers, workflows, automations, or sends. They must remain empty until a separate migration/use gate approves exact subscriber routing or workflow behavior.
