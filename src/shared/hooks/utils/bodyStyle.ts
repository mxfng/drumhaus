/**
 * Apply a set of style overrides to document.body and return a cleanup
 * function that restores the previous values. Keys should be CSS property
 * names in kebab-case (e.g. "user-select", "padding-right").
 */
export function applyBodyStyleOverrides(
  overrides: Record<string, string>,
): () => void {
  const style = document.body.style;
  const previous: Record<string, string> = {};

  Object.entries(overrides).forEach(([property, value]) => {
    previous[property] = style.getPropertyValue(property);
    style.setProperty(property, value);
  });

  return () => {
    Object.entries(previous).forEach(([property, value]) => {
      style.setProperty(property, value);
    });
  };
}
