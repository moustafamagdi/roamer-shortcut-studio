# Roamer Shortcut Studio — Design Direction

## Approach 1
**Theme Name:** Drafting Table

**Very Brief Intro:** A warm, paper-and-ink interface inspired by architectural drawing tables, with cream surfaces, technical blue marks, and tactile annotations. It makes a complex configuration file feel approachable and deliberate.

**Probability:** 0.04

## Approach 2
**Theme Name:** Signal Console

**Very Brief Intro:** A restrained dark operations console with crisp cyan signals, disciplined panels, and instrument-like status cues. It emphasizes precision, control, and safe system changes without becoming cyberpunk.

**Probability:** 0.08

## Approach 3
**Theme Name:** Quiet Blueprint

**Very Brief Intro:** A calm, high-contrast utility interface based on blueprint grids, graphite typography, and a single safety-orange accent. It balances technical credibility with a clean, low-friction editing workflow.

**Probability:** 0.03

## Selected Approach: Quiet Blueprint

### Design Movement
Swiss International Style translated through architectural blueprint notation: rigorous hierarchy, visible structure, disciplined alignment, and purposeful asymmetry.

### Core Principles
1. Make file state visible at a glance: loaded, changed, valid, and safe-to-export should never be ambiguous.
2. Treat keyboard shortcuts as physical controls: show them as compact keycaps and keep editing direct.
3. Use structure as decoration: blueprint lines, section labels, and measured spacing should carry the visual identity.
4. Make destructive actions reversible and hard to trigger accidentally.

### Color Philosophy
The base is a cool paper-white and graphite system that keeps long editing sessions calm. Blueprint navy anchors navigation and code-like surfaces. A signature safety-orange is reserved for unsaved changes, active edits, and deliberate attention—not generic decoration. Pale cyan marks provide quiet technical texture without overpowering content.

### Layout Paradigm
A two-axis workspace: a narrow command index on the left, a focused editor canvas in the middle, and a slim file-health rail on the right. On smaller screens these become stacked sections with the file-health rail pinned near the top. The content should feel like a drafting board rather than a centered marketing card.

### Signature Elements
1. Fine blueprint grid lines and coordinate-style micro labels.
2. Orange “modified” notch and restrained status stamps.
3. Shortcut keycaps that visually resemble physical keyboard tiles.

### Interaction Philosophy
Interactions should be immediate and explicit. Selecting a command updates the editor without modal interruption. Invalid shortcuts are surfaced inline before saving. Delete actions require a confirmation step and are recoverable through Undo. The file is always treated as the source of truth: no upload leaves the browser, and export is disabled until the document is valid.

### Animation
Use short 160–220ms ease-out transitions for selection, panel reveal, and toast feedback. Never animate keyboard-driven command navigation. Let the active row shift with a subtle orange rule and background tint. Respect prefers-reduced-motion and avoid layout-shifting animations.

### Typography System
Use Space Grotesk for headings and navigation, paired with IBM Plex Mono for command IDs, shortcuts, counters, and XML-related metadata. Body copy uses Space Grotesk at a comfortable reading size. Headings should be compact and confident; metadata should feel instrument-grade.

### Brand Essence
A focused browser utility for Navisworks users who need to change command shortcuts safely, locally, and without editing XML by hand. Personality: precise, calm, trustworthy.

### Brand Voice
Headlines are direct and operational. CTAs explain the outcome rather than using vague encouragement. Microcopy reassures without overpromising.

Example lines:
- “Shape the controls. Keep the file intact.”
- “No changes leave this browser until you export.”

### Wordmark & Logo
A compact mark made from three offset blueprint corner brackets forming an abstract “R”/roamer path, paired with a custom uppercase wordmark. The mark should work alone as the favicon and as a strong header symbol.

### Signature Brand Color
Safety Orange `#F26B38` — an ownable, high-contrast signal for attention, modification, and intentional action.

## Style Decisions

- Safety Orange `#F26B38` is reserved for modified state, review state, export/apply intent, and small directional notches; it is not used as broad decorative emphasis.
- The logo system uses the bracket-path mark with an uppercase slash-separated wordmark treatment instead of a plain mixed-case lockup.
- The first screen reads as an operational drafting-board workspace first and a marketing title plate second; hierarchy comes from Swiss scale, alignment, and blueprint notation.
- The editor workspace carries a navy drawing-rule, measured metadata, and an active drawing label so the command index, editor canvas, and file-health rail feel like one technical artifact.
