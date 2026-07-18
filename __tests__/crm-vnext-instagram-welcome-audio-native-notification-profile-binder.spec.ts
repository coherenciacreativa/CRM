import { execFileSync } from "node:child_process";

import { describe, expect, test } from "vitest";

import * as binder from "../scripts/crm-vnext-instagram-welcome-audio-native-notification-profile-binder.mjs";

const NOW_MS = Date.parse("2026-07-18T15:00:00.000Z");
const TARGET = "synthetic.target";
const PROFILE_URL = `https://www.instagram.com/${TARGET}/`;

const tabs = ({
  privateBrowsing = false,
  activeTabIndex = 4,
  neutralTabIndex = 6,
  extraRegularTab = null as string | null,
  neutral = true,
} = {}) => [
  `application Instagram${privateBrowsing ? ", private browsing window" : ""}`,
  "  1 tab group description: Safari tabs, value: tab-group?isSeparate=false",
  "    2 tab Shared pinned tab, value: shared, tab?isPinned=true&isNarrow=true&isActive=false",
  `    ${activeTabIndex} tab Instagram, value: Instagram, tab?isPinned=false&isNarrow=false&isActive=true`,
  ...(neutral ? [
    `    ${neutralTabIndex} tab Neutral UI Preflight, value: Neutral UI Preflight, tab?isPinned=false&isNarrow=false&isActive=false`,
  ] : []),
  ...(extraRegularTab ? [extraRegularTab] : []),
];

const address = (value: string, index = 12) => (
  `  ${index} text field (settable, string) Description: smart search field, Value: ${value}, ID: WEB_BROWSER_ADDRESS_AND_SEARCH_FIELD`
);

const notificationAx = ({
  rowOrdinal = 1,
  target = TARGET,
  profileUrl = `https://www.instagram.com/${target}/`,
  profileLine = null as string | null,
  semantic = "started following you. 4 d",
  timeLine = null as string | null,
  secondLink = null as string | null,
  duplicateRow = false,
  outsideRow = [] as string[],
  notificationHeading = "Notifications",
  includeHeadingParent = true,
  surface = {} as Parameters<typeof tabs>[0],
  addressValue = "https://www.instagram.com/",
} = {}) => {
  const rows: string[] = [];
  for (let ordinal = 1; ordinal <= Math.max(rowOrdinal, 1); ordinal += 1) {
    const rowTarget = ordinal === rowOrdinal ? target : `synthetic.other${ordinal}`;
    const rowUrl = ordinal === rowOrdinal
      ? profileUrl
      : `https://www.instagram.com/${rowTarget}/`;
    rows.push(
      `      ${40 + ordinal * 10} group follower notification row ${ordinal}`,
      ...(ordinal === rowOrdinal
        ? [profileLine
          ? `        ${profileLine}`
          : `        ${41 + ordinal * 10} link ${rowTarget}, URL: ${rowUrl}`]
        : [`        ${41 + ordinal * 10} link ${rowTarget}, URL: ${rowUrl}`]),
      `        ${42 + ordinal * 10} text ${ordinal === rowOrdinal ? semantic : "started following you. 3 d"}`,
      ...(ordinal === rowOrdinal && timeLine ? [`        ${43 + ordinal * 10} text ${timeLine}`] : []),
      ...(ordinal === rowOrdinal && secondLink ? [`        ${44 + ordinal * 10} link decoy, URL: ${secondLink}`] : []),
      `        ${45 + ordinal * 10} button Follow`,
    );
  }
  if (duplicateRow) rows.push(
    "      180 group duplicate follower notification row",
    `        181 link ${target}, URL: ${profileUrl}`,
    "        182 text started following you. 4 d",
    "        183 button Follow",
  );
  return [
    ...tabs(surface),
    address(addressValue),
    "  20 group Instagram HTML content",
    ...(includeHeadingParent ? [
      "    30 group notifications panel",
      `      31 heading ${notificationHeading}`,
      ...rows,
      ...outsideRow,
    ] : [
      `  31 heading ${notificationHeading}`,
      ...rows,
    ]),
  ].join("\n");
};

