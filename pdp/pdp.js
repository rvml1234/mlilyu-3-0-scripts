/* MLILY U 3.0, product page template (Mattresses): the behaviour the Webflow build can't do on its own. Same behaviour as the prototype
   (mlilyu-3-0-shell: js/product-page.js, js/page-actions.js, js/type-marks.js), rewritten for the Webflow markup (README "Product page").
   Needs Swiper 11 (cdnjs) for the photo strip; without it the strip stays a native scroller. Everything here is optional on top of a
   page that already reads correctly without JavaScript.

   1  ® marks: wrapped in .reg-mark (60 %, raised)
   2  "#" links that are buttons: no jump to the top; 2b empty facts and sections
   3  Actions row: Photos / Layers scroll to their section; keys P and L (S and C wait for the Find Specs and Compare dialogs)
   4  Copy page: copies the page as Markdown (the arrow's menu is not built yet)
   5  Training: the checklist collapses to two rows with a fade and "Show more"; the card fires a `video-open` event (no player yet)
   6  Photos: Swiper (endless, free drag with momentum, arrows, keyboard)
   7  Layers: the feel toggle swaps the first feel's rows for the other feel's
   8  Common questions: "Show all N questions" swaps the first five for the full list
   9  Pairs with: links to mlilyusa.com open in a new tab */
(function () {
  "use strict";
  var main = document.querySelector(".pdp-page");
  if (!main) return;
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
  // An empty CMS field can name its replacement in Webflow (At a glance, Made in: data-empty="Ask your rep")
  $$("[data-empty]").forEach(function (el) {
    if (filled(el)) return;
    el.classList.remove("w-dyn-bind-empty");
    el.textContent = el.getAttribute("data-empty");
  });
  // No feels: no Firmness section. One feel (The Dream): nothing to compare.
  var countItems = function (el) { return el ? $$(".w-dyn-item", el).length : 0; };
  var firmness = $(".variant-group");
  if (firmness && !countItems(firmness)) firmness.style.display = "none";
  var feelsSec = $(".feels");
  if (feelsSec && $$(".feels__cells", feelsSec).length < 2) feelsSec.style.display = "none";

  /* 3 Actions row ----------------------------------------------------------------------------------------------------------------------- */
  var TARGET = { photos: ".photo-strip", layers: ".layers" };
  function jump(sel) {
    var node = $(sel);
    if (!shown(node)) return;
    // under the shell's fixed bars when shell/shell.js is on the page
    var off = window.MLILY_SHELL && window.MLILY_SHELL.jumpOffset ? window.MLILY_SHELL.jumpOffset() : 16;
    var top = node.getBoundingClientRect().top + window.scrollY - off;
    window.scrollTo({ top: Math.max(0, top), behavior: reduceMotion.matches ? "auto" : "smooth" });
  }
  function act(action) { if (TARGET[action]) jump(TARGET[action]); }
  $$("[data-action]").forEach(function (b) {
    var a = b.getAttribute("data-action");
    if (TARGET[a] && !shown($(TARGET[a]))) b.style.display = "none";   // Photos and Layers only where the page has them
    if (TARGET[a]) b.addEventListener("click", function () { act(a); });
  });
  var KEYS = { p: "photos", l: "layers" };
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    if (document.querySelector("dialog[open]")) return;
    var action = KEYS[(e.key || "").toLowerCase()];
    if (!action) return;
    var b = $('[data-action="' + action + '"]');
    if (!shown(b)) return;
    e.preventDefault();
    act(action);
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
  function pageMarkdown() {
    var out = [], name = text($(".product-hero__title"));
    out.push("# " + name);
    var lead = [text($(".product-hero__kicker")), text($(".rail__tagline"))].filter(Boolean).join(" · ");
    if (lead) out.push(lead);
    if (filled($(".rail__description"))) out.push(text($(".rail__description")));
    if (filled($(".rail__best-for-text"))) out.push("**Best for:** " + text($(".rail__best-for-text")));
    var chips = $$(".icon-set__caption").map(text).filter(Boolean);
    if (chips.length) out.push("**Highlights:** " + chips.join(", "));
    var feels = $$(".variant-card").map(function (c) { return { label: text($(".variant-card__title", c)), line: text($(".variant-card__desc", c)) }; }).filter(function (f) { return f.label; });
    if (feels.length) { out.push("## Firmness"); out.push(feels.map(function (f) { return "- **" + f.label + "**" + (f.line ? ": " + f.line : ""); }).join("\n")); }
    var sizes = $$(".facts__size").map(text).filter(Boolean);
    if (sizes.length) out.push("**Sizes:** " + sizes.join(", "));
    var facts = $$(".facts__cell").map(function (c) { return [text($(".facts__label", c)), text($(".facts__value", c))]; }).filter(function (r) { return r[1]; });
    if (facts.length) { out.push("## At a glance"); out.push(facts.map(function (r) { return "- " + r[0] + ": " + r[1]; }).join("\n")); }
    var feelNames = $$(".layers__feel").map(text);
    var lists = [$(".layers__lists .w-dyn-list:not(.layers__alt)"), $(".layers__alt")].filter(Boolean);
    var stacks = lists.map(function (l, i) {
      var rows = $$(".layers__row", l).map(function (r) { return [text($(".layers__name", r)), text($(".layers__desc", r))]; }).filter(function (r) { return r[0]; });
      return { label: feelNames[i] || "", rows: rows };
    }).filter(function (s) { return s.rows.length; });
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
      var cells = cols.map(function (c) { return $$(".feels__cell", c).map(function (p) { return p.textContent.trim().split(/\n+/).map(function (s) { return s.trim(); }).filter(Boolean).join("; "); }); });
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
      new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) + ".");
    return out.join("\n\n") + "\n";
  }
  function copyNow(str) {   // fallback for browsers without the async clipboard
    var ta = document.createElement("textarea");
    ta.value = str; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
    ta.remove();
    return ok;
  }
  var copyMain = $(".page-copy__main"), copyLabel = copyMain && $(".page-action__label", copyMain), copyTimer;
  if (copyMain) copyMain.addEventListener("click", function () {
    var md = pageMarkdown(), name = text($(".product-hero__title"));
    var job = navigator.clipboard && navigator.clipboard.writeText ? navigator.clipboard.writeText(md).catch(function () { return copyNow(md) ? null : Promise.reject(); })
      : (copyNow(md) ? Promise.resolve() : Promise.reject());
    job.then(function () { done(true, "Copied the page text for " + name); }, function () { done(false, "Couldn't copy: the browser blocked the clipboard."); });
  });
  function done(ok, msg) {
    copyMain.classList.toggle("is-copied", ok);
    if (copyLabel) copyLabel.textContent = ok ? "Copied" : "Copy page";
    say(msg);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () { copyMain.classList.remove("is-copied"); if (copyLabel) copyLabel.textContent = "Copy page"; say(""); }, 1800);
  }

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
