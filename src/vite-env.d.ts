/// <reference types="vite/client" />

// Build-time constants
declare const __APP_VERSION__: string;
declare const __BUILD_TIME__: string;
declare const __GIT_BRANCH__: string;
declare const __COMMIT_COUNT__: string;
declare const __NODE_VERSION__: string;

// Custom file type declarations
declare module "*.dhkit" {
  const content: import("./types/instrument").KitFileV1;
  export default content;
}

declare module "*.dh" {
  const content: import("./types/preset").PresetFileV1;
  export default content;
}
