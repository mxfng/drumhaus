import { useState } from "react";

import { LinkExportForm } from "@/features/preset/dialogs/LinkExportForm";
import { WavExportForm } from "@/features/preset/dialogs/WavExportForm";
import {
  Dialog,
  DialogCloseButton,
  DialogContent,
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
  onShare: (name: string) => Promise<string>;
  defaultTab?: "link" | "wav";
}

type ExportTab = "link" | "wav";
// Future: "midi" | etc.

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onShare,
  defaultTab = "link",
}) => {
  const [activeTab, setActiveTab] = useState<ExportTab>(defaultTab);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <DialogCloseButton />

        <Tabs
          key={defaultTab}
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ExportTab)}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="link">Link</TabsTrigger>
            <TabsTrigger value="wav">WAV</TabsTrigger>
            {/* Future: <TabsTrigger value="midi">MIDI</TabsTrigger> */}
          </TabsList>

          <TabsContent value="link">
            <LinkExportForm onShare={onShare} onClose={onClose} />
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
