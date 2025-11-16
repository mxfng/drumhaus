import librosa
import numpy as np
import json
import os
from pathlib import Path


def audio_to_json(audio_file, output_json, average_length=200):
    # Load the audio file
    y, sr = librosa.load(audio_file)

    # Determine n_fft dynamically based on signal length
    n_fft = min(2048, len(y) // 2)  # Use 2048 unless the signal is very short

    # Extract the amplitude envelope
    amplitude_envelope = np.abs(librosa.stft(y, n_fft=n_fft))

    # Average the amplitude values over the specified length
    averaged_amplitude = []
    for i in range(0, amplitude_envelope.shape[1], average_length):
        avg_value = np.mean(amplitude_envelope[:, i : i + average_length], axis=1)
        averaged_amplitude.append(avg_value.tolist())

    # Convert to a list for JSON serialization
    amplitude_list = averaged_amplitude

    # Write the JSON data to a file
    with open(output_json, "w") as json_file:
        json.dump({"amplitude_envelope": amplitude_list}, json_file)


def crawl_audio_files_directory(directory):
    wav_files = []
    total_files = 0  # Variable to keep track of the total file count

    # Construct the full path to the target directory
    target_directory = os.path.join(nextjs_root, directory)

    # Recursively crawl through the target directory
    for root, dirs, files in os.walk(target_directory):
        for file in files:
            # Check if the file has a .wav extension
            if file.lower().endswith(".wav"):
                # Get the full path to the .wav file
                wav_path = os.path.join(root, file)
                wav_files.append(wav_path)
                total_files += 1  # Increment the total file count

    return wav_files, total_files


def crawl_waveforms_directory(directory):
    json_files = []
    total_waveforms = 0  # Variable to keep track of the total file count

    target_directory = os.path.join(nextjs_root, directory)

    # Crawl through the target directory
    for root, dirs, files in os.walk(target_directory):
        for file in files:
            # Check if the file has a .json extension
            if file.lower().endswith(".json"):
                # Get the full path to the .json file
                json_path = os.path.join(root, file)
                json_files.append(json_path)
                total_waveforms += 1

    return json_files, total_waveforms


if __name__ == "__main__":
    print("Converting audio files to waveform .json")
    # Specify if existing files should be overwritten
    overwrite = True

    # Get the directory of the Python script
    script_directory = Path(__file__).resolve()

    # Navigate up to the Next.js root folder
    nextjs_root = None
    while script_directory.name != "drumhaus":
        script_directory = script_directory.parent
    nextjs_root = script_directory

    audio_files_directory = "public/samples"
    audio_files, total_files = crawl_audio_files_directory(audio_files_directory)

    waveforms_directory = "public/waveforms"
    existing_json_paths, total_waveforms = crawl_waveforms_directory(
        waveforms_directory
    )

    total_new_waveforms = 0

    # Process each .wav file
    for audio_file in audio_files:
        # Generate the output JSON file path in the waveforms directory
        output_json_path = os.path.join(
            nextjs_root,
            "public",
            "waveforms",
            f"{os.path.splitext(os.path.basename(audio_file))[0]}.json",
        )

        if overwrite or output_json_path not in existing_json_paths:
            audio_to_json(audio_file, output_json_path)
            total_new_waveforms += 1

    # Print the total file count
    print(f"Overwrite was {overwrite}")
    print(f"Total audio files found: {total_files}")
    print(f"Total waveform .json files found: {total_waveforms}")
    print(f"Total waveform .json files generated: {total_new_waveforms}")
