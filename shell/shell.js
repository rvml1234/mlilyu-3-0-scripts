/* MLILY U 3.0 shell: the behaviour of the Webflow top bar and Mattress index (header.sh-top, aside.side-index on the Mattresses template).
   Same behaviour as the prototype (mlilyu-3-0-shell: js/shell.js, js/side-index.js, data/nav.js), rewritten for the Webflow markup.
   Webflow draws the bar and the index; this script adds what Webflow can't: the real search fields, the menus and overlays, and the
   states that follow the page. Styles for everything it adds: shell/shell.css. No server calls: search runs over the nav and the
   mattresses the page already lists.

   1  Links: library routes from the 3.0 sitemap (Draft E); mattress links from each index item's data-slug
   2  Search (top bar): a real field, "/" to focus, local results (mattresses, then pages), arrows + Enter, Esc
      Under 992 px the search icon opens it as a panel under the bar
   3  Menu drawer (☰): the library nav, utilities, language, sign out; Esc, Tab stays inside, focus returns
   4  Account menu: arrows, Home / End, Esc
   5  Theme button: pressed state and saved choice (the light theme isn't built in Webflow yet)
   6  Mattress index (992 px and up): the current mattress lists this page's sections; jump + scroll spy; search filters; ⌘K / Ctrl K
   7  Tablet and phone (under 992 px): a bar under the top bar once the title has scrolled past: switch mattress, jump to a section
   8  Tooltips on the icon buttons */
