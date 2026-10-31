window.MERIDIAN = {
  app: {
    name: "Harborline TOS",
    vintage: 2009,
    stack: "Java EE 6 · Oracle Forms · PL/SQL · IBM MQ · Crystal Reports",
    loc: "1.8M",
    users: "Quay planners, gate clerks, customs brokers, finance",
    pains: [
      "A berth change requires 11 screen hops and two batch jobs.",
      "Billing logic is copied into four modules with different rounding.",
      "EDI messages are parsed inside the yard inventory stored procedures.",
      "Nightly inventory freeze locks the entire Oracle schema."
    ]
  },
  modules: [
    { id: "VV", name: "Vessel Visit", heat: 86, note: "ETA, draft, line operator, visit state machine" },
    { id: "BP", name: "Berth Planning", heat: 78, note: "Windows, crane splits, tidal constraints" },
    { id: "GO", name: "Gate Operations", heat: 91, note: "Truck appointments, OCR, seal checks" },
    { id: "YI", name: "Yard Inventory", heat: 94, note: "Slots, stacks, reefer plugs, holds" },
    { id: "CM", name: "Container Moves", heat: 88, note: "Load, discharge, shift, restow" },
    { id: "EQ", name: "Equipment Dispatch", heat: 72, note: "STS, RTG, truck pool, dual cycling" },
    { id: "ED", name: "EDI & Customs", heat: 81, note: "COPARNL, CODECO, IFTMCS, holds" },
    { id: "BL", name: "Billing & Tariffs", heat: 69, note: "Wharfage, demurrage, storage" },
    { id: "CP", name: "Customer Portal", heat: 54, note: "Read replicas of visit and invoice" },
    { id: "NT", name: "Notifications", heat: 41, note: "Fax leftover, SMS, email" },
    { id: "RP", name: "Reporting", heat: 63, note: "Crystal + ad-hoc SQL" },
    { id: "AU", name: "Access Control", heat: 48, note: "LDAP + table of screen grants" }
  ],
  processes: [
    { id: "P1", name: "Admit a vessel", steps: ["Nominate visit", "Assign berth", "Confirm line-up", "Open discharge"] },
    { id: "P2", name: "Gate a truck", steps: ["Book slot", "OCR plate", "Match booking", "Issue ticket", "Yard in"] },
    { id: "P3", name: "Work a ship", steps: ["Build work queue", "Assign crane", "Move box", "Update bayplan", "Close hatch"] },
    { id: "P4", name: "Release cargo", steps: ["Customs hold?", "Pay invoice", "Pin pickup", "Gate out"] }
  ],
  goals: [
    { id: "G1", name: "Cut average truck turn time below 28 minutes" },
    { id: "G2", name: "Publish a trustworthy vessel ETA to partners in under 30 seconds" },
    { id: "G3", name: "Invoice a vessel call with one source of tariff truth" },
    { id: "G4", name: "Strangle the Oracle Forms UI without a big-bang cutover" }
  ],
  services: [
    {
      id: "vessel",
      name: "Vessel Call",
      layer: "entity",
      votes: { top: true, bottom: true, goal: true },
      cohesion: 0.91, coupling: 0.22, reuse: 0.84, granularity: "right",
      owner: "Marine operations",
      ops: [
        { verb: "REGISTER", path: "/calls", desc: "Create a visit from a nomination" },
        { verb: "REVISE", path: "/calls/{id}/eta", desc: "Update ETA, draft, and line" },
        { verb: "STATE", path: "/calls/{id}/state", desc: "Arrive, work, sail" }
      ],
      contract: `service VesselCall  layer: entity
owns: Visit, Voyage, LineOperator
does not own: BerthWindow, Invoice

post /calls
  in  Nomination{voyage, vesselImo, eta, draft}
  out Visit{id, state: NOMINATED}

patch /calls/{id}/eta
  sla: 400ms p95  idempotent: yes`
    },
    {
      id: "berth",
      name: "Berth Window",
      layer: "task",
      votes: { top: true, bottom: true, goal: true },
      cohesion: 0.86, coupling: 0.31, reuse: 0.62, granularity: "right",
      owner: "Planning",
      ops: [
        { verb: "ALLOCATE", path: "/windows", desc: "Fit a visit to a quay segment" },
        { verb: "SPLIT", path: "/windows/{id}/cranes", desc: "Crane intensity plan" }
      ],
      contract: `service BerthWindow  layer: task
inputs: Visit, TideTable, CraneCapacity
rule: no two visits overlap a bollard set
qos: planning can be eventually consistent`
    },
    {
      id: "container",
      name: "Container Ledger",
      layer: "entity",
      votes: { top: true, bottom: true, goal: false },
      cohesion: 0.88, coupling: 0.27, reuse: 0.9, granularity: "right",
      owner: "Yard",
      ops: [
        { verb: "LOCATE", path: "/boxes/{iso}", desc: "Canonical position and holds" },
        { verb: "MOVE", path: "/boxes/{iso}/moves", desc: "Append a move event" }
      ],
      contract: `service ContainerLedger  layer: entity
event-sourced: MovePosted, HoldPlaced, HoldCleared
single writer of yard truth`
    },
    {
      id: "gate",
      name: "Gate Passage",
      layer: "process",
      votes: { top: true, bottom: true, goal: true },
      cohesion: 0.8, coupling: 0.38, reuse: 0.55, granularity: "right",
      owner: "Landside",
      ops: [
        { verb: "BOOK", path: "/slots", desc: "Truck appointment" },
        { verb: "ADMIT", path: "/passages", desc: "OCR + booking match" }
      ],
      contract: `service GatePassage  layer: process
orchestrates: Identity, ContainerLedger, Tariff, Notify
kpi: truck turn minutes`
    },
    {
      id: "tariff",
      name: "Tariff & Invoice",
      layer: "entity",
      votes: { top: true, bottom: true, goal: true },
      cohesion: 0.93, coupling: 0.18, reuse: 0.77, granularity: "right",
      owner: "Finance",
      ops: [
        { verb: "QUOTE", path: "/quotes", desc: "Price a call or a pickup" },
        { verb: "ISSUE", path: "/invoices", desc: "Immutable invoice" }
      ],
      contract: `service TariffInvoice  layer: entity
owns: RateCard, Invoice, Settlement
eliminates 4 copy-pasted billing routines`
    },
    {
      id: "edi",
      name: "Partner Message",
      layer: "utility",
      votes: { top: false, bottom: true, goal: true },
      cohesion: 0.74, coupling: 0.41, reuse: 0.7, granularity: "coarse",
      owner: "Integration",
      ops: [
        { verb: "INGEST", path: "/edi", desc: "Normalize COPARN / CODECO" },
        { verb: "EMIT", path: "/edi/outbox", desc: "Partner outbound" }
      ],
      contract: `service PartnerMessage  layer: utility
anti-corruption layer around UN/EDIFACT
never writes yard positions directly`
    },
    {
      id: "notify",
      name: "Signal",
      layer: "utility",
      votes: { top: false, bottom: true, goal: true },
      cohesion: 0.81, coupling: 0.12, reuse: 0.95, granularity: "fine",
      owner: "Platform",
      ops: [
        { verb: "FANOUT", path: "/signals", desc: "Channel-agnostic notice" }
      ],
      contract: `service Signal  layer: utility
channels: sms, email, webhook
consumed by Gate, Vessel, Invoice`
    },
    {
      id: "identity",
      name: "Harbor Identity",
      layer: "utility",
      votes: { top: false, bottom: true, goal: false },
      cohesion: 0.9, coupling: 0.08, reuse: 0.99, granularity: "right",
      owner: "Security",
      ops: [
        { verb: "ISSUE", path: "/tokens", desc: "Broker, clerk, planner roles" }
      ],
      contract: `service HarborIdentity  layer: utility
oidc + fine-grained resource scopes`
    },
    {
      id: "work",
      name: "Quay Worklist",
      layer: "process",
      votes: { top: true, bottom: true, goal: true },
      cohesion: 0.83, coupling: 0.36, reuse: 0.48, granularity: "right",
      owner: "Operations",
      ops: [
        { verb: "COMPOSE", path: "/worklists", desc: "Crane-centric move sequence" },
        { verb: "DISPATCH", path: "/assignments", desc: "Bind equipment" }
      ],
      contract: `service QuayWorklist  layer: process
choreography with ContainerLedger + Equipment`
    },
    {
      id: "equipment",
      name: "Equipment Pool",
      layer: "task",
      votes: { top: true, bottom: true, goal: false },
      cohesion: 0.79, coupling: 0.29, reuse: 0.66, granularity: "right",
      owner: "Assets",
      ops: [
        { verb: "ASSIGN", path: "/pool/assign", desc: "STS / RTG / truck" }
      ],
      contract: `service EquipmentPool  layer: task
capability, not a god object of telemetry`
    }
  ],
  edges: [
    ["gate", "identity"], ["gate", "container"], ["gate", "tariff"], ["gate", "notify"],
    ["work", "container"], ["work", "equipment"], ["work", "vessel"],
    ["berth", "vessel"], ["edi", "container"], ["edi", "vessel"],
    ["tariff", "vessel"], ["tariff", "notify"], ["work", "notify"]
  ],
  waves: [
    { when: "Tide 0", what: "Identity + Signal + Partner Message (strangler seams)" },
    { when: "Tide 1", what: "Container Ledger as system of record; Forms become a client" },
    { when: "Tide 2", what: "Vessel Call + Berth Window; kill visit stored procedures" },
    { when: "Tide 3", what: "Gate Passage + Tariff; truck KPI becomes measurable" },
    { when: "Tide 4", what: "Quay Worklist + Equipment; retire MQ batch freeze" }
  ]
};
