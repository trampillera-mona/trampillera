# TRAMPILLERA Architecture & Engineering Documentation

This directory is the canonical documentation index for the TRAMPILLERA repository.

## Current release and recovery

- [Release baseline, recovery point and deployment readiness — 2026-11-25](audit/TRAMPILLERA_RELEASE_BASELINE_AND_RECOVERY_2026-11-25.md)
- [Platform system audit — 2026-11-24](audit/TRAMPILLERA_PLATFORM_SYSTEM_AUDIT_2026-11-24.md)
- [Identity & organization baseline audit — 2026-11-25](audit/TRAMPILLERA_IDENTITY_AND_ORGANIZATION_BASELINE_AUDIT_2026-11-25.md)

## Brand governance & provenance

- [TRAMPILLERA Brand & Provenance Standard v1.0](../brand/TRAMPILLERA_BRAND_PROVENANCE_STANDARD_v1.0.md)
- [Provenance registry schema v1.1](../../schemas/provenance-registry-v1.1.schema.json)

## Platform architecture

- [Unified Platform Architecture Specification v1.0](TRAMPILLERA_MEDIA_UNIFIED_PLATFORM_ARCHITECTURE_SPEC_v1.0.md)
- [Federated Architecture Recovery & Conformance Specification v1.0](TRAMPILLERA_FEDERATED_ARCHITECTURE_RECOVERY_v1.0.md)
- [Module Inventory and Capability Map v1.0](TRAMPILLERA_MEDIA_MODULE_INVENTORY_v1.0.md)
- [Independent Technology & Research Portfolio — 2026-11-25](TRAMPILLERA_ECOSYSTEM_PORTFOLIO_2026-11-25.md)
- [ORIGAMI MAPS PLANNER — Product & Architecture Foundation v0.1](ORIGAMI_MAPS_PLANNER_FOUNDATION_v0.1.md)

## AI and language

- [JARVISER AI Provider Adapter Contract v0.1](JARVISER_AI_PROVIDER_ADAPTER_v0.1.md)
- [Language & Voice Implementation Audit v1.0](i18n-voice/TRAMPILLERA_LANGUAGE_VOICE_IMPLEMENTATION_AUDIT_v1.0.md)

## Domain architecture

- [Identity & Duties Foundation Specification v0.1](identity/TRAMPILLERA_IDENTITY_AND_DUTIES_FOUNDATION_v0.1.md)
- [PostgreSQL Migration Foundation v0.1](identity/POSTGRES_MIGRATION_FOUNDATION_v0.1.md)
- [Audience Intelligence & Growth Module v1.0](analytics-growth/TRAMPILLERA_AUDIENCE_INTELLIGENCE_GROWTH_v1.0.md)

## Documentation rules

1. Update the relevant architecture specification, module inventory, and audit record in the same change set when implementation changes a module contract or capability status.
2. Preserve historical baselines; append dated implementation deltas rather than silently rewriting old audit conclusions.
3. Mark capabilities REAL, PARTIAL, DEMO, NOT IMPLEMENTED, or UNKNOWN based on source and runtime evidence.
4. Separate source/CI evidence from live production verification.
5. Record architecture changes with rationale, ownership, dependencies, migration notes, tests, and rollback path.
6. Do not commit secrets, credentials, private partner data, or personal account information.
7. Production deployment remains an explicit operator decision.
