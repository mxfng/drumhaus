import { playwright } from "@vitest/browser-playwright";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.browser.test.ts"],
        },
      },
      {
        // Pre-bundle the browser suites' bare-specifier dependencies up front.
        // Vitest browser mode serves this package and @haus/ui as workspace
        // source, so left to on-the-fly discovery Vite can optimize their bare
        // deps mid-run and reload the page ("Vite unexpectedly reloaded a
        // test... may cause flaky behaviour"), the flake drumhaus's vitest
        // config guards against the same way. The `@haus/ui > x` entries use
        // Vite's nested include syntax: ui's own deps are not resolvable from
        // this package's root under pnpm. The list covers everything the
        // suites reach - the components' direct imports plus the full
        // @haus/ui barrel.
        optimizeDeps: {
          include: [
            "react",
            "react-dom",
            "react-dom/client",
            "@radix-ui/react-slot",
            "lucide-react",
            "@haus/ui > @radix-ui/react-checkbox",
            "@haus/ui > @radix-ui/react-dialog",
            "@haus/ui > @radix-ui/react-dropdown-menu",
            "@haus/ui > @radix-ui/react-label",
            "@haus/ui > @radix-ui/react-radio-group",
            "@haus/ui > @radix-ui/react-select",
            "@haus/ui > @radix-ui/react-separator",
            "@haus/ui > @radix-ui/react-slider",
            "@haus/ui > @radix-ui/react-tabs",
            "@haus/ui > @radix-ui/react-toast",
            "@haus/ui > @radix-ui/react-tooltip",
            "@haus/ui > class-variance-authority",
            "@haus/ui > clsx",
            "@haus/ui > lucide-react",
            "@haus/ui > tailwind-merge",
          ],
        },
        test: {
          name: "browser",
          include: ["src/**/*.browser.test.ts"],
          browser: {
            enabled: true,
            headless: true,
            provider: playwright(),
            instances: [{ browser: "chromium" }],
          },
        },
      },
    ],
  },
});
