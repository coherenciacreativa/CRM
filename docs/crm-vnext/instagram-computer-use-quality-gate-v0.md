# Instagram Computer Use Quality Gate v0

Date: 2026-06-10
Status: no-run CRM Core quality gate

## Purpose

This quality gate defines reusable safety and reporting rules for Instagram UI /
Computer Use work in CRM Core. It ensures that future captures prefer stable,
native Computer Use behavior and do not silently degrade into fragile coordinate
or screenshot-style navigation.

This quality gate does not authorize Instagram execution. It only defines how a
future approved Instagram UI capture must classify and report Computer Use
quality.

## Quality Modes

| Mode | Meaning | Policy |
| --- | --- | --- |
| `native_computer_use` | Preferred mode. App/page interaction appears stable and tool-supported. | Approved quality target for future captures. |
| `fresh_window_native_retry` | Allowed recovery mode after closing/reopening Safari or using a clean browser window. | Allowed once when the active action permits read-only recovery. |
| `safari_url_fallback_navigation` | URL navigation to a known safe starting surface. | Allowed only for navigation to Instagram home or notifications, not signal collection by clicking. |
| `screenshot_coordinate_fallback` | Coordinate or screenshot-driven interaction. | Not approved for Instagram signal capture unless Alejandro explicitly approves a narrow route. |
| `unknown` | Quality mode cannot be proven. | Treat as partial/degraded source health. |

## Required Reporting Fields

Every future Instagram UI capture receipt must include:

- `computerUseMode`;
- `fallbackUsed`;
- `fallbackReason`;
- `freshWindowUsed`;
- `coordinateBasedActions`;
- `screenshotOnlyNavigation`;
- `visiblePointerObservedByUser`: `true`, `false`, or `unknown`;
- `actionsPerformed`;
- `qualityGateStatus`: `green`, `yellow`, or `blocked`;
- `qualityGateMeaning`.

These fields belong in redacted receipts and do not require printing private
content.

## Quality Gate Status

| Status | Meaning |
| --- | --- |
| `green` | Native/stable Computer Use was used, no fallback was needed, no coordinate-based actions occurred, and `actionsPerformed` remained `0`. |
| `yellow` | Read-only navigation fallback or fresh-window retry occurred, no source actions occurred, and aggregate observation remained bounded. |
| `blocked` | Native Computer Use was unavailable and the next step required interaction, coordinate fallback, private-surface access, or any visible action risk. |

Unknown quality must not be reported as green.

## Preferred Route

Preferred route for future Instagram captures:

1. Use native/stable Computer Use.
2. If native interaction fails, stop and optionally perform one clean browser
   reset if the active action allows it.
3. A clean browser reset means closing/reopening Safari or opening a fresh
   window and returning to the known safe Instagram surface.
4. Retry at most once.
5. If the route is still degraded, stop and report `qualityGateStatus=blocked`
   or `qualityGateStatus=yellow`, depending on whether only safe navigation
   occurred.

If Alejandro is using the computer, stop.

## Allowed Fallback

Safari URL fallback may be used only to navigate to a known safe starting
surface:

- Instagram home;
- Instagram notifications.

URL fallback must not be used to:

- click notification items;
- open DMs;
- collect story viewers;
- inspect private threads;
- perform source actions;
- infer private content.

## Forbidden Without New Approval

The following are forbidden unless Alejandro explicitly approves a narrow route:

- blind coordinate clicking;
- screenshot-coordinate navigation for private surfaces;
- clicking notification items;
- opening DMs or story viewers by coordinate;
- continuing after click-tool refusal if the next step requires interaction;
- any visible Instagram action.

## Fresh-Window Recovery

If Computer Use appears degraded, Codex may stop and recommend or perform one
fresh-window recovery only when allowed by the active action.

Fresh-window recovery must:

- stay read-only;
- avoid closing unrelated user work;
- return only to the known safe Instagram surface;
- avoid private surfaces;
- avoid notification item clicks;
- avoid DMs, story viewers, welcome audio, or source actions.

If Alejandro is using the computer, stop.

## Stop Conditions

Stop immediately on:

- login, checkpoint, CAPTCHA, or auth ambiguity;
- unexpected modal;
- active computer use by Alejandro;
- native Computer Use unavailable and the next step requires interaction;
- click tool refusal when the route would require clicking;
- coordinate fallback needed for private surfaces;
- ambiguity about visible action;
- any need to print private content.

## Promotion Rule

Do not promote Instagram notifications capture to a daily ritual unless at least
2-3 captures have:

- `qualityGateStatus=green`, or explicitly acceptable `yellow`;
- no actions performed;
- no private content printed;
- no read-state issue;
- no coordinate-based actions.

Daily ritual promotion must remain separate from story viewer collection,
DM/email handoff extraction, welcome audio, CRM writes, scoring, and outreach.

## Closed Gates

This quality gate keeps the following gates closed:

- no Instagram action;
- no DM sent;
- no welcome audio;
- no story viewer collection;
- no private thread opening;
- no CRM writes;
- no Signal Event Ledger writes;
- no Engagement Snapshot Ledger writes;
- no card writes;
- no Fact Store writes;
- no source-result ledger writes;
- no scoring writes;
- no outreach;
- no source mutation;
- no Launch OS touch;
- no `/Users/alejandrogomez/CRM` use.
