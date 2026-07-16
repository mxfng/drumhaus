import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

import { gotoApp, step, toggleStep, waitForAppReady } from "./helpers";

/**
 * Per-preset library storage (docs/preset-persistence.md, "Library storage:
 * documents under per-preset keys", PR 6): saved presets are their own
 * storage entries, hydrated synchronously at boot so a saved preset is in the
 * select immediately after reload (no flash, no async fill racing first
 * paint). Adoption migrates the legacy customPresets array into entries,
 * backing it up and quarantining what fails to parse.
 */

const LEGACY_PRESET_META_KEY = "drumhaus-preset-meta-storage";
const LIBRARY_BACKUP_KEY = "drumhaus-library-backup";
const LIBRARY_INDEX_KEY = "drumhaus-preset-index";
const LIBRARY_ENTRY_PREFIX = "drumhaus-preset-";
const QUARANTINE_PREFIX = "drumhaus-preset-quarantine-";

/**
 * The preset select trigger, matched by its stable aria-label rather than the
 * combobox role: opening the per-preset Manage dialog leaves the select
 * expanded (the "..." button suppresses the default close), and the trigger's
 * computed accessible name shifts while expanded, so a role+name lookup can
 * miss it. The aria-label locator is unaffected by expansion.
 */
function presetTrigger(page: Page) {
  return page.locator('[aria-label="Preset"]');
}

/**
 * Close the preset select. Two states must be handled: a genuinely-open
 * select (content mounted, overlapping the trigger) closes on Escape; a
 * select left stuck-open by a Manage-dialog flow (trigger reports open but
 * its listbox is unmounted, so Escape has nothing to dismiss) resets on a
 * direct trigger click. No-op when already closed.
 */
async function closePresetSelect(page: Page): Promise<void> {
  const trigger = presetTrigger(page);
  if ((await trigger.getAttribute("aria-expanded")) !== "true") return;
  await page.keyboard.press("Escape");
  if ((await trigger.getAttribute("aria-expanded")) === "true") {
    await trigger.click();
  }
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
}

