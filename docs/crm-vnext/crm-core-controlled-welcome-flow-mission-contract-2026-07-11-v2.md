# CRM Core Controlled Welcome Flow Mission Contract 2026-07-11.v2

Date: 2026-07-11
Status: awaiting exact CEO approval; no live authority yet
Mode: Proof Mode

## Business Outcome

Verify that the same single controlled existing subscriber is already enrolled,
or becomes enrolled through one add-only operation, in the same active trigger
group for the exact onboarding automation. Then collect bounded ID-only evidence
of at most the first automatic onboarding email in the same controlled mailbox.

This contract does not claim that the outcome has happened. It defines one
fresh, fail-closed attempt to prove it.

## Prior State And Lineage

- `Mission Contract 2026-07-11.v1` is closed at `3/3` pre-effect attempts.
- The global controlled-mailbox evidence ledger is `3/8`.
- Attempt 3 created one durable consumption marker and performed one bounded
  mailbox search, but no verified response/ready pair was published.
- The subscriber GET was not run.
- No group assignment, mutation, resend, retrigger, or automatic email occurred.
- The v1 terminal-effect lock is absent.
- No v1 request, marker, search result, approval, or execution state may be
  replayed or reused. The final v1 source packet may be read exactly once,
  privately and read-only, solely to compare lineage fields while constructing
  the fresh v2 packet; it may not serve as the executable packet.

## Exact Identity And Source Scope

The scope remains limited to the same privately bound values from v1:

- one controlled person;
- one existing subscriber;
- one active onboarding trigger group;
- one exact active onboarding automation;
- one exact first-email locator;
- one controlled Gmail recipient;
- one authenticated Gmail mailbox;
- MailerLite and Gmail only for the exact reads and possible effect below.

The controlled Gmail recipient must use exactly one non-empty `+tag` at
`gmail.com`. The authenticated profile must be only the exact base account
obtained by removing that one tag. The Gmail query must preserve the exact
tagged recipient.

The following are not equivalent and must block:

- dot normalization;
- `googlemail.com`;
- another domain;
- a different, empty, or multiple tag;
- a tagged authenticated profile;
- another alias, account, person, source, or recipient.

### Cross-Version Identity Continuity

The legacy v1 budget ledger does not contain a cryptographic fingerprint of
the private person, subscriber, group, automation, and recipient fields.
Therefore the fresh v2 private packet is the source-of-truth identity gate and
must be built by copying those exact private fields unchanged from the final v1
source packet. It must record:

- `lineage_contract_version`: `Mission Contract 2026-07-11.v1`;
- the exact final v1 source packet ID recorded by the legacy budget ledger;
- `lineage_identity_binding_status`:
  `verified_exact_private_values_unchanged_from_v1_source_packet`.

The guard machine-checks that attestation and source packet ID. Before live,
an independent private review must also compare the exact underlying fields.
If that comparison is absent, ambiguous, or different, v2 must stop. The
attestation is not permission to choose new values.

## Approved Live Reads

After every local and approval gate passes, v2 may perform only:

1. the exact automation GET required to verify its reference, active state,
   trigger mapping, and private first-email locator;
2. bounded Gmail ID-only searches using the exact tagged recipient, exact
   sender, exact subject, exact time bounds, `INBOX`, no pagination, and a
   maximum of two candidate IDs at the bridge boundary;
3. one exact GET of the same subscriber including the complete group snapshot;
4. one immediate exact reread after a no-op or possible add-only assignment;
5. owner-only local reads of the fresh v2 packet, approval, lineage ledger,
   bridge files, locks, and result artifacts;
6. one private read-only comparison against the final v1 source packet solely
   to verify that v2 keeps the exact same identity fields. This comparison
   authorizes no v1 replay and the v1 packet cannot be executed.

No Gmail body, snippet, thread, attachment, header set, broad search, list,
pagination, or unrelated message may be read.

## Approved Effect

- If the active trigger group is already present, the result must be a verified
  no-op with zero POST, resend, or retrigger.
- If and only if the group is absent and all identity, safety, baseline,
  atomicity, and freshness gates are green, v2 may perform at most one POST that
  adds only that active trigger group.
- Every existing group must be preserved.
- The only permitted consequential effect is at most one first automatic
  onboarding email to the same exact tagged recipient.
- No direct send, resend, or retrigger is authorized.

## Budgets

- v1 remains permanently closed at `3/3`.
- v2 authorizes exactly one additional pre-effect live attempt.
- The v2 attempt is consumed when its durable v2 attempt claim is made, even if
  a later pre-effect gate fails.
