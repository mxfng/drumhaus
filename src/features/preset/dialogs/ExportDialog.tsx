import { useState } from "react";

import { LinkExportForm } from "@/features/preset/dialogs/LinkExportForm";
import { WavExportForm } from "@/features/preset/dialogs/WavExportForm";
import {
  Dialog,
  DialogCloseButton,
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
  onShare: (name: string) => Promise<string>;
}

type ExportTab = "link" | "wav";
// Future: "midi" | etc.

export const ExportDialog: React.FC<ExportDialogProps> = ({
  isOpen,
  onClose,
  onShare,
}) => {
  const [activeTab, setActiveTab] = useState<"link" | "wav">("link");
  const [showTabs, setShowTabs] = useState(false);

  const handleShare = (name: string) => {
    // As a side effect, hide the tabs when share is clicked
    setShowTabs(false);
    return onShare(name);
  };

  const handleClose = () => {
    setShowTabs(true);
    setActiveTab("link");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Export your preset as a link or WAV audio file.
        </DialogDescription>
        <DialogCloseButton />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as ExportTab)}
        >
          {!showTabs && (
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="link">Link</TabsTrigger>
              <TabsTrigger value="wav">WAV</TabsTrigger>
              {/* Future: <TabsTrigger value="midi">MIDI</TabsTrigger> */}
            </TabsList>
          )}

          <TabsContent value="link">
            <LinkExportForm onShare={handleShare} onClose={onClose} />
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
