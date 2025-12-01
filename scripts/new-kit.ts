#!/usr/bin/env tsx
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

type InstrumentRole =
  | "kick"
  | "snare"
  | "clap"
  | "hat"
  | "ohat"
  | "tom"
  | "perc"
  | "crash"
  | "bass"
  | "synth"
  | "other";

interface KitFileV1 {
  kind: "drumhaus.kit";
  version: 1;
  meta: {
    id: string;
    name: string;
    createdAt: string;
    updatedAt: string;
    author?: string;
  };
  instruments: Array<{
    meta: { id: string; name: string };
    role: InstrumentRole;
    sample: {
      meta: { id: string; name: string };
      path: string;
      attribution?: {
        status: string;
        label?: string;
        creditName?: string;
      };
    };
    params: {
      attack: number;
      release: number;
      filter: number;
      volume: number;
      pan: number;
      tune: number;
      solo: boolean;
      mute: boolean;
    };
  }>;
}

/**
 * Infer instrument role from filename
 */
function inferRole(filename: string): InstrumentRole {
  const lower = filename.toLowerCase();

  if (lower.includes("kick") || lower.includes("bd")) return "kick";
  if (lower.includes("snare") || lower.includes("sd")) return "snare";
  if (lower.includes("clap") || lower.includes("cp")) return "clap";
  if (lower.includes("ohat") || lower.includes("oh")) return "ohat";
  if (lower.includes("hat") || lower.includes("hh") || lower.includes("ch"))
    return "hat";
  if (lower.includes("tom") || lower.includes("lt") || lower.includes("mt"))
    return "tom";
  if (
    lower.includes("perc") ||
    lower.includes("shaker") ||
    lower.includes("stick") ||
    lower.includes("chime") ||
    lower.includes("conga") ||
    lower.includes("bongo") ||
    lower.includes("cowbell")
  )
    return "perc";
  if (
    lower.includes("crash") ||
    lower.includes("ride") ||
    lower.includes("cymbal")
  )
    return "crash";
  if (lower.includes("bass") || lower.includes("sub")) return "bass";
  if (
    lower.includes("synth") ||
    lower.includes("lead") ||
    lower.includes("pad") ||
    lower.includes("stab") ||
    lower.includes("chord") ||
    lower.includes("piano") ||
    lower.includes("keys")
  )
    return "synth";

  return "other";
}

/**
 * Generate a friendly display name from filename
 */
function generateDisplayName(filename: string): string {
  // Remove file extension
  let name = filename.replace(/\.(wav|mp3|ogg|flac)$/i, "");

  // Remove common prefixes like "kit_", "drum_", numbers, etc.
  name = name.replace(/^[\d_-]+/, "");

  // Split on underscores/hyphens and capitalize each word
  name = name
    .split(/[_-]/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");

  return name || "Sound";
}

/**
 * Find all audio files in a directory
 */
function findAudioFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((file) => /\.(wav|mp3|ogg|flac)$/i.test(file))
    .sort();
}

/**
 * Create readline interface for prompts
 */
function createPrompt() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

/**
 * Prompt user for input
 */
function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

/**
 * Generate a new kit file
 */
