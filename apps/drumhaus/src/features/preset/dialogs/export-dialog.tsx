import { useState } from "react";
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
} from "@haus/ui";

import { BounceExportForm } from "@/features/preset/forms/bounce-export-form";
import { MidiExportForm } from "@/features/preset/forms/midi-export-form";
import { PresetFileExportForm } from "@/features/preset/forms/preset-file-export-form";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

type ExportTab = "file" | "bounce" | "midi";

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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="file">Preset File</TabsTrigger>
            <TabsTrigger value="bounce">Bounce</TabsTrigger>
            <TabsTrigger value="midi">MIDI</TabsTrigger>
          </TabsList>

          <TabsContent value="file">
            <PresetFileExportForm onClose={onClose} />
          </TabsContent>

          <TabsContent value="bounce">
            <BounceExportForm onClose={onClose} />
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
