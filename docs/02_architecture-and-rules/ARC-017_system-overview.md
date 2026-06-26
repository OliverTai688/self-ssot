# System Overview

Personal OS is a Next.js 16 App Router application moving from high-fidelity prototype to DB-backed operational system.

## Core Layers

| Layer | Current state |
|---|---|
| App shell | Dashboard layout with sidebar, app header, AI panel providers. |
| Work | DB-read routes exist; write interactions still partly local state. |
| Research | Rich network-style UI exists; data mostly localStorage/mock. |
| Ingestion | Mock source connections, raw items, normalized content, evidence, proposals. |
| Workflow | UI and local engine exist; rules/messages are mock. |
| Life | Fitness/life dashboard exists; data is mock/local state. |
| Client Portal | UI exists; still needs DB-backed token lookup and visibility filtering. |
| Agent Team OS | Governance docs and skills first; runtime UI later. |

## Data Direction

v0.1 should make Work the first reliable DB-backed loop. Other modules should retain prototype behavior until their data contract is explicit.

## Governance Direction

Agent Team OS governs agents, skills, instruction sets, boundaries, approvals, and auditability. It does not replace Workflow.
