"use client";

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
  Spinner,
  Text,
  useClipboard,
} from "@chakra-ui/react";
import { useState } from "react";

export const SharingModal: React.FC<any> = ({
  isOpen,
  onClose,
  onShare,
  isLoading,
  setIsLoading,
  modalCloseRef,
}) => {
  const [presetName, setPresetName] = useState("");

  const handleShare = () => {
    // Pass the presetName to the onSave function
    onShare(presetName);
    setIsLoading(true);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
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
          <Button onClick={handleShare} colorScheme="orange" mr={3}>
            <Text>Get Link</Text>
            {isLoading ? (
              <Spinner
                ml={2}
                thickness="4px"
                speed="0.65s"
                emptyColor="transparent"
                color="silver"
                size="md"
              />
            ) : null}
          </Button>
          <Button onClick={onClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export const SharedModal: React.FC<any> = ({
  isOpen,
  onClose,
  shareableLink,
  modalCloseRef,
}) => {
  const { onCopy, hasCopied } = useClipboard("");

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
            Success! Your preset has been saved to the cloud and can be shared
            using this link:
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
              >
                {shareableLink}
              </Button>
            </Center>
          </Box>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onCopy} colorScheme="orange" mr={3}>
            {hasCopied ? "Copied!" : "Copy Link"}
          </Button>
          <Button onClick={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
