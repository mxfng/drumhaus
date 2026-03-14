/**
 * Coming soon tooltip content component.
 *
 * Usage:
 *   <ComingSoonTooltipContent tooltip="The tooltip text" />
 */
const ComingSoonTooltipContent = ({ tooltip }: { tooltip: string }) => {
  return (
    <div>
      <p>Coming Soon</p>
      <p className="text-primary-foreground/75">{tooltip}</p>
    </div>
  );
};

export { ComingSoonTooltipContent };
