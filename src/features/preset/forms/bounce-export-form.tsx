import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  exportStems,
  type StemExportProgress,
} from "@/core/audio/export/stem-exporter";
import {
  calculateExportDuration,
  exportToWav,
  getSuggestedBars,
} from "@/core/audio/export/wav-exporter";
import { useInstrumentsStore } from "@/features/instrument/store/use-instruments-store";
import { usePresetMetaStore } from "@/features/preset/store/use-preset-meta-store";
import { usePatternStore } from "@/features/sequencer/store/use-pattern-store";
import { useTransportStore } from "@/features/transport/store/use-transport-store";
import { PixelatedSpinner } from "@/shared/components/pixelated-spinner";
import {
  Button,
  Checkbox,
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
  RadioGroup,
  RadioGroupItem,
  Slider,
  useToast,
} from "@/shared/ui";

interface BounceExportFormProps {
  onClose: () => void;
}

type SampleRateOption = "system" | "44100" | "48000";

const sampleRateOptions: { value: SampleRateOption; label: string }[] = [
  { value: "system", label: "System" },
  { value: "44100", label: "44.1 kHz" },
  { value: "48000", label: "48 kHz" },
];

type StemTapOption = "preMaster" | "master";

const stemTapOptions: { value: StemTapOption; label: string; hint: string }[] =
  [
    { value: "preMaster", label: "Pre-master", hint: "sums to mix" },
    { value: "master", label: "Master chain", hint: "full FX, won't sum" },
  ];

const bounceExportSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required"),
  bars: z.number().int().min(1, "At least 1 bar").max(8, "Maximum 8 bars"),
  sampleRate: z.enum(["system", "44100", "48000"]),
  includeTail: z.boolean(),
  stems: z.boolean(),
  stemTap: z.enum(["preMaster", "master"]),
});

type BounceExportFormValues = z.infer<typeof bounceExportSchema>;

/** Progress line for the submit button, e.g. "Rendering stem 3/8". */
function progressLabel(progress: StemExportProgress | null): string {
  if (!progress) return "Exporting";
  switch (progress.phase) {
    case "rendering":
      return progress.label ? `Rendering ${progress.label}` : "Rendering";
    case "packaging":
      return "Packaging";
    default:
      return "Exporting";
  }
}

