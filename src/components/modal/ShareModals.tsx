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
  useClipboard,
  useToast,
} from "@chakra-ui/react";
import { z } from "zod";

import { PixelatedSpinner } from "../common/PixelatedSpinner";

// Validation schema for preset names
const presetNameSchema = z
  .string()
  .min(1, "Preset name cannot be empty")
  .max(20, "Preset name must be at most 20 characters")
  .refine(
    (name) => !/[/\\:*?"<>|]/.test(name),
    'Preset name contains invalid characters (/, \\, :, *, ?, ", <, >, |)',
  );

interface SharingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: (name: string) => Promise<void>;
  modalCloseRef: React.RefObject<HTMLElement>;
  defaultName?: string;
}

export const SharingModal: React.FC<SharingModalProps> = ({
  isOpen,
  onClose,
  onShare,
  modalCloseRef,
  defaultName = "",
}) => {
  const [presetName, setPresetName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
    setIsLoading(false);
    onClose();
  };

  const handleShare = async () => {
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

    setIsLoading(true);
    await onShare(presetName.trim());
    setIsLoading(false);
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
        <ModalHeader color="brown">Share Preset</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={6} color="gray">
            Drumhaus can generate a custom link for you to share your presets
            with.
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
                  placeholder="Enter a custom preset name"
                  value={presetName}
                  onChange={(e) => setPresetName(e.target.value)}
                />
              </Center>
            </Box>
          </FormControl>
        </ModalBody>

        <ModalFooter>
          <Button
            onClick={handleShare}
            colorScheme="orange"
            mr={3}
            isDisabled={!presetName.trim() || isLoading}
          >
            <Text mr={2}>Get Link</Text>
            {isLoading ? (
              <PixelatedSpinner color="white" size={20} pixelSize={2} gap={2} />
            ) : null}
          </Button>
          <Button onClick={handleClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

interface SharedModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareableLink: string;
  modalCloseRef: React.RefObject<HTMLElement>;
}

export const SharedModal: React.FC<SharedModalProps> = ({
  isOpen,
  onClose,
  shareableLink,
  modalCloseRef,
}) => {
  const { onCopy, hasCopied } = useClipboard(shareableLink);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      finalFocusRef={modalCloseRef}
      isCentered
    >
      <ModalOverlay />
      <ModalContent bg="silver">
        <ModalHeader>Shareable Link</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <Text pb={6} color="gray">
            Success! Your preset can be shared using this link:
          </Text>
          <Box
            w="100%"
            h="40px"
            borderRadius="8px"
            boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
          >
            <Center h="100%">
              <Button
                onClick={onCopy}
                w="100%"
                userSelect="all"
                color="gray"
                fontFamily={`'Pixelify Sans Variable', sans-serif`}
                overflow="hidden"
                textOverflow="ellipsis"
                whiteSpace="nowrap"
              >
                <Text isTruncated w="100%">
                  {shareableLink}
                </Text>
              </Button>
            </Center>
          </Box>
          <Box
            mt={4}
            p={3}
            borderRadius="6px"
            bg="rgba(176, 147, 116, 0.1)"
            fontSize="xs"
          >
            <Text color="gray" fontWeight="bold" mb={1}>
              Fun Fact
            </Text>
            <Text color="gray" fontSize="xs" lineHeight="1.5">
              Your entire preset is packed into this URL, squeezed from 900+
              lines of JSON down to a few hundred characters using DEFLATE (via
              pako), bit-packed triggers, quantized velocities, and a handful of
              custom compression tricks. It&apos;s basically a tiny spacecraft
              carrying your beats through the web.
            </Text>
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onCopy} colorScheme="orange" mr={3}>
            {hasCopied ? "Copied!" : "Copy Link"}
          </Button>
          <Button onClick={onClose} color="gray">
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
