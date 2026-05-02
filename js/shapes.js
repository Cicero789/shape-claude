// Shape catalog. Each entry exposes:
//   name, category, dims (input fields), build(d) -> THREE.Group,
//   labels(d) -> [{ pos: Vector3, sym, num }], calc(d) -> calc rows
import * as THREE from 'three';

const PI = Math.PI;
const f2 = (n) => Math.round(n * 100) / 100;

// ---------- materials & helpers ----------
export function makeMaterials() {
  const surface = new THREE.MeshPhysicalMaterial({
    color: 0x7c5cff,
    metalness: 0.05,
    roughness: 0.45,
    transmission: 0.0,
    transparent: true,
    opacity: 0.92,
    clearcoat: 0.4,
    clearcoatRoughness: 0.6,
    side: THREE.DoubleSide,
  });
  const accent = surface.clone();
  accent.color = new THREE.Color(0x4dd6ff);
  const wire = new THREE.LineBasicMaterial({
    color: 0xeef1ff,
    transparent: true,
    opacity: 0.85,
  });
  return { surface, accent, wire };
}

function withEdges(mesh, wireMat) {
  const g = new THREE.Group();
  g.add(mesh);
  const eg = new THREE.EdgesGeometry(mesh.geometry, 1);
  const lines = new THREE.LineSegments(eg, wireMat);
  g.add(lines);
  return g;
}

