# TRAMPILLERA WORLDS & PLAY — Product Architecture Specification v0.1

**Document ID:** TMP-WP-ARCH-001  
**Status:** Concept baseline / product architecture proposal  
**Version:** 0.1  
**Date:** 2026-11-27  
**Owner:** TRAMPILLERA

---

## 1. Purpose

WORLDS & PLAY is a product ecosystem for constructing, representing, producing, playing, and exploring multilayer worlds. It combines physical-first tabletop materials with an optional digital companion and a structured world model.

It is not limited to board games or map generation. Its purpose is to provide a reusable toolkit for world building and tabletop simulation across fictional, historical, educational, exploratory, and planning-oriented scenarios.

## 2. Brand and product hierarchy

- **TRAMPILLERA** — parent brand and ecosystem.
- **TRAMPILLERA GAME STUDIO** — intellectual and product development: worlds, maps, rules, scenarios, mechanics, and authored content.
- **TRAMPILLERA WORLD WORKSHOP** — physical prototyping and production: printing, fabrication, assembly, material testing, and quality control.
- **WORLDS & PLAY** — product ecosystem combining physical and digital world-building, simulation, and play.
- **ORIGAMI MAPS PLANNER** — the first product/tool within WORLDS & PLAY.

GAME STUDIO and WORLD WORKSHOP are sibling operating units under TRAMPILLERA. WORLDS & PLAY is the product ecosystem they jointly support; it is not a manufacturing department.

**Positioning:** Physical-First Multilayer World Building & Tabletop Simulation Platform

**Slogan:** Build worlds. Layer realities. Play possibilities. Explore future.

## 3. Product principles

1. **Physical-first, not physical-only.** A physical kit must be usable without a phone, account, network connection, or digital service.
2. **One world, multiple representations.** Physical pieces, logical data, and digital views represent the same conceptual world.
3. **Layer independence with semantic relationships.** Layers can be viewed and manipulated separately while remaining linked through shared entities, rules, and events.
4. **Transparent rules and traceable changes.** Players should be able to understand why a state changed and which action or rule caused it.
5. **Creator extensibility.** New worlds, layers, symbols, scenarios, and rules should be addable without redesigning the entire platform.
6. **Honest simulation boundaries.** Fictional and illustrative values must be identified as such. A tabletop result is not a verified real-world outcome.

## 4. Three representation domains

### 4.1 Physical World

Printed base maps, transparent or separately printed overlays, cards, tokens, wooden counters, tables, notebooks, player sheets, and other tangible components.

Physical mode is the standalone baseline. A group can play and maintain its world state using printed materials and agreed rules.

### 4.2 Logical World

The structured model behind the physical and digital representations:

- World
- Territory
- Layer
- Object
- Resource
- Actor
- Rule
- Action
- Event
- State
- Turn
- Scenario

A physical token and a digital record may be two representations of the same logical entity.

### 4.3 Digital World

An optional companion for world editing, structured state management, visualization, scenario authoring, collaboration, history, and assisted calculations.

The digital companion extends the physical kit; it must not be a prerequisite for basic play.

## 5. Multilayer world model

The initial Mars Starter Pack illustrates six layers:

1. Terrain
2. Infrastructure
3. Resources
4. Operations
5. Environment
6. Scenario / Time

These are an initial content set, not a fixed limit. Future worlds may add geography, economy, population, logistics, ownership, politics, ecology, or other domain-specific layers.

A layer is a view or domain of world information. Cross-layer effects are expressed through shared entities, rules, and events. For example, constructing a settlement may affect infrastructure, resource balances, operations, and the scenario timeline.

## 6. World state and event stream

The platform concept distinguishes:

- **World State** — the current accepted configuration of the world.
- **Event** — a recorded action or occurrence that may change the world.
- **Event Stream** — the ordered sequence of recorded events.
- **State Management** — the rules for applying events and deriving the current state.
- **Physical Interface** — map edits, placed pieces, cards, ledgers, and player actions.
- **Digital Interface** — editor actions, structured records, and digital updates.
- **Hybrid Mode** — a future workflow in which physical and digital records can be reconciled.

Physical play can be understood as a physical event stream: players make moves, place or remove markers, update tables, and record consequences. This is an architectural analogy and design direction, not a claim that a synchronized streaming protocol currently exists.

A future shared event format should define event identity, actor, turn/time, affected entities/layers, action, rule reference, before/after values where applicable, and provenance.

## 7. Tabletop simulation cycle

A typical turn follows this loop:

1. Observe the current world state.
2. Select an action.
3. Execute the action using physical components.
4. Apply the relevant rules and calculate consequences.
5. Record the event and update affected layers, tables, and ledgers.
6. Begin the next turn.

