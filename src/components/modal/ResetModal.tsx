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

export const ResetModal: React.FC<any> = ({
  isOpen,
  onClose,
  onReset,
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
        <ModalHeader color="brown">Reset All</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={2} color="gray">
            Are you sure you want to reset all instruments and audio parameters
            to their initialized settings?
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onReset} colorScheme="orange" mr={3}>
            Reset
          </Button>
          <Button onClick={onClose} color="gray">
            Cancel
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