// ---------- shape definitions ----------
// Note: build/labels accept (d, mats). All numeric units assumed homogeneous.
export const SHAPES = {

  // ===== PRISMS / 3D =====
  cube: {
    name: 'Cube', category: 'prisms',
    tip: 'A cube has 6 equal square faces. Surface area is 6 copies of one face.',
    dims: [{ key: 's', sym: 's', label: 'Side', def: 4 }],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.s, d.s, d.s), m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      const h = d.s / 2;
      return [{ pos: new THREE.Vector3(0, -h - 0.15, h), sym: 's', num: d.s }];
    },
    calc(d) {
      const s = d.s;
      return [
        { name: 'Perimeter (edge total)', formula: '12 · s',  value: 12 * s, unit: '' },
        { name: 'Surface area',           formula: '6 · s²',  value: 6 * s * s, unit: '²' },
        { name: 'Volume',                 formula: 's³',      value: s ** 3, unit: '³' },
      ];
    },
  },

  'rect-prism': {
    name: 'Rectangular prism', category: 'prisms',
    tip: 'Surface area sums 3 pairs of rectangles: l·w, l·h, w·h.',
    dims: [
      { key: 'l', sym: 'l', label: 'Length', def: 5 },
      { key: 'w', sym: 'w', label: 'Width',  def: 3 },
      { key: 'h', sym: 'h', label: 'Height', def: 4 },
    ],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(d.l, d.h, d.w), m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.h / 2 - 0.2, d.w / 2), sym: 'l', num: d.l },
        { pos: new THREE.Vector3(d.l / 2, -d.h / 2 - 0.2, 0), sym: 'w', num: d.w },
        { pos: new THREE.Vector3(d.l / 2 + 0.2, 0, d.w / 2),  sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { l, w, h } = d;
      return [
        { name: 'Perimeter (edge total)', formula: '4·(l + w + h)',          value: 4 * (l + w + h),       unit: '' },
        { name: 'Surface area',           formula: '2·(lw + lh + wh)',       value: 2 * (l * w + l * h + w * h), unit: '²' },
        { name: 'Volume',                 formula: 'l · w · h',              value: l * w * h,             unit: '³' },
      ];
    },
  },

  'tri-prism': {
    name: 'Triangular prism', category: 'prisms',
    tip: 'Two triangular bases plus three rectangle sides.',
    dims: [
      { key: 'b', sym: 'b', label: 'Base',           def: 4 },
      { key: 'h', sym: 'h', label: 'Triangle height',def: 3 },
      { key: 'L', sym: 'L', label: 'Prism length',   def: 6 },
    ],
    build(d, m) {
      const shape = new THREE.Shape();
      shape.moveTo(-d.b / 2, 0);
      shape.lineTo(d.b / 2, 0);
      shape.lineTo(0, d.h);
      shape.closePath();
      const geom = new THREE.ExtrudeGeometry(shape, { depth: d.L, bevelEnabled: false });
      geom.translate(0, -d.h / 3, -d.L / 2);
      const mesh = new THREE.Mesh(geom, m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.h / 3 - 0.2, d.L / 2), sym: 'b', num: d.b },
        { pos: new THREE.Vector3(-d.b / 2 - 0.3, d.h / 4, d.L / 2), sym: 'h', num: d.h },
        { pos: new THREE.Vector3(d.b / 2 + 0.2, -d.h / 3, 0), sym: 'L', num: d.L },
      ];
    },
    calc(d) {
      const { b, h, L } = d;
      const hyp = Math.sqrt((b / 2) ** 2 + h * h);
      const triPerim = b + 2 * hyp;
      return [
        { name: 'Edge total',   formula: '2·(b + 2·√((b/2)² + h²)) + 3L', value: 2 * triPerim + 3 * L, unit: '' },
        { name: 'Surface area', formula: 'b·h + (b + 2·√((b/2)² + h²))·L', value: b * h + triPerim * L, unit: '²' },
        { name: 'Volume',       formula: '½ · b · h · L',                  value: 0.5 * b * h * L,      unit: '³' },
      ];
    },
  },

  cylinder: {
    name: 'Cylinder', category: 'prisms',
    tip: 'Surface area = 2 circles + the rectangle that wraps around.',
    dims: [
      { key: 'r', sym: 'r', label: 'Radius', def: 2 },
      { key: 'h', sym: 'h', label: 'Height', def: 5 },
    ],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r, d.h, 64, 1), m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(d.r + 0.3, d.h / 2 + 0.2, 0), sym: 'r', num: d.r },
        { pos: new THREE.Vector3(d.r + 0.4, 0, 0),             sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { r, h } = d;
      return [
        { name: 'Circumference (base)', formula: '2π · r',           value: 2 * PI * r,           unit: '' },
        { name: 'Surface area',         formula: '2π·r² + 2π·r·h',   value: 2 * PI * r * r + 2 * PI * r * h, unit: '²' },
        { name: 'Volume',               formula: 'π · r² · h',       value: PI * r * r * h,       unit: '³' },
      ];
    },
  },

  cone: {
    name: 'Cone', category: 'prisms',
    tip: 'Slant height ℓ = √(r² + h²). Lateral area = π·r·ℓ.',
    dims: [
      { key: 'r', sym: 'r', label: 'Radius', def: 2 },
      { key: 'h', sym: 'h', label: 'Height', def: 5 },
    ],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(d.r, d.h, 64, 1), m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(d.r + 0.3, -d.h / 2, 0), sym: 'r', num: d.r },
        { pos: new THREE.Vector3(0.1, 0, 0),              sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { r, h } = d;
      const slant = Math.sqrt(r * r + h * h);
      return [
        { name: 'Slant height ℓ',  formula: '√(r² + h²)',     value: slant,                          unit: '' },
        { name: 'Surface area',    formula: 'π·r² + π·r·ℓ',   value: PI * r * r + PI * r * slant,     unit: '²' },
        { name: 'Volume',          formula: '⅓ · π · r² · h', value: (1 / 3) * PI * r * r * h,        unit: '³' },
      ];
    },
  },

  sphere: {
    name: 'Sphere', category: 'prisms',
    tip: 'A sphere has no edges. Volume grows with the cube of the radius.',
    dims: [{ key: 'r', sym: 'r', label: 'Radius', def: 3 }],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 32), m.surface);
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [{ pos: new THREE.Vector3(d.r + 0.3, 0, 0), sym: 'r', num: d.r }];
    },
    calc(d) {
      const r = d.r;
      return [
        { name: 'Great-circle circumference', formula: '2π · r',         value: 2 * PI * r,                  unit: '' },
        { name: 'Surface area',               formula: '4π · r²',        value: 4 * PI * r * r,              unit: '²' },
        { name: 'Volume',                     formula: '⁴⁄₃ · π · r³',   value: (4 / 3) * PI * r ** 3,        unit: '³' },
      ];
    },
  },

  pyramid: {
    name: 'Square pyramid', category: 'prisms',
    tip: 'Slant height ℓ = √((b/2)² + h²). Lateral = 2·b·ℓ.',
    dims: [
      { key: 'b', sym: 'b', label: 'Base side', def: 4 },
      { key: 'h', sym: 'h', label: 'Height',    def: 5 },
    ],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.ConeGeometry(d.b / Math.SQRT2, d.h, 4, 1), m.surface);
      mesh.rotation.y = Math.PI / 4;
      return withEdges(mesh, m.wire);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.h / 2 - 0.2, d.b / 2), sym: 'b', num: d.b },
        { pos: new THREE.Vector3(0.1, 0, 0),                  sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { b, h } = d;
      const slant = Math.sqrt((b / 2) ** 2 + h * h);
      return [
        { name: 'Slant height ℓ', formula: '√((b/2)² + h²)', value: slant,                       unit: '' },
        { name: 'Surface area',   formula: 'b² + 2·b·ℓ',     value: b * b + 2 * b * slant,        unit: '²' },
        { name: 'Volume',         formula: '⅓ · b² · h',     value: (1 / 3) * b * b * h,          unit: '³' },
      ];
    },
  },

  // ===== 2D / FLAT =====
  rectangle: {
    name: 'Rectangle', category: 'flat',
    tip: 'Perimeter is the trip around the outside. Area is rows × columns of unit squares.',
    dims: [
      { key: 'l', sym: 'l', label: 'Length', def: 6 },
      { key: 'w', sym: 'w', label: 'Width',  def: 3 },
    ],
    build(d, m) {
      return flatShape((s) => {
        s.moveTo(-d.l / 2, -d.w / 2);
        s.lineTo(d.l / 2, -d.w / 2);
        s.lineTo(d.l / 2, d.w / 2);
        s.lineTo(-d.l / 2, d.w / 2);
        s.closePath();
      }, m);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.w / 2 - 0.25, 0.05), sym: 'l', num: d.l },
        { pos: new THREE.Vector3(d.l / 2 + 0.25, 0, 0.05),  sym: 'w', num: d.w },
      ];
    },
    calc(d) {
      const { l, w } = d;
      return [
        { name: 'Perimeter', formula: '2·(l + w)', value: 2 * (l + w), unit: '' },
        { name: 'Area',      formula: 'l · w',     value: l * w,       unit: '²' },
      ];
    },
  },

  triangle: {
    name: 'Triangle', category: 'flat',
    tip: 'Area is half base × height, no matter what kind of triangle.',
    dims: [
      { key: 'b', sym: 'b', label: 'Base',   def: 6 },
      { key: 'h', sym: 'h', label: 'Height', def: 4 },
    ],
    build(d, m) {
      return flatShape((s) => {
        s.moveTo(-d.b / 2, -d.h / 2);
        s.lineTo(d.b / 2, -d.h / 2);
        s.lineTo(0, d.h / 2);
        s.closePath();
      }, m);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.h / 2 - 0.25, 0.05), sym: 'b', num: d.b },
        { pos: new THREE.Vector3(0.15, 0, 0.05),            sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { b, h } = d;
      const hyp = Math.sqrt((b / 2) ** 2 + h * h);
      return [
        { name: 'Perimeter (isoceles)', formula: 'b + 2·√((b/2)² + h²)', value: b + 2 * hyp, unit: '' },
        { name: 'Area',                 formula: '½ · b · h',            value: 0.5 * b * h, unit: '²' },
      ];
    },
  },

  circle: {
    name: 'Circle', category: 'flat',
    tip: 'Pi (≈3.14159) shows up in both circumference and area.',
    dims: [{ key: 'r', sym: 'r', label: 'Radius', def: 3 }],
    build(d, m) {
      const mesh = new THREE.Mesh(new THREE.CircleGeometry(d.r, 96), m.surface);
      const ring = new THREE.LineLoop(
        new THREE.CircleGeometry(d.r, 96),
        m.wire,
      );
      // CircleGeometry includes a center vertex; strip it for the loop
      const pts = [];
      for (let i = 0; i <= 96; i++) {
        const a = (i / 96) * PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * d.r, Math.sin(a) * d.r, 0));
      }
      const ringGeom = new THREE.BufferGeometry().setFromPoints(pts);
      const loop = new THREE.LineLoop(ringGeom, m.wire);
      const g = new THREE.Group();
      g.add(mesh);
      g.add(loop);
      return g;
    },
    labels(d) {
      return [{ pos: new THREE.Vector3(d.r * 0.55, 0.2, 0.05), sym: 'r', num: d.r }];
    },
    calc(d) {
      const r = d.r;
      return [
        { name: 'Circumference', formula: '2π · r', value: 2 * PI * r,     unit: '' },
        { name: 'Area',          formula: 'π · r²', value: PI * r * r,     unit: '²' },
      ];
    },
  },

  trapezoid: {
    name: 'Trapezoid', category: 'flat',
    tip: 'Average the two parallel sides, then multiply by height.',
    dims: [
      { key: 'a', sym: 'a', label: 'Top side',    def: 3 },
      { key: 'b', sym: 'b', label: 'Bottom side', def: 6 },
      { key: 'h', sym: 'h', label: 'Height',      def: 3 },
    ],
    build(d, m) {
      return flatShape((s) => {
        s.moveTo(-d.b / 2, -d.h / 2);
        s.lineTo(d.b / 2, -d.h / 2);
        s.lineTo(d.a / 2, d.h / 2);
        s.lineTo(-d.a / 2, d.h / 2);
        s.closePath();
      }, m);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, d.h / 2 + 0.25, 0.05),  sym: 'a', num: d.a },
        { pos: new THREE.Vector3(0, -d.h / 2 - 0.25, 0.05), sym: 'b', num: d.b },
        { pos: new THREE.Vector3(d.b / 2 + 0.25, 0, 0.05),  sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { a, b, h } = d;
      const leg = Math.sqrt(((b - a) / 2) ** 2 + h * h);
      return [
        { name: 'Perimeter (isoceles)', formula: 'a + b + 2·√(((b−a)/2)² + h²)', value: a + b + 2 * leg, unit: '' },
        { name: 'Area',                 formula: '½ · (a + b) · h',              value: 0.5 * (a + b) * h, unit: '²' },
      ];
    },
  },

  hexagon: {
    name: 'Regular hexagon', category: 'flat',
    tip: 'Six equilateral triangles. Apothem a = s·√3/2.',
    dims: [{ key: 's', sym: 's', label: 'Side', def: 3 }],
    build(d, m) {
      return flatShape((sh) => {
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * PI * 2 + PI / 6;
          const x = Math.cos(a) * d.s;
          const y = Math.sin(a) * d.s;
          if (i === 0) sh.moveTo(x, y); else sh.lineTo(x, y);
        }
        sh.closePath();
      }, m);
    },
    labels(d) {
      return [{ pos: new THREE.Vector3(0, -d.s - 0.25, 0.05), sym: 's', num: d.s }];
    },
    calc(d) {
      const s = d.s;
      const apo = (s * Math.sqrt(3)) / 2;
      return [
        { name: 'Perimeter', formula: '6 · s',                        value: 6 * s,                     unit: '' },
        { name: 'Area',      formula: '(3·√3 / 2) · s²',              value: (3 * Math.sqrt(3) / 2) * s * s, unit: '²' },
        { name: 'Apothem',   formula: 's · √3 / 2',                   value: apo,                       unit: '' },
      ];
    },
  },

  // ===== COMPOSITE =====
  house: {
    name: 'Triangle on rectangle', category: 'composite',
    tip: 'Classic “house” problem. Add the perimeters carefully — the shared edge isn\'t on the outside.',
    dims: [
      { key: 'w', sym: 'w', label: 'Width',     def: 6 },
      { key: 'h', sym: 'h', label: 'Rect height', def: 4 },
      { key: 't', sym: 't', label: 'Roof rise',  def: 3 },
    ],
    build(d, m) {
      return flatShape((s) => {
        s.moveTo(-d.w / 2, -d.h / 2);
        s.lineTo(d.w / 2, -d.h / 2);
        s.lineTo(d.w / 2, d.h / 2);
        s.lineTo(0, d.h / 2 + d.t);
        s.lineTo(-d.w / 2, d.h / 2);
        s.closePath();
      }, m);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.h / 2 - 0.25, 0.05), sym: 'w', num: d.w },
        { pos: new THREE.Vector3(d.w / 2 + 0.25, 0, 0.05),  sym: 'h', num: d.h },
        { pos: new THREE.Vector3(-d.w / 4 - 0.2, d.h / 2 + d.t / 2, 0.05), sym: 't', num: d.t },
      ];
    },
    calc(d) {
      const { w, h, t } = d;
      const slant = Math.sqrt((w / 2) ** 2 + t * t);
      return [
        { name: 'Perimeter', formula: 'w + 2h + 2·√((w/2)² + t²)', value: w + 2 * h + 2 * slant, unit: '' },
        { name: 'Area',      formula: 'w·h + ½·w·t',                value: w * h + 0.5 * w * t,   unit: '²' },
      ];
    },
  },

  silo: {
    name: 'Cylinder + cone', category: 'composite',
    tip: 'Skip the inside circle when adding surface areas — it\'s hidden.',
    dims: [
      { key: 'r', sym: 'r', label: 'Radius',          def: 2 },
      { key: 'h', sym: 'h', label: 'Cylinder height', def: 4 },
      { key: 'k', sym: 'k', label: 'Cone height',     def: 3 },
    ],
    build(d, m) {
      const g = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r, d.h, 64, 1), m.surface);
      cyl.position.y = d.h / 2;
      g.add(cyl); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cyl.geometry), m.wire).translateY(d.h / 2));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(d.r, d.k, 64, 1), m.accent);
      cone.position.y = d.h + d.k / 2;
      g.add(cone); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cone.geometry), m.wire).translateY(d.h + d.k / 2));
      g.position.y = -(d.h + d.k) / 2;
      return g;
    },
    labels(d) {
      // Positions are in the group's LOCAL space; the group's offset is applied automatically.
      return [
        { pos: new THREE.Vector3(d.r + 0.3, 0.2, 0),                  sym: 'r', num: d.r },
        { pos: new THREE.Vector3(d.r + 0.4, d.h / 2, 0),              sym: 'h', num: d.h },
        { pos: new THREE.Vector3(d.r * 0.4, d.h + d.k / 2 + 0.1, 0),  sym: 'k', num: d.k },
      ];
    },
    calc(d) {
      const { r, h, k } = d;
      const slant = Math.sqrt(r * r + k * k);
      return [
        { name: 'Surface area', formula: 'π·r² + 2π·r·h + π·r·ℓ', value: PI * r * r + 2 * PI * r * h + PI * r * slant, unit: '²' },
        { name: 'Volume',       formula: 'π·r²·h + ⅓·π·r²·k',     value: PI * r * r * h + (1 / 3) * PI * r * r * k,     unit: '³' },
      ];
    },
  },

  obelisk: {
    name: 'Cube + pyramid', category: 'composite',
    tip: 'When stacking, the joining face is shared — count it once, not twice.',
    dims: [
      { key: 'b', sym: 'b', label: 'Base side',     def: 4 },
      { key: 'h', sym: 'h', label: 'Cube height',   def: 4 },
      { key: 'k', sym: 'k', label: 'Pyramid height',def: 3 },
    ],
    build(d, m) {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(d.b, d.h, d.b), m.surface);
      box.position.y = d.h / 2;
      g.add(box); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), m.wire).translateY(d.h / 2));
      const pyr = new THREE.Mesh(new THREE.ConeGeometry(d.b / Math.SQRT2, d.k, 4, 1), m.accent);
      pyr.rotation.y = Math.PI / 4;
      pyr.position.y = d.h + d.k / 2;
      g.add(pyr); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(pyr.geometry), m.wire).translateY(d.h + d.k / 2).rotateY(Math.PI / 4));
      g.position.y = -(d.h + d.k) / 2;
      return g;
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -0.2, d.b / 2),                  sym: 'b', num: d.b },
        { pos: new THREE.Vector3(d.b / 2 + 0.2, d.h / 2, d.b / 2),   sym: 'h', num: d.h },
        { pos: new THREE.Vector3(0.15, d.h + d.k / 2, 0),            sym: 'k', num: d.k },
      ];
    },
    calc(d) {
      const { b, h, k } = d;
      const slant = Math.sqrt((b / 2) ** 2 + k * k);
      return [
        { name: 'Surface area', formula: 'b² + 4·b·h + 2·b·ℓ', value: b * b + 4 * b * h + 2 * b * slant, unit: '²' },
        { name: 'Volume',       formula: 'b²·h + ⅓·b²·k',      value: b * b * h + (1 / 3) * b * b * k,    unit: '³' },
      ];
    },
  },

  'ice-cream': {
    name: 'Cone + hemisphere', category: 'composite',
    tip: 'Half a sphere is one of the cleanest composites: SA = 2π·r².',
    dims: [
      { key: 'r', sym: 'r', label: 'Radius',     def: 2 },
      { key: 'h', sym: 'h', label: 'Cone height',def: 5 },
    ],
    build(d, m) {
      const g = new THREE.Group();
      const cone = new THREE.Mesh(new THREE.ConeGeometry(d.r, d.h, 64, 1), m.surface);
      cone.rotation.x = Math.PI;
      cone.position.y = -d.h / 2;
      g.add(cone); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cone.geometry), m.wire).rotateX(Math.PI).translateY(-d.h / 2));
      const hemi = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 32, 0, PI * 2, 0, PI / 2), m.accent);
      g.add(hemi);
      g.position.y = (d.h - d.r) / 2;
      return g;
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(d.r + 0.3, 0, 0),         sym: 'r', num: d.r },
        { pos: new THREE.Vector3(d.r * 0.4, -d.h / 2, 0),  sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { r, h } = d;
      const slant = Math.sqrt(r * r + h * h);
      return [
        { name: 'Surface area', formula: 'π·r·ℓ + 2π·r²',          value: PI * r * slant + 2 * PI * r * r, unit: '²' },
        { name: 'Volume',       formula: '⅓·π·r²·h + ⅔·π·r³',      value: (1 / 3) * PI * r * r * h + (2 / 3) * PI * r ** 3, unit: '³' },
      ];
    },
  },

  lshape: {
    name: 'L-shape (2D)', category: 'composite',
    tip: 'Split into two rectangles, find each area, then add them.',
    dims: [
      { key: 'a', sym: 'a', label: 'Outer width',  def: 6 },
      { key: 'b', sym: 'b', label: 'Outer height', def: 5 },
      { key: 'c', sym: 'c', label: 'Notch width',  def: 3 },
      { key: 'd', sym: 'd', label: 'Notch height', def: 3 },
    ],
    build(d, m) {
      return flatShape((s) => {
        s.moveTo(-d.a / 2, -d.b / 2);
        s.lineTo(d.a / 2, -d.b / 2);
        s.lineTo(d.a / 2, -d.b / 2 + (d.b - d.d));
        s.lineTo(-d.a / 2 + (d.a - d.c), -d.b / 2 + (d.b - d.d));
        s.lineTo(-d.a / 2 + (d.a - d.c), d.b / 2);
        s.lineTo(-d.a / 2, d.b / 2);
        s.closePath();
      }, m);
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -d.b / 2 - 0.25, 0.05),                   sym: 'a', num: d.a },
        { pos: new THREE.Vector3(-d.a / 2 - 0.25, 0, 0.05),                   sym: 'b', num: d.b },
        { pos: new THREE.Vector3(d.a / 2 - d.c / 2, d.b / 2 - d.d - 0.25, 0.05),  sym: 'c', num: d.c },
        { pos: new THREE.Vector3(d.a / 2 + 0.25, d.b / 2 - d.d / 2, 0.05),    sym: 'd', num: d.d },
      ];
    },
    calc(d) {
      const { a, b, c, d: dd } = d;
      const perim = 2 * a + 2 * b; // outer perimeter equals enclosing rectangle for L
      return [
        { name: 'Perimeter', formula: '2a + 2b',     value: perim,             unit: '' },
        { name: 'Area',      formula: 'a·b − c·d',   value: a * b - c * dd,    unit: '²' },
      ];
    },
  },

  capsule: {
    name: 'Capsule (cyl + 2 hemispheres)', category: 'composite',
    tip: 'Two hemispheres = one full sphere. Add to the cylinder.',
    dims: [
      { key: 'r', sym: 'r', label: 'Radius',          def: 2 },
      { key: 'h', sym: 'h', label: 'Cylinder height', def: 5 },
    ],
    build(d, m) {
      const g = new THREE.Group();
      const cyl = new THREE.Mesh(new THREE.CylinderGeometry(d.r, d.r, d.h, 64, 1), m.surface);
      g.add(cyl); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(cyl.geometry), m.wire));
      const top = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 32, 0, PI * 2, 0, PI / 2), m.accent);
      top.position.y = d.h / 2;
      const bot = new THREE.Mesh(new THREE.SphereGeometry(d.r, 64, 32, 0, PI * 2, PI / 2, PI / 2), m.accent);
      bot.position.y = -d.h / 2;
      g.add(top); g.add(bot);
      return g;
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(d.r + 0.3, d.h / 2 + 0.1, 0), sym: 'r', num: d.r },
        { pos: new THREE.Vector3(d.r + 0.4, 0, 0),             sym: 'h', num: d.h },
      ];
    },
    calc(d) {
      const { r, h } = d;
      return [
        { name: 'Surface area', formula: '2π·r·h + 4π·r²',     value: 2 * PI * r * h + 4 * PI * r * r,  unit: '²' },
        { name: 'Volume',       formula: 'π·r²·h + ⁴⁄₃·π·r³', value: PI * r * r * h + (4 / 3) * PI * r ** 3, unit: '³' },
      ];
    },
  },

  tent: {
    name: 'Triangular prism + box (tent)', category: 'composite',
    tip: 'A camp tent: a box with a triangular prism for the roof.',
    dims: [
      { key: 'l', sym: 'l', label: 'Length',     def: 6 },
      { key: 'w', sym: 'w', label: 'Width',      def: 4 },
      { key: 'h', sym: 'h', label: 'Wall height',def: 3 },
      { key: 't', sym: 't', label: 'Roof rise',  def: 2 },
    ],
    build(d, m) {
      const g = new THREE.Group();
      const box = new THREE.Mesh(new THREE.BoxGeometry(d.l, d.h, d.w), m.surface);
      box.position.y = d.h / 2;
      g.add(box); g.add(new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), m.wire).translateY(d.h / 2));

      const shape = new THREE.Shape();
      shape.moveTo(-d.w / 2, 0);
      shape.lineTo(d.w / 2, 0);
      shape.lineTo(0, d.t);
      shape.closePath();
      const roofGeom = new THREE.ExtrudeGeometry(shape, { depth: d.l, bevelEnabled: false });
      // Center the extrusion along its depth axis before rotation
      roofGeom.translate(0, 0, -d.l / 2);
      const roof = new THREE.Mesh(roofGeom, m.accent);
      roof.rotation.y = Math.PI / 2;
      roof.position.set(0, d.h, 0);
      g.add(roof);
      const roofEdges = new THREE.LineSegments(new THREE.EdgesGeometry(roofGeom), m.wire);
      roofEdges.rotation.y = Math.PI / 2;
      roofEdges.position.set(0, d.h, 0);
      g.add(roofEdges);
      g.position.y = -(d.h + d.t) / 2;
      return g;
    },
    labels(d) {
      return [
        { pos: new THREE.Vector3(0, -0.2, d.w / 2),                  sym: 'l', num: d.l },
        { pos: new THREE.Vector3(d.l / 2, -0.2, 0),                  sym: 'w', num: d.w },
        { pos: new THREE.Vector3(d.l / 2 + 0.2, d.h / 2, d.w / 2),   sym: 'h', num: d.h },
        { pos: new THREE.Vector3(d.l / 2 + 0.2, d.h + d.t / 2, 0),   sym: 't', num: d.t },
      ];
    },
    calc(d) {
      const { l, w, h, t } = d;
      const slant = Math.sqrt((w / 2) ** 2 + t * t);
      return [
        { name: 'Surface area', formula: 'l·w + 2·l·h + 2·w·h + 2·l·√((w/2)²+t²) + w·t',
          value: l * w + 2 * l * h + 2 * w * h + 2 * l * slant + w * t, unit: '²' },
        { name: 'Volume',       formula: 'l·w·h + ½·w·t·l',
          value: l * w * h + 0.5 * w * t * l, unit: '³' },
      ];
    },
  },
};

// ---------- helper: 2D flat shape with subtle extrusion ----------
function flatShape(buildPath, mats) {
  const shape = new THREE.Shape();
  buildPath(shape);
  const geom = new THREE.ExtrudeGeometry(shape, { depth: 0.05, bevelEnabled: false });
  geom.translate(0, 0, -0.025);
  const mesh = new THREE.Mesh(geom, mats.surface);
  return withEdges(mesh, mats.wire);
}

// ---------- ordering / category helpers ----------
export const CATEGORIES = {
  prisms:    ['cube', 'rect-prism', 'tri-prism', 'cylinder', 'cone', 'sphere', 'pyramid'],
  flat:      ['rectangle', 'triangle', 'circle', 'trapezoid', 'hexagon'],
  composite: ['house', 'silo', 'obelisk', 'ice-cream', 'lshape', 'capsule', 'tent'],
};

export function listIds() {
  return [...CATEGORIES.prisms, ...CATEGORIES.flat, ...CATEGORIES.composite];
}

export function fmt(n) {
  if (!isFinite(n)) return '—';
  if (Math.abs(n - Math.round(n)) < 1e-9) return String(Math.round(n));
  return f2(n).toString();
}