Rules should specify prerequisites, costs, constraints, effects, and failure conditions. Where calculations are not yet formalized, the kit must label them as facilitator decisions or illustrative procedures rather than deterministic engine behavior.

## 8. Game and experience modes

Potential modes include:

- Solo
- Cooperative
- Competitive
- Asymmetric roles and information
- Open World
- Scenario Campaign

Potential application areas include entertainment, education, historical reconstruction, science and exploration scenarios, territorial-planning education, logistics/resource-system exercises, and crisis-preparedness training. Professional or operational use requires domain validation and must not treat game outputs as authoritative real-world instructions.

## 9. ORIGAMI MAPS PLANNER

ORIGAMI MAPS PLANNER is the first product in the ecosystem. Its initial purpose is to compose, inspect, print, and combine map layers for physical tabletop use.

The current Mars example is fictional tabletop content. The existing browser preview uses illustrative SVG layers and print functionality; it is not an editable GIS, synchronized multiplayer system, or validated physical manufacturing workflow.

Physical printer registration, overlay alignment, folding durability, material selection, and repeated-play usability require prototype testing.

## 10. World Workshop production model

TRAMPILLERA WORLD WORKSHOP is the proposed physical prototyping and production function. Potential work areas:

- Cartography and printing
- Physical fabrication of counters, tokens, and organizers
- Textile accessories and packaging
- Assembly and quality control
- Prototype playtesting and simulation lab

Production may be performed internally, by contractors, or through manufacturing partners. No particular partner's equipment, capacity, availability, or participation is assumed by this specification.

For any manufacturing pilot, scope, materials, tolerances, costs, acceptance criteria, confidentiality, IP ownership, and permitted use of production files must be agreed in writing.

## 11. Creator and product ecosystem

Potential future components:

- Starter Packs and themed worlds
- Premium maps and scenarios
- World and scenario editor
- Creator submissions and marketplace
- Educational and institutional licenses
- Custom world production
- Physical kits and accessories

These are roadmap options, not currently available services or revenue streams.

## 12. Relationship to other TRAMPILLERA technologies

Future interoperability may connect WORLDS & PLAY with spatial and simulation systems such as SDT5D+ and visualization/execution components such as ArtMer Engine. Such integration would require explicit schemas, interfaces, permissions, provenance, and verification rules.

No integration is claimed as implemented by this document. Simulated states must remain distinguishable from observed or verified real-world data.

## 13. IP, provenance, and release integrity

TRAMPILLERA brand identity, authored worlds, original maps, rules, source files, and product materials should be tracked through the project's provenance and licensing procedures.

Visible watermarks and asset identifiers support attribution and provenance. They are not DRM and do not prevent copying. Registry validation demonstrates internal consistency only. Cryptographic integrity and signature verification must not be claimed until keys are provisioned, release manifests are generated, and verification is successfully tested.

Third-party and partner materials remain subject to their own rights and licenses. Ownership and licensing must be stated in written agreements.

## 14. Development stages

**Stage 0 — Foundation:** Brand hierarchy, product page, initial Mars layer pack, asset IDs, provenance registry, and basic print workflow.

**Stage 1 — Physical prototype:** Print and assemble the Mars kit; test registration, folding, durability, usability, and component inventory.

**Stage 2 — Rules prototype:** Define a compact ruleset, turns, resources, events, and repeatable calculations; conduct documented playtests.

**Stage 3 — Logical model:** Define versioned schemas for worlds, layers, entities, rules, actions, events, and state snapshots.

**Stage 4 — Digital companion:** Add optional authoring, state ledger, history, and visualization against the logical model.

**Stage 5 — Hybrid workflows:** Test physical/digital reconciliation and event exchange with explicit conflict handling and provenance.

## 15. Current implementation boundary

As of this specification:

- A WORLDS & PLAY page and ORIGAMI MAPS PLANNER foundation exist in the feature branch.
- The Mars starter materials and six illustrative layer overlays exist.
- The provenance registry and validation workflow exist.
- The page has authored EN and RU dictionaries; other listed locales currently fall back to English.
- The preview is not a GIS editor or multiplayer simulation engine.
- Physical manufacturing and playability have not yet been validated.
- Digital/physical synchronization is a future architecture direction.

This document records product intent and architecture direction. It does not certify unimplemented features, physical test results, legal ownership, trademark registration, or real-world simulation accuracy.

---

**TRAMPILLERA · WORLDS & PLAY**  
**TMP-WP-ARCH-001 · v0.1 · 2026-11-27**  
Build worlds. Layer realities. Play possibilities. Explore future.
