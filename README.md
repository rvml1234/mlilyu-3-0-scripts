# MLILY U 3.0 scripts

Page scripts for the MLILY U 3.0 Webflow site, served to Webflow through jsDelivr.

- `section-1/`: Section sample 1, the Learn / Sell / Market cards.
- `section-2/`: Section sample 2, the Midnight scroll section.
- `pdp/`: the product page template (Mattresses).
- `shell/`: the 3.0 shell (top bar, menus, Mattress index).
- `find-specs/`: the Find Specs page and its data.

Each Webflow page loads a fixed version, so a change only goes live when the page is pointed at it:

    https://cdn.jsdelivr.net/gh/<account>/mlilyu-3-0-scripts@<commit or tag>/section-1/<file>.js

No keys, passwords or private data go in this repository: it is public.

## On the MLILY U 3.0 site

- Section sample 1: https://mlily-u-3-0.webflow.io/section-sample-1 loads `section-1/stage.css` (head) and `section-1/card.js` (footer).
- Section sample 2: `section-2/scenes.css` (head); GSAP 3.12.7 + ScrollTrigger (cdnjs), `section-2/vendor/lenis-1.1.5.min.js`, three.js r147 (jsDelivr npm) and `section-2/scenes.js` (footer). The scroll frames' address is the canvas's `data-src` in the page markup.

Pages always point at a full commit hash. Don't request a commit's files on jsDelivr before it is pushed: jsDelivr caches the "not found" for that address.

## Product page (Mattresses template, 2026-11-17)

`pdp/pdp.js` and `pdp/pdp.css`: the behaviour of the Webflow template page `/mattresses/[slug]`, the same as the prototype
(mlilyu-3-0-shell). The page reads correctly without them; they add:

- ® marks at 60 %, raised (`.reg-mark`)
- Actions row: Find Specs and Compare open their dialogs, Photos and Layers scroll to their section (keys S, C, P, L). At 1100 px and under, Compare, Photos and Layers sit in the More menu (`page-more`, `data-more-toggle`, `page-more__menu`, `page-more__item`). Copy page has its own menu (`page-copy__menu`, `data-copy-page`): page text, Markdown in a new tab, listing copy, and copying the page before opening a blank Claude or ChatGPT chat or the Cursor app. No AI service is called.
- Copy page: copies the page as Markdown, built from what the page shows
- Training: checklist collapses to two rows with a fade and "Show more"; the card fires a `video-open` event (no player yet)
- Photos: Swiper 11 (endless, free drag with momentum, arrows, keyboard) on the Webflow list itself
- Layers: the feel toggle swaps the first feel's rows (list filtered "First feel" on) for the other feel's (`.layers__alt`). A row opens the layer drawer (`pdp/layer-drawer.js` + `.css`, loaded when first wanted); "Also in" reads the other mattress pages.
- Common questions: "Show all N questions" swaps the first five (list limit 5) for the full list (`.faq__extra`, `data-faq-all`)
- Pairs with: mlilyusa.com links open in a new tab; the arrow shows only on those (CSS on the link)

`pdp.css` also carries the rules Webflow's API can't express as classes: children of the FAQ Rich Text answers and the
link-based arrow. Load order on the template page (Page settings, custom code):

    head:   https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.1.14/swiper-bundle.min.css
            https://cdn.jsdelivr.net/gh/rvml1234/mlilyu-3-0-scripts@<commit>/pdp/pdp.css
    footer: https://cdnjs.cloudflare.com/ajax/libs/Swiper/11.1.14/swiper-bundle.min.js
            https://cdn.jsdelivr.net/gh/rvml1234/mlilyu-3-0-scripts@<commit>/pdp/pdp.js

Hooks it relies on (Webflow class names): `pdp-page`, `page-action` + `data-action`, `page-copy__main`, `overview-video`,
`overview-checks` / `__list` / `__item` / `__text` + `data-checks-more`, `photo-strip` / `__track` / `__item` / `__nav--prev|next`,
`layers__feel`, `layers__lists`, `layers__alt`, `faq__lists`, `faq__extra`, `data-faq-more`, `pairs__card` / `__name` / `__ext`.
Test locally: save the published page as `pdp/_test.html` with these four files added, and serve the folder (not committed).

## Shell (top bar + Mattress index, 2026-11-17)

`shell/shell.js` and `shell/shell.css`: the behaviour of the Webflow shell (`header.sh-top`, `aside.side-index`), the same as the
prototype (mlilyu-3-0-shell: js/shell.js, js/side-index.js, data/nav.js). Webflow draws the bar and the index; the script adds:

- Links: library routes from the 3.0 sitemap (Draft E: /library, /library/products ...); each mattress link from the index item's `data-slug`
- Search: a real field in place of the placeholder, "/" to focus, local results (mattresses, then pages), arrows + Enter, Esc.
  Under 992 px the search icon opens it as a panel under the bar.
