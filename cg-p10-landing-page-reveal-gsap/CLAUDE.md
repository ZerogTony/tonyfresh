# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a landing page animation project inspired by P10 design, built with vanilla JavaScript and GSAP (GreenSock Animation Platform). The project features a complex preloader sequence that reveals the main content through coordinated text splits, transforms, and clip-path animations.

## Development Commands

- **Start dev server**: `npm run dev` (runs Vite dev server)
- **Build**: Vite build command (no script configured in package.json currently)

## Architecture

### Animation Flow

The entire experience is orchestrated through a single GSAP timeline in [script.js](script.js) that executes in the following sequence:

1. **Tag reveal** (0.5s-0.7s): Three floating tags animate into view
2. **Initial text reveal** (0.5s): "Nullspace Studio" characters slide up
3. **Text transition** (2s-3.5s): All letters except "N" slide out, "10" slides in
4. **Transform sequence** (3.5s-5.25s): The "N" and "10" morph and reposition to form the final "N10" logo
5. **Split reveal** (5s-6s): Preloader and split-overlay divide via clip-path, revealing a sliver of main content
6. **Tag exit** (5.5s-5.7s): Floating tags slide out
7. **Full reveal** (6s-7s): Overlays slide away, main content expands from center
8. **Card reveal** (6.25s-7.25s): White card with "Nullspace" text reveals via clip-path and staggered character animation

### Layer Structure

The page uses 3 overlapping full-screen layers:

- **`.preloader`** (z-index: 2): Top half of the split animation, initially full screen
- **`.split-overlay`** (z-index: 1): Bottom half of the split animation
- **`.tags-overlay`** (z-index: 2): Transparent layer containing floating tag elements
- **`.container`** (z-index: 2): Main content beneath, revealed through clip-path expansion

Both `.preloader` and `.split-overlay` contain identical title elements (`.intro-title` and `.outro-title`) that are styled differently and animated in sync. At 5.25s, their clip-paths are set to split the screen horizontally before they slide apart.

### Text Animation System

All text animations use GSAP's `SplitText` plugin via the `splitTextElements()` utility function:

- Splits text into characters/words with custom class names
- Wraps each character in an additional `<span>` for Y-axis translation effects
- Supports `addFirstChar` option to mark the first character for special treatment (the "N" transformation)

### Responsive Behavior

Mobile breakpoint at 1000px ([styles.css:181](styles.css#L181)) adjusts:
- Font sizes and positioning values throughout [script.js](script.js)
- Card width (30% → 75%)
- All hardcoded transform values have mobile alternatives

### Dependencies

- **GSAP 3.13.0**: Core animation engine
- **CustomEase plugin**: Custom easing curve "hop" (.8, 0, .3, 1)
- **SplitText plugin**: Text-splitting utility (requires GSAP Club membership or trial)
- **Vite**: Build tool and dev server

## Key Implementation Details

- All animations are defined before page load completes (`DOMContentLoaded`)
- The timeline uses relative positioning (second parameter in `.to()` calls) for precise sequencing
- Clip-path animations create the split/reveal effects without DOM manipulation
- Mobile detection uses `window.innerWidth <= 1000` to set initial positions
- Asset handling configured in [vite.config.js](vite.config.js) to preserve original filenames
