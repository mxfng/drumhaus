import { Box, Button, Center, Grid, GridItem, Tooltip } from "@chakra-ui/react";
import { FaFolderOpen } from "react-icons/fa";
import { IoIosShareAlt } from "react-icons/io";
import { MdOutlineSaveAlt } from "react-icons/md";
import { RxReset } from "react-icons/rx";

import { useModalStore } from "@/stores/useModalStore";

type PresetActionsProps = {
  onOpenFromFile: () => void;
};

export const PresetActions: React.FC<PresetActionsProps> = ({
  onOpenFromFile,
}) => {
  const openSaveModal = useModalStore((state) => state.openSaveModal);
  const openSharingModal = useModalStore((state) => state.openSharingModal);
  const openResetModal = useModalStore((state) => state.openResetModal);

  return (
    <Grid
      templateColumns="repeat(4, 1fr)"
      className="neumorphic"
      borderRadius="8px"
      mt={2}
    >
      <GridItem>
        <Center>
          <Tooltip label="Download to file" color="darkorange" openDelay={500}>
            <Button
              onClick={openSaveModal}
              w="100%"
              borderRadius="8px 0 0 8px"
              className="raised"
              _hover={{
                "& .icon": {
                  fill: "darkorange",
                  transition: "all 0.2s ease",
                },
              }}
            >
              <MdOutlineSaveAlt className="icon" color="#B09374" size="20px" />
            </Button>
          </Tooltip>
        </Center>
      </GridItem>
      <GridItem>
        <Center>
          <Tooltip label="Load from file" color="darkorange" openDelay={500}>
            <Button
              onClick={onOpenFromFile}
              w="100%"
              borderRadius="0 0 0 0"
              className="raised"
              _hover={{
                "& .icon": {
                  fill: "darkorange",
                  transition: "all 0.2s ease",
                },
              }}
            >
              <FaFolderOpen className="icon" color="#B09374" size="20px" />
            </Button>
          </Tooltip>
        </Center>
      </GridItem>
      <GridItem>
        <Center>
          <Tooltip label="Share as link" color="darkorange" openDelay={500}>
            <Box display="inline-block" w="100%">
              <Button
                onClick={openSharingModal}
                w="100%"
                borderRadius="0 0 0 0"
                className="raised"
                _hover={{
                  "& .icon": {
                    fill: "darkorange",
                    transition: "all 0.2s ease",
                  },
                }}
              >
                <IoIosShareAlt className="icon" fill="#B09374" size="26px" />
              </Button>
            </Box>
          </Tooltip>
        </Center>
      </GridItem>
      <GridItem>
        <Center>
          <Tooltip label="Reset all" color="darkorange" openDelay={500}>
            <Button
              onClick={openResetModal}
              w="100%"
              borderRadius="0 8px 8px 0"
              className="raised"
              _hover={{
                "& .iconReset": {
                  color: "#ff7b00",
                  transition: "all 0.2s ease",
                },
              }}
            >
              <RxReset className="iconReset" color="#B09374" size="20px" />
            </Button>
          </Tooltip>
        </Center>
      </GridItem>
    </Grid>
  );
};
