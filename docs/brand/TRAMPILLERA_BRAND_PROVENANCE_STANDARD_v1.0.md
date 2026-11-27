# TRAMPILLERA Brand & Provenance Standard v1.0

**Document ID:** TMP-BPS-STD-001  
**Status:** FOUNDATION / IMPLEMENTED VALIDATION BASELINE  
**Issued:** 2026-11-27  
**Applies to:** TRAMPILLERA platform, products, studios, worlds, media, documentation and downloadable assets.

## 1. Purpose

This standard establishes a consistent way to identify TRAMPILLERA-originated products and materials, preserve attribution, distinguish official releases from derivatives, and make provenance records inspectable.

It is an engineering and brand-governance standard. It does not replace trademark registration, copyright advice, contracts, or jurisdiction-specific legal review.

## 2. Brand hierarchy

Use the narrowest accurate identity:

1. **TRAMPILLERA** — ecosystem / umbrella brand.
2. **TRAMPILLERA [Studio / Desk / Division]** — operating or creative unit, where applicable.
3. **[Product / Project]** — named product, module, world, publication, or asset collection.
4. **Asset ID** — unique identifier for an individual published artifact.

For the current product:
- Umbrella: TRAMPILLERA
- Unit: TRAMPILLERA GAME STUDIO
- Area: WORLDS & PLAY
- Product: ORIGAMI MAPS PLANNER
- Pack: MARS FOUNDATION PACK

Do not imply that a partner, contributor, fork, or user-generated derivative is owned, endorsed, certified, or operated by TRAMPILLERA unless there is a documented authorization.

## 3. Asset identity

Every first-party published asset MUST have:
- a stable, unique asset ID;
- a human-readable title;
- a canonical repository or publication path;
- a media/type classification;
- a version;
- an issue or publication date;
- an origin/creator attribution appropriate to the asset;
- a rights/licensing status;
- a provenance record.

Recommended ID form:

`TMP-[DOMAIN]-[COLLECTION]-[TYPE]-[SEQUENCE]`

Examples:
- `TMP-GAME-OMP-MAP-0001`
- `TMP-MEDIA-LAM-REPORT-0001`
- `TMP-PLATFORM-DOC-ARCH-0001`

Existing ORIGAMI MAPS PLANNER IDs (`OMP-MARS-...`) remain valid as legacy product-scoped IDs. Do not silently rename previously published IDs; record aliases if a migration is approved.

IDs are immutable. A materially revised asset receives a new version; a new independent asset receives a new ID. Retired IDs are never reused.

## 4. Required marking by media type

| Media | Visible mark | Embedded / attached provenance |
|---|---|---|
| Web page / app | Brand identity in appropriate chrome/footer | Metadata, release/version and linked provenance record |
| SVG / vector art | Discreet brand + asset ID where practical | SVG metadata element with ID, title, version, date, source and rights |
| Raster image | Discreet visible mark when suitable | Sidecar manifest or embedded metadata where supported |
| PDF / printable sheet | Footer or margin mark + ID | PDF metadata and/or sidecar manifest |
| Markdown / text / report | Provenance footer or front matter | Asset ID, version, source, rights and attribution |
| Audio / video | Intro/outro or discreet watermark where appropriate | File metadata and sidecar manifest |
| 3D / CAD / GIS / BIM | Metadata layer/property or drawing title block | Sidecar manifest with source, version, units/CRS and asset ID |
| Software / source code | Repository copyright/license notices as applicable | Release manifest, repository commit/tag and license record |

Visible marks must not make an asset unusable, inaccessible, or needlessly obscure essential content. Use a discreet footer for print products and avoid covering map symbols, coordinate labels, safety information or artwork details.

## 5. Passive and active provenance

### 5.1 Passive provenance
- Visible brand/copyright/asset-ID marks.
- Embedded metadata where the file format supports it.
- Sidecar provenance manifests for formats with weak metadata support.
- Version, date, source path and rights statement.
- Preservation of notices in redistributed copies where legally applicable.

### 5.2 Active provenance
- A canonical registry of asset IDs and paths.
- A public or authenticated lookup page that resolves an ID to its registry entry.
- Release manifests with SHA-256 checksums.
- For stronger authenticity, a detached digital signature over the release manifest, with published public-key fingerprint and key-rotation/revocation procedure.

A registry lookup alone only proves that an identifier is listed in the registry. It does not prove that the presented file is unchanged or that the submitter is the rights holder.

