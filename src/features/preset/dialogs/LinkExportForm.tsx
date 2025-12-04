import { useState } from "react";

import { usePresetMetaStore } from "@/features/preset/store/usePresetMetaStore";
import { PixelatedSpinner } from "@/shared/components/PixelatedSpinner";
import { useClipboard } from "@/shared/hooks/useClipboard";
import { presetNameSchema } from "@/shared/lib/schemas";
import {
  Button,
  DialogDescription,
  DialogFooter,
  Input,
  Label,
  useToast,
} from "@/shared/ui";

interface LinkExportFormProps {
  onShare: (name: string) => Promise<string>;
  onClose: () => void;
}

type ShareStep = "input" | "result";

export const LinkExportForm: React.FC<LinkExportFormProps> = ({
  onShare,
  onClose,
}) => {
  const currentPresetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const [step, setStep] = useState<ShareStep>("input");
  const [editedName, setEditedName] = useState<string | null>(null);
  const [shareableLink, setShareableLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { toast } = useToast();
  const { onCopy, hasCopied } = useClipboard();

  const presetName = editedName ?? currentPresetName;
  const isValid = presetNameSchema.safeParse(presetName.trim()).success;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditedName(value);

    const result = presetNameSchema.safeParse(value);
    if (!result.success) {
      setError(result.error.issues[0].message);
    } else {
      setError(null);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = presetNameSchema.safeParse(presetName.trim());
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    onCopy(shareableLink);
    toast({
      title: "Copied to clipboard",
      duration: 3000,
    });
  };

  if (step === "result") {
    return (
      <>
        <div className="space-y-6">
          <DialogDescription>
            Your link is ready! Share it with anyone to let them load your
            preset.
          </DialogDescription>

          <div className="h-10 w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
            <div className="flex h-full items-center justify-center">
              <button
                onClick={handleCopy}
                className="font-pixel w-full truncate px-3 text-sm select-all"
              >
                {shareableLink}
              </button>
            </div>
          </div>

          <div>
            <p className="text-foreground-muted mb-2 text-xs font-semibold">
              How it works
            </p>
            <p className="text-foreground-muted text-xs">
              Your entire preset is packed into this tiny URL using some custom
              compression magic, and is entirely self-contained.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
          <Button onClick={handleCopy}>
            {hasCopied ? "Copied!" : "Copy Link"}
          </Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <div className="pb-6">
          <DialogDescription className="pb-6">
            Create a shareable link to send your preset to others.
          </DialogDescription>

          <Label htmlFor="presetName" className="mb-2 block">
            Preset name
          </Label>
          <Input
            id="presetName"
            value={presetName}
            onChange={handleChange}
            autoFocus
          />
          {error && <p className="text-track-red mt-1 text-sm">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="secondary" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={!isValid || isLoading}
            className="text-primary-foreground flex items-center"
          >
            <span className="mr-2">Get Link</span>
            {isLoading && (
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
    </>
  );
};
