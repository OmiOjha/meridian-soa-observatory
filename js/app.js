const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const M = window.MERIDIAN;
const Model = window.MERIDIAN_MODEL;

function paintSky() {
  const c = $("#sky");
  const x = c.getContext("2d");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const stars = Array.from({ length: 90 }, () => ({
    x: Math.random(), y: Math.random(), r: Math.random() * 1.4 + 0.2, p: Math.random() * Math.PI
  }));
  const resize = () => {
    c.width = innerWidth;
    c.height = innerHeight;
  };
  const render = (t) => {
    x.fillStyle = "#071018";
    x.fillRect(0, 0, c.width, c.height);
    const g = x.createRadialGradient(c.width * 0.7, c.height * 0.1, 20, c.width * 0.5, c.height * 0.4, c.width * 0.7);
    g.addColorStop(0, "rgba(61,139,122,0.16)");
    g.addColorStop(1, "transparent");
    x.fillStyle = g; x.fillRect(0, 0, c.width, c.height);
    stars.forEach((s) => {
      x.beginPath();
      x.fillStyle = `rgba(232,240,234,${0.25 + Math.sin(t / 900 + s.p) * 0.25})`;
      x.arc(s.x * c.width, s.y * c.height, s.r, 0, Math.PI * 2);
      x.fill();
    });
    x.strokeStyle = "rgba(212,165,116,0.08)";
    x.beginPath();
    for (let i = 0; i < c.width; i += 8) {
      const y = c.height * 0.86 + Math.sin(i / 70 + t / 800) * 10 + Math.sin(i / 28 + t / 500) * 4;
      i === 0 ? x.moveTo(i, y) : x.lineTo(i, y);
    }
    x.stroke();
    if (!reducedMotion) requestAnimationFrame(render);
  };
  resize();
  window.addEventListener("resize", () => {
    resize();
    if (reducedMotion) render(performance.now());
  });
  render(performance.now());
}

function show(id) {
  const current = $(".view.active");
  if (current?.id !== id) $(".stage").scrollTop = 0;
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === id));
  $$("[data-view]").forEach((b) => {
    const active = b.dataset.view === id;
    b.classList.toggle("active", active);
    if (active) b.setAttribute("aria-current", "page");
    else b.removeAttribute("aria-current");
  });
  if (id === "constellation") drawGraph();
}

function renderRelic() {
  $("#mod-map").innerHTML = M.modules.map((m) => `
    <div class="mod" data-id="${m.id}">
      <strong>${m.name}</strong>
      <p>${m.note}</p>
      <div class="heat"><i style="width:${m.heat}%"></i></div>
    </div>`).join("");
  $("#pain").innerHTML = M.app.pains.map((p) => `<li>${p}</li>`).join("");
  $("#stack").textContent = M.app.stack;
}

function renderLab(filter = "all") {
  const list = $("#candidates");
  list.innerHTML = M.services
    .filter((s) => filter === "all" || s.layer === filter)
    .sort((a, b) => Model.score(b, M.method) - Model.score(a, M.method))
    .map((s) => `
    <div class="cand">
      <div class="cand-name"><strong>${s.name}</strong><span class="muted">${s.layer} · ${s.owner}</span></div>
      <div class="votes">
        <div class="vote ${s.votes.top ? "yes" : ""}" role="img" aria-label="Domain vote: ${s.votes.top ? "yes" : "no"}" title="Domain decomposition">D</div>
        <div class="vote ${s.votes.bottom ? "yes" : ""}" role="img" aria-label="Asset vote: ${s.votes.bottom ? "yes" : "no"}" title="Existing asset analysis">A</div>
        <div class="vote ${s.votes.goal ? "yes" : ""}" role="img" aria-label="Goal vote: ${s.votes.goal ? "yes" : "no"}" title="Goal-service modeling">G</div>
      </div>
      <div class="score" aria-label="Identification score ${Model.score(s, M.method)} out of 100">${Model.score(s, M.method)}</div>
      <span class="candidate-status ${Model.isPromoted(s, M.method) ? "promoted" : ""}">
        ${Model.isPromoted(s, M.method) ? "Promoted" : "Hold"}
      </span>
      <details class="evidence">
        <summary>Evidence trail</summary>
        <ul>
          <li><strong>Domain · ${s.votes.top ? "yes" : "no"}</strong><span>${M.evidence[s.id].top}</span></li>
          <li><strong>Assets · ${s.votes.bottom ? "yes" : "no"}</strong><span>${M.evidence[s.id].bottom}</span></li>
          <li><strong>Goals · ${s.votes.goal ? "yes" : "no"}</strong><span>${M.evidence[s.id].goal}</span></li>
        </ul>
      </details>
    </div>`).join("");
}

function renderContracts(id = M.services[0].id) {
  const svc = M.services.find((s) => s.id === id);
  const boundary = M.boundaries[id];
  $("#svc-list").innerHTML = M.services.map((s) =>
    `<button class="${s.id === id ? "on" : ""}" aria-pressed="${s.id === id}" data-id="${s.id}">${s.name}</button>`
  ).join("");
  $("#boundary").innerHTML = `
    <p class="boundary-purpose">${boundary.purpose}</p>
    <div><strong>Owns</strong><span>${boundary.owns.join(" · ")}</span></div>
    <div><strong>Does not own</strong><span>${boundary.avoids.join(" · ")}</span></div>
    <div><strong>Consistency</strong><span>${boundary.consistency}</span></div>`;
  $("#spec").textContent = svc.contract;
  $("#ops").innerHTML = svc.ops.map((o) =>
    `<div class="op"><span><span class="verb">${o.verb}</span> ${o.path}</span><span class="muted">${o.desc}</span></div>`
  ).join("");
}