(function () {
  "use strict";
  var top = document.querySelector(".sh-top");
  if (!top) return;
  var root = document.documentElement;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  var mqDesk = window.matchMedia("(min-width: 992px)");
  var isMac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || "");
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function shown(n) { return !!n && n.getClientRects().length > 0; }
  function smooth() { return reduce.matches ? "auto" : "smooth"; }
  root.classList.add("sh-js");

  /* ---- nav (the prototype's data/nav.js; routes are the 3.0 sitemap's, Draft E) ------------------------------------------------------- */
  var NAV = {
    home: { id: "home", label: "Home", href: "/library", icon: "home" },
    groups: [
      { id: "learn", label: "Learn", items: [
        { id: "products", label: "Products", href: "/library/products", icon: "products", meta: "37 product pages", job: "Every product line, filtered by mattresses, bases, pillows and bedding." },
        { id: "training", label: "Training", href: "/library/training", icon: "training", meta: "27 videos", job: "Six training videos, one per mattress line, and 21 product videos in one list." } ] },
      { id: "sell", label: "Sell", items: [
        { id: "floor-tools", label: "Floor tools", href: "/library/floor-tools", icon: "floor", meta: "68 cards · Price Book", job: "Fillable price cards, spec cards, quick guides and manuals, some in French, plus the current Price Book." },
        { id: "display", label: "Display", href: "/library/display", icon: "display", meta: "13 pieces", job: "Display pieces with photos and sizes, and the display order request." },
        { id: "selling-online", label: "Selling online", href: "/library/selling-online", icon: "online", meta: "3 formats", job: "Shopify, BigCommerce and universal CSV and Excel files, with the MSRP and MAP online policy." } ] },
      { id: "market", label: "Market", items: [
        { id: "brand", label: "Campaigns & brand", href: "/library/brand", icon: "brand", meta: "551 photos · 68 icons", job: "Sale kits, photos, 3D models, icons, logos, fonts, colours, guidelines and templates." } ] }
    ],
    utilities: [
      { id: "whats-new", label: "What’s new", href: "/whats-new", icon: "new" },
      { id: "help", label: "Help", href: "/help", icon: "help" },
      { id: "portal", label: "Partner Portal", href: "https://mlily2020org.my.site.com", external: true, icon: "portal", job: "Stock orders and order questions." }
    ],
    account: { name: "Your store", note: "Shared login from your MLILY rep", language: { label: "Français", href: "/fr" }, signOut: { label: "Sign out", href: "/sign-out" } },
    search: { label: "Search products and files", key: "/" },
    extras: [
      { label: "Price Book", parent: "floor-tools", href: "/library/floor-tools/price-book", words: "price book msrp prices" },
      { label: "Display order request", parent: "display", href: "/library/display", words: "display order pop standee headboard" },
      { label: "Help request form", parent: "help", href: "/help", words: "help request login form contact" }
    ]
  };
  var ALL = [NAV.home].concat.apply([], NAV.groups.map(function (g) { return g.items; }));
  function byId(id) { for (var i = 0; i < ALL.length; i++) if (ALL[i].id === id) return ALL[i]; return null; }

  /* ---- icons (the prototype's set: 24 px grid, 1.5 stroke) ------------------------------------------------------------------------------- */
  var ICONS = {
    home: '<path d="M3.5 10.5 12 3.75l8.5 6.75"/><path d="M5.5 9v11h13V9"/><path d="M10 20v-5.25h4V20"/>',
    products: '<path d="M3 5v15"/><path d="M3 12.5h16a2 2 0 0 1 2 2V20"/><path d="M3 16.75h18"/><rect x="5.75" y="8.5" width="6" height="4" rx="1.5"/>',
    training: '<path d="M2.5 9.25 12 4.75l9.5 4.5-9.5 4.5z"/><path d="M6.25 11.5v4.25c0 1.4 2.6 2.75 5.75 2.75s5.75-1.35 5.75-2.75V11.5"/><path d="M21.5 9.25v5"/>',
    floor: '<rect x="4" y="6.5" width="12.5" height="14.5" rx="2"/><path d="M8 3.5h10a2 2 0 0 1 2 2v12"/><path d="M7.25 11h6M7.25 14.25h6M7.25 17.5h3.5"/>',
    display: '<path d="M4.75 4.5h14.5l1.75 5H3z"/><path d="M5 9.5V20h14V9.5"/><path d="M10 20v-5h4v5"/><path d="M3 20h18"/>',
    online: '<rect x="2.75" y="3.5" width="18.5" height="13.5" rx="2"/><path d="M9 21h6M12 17v4"/><path d="M7.25 7h1.5l1.3 5.25h5.6l1.1-3.6H9.15"/><circle cx="10.6" cy="14.3" r=".5"/><circle cx="15.1" cy="14.3" r=".5"/>',
    brand: '<path d="M4 9.5h3.5L15 5v14l-7.5-4.5H4z"/><path d="M7.5 14.5v4a1.5 1.5 0 0 0 3 0v-2.75"/><path d="M18.25 9.25a3.75 3.75 0 0 1 0 5.5"/>',
    "new": '<path d="M6.5 16.5V11a5.5 5.5 0 0 1 11 0v5.5l1.5 2h-14z"/><path d="M10 21h4"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.7 9.6a2.4 2.4 0 0 1 4.6 1c0 1.6-2.3 2.1-2.3 3.6"/><path d="M12 17.2v.1"/>',
    portal: '<rect x="3.5" y="6.5" width="17" height="13"/><path d="M8.5 6.5V4.5h7v2M3.5 11.5h17"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4 4"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>',
    moon: '<path d="M19.5 14.6A7.6 7.6 0 0 1 9.4 4.5a7.6 7.6 0 1 0 10.1 10.1z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
    caret: '<path d="m7 10 5 5 5-5"/>',
    selector: '<path d="m8 9.5 4-4 4 4M8 14.5l4 4 4-4"/>',
    language: '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.4 3.5 5.2 3.5 8.5s-1 6.1-3.5 8.5c-2.5-2.4-3.5-5.2-3.5-8.5s1-6.1 3.5-8.5z"/>',
    signout: '<path d="M14 4.5H5v15h9"/><path d="M10.5 12h10M17 8.5l3.5 3.5-3.5 3.5"/>'
  };
  function icon(name, cls) { return '<svg class="sh-icon' + (cls ? " " + cls : "") + '" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || "") + "</svg>"; }
  var EXT = '<svg class="sh-ext-js" viewBox="0 0 10 10" aria-hidden="true" focusable="false"><path d="M2 8 8 2M3.5 2H8v4.5"/></svg>';
  var TICK = '<svg class="sh-sheet__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

  /* ---- 1 links ------------------------------------------------------------------------------------------------------------------------ */
  var CUR = root.getAttribute("data-wf-item-slug") || "";
  var PRODUCTS = $$(".side-index__product[data-slug]").map(function (a) {
    return { slug: a.getAttribute("data-slug"), name: a.textContent.replace(/\s+/g, " ").trim(), sub: a.getAttribute("data-sub") || "", el: a };
  }).filter(function (p) { return p.slug; });
  function productHref(slug) { return "/mattresses/" + slug; }
  PRODUCTS.forEach(function (p) {
    p.el.setAttribute("href", productHref(p.slug));
    if (p.slug === CUR) p.el.setAttribute("aria-current", "page");
  });
  var current = PRODUCTS.filter(function (p) { return p.slug === CUR; })[0] || null;
  $$(".sh-home").forEach(function (a) { a.setAttribute("href", NAV.home.href); });
  $$(".page-crumbs__link").forEach(function (a) {
    a.setAttribute("href", byId("products").href);   // Products, and Mattresses (the Products page, mattresses first) until a type filter exists
  });
  $$(".sh-util[data-sh-link]").forEach(function (a) {
    var u = NAV.utilities.filter(function (x) { return x.id === a.getAttribute("data-sh-link"); })[0];
    if (u) a.setAttribute("href", u.href);
  });
  $$('.sh-util[href^="http"]').forEach(function (a) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener"); });

  // the bar's "#" links are buttons: no jump, a button role, Enter and Space
  var BTN = "[data-sh-menu], [data-sh-search], [data-sh-theme], [data-sh-account]";
  $$(BTN).forEach(function (b) { b.setAttribute("role", "button"); });
  document.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest(BTN); if (b) e.preventDefault(); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== " ") return;   // Enter already clicks a link
    var b = e.target.closest && e.target.closest(BTN);
    if (b) { e.preventDefault(); b.click(); }
  });

  /* ---- jumps land under the bars ------------------------------------------------------------------------------------------------------ */
  function topH() { return top.getBoundingClientRect().height || 64; }
  function jumpOffset() { return mqDesk.matches ? topH() : topH() + 48 + 16; }   // under 992 px: the 56 px bar + the 48 px PDP bar + 16
  function jumpTo(node) {
    if (!node) return;
    window.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top + window.scrollY - jumpOffset()), behavior: smooth() });
  }

  /* ---- section list (the left column's sections, as the index lists them) ------------------------------------------------------------- */
  var SECTIONS = $$(".side-index__section[href^='#']").map(function (a) {
    var id = a.getAttribute("href").slice(1);
    return { id: id, label: a.textContent.replace(/\s+/g, " ").trim(), link: a, li: a.closest("li") };
  });
  function nodeOf(s) { return document.getElementById(s.id); }
  function liveSections() { return SECTIONS.filter(function (s) { return shown(nodeOf(s)); }); }

  /* ---- layers: drawer and dropdown (Esc closes, Tab stays inside, focus goes back to the opener) -------------------------------------- */
  var openLayerEl = null, opener = null;
  function focusables(el) {
    return $$('a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])', el).filter(shown);
  }
  function openLayer(layer, from, focusEl) {
    if (openLayerEl) closeLayer(false);
    hideTip(); closeAccount(false); closeResults();
    openLayerEl = layer; opener = from || null;
    layer.hidden = false;
    if (layer.classList.contains("sh-drawer")) root.classList.add("sh-lock");
    if (opener) opener.setAttribute("aria-expanded", "true");
    void layer.offsetWidth;
    layer.classList.add("is-open");
    var f = focusEl || focusables(layer)[0];
    if (f) f.focus({ preventScroll: true });
    reveal();
  }
  function closeLayer(restore) {
    var layer = openLayerEl;
    if (!layer) return;
    openLayerEl = null;
    layer.classList.remove("is-open");
    root.classList.remove("sh-lock");
    var done = function () { if (!layer.classList.contains("is-open")) layer.hidden = true; };
    if (reduce.matches) done(); else setTimeout(done, 240);
    if (opener) { opener.setAttribute("aria-expanded", "false"); if (restore !== false && shown(opener)) opener.focus({ preventScroll: true }); }
    opener = null;
    reveal();
  }
  document.addEventListener("keydown", function (e) {
    if (!openLayerEl) return;
    if (e.key === "Escape") { e.preventDefault(); closeLayer(true); return; }
    if (e.key !== "Tab") return;
    var f = focusables(openLayerEl);
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  document.addEventListener("click", function (e) {
    var t = e.target;
    if (!t.closest) return;
    if (t.closest("[data-sh-close]")) { closeLayer(true); return; }
    if (openLayerEl && t.closest(".sh-drawer a[href], .sh-sheet a[href]")) closeLayer(false);   // following a link closes the layer
  });

  /* ---- 3 menu drawer ------------------------------------------------------------------------------------------------------------------- */
  var menuBtn = $("[data-sh-menu]");
  function itemHtml(it) {
    return '<li><a class="sh-item" href="' + esc(it.href) + '">' + icon(it.icon) + '<span class="sh-item__label">' + esc(it.label) + "</span></a></li>";
  }
  var homeEl = $(".sh-top .sh-home");
  var drawer = document.createElement("div");
  drawer.className = "sh-drawer"; drawer.id = "sh-drawer"; drawer.hidden = true;
  drawer.setAttribute("role", "dialog"); drawer.setAttribute("aria-modal", "true"); drawer.setAttribute("aria-label", "Library menu");
  drawer.innerHTML = '<div class="sh-drawer__scrim" data-sh-close></div><div class="sh-drawer__panel">' +
    '<div class="sh-drawer__head">' + (homeEl ? homeEl.outerHTML : "") + '<button type="button" class="sh-js-btn sh-js-btn--icon" aria-label="Close menu" data-sh-close>' + icon("close") + "</button></div>" +
    '<div class="sh-drawer__body"><nav aria-label="Library"><ul class="sh-list">' + itemHtml(NAV.home) + "</ul>" +
    NAV.groups.map(function (g) {
      return '<div class="sh-group" role="group" aria-labelledby="sh-g-' + g.id + '"><span class="sh-group__label" id="sh-g-' + g.id + '">' + esc(g.label) + '</span><ul class="sh-list">' + g.items.map(itemHtml).join("") + "</ul></div>";
    }).join("") + "</nav>" +
    '<div class="sh-drawer__section"><ul class="sh-list">' + NAV.utilities.map(function (u) {
      return '<li><a class="sh-item" href="' + esc(u.href) + '"' + (u.external ? ' target="_blank" rel="noopener"' : "") + ">" + icon(u.icon) + '<span class="sh-item__label">' + esc(u.label) +
        (u.external ? EXT + '<span class="sh-vh"> (opens in a new tab)</span>' : "") + "</span></a></li>";
    }).join("") + "</ul></div>" +
    '<div class="sh-drawer__section"><ul class="sh-list">' +
      '<li><button type="button" class="sh-item" data-sh-theme aria-pressed="true">' + icon("moon", "is-moon") + icon("sun", "is-sun") + '<span class="sh-item__label">Dark theme</span></button></li>' +
      '<li><a class="sh-item" href="' + esc(NAV.account.language.href) + '" lang="fr">' + icon("language") + '<span class="sh-item__label">' + esc(NAV.account.language.label) + "</span></a></li>" +
      '<li><a class="sh-item" href="' + esc(NAV.account.signOut.href) + '">' + icon("signout") + '<span class="sh-item__label">' + esc(NAV.account.signOut.label) + "</span></a></li></ul>" +
      '<p class="sh-drawer__note">' + esc(NAV.account.name) + " · " + esc(NAV.account.note) + "</p></div></div></div>";
  document.body.appendChild(drawer);
  $$(".sh-home", drawer).forEach(function (a) { a.removeAttribute("id"); });
  // the drawer's own Products row is where this page sits
  $$(".sh-item", drawer).forEach(function (a) { if (a.getAttribute("href") === byId("products").href) a.setAttribute("aria-current", "true"); });
  if (menuBtn) {
    menuBtn.setAttribute("aria-haspopup", "dialog"); menuBtn.setAttribute("aria-controls", "sh-drawer"); menuBtn.setAttribute("aria-expanded", "false");
    menuBtn.setAttribute("data-sh-tip", "Menu");
    menuBtn.addEventListener("click", function () { openLayer(drawer, menuBtn, $(".sh-item[aria-current]", drawer)); });
  }

  /* ---- 5 theme ------------------------------------------------------------------------------------------------------------------------- */
  // Webflow's build is the dark page only, so the choice is saved and shown but nothing re-colours yet.
  var THEME_KEY = "hvk-theme";
  if (!root.dataset.theme) root.dataset.theme = "dark";
  function syncTheme() {
    var dark = root.dataset.theme === "dark";
    $$("[data-sh-theme]").forEach(function (b) { b.setAttribute("aria-pressed", dark ? "true" : "false"); });
  }
  $$(".sh-top [data-sh-theme]").forEach(function (b) { b.setAttribute("data-sh-tip", "Dark theme"); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-sh-theme]");
    if (!b) return;
    var dark = root.dataset.theme !== "dark";
    root.dataset.theme = dark ? "dark" : "light";
    try { localStorage.setItem(THEME_KEY, dark ? "dark" : "light"); } catch (err) { /* private mode: this visit only */ }
    syncTheme();
  });

  /* ---- 4 account menu ------------------------------------------------------------------------------------------------------------------ */
  var acctBtn = $("[data-sh-account]"), acctMenu = null;
  function placeMenu() {
    if (!acctBtn || !acctMenu) return;
    var r = acctBtn.getBoundingClientRect();
    acctMenu.style.top = Math.round(r.bottom + 6) + "px";
    acctMenu.style.right = Math.round(document.documentElement.clientWidth - r.right) + "px";
  }
  function closeAccount(restore) {
    if (!acctMenu || acctMenu.hidden) return;
    acctMenu.hidden = true; acctBtn.setAttribute("aria-expanded", "false");
    if (restore) acctBtn.focus();
  }
  function openAccount(where) {
    hideTip(); closeResults();
    placeMenu();
    acctMenu.hidden = false; acctBtn.setAttribute("aria-expanded", "true");
    var items = $$('[role="menuitem"]', acctMenu);
    (where === "last" ? items[items.length - 1] : items[0]).focus();
  }
  if (acctBtn) {
    acctMenu = document.createElement("div");
    acctMenu.className = "sh-menu"; acctMenu.id = "sh-account-menu"; acctMenu.hidden = true;
    acctMenu.setAttribute("role", "menu"); acctMenu.setAttribute("aria-label", "Account");
    acctMenu.innerHTML = '<div class="sh-menu__head" role="none"><span class="sh-menu__name">' + esc(NAV.account.name) + '</span><span class="sh-menu__note">' + esc(NAV.account.note) + "</span></div>" +
      '<a class="sh-menu__item" role="menuitem" href="' + esc(NAV.account.language.href) + '" lang="fr">' + icon("language") + esc(NAV.account.language.label) + "</a>" +
      '<a class="sh-menu__item" role="menuitem" href="' + esc(NAV.account.signOut.href) + '">' + icon("signout") + esc(NAV.account.signOut.label) + "</a>";
    document.body.appendChild(acctMenu);
    acctBtn.setAttribute("aria-haspopup", "menu"); acctBtn.setAttribute("aria-expanded", "false"); acctBtn.setAttribute("aria-controls", "sh-account-menu");
    acctBtn.setAttribute("data-sh-tip", "Account");
    acctBtn.addEventListener("click", function () { if (acctMenu.hidden) openAccount("first"); else closeAccount(true); });
    acctBtn.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); openAccount(e.key === "ArrowDown" ? "first" : "last"); }
    });
    acctMenu.addEventListener("keydown", function (e) {
      var items = $$('[role="menuitem"]', acctMenu), i = items.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); items[(i + 1) % items.length].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
      else if (e.key === "Home") { e.preventDefault(); items[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); items[items.length - 1].focus(); }
      else if (e.key === "Escape") { e.preventDefault(); closeAccount(true); }
      else if (e.key === "Tab") closeAccount(false);
    });
    acctMenu.addEventListener("click", function (e) { if (e.target.closest("a")) closeAccount(false); });
    document.addEventListener("click", function (e) { if (!acctMenu.hidden && !e.target.closest("#sh-account-menu, [data-sh-account]")) closeAccount(false); });
    window.addEventListener("resize", function () { if (!acctMenu.hidden) placeMenu(); });
  }

  /* ---- 2 search ------------------------------------------------------------------------------------------------------------------------ */
  var searchBox = $("[data-sh-search-box]"), searchToggle = $("[data-sh-search]"), input = null, results = null;
  var INDEX = [];
  (function buildIndex() {
    var groupOf = {};
    NAV.groups.forEach(function (g) { g.items.forEach(function (it) { groupOf[it.id] = g.label; }); });
    PRODUCTS.forEach(function (p) {
      INDEX.push({ kind: "product", label: p.name, sub: p.sub || "Mattress", href: productHref(p.slug), icon: "products", words: (p.sub + " mattress").toLowerCase() });
    });
    INDEX.push({ kind: "page", label: "Library home", sub: "MLILY U", href: NAV.home.href, icon: "home", words: "home library start" });
    ALL.slice(1).forEach(function (it) { INDEX.push({ kind: "page", label: it.label, sub: groupOf[it.id] + " · " + it.meta, href: it.href, icon: it.icon, words: it.job || "" }); });
    NAV.extras.forEach(function (x) { var p = byId(x.parent); INDEX.push({ kind: "page", label: x.label, sub: p ? p.label : "MLILY U", href: x.href, icon: p ? p.icon : "help", words: x.words || "" }); });
    NAV.utilities.forEach(function (u) { INDEX.push({ kind: "page", label: u.label, sub: u.external ? "Opens in a new tab" : "MLILY U", href: u.href, icon: u.icon, words: u.job || "", external: !!u.external }); });
  })();
  var active = -1, shownHits = [];
  function score(it, q) {
    var l = it.label.toLowerCase(), w = (it.sub + " " + it.words).toLowerCase();
    if (l.indexOf(q) === 0) return 3;
    if (l.indexOf(q) > 0) return 2;
    if (w.indexOf(q) >= 0) return 1;
    return 0;
  }
  function renderResults() {
    var q = input.value.trim().toLowerCase();
    if (!q) { closeResults(); return; }
    var hits = INDEX.map(function (it) { return { it: it, s: score(it, q) }; }).filter(function (h) { return h.s > 0; }).sort(function (a, b) { return b.s - a.s; });
    var prods = hits.filter(function (h) { return h.it.kind === "product"; }).slice(0, 6);
    var pages = hits.filter(function (h) { return h.it.kind === "page"; }).slice(0, 6);
    shownHits = prods.concat(pages).map(function (h) { return h.it; });
    active = shownHits.length ? 0 : -1;
    var n = 0, html = "";
    function group(label, list) {
      if (!list.length) return;
      html += '<div role="group" aria-label="' + label + '"><p class="sh-results__label" aria-hidden="true">' + label + "</p>";
      list.forEach(function (h) {
        var it = h.it, i = n++;
        html += '<a class="sh-option' + (i === active ? " is-active" : "") + '" role="option" id="sh-opt-' + i + '" aria-selected="' + (i === active) + '" href="' + esc(it.href) + '"' +
          (it.external ? ' target="_blank" rel="noopener"' : "") + ' data-sh-opt="' + i + '" tabindex="-1">' + icon(it.icon) +
          '<span class="sh-option__text"><span class="sh-option__name">' + esc(it.label) + (it.external ? EXT : "") + '</span><span class="sh-option__sub">' + esc(it.sub) + "</span></span></a>";
      });
      html += "</div>";
    }
    group("Mattresses", prods);
    group("Pages", pages);
    if (!shownHits.length) html += '<p class="sh-results__note">No pages or mattresses match “' + esc(input.value.trim()) + "”.</p>";
    html += '<p class="sh-results__note">Files and PDFs join this search later. For now it finds pages and mattresses.</p>';
    results.innerHTML = html;
    results.hidden = false;
    input.setAttribute("aria-expanded", "true");
    if (active >= 0) input.setAttribute("aria-activedescendant", "sh-opt-" + active); else input.removeAttribute("aria-activedescendant");
  }
  function setActive(i) {
    var opts = $$("[data-sh-opt]", results);
    if (!opts.length) return;
    active = (i + opts.length) % opts.length;
    opts.forEach(function (o, k) { o.classList.toggle("is-active", k === active); o.setAttribute("aria-selected", k === active ? "true" : "false"); });
    input.setAttribute("aria-activedescendant", "sh-opt-" + active);
    opts[active].scrollIntoView({ block: "nearest" });
  }
  function closeResults() {
    if (!results) return;
    results.hidden = true; results.innerHTML = ""; shownHits = []; active = -1;
    input.setAttribute("aria-expanded", "false"); input.removeAttribute("aria-activedescendant");
  }
  function go(it) {
    if (!it) return;
    if (it.external) { window.open(it.href, "_blank", "noopener"); return; }
    closeResults(); input.value = ""; closeSearchPanel(); input.blur();
    location.href = it.href;
  }
  function openSearchPanel() {
    if (!input) return;
    if (mqDesk.matches) { input.focus(); return; }
    closeLayer(false); closeAccount(false);
    root.classList.add("sh-search-open");
    if (searchToggle) searchToggle.setAttribute("aria-expanded", "true");
    input.focus();
  }
  function closeSearchPanel() {
    if (!root.classList.contains("sh-search-open")) return;
    root.classList.remove("sh-search-open");
    if (searchToggle) searchToggle.setAttribute("aria-expanded", "false");
  }
  if (searchBox) {
    var ph = $(".sh-search__placeholder", searchBox);
    var form = document.createElement("form");
    form.className = "sh-search__form"; form.setAttribute("role", "search"); form.setAttribute("aria-label", "Site");
    input = document.createElement("input");
    input.type = "search"; input.id = "sh-q"; input.className = "sh-search__input";
    input.placeholder = ph ? ph.textContent.trim() : NAV.search.label;
    input.setAttribute("aria-label", NAV.search.label);
    input.autocomplete = "off"; input.spellcheck = false;
    input.setAttribute("role", "combobox"); input.setAttribute("aria-autocomplete", "list"); input.setAttribute("aria-expanded", "false"); input.setAttribute("aria-controls", "sh-results");
    if (ph) ph.parentNode.replaceChild(input, ph);
    searchBox.removeAttribute("role");
    searchBox.id = "sh-search";
    // the box is wrapped in a form so Enter submits without leaving the page
    searchBox.parentNode.insertBefore(form, searchBox);
    form.appendChild(searchBox);
    results = document.createElement("div");
    results.className = "sh-results"; results.id = "sh-results"; results.hidden = true;
    results.setAttribute("role", "listbox"); results.setAttribute("aria-label", "Search results");
    searchBox.appendChild(results);
    form.addEventListener("submit", function (e) { e.preventDefault(); go(shownHits[active] || shownHits[0]); });
    input.addEventListener("input", renderResults);
    input.addEventListener("focus", function () { if (input.value.trim()) renderResults(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown") { e.preventDefault(); if (results.hidden) renderResults(); else setActive(active + 1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); setActive(active - 1); }
      else if (e.key === "Escape") {
        e.preventDefault();
        if (!results.hidden) closeResults();
        else { input.value = ""; input.blur(); if (root.classList.contains("sh-search-open")) { closeSearchPanel(); if (searchToggle) searchToggle.focus(); } }
      }
    });
    results.addEventListener("mousedown", function (e) { e.preventDefault(); });   // keep the field focused while picking
    results.addEventListener("click", function (e) {
      var o = e.target.closest("[data-sh-opt]");
      if (!o) return;
      e.preventDefault();
      go(shownHits[+o.getAttribute("data-sh-opt")]);
    });
    input.addEventListener("blur", function () { setTimeout(function () { if (document.activeElement !== input) closeResults(); }, 120); });
    if (searchToggle) {
      searchToggle.setAttribute("aria-expanded", "false"); searchToggle.setAttribute("aria-controls", "sh-search");
      searchToggle.addEventListener("click", function () { if (root.classList.contains("sh-search-open")) closeSearchPanel(); else openSearchPanel(); });
    }
    document.addEventListener("click", function (e) {
      if (root.classList.contains("sh-search-open") && !e.target.closest("#sh-search, [data-sh-search]")) closeSearchPanel();
    });
    mqDesk.addEventListener("change", function () { closeSearchPanel(); closeResults(); closeLayer(false); });
  }
  // "/" opens search (not while typing, not over a dialog)
  document.addEventListener("keydown", function (e) {
    if (e.key !== NAV.search.key || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (openLayerEl || document.querySelector("dialog[open]")) return;
    e.preventDefault();
    openSearchPanel();
  });

  /* ---- 6 Mattress index ----------------------------------------------------------------------------------------------------------------- */
  var aside = $(".side-index");
  var secList = $(".side-index__sections");
  var STICKY = 64, SPY_LINE = STICKY + 80, lockUntil = 0, activeId = null;
  if (aside && secList) {
    // the sections sit under the mattress they belong to
    if (current) current.el.parentNode.insertBefore(secList, current.el.nextSibling);
    else secList.hidden = true;
    PRODUCTS.forEach(function (p) {
      var item = p.el.closest(".w-dyn-item") || p.el.parentNode;
      item.classList.add("side-index__group");
      item.setAttribute("data-name", p.name.toLowerCase());
    });
    SECTIONS.forEach(function (s) {
      if (s.li) s.li.setAttribute("data-name", s.label.toLowerCase());
      if (s.li && !shown(nodeOf(s))) { s.li.hidden = true; s.li.setAttribute("data-absent", ""); }   // only the sections this mattress has
    });
    var empty = document.createElement("p");
    empty.className = "side-index__empty"; empty.hidden = true; empty.textContent = "No matches";
    $(".side-index__nav", aside).appendChild(empty);

    // search field
    var sBox = $("[data-sh-index-search]", aside), sPh = $(".side-index__placeholder", aside), sKbd = $(".side-index__kbd", aside);
    var sInput = document.createElement("input");
    sInput.type = "search"; sInput.className = "side-index__input";
    sInput.placeholder = sPh ? sPh.textContent.trim() : "Search";
    sInput.setAttribute("aria-label", "Search mattresses and sections");
    sInput.autocomplete = "off"; sInput.spellcheck = false;
    if (sPh) sPh.parentNode.replaceChild(sInput, sPh);
    if (sKbd && !isMac) sKbd.textContent = "Ctrl K";
    if (sBox) sBox.addEventListener("click", function (e) { if (e.target !== sInput) sInput.focus(); });

    var setSection = function (id) {
      if (id === activeId) return;
      activeId = id;
      SECTIONS.forEach(function (s) { if (s.id === id) s.link.setAttribute("aria-current", "true"); else s.link.removeAttribute("aria-current"); });
    };
    var spyIndex = function (force) {
      if (!force && Date.now() < lockUntil) return;
      var live = liveSections();
      if (!live.length) return;
      var act = live[0];
      live.forEach(function (s) { if (nodeOf(s).getBoundingClientRect().top <= SPY_LINE) act = s; });
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) act = live[live.length - 1];
      setSection(act.id);
    };
    var goSection = function (id) {
      var s = SECTIONS.filter(function (x) { return x.id === id; })[0];
      if (!s) return;
      lockUntil = Date.now() + 1000;   // let the smooth scroll land without the spy flickering through what it passes
      setSection(id);
      jumpTo(nodeOf(s));
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    };
    aside.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest(".side-index__section");
      if (a) { e.preventDefault(); goSection(a.getAttribute("href").slice(1)); return; }
      var p = e.target.closest && e.target.closest('.side-index__product[aria-current="page"]');
      if (p) { e.preventDefault(); window.scrollTo({ top: 0, behavior: smooth() }); }
    });
    // filter: a mattress stays when its name matches (with all its sections); otherwise only for the sections that match
    var filter = function () {
      var q = sInput.value.trim().toLowerCase(), any = false;
      $$(".side-index__group", aside).forEach(function (g) {
        var nameHit = !q || g.getAttribute("data-name").indexOf(q) >= 0, subHit = false;
        $$("li[data-name]", g).forEach(function (li) {
          if (li.hasAttribute("data-absent")) { li.hidden = true; return; }
          var hit = nameHit || li.getAttribute("data-name").indexOf(q) >= 0;
          li.hidden = !hit;
          if (hit && !nameHit) subHit = true;
        });
        g.hidden = !(nameHit || subHit);
        if (!g.hidden) any = true;
      });
      empty.hidden = any;
    };
    var firstMatch = function () {
      var q = sInput.value.trim().toLowerCase();
      if (!q) return null;
      var groups = $$(".side-index__group:not([hidden])", aside);
      for (var i = 0; i < groups.length; i++) {
        if (groups[i].getAttribute("data-name").indexOf(q) >= 0) return $(".side-index__product", groups[i]);
        var li = $("li[data-name]:not([hidden]) .side-index__section", groups[i]);
        if (li) return li;
      }
      return null;
    };
    sInput.addEventListener("input", filter);
    sInput.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { e.preventDefault(); sInput.value = ""; filter(); sInput.blur(); return; }
      if (e.key === "Enter") {
        e.preventDefault();
        var m = firstMatch();
        if (!m) return;
        sInput.value = ""; filter(); sInput.blur();
        if (m.classList.contains("side-index__section")) goSection(m.getAttribute("href").slice(1));
        else m.click();
      }
    });
    document.addEventListener("keydown", function (e) {
      if (!(e.metaKey || e.ctrlKey) || e.altKey || e.shiftKey || (e.key !== "k" && e.key !== "K")) return;
      if (!shown(aside)) return;   // tablet and phone: no index, the shortcut stays the browser's
      e.preventDefault();
      sInput.focus(); sInput.select();
    });
    var spyQueued = false;
    window.addEventListener("scroll", function () {
      if (spyQueued) return;
      spyQueued = true;
      requestAnimationFrame(function () { spyQueued = false; spyIndex(false); });
    }, { passive: true });
    window.addEventListener("load", function () { spyIndex(true); });
    spyIndex(true);
  }

  /* ---- 7 tablet and phone: the PDP bar and its two dropdowns ------------------------------------------------------------------------- */
  var bar = document.createElement("div");
  bar.className = "sh-pdpbar"; bar.setAttribute("role", "navigation"); bar.setAttribute("aria-label", "Mattress index");
  bar.innerHTML = '<button type="button" class="sh-js-btn sh-pdpbar__switch" aria-haspopup="dialog" aria-expanded="false" aria-controls="sh-sheet" data-sh-sheet-open="mattresses">' +
      '<span class="sh-pdpbar__name">' + esc(current ? current.name : "Mattresses") + "</span>" + icon("selector", "sh-switch-icon") + "</button>" +
    '<button type="button" class="sh-js-btn sh-pdpbar__sections" aria-haspopup="dialog" aria-expanded="false" aria-controls="sh-sheet" data-sh-sheet-open="sections" aria-label="On this page">' +
      '<span class="sh-pdpbar__section" data-sh-section-name>On this page</span>' + icon("caret", "sh-caret") + "</button>";
  var sheet = document.createElement("div");
  sheet.className = "sh-sheet"; sheet.id = "sh-sheet"; sheet.hidden = true;
  sheet.setAttribute("role", "dialog"); sheet.setAttribute("aria-modal", "true"); sheet.setAttribute("aria-labelledby", "sh-sheet-title");
  sheet.innerHTML = '<div class="sh-sheet__scrim" data-sh-close></div><div class="sh-sheet__panel"><h2 class="sh-vh" id="sh-sheet-title">Mattresses</h2><div class="sh-sheet__body"></div></div>';
  document.body.appendChild(bar);
  document.body.appendChild(sheet);
  var sheetBody = $(".sh-sheet__body", sheet), sheetSecs = [];
  function sectionAt(secs) {   // the last section whose top has reached the landing line
    var line = jumpOffset() + 24, at = -1;
    secs.forEach(function (s, i) { if (nodeOf(s).getBoundingClientRect().top <= line) at = i; });
    return at;
  }
  function fillSheet(kind) {
    sheet.setAttribute("data-kind", kind);
    if (kind === "sections") {
      var secs = liveSections(), at = Math.max(0, sectionAt(secs));
      $("#sh-sheet-title").textContent = "On this page";
      sheetSecs = secs;
      sheetBody.innerHTML = '<ul class="sh-sheet__list">' + secs.map(function (s, i) {
        return '<li><button type="button" class="sh-sheet__link" data-sh-jump="' + i + '"' + (i === at ? ' aria-current="true"' : "") + '><span class="sh-sheet__name">' + esc(s.label) + "</span>" + (i === at ? TICK : "") + "</button></li>";
      }).join("") + "</ul>";
      return $("[data-sh-jump][aria-current]", sheetBody) || $("[data-sh-jump]", sheetBody);
    }
    $("#sh-sheet-title").textContent = "Mattresses";
    sheetBody.innerHTML = '<ul class="sh-sheet__list">' + PRODUCTS.map(function (p) {
      var cur = p.slug === CUR;
      return '<li><a class="sh-sheet__link" href="' + esc(productHref(p.slug)) + '"' + (cur ? ' aria-current="page"' : "") + ' data-sh-product><span class="sh-sheet__name">' + esc(p.name) +
        '</span><span class="sh-sheet__sub">' + esc(p.sub) + "</span>" + (cur ? TICK : '<span class="sh-sheet__tick"></span>') + "</a></li>";
    }).join("") + "</ul>";
    return $("[data-sh-product][aria-current]", sheetBody) || $("[data-sh-product]", sheetBody);
  }
  document.addEventListener("click", function (e) {
    var o = e.target.closest && e.target.closest("[data-sh-sheet-open]");
    if (o) {
      if (openLayerEl === sheet && opener === o) { closeLayer(true); return; }   // the same button again closes its list
      var f = fillSheet(o.getAttribute("data-sh-sheet-open"));
      openLayer(sheet, o, f);
      if (f) f.scrollIntoView({ block: "nearest" });
      return;
    }
    var j = e.target.closest && e.target.closest("[data-sh-jump]");
    if (j) {
      var s = sheetSecs[+j.getAttribute("data-sh-jump")];
      closeLayer(true);
      if (s) { jumpTo(nodeOf(s)); var nm = $("[data-sh-section-name]", bar); if (nm) nm.textContent = s.label; }
      return;
    }
    var m = e.target.closest && e.target.closest('.sh-sheet [data-sh-product][aria-current="page"]');
    if (m) { e.preventDefault(); closeLayer(false); window.scrollTo({ top: 0, behavior: smooth() }); }
  });
  var spyName = $("[data-sh-section-name]", bar), barQueued = false, barOn = null;
  var heroTitle = $(".product-hero__title") || $("h1");
  function reveal() {
    var past = !heroTitle || !shown(heroTitle) || heroTitle.getBoundingClientRect().bottom < topH();
    var on = past || openLayerEl === sheet;
    if (on !== barOn) { barOn = on; root.classList.toggle("sh-pdpbar-on", on); }
  }
  function barTick() {
    barQueued = false;
    reveal();
    if (!shown(bar)) return;
    var secs = liveSections(), at = sectionAt(secs);
    var label = at < 0 ? "On this page" : secs[at].label;
    if (spyName.textContent !== label) spyName.textContent = label;
  }
  function queueBar() { if (!barQueued) { barQueued = true; requestAnimationFrame(barTick); } }
  window.addEventListener("scroll", queueBar, { passive: true });
  window.addEventListener("resize", queueBar);
  barTick();

  /* ---- 8 tooltips ----------------------------------------------------------------------------------------------------------------------- */
  var tipBox = document.createElement("div");
  tipBox.className = "sh-tip"; tipBox.setAttribute("aria-hidden", "true");
  document.body.appendChild(tipBox);
  var tipFor = null;
  function showTip(el) {
    var text = el.getAttribute("data-sh-tip");
    if (!text) return;
    tipBox.textContent = text;
    var r = el.getBoundingClientRect(), w = tipBox.offsetWidth;
    var x = Math.min(window.innerWidth - w - 8, Math.max(8, r.left + (r.width - w) / 2)), y = r.bottom + 8;
    tipBox.style.transform = "translate(" + Math.round(x) + "px," + Math.round(y) + "px)";
    tipBox.classList.add("is-on");
    tipFor = el;
  }
  function hideTip() { tipBox.classList.remove("is-on"); tipFor = null; }
  document.addEventListener("pointerover", function (e) {
    var el = e.target.closest && e.target.closest("[data-sh-tip]");
    if (el && el !== tipFor && !(acctMenu && !acctMenu.hidden && el === acctBtn)) showTip(el); else if (!el && tipFor) hideTip();
  });
  document.addEventListener("focusin", function (e) { var el = e.target.closest && e.target.closest("[data-sh-tip]"); if (el && el.matches(":focus-visible")) showTip(el); else hideTip(); });
  document.addEventListener("focusout", hideTip);
  window.addEventListener("scroll", hideTip, { passive: true });
  [menuBtn, acctBtn].forEach(function (b) { if (b) b.addEventListener("click", hideTip); });

  syncTheme();
  window.MLILY_SHELL = { jumpOffset: jumpOffset, jumpTo: jumpTo, closeMenus: function () { closeLayer(false); closeAccount(false); closeResults(); } };
})();
