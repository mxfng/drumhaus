import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import { useClipboard } from "@/shared/hooks/useClipboard";
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

interface LinkExportFormProps {
  onShare: (name: string) => Promise<string>;
  onClose: () => void;
}

type ShareStep = "input" | "result";

const linkSchema = z.object({
  presetName: presetNameSchema.trim(),
});

export const LinkExportForm: React.FC<LinkExportFormProps> = ({
  onShare,
  onClose,
}) => {
  const currentPresetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const [step, setStep] = useState<ShareStep>("input");
  const [shareableLink, setShareableLink] = useState("");

  const { toast } = useToast();
  const { onCopy, hasCopied } = useClipboard();

  const form = useForm<z.infer<typeof linkSchema>>({
    resolver: zodResolver(linkSchema),
    defaultValues: { presetName: currentPresetName },
    mode: "onChange",
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = form;

  const onSubmit = handleSubmit(async ({ presetName }) => {
    try {
      const link = await onShare(presetName.trim());
      setShareableLink(link);
      setStep("result");
    } catch (error) {
      toast({
        title: "Something went wrong",
        description:
          error instanceof Error
            ? error.message
            : "Couldn't create link. Please try again.",
        status: "error",
        duration: 3000,
      });
    }
  });

  const handleCopy = () => {
    onCopy(shareableLink);
    toast({
      title: "Copied to clipboard",
      duration: 3000,
    });
  };

  const handleClose = () => {
    setStep("input");
    setShareableLink("");
    reset({ presetName: currentPresetName });
    onClose();
  };

  useEffect(() => {
    if (step === "input") {
      reset({ presetName: currentPresetName });
    }
  }, [currentPresetName, reset, step]);

  // Auto-copy when result is ready
  useEffect(() => {
    if (step === "result" && shareableLink) {
      onCopy(shareableLink);
      toast({
        title: "Link copied to clipboard",
        duration: 3000,
      });
    }
  }, [step, shareableLink, onCopy, toast]);

  if (step === "result") {
    return (
      <div className="flex flex-col gap-6">
        <div className="space-y-6">
          <h1 className="text-foreground-emphasis mb-2 font-semibold">
            Success!
          </h1>
          <DialogDescription>
            Your link has been copied to the clipboard! Paste it anywhere to
            share your preset.
          </DialogDescription>

          <div>
            <p className="text-foreground-emphasis mb-2 font-semibold">
              How it works
            </p>
            <p className="text-muted-foreground text-sm">
              Your entire preset is packed into this tiny URL using some custom
              compression magic, and is entirely self-contained. For more info,
              check out the{" "}
              <a
                href="https://github.com/mxfng/drumhaus"
                className="text-primary underline"
              >
                Drumhaus GitHub repository
              </a>
              .
            </p>
          </div>
        </div>

        <div className="flex flex-row justify-end space-x-2">
          <Button variant="ghost" onClick={handleClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            {hasCopied ? "Copied!" : "Copy Link"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="space-y-6">
        <DialogDescription>
          Create a shareable link to send your preset to others.
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
        <Button variant="ghost" onClick={handleClose} type="button">
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!isValid || isSubmitting}
          className="text-primary-foreground flex items-center"
        >
          <span className="mr-2">Get Link</span>
          {isSubmitting && (
            <PixelatedSpinner
              color="currentColor"
              size={20}
              pixelSize={2}
              gap={2}
            />
          )}
        </Button>
      </div>
    </form>
  );
};
