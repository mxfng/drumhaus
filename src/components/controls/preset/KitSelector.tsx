"use client";

import { Box, Button, Select, Text } from "@chakra-ui/react";
import { IoMdArrowDropdown } from "react-icons/io";

import type { KitFileV1 } from "@/types/instrument";

type KitSelectorProps = {
  selectedKit: string;
  kitOptions: (() => KitFileV1)[];
  onKitChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const KitSelector: React.FC<KitSelectorProps> = ({
  selectedKit,
  kitOptions,
  onKitChange,
}) => {
  return (
    <>
      <Text fontSize={12} color="gray">
        KIT
      </Text>

      <Box
        w="100%"
        borderRadius="8px"
        boxShadow="0 2px 8px rgba(176, 147, 116, 0.6) inset"
        _hover={{
          "& .icon": {
            fill: "darkorange",
            transition: "all 0.2s ease",
          },
        }}
      >
        <Box h="40px" w="100%" id="kit" mb={2} position="relative">
          <Select
            variant="unstyled"
            icon={<></>}
            value={selectedKit}
            fontFamily={`'Pixelify Sans Variable', sans-serif`}
            color="gray"
            w="332px"
            h="40px"
            borderRadius="8px"
            cursor="pointer"
            pl={4}
            onChange={onKitChange}
            onKeyDown={(ev) => ev.preventDefault()}
          >
            {kitOptions.map((kit) => (
              <option key={kit().meta.id} value={kit().meta.id}>
                {kit().meta.name}
              </option>
            ))}
          </Select>
          <Button
            bg="transparent"
            position="absolute"
            right={0}
            top={0}
            pointerEvents="none"
          >
            <Box>
              <Box h="50%" transform="rotate(180deg)" mb={-1}>
                <IoMdArrowDropdown className="icon" color="#B09374" />
              </Box>
              <Box h="50%">
                <IoMdArrowDropdown className="icon" color="#B09374" />
              </Box>
            </Box>
          </Button>
        </Box>
      </Box>
    </>
  );
};