async function generateKit() {
  const rl = createPrompt();

  try {
    // Get kit name
    const kitName = await question(rl, "Enter the kit name: ");
    if (!kitName) {
      console.error("Kit name is required!");
      return;
    }

    // Get sample folder path (relative to public/samples/)
    const sampleFolder = await question(
      rl,
      "Enter the sample folder path (relative to public/samples/): ",
    );
    if (!sampleFolder) {
      console.error("Sample folder is required!");
      return;
    }

    // Optional: author name
    const author =
      (await question(
        rl,
        "Enter author name (optional, press Enter to skip): ",
      )) || undefined;

    // Optional: attribution
    const hasAttribution = await question(
      rl,
      "Add attribution? (y/n, default: n): ",
    );
    let attribution:
      | { status: string; label?: string; creditName?: string }
      | undefined;

    if (hasAttribution.toLowerCase() === "y") {
      const status = await question(
        rl,
        "Attribution status (unknown/self/samplePack/publicDomain/other): ",
      );
      const label = await question(
        rl,
        "Attribution label (e.g., 'Roland TR-808'): ",
      );
      const creditName = await question(
        rl,
        "Credit name (e.g., 'Roland Corporation'): ",
      );

      attribution = {
        status: status || "unknown",
        label: label || undefined,
        creditName: creditName || undefined,
      };
    }

    rl.close();

    // Find the project root
    const projectRoot = path.join(__dirname, "..");
    const samplesDir = path.join(
      projectRoot,
      "public",
      "samples",
      sampleFolder,
    );

    // Find audio files
    const audioFiles = findAudioFiles(samplesDir);

    if (audioFiles.length === 0) {
      console.error(`No audio files found in ${samplesDir}`);
      console.error(
        "Make sure the folder exists and contains .wav, .mp3, .ogg, or .flac files",
      );
      return;
    }

    console.log(`\nFound ${audioFiles.length} audio files:`);
    audioFiles.forEach((file) => console.log(`  - ${file}`));
    console.log();

    // Generate kit ID
    const kitId = `kit-${kitName.toLowerCase().replace(/[^a-z0-9]/g, "-")}`;
    const timestamp = new Date().toISOString();

    // Build the kit object
    const kit: KitFileV1 = {
      kind: "drumhaus.kit",
      version: 1,
      meta: {
        id: kitId,
        name: kitName,
        createdAt: timestamp,
        updatedAt: timestamp,
        ...(author && { author }),
      },
      instruments: audioFiles.map((file, i) => {
        const displayName = generateDisplayName(file);
        const role = inferRole(file);
        const relativePath = `${sampleFolder}/${file}`;

        return {
          meta: {
            id: `${kitId}-inst-${i}`,
            name: displayName,
          },
          role,
          sample: {
            meta: {
              id: `${kitId}-sample-${i}`,
              name: displayName,
            },
            path: relativePath,
            ...(attribution && { attribution }),
          },
          params: {
            attack: 0,
            release: 100,
            filter: 50,
            volume: 92,
            pan: 50,
            tune: 50,
            solo: false,
            mute: false,
          },
        };
      }),
    };

    // Write the .dhkit file
    const outputDir = path.join(projectRoot, "src", "lib", "kit", "bin");
    const outputFile = path.join(outputDir, `${kitName}.dhkit`);

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    fs.writeFileSync(outputFile, JSON.stringify(kit, null, 2) + "\n");
    console.log(`✓ Created ${outputFile}`);

    // Update the index.ts file
    const indexFile = path.join(projectRoot, "src", "lib", "kit", "index.ts");
    let indexContent = fs.readFileSync(indexFile, "utf-8");

    // Add import
    const importStatement = `import ${kitName}KitJson from "@/lib/kit/bin/${kitName}.dhkit";`;
    const importSectionEnd = indexContent.indexOf(
      'import { validateKitFile } from "@/lib/kit/load";',
    );

    if (importSectionEnd !== -1 && !indexContent.includes(importStatement)) {
      indexContent =
        indexContent.slice(0, importSectionEnd) +
        importStatement +
        "\n" +
        indexContent.slice(importSectionEnd);
    }

    // Add export
    const exportStatement = `export const ${kitName} = (): KitFileV1 => validateKitFile(${kitName}KitJson);`;

    if (!indexContent.includes(exportStatement)) {
      // Find the last export statement
      const lastExport = indexContent.lastIndexOf("export const");
      const lineEnd = indexContent.indexOf("\n", lastExport);

      indexContent =
        indexContent.slice(0, lineEnd + 1) +
        exportStatement +
        "\n" +
        indexContent.slice(lineEnd + 1);
    }

    fs.writeFileSync(indexFile, indexContent);
    console.log(`✓ Updated ${indexFile}`);

    console.log("\n✓ Kit creation complete!");
    console.log("\nNext steps:");
    console.log(
      `1. Review the generated file: ${path.relative(process.cwd(), outputFile)}`,
    );
    console.log("2. Adjust instrument names, roles, and parameters as needed");
    console.log(`3. Import and use: import { ${kitName} } from "@/lib/kit";`);
  } catch (error) {
    console.error("Error:", error);
    rl.close();
  }
}

// Run the script
generateKit();