function renderFlow() {
  $("#flow").innerHTML = M.choreography.map((item, i) =>
    `<article class="step"><small>0${i + 1}</small><strong>${item.step}</strong><p class="service-name">${item.service}</p><p class="muted">${item.message}</p></article>`
  ).join("");
  $("#timeline").innerHTML = M.waves.map((w, i) =>
    `<div class="wave"><span>${w.when}</span><div class="bar" style="width:${55 + i * 9}%">${w.what}</div></div>`
  ).join("");
}

function renderArchitecture() {
  $("#layer-map").innerHTML = M.layers.map((layer) => {
    const services = M.services.filter((service) => service.layer === layer.id);
    return `<article class="layer-card layer-${layer.id}">
      <div><span class="tag">${layer.id}</span><strong>${layer.title}</strong></div>
      <p class="muted">${layer.description}</p>
      <ul>${services.map((service) => `<li>${service.name}</li>`).join("")}</ul>
    </article>`;
  }).join("");

  $("#edge-list").innerHTML = M.edges.map(([caller, callee]) => {
    const key = `${caller}:${callee}`;
    const from = M.services.find((service) => service.id === caller);
    const to = M.services.find((service) => service.id === callee);
    return `<li><strong>${from.name} → ${to.name}</strong><span>${M.edgeNotes[key]}</span></li>`;
  }).join("");
}

function renderReport() {
  const rows = [...M.services].sort((a, b) => Model.score(b, M.method) - Model.score(a, M.method)).map((s) =>
    `<tr><td>${s.name}</td><td>${s.layer}</td><td>${Model.countVotes(s)}/3</td>
     <td>${s.cohesion.toFixed(2)}</td><td>${s.coupling.toFixed(2)}</td><td>${Model.score(s, M.method)}</td><td>${s.owner}</td></tr>`
  ).join("");
  $("#report-body").innerHTML = rows;
  const promoted = M.services.filter((s) => Model.isPromoted(s, M.method)).length;
  $("#promo").textContent = `${promoted} of ${M.services.length} candidates meet the ${M.method.promotionVotes}-of-3 promotion threshold. Scores rank candidates; the vote threshold is the promotion decision.`;
}

const COLORS = { entity: "#6fd4c0", process: "#d4a574", task: "#9bb7ff", utility: "#ff6b4a" };

function drawGraph() {
  const canvas = $("#sky-canvas");
  const ctx = canvas.getContext("2d");
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  canvas.width = rect.width * devicePixelRatio;
  canvas.height = rect.height * devicePixelRatio;
  ctx.scale(devicePixelRatio, devicePixelRatio);
  const W = rect.width, H = rect.height;
  const nodes = M.services.map((s, i) => {
    const a = (i / M.services.length) * Math.PI * 2 - Math.PI / 2;
    return { ...s, x: W / 2 + Math.cos(a) * Math.min(W, H) * 0.32, y: H / 2 + Math.sin(a) * Math.min(W, H) * 0.32 };
  });
  ctx.clearRect(0, 0, W, H);
  ctx.strokeStyle = "rgba(232,240,234,0.12)";
  M.edges.forEach(([a, b]) => {
    const n = nodes.find((x) => x.id === a), m = nodes.find((x) => x.id === b);
    if (!n || !m) return;
    const dx = m.x - n.x, dy = m.y - n.y;
    const length = Math.hypot(dx, dy);
    const ux = dx / length, uy = dy / length;
    const start = 11 + n.reuse * 8;
    const end = 11 + m.reuse * 8;
    const x1 = n.x + ux * start, y1 = n.y + uy * start;
    const x2 = m.x - ux * end, y2 = m.y - uy * end;
    const angle = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x2 - 7 * Math.cos(angle - Math.PI / 6), y2 - 7 * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 7 * Math.cos(angle + Math.PI / 6), y2 - 7 * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  });
  nodes.forEach((n) => {
    ctx.beginPath();
    ctx.fillStyle = COLORS[n.layer];
    ctx.arc(n.x, n.y, 11 + n.reuse * 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8f0ea";
    ctx.font = "12px Outfit, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(n.name, n.x, n.y + 28);
  });
}

function bind() {
  $$("[data-view]").forEach((b) => b.addEventListener("click", () => show(b.dataset.view)));
  $$("[data-go]").forEach((b) => b.addEventListener("click", () => show(b.dataset.go)));
  $$(".lens").forEach((l) => l.addEventListener("click", () => {
    $$(".lens").forEach((x) => {
      x.classList.remove("on");
      x.setAttribute("aria-pressed", "false");
    });
    l.classList.add("on");
    l.setAttribute("aria-pressed", "true");
    $("#lens-copy").textContent = l.dataset.copy;
  }));
  $$(".chip").forEach((c) => c.addEventListener("click", () => {
    $$(".chip").forEach((x) => x.classList.remove("on"));
    c.classList.add("on");
    renderLab(c.dataset.layer);
  }));
  $("#svc-list").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (b) renderContracts(b.dataset.id);
  });
  $("#print").addEventListener("click", () => window.print());
}

function boot() {
  paintSky();
  renderRelic();
  renderLab();
  renderContracts();
  renderFlow();
  renderArchitecture();
  renderReport();
  bind();
  window.addEventListener("resize", () => {
    if ($("#constellation").classList.contains("active")) drawGraph();
  });
  show("home");
}

boot();
