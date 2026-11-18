/* MLILY U 3.0, the Find Specs page (/find-specs). The page is built in Webflow: tabs, filters, table, rows and details panel are native elements bound to the CMS.
   This script only adds behaviour: search, filters, sorting, grouping, columns, selection, details, copy and CSV. Filters live in the address, so a view can be shared. */
(function () {
  "use strict";
  var root = document.querySelector("[data-specs]");
  if (!root) return;

  var SIZES = ["Twin", "Twin XL", "Full", "Queen", "King", "Cal King", "Split Head King", "Split King", "Split Cal King", "Standard", "Standard/Queen", "One size"];
  var SOURCE = "MLILY 2026 Ecommerce Guide (Universal), Oct 26", MSRP_SOURCE = "MLILY Price Book 2026";
  var SORT_ICON = { none: "M8.5 9.5l3.5-3.5 3.5 3.5M8.5 14.5l3.5 3.5 3.5-3.5", asc: "M8 14l4-4 4 4", desc: "M8 10l4 4 4-4" };
  var DONE_ICON = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"></path></svg>';

  var state = { cat: "", q: "", model: "", feel: "", build: "", sizes: [], sort: null, group: true, hidden: {}, selected: {}, drawer: null };
  var panels = {}, sheets = {}, sayTimer = null, typeTimer = null;
  var drawer = root.querySelector("[data-specs-drawer]"), statusEl = root.querySelector("[data-specs-status]");
  var selBar = root.querySelector("[data-specs-selbar]"), selCount = root.querySelector("[data-specs-selcount]");

  function all(sel, el) { return [].slice.call((el || root).querySelectorAll(sel)); }
  function say(msg, now) { clearTimeout(sayTimer); if (now) statusEl.textContent = msg; else sayTimer = setTimeout(function () { statusEl.textContent = msg; }, 400); }
  function money(n) { return n == null || n === "" ? "" : "$" + Number(n).toLocaleString("en-US"); }
  function trio(a) { return a ? a.join(" × ") : ""; }
  function tight(a) { return a ? a.join(" × ") : ""; }
  function lb(n) { return n == null || n === "" ? "" : n + " lb"; }
  function sizeIdx(s) { var i = SIZES.indexOf(s || "One size"); return i < 0 ? 99 : i; }
  function lines(v) { return v ? v.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean) : []; }
  function number(v) { return v !== "" && !isNaN(v) ? Number(v) : v; }
  function triple(v) { var a = v ? v.split(/\s*x\s*/i).map(Number) : []; return a.length === 3 && a.every(isFinite) ? a : null; }
  function text(el) { return el && !el.classList.contains("w-dyn-bind-empty") ? el.textContent.trim() : ""; }

  /* ------------------------------------------------------------------ reading the native rows */
  function readSheets() {
    all("[data-spec-sheets] [data-sheet]", document).forEach(function (el) {
      function v(k) { return text(el.querySelector('[data-col="' + k + '"]')); }
      var img = el.querySelector("img");
      sheets[el.getAttribute("data-sheet")] = {
        color: v("color"), model: v("model"), topMaterial: v("topMaterial"), includes: lines(v("includes")), bullets: lines(v("bullets")), features: lines(v("features")),
        description: v("description"), keywords: v("keywords"), img: img && !img.classList.contains("w-dyn-bind-empty") ? img.getAttribute("src") : ""
      };
    });
  }
  function readRow(el) {
    var r = {}, sheet = sheets[el.getAttribute("data-sheet")] || {};
    function cell(k) { return el.querySelector('[data-col="' + k + '"] .specs-td__value'); }
    function v(k) { return text(cell(k)); }
    Object.keys(sheet).forEach(function (k) { r[k] = sheet[k]; });
    ["sku", "upc", "title", "part", "origin", "warranty", "size", "construction", "coil", "cover", "top", "closure", "water"].forEach(function (k) { r[k] = v(k); });
    if (v("color")) r.color = v("color");
    r.name = text(el.querySelector(".specs-product__name"));
    r.feel = text(el.querySelector(".specs-product__feel"));
    r.msrp = v("msrp") === "" ? null : number(v("msrp"));
    r.weight = v("weight") === "" ? null : number(v("weight"));
    r.layers = number(v("layers")); r.pieces = number(v("pieces"));
    r.dims = triple(v("dims")); r.box = triple(v("box"));
    r.notes = lines(text(el.querySelector('.specs-item__data [data-col="notes"]')));
    r.product = el.getAttribute("data-product") || "";
    r.el = el;
    r.cells = el.querySelector(".specs-item__cells");
    r.check = el.querySelector("[data-specs-check]");
    paintRow(r);
    return r;
  }
  // Numbers read as prices and measures; an empty cell shows a dash
  function paintRow(r) {
    var shown = { size: r.size || "One size", msrp: money(r.msrp), dims: tight(r.dims), box: tight(r.box), weight: lb(r.weight) };
    all("[data-col] .specs-td__value", r.el).forEach(function (p) {
      var key = p.closest("[data-col]").getAttribute("data-col"), v = key in shown ? shown[key] : text(p);
      p.classList.remove("w-dyn-bind-empty");
      p.classList.toggle("specs-none", !v);
      p.textContent = v || "—";
      if (!v) p.title = "Not in the ecommerce guide";
    });
    var feel = r.el.querySelector(".specs-product__feel");
    if (feel) { feel.classList.remove("w-dyn-bind-empty"); if (!r.feel) feel.textContent = "One feel"; }
    var tag = r.el.querySelector("[data-specs-tag]");
    if (r.notes.length) { tag.classList.add("is-on"); tag.title = r.notes.join(" "); }
    r.check.setAttribute("aria-label", "Select " + r.sku);
    r.el.querySelector("[data-specs-open]").setAttribute("aria-label", "Details for " + [r.name, r.feel, r.size].filter(Boolean).join(" "));
  }
  function readPanel(el) {
    var id = el.getAttribute("data-specs-panel"), hidden = {};
    all("[data-specs-col]", el).forEach(function (m) { if (m.getAttribute("aria-checked") !== "true") hidden[m.getAttribute("data-specs-col")] = true; });
    var p = {
      id: id, el: el, label: "", defaults: hidden,
      table: el.querySelector("[data-specs-table]"), list: el.querySelector(".specs-items"), wrap: el.querySelector("[data-specs-wrap]"),
      filters: el.querySelector("[data-specs-filters]"), search: el.querySelector("[data-specs-search]"),
      cols: all("[data-specs-head] [data-col]", el).map(function (th) {
        var label = th.querySelector(".specs-sort__text span"), unit = th.querySelector(".specs-sort__unit");
        return { key: th.getAttribute("data-col"), label: label ? label.textContent.trim() : "", unit: unit ? unit.textContent.trim() : "", num: th.classList.contains("specs-th--num"), th: th };
      }),
      rows: all(".specs-item", el).map(readRow)
    };
    var tab = root.querySelector('[data-specs-tab="' + id + '"]');
    p.label = tab ? tab.firstChild.textContent.trim() : id;
    state.hidden[id] = Object.assign({}, hidden);
    p.rows.forEach(function (r) { r.hay = [r.name, r.feel, r.size, r.sku, r.upc, r.part, r.title, r.model, r.color].join(" ").toLowerCase(); });
    return p;
  }
  function panel() { return panels[state.cat]; }
  function isMattress() { return state.cat === "mattress"; }
  function noun() { return isMattress() ? "mattress" : "product"; }
  function findRow(sku) { return panel().rows.filter(function (r) { return r.sku === sku; })[0] || null; }
  function rowFor(el) { return panel().rows.filter(function (r) { return r.el === el; })[0] || null; }
  function filtersOn() { return !!(state.q || state.model || state.feel || state.build || state.sizes.length); }

  /* ------------------------------------------------------------------ filtering and sorting */
  function sortVal(key, r) {
    if (key === "size") return sizeIdx(r.size);
    if (key === "dims") return r.dims ? r.dims[0] * r.dims[1] : -1;
    if (key === "box") return r.box ? r.box[0] * r.box[1] * r.box[2] : -1;
    if (key === "product") return String((state.group && isMattress() ? r.feel : r.name) || "").toLowerCase();
    var col = panel().cols.filter(function (c) { return c.key === key; })[0], v = r[key];
    return col && col.num ? (v == null || v === "" ? -1 : +v) : String(v || "").toLowerCase();
  }
  function filtered() {
    var toks = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var rows = panel().rows.filter(function (r) {
      if (state.model && r.name !== state.model) return false;
      if (state.feel && r.feel !== state.feel) return false;
      if (state.build && r.construction !== state.build) return false;
      if (state.sizes.length && state.sizes.indexOf(r.size || "One size") < 0) return false;
      return toks.every(function (t) { return r.hay.indexOf(t) >= 0; });
    });
    if (state.sort) {
      var key = state.sort.key, dir = state.sort.dir;
      rows = rows.map(function (r, i) { return [r, i]; }).sort(function (a, b) {
        var x = sortVal(key, a[0]), y = sortVal(key, b[0]);
        return (x < y ? -1 : x > y ? 1 : 0) * dir || a[1] - b[1];
      }).map(function (p) { return p[0]; });
    }
    return rows;
  }

  /* ------------------------------------------------------------------ the table */
  function applyColumns() {
    var p = panel(), hidden = state.hidden[p.id], shown = 1;   // the checkbox column
    p.cols.forEach(function (c) {
      var on = !hidden[c.key];
      if (on) shown++;
      [c.th].concat(all('.specs-item [data-col="' + c.key + '"]', p.el)).forEach(function (el) { el.classList.toggle("is-on", on); el.classList.toggle("is-off", !on); });
    });
    p.table.style.gridTemplateColumns = "repeat(" + shown + ", auto) minmax(0, 1fr) auto";
    all("[data-specs-col]", p.el).forEach(function (m) { m.setAttribute("aria-checked", String(!hidden[m.getAttribute("data-specs-col")])); });
  }
  function render() {
    var p = panel(), rows = filtered(), order = [], groups = {};
    p.rows.forEach(function (r) { r.el.hidden = true; r.el.classList.remove("is-first"); if (!groups[r.name]) { groups[r.name] = []; order.push(r.name); } });
    if (state.group) {
      rows.forEach(function (r) { groups[r.name].push(r); });
      rows = [];
      order.forEach(function (name) {
        var g = groups[name]; if (!g.length) return;
        var metas = all(".specs-item__meta", g[0].el), line = metas.length > 1 ? metas[0] : null, count = g[0].el.querySelector("[data-specs-group-count]");
        g[0].el.classList.add("is-first");
        count.textContent = (text(line) ? "· " : "") + g.length + (g.length === 1 ? " SKU" : " SKUs");
        rows = rows.concat(g);
      });
    }
    rows.forEach(function (r) { r.el.hidden = false; r.el.classList.toggle("is-selected", !!state.selected[r.sku]); r.el.classList.toggle("is-open", state.drawer === r.sku); r.check.setAttribute("aria-checked", String(!!state.selected[r.sku])); p.list.appendChild(r.el); });
    p.table.classList.toggle("is-flat", !state.group);
    p.el.classList.toggle("is-empty", !rows.length);
    p.table.setAttribute("aria-label", p.label + " specs, " + rows.length + " rows");
    var label = p.el.querySelector("[data-specs-product-label]");
    if (label) label.textContent = isMattress() ? (state.group ? "Feel" : "Mattress") : "Product";
    all("[data-specs-sort]", p.el).forEach(function (a) {
      var key = a.getAttribute("data-specs-sort"), dir = state.sort && state.sort.key === key ? state.sort.dir : 0, path = a.querySelector("path");
      a.classList.toggle("is-sorted", !!dir);
      a.closest("[data-col]").setAttribute("aria-sort", dir > 0 ? "ascending" : dir < 0 ? "descending" : "none");
      if (path) path.setAttribute("d", dir > 0 ? SORT_ICON.asc : dir < 0 ? SORT_ICON.desc : SORT_ICON.none);
    });
    var count = p.el.querySelector("[data-specs-count]");
    count.innerHTML = "<b>" + rows.length + "</b> of " + p.rows.length + " SKUs";
    say(rows.length + " of " + p.rows.length + " SKUs shown");
    syncSelection(rows); syncExport(rows); writeUrl();
  }
  function syncSelection(rows) {
    var p = panel(), n = Object.keys(state.selected).length, box = p.el.querySelector("[data-specs-all]");
    selBar.classList.toggle("is-on", !!n);
    selCount.textContent = n + (n === 1 ? " row selected" : " rows selected");
    var every = rows.length && rows.every(function (r) { return state.selected[r.sku]; }), some = rows.some(function (r) { return state.selected[r.sku]; });
    box.setAttribute("aria-checked", every ? "true" : some ? "mixed" : "false");
  }
  function syncExport(rows) {
    var l = root.querySelector('[data-specs-export-label="copy"]');
    if (l && !l.hasAttribute("data-busy")) l.textContent = "Copy " + rows.length + (rows.length === 1 ? " row" : " rows");
  }
  function syncFilters() {
    var p = panel();
    all("[data-specs-size]", p.el).forEach(function (b) {
      var v = b.getAttribute("data-specs-size");
      b.setAttribute("aria-pressed", String(v ? state.sizes.indexOf(v) >= 0 : !state.sizes.length));
    });
    all("[data-specs-filter]", p.el).forEach(function (s) { s.value = state[s.getAttribute("data-specs-filter")] || ""; });
    if (p.search && p.search.value !== state.q) p.search.value = state.q;
    var clear = p.el.querySelector(".specs-filters__clear"); if (clear) clear.classList.toggle("is-on", filtersOn());
    var n = (state.model ? 1 : 0) + (state.feel ? 1 : 0) + (state.build ? 1 : 0) + (state.sizes.length ? 1 : 0), badge = p.el.querySelector("[data-specs-filter-count]");
    if (badge) { badge.textContent = n; badge.classList.toggle("is-on", !!n); }
  }
  function fillSelects(p) {
    var keys = { model: "name", feel: "feel", build: "construction" };
    all("[data-specs-filter]", p.el).forEach(function (s) {
      var seen = {};
      p.rows.forEach(function (r) {
        var v = r[keys[s.getAttribute("data-specs-filter")]];
        if (v && !seen[v]) { seen[v] = 1; s.add(new Option(v, v)); }
      });
    });
  }

  /* ------------------------------------------------------------------ details panel */
  function setD(key, v) { all('[data-d="' + key + '"]', drawer).forEach(function (el) { el.textContent = v == null ? "" : v; }); }
  function setRow(key, v) { var row = drawer.querySelector('[data-d-row="' + key + '"]'), on = v !== "" && v != null; if (row) row.hidden = !on; setD(key, on ? v : ""); }
  function fillDrawer(r) {
    var m = isMattress(), title = r.name + (m && r.feel ? " " + r.feel : ""), img = drawer.querySelector("[data-d-image]"), link = drawer.querySelector("[data-d-link]");
    setD("category", panel().label); setD("title", title); setD("sub", [r.size || "One size", r.color].filter(Boolean).join(" · "));
    drawer.querySelector("[data-d-media]").hidden = !r.img;
    if (r.img) { img.src = r.img; img.alt = title; } else img.removeAttribute("src");
    link.hidden = !(m && r.product);
    if (!link.hidden) link.setAttribute("href", "/mattresses/" + r.product);
    setD("notes", r.notes.join("\n"));
    drawer.querySelector('[data-d-section="notes"]').hidden = !r.notes.length;
    setRow("sku", r.sku); setRow("upc", r.upc); setRow("part", r.part); setRow("msrp", money(r.msrp));
    setRow("dims", r.dims ? trio(r.dims) + " in (W × L × H)" : ""); setRow("box", r.box ? trio(r.box) + " in (L × W × H)" : ""); setRow("weight", lb(r.weight));
    setRow("construction", m ? r.construction : ""); setRow("layers", m ? r.layers : ""); setRow("coil", m ? r.coil : ""); setRow("cover", m ? r.cover : "");
    setRow("top", m ? [r.top, r.topMaterial].filter(Boolean).join(", ") : "");
    setRow("color", r.color); setRow("pieces", r.pieces); setRow("includes", (r.includes || []).join(", ")); setRow("closure", r.closure); setRow("water", r.water); setRow("origin", r.origin); setRow("warranty", r.warranty);
    drawer.querySelector('[data-d-section="price"] .specs-drawer__fine').textContent = m && r.product ? MSRP_SOURCE : "List Price in the ecommerce guide";
    setD("listing-title", r.title); setD("description", r.description); setRow("keywords", r.keywords);
    drawer.querySelector('[data-d="listing-title"]').hidden = !r.title;
    drawer.querySelector('[data-d="description"]').hidden = !r.description;
    var ul = drawer.querySelector('[data-d-list="bullets"]'), chips = drawer.querySelector('[data-d-chips="features"]');
    ul.textContent = ""; (r.bullets || []).forEach(function (b) { var li = document.createElement("li"); li.textContent = b; ul.appendChild(li); }); ul.hidden = !(r.bullets || []).length;
    chips.textContent = ""; (r.features || []).forEach(function (f) { var s = document.createElement("span"); s.className = "specs-listing__feature"; s.textContent = f; chips.appendChild(s); }); chips.hidden = !(r.features || []).length;
    var listing = drawer.querySelector('[data-d-section="listing"]');
    listing.hidden = !(r.title || r.description || r.keywords || (r.bullets || []).length || (r.features || []).length);
    all("[data-d-section]", drawer).forEach(function (s) { var rows = all("[data-d-row]", s); if (rows.length && s !== listing) s.hidden = rows.every(function (x) { return x.hidden; }); });
  }
  function openDrawer(sku) {
    var r = findRow(sku); if (!r) return;
    panel().rows.forEach(function (x) { x.el.classList.remove("is-open"); });
    state.drawer = sku; fillDrawer(r);
    drawer.classList.add("is-open"); r.el.classList.add("is-open");
    drawer.querySelector('[data-d="title"]').focus({ preventScroll: true });
    drawer.querySelector(".specs-drawer__scroll").scrollTop = 0;
    say("Details for " + [r.name, r.feel, r.size].filter(Boolean).join(" "), true);
  }
  function closeDrawer(silent) {
    if (!state.drawer) return;
    var r = findRow(state.drawer); state.drawer = null; drawer.classList.remove("is-open");
    if (r) { r.el.classList.remove("is-open"); if (!silent) r.el.querySelector("[data-specs-open]").focus({ preventScroll: true }); }
  }
  function detailsText(r) {
    var m = isMattress(), out = [r.name + (m && r.feel ? " " + r.feel : "") + ", " + (r.size || "One size") + (r.color ? ", " + r.color : ""), "SKU " + r.sku];
    if (r.upc) out.push("UPC " + r.upc);
    if (r.part) out.push("Part number " + r.part);
    if (r.msrp != null) out.push("MSRP " + money(r.msrp));
    if (r.dims) out.push("Mattress " + trio(r.dims) + " in (W x L x H)");
    if (r.box) out.push("Box " + trio(r.box) + " in (L x W x H)" + (r.weight != null ? ", " + lb(r.weight) : ""));
    var build = [r.construction, r.layers !== "" && r.layers != null ? r.layers + " layers" : "", r.coil, r.cover ? r.cover + " cover" : ""].filter(Boolean).join(", ");
    if (build) out.push("Build " + build);
    if (r.origin) out.push("Made in " + r.origin);
    if (r.warranty) out.push("Warranty " + r.warranty);
    out.push("Source: " + SOURCE + "; MSRP: " + MSRP_SOURCE);
    return out.join("\n");
  }
  function listingText(r) { return [r.title, (r.bullets || []).map(function (b) { return "- " + b; }).join("\n"), r.description].filter(Boolean).join("\n\n"); }

  /* ------------------------------------------------------------------ copy and export */
  function copyText(value, done) {
    function fallback() {
      var ta = document.createElement("textarea"), ok = false;
      ta.value = value; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
      root.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      root.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(value).then(function () { done(true); }, fallback); else fallback();
  }
  function flash(btn, value) {
    var label = btn.querySelector(".page-action__label"); if (!label) return;
    var idle = label.getAttribute("data-idle") || label.textContent;
    label.setAttribute("data-idle", idle); label.setAttribute("data-busy", ""); label.textContent = value;
    setTimeout(function () { label.removeAttribute("data-busy"); label.textContent = idle; label.removeAttribute("data-idle"); syncExport(filtered()); }, 1600);
  }
  function grid(rows) {
    var m = isMattress(), head = [], get = [];
    function add(l, f) { head.push(l); get.push(f); }
    panel().cols.forEach(function (c) {
      var k = c.key;
      if (k === "product") { add("Product", function (r) { return r.name; }); if (m) add("Feel", function (r) { return r.feel; }); }
      else if (k === "dims") ["W", "L", "H"].forEach(function (a, i) { add("Mattress " + a + " (in)", function (r) { return r.dims ? r.dims[i] : ""; }); });
      else if (k === "box") ["L", "W", "H"].forEach(function (a, i) { add("Box " + a + " (in)", function (r) { return r.box ? r.box[i] : ""; }); });
      else if (k === "msrp") add("MSRP (USD)", function (r) { return r.msrp; });
      else if (k === "weight") add("Box weight (lb)", function (r) { return r.weight; });
      else if (k === "size") add("Size", function (r) { return r.size || "One size"; });
      else add(c.label, function (r) { return r[k]; });
    });
    add("Notes", function (r) { return r.notes.join(" "); });
    return [head].concat(rows.map(function (r) { return get.map(function (g) { var v = g(r); return v == null ? "" : String(v); }); }));
  }
  function tsv(t) { return t.map(function (row) { return row.map(function (v) { return v.replace(/[\t\r\n]+/g, " "); }).join("\t"); }).join("\n"); }
  function csv(t) { return t.map(function (row) { return row.map(function (v) { return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n"); }
  function download(value, name) {
    var url = URL.createObjectURL(new Blob(["﻿" + value], { type: "text/csv;charset=utf-8" })), a = document.createElement("a");
    a.href = url; a.download = name; root.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function exportRows(kind, btn) {
    var selected = /selected/.test(kind), rows = selected ? panel().rows.filter(function (r) { return state.selected[r.sku]; }) : filtered();
    if (!rows.length) return;
    var n = rows.length + (rows.length === 1 ? " row" : " rows"), d = new Date();
    if (/^copy/.test(kind)) copyText(tsv(grid(rows)), function (ok) {
      if (!selected) flash(btn, ok ? "Copied " + n : "Couldn’t copy");
      say(ok ? "Copied " + n + ". Paste into Excel or Google Sheets." : "Couldn’t copy: the browser blocked the clipboard.", true);
    });
    else {
      download(csv(grid(rows)), "MLILY-specs-" + panel().label.toLowerCase().replace(/\s+/g, "-") + "-" + d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0") + ".csv");
      say("Downloaded " + n + " as CSV", true);
    }
  }

  /* ------------------------------------------------------------------ the address */
  function readUrl() {
    var p = new URLSearchParams(location.search), type = p.get("type");
    if (panels[type]) state.cat = type;
    var wanted = p.get("product") || "", hit = wanted && panel().rows.filter(function (r) { return r.name === wanted || r.product === wanted; })[0];
    state.model = hit ? hit.name : "";
    state.feel = p.get("feel") || ""; state.build = p.get("build") || ""; state.q = p.get("q") || "";
    state.sizes = (p.get("size") || "").split(",").filter(Boolean);
  }
  function writeUrl() {
    var p = new URLSearchParams(), hit = state.model && panel().rows.filter(function (r) { return r.name === state.model; })[0];
    if (state.cat !== "mattress") p.set("type", state.cat);
    if (hit) p.set("product", hit.product || hit.name);
    if (state.feel) p.set("feel", state.feel);
    if (state.build) p.set("build", state.build);
    if (state.sizes.length) p.set("size", state.sizes.join(","));
    if (state.q) p.set("q", state.q);
    var query = p.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }
  // the top bar's search lists the mattresses too
  function tellShell() {
    if (!panels.mattress || !window.MLILY_SHELL || !window.MLILY_SHELL.addProducts) return;
    var seen = {}, list = [];
    panels.mattress.rows.forEach(function (r) {
      if (!r.product || seen[r.product]) return;
      seen[r.product] = 1;
      list.push({ slug: r.product, name: r.name, sub: (r.dims && r.dims[2] ? r.dims[2] + "” " : "") + (r.construction || "") });
    });
    window.MLILY_SHELL.addProducts(list);
  }

  /* ------------------------------------------------------------------ tabs and menus */
  function showTab(id, focus) {
    if (!panels[id]) return;
    state.cat = id;
    Object.keys(panels).forEach(function (k) { panels[k].el.classList.toggle("is-active", k === id); });
    all("[data-specs-tab]").forEach(function (t) {
      var on = t.getAttribute("data-specs-tab") === id;
      t.setAttribute("aria-selected", String(on)); t.setAttribute("tabindex", on ? "0" : "-1");
      if (on && focus) t.focus();
    });
    var group = panel().el.querySelector("[data-specs-group]");
    if (group) { group.setAttribute("aria-checked", String(state.group)); group.querySelector("span:last-child").textContent = "Group by " + noun(); }
    applyColumns(); syncFilters(); render();
  }
  function switchTab(id, focus) {
    if (id === state.cat || !panels[id]) return;
    state.q = ""; state.model = ""; state.feel = ""; state.build = ""; state.sizes = []; state.sort = null; state.selected = {};
    closeDrawer(true); showTab(id, focus);
    panel().wrap.scrollTop = 0; panel().wrap.scrollLeft = 0;
  }
  function resetFilters() { state.q = ""; state.model = ""; state.feel = ""; state.build = ""; state.sizes = []; syncFilters(); render(); }
  function toggleCols(open, focusBtn) {
    var p = panel(), btn = p.el.querySelector("[data-specs-cols-btn]"), menu = p.el.querySelector("[data-specs-cols-menu]");
    menu.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open));
    if (open) { var first = menu.querySelector("[data-specs-col]"); if (first) first.focus(); } else if (focusBtn) btn.focus();
  }
  function colsOpen() { var m = panel().el.querySelector("[data-specs-cols-menu]"); return m && m.classList.contains("is-open"); }

  /* ------------------------------------------------------------------ events */
  root.addEventListener("click", function (e) {
    var t = e.target, b;
    if (!t.closest) return;
    if (t.closest('a[href="#"]')) e.preventDefault();
    if ((b = t.closest("[data-specs-tab]"))) { switchTab(b.getAttribute("data-specs-tab"), false); return; }
    if ((b = t.closest("[data-specs-size]"))) {
      var v = b.getAttribute("data-specs-size"), i = state.sizes.indexOf(v);
      if (!v) state.sizes = []; else if (i >= 0) state.sizes.splice(i, 1); else state.sizes.push(v);
      syncFilters(); render(); return;
    }
    if ((b = t.closest("[data-specs-clear]"))) { resetFilters(); if (panel().search) panel().search.focus(); return; }
    if ((b = t.closest("[data-specs-filters-toggle]"))) { var openF = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(openF)); panel().filters.classList.toggle("is-open", openF); return; }
    if ((b = t.closest("[data-specs-group]"))) { state.group = !state.group; b.setAttribute("aria-checked", String(state.group)); render(); return; }
    if ((b = t.closest("[data-specs-cols-btn]"))) { toggleCols(!colsOpen()); return; }
    if ((b = t.closest("[data-specs-col]"))) { var key = b.getAttribute("data-specs-col"), h = state.hidden[state.cat]; h[key] = !h[key]; applyColumns(); return; }
    if ((b = t.closest("[data-specs-cols-reset]"))) { state.hidden[state.cat] = Object.assign({}, panel().defaults); applyColumns(); return; }
    if (colsOpen() && !t.closest(".specs-cols")) toggleCols(false);
    if ((b = t.closest("[data-specs-sort]"))) {
      var sk = b.getAttribute("data-specs-sort"), cur = state.sort && state.sort.key === sk ? state.sort.dir : 0;
      state.sort = cur === 0 ? { key: sk, dir: 1 } : cur === 1 ? { key: sk, dir: -1 } : null;
      render(); return;
    }
    if ((b = t.closest("[data-specs-copy]"))) {
      var box = b.closest(".specs-copyable"), val = box.querySelector(".specs-td__value, .specs-dl__value").textContent.trim(), what = b.getAttribute("data-specs-copy"), icon = b.innerHTML;
      copyText(val, function (ok) {
        if (ok) { b.innerHTML = DONE_ICON; b.classList.add("is-done"); setTimeout(function () { b.innerHTML = icon; b.classList.remove("is-done"); }, 1500); }
        say(ok ? "Copied " + what + " " + val : "Couldn’t copy " + val, true);
      });
      return;
    }
    if ((b = t.closest("[data-specs-export]"))) { exportRows(b.getAttribute("data-specs-export"), b); return; }
    if ((b = t.closest("[data-specs-select-clear]"))) { state.selected = {}; render(); return; }
    if ((b = t.closest("[data-specs-all]"))) {
      var rows = filtered(), on = !rows.every(function (r) { return state.selected[r.sku]; });
      rows.forEach(function (r) { if (on) state.selected[r.sku] = true; else delete state.selected[r.sku]; });
      render(); return;
    }
    if ((b = t.closest("[data-specs-check]"))) {
      var row = rowFor(b.closest(".specs-item"));
      if (state.selected[row.sku]) delete state.selected[row.sku]; else state.selected[row.sku] = true;
      b.setAttribute("aria-checked", String(!!state.selected[row.sku])); row.el.classList.toggle("is-selected", !!state.selected[row.sku]);
      syncSelection(filtered()); return;
    }
    if ((b = t.closest("[data-specs-drawer-close]"))) { closeDrawer(); return; }
    if ((b = t.closest("[data-specs-copy-details]"))) { var r1 = findRow(state.drawer), btn1 = b; if (r1) copyText(detailsText(r1), function (ok) { flash(btn1, ok ? "Copied" : "Couldn’t copy"); say(ok ? "Copied the details" : "Couldn’t copy", true); }); return; }
    if ((b = t.closest("[data-specs-copy-listing]"))) { var r2 = findRow(state.drawer), btn2 = b; if (r2) copyText(listingText(r2), function (ok) { btn2.textContent = ok ? "Copied" : "Couldn’t copy"; setTimeout(function () { btn2.textContent = "Copy listing copy"; }, 1600); say(ok ? "Copied the listing copy" : "Couldn’t copy", true); }); return; }
    // the more arrow, or a click anywhere else on a row, opens its details
    var cells = t.closest(".specs-item__cells");
    if (cells && (t.closest("[data-specs-open]") || !t.closest("a"))) {
      var r = rowFor(cells.closest(".specs-item"));
      if (state.drawer === r.sku) closeDrawer(!t.closest("[data-specs-open]")); else openDrawer(r.sku);
    }
  });
  root.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches("[data-specs-filter]")) { state[t.getAttribute("data-specs-filter")] = t.value; syncFilters(); render(); }
  });
  root.addEventListener("input", function (e) {
    if (!e.target.matches("[data-specs-search]")) return;
    state.q = e.target.value; clearTimeout(typeTimer);
    typeTimer = setTimeout(function () { syncFilters(); render(); }, 120);
  });
  root.addEventListener("keydown", function (e) {
    var t = e.target, isSearch = t.matches && t.matches("[data-specs-search]");
    if (e.key === "Escape" && !(isSearch && t.value)) {
      if (colsOpen()) { e.preventDefault(); toggleCols(false, true); return; }
      if (state.drawer) { e.preventDefault(); closeDrawer(); return; }
    }
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.matches && t.matches("input, select, textarea"))) { if (panel().search) { e.preventDefault(); panel().search.focus(); panel().search.select(); } return; }
    if (isSearch && e.key === "Escape" && t.value) { e.preventDefault(); e.stopPropagation(); t.value = ""; state.q = ""; syncFilters(); render(); return; }
    if (t.matches && t.matches("[data-specs-tab]") && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
      e.preventDefault();
      var ids = Object.keys(panels), i = ids.indexOf(state.cat);
      i = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length;
      switchTab(ids[i], true); return;
    }
    // links that act as buttons and checkboxes answer the space bar too
    if (e.key === " " && t.matches && t.matches('a[role="button"], a[role="checkbox"], a[role="menuitemcheckbox"], a[role="tab"], [data-specs-sort]')) { e.preventDefault(); t.click(); }
  });

  /* ------------------------------------------------------------------ start */
  readSheets();
  all("[data-specs-panel]").forEach(function (el) { var p = readPanel(el); panels[p.id] = p; fillSelects(p); });
  all("[data-specs-tab]").forEach(function (t) {
    var id = t.getAttribute("data-specs-tab"), n = t.querySelector(".specs-tab__count");
    if (panels[id]) n.textContent = panels[id].rows.length; else t.setAttribute("aria-disabled", "true");
  });
  Object.keys(panels).forEach(function (k) {
    panels[k].wrap.addEventListener("scroll", function () { panels[k].wrap.classList.toggle("is-scrolled-x", panels[k].wrap.scrollLeft > 0); }, { passive: true });
  });
  state.cat = panels.mattress ? "mattress" : Object.keys(panels)[0];
  if (!state.cat) return;
  readUrl(); showTab(state.cat, false); root.classList.add("is-ready"); tellShell();
  window.MLILY_SPECS_PAGE = { panels: panels, state: state };
})();
