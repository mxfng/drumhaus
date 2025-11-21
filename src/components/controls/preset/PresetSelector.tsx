import { Box, Button, Select, Text } from "@chakra-ui/react";
import { IoMdArrowDropdown } from "react-icons/io";

import type { PresetFileV1 } from "@/types/preset";

type PresetSelectorProps = {
  selectedPresetId: string;
  presets: PresetFileV1[];
  onSelect: (event: React.ChangeEvent<HTMLSelectElement>) => void;
};

export const PresetSelector: React.FC<PresetSelectorProps> = ({
  selectedPresetId,
  presets,
  onSelect,
}) => {
  return (
    <>
      <Text fontSize={12} color="gray">
        PRESET
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
        <Box id="preset" h="40px" mb={2} position="relative">
          <Select
            variant="unstyled"
            icon={<></>}
            value={selectedPresetId}
            fontFamily={`'Pixelify Sans Variable', sans-serif`}
            color="gray"
            w="332px"
            h="40px"
            borderRadius="8px"
            cursor="pointer"
            onChange={(event) => {
              onSelect(event);
            }}
            onKeyDown={(ev) => ev.preventDefault()}
            pl={4}
          >
            {presets.map((preset) => (
              <option key={preset.meta.id} value={preset.meta.id}>
                {preset.meta.name}
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
