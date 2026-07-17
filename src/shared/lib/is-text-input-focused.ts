/**
 * True when keyboard focus sits in a text-entry element (input, textarea,
 * select, or content-editable). Global shortcut handlers use this to stand
 * down so typing - and the browser's native field behavior like input undo -
 * is never hijacked.
 */
function isTextInputFocused(): boolean {
  const activeElement = document.activeElement;
  return (
    activeElement instanceof HTMLInputElement ||
    activeElement instanceof HTMLTextAreaElement ||
    activeElement instanceof HTMLSelectElement ||
    (activeElement instanceof HTMLElement && activeElement.isContentEditable)
  );
}

export { isTextInputFocused };
