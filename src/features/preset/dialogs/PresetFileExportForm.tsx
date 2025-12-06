import { useEffect, useMemo } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import {
  createPresetForExport,
  downloadPreset,
} from "@/features/preset/lib/operations";
import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { presetNameSchema } from "@/shared/lib/schemas";
import {
  Button,
  DialogDescription,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  useToast,
} from "@/shared/ui";

interface PresetFileExportFormProps {
  onClose: () => void;
}

const exportSchema = z.object({
  presetName: presetNameSchema.trim(),
});

type ExportFormValues = z.infer<typeof exportSchema>;

export const PresetFileExportForm: React.FC<PresetFileExportFormProps> = ({
  onClose,
}) => {
  const currentPresetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );
  const currentKitMeta = usePresetMetaStore((state) => state.currentKitMeta);

  const { toast } = useToast();

  const defaultValues = useMemo(
    () => ({ presetName: currentPresetName }),
    [currentPresetName],
  );

  const form = useForm<ExportFormValues>({
    resolver: zodResolver(exportSchema),
    defaultValues,
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = form;

  useEffect(() => {
    reset({ presetName: currentPresetName });
  }, [currentPresetName, reset]);

  const onSubmit = handleSubmit(({ presetName }) => {
    const trimmedName = presetName.trim();

    try {
      // Create preset from current state
      const preset = createPresetForExport(trimmedName, currentKitMeta);

      // Download as .dh file
      downloadPreset(preset, trimmedName);

      toast({
        title: "Preset exported",
        description: `Downloaded "${trimmedName}.dh"`,
        duration: 3000,
      });

      onClose();
    } catch (error) {
      toast({
        title: "Export failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        status: "error",
        duration: 3000,
      });
    }
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="space-y-6">
        <DialogDescription>
          Download your preset as a .dh file to save it locally or share it with
          others.
        </DialogDescription>

        <FieldGroup>
          <Field data-invalid={Boolean(errors.presetName)}>
            <FieldLabel htmlFor="presetName">Preset name</FieldLabel>
            <Input
              id="presetName"
              autoFocus
              aria-invalid={Boolean(errors.presetName)}
              {...register("presetName")}
            />
            <FieldError errors={[errors.presetName]} />
          </Field>
        </FieldGroup>
      </div>

      <div className="flex flex-row justify-end space-x-2">
        <Button variant="ghost" onClick={onClose} type="button">
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid || isSubmitting}>
          Download
        </Button>
      </div>
    </form>
  );
};
