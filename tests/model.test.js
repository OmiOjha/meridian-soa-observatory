import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";

const source = new URL("../", import.meta.url);
const sandbox = { window: {} };
runInNewContext(readFileSync(new URL("js/data.js", source), "utf8"), sandbox);
runInNewContext(readFileSync(new URL("js/model.js", source), "utf8"), sandbox);

const model = sandbox.window.MERIDIAN;
const scoring = sandbox.window.MERIDIAN_MODEL;

test("documents the case as illustrative and preserves the expected model scope", () => {
  assert.match(model.caseNote, /fictional teaching case/i);
  assert.equal(model.modules.length, 12);
  assert.equal(model.services.length, 10);
  assert.equal(model.processes.length, 4);
  assert.equal(model.goals.length, 4);
  assert.equal(model.waves.length, 5);
});

test("every service has a unique identity, a valid layer, a boundary, and evidence", () => {
  const ids = model.services.map((service) => service.id);
  assert.equal(new Set(ids).size, ids.length);

  for (const service of model.services) {
    assert.ok(model.layers.some((layer) => layer.id === service.layer), service.id);
    assert.ok(model.boundaries[service.id], service.id);
    assert.ok(model.evidence[service.id], service.id);
    assert.ok(service.ops.length > 0, service.id);
    assert.deepEqual(Object.keys(service.votes).sort(), ["bottom", "goal", "top"]);
    for (const meridian of ["top", "bottom", "goal"]) {
      assert.equal(typeof model.evidence[service.id][meridian], "string");
      assert.ok(model.evidence[service.id][meridian].length > 20, `${service.id}.${meridian}`);
    }
    for (const metric of ["cohesion", "coupling", "reuse"]) {
      assert.ok(service[metric] >= 0 && service[metric] <= 1, `${service.id}.${metric}`);
    }
  }
});

test("runtime relationships refer to known services and have an interaction rationale", () => {
  const ids = new Set(model.services.map((service) => service.id));
  assert.ok(model.edges.length > 0);
  for (const [caller, callee] of model.edges) {
    assert.ok(ids.has(caller), `unknown caller ${caller}`);
    assert.ok(ids.has(callee), `unknown callee ${callee}`);
    assert.ok(model.edgeNotes[`${caller}:${callee}`], `${caller}:${callee} has no rationale`);
  }
});

test("scores use the published weights and vote threshold controls promotion", () => {
  const weightTotal = Object.values(model.method.weights).reduce((sum, weight) => sum + weight, 0);
  assert.equal(weightTotal, 1);
  assert.equal(scoring.score(model.services.find((service) => service.id === "tariff"), model.method), 88);
  assert.equal(scoring.score(model.services.find((service) => service.id === "identity"), model.method), 86);
  assert.equal(scoring.isPromoted(model.services.find((service) => service.id === "tariff"), model.method), true);
  assert.equal(scoring.isPromoted(model.services.find((service) => service.id === "identity"), model.method), false);
  assert.equal(model.services.filter((service) => scoring.isPromoted(service, model.method)).length, 9);
});

test("truck-gate choreography identifies the interaction at each process step", () => {
  assert.equal(model.choreography.length, model.processes[1].steps.length);
  assert.deepEqual(
    model.choreography.map((step) => step.step),
    model.processes[1].steps
  );
  assert.ok(model.choreography.every((step) => step.service && step.message));
});

test("the HTML navigation targets existing sections and loads the shared model before the app", () => {
  const html = readFileSync(new URL("index.html", source), "utf8");
  const sectionIds = new Set([...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/g)].map((match) => match[1]));
  const viewTargets = [...html.matchAll(/data-view="([^"]+)"/g)].map((match) => match[1]);
  assert.ok(viewTargets.length > 0);
  for (const target of viewTargets) assert.ok(sectionIds.has(target), `missing view ${target}`);
  assert.ok(html.indexOf('src="js/model.js"') < html.indexOf('src="js/app.js"'));
});
