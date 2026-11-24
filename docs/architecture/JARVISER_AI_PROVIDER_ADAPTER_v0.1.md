# JARVISER AI Provider Adapter Contract v0.1

**Status:** Implemented baseline / limited adapter set  
**Date:** 2026-11-24  
**Default provider:** Qwen Model Studio

## 1. Purpose

Provide one server-side application boundary for AI inference so the Control Plane and future JARVISER workflows do not depend on vendor-specific request code or browser-held credentials.

## 2. Supported adapters

| Provider key | Default model | Protocol | Endpoint configuration |
|---|---|---|---|
| `qwen` | `qwen4-max` | OpenAI-compatible Chat Completions | `QWEN_API_URL` must be the workspace-specific Model Studio endpoint ending in `/compatible-mode/v1/chat/completions` |
| `openai` | `gpt-4.1-mini` | Responses or Chat Completions | `OPENAI_API_URL`; defaults to `https://api.openai.com/v1/responses` |

Qwen is selected when `AI_PROVIDER` is absent. OpenAI is an explicit alternative selected with `AI_PROVIDER=openai`. The server does not silently fail over between providers.

## 3. Environment contract

Qwen:
- `AI_PROVIDER=qwen`
- `QWEN_API_KEY`
- `QWEN_API_URL`
- `QWEN_MODEL` (optional; defaults to `qwen4-max`)

OpenAI:
- `AI_PROVIDER=openai`
- `OPENAI_API_KEY`
- `OPENAI_API_URL` (optional)
- `OPENAI_MODEL` (optional)

Credentials are read only by the server. Never put provider keys in HTML, browser storage, URL parameters, or client-side JavaScript.

## 4. Request and response boundary

Current endpoint: `POST /api/control/ai/chat`

Input:
- `message`: required text, maximum 4,000 characters.

Normalized response:
- `reply`
- `provider`
- `model`

The current endpoint is a single-turn request/response interface. It does not persist conversation history, stream tokens, execute tools, run multi-agent workflows, or record a durable cost ledger.

## 5. Security and operational controls

- Provider calls are server-side HTTPS requests.
- Qwen endpoint validation accepts documented workspace-specific Model Studio domains and compatible legacy DashScope domains only.
- OpenAI endpoint validation requires HTTPS and an allowed API path.
- Provider requests time out after 30 seconds.
- AI chat has a dedicated in-process limit of 12 requests per minute, in addition to the general API limit.
- Prompt and completion text are not written to the audit log.
- Audit events record provider, model, outcome, provider HTTP status or normalized failure category, and token counts when returned by the provider.
- Missing credentials or endpoint configuration returns HTTP 503.
- Provider/network failures return HTTP 502; request timeout returns HTTP 504.
- The model registry is a catalogue; a row does not prove a provider is configured or reachable.
- A configured endpoint is not a health check. Live provider health remains UNKNOWN until a real request succeeds and is separately evidenced.

## 6. Extension contract

A future adapter must define:
- stable `provider_key`;
- server-side credential source;
- endpoint validation policy;
- request serialization;
- response normalization;
- timeout and error mapping;
- capability declaration;
- usage extraction where available;
- tests for missing configuration, valid response, provider error and timeout.

The provider registry must not be treated as an executable plugin loader until these contracts and authorization boundaries exist.

## 7. Official Qwen API reference

Alibaba Cloud Model Studio documents the OpenAI-compatible Chat Completions protocol and workspace-specific regional endpoints:
- https://www.alibabacloud.com/help/en/model-studio/qwen-api-via-openai-chat-completions

The actual workspace ID and API key must be obtained from the operator's Model Studio account. They are intentionally not guessed or embedded in this repository.
