/// <reference types="vite/client" />

// Custom file type declarations
declare module "*.dhkit" {
  const content: import("./types/instrument").KitFileV1;
  export default content;
}

declare module "*.dh" {
  const content: import("./types/preset").PresetFileV1;
  export default content;
}