- Mailbox evidence continues globally from `3/8` and may never exceed `8/8`.
- Only global mailbox ordinals `4`, `5`, `6`, `7`, and `8` can be claimed.
- A missing, changed, reset, unreadable, non-private, or unlocked v1 lineage
  state blocks v2 before credentials or network.
- A durable mailbox consumption marker makes that exact request one-shot. Any
  later disconnect, malformed result, connector failure, publication failure,
  or timeout is terminal for that request and never authorizes a repeat.

## Publisher Gate

Before any v2 live mailbox search:

1. the publisher must pass its synthetic end-to-end compatibility suite;
2. the exact private request must be validated under the owner-only bridge;
3. an interactive TTY session must have echo disabled;
4. the publisher must report `waiting_for_consumption_claim`;
5. only then may the controller create the one-shot consumption marker;
6. only after the marker acknowledgment may the controller make one connector
   call;
7. the complete connector result must be delivered once to that same session;
8. the publisher must hash raw IDs immediately, publish response first, and
   publish the ready marker last with the exact response-byte digest.

If the waiting session is absent, the required result is zero consumption
marker, zero connector calls, and immediate stop.

The publisher may emit only fixed safe status codes, request phase/ordinal, and
counts. It may not echo or print private profile values, query text, raw IDs,
digests, request nonces, or private artifact content.

## Atomic Sequence

1. Keep the lane worktree clean and bind a fresh private v2 packet to the exact
   reviewed HEAD and exact active-next-action ID.
2. Privately compare the v2 identity fields to the final v1 source packet and
   record the exact lineage attestation; do not expose the values.
3. Validate the exact v2 approval phrase from an owner-only file.
4. Validate v1 lineage at exactly `3/3` and `3/8`, and verify the v1 terminal
   effect lock is absent.
5. Verify fresh output paths and absence of the deterministic v2 terminal lock.
6. Claim the single v2 pre-effect attempt.
7. Verify the exact automation, active trigger, and first-email locator.
8. Execute the baseline Gmail check only through the prearmed publisher gate.
9. Refresh the exact automation mapping.
10. GET the same exact subscriber with the complete group snapshot.
11. If already present, do no-op; otherwise, after all fresh gates pass, claim
    the terminal v2 lock and perform at most one add-only POST.
12. Immediately reread the same subscriber and verify identity continuity,
    exact group transition, and preservation of every prior group.
13. Use only the remaining global Gmail ordinals, without resend or retrigger,
    to seek bounded first-email evidence.
14. Write owner-only private result artifacts and redacted receipts.
15. Obtain independent adversarial review.
16. Perform at most one central integration corresponding to v2 and record a
    final closeout.

There is no handoff or central integration inside the fresh pre-mutation
sequence.

## Freshness

- The private packet must be no older than 120 minutes.
- The mailbox baseline and refreshed automation mapping must be within the
  existing 30-second pre-mutation freshness gate.
- The connector result must be accepted within the 30-second bridge response
  freshness window.
- HEAD, active-next-action, packet, run, approval version, mailbox ordinal,
  request nonce, request digest, mission binding, and file identity must match
  exactly.

## Stop Rules

Stop before any further effect if any of these occurs:

- approval is absent, modified, stale, old, or cross-version;
- the worktree is dirty or HEAD/action/packet/run binding differs;
- v1 lineage is missing, changed, reset, non-private, or has a terminal lock;
- the v2 attempt or global mailbox budget is exhausted;
- any output, marker, response, ready file, or lock already exists;
- the publisher is not prearmed, echo-disabled, and waiting;
- bridge path, ownership, permissions, file identity, digest, atomic order, or
  freshness is invalid;
- Gmail profile/tag binding, query binding, result bounds, or pagination is
  invalid or ambiguous;
- automation reference, active state, trigger, or first-email locator is not
  exact and verified;
- the subscriber is absent, ambiguous, suppressed, unsafe, inactive, or does
  not match the exact private identity anchor;
- the complete group snapshot is missing or ambiguous;
- preexisting first-email evidence conflicts with an absent-group assignment;
- any freshness gate expires;
- a duplicate effect is possible;
- the POST result is unknown, or immediate verification fails.

After a possible POST, unknown outcome or failed verification is terminal:
read back once as already permitted, never retry the assignment, never resend,
and close out honestly.

## Forbidden Scope

This contract does not authorize:

