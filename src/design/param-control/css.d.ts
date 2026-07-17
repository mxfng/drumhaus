// This package imports @/design/ui as TypeScript source, whose side-effect CSS
// imports (toast.css) are handled by the consuming app's bundler; this ambient
// declaration lets the package type-check standalone.
declare module "*.css";
