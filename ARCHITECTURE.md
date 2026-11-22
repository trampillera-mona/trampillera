# Architecture

```text
Browser
  |-- GET / ----------------------> Preserved TRAMPILLERA platform UI
  |-- GET /control/ --------------> Connected Control Plane UI
  |-- /api/platform/* ------------> Public platform status and module read API
  `-- /api/control/* -------------> Authenticated management API
                                      |
                                      v
                                  Node.js service
                                      |
                                      v
                                  PostgreSQL
                                  - platform_modules
                                  - platform_connectors
                                  - model_providers
                                  - audit_events
```

## Data ownership

The platform and Control Plane are separate interfaces over one application and one database. The Control Plane does not replace the platform interface. Registry state and lifecycle changes are persisted in PostgreSQL and audit events are written for management actions.

## Deliberate integration boundaries

- The original full platform HTML is preserved in `originals/`; the served copy changes only the administrator shortcut target and adds a Control Plane shortcut.
- The original Control Plane HTML is preserved in `originals/`; the served copy adds a login gate and API adapter.
- AI calls are optional and use a server-side provider key.
- Connector validation is configuration validation, not a live remote health check.
- The original platform's browser-local features remain browser-local unless their own feature explicitly calls the shared API.
