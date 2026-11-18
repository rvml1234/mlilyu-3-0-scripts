/* MLILY U 3.0, the Find Specs page (/find-specs): tabs, search, filters, sorting, columns, details, copy and CSV around the page's native rows.
   The rows are Webflow Collection Lists bound to the SKUs and Spec Sheets collections ([data-spec-list], [data-spec-sheets]); this script reads them and
   arranges them in the table. Filters live in the address, so a view can be shared. */
(function () {
  "use strict";
  var SLUGS = { powercool: "powercool-pro" };
  function slugOf(id) { return SLUGS[id] || id; }
  function idOf(slug) { for (var id in SLUGS) if (SLUGS[id] === slug) return id; return slug; }
  var MARKUP = "<div class=\"mdl spec-modal spec-page\" data-spec-modal><div class=\"spec-modal__frame\"><header class=\"spec-modal__head\"><div class=\"spec-modal__heading\"><h2 class=\"spec-modal__title\" id=\"spec-modal-title\">All product specs</h2></div><div class=\"spec-modal__actions\"><button type=\"button\" class=\"page-action spec-modal__action\" data-spec-export=\"copy\"><svg class=\"page-action__icon\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"8.5\" y=\"8.5\" width=\"12\" height=\"12\"/><path d=\"M15.5 4.5h-11v11\"/></svg><span class=\"page-action__label\" data-spec-export-label=\"copy\">Copy table</span></button><button type=\"button\" class=\"page-action spec-modal__action\" data-spec-export=\"csv\"><svg class=\"page-action__icon\" viewBox=\"0 0 24 24\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14\"/></svg><span class=\"page-action__label\" data-spec-export-label=\"csv\">Download CSV</span></button></div></header><div class=\"spec-tabs\" role=\"tablist\" aria-label=\"Product type\" data-spec-tabs></div><div class=\"spec-filters\" data-spec-filters></div><div class=\"spec-modal__body\"><div class=\"spec-wrap\" role=\"region\" aria-labelledby=\"spec-modal-title\" tabindex=\"0\" data-spec-wrap><div class=\"spec-table\" role=\"table\" data-spec-table></div><div class=\"spec-empty\" data-spec-empty hidden><p class=\"spec-empty__title\">No SKUs match</p><p class=\"spec-empty__text\">Try another size or feel, or clear the filters.</p><button type=\"button\" class=\"page-action\" data-spec-clear>Clear filters</button></div></div><aside class=\"spec-drawer\" aria-labelledby=\"spec-drawer-title\" data-spec-drawer hidden></aside></div><footer class=\"spec-modal__foot\"><div class=\"spec-select-bar\" data-spec-selbar hidden><span class=\"spec-select-bar__count\" data-spec-selcount></span><button type=\"button\" class=\"spec-link\" data-spec-export=\"copy-selected\">Copy rows</button><button type=\"button\" class=\"spec-link\" data-spec-export=\"csv-selected\">Download CSV</button><button type=\"button\" class=\"spec-link\" data-spec-select-clear>Clear selection</button></div><p class=\"spec-modal__source\" data-spec-source></p></footer><p class=\"visually-hidden\" role=\"status\" aria-live=\"polite\" data-spec-status></p></div></div>";

  var mount = document.querySelector("[data-find-specs]");
  if (!mount) return;
  var source = mount.querySelector("[data-spec-lists]");
  mount.insertAdjacentHTML("afterbegin", MARKUP);
  var dlg = mount.firstElementChild;
  function q(sel) { return dlg.querySelector(sel); }
  var tabsEl = q("[data-spec-tabs]"), filtersEl = q("[data-spec-filters]"), tableEl = q("[data-spec-table]"), wrapEl = q("[data-spec-wrap]");
  var emptyEl = q("[data-spec-empty]"), drawerEl = q("[data-spec-drawer]"), statusEl = q("[data-spec-status]"), sourceEl = q("[data-spec-source]");
  var selBar = q("[data-spec-selbar]"), selCount = q("[data-spec-selcount]");
  var DATA = null, SIZE_ORDER = [], sayTimer = null, typeTimer = null;
  var state = { cat: "mattress", q: "", model: "", feel: "", build: "", sizes: [], sort: null, group: true, hidden: {}, selected: {}, drawer: null };

  var ICON = {
    copy: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12"/><path d="M15.5 4.5h-11v11"/></svg>',
    done: '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    more: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 6l6 6-6 6"/></svg>',
    search: '<svg class="spec-search__icon" viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.75"/><path d="M10.5 10.5L14 14"/></svg>',
    chev: '<svg class="spec-select__chev" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>',
    close: '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M3.5 3.5l9 9M12.5 3.5l-9 9"/></svg>',
    cols: '<svg class="page-action__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 5h16v14H4zM9.5 5v14M14.5 5v14"/></svg>'
  };
  function sortIcon(dir) {
    var d = dir > 0 ? "M8 14l4-4 4 4" : dir < 0 ? "M8 10l4 4 4-4" : "M8.5 9.5l3.5-3.5 3.5 3.5M8.5 14.5l3.5 3.5 3.5-3.5";
    return '<svg class="spec-sort__icon" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + d + '"/></svg>';
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function money(n) { return n == null || n === "" ? "" : "$" + Number(n).toLocaleString("en-US"); }
  function trio(a) { return a && a[0] != null && a[1] != null && a[2] != null ? a[0] + " × " + a[1] + " × " + a[2] : ""; }
  // in the table: thin non-breaking spaces around the x (typographically right for dimensions, and narrower than full spaces)
  function trioTight(a) { return trio(a).split(" × ").join("\u202f×\u202f"); }
  function lb(n) { return n == null || n === "" ? "" : n + " lb"; }
  function sizeIdx(s) { var i = SIZE_ORDER.indexOf(s || "One size"); return i < 0 ? 99 : i; }
  function say(msg, now) { clearTimeout(sayTimer); if (now) statusEl.textContent = msg; else sayTimer = setTimeout(function () { statusEl.textContent = msg; }, 400); }

  /* columns: key, label, unit (shown under the label), num (right aligned, numeric sort), mono (codes), copy (copy button), show (display), sort (sort value) */
  function col(key, label, o) { o = o || {}; o.key = key; o.label = label; return o; }
  var C = {
    product: col("product", "Product"),
    size: col("size", "Size", { key: true, show: function (r) { return r.size || "One size"; }, sort: function (r) { return sizeIdx(r.size); } }),
    color: col("color", "Color"),
    pieces: col("pieces", "Pieces", { num: true }),
    closure: col("closure", "Closure"),
    sku: col("sku", "SKU", { copy: true, mono: true, key: true }),
    upc: col("upc", "UPC", { copy: true, mono: true, key: true }),
    msrp: col("msrp", "MSRP", { num: true, strong: true, show: function (r) { return money(r.msrp); } }),
    dims: col("dims", "Mattress", { unit: "W × L × H in", show: function (r) { return trioTight(r.dims); }, sort: function (r) { return r.dims && r.dims[0] ? r.dims[0] * r.dims[1] : -1; } }),
    box: col("box", "Box", { unit: "L × W × H in", show: function (r) { return trioTight(r.box); }, sort: function (r) { return r.box && r.box[0] ? r.box[0] * r.box[1] * r.box[2] : -1; } }),
    weight: col("weight", "Box weight", { num: true, wrapLabel: true, show: function (r) { return lb(r.weight); } }),
    construction: col("construction", "Build"),
    layers: col("layers", "Layers", { num: true }),
    coil: col("coil", "Coil"),
    cover: col("cover", "Cover"),
    top: col("top", "Top"),
    water: col("water", "Water resistance"),
    origin: col("origin", "Made in"),
    warranty: col("warranty", "Warranty"),
    part: col("part", "Part number", { mono: true }),
    title: col("title", "Listing title")
  };
  // per product type: the columns in order, and the ones the Columns menu starts with off
  var LAYOUT = {
    mattress: { cols: ["product", "size", "sku", "upc", "msrp", "dims", "box", "weight", "construction", "layers", "coil", "cover", "top", "origin", "warranty", "part", "title"],
                off: ["construction", "layers", "coil", "cover", "top", "origin", "warranty", "part", "title"] },   // Build repeats the group header ("14" Hybrid")
    base: { cols: ["product", "size", "sku", "upc", "msrp", "box", "weight", "color", "origin", "warranty", "title"], off: ["color", "title"] },
    pillow: { cols: ["product", "size", "sku", "upc", "msrp", "box", "weight", "origin", "warranty", "title"], off: ["title"] },
    bedding: { cols: ["product", "size", "color", "pieces", "sku", "upc", "msrp", "box", "weight", "origin", "warranty", "title"], off: ["pieces", "title"] },
    protector: { cols: ["product", "size", "closure", "sku", "upc", "msrp", "box", "weight", "water", "origin", "warranty", "title"], off: ["water", "title"] }
  };
  function hiddenMap() {
    if (!state.hidden[state.cat]) {
      var h = {}; (LAYOUT[state.cat].off || []).forEach(function (k) { h[k] = true; });
      state.hidden[state.cat] = h;
    }
    return state.hidden[state.cat];
  }
  function visibleCols() { var h = hiddenMap(); return LAYOUT[state.cat].cols.filter(function (k) { return !h[k]; }).map(function (k) { return C[k]; }); }
  function show(c, r) { if (c.show) return c.show(r); var v = r[c.key]; return v == null ? "" : String(v); }
  function sortVal(c, r) { if (c.sort) return c.sort(r); var v = r[c.key]; return c.num ? (v == null || v === "" ? -1 : +v) : String(v || "").toLowerCase(); }

  function cat() { for (var i = 0; i < DATA.categories.length; i++) if (DATA.categories[i].id === state.cat) return DATA.categories[i]; return DATA.categories[0]; }
  function findRow(sku) { var rows = cat().rows; for (var i = 0; i < rows.length; i++) if (rows[i].sku === sku) return rows[i]; return null; }
  function isMattress() { return state.cat === "mattress"; }
  function noun() { return isMattress() ? "mattress" : "product"; }
  function filtersOn() { return !!(state.q || state.model || state.feel || state.build || state.sizes.length); }

  function filtered() {
    var toks = state.q.toLowerCase().split(/\s+/).filter(Boolean);
    var rows = cat().rows.filter(function (r) {
      if (state.model && r.name !== state.model) return false;
      if (state.feel && r.feel !== state.feel) return false;
      if (state.build && r.construction !== state.build) return false;
      if (state.sizes.length && state.sizes.indexOf(r.size || "One size") < 0) return false;
      if (toks.length) {
        var h = r._hay || (r._hay = [r.name, r.feel, r.size, r.sku, r.upc, r.part, r.title, r.model, r.color].join(" ").toLowerCase());
        for (var i = 0; i < toks.length; i++) if (h.indexOf(toks[i]) < 0) return false;
      }
      return true;
    });
    if (state.sort) {
      var sc = C[state.sort.key], dir = state.sort.dir;
      rows = rows.map(function (r, i) { return [r, i]; }).sort(function (a, b) {
        var x = sortVal(sc, a[0]), y = sortVal(sc, b[0]);
        return (x < y ? -1 : x > y ? 1 : 0) * dir || a[1] - b[1];
      }).map(function (p) { return p[0]; });
    }
    return rows;
  }

  /* ------------------------------------------------------------------ tabs and filters */
  function renderTabs() {
    tabsEl.innerHTML = DATA.categories.map(function (c) {
      var on = c.id === state.cat;
      return '<button type="button" role="tab" class="spec-tab" id="spec-tab-' + c.id + '" aria-selected="' + on + '" tabindex="' + (on ? 0 : -1) + '" data-spec-tab="' + c.id + '">' +
        esc(c.label) + '<span class="spec-tab__count">' + c.rows.length + "</span></button>";
    }).join("");
  }
  function options(key) {
    var seen = {}, out = [];
    cat().rows.forEach(function (r) { var v = key === "size" ? (r.size || "One size") : r[key]; if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    if (key === "size") out.sort(function (a, b) { return sizeIdx(a) - sizeIdx(b); });
    return out;
  }
  function select(name, label, all, opts, val) {
    var id = "spec-f-" + name;
    return '<div class="spec-field spec-field--select"><label class="spec-field__label" for="' + id + '">' + esc(label) + '</label><div class="spec-select">' +
      '<select id="' + id + '" data-spec-filter="' + name + '"><option value="">' + esc(all) + "</option>" +
      opts.map(function (o) { return '<option value="' + esc(o) + '"' + (o === val ? " selected" : "") + ">" + esc(o) + "</option>"; }).join("") + "</select>" + ICON.chev + "</div></div>";
  }
  function columnsMenu() {
    var h = hiddenMap();
    return '<p class="spec-cols__title">Show columns</p>' + LAYOUT[state.cat].cols.filter(function (k) { return k !== "product"; }).map(function (k) {
      return '<label class="spec-cols__item"><input type="checkbox" data-spec-col="' + k + '"' + (h[k] ? "" : " checked") + "><span>" + esc(C[k].label) + "</span></label>";
    }).join("") + '<button type="button" class="spec-link spec-cols__reset" data-spec-cols-reset>Reset columns</button>';
  }
  // A labelled form row like the page's specs card (label above each control), Size like the page's Sizes block (label above the chips), then the results bar.
  function renderFilters() {
    var c = cat(), m = isMattress();
    filtersEl.innerHTML =
      '<div class="spec-filters__fields">' +
        '<div class="spec-field spec-field--search"><label class="spec-field__label" for="spec-search-input">Search</label>' +
          '<div class="spec-search">' + ICON.search +
            '<input type="search" id="spec-search-input" data-spec-search placeholder="SKU, UPC or name" value="' + esc(state.q) + '" autocomplete="off" spellcheck="false" enterkeyhint="search">' +
            '<kbd class="spec-search__key" aria-hidden="true">/</kbd></div></div>' +
        '<button type="button" class="page-action spec-filters__toggle" aria-expanded="false" aria-controls="spec-filter-panel" data-spec-filters-toggle>' +
          '<svg class="page-action__icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M4 7h16M7 12h10M10 17h4"/></svg>' +
          '<span class="page-action__label">Filters</span><span class="spec-filters__badge" data-spec-filter-count hidden></span></button>' +
        '<div class="spec-filters__panel" id="spec-filter-panel">' +
        '<div class="spec-filters__selects">' +
          select("model", m ? "Mattress" : "Product", m ? "All mattresses" : "All " + c.label.toLowerCase(), options("name"), state.model) +
          (m ? select("feel", "Feel", "All feels", options("feel"), state.feel) + select("build", "Build", "All builds", options("construction"), state.build) : "") +
        "</div>" +
        '<div class="spec-field spec-field--sizes"><span class="spec-field__label" id="spec-size-label">Size</span>' +
          '<div class="spec-sizes" role="group" aria-labelledby="spec-size-label"><button type="button" class="spec-chip" data-spec-size="">All</button>' +
            options("size").map(function (sz) { return '<button type="button" class="spec-chip" data-spec-size="' + esc(sz) + '">' + esc(sz) + "</button>"; }).join("") +
          "</div></div>" +
        '<button type="button" class="spec-link spec-filters__clear" data-spec-clear hidden>Clear filters</button>' +
        "</div>" +
      "</div>" +
      '<div class="spec-tablebar">' +
        '<p class="spec-count" data-spec-count></p>' +
        '<div class="spec-tablebar__tools">' +
          '<label class="spec-toggle"><input type="checkbox" data-spec-group' + (state.group ? " checked" : "") + "><span>Group by " + noun() + "</span></label>" +
          '<div class="spec-cols"><button type="button" class="page-action spec-cols__btn" aria-haspopup="true" aria-expanded="false" aria-controls="spec-cols-menu" data-spec-cols-btn>' + ICON.cols +
            '<span class="page-action__label">Columns</span></button><div class="spec-cols__menu" id="spec-cols-menu" data-spec-cols-menu hidden>' + columnsMenu() + "</div></div>" +
        "</div>" +
      "</div>";
    syncFilterUI();
  }
  function syncFilterUI() {
    [].forEach.call(filtersEl.querySelectorAll("[data-spec-size]"), function (b) {
      var v = b.getAttribute("data-spec-size");
      b.setAttribute("aria-pressed", v ? String(state.sizes.indexOf(v) >= 0) : String(!state.sizes.length));
    });
    var clear = filtersEl.querySelector("[data-spec-clear]"); if (clear) clear.hidden = !filtersOn();
    var n = (state.model ? 1 : 0) + (state.feel ? 1 : 0) + (state.build ? 1 : 0) + (state.sizes.length ? 1 : 0), badge = filtersEl.querySelector("[data-spec-filter-count]");
    if (badge) { badge.textContent = n; badge.hidden = !n; }
  }

  /* ------------------------------------------------------------------ table */
  function groupRow(name, rows, span) {
    var r = rows[0], meta = [], row = document.createElement("div");
    if (isMattress() && r.dims && r.dims[2]) meta.push(r.dims[2] + "″" + (r.construction ? " " + r.construction : ""));
    meta.push(rows.length + (rows.length === 1 ? " SKU" : " SKUs"));
    row.className = "spec-group"; row.setAttribute("role", "row");
    // table rows can't span columns, so the title overflows from the first cell across empty ones
    row.innerHTML = '<div class="spec-group__cell" role="rowheader"><span class="spec-group__in">' +
      (r.img ? '<img class="spec-group__img" src="' + esc(r.img) + '" alt="" loading="lazy" decoding="async">' : '<span class="spec-group__img" aria-hidden="true"></span>') +
      '<span class="spec-group__name">' + esc(name) + "</span>" + '<span class="spec-group__meta">' + esc(meta.join(" · ")) + "</span></span></div>" +
      new Array(span).join('<div class="spec-group__rest" aria-hidden="true"></div>');
    return row;
  }
  function makeCell(cls, role, html) {
    var el = document.createElement("div");
    el.className = "spec-td " + cls;
    if (role) el.setAttribute("role", role);
    el.innerHTML = html;
    return el;
  }
  // Once per row: the native cells become the table's cells; the checkbox, product and details cells are added around them
  function prepareRow(r) {
    var el = r._el;
    r._cells = {};
    [].slice.call(el.querySelectorAll("[data-col]")).forEach(function (td) {
      var key = td.getAttribute("data-col"), c = C[key];
      td.remove();
      if (!c || key === "product") return;
      var v = show(c, r);
      r._cells[key] = td;
      td.classList.remove("w-dyn-bind-empty");
      if (c.num) td.classList.add("is-num");
      if (c.mono) td.classList.add("is-mono");
      td.classList.add("is-key");
      if (c.strong) td.classList.add("is-strong");
      td.setAttribute("role", "cell");
      td.setAttribute("data-label", c.label + (c.unit ? " (" + c.unit + ")" : ""));
      td.innerHTML = v ? (c.copy ? '<span class="spec-copyable"><span class="spec-val">' + esc(v) + '</span><button type="button" class="spec-copy" data-spec-copy="' + esc(v) + '" data-spec-copy-what="' + esc(c.label) + '" aria-label="Copy ' + esc(c.label) + " " + esc(v) + '">' + ICON.copy + "</button></span>" : esc(v))
        : '<span class="spec-none" title="Not in the ecommerce guide">—</span><span class="visually-hidden">Not in the guide</span>';
    });
    el.setAttribute("role", "row");
    el.setAttribute("data-spec-row", r.sku);
    r._check = makeCell("spec-td--check", "cell", '<input type="checkbox" class="spec-check" data-spec-check="' + esc(r.sku) + '" aria-label="Select ' + esc(r.sku) + '">');
    r._product = makeCell("spec-td--product", "rowheader", "");
    r._fill = makeCell("spec-td--fill", "", ""); r._fill.setAttribute("aria-hidden", "true");
    r._more = makeCell("spec-td--more", "cell", '<button type="button" class="spec-more" data-spec-open="' + esc(r.sku) + '" aria-label="Details for ' + esc(r.name + " " + (r.feel || "") + " " + (r.size || "")) + '">' + ICON.more + "</button>");
  }
  function placeRow(r, cols, grouped) {
    var el = r._el, sel = !!state.selected[r.sku], m = isMattress();
    el.className = "spec-row" + (sel ? " is-selected" : "") + (state.drawer === r.sku ? " is-open" : "");
    r._check.firstChild.checked = sel;
    el.textContent = "";
    el.appendChild(r._check);
    cols.forEach(function (c) {
      if (c.key !== "product") { if (r._cells[c.key]) el.appendChild(r._cells[c.key]); return; }
      // two lines at most: the name, then the feel with the "Check" tag (ungrouped); grouped rows show the feel with the tag on one line
      var main = m && grouped ? (r.feel || "One feel") : r.name, sub = m && !grouped ? (r.feel || "One feel") : "";
      var tag = r.notes && r.notes.length ? '<span class="spec-tag spec-tag--note" title="' + esc(r.notes.join(" ")) + '">Check</span>' : "";
      r._product.innerHTML = '<span class="spec-product"><span class="spec-product__line"><span class="spec-product__name">' + esc(main) + "</span>" + (sub ? "" : tag) + "</span>" +
        (sub ? '<span class="spec-product__line spec-product__line--sub"><span class="spec-product__sub">' + esc(sub) + "</span>" + tag + "</span>" : "") + "</span>";
      el.appendChild(r._product);
    });
    el.appendChild(r._fill);
    el.appendChild(r._more);
    return el;
  }
  function renderTable() {
    var c = cat(), cols = visibleCols(), rows = filtered(), body = document.createDocumentFragment();
    var all = rows.length && rows.every(function (r) { return state.selected[r.sku]; }), some = rows.some(function (r) { return state.selected[r.sku]; });
    tableEl.setAttribute("aria-label", c.label + " specs, " + rows.length + " rows");
    var head = '<div class="spec-thead" role="rowgroup"><div class="spec-tr" role="row">' +
      '<div class="spec-th spec-th--check" role="columnheader"><input type="checkbox" class="spec-check" data-spec-all aria-label="Select all ' + rows.length + ' rows shown"' + (all ? " checked" : "") + "></div>" +
      cols.map(function (cc) {
        var dir = state.sort && state.sort.key === cc.key ? state.sort.dir : 0;
        var label = cc.key === "product" ? (isMattress() ? (state.group ? "Feel" : "Mattress") : "Product") : cc.label;
        return '<div class="spec-th' + (cc.key === "product" ? " spec-th--product" : "") + (cc.num ? " is-num" : "") + '" role="columnheader" aria-sort="' + (dir > 0 ? "ascending" : dir < 0 ? "descending" : "none") + '">' +
          '<button type="button" class="spec-sort' + (dir ? " is-sorted" : "") + '" data-spec-sort="' + cc.key + '"><span class="spec-sort__text"><span' + (cc.wrapLabel ? ' class="spec-th__label--wrap"' : "") + ">" + esc(label) + "</span>" +
          (cc.unit ? '<span class="spec-th__unit">' + esc(cc.unit) + "</span>" : "") + "</span>" + sortIcon(dir) + "</button></div>";
      }).join("") + '<div class="spec-th spec-th--fill" aria-hidden="true"></div><div class="spec-th spec-th--more" role="columnheader"><span class="visually-hidden">Details</span></div></div></div>';
    if (state.group) {
      var order = [], groups = {};
      c.rows.forEach(function (r) { if (!groups[r.name]) { groups[r.name] = []; order.push(r.name); } });
      rows.forEach(function (r) { groups[r.name].push(r); });
      order.forEach(function (name) { var g = groups[name]; if (!g.length) return; body.appendChild(groupRow(name, g, cols.length + 3)); g.forEach(function (r) { body.appendChild(placeRow(r, cols, true)); }); });
    } else rows.forEach(function (r) { body.appendChild(placeRow(r, cols, false)); });
    tableEl.innerHTML = head + '<div class="spec-tbody" role="rowgroup"></div>';
    tableEl.lastChild.appendChild(body);
    var allBox = tableEl.querySelector("[data-spec-all]"); if (allBox) allBox.indeterminate = !all && some;
    tableEl.hidden = !rows.length; emptyEl.hidden = !!rows.length;
    var count = rows.length + " of " + c.rows.length + " SKUs", el = filtersEl.querySelector("[data-spec-count]");
    if (el) el.innerHTML = "<b>" + rows.length + "</b> of " + c.rows.length + " SKUs";
    say(count + " shown");
    syncSelection(rows);
    syncExportLabels(rows);
    writeUrl();
  }
  function syncSelection(rows) {
    var n = Object.keys(state.selected).length;
    selBar.hidden = !n;
    selCount.textContent = n + (n === 1 ? " row selected" : " rows selected");
    var allBox = tableEl.querySelector("[data-spec-all]");
    if (allBox && rows) { var all = rows.length && rows.every(function (r) { return state.selected[r.sku]; }); allBox.checked = !!all; allBox.indeterminate = !all && rows.some(function (r) { return state.selected[r.sku]; }); }
  }
  function syncExportLabels(rows) {
    var n = rows.length, lc = dlg.querySelector('[data-spec-export-label="copy"]'), ld = dlg.querySelector('[data-spec-export-label="csv"]');
    if (lc && !lc.hasAttribute("data-busy")) lc.textContent = "Copy " + n + (n === 1 ? " row" : " rows");
    if (ld && !ld.hasAttribute("data-busy")) ld.textContent = "Download CSV";
  }

  /* ------------------------------------------------------------------ details panel */
  function productHref(r) { return "/mattresses/" + slugOf(r.product); }
  function dl(pairs) {
    pairs = pairs.filter(function (p) { return p[1] !== "" && p[1] != null; });
    return pairs.length ? '<dl class="spec-dl">' + pairs.map(function (p) { return "<div><dt>" + esc(p[0]) + "</dt><dd>" + (p[2] ? p[1] : esc(p[1])) + "</dd></div>"; }).join("") + "</dl>" : "";
  }
  function copyable(v, what) {
    return '<span class="spec-copyable"><span class="spec-val is-mono">' + esc(v) + '</span><button type="button" class="spec-copy" data-spec-copy="' + esc(v) + '" data-spec-copy-what="' + esc(what) + '" aria-label="Copy ' + esc(what) + " " + esc(v) + '">' + ICON.copy + "</button></span>";
  }
  function section(title, inner, extra) {
    return inner ? '<section class="spec-drawer__section"><div class="spec-drawer__section-head"><h4 class="spec-drawer__h">' + esc(title) + "</h4>" + (extra || "") + "</div>" + inner + "</section>" : "";
  }
  function detailsText(r) {
    var m = isMattress(), lines = [r.name + (m && r.feel ? " " + r.feel : "") + ", " + (r.size || "One size") + (r.color ? ", " + r.color : "")];
    lines.push("SKU " + r.sku);
    if (r.upc) lines.push("UPC " + r.upc);
    if (r.part) lines.push("Part number " + r.part);
    if (r.msrp != null) lines.push("MSRP " + money(r.msrp));
    if (trio(r.dims)) lines.push("Mattress " + trio(r.dims) + " in (W x L x H)");
    if (trio(r.box)) lines.push("Box " + trio(r.box) + " in (L x W x H)" + (r.weight != null ? ", " + lb(r.weight) : ""));
    var build = [r.construction, r.layers != null && r.layers !== "" ? r.layers + " layers" : "", r.coil, r.cover ? r.cover + " cover" : ""].filter(Boolean).join(", ");
    if (build) lines.push("Build " + build);
    if (r.origin) lines.push("Made in " + r.origin);
    if (r.warranty) lines.push("Warranty " + r.warranty);
    lines.push("Source: " + DATA.source + "; MSRP: " + DATA.msrpSource);
    return lines.join("\n");
  }
  function listingText(r) {
    return [r.title, (r.bullets || []).map(function (b) { return "- " + b; }).join("\n"), r.description].filter(Boolean).join("\n\n");
  }
  function drawerHtml(r) {
    var m = isMattress(), img = r.img || "";
    var title = r.name + (m && r.feel ? " " + r.feel : ""), sub = [r.size || "One size", r.color].filter(Boolean).join(" · ");
    var h = '<div class="spec-drawer__head"><div class="spec-drawer__heading"><p class="spec-drawer__eyebrow">' + esc(cat().label) + "</p>" +
      '<h3 class="spec-drawer__title" id="spec-drawer-title" tabindex="-1" data-spec-drawer-title>' + esc(title) + '</h3><p class="spec-drawer__sub">' + esc(sub) + "</p></div>" +
      '<button type="button" class="page-dialog__close" aria-label="Close details" data-spec-drawer-close>' + ICON.close + "</button></div>";
    h += '<div class="spec-drawer__scroll">';
    if (img) h += '<div class="spec-drawer__media"><img src="' + esc(img) + '" alt="' + esc(title) + '" decoding="async"></div>';
    h += '<div class="spec-drawer__actions"><button type="button" class="page-action" data-spec-copy-details>' + ICON.copy.replace('width="14" height="14"', 'class="page-action__icon" width="16" height="16"') +
      '<span class="page-action__label">Copy all details</span></button>' + (m && r.product ? '<a class="page-action" href="' + esc(productHref(r)) + '" data-spec-goto><span class="page-action__label">Open product page</span></a>' : "") + "</div>";
    if (r.notes && r.notes.length) h += '<div class="spec-note" role="note"><p class="spec-note__title">Check before you use this row</p><ul>' + r.notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul></div>";
    h += section("Identifiers", dl([["SKU", copyable(r.sku, "SKU"), true], ["UPC", r.upc ? copyable(r.upc, "UPC") : "", true], ["Part number", r.part || ""]]));
    h += section("Price", dl([["MSRP", money(r.msrp)]]) + (r.msrp != null ? '<p class="spec-drawer__fine">' + esc(m && r.product ? DATA.msrpSource : "List Price in the ecommerce guide") + "</p>" : ""));
    h += section("Size and shipping", dl([["Mattress", trio(r.dims) ? trio(r.dims) + " in (W × L × H)" : ""], ["Box", trio(r.box) ? trio(r.box) + " in (L × W × H)" : ""], ["Box weight", lb(r.weight)]]));
    if (m) h += section("Build", dl([["Build", r.construction], ["Layers", r.layers], ["Coil", r.coil], ["Cover", r.cover], ["Top", [r.top, r.topMaterial].filter(Boolean).join(", ")]]));
    h += section("Details", dl([["Color", r.color], ["Pieces", r.pieces], ["Includes", (r.includes || []).join(", ")], ["Closure", r.closure], ["Water resistance", r.water], ["Made in", r.origin], ["Warranty", r.warranty]]));
    var lc = "";
    if (r.title) lc += '<p class="spec-listing__title">' + esc(r.title) + "</p>";
    if (r.bullets && r.bullets.length) lc += '<ul class="spec-listing__bullets">' + r.bullets.map(function (b) { return "<li>" + esc(b) + "</li>"; }).join("") + "</ul>";
    if (r.features && r.features.length) lc += '<p class="spec-listing__features">' + r.features.map(function (f) { return '<span class="spec-listing__feature">' + esc(f) + "</span>"; }).join("") + "</p>";
    if (r.description) lc += '<p class="spec-listing__desc">' + esc(r.description) + "</p>";
    if (r.keywords) lc += '<p class="spec-listing__keywords"><span>Search keywords</span>' + esc(r.keywords) + "</p>";
    h += section("Listing copy", lc, lc ? '<button type="button" class="spec-link" data-spec-copy-listing>Copy listing copy</button>' : "");
    h += '<p class="spec-drawer__fine spec-drawer__source">' + esc(DATA.source) + "</p></div>";
    return h;
  }
  function openDrawer(sku) {
    var r = findRow(sku); if (!r) return;
    state.drawer = sku;
    drawerEl.innerHTML = drawerHtml(r);
    drawerEl.hidden = false;
    dlg.classList.add("has-drawer");
    [].forEach.call(tableEl.querySelectorAll(".spec-row.is-open"), function (tr) { tr.classList.remove("is-open"); });
    var tr = tableEl.querySelector('[data-spec-row="' + sku + '"]'); if (tr) tr.classList.add("is-open");
    var t = drawerEl.querySelector("[data-spec-drawer-title]"); if (t) t.focus({ preventScroll: true });
    say("Details for " + r.name + " " + (r.feel || "") + " " + (r.size || ""), true);
  }
  function closeDrawer(silent) {
    if (!state.drawer) return;
    var sku = state.drawer; state.drawer = null;
    drawerEl.hidden = true; drawerEl.innerHTML = ""; dlg.classList.remove("has-drawer");
    var tr = tableEl.querySelector('[data-spec-row="' + sku + '"]');
    if (tr) { tr.classList.remove("is-open"); if (!silent) { var b = tr.querySelector("[data-spec-open]"); if (b) b.focus(); } }
  }

  /* ------------------------------------------------------------------ copy and export */
  function copyText(text, done) {
    function fallback() {
      var ta = document.createElement("textarea"), ok = false;
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
      dlg.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      dlg.removeChild(ta); done(ok);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
  }
  function flash(btn, labelSel, text) {
    var label = labelSel ? btn.querySelector(labelSel) : null;
    if (label) { var idle = label.getAttribute("data-idle") || label.textContent; label.setAttribute("data-idle", idle); label.setAttribute("data-busy", ""); label.textContent = text;
      setTimeout(function () { label.removeAttribute("data-busy"); label.textContent = label.getAttribute("data-idle"); label.removeAttribute("data-idle"); syncExportLabels(filtered()); }, 1600); }
  }
  function table(rows) {
    var keys = LAYOUT[state.cat].cols, m = isMattress(), head = [], get = [];
    function add(l, f) { head.push(l); get.push(f); }
    keys.forEach(function (k) {
      if (k === "product") { add("Product", function (r) { return r.name; }); if (m) add("Feel", function (r) { return r.feel || ""; }); }
      else if (k === "dims") { ["W", "L", "H"].forEach(function (a, i) { add("Mattress " + a + " (in)", function (r) { return r.dims ? r.dims[i] : ""; }); }); }
      else if (k === "box") { ["L", "W", "H"].forEach(function (a, i) { add("Box " + a + " (in)", function (r) { return r.box ? r.box[i] : ""; }); }); }
      else if (k === "msrp") add("MSRP (USD)", function (r) { return r.msrp; });
      else if (k === "weight") add("Box weight (lb)", function (r) { return r.weight; });
      else if (k === "size") add("Size", function (r) { return r.size || "One size"; });
      else add(C[k].label, function (r) { return r[k]; });
    });
    add("Notes", function (r) { return (r.notes || []).join(" "); });
    return [head].concat(rows.map(function (r) { return get.map(function (g) { var v = g(r); return v == null ? "" : String(v); }); }));
  }
  function tsv(t) { return t.map(function (row) { return row.map(function (v) { return v.replace(/[\t\r\n]+/g, " "); }).join("\t"); }).join("\n"); }
  function csv(t) { return t.map(function (row) { return row.map(function (v) { return /[",\r\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; }).join(","); }).join("\r\n"); }
  function stamp() { var d = new Date(); return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }
  function download(text, name) {
    var url = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })), a = document.createElement("a");
    a.href = url; a.download = name; dlg.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }
  function exportRows(kind, btn) {
    var selected = /selected/.test(kind), rows = selected ? cat().rows.filter(function (r) { return state.selected[r.sku]; }) : filtered();
    if (!rows.length) return;
    var n = rows.length + (rows.length === 1 ? " row" : " rows");
    if (/^copy/.test(kind)) copyText(tsv(table(rows)), function (ok) {
      if (!selected) flash(btn, ".page-action__label", ok ? "Copied " + n : "Couldn’t copy");
      say(ok ? "Copied " + n + ". Paste into Excel or Google Sheets." : "Couldn’t copy: the browser blocked the clipboard.", true);
    });
    else {
      download(csv(table(rows)), "MLILY-specs-" + cat().label.toLowerCase().replace(/\s+/g, "-") + "-" + stamp() + ".csv");
      say("Downloaded " + n + " as CSV", true);
    }
  }

  /* ------------------------------------------------------------------ start, and the filters in the address */
  function renderAll() {
    renderTabs(); renderFilters(); renderTable();
    sourceEl.textContent = "Specs: " + DATA.source + " · MSRP: " + DATA.msrpSource;
  }
  function loadFailed() {
    tableEl.hidden = true; emptyEl.hidden = false;
    emptyEl.querySelector(".spec-empty__title").textContent = "The specs could not be loaded";
    emptyEl.querySelector(".spec-empty__text").textContent = "Please refresh the page.";
    emptyEl.querySelector("[data-spec-clear]").hidden = true;
    say("The specs could not be loaded", true);
  }
  /* The data comes from the page's Collection Lists: one per tab, plus the shared spec sheets */
  var CATEGORIES = [["mattress", "Mattresses"], ["base", "Adjustable bases"], ["pillow", "Pillows"], ["bedding", "Bedding"], ["protector", "Protectors"]];
  var SIZES = ["Twin", "Twin XL", "Full", "Queen", "King", "Cal King", "Split Head King", "Split King", "Split Cal King", "Standard", "Standard/Queen", "One size"];
  function value(root, key) {
    var el = root.querySelector('[data-col="' + key + '"]');
    return el && !el.classList.contains("w-dyn-bind-empty") ? el.textContent.trim() : "";
  }
  function lines(v) { return v.split(/\n+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function maybeNumber(v) { return v !== "" && !isNaN(v) ? Number(v) : v; }
  function triple(v) { var a = v ? v.split(/\s*x\s*/i).map(Number) : []; return a.length === 3 && a.every(isFinite) ? a : null; }
  function readSheets() {
    var out = {};
    [].forEach.call(source.querySelectorAll("[data-spec-sheets] [data-sheet]"), function (el) {
      var img = el.querySelector("img");
      out[el.getAttribute("data-sheet")] = {
        name: value(el, "name"), feel: value(el, "feel"), color: value(el, "color"), model: value(el, "model"), topMaterial: value(el, "topMaterial"),
        includes: lines(value(el, "includes")), bullets: lines(value(el, "bullets")), features: lines(value(el, "features")),
        description: value(el, "description"), keywords: value(el, "keywords"), img: img && !img.classList.contains("w-dyn-bind-empty") ? img.getAttribute("src") : ""
      };
    });
    return out;
  }
  function readRow(el, sheets) {
    var sheet = sheets[el.getAttribute("data-sheet")] || {}, slug = el.getAttribute("data-product") || "", r = {};
    Object.keys(sheet).forEach(function (k) { r[k] = sheet[k]; });
    ["sku", "upc", "title", "part", "origin", "warranty", "size", "construction", "coil", "cover", "top", "closure", "water"].forEach(function (k) { var v = value(el, k); if (v || !(k in r)) r[k] = v; });
    ["color", "feel", "name"].forEach(function (k) { var v = value(el, k); if (v) r[k] = v; });
    r.msrp = maybeNumber(value(el, "msrp")); if (r.msrp === "") r.msrp = null;
    r.weight = maybeNumber(value(el, "weight")); if (r.weight === "") r.weight = null;
    r.layers = maybeNumber(value(el, "layers")); r.pieces = maybeNumber(value(el, "pieces"));
    r.dims = triple(value(el, "dims")); r.box = triple(value(el, "box"));
    r.notes = lines(value(el, "notes"));
    if (slug) r.product = idOf(slug);
    r._el = el;
    return r;
  }
  function readData() {
    var sheets = readSheets();
    DATA = { source: "MLILY 2026 Ecommerce Guide (Universal), Oct 26", msrpSource: "MLILY Price Book 2026", sizeOrder: SIZES };
    SIZE_ORDER = SIZES;
    DATA.categories = CATEGORIES.map(function (c) {
      var rows = [].map.call(source.querySelectorAll('[data-spec-list="' + c[0] + '"] [data-sheet]'), function (el) { return readRow(el, sheets); });
      return { id: c[0], label: c[1], rows: rows };
    });
    DATA.categories.forEach(function (c) { state.cat = c.id; c.rows.forEach(prepareRow); });
    state.cat = "mattress";
    source.remove();
    return DATA.categories.some(function (c) { return c.rows.length; });
  }
  // Mattress links use the page's slug, other products their name: /find-specs?type=pillow&product=…&size=King,Queen
  function readUrl() {
    var p = new URLSearchParams(location.search), type = p.get("type");
    if (DATA.categories.some(function (c) { return c.id === type; })) state.cat = type;
    var wanted = p.get("product") || "", hit = cat().rows.filter(function (r) { return r.name === wanted || (r.product && r.product === idOf(wanted)); })[0];
    state.model = hit ? hit.name : "";
    state.feel = p.get("feel") || ""; state.build = p.get("build") || ""; state.q = p.get("q") || "";
    state.sizes = (p.get("size") || "").split(",").filter(Boolean);
  }
  function writeUrl() {
    var p = new URLSearchParams(), hit = state.model && cat().rows.filter(function (r) { return r.name === state.model; })[0];
    if (state.cat !== "mattress") p.set("type", state.cat);
    if (hit) p.set("product", hit.product ? slugOf(hit.product) : hit.name);
    if (state.feel) p.set("feel", state.feel);
    if (state.build) p.set("build", state.build);
    if (state.sizes.length) p.set("size", state.sizes.join(","));
    if (state.q) p.set("q", state.q);
    var query = p.toString();
    history.replaceState(null, "", location.pathname + (query ? "?" + query : ""));
  }
  // the top bar's search lists the mattresses too (on mattress pages it reads them from the index)
  function tellShell() {
    if (!window.MLILY_SHELL || !window.MLILY_SHELL.addProducts) return;
    var seen = {}, list = [];
    DATA.categories[0].rows.forEach(function (r) {
      if (!r.product || seen[r.product]) return;
      seen[r.product] = 1;
      list.push({ slug: slugOf(r.product), name: r.name, sub: (r.dims && r.dims[2] ? r.dims[2] + "” " : "") + (r.construction || "") });
    });
    window.MLILY_SHELL.addProducts(list);
  }
  function start() {
    if (!source || !readData()) { loadFailed(); return; }
    readUrl();
    renderAll();
    tellShell();
  }

  function toggleCols(open, focusBtn) {
    var btn = filtersEl.querySelector("[data-spec-cols-btn]"), menu = filtersEl.querySelector("[data-spec-cols-menu]");
    if (!btn || !menu) return;
    menu.hidden = !open; btn.setAttribute("aria-expanded", String(open));
    if (open) { var f = menu.querySelector("input"); if (f) f.focus(); } else if (focusBtn) btn.focus();
  }
  function switchTab(id, focus) {
    if (id === state.cat) return;
    state.cat = id; state.q = ""; state.model = ""; state.feel = ""; state.build = ""; state.sizes = []; state.sort = null; state.selected = {};
    closeDrawer(true);
    renderTabs(); renderFilters(); renderTable(); wrapEl.scrollTop = 0; wrapEl.scrollLeft = 0;
    if (focus) { var t = tabsEl.querySelector('[data-spec-tab="' + id + '"]'); if (t) t.focus(); }
  }
  function resetFilters() { state.q = ""; state.model = ""; state.feel = ""; state.build = ""; state.sizes = []; renderFilters(); renderTable(); }

  /* ------------------------------------------------------------------ events */
  dlg.addEventListener("click", function (e) {
    var t = e.target, b;
    if (!t.closest) return;
    if ((b = t.closest("[data-spec-tab]"))) { switchTab(b.getAttribute("data-spec-tab"), false); return; }
    if ((b = t.closest("[data-spec-size]"))) {
      var v = b.getAttribute("data-spec-size"), i = state.sizes.indexOf(v);
      if (!v) state.sizes = []; else if (i >= 0) state.sizes.splice(i, 1); else state.sizes.push(v);
      syncFilterUI(); renderTable(); return;
    }
    if ((b = t.closest("[data-spec-clear]"))) { resetFilters(); var s = filtersEl.querySelector("[data-spec-search]"); if (s) s.focus(); return; }
    if ((b = t.closest("[data-spec-filters-toggle]"))) { var openF = b.getAttribute("aria-expanded") !== "true"; b.setAttribute("aria-expanded", String(openF)); filtersEl.classList.toggle("is-open", openF); return; }
    if ((b = t.closest("[data-spec-cols-btn]"))) { toggleCols(b.getAttribute("aria-expanded") !== "true"); return; }
    if ((b = t.closest("[data-spec-cols-reset]"))) { delete state.hidden[state.cat]; filtersEl.querySelector("[data-spec-cols-menu]").innerHTML = columnsMenu(); renderTable(); return; }
    var menu = filtersEl.querySelector("[data-spec-cols-menu]");
    if (menu && !menu.hidden && !t.closest(".spec-cols")) toggleCols(false);
    if ((b = t.closest("[data-spec-sort]"))) {
      var key = b.getAttribute("data-spec-sort"), cur = state.sort && state.sort.key === key ? state.sort.dir : 0;
      state.sort = cur === 0 ? { key: key, dir: 1 } : cur === 1 ? { key: key, dir: -1 } : null;
      renderTable();
      var again = tableEl.querySelector('[data-spec-sort="' + key + '"]'); if (again) again.focus();
      return;
    }
    if ((b = t.closest("[data-spec-copy]"))) {
      var val = b.getAttribute("data-spec-copy"), what = b.getAttribute("data-spec-copy-what") || "";
      copyText(val, function (ok) {
        if (ok) { b.innerHTML = ICON.done; b.classList.add("is-done"); setTimeout(function () { b.innerHTML = ICON.copy; b.classList.remove("is-done"); }, 1500); }
        say(ok ? "Copied " + what + " " + val : "Couldn’t copy " + val, true);
      });
      return;
    }
    if ((b = t.closest("[data-spec-export]"))) { exportRows(b.getAttribute("data-spec-export"), b); return; }
    if ((b = t.closest("[data-spec-select-clear]"))) { state.selected = {}; renderTable(); return; }
    if ((b = t.closest("[data-spec-drawer-close]"))) { closeDrawer(); return; }
    if ((b = t.closest("[data-spec-copy-details]"))) { var r1 = findRow(state.drawer); if (r1) copyText(detailsText(r1), function (ok) { flash(b, ".page-action__label", ok ? "Copied" : "Couldn’t copy"); say(ok ? "Copied the details" : "Couldn’t copy", true); }); return; }
    if ((b = t.closest("[data-spec-copy-listing]"))) { var r2 = findRow(state.drawer); if (r2) copyText(listingText(r2), function (ok) { b.textContent = ok ? "Copied" : "Couldn’t copy"; setTimeout(function () { b.textContent = "Copy listing copy"; }, 1600); say(ok ? "Copied the listing copy" : "Couldn’t copy", true); }); return; }
    if (t.closest("[data-spec-goto]")) return;   // an ordinary link to the product page
    if ((b = t.closest("[data-spec-open]"))) { var sku = b.getAttribute("data-spec-open"); if (state.drawer === sku) closeDrawer(); else openDrawer(sku); return; }
    // a click anywhere else on a row opens its details (checkboxes, copy buttons and links keep their own job)
    var row = t.closest(".spec-row");
    if (row && !t.closest("input, button, a, label")) { var s2 = row.getAttribute("data-spec-row"); if (state.drawer === s2) closeDrawer(true); else openDrawer(s2); }
  });
  dlg.addEventListener("change", function (e) {
    var t = e.target;
    if (t.matches("[data-spec-filter]")) { state[t.getAttribute("data-spec-filter")] = t.value; syncFilterUI(); renderTable(); return; }
    if (t.matches("[data-spec-group]")) { state.group = t.checked; renderTable(); return; }
    if (t.matches("[data-spec-col]")) { hiddenMap()[t.getAttribute("data-spec-col")] = !t.checked; renderTable(); return; }
    if (t.matches("[data-spec-all]")) { filtered().forEach(function (r) { if (t.checked) state.selected[r.sku] = true; else delete state.selected[r.sku]; }); renderTable(); var a = tableEl.querySelector("[data-spec-all]"); if (a) a.focus(); return; }
    if (t.matches("[data-spec-check]")) {
      var sku = t.getAttribute("data-spec-check");
      if (t.checked) state.selected[sku] = true; else delete state.selected[sku];
      var tr = t.closest(".spec-row"); if (tr) tr.classList.toggle("is-selected", t.checked);
      syncSelection(filtered());
    }
  });
  dlg.addEventListener("input", function (e) {
    if (!e.target.matches("[data-spec-search]")) return;
    state.q = e.target.value;
    clearTimeout(typeTimer);
    typeTimer = setTimeout(function () { syncFilterUI(); renderTable(); }, 120);
  });
  dlg.addEventListener("keydown", function (e) {
    var t = e.target;
    // Esc closes the open layer: the Columns menu, then the details
    if (e.key === "Escape" && !(t.matches && t.matches("[data-spec-search]") && t.value)) {
      var menu = filtersEl.querySelector("[data-spec-cols-menu]");
      if (menu && !menu.hidden) { e.preventDefault(); toggleCols(false, true); return; }
      if (state.drawer) { e.preventDefault(); closeDrawer(); return; }
    }
    // "/" jumps to the search from anywhere in the table
    if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey && !(t.matches && t.matches("input, select, textarea"))) {
      var s = filtersEl.querySelector("[data-spec-search]"); if (s) { e.preventDefault(); s.focus(); s.select(); } return;
    }
    if (t.matches && t.matches("[data-spec-search]") && e.key === "Escape" && t.value) { e.preventDefault(); e.stopPropagation(); t.value = ""; state.q = ""; syncFilterUI(); renderTable(); return; }
    if (t.matches && t.matches("[data-spec-tab]") && /^(ArrowLeft|ArrowRight|Home|End)$/.test(e.key)) {
      e.preventDefault();
      var ids = DATA.categories.map(function (c) { return c.id; }), i = ids.indexOf(state.cat);
      i = e.key === "Home" ? 0 : e.key === "End" ? ids.length - 1 : (i + (e.key === "ArrowRight" ? 1 : -1) + ids.length) % ids.length;
      switchTab(ids[i], true);
    }
  });

  // a line on the sticky product column only once the table has scrolled sideways under it
  wrapEl.addEventListener("scroll", function () { wrapEl.classList.toggle("is-scrolled-x", wrapEl.scrollLeft > 0); }, { passive: true });

  start();
  window.MLILY_SPEC_TABLE = { data: function () { return DATA; } };
})();