- Menu drawer (☰), account menu, tooltips on the icon buttons
- Theme button: pressed state and saved choice only (the light theme isn't built in Webflow yet)
- Mattress index (992 px and up): the sections move under the current mattress, jump under the bar, follow the scroll; its search
  filters mattresses and sections; ⌘K / Ctrl K focuses it
- Tablet and phone: a bar under the top bar once the title has scrolled past, with two dropdowns (switch mattress, jump to a section)

Load order on the template page: `pdp/pdp.css`, `pdp/pdp-laptop.css`, then `shell/shell.css` in the head; `shell/shell.js` in the footer after `pdp/pdp.js`
(`pdp-laptop.css` is generated: after changing tablet styles in Webflow and publishing, run `python3 tools/build-laptop-css.py`)

Find Specs and Compare on a mattress page: `pdp.js` loads `pdp/dialogs.css` + `pdp/dialogs.js` from its own folder the first time either is wanted. Find Specs there is a
quick lookup for that mattress and reads the page's SKU list from the CMS. Compare has no data file: it reads the mattress pages themselves.

Find Specs page (`/find-specs`): built in Webflow on `specs-*` classes. The header, tabs, filters, column headers, rows, details panel and footer are native elements. Each tab is a `[data-specs-panel]` with its own filters, `.specs-grid` table and SKU Collection List, and all five stay visible on the Designer canvas. `find-specs/find-specs.js` adds behaviour only (search, filters, sorting, grouping, columns, selection, details, copy and CSV) and `find-specs/find-specs.css` holds the states it switches, including showing one tab at a time. Load `shell/shell.css` + `find-specs/find-specs.css` in the head and `shell/shell.js` + `find-specs/find-specs.js` in the footer (same commit hash). Filters are kept in the address (`?type=&product=&feel=&build=&size=&q=`). Webflow classes are site-wide, so these names must stay different from the mattress modal's `specs-table`, `specs-row`, `specs-copy`, `specs-more` and `specs-toggle`.

The Find Specs modal and Copy page on mattress pages read the template's hidden SKU list (`[data-pdp-skus]`, one `[data-product]` row per SKU with `[data-sku-field]` values). In Webflow that Collection List is filtered by Category = Mattress and Mattress = Current Mattress.
(same commit hash). `pdp.js` asks the shell for its jump offset (`window.MLILY_SHELL.jumpOffset()`), 16 px without it.

Hooks: `sh-top`, `data-sh-menu`, `sh-home`, `page-crumbs__link`, `data-sh-search-box` + `sh-search__placeholder`,
`data-sh-search` (the icon), `sh-util` + `data-sh-link`, `data-sh-theme`, `data-sh-account`, `side-index`, `data-sh-index-search` +
`side-index__placeholder` + `side-index__kbd`, `side-index__product` + `data-slug` / `data-sub`, `side-index__sections` /
`side-index__section` (href `#<section id>`), `product-hero__title`, and `data-wf-item-slug` on `<html>` (Webflow's own).
Test locally: save the published page as `_shelltest.html` at the repo root with the jsDelivr links pointed at the local files,
plus the two shell files, and serve the folder (not committed).

## Class names (BEM, 2026-11-17)

Webflow classes and these files use the same names. Renamed from the prototype names:

| Was | Now |
|---|---|
| `sample`, `cards-row`, `card`, `card__*` | `pillars`, `pillars__row`, `pillar-card`, `pillar-card__*` |
| `scenes`, `scenes__*` (`scenes__seg`) | `store-scroll`, `store-scroll__*` (`store-scroll__segment`) |
| `shade`, `shade--left/bottom/floor/photo` | `scene-panel__shade`, `scene-panel__shade--*` |
| `floor-wrap`, `floor`, `floor__plate` | `floor-plan`, `floor-plan__plane`, `floor-plan__plate` |
| `sr-only` | `u-sr-only` |

New classes on elements that were styled by tag: `scene-copy__title` (h2), `scene-copy__text` (p), `medley__img`, `floor-label__img`, `intro-line__inner`; the page's `<main>` is `page-main`.
Classes the scripts draw inside the card pictures (`board__*`, `ui__*`, `doc-*`) and the `data-*` hooks are unchanged.

## Images: Webflow Assets vs this repo (2026-11-17)

**Rule:** every image a person places, swaps or writes alt text for lives in **Webflow Assets**. Files only code reads stay **here**:
the 241 scroll frames (numbered addresses; Webflow puts a random ID in front of every file name), the 3D floor textures and bed
covers (section-2/assets), and the pieces card.js draws the card pictures from (section-1/img).

**Webflow Assets folders** (file each image by what it shows, not where it is used, so one photo serves every page):

```
01 Brand        logos, wordmarks, lockups
02 Products     Mattresses / Bases / Pillows / Toppers (more lines as needed), then one folder per product
03 Lifestyle    rooms and people not tied to one product
04 Sections     art made for one component only: Pillars, Store scroll
05 Pages        one-off page images (social share images, page heroes)
06 Icons        feature and category icons
99 Stand-ins    stock or placeholder images still to be replaced
```

**File names:** lowercase, words joined by hyphens, no dates or version numbers. Name the file before uploading: a rename in Webflow
changes only the name in the panel, not the image's web address.

- Product: `mlily-{product}-{shot}-{nn}`, e.g. `mlily-midnight-ice-1-0-lifestyle-01.webp`. Shots: silo, lifestyle, detail, layers, cutaway, front, side, top.
- Section-only art: the component's class name first, e.g. `store-scroll-label-new-model.webp`.
- Icons: `icon-{meaning}.svg`, e.g. `icon-10-year-warranty.svg`.
- Stand-ins: `standin-{source}-{subject}`, e.g. `standin-pexels-8730014-associate-tablet.jpg`.
- Formats: webp for photos (2400 px long edge full-screen, 1600 px for cards), svg for logos and icons. Alt text on the asset; leave it empty for decorative images.
