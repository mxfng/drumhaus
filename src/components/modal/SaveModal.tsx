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
  Text,
} from "@chakra-ui/react";
import { useState } from "react";

export const SaveModal: React.FC<any> = ({
  isOpen,
  onClose,
  onSave,
  modalCloseRef,
}) => {
  const [presetName, setPresetName] = useState("");

  const handleSave = () => {
    // Pass the presetName to the onSave function
    onSave(presetName);
    onClose(); // Close the modal
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
          <Button onClick={handleSave} colorScheme="orange" mr={3}>
            Download
          </Button>
          <Button onClick={onClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