- operational reuse or execution of v1 approval, packet, request, marker,
  response, result, or search; the single private read-only packet comparison
  defined above is the only exception and grants no effect;
- a second v2 attempt or second mutation;
- subscriber upsert, PUT, resubscribe, field/status change, delete, or forget;
- group removal, replacement, unassignment, creation, or broad membership read;
- automation or campaign mutation;
- import, bulk, batch, segment, form, webhook, account, or settings changes;
- direct email send, resend, retrigger, or public/audience send;
- another person, subscriber, mailbox, recipient, group, automation, source, or
  account;
- Instagram, CRM/source writes, cards, scoring, Fact Store, Mati, or Launch OS
  work;
- secrets or raw private values in terminal output, chat, public documents, or
  redacted receipts;
- work in `/Users/alejandrogomez/CRM`.

## ChatGPT UI Handling Rule

If a ChatGPT UI consultant is used, compose the complete prompt before sending
and paste it as one complete message. Do not send partial lines by pressing
Enter during composition. Retrieve any consultant response with the UI's Copy
button so the complete answer can be reviewed; do not rely on partial manual
selection. This handling rule does not widen any live authority.

## Acceptance Criteria

The mission is complete only if one of these is evidenced and independently
reviewed:

- the exact group was already present, the no-op reread passed, and the bounded
  first-email evidence status was reported honestly; or
- the single add-only assignment was verified, every prior group was preserved,
  and the bounded first-email evidence status was reported honestly.

An unavailable email proof after the remaining bounded checks does not authorize
resend or retrigger. It must close as unverified delivery with the MailerLite
effect reported separately.

## Exact CEO Approval Phrase

The text below must be supplied exactly. This document does not approve itself.

```text
Apruebo el Mission Contract 2026-07-11.v2 exactamente como está escrito.

Autorizo una sola ejecución end-to-end adicional en Proof Mode. Esta autorización corresponde a exactamente un nuevo intento live pre-effect bajo v2; no reactiva ni reutiliza los 3/3 intentos agotados de v1. La contabilidad global de evidencia del buzón continúa en 3/8 y no puede superar 8/8.

Autorizo las lecturas live y privadas limitadas al mismo único contacto controlado, mismo suscriptor existente, mismo grupo trigger activo, misma automatización exacta de onboarding y mismo buzón controlado. Para este único buzón autorizo solamente la vinculación privada entre el destinatario exacto de Gmail con exactamente un +tag y su cuenta base exacta autenticada en gmail.com. La consulta debe conservar el destinatario exacto con +tag. No autorizo normalización de puntos, googlemail.com, otro dominio, otro tag, tag vacío o múltiple, perfil etiquetado, alias, cuenta, persona, fuente ni destinatario.

Antes de cada nueva búsqueda live de Gmail, el publisher debe haber pasado su prueba sintética end-to-end y debe estar prearmado en una sesión interactiva con echo deshabilitado y confirmado como waiting para el request privado exacto. Solo entonces autorizo el marker one-shot y la búsqueda Gmail limitada a IDs. Si no existe esa sesión waiting, deben quedar en cero el marker y la llamada al conector, y la ejecución debe detenerse. Después de crear un marker no autorizo replay, republicación ni repetición de la búsqueda.

Si el grupo ya está presente, debe hacerse no-op verificado, sin POST, resend ni retrigger. Si y solo si está ausente y todos los gates de identidad, seguridad, baseline, atomicidad y freshness están verdes, autorizo una única asignación add-only que preserve todos los grupos existentes y, como consecuencia, como máximo un primer correo automático de onboarding al mismo destinatario controlado. No autorizo ningún envío directo, resend o retrigger.

Autorizo la verificación inmediata, evidencia limitada de entrega dentro del presupuesto global restante, artefactos privados owner-only, recibo redactado, revisión adversarial independiente, una única integración central correspondiente a v2 y un closeout final. Si el resultado de una posible mutación queda desconocido o su verificación falla, debe hacerse stop terminal sin retry.

No reutilizo ni extiendo la aprobación de Mission Contract 2026-07-11.v1. Aplican todos los budgets, requisitos de atomicidad y freshness, stop rules y forbidden scope de v2. No autorizo ninguna ampliación de persona, suscriptor, fuente, destinatario, buzón, grupo, automatización, permiso o efecto.
```

Until that exact phrase is supplied after review, all live reads, markers,
connector calls, subscriber reads, mutations, and consequential email effects
remain unauthorized.
