import { useState } from "react";

import { MidiExportForm } from "@/features/preset/forms/midi-export-form";
import { PresetFileExportForm } from "@/features/preset/forms/preset-file-export-form";
import { StemsExportForm } from "@/features/preset/forms/stems-export-form";
import { WavExportForm } from "@/features/preset/forms/wav-export-form";
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

type ExportTab = "file" | "wav" | "stems" | "midi";

function ExportDialog({ isOpen, onClose }: ExportDialogProps) {
  const [activeTab, setActiveTab] = useState<ExportTab>("file");

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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="file">Preset File</TabsTrigger>
            <TabsTrigger value="wav">WAV</TabsTrigger>
            <TabsTrigger value="stems">Stems</TabsTrigger>
            <TabsTrigger value="midi">MIDI</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <PresetFileExportForm onClose={onClose} />
          </TabsContent>

          <TabsContent value="wav">
            <WavExportForm onClose={onClose} />
          </TabsContent>

          <TabsContent value="stems">
            <StemsExportForm onClose={onClose} />
          </TabsContent>

          <TabsContent value="midi">
            <MidiExportForm onClose={onClose} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

export { ExportDialog };
