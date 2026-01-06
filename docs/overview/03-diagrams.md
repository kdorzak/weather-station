# Diagrams

## Purpose

This document presents a set of diagrams illustrating the architecture and workflows of the WeatherA Station system. The diagrams focus on high-level concepts and interactions, deliberately avoiding vendor-specific implementations and detailed code-level information to maintain clarity and adaptability.

## Table of Contents

- [System Context](#system-context)  
- [Containers / Components](#containers--components)  
- [Sync Ingest Sequence](#sync-ingest-sequence)  
- [Read Flow Sequence](#read-flow-sequence)  
- [Offline / Retry Behavior](#offline--retry-behavior)  
- [Aggregation Overview](#aggregation-overview)  
- [Domain Model](#domain-model)  
- [Security Boundaries](#security-boundaries)  
- [Conventions](#conventions)  

---

## System Context

```mermaid
flowchart TD
    Device[Device]
    API[API Server]
    Database[(Database)]
    Dashboard[Dashboard]

    Device -->|Sends events| API
    API -->|Stores data| Database
    Dashboard -->|Queries data| API
```

---

## Containers / Components

```mermaid
flowchart TD
    Device[Device]
    API[API Server]
    DB[(Database)]
    Aggregation[Aggregation Service]
    Dashboard[Dashboard]

    Device -->|Event Data| API
    API -->|Persist| DB
    Aggregation -->|Read Raw Data| DB
    Aggregation -->|Write Aggregates| DB
    Dashboard -->|Query Data| API
```

---

## Sync Ingest Sequence

```mermaid
sequenceDiagram
    participant Device
    participant API
    participant Database

    Device->>Device: Generate event_id
    Device->>API: Send event with event_id
    API->>API: Validate and deduplicate event
    API->>Database: Store event
    API-->>Device: Acknowledge receipt
    Device->>Device: Retry using local buffer if no ack
```

---

## Read Flow Sequence

```mermaid
sequenceDiagram
    participant Dashboard
    participant API
    participant Database

    Dashboard->>API: Query latest or range data
    API->>Database: Retrieve data
    Database-->>API: Return data
    API-->>Dashboard: Provide data
```

---

## Offline / Retry Behavior

```mermaid
stateDiagram-v2
    [*] --> Online
    Online --> Offline: Connection lost
    Offline --> Online: Connection restored

    state Offline {
        LocalBuffer: Store events locally
        OptionalExternalStorage: Optional backup

        [*] --> LocalBuffer
        LocalBuffer --> OptionalExternalStorage: Backup (optional)
        LocalBuffer --> Online: Retry sending events
    }
```

---

## Aggregation Overview

```mermaid
flowchart TD
    RawData[(Raw Data)]
    AggregationJob[Scheduled Aggregation Job]
    Aggregates[(Aggregates)]
    Dashboard[Dashboard]

    RawData --> AggregationJob
    AggregationJob --> Aggregates
    Dashboard -->|Query aggregates| Aggregates
```

---

## Domain Model

```mermaid
classDiagram
    class Device {
        +device_id
        +metadata
    }
    class Event {
        +event_id
        +timestamp
        +data
    }
    class Aggregate {
        +aggregate_id
        +period
        +summary_data
    }
    class User {
        +user_id
        +credentials
    }
    class ShareLink {
        +link_id
        +permissions
    }

    Device "1" -- "0..*" Event : generates
    Event "0..*" -- "0..1" Aggregate : summarized_in
    User "1" -- "0..*" ShareLink : creates
```

---

## Security Boundaries

```mermaid
flowchart TD
    Device[Device]
    API[API Server]
    Backend[Backend + Database]
    ShareLinks[Read-Only Share Links (Future)]

    Device -.->|Untrusted boundary| API
    API -->|Trusted boundary| Backend
    ShareLinks -.-> Backend
```

---

## Conventions

- **Naming:** Entities and components are named to reflect their roles clearly and consistently across diagrams.  
- **Updates:** Diagrams are maintained to reflect current architecture decisions and planned future enhancements, avoiding implementation specifics.  
- **Abstraction:** Details such as specific technologies, timings, and vendor names are intentionally omitted to preserve vendor neutrality and focus on conceptual clarity.
