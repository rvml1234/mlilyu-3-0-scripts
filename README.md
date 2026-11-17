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
