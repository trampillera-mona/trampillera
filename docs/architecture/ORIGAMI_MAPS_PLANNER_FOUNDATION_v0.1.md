# ORIGAMI MAPS PLANNER — Product & Architecture Foundation v0.1

**Parent environment:** TRAMPILLERA GAME STUDIO  
**Navigation:** TRAMPILLERA → GAME STUDIO → WORLDS & PLAY → ORIGAMI MAPS PLANNER  
**Initial world pack:** MARS — ORIGAMI WORLD  
**Specification language:** English  
**Status:** PARTIAL IMPLEMENTATION — source committed on `feat/origami-maps-planner-foundation`; not merged or production-verified

## 1. Product definition

ORIGAMI MAPS PLANNER is a creative tabletop-world toolkit. It provides printable maps, world lore, modifiable map layers, origami craft instructions, printable templates, symbols, object identifiers, and guidance for using the materials.

It does not prescribe one mandatory game or require users to digitize their play. Users decide how to use, adapt, combine, print, share, and optionally digitize the supplied materials, subject to the applicable material-use license.

**Product principle:** We provide the world-building materials. Players create the way they play.

Suggested tagline: **MAP IT. FOLD IT. BUILD YOUR WORLD.**

## 2. Placement and discovery

ORIGAMI MAPS PLANNER is an exclusive product area within TRAMPILLERA GAME STUDIO, not a separate application.

Required entry points:
- A dedicated WORLDS & PLAY item inside the Game Studio navigation.
- A distinct circular, gently pulsing shortcut on the main splash / launcher, positioned near the AI Assistant entry point.
- Both entry points lead to the WORLDS & PLAY landing page.

WORLDS & PLAY is the collection/catalogue for game worlds and their materials. ORIGAMI MAPS PLANNER is its first featured product. Future worlds and material collections can be added without changing the parent navigation model.

## 3. Language and localization

- English is the canonical development language and source language for UI copy, product documentation, map legends, object metadata, craft instructions, and material guides.
- Provide a language/translation panel using the platform's declared locale set: EN, RU, SR, DE, FR, ES, IT, PT, ZH, JA, KO, AR.
- Keep source strings separate from translations. Use stable translation keys and locale dictionaries; do not hard-code translated UI copy into components.
- Translation coverage must be tracked per content type. A locale being selectable does not mean every page, instruction, map label, or downloadable asset has been translated.
- Preserve user-generated names and custom lore unless the user explicitly requests translation. Map symbols and identifiers should remain stable across locales.
- Any machine-generated translation should be identifiable as such until reviewed.

## 4. Map model: multi-layer worlds

A map may consist of multiple named, aligned layers sharing a common coordinate system, scale, extent, and reference grid. A player or group can use one layer or operate across several layers in the same session.

Initial layer categories (configurable per world):
1. **BASE TERRAIN** — geography, elevation, craters, water/ice, terrain types.
2. **INFRASTRUCTURE** — bases, buildings, roads, landing sites, energy and communications.
3. **RESOURCES** — deposits, supplies, production areas, points of interest.
4. **OPERATIONS / TACTICAL** — units, routes, objectives, restricted areas, operational markers.
5. **ENVIRONMENT / CONDITIONS** — weather, hazards, visibility, radiation or other scenario conditions where appropriate.
6. **TIME / SCENARIO STATE** — changing events, ownership, discoveries, construction progress, and scenario phases.

These are proposed layer types, not a fixed mandatory schema. A world author may add, rename, combine, hide, reveal, print, or omit layers.

### Multi-layer play

- Several layers may be active in one game at the same time.
- Different players or roles may consult different layers while sharing the same world coordinates.
- Actions on one layer may affect another (for example, discovering a resource on the terrain layer may enable an infrastructure decision).
- The physical print-and-play format should support transparent overlays, separate aligned sheets, or another practical registration method.
- Layer names, visibility, version, scale, legend, and coordinate reference should be clear on every printable layer.
- The digital planner may help prepare and preview layers, but digital operation is optional and is not a prerequisite for physical play.

## 5. Materials library

The product may provide:
- Printable world maps and aligned map layers.
- Lore, setting notes, factions, locations, scenarios, and optional objectives.
- Origami folding instructions and printable model templates.
- Coloring sheets, emblems, flags, markings, labels, and unit identifiers.
- Printable cards, tokens, reference sheets, legends, and quick-start guides.
- Instructions for printing, assembling, modifying, combining, and using the materials.

Origami instructions should be original or appropriately licensed. Difficulty, paper size, required tools, and assembly steps should be stated. Models intended as tabletop pieces should be stable and practical to handle.

## 6. Physical play and future accessory system

