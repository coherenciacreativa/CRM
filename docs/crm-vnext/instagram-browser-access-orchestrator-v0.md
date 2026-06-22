# Instagram Browser Access Orchestrator v0

Date: 2026-06-21
Status: no-run CRM Core design

## Purpose

Define a single browser-access entry gate for CRM Core Instagram work.

The orchestrator must:

- test browser-control health before private Instagram work;
- select a healthy backend;
- perform a bounded autonomous soft recovery;
- switch safely to the alternate backend when appropriate;
- block without coordinates or screenshots if both backends fail;
- require no routine Alejandro intervention.

This orchestrator does not authorize Instagram signal collection by itself.
Every Instagram route still needs its own active action and explicit approval.

## Supported Backends

### `chrome_extension`

Codex Chrome extension / `@Chrome`.

Appropriate when:

- the extension is `Connected`;
- the Chrome plugin is enabled;
- the expected Chrome profile matches;
- neutral click and keyboard preflight pass;
- an authenticated Instagram browser session is needed.

### `native_computer_use`

Native Codex Computer Use controlling Safari or a dedicated browser window.

Appropriate when:

- neutral native click and keyboard preflight pass;
- accessibility and screen-control state are healthy;
- stable pointer/app interaction is available.

### `os_open_route_initialization`

OS/browser URL opening used only to launch a known safe UI surface.

Rules:

- route initialization only;
- not a data-capture backend;
- cannot by itself satisfy click or keyboard health;
- cannot be reported as successful browser control.

### Explicitly Forbidden Backends

- blind coordinate clicking;
- screenshot-coordinate navigation;
- screenshot-only private-surface capture;
- OCR-driven private UI traversal;
- raw DOM/page-source scraping unless separately approved;
- developer tools/network inspection unless separately approved.

## Backend Selection Policy

Do not permanently hard-code Safari or Chrome as always preferred.

Selection order:

1. Read the latest redacted orchestrator receipts, if available.
2. Prefer the most recent backend that completed a green run and does not have
   two consecutive recent failures.
3. Run that backend's neutral preflight.
4. If it passes, select it.
5. If it fails, perform its one approved soft recovery.
6. If recovery fails, test the alternate backend.
7. If the alternate backend passes, switch to it.
8. If both backends fail, block the run.

Suggested statuses:

- `backend_selected_chrome_extension`;
- `backend_selected_native_computer_use`;
- `backend_switched_after_primary_failure`;
- `all_safe_backends_blocked`;
- `human_intervention_required`.

No Instagram private surface may be opened until a backend passes its neutral
click and keyboard preflight.

## Neutral Preflight Requirements

### Chrome Extension Preflight

Confirm:

- `chromeExtensionConnected`;
- `chromePluginEnabled`;
- `chromeProfileMatched`;
- `chromeClickAvailable`;
- `chromeKeyboardAvailable`;
- `browserHistoryAccessUsed=false`;
- `nativeComputerUseUsed=false`;
- `coordinateBasedActions=false`;
- `screenshotOnlyNavigation=false`.

Use a neutral local HTTP test page, not Instagram.

### Native Computer Use Preflight

Confirm:

- `nativeClickAvailable`;
- `nativeKeyboardAvailable`;
- `coordinateBasedActions=false`;
- `screenshotOnlyNavigation=false`.

Use:

```text
/tmp/crm_core_computer_use_preflight.html
```

or another neutral local surface outside the repo.

If click fails, keyboard may still be tested only if doing so is safe and does
not violate an immediate stop condition. The receipt must distinguish:

- click failed;
- keyboard failed;
- keyboard not tested.

## Chrome Extension Autonomous Soft Recovery

A run may attempt one bounded Chrome-extension recovery.

Allowed recovery sequence:

1. Reconfirm plugin enabled and expected Chrome profile.
2. Open a new clean tab or new window in the same approved Chrome profile.
3. Navigate to a neutral local preflight page.
4. Recheck extension click and keyboard.
5. If still unresponsive, optionally relaunch only the dedicated automation
   Chrome profile/process if:
   - a dedicated automation profile exists;
   - no unrelated Alejandro work would be closed;
   - the active action explicitly permits browser relaunch.
6. Recheck neutral preflight once.
7. If still blocked, switch to native Computer Use.

Do not:

- ask Alejandro to click Connected during a routine run;
- rely on browser history;
- close unrelated Chrome windows;
- enable always-allow browser content;
- reinstall extensions during a normal run;
- create a new Codex chat/thread from inside the run;
- continue through an unresponsive extension.

Creating a new thread, reinstalling the extension, changing macOS permissions,
or manually reconnecting the extension are hard-recovery/human-intervention
actions, not successful autonomous recovery.

## Native Computer Use Autonomous Soft Recovery

A run may attempt one bounded native recovery.

Allowed recovery sequence:

1. Re-read the current app/browser state.
2. Open a clean browser tab or window.
3. Navigate to the neutral local preflight page.
4. Recheck native click and keyboard.
5. If the active action permits it and unrelated user work will not be affected,
   relaunch only the dedicated automation browser once.
