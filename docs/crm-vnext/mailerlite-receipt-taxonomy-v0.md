# MailerLite Receipt Taxonomy v0

Status: local manifest / proposal only.

This manifest defines the first canonical `CC · ...` MailerLite groups that CRM vNext can use as operational receipts. It is intentionally small: MailerLite should route, deliver, and dedupe; CRM should keep the richer intelligence, scoring, replies, purchases, and channel history.

No live MailerLite groups, workflows, subscribers, tags, or automations are changed by this document.

## Rules

- Do not rename, delete, or repurpose historical groups.
- Do not edit the active `Onboarding flow` directly from this manifest.
- Create empty groups only after explicit human approval.
- Apply first in disabled or draft flows, especially Brújula, before touching active onboarding.
- Treat `Received second email` as a journey-position receipt, not as proof that a specific canonical article was received.
- Use CRM event ledgers for rich signal detail; use MailerLite groups only for routing, delivery receipts, dedupe, and coarse journey state.

## Machine Manifest

```json
{
  "schemaVersion": "crm-vnext-mailerlite-receipt-taxonomy-v0-2026-05-26",
  "generatedFrom": "MailerLite Onboarding + Tags/Groups Architecture Audit 2026-05-26",
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
      "contentId": "article_perder_miedo",
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
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Source · Lead magnet · Brújula",
      "layer": "Source",
      "object": "Lead magnet",
      "detail": "Brújula",
      "purpose": "Marks people who entered via the Brújula guide opt-in.",
      "relatedHistoricGroups": ["Brújula de Claridad — Guía gratuita", "Notas de Alejandro — opt-in Brújula"],
      "relatedWorkflows": ["Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Source · Lead magnet · Perfect Week",
      "layer": "Source",
      "object": "Lead magnet",
      "detail": "Perfect Week",
      "purpose": "Marks people who entered via the Perfect Week lead magnet.",
      "relatedHistoricGroups": ["Perfect Week Leads"],
      "relatedWorkflows": ["Perfect Week — Email 0 + handoff 24h"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 3
    },
    {
      "name": "CC · Source · Quiz · Energia renovada",
      "layer": "Source",
      "object": "Quiz",
      "detail": "Energia renovada",
      "purpose": "Marks people who entered via the energy/renewal quiz route.",
      "relatedHistoricGroups": ["Quiz Subscribers"],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Source · Product · Arte de No Reventar",
      "layer": "Source",
      "object": "Product",
      "detail": "Arte de No Reventar",
      "purpose": "Marks buyers/leads whose source route is the Arte de No Reventar product.",
      "relatedHistoricGroups": ["Arte de no reventar — Compradores"],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Source · Event · Encuentro Feliz",
      "layer": "Source",
      "object": "Event",
      "detail": "Encuentro Feliz",
      "purpose": "Marks people entering through Encuentro Feliz registration or event route.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Encuentro Feliz"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Delivered · Guide · Brújula",
      "layer": "Delivered",
      "object": "Guide",
      "detail": "Brújula",
      "contentId": "guide_brujula_claridad",
      "purpose": "Receipt that the Brújula guide delivery step has completed.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": true,
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
      "safeToUseInLiveFlowNow": false,
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
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Delivered · Link · Clase gratis",
      "layer": "Delivered",
      "object": "Link",
      "detail": "Clase gratis",
      "purpose": "Receipt that a free class link was delivered.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Delivered · Link · Encuentro Feliz",
      "layer": "Delivered",
      "object": "Link",
      "detail": "Encuentro Feliz",
      "purpose": "Receipt that an Encuentro Feliz access link was delivered.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Encuentro Feliz"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 4
    },
    {
      "name": "CC · Received · Article · Sobre el amor",
      "layer": "Received",
      "object": "Article",
      "detail": "Sobre el amor",
      "contentId": "article_sobre_el_amor",
      "purpose": "Canonical receipt that this reusable article has been sent, independent of its position in any workflow.",
      "relatedHistoricGroups": ["Received second email"],
      "relatedWorkflows": ["Onboarding flow", "Onboarding for legacy subscribers", "Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": true,
      "pilotPriority": 1
    },
    {
      "name": "CC · Received · Article · Relaciones que aumentan nuestra energia",
      "layer": "Received",
      "object": "Article",
      "detail": "Relaciones que aumentan nuestra energia",
      "contentId": "article_relaciones_aumentan_energia",
      "purpose": "Canonical receipt for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Received · Article · Navegar los bajonazos",
      "layer": "Received",
      "object": "Article",
      "detail": "Navegar los bajonazos",
      "contentId": "article_navegar_bajonazos",
      "purpose": "Canonical receipt for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Received · Article · Volver a fluir",
      "layer": "Received",
      "object": "Article",
      "detail": "Volver a fluir",
      "contentId": "article_volver_a_fluir",
      "purpose": "Canonical receipt for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Received · Article · Algo para perder el miedo",
      "layer": "Received",
      "object": "Article",
      "detail": "Algo para perder el miedo",
      "contentId": "article_perder_miedo",
      "purpose": "Canonical receipt for the reusable article, independent of workflow position.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": ["Onboarding flow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Journey · Editorial onboarding · Eligible",
      "layer": "Journey",
      "object": "Editorial onboarding",
      "detail": "Eligible",
      "purpose": "Marks that a person is eligible to enter editorial onboarding after receiving a resource.",
      "relatedHistoricGroups": ["will get first email"],
      "relatedWorkflows": ["Onboarding flow", "Brújula de Claridad - Guía gratuita Workflow"],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": true,
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
      "safeToUseInLiveFlowNow": false,
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
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 2
    },
    {
      "name": "CC · Journey · Mini-launch · Active",
      "layer": "Journey",
      "object": "Mini-launch",
      "detail": "Active",
      "purpose": "Coarse group for people currently inside a mini-launch sequence.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Journey · Mini-launch · Completed",
      "layer": "Journey",
      "object": "Mini-launch",
      "detail": "Completed",
      "purpose": "Coarse group for people who completed a mini-launch sequence.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Experiment · 2026-06 · Chill",
      "layer": "Experiment",
      "object": "2026-06",
      "detail": "Chill",
      "purpose": "Cohort marker for a June 2026 mini-launch experiment.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Experiment · 2026-06 · Mente lago tranquilo",
      "layer": "Experiment",
      "object": "2026-06",
      "detail": "Mente lago tranquilo",
      "purpose": "Cohort marker for a June 2026 mini-launch experiment.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    },
    {
      "name": "CC · Experiment · 2026-06 · Inteligencia para descansar",
      "layer": "Experiment",
      "object": "2026-06",
      "detail": "Inteligencia para descansar",
      "purpose": "Cohort marker for a June 2026 mini-launch experiment.",
      "relatedHistoricGroups": [],
      "relatedWorkflows": [],
      "safeToCreateEmpty": true,
      "safeToUseInLiveFlowNow": false,
      "pilotPriority": 5
    }
  ]
}
```

## First Safe Create Set

The first group creation batch, after explicit approval, should be only empty groups:

- `CC · Source · Lead magnet · Brújula`
- `CC · Delivered · Guide · Brújula`
- `CC · Received · Article · Sobre el amor`
- `CC · Journey · Editorial onboarding · Eligible`

These prepare the Brújula pilot without touching active onboarding or subscribers.
