# The haus family: an ecosystem of instrument toys

Status: north star (vision captured, nothing scheduled).
Author: Max, July 2026.

## Summary

Drumhaus becomes the first instrument in a family of standalone, hardware-shaped browser instruments rather than a single product that grows forever.
Each instrument is a complete toy with a hard edge: bounded scope, feature-complete on its own terms, free, client-only, cheap to host, state travels in a URL.
The model is the Teenage Engineering pocket operator lineup, not a DAW: no product tries to be the studio, and the lineup itself is the brand.
Instruments may eventually play together, but linking is demand-gated and deliberately dumb (a shared clock, not a timeline).

## Why a family instead of a deeper Drumhaus

The audience reality is that people stumble in from Reddit and play for a few minutes.
All the joy lives in the first five minutes, so a new instrument buys a fresh first-five-minutes instead of extracting an eleventh minute from the same toy.
Each launch is a new discovery moment that drives people back to the others; one instrument is a project, three are an identity.
Each instrument is a fresh canvas with a defined scope, which fits sprint-shaped work better than one ever-growing monolith.
Building instrument #2 forces extraction of the shared core (engine patterns, the preset document, share links, UI primitives), which is healthy refactor pressure with a concrete consumer.

## What this is not: the DAW trap

A quirky local DAW is explicitly out of scope, permanently unless proven otherwise.
The moment there is a timeline, the project owes the world arrangement editing, automation lanes, mixing, project files, and transport edge cases forever; that surface is bottomless and contradicts every-line-is-a-liability.
The audience is wrong for it too: casual stumble-ins will not invest in a DAW, and people who want a DAW already own one.
Live sync is a weekend; sequencing across instruments is a career.

## Linking, if it earns its place

Linking means jamming, not arranging.
The pocket operators sync over a literal audio cable and a click; the web equivalent is similarly dumb and delightful.
Candidate shapes, smallest first:

- A shared transport clock over BroadcastChannel so two tabs jam in lockstep.
- A "jam table" page hosting two machines side by side with one master transport and a couple of faders, and nothing else.

No arrangement view, no per-instrument timeline, no cross-instrument project file.
If a linked session needs to be captured, the capture is audio (bounce), not an editable arrangement.

## Decision gates

1. Ship instrument #2 standalone, with zero linking code.
2. If people organically ask "can I run these together?", the shared clock earns a design pass with real demand behind it.
3. If nobody asks, the linking question answered itself and cost nothing.

## Prerequisites and order

The current Drumhaus arc completes first; the preset document work (#329) is the seam a family depends on, since a shared document pipeline and versioned share links must be stable before a second consumer exists.

1. Finish the session-document PR sequence and undo/redo (#240) on top of it.
2. Fix the sound-trust bugs: export clipping (#346) and kit pan values (#245).
3. Ship the content wins: 909 kit (#160), LinnDrum kit (#161).
4. Visualizer gallery as the between-sprints creative outlet.
5. Then instrument #2 becomes the next big creative arc.

## Open questions

- What is instrument #2? A bass synth is the natural counterpart to a drum machine; a sampler or keys thing are the other candidates.
- Naming: the -haus suffix as the family mark (the Bauhaus pun is already in the DNA); pick instrument names only when their hardware identity is designed.
- How much of the shared core is extracted as a library versus copied and allowed to diverge; decide when instrument #2 exists, not before.