6. Recheck neutral preflight once.
7. If still blocked, switch to the Chrome-extension backend.

Do not:

- close unrelated Safari/Chrome windows;
- close Alejandro's unsaved work;
- use coordinates after native click refusal;
- treat OS URL opening as proof that Computer Use interaction is healthy.

Restarting the Codex app, repairing Accessibility/Screen Recording permissions,
or reinstalling the Computer Use plugin are hard-recovery/human-intervention
actions, not successful autonomous recovery.

## Dedicated Automation Browser Profile

Recommended, but not created in this task:

- a dedicated Chrome profile such as `Mantis Automation`;
- Instagram signed in only to the intended account;
- Codex Chrome extension installed and `Connected`;
- no personal browsing tabs;
- no unsaved human work;
- browser history access disabled;
- domain access granted narrowly.

A dedicated browser profile allows safe relaunch without disrupting Alejandro.

The orchestrator must still support native Computer Use if the Chrome backend is
unhealthy.

## Pilot Result And Production Backend Policy

The neutral dual-backend browser orchestrator pilot
`crm_core_instagram_browser_access_orchestrator_pilot_2026-06-22` completed with
`qualityGateStatus=yellow`.

Findings:

- Chrome Extension passed as the selected primary backend.
- Native Computer Use passed the neutral functional click/keyboard test.
- Native Computer Use failed the operational-isolation test because cleanup
  surfaced an unrelated Safari tab to Computer Use output.
- `humanInterventionRequired=false`.
- `captureExecuted=false`.
- No Instagram capture, private website access, CRM/source write, or Launch OS
  work occurred.

### Primary-green Short Circuit

For routine approved Instagram routes:

- if the selected primary backend passes click and keyboard preflight, continue
  with that backend;
- do not test the alternate backend during the same private-route run merely for
  audit completeness;
- alternate-backend testing belongs in neutral certification/maintenance runs or
  after primary failure;
- this reduces private surface area and avoids exposing unrelated browser state.

### Chrome Production Status

- `chrome_extension` is the preferred Instagram backend for the next three
  approved runs, subject to a green preflight each time;
- it may use the authenticated approved Chrome profile;
- browser history remains disabled;
- no human reconnection counts as autonomous success;
- if Chrome passes, do not invoke native Computer Use.

### Native Backend Isolation Rule

Native Computer Use may be selected for private Instagram routes only when one
of these is true:

- a dedicated automation browser/profile/window is being used; or
- the run can prove that closing or leaving its neutral/private tab will not
  expose unrelated Alejandro browser state.

Otherwise classify:

```text
nativeBackendPrivateRouteEligibility=blocked_by_browser_isolation
```

A native backend blocked by isolation may still be tested on a neutral page, but
must not be selected for private Instagram work.

### Cleanup Safety

- Never close a neutral test tab when doing so would reveal an unrelated
  existing browser tab to Computer Use output.
- Prefer a dedicated automation window/profile.
- Close only a dedicated automation window when safe.
- If isolation cannot be proven, leave the neutral page in place, stop browser
  interaction, and record the blocker.
- Do not inspect, describe, or record underlying user tab metadata.

### Alternate Audit Policy

Defined modes:

- `alternateBackendTestMode=not_tested_primary_green`
- `alternateBackendTestMode=neutral_certification`
- `alternateBackendTestMode=tested_after_primary_failure`

Routine private-route default:

```text
alternateBackendTestMode=not_tested_primary_green
```

### Additional Receipt Fields

Future browser-access receipts should also include:

- `alternateBackendTestMode`
- `dedicatedBrowserContextUsed`
- `nativeBackendPrivateRouteEligibility`
- `unrelatedBrowserStateExposureRisk`
- `cleanupSafetyStatus`
- `primaryGreenShortCircuitUsed`

## Recovery Budget

Per run:

- maximum one soft recovery per backend;
- maximum one backend switch;
- recommended total recovery budget: 3 minutes;
- no infinite retry loops;
- no repeated browser relaunch cycles;
- no human intervention request during routine capture.

If the budget is exhausted:

- set `humanInterventionRequired=true`;
- set `captureExecuted=false`;
- write a redacted blocked receipt;
- stop.

A run with `humanInterventionRequired=true` does not count as an autonomous
successful run.

## Fresh-Run Automation Policy

Future standing automation should start a fresh isolated Codex run for each
scheduled capture, rather than depend indefinitely on one long-lived thread.

Design guidance:

- one fresh run per schedule;
- neutral browser preflight first;
- browser orchestrator second;
- Instagram capture only after a green backend;
- no shared stale browser references across runs;
- no assumption that yesterday's `Connected`/plugin state remains healthy.

Do not create or schedule an automation in this task.

## Instagram Route Boundary

After backend selection, the orchestrator may hand off only to an already
approved exact Instagram route.

Examples:

- notifications capture;
- own-story surface route;
- story viewer initial-window capture;
- stable story-identifier discovery;
- story-anchor dedupe capture.

The orchestrator itself does not authorize:

