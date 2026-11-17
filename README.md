# MLILY U 3.0 scripts

Page scripts for the MLILY U 3.0 Webflow site, served to Webflow through jsDelivr.

- `section-1/`: Section sample 1, the Learn / Sell / Market cards.
- `section-2/`: Section sample 2, the Midnight scroll section.

Each Webflow page loads a fixed version, so a change only goes live when the page is pointed at it:

    https://cdn.jsdelivr.net/gh/<account>/mlilyu-3-0-scripts@<commit or tag>/section-1/<file>.js

No keys, passwords or private data go in this repository: it is public.

## On the MLILY U 3.0 site

- Section sample 1: https://mlily-u-3-0.webflow.io/section-sample-1 loads `section-1/stage.css` (head) and `section-1/card.js` (footer).
- Section sample 2: `section-2/scenes.css` (head); GSAP 3.12.7 + ScrollTrigger (cdnjs), `section-2/vendor/lenis-1.1.5.min.js`, three.js r147 (jsDelivr npm) and `section-2/scenes.js` (footer). The scroll frames' address is the canvas's `data-src` in the page markup.

Pages always point at a full commit hash. Don't request a commit's files on jsDelivr before it is pushed: jsDelivr caches the "not found" for that address.

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