function BounceExportForm({ onClose }: BounceExportFormProps) {
  const pattern = usePatternStore((state) => state.pattern);
  const chain = usePatternStore((state) => state.chain);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const variation = usePatternStore((state) => state.variation);
  const bpm = useTransportStore((state) => state.bpm);
  const instruments = useInstrumentsStore((state) => state.instruments);
  const presetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const { toast } = useToast();
  const recommendedBars = getSuggestedBars(chain, chainEnabled);
  const [progress, setProgress] = useState<StemExportProgress | null>(null);

  const defaultValues = useMemo(
    () => ({
      filename: presetName,
      bars: recommendedBars,
      sampleRate: "system" as const,
      includeTail: false,
      stems: false,
      stemTap: "preMaster" as const,
    }),
    [presetName, recommendedBars],
  );

  const form = useForm<BounceExportFormValues>({
    resolver: zodResolver(bounceExportSchema),
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
  const includeTail = useWatch({ control, name: "includeTail" });
  const sampleRate = useWatch({ control, name: "sampleRate" });
  const stems = useWatch({ control, name: "stems" });
  const stemTap = useWatch({ control, name: "stemTap" });

  const baseDuration = calculateExportDuration(bars ?? recommendedBars, bpm);
  const duration = baseDuration + ((includeTail ?? false) ? 2 : 0);

  const exportWav = async (values: BounceExportFormValues, rate: number) => {
    await exportToWav({
      bars: values.bars,
      sampleRate: rate,
      includeTail: values.includeTail,
      filename: values.filename.trim() || "drumhaus-export",
    });

    toast({
      title: "Export successful",
      description: "Your audio file has been exported.",
      duration: 8000,
    });
  };

  const exportStemsZip = async (
    values: BounceExportFormValues,
    rate: number,
  ) => {
    const summary = await exportStems(
      {
        filename: values.filename.trim() || "drumhaus-export",
        bars: values.bars,
        sampleRate: rate,
        includeTail: values.includeTail,
        stemTap: values.stemTap,
        presetName,
        bpm,
        pattern,
        chain,
        chainEnabled,
        variation,
        voices: instruments.map((instrument) => ({
          name: instrument.meta.name,
          mute: instrument.params.mute,
          solo: instrument.params.solo,
        })),
      },
      setProgress,
    );

    const stemCount = summary.rendered.length;
    const skippedNames = summary.skipped.map((lane) => lane.name);
    toast({
      title: "Export successful",
      description:
        `${stemCount} ${stemCount === 1 ? "stem" : "stems"} + full mix zipped.` +
        (skippedNames.length > 0
          ? ` Skipped silent lanes: ${skippedNames.join(", ")}.`
          : ""),
      duration: 8000,
    });
  };

  const onSubmit = handleSubmit(async (values) => {
    try {
      const actualSampleRate =
        values.sampleRate === "system"
          ? new AudioContext().sampleRate
          : parseInt(values.sampleRate, 10);

      if (values.stems) {
        await exportStemsZip(values, actualSampleRate);
      } else {
        await exportWav(values, actualSampleRate);
      }
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Something went wrong",
        description: "Couldn't export audio. Please try again.",
        status: "error",
        duration: 8000,
      });
    } finally {
      setProgress(null);
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        <DialogDescription>
          Bounce your pattern to a WAV audio file.
        </DialogDescription>

        <FieldGroup>
          <Field data-invalid={Boolean(errors.filename)}>
            <FieldLabel htmlFor="bounce-filename">Filename</FieldLabel>
            <Input
              id="bounce-filename"
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
                <FieldLabel htmlFor="bounce-bars">Length</FieldLabel>

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
                    id="bounce-bars"
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

              <Field data-invalid={Boolean(errors.sampleRate)}>
                <FieldLabel>Sample rate</FieldLabel>
                <FieldDescription>
                  For audio nerds. System is usually fine.
                </FieldDescription>
                <RadioGroup
                  value={sampleRate}
                  onValueChange={(value) =>
                    setValue("sampleRate", value as SampleRateOption, {
                      shouldValidate: true,
                    })
                  }
                  disabled={isSubmitting}
                >
                  {sampleRateOptions.map((option) => (
                    <div key={option.value} className="flex items-center gap-2">
                      <RadioGroupItem
                        value={option.value}
                        id={`bounce-${option.value}`}
                      />
                      <FieldLabel
                        htmlFor={`bounce-${option.value}`}
                        className="font-normal"
                      >
                        {option.label}
                      </FieldLabel>
                    </div>
                  ))}
                </RadioGroup>

                <FieldError errors={[errors.sampleRate]} />
              </Field>

              <FieldGroup data-slot="checkbox-group">
                <Field orientation="horizontal">
                  <Checkbox
                    id="bounce-includeTail"
                    checked={includeTail}
                    onCheckedChange={(checked) =>
                      setValue("includeTail", checked === true)
                    }
                    disabled={isSubmitting}
                  />
                  <FieldLabel
                    htmlFor="bounce-includeTail"
                    className="font-normal"
                  >
                    Preserve reverb tail in export
                  </FieldLabel>
                </Field>

                <Field orientation="horizontal">
                  <Checkbox
                    id="bounce-stems"
                    checked={stems}
                    onCheckedChange={(checked) =>
                      setValue("stems", checked === true)
                    }
                    disabled={isSubmitting}
                  />
                  <FieldLabel htmlFor="bounce-stems" className="font-normal">
                    Export stems
                  </FieldLabel>
                </Field>
              </FieldGroup>

              {stems && (
                <Field data-invalid={Boolean(errors.stemTap)}>
                  <FieldLabel>Stem processing</FieldLabel>
                  <RadioGroup
                    value={stemTap}
                    onValueChange={(value) =>
                      setValue("stemTap", value as StemTapOption, {
                        shouldValidate: true,
                      })
                    }
                    disabled={isSubmitting}
                  >
                    {stemTapOptions.map((option) => (
                      <div
                        key={option.value}
                        className="flex items-center gap-2"
                      >
                        <RadioGroupItem
                          value={option.value}
                          id={`bounce-stemTap-${option.value}`}
                        />
                        <FieldLabel
                          htmlFor={`bounce-stemTap-${option.value}`}
                          className="font-normal"
                        >
                          {option.label}
                        </FieldLabel>
                        <span className="text-muted-foreground text-sm">
                          {option.hint}
                        </span>
                      </div>
                    ))}
                  </RadioGroup>

                  <FieldError errors={[errors.stemTap]} />
                </Field>
              )}
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
        <FieldSeparator />
      </div>

      <DialogFooter className="pt-6">
        <Field className="gap-0">
          <FieldLabel>Duration</FieldLabel>
          <FieldDescription>{duration.toFixed(1)}s</FieldDescription>
        </Field>
        <Button
          type="button"
          variant="ghost"
          onClick={onClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          <span className={isSubmitting ? "mr-2" : ""}>
            {isSubmitting ? progressLabel(progress) : "Export"}
          </span>
          {isSubmitting && (
            <PixelatedSpinner
              color="currentColor"
              size={20}
              pixelSize={2}
              gap={2}
            />
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

export { BounceExportForm };
