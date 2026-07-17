/**
 * The headless `Knob` compound primitive.
 *
 * A Radix-style, unstyled composition around the descriptor-driven interaction
 * engine (`useParamControl`). `Knob.Root` runs the engine and shares its state
 * through context; the part slots (`Knob.Track`, `Knob.Indicator`, `Knob.Value`)
 * are unstyled and carry no look of their own. Drumhaus's neumorphic controls
 * (`RotaryKnob`, `LinearSlider`) compose their styling on top; a future
 * standalone instrument can reuse the same primitive with its own skin, or reuse
 * the whole styled control.
 *
 *   <Knob.Root descriptor value onChange>
 *     <Knob.Track>          // interactive surface: role/aria + all handlers
 *       <Knob.Indicator />  // position-driven visual (tick, thumb)
 *     </Knob.Track>
 *     <Knob.Value />         // the display string projected from canonical
 *   </Knob.Root>
 *
 * The public contract is canonical-only, exactly as the engine: `value` and
 * `onChange` speak canonical units; the normalized position stays internal and
 * is read (for styling transforms) through `useKnob()`.
 *
 * Every part supports Radix's `asChild` so styling can merge onto an existing
 * element (an `<svg>` tick, a shaped thumb) without adding a wrapper node.
 */
import {
  createContext,
  forwardRef,
  useContext,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";
import { Slot } from "@radix-ui/react-slot";

import {
  useParamControl,
  type UseParamControlProps,
  type UseParamControlResult,
} from "../hooks/use-param-control";
import type { ParamDescriptor } from "../types";

/**
 * Their handler runs first, then ours - unless they called `preventDefault`.
 * Mirrors Radix's own event composition so an `asChild` consumer's handler and
 * the engine's handler both fire in a predictable order.
 */
function composeEventHandlers<E extends { defaultPrevented: boolean }>(
  theirHandler: ((event: E) => void) | undefined,
  ourHandler: (event: E) => void,
) {
  return (event: E) => {
    theirHandler?.(event);
    if (!event.defaultPrevented) ourHandler(event);
  };
}

interface KnobContextValue {
  /** The full engine result: position, displayValue, aria, handlers, edit, … */
  control: UseParamControlResult;
  /** The descriptor driving this control (e.g. for `parse` affordances). */
  descriptor: ParamDescriptor<unknown>;
  disabled: boolean;
  label: string;
}

const KnobContext = createContext<KnobContextValue | null>(null);

/**
 * Read the `Knob.Root` engine state from a styling layer. This is the escape
 * hatch a skin uses for values the part slots do not carry (the normalized
 * `position` for a rotation / fill transform, `isEditing`, `editProps`, …).
 */
function useKnob(): KnobContextValue {
  const ctx = useContext(KnobContext);
  if (!ctx) {
    throw new Error(
      "`Knob` compound parts must be rendered within `<Knob.Root>`.",
    );
  }
  return ctx;
}

type KnobRootProps<T> = UseParamControlProps<T> & {
  children?: ReactNode;
};

/**
 * Owns behaviour, a11y, and interaction: runs `useParamControl` and provides its
 * state to the part slots through context. Renders no DOM of its own - the skin
 * supplies the container - so it composes into any layout without disturbing it.
 */
function KnobRoot<T>({ children, ...controlProps }: KnobRootProps<T>) {
  const control = useParamControl<T>(controlProps);
  const value = useMemo<KnobContextValue>(
    () => ({
      control,
      descriptor: controlProps.descriptor as ParamDescriptor<unknown>,
      disabled: controlProps.disabled ?? false,
      label: controlProps.label,
    }),
    [
      control,
      controlProps.descriptor,
      controlProps.disabled,
      controlProps.label,
    ],
  );
  return <KnobContext.Provider value={value}>{children}</KnobContext.Provider>;
}

type KnobTrackProps = ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
};

/**
 * The interactive surface: the `role="slider"` element that carries the aria
 * contract and every pointer/keyboard/wheel handler. Its own event props are
 * composed *before* the engine's, so a skin can layer extra behaviour (the
 * knob's first-use guidance) without losing the drag. Unstyled by default.
 */
const KnobTrack = forwardRef<HTMLDivElement, KnobTrackProps>(function KnobTrack(
  {
    asChild = false,
    onPointerDown,
    onKeyDown,
    onWheel,
    onDoubleClick,
    ...rest
  },
  ref,
) {
  const { control } = useKnob();
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      {...control.ariaProps}
      data-dragging={control.isDragging || undefined}
      onPointerDown={composeEventHandlers(
        onPointerDown,
        control.handlers.onPointerDown,
      )}
      onKeyDown={composeEventHandlers(onKeyDown, control.handlers.onKeyDown)}
      onWheel={composeEventHandlers(onWheel, control.handlers.onWheel)}
      onDoubleClick={composeEventHandlers(
        onDoubleClick,
        control.handlers.onDoubleClick,
      )}
      {...rest}
    />
  );
});

type KnobIndicatorProps = ComponentPropsWithoutRef<"div"> & {
  asChild?: boolean;
};

/**
 * The position-driven visual: a knob's rotating tick, a fader's thumb. Unstyled
 * and unpositioned - the skin drives the transform from `useKnob().control
 * .position`, since the mapping (rotate vs. translate) is presentation-specific.
 * Carries only `data-dragging` for state-based styling.
 */
const KnobIndicator = forwardRef<HTMLDivElement, KnobIndicatorProps>(
  function KnobIndicator({ asChild = false, ...rest }, ref) {
    const { control } = useKnob();
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref}
        data-dragging={control.isDragging || undefined}
        {...rest}
      />
    );
  },
);

type KnobValueProps = ComponentPropsWithoutRef<"span"> & {
  asChild?: boolean;
};

/**
 * The value readout: renders the display string projected from the canonical
 * value (an on-drag tooltip in the knob/fader, an always-on readout elsewhere).
 * Defaults to the engine's `displayValue`; pass children to override.
 */
const KnobValue = forwardRef<HTMLSpanElement, KnobValueProps>(
  function KnobValue({ asChild = false, children, ...rest }, ref) {
    const { control } = useKnob();
    const Comp = asChild ? Slot : "span";
    return (
      <Comp ref={ref} {...rest}>
        {children ?? control.displayValue}
      </Comp>
    );
  },
);

const Knob = {
  Root: KnobRoot,
  Track: KnobTrack,
  Indicator: KnobIndicator,
  Value: KnobValue,
};

export { Knob, useKnob, composeEventHandlers };
export type {
  KnobRootProps,
  KnobTrackProps,
  KnobIndicatorProps,
  KnobValueProps,
  KnobContextValue,
};