The product is intentionally physical-first / print-and-play friendly. Players may use dice, paper models, counters, cards, pencils, and their own rules.

A future optional physical accessory system is reserved for later design:
- Special wooden counting instruments / counters (exact form and terminology to be designed).
- Calculation and conversion tables for the selected game systems.
- A campaign notebook / logbook for recording decisions, values, events, and state changes.
- Supporting reference sheets and player aids.

These accessories are **FUTURE CONCEPT — NOT PART OF THE INITIAL IMPLEMENTATION**. Their mechanics, dimensions, materials, manufacturing, and calculation methods require separate design and testing. The software must not pretend these physical tools already exist or silently assume their rules.

## 7. Initial product scope

The first release should establish the product structure and a usable first world pack:
- WORLDS & PLAY landing page.
- ORIGAMI MAPS PLANNER product page.
- MARS — ORIGAMI WORLD as the first collection.
- One printable base map and a small set of aligned sample layers.
- A compact lore/legend package.
- A small set of original, beginner-friendly origami models and instructions.
- Printable symbols, labels, and usage guide.
- English source content and localization infrastructure aligned with the platform locale set.

The first release does not require a full rules engine, online multiplayer, campaign synchronization, digital twin, marketplace, or manufacturing of wooden accessories.

## 8. Architecture and integration boundaries

- Integrate as a module/page within the existing TRAMPILLERA application and Game Studio; do not create an independent deployable service without a later architectural decision.
- Reuse the platform's shared navigation, design system, authentication model where required, and localization infrastructure after inspecting their actual implementation.
- Keep map content, layer definitions, lore, printable assets, and translation resources modular and versionable.
- Distinguish downloadable static assets from interactive planner features.
- Do not claim a map is editable, layered, translated, printable, or tested until that capability is implemented and verified.
- No automatic production deployment. Render deployment remains an explicit operator decision.

## 9. Acceptance principles

A capability may be marked IMPLEMENTED only when its source and behavior are verified. Use the platform's status vocabulary: REAL / IMPLEMENTED, PARTIAL, DEMO, NOT IMPLEMENTED, or UNKNOWN.

For the initial foundation:
- The product placement and navigation are specified.
- English source language and the 12 declared locales are specified; translation completeness remains unverified.
- Multi-layer map behavior is specified; no multi-layer editor or printable layer pack is yet claimed.
- Physical accessory concepts are recorded as future work only.


## 10. Implementation snapshot — 2026-11-27

The following source-level elements have been added on the feature branch:

- Static WORLDS & PLAY / ORIGAMI MAPS PLANNER page at `/worlds-play/`.
- Circular pulsing launcher on the main portal splash and within the Polar Settlement game environment; both link to the product page.
- A Mars map preview with six independently selectable visual layers: terrain, infrastructure, resources, operations, environment, and scenario/time.
- A browser print action that prints the currently visible map layers.
- A language selector exposing the platform's 12 declared locale codes.

**Coverage and verification limits:**
- The current page contains authored English and Russian UI dictionaries. The other locale options currently fall back to English; full translation coverage is NOT IMPLEMENTED.
- The six map layers are a static illustrative SVG preview with client-side visibility toggles. There is no editable map authoring engine, layer data model, synchronized multi-player state, or downloadable layer pack yet.
- The print action uses the browser print dialog. Dedicated print layouts for each paper size and separate layer exports are not yet verified.
- Lore, origami folding sheets, printable object templates, symbols, resource cards, and campaign notebook content remain planned materials; the current page describes the intended library but does not yet provide those downloadable assets.
- Wooden counters, calculation/conversion tables, and campaign notebook remain FUTURE CONCEPT.
- No production deployment has been performed. Render deployment remains a separate operator decision.


## 11. Mars Print & Play asset snapshot — 2026-11-27

The feature branch now includes the first downloadable Mars starter pack under `app/public/worlds-play/packs/mars/`:

| Asset | Source status | Purpose |
|---|---|---|
| `mars-base-map.svg` | IMPLEMENTED — original SVG source | Landscape printable base map with coordinate grid, terrain, habitat, ridge and supply route |
| `mars-map-legend.md` | IMPLEMENTED — authored guide | Coordinate reference, symbol key and print notes |
| `mars-scenario-01.md` | IMPLEMENTED — authored scenario draft | Open exploration/logistics scenario, adaptable by players |
| `symbol-sheet.svg` | IMPLEMENTED — original SVG source | Printable cut-out tabletop markers |
| `origami-field-marker-guide.md` | IMPLEMENTED — original folding guide draft | Beginner standing paper marker using one square sheet |
| `quick-start-print-and-play.md` | IMPLEMENTED — authored guide | Print setup, physical play and adaptation instructions |

