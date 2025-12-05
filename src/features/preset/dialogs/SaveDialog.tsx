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
} from "@/shared/ui";

interface SaveDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
}

const saveSchema = z.object({
  presetName: presetNameSchema.trim(),
});

type SaveFormValues = z.infer<typeof saveSchema>;

export const SaveDialog: React.FC<SaveDialogProps> = ({
  isOpen,
  onClose,
  onSave,
}) => {
  const currentPresetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const form = useForm<SaveFormValues>({
    resolver: zodResolver(saveSchema),
    defaultValues: { presetName: currentPresetName },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isValid, isSubmitting },
  } = form;

  const handleClose = () => {
    reset({ presetName: currentPresetName });
    onClose();
  };

  useEffect(() => {
    reset({ presetName: currentPresetName });
  }, [currentPresetName, reset]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent key={currentPresetName}>
        <DialogHeader>
          <DialogTitle>Save Preset</DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(({ presetName }) => {
            onSave(presetName.trim());
            handleClose();
          })}
        >
          <div className="space-y-6 pb-6">
            <DialogDescription>
              Give your preset a name so you can find it later.
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
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
