# Meridian — SOA Observatory

**Live demo:** https://omiojha.github.io/meridian-soa-observatory/

**Service Identification and SOA Modeling for an Existing Application**

Meridian is an interactive observatory that reverse-engineers **Harborline TOS**, a fictional 2009 terminal operating system (vessels, containers, gates, invoices), and produces a defensible service catalog.

It is not a greenfield SOA poster. It treats the monolith as a relic: modules, stored procedures, copied billing logic, EDI trapped inside inventory code.

## The unique method — triangulated identification

A candidate is promoted only if it survives three meridians from IBM SOMA:

| Meridian | SOMA technique | Question asked of Harborline |
|---|---|---|
| Domain | Top-down domain decomposition | Which processes and entities exist whether or not the code does? |
| Assets | Bottom-up existing-asset analysis | What is already stable, duplicated, or dangerously entangled? |
| Goals | Meet-in-the-middle goal-service modeling | Which services are required by KPIs the port actually owns? |

Survivors are scored:

`0.45·cohesion + 0.30·(1−coupling) + 0.15·reuse + 0.10·vote ratio`

Layers follow the classical SOA stack: **process**, **entity**, **task**, **utility**.

## What you can explore in the live demo

1. **Prologue** — the observatory
2. **The Relic** — heat atlas of the 12 Harborline modules
3. **Identification Lab** — votes and scores for every candidate
4. **Service Sky** — runtime conversations, not foreign keys
5. **Contracts** — what each service is allowed to own
6. **Strangler Tide** — five tides of realization, no big-bang cutover
7. **Field Report** — printable catalog

## Run locally

Open `index.html` in a browser, or:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Why Harborline

Ports still run terminal operating systems born in the late 2000s. The domain is rich enough to be interesting (berths, bays, holds, tariffs) and ugly enough to be honest (Oracle Forms, nightly freezes, UN/EDIFACT). That is the point of modeling services for an *existing* application.

## Academic anchors

- IBM SOMA: identification → specification → realization
- Domain decomposition, existing-asset analysis, goal-service modeling
- Cohesion / coupling / granularity as identification metrics
- Strangler-fig migration rather than rewrite

Built as a static site so the model can be demonstrated without a backend.
