# Service Identification and SOA Modeling for an Existing Application

## Meridian field report · Harborline Terminal Operating System

**Deliverable:** Service identification, service contracts, interaction architecture, and incremental realization proposal  
**Case status:** Fictional teaching case; all baseline details are illustrative assumptions  
**Method:** Triangulated service identification inspired by IBM SOMA

## Executive summary

Harborline is modeled as a 2009-era terminal operating system whose operational capabilities are split across Oracle Forms, PL/SQL, Java EE, IBM MQ, EDI handlers, and reporting code. The key design problem is not a lack of technology; it is unclear ownership. Yard position changes, partner messages, billing calculations, and vessel workflows cross module boundaries and share a database.

The proposed service model creates ten candidates and assesses each from three directions: the business domain, the existing assets, and the port’s stated goals. Nine candidates meet the defined two-of-three vote threshold. The separate weighted score helps prioritize investigation; it is not treated as proof that a boundary is correct. The model establishes single-writer ownership for business facts, service contracts for synchronous commands and queries, and events for cross-boundary state changes.

The recommended migration is incremental. Establish identity, notification, and partner-message seams first; then move container state behind a ledger; extract vessel and berth capabilities; deliver the gate-time outcome with one tariff source; and finally replace the work queue and equipment dispatch path. This avoids a big-bang rewrite and keeps a path open for the incumbent user interface during transition.

## 1. Scope and case boundary

This report answers four questions:

1. What business capabilities and legacy assets exist in the modeled application?
2. Which candidate services have defensible boundaries and data ownership?
3. How do the services communicate without sharing persistence?
4. In what order can the model be realized while operations continue?

Harborline is fictional. The 1.8-million-line estimate, technology vintage, module heat values, incident patterns, duplicated billing routines, and KPI targets are scenario assumptions for a realistic modeling exercise. No source repository, production database, stakeholder interview, incident log, or workload trace was supplied. Consequently, scores and votes express the model’s reasoning—not validated measurements or a production architecture recommendation.

## 2. As-found application

### Operating context

Harborline supports vessel calls, berth planning, truck gates, container movements, equipment dispatch, customs and partner exchange, billing, customer access, notifications, reporting, and access control. The modeled user groups are quay planners, gate clerks, customs brokers, and finance staff. The legacy interface is Oracle Forms; operational state and business rules are concentrated in Oracle stored procedures, with Java EE services, IBM MQ, Crystal Reports, and partner EDI around the database.

### Module atlas

| ID | Existing module | Main responsibility | Modeled heat |
|---|---|---|---:|
| VV | Vessel Visit | ETA, draft, line operator, visit lifecycle | 86 |
| BP | Berth Planning | Windows, crane splits, tidal constraints | 78 |
| GO | Gate Operations | Appointments, OCR, seal checks | 91 |
| YI | Yard Inventory | Slots, stacks, reefer plugs, holds | 94 |
| CM | Container Moves | Load, discharge, shift, restow | 88 |
| EQ | Equipment Dispatch | STS, RTG, truck pool, dual cycling | 72 |
| ED | EDI & Customs | Partner messages and hold-related exchange | 81 |
| BL | Billing & Tariffs | Wharfage, demurrage, storage | 69 |
| CP | Customer Portal | Read views for visits and invoices | 54 |
| NT | Notifications | Fax, SMS, and email delivery | 41 |
| RP | Reporting | Crystal Reports and ad-hoc SQL | 63 |
| AU | Access Control | LDAP and screen-level grants | 48 |

Heat is a fictional prioritization signal defined as change frequency × incident density. It is not a measured statistic. The assessment focuses on four end-to-end processes: admit a vessel, gate a truck, work a ship, and release cargo.

### Main architectural pain points

- Billing logic is copied into four places with inconsistent rounding.
- EDI parsing is embedded in yard inventory procedures, allowing integration code to mutate operational state.
- The nightly inventory freeze locks a broad Oracle schema.
- A berth change spans many screens and batch steps.
- Screen-level access grants do not express resource-level service authorization.

These are modeled observations that should be verified through code, database, and operations discovery in a real engagement.

## 3. Identification method and decision rule

The three meridians adapt SOMA’s top-down, bottom-up, and meet-in-the-middle identification:

