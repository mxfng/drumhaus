"use client";

import {
  Button,
  Modal,
  ModalBody,
  ModalCloseButton,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalOverlay,
  Text,
} from "@chakra-ui/react";

export const PresetChangeModal: React.FC<any> = ({
  isOpen,
  onClose,
  onChange,
  modalCloseRef,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      finalFocusRef={modalCloseRef}
      isCentered
    >
      <ModalOverlay />
      <ModalContent bg="silver">
        <ModalHeader color="brown">Confirmation</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={2} color="gray">
            Are you sure you want to switch to a new preset?
          </Text>
          <Text pb={2} color="gray">
            You will lose any unsaved work on the current preset.
          </Text>
          <Text pb={2} color="gray">
            {`You can download your work as a .dh file using the 'Download to file' button, or share it with a friend using the 'Share as link' button.`}
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onChange} colorScheme="orange" mr={3}>
            Switch
          </Button>
          <Button onClick={onClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
