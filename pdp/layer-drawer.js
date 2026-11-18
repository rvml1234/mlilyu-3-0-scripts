/* MLILY U 3.0, the layer drawer: opening a row of Layers on a mattress page. The prototype's drawer (js/product-page.js, css/layer-drawer.css), reading the Webflow pages.
   A modal <dialog> on the right: Esc, the dimmed page and the close button shut it, the arrow keys and the buttons step through the layers, the page behind stays put.
   Everything comes from the mattress pages themselves (the CMS), so there is no second copy: this page for the layer, the other mattress pages for "Also in".
   Loaded by pdp.js the first time a row is wanted. */
(function () {
  "use strict";
  var PAGES = {
    "wellflex": "https://mlilyusa.com/products/wellflex-memory-foam-mattress",
    "wellflex-ice": "https://mlilyusa.com/products/wellflex-ice-memory-foam-mattress",
    "chiropro": "https://mlilyusa.com/products/chiropro-tri-zoned-hybrid-mattress",
    "midnight": "https://mlilyusa.com/products/midnight-hybrid-mattress",
    "midnight-ice": "https://mlilyusa.com/products/midnight-ice-hybrid-mattress",
    "powercool-pro": "https://mlilyusa.com/products/powercool-sleep-system",
    "the-dream": "https://mlilyusa.com/products/manchester-united-dream-memory-foam-mattress"
  };
  function svg(d) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + d + "</svg>"; }
  var ICON = { prev: svg('<path d="m15 18-6-6 6-6"/>'), next: svg('<path d="m9 18 6-6-6-6"/>'), close: svg('<path d="M18 6 6 18M6 6l12 12"/>'), out: svg('<path d="M7 17 17 7M8 7h9v9"/>') };
  var slug = document.documentElement.getAttribute("data-wf-item-slug") || location.pathname.split("/").pop();
  var ldr = null, ctx = null, at = 0, others = null, here = null;

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function marks(s) { return esc(s).replace(/®/g, '<span class="reg-mark">®</span>'); }
  function all(root, sel) { return [].slice.call(root.querySelectorAll(sel)); }
  function text(el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; }
  function src(img) {
    if (!img || img.classList.contains("w-dyn-bind-empty")) return "";
    var s = img.getAttribute("src") || "";
    return /placeholder/.test(s) ? "" : s;
  }

  /* ---- reading a mattress page ---- */
  function readRow(item) {
    var full = text(item.querySelector(".layers__name")), m = /^([\d.]+)\s*[”"″]\s+(.+)$/.exec(full), name = m ? m[2] : full;
    return { name: name, inch: m ? m[1] + "”" : "", cover: !m && /cover/i.test(name), text: text(item.querySelector(".layers__desc")), img: src(item.querySelector(".layers__piece")) };
  }
  function readPage(doc, pageSlug) {
    var labels = all(doc, ".layers__feel").map(text), hero = src(doc.querySelector(".product-hero__image")), pics = {};
    all(doc, ".variant-card").forEach(function (c) { pics[text(c.querySelector(".variant-card__title"))] = src(c.querySelector(".variant-card__picture")); });
    var lists = [doc.querySelector(".layers__lists .w-dyn-list:not(.layers__alt)"), doc.querySelector(".layers__alt")];
    var stacks = [];
    lists.forEach(function (list, i) {
      var rows = list ? all(list, ".layers__item").map(readRow).filter(function (r) { return r.name; }) : [];
      if (rows.length) stacks.push({ index: i, feel: labels[i] || "", pic: pics[labels[i]] || hero, photo: !pics[labels[i]], rows: rows });
    });
    return { slug: pageSlug, name: text(doc.querySelector(".product-hero__title")), stacks: stacks, multi: stacks.length > 1 };
  }
  function loadOthers() {
    if (others) return others;
    var slugs = all(document, ".side-index__product[data-slug]").map(function (a) { return a.getAttribute("data-slug"); }).filter(function (s) { return s && s !== slug; });
    others = Promise.all(slugs.map(function (s) {
      return fetch("/mattresses/" + s).then(function (r) {
        if (!r.ok) throw new Error("page");
        return r.text();
      }).then(function (html) { return readPage(new DOMParser().parseFromString(html, "text/html"), s); }).catch(function () { return null; });
    })).then(function (pages) {
      var found = pages.filter(Boolean);
      if (!found.length) others = null;   // try again next time the drawer opens
      return { pages: found, complete: found.length === pages.length };
    });
    return others;
  }

  /* ---- what a layer is, and where else it is used ---- */
  function role(r) { return r.cover ? "Cover" : (/Springs|Base Foam/.test(r.name) ? "Support core" : "Comfort layer"); }
  function usesIn(page, name) {
    var out = [];
    page.stacks.forEach(function (st) { st.rows.forEach(function (r) { if (r.name === name) out.push({ st: st, r: r }); }); });
    return out;
  }
  function usedIn(page, us) {
    if (!page.multi) return us[0].r.inch || role(us[0].r);
    var same = us.every(function (u) { return u.r.inch === us[0].r.inch; });
    if (us.length === page.stacks.length && same) return (us.length === 2 ? "Both feels" : "Every feel") + (us[0].r.inch ? " · " + us[0].r.inch : "");
    return us.map(function (u) { return u.st.feel + (u.r.inch ? " · " + u.r.inch : ""); }).join(", ");
  }

  /* ---- drawing ---- */
  function barHtml() {
    var n = ctx.st.rows.length;
    return '<div class="ldr__bar"><p class="ldr__crumb"><span data-ldr-pos>Layer ' + (at + 1) + " of " + n + '</span><span class="ldr__ctx">' + esc(ctx.name) + "</span></p>" +
      '<button type="button" class="ldr__icon" data-ldr-step="-1" aria-label="Previous layer" aria-disabled="' + (at === 0) + '">' + ICON.prev + "</button>" +
      '<button type="button" class="ldr__icon" data-ldr-step="1" aria-label="Next layer" aria-disabled="' + (at === n - 1) + '">' + ICON.next + "</button>" +
      '<button type="button" class="ldr__icon" data-ldr-close aria-label="Close">' + ICON.close + "</button></div>";
  }
  function mediaHtml() {
    return '<figure class="ldr__media"><div class="ldr__stack" data-ldr-stack>' + ctx.st.rows.map(function (r, i) {
      return '<span class="ldr__band" data-ldr-go="' + i + '" title="' + esc(r.name) + '"><img src="' + esc(r.img) + '" alt="" decoding="async"></span>';
    }).join("") + '<span class="ldr__tag" aria-hidden="true"></span></div><figcaption class="sh-vh" data-ldr-cap></figcaption></figure>';
  }
  function feelStat(r) {
    var mine = usesIn(here, r.name);
    if (mine.length >= here.stacks.length) return mine.length === 2 ? "Both" : "All";
    return mine.map(function (u) { return u.st.feel.split(" ")[0]; }).join(" and ") + " only";
  }
  function bodyHtml() {
    var r = ctx.st.rows[at], stats = [];
    if (r.inch) stats.push("<div class=\"ldr__stat\"><dt>Thickness</dt><dd>" + esc(r.inch) + "</dd></div>");
    if (here.multi) stats.push('<div class="ldr__stat"><dt>' + esc(here.name) + " feels</dt><dd>" + esc(feelStat(r)) + "</dd></div>");
    stats.push('<div class="ldr__stat"><dt data-ldr-count-label>MLILY mattresses</dt><dd data-ldr-count>–</dd></div>');
    var source = PAGES[slug] ? '<p class="ldr__small">MLILY’s description, from <a href="' + esc(PAGES[slug]) + '" target="_blank" rel="noopener">mlilyusa.com' + ICON.out + '<span class="sh-vh"> (opens in a new tab)</span></a></p>' : "";
    return '<header class="ldr__head"><h2 class="ldr__title" id="ldr-title" tabindex="-1">' + marks(r.name) + "</h2>" +
      '<p class="ldr__meta"><span>' + esc(role(r)) + "</span><span>" + esc(ctx.name) + "</span></p></header>" +
      '<dl class="ldr__stats">' + stats.join("") + "</dl>" +
      '<section class="ldr__sec" aria-labelledby="ldr-about"><h3 class="ldr__h3" id="ldr-about">About</h3>' + (r.text ? '<p class="ldr__text">' + marks(r.text) + "</p>" : "") + source + "</section>" +
      '<section class="ldr__sec" aria-labelledby="ldr-also"><h3 class="ldr__h3" id="ldr-also">Also in</h3><div data-ldr-also><p class="ldr__text">Checking the other mattresses…</p></div></section>';
  }
  function fillAlso() {
    var wanted = at;
    loadOthers().then(function (res) {
      if (!ldr.open || wanted !== at) return;
      var name = ctx.st.rows[at].name, groups = [];
      res.pages.forEach(function (p) { var us = usesIn(p, name); if (us.length) groups.push({ page: p, us: us }); });
      var box = ldr.querySelector("[data-ldr-also]"), count = ldr.querySelector("[data-ldr-count]"), label = ldr.querySelector("[data-ldr-count-label]");
      if (!res.pages.length) { box.innerHTML = '<p class="ldr__text">The other mattresses could not be checked.</p>'; return; }
      count.textContent = String(groups.length + 1) + (res.complete ? "" : "+");
      label.textContent = groups.length ? "MLILY mattresses" : "MLILY mattress";
      box.innerHTML = groups.length ? '<ul class="ldr__cards">' + groups.map(function (g) {
        var st = g.us[0].st;
        return '<li><a class="ldr__card" href="/mattresses/' + esc(g.page.slug) + '"><span class="ldr__pic' + (st.photo ? " ldr__pic--photo" : "") + '">' + (st.pic ? '<img src="' + esc(st.pic) + '" alt="" decoding="async">' : "") + "</span>" +
          '<span class="ldr__card-name">' + esc(g.page.name) + '</span><span class="ldr__card-line">' + esc(usedIn(g.page, g.us)) + "</span></a></li>";
      }).join("") + "</ul>" : '<p class="ldr__text">No other MLILY mattress has this layer.</p>';
    });
  }
  // the current layer at full strength, its thickness beside it (the tag glides to it; placed without the glide when the drawer opens)
  function mark(first) {
    var bands = ldr.querySelectorAll(".ldr__band"), r = ctx.st.rows[at], tag = ldr.querySelector(".ldr__tag"), b = bands[at];
    [].forEach.call(bands, function (x, i) { x.classList.toggle("is-current", i === at); });
    tag.textContent = r.cover ? "Cover" : r.inch;
    if (first) tag.style.transition = "none";
    tag.style.top = (b.offsetTop + b.offsetHeight / 2) + "px";
    if (first) { void tag.offsetWidth; tag.style.transition = ""; }
    ldr.querySelector("[data-ldr-cap]").textContent = "The " + ctx.name + ", top to bottom: " + r.name + " is layer " + (at + 1) + " of " + ctx.st.rows.length + ".";
  }
  // the stack is drawn to scale, so its proportions come from the images themselves
  function sizeStack() {
    var stack = ldr.querySelector("[data-ldr-stack]"), imgs = all(stack, "img");
    return Promise.all(imgs.map(function (img) {
      return img.complete ? null : new Promise(function (done) { img.onload = img.onerror = done; });
    })).then(function () {
      if (!ldr.open || !stack.isConnected) return;
      var scale = imgs.reduce(function (sum, img) { return sum + (img.naturalWidth ? img.naturalHeight / img.naturalWidth : 0); }, 0);
      if (scale) stack.style.setProperty("--ar", (1 / scale).toFixed(4));
      stack.classList.add("is-ready");
      mark(true);
    });
  }

  /* ---- open, step, close ---- */
  function go(i) {
    var n = ctx.st.rows.length;
    if (i < 0 || i >= n || i === at) return;
    at = i;
    ldr.querySelector("[data-ldr-pos]").textContent = "Layer " + (i + 1) + " of " + n;
    var steps = ldr.querySelectorAll("[data-ldr-step]");
    steps[0].setAttribute("aria-disabled", String(i === 0));
    steps[1].setAttribute("aria-disabled", String(i === n - 1));
    ldr.querySelector("[data-ldr-body]").innerHTML = bodyHtml();
    ldr.querySelector("[data-ldr-scroll]").scrollTop = 0;
    mark(false);
    fillAlso();
    ldr.querySelector("[data-ldr-live]").textContent = "Layer " + (i + 1) + " of " + n + ": " + ctx.st.rows[i].name;
  }
  function close() {
    if (!ldr || !ldr.open || ldr.classList.contains("is-closing")) return;
    var finished = false;
    function shut() {
      if (finished) return;
      finished = true;
      ldr.classList.remove("is-closing");
      if (ldr.open) ldr.close();
      var row = ctx.buttons[at];   // back to the row of the layer you ended on
      if (row) row.focus({ preventScroll: true });
    }
    ldr.classList.add("is-closing");
    ldr.addEventListener("animationend", shut, { once: true });
    setTimeout(shut, 260);
  }
  // The page keeps its scrollbar and doesn't move: only the drawer's own content scrolls
  function holdPage() {
    function box() { return ldr.querySelector("[data-ldr-scroll]"); }
    ldr.addEventListener("wheel", function (e) {
      if (e.ctrlKey) return;
      var sc = box(), max = sc ? sc.scrollHeight - sc.clientHeight : 0;
      if (!sc || !sc.contains(e.target) || max <= 0 || (e.deltaY < 0 && sc.scrollTop <= 0) || (e.deltaY > 0 && sc.scrollTop >= max - 1)) e.preventDefault();
    }, { passive: false });
    ldr.addEventListener("touchmove", function (e) { var sc = box(); if (!sc || !sc.contains(e.target)) e.preventDefault(); }, { passive: false });
    ldr.addEventListener("keydown", function (e) {
      if (e.defaultPrevented || e.altKey || e.metaKey || e.ctrlKey) return;
      var t = e.target, sc = box();
      if (!sc) return;
      var page = sc.clientHeight * 0.85, by = { ArrowDown: 48, ArrowUp: -48, PageDown: page, PageUp: -page, Home: -sc.scrollHeight, End: sc.scrollHeight }[e.key];
      if (e.key === " " && !(t.closest && t.closest("button, a"))) by = e.shiftKey ? -page : page;
      if (by == null) return;
      e.preventDefault();
      sc.scrollBy({ top: by, behavior: Math.abs(by) > 48 && !matchMedia("(prefers-reduced-motion: reduce)").matches ? "smooth" : "auto" });
    });
  }
  function ensure() {
    if (ldr) return;
    ldr = document.createElement("dialog");
    ldr.className = "ldr";
    ldr.setAttribute("aria-labelledby", "ldr-title");
    document.body.appendChild(ldr);
    ldr.addEventListener("cancel", function (e) { e.preventDefault(); close(); });
    var downOut = false;
    ldr.addEventListener("mousedown", function (e) { downOut = e.target === ldr; });
    ldr.addEventListener("click", function (e) {
      var t = e.target, b;
      if (t === ldr) {   // the dimmed page, when the press started there too (a text selection dragged out of the drawer doesn't close it)
        var r = ldr.getBoundingClientRect();
        if (downOut && (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)) close();
        return;
      }
      if (t.closest("[data-ldr-close]")) close();
      else if ((b = t.closest("[data-ldr-step]"))) { if (b.getAttribute("aria-disabled") !== "true") go(at + +b.getAttribute("data-ldr-step")); }
      else if ((b = t.closest("[data-ldr-go]"))) go(+b.getAttribute("data-ldr-go"));
    });
    ldr.addEventListener("keydown", function (e) {
      if (e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); go(at + (e.key === "ArrowRight" ? 1 : -1)); }
    });
    holdPage();
  }
  function open(list, i) {
    ensure();
    here = here || readPage(document, slug);
    var index = list.classList.contains("layers__alt") ? 1 : 0, st = here.stacks.filter(function (s) { return s.index === index; })[0];
    if (!st) return;
    ctx = { st: st, name: here.name + (here.multi ? " " + st.feel : ""), buttons: all(list, ".layers__open") };
    at = Math.max(0, Math.min(i, st.rows.length - 1));
    ldr.classList.remove("is-closing");
    ldr.innerHTML = barHtml() + '<div class="ldr__scroll" data-ldr-scroll>' + mediaHtml() + "<div data-ldr-body>" + bodyHtml() + "</div></div>" + '<p class="sh-vh" aria-live="polite" data-ldr-live></p>';
    if (!ldr.open) ldr.showModal();
    ldr.querySelector(".ldr__title").focus({ preventScroll: true });
    sizeStack();
    fillAlso();
  }
  window.MLILY_LAYER_DRAWER = { open: open };
})();
