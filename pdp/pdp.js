/* MLILY U 3.0, product page template (Mattresses): the behaviour the Webflow build can't do on its own. Same behaviour as the prototype
   (mlilyu-3-0-shell: js/product-page.js, js/page-actions.js, js/type-marks.js), rewritten for the Webflow markup (README "Product page").
   Needs Swiper 11 (cdnjs) for the photo strip; without it the strip stays a native scroller. Everything here is optional on top of a
   page that already reads correctly without JavaScript.

   1  ® marks: wrapped in .reg-mark (60 %, raised)
   2  "#" links that are buttons: no jump to the top; 2b empty facts and sections
   3  Actions row: Find Specs / Compare open their dialogs (dialogs.js); Photos / Layers scroll to their section; keys S, C, P and L
   4  Copy page: copies the page as Markdown; its menu adds View as Markdown, Copy for my listing and opening a chat (nothing is sent to any service)
   5  Training: the checklist collapses to two rows with a fade and "Show more"; the card fires a `video-open` event (no player yet)
   6  Photos: Swiper (endless, free drag with momentum, arrows, keyboard)
   7  Layers: the feel toggle swaps the first feel's rows for the other feel's; a row opens the layer drawer (layer-drawer.js)
   8  Common questions: "Show all N questions" swaps the first five for the full list
   9  Pairs with: links to mlilyusa.com open in a new tab */
