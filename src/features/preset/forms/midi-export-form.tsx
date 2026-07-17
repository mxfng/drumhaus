import { useEffect, useMemo } from "react";
import {
  Button,
  DialogDescription,
  DialogFooter,
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  Input,
  Slider,
  useToast,
} from "@/design/ui";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  exportToMidi,
  getSuggestedBars,
} from "@/core/audio/export/midi-exporter";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";

interface MidiExportFormProps {
  onClose: () => void;
}

const midiExportSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required"),
  bars: z.number().int().min(1, "At least 1 bar").max(8, "Maximum 8 bars"),
});

type MidiExportFormValues = z.infer<typeof midiExportSchema>;

function MidiExportForm({ onClose }: MidiExportFormProps) {
  const pattern = usePatternStore((state) => state.pattern);
  const chain = usePatternStore((state) => state.chain);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const variation = usePatternStore((state) => state.variation);
  const bpm = useTransportStore((state) => state.bpm);
  const swing = useTransportStore((state) => state.swing);
  const instruments = useInstrumentsStore((state) => state.instruments);
  const presetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const { toast } = useToast();
  const recommendedBars = getSuggestedBars(chain, chainEnabled);

  const defaultValues = useMemo(
    () => ({
      filename: presetName,
      bars: recommendedBars,
    }),
    [presetName, recommendedBars],
  );

  const form = useForm<MidiExportFormValues>({
    resolver: zodResolver(midiExportSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors, isSubmitting, isValid },
  } = form;

  useEffect(() => {
    setValue("filename", presetName, { shouldValidate: true });
  }, [presetName, setValue]);

  useEffect(() => {
    setValue("bars", recommendedBars, { shouldValidate: true });
  }, [recommendedBars, setValue]);

  const bars = useWatch({ control, name: "bars" });

  const onSubmit = handleSubmit(async (values) => {
    try {
      exportToMidi({
        filename: values.filename.trim() || "drumhaus-export",
        bars: values.bars,
        bpm,
        // Store swing is already the canonical Tone swing fraction.
        swing,
        pattern,
        chain,
        chainEnabled,
        variation,
        voices: instruments.map((instrument) => ({
          name: instrument.meta.name,
          role: instrument.role,
        })),
      });

      toast({
        title: "Export successful",
        description: "Your MIDI file has been exported.",
        duration: 8000,
      });
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Something went wrong",
        description: "Couldn't export MIDI. Please try again.",
        status: "error",
        duration: 8000,
      });
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        <DialogDescription>
          Export your pattern as a MIDI file for use in a DAW.
        </DialogDescription>

        <FieldGroup>
          <Field data-invalid={Boolean(errors.filename)}>
            <FieldLabel htmlFor="midi-filename">Filename</FieldLabel>
            <Input
              id="midi-filename"
              autoFocus
              aria-invalid={Boolean(errors.filename)}
              disabled={isSubmitting}
              {...register("filename")}
            />
            <FieldError errors={[errors.filename]} />
          </Field>

          <FieldSeparator />

          <FieldSet>
            <FieldLegend>Export options</FieldLegend>
            <FieldGroup>
              <Field data-invalid={Boolean(errors.bars)}>
                <FieldLabel htmlFor="midi-bars">Length</FieldLabel>

                <div className="flex items-center justify-between">
                  <FieldDescription>
                    Recommended: {recommendedBars}{" "}
                    {recommendedBars === 1 ? "bar" : "bars"}
                  </FieldDescription>
                  <span className="text-sm">
                    {bars} {bars === 1 ? "bar" : "bars"}
                  </span>
                </div>
                <div>
                  <Slider
                    id="midi-bars"
                    value={[bars ?? recommendedBars]}
                    onValueChange={([value]) =>
                      setValue("bars", value, { shouldValidate: true })
                    }
                    min={1}
                    max={8}
                    step={1}
                    disabled={isSubmitting}
                  />
                  <div className="flex justify-between px-[8px]">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                      <div key={n} className="flex flex-col items-center">
                        <div className="h-1 w-px" />
                        <span
                          className={`mt-0.5 text-[10px] ${[1, 2, 4, 8].includes(n) ? "text-foreground-emphasis" : "text-foreground-muted"}`}
                        >
                          {n}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <FieldError errors={[errors.bars]} />
              </Field>

              <FieldDescription>
                Notes follow the General MIDI drum map on channel 10, with
                tempo, accents, flams, ratchets, timing nudge, and swing baked
                in.
              </FieldDescription>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <FieldSeparator />
      </div>

      <DialogFooter className="pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          Export
        </Button>
      </DialogFooter>
    </form>
  );
}

export { MidiExportForm };
