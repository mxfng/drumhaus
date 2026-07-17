/**
 * Whether the current platform uses Mac-style modifier keys, for building
 * keyboard-shortcut labels in instrument menus.
 */
const IS_MAC_LIKE =
  typeof navigator !== "undefined" &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform);

/** Pick the platform-appropriate shortcut label. */
function platformShortcutLabel(macLabel: string, otherLabel: string): string {
  return IS_MAC_LIKE ? macLabel : otherLabel;
}

export { IS_MAC_LIKE, platformShortcutLabel };
