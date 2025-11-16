import os
from pathlib import Path


def find_samples_folder(script_folder, sample_group_folder):
    # Navigate up to the Next.js root folder
    nextjs_root = find_nextjs_root(script_folder=script_folder)

    # Create the /public/samples folder if it doesn't exist
    samples_root = nextjs_root / "public" / "samples"
    samples_root.mkdir(parents=True, exist_ok=True)

    # Navigate inwards to /public/samples/sample_group_folder
    samples_folder = samples_root / sample_group_folder
    samples_folder.mkdir(parents=True, exist_ok=True)

    return samples_folder, samples_root


def add_new_kit(kit_name, sample_group_folder):
    script_folder = Path(__file__).resolve().parent
    samples_folder, samples_root = find_samples_folder(
        script_folder, sample_group_folder
    )

    if samples_folder:
        # Navigate up to the Next.js root folder
        nextjs_root = find_nextjs_root(script_folder=script_folder)

        # Assemble the kits file directory
        kits_file = nextjs_root / "src" / "lib" / "kits.ts"

        with open(kits_file, "a") as file:
            file.write(f"\n// Auto-Generated")
            file.write(
                f"\n\n// Re-order this list to template or provide custom names template"
            )
            file.write(f"\nconst {kit_name}Samples: SampleData[] = wrapToSampleData([")

            for sample_file in samples_folder.glob("*.wav"):
                sample_name = sample_file.stem
                file_url = os.path.relpath(sample_file, samples_root)
                print(file_url)
                file.write(f'\n  "{file_url}",')

            file.write("\n]);\n\n")
            file.write(f"export const {kit_name} = (): Kit => ({{")
            file.write(f'\n  name: "{kit_name}",')
            file.write(f"\n  samples: {kit_name}Samples,")
            file.write("\n  _attacks: [0, 0, 0, 0, 0, 0, 0, 0],")
            file.write("\n  _releases: [100, 100, 100, 100, 100, 100, 100, 100],")
            file.write("\n  _filters: [50, 50, 50, 50, 50, 50, 50, 50],")
            file.write("\n  _volumes: [92, 92, 92, 92, 92, 92, 92, 92],")
            file.write("\n  _pans: [50, 50, 50, 50, 50, 50, 50, 50],")
            file.write(
                "\n  _solos: [false, false, false, false, false, false, false, false],"
            )
            file.write(
                "\n  _mutes: [false, false, false, false, false, false, false, false],"
            )
            file.write("\n});\n")

    else:
        print("No sample group folder was found.")


def find_nextjs_root(script_folder):
    current_dir = Path(script_folder).resolve()
    nextjs_root = None
    while current_dir.name != "drumhaus":
        current_dir = current_dir.parent
        if not current_dir.exists():
            print(f"Warning: {current_dir} does not exist.")
            return None
    else:
        nextjs_root = current_dir

    return nextjs_root


if __name__ == "__main__":
    kit_name = input("Enter the new kit name: ")
    sample_group_folder = input("Enter the sample group folder name: ")

    add_new_kit(kit_name, sample_group_folder)
    print(f'New kit "{kit_name}" added to kits.')
