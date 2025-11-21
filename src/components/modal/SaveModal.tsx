import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Center,
  FormControl,
  Input,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
  useToast,
} from "@chakra-ui/react";
import { z } from "zod";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name cannot be empty")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

interface SaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  modalCloseRef: React.RefObject<HTMLElement>;
  defaultName?: string;
}

export const SaveModal: React.FC<SaveModalProps> = ({
  isOpen,
  onClose,
  onSave,
  modalCloseRef,
  defaultName = "",
}) => {
  const [presetName, setPresetName] = useState("");
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-populate with default name when modal opens
  useEffect(() => {
    if (isOpen && defaultName) {
      setPresetName(defaultName);
    }
  }, [isOpen, defaultName]);

  // Auto-focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  const handleClose = () => {
    setPresetName("");
    onClose();
  };

  const handleSave = () => {
    // Validate preset name
    const validation = presetNameSchema.safeParse(presetName.trim());

    if (!validation.success) {
      toast({
        title: "Invalid preset name",
        description: validation.error.issues[0].message,
        status: "error",
        duration: 3000,
        isClosable: true,
        position: "top",
      });
      return;
    }

    onSave(presetName.trim());
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      finalFocusRef={modalCloseRef}
      isCentered
    >
      <ModalOverlay />
      <ModalContent bg="silver">
        <ModalHeader color="brown">Download</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={6} color="gray">
            To download your preset, enter a custom preset name.
          </Text>
          <FormControl>
            <Box
              w="80%"
              h="40px"
              borderRadius="8px"
              boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
            >
              <Center h="100%" pl={4}>
                <Input
                  ref={inputRef}
                  color="gray"
                  fontFamily={`'Pixelify Sans Variable', sans-serif`}
                  h="100%"
                  w="100%"
                  variant="unstyled"
                  placeholder="Preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </Center>
            </Box>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={handleSave}
            colorScheme="orange"
            mr={3}
            isDisabled={!presetName.trim()}
          >
            Download
          </Button>
          <Button onClick={handleClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