- opening viewer lists;
- collecting viewer identities;
- DMs;
- story pausing/holding;
- screenshots/fingerprints;
- full-list traversal;
- welcome audio;
- Instagram actions;
- CRM writes.

Those require their own active action and approval.

## Route-Specific Backend Evidence

### Own-story route evidence

- `chrome_extension + own_story_surface`:
  `degraded_ui_visibility_mismatch`.
- `native_computer_use + dedicated_safari + own_story_surface`:
  `route_reached_green`.
- For own-story routes, prefer native Computer Use in a dedicated isolated
  Safari window until Chrome visibility improves.
- Do not test Chrome first for this exact route merely for audit completeness.
- Dedicated-window cleanup must return to the neutral local page.
- This route preference does not authorize viewer lists, screenshots,
  fingerprints, DMs, Instagram actions, CRM writes, source writes, Launch OS, or
  `/Users/alejandrogomez/CRM`.

### Stable-ID route evidence

- Metadata-only UI discovery produced only low-confidence composite identity.
- The source class was `lifecycle_stack_timing_composite`.
- Same-story consistency was confirmed for one reachable story.
- A second active story was not reachable through a safe accessibility control.
- Do not repeatedly retry metadata-only discovery as the primary confidence
  hardening route.
- A fingerprint route requires separate explicit approval.

## Required Receipt Fields

Every future browser-access receipt must include:

- `orchestratorRunId`;
- `startedAt`;
- `recoveryBudgetSeconds`;
- `primaryBackendCandidate`;
- `primaryBackendPreflightStatus`;
- `primaryBackendRecoveryAttempted`;
- `primaryBackendRecoveryOutcome`;
- `alternateBackendTested`;
- `alternateBackendPreflightStatus`;
- `alternateBackendTestMode`;
- `backendSwitchUsed`;
- `browserBackendSelected`;
- `chromeExtensionConnected`;
- `chromePluginEnabled`;
- `chromeProfileMatched`;
- `chromeClickAvailable`;
- `chromeKeyboardAvailable`;
- `nativeClickAvailable`;
- `nativeKeyboardAvailable`;
- `freshWindowUsed`;
- `browserRestarted`;
- `osOpenUrlUsed`;
- `coordinateBasedActions`;
- `screenshotOnlyNavigation`;
- `browserHistoryAccessUsed`;
- `dedicatedBrowserContextUsed`;
- `nativeBackendPrivateRouteEligibility`;
- `unrelatedBrowserStateExposureRisk`;
- `cleanupSafetyStatus`;
- `primaryGreenShortCircuitUsed`;
- `humanInterventionRequired`;
- `captureExecuted`;
- `qualityGateStatus`;
- `blockers`;
- `recommendedNextStep`.

Receipts must not contain:

- account handles;
- private URLs;
- tokens;
- cookies;
- session identifiers;
- story/viewer identifiers;
- screenshots;
- private browser content;
- raw extension or native-host internals.

## Quality States

### `green`

- selected backend click and keyboard passed;
- no coordinates/screenshots;
- no human intervention;
- recovery either not needed or succeeded autonomously;
- approved Instagram route may continue.

### `yellow`

- backend switch or one soft recovery was needed;
- final selected backend passed;
- no coordinates/screenshots;
- no human intervention;
- approved route may continue but receipt must record degradation.

### `blocked`

- no safe backend passed;
- recovery budget exhausted;
- human intervention required;
- private Instagram route must not start.

Unknown must never be reported as green.

## Failure-Streak Policy

Use recent redacted orchestrator receipts only.

Suggested policy:

- one isolated backend failure: keep backend eligible;
- two consecutive failures: demote backend to secondary for the next three runs;
- one later green neutral preflight: clear one failure;
- two later green runs: restore normal eligibility.

Do not store browser health in CRM cards, ledgers, Fact Store, or general
memory.

## Stop Conditions

Stop on:

- both backends failing neutral preflight;
- recovery budget exhausted;
- extension disconnected after recovery;
- native click/keyboard unavailable after recovery;
- wrong Chrome profile/account context;
- login/checkpoint/CAPTCHA;
- unexpected modal;
- active computer use by Alejandro;
- risk of closing unrelated user work;
- coordinate/screenshot fallback requirement;
- browser history required;
- private content exposure;
- exact Instagram route lacks approval;
- source or CRM mutation would be required.

## What Remains Separate

- Instagram notifications standing operation;
- story viewer initial-window capture;
- full-list traversal;
- stable-ID discovery;
- visual fingerprint route;
- DMs/email handoff;
- welcome audio;
- Instagram API/webhook investigation;
- CRM writes, ledgers, cards, Fact Store, scoring;
- outreach;
- Launch OS.

## Closed Gates

- no browser execution in this design task;
- no Instagram access;
- no Computer Use;
- no `@Chrome`;
- no viewer collection;
- no DMs;
- no screenshots/fingerprints;
- no welcome audio;
- no CRM/source writes;
- no Launch OS;
- no `/Users/alejandrogomez/CRM`.
