window.MERIDIAN = {
  caseNote: "Harborline is a fictional teaching case. Baseline size, stack, module heat, incidents, and KPI targets are illustrative assumptions that would need validation during real discovery.",
  method: {
    promotionVotes: 2,
    weights: { cohesion: 0.45, coupling: 0.30, reuse: 0.15, votes: 0.10 }
  },
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
  layers: [
    { id: "process", title: "Process", description: "Coordinates a business outcome across service boundaries." },
    { id: "task", title: "Task", description: "Performs a focused capability used by one or more processes." },
    { id: "entity", title: "Entity", description: "Owns the authoritative state and write rules for a business concept." },
    { id: "utility", title: "Utility", description: "Provides shared technical or integration capabilities." }
  ],
  boundaries: {
    vessel: {
      purpose: "Maintain the lifecycle and published facts for a vessel visit.",
      owns: ["Visit", "Voyage", "Line operator"],
      avoids: ["Berth allocation", "Container position", "Invoice settlement"],
      consistency: "Visit state is authoritative here; downstream consumers receive versioned visit events."
    },
    berth: {
      purpose: "Allocate quay windows and crane capacity to a nominated visit.",
      owns: ["Berth window", "Bollard allocation", "Crane split"],
      avoids: ["Visit identity", "Yard position", "Invoice calculation"],
      consistency: "Planning may be eventually consistent; conflicting allocations are checked before confirmation."
    },
    container: {
      purpose: "Maintain the canonical container location, movement history, and operational holds.",
      owns: ["Container identity", "Yard position", "Move history", "Operational holds"],
      avoids: ["EDI translation", "Customs authority decisions", "Tariff policy"],
      consistency: "A single writer appends moves; consumers build read models from movement events."
    },
    gate: {
      purpose: "Coordinate truck appointments, admission checks, and passage outcomes.",
      owns: ["Appointment", "Passage decision", "Gate ticket"],
      avoids: ["Container location", "Identity policy", "Tariff rules"],
      consistency: "Admission is an idempotent command; a passage is confirmed only after required checks succeed."
    },
    tariff: {
      purpose: "Calculate charges from one tariff policy and issue immutable invoices.",
      owns: ["Rate card", "Quote", "Invoice", "Settlement"],
      avoids: ["Visit lifecycle", "Container movement", "Gate appointment"],
      consistency: "Issued invoices are immutable; corrections use credit or adjustment documents."
    },
    edi: {
      purpose: "Translate partner messages into validated domain commands and publish partner updates.",
      owns: ["Partner mappings", "Message envelope", "Delivery status"],
      avoids: ["Yard position", "Visit state", "Customs release decision"],
      consistency: "Inbound messages are deduplicated and acknowledged; failed translations enter a replayable exception queue."
    },
    notify: {
      purpose: "Deliver subscribed business signals over configured channels.",
      owns: ["Subscription", "Delivery attempt", "Channel preference"],
      avoids: ["Business decision", "Invoice content", "Visit state"],
      consistency: "Delivery is asynchronous and retryable; a notification never determines transaction success."
    },
    identity: {
      purpose: "Authenticate actors and authorize scoped actions at service boundaries.",
      owns: ["Principal", "Role", "Resource scope"],
      avoids: ["Business ownership", "Operational workflow state", "Application-specific data"],
      consistency: "Services validate short-lived signed tokens and enforce their own resource-level policy."
    },
    work: {
      purpose: "Compose and dispatch the ordered work needed to load or discharge a vessel.",
      owns: ["Worklist", "Move sequence", "Dispatch assignment"],
      avoids: ["Container position", "Equipment telemetry", "Visit identity"],
      consistency: "Worklist changes are coordinated by events; move completion is confirmed by the owning ledger."
    },
    equipment: {
      purpose: "Match equipment capability and availability to an operational assignment.",
      owns: ["Equipment capability", "Availability", "Assignment"],
      avoids: ["Worklist sequence", "Container position", "Vessel visit"],
      consistency: "Assignments use a current availability view and emit an event when equipment is committed."
    }
  },
  evidence: {
    vessel: {
      top: "Yes · P1 needs a durable Visit and Voyage lifecycle.",
      bottom: "Yes · VV stores ETA, draft, line operator, and visit state.",
      goal: "Yes · G2 needs a fast, trusted ETA; G3 needs call-level billing context."
    },
    berth: {
      top: "Yes · P1 assigns a berth before a vessel can work.",
      bottom: "Yes · BP contains berth windows, crane splits, and tidal constraints.",
      goal: "Yes · G4 requires marine planning to move behind a strangler seam."
    },
    container: {
      top: "Yes · P2, P3, and P4 all need a stable Box identity and position.",
      bottom: "Yes · YI and CM store positions and movements; YI is highly change-prone.",
      goal: "No · none of the four stated outcomes names a container ledger as an outcome."
    },
    gate: {
      top: "Yes · P2 is a distinct appointment-to-passage business process.",
      bottom: "Yes · GO contains appointment, OCR, booking, and passage behavior.",
      goal: "Yes · G1 directly measures truck turn time."
    },
    tariff: {
      top: "Yes · P4 requires a charge and release decision.",
      bottom: "Yes · BL plus three copied billing routines indicate a fragmented capability.",
      goal: "Yes · G3 explicitly requires one tariff truth and one vessel-call invoice."
    },
    edi: {
      top: "No · message translation is an integration concern, not a standalone domain process.",
      bottom: "Yes · ED is embedded in YI stored procedures and must be separated from writes.",
      goal: "Yes · G2 and G4 need decoupled partner updates and a migration seam."
    },
    notify: {
      top: "No · channel delivery is cross-cutting rather than a port domain process.",
      bottom: "Yes · NT holds shared SMS, email, and legacy fax behavior.",
      goal: "Yes · G1 and G2 need timely signals without coupling delivery to transactions."
    },
    identity: {
      top: "No · access policy is cross-cutting, not a business-domain service seed.",
      bottom: "Yes · AU combines LDAP with screen-level grants.",
      goal: "No · security is a necessary constraint, but no explicit security KPI is in this brief."
    },
    work: {
      top: "Yes · P3 coordinates work queues, moves, and hatch completion.",
      bottom: "Yes · CM, EQ, and MQ batches split one operational workflow across modules.",
      goal: "Yes · G4 favors incremental orchestration over replacing the work system at once."
    },
    equipment: {
      top: "Yes · P3 needs equipment capability and dispatch assignment.",
      bottom: "Yes · EQ already contains an equipment pool and assignment behavior.",
      goal: "No · none of the stated goals requires a separate equipment outcome."
    }
  },
  edgeNotes: {
    "gate:identity": "Gate Passage validates actor and resource scope before accepting an appointment or passage command.",
    "gate:container": "Gate Passage reads container identity and holds, then requests a movement when a truck enters or exits.",
    "gate:tariff": "Gate Passage requests charge status when the cargo release policy requires payment clearance.",
    "gate:notify": "Gate Passage publishes passage outcomes; Signal delivers subscribed notifications asynchronously.",
    "work:container": "Quay Worklist requests moves; Container Ledger confirms movement with an authoritative MovePosted event.",
    "work:equipment": "Quay Worklist requests equipment assignment and consumes assignment outcomes.",
    "work:vessel": "Quay Worklist uses the visit's work window and lifecycle state to plan executable work.",
    "berth:vessel": "Berth Window allocates a visit and publishes the confirmed berth plan for the Vessel Call context.",
    "edi:container": "Partner Message translates partner instructions into validated movement or hold commands; it never writes positions.",
    "edi:vessel": "Partner Message normalizes vessel and voyage updates into Vessel Call commands.",
    "tariff:vessel": "Tariff & Invoice uses a versioned vessel-call snapshot as the basis for call charges.",
    "tariff:notify": "Tariff & Invoice emits invoice-issued or payment-cleared events consumed by Signal.",
    "work:notify": "Quay Worklist publishes work and completion signals for subscribed operators."
  },
  choreography: [
    { step: "Book slot", service: "Gate Passage", message: "POST /slots · return an idempotent appointment reference" },
    { step: "OCR plate", service: "Gate Passage", message: "Match the detected plate to the appointment; reject ambiguous matches for review" },
    { step: "Match booking", service: "Harbor Identity + Container Ledger", message: "Authorize the clerk, then verify box identity and active holds" },
    { step: "Issue ticket", service: "Gate Passage", message: "POST /passages · persist the admission decision and ticket" },
    { step: "Yard in", service: "Container Ledger → Signal", message: "Append the move, publish MovePosted, and notify subscribers asynchronously" }
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
