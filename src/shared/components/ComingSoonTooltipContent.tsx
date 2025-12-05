/**
 * Coming soon tooltip content component.
 *
 * Usage:
 *   <ComingSoonTooltipContent tooltip="The tooltip text" />
 */
export const ComingSoonTooltipContent = ({ tooltip }: { tooltip: string }) => {
  return (
    <div>
      <p>Coming Soon</p>
      <p className="text-primary-foreground/75">{tooltip}</p>
    </div>
  );
};