| Meridian | Analysis | Evidence considered | Question |
|---|---|---|---|
| **Domain** | Top-down decomposition | Processes P1–P4 and concepts such as Visit, Berth, Box, Invoice | Is this a coherent business capability or data-owning concept? |
| **Assets** | Bottom-up existing-asset analysis | Modules VV–AU, stored procedures, message flows, copied logic, operational pain | Is there an existing capability or a concrete seam to isolate? |
| **Goals** | Meet-in-the-middle goal-service modeling | Goals G1–G4 below | Does a stated outcome justify this boundary or its extraction? |

Each service receives a yes/no vote from every meridian. A candidate is **promoted at two or more votes**. A candidate below that threshold remains on hold even if its numerical score is high.

For comparison, the model calculates:

`score = 0.45 × cohesion + 0.30 × (1 − coupling) + 0.15 × reuse + 0.10 × (votes ÷ 3)`

Cohesion, coupling, and reuse are normalized from 0 to 1. This is a prioritization heuristic, not a statistically calibrated quality measure. High cohesion and reuse increase the score; high coupling reduces it. Vote ratio contributes only ten percent.

### Modeled goals

| ID | Outcome |
|---|---|
| G1 | Reduce average truck turn time below 28 minutes. |
| G2 | Publish trustworthy vessel ETA updates to partners in under 30 seconds. |
| G3 | Invoice a vessel call from one source of tariff truth. |
| G4 | Replace the Oracle Forms experience incrementally, without a big-bang cutover. |

## 4. Proposed service catalog

| Service | Layer | Votes | Cohesion | Coupling | Score | Data owner |
|---|---|---:|---:|---:|---:|---|
| Tariff & Invoice | Entity | 3/3 | 0.93 | 0.18 | 88 | Finance |
| Vessel Call | Entity | 3/3 | 0.91 | 0.22 | 87 | Marine operations |
| Harbor Identity | Utility | 1/3 | 0.90 | 0.08 | 86 | Security |
| Signal | Utility | 2/3 | 0.81 | 0.12 | 84 | Platform |
| Container Ledger | Entity | 2/3 | 0.88 | 0.27 | 82 | Yard |
| Berth Window | Task | 3/3 | 0.86 | 0.31 | 79 | Planning |
| Quay Worklist | Process | 3/3 | 0.83 | 0.36 | 74 | Operations |
| Gate Passage | Process | 3/3 | 0.80 | 0.38 | 73 | Landside |
| Equipment Pool | Task | 2/3 | 0.79 | 0.29 | 73 | Assets |
| Partner Message | Utility | 2/3 | 0.74 | 0.41 | 68 | Integration |

The numerical ranking and promotion decision are distinct: Harbor Identity scores well on cohesion, low coupling, and reuse, but stays on hold because the modeled brief supplies only one meridian vote. Security remains mandatory as a cross-cutting constraint; the hold means the evidence does not justify this specific independently extracted service boundary yet.

### Service layers

- **Process:** Gate Passage and Quay Worklist coordinate multi-step outcomes.
- **Task:** Berth Window and Equipment Pool provide focused capabilities.
- **Entity:** Vessel Call, Container Ledger, and Tariff & Invoice own authoritative business state.
- **Utility:** Partner Message, Signal, and Harbor Identity provide shared integration or technical capabilities.

Layers express responsibility, not deployment topology. A service may be deployed independently only when operational, data, and team boundaries support it.

## 5. Boundaries and contracts

### Ownership rules

| Service | Owns | Explicitly does not own |
|---|---|---|
| Vessel Call | Visit, voyage, line operator, visit lifecycle | Berth allocation, container position, invoice settlement |
| Berth Window | Berth window, bollard allocation, crane split | Visit identity, yard position, invoice calculation |
| Container Ledger | Container identity, yard position, movement history, operational holds | EDI translation, customs authority decisions, tariff policy |
| Gate Passage | Appointment, passage decision, gate ticket | Container location, identity policy, tariff rules |
| Tariff & Invoice | Rate card, quote, invoice, settlement | Visit lifecycle, container movement, gate appointment |
| Partner Message | Partner mappings, message envelope, delivery status | Yard position, visit state, customs release decision |
| Signal | Subscription, delivery attempt, channel preference | Business decisions or transaction outcomes |
| Harbor Identity | Principal, role, resource scope | Business workflow or operational state |
| Quay Worklist | Worklist, move sequence, dispatch assignment | Container position, equipment telemetry, visit identity |
| Equipment Pool | Equipment capability, availability, assignment | Worklist sequence, container position, vessel visit |