A SHA-256 checksum detects byte-level changes only when compared against a trusted manifest. A checksum by itself is not a signature and does not prove who issued the manifest. A digital signature binds the manifest to a signing key; key custody and publication history still matter.

## 6. Registry contract

The registry MUST:
- use a versioned schema;
- reject duplicate IDs and duplicate canonical paths;
- record title, type, version, issued date and canonical path;
- distinguish first-party, commissioned, partner-provided, licensed third-party and user-generated material;
- record license/rights status and attribution;
- preserve retired entries rather than deleting history;
- never list secrets, private source files, personal data or restricted partner information.

Do not register third-party material as original TRAMPILLERA artwork. Record its actual source and license.

## 7. Publication workflow

A first-party asset release follows this sequence:

1. **Classify** — determine creator/origin, media type, product and rights status.
2. **Assign** — allocate an immutable asset ID and version.
3. **Mark** — apply appropriate visible and embedded/sidecar provenance.
4. **Register** — add the canonical path and metadata to the registry.
5. **Validate** — run schema, uniqueness, path-existence and marker checks.
6. **Hash** — generate SHA-256 checksums for release files.
7. **Sign** — sign the release manifest when an approved signing key and release procedure exist.
8. **Publish** — publish only after required checks pass and an authorized operator approves release.
9. **Preserve** — retain the manifest, commit/tag, and previous release records.

A failed validation blocks the release workflow. It does not automatically authorize deployment or merge.

## 8. Roles and permissions

- **Creator / contributor:** supplies source and accurate origin/licensing information.
- **Product owner:** approves product identity, asset classification and release inclusion.
- **Brand steward:** approves use of TRAMPILLERA marks and resolves attribution conflicts.
- **Release operator:** approves publication/deployment and protects signing credentials.
- **Automated validator:** checks structure and declared evidence; it does not decide legal ownership.

One person may hold multiple roles, but approvals and actions should remain traceable.

## 9. Derivatives, partners and user-generated content

- Mark first-party originals as TRAMPILLERA-originated only when supported by creation records.
- Preserve contributor attribution and third-party notices.
- Identify partner-provided and licensed content accurately.
- User-generated content remains attributed to its creator unless a separate agreement states otherwise.
- A derivative may reference the original asset ID but must receive its own derivative ID and clearly state its relationship.
- Do not use a TRAMPILLERA mark in a way that implies official status or endorsement without permission.

## 10. Legal and licensing boundary

The software license and brand identity are separate. The repository's MIT License governs code where applicable; it does not grant permission to use TRAMPILLERA names, logos, product marks or trade dress as another product's identity.

A copyright/provenance notice is not proof of ownership and does not create a registered trademark. Registration status, ownership, contributor agreements, and enforceability must be assessed separately in each jurisdiction. Keep `TRADEMARKS.md` as the governing brand-use notice.

## 11. Implementation status — 2026-11-27

**Implemented in the ORIGAMI MAPS PLANNER branch:**
- Brand and copyright notices on the product page.
- Visible marks and asset IDs on the Mars SVG assets.
- SVG metadata on the marked vector assets.
- Provenance footers on the Markdown pack files.
- Product-scoped registry JSON and ID lookup page.
- Architecture documentation of limitations.

**Not yet implemented platform-wide:**
- A universal registry covering every TRAMPILLERA product and media type.
- Automated asset stamping for every publication pipeline. The current implementation validates already-marked assets; it does not yet stamp arbitrary new uploads automatically.
- Versioned registry JSON Schema and a Node.js validator for schema version, required fields, unique IDs/paths, canonical path scope, source-file existence, asset-ID presence, TRAMPILLERA attribution, and SVG metadata presence.
- The validator is wired into `scripts/check.sh` and therefore into the repository verification workflow.
- SHA-256 release manifests and file verification endpoint.
- Digital signing, public-key publication, key rotation and revocation.
- QR label generation.
- PDF, raster, audio/video, CAD/BIM/GIS-specific stamping adapters.

The existence of this standard does not mean these capabilities are already active. Each capability must be implemented and verified before being marked operational.


## 12. CI evidence — 2026-11-27

GitHub Actions run #427 executed `npm --prefix app run check` and reported:

`TRAMPILLERA provenance validation passed: 12 registered assets, unique IDs and paths, source files and attribution markers verified.`

The overall workflow still concluded **failure** in the separate existing `scripts/unified-reality.test.mjs` test, whose CSS regular-expression assertion did not match the Unified Reality banner stylesheet. The provenance validator itself passed in that run. No claim is made that the full repository verification suite passed.
