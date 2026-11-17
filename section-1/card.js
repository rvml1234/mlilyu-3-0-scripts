// Webflow build of Section sample 1 (2026-11-17), from rv3-air-card-hover r3-99 (the local prototype, unchanged).
// Served by jsDelivr from github.com/rvml1234/mlilyu-3-0-scripts. The only change from the prototype: images load from
// this script's own folder (…/section-1/img/) instead of assets/img/, so the page can live on Webflow.
// rv3: air.inc's three agent cards (Understand, Organize, Scale), ported from their WebGL versions (chunk 7789:
// AgenticPromptUnderstandCard / OrganiseCard / ScaleCard) to HTML + CSS 3D, with MLILY content.
//
// What is Air's, kept as in their code:
// - Each card is a set of "boards" in a 355-unit square (y up, origin in the middle) and a list of phase lengths:
//   Understand 2400/2400/1000 ms (after our dashboard intro, r3-12), Organize 1500/2200/500/1000, Scale
//   900/700/1500/900/100/1500.
// - Each board has a rest state and one timeline entry per phase. A phase's state is the rest state with every entry up
//   to that phase merged in, the current one only after its delay. In the last phase, and on inactive cards, all rests.
// - Every frame each value moves toward its target by 5 × frame time (capped at 1/30 s); tags and titles scale at 10 ×;
//   "snap" jumps. The picture tilts toward the pointer, up to π/16, easing at 4 × frame time.
// - Row: one card active at a time, the others dimmed. The active card plays its loop once, then after 0.8 s the next
//   card takes over (Understand → Organize → Scale). Hovering or focusing a card makes it active and holds it there.
// What is ours: the photos, the Midnight 1.0 layer art from the catalog, the panel and chip text (written as HTML
// instead of Air's text images), the colours of Scale's formats (MLILY palette), and the lift that spreads the mattress
// layers apart on top of Air's depth separation.
// r3-35: the second card is Sell (it replaced Organize); r3-36: Sell's own storyboards, see LINEUP / sellLineup().
// r3-55: the third card is Market (it replaced Scale), storyboard "Post it", see market().
(() => {
  const IMGBASE = (document.currentScript && document.currentScript.src) ? new URL('img/', document.currentScript.src).href : 'img/';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const noHover = matchMedia('(hover: none)').matches;
  const UNITS = 355;
  // The cursor tilt (Air's, 180 / 16 degrees). r3-72 had dropped it ("Our own frame"); r3-76 (Ramir: "air.inc's mouse hover
  // interaction seems to be removed. Can you bring that back?") brings it back, alongside the light trail and the scale-in.
  const TILT_MAX = 180 / 16;
  const FIT = 0.93; // r3-73: the scenes' size in the picture (see measure)
  const GAP = 800;

  const U = (a, b) => a + b / 2;
  const B = (a, b) => a - b / 2;

  const IMG = {
    video: { src: IMGBASE + 'asset-video.jpg', aspect: 420 / 600 },
    lifestyle: { src: IMGBASE + 'asset-lifestyle.jpg', aspect: 432 / 540 },
    product: { src: IMGBASE + 'asset-product.jpg', aspect: 432 / 540 },
    brand: { src: IMGBASE + 'asset-brand.jpg', aspect: 400 / 540 },
    coverBrand: { src: IMGBASE + 'folder-brand.jpg', aspect: 1 },
    coverVideos: { src: IMGBASE + 'folder-videos.jpg', aspect: 1 },
    coverLifestyle: { src: IMGBASE + 'folder-lifestyle.jpg', aspect: 1 },
    coverProduct: { src: IMGBASE + 'folder-product.jpg', aspect: 1 },
    cutout: { src: IMGBASE + 'product-midnight-cutout.webp', aspect: 900 / 427 },
  };
  ['cover-midnight', '1-5-copper-gel-aerofusion-r-memory-foam', '1-5-gel-aerofusion-r-memory-foam', '2-gentle-flex-foam',
    '6-individually-pocketed-springs-w-foam-encasement', '1-flex-support-base-foam', 'tray-midnight']
    .forEach((n) => { IMG[n] = { src: `${IMGBASE}layer-${n}.webp`, aspect: 980 / 1278 }; });

  // r3-99: measure in the face the page draws with (--font-mont: Adobe's "Montserrat CC" since r3-98). Measuring plain
  // 'Montserrat' read Google's face, which the page no longer uses, so it wasn't loaded yet and the canvas measured a
  // fallback ~13% narrower: the indicator pills came out too short and clipped their labels.
  const FONT_STACK = getComputedStyle(document.documentElement).getPropertyValue('--font-mont').trim() || 'Montserrat';
  const textWidth = (() => {
    const ctx = document.createElement('canvas').getContext('2d');
    return (text, font) => { ctx.font = font.replace(/Montserrat$/, FONT_STACK); return ctx.measureText(text).width; };
  })();

  /* ── Understand ──────────────────────────────────────────────────────────────────────────────────────────────────
     Air: four cut-out layers of one photo pull apart in depth while a light sweep runs over them; two glass panels
     (summary, engagement) slide in, then a "detected text" panel and tag chips. Ours: the Midnight 1.0 construction
     (catalog art, one full-frame layer per piece) on an off-white frame; the layers also lift apart (4, then 10 units
     per gap) so the build reads; the panels say what it is and what MLILY U holds for it; the chips tag it.
     r3-12 (Ramir, 2026-11-10): the frame opens as a mini MLILY U dashboard, a search field over four categories to
     browse. It types "Midnight 1.0", the Midnight 1.0 card drops in under the field, a pointer clicks it, and the card
     pops out over the dashboard (centred, a dark scrim behind it); the layer art grows out of it and the layer animation
     runs as before. The loop ends back on the dashboard. No blue highlight (his note on the r3-09 try, along with the
     typed text not showing). r3-14 (Ramir: "Let's use actual images and not just icons. Don't have 'browse' as all
     uppercase letters. Use a black background for the dashboard because I prefer it be in dark mode"): the dashboard is
     a black panel over the off-white frame, with white type and MLILY lifestyle photos for the four categories. */
  function understand() {
    // Dashboard intro: rest, type, card drops in, pointer, press, pop out, layers grow. Then the layer animation's own
    // two phases, then the way back (r3-15, Ramir: "The transition back from the layers into the dashboard is a bit
    // weird"): first the pop-ups go and the layers stack back together, then the stack cross-fades into the dashboard,
    // whose pieces settle in a beat later. The rest phase is a short hold on the dashboard. (Before, all of it happened at
    // once: the dashboard faded in over the still-open layers and tags, with the larger off-white frame as a rim.)
    // r3-31 (Ramir: "Have an additional animation where the layers flush the right, and the indicators show up pointing to
    // the layers. Cut off the layers so it doesn't feel cramped inside, so maybe a mask would help."): a third layer beat
    // (INDICATE, 2.6 s) before the way back.
    const phases = [300, 1050, 550, 650, 160, 650, 650, 2400, 2400, 2600, 700, 650, 500];
    const INTRO = 7;
    const pad = (timeline) => [...Array.from({ length: INTRO }, () => ({})), ...timeline];
    const POP = INTRO - 2; // the card pops out
    const GROW = INTRO - 1; // the layer art grows; the dashboard goes
    const INDICATE = INTRO + 2; // the stack slides right, cut off by the card's edge; indicators point at the layers (r3-31)
    const BACK = INTRO + 3; // the pop-ups go, the layers re-stack, the frame returns to the dashboard's size
    const HOME = BACK + 1; // the stack cross-fades into the dashboard
    const SETTLE = 6; // units the dashboard's pieces rise as they come back
    // A timeline from a { phase: entry } map; phases without an entry change nothing.
    const seq = (m) => Array.from({ length: Math.max(...Object.keys(m).map(Number)) + 1 }, (_, i) => m[i] || {});
    const ef = (1132 / 1328) * 287.55;
    const back = ['backdrop', 'tray-midnight', '1-flex-support-base-foam', '6-individually-pocketed-springs-w-foam-encasement',
      '2-gentle-flex-foam', '1-5-gel-aerofusion-r-memory-foam', '1-5-copper-gel-aerofusion-r-memory-foam', 'cover-midnight'];
    const fromTop = { 'cover-midnight': 0, '1-5-copper-gel-aerofusion-r-memory-foam': 1, '1-5-gel-aerofusion-r-memory-foam': 2,
      '2-gentle-flex-foam': 3, '6-individually-pocketed-springs-w-foam-encasement': 4, '1-flex-support-base-foam': 5, 'tray-midnight': 6 };
    const n = back.length;
    // INDICATE: the stack at full size, centred at x 125, so its right third runs past the picture's edge and the card's
    // clip cuts it off (the mask); the frame grows to 340 behind it so its own corners are outside the clip too.
    const SX9 = 125;
    const layers = back.map((id, t) => {
      const lift = id === 'backdrop' ? 0 : 3 - fromTop[id];
      const z = -(5 * n) + 0.1 * t;
      const parted = [
        { agentic: 1, w: ef, h: 319.5, x: 0, y: lift * 4, z: (t + 1 - n) * 5 },
        { x: 0, y: lift * 10, z: (2 * (t + 1) - n) * 5 },
      ];
      const flush = id === 'backdrop' ? { w: 340, h: 340, x: 0, y: 0 } : { x: SX9, y: lift * 10 }; // INDICATE (r3-31)
      const stacked = { agentic: 0, w: 0.9 * ef, h: 287.55, x: 0, y: 0, z }; // the way back: together again, sweep off
      // The backdrop is the dashboard's frame, so it shows from the start. The layer art waits small and hidden at the
      // centre, where the card pops out, and grows to the full stack from there; on the way back it re-stacks, then fades
      // under the dashboard.
      if (id === 'backdrop') {
        return { kind: 'layer', img: null, backdrop: true, w: 0.9 * ef, h: 287.55, x: 0, y: 0, z, agentic: 0, radius: 12,
          timeline: [...pad(parted), flush, stacked] };
      }
      return {
        kind: 'layer', img: id, img0: false, w: 0.9 * ef * 0.36, h: 287.55 * 0.36, x: 0, y: 0, z, agentic: 0, radius: 12,
        timeline: [...Array.from({ length: GROW }, () => ({})), { img: true, w: 0.9 * ef, h: 287.55 }, ...parted, flush, stacked, { img: false }],
      };
    });
    // The dashboard (r3-12; dark since r3-14), laid out in the frame (220.6 × 287.55 units): a black panel the size of the
    // frame, the search field on top, a "Browse" label and four category photos. It sits just in front of the off-white
    // frame (which the layer art needs), stays (under the scrim) while the card pops out, and goes as the layer art grows.
    const DASH_Z = -36;
    const gone = { img: false, fill: 0, edge: 0 };
    const at = (phase, entry) => Array.from({ length: phase + 1 }, (_, i) => (i === phase ? entry : {}));
    const hairline = { edgeA: 0.12 }; // a light 1 px edge on the dark panel
    const dash = { kind: 'dash', w: 0.9 * ef, h: 287.55, x: 0, y: 0, z: -38, fill: 1, radius: 12, rate: 9,
      timeline: seq({ [GROW]: { fill: 0 }, [HOME]: { fill: 1 } }) };
    const TYPE_AT = [60, 140, 210, 300, 370, 450, 520, 610]; // ms into the typing phase, per letter ("Midnight" since r3-49)
    // The field is cleared while hidden (BACK), so it comes back empty, on its placeholder.
    const search = { kind: 'field', content: 'search', dw: 192, aspect: 192 / 26, w: 192, h: 'auto', x: 0, y: 99.5, z: DASH_Z,
      fill: 1, edge: 1, ...hairline, radius: 8, rate: 9,
      type: { text: 'Midnight', phase: 1, at: TYPE_AT, focus: [0, 4], clear: BACK }, // r3-49: "just put midnight" 
      timeline: seq({ [GROW]: gone, [BACK]: { y: 99.5 - SETTLE }, [HOME]: { delay: 200, img: true, fill: 1, edge: 1, y: 99.5 } }) };
    // The label goes as the card drops in over it (otherwise its first letter peeks out beside the card's press).
    const browse = { kind: 'field', content: 'browse', dw: 60, aspect: 60 / 10, w: 60, h: 'auto', x: -66, y: 70, z: DASH_Z, // 10 tall: Montserrat's line (r3-27)
      fill: 0, edge: 0, rate: 7, timeline: seq({ 2: { img: false }, [BACK]: { y: 70 - SETTLE }, [HOME]: { delay: 260, img: true, y: 70 } }) };
    const tiles = [['Mattress', -50, 18.5], ['Base', 50, 18.5], ['Pillow', -50, -71.5], ['Protector', 50, -71.5]]
      .map(([key, x, y], i) => ({ kind: 'field', content: `tile${key}`, contentClass: 'tile', dw: 92, aspect: 92 / 82, w: 92, h: 'auto',
        x, y, z: DASH_Z, fill: 1, edge: 1, ...hairline, radius: 8, rate: 7,
        timeline: seq({ [GROW]: gone, [BACK]: { y: y - SETTLE }, [HOME]: { delay: 300 + 50 * i, img: true, fill: 1, edge: 1, y } }) }));
    // A black scrim over the dashboard while the card is out (an overlay, not a shadow); stronger on the dark panel.
    const scrim = { kind: 'scrim', w: 0.9 * ef, h: 287.55, x: 0, y: 0, z: -32, fill: 0, radius: 12,
      timeline: [...at(POP, { fill: 0.5 }), { fill: 0 }] };
    // The Midnight 1.0 card: drops in under the field, presses (a small shrink, no ring), pops out to the centre of the
    // frame, larger and forward, and dissolves into the layer art. rate 9 (Air's is 5) so the press reads as a click.
    // r3-20 (Ramir: "improve the padding and corner edging for the product card after search"): 66 units tall, 9 units of
    // padding, corner 14 with the thumbnail's 5 nested inside it (14 − 9), and the corner now scales with the card as it
    // pops out (see frame()), so the corners stay concentric; a slightly firmer edge over the photos behind it.
    const result = { kind: 'field', content: 'result', dw: 192, aspect: 192 / 66, w: 184, h: 'auto', x: 0, y: 54.5, z: -30,
      fill: 0, edge: 0, ...hairline, edgeA: 0.16, img: false, radius: 8, rate: 9, // corner 8 (Ramir in Figma, r3-28; was 14)
      timeline: [{}, {}, { delay: 60, img: true, fill: 1, edge: 1, w: 192, y: 48.5 }, {}, { w: 189 },
        { w: 224, x: 0, y: 0, z: 30 }, { ...gone, w: 236 }] };
    const pointer = { kind: 'pointer', content: 'pointer', dw: 14, aspect: 14 / 19.25, w: 14, h: 'auto', x: 150, y: -160, z: 60,
      img: false, rate: 9,
      timeline: [{}, {}, {}, { delay: 80, img: true, x: 49, y: 39 }, { w: 11.5 }, { img: false, w: 14, x: 58, y: 27 }] };
    // The pop-ups are dark glass here (css), so their light edge is softer (edgeA) than the other cards' (0.5).
    const panel = (content, dw, aspect, x, y, z, w0, timeline) => (
      { kind: 'glass', content, dw, aspect, w: w0, h: 'auto', x, y, z, edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 8, timeline }); // corner 8 (r3-28; was 12)
    // Depth, not z-index, decides what is in front in this 3D picture. In the second phase the layers spread toward the
    // viewer and the knit cover reaches z 40, past Air's 30 for the "Detected layers" panel (and the chips then), so it
    // covered them (Ramir, 2026-11-09). That panel and the video pop-up sit FRONT units further forward (54), and the first
    // two panels step forward as they fade out, so the advancing cover never passes them either.
    const FRONT = 24;
    // r3-37: in each beat the top-left pop-up stays dark glass (Summary, Mattress layers) and the bottom-right one is white
    // (How it feels, Training video), like Ramir's reference; its edge is a faint ink hairline instead of the light ring.
    // r3-66 (Ramir: "I'm not a fan with how our white cards have a subtle stroke, let's remove them."), r3-67 (Ramir: "also
    // fix these corner edges that have a small line on them."): a white card has no edge ring at all (edgeA 0). r3-66's
    // white ring did not meet the card's own corner exactly, so a thin line showed round the corners. The checklist, What
    // to say and Caption idea do the same.
    const light = (b) => ({ ...b, theme: 'light', edgeA: 0 });
    const info = [
      panel('summary', 220, 220 / 70, -47.5, 39.75, 30, 100, // r3-69: z 30 (was 22), as all the pop-ups came forward // left side (Ramir, r3-30: "Put summary to the left. so they occupy each side"); How it feels stays right // 70: its content + Ramir's 10/10 padding (Figma rounds text up: 71)
        pad([{ delay: 200, edge: 1, glass: 1, img: true, w: 220 }, { edge: 0, glass: 0, img: false, z: 30 + FRONT }, {}])),
      // r3-33 (Ramir: "We might need to replace the in mlily u bit because those are sales tools not learning ones."): the
      // In MLILY U checklist (Spec card / Price card / Training video) is now "How it feels", in the same place and size.
      light(panel('feel', 220, 220 / 72.8, 47.5, -70.25, 30, 100, // 72.8 (measured): caption + two feel rows + the scale + 10/10 padding
        pad([{ delay: 300, edge: 1, glass: 1, img: true, w: 220 }, { edge: 0, glass: 0, img: false, z: 30 + FRONT }, {}]))),
      panel('layers', 154, 154 / 86.5, -67.5, 80, 38 + FRONT, 70, // 86.5: content + 10/10 padding (Figma: 88)
        // r3-16: on the way back it shrinks as it fades, as it grew in.
        pad([{}, { delay: 300, edge: 1, glass: 1, img: true, w: 154 }, { edge: 0, glass: 0, img: false, w: 70 }, {}])),
      // r3-15 (Ramir: "in place of 'smart tags', let's have a video thumbnail there ... of the midnight overview video"):
      // the Smart tags label and its eight chips are now one pop-up, where the chips were, after the Detected layers
      // panel. r3-18 (Ramir: "That video card needs better padding, it is also showing the incorrect video. That is not
      // the training video."): it shows the Midnight onboarding (training) video mlilyu.com plays on the Midnight page
      // (2:36; assets/img/SOURCES-dashboard.md), with the other pop-ups' padding (11 units) and its label on top.
      light(panel('video', 156, 156 / 142.9, 55, -59, 38 + FRONT, 114, // 142.9: content + 11/11 padding (Figma: 144.38)
        pad([{}, { delay: 380, edge: 1, glass: 1, img: true, w: 156 }, { edge: 0, glass: 0, img: false, w: 114 }]))),
    ];
    // The indicators (r3-31): a dark glass pill per layer on the left, each on its layer's line (its centre in the art,
    // measured from the layer PNGs) and at its depth, with a dotted leader to a dot on the layer's left end.
    const IND = [
      ['cover-midnight', 0.21, 'Comfort Knit Fabric Cover'],
      ['1-5-copper-gel-aerofusion-r-memory-foam', 0.267, '1.5" Copper Gel AeroFusion®'],
      ['1-5-gel-aerofusion-r-memory-foam', 0.323, '1.5" Gel AeroFusion®'],
      ['2-gentle-flex-foam', 0.389, '2" Gentle Flex Foam'],
      ['6-individually-pocketed-springs-w-foam-encasement', 0.539, '6" Pocketed Springs'],
      ['1-flex-support-base-foam', 0.67, '1" Flex Support Base Foam'],
    ];
    const LEFT_END = SX9 + (0.061 - 0.5) * ef; // the layers' left end once flush right (x 17.4)
    const PILL_RIGHT = -7;
    const LEAD_FROM = -5;
    const LEAD_TO = LEFT_END + 3.6; // the dot sits just on the layer
    // r3-34 (Ramir's Figma tuning, "indicator pill" 8214:3198): padding 4 / 7 (was 3.5 / 7) and line height Auto, so the
    // pill is the label's normal line (9.75 at Montserrat 8) + 4 + 4. Was 15 (3.5 + 8 + 3.5).
    const PILL_H = 17.75;
    const indicators = IND.flatMap(([id, frac, text], i) => {
      const t = back.indexOf(id);
      const lift = 3 - fromTop[id];
      const y = (0.5 - frac) * 319.5 + lift * 10;
      const z = (2 * (t + 1) - n) * 5 + 1;
      const pw = Math.ceil(textWidth(text, '500 8px Montserrat')) + 14;
      const len = LEAD_TO - LEAD_FROM;
      const leader = { kind: 'note', content: 'leader', html: '<span class="ui__leader-line"></span><span class="ui__leader-dot"></span>',
        dw: len, aspect: len / 4, w: len, h: 'auto', x: LEAD_FROM + len / 2, y, z, img: false, rate: 9,
        timeline: seq({ [INDICATE]: { delay: 480 + 90 * i, img: true }, [BACK]: { img: false } }) };
      const pill = { kind: 'glass', content: 'indicator', html: `<span class="ui__ind">${text}</span>`, dw: pw, aspect: pw / PILL_H,
        w: pw * 0.92, h: 'auto', x: PILL_RIGHT - pw / 2 - 6, y, z, edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 5, rate: 9,
        timeline: seq({ [INDICATE]: { delay: 520 + 90 * i, edge: 1, glass: 1, img: true, w: pw, x: PILL_RIGHT - pw / 2 },
          [BACK]: { edge: 0, glass: 0, img: false } }) };
      return [leader, pill];
    });
    // r3-57 (Ramir: "Also add firmer 1.0 in the whitespace there", on the INDICATE beat): the build's name, in ink, in the
    // empty space at the bottom left, its left edge on the widest pill's; it comes in after the pills and goes with them.
    const VL = Math.ceil(textWidth('Firmer 1.0', '600 12px Montserrat')) + 2;
    const VL_LEFT = PILL_RIGHT - (Math.ceil(textWidth('1.5" Copper Gel AeroFusion®', '500 8px Montserrat')) + 14);
    const variantLabel = { kind: 'note', content: 'variant-label', html: '<span class="ui__variant-label">Firmer 1.0</span>', dw: VL, aspect: VL / 14,
      w: VL, h: 'auto', x: VL_LEFT + VL / 2 - 2.7, y: -112, z: -9, img: false, rate: 9, // −2.7: lines up with the widest pill, which sits at another depth
      timeline: seq({ [INDICATE]: { delay: 1100, img: true, y: -118 }, [BACK]: { img: false } }) };
    // r3-68 (Ramir: "Let's apply the light trail to all 3."): the dot grid's light trail, as on Market (see createCard).
    return { phases, boards: [...layers, dash, search, browse, ...tiles, scrim, result, ...info, ...indicators, variantLabel, pointer], trail: true, zoom: 1.025 }; // r3-72: the scale-in on all three (r3-73: 1.025, was 1.035)
  }

  /* ── Sell ────────────────────────────────────────────────────────────────────────────────────────────────────────
     r3-35 dealt Midnight 1.0's floor files out of a fanned stack into tiles, which was Organize's storyboard with our
     files (Ramir: "It feels like air.inc but with different assets ... Air's motion is good, it's just the storyboard
     should be different"; no showroom stills). Three storyboards of our own are proposed, shown one by one (Ramir: "I want
     to see them 1 by 1"), each behind ?sell=1, 2 or 3; the newest is the default.

     1, "Every bed's card" (r3-36): the spec cards of the catalog's six mattresses glide past as a carousel and stop on
     Midnight 1.0; a tap brings it forward and its price card (MLILY's blank, fillable form) slides out from behind it;
     "Print both" is pressed; then the pair goes back into the carousel, which glides back. Data from the vv PDP's
     products.js (Pocket Catalog 2026 / Price Book): names, 1.0 builds (PowerCool Pro: Firm), heights, first benefit line,
     badges. The cards' layout is MLILY's own spec card (the WellFlex 1.0 card, wellflex-card-thumbnails/). */
  const LINEUP = [
    { id: 'wellflex', name: 'WellFlex 1.0', toggle: ['Firmer 1.0', 'Plusher 3.0'], type: '12″ Memory Foam Mattress',
      desc: 'Crafted with sustainable materials, the cover features fabric made from recycled thread while the core includes BioBreeze™ Memory Foam.',
      layers: ['Comfort Knit Fabric Cover', '1″ BioBreeze™ Memory Foam', '2″ Performance Memory Foam', '9″ Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['sustainable-materials', 'Sustainable Materials'], ['increased-breathability', 'Increased Breathability'], ['adapts-to-body', 'Adapts to Body']] },
    { id: 'wellflex-ice', name: 'WellFlex ICE 1.0', toggle: ['Firmer 1.0', 'Plusher 3.0'], type: '14″ Memory Foam Mattress',
      desc: 'Crafted with sustainable materials, the cover features fabric made from recycled thread while the core includes BioBreeze™ Memory Foam.',
      layers: ['Enhanced Cooling Knit Fabric Cover', '1.5″ Gel AeroFusion® Memory Foam w/ ActiveTemp™ PCM', '1″ BioBreeze™ Memory Foam', '2″ Performance Memory Foam', '9.5″ Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['sustainable-materials', 'Sustainable Materials'], ['increased-breathability', 'Increased Breathability'], ['adapts-to-body', 'Adapts to Body'], ['pcm-coating', 'PCM Coating']] },
    { id: 'chiropro', name: 'ChiroPro 1.0', toggle: ['Firmer 1.0', 'Plusher 3.0'], type: '13″ Zoned Hybrid Mattress',
      desc: 'Developed in collaboration with the International Chiropractors Association, a leading organization dedicated to improving spinal health.',
      layers: ['Comfort Knit Fabric Cover', '1.5″ Gel AeroFusion® Memory Foam', '1.5″ Gentle Flex Foam', '1″ Flex Comfort Foam', '8″ 3-Zone Individually Pocketed Springs w/ Foam Encasement', '1″ Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['chiropractors-choice', 'Chiropractor’s Choice'], ['adapts-to-body', 'Adapts to Body'], ['3-zone-pocket-springs', '3-Zone Pocket Springs']] },
    { id: 'midnight', name: 'Midnight 1.0', toggle: ['Firmer 1.0', 'Plusher 3.0'], type: '12″ Hybrid Mattress',
      desc: 'Copper’s natural properties promote better air circulation and temperature regulation, leading to a more comfortable and refreshing night’s sleep.',
      layers: ['Comfort Knit Fabric Cover', '1.5″ Copper Gel AeroFusion® Memory Foam', '1.5″ Gel AeroFusion® Memory Foam', '2″ Gentle Flex Foam', '6″ Individually Pocketed Springs w/ Foam Encasement', '1″ Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['regulates-temperature', 'Regulates Temperature'], ['adapts-to-body', 'Adapts to Body'], ['copper-infused', 'Copper Infused']] },
    { id: 'midnight-ice', name: 'Midnight ICE 1.0', toggle: ['Firmer 1.0', 'Plusher 3.0'], type: '14″ Hybrid Mattress',
      desc: 'Copper’s natural properties promote better air circulation and temperature regulation, leading to a more comfortable and refreshing night’s sleep.',
      layers: ['Enhanced Cooling Knit Fabric Cover', '1.5″ Copper Gel AeroFusion® Memory Foam w/ ActiveTemp™ PCM', '2.5″ Gel AeroFusion® Memory Foam', '2.5″ Gentle Flex Foam', '6″ Individually Pocketed Springs w/ Foam Encasement', '1.5″ Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['regulates-temperature', 'Regulates Temperature'], ['adapts-to-body', 'Adapts to Body'], ['copper-infused', 'Copper Infused'], ['pcm-coating', 'PCM Coating']] },
    { id: 'powercool', name: 'PowerCool Pro', toggle: ['Firm', 'Medium'], type: '13″ Ventilated Hybrid Mattress',
      desc: 'Fully ventilated mattress design promotes optimal passive airflow and disperses heat to maintain a comfortable sleep environment.',
      layers: ['Cooling Knit Fabric Cover', '2″ Ventilated Latex-like AdaptiFoam®', '1.5″ Ventilated Flex Comfort Foam', '6.5″ Individually Pocketed Springs w/ Foam Encasement', '1.5″ Ventilated Flex Support Base Foam'],
      icons: [['10-year-warranty', '10 Year Warranty'], ['cooling-fabric', 'Cooling Fabric'], ['regulates-temperature', 'Regulates Temperature'], ['ventilated-memory-foam', 'Ventilated Memory Foam']] },
  ];
  const specCard = (p) => '<div class="doc-side">' +
    `<p class="doc-side__name">${p.name}</p><p class="doc-toggle"><span>${p.toggle[0]}</span><span>${p.toggle[1]}</span></p>` +
    `<span class="doc-side__art" style="background-image: url('${IMGBASE}sell-art-${p.id}.webp')"></span>` +
    `<p class="doc-side__type">${p.type}</p><span class="doc-band"><img src="${IMGBASE}mlily-wordmark-white.svg" alt=""></span></div>` +
    `<div class="doc-main"><p class="doc-h">DESCRIPTION</p><p class="doc-p">${p.desc}</p><p class="doc-pill">${p.toggle[0]}</p>` +
    `<ul class="doc-list">${p.layers.map((l, i) => `<li><i>${i + 1}</i>${l}</li>`).join('')}</ul>` +
    `<p class="doc-h doc-h--gap">KEY BENEFITS</p><ul class="doc-icons">${p.icons.map(([f, t]) => `<li><img src="${IMGBASE}sell-icon-${f}.svg" alt="">${t}</li>`).join('')}</ul></div>`;

  // MLILY's price card (blank and fillable: the store writes in its own prices), after the WellFlex 1.0 card: the name
  // band, the product on white, one column per size the product comes in, the wordmark band. Its seals are left out.
  const priceCard = (p) => `<div class="doc-top"><b>${p.name}</b><span>${p.type}</span></div>` +
    `<span class="doc-photo" style="background-image: url('${IMGBASE}${p.photo}')"></span>` +
    `<div class="doc-sizes" style="grid-template-columns: repeat(${p.sizes.length}, 1fr)">${p.sizes.map((z) => `<span>${z}</span>`).join('')}</div>` +
    '<div class="doc-foot"><img src="' + IMGBASE + 'mlily-wordmark-white.svg" alt=""></div>';

  function sellLineup() {
    // HOLD 0.5 s, STEP1 0.65, STEP2 0.75 (the carousel glides two cards to Midnight 1.0), AIM 0.45, TAP 0.16, OPEN 1.3
    // (the pair), REACH 0.8, PRINT 0.2, HOLD 0.9, BACK 0.9, UNSTEP 0.65, rest 0.9 (the carousel glides back).
    const phases = [500, 650, 750, 450, 160, 1300, 800, 200, 900, 900, 650, 900];
    const [STEP1, STEP2, AIM, TAP, OPEN, REACH, PRINT, HOLD, BACK, UNSTEP] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const seq = (m) => Array.from({ length: Math.max(...Object.keys(m).map(Number)) + 1 }, (_, i) => m[i] || {});
    const DOC_A = 2070 / 1600; // MLILY's spec and price cards' landscape page
    const DW = 290; // the cards' layout width (their right column needs it); shown smaller
    const FY = -2; // the carousel's line
    const PY = 10; // the pair's line
    const START = 1; // at rest WellFlex ICE is in front; the glide brings Midnight 1.0 (index 3) there in two steps
    const HERO = 3;
    // Carousel slots by offset from the front card: the side cards turn toward the middle (rotateY) and sit further back;
    // the third ones out are hidden. Their z keeps each outer card behind its inner neighbour's edge.
    const slot = (k) => {
      const a = Math.abs(k);
      const d = Math.sign(k);
      if (a === 0) return { x: 0, y: FY, z: 0, ry: 0, w: 210, img: true, fill: 1 };
      if (a === 1) return { x: 122 * d, y: FY, z: -62, ry: 42 * d, w: 160, img: true, fill: 1 };
      if (a === 2) return { x: 192 * d, y: FY, z: -165, ry: 50 * d, w: 136, img: true, fill: 1 };
      return { x: 232 * d, y: FY, z: -215, ry: 56 * d, w: 120, img: false, fill: 0 };
    };
    // No dark panel: it would have to sit behind the carousel's back cards, where the perspective shrinks it. The cards
    // sit on the page's Best Blue, like Air's own cards.
    const head = { kind: 'field', content: 'cardsHead', contentClass: 'kit-head', dw: 278, aspect: 278 / 26, w: 278, h: 'auto',
      x: 0, y: 126, z: -10, fill: 0, edge: 0 };
    const cards = LINEUP.map((p, i) => {
      const m = { [STEP1]: slot(i - START - 1), [STEP2]: slot(i - HERO), [UNSTEP]: slot(i - START - 1) };
      if (i === HERO) Object.assign(m, { [TAP]: { w: 204 }, [OPEN]: { x: -72, y: PY, z: 12, ry: 0, w: 136 }, [BACK]: slot(0) });
      const rest = slot(i - START);
      if (rest.img) delete rest.img; // a top-level img names a picture (IMG); visible is the default
      return { kind: 'field', content: 'spec', contentClass: 'doc-spec', html: specCard(p), bg: '#ffffff', dw: DW, aspect: DOC_A,
        h: 'auto', ...rest, edge: 0, radius: 3, rate: 5, timeline: seq(m) };
    });
    // Midnight 1.0's price card waits hidden behind the front card and slides out to the right as the spec card moves left.
    const price = { kind: 'field', content: 'docPrice', contentClass: 'doc-price', bg: '#ffffff', dw: DW, aspect: DOC_A, w: 150, h: 'auto',
      x: 0, y: FY, z: -4, edge: 0, img: false, fill: 0, radius: 3, rate: 5,
      timeline: seq({ [OPEN]: { delay: 140, x: 72, y: PY, z: 10, w: 136, img: true, fill: 1 }, [BACK]: { x: 0, y: FY, z: -4, w: 150, img: false, fill: 0 } }) };
    const scrim = { kind: 'scrim', w: 360, h: 360, x: 0, y: 0, z: 6, fill: 0, radius: 0, // the whole picture (its clip rounds it)
      timeline: seq({ [OPEN]: { fill: 0.72 }, [BACK]: { fill: 0 } }) };
    const capY = PY - 136 / DOC_A / 2 - 9;
    const caption = (text, x) => ({ kind: 'field', content: 'pairCaption', contentClass: 'pair-caption', html: `<p class="ui__caption">${text}</p>`,
      dw: 136, aspect: 136 / 10, w: 136, h: 'auto', x, y: capY, z: 14, fill: 0, edge: 0, img: false, rate: 7,
      timeline: seq({ [OPEN]: { delay: 600, img: true }, [BACK]: { img: false } }) });
    const BTN_Y = -84;
    const PBW = Math.ceil(textWidth('Print both', '600 8.4px Montserrat')) + 30;
    const print = { kind: 'field', content: 'btn-print', contentClass: 'btn-print', html: 'Print both', bg: '#ffffff', dw: PBW, aspect: PBW / 20,
      w: PBW, h: 'auto', x: 0, y: BTN_Y - 6, z: 14, fill: 0, edge: 0, img: false, radius: 10, rate: 9,
      timeline: seq({ [OPEN]: { delay: 700, img: true, fill: 1, y: BTN_Y }, [PRINT]: { w: PBW * 0.94 }, [HOLD]: { w: PBW },
        [BACK]: { img: false, fill: 0, y: BTN_Y - 6 } }) };
    // The arrow's tip is the board's top-left corner (14 × 19.25): a target (x, y) puts the board at (x + 7, y − 9.625).
    const tip = (x, y) => ({ x: x + 7, y: y - 9.625 });
    const pointer = { kind: 'pointer', content: 'pointer', dw: 14, aspect: 14 / 19.25, w: 14, h: 'auto', ...tip(150, -150), z: 18, // close to the pair, so the perspective barely moves its tip
      img: false, rate: 9,
      timeline: seq({ 0: { delay: 150, img: true, ...tip(118, -32) }, [STEP1]: { w: 11.5, ...tip(48, -32) }, [STEP2]: tip(-22, -32),
        [AIM]: { w: 14, ...tip(28, 6) }, [TAP]: { w: 11.5 }, [OPEN]: { w: 14 }, [REACH]: { delay: 120, ...tip(6, BTN_Y - 3) },
        [PRINT]: { w: 11.5 }, [HOLD]: { w: 14 }, [BACK]: { delay: 150, img: false, ...tip(26, BTN_Y - 20) } }) };
    return { phases, boards: [head, ...cards, price, scrim, caption('Spec card', -72), caption('Price card · Fillable', 72), print, pointer], trail: true, zoom: 1.025 }; // r3-68: the light trail
  }


  /* 2, "Ready to sell" (r3-40). Ramir: "Is there anything else that isn't just spec cards?", then "Okay back to Sell, you
     mentioned something" (my note: show the jobs, not one document; the bed, the floor and online, with tools mlilyu.com
     has today). The composition follows his reference (a dark glass card top left, a photo, a white checklist bottom
     right): MLILY's own room photo (Master Images; WellFlex ICE 1.0 since r3-44), a white "Get ready to sell" checklist, and for each step
     its real MLILY U tool in a dark card. 1. Spec and price cards, for the bed (the two cards). 2. Floor displays: Order
     POP, with Headboards, Foot Protectors and Standee ticked. (r3-42: the third step, the Ecommerce Guide's Shopify
     file, is gone; Ramir was told that guide is kept out of sight and shouldn't be mentioned.) The pointer clicks a step, its tool slides in and does its job, slides out, and the step is checked. No highlights:
     a done step gets an ink circle with a check; nothing is tinted. */
  const CHECK_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.7 5.2 4.3 6.8 7.4 3.5" fill="none" stroke="#ffffff" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const TICK_SVG = '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M2.7 5.2 4.3 6.8 7.4 3.5" fill="none" stroke="#101820" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function sellReady() {
    // SHRINK 0.75 s comes first: the photo and checklist start scaling down the moment the card plays, as Scale's tiles
    // move at once (r3-54, Ramir: "sell scale down should be instant like how it is in scale"; r3-51 held 0.45 s first,
    // r3-48 1.1 s). r3-60 (Ramir: "time the clicks for sell better"): AIM 0.65 for step 1 and 0.5 for step 2 (was 0.45:
    // the pointer arrived and pressed in the same instant; now it settles a beat first, as Learn's does), PRESS 0.16, TOOL
    // 1.15 / 1.25 (was 1.5 / 1.6: the step sat idle after its tool had finished), DONE 0.55 (the step is checked at once and
    // its tool goes 0.14 s later; before, the check came 0.12 s after the tool had started to go); READY 0.8.
    // Scene 2: FLOOR 0.7 (scene 1 goes, the salesman photo comes in), COMPARE 1.7 (the compare card from his tablet), SAY
    // 1.8 (r3-61: what to say, beside him), PAIR 2.4 (r3-62: Compare goes back into the tablet and Pairs well with comes out;
    // What to say stays); then rest 0.9 (scene 1 comes back, scaled up). READY 0.7 (was 0.8). 13.92 s in all.
    // r3-64 (Ramir: "have it click when tallying the check mark instead of opening the pop-up."): per step AIM, TOOL, PRESS,
    // DONE (was AIM, PRESS, TOOL, DONE): the pointer goes to the step's ring, the step's tool opens as it arrives, then the
    // click on the ring checks the step (the check comes on the release, at DONE) and the tool goes 0.14 s later.
    const phases = [750, 650, 1150, 160, 550, 500, 1250, 160, 550, 700, 700, 1700, 1800, 2400, 900];
    const SHRINK = 0;
    const S = [1, 5]; // each step's AIM phase; TOOL, PRESS and DONE follow (r3-64)
    const READY = 9;
    const [FLOOR, COMPARE, SAY, PAIR] = [10, 11, 12, 13];
    const OUT = 140; // r3-60: a tool (and what is on it) goes this long after its step is checked
    const seq = (m) => Array.from({ length: Math.max(...Object.keys(m).map(Number)) + 1 }, (_, i) => m[i] || {});
    const DOC_A = 2070 / 1600;
    const LH = 8.4 * 1.2; // a row's line: 8.4 units, line-height 1.2
    // The photo: MLILY's own, the bed in a room, its name over the photo's foot. r3-44 (Ramir: "Go with wellflex ice instead
    // of midnight again"): WellFlex ICE 1.0, its spec card and its price card (no Twin or Full: Twin XL to Split Head King).
    // r3-47 (Ramir: "Remove the 1.0 as well."): the series name, as on MLILY's series spec and price cards.
    const WFI_PRICE = { name: 'WellFlex ICE', type: '14″ Memory Foam Mattress', photo: 'sell-wellflex-ice-silo.jpg',
      sizes: ['TWIN XL', 'QUEEN', 'KING', 'CAL KING', 'SPLIT HEAD KING'] };
    // The photo sits in its tile the whole time (x −36, y 16; 16 left of r3-43 so the WellFlex ICE name clears the
    // checklist); it opens scaled up with the checklist (r3-49, below). r3-46's full-bleed photo was a misreading.
    // r3-53 (Ramir: "have the product card for sell a little longer and wider"): 186 × 228 (was 168 × 206, same shape), its
    // left edge kept at x −120 so the name still clears the checklist.
    const PH = { x: -27, y: 16, w: 186, h: 228 };
    const photo = { kind: 'field', content: 'photo', dw: PH.w, aspect: PH.w / PH.h, w: PH.w, h: 'auto', x: PH.x, y: PH.y, z: -30,
      fill: 0, edge: 0, radius: 14,
      html: `<span class="ui__photo" style="background-image: url('${IMGBASE}sell-wellflex-ice-room.jpg')"></span><span class="ui__photo-name"><b>WellFlex ICE</b><i>14″ Memory Foam Mattress</i></span>` };
    // The checklist (white): the title and the steps (a ring, the step, a faded line under it).
    const STEP_H = LH + 2 + 7 * 1.2;
    const CL_H = 11 + 11 + 9 + 2 * STEP_H + 7 + 11; // the title and two steps (r3-43: no eyebrow; r3-44: no Show more)
    const CL = { x: 80, y: -33 - CL_H / 2, w: 152 }; // top at y −33 (r3-43); 152 wide since r3-44, its left edge 11 clear of the photo's name
    const clTop = CL.y + CL_H / 2;
    const rowCY = (i) => clTop - 11 - 11 - 9 - i * (STEP_H + 7) - LH / 2;
    const ringX = CL.x - CL.w / 2 + 11 + 5;
    // r3-48/49 (Ramir: "simply just make this bigger. like you click and drag the left side of it and you scale it", then
    // "not just the checklist, both the checklist and card"): the photo card and the checklist open scaled up together, as
    // one group, from the group's left side (its right edge and its middle fixed) until it spans the picture (x −154 to
    // 156); content and corners scale with them. They scale back down together as the pointer starts on the steps, making
    // room for the tool cards, and grow again in the rest phase. (r3-47's white square over everything was a misreading.)
    const G_RIGHT = CL.x + CL.w / 2;
    const G_LEFT = PH.x - PH.w / 2;
    const GK = (G_RIGHT + 154) / (G_RIGHT - G_LEFT);
    const G_Y = (PH.y + PH.h / 2 + (CL.y - CL_H / 2)) / 2;
    const grow = (x, y, w) => ({ x: G_RIGHT + (x - G_RIGHT) * GK, y: G_Y + (y - G_Y) * GK, w: w * GK });
    const checklist = { kind: 'glass', theme: 'light', content: 'ready', dw: CL.w, aspect: CL.w / CL_H, h: 'auto', ...grow(CL.x, CL.y, CL.w), z: -2, // r3-69: 8 further forward (was −10), 28 in front of the photo
      edge: 1, edgeA: 0, glass: 1, radius: 8, scaleRadius: true, rate: 6,
      timeline: seq({ [SHRINK]: { w: CL.w, x: CL.x, y: CL.y }, [FLOOR]: { img: false, glass: 0, edge: 0 } }) };
    Object.assign(photo, grow(PH.x, PH.y, PH.w), { rate: 6, timeline: seq({ [SHRINK]: { w: PH.w, x: PH.x, y: PH.y }, [FLOOR]: { img: false } }) });
    const checks = [0, 1].map((i) => ({ kind: 'field', content: 'check', html: CHECK_SVG, bg: '#101820', dw: 10, aspect: 1, w: 8, h: 'auto',
      x: ringX, y: rowCY(i), z: 0, fill: 0, edge: 0, img: false, radius: 5, rate: 9,
      timeline: seq({ [S[i] + 3]: { img: true, fill: 1, w: 10 }, [FLOOR]: { img: false, fill: 0 } }) }));
    // The tools (dark glass), top left, one at a time: in from the left as the step is pressed, out as it is checked.
    const T = { x: -77, w: 150, top: 135 }; // 9.5 units inside the picture's left edge; top 135 since r3-43
    const tool = (step, h, html) => ({ kind: 'glass', content: 'tool', html, dw: T.w, aspect: T.w / h, w: T.w * 0.92, h: 'auto',
      x: T.x - 10, y: T.top - h / 2, z: 10, edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 8, rate: 7,
      timeline: seq({ [step + 1]: { delay: 60, edge: 1, glass: 1, img: true, w: T.w, x: T.x }, [step + 3]: { delay: OUT, edge: 0, glass: 0, img: false, w: T.w * 0.92, x: T.x - 10 } }) });
    const DOCW = 61;
    const rows = (name, items, round) => `<p class="ui__caption">${name}</p><ul class="ui__tool-rows">${items.map((t) => `<li><span class="box${round ? ' box--round' : ''}"></span>${t}</li>`).join('')}</ul>`;
    const ROWS_H = 10 + 8.4 + 7 + 3 * LH + 2 * 5 + 10;
    const tools = [
      tool(S[0], 10 + 8.4 + 7 + DOCW / DOC_A + 10, '<p class="ui__caption">Spec and price cards</p>'),
      tool(S[1], ROWS_H, rows('Order POP', ['Headboards', 'Foot Protectors', 'Standee'], false)),
    ];
    // Step 1's two cards (WellFlex ICE 1.0's spec card and its blank price card) inside the first tool.
    const docTop = T.top - 10 - 8.4 - 7;
    const docs = [[specCard({ ...LINEUP[1], name: 'WellFlex ICE' }), 'doc-spec'], [priceCard(WFI_PRICE), 'doc-price']].map(([html, cls], k) => ({ kind: 'field', content: 'mini', contentClass: cls, html,
      bg: '#ffffff', dw: 290, aspect: DOC_A, w: DOCW * 0.9, h: 'auto', x: T.x - T.w / 2 + 11 + DOCW / 2 + k * (DOCW + 6), y: docTop - DOCW / DOC_A / 2, z: 12,
      fill: 0, edge: 0, img: false, radius: 3, rate: 7,
      timeline: seq({ [S[0] + 1]: { delay: 200 + 90 * k, img: true, fill: 1, w: DOCW }, [S[0] + 3]: { delay: OUT, img: false, fill: 0, w: DOCW * 0.9 } }) }));
    // Ticks: white boxes (POP) or circles (the store file) with an ink check, one after another.
    const rowY = (r) => T.top - 10 - 8.4 - 7 - r * (LH + 5) - LH / 2;
    const boxX = T.x - T.w / 2 + 11 + 4.5;
    const tick = (step, r, round, delay) => ({ kind: 'field', content: 'tick', html: TICK_SVG, bg: '#ffffff', dw: 9, aspect: 1, w: 7, h: 'auto',
      x: boxX, y: rowY(r), z: 12, fill: 0, edge: 0, img: false, radius: round ? 4.5 : 2.5, rate: 9,
      timeline: seq({ [step + 1]: { delay, img: true, fill: 1, w: 9 }, [step + 3]: { delay: OUT, img: false, fill: 0, w: 7 } }) });
    const ticks = [tick(S[1], 0, false, 300), tick(S[1], 1, false, 500), tick(S[1], 2, false, 700)]; // r3-60: 0.3 / 0.5 / 0.7 s (was 0.45 / 0.7 / 0.95)
    // r3-92: the ticks and the step 1 cards ride on their tool (follow): they had held still while the tool slid 10 in and
    // out and shrank to 0.92, so as it left the ticks drifted up to 4.5 right of their boxes (Ramir's screenshot). The
    // ticks are 1 in front of the panel (was 2): Sell's close perspective (700) had also set them 0.3 off at rest.
    const toolMid = (h) => T.top - h / 2;
    ticks.forEach((t, r) => { t.follow = { board: tools[1], dx: boxX - T.x, dy: rowY(r) - toolMid(ROWS_H), dz: 1 }; });
    docs.forEach((d) => { d.follow = { board: tools[0], dx: d.x - T.x, dy: d.y - toolMid(10 + 8.4 + 7 + DOCW / DOC_A + 10), dz: 2 }; });
    // The arrow's tip is the board's top-left corner (14 × 19.25): a target (x, y) puts the board at (x + 7, y − 9.625).
    const tip = (x, y) => ({ x: x + 7, y: y - 9.625 });
    // r3-64: the pointer clicks the step's ring. Its tip (1.75 right of and 1.4 below its box's corner) lands inside the ring
    // near its lower right, so the arrow sits below and right of the check as it comes in.
    const onRing = (i) => tip(ringX + 0.75, rowCY(i) - 1.1);
    // r3-60: the pointer moves just in front of the checklist (z −6, was 20). The card's perspective drew it that far forward
    // about 6 units low and 4 right of its aim, so it pressed each step's second line; now its tip lands on the step's name.
    const pointer = { kind: 'pointer', content: 'pointer', dw: 14, aspect: 14 / 19.25, w: 14, h: 'auto', ...tip(150, -150), z: 2, img: false, rate: 9, // r3-69: z 2 (was −6), just in front of the checklist (−2) as before
      timeline: seq({ [S[0]]: { delay: 80, img: true, ...onRing(0) }, [S[0] + 2]: { w: 11.5 }, [S[0] + 3]: { w: 14 },
        [S[1]]: onRing(1), [S[1] + 2]: { w: 11.5 }, [S[1] + 3]: { w: 14 },
        [READY]: { delay: 200, img: false, ...tip(ringX + 60, rowCY(1) - 24) } }) };
    // Scene 2 (r3-58, r3-60, r3-61, r3-62): his photo pick (Unsplash, Docusign: a salesman showing a customer something on a
    // tablet) and what is on that tablet, two pop-ups at a time, as in Learn's beats. r3-60 (Ramir: "Dialogue feels artificial
    // and doesn't really match what happens in real life"): r3-58's chat bubbles are gone (archived); a dark "Compare" card
    // grows out of the tablet: WellFlex beside WellFlex ICE in MLILY's own layer art (the exploded 1.0 builds, drawn to scale,
    // so ICE's cooling cover, its extra cooling layer and its 2 more inches show), names and heights from the catalog.
    // r3-61 (Ramir: "Maybe compare as one aspect, it should also include what to say or something like that. so maybe more
    // popups for that area."): a white "What to say" card follows beside the salesman, three talking points from WellFlex
    // ICE's catalog data. r3-62 (Ramir: "Add Pairs well with"): Compare goes back into the tablet and a dark "Pairs well with"
    // card comes out of it in its place: the MS 300 adjustable base, the Harmony Cool pillow and the Super Cooling protector,
    // in MLILY's own lifestyle photos (every MLILY mattress is adjustable-base compatible, per the Mattress Summary; the
    // pillow and the protector are MLILY's cooling ones, for a cooling mattress). r3-62 (Ramir: "Fix the padding as well to
    // the what to say. It's very off."): the text cards hug their content with Learn's pop-up padding, 10 top and bottom and
    // 11 at the sides, from widths measured in the browser (r3-61's What to say came out 4 units wider on the right: its
    // width was a canvas measure plus 26, not 22), and a caption sits 7 above its rows, as in Learn (was 9). The pop-ups hang
    // off the photo's sides, clear of both faces. The group is centred across and a touch below the middle (−4).
    const FL = { w: 236, h: 236 / 1.5 };
    const EDGE = 150; // the pop-ups' outer edges (x ±150)
    const PAD = { y: 10, x: 11 }; // Learn's pop-up padding (Ramir's Figma tune)
    const CAP = 8.4 + 7; // a caption and the gap under it
    const CW = 160; // Compare: two 64-unit columns (their widest line, "14″ Memory Foam", is 63.1), a 10-unit gap
    const COL = (CW - 2 * PAD.x - 10) / 2;
    const IW = 52; // each stack's width; the art is 400 × 410 (WellFlex) and 400 × 475 (WellFlex ICE), to scale
    const IH = IW * 475 / 400;
    const ART = 8 + IH + 8; // the art's band in the card, between the caption and the names
    const CH = PAD.y + 8.4 + ART + 8.4 + 3 + 7 + PAD.y;
    const OVC = 36; // the lower-left cards come up this far over the photo's foot (over the tablet they come out of)
    const GC = -4;
    const FT = GC + (FL.h - OVC + CH) / 2; // the photo's top
    const FY = FT - FL.h / 2;
    const FB = FT - FL.h;
    const LT = FB + OVC; // the lower-left slot's top (Compare, then Pairs well with)
    const TAB = { x: -40, y: FB + 18 }; // the tablet in the photo: the lower-left cards come out of it and go back into it
    const CX = -EDGE + CW / 2;
    const CY = LT - CH / 2;
    const floor = { kind: 'field', content: 'floor', contentClass: 'photo-plain', html: `<span class="ui__photo-plain" style="background-image: url('${IMGBASE}sell-salesman.jpg')"></span>`,
      dw: FL.w, aspect: 3 / 2, w: FL.w * 0.94, h: 'auto', x: 0, y: FY - 4, z: -24, fill: 0, edge: 0, img: false, radius: 14, rate: 6,
      timeline: seq({ [FLOOR]: { delay: 150, img: true, w: FL.w, y: FY } }) };
    const col = (name, type) => `<div><b>${name}</b><i>${type}</i></div>`;
    const compare = { kind: 'glass', content: 'compare',
      html: `<p class="ui__caption">Compare</p><span class="ui__compare-art" style="height: calc(${ART}px * var(--s))"></span><div class="ui__compare">${col('WellFlex', '12″ Memory Foam')}${col('WellFlex ICE', '14″ Memory Foam')}</div>`,
      dw: CW, aspect: CW / CH, w: CW * 0.5, h: 'auto', x: TAB.x, y: TAB.y, z: 0, edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 8, rate: 7,
      timeline: seq({ [COMPARE]: { delay: 100, img: true, glass: 1, edge: 1, w: CW, x: CX, y: CY },
        [PAIR]: { img: false, glass: 0, edge: 0, w: CW * 0.5, x: TAB.x, y: TAB.y } }) };
    // The two stacks, bottoms level, each at its column's left edge, in a beat after the card (WellFlex, then ICE).
    const artBottom = CY + CH / 2 - PAD.y - 8.4 - 8 - IH;
    const stacks = [['wellflex', 410], ['wellflex-ice', 475]].map(([id, ph], k) => {
      const h = IW * ph / 400;
      return { kind: 'field', content: 'stack', html: `<span class="ui__stack" style="background-image: url('${IMGBASE}sell-art-${id}.webp')"></span>`,
        dw: IW, aspect: IW / h, w: IW * 0.94, h: 'auto', x: CX - CW / 2 + PAD.x + IW / 2 + k * (COL + 10), y: artBottom + h / 2 - 4, z: 2,
        fill: 0, edge: 0, img: false, rate: 7,
        timeline: seq({ [COMPARE]: { delay: 420 + 110 * k, img: true, w: IW, y: artBottom + h / 2 }, [PAIR]: { img: false, w: IW * 0.94 } }) };
    });
    // What to say (white, like Learn's How it feels pop-up): a caption and three talking points (separate boards, so they
    // come in one after another), each a name and a faded line, as the checklist's steps. Its top sits below his face.
    const SAY_ROWS = [['Sleeps cool', 'ActiveTemp™ PCM up top'], ['Two feels', 'Firmer 1.0 or Plusher 3.0'], ['Built to last', '10-year warranty']];
    const ROW = 8.4 * 1.2 + 2 + 7 * 1.2;
    const SAY_IN = 92; // its widest line, "ActiveTemp™ PCM up top", is 91.9 (measured in the browser)
    const SW = SAY_IN + 2 * PAD.x;
    const SH = PAD.y + CAP + SAY_ROWS.length * ROW + (SAY_ROWS.length - 1) * 7 + PAD.y;
    const ST = FT - 78;
    const SX = EDGE - SW / 2;
    const SY = ST - SH / 2;
    const say = { kind: 'glass', theme: 'light', content: 'say', html: '<p class="ui__caption">What to say</p>',
      dw: SW, aspect: SW / SH, w: SW * 0.92, h: 'auto', x: SX, y: SY - 6, z: 6, edge: 0, edgeA: 0, glass: 0, img: false, radius: 8, rate: 7,
      timeline: seq({ [SAY]: { img: true, glass: 1, edge: 1, w: SW, y: SY } }) };
    const sayRows = SAY_ROWS.map(([b, i], k) => {
      const top = ST - PAD.y - CAP - k * (ROW + 7);
      return { kind: 'field', content: 'sayRow', contentClass: 'say-row', html: `<b>${b}</b><i>${i}</i>`, dw: SAY_IN, aspect: SAY_IN / ROW,
        w: SAY_IN * 0.96, h: 'auto', x: SX - SW / 2 + PAD.x + SAY_IN / 2, y: top - ROW / 2 - 3, z: 7, fill: 0, edge: 0, img: false, rate: 7,
        timeline: seq({ [SAY]: { delay: 240 + 140 * k, img: true, w: SAY_IN, y: top - ROW / 2 } }) };
    });
    // Pairs well with (dark, in Compare's place): a caption and three rows (separate boards, in one after another), each a
    // photo and a name over a faded type.
    const PAIRS = [['MS 300', 'Adjustable base', 'cat-bases.jpg'], ['Harmony Cool', 'Pillow', 'cat-pillows.jpg'], ['Super Cooling', 'Protector', 'cat-protectors.jpg']];
    const TH = 24; // a row's photo
    const PAIR_IN = TH + 8 + 61; // the photo, a gap and the widest name ("Harmony Cool", 60.8, measured in the browser)
    const PW = PAIR_IN + 2 * PAD.x;
    const PHT = PAD.y + CAP + PAIRS.length * TH + (PAIRS.length - 1) * 6 + PAD.y;
    const PX = -EDGE + PW / 2;
    const PY = LT - PHT / 2;
    const pairs = { kind: 'glass', content: 'pairs', html: '<p class="ui__caption">Pairs well with</p>',
      dw: PW, aspect: PW / PHT, w: PW * 0.5, h: 'auto', x: TAB.x, y: TAB.y, z: 0, edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 8, rate: 7,
      timeline: seq({ [PAIR]: { delay: 300, img: true, glass: 1, edge: 1, w: PW, x: PX, y: PY } }) };
    const pairRows = PAIRS.map(([b, i, img], k) => {
      const top = LT - PAD.y - CAP - k * (TH + 6);
      return { kind: 'field', content: 'pairRow', contentClass: 'pair-row',
        html: `<span class="ui__pair-photo" style="background-image: url('${IMGBASE}${img}')"></span><span><b>${b}</b><i>${i}</i></span>`,
        dw: PAIR_IN, aspect: PAIR_IN / TH, w: PAIR_IN * 0.96, h: 'auto', x: PX - PW / 2 + PAD.x + PAIR_IN / 2, y: top - TH / 2 - 3, z: 1,
        fill: 0, edge: 0, img: false, rate: 7,
        timeline: seq({ [PAIR]: { delay: 640 + 140 * k, img: true, w: PAIR_IN, y: top - TH / 2 } }) };
    });
    return { phases, boards: [photo, checklist, ...checks, ...tools, ...docs, ...ticks, pointer, floor, compare, ...stacks, say, ...sayRows, pairs, ...pairRows], trail: true, zoom: 1.025 }; // r3-68: the light trail; r3-72: the scale-in
  }

  /* ── Market (r3-55; replaces Scale) ─────────────────────────────────────────────────────────────────────────────
     Ramir picked "Post it" from three storyboards of our own (Scale's resize-into-every-format storyboard is Air's, so it
     is not reused; see rv3-own-storyboards-not-air). MLILY U's Resources has Social Media post templates; these are three
     of MLILY's own Science of Cool feed ads (none shows a price). A white phone shows a store's feed with an empty post;
     a dark "Post templates" card holds the three ads; the pointer picks "Cooling Goes Deeper" (WellFlex ICE), which flies
     into the post; the caption types in under it; a text-only Download is pressed. Same visual language as Learn and Sell
     (dark glass top left, a white card, a pointer), and Air's ease-toward-target motion. */
  function market() {
    // r3-65 (Ramir: "market looks really bad", then "Yes, rework Market" on my plan; his "Post it" storyboard kept): a phone
    // with a dark body and a white screen showing the store's last post (a MLILY photo); MLILY U's pop-ups beside it; the
    // order as it really goes: pick the WellFlex ICE ad (a 2 px ring), Download, the ad flies into the post, a caption idea
    // comes in, Copy, the caption types into the post.
    // r3-67 (Ramir: "This one is not bad at all, but I would rather have the phone centered."; "give it a bit more personality
    // by doing some sort of light trail like in this. Not too distracting either."): the phone is centred and the pop-ups
    // take its two sides, one at a time: Post templates (left, level with the post's top) fades as its ad flies into the
    // post; then Caption idea (right) rises in, between the ad's headline (y 57 to 67) and its WellFlex ICE line (from
    // y −44.5), the only ad text its left edge (x 46) reaches across. A dot grid behind lights up round the pointer (or the
    // mouse, while it is over the card) and fades behind it: trail: true (see createCard).
    // r3-69 (Ramir: "caption idea and post templates need a bit more forwardness on the z index.", then "I'd say perhaps all
    // of them do."): the pop-ups stand 20 and 22 in front of the phone (were 2 and 4), about as far as the other cards' now:
    // Post templates at z 18, Caption idea at z 20 (their ring and buttons half a unit on; the pointer at 24). The ad leaves
    // the templates in front of them (z 19.5), crosses at that depth (FLY 0.75), then settles into the post (LAND 0.25,
    // z −1, a unit in front of the phone, so it lands exactly) once the templates have gone.
    // HOLD 0.4, AIM 0.65, PICK 0.16, REACH 0.45, GET 0.16 (Download pressed), FLY 0.75, LAND 0.25, CAP 0.6, AIM2 0.45, COPY
    // 0.16, TYPE 1.3, HOLD 1.1, rest 0.8. 7.23 s in all.
    // r3-80 (Ramir: "For Market it, let's have it start as a carousel for the beginning of the storyboard, then have it
    // populate the post templates pop-up. Like it it's going into the pop-up frame"): it opens on MLILY's three Science of
    // Cool posts as a carousel (Sell's lineup cover-flow, at the posts' 4:5): HOLD 0.4, SPIN 0.9 (one glide, to WellFlex
    // ICE's "Cooling Goes Deeper"), STOW 0.85 (each post shrinks into its slot in the Post templates frame, which opens round
    // them), ENTER 0.65 (the store's phone rises in, its last post and caption on it); then as before. At rest it is the
    // carousel again. 9.53 s in all.
    // r3-81 (Ramir: "Would like it if the phone revealed a bit sooner and the posts were a bit larger."): the phone rises in
    // during STOW, 0.38 s in, while the posts are flying into the frame (was after them, at ENTER), and ENTER is a 0.3 s
    // settle (was 0.65); the carousel's posts are larger (front 136, was 118; sides 106 at x ±108, were 92 at ±96). 9.18 s.
    // r3-83 (Ramir: "Now the carousel animation is a bit off too."): LIFT 0.35 between SPIN and STOW: the posts turn to face
    // front and lift toward the viewer (z 40, gathering in a little) past the frame's plane, so they fly into it from in front
    // (STOW comes down to 18.5 from above, never behind the frame's glass); the carousel keeps its depth for the glide (r3-82's
    // flattened sides made the glide look off: the wrapping post crossed the others at their depth). 9.53 s.
    // r3-84 (Ramir: "If the posts on the side have to face forward to populate the post cleaner, can we sort of overlap the
    // rotation to the populate?"): no separate lift beat. SWING 0.55: each post turns square on WHILE it flies to its slot in
    // the frame, rising toward the viewer as it goes (z toward 72, so it is in front of the frame's plane, 18, early on;
    // the frame opens at 0.2 s); STOW 0.55: it settles down onto its slot (z to 18.5). 9.43 s.
    // r3-88 (Ramir: "Now the carousel animation just looks off.", on r3-87's two-step glide, archived in
    // _archive/r3-87-two-step-glide/): one smooth glide again, as in r3-86c, but staggered: the post coming in starts 0.08 s
    // after the one going out, so by the time they are at the same depth they no longer overlap (in r3-86c they met halfway,
    // where the outgoing post's turning edge went through the incoming one). 9.43 s.
    const phases = [400, 900, 550, 550, 300, 650, 160, 450, 160, 750, 250, 600, 450, 160, 1300, 1100, 800];
    const [SPIN, SWING, STOW, ENTER, AIM, PICK, REACH, GET, FLY, LAND, CAP, AIM2, COPY, TYPE, HOLD] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15];
    const ENTER_RISE = 10; // the phone (and its old caption) rises this far as it comes in
    const seq = (m) => Array.from({ length: Math.max(...Object.keys(m).map(Number)) + 1 }, (_, i) => m[i] || {});
    const PAD = { y: 10, x: 11 }; // Learn's pop-up padding
    const EDGE = 152; // the pop-ups' outer edges (x ±152)
    const BTN_H = 20;
    // The phone: a dark body (the board's fill) and a white screen inset 4: status bar 18, header 24, the 4:5 post (the
    // screen's full width), actions 20, the caption, a home bar. Its depth (−2) is just behind the pop-ups (0 and 2).
    const PHONE = { x: 0, y: -2, w: 150, h: 284 };
    const BEZ = 4;
    const POST = { w: PHONE.w - 2 * BEZ, h: (PHONE.w - 2 * BEZ) * 5 / 4 };
    const postTop = PHONE.y + PHONE.h / 2 - BEZ - 18 - 24;
    const postY = postTop - POST.h / 2;
    const CAPTION = 'Cooling goes deeper. Feel WellFlex ICE on our floor.';
    const phone = { kind: 'field', content: 'phone', bg: '#0b1017', dw: PHONE.w, aspect: PHONE.w / PHONE.h, w: PHONE.w, h: 'auto', x: PHONE.x, y: PHONE.y - ENTER_RISE, z: -2,
      fill: 0, img: false, edge: 0, radius: 22, rate: 7, timeline: seq({ [STOW]: { delay: 100, img: true, fill: 1, y: PHONE.y } }), // r3-80: hidden at rest, rises in; r3-81: during the stow
      type: { text: CAPTION, phase: TYPE, at: Array.from({ length: CAPTION.length }, (_, i) => 60 + i * 21), focus: [TYPE, TYPE] } };
    // r3-71 (Ramir: "and give the old post a caption too."): the store's last post has its own caption, a white strip laid
    // exactly over the phone's caption line (same text style, a hair in front of the screen); it goes as the new post lands
    // (LAND), leaving "Your store" for the new caption to type after.
    const capTop = PHONE.y + PHONE.h / 2 - BEZ - 18 - 24 - POST.h - 20;
    const OLD_H = 2 * 7.2 * 1.35 + 2; // two caption lines and a little
    const oldCaption = { kind: 'field', content: 'oldCaption', contentClass: 'old-caption', bg: '#ffffff',
      html: '<p class="ui__phone-caption"><b>Your store</b>Built for better airflow. Try Midnight ICE in store.</p>',
      dw: POST.w, aspect: POST.w / OLD_H, w: POST.w, h: 'auto', x: PHONE.x, y: capTop - OLD_H / 2 - ENTER_RISE, z: -1.9, fill: 0, img: false, edge: 0, rate: 7,
      timeline: seq({ [STOW]: { delay: 100, img: true, fill: 1, y: capTop - OLD_H / 2 }, [LAND]: { img: false, fill: 0 } }) }; // r3-80: with the phone
    // Post templates (dark glass, left, its top level with the post's): a caption, three ads (4:5) and a text-only Download.
    // It, its ring and its button fade together as the picked ad flies off.
    // r3-82 (Ramir, on a screenshot of the frame mid-stow: "Animation is a bit off. Also need the posts to be a lot larger."):
    // the frame's posts are 44 × 55 (were 30 × 37.5, +47%), 6 apart; the frame grows to 166 wide, its right edge at x 14.
    const TB = { w: 44, h: 55, gap: 6 };
    const TW = 2 * PAD.x + 3 * TB.w + 2 * TB.gap;
    // r3-77 (Ramir: "Improve padding for market pop-ups. Seems inconsistent."): both pop-ups end on a button, whose solid edge
    // read 1 tighter than the 11 at the sides (and than the caption's cap top, 10 + 1.3), so they keep 11 under it (FOOT).
    const FOOT = 11;
    const TPH = PAD.y + 8.4 + 7 + TB.h + 9 + BTN_H + FOOT;
    const T_TOP = postTop;
    const LEFT = -EDGE;
    const OFF = 120; // the templates go this long after the ad has lifted off
    const templates = { kind: 'glass', content: 'templates', dw: TW, aspect: TW / TPH, w: TW * 0.94, h: 'auto', x: LEFT + TW / 2, y: T_TOP - TPH / 2, z: 18,
      edge: 0, edgeA: 0.24, glass: 0, img: false, radius: 8, rate: 7, // r3-80: opens at STOW as the posts arrive; its three slots are empty until they land
      timeline: seq({ [SWING]: { delay: 240, img: true, glass: 1, edge: 1, w: TW }, [FLY]: { delay: OFF, img: false, glass: 0, edge: 0 } }) }; // r3-84: opens 0.24 s into SWING, once the posts are in front of its plane
    const thumbY = T_TOP - PAD.y - 8.4 - 7 - TB.h / 2;
    const thumbX = (k) => LEFT + PAD.x + TB.w / 2 + k * (TB.w + TB.gap);
    const pick = { kind: 'field', content: 'pick', html: '', dw: TB.w + 5, aspect: (TB.w + 5) / (TB.h + 5), w: TB.w + 5, h: 'auto', x: thumbX(1), y: thumbY, z: 18.5,
      fill: 0, edge: 0, img: false, rate: 9, timeline: seq({ [PICK]: { delay: 40, img: true }, [FLY]: { delay: OFF, img: false } }) };
    const DLW = 45 + 20; // "Download" is 44.3 wide (measured in the browser), 10 a side
    const DL = { x: LEFT + PAD.x + DLW / 2, y: T_TOP - PAD.y - 8.4 - 7 - TB.h - 9 - BTN_H / 2 };
    const download = { kind: 'field', content: 'btnDownload', contentClass: 'btn-print', html: 'Download', bg: '#ffffff', dw: DLW, aspect: DLW / BTN_H, w: DLW, h: 'auto',
      x: DL.x, y: DL.y, z: 18.5, fill: 0, img: false, edge: 0, radius: 10, rate: 9,
      timeline: seq({ [STOW]: { delay: 120, img: true, fill: 1 }, [GET]: { w: DLW * 0.94 }, [FLY]: { delay: OFF, w: DLW, img: false, fill: 0 } }) };
    // r3-80: the carousel. Slots as Sell's lineup's cover-flow: the front post square on, its neighbours turned toward it and
    // set back. At rest "Cooling Shouldn't Stop at the Mattress" is in front, WellFlex ICE's "Cooling Goes Deeper" to its right
    // and Midnight ICE's "Built for Better Airflow" to its left; one glide brings WellFlex ICE to the front (the one the pointer
    // will pick), Midnight ICE going round behind to the right. Then each post flies into its own slot in the frame (1, 2, 3,
    // a beat apart) and stays there as the frame's thumbnail until the frame goes.
    const CF = 160; // the front post's width (4:5); r3-81: 136 (was 118); r3-86 (Ramir: "I'd still like the carousel to be a bit bigger, even if it means covering the other two posts a bit."): 160
    // r3-82 (superseded by r3-83's LIFT): the carousel stayed in front of the frame's plane (18) all the way (front 20.5, sides 19; the sides were set back
    // at −40, so the two side posts flew in behind the frame's dark glass and showed through it, dimmed, before popping in
    // front). The sides still read as set back: narrower and turned toward the front post.
    const cslot = (k) => (k === 0 ? { x: 0, y: 4, z: 18.5, ry: 0, w: CF } : { x: 110 * Math.sign(k), y: 4, z: -40, ry: 40 * Math.sign(k), w: 112 }); // r3-83: the depth back (sides at −40); r3-86: sides 112 at ±110
    const SPIN_DELAY = [40, 120, 80]; // r3-88: the outgoing post first, the incoming one 0.08 s after it, the one going round behind in between (checked frame by frame: no crossing from 0.06 s; 0.08 s is the least that keeps the full 7.6 px clearance)
    const REST_K = [0, 1, -1];
    const SPIN_K = [-1, 0, 1];
    const posts = ['mkt-post-1.jpg', 'mkt-post-2.jpg', 'mkt-post-3.jpg'].map((img, k) => ({ kind: 'field', content: 'carouselPost', contentClass: 'post-img',
      html: `<span class="ui__post-img" style="background-image: url('${IMGBASE}${img}')"></span>`,
      dw: CF, aspect: 4 / 5, h: 'auto', ...cslot(REST_K[k]), fill: 0, edge: 0, radius: 9, rate: 5,
      timeline: seq({ [SPIN]: { delay: SPIN_DELAY[k], ...cslot(SPIN_K[k]) }, [SWING]: { delay: 30 + 50 * k, x: thumbX(k), y: thumbY, w: TB.w, ry: 0, z: 72 }, [STOW]: { z: 18.5 }, // r3-84b: 50 ms apart and z 72, so the last one is in front of the frame before it crosses it
        [FLY]: { delay: OFF, img: false } }) }));
    // The ad: a copy of the picked template, flying into the post over the store's last post. It leaves the templates in
    // front of them (z 19.5), crosses at that depth, then settles into the post (z −1) once they have gone; it stays behind
    // Caption idea.
    const ad = { kind: 'field', content: 'post', contentClass: 'post-img', html: `<span class="ui__post-img" style="background-image: url('${IMGBASE}mkt-post-2.jpg')"></span>`,
      dw: POST.w, aspect: 4 / 5, w: TB.w, h: 'auto', x: thumbX(1), y: thumbY, z: 19.5, fill: 0, edge: 0, img: false, rate: 6,
      timeline: seq({ [FLY]: { delay: 60, img: true, w: POST.w, x: PHONE.x, y: postY }, [LAND]: { z: -1 } }) };
    // Caption idea (white, right): MLILY's line for that post and a text-only Copy (ink). r3-77: the line is set in three
    // phrases ("Cooling goes deeper." / "Feel WellFlex ICE" / "on our floor.", 30.8 tall) and the card hugs the widest, 80.7
    // (measured in the browser), so its right padding is 11 like its left (balanced in an 84 column it had 14.7 on the right).
    // It rises in with its button, in step.
    const CIN = 81;
    const CPW = CIN + 2 * PAD.x;
    const CPH = PAD.y + 8.4 + 7 + 30.77 + 9 + BTN_H + FOOT;
    const C_TOP = 53;
    const CY = C_TOP - CPH / 2;
    const RISE = 6;
    const suggest = { kind: 'glass', theme: 'light', content: 'suggest', html: '<p class="ui__caption">Caption idea</p><p class="ui__suggest">Cooling goes deeper.<br>Feel WellFlex ICE<br>on our floor.</p>',
      dw: CPW, aspect: CPW / CPH, w: CPW, h: 'auto', x: EDGE - CPW / 2, y: CY - RISE, z: 20, edge: 0, edgeA: 0, glass: 0, img: false, radius: 8, rate: 7,
      timeline: seq({ [CAP]: { img: true, glass: 1, edge: 1, y: CY } }) };
    const CPYW = 22 + 20; // "Copy" is 21.8
    const CP = { x: EDGE - CPW + PAD.x + CPYW / 2, y: C_TOP - PAD.y - 8.4 - 7 - 30.77 - 9 - BTN_H / 2 };
    const copy = { kind: 'field', content: 'btnCopy', contentClass: 'btn-download', html: 'Copy', bg: '#101820', dw: CPYW, aspect: CPYW / BTN_H, w: CPYW, h: 'auto',
      x: CP.x, y: CP.y - RISE, z: 20.5, fill: 0, edge: 0, img: false, radius: 10, rate: 7,
      timeline: seq({ [CAP]: { img: true, fill: 1, y: CP.y }, [COPY]: { w: CPYW * 0.94 }, [TYPE]: { w: CPYW } }) };
    // The arrow's tip is the board's top-left corner (14 × 19.25): a target (x, y) puts the board at (x + 7, y − 9.625). Its
    // depth (24, r3-69) is close to the pop-ups', so it lands where it aims. While the ad flies it waits in the left margin.
    const tip = (x, y) => ({ x: x + 7, y: y - 9.625 });
    const pointer = { kind: 'pointer', content: 'pointer', dw: 14, aspect: 14 / 19.25, w: 14, h: 'auto', ...tip(150, -150), z: 24, img: false, rate: 9,
      timeline: seq({ [AIM]: { delay: 60, img: true, ...tip(thumbX(1) + 2, thumbY - 2) }, [PICK]: { w: 11.5 },
        [REACH]: { w: 14, ...tip(DL.x - 4, DL.y + 1.5) }, [GET]: { w: 11.5 },
        [FLY]: { w: 14, ...tip(-128, -34) },
        [AIM2]: { ...tip(CP.x - 3, CP.y + 1.5) }, [COPY]: { w: 11.5 },
        [TYPE]: { w: 14 }, [HOLD]: { delay: 300, img: false, ...tip(CP.x + 22, CP.y - 28) } }) };
    // r3-71 (Ramir: "Would also like it if it began as it is and scaled a bit in on hover/play."): zoom: the whole scene
    // scales in to 1.035 while the card plays and back to its rest framing in the rest phase (1.035 keeps the pop-ups'
    // outer edges inside the frame's clip, x ±161.5).
    return { phases, boards: [phone, oldCaption, templates, ...posts, pick, ad, download, suggest, copy, pointer], trail: true, zoom: 1.025, keepRound: '.ui__avatar' };
  }

  // Sell's storyboards, one per ?sell= value (r3-36; Ramir: "I want to see them 1 by 1"); the newest is the default.
  const SELL_BOARDS = { 1: sellLineup, 2: sellReady };
  // r3-89: Ramir's Sell line (2026-11-11) for both storyboards; the old per-storyboard lines are in _archive/before-copy-r3-88d/.
  // The no-break spaces keep "the support" and "the benefits" together, so no line ends on "the".
  const SELL_COPY = {
    1: 'Turn product knowledge into helpful conversations, with the\u00a0support to explain the\u00a0benefits and guide shoppers to the right fit.',
    2: 'Turn product knowledge into helpful conversations, with the\u00a0support to explain the\u00a0benefits and guide shoppers to the right fit.',
  };
  const SELL_KEY = SELL_BOARDS[new URLSearchParams(location.search).get('sell')] ? new URLSearchParams(location.search).get('sell') : '2';
  const DEFS = { understand, sell: SELL_BOARDS[SELL_KEY], market };
  { const body = document.querySelector('[data-card="sell"] .card__body'); if (body) body.textContent = SELL_COPY[SELL_KEY]; }

  // HTML for the panels Air draws as text images, and Understand's dashboard (r3-12).
  // Category tiles (r3-14): a MLILY lifestyle photo (crops listed in assets/img/SOURCES-dashboard.md) and its name.
  const tile = (img, label) => `<span class="ui__tile-img" style="background-image: url('${IMGBASE}cat-${img}.jpg')"></span><span class="ui__tile-label">${label}</span>`;
  const CONTENT = {
    search: '<span class="ui__search-icon"><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="7" cy="7" r="4.6" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M10.5 10.5 14 14" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></span><span class="ui__field"><span class="ui__query"></span><span class="ui__type-caret"></span><span class="ui__placeholder">Search MLILY U</span></span>',
    browse: '<p class="ui__caption">Browse</p>',
    tileMattress: tile('mattresses', 'Mattresses'),
    tileBase: tile('bases', 'Bases'),
    tilePillow: tile('pillows', 'Pillows'),
    tileProtector: tile('protectors', 'Protectors'),
    result: '<span class="ui__thumb"></span><span class="ui__result-text"><b>Midnight</b><i>Hybrid mattress</i></span><svg class="ui__chev" viewBox="0 0 4.6 8" aria-hidden="true"><path d="M1 1 L3.6 4 L1 7" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pointer: '<svg viewBox="0 0 16 22" aria-hidden="true"><path d="M2 1.6v16.6l4.2-4 2.9 6.4 3.1-1.4-2.9-6.3h6.1z" fill="#ffffff" stroke="#0b1017" stroke-width="1.5" stroke-linejoin="round"/></svg>',
    summary: '<p class="ui__caption">Summary</p><p class="ui__text">Midnight, a hybrid: copper gel and gel AeroFusion® memory foams over 6" individually pocketed springs.</p>',
    // r3-33: How it feels, the vv PDP's feel rows (Pocket Catalog 7-step scale, Mattress Summary p.31): 1.0 Firmer at 2.5,
    // 3.0 Plusher at 5.5, on steps 0 (Extra firm) to 6 (Luxury plush). The searched 1.0 is bright, 3.0 faded.
    feel: '<p class="ui__caption">How it feels</p><div class="ui__feel">' +
      '<span class="ui__feel-name is-on">1.0 Firmer</span><span class="ui__feel-track is-on"><i style="left:41.667%"></i></span>' +
      '<span class="ui__feel-name">3.0 Plusher</span><span class="ui__feel-track"><i style="left:91.667%"></i></span>' +
      '<span class="ui__feel-scale"><span>Extra firm</span><span>Luxury plush</span></span></div>',
    video: '<p class="ui__caption">Training video</p><span class="ui__video"><span class="ui__video-play"></span><span class="ui__video-time">2:36</span></span><p class="ui__video-title">Onboard your team on Midnight</p>',
    // r3-50 (Ramir: "make sure it shows the variant name for the layer"): the product is just Midnight now, so the layers pop-up names the build it shows.
    layers: '<p class="ui__caption ui__caption--row"><span>Mattress layers</span><span class="ui__variant">1.0 Firmer</span></p><ul class="ui__list"><li>Comfort Knit Fabric Cover</li><li>1.5" Copper Gel AeroFusion®</li><li>6" Pocketed Springs</li></ul><p class="ui__more">Show more</p>',
    // Sell (r3-35): the kit's header, and the spec and price cards, rebuilt from MLILY's own (the WellFlex 1.0 cards'
    // layout, wellflex-card-thumbnails/) with Midnight 1.0's catalog data: the feels, the layers (products.js, Pocket
    // Catalog p.23), the copper benefit line (p.21), the four catalog badges as MLILY icons, sizes Twin to Cal King. The
    // price card is MLILY's blank, fillable one (the store writes in its own prices); its seals are left out.
    cardsHead: '<p class="ui__caption">Spec and price cards</p><p class="ui__kit-name">Mattresses</p>',
    // Sell storyboard 2 (r3-40): the checklist.
    ready: '<p class="ui__ready-title">Get ready to sell</p><ul class="ui__steps">' + // r3-43: no eyebrow; r3-44: no Show more
      '<li><span class="ring"></span><span><b>Spec and price cards</b><i>Print them for the bed</i></span></li>' +
      '<li><span class="ring"></span><span><b>Floor displays</b><i>Order POP for your store</i></span></li></ul>',
    // Market (r3-55): the phone (a store's feed, an empty post, the caption that types in) and the templates.
    // r3-65: the phone's screen: status bar (time, island, signal, wifi, battery), the store's header (a storefront avatar,
    // its name, more), its last post, actions, the caption, a home bar. r3-70 (Ramir: "For Market, prepopulate it with an
    // already existing post template."): that last post is one of MLILY's own templates, Science of Cool's "Built for Better
    // Airflow" (Midnight ICE, dark), so the new, light WellFlex ICE post clearly takes its place (was a Midnight 1.0 room
    // photo). r3-67 (Ramir:
    // "find a better icon for comments and look to align the time and battery and wifi properly"): the time sits in the
    // middle of the island's left side and the icons in the middle of its right side, all on the island's centre line, as
    // on an iPhone; the comment icon is a speech bubble (its tail low right).
    // r3-78 (Ramir: "Get a better icon for the your store IG."): the store's avatar is a profile mark, a solid storefront (a
    // scalloped awning over a shop front with its door) in white on an ink circle, drawn bold enough to read at its 10 units
    // (r3-65's thin outline on a pale grey circle all but vanished).
    // r3-85 (Ramir: "still need a better icon for store. i do like that it's black."): the mark is a proper shopfront, picked
    // from four drawn and compared at header size (_icons.html in the preview mirror): a canopy with flared sides and a
    // scalloped edge over a shop with its display window and its door.
    // r3-90 (Ramir: "Let's center the icon a bit more."): its box was centred, but the solid awning makes it top-heavy
    // (56% of the white above the middle), so it read high; it now sits 0.9 units lower (viewBox y from -0.9), which puts
    // the gap between awning and shop on the circle's centre line.
    // r3-96 (Ramir: "need this to be a more modern storefront icon."): a new mark, filled and rounded: a rounded awning
    // with three bold scallops over a shop block with an arched door (chosen over a four-scallop version and an outline one,
    // which got busy at the avatar's 13 to 17 px). Drawn at 57% of the circle (was 63%), 0.35 units low so the gap between
    // awning and shop sits on the centre line. The r3-85 mark is in _archive/before-store-icon3-r3-95b/.
    phone: '<div class="ui__screen"><div class="ui__status"><b>9:41</b><span class="ui__island"></span><span class="ui__status-icons">' +
      '<svg viewBox="0 0 14 9" aria-hidden="true"><path d="M1 8h2V6H1zM4.5 8h2V4.5h-2zM8 8h2V3H8zM11.5 8h2V1h-2z" fill="#101820"/></svg>' +
      '<svg viewBox="0 0 12 9" aria-hidden="true"><path d="M1 3.4a7.1 7.1 0 0 1 10 0M2.8 5.3a4.5 4.5 0 0 1 6.4 0M4.6 7.2a1.9 1.9 0 0 1 2.8 0" fill="none" stroke="#101820" stroke-width="1.3" stroke-linecap="round"/></svg>' +
      '<svg viewBox="0 0 20 9" aria-hidden="true"><rect x="0.6" y="0.6" width="16.8" height="7.8" rx="2.2" fill="none" stroke="#101820" stroke-opacity="0.4" stroke-width="1.1"/><rect x="2" y="2" width="12" height="5" rx="1.2" fill="#101820"/><path d="M18.6 3.2v2.6" stroke="#101820" stroke-opacity="0.4" stroke-width="1.2" stroke-linecap="round"/></svg></span></div>' +
      '<div class="ui__phone-head"><span class="ui__avatar"><svg viewBox="0 -0.35 24 24" aria-hidden="true"><path d="M3 6.4A2.4 2.4 0 0 1 5.4 4h13.2A2.4 2.4 0 0 1 21 6.4V8a3 3 0 0 1-6 0 3 3 0 0 1-6 0A3 3 0 0 1 3 8z" fill="#ffffff"/><path d="M5 12.5h14V19a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 19zm5 8v-3.5a2 2 0 0 1 4 0v3.5z" fill="#ffffff" fill-rule="evenodd"/></svg></span><b>Your store</b>' +
      '<svg class="ui__dots" viewBox="0 0 9 3" aria-hidden="true"><circle cx="1.2" cy="1.5" r="1" fill="#101820"/><circle cx="4.5" cy="1.5" r="1" fill="#101820"/><circle cx="7.8" cy="1.5" r="1" fill="#101820"/></svg></div>' +
      '<span class="ui__phone-slot" style="background-image: url(\'' + IMGBASE + 'mkt-post-3.jpg\')"></span>' +
      '<div class="ui__phone-actions"><svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 10.2 1.9 6.3a2.5 2.5 0 0 1 4.1-2.9 2.5 2.5 0 0 1 4.1 2.9z" fill="none" stroke="#101820" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M10.4 10.5 9.84 7.07A4.3 4.3 0 1 0 7.27 9.64z" fill="none" stroke="#101820" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
      '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M10.6 1.6 1.4 5.2l3.7 1.5 1.5 3.7z M5.1 6.7l5.5-5.1" fill="none" stroke="#101820" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg>' +
      '<svg class="ui__save" viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5h6v9L6 8.2 3 10.5z" fill="none" stroke="#101820" stroke-width="1.1" stroke-linejoin="round" stroke-linecap="round"/></svg></div>' +
      '<p class="ui__phone-caption"><b>Your store</b><span class="ui__query"></span><span class="ui__type-caret"></span></p><span class="ui__home"></span></div>',
    templates: '<p class="ui__caption">Post templates</p><div class="ui__thumbs"><span></span><span></span><span></span></div>', // r3-80: empty slots; the carousel's posts land in them
    docPrice: priceCard({ name: 'Midnight 1.0', type: '12″ Hybrid Mattress', photo: 'product-midnight-cutout.webp', sizes: ['TWIN', 'TWIN XL', 'FULL', 'QUEEN', 'KING', 'CAL KING'] }),
    resize: '<p class="ui__pill"><span class="ui__icon"></span>Smart resize<span class="ui__caret"></span></p><ul class="ui__formats"><li>Square<b>1:1</b></li><li>Portrait<b>4:5</b></li><li>Banner<b>1.91:1</b></li><li>Story<b>9:16</b></li><li>Landscape<b>16:9</b></li></ul><span class="ui__btn">Generate</span>',
  };

  // Air's phase resolver ("z").
  const resolve = (board, phase, count, elapsed) => {
    const rest = { ...board, timeline: undefined };
    if (phase === null || phase === count - 1) return rest;
    return (board.timeline || []).slice(0, phase + 1).reduce((state, entry, i) => (
      i === phase && entry.delay !== undefined && elapsed < entry.delay ? state : { ...state, ...entry }
    ), rest);
  };

  // Air's sizing ("V"): numbers stay; "auto" follows the image's (or panel's) proportions.
  const aspectOf = (b) => (b.aspect || (b.img && IMG[b.img] ? IMG[b.img].aspect : 1));
  const size = (b, w, h) => {
    const a = aspectOf(b);
    if (typeof w === 'number' && typeof h === 'number') return [w, h];
    if (typeof w === 'number') return [w, w / a];
    if (typeof h === 'number') return [h * a, h];
    return [153.5, 153.5];
  };

  const ease = (cur, target, k) => cur + (target - cur) * Math.min(1, k);
  const make = (cls, parent) => { const el = document.createElement('div'); el.className = cls; parent.append(el); return el; };

  function createCard(article, def) {
    const stage = article.querySelector('[data-stage]');
    const tilt = article.querySelector('[data-tilt]');
    const count = def.phases.length;
    const loop = def.phases.reduce((a, b) => a + b, 0);
    let scale = 1;
    let active = false;
    let wasActive = false;
    let elapsed = 0;
    let hold = false;
    let pointer = null;
    const rot = { x: 0, y: 0 };
    // r3-67 (Ramir: "give it a bit more personality by doing some sort of light trail like in this. Not too distracting
    // either."): an opt-in dot grid (def.trail; Market, and since r3-68 Learn and Sell too), flat, behind the boards: dots every 15 units out to ±150, white at
    // 0.12; round the light they turn Good Blue (#A4C8E1, the validated highlight on dark) and up to 0.67, falling off over
    // about 24 units, and each dot cools over 0.6 s, so a moving light leaves a trail. The light is the mouse while it is over
    // the card, else the card's own pointer (its tip) while it shows. Drawn only while something is lit (and once at rest).
    const TRAIL = { gap: 15, reach: 150, /* r3-75: 150, inside the restored clip (161.5); r3-74 (Ramir: "give the dots some container padding as well, i dont want them filling the whole frame"): 165, so the outermost dots sit about 25 px in from the picture's edges (r3-73 had 180, nearly to them) */ r: 0.8, sigma: 24, tau: 0.6, base: 0.12, lit: 0.55, rgb: [164, 200, 225], grow: 1 }; // r3-95 (Ramir: "make the background dots smaller."): radius 0.8 (was 1.15), so 1.6 units across at rest, 3.2 lit
    // r3-90 (Ramir: "Let's also give the back beads a bit more than fading it out like that."): a lit dot also swells, up
    // to twice its size under the light (grow 1), and shrinks back as it cools, so the trail blooms rather than only fading.
    let zoomNow = 1; // r3-71: def.zoom (Market): the scene's scale, eased toward def.zoom while the card plays
    let keep = null; // r3-86: a circle kept round under the tilt (def.keepRound), found once the boards are built
    let trail = null;
    if (def.trail) {
      const cv = document.createElement('canvas');
      cv.className = 'card__trail';
      cv.setAttribute('aria-hidden', 'true');
      stage.insertBefore(cv, tilt);
      trail = { cv, ctx: cv.getContext('2d'), px: [], py: [], heat: [], w: 0, h: 0, mouse: null, hot: false, dirty: true,
        pointer: def.boards.find((b) => b.kind === 'pointer') };
      const n = Math.floor(TRAIL.reach / TRAIL.gap);
      for (let i = -n; i <= n; i++) for (let k = -n; k <= n; k++) { trail.px.push(i * TRAIL.gap); trail.py.push(k * TRAIL.gap); trail.heat.push(0); }
    }
    const drawTrail = (dt) => {
      const T = trail;
      const W = stage.clientWidth;
      const H = stage.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      if (T.w !== W || T.h !== H) {
        T.w = W; T.h = H; T.cv.width = Math.round(W * dpr); T.cv.height = Math.round(H * dpr);
        T.ctx.setTransform(dpr, 0, 0, dpr, 0, 0); T.dirty = true;
      }
      let L = null;
      if (active && !reduce) {
        if (T.mouse) L = { x: T.mouse.x, y: T.mouse.y, k: 1 };
        else if (T.pointer && T.pointer.now.img > 0.05) {
          const p = T.pointer.now;
          L = { x: (p.x - p.w / 2) * zoomNow, y: (p.y + p.h / 2) * zoomNow, k: p.img }; // where the (zoomed) tip shows
        }
      }
      const fade = Math.exp(-Math.min(dt, 0.1) / TRAIL.tau);
      const s2 = 2 * TRAIL.sigma * TRAIL.sigma;
      let hot = false;
      for (let i = 0; i < T.heat.length; i++) {
        let h = T.heat[i] * fade;
        if (L) {
          const dx = T.px[i] - L.x;
          const dy = T.py[i] - L.y;
          const g = L.k * Math.exp(-(dx * dx + dy * dy) / s2);
          if (g > h) h = g;
        }
        if (h < 0.003) h = 0; else hot = true;
        T.heat[i] = h;
      }
      if (!hot && !T.hot && !T.dirty) return;
      T.hot = hot; T.dirty = false;
      const ctx = T.ctx;
      const r = TRAIL.r * scale;
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < T.heat.length; i++) {
        const h = T.heat[i];
        const c = TRAIL.rgb.map((v) => Math.round(255 + (v - 255) * h));
        ctx.fillStyle = `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${(TRAIL.base + TRAIL.lit * h).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(W / 2 + T.px[i] * scale, H / 2 - T.py[i] * scale, r * (1 + TRAIL.grow * h), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    def.boards.forEach((b) => {
      const el = make(`board board--${b.kind}${b.theme ? ` board--${b.theme}` : ''}`, tilt); // theme: 'light' = a white pop-up (r3-37)
      b.el = el;
      if (b.kind === 'tile' || b.backdrop || (b.kind === 'glass' && b.bg) || b.kind === 'field' || b.kind === 'scrim' || b.kind === 'dash') {
        b.fillEl = make('board__fill', el);
        if (b.bg && typeof b.bg === 'string') b.fillEl.style.background = b.bg;
      }
      if (b.kind === 'grid') b.fillEl = make('board__grid', el);
      if (b.kind === 'glass') b.glassEl = make(b.chip ? 'board__glass board__glass--chip' : 'board__glass', el);
      if (b.img) { b.imgEl = make('board__img', el); b.imgEl.style.backgroundImage = `url("${IMG[b.img].src}")`; }
      if (b.kind === 'layer') {
        b.sweepEl = make('board__sweep', el);
        if (b.img) { const m = `url("${IMG[b.img].src}")`; b.sweepEl.style.webkitMaskImage = m; b.sweepEl.style.maskImage = m; }
      }
      if (b.kind === 'tile') { b.subEl = make('board__product', el); b.subEl.style.backgroundImage = `url("${IMG.cutout.src}")`; }
      if (b.player) { b.playerEl = make('board__player', el); b.playerEl.innerHTML = '<span class="board__play"></span><span class="board__bar"></span>'; }
      if (b.content || b.chip) {
        b.contentEl = make(`board__content ui ${b.content ? `ui--${b.contentClass || b.content}` : 'ui--chip'}`, el);
        b.contentEl.innerHTML = b.chip ? `<span class="ui__chip">${b.chip}<i>×</i></span>` : (b.html ?? CONTENT[b.content]);
        if (b.content === 'resize') b.subEl = b.contentEl.querySelector('.ui__btn');
        if (b.type) b.typeEl = b.contentEl.querySelector('.ui__query');
      }
      if (b.tag) { b.tagEl = document.createElement('span'); b.tagEl.className = `board__tag board__tag--${b.tagTheme}`; b.tagEl.textContent = b.tag; el.append(b.tagEl); }
      if (b.kind === 'folder') { b.titleEl = document.createElement('span'); b.titleEl.className = 'board__title'; b.titleEl.textContent = b.title; el.append(b.titleEl); }
      if (b.radius) el.style.setProperty('--r', b.radius);
      const [w, h] = size(b, b.w, b.h);
      const img0 = b.img0 === false || b.img === false ? 0 : 1;
      b.now = { x: b.x, y: b.y, z: b.z, w, h, rot: b.rot || 0, img: img0, edge: b.edge || 0, fill: b.fill ?? (b.fillEl ? 1 : 0),
        glass: b.glass ?? 1, agentic: b.agentic || 0, sub: 1, player: 1, title: 0.5, titleScale: b.title ? 1 : 0, tagScale: 0,
        rx: b.rx || 0, ry: b.ry || 0 };
    });

    const measure = () => {
      // r3-73 (Ramir: "feels a bit cramped in there. Let the animation frames breathe a bit."): every scene is drawn at 0.93 of
      // its size (FIT) in a wider card (css), so the type keeps its size and the scenes get more blue round them.
      scale = (stage.clientWidth / UNITS) * FIT;
      stage.style.setProperty('--s', scale.toFixed(4));
      def.boards.forEach((b) => {
        if (!b.contentEl) return;
        b.contentEl.style.width = `${(b.dw * scale).toFixed(2)}px`;
        b.contentEl.style.height = `${((b.dw / aspectOf(b)) * scale).toFixed(2)}px`;
      });
    };
    measure();
    addEventListener('resize', measure);

    stage.addEventListener('pointermove', (e) => {
      const r = stage.getBoundingClientRect();
      pointer = [Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1)), Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1))];
      if (trail && e.pointerType === 'mouse') trail.mouse = { x: (e.clientX - r.left - r.width / 2) / scale, y: -(e.clientY - r.top - r.height / 2) / scale };
    });
    stage.addEventListener('pointerleave', () => { pointer = null; if (trail) trail.mouse = null; });

    function frame(dt) {
      const step = Math.min(dt, 1 / 30);
      let phase = null;
      let inPhase = 0;
      if (active) {
        if (!wasActive) elapsed = 0; else if (!hold) elapsed += dt * 1000;
        const d = elapsed % loop;
        let start = 0;
        for (let i = 0; i < count; i++) {
          if (d < start + def.phases[i]) { phase = i; inPhase = d - start; break; }
          start += def.phases[i];
        }
      }
      wasActive = active;
      const live = phase !== null && phase !== count - 1;
      // r3-71: the scene scales in a little while the card plays and back at rest (2.2 a second: 89 % in 1 s).
      if (def.zoom) zoomNow = reduce ? 1 : ease(zoomNow, live ? def.zoom : 1, 2.2 * Math.min(dt, 1 / 30));

      def.boards.forEach((b) => {
        const s = resolve(b, phase, count, inPhase);
        const [tw, th] = size(b, s.w, s.h);
        const imgOn = s.img === false || (s.img0 === false && s.img !== true) ? 0 : 1;
        const target = {
          x: s.x, y: s.y, z: s.z, w: tw, h: th, rot: s.rot || 0, rx: s.rx || 0, ry: s.ry || 0, img: imgOn, edge: s.edge || 0,
          fill: s.fill ?? (b.fillEl ? 1 : 0), glass: s.glass ?? 1, agentic: s.agentic || 0,
          sub: s.sub === false || imgOn === 0 ? 0 : 1, player: s.player === false || imgOn === 0 ? 0 : 1,
          title: live && s.titleOpacity !== undefined ? s.titleOpacity : 0.5,
          titleScale: s.title ? 1 : 0, tagScale: live && s.tag && s.tagVisible ? 1 : 0,
        };
        const n = b.now;
        const jump = reduce || s.snap;
        const k = (b.rate || 5) * step; // Air's 5; the dashboard's search, card and pointer use 9 (r3-12)
        if (b.follow && b.own) { n.w = b.own.w; n.h = b.own.h; } // its own size eases unscaled (see follow, below)
        ['x', 'y', 'z', 'w', 'h', 'rot', 'rx', 'ry', 'img', 'edge', 'fill', 'glass', 'agentic', 'sub', 'player', 'title'].forEach((key) => {
          n[key] = jump ? target[key] : ease(n[key], target[key], k);
        });
        // r3-92 follow (Ramir: "let's fix the check boxes not being aligned."): a board drawn on another board's content
        // (Sell's ticks on the Order POP boxes, the spec and price cards in their tool) takes its place and scale from that
        // board's live state every frame: { board, dx, dy } is its offset from the board's middle at full size, dz its depth
        // in front. So it slides and shrinks with the panel as it comes and goes, instead of holding still while the panel
        // moves under it. Its own size (a tick's pop) still eases, then scales with the panel. The board must come first.
        if (b.follow) {
          b.own = { w: n.w, h: n.h };
          const F = b.follow;
          const P = F.board.now;
          const fk = P.w / F.board.dw;
          n.x = P.x + F.dx * fk; n.y = P.y + F.dy * fk; n.z = P.z + F.dz; n.w *= fk; n.h *= fk;
        }
        // The search field types its text letter by letter in its typing phase and keeps it until the rest phase; empty,
        // it shows the placeholder. The (dark) caret shows while the field is focused, solid while typing.
        if (b.typeEl) {
          const t = b.type;
          let shown = '';
          if (live && phase > t.phase && !(t.clear !== undefined && phase >= t.clear)) shown = t.text;
          else if (live && phase === t.phase) shown = reduce ? t.text : t.text.slice(0, t.at.filter((ms) => inPhase >= ms).length);
          if (b.typeEl.textContent !== shown) b.typeEl.textContent = shown;
          b.el.classList.toggle('is-empty', !shown);
          b.el.classList.toggle('is-focused', live && phase >= t.focus[0] && phase <= t.focus[1]);
          b.el.classList.toggle('is-typing', live && phase === t.phase && shown.length < t.text.length);
        }
        n.titleScale = reduce ? target.titleScale : ease(n.titleScale, target.titleScale, 10 * step);
        n.tagScale = reduce ? target.tagScale : ease(n.tagScale, target.tagScale, 10 * step);
        if (s.title && b.titleEl) b.titleEl.textContent = s.title;

        const el = b.el;
        el.style.width = `${(n.w * scale).toFixed(2)}px`;
        el.style.height = `${(n.h * scale).toFixed(2)}px`;
        el.style.transform = `translate(-50%, -50%) translate3d(${(n.x * scale).toFixed(2)}px, ${(-n.y * scale).toFixed(2)}px, ${(n.z * scale).toFixed(2)}px) rotateY(${n.ry.toFixed(3)}deg) rotateX(${n.rx.toFixed(3)}deg) rotate(${(-n.rot).toFixed(3)}deg)`;
        el.style.borderColor = `rgba(${b.edgeRGB || '255, 255, 255'}, ${((b.kind === 'folder' ? 0.42 : b.edgeA ?? 0.5) * n.edge).toFixed(3)})`;
        if (b.imgEl) b.imgEl.style.opacity = n.img.toFixed(3);
        if (b.fillEl) b.fillEl.style.opacity = (b.kind === 'glass' ? n.fill : n.fill).toFixed(3);
        if (b.glassEl) b.glassEl.style.opacity = n.glass.toFixed(3);
        if (b.sweepEl) b.sweepEl.style.opacity = n.agentic.toFixed(3);
        if (b.subEl && b.kind === 'tile') b.subEl.style.opacity = n.sub.toFixed(3);
        if (b.subEl && b.content === 'resize') b.subEl.style.setProperty('--hot', n.sub.toFixed(3));
        if (b.playerEl) b.playerEl.style.opacity = Math.min(n.img, n.player).toFixed(3);
        if (b.contentEl) {
          b.contentEl.style.opacity = n.img.toFixed(3);
          // center (r3-47, Sell's checklist): a board taller than its scaled content keeps the content in its middle.
          const k = n.w / b.dw;
          const dy = b.center ? (Math.max(0, n.h - (b.dw / aspectOf(b)) * k) / 2) * scale : 0;
          b.contentEl.style.transform = `${dy ? `translateY(${dy.toFixed(2)}px) ` : ''}scale(${k.toFixed(4)})`;
          // A field's corner scales with it, like its content (r3-20): the result card keeps concentric corners as it pops out.
          if ((b.kind === 'field' || b.scaleRadius) && b.radius) el.style.setProperty('--r', ((b.radius * n.w) / b.dw).toFixed(3)); // scaleRadius: any board (r3-48)
        }
        if (b.titleEl) { b.titleEl.style.opacity = n.title.toFixed(3); b.titleEl.style.transform = `scale(${n.titleScale.toFixed(3)})`; }
        if (b.tagEl) b.tagEl.style.transform = `scale(${n.tagScale.toFixed(3)})`;
      });

      const tx = pointer && !reduce ? -pointer[1] * TILT_MAX : 0;
      const ty = pointer && !reduce ? pointer[0] * TILT_MAX : 0;
      rot.x = ease(rot.x, tx, 4 * step);
      rot.y = ease(rot.y, ty, 4 * step);
      tilt.style.transform = `rotateX(${rot.x.toFixed(3)}deg) rotateY(${rot.y.toFixed(3)}deg)${def.zoom ? ` scale(${zoomNow.toFixed(4)})` : ''}`;
      // r3-86 (Ramir: "The icon isn't circular, seems like an oval."): the tilt and the perspective squash the scene (up to
      // 3.4% near the card's corners), which shows on a small circle. def.keepRound names such a circle (Market's avatar):
      // while the scene is tilted, its on-screen box is read each frame and --round-sx / --round-sy stretch it back to square.
      if (def.keepRound && !keep) { const el = stage.querySelector(def.keepRound); if (el) keep = { el, x: 1, y: 1 }; }
      if (keep && (Math.abs(rot.x) > 0.01 || Math.abs(rot.y) > 0.01 || keep.x !== 1 || keep.y !== 1)) {
        const r = keep.el.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          const q = Math.sqrt(r.width / r.height);
          keep.x = Math.min(1.12, Math.max(0.88, keep.x / q));
          keep.y = Math.min(1.12, Math.max(0.88, keep.y * q));
          if (Math.abs(rot.x) <= 0.01 && Math.abs(rot.y) <= 0.01 && Math.abs(keep.x - 1) < 0.002 && Math.abs(keep.y - 1) < 0.002) { keep.x = 1; keep.y = 1; }
          stage.style.setProperty('--round-sx', keep.x.toFixed(4));
          stage.style.setProperty('--round-sy', keep.y.toFixed(4));
        }
      }
      if (trail) drawTrail(dt);
    }

    return {
      el: article, loop, frame, time: () => elapsed,
      setActive(on) { active = on; article.classList.toggle('is-active', on); },
      at(ms) { active = true; wasActive = true; elapsed = ms; hold = true; article.classList.add('is-active'); },
      release() { hold = false; },
    };
  }

  // The row: one active card at a time; auto-advance after its loop + 0.8 s; hover or focus takes over and holds.
  // Built once the fonts are in (Montserrat since r3-27), but never later than 1.5 s.
  const init = () => {
  const cards = [...document.querySelectorAll('[data-card]')].map((el) => createCard(el, DEFS[el.dataset.card]()));
  if (!cards.length) return;
  let current = 0;
  let held = null;
  let timer = 0;
  let paused = false;
  const show = (i) => { current = i; timer = 0; cards.forEach((c, k) => c.setActive(k === i)); };
  show(0);
  cards.forEach((c, i) => {
    if (!noHover) {
      c.el.addEventListener('mouseenter', () => { held = i; show(i); });
      c.el.addEventListener('mouseleave', () => { if (held === i) held = null; timer = 0; });
    }
    c.el.addEventListener('focus', () => { held = i; show(i); });
    c.el.addEventListener('blur', () => { if (held === i) held = null; timer = 0; });
  });

  let last = performance.now();
  const tick = (t) => {
    const dt = Math.max(0, (t - last) / 1000);
    last = t;
    if (held === null && !paused) {
      timer += dt * 1000;
      if (timer >= cards[current].loop + GAP) show((current + 1) % cards.length);
    }
    // r3-72: each card's turn fills a line under its picture (--p, 0 to 1): through the turn while the row plays them in
    // turn, through each loop while a card is hovered; the others stay empty.
    cards.forEach((c, k) => {
      c.frame(dt);
      const p = k !== current ? 0 : held === k ? (c.time() % c.loop) / c.loop : Math.min(1, timer / c.loop);
      c.el.style.setProperty('--p', p.toFixed(4));
    });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // For checking in the browser: hold a card at a time in its loop (ms); release() lets the row run again.
  window.__rv3 = {
    cards,
    at(index, ms) { paused = true; cards.forEach((c, k) => (k === index ? c.at(ms) : c.setActive(false))); },
    release() { paused = false; cards.forEach((c) => c.release()); show(current); },
    step(dt, frames = 1) { for (let i = 0; i < frames; i++) cards.forEach((c) => c.frame(dt)); },
  };
  };
  // r3-99: also load the faces textWidth measures with; fonts.ready alone doesn't wait for a face no element uses yet.
  const MEASURED = ['500 8px', '600 12px', '600 8.4px'].map((f) => document.fonts.load(`${f} ${FONT_STACK}`));
  Promise.race([document.fonts.ready.then(() => Promise.all(MEASURED)), new Promise((done) => setTimeout(done, 1500))]).then(init);
})();