The central invariant is **one authoritative writer per business fact**. A service may maintain a local read model, but it does not write another service’s authoritative state. The old Forms application may temporarily use projections or compatibility APIs during migration.

### Example interface contracts

```text
Vessel Call
  POST /calls
  in:  Nomination{voyage, vesselImo, eta, draft}
  out: Visit{id, state: NOMINATED}

Container Ledger
  GET  /boxes/{iso}
  out: Box{iso, location, holds, version}

  POST /boxes/{iso}/moves
  in:  Move{from, to, reason, idempotencyKey}
  out: MoveAccepted{moveId, version}
  event: MovePosted

Gate Passage
  POST /slots
  POST /passages
  in:  PassageRequest{appointmentId, plate, boxIso, actor}
  out: PassageDecision{ticketId, outcome, checkedAt}

Tariff & Invoice
  POST /quotes
  POST /invoices
  out: Invoice{id, amount, currency, tariffVersion}
```

These are illustrative contract shapes, not a complete OpenAPI definition. Production contracts still need authentication scopes, error schemas, versioning policy, pagination, rate limits, timeouts, idempotency guarantees, and compatibility tests.

### Consistency and failure policy

- Container movements are append-only and authoritative in Container Ledger. `MovePosted` lets consumers update their projections.
- Passage and invoice commands accept idempotency keys to make safe retries possible.
- Gate Passage may call synchronous checks for immediate admission decisions; notification delivery is asynchronous and does not determine transaction success.
- Partner Message deduplicates inbound messages and routes untranslatable messages to a replayable exception path.
- Invoice corrections use adjustments or credit documents rather than mutating an issued invoice.
- Services enforce authorization at their own boundary. A valid identity token does not replace resource-level policy checks.

These are target-state rules; the report does not claim that Harborline currently satisfies them.

## 6. Runtime interaction model

The main synchronous and event-driven relationships are:

| Caller / producer | Consumer | Contract intent |
|---|---|---|
| Gate Passage | Harbor Identity | Validate actor and resource scope. |
| Gate Passage | Container Ledger | Check box identity/holds and request an authoritative move. |
| Gate Passage | Tariff & Invoice | Check charge status when cargo-release policy requires payment clearance. |
| Gate Passage | Signal | Publish passage outcomes for asynchronous delivery. |
| Quay Worklist | Vessel Call | Read the visit lifecycle and work window. |
| Quay Worklist | Container Ledger | Request moves and consume authoritative move outcomes. |
| Quay Worklist | Equipment Pool | Request an equipment assignment. |
| Berth Window | Vessel Call | Allocate a visit and publish the confirmed plan. |
| Partner Message | Vessel Call / Container Ledger | Translate partner messages into validated domain commands. |
| Tariff & Invoice | Vessel Call | Price against a versioned visit snapshot. |
| Worklist / Tariff / Gate | Signal | Publish business events for subscribed operators or partners. |

An arrow in the interactive diagram represents a runtime conversation, not a foreign key or shared table. The precise protocol can be chosen per interaction: query/command APIs where an immediate response is needed; events where consumers can react asynchronously.

### Example choreography: admit a truck

| Step | Service interaction | Contract / result |
|---|---|---|
| Book slot | Gate Passage | `POST /slots`; return an idempotent appointment reference. |
| OCR plate | Gate Passage | Match the plate to the appointment; send ambiguous matches to review. |
| Match booking | Harbor Identity + Container Ledger | Authorize the clerk; validate box identity and active holds. |
| Issue ticket | Gate Passage | Persist the admission decision and return a passage ticket. |
| Yard in | Container Ledger → Signal | Append the move, publish `MovePosted`, and notify subscribers asynchronously. |

The Gate Passage orchestration owns the process outcome. Container Ledger owns the position change. Signal owns delivery attempts. This division makes it possible to measure G1 without making the gate service a second yard database.

## 7. Incremental realization plan

