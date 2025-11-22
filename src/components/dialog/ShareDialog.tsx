import { useEffect, useRef, useState } from "react";
import { z } from "zod";

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
  useToast,
} from "@/components/ui";
import { useClipboard } from "@/hooks/useClipboard";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name cannot be empty")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

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
  const { toast } = useToast();
  const { onCopy, hasCopied } = useClipboard();
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset state when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setStep("input");
      setPresetName("");
      setShareableLink("");
      setIsLoading(false);
    }
  }, [isOpen]);

  // Auto-populate with default name when dialog opens
  useEffect(() => {
    if (isOpen && step === "input" && defaultName && !presetName) {
      setPresetName(defaultName);
    }
  }, [isOpen, step, defaultName, presetName]);

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

  const handleShare = async () => {
    // Validate preset name
    const validation = presetNameSchema.safeParse(presetName.trim());

    if (!validation.success) {
      toast({
        title: "Invalid preset name",
        description: validation.error.issues[0].message,
        status: "error",
        duration: 3000,
      });
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
          error instanceof Error ? error.message : "Failed to share preset",
        status: "error",
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
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

            <div className="pb-6">
              <DialogDescription className="pb-6">
                Drumhaus can generate a custom link for you to share your
                presets with.
              </DialogDescription>

              <div className="h-10 w-4/5 rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
                <div className="flex h-full items-center pl-4">
                  <input
                    ref={inputRef}
                    className="font-pixel placeholder:-light h-full w-full bg-transparent outline-none"
                    placeholder="Enter a custom preset name"
                    value={presetName}
                    onChange={(e) => setPresetName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={!presetName.trim() || isLoading}
                className="flex items-center"
              >
                <span className="mr-2">Get Link</span>
                {isLoading && (
                  <PixelatedSpinner
                    color="white"
                    size={20}
                    pixelSize={2}
                    gap={2}
                  />
                )}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Shareable Link</DialogTitle>
            </DialogHeader>
            <DialogCloseButton />

            <div>
              <DialogDescription className="pb-6">
                Success! Your preset can be shared using this link:
              </DialogDescription>

              <div className="h-10 w-full rounded-lg shadow-[inset_0_2px_8px_var(--color-shadow-60)]">
                <div className="flex h-full items-center justify-center">
                  <button
                    onClick={() => onCopy(shareableLink)}
                    className="font-pixel w-full truncate px-3 text-sm select-all"
                  >
                    {shareableLink}
                  </button>
                </div>
              </div>

              <div className="bg-shadow-10 mt-4 rounded-md p-3">
                <p className="mb-1 font-semibold">Did you know?</p>
                <p className="leading-relaxed">
                  Your entire preset is packed into this tiny URL using some
                  custom compression magic, and is entirely self-contained.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button onClick={() => onCopy(shareableLink)}>
                {hasCopied ? "Copied!" : "Copy Link"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
