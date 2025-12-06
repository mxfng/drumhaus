import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { presetNameSchema } from "@/shared/lib/schemas";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  Input,
  useToast,
} from "@/shared/ui";

interface DuplicatePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presetId: string;
  suggestedName: string;
}

const duplicateSchema = z.object({
  presetName: presetNameSchema.trim(),
});

type DuplicateFormValues = z.infer<typeof duplicateSchema>;

export const DuplicatePresetDialog: React.FC<DuplicatePresetDialogProps> = ({
  isOpen,
  onClose,
  presetId,
  suggestedName,
}) => {
  const duplicateCustomPreset = usePresetMetaStore(
    (state) => state.duplicateCustomPreset,
  );
  const renameCustomPreset = usePresetMetaStore(
    (state) => state.renameCustomPreset,
  );
  const { toast } = useToast();

  const form = useForm<DuplicateFormValues>({
    resolver: zodResolver(duplicateSchema),
    defaultValues: { presetName: suggestedName },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const handleClose = () => {
    reset({ presetName: suggestedName });
    onClose();
  };

  useEffect(() => {
    reset({ presetName: suggestedName });
    // Trigger validation to show error immediately if name is invalid
    trigger("presetName");
  }, [suggestedName, reset, trigger]);

  const onSubmit = handleSubmit(({ presetName }) => {
    const trimmedName = presetName.trim();

    try {
      // Duplicate the preset (with auto-generated name)
      const duplicatedPreset = duplicateCustomPreset(presetId);

      // If user changed the name, rename the duplicated preset
      if (trimmedName !== suggestedName) {
        renameCustomPreset(duplicatedPreset.meta.id, trimmedName);
      } else {
        // Use the suggested name
        renameCustomPreset(duplicatedPreset.meta.id, trimmedName);
      }

      toast({
        title: "Preset duplicated",
        description: `Created "${trimmedName}"`,
        duration: 3000,
      });

      handleClose();
    } catch (error) {
      toast({
        title: "Failed to duplicate preset",
        description:
          error instanceof Error ? error.message : "Please try again",
        status: "error",
        duration: 3000,
      });
    }
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent key={presetId}>
        <DialogHeader>
          <DialogTitle>Duplicate Preset</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-6 pb-6">
            <DialogDescription>
              Create a copy of this preset with a new name.
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

          <DialogFooter>
            <Button
              variant="ghost"
              onClick={handleClose}
              type="button"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!isValid || isSubmitting}>
              Duplicate
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
