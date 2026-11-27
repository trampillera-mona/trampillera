# ORIGAMI MAPS PLANNER — Visual & Print QA v0.2

**Scope:** WORLDS & PLAY / Mars Foundation Pack  
**Branch:** `feat/origami-maps-planner-foundation`  
**Review type:** Source-level visual, responsive-layout, accessibility and print-geometry audit  
**Status:** Source corrections committed; live browser screenshots and physical printer registration remain operator checks.

## 1. Review boundary

The Render preview origin was not readable by the inspection browser used for this review. This report therefore distinguishes source-level findings from rendered-browser and physical-print verification. No claim is made that a screenshot or printer test has been completed.

## 2. Display and interaction review

- Main page uses a dark graphite palette with cyan, violet and amber accents and a fluid shell capped at 1440 px.
- Hero changes from a two-column layout to a single column at 850 px.
- Content cards stack at the tablet breakpoint; the map workbench moves its layer controls below the map.
- At 520 px, asset cards become a single column and map controls remain compact.
- The round Origami Pulse Gate has a visible keyboard focus state and disables animation and smooth scrolling for reduced-motion preferences.
- A keyboard skip link now moves focus/navigation to the map workspace.
- The language control exposes EN and RU as available; unfinished locales are disabled instead of silently displaying English under another language code.
- The browser map is explicitly labelled as an illustrative preview. Its print action is named **PRINT MAP PREVIEW**; the six downloadable SVGs are the print-ready aligned layers.

## 3. Coordinate and print geometry

- Printable canvas: 1100 × 850 SVG units.
- Shared map frame: x=100..1000, y=110..810 (900 × 700 units).
- Grid: 9 columns (01–09) × 7 equal rows (A–G); each cell is 100 × 100 SVG units.
- Scenario convention: 20 km per cell, fictional game scale only.
- A4 landscape print area: 259 × 200 mm, preserving the 1100:850 canvas ratio and leaving printer margins.
- All six overlay sheets and the base map use the same canvas, frame, grid and north orientation.
- Provisional points of interest align with the dossier: C03, B07 and F08.
- The rover start marker is centred in D05.

## 4. Corrections applied

1. Replaced stale v0.1 release labels on the main page with v0.2.
2. Clarified that the browser preview is illustrative and is not the aligned print-map series.
3. Replaced speculative mineral/water labels with provisional POI markers and explicit unknown status.
4. Corrected the map frame from 900 × 640 to 900 × 700 and completed the seventh equal grid row.
5. Aligned POI markers to C03, B07 and F08 and the rover marker to D05.
6. Normalized SVG physical output dimensions for A4 landscape printing.
7. Updated legend, quick start, dossier, scenario, hub page and provenance registry versions.
8. Added keyboard skip navigation and corrected screen-reader-only label styling.
9. Disabled unfinished language choices until their translations are implemented.

## 5. Operator verification still required

- Open the Preview page at desktop (1440 px), tablet (768 px) and mobile (390 px).
- Tab through the page; verify the skip link, language selector, map toggles and round gate.
- Switch each of the six layers independently, use Show All / Clear Layers, then print the preview.
- Open the base map and all six SVG overlays; verify identical outer frames, grid intersections and north arrows.
- Print one overlay at 100% on A4 landscape with printer scaling disabled; compare frame dimensions before printing the remaining sheets.
- Print the Physical Assembly Kit on A4 portrait and inspect token cut lines, role cards and log-table page breaks.

**Evidence rule:** source inspection and CI success do not equal rendered-browser or physical-printer verification. Unknown or untested states remain explicitly unverified.