(function () {
  "use strict";
  var main = document.querySelector(".pdp-page");
  if (!main) return;
  var HERE = document.currentScript ? document.currentScript.src.replace(/[^/]*$/, "") : "";   // where this file (and its dialogs) is served from
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return [].slice.call((r || document).querySelectorAll(s)); };
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  var text = function (el) { return el ? el.textContent.replace(/\s+/g, " ").trim() : ""; };
  var shown = function (el) { return !!el && el.getClientRects().length > 0; };
  // Webflow keeps a list item in the page with an empty bound field; treat those as missing
  var filled = function (el) { return !!el && text(el) !== "" && !el.classList.contains("w-dyn-bind-empty"); };

  var status = document.createElement("p");
  status.className = "pdp-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  main.appendChild(status);
  function say(msg) { status.textContent = msg; }

  /* Compare the feels: one line per layer (the CMS field keeps one layer per line) ------------------------------------------------------ */
  $$(".feels__cell--lines").forEach(function (cell) {
    var lines = cell.textContent.split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean);
    cell.textContent = "";
    lines.forEach(function (line) {
      var item = document.createElement("span");
      item.className = "feels__item";
      item.textContent = line;
      cell.appendChild(item);
    });
  });

  /* 1 ® marks ----------------------------------------------------------------------------------------------------------------------- */
  (function wrapMarks(root) {
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: function (n) {
        if (n.nodeValue.indexOf("®") < 0) return NodeFilter.FILTER_REJECT;
        return n.parentNode.closest(".reg-mark, script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
      }
    });
    var hits = [];
    while (walker.nextNode()) hits.push(walker.currentNode);
    hits.forEach(function (n) {
      var frag = document.createDocumentFragment();
      n.nodeValue.split(/(®)/).forEach(function (part) {
        if (!part) return;
        if (part === "®") { var s = document.createElement("span"); s.className = "reg-mark"; s.textContent = part; frag.appendChild(s); }
        else frag.appendChild(document.createTextNode(part));
      });
      n.parentNode.replaceChild(frag, n);
    });
  })(main);

  /* 2 "#" links that act as buttons ---------------------------------------------------------------------------------------------------- */
  main.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest('a[href="#"]');
    if (a) e.preventDefault();
  });
  $$("[data-action], [data-checks-more], [data-faq-more], .photo-strip__nav, .layers__feel").forEach(function (el) {
    el.setAttribute("role", "button");
    if (!el.hasAttribute("tabindex") && el.tagName !== "A") el.setAttribute("tabindex", "0");
  });
  // Enter and Space on the non-link buttons (the feel toggles are list items)
  main.addEventListener("keydown", function (e) {
    if (e.key !== "Enter" && e.key !== " ") return;
    var b = e.target.closest && e.target.closest('[role="button"]:not(a)');
    if (!b) return;
    e.preventDefault();
    b.click();
  });

  /* 2b What a mattress doesn't have -------------------------------------------------------------------------------------------------- */
  // "For maximum cooling, see …": the CMS gives the mattress, its page comes from the slug (the API can't link an item page)
  $$(".rail__step-up-link[data-slug]").forEach(function (a) {
    var slug = a.getAttribute("data-slug");
    if (slug) a.setAttribute("href", "/mattresses/" + slug);
  });
  // No feels: no Firmness section. One feel (The Dream): nothing to compare.
  var countItems = function (el) { return el ? $$(".w-dyn-item", el).length : 0; };
  var firmness = $(".variant-group");
  if (firmness && !countItems(firmness)) firmness.style.display = "none";
  var feelsSec = $(".feels");
  if (feelsSec && $$(".feels__cells", feelsSec).length < 2) feelsSec.style.display = "none";

  /* 3 Actions row ----------------------------------------------------------------------------------------------------------------------- */
  // Find Specs and Compare: dialogs.js + dialogs.css load the first time they're wanted, so the page itself stays light
  function loadAssets(name) {
    return new Promise(function (resolve, reject) {
      var link = document.createElement("link"), js = document.createElement("script"), waiting = 2;
      var ready = function () { if (!--waiting) resolve(); };
      link.rel = "stylesheet"; link.href = HERE + name + ".css"; link.onload = ready; link.onerror = reject;
      js.src = HERE + name + ".js"; js.onload = ready; js.onerror = reject;
      document.head.appendChild(link); document.head.appendChild(js);
    });
  }
  var dialogs = null;
  function loadDialogs() {
    if (!dialogs) dialogs = loadAssets("dialogs");
    return dialogs;
  }
  function openDialog(kind, trigger) {
    say("Opening " + (kind === "compare" ? "Compare" : "Find Specs"));
    var failed = function () { say("That couldn't be opened. Please try again."); };
    loadDialogs().then(function () {
      return window.MLILY_DIALOGS.open(kind, trigger).then(function () { say(""); }, failed);
    }, function () { dialogs = null; failed(); });
  }
  var TARGET = { photos: ".photo-strip", layers: ".layers" };
  function jump(sel) {
    var node = $(sel);
    if (!shown(node)) return;
    // under the shell's fixed bars when shell/shell.js is on the page
    var off = window.MLILY_SHELL && window.MLILY_SHELL.jumpOffset ? window.MLILY_SHELL.jumpOffset() : 16;
    var top = node.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion.matches ? "auto" : "smooth" });
  }
  // A button that opens a menu: Enter, Space and the arrows open it; arrows, Home and End move; Esc and Tab close it; so does a press elsewhere
  var menus = [];
  function makeMenu(box, toggle, list, itemSel, active) {
    var api = {
      isOpen: function () { return box.classList.contains("is-open"); },
      set: function (open) {
        if (open) menus.forEach(function (m) { if (m !== api) m.set(false); });
        box.classList.toggle("is-open", open);
        toggle.setAttribute("aria-expanded", open ? "true" : "false");
      }
    };
    var items = function () { return $$(itemSel, list).filter(function (b) { return b.style.display !== "none"; }); };
    function move(step, from) {
      var all = items(), i = all.indexOf(from);
      all[step === "first" ? 0 : step === "last" ? all.length - 1 : (i + step + all.length) % all.length].focus();
    }
    toggle.setAttribute("aria-haspopup", "menu");
    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-controls", list.id);
    toggle.addEventListener("click", function (e) {
      var open = !api.isOpen();
      api.set(open);
      if (open && e.detail === 0) move("first");   // opened from the keyboard
    });
    toggle.addEventListener("keydown", function (e) {
      if (e.key === " ") { e.preventDefault(); toggle.click(); }
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); api.set(true); move(e.key === "ArrowDown" ? "first" : "last"); }
      else if (e.key === "Escape") api.set(false);
    });
    list.addEventListener("keydown", function (e) {
      if (!active()) return;
      var b = e.target.closest(itemSel), step = { ArrowDown: 1, ArrowUp: -1, Home: "first", End: "last" }[e.key];
      if (step) { e.preventDefault(); move(step, b); }
      else if (e.key === " ") { e.preventDefault(); b.click(); }
      else if (e.key === "Escape") { e.preventDefault(); api.set(false); toggle.focus(); }
      else if (e.key === "Tab") api.set(false);
    });
    document.addEventListener("pointerdown", function (e) { if (!box.contains(e.target)) api.set(false); });
    menus.push(api);
    return api;
  }
  // More (1100 px and under): Compare, Photos and Layers sit in this menu. Above that the menu's wrappers are display: contents and they are plain buttons.
  var moreBox = $(".page-more"), moreToggle = moreBox && $("[data-more-toggle]", moreBox), moreList = moreBox && $(".page-more__menu", moreBox), more = null;
  var compact = window.matchMedia("(max-width: 1100px)");
  var inMenu = function (el) { return !!moreList && compact.matches && moreList.contains(el); };
  function act(action, trigger) {
    var back = inMenu(trigger) ? moreToggle : trigger;   // a closed menu's item can't take the focus back
    if (more) more.set(false);
    if (TARGET[action]) jump(TARGET[action]);
    else openDialog(action, back);
  }
  var ACTIONS = { specs: 1, compare: 1, photos: 1, layers: 1 };   // the Copy page pair has its own handlers (section 4)
  $$("[data-action]").forEach(function (b) {
    var a = b.getAttribute("data-action");
    if (!ACTIONS[a]) return;
    if (TARGET[a] && !shown($(TARGET[a]))) b.style.display = "none";   // Photos and Layers only where the page has them
    if (!TARGET[a]) ["pointerenter", "focus"].forEach(function (type) { b.addEventListener(type, loadDialogs, { once: true }); });
    b.addEventListener("click", function (e) {
      var fromKeys = inMenu(b) && e.detail === 0;
      act(a, b);
      if (fromKeys && TARGET[a]) moreToggle.focus({ preventScroll: true });
    });
  });
  if (moreBox && moreToggle && moreList) {
    more = makeMenu(moreBox, moreToggle, moreList, "[data-action]", function () { return compact.matches; });
    var syncMoreRoles = function () {
      more.set(false);
      if (compact.matches) { moreList.setAttribute("role", "menu"); moreList.setAttribute("aria-label", "More actions"); }
      else { moreList.removeAttribute("role"); moreList.removeAttribute("aria-label"); }
      $$("[data-action]", moreList).forEach(function (b) {
        b.setAttribute("role", compact.matches ? "menuitem" : "button");
        if (compact.matches) b.setAttribute("tabindex", "-1"); else b.removeAttribute("tabindex");
      });
    };
    syncMoreRoles();
    compact.addEventListener("change", syncMoreRoles);
  }
  var KEYS = { s: "specs", c: "compare", p: "photos", l: "layers" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector("dialog[open]") || menus.some(function (m) { return m.isOpen(); })) return;
    var action = KEYS[(e.key || "").toLowerCase()];
    if (!action) return;
    var b = $('[data-action="' + action + '"]');
    if (!b || b.style.display === "none") return;   // hidden only because the More menu is closed still counts as available
    e.preventDefault();
    act(action, b);
  });

  /* 4 Copy page --------------------------------------------------------------------------------------------------------------------- */
  function mdTable(head, rows) {
    var line = function (cells) { return "| " + cells.map(function (c) { return String(c).replace(/\|/g, "\\|"); }).join(" | ") + " |"; };
    return [line(head), line(head.map(function () { return "---"; }))].concat(rows.map(line)).join("\n");
  }
  function richToMd(el) {
    var out = "";
    [].forEach.call(el.childNodes, function walk(n) {
      if (n.nodeType === 3) { out += n.nodeValue; return; }
      if (n.nodeType !== 1) return;
      if (n.tagName === "A") { out += "[" + text(n) + "](" + n.href + ")"; return; }
      if (n.tagName === "P" && out) out += "\n\n";
      [].forEach.call(n.childNodes, walk);
    });
    return out.replace(/[ \t]+/g, " ").trim();
  }
  // The mattress's sizes and specs (a small file, shared with the Find Specs modal): loaded after the page so every copy option can use them at once
  var slug = document.documentElement.getAttribute("data-wf-item-slug") || location.pathname.split("/").pop();
  function loadSpecs() {
    if (window.MLILY_MATTRESS_SPECS) return;
    var js = document.createElement("script");
    js.src = HERE + "../find-specs/mattress/" + slug + ".js";
    document.head.appendChild(js);
  }
  if (document.readyState === "complete") loadSpecs(); else window.addEventListener("load", loadSpecs);
  function trio(a) { return a && a.length === 3 ? a.join(" × ") + " in" : ""; }
  function layerStacks() {
    var feelNames = $$(".layers__feel").map(text);
    return [$(".layers__lists .w-dyn-list:not(.layers__alt)"), $(".layers__alt")].map(function (l, i) {
      var rows = l ? $$(".layers__row", l).map(function (r) { return [text($(".layers__name", r)), text($(".layers__desc", r))]; }).filter(function (r) { return r[0]; }) : [];
      return { label: feelNames[i] || "", rows: rows };
    }).filter(function (s) { return s.rows.length; });
  }
  function filledFacts() {
    return $$(".facts__cell").filter(function (c) { return !$(".w-dyn-bind-empty", c); }).map(function (c) { return [text($(".facts__label", c)), text($(".facts__value", c))]; }).filter(function (r) { return r[1]; });
  }
  function pageMarkdown() {
    var out = [], name = text($(".product-hero__title")), specs = window.MLILY_MATTRESS_SPECS;
    out.push("# " + name);
    var lead = [text($(".product-hero__kicker")), text($(".rail__tagline"))].filter(Boolean).join(" · ");
    if (lead) out.push(lead);
    if (filled($(".rail__description"))) out.push(text($(".rail__description")));
    if (filled($(".rail__best-for-text"))) out.push("**Best for:** " + text($(".rail__best-for-text")));
    if (shown($(".rail__step-up"))) out.push(text($(".rail__step-up-lead")) + " " + text($(".rail__step-up-name")) + ".");
    var chips = $$(".icon-set__caption").map(text).filter(Boolean);
    if (chips.length) out.push("**Highlights:** " + chips.join(", "));
    var feels = $$(".variant-card").map(function (c) { return { label: text($(".variant-card__title", c)), line: text($(".variant-card__desc", c)) }; }).filter(function (f) { return f.label; });
    if (feels.length) { out.push("## Firmness"); out.push(feels.map(function (f) { return "- **" + f.label + "**" + (f.line ? ": " + f.line : ""); }).join("\n")); }
    var sizes = $$(".facts__size").map(text).filter(Boolean);
    if (sizes.length) out.push("**Sizes:** " + sizes.join(", "));
    var facts = $$(".facts__cell").filter(shown).map(function (c) { return [text($(".facts__label", c)), text($(".facts__value", c))]; }).filter(function (r) { return r[1]; });
    if (facts.length) { out.push("## At a glance"); out.push(facts.map(function (r) { return "- " + r[0] + ": " + r[1]; }).join("\n")); }
    if (specs) {
      var multi = specs.rows.some(function (r) { return r.feel; });
      out.push("## Sizes and specs");
      out.push(mdTable((multi ? ["Feel"] : []).concat(["Size", "MSRP", "SKU", "UPC", "Mattress", "Box", "Box weight"]), specs.rows.map(function (r) {
        return (multi ? [r.feel || ""] : []).concat([r.size || "One size", r.msrp != null ? "$" + Number(r.msrp).toLocaleString("en-US") : "", r.sku, r.upc || "", trio(r.dims), trio(r.box), r.weight != null ? r.weight + " lb" : ""]);
      })));
    }
    var stacks = layerStacks();
    if (stacks.length) {
      out.push("## Layers");
      stacks.forEach(function (s) {
        if (stacks.length > 1 && s.label) out.push("### " + s.label);
        out.push(s.rows.map(function (r, i) { return (i + 1) + ". **" + r[0] + "**" + (r[1] ? ": " + r[1] : ""); }).join("\n"));
      });
    }
    var cols = $$(".feels__cells");
    if (cols.length > 1) {
      var labels = $$(".feels__label").map(text);
      var cells = cols.map(function (c) { return $$(".feels__cell", c).map(function (p) { var items = $$(".feels__item", p); return items.length ? items.map(text).join("; ") : text(p); }); });
      out.push("## Compare the feels");
      out.push(mdTable([""].concat(cols.map(function (c) { return text($(".feels__head", c)); })), labels.map(function (l, i) { return [l].concat(cells.map(function (c) { return c[i] || ""; })); })));
    }
    var pairs = $$(".pairs__card").map(function (c) { return [text($(".pairs__name", c)), text($(".pairs__text", c))]; }).filter(function (p) { return p[0]; });
    if (pairs.length) { out.push("## Pairs with"); out.push(pairs.map(function (p) { return "- **" + p[0] + "**" + (p[1] ? ": " + p[1] : ""); }).join("\n")); }
    var faqList = $("[data-faq-all]") || $(".faq__lists .w-dyn-list");
    var faqs = faqList ? $$(".faq__qa", faqList) : [];
    if (faqs.length) { out.push("## Common questions"); faqs.forEach(function (q) { out.push("### " + text($(".faq__q", q))); out.push(richToMd($(".faq__a", q))); }); }
    var tTitle = text($(".overview-video__title"));
    if (tTitle) {
      var len = text($(".overview-video__badge"));
      out.push("## Training");
      out.push(tTitle + (len ? " (video, " + len + ")" : "") + ".");
      var pts = $$(".overview-checks__text").filter(filled).map(text);
      if (pts.length) { out.push("This training helps you:"); out.push(pts.map(function (t) { return "- " + t; }).join("\n")); }
    }
    out.push("---");
    out.push("From the MLILY U product page for " + name + " (" + location.origin + location.pathname + "), copied " +
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + "." +
      (specs ? " MSRP from the " + specs.msrpSource + "; UPC, dimensions and box sizes from the " + specs.source + "." : ""));
    return out.join("\n\n") + "\n";
  }
  // What a store listing needs and nothing internal: no prices, SKUs, UPCs, training, questions or pairings. As HTML (pastes formatted into a store's editor) and plain text.
  function listingCopy() {
    var blocks = [], specs = window.MLILY_MATTRESS_SPECS;
    function para(t, opt) { if (t) blocks.push({ type: "p", text: t, strong: !!(opt && opt.strong), label: opt && opt.label }); }
    function head(t) { blocks.push({ type: "h", text: t }); }
    function list(items) { if (items.length) blocks.push({ type: "ul", items: items }); }
    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
    para(text($(".rail__tagline")), { strong: true });
    para(text($(".rail__description")));
    if (filled($(".rail__best-for-text"))) para(text($(".rail__best-for-text")), { label: "Best for" });
    var caps = $$(".icon-set__caption").map(text).filter(Boolean);
    if (caps.length) { head("Highlights"); list(caps); }
    var cols = $$(".feels__cells");
    if (cols.length > 1) {
      var labels = $$(".feels__label").map(text), feelAt = labels.indexOf("Feel"), sleepAt = labels.indexOf("Sleepers");
      head("Comfort options");
      list(cols.map(function (c) {
        var cells = $$(".feels__cell", c).map(text), feel = cells[feelAt] || "", sleep = (cells[sleepAt] || "").toLowerCase();
        if (sleep && !/sleepers$/.test(sleep)) sleep += " sleepers";
        return { label: text($(".feels__head", c)), text: (feel ? feel + " feel" : "") + (sleep ? (feel ? ", for " : "For ") + sleep : "") };
      }));
    }
    var stacks = layerStacks();
    if (stacks.length) {
      head("What’s inside");
      if (stacks.length > 1) stacks.forEach(function (st) { para(st.label, { strong: true }); list(st.rows.map(function (r) { return r[0]; })); });
      else list(stacks[0].rows.map(function (r) { return r[0]; }));
    }
    var sizes = [], seen = {};
    (specs ? specs.rows : []).forEach(function (r) { if (r.size && !seen[r.size]) { seen[r.size] = 1; sizes.push(r.size + (trio(r.dims) ? ": " + trio(r.dims) : "")); } });
    if (!sizes.length) sizes = $$(".facts__size").map(text).filter(Boolean);
    if (sizes.length) { head("Sizes and dimensions"); list(sizes); }
    var facts = filledFacts().filter(function (r) { return r[0] !== "Ships"; });   // Ships is how MLILY ships to the store, not to the shopper
    if (facts.length) { head("Details"); list(facts.map(function (r) { return { label: r[0], text: r[1] }; })); }
    var html = "", plain = [];
    blocks.forEach(function (b) {
      if (b.type === "h") { html += "<h3>" + esc(b.text) + "</h3>"; plain.push("", b.text); }
      else if (b.type === "p") {
        html += "<p>" + (b.label ? "<strong>" + esc(b.label) + ":</strong> " : "") + (b.strong ? "<strong>" + esc(b.text) + "</strong>" : esc(b.text)) + "</p>";
        plain.push("", (b.label ? b.label + ": " : "") + b.text);
      } else {
        html += "<ul>" + b.items.map(function (it) { return "<li>" + (typeof it === "string" ? esc(it) : "<strong>" + esc(it.label) + "</strong>" + (it.text ? ": " + esc(it.text) : "")) + "</li>"; }).join("") + "</ul>";
        plain.push(b.items.map(function (it) { return "- " + (typeof it === "string" ? it : it.label + (it.text ? ": " + it.text : "")); }).join("\n"));
      }
    });
    return { html: html, text: plain.join("\n").replace(/^\n+/, "") + "\n" };
  }
  function copyNow(str, back) {   // synchronous: used before a new tab takes the focus, and where the async clipboard is missing
    var ta = document.createElement("textarea");
    ta.value = str; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.top = "0"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    if (back) back.focus();
    return ok;
  }
  function copyAsync(str, html) {
    if (html && navigator.clipboard && navigator.clipboard.write && window.ClipboardItem) {
      return navigator.clipboard.write([new ClipboardItem({ "text/html": new Blob([html], { type: "text/html" }), "text/plain": new Blob([str], { type: "text/plain" }) })])
        .catch(function () { return copyAsync(str); });
    }
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(str).catch(function () { return copyNow(str) ? null : Promise.reject(); });
    return copyNow(str) ? Promise.resolve() : Promise.reject();
  }
  var copyBox = $(".page-copy"), copyMain = $(".page-copy__main"), copyArrow = $(".page-copy__more"), copyList = $(".page-copy__menu");
  var copyLabel = copyMain && $(".page-action__label", copyMain), copyTimer;
  var CHATS = { claude: { name: "Claude", url: "https://claude.ai/new" }, chatgpt: { name: "ChatGPT", url: "https://chatgpt.com/" } };   // blank new chats: nothing goes in the address
  function aiIntro(name) { return "I sell MLILY mattresses. Below is MLILY's product page for " + name + ". Answer my questions using only these facts, and tell me when something isn't covered.\n\n"; }
  function done(ok, msg) {
    copyMain.classList.toggle("is-copied", ok);
    if (copyLabel) copyLabel.textContent = ok ? "Copied" : "Copy page";
    say(msg);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () { copyMain.classList.remove("is-copied"); if (copyLabel) copyLabel.textContent = "Copy page"; say(""); }, 1800);
  }
  // Nothing here talks to an AI or any other service. The chat options copy the page, then open a blank chat for the person to paste into from their own account.
  function runCopy(kind) {
    var name = text($(".product-hero__title")), chat = CHATS[kind];
    if (kind === "markdown") {
      var url = URL.createObjectURL(new Blob([pageMarkdown()], { type: "text/plain;charset=utf-8" })), tab = window.open(url, "_blank");
      if (tab) tab.opener = null;
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      say(tab ? "Opened the page text for " + name + " in a new tab" : "The browser blocked the new tab");
      return;
    }
    if (kind === "cursor" || chat) {
      var ok = copyNow(aiIntro(name) + pageMarkdown(), copyArrow), app = chat ? chat.name : "Cursor";
      done(ok, ok ? "Copied the page for " + name + ". Paste it into " + (chat ? "the new " + app + " chat." : "a Cursor chat.") : "Couldn't copy the page. Use Copy page text, then open " + app + ".");
      if (ok && chat) window.open(chat.url, "_blank", "noopener");
      if (ok && !chat) { var link = document.createElement("a"); link.href = "cursor://"; link.click(); }   // the page stays put if Cursor isn't installed
      return;
    }
    var listing = kind === "listing" ? listingCopy() : null;
    (listing ? copyAsync(listing.text, listing.html) : copyAsync(pageMarkdown())).then(function () {
      done(true, listing ? "Copied the listing for " + name : "Copied the page text for " + name);
    }, function () { done(false, "Couldn't copy: the browser blocked the clipboard."); });
  }
  if (copyMain) copyMain.addEventListener("click", function () { if (copyMenu) copyMenu.set(false); runCopy("page"); });
  var copyMenu = copyBox && copyArrow && copyList ? makeMenu(copyBox, copyArrow, copyList, "[data-copy-page]", function () { return true; }) : null;
  if (copyMenu) copyList.addEventListener("click", function (e) {
    var item = e.target.closest("[data-copy-page]");
    if (!item) return;
    copyMenu.set(false);
    if (e.detail === 0) copyArrow.focus();
    runCopy(item.getAttribute("data-copy-page"));
  });

  /* 5 Training: checklist and card ------------------------------------------------------------------------------------------------------ */
  var checks = $(".overview-checks"), checksList = checks && $(".overview-checks__list", checks), checksMore = $("[data-checks-more]");
  if (checks && checksList && checksMore) {
    var items = $$(".overview-checks__item", checksList);
    items.forEach(function (li) { if (!filled($(".overview-checks__text", li))) li.remove(); });   // empty Point fields
    items = $$(".overview-checks__item", checksList);
    if (!items.length) checks.style.display = "none";
    var over = items.length > 3;   // prototype: more than three lines collapse to two, the second fading
    var syncFade = function () {
      if (!checks.classList.contains("is-collapsed")) return;
      var rows = items.filter(function (li) { return !li.hidden; });
      if (rows.length < 2) return;
      checksList.style.setProperty("--fade-h", (rows[rows.length - 1].offsetHeight + 6) + "px");
    };
    var setOpen = function (open) {
      items.forEach(function (li, i) { li.hidden = !open && i >= 2; });
      checks.classList.toggle("is-collapsed", !open);
      checksMore.setAttribute("aria-expanded", open ? "true" : "false");
      checksMore.textContent = open ? "Show less" : "Show more";
      syncFade();
    };
    if (over) {
      checksMore.style.display = "inline-block";
      setOpen(false);
      checksMore.addEventListener("click", function (e) { e.stopPropagation(); setOpen(checksMore.getAttribute("aria-expanded") !== "true"); });
      window.addEventListener("resize", syncFade);
    }
  }
  var card = $(".overview-video");
  if (card) {
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-label", "Play: " + text($(".overview-video__title", card)));
    var openVideo = function () {   // no player yet: the event is the hook for it (same as the prototype)
      document.dispatchEvent(new CustomEvent("video-open", { bubbles: true, detail: {
        title: text($(".overview-video__title", card)), length: text($(".overview-video__badge", card)),
        poster: ($(".overview-video__poster", card) || {}).currentSrc || "", trigger: card } }));
    };
    card.addEventListener("click", openVideo);
    if (checks) checks.addEventListener("click", function (e) { if (!e.target.closest("[data-checks-more]")) openVideo(); });
  }

  /* 6 Photos ---------------------------------------------------------------------------------------------------------------------------- */
  var strip = $(".photo-strip"), track = strip && $(".photo-strip__track", strip);
  if (strip && track && typeof window.Swiper === "function") {
    var wrap = track.parentElement;   // the Webflow Collection List wrapper becomes the Swiper container
    wrap.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    $$(".photo-strip__item", track).forEach(function (s) { s.classList.add("swiper-slide"); });
    var n = $$(".swiper-slide", track).length;
    new window.Swiper(wrap, {
      slidesPerView: "auto", spaceBetween: 8, grabCursor: true, loop: n > 2, loopAdditionalSlides: 3, watchOverflow: true,
      speed: 650, touchRatio: 1.15, resistance: true, resistanceRatio: .72, threshold: 4,
      freeMode: { enabled: true, sticky: false, momentum: true, momentumRatio: 1.25, momentumVelocityRatio: 1.1, momentumBounce: true, momentumBounceRatio: .9, minimumVelocity: .02 },
      keyboard: { enabled: true, onlyInViewport: true },
      navigation: { prevEl: $(".photo-strip__nav--prev", strip), nextEl: $(".photo-strip__nav--next", strip), disabledClass: "is-disabled", lockClass: "is-locked" },
      a11y: { enabled: true, prevSlideMessage: "Previous photos", nextSlideMessage: "Next photos" },
      on: {
        touchStart: function () { strip.classList.add("is-pressed"); },
        touchEnd: function () { strip.classList.remove("is-pressed"); }
      }
    });
  } else if (strip && track) {
    // no Swiper: the arrows scroll the native strip by one photo
    var step = function (dir) {
      var item = $(".photo-strip__item", track);
      track.scrollBy({ left: dir * ((item ? item.offsetWidth : 340) + 8), behavior: reduceMotion.matches ? "auto" : "smooth" });
    };
    var prev = $(".photo-strip__nav--prev", strip), next = $(".photo-strip__nav--next", strip);
    if (prev) prev.addEventListener("click", function () { step(-1); });
    if (next) next.addEventListener("click", function () { step(1); });
  }

  /* 7 Layers: feel toggle ------------------------------------------------------------------------------------------------------------- */
  var feelBtns = $$(".layers__feel"), firstList = $(".layers__lists .w-dyn-list:not(.layers__alt)"), altList = $(".layers__alt");
  if (feelBtns.length && firstList) {
    var pick = function (i) {
      feelBtns.forEach(function (b, j) {
        b.classList.toggle("is-active", j === i);
        b.classList.toggle("is-inactive", j !== i);
        b.setAttribute("aria-pressed", j === i ? "true" : "false");
      });
      firstList.style.display = i === 0 ? "" : "none";
      if (altList) altList.style.display = i === 0 ? "" : "block";
    };
    if (feelBtns.length < 2 || !altList) feelBtns.forEach(function (b) { b.style.display = feelBtns.length < 2 ? "none" : ""; });
    feelBtns.forEach(function (b, i) { b.addEventListener("click", function () { pick(i); }); });
    pick(0);
  }

  // Each row opens the layer drawer: the name becomes the button, and its ::after covers the row (pdp.css). The drawer loads the first time it's wanted.
  var drawer = null, layerLists = $(".layers__lists");
  function loadDrawer() {
    if (!drawer) drawer = loadAssets("layer-drawer");
    return drawer;
  }
  if (layerLists) {
    $$(".layers__name", layerLists).forEach(function (h) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "layers__open"; b.setAttribute("aria-haspopup", "dialog");
      while (h.firstChild) b.appendChild(h.firstChild);
      h.appendChild(b);
    });
    ["pointerover", "focusin"].forEach(function (type) { layerLists.addEventListener(type, loadDrawer, { once: true }); });
    layerLists.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest(".layers__open");
      if (!b) return;
      var list = b.closest(".w-dyn-list");
      loadDrawer().then(function () { window.MLILY_LAYER_DRAWER.open(list, $$(".layers__open", list).indexOf(b)); }, function () {
        drawer = null;
        say("That couldn't be opened. Please try again.");
      });
    });
  }

  /* 8 Common questions -------------------------------------------------------------------------------------------------------------- */
  var faqMore = $("[data-faq-more]"), faqFirst = $(".faq__lists .w-dyn-list:not(.faq__extra)"), faqAll = $(".faq__extra");
  if (faqMore && faqFirst && faqAll) {
    var total = $$(".faq__item", faqAll).length, few = $$(".faq__item", faqFirst).length;
    if (total > few) {
      var label = function (open) { return open ? "Show fewer questions" : "Show all " + total + " questions"; };
      faqMore.style.display = "inline-block";
      faqMore.textContent = label(false);
      faqMore.addEventListener("click", function () {
        var open = faqMore.getAttribute("aria-expanded") !== "true";
        faqFirst.style.display = open ? "none" : "";
        faqAll.style.display = open ? "block" : "";
        faqMore.setAttribute("aria-expanded", open ? "true" : "false");
        faqMore.textContent = label(open);
      });
    }
  }

  /* 9 Pairs with: external links ---------------------------------------------------------------------------------------------------- */
  $$('.pairs__card[href^="http"]').forEach(function (a) {
    a.target = "_blank";
    a.rel = "noopener";
    var name = $(".pairs__name", a);
    if (name) a.setAttribute("aria-label", text(name) + " (opens mlilyusa.com in a new tab)");
  });
})();