The product page contains direct links to all six assets in a new **PRINT & PLAY LIBRARY** section.

### Verification limits

- SVG files are source assets committed to the branch; browser rendering, printer output, and physical fold stability have not been independently tested in this workflow.
- The base map is fictional tabletop content. Its 20 km-per-cell convention is a game scale only, not a real Mars measurement.
- The scenario is an open prompt, not a complete mandatory ruleset.
- The paper-fold marker is a beginner concept draft; test folds with scrap paper before producing a set.
- At this snapshot, the initial six starter assets did not yet constitute a separate aligned overlay series; that gap was addressed in the later overlay update documented in section 12. The interactive page preview still uses its own illustrative SVG and is not a GIS/map engine.
- Localization remains incomplete: EN and RU are authored; the other ten locale options currently fall back to English. The selector must not be treated as proof of full localization.
- No production deployment or merge has been performed.


## 12. Aligned physical map overlays — 2026-11-27

Six separate SVG overlay sheets have now been added:

- `layer-terrain.svg`
- `layer-infrastructure.svg`
- `layer-resources.svg`
- `layer-operations.svg`
- `layer-environment.svg`
- `layer-scenario.svg`

All six share the same 1100 × 850 page canvas, 900 × 640 map frame, coordinate grid, north orientation and nominal 20 km-per-cell game convention. Their page backgrounds are transparent in the SVG source. Each is independently linked from the product page.

**Physical workflow intended:** print each sheet at 100% / actual size; use tracing paper or transparent film for simultaneous overlays; align the map frame and coordinate grid. Separate ordinary-paper sheets can also be consulted side by side.

**Verification boundary:** shared SVG geometry is authored consistently in source, but printer scaling, registration tolerance, transparency-film handling and real tabletop usability have not yet been physically tested. These are aligned printable SVG overlays, not GIS data layers or an editable map engine.


## 13. Brand, watermark and provenance controls — 2026-11-27

### Brand layer
The WORLDS & PLAY page and Mars pack identify the origin as **TRAMPILLERA GAME STUDIO / WORLDS & PLAY / ORIGAMI MAPS PLANNER**. The page footer carries a copyright and brand notice plus a link to the provenance registry.

### Passive marks
- SVG map sheets and symbol sheet include visible TRAMPILLERA / ORIGAMI MAPS PLANNER marks, per-asset IDs, source/verification URLs and embedded SVG metadata.
- Editorial Markdown assets include copyright/provenance footers and unique asset IDs.
- SVG metadata records product, asset ID, version, date, source and a notice to preserve provenance when redistributing.

### Active provenance lookup
- `app/public/worlds-play/provenance/registry.json` is the registry of issued Mars pack asset IDs and canonical source paths.
- `app/public/worlds-play/verify/index.html` reads the `id` query parameter and checks whether that ID is listed in the registry.
- Each marked SVG contains a verification URL. Editorial Markdown footers contain matching lookup URLs.

### Security and legal limits
The current active check confirms only that an asset ID and path are listed in the project registry. It does **not** hash the downloaded file, detect edits, prevent copying, provide DRM, or independently prove legal ownership. A copied ID can be copied along with a file. Cryptographic integrity checking (e.g. signed manifest and SHA-256 file verification), automated release signing, QR code labels, and tamper-evident publication records are NOT IMPLEMENTED.

The copyright and brand notice is a provenance and rights notice, not a claim that TRAMPILLERA or ORIGAMI MAPS PLANNER is a registered trademark. Registration, ownership and enforceability require separate legal verification in relevant jurisdictions. Existing `TRADEMARKS.md` remains the governing brand-use notice.


## 14. TRAMPILLERA-wide Brand & Provenance Standard — 2026-11-27

The product-specific marks are now governed by the umbrella standard:
`docs/brand/TRAMPILLERA_BRAND_PROVENANCE_STANDARD_v1.0.md` (TMP-BPS-STD-001).

Implemented baseline:
- Versioned registry schema: `schemas/provenance-registry-v1.1.schema.json`.
- Mars registry entries include origin type, attribution, rights-status note and issue date.
- Automated validator: `scripts/verify-provenance-registry.mjs`.
- The validator is called by `scripts/check.sh`.
- Architecture documentation index links the standard and schema.

The validator checks the current registry's required fields, unique IDs and paths, supported origin classifications, canonical path scope, source-file existence, embedded asset ID, TRAMPILLERA attribution, and SVG metadata presence.

**Boundary:** this is validation of registry consistency and attribution markers, not automated stamping of arbitrary new assets, SHA-256 file integrity, cryptographic signatures, proof of legal ownership, or trademark registration. Platform-wide publication adapters remain future implementation work.
