import { useState } from "react";

import { PresetFileExportForm } from "@/features/preset/forms/PresetFileExportForm";
import { WavExportForm } from "@/features/preset/forms/WavExportForm";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/ui";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = "file" | "wav";
// Future: "midi" | etc.

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<"file" | "wav">("file");

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Export your preset as a file.
        </DialogDescription>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ExportTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="file">Preset File</TabsTrigger>
            <TabsTrigger value="wav">WAV</TabsTrigger>
            {/* Future: <TabsTrigger value="midi">MIDI</TabsTrigger> */}
          </TabsList>

          <TabsContent value="file">
            <PresetFileExportForm onClose={onClose} />
          </TabsContent>

          <TabsContent value="wav">
            <WavExportForm onClose={onClose} />
          </TabsContent>

          {/* Future:
          <TabsContent value="midi">
            <MidiExportForm onClose={onClose} />
          </TabsContent>
          */}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
