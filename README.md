# Meridian — SOA Observatory

**Service Identification and SOA Modeling for an Existing Application**

Meridian is an interactive, submission-ready case study that identifies service boundaries in **Harborline TOS**, a fictional legacy terminal operating system. Instead of drawing a greenfield SOA, it starts with an as-found application—its modules, duplicated billing code, stored procedures, partner messages, and operational constraints—and shows how to derive and realize a service model.

> **Case-study notice:** Harborline, its technology stack, measurements, incidents, and targets are illustrative assumptions, not facts about a real port or an audited production system. Replace them with discovery evidence before using this proposal to guide an implementation.

## Explore the model

Run the site locally, then use the section navigation:

- **The Relic** — 12-module heat atlas, as-found stack, pain points, and four business processes.
- **Identification Lab** — top-down domain decomposition, bottom-up asset analysis, and goal-service modeling. Expand a candidate’s evidence trail to see why each meridian voted yes or no.
- **Service Sky** — runtime service relationships, layered architecture, ownership boundaries, and a text description of every interaction.
- **Contracts** — per-service purpose, owned and excluded data, consistency policy, interface examples, and operations.
- **Strangler Tide** — truck-gate choreography and five incremental migration waves.
- **Field Report** — ranked catalog and a print-friendly report.

The method promotes a candidate at **two or more of three votes**. A separate score ranks candidates:

`score = 45% × cohesion + 30% × (1 − coupling) + 15% × reuse + 10% × vote ratio`

Scores are rounded to the nearest integer. The score is not a substitute for the promotion threshold: a high-scoring candidate with only one meridian vote remains on hold.

The full written deliverable, including scope, service catalog, interaction model, migration rationale, risks, assumptions, and references, is in [`docs/soa-model-report.md`](docs/soa-model-report.md).

## Run locally

No package installation or backend is required. Serve the repository root with Python:

```bash
python3 -m http.server 8080
```

Open <http://localhost:8080>. A modern browser is recommended. The Google Fonts link is optional; system font fallbacks are included.

## Verify the model

Node.js 18 or later runs the dependency-free model and page checks:

```bash
npm test
```

The tests cover model completeness, unique services and valid boundaries, traceable evidence, interaction references, the scoring and promotion rules, choreography, and navigation targets.

## Publish

The site is static and can be served by GitHub Pages or any static host. For GitHub Pages, enable **Settings → Pages → GitHub Actions**; the workflow in `.github/workflows/pages.yml` publishes the repository root after pushes to `main` and on manual dispatch. The first deployment may take a few minutes to appear.

## Project structure

```text
index.html                 Interactive observatory
css/styles.css             Responsive visual system and print styles
js/data.js                 Case baseline, service catalog, evidence, and boundaries
js/model.js                Shared scoring and promotion rules
js/app.js                  Rendering and interactions
docs/soa-model-report.md   Written SOA modeling report
tests/model.test.js        Dependency-free model and page checks
```