/** Open the preset select from any state (resetting a stuck-open one). */
async function openPresetSelect(page: Page): Promise<void> {
  const trigger = presetTrigger(page);
  await closePresetSelect(page);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

/** Save the current (factory) state as a new custom preset via the dialog. */
async function saveAsPreset(page: Page, name: string): Promise<void> {
  await page.getByRole("button", { name: "Save preset" }).click();
  const dialog = page.getByRole("dialog", { name: "Save Preset" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Preset name").fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(presetTrigger(page)).toHaveText(name);
}

/** Open the preset select and pick an option by exact name. */
async function selectPreset(page: Page, name: string): Promise<void> {
  await openPresetSelect(page);
  await page.getByRole("option", { name, exact: true }).click();
}

/** Open the per-preset Manage dialog (the "..." action on a custom row). */
async function openManageDialog(page: Page, name: string): Promise<void> {
  await openPresetSelect(page);
  const option = page.getByRole("option", { name, exact: true });
  await expect(option).toBeVisible();
  // The row wraps the option (role) and its sibling "..." action button.
  await option.locator("..").getByRole("button").click();
  await expect(
    page.getByRole("dialog", { name: "Manage Preset" }),
  ).toBeVisible();
}

async function presetOptionCount(page: Page, name: string): Promise<number> {
  await openPresetSelect(page);
  const count = await page.getByRole("option", { name, exact: true }).count();
  await closePresetSelect(page);
  return count;
}

test.describe("preset library storage", () => {
  // These flows are storage-heavy and UI-driven (dialogs, preset select). Run
  // them serially so they never pile onto parallel workers simultaneously and
  // race the 10s expect timeout under local CPU contention (issue #367).
  test.describe.configure({ mode: "serial" });

  test("a saved preset survives reload and applies its edit when selected", async ({
    page,
  }) => {
    await gotoApp(page);

    // A distinctive edit the saved preset must carry.
    await toggleStep(page, 0, "true");
    await saveAsPreset(page, "Reload Beat");

    await page.reload();
    await waitForAppReady(page);

    // Boot hydrated the library synchronously: the preset is in the select.
    expect(await presetOptionCount(page, "Reload Beat")).toBe(1);

    // Prove selection applies the stored document: switch to init (empty),
    // then back to the saved preset restores the edit.
    await selectPreset(page, "init");
    await expect(step(page, 0)).toHaveAttribute("data-active", "false");

    await selectPreset(page, "Reload Beat");
    await expect(presetTrigger(page)).toHaveText("Reload Beat");
    await expect(step(page, 0)).toHaveAttribute("data-active", "true");
  });

  test("a deleted preset stays gone after reload", async ({ page }) => {
    await gotoApp(page);

    await saveAsPreset(page, "Doomed Beat");
    // Move off the saved preset (clean) so deleting it does not leave it as
    // the current selection.
    await selectPreset(page, "init");

    await openManageDialog(page, "Doomed Beat");
    await page.getByRole("button", { name: "Delete" }).click();
    const confirm = page.getByRole("dialog", { name: "Delete Preset?" });
    await expect(confirm).toBeVisible();
    await confirm.getByRole("button", { name: "Delete" }).click();
    await expect(confirm).not.toBeVisible();

    // Reload to a clean page (opening the Manage dialog from within the select
    // leaves the trigger in a stuck-open state) and confirm the delete stuck.
    await page.reload();
    await waitForAppReady(page);
    expect(await presetOptionCount(page, "Doomed Beat")).toBe(0);
  });

  test("a duplicated-and-renamed preset persists across reload", async ({
    page,
  }) => {
    await gotoApp(page);

    await saveAsPreset(page, "Source Beat");

    // Duplicate: the dialog suggests "Source Beat Copy".
    await openManageDialog(page, "Source Beat");
    await page.getByRole("button", { name: "Duplicate" }).click();
    const dupDialog = page.getByRole("dialog", { name: "Duplicate Preset" });
    await expect(dupDialog).toBeVisible();
    await dupDialog.getByRole("button", { name: "Duplicate" }).click();
    await expect(dupDialog).not.toBeVisible();

    // Reload to a clean page (the Manage dialog leaves the trigger stuck open)
    // and confirm the duplicate persisted through the per-preset entry write.
    await page.reload();
    await waitForAppReady(page);
    expect(await presetOptionCount(page, "Source Beat Copy")).toBe(1);

    // Rename the copy.
    await openManageDialog(page, "Source Beat Copy");
    await page.getByRole("button", { name: "Rename" }).click();
    const renameDialog = page.getByRole("dialog", { name: "Rename Preset" });
    await expect(renameDialog).toBeVisible();
    await renameDialog.getByLabel("Preset name").fill("Renamed Beat");
    await renameDialog.getByRole("button", { name: "Rename" }).click();
    await expect(renameDialog).not.toBeVisible();

    await page.reload();
    await waitForAppReady(page);

    expect(await presetOptionCount(page, "Renamed Beat")).toBe(1);
    expect(await presetOptionCount(page, "Source Beat Copy")).toBe(0);
  });

  test("adopts a legacy library, backing up and quarantining", async ({
    page,
  }) => {
    // A real preset document with a distinctive edit (voice 0, variation A,
    // step 5), built from a shipped default so the embedded kit resolves on
    // adoption. init.dh is now a v2.1 document: pattern/channels/master live at
    // the top level (no legacy `sequencer` wrapper).
    const validPreset = JSON.parse(
      readFileSync(
        new URL("../src/core/dh/defaults/init.dh", import.meta.url),
        "utf-8",
      ),
    ) as {
      meta: { id: string; name: string };
      pattern: { voices: { variations: { triggers: boolean[] }[] }[] };
    };
    validPreset.meta = {
      ...validPreset.meta,
      id: "adopted-valid",
      name: "Adopted Beat",
    };
    validPreset.pattern.voices[0].variations[0].triggers[5] = true;

    // A corrupt custom preset: passes the kind/version gate, fails the schema.
    const corruptPreset = {
      kind: "drumhaus.preset",
      version: 1,
      meta: { id: "adopted-corrupt", name: "Corrupt Beat" },
    };

    const legacyEnvelope = {
      state: {
        currentPresetMeta: {
          id: "adopted-current",
          name: "Legacy Current",
          createdAt: "2025-11-20T12:00:00.000Z",
          updatedAt: "2025-11-20T12:00:00.000Z",
        },
        currentKitMeta: { id: "kit-0", name: "808" },
        customPresets: [validPreset, corruptPreset],
      },
      version: 1,
    };

    await page.addInitScript(
      ({ key, value }: { key: string; value: unknown }) => {
        localStorage.setItem(key, JSON.stringify(value));
      },
      { key: LEGACY_PRESET_META_KEY, value: legacyEnvelope },
    );

    await page.goto("/");
    await waitForAppReady(page);

    // The valid legacy preset adopted into an entry and is selectable, and
    // applying it restores its edit (step 5 of variation A).
    expect(await presetOptionCount(page, "Adopted Beat")).toBe(1);
    await selectPreset(page, "Adopted Beat");
    await expect(step(page, 5)).toHaveAttribute("data-active", "true");

    // Storage after adoption: backup written verbatim, corrupt entry
    // quarantined per id, the legacy key retired.
    const storage = await page.evaluate(
      ({ legacyKey, backupKey, entryPrefix, quarantinePrefix, indexKey }) => {
        const keys = Object.keys(localStorage);
        return {
          legacy: localStorage.getItem(legacyKey),
          backup: localStorage.getItem(backupKey),
          quarantineKeys: keys.filter((k) => k.startsWith(quarantinePrefix)),
          // Entry keys, excluding the index and quarantine keys sharing the
          // prefix.
          entryKeys: keys.filter(
            (k) =>
              k.startsWith(entryPrefix) &&
              k !== indexKey &&
              !k.startsWith(quarantinePrefix),
          ),
        };
      },
      {
        legacyKey: LEGACY_PRESET_META_KEY,
        backupKey: LIBRARY_BACKUP_KEY,
        entryPrefix: LIBRARY_ENTRY_PREFIX,
        quarantinePrefix: QUARANTINE_PREFIX,
        indexKey: LIBRARY_INDEX_KEY,
      },
    );

    expect(storage.legacy).toBeNull();
    expect(storage.backup).not.toBeNull();
    expect(storage.quarantineKeys).toContain(
      `${QUARANTINE_PREFIX}adopted-corrupt`,
    );
    expect(storage.entryKeys).toContain(`${LIBRARY_ENTRY_PREFIX}adopted-valid`);
  });
});
