# TRAMPILLERA Scene Studio — Implementation Boundary v0.1

## Purpose

Provide a visible, usable spatial workspace inside the TRAMPILLERA Control Plane, aligned with the SDT5D / ArtMer / Multiverse Studio visual architecture.

- **SDT5D+** owns territorial understanding, spatial data integration and scenario semantics.
- **ArtMer Engine** owns visualization and interaction of supported spatial models.
- **Scene Studio** is the operator-facing workspace for objects, layers, properties and time.

## Implemented in this prototype

- A persistent top-level quick-access strip for Operations Desk, TRAMPILLERA Comms and Scene Studio.
- Scene Studio route in the authenticated Control Plane.
- Interactive 2D plan and schematic 3D viewport rendered with browser Canvas 2D.
- Selectable sample buildings, road, landscape zone and infrastructure node.
- Object tree and layer visibility toggles.
- Properties inspector with editable object names.
- Scenario timeline cursor (2024–2035).
- Browser-local draft save and JSON export.
- Explicit labels distinguishing interactive local demo data from live GIS/BIM data.

## Reused visual and product direction

The interface follows the established dark engineering / digital-twin language: graphite panels, cyan and turquoise spatial accents, amber transport / control markers, monospaced technical labels, viewport HUD, object tree, inspector and timeline. It borrows the previously developed ArtMer / SDT5D scene-workspace pattern and the Moscow 2035 / airport digital-twin composition (central scene, layers, inspector, timeline, tactical HUD).

## Explicit non-claims

The prototype does **not** currently provide:

- Georeferenced coordinates, CRS handling or surveyed geometry.
- Live basemaps, terrain, 3D Tiles, CesiumJS or production WebGL rendering.
- GIS/BIM/IFC/GeoJSON/3D Tiles import pipelines.
- Server-side scene persistence, versioning or multi-user collaboration.
- Live telemetry, simulation execution or 4D/5D analytical results.
- Production asset library, validation workflow or publish/rollback lifecycle.

Sample object dimensions and areas are illustrative values, not measurements. Local save is browser storage only. JSON export is a local draft artifact and does not imply server acceptance.

## Next engineering stages

1. Define versioned scene/object/layer schemas and coordinate reference contracts.
2. Add server-side draft persistence, ownership, audit and version history.
3. Add import adapters for GeoJSON and glTF; validate provenance and CRS.
4. Introduce a renderer adapter: CesiumJS for geospatial terrain / 3D Tiles and Three.js for interactive object scenes.
5. Add validation, permissions, review and publish/rollback transitions under AWAS.
6. Add collaboration and temporal / analytical overlays only after their data contracts exist.

## Verification semantics

- UI route and controls: implementation claim, subject to runtime smoke testing.
- Browser-local draft and JSON export: implemented in the client; runtime behavior must be tested in the deployed browser.
- Server persistence, geospatial accuracy, import, collaboration and simulation: NOT IMPLEMENTED.
- Production readiness and security review: UNKNOWN until independently evidenced.

