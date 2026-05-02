# Shapely

An interactive geometry SaaS for middle-school classrooms. Rotate 3D prisms,
build composite shapes (triangle on rectangle, cone on cylinder, etc.), and
watch surface area, volume, and perimeter recalculate in real time.

## Features

- **12 core shapes** — cube, rectangular prism, triangular prism, cylinder, cone,
  sphere, square pyramid, rectangle, triangle, circle, trapezoid, regular hexagon.
- **7 composite presets** — triangle on rectangle (house), cone + sphere
  (ice cream), cylinder + cone (silo), cube + pyramid (obelisk), L-shape,
  capsule, tent.
- **Live formulas + values** — type a side length and watch the math update.
- **Smart labels** — sides show as `a, b, h…` by default, or as the actual
  numbers as soon as the student types one in.
- **Rotate / zoom** — drag to rotate, scroll to zoom; auto-rotation is on by
  default for a calm, demoable feel.
- **Marketing landing page** — hero with a rotating 3D composite, features,
  shape library, pricing, FAQ.

## Run locally

This is a fully static site — no build step. Serve the folder with any static
HTTP server (modules require `http://`, not `file://`):

```sh
python3 -m http.server 8080
# then open http://localhost:8080
```

Or with Node:

```sh
npx serve .
```

## Files

- `index.html` — marketing landing page
- `app.html` — the workspace
- `css/styles.css` — shared theme
- `css/app.css` — workspace layout
- `js/landing.js` — rotating hero scene
- `js/app.js` — workspace logic, camera, label projection
- `js/shapes.js` — shape catalog (geometry + label points + formulas)

## Tech

Three.js (loaded from a CDN via import maps), plain ES modules, SVG label
overlay. Works on Chromebooks, modern Chrome / Safari / Firefox.

## Curriculum alignment

Targets Common Core 6.G.1–4 and 7.G.4–6, plus the surface-area / volume
strands of most state middle-school standards.