| Wave | Extraction | Exit condition |
|---|---|---|
| **Tide 0 — establish seams** | Harbor Identity, Signal, Partner Message adapters | New paths authenticate independently; inbound partner messages are normalized and replayable; no adapter writes yard tables. |
| **Tide 1 — own container truth** | Container Ledger; make Forms a client/projection consumer | All new movement writes go through the ledger; reconciliation shows no dual writers; nightly freeze can be narrowed. |
| **Tide 2 — separate marine planning** | Vessel Call and Berth Window | Visit lifecycle has one owner; berth allocation is versioned and confirmed through contracts. |
| **Tide 3 — deliver gate outcome** | Gate Passage and Tariff & Invoice | Appointment-to-passage is observable; billing copies are retired behind one tariff policy; G1 can be measured end-to-end. |
| **Tide 4 — extract quay work** | Quay Worklist and Equipment Pool | Work dispatch consumes service contracts/events; legacy MQ batch freeze is retired only after operational parity is demonstrated. |

Before retiring a legacy path, run old and new behavior in shadow or reconciliation mode, compare business outcomes, establish rollback, and verify data ownership. A strangler route should move one capability at a time; it must not become a permanent dual-write arrangement.

## 8. Risks, assumptions, and discovery needed

| Risk or unknown | Why it matters | Discovery / mitigation |
|---|---|---|
| Actual schema and stored-procedure coupling is unknown | Boundaries may cut through shared invariants | Inventory write paths, triggers, batch jobs, and transaction scope before extraction. |
| Module heat and incident rates are assumed | Prioritization could be misleading | Calculate change frequency and incident density from version control and incident records. |
| Billing variants may encode legitimate contract differences | Naively collapsing four routines could change charges | Compare tariff rules and invoices by customer, contract, currency, and effective date before consolidating. |
| Partner EDI semantics and delivery guarantees are unknown | Replays or duplicates could cause repeated moves | Capture message samples, sequence behavior, identifiers, acknowledgements, and exception volumes. |
| Container identity / movement volume is unknown | Event history and read-model design depend on scale | Measure peak rates, history retention, correction patterns, and query latency requirements. |
| The 28-minute and 30-second targets are illustrative | SLO design needs a real baseline and measurement definition | Agree on clock boundaries, percentile, exclusions, sampling, and current baseline with process owners. |
| Organizational ownership is assumed | A service without a durable owner becomes another shared module | Confirm teams, on-call responsibility, and domain decision rights before service deployment. |
| Access control migration may widen privilege | A new identity layer alone does not ensure authorization | Map roles to resource scopes and test service-level authorization with least privilege. |

## 9. Validation and acceptance checklist

Before treating the model as implementation-ready:

- Confirm module responsibilities against source code, database objects, and runtime traces.
- Validate the four processes and stated outcomes with operations, finance, marine planning, and partner stakeholders.
- Replace every illustrative metric and evidence vote with traceable production evidence.
- Map every critical business fact to exactly one authoritative writer.
- Review every contract for idempotency, versioning, errors, authentication, authorization, timeout, and retry semantics.
- Demonstrate the truck-gate flow with duplicate requests, stale box data, active holds, unavailable tariff checks, and notification failure.
- Reconcile invoice results against existing billing behavior before retiring any copied rule.
- Agree on migration rollback, data reconciliation, operational dashboards, and service ownership.

The interactive project includes automated checks for the model’s internal consistency, score formula, vote threshold, traceability, relationships, and navigation. These checks do not substitute for the production discovery and stakeholder validation above.

## 10. References and conceptual anchors

- Ali Arsanjani, “Service-oriented modeling and architecture,” IBM developerWorks, 2004. The project adapts the top-down, bottom-up, and meet-in-the-middle identification framing associated with SOMA.
- Thomas Erl, *Service-Oriented Architecture: Concepts, Technology, and Design*, Prentice Hall, 2005. Reference for service inventory, boundaries, and composition concepts.
- Michael T. Nygard, *Release It!*, Pragmatic Bookshelf, 2007. Background for operational resilience concerns such as timeout and failure isolation.

The particular vote threshold, metric weights, Harborline facts, catalog, contracts, and migration waves are this project’s explicit modeling choices—not prescribed results from these references.
