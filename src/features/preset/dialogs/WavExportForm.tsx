import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { z } from "zod";

import {
  calculateExportDuration,
  exportToWav,
  getSuggestedBars,
} from "@/core/audio/export/wavExporter";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { usePatternStore } from "@/features/sequencer/store/usePatternStore";
import { useTransportStore } from "@/features/transport/store/useTransportStore";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
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

interface WavExportFormProps {
  onClose: () => void;
}

type SampleRateOption = "system" | "44100" | "48000";

const sampleRateOptions: { value: SampleRateOption; label: string }[] = [
  { value: "system", label: "System" },
  { value: "44100", label: "44.1 kHz" },
  { value: "48000", label: "48 kHz" },
];

const wavExportSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required"),
  bars: z.number().int().min(1, "At least 1 bar").max(8, "Maximum 8 bars"),
  sampleRate: z.enum(["system", "44100", "48000"]),
  includeTail: z.boolean(),
});

type WavExportFormValues = z.infer<typeof wavExportSchema>;

export const WavExportForm: React.FC<WavExportFormProps> = ({ onClose }) => {
  const chain = usePatternStore((state) => state.chain);
  const chainEnabled = usePatternStore((state) => state.chainEnabled);
  const bpm = useTransportStore((state) => state.bpm);
  const presetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const { toast } = useToast();
  const recommendedBars = getSuggestedBars(chain, chainEnabled);

  const form = useForm<WavExportFormValues>({
    resolver: zodResolver(wavExportSchema),
    defaultValues: {
      filename: presetName,
      bars: recommendedBars,
      sampleRate: "system",
      includeTail: false,
    },
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

  const baseDuration = calculateExportDuration(bars ?? recommendedBars, bpm);
  const duration = baseDuration + ((includeTail ?? false) ? 2 : 0);

  const onSubmit = handleSubmit(async (values) => {
    try {
      const actualSampleRate =
        values.sampleRate === "system"
          ? new AudioContext().sampleRate
          : parseInt(values.sampleRate, 10);

      await exportToWav({
        bars: values.bars,
        sampleRate: actualSampleRate,
        includeTail: values.includeTail,
        filename: values.filename.trim() || "drumhaus-export",
      });

      toast({
        title: "Export successful",
        description: "Your audio file has been exported.",
        duration: 8000,
      });
      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Something went wrong",
        description: "Couldn't export audio. Please try again.",
        status: "error",
        duration: 8000,
      });
    }
  });

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-4">
        <DialogDescription>
          Export your pattern as a WAV audio file.
        </DialogDescription>

        <FieldGroup>
          <Field data-invalid={Boolean(errors.filename)}>
            <FieldLabel htmlFor="filename">Filename</FieldLabel>
            <Input
              id="filename"
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
                <FieldLabel htmlFor="bars">Length</FieldLabel>

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
                    id="bars"
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
                      <RadioGroupItem value={option.value} id={option.value} />
                      <FieldLabel
                        htmlFor={option.value}
                        className="font-normal"
                      >
                        {option.label}
                      </FieldLabel>
                    </div>
                  ))}
                </RadioGroup>

                <FieldError errors={[errors.sampleRate]} />
              </Field>
              <FieldSet>
                <FieldLabel>Reverb Tail</FieldLabel>
                <FieldDescription>
                  Add extra time at the end of the export so long reverb or FX
                  decays aren’t cut off.
                </FieldDescription>

                <FieldGroup data-slot="checkbox-group">
                  <Field orientation="horizontal">
                    <Checkbox
                      id="includeTail"
                      checked={includeTail}
                      onCheckedChange={(checked) =>
                        setValue("includeTail", checked === true)
                      }
                      disabled={isSubmitting}
                    />
                    <FieldLabel htmlFor="includeTail" className="font-normal">
                      Preserve reverb tail in export
                    </FieldLabel>
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
          </FieldSet>
        </FieldGroup>
      </div>

      <DialogFooter>
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
            {isSubmitting ? "Exporting" : "Export"}
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
};
