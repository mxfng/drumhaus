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

interface RenamePresetDialogProps {
  isOpen: boolean;
  onClose: () => void;
  presetId: string;
  currentName: string;
}

const renameSchema = z.object({
  presetName: presetNameSchema.trim(),
});

type RenameFormValues = z.infer<typeof renameSchema>;

export const RenamePresetDialog: React.FC<RenamePresetDialogProps> = ({
  isOpen,
  onClose,
  presetId,
  currentName,
}) => {
  const renameCustomPreset = usePresetMetaStore(
    (state) => state.renameCustomPreset,
  );
  const { toast } = useToast();

  const form = useForm<RenameFormValues>({
    resolver: zodResolver(renameSchema),
    defaultValues: { presetName: currentName },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const handleClose = () => {
    reset({ presetName: currentName });
    onClose();
  };

  useEffect(() => {
    reset({ presetName: currentName });
  }, [currentName, reset]);

  const onSubmit = handleSubmit(({ presetName }) => {
    const trimmedName = presetName.trim();

    // Only update if name actually changed
    if (trimmedName !== currentName) {
      renameCustomPreset(presetId, trimmedName);
      toast({
        title: "Preset renamed",
        description: `Renamed to "${trimmedName}"`,
        duration: 3000,
      });
    }

    handleClose();
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent key={presetId}>
        <DialogHeader>
          <DialogTitle>Rename Preset</DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit}>
          <div className="space-y-6 pb-6">
            <DialogDescription>
              Enter a new name for this preset.
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
              Rename
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
