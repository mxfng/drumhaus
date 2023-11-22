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

export const MobileModal: React.FC<any> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="silver">
        <ModalHeader color="brown">Desktop Recommended</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={2} color="gray">
            {"We're so glad you've decided to give Drumhaus a try!"}
          </Text>
          <Text pb={2} color="gray">
            Drumhaus was built and optimized for use on desktop devices. Some
            features may not be available on mobile.
          </Text>
          <Text pb={2} color="gray">
            It is recommended that you switch to your desktop device for the
            optimal experience.
          </Text>
        </ModalBody>

        <ModalFooter>
          <Button onClick={onClose} colorScheme="orange" mr={3}>
            Dismiss
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};
