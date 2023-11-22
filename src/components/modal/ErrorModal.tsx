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

export const ErrorModal: React.FC<any> = ({ isOpen, onClose }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent bg="silver">
        <ModalHeader color="brown">An error occurred</ModalHeader>
        <ModalCloseButton />
        <ModalBody pb={6}>
          <Text pb={2} color="gray">
            {
              "We're sorry, there was a temporary interruption of service and your preset could not be saved. Please try again later."
            }
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
