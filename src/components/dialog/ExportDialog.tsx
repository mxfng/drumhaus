import { useEffect, useState } from "react";

import {
  Button,
  Checkbox,
  Dialog,
  DialogCloseButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Slider,
} from "@/components/ui";
import {
  calculateExportDuration,
  ExportProgress,
  exportToWav,
  getSuggestedBars,
} from "@/lib/audio/export/wavExporter";
import { usePatternStore } from "@/stores/usePatternStore";
import { usePresetMetaStore } from "@/stores/usePresetMetaStore";
import { useTransportStore } from "@/stores/useTransportStore";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type SampleRateOption = "system" | "44100" | "48000";

const sampleRateOptions: { value: SampleRateOption; label: string }[] = [
  { value: "system", label: "System" },
  { value: "44100", label: "44.1 kHz" },
  { value: "48000", label: "48 kHz" },
];

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const variationCycle = usePatternStore((state) => state.variationCycle);
  const bpm = useTransportStore((state) => state.bpm);
  const presetName = usePresetMetaStore(
    (state) => state.currentPresetMeta.name,
  );

  const [filename, setFilename] = useState("");
  const [bars, setBars] = useState(1);
  const [sampleRate, setSampleRate] = useState<SampleRateOption>("system");
  const [includeTail, setIncludeTail] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  // Set defaults when dialog opens
  useEffect(() => {
    if (isOpen) {
      setFilename(presetName);
      setBars(getSuggestedBars(variationCycle));
      setProgress(null);
      setIsExporting(false);
    }
  }, [isOpen, variationCycle, presetName]);

  const baseDuration = calculateExportDuration(bars, bpm);
  const duration = baseDuration + (includeTail ? 2 : 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExporting(true);

    try {
      const actualSampleRate =
        sampleRate === "system"
          ? new AudioContext().sampleRate
          : parseInt(sampleRate);

      await exportToWav(
        {
          bars,
          sampleRate: actualSampleRate,
          includeTail,
          filename: filename.trim() || "drumhaus-export",
        },
        setProgress,
      );

      onClose();
    } catch (error) {
      console.error("Export failed:", error);
      setProgress(null);
    } finally {
      setIsExporting(false);
    }
  };

  const getProgressText = () => {
    if (!progress) return null;

    switch (progress.phase) {
      case "preparing":
        return "Preparing samples...";
      case "rendering":
        return "Rendering audio...";
      case "encoding":
        return "Encoding WAV...";
      case "complete":
        return "Complete!";
      default:
        return null;
    }
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isExporting && onClose()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export to WAV</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <form onSubmit={handleSubmit}>
          <div className="space-y-5 pb-4">
            <DialogDescription>
              Export your pattern as a WAV audio file.
            </DialogDescription>

            {/* Filename input */}
            <div>
              <Label htmlFor="filename" className="mb-2 block">
                Filename
              </Label>
              <Input
                id="filename"
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                disabled={isExporting}
                className="flex-1"
              />
            </div>

            {/* Bars slider */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <Label htmlFor="bars">Length</Label>
                <span className="text-foreground-emphasis">
                  {bars} {bars === 1 ? "bar" : "bars"}
                </span>
              </div>
              <Slider
                id="bars"
                value={[bars]}
                onValueChange={([value]) => setBars(value)}
                min={1}
                max={8}
                step={1}
                disabled={isExporting}
              />
              {/* Tick marks */}
              <div className="mt-1 flex justify-between px-[8px]">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                  <div key={n} className="flex flex-col items-center">
                    <div className="bg-foreground-muted h-1 w-px" />
                    <span className="text-foreground-muted mt-0.5 text-[10px]">
                      {n}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample rate radio group */}
            <div>
              <Label className="mb-3 block">Sample rate</Label>
              <RadioGroup
                value={sampleRate}
                onValueChange={(value) =>
                  setSampleRate(value as SampleRateOption)
                }
                disabled={isExporting}
                className="flex gap-4"
              >
                {sampleRateOptions.map((option) => (
                  <div key={option.value} className="flex items-center gap-2">
                    <RadioGroupItem value={option.value} id={option.value} />
                    <Label
                      htmlFor={option.value}
                      className="cursor-pointer font-normal"
                    >
                      {option.label}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Include tail checkbox */}
            <div className="flex items-center gap-2">
              <Checkbox
                id="includeTail"
                checked={includeTail}
                onCheckedChange={(checked) => setIncludeTail(checked === true)}
                disabled={isExporting}
              />
              <Label htmlFor="includeTail" className="cursor-pointer">
                Include reverb tail
              </Label>
            </div>

            {/* Duration preview */}
            <div className="">Duration: {duration.toFixed(1)}s</div>

            {/* Progress indicator */}
            {isExporting && progress && (
              <div className="space-y-2">
                <div>{getProgressText()}</div>
                <Progress value={progress.percent} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={isExporting}
              type="button"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isExporting}>
              {isExporting ? "Exporting..." : "Export"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