const profileAx = ({
  target = TARGET,
  addressValue = PROFILE_URL,
  identityLines = [`    30 heading ${TARGET}`],
  profileHeaderLabel = "Profile header",
  includeProfileHeader = true,
  surface = {} as Parameters<typeof tabs>[0],
  extraLines = [] as string[],
  addressIndex = 12,
} = {}) => [
  ...tabs(surface),
  address(addressValue, addressIndex),
  "  20 group Instagram HTML content",
  ...(includeProfileHeader ? [
    `    25 group ${profileHeaderLabel}`,
    ...identityLines.map((line) => `      ${line.trimStart().replace(TARGET, target)}`),
  ] : identityLines.map((line) => line.replace(TARGET, target))),
  ...extraLines,
].join("\n");

const prepare = (
  rawText = notificationAx(),
  rowOrdinal = 1,
  nowMs = NOW_MS,
) => binder.prepareWelcomeAudioNativeNotificationProfileBindingForTest({
  raw_text: rawText,
  row_ordinal: rowOrdinal,
  now_ms: nowMs,
});

const confirm = (
  capability: unknown,
  rawText = profileAx(),
  nowMs = NOW_MS + 1_000,
) => binder.confirmWelcomeAudioNativeNotificationProfileBindingForTest({
  raw_text: rawText,
  private_activation_capability: capability,
  now_ms: nowMs,
});

const blocker = (result: ReturnType<typeof prepare>) => (
  result.redacted_receipt.blocker_codes[0]
);

