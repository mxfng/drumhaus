# Drumhaus

![Sample Image](./Drumhaus.png)

[See it live at drumha.us](https://www.drumha.us/)

Drumhaus is a browser controlled rhythmic groove machine built with Tone.js and next. Explore web based drum sampling with limitless creativity, and share it all with your friends.

I'm an amateur music producer, and have always been fascinated by the music software I use in my creative process. I wanted to build this project as a way to combine my love for music with my passion for coding, and dive deep into digial audio engineering and web development. I wanted to reimagine the form of a classic drum machine in a web browser with modern software technologies.

Drumhaus contains a curated assortment of sample kits and presets to help you craft the perfect groove. Its sequencer allows you to program two variations of 16th note loops on eight instruments. It was designed to be compact, open-source, and free to use for anyone interested in music production.

## Tools/Libraries Overview

Here's a brief list of the notable dependencies used in this project:

### tone.js

Early on in my design, I hit a roadblock while trying to produce a high-performance audio event scheduling algorithm for my sequencer using the barebones Web Audio API. Soon after, I discovered Tone.js, a Web Audio framework with high-performance building blocks to create complex music software in JavaScript. We don't always need to re-invent the wheel during development, and Tone.js empowered this project with its wrapping, synchronization, and scheduling capabilities.

## Features

### Kits

Kits are curated groups of samples available in Drumhaus that can be swapped as a group on the fly, allowing more flexibility to find the perfect sound for your production. The samples returned by kits are served from Next.js, and are cached locally for reuse after the initial fetch.

### Presets

Drumhaus comes pre-loaded with presets to inspire users with its wide variety of sounds and musical capabilities. Presets encapsulate the state of the application and can be used to save and share music. Users can also create their own custom presets which can be saved and loaded from local .json files, written as (.dh). Presets can be shared via a custom generated link, and are stored in a postgres db.

### Sequencer

The sequencer is capable of programming 2 variations of 16th note loops per sample. Variations can be chained in four different sequences: A, B, AB, and AAAB. This allows users to craft more dynamic loops based on their needs. Each note has a customizable velocity value, allowing users to increase or decrease its loudness. Variations can be copied, pasted, cleared, and randomized across all samples using the sequencer controls. For usability, users can click and drag to program multiple notes in one motion, and click and drag to set velocity values in the user interface.

### Sample Processing

Each individual sample can be processed with an ASDR envelope, low pass filter, and high pass filter, and mixed with panning and volume controls.

### Master Processing

The master audio output has a low pass filter, high pass filter, phaser, reverb, and compressor, each with their own control parameters.

### Input Knobs

While I chose not to reinvent the wheel when it came to low-level audio processing with TypeScript/JavaScript, I did reinvent the wheel with these knobs (literally and figuratively). These took an immense amount of time and research to perfect, but are, in my humble opinion, leagues better than the majority of knobs I found available in open source. The knobs utilize framer motion to transform cursor position into rotational values on screen, and they also transform the cursor position into custom audio parameters. There are a variety of novel outputs these knobs can produce, including logarithmic responses for frequency ranges dealing with Hz values, and split inputs where one half of the knob's rotational range can map to a different output than the other half.

### Audio Visualization

Each sample has associated frequency response data that is graphed as a graphic in the user interface when the sample is displayed. Audio data was generated using librosa, is stored on the server, and can be cached locally for re-interpretation.

## Running Locally

Once cloned, in the project directory, install all the node modules with npm:

```
npm install
```

Then, simply run:

```
npm run dev
```

## Generating Waveform Data

If you'd like to generate new sound data for the sample library, you should spin up a `venv` first. Once you've activated your venv, you can install the necessary Python packages from `requirements.txt`:

```
pip install -r requirements.txt
```

After that, you can run:

```
python3 scripts/audio_to_json.py
```

## Quickly creating new kits

To create a new kit from audio samples, use the TypeScript kit generator:

1. Add your audio files (`.wav`, `.mp3`, `.ogg`, or `.flac`) to `public/samples/your_folder/`
2. Run the script:

```
npm run kit:new
```

The interactive script will prompt you for:

- Kit name
- Sample folder path (relative to `public/samples/`)
- Author name (optional)
- Attribution details (optional)

The script will automatically:

- Generate a `.dhkit` file with intelligent role detection (kick, snare, hat, etc.)
- Create instrument names from filenames
- Update `src/lib/kit/index.ts` to export your new kit
- Set default parameter values for all instruments

After creation, review the generated `.dhkit` file in `src/lib/kit/bin/` and adjust instrument names, roles, or parameters as needed.

## License

This project is licensed under the Creative Commons Attribution-NonCommercial 4.0 International License.  
See the [LICENSE](./LICENSE) file for details.
