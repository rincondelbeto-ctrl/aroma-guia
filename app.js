(function () {
  "use strict";

  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clear");
  const resultsEl = document.getElementById("results");
  const statusEl = document.getElementById("status");
  const emptyEl = document.getElementById("empty");
  const landingEl = document.getElementById("landing");
  const tplCondicion = document.getElementById("tpl-condicion");
  const tplAceite = document.getElementById("tpl-aceite");

  let DATA = { aceites: [], fichas: [] };

  function normalize(s) {
    return (s || "")
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "");
  }

  function loadData() {
    return fetch("data.json")
      .then((r) => r.json())
      .then((json) => {
        DATA = json;
        DATA._aceitesNorm = DATA.aceites.map((a) => ({
          item: a,
          nombreN: normalize(a.nombre),
          usosN: normalize(a.usos),
        }));
        DATA._fichasNorm = DATA.fichas.map((f) => ({
          item: f,
          condicionN: normalize(f.condicion),
          productosN: normalize(f.productos.join(" ")),
          contextoN: normalize(f.contextoClinico || ""),
        }));
      });
  }

  function scoreMatch(norm, q) {
    if (norm === q) return 0;
    if (norm.startsWith(q)) return 1;
    if (norm.includes(q)) return 2;
    return null;
  }

  function search(rawQuery) {
    const q = normalize(rawQuery.trim());
    if (q.length < 2) return { condiciones: [], aceites: [] };

    const condMatches = [];
    for (const f of DATA._fichasNorm) {
      let s = scoreMatch(f.condicionN, q);
      if (s === null && f.productosN.includes(q)) s = 3;
      if (s === null && f.contextoN.includes(q)) s = 4;
      if (s !== null) condMatches.push({ item: f.item, score: s });
    }

    const aceiteMatches = [];
    for (const a of DATA._aceitesNorm) {
      let s = scoreMatch(a.nombreN, q);
      if (s === null && a.usosN.includes(q)) s = 3;
      if (s !== null) aceiteMatches.push({ item: a.item, score: s });
    }

    const byScoreThenName = (key) => (x, y) =>
      x.score - y.score || x.item[key].localeCompare(y.item[key], "es");

    condMatches.sort(byScoreThenName("condicion"));
    aceiteMatches.sort(byScoreThenName("nombre"));

    return {
      condiciones: condMatches.map((m) => m.item),
      aceites: aceiteMatches.map((m) => m.item),
    };
  }

  function renderCondicion(f) {
    const node = tplCondicion.content.cloneNode(true);
    node.querySelector(".card-title").textContent = f.condicion;
    node.querySelector(".productos").textContent = f.productos.join(", ");
    node.querySelector(".aplicacion").textContent = f.aplicacion;
    const warnEl = node.querySelector(".advertencia");
    if (f.advertencia) {
      warnEl.textContent = f.advertencia;
      warnEl.hidden = false;
    }
    if (f.contextoClinico) {
      node.querySelector(".contexto-clinico").hidden = false;
      node.querySelector(".contexto-texto").textContent = f.contextoClinico;
    }
    return node;
  }

  function renderAceite(a) {
    const node = tplAceite.content.cloneNode(true);
    node.querySelector(".card-title").textContent = a.nombre;
    node.querySelector(".usos").textContent = a.usos;
    return node;
  }

  function render(query) {
    resultsEl.innerHTML = "";
    const q = query.trim();

    if (q.length === 0) {
      landingEl.hidden = false;
      emptyEl.hidden = true;
      statusEl.textContent = "";
      return;
    }

    landingEl.hidden = true;

    if (q.length < 2) {
      emptyEl.hidden = true;
      statusEl.textContent = "Sigue escribiendo…";
      return;
    }

    const { condiciones, aceites } = search(q);
    const total = condiciones.length + aceites.length;

    if (total === 0) {
      emptyEl.hidden = false;
      statusEl.textContent = "";
      return;
    }

    emptyEl.hidden = true;
    statusEl.textContent =
      `${total} resultado${total === 1 ? "" : "s"}` +
      (condiciones.length ? ` · ${condiciones.length} ficha(s)` : "") +
      (aceites.length ? ` · ${aceites.length} aceite(s)` : "");

    const frag = document.createDocumentFragment();
    for (const f of condiciones) frag.appendChild(renderCondicion(f));
    for (const a of aceites) frag.appendChild(renderAceite(a));
    resultsEl.appendChild(frag);
  }

  searchInput.addEventListener("input", () => {
    clearBtn.hidden = searchInput.value.length === 0;
    render(searchInput.value);
  });

  clearBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearBtn.hidden = true;
    searchInput.focus();
    render("");
  });

  loadData()
    .then(() => {
      statusEl.textContent = "";
      render(searchInput.value);
    })
    .catch(() => {
      statusEl.textContent = "No se pudo cargar la base de datos.";
    });

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("service-worker.js").catch(() => {});
    });
  }
})();
