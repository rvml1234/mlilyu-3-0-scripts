/* MLILY U 3.0, product page dialogs (Find Specs for this mattress, Compare). Loaded by pdp.js the first time one opens.
   Find Specs loads find-specs/mattress/<slug>.js; the whole catalog lives on the Find Specs page. Compare reads the mattress pages. */
(function () {
  "use strict";
  var BASE = document.currentScript.src.replace(/[^/]*$/, "");
  var compareOpen = null, specsOpen = null;
  function pageSlug() { return document.documentElement.getAttribute("data-wf-item-slug") || location.pathname.split("/").pop(); }
  function pageName() { var t = document.querySelector(".product-hero__title"); return t ? t.textContent.replace(/\s+/g, " ").trim() : ""; }
  document.body.insertAdjacentHTML("beforeend", "<dialog class=\"mdl page-dialog page-dialog--compare\" aria-labelledby=\"compare-title\" data-compare-dialog><header class=\"page-dialog__head\"><h2 class=\"page-dialog__title\" id=\"compare-title\">Compare</h2><button type=\"button\" class=\"page-dialog__close\" data-dialog-close aria-label=\"Close\"><svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M3.5 3.5l9 9M12.5 3.5l-9 9\"/></svg></button></header><div class=\"page-dialog__body\"><div class=\"compare__pick\"><label class=\"compare__label\" for=\"compare-with\">Compare <span data-compare-current></span> with</label><span class=\"compare__select-wrap\"><select class=\"compare__select\" id=\"compare-with\" data-compare-select></select><svg class=\"compare__chev\" viewBox=\"0 0 16 16\" width=\"14\" height=\"14\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M4 6l4 4 4-4\"/></svg></span></div><table class=\"compare__table\" data-compare-table></table></div></dialog><dialog class=\"mdl page-dialog page-dialog--specs\" aria-labelledby=\"specs-title\" data-specs-dialog><header class=\"page-dialog__head\"><h2 class=\"page-dialog__title\" id=\"specs-title\" data-specs-title>Find Specs</h2><button type=\"button\" class=\"page-dialog__close\" data-dialog-close aria-label=\"Close\"><svg viewBox=\"0 0 16 16\" width=\"16\" height=\"16\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.75\" stroke-linecap=\"round\" aria-hidden=\"true\"><path d=\"M3.5 3.5l9 9M12.5 3.5l-9 9\"/></svg></button></header><div class=\"page-dialog__body specs-body\"><div class=\"specs-feels\" role=\"group\" aria-label=\"Feel\" data-specs-feels hidden></div><div data-specs-list></div><p class=\"specs-source\" data-specs-source></p></div><footer class=\"specs-foot\"><button type=\"button\" class=\"page-action page-action--primary\" data-specs-copy-table><span class=\"page-action__label\">Copy table</span></button><a class=\"page-action\" href=\"/find-specs\"><span class=\"page-action__label\">Open full Find Specs</span></a></footer><p class=\"visually-hidden\" role=\"status\" aria-live=\"polite\" data-specs-status></p></dialog>");

  /* ------------------------------------------------------------------ Find Specs, for this mattress
     A quick lookup: this mattress's sizes, one feel at a time. Everything else is on the Find Specs page. */
  (function () {
    var box = document.querySelector("[data-specs-dialog]");
    function $(sel) { return box.querySelector(sel); }
    var titleEl = $("[data-specs-title]"), feelsEl = $("[data-specs-feels]"), listEl = $("[data-specs-list]"), sourceEl = $("[data-specs-source]");
    var statusEl = $("[data-specs-status]");
    var COPY = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8.5" y="8.5" width="12" height="12"/><path d="M15.5 8.5v-5h-12v12h5"/></svg>';
    var DONE = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
    var CHEV = '<svg viewBox="0 0 16 16" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6l4 4 4-4"/></svg>';
    var data = null, feel = "", opener = null, loading = null;
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function money(n) { return n == null ? "" : "$" + Number(n).toLocaleString("en-US"); }
    function trio(a) { return a && a.length === 3 ? a.join(" × ") : ""; }
    function say(msg) { statusEl.textContent = msg; }
    function feels() { var out = []; data.rows.forEach(function (r) { if (r.feel && out.indexOf(r.feel) < 0) out.push(r.feel); }); return out; }
    function rows() { return data.rows.filter(function (r) { return !feel || r.feel === feel; }); }
    function code(v, what) {
      return v ? '<span class="specs-code"><span>' + esc(v) + '</span><button type="button" class="specs-copy" data-specs-copy="' + esc(v) + '" aria-label="Copy ' + what + " " + esc(v) + '">' + COPY + "</button></span>" : '<span class="specs-none">—</span>';
    }
    function fact(label, value) { return value ? "<div><dt>" + label + "</dt><dd>" + esc(value) + "</dd></div>" : ""; }
    function render() {
      var list = feels();
      feelsEl.hidden = list.length < 2;
      feelsEl.innerHTML = list.map(function (f) { return '<button type="button" class="specs-feel" aria-pressed="' + (f === feel) + '" data-specs-feel="' + esc(f) + '">' + esc(f) + "</button>"; }).join("");
      var body = rows().map(function (r, i) {
        var id = "specs-more-" + i, notes = r.notes || [];
        return '<tr class="specs-row"><th scope="row" data-specs-size>' + esc(r.size || "One size") + (notes.length ? '<span class="specs-check">Check</span>' : "") + "</th>" +
          '<td data-label="SKU">' + code(r.sku, "SKU") + '</td><td data-label="UPC">' + code(r.upc, "UPC") + '</td><td class="specs-msrp" data-label="MSRP">' + esc(money(r.msrp)) + "</td>" +
          '<td class="specs-toggle"><button type="button" class="specs-more" aria-expanded="false" aria-controls="' + id + '" aria-label="More about ' + esc(r.size || "this size") + '" data-specs-more>' + CHEV + "</button></td></tr>" +
          '<tr class="specs-detail" id="' + id + '" hidden><td colspan="5"><dl>' + fact("Mattress (W × L × H in)", trio(r.dims)) + fact("Box (L × W × H in)", trio(r.box)) + fact("Box weight", r.weight != null ? r.weight + " lb" : "") + fact("Part number", r.part) + "</dl>" +
          (notes.length ? '<ul class="specs-notes">' + notes.map(function (n) { return "<li>" + esc(n) + "</li>"; }).join("") + "</ul>" : "") + "</td></tr>";
      }).join("");
      listEl.innerHTML = '<table class="specs-table"><caption class="visually-hidden">' + esc(data.name + (feel ? " " + feel : "")) + ' specs by size</caption><thead><tr><th scope="col">Size</th><th scope="col">SKU</th><th scope="col">UPC</th><th scope="col" class="specs-msrp">MSRP</th><th scope="col"><span class="visually-hidden">More</span></th></tr></thead><tbody>' + body + "</tbody></table>";
    }
    function copyText(text, done) {
      function fallback() {
        var ta = document.createElement("textarea"), ok = false;
        ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
        box.appendChild(ta); ta.select();
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        box.removeChild(ta); done(ok);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(function () { done(true); }, fallback); else fallback();
    }
    function tableText() {
      var head = ["Mattress", "Feel", "Size", "SKU", "UPC", "MSRP (USD)", "Mattress W x L x H (in)", "Box L x W x H (in)", "Box weight (lb)"];
      return [head].concat(rows().map(function (r) {
        return [data.name, r.feel || "", r.size || "One size", r.sku, r.upc || "", r.msrp == null ? "" : r.msrp, trio(r.dims), trio(r.box), r.weight == null ? "" : r.weight];
      })).map(function (line) { return line.join("\t"); }).join("\n");
    }
    function load() {
      if (!data && window.MLILY_MATTRESS_SPECS) data = window.MLILY_MATTRESS_SPECS;   // pdp.js loads them for Copy page
      if (data) return Promise.resolve();
      if (!loading) loading = new Promise(function (resolve, reject) {
        var s = document.createElement("script");
        s.src = BASE + "../find-specs/mattress/" + pageSlug() + ".js";
        s.onload = function () { data = window.MLILY_MATTRESS_SPECS; resolve(); };
        s.onerror = function () { loading = null; s.remove(); reject(); };
        document.head.appendChild(s);
      });
      return loading;
    }
    box.addEventListener("click", function (e) {
      var t = e.target, b;
      if (t === box || (t.closest && t.closest("[data-dialog-close]"))) { box.close(); return; }
      if (!t.closest) return;
      if ((b = t.closest("[data-specs-feel]"))) { feel = b.getAttribute("data-specs-feel"); render(); feelsEl.querySelector('[aria-pressed="true"]').focus(); say(feel); return; }
      if ((b = t.closest("[data-specs-copy]"))) {
        var v = b.getAttribute("data-specs-copy");
        copyText(v, function (ok) {
          say(ok ? "Copied " + v : "Couldn’t copy " + v);
          if (ok) { b.innerHTML = DONE; b.classList.add("is-done"); setTimeout(function () { b.innerHTML = COPY; b.classList.remove("is-done"); }, 1500); }
        });
        return;
      }
      if ((b = t.closest("[data-specs-copy-table]"))) {
        var label = b.querySelector(".page-action__label");
        copyText(tableText(), function (ok) {
          label.textContent = ok ? "Copied" : "Couldn’t copy"; say(ok ? "Table copied. Paste it into Excel or Google Sheets." : "Couldn’t copy the table");
          setTimeout(function () { label.textContent = "Copy table"; }, 1600);
        });
        return;
      }
      var row = t.closest(".specs-row");
      if (row && !t.closest("button:not([data-specs-more])")) {
        var btn = row.querySelector("[data-specs-more]"), next = row.nextElementSibling, open = next.hidden;
        next.hidden = !open; btn.setAttribute("aria-expanded", String(open)); row.classList.toggle("is-open", open);
      }
    });
    box.addEventListener("close", function () { if (opener && opener.focus) opener.focus(); opener = null; });
    specsOpen = function (trigger) {
      opener = trigger || document.activeElement;
      return load().then(function () {
        titleEl.textContent = data.name + " specs";
        sourceEl.textContent = "Specs: " + data.source + " · MSRP: " + data.msrpSource;
        var list = feels();
        if (list.indexOf(feel) < 0) feel = list[0] || "";
        render();
        if (!box.open) box.showModal();
      });
    };
  })();

  /* ------------------------------------------------------------------ Compare
     Every fact comes from the mattress pages themselves (the CMS), so there is no second copy of them to keep up to date. */
  (function () {
    var box = document.querySelector("[data-compare-dialog]");
    var select = box.querySelector("[data-compare-select]"), table = box.querySelector("[data-compare-table]");
    var PAIR = { "wellflex": "wellflex-ice", "wellflex-ice": "wellflex", "midnight": "midnight-ice", "midnight-ice": "midnight", "chiropro": "midnight", "powercool-pro": "midnight-ice", "the-dream": "wellflex" };
    var pages = {}, opener = null, asked = 0;
    function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    function text(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
    function all(doc, sel) { return [].slice.call(doc.querySelectorAll(sel)); }
    function facts(doc) {
      function cell(label) {
        var hit = all(doc, ".facts__cell").filter(function (c) { return text(c.querySelector(".facts__label")) === label; })[0];
        return hit ? text(hit.querySelector(".facts__value")) : "";
      }
      var height = cell("Thickness").replace(/\s*in$/, "”"), feels = all(doc, ".variant-card__title").map(text).filter(Boolean);
      return {
        name: text(doc.querySelector(".product-hero__title")),
        rows: [
          ["Build", (height ? height + " " : "") + cell("Build")],
          ["Feels", feels.length ? feels.join(" · ") : "One feel"],
          ["Warranty", cell("Warranty")],
          ["Highlights", all(doc, ".icon-set__caption").map(text).filter(Boolean).join(", ")],
          ["Best for", text(doc.querySelector(".rail__best-for-text")) || "—"],
          ["Sizes", all(doc, ".facts__size").map(text).filter(Boolean).join(", ")],
          ["Ships", cell("Ships")]
        ]
      };
    }
    function load(slug) {
      if (!pages[slug]) pages[slug] = fetch("/mattresses/" + slug).then(function (r) {
        if (!r.ok) throw new Error("page");
        return r.text();
      }).then(function (html) { return facts(new DOMParser().parseFromString(html, "text/html")); });
      return pages[slug];
    }
    function render() {
      var ticket = ++asked, a = facts(document);
      table.setAttribute("aria-busy", "true");
      load(select.value).then(function (b) {
        if (ticket !== asked) return;
        var html = '<thead><tr><th scope="col"><span class="visually-hidden">Detail</span></th><th scope="col">' + esc(a.name) + '</th><th scope="col">' + esc(b.name) + "</th></tr></thead><tbody>";
        a.rows.forEach(function (row, i) {
          var other = b.rows[i][1];
          html += "<tr" + (row[1] !== other ? ' class="is-different"' : "") + '><th scope="row">' + esc(row[0]) + "</th><td>" + esc(row[1]) + "</td><td>" + esc(other) + "</td></tr>";
        });
        table.innerHTML = html + "</tbody>";
      }).catch(function () {
        delete pages[select.value];
        if (ticket === asked) table.innerHTML = '<tbody><tr><td>That mattress could not be loaded. Please try again.</td></tr></tbody>';
      }).then(function () { if (ticket === asked) table.removeAttribute("aria-busy"); });
    }
    select.addEventListener("change", render);
    box.addEventListener("click", function (e) { if (e.target === box || (e.target.closest && e.target.closest("[data-dialog-close]"))) box.close(); });
    box.addEventListener("close", function () { if (opener && opener.focus) opener.focus(); opener = null; });
    compareOpen = function (trigger) {
      var slug = pageSlug();
      box.querySelector("[data-compare-current]").textContent = pageName();
      select.innerHTML = all(document, ".side-index__product[data-slug]").filter(function (a) { return a.getAttribute("data-slug") !== slug; }).map(function (a) {
        var s = a.getAttribute("data-slug");
        return '<option value="' + esc(s) + '"' + (s === PAIR[slug] ? " selected" : "") + ">" + esc(text(a)) + "</option>";
      }).join("");
      render();
      opener = trigger || document.activeElement;
      if (!box.open) box.showModal();
    };
  })();


  window.MLILY_DIALOGS = {
    open: function (kind, trigger) {
      if (kind === "compare") { compareOpen(trigger); return Promise.resolve(); }
      return specsOpen(trigger);
    }
  };
})();
