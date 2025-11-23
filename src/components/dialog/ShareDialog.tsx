import { useEffect, useRef, useState } from "react";

import { PixelatedSpinner } from "@/components/common/PixelatedSpinner";
import {
  Button,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  useToast,
} from "@/components/ui";
import { useClipboard } from "@/hooks/useClipboard";
import { presetNameSchema } from "@/lib/schemas";

type ShareStep = "input" | "result";

interface ShareDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (name: string) => Promise<string>;
  defaultName?: string;
}

export const ShareDialog: React.FC<ShareDialogProps> = ({
  isOpen,
  onClose,
  onShare,
  defaultName = "",
}) => {
  const [step, setStep] = useState<ShareStep>("input");
  const [presetName, setPresetName] = useState("");
  const [shareableLink, setShareableLink] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wasOpen, setWasOpen] = useState(isOpen);
  const { toast } = useToast();
  const { onCopy, hasCopied } = useClipboard();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-populate with default name when dialog opens
  if (isOpen && !wasOpen && defaultName) {
    setPresetName(defaultName);
  }
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
  }

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep("input");
      setPresetName("");
      setShareableLink("");
      setIsLoading(false);
      setError(null);
    }
  }, [isOpen]);

  // Auto-focus input when on input step
  useEffect(() => {
    if (isOpen && step === "input") {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isOpen, step]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPresetName(value);

    // Validate on change
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

  const isValid = presetNameSchema.safeParse(presetName.trim()).success;

  const handleCopy = () => {
    onCopy(shareableLink);
    toast({
      title: "Copied to clipboard",
      duration: 3000,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        {step === "input" ? (
          <>
            <DialogHeader>
              <DialogTitle>Share Preset</DialogTitle>
            </DialogHeader>
            <DialogCloseButton />

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
                  ref={inputRef}
                  value={presetName}
                  onChange={handleChange}
                />
                {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
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
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Shareable Link</DialogTitle>
            </DialogHeader>
            <DialogCloseButton />

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
                  Your entire preset is packed into this tiny URL using some
                  custom compression magic, and is entirely self-contained.
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
        )}
      </DialogContent>
    </Dialog>
  );
};