describe("native notification to exact profile binder", () => {
  test("prepares and confirms one exact native-link binding with opaque one-use capabilities", () => {
    const prepared = prepare();
    expect(Object.keys(prepared)).toEqual([
      "private_activation_capability",
      "private_binding_capability",
      "private_link_element_index",
      "private_exact_target_utf8",
      "private_visible_time_bucket_utf8",
      "redacted_receipt",
    ]);
    expect(prepared.private_activation_capability).not.toBeNull();
    expect(prepared.private_binding_capability).toBeNull();
    expect(prepared.private_link_element_index).toBe(51);
    expect(prepared.private_exact_target_utf8).toBeNull();
    expect(prepared.private_visible_time_bucket_utf8).toBeNull();
    expect(prepared.redacted_receipt).toMatchObject({
      decision: binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.PREPARED,
      standard_safari: true,
      isolated_surface: true,
      notifications_heading_bound: true,
      selected_row_bound: true,
      native_profile_link_bound: true,
      follower_semantics_bound: true,
      visible_time_bucket_bound: true,
      capability_issued: true,
      live_authority: false,
      browser_used: false,
      network_used: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt(
      prepared.redacted_receipt,
    )).toEqual({ ok: true, reason: null });
    expect(Object.isFrozen(prepared.private_activation_capability)).toBe(true);
    expect(Object.keys(prepared.private_activation_capability!)).toEqual([]);
    expect(() => JSON.stringify(prepared.private_activation_capability)).toThrow(
      "opaque capability cannot be serialized",
    );

    const confirmed = confirm(prepared.private_activation_capability);
    expect(Object.keys(confirmed)).toEqual(Object.keys(prepared));
    expect(confirmed.private_binding_capability).not.toBeNull();
    expect(confirmed.private_link_element_index).toBeNull();
    expect(confirmed.private_exact_target_utf8).toBe(TARGET);
    expect(confirmed.private_visible_time_bucket_utf8).toBe("4 d");
    expect(confirmed.redacted_receipt).toMatchObject({
      decision: binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.CONFIRMED,
      standard_safari: true,
      isolated_surface: true,
      exact_profile_address_bound: true,
      unique_profile_identity_bound: true,
      capability_issued: true,
      live_authority: false,
      browser_used: false,
      network_used: false,
      external_effect_invoked: false,
      blocker_codes: [],
    });
    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt(
      confirmed.redacted_receipt,
    )).toEqual({ ok: true, reason: null });

    const expectedMetadata = {
      row_ordinal: 1,
      exact_target_utf8: TARGET,
      visible_time_bucket_utf8: "4 d",
      notification_attested_at: "2026-07-18T15:00:00.000Z",
      profile_attested_at: "2026-07-18T15:00:01.000Z",
    };
    const inspected = binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(
      confirmed.private_binding_capability,
    );
    expect(Object.keys(inspected!)).toEqual(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_METADATA_FIELDS,
    );
    expect(Object.isFrozen(inspected)).toBe(true);
    expect(inspected).toEqual(expectedMetadata);
    expect(binder.consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(
      confirmed.private_binding_capability,
    )).toBe(inspected);
    expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(
      confirmed.private_binding_capability,
    )).toBeNull();
    expect(binder.consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(
      confirmed.private_binding_capability,
    )).toBeNull();
  });

  test("binds a selected row ordinal within the hard cap", () => {
    const prepared = prepare(notificationAx({ rowOrdinal: 8 }), 8);
    expect(prepared.private_activation_capability).not.toBeNull();
    const target = TARGET;
    const confirmed = confirm(
      prepared.private_activation_capability,
      profileAx({
        target,
        addressValue: `https://www.instagram.com/${target}/`,
        identityLines: [`    30 heading ${target}`],
      }),
    );
    expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(
      confirmed.private_binding_capability,
    )).toMatchObject({ row_ordinal: 8, exact_target_utf8: target });
  });

  test.each([0, 9, 1.5, Number.NaN])("rejects invalid selected row ordinal %s", (rowOrdinal) => {
    expect(blocker(prepare(notificationAx(), rowOrdinal))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.INPUT_INVALID,
    );
  });

  test.each([
    ["missing parent", notificationAx({ includeHeadingParent: false })],
    ["missing heading", notificationAx({ notificationHeading: "Activity" })],
    ["duplicate heading", `${notificationAx()}\n      190 heading Notifications`],
    ["row outside panel", [
      ...tabs(),
      address("https://www.instagram.com/"),
      "  20 group Instagram HTML content",
      "    30 group notifications panel",
      "      31 heading Notifications",
      "  40 group follower notification row",
      `    41 link ${TARGET}, URL: ${PROFILE_URL}`,
      "    42 text started following you. 4 d",
      "    43 button Follow",
    ].join("\n")],
  ])("fails closed for %s", (_label, rawText) => {
    expect(prepare(rawText).private_activation_capability).toBeNull();
  });

  test("requires one indexed native row link", () => {
    expect(blocker(prepare(notificationAx({
      profileLine: `link ${TARGET}, URL: ${PROFILE_URL}`,
    })))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_LINK_INVALID,
    );
  });

  test.each([
    ["start URL label", `51 link URL ${PROFILE_URL}`],
    ["start Value label", `51 link Value: ${PROFILE_URL}`],
    ["URL label only", `51 link ${PROFILE_URL}`],
  ])("rejects %s as an exact native profile-link label", (_label, profileLine) => {
    expect(blocker(prepare(notificationAx({ profileLine })))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_LINK_INVALID,
    );
  });

  test.each([
    ["comma URL label", `51 link decoy, URL: ${PROFILE_URL}`],
    ["comma Value label", `51 link decoy, Value=${PROFILE_URL}`],
    ["conflicting flat fields", `51 link decoy, URL: ${PROFILE_URL}, Value: https://www.instagram.com/synthetic.decoy/`],
  ])("does not let %s override the exact native link label", (_label, profileLine) => {
    const prepared = prepare(notificationAx({ profileLine }));
    expect(prepared.private_activation_capability).not.toBeNull();
    const confirmed = confirm(prepared.private_activation_capability, profileAx());
    expect(blocker(confirmed)).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_ADDRESS_MISMATCH,
    );
  });

  test("ignores flattened destination text when label, address, and profile identity agree", () => {
    const prepared = prepare(notificationAx({
      profileLine: `51 link ${TARGET}, URL: https://example.com/decoy/`,
    }));
    const confirmed = confirm(prepared.private_activation_capability, profileAx());
    expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(
      confirmed.private_binding_capability,
    )?.exact_target_utf8).toBe(TARGET);
  });

  test("rejects a second native link inside the selected row", () => {
    expect(blocker(prepare(notificationAx({
      secondLink: "https://www.instagram.com/synthetic.decoy/",
    })))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_LINK_INVALID,
    );
  });

  test("rejects duplicate candidate rows with the selected exact native-link target", () => {
    expect(blocker(prepare(notificationAx({ duplicateRow: true })))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ROW_INVALID,
    );
  });

  test("rejects duplicate native indices anywhere in the observation", () => {
    const rawText = `${notificationAx()}\n      51 text duplicate element index`;
    expect(blocker(prepare(rawText))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AX_INVALID,
    );
  });

  test.each([
    ["no semantics", "liked your post. 4 d", null],
    ["arbitrary prefix", "decoy started following you. 4 d", null],
    ["split spoof", "decoy started following you.", "4 d"],
    ["too young", "started following you. 2 d", null],
    ["too old", "started following you. 8 d", null],
    ["hour bucket", "started following you. 23 h", null],
    ["duplicate exact event", "started following you. 4 d", "started following you. 4 days"],
  ])("rejects %s", (_label, semantic, timeLine) => {
    expect(prepare(notificationAx({ semantic, timeLine })).private_activation_capability)
      .toBeNull();
  });

  test.each(["3 d", "4 days", "5 días", "6 día", "7d"])(
    "accepts bounded visible catch-up bucket %s",
    (bucket) => {
      const prepared = prepare(notificationAx({ semantic: `started following you. ${bucket}` }));
      expect(prepared.private_activation_capability).not.toBeNull();
      const confirmed = confirm(prepared.private_activation_capability);
      expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(
        confirmed.private_binding_capability,
      )?.visible_time_bucket_utf8).toBe(bucket);
    },
  );

  test("confirms only an optional event prefix that matches the activated profile byte-for-byte", () => {
    const prepared = prepare(notificationAx({
      semantic: `${TARGET} started following you. 4 d`,
    }));
    expect(prepared.private_activation_capability).not.toBeNull();
    expect(confirm(prepared.private_activation_capability).private_binding_capability)
      .not.toBeNull();

    const wrong = prepare(notificationAx({
      semantic: `${TARGET}.decoy started following you. 4 d`,
    }));
    expect(wrong.private_activation_capability).toBeNull();

    const caseDrift = prepare(notificationAx({
      semantic: `${TARGET.toUpperCase()} started following you. 4 d`,
    }));
    expect(caseDrift.private_activation_capability).toBeNull();
  });

  test.each([
    ["private", notificationAx({ surface: { privateBrowsing: true } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PRIVATE_BROWSING],
    ["missing neutral", notificationAx({ surface: { neutral: false } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_INVALID],
    ["mixed regular tabs", notificationAx({ surface: {
      extraRegularTab: "    8 tab Other work, value: other, tab?isPinned=false&isNarrow=false&isActive=false",
    } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_INVALID],
    ["login", `${notificationAx()}\n      190 heading Log in`, binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AUTH_OR_CHALLENGE],
    ["challenge", `${notificationAx()}\n      190 text Challenge required`, binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AUTH_OR_CHALLENGE],
  ])("rejects %s notification surface", (_label, rawText, expectedBlocker) => {
    expect(blocker(prepare(rawText))).toBe(expectedBlocker);
  });

  test.each([
    "https://www.instagram.com/explore/",
    "https://www.instagram.com/?source=private",
    "https://www.instagram.com/#private",
  ])("requires the exact safe-start home address, not %s", (addressValue) => {
    expect(blocker(prepare(notificationAx({ addressValue })))).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_INVALID,
    );
  });

  test.each([
    ["wrong address", profileAx({ addressValue: `${PROFILE_URL}wrong` }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_ADDRESS_MISMATCH],
    ["case drift", profileAx({ identityLines: ["    30 heading Synthetic.Target"] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["substring", profileAx({ identityLines: [`    30 heading ${TARGET}.decoy`] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["address only", profileAx({ identityLines: [] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["missing positive profile header", profileAx({ includeProfileHeader: false }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["wrong profile header", profileAx({ profileHeaderLabel: "Sidebar" }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["duplicate positive profile header", profileAx({ extraLines: [
      "    32 group Profile header",
      `      33 heading ${TARGET}`,
    ] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["sidebar-only identity", profileAx({ identityLines: [], extraLines: [
      "    32 group Sidebar",
      `      33 heading ${TARGET}`,
    ] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["unavailable page with sidebar identity", profileAx({ identityLines: [], extraLines: [
      "    32 heading Sorry, this page isn't available.",
      "    33 group Sidebar",
      `      34 heading ${TARGET}`,
    ] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["contradictory unavailable page with positive header", profileAx({ extraLines: [
      "    32 heading This page isn’t available.",
    ] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["duplicate identity", profileAx({ identityLines: [
      `    30 heading ${TARGET}`,
      `    31 text ${TARGET} · Instagram`,
    ] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PROFILE_IDENTITY_INVALID],
    ["private", profileAx({ surface: { privateBrowsing: true } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.PRIVATE_BROWSING],
    ["tab drift", profileAx({ surface: { activeTabIndex: 7 } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_DRIFT],
    ["neutral drift", profileAx({ surface: { neutralTabIndex: 9 } }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.SURFACE_DRIFT],
    ["challenge", profileAx({ extraLines: ["    31 heading Checkpoint"] }), binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.AUTH_OR_CHALLENGE],
  ])("consumes activation and blocks profile confirmation on %s", (
    _label,
    rawText,
    expectedBlocker,
  ) => {
    const prepared = prepare();
    const result = confirm(prepared.private_activation_capability, rawText);
    expect(blocker(result)).toBe(expectedBlocker);
    expect(confirm(prepared.private_activation_capability).private_binding_capability).toBeNull();
  });

  test("consumes a stale activation at the exact expiry boundary", () => {
    const prepared = prepare();
    const stale = confirm(
      prepared.private_activation_capability,
      profileAx(),
      NOW_MS + binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_ACTIVATION_TTL_MS,
    );
    expect(blocker(stale)).toBe(
      binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_BLOCKER.ACTIVATION_STALE,
    );
    expect(confirm(prepared.private_activation_capability).private_binding_capability).toBeNull();
  });

  test("rejects foreign, cloned, and replayed activation and binding capabilities", () => {
    for (const foreign of [null, {}, Object.freeze({ marker: Symbol("foreign") })]) {
      expect(confirm(foreign).private_binding_capability).toBeNull();
      expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(foreign))
        .toBeNull();
      expect(binder.consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(foreign))
        .toBeNull();
    }
    const prepared = prepare();
    const cloned = { ...prepared.private_activation_capability };
    expect(confirm(cloned).private_binding_capability).toBeNull();
    const confirmed = confirm(prepared.private_activation_capability);
    const clonedBinding = { ...confirmed.private_binding_capability };
    expect(binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(clonedBinding))
      .toBeNull();
    expect(binder.consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(
      confirmed.private_binding_capability,
    )).not.toBeNull();
    expect(binder.consumeWelcomeAudioNativeNotificationProfileBindingCapabilityOnce(
      confirmed.private_binding_capability,
    )).toBeNull();
  });

  test("rejects proxy and accessor envelopes without invoking accessors", () => {
    let getterCalls = 0;
    const accessor = {} as Record<string, unknown>;
    Object.defineProperties(accessor, {
      raw_text: { get: () => { getterCalls += 1; return notificationAx(); }, enumerable: true },
      row_ordinal: { value: 1, enumerable: true },
      now_ms: { value: NOW_MS, enumerable: true },
    });
    expect(prepare(accessor as never).private_activation_capability).toBeNull();
    expect(getterCalls).toBe(0);
    const hostile = new Proxy({}, {
      ownKeys: () => { throw new Error("must not inspect proxy"); },
      get: () => { throw new Error("must not read proxy"); },
      getPrototypeOf: () => { throw new Error("must not inspect proxy prototype"); },
    });
    expect(() => prepare(hostile as never)).not.toThrow();
    expect(prepare(hostile as never).private_activation_capability).toBeNull();
    expect(() => binder.inspectWelcomeAudioNativeNotificationProfileBindingCapability(hostile))
      .not.toThrow();
  });

  test("receipts are exact aggregate-only allowlists with no private material", () => {
    const receipts = [
      prepare().redacted_receipt,
      prepare(notificationAx({ semantic: "liked your post. 4 d" })).redacted_receipt,
    ];
    for (const receipt of receipts) {
      expect(Object.keys(receipt)).toEqual(
        binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_RECEIPT_FIELDS,
      );
      const serialized = JSON.stringify(receipt);
      expect(serialized).not.toContain(TARGET);
      expect(serialized).not.toContain(PROFILE_URL);
      expect(serialized).not.toContain("Notifications");
      expect(serialized).not.toContain("4 d");
      expect(serialized).not.toContain("2026-");
      expect(serialized).not.toContain("follower notification row");
      expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt(receipt))
        .toEqual({ ok: true, reason: null });
    }
    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
      ...receipts[0],
      network_used: true,
    })).toEqual({ ok: false, reason: "receipt_decision_invalid" });
    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
      ...receipts[0],
      private_target: TARGET,
    })).toEqual({ ok: false, reason: "receipt_shape_invalid" });
  });

  test("receipt validation enforces exact stage, decision, and monotonic milestones", () => {
    const prepared = prepare();
    const confirmed = confirm(prepared.private_activation_capability);
    const prepareReceipt = prepared.redacted_receipt;
    const confirmReceipt = confirmed.redacted_receipt;

    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
      ...prepareReceipt,
      decision: binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_DECISION.CONFIRMED,
    }).ok).toBe(false);
    expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
      ...confirmReceipt,
      stage: binder.WELCOME_AUDIO_NATIVE_NOTIFICATION_PROFILE_BINDER_STAGE.PREPARE,
    }).ok).toBe(false);

    for (const field of [
      "standard_safari",
      "isolated_surface",
      "notifications_heading_bound",
      "selected_row_bound",
      "native_profile_link_bound",
      "follower_semantics_bound",
      "visible_time_bucket_bound",
    ] as const) {
      expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
        ...prepareReceipt,
        [field]: false,
      }).ok).toBe(false);
    }
    for (const field of [
      "standard_safari",
      "isolated_surface",
      "notifications_heading_bound",
      "selected_row_bound",
      "native_profile_link_bound",
      "follower_semantics_bound",
      "visible_time_bucket_bound",
      "exact_profile_address_bound",
      "unique_profile_identity_bound",
    ] as const) {
      expect(binder.validateWelcomeAudioNativeNotificationProfileBindingReceipt({
        ...confirmReceipt,
        [field]: false,
      }).ok).toBe(false);
    }
  });

  test("module import is inert and contains no browser, filesystem, network, or UI driver", () => {
    const script = [
      "globalThis.fetch = () => { throw new Error('network invoked'); };",
      `await import(${JSON.stringify(new URL(
        "../scripts/crm-vnext-instagram-welcome-audio-native-notification-profile-binder.mjs",
        import.meta.url,
      ).href)});`,
      "process.stdout.write('ok');",
    ].join("\n");
    expect(execFileSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8",
    })).toBe("ok");
  });
});
