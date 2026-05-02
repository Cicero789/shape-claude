import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SHAPES, CATEGORIES, fmt, makeMaterials } from './shapes.js';

// ---------- state ----------
const state = {
  shapeId: 'rect-prism',
  category: 'prisms',
  dims: {},          // user-entered dims (may be partial)
  showNumeric: false, // labels: symbols vs numbers
  autoRotate: true,
};

// ---------- DOM ----------
const $ = (sel) => document.querySelector(sel);
const elTabs = document.querySelectorAll('.tab');
const elPicker = $('#shape-picker');
const elDims = $('#dim-list');
const elCalcs = $('#calc-list');
const elTip = $('#teacher-tip');
const elFormula = $('#shape-formula');
const elTitle = $('#current-shape-title');
const elOverlay = $('#overlay');
const elCanvas = $('#stage');
const btnRotate = $('#toggle-rotate');
const btnLabels = $('#toggle-labels');
const btnReset = $('#reset-view');

// ---------- three.js ----------
const renderer = new THREE.WebGLRenderer({ canvas: elCanvas, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
camera.position.set(8, 6, 12);

const controls = new OrbitControls(camera, elCanvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 40;
controls.autoRotate = true;
controls.autoRotateSpeed = 0.8;

// Lights
const hemi = new THREE.HemisphereLight(0xb6c4ff, 0x1a1f2e, 0.7);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffffff, 1.4);
key.position.set(8, 10, 6);
scene.add(key);
const fill = new THREE.DirectionalLight(0x4dd6ff, 0.5);
fill.position.set(-8, 4, -6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0xff7ab8, 0.45);
rim.position.set(0, -8, -10);
scene.add(rim);

// Floor / glow disc
const disc = new THREE.Mesh(
  new THREE.CircleGeometry(20, 64),
  new THREE.MeshBasicMaterial({ color: 0x141824, transparent: true, opacity: 0.6 }),
);
disc.rotation.x = -Math.PI / 2;
disc.position.y = -6;
scene.add(disc);

const materials = makeMaterials();
let currentGroup = null;
let labelDescriptors = [];

// ---------- sizing ----------
function resize() {
  const wrap = elCanvas.parentElement;
  const w = wrap.clientWidth;
  const h = wrap.clientHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  elOverlay.setAttribute('viewBox', `0 0 ${w} ${h}`);
  elOverlay.setAttribute('width', w);
  elOverlay.setAttribute('height', h);
}
window.addEventListener('resize', resize);

// ---------- shape lifecycle ----------
function loadShape(id) {
  state.shapeId = id;
  const def = SHAPES[id];
  state.category = def.category;

  // Reset user-entered dims (keep symbolic mode by default)
  state.dims = {};

  // Clear viewport
  if (currentGroup) {
    scene.remove(currentGroup);
    currentGroup.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
  }
  currentGroup = def.build(activeDims(), materials);
  scene.add(currentGroup);
  labelDescriptors = def.labels(activeDims());

  // Update UI
  elTitle.textContent = def.name;
  elTip.textContent = def.tip;
  renderDims();
  renderCalcs();
  renderActiveTab();
  rebuildLabels();

  // Highlight active button
  document.querySelectorAll('.shape-btn').forEach((b) => b.classList.toggle('active', b.dataset.id === id));

  // Reframe camera based on bounding box
  frameCamera();
}

function activeDims() {
  const def = SHAPES[state.shapeId];
  const out = {};
  for (const d of def.dims) {
    const v = state.dims[d.key];
    out[d.key] = (v == null || isNaN(v) || v <= 0) ? d.def : v;
  }
  return out;
}

function userHasAnyValue() {
  return Object.values(state.dims).some((v) => v != null && !isNaN(v) && v > 0);
}

function userHasAllValues() {
  const def = SHAPES[state.shapeId];
  return def.dims.every((d) => {
    const v = state.dims[d.key];
    return v != null && !isNaN(v) && v > 0;
  });
}

function rebuildGeometry() {
  const def = SHAPES[state.shapeId];
  if (currentGroup) {
    scene.remove(currentGroup);
    currentGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); });
  }
  currentGroup = def.build(activeDims(), materials);
  scene.add(currentGroup);
  labelDescriptors = def.labels(activeDims());
  rebuildLabels();
  frameCamera(true);
}

// ---------- camera framing ----------
function frameCamera(soft = false) {
  if (!currentGroup) return;
  const box = new THREE.Box3().setFromObject(currentGroup);
  const size = new THREE.Vector3();
  box.getSize(size);
  const center = new THREE.Vector3();
  box.getCenter(center);
  const radius = Math.max(size.x, size.y, size.z, 4);
  const dist = radius * 2.4;
  if (!soft) {
    const dir = new THREE.Vector3(1, 0.65, 1.2).normalize();
    camera.position.copy(dir.multiplyScalar(dist).add(center));
  }
  controls.target.copy(center);
  controls.minDistance = radius * 1.2;
  controls.maxDistance = radius * 8;
  controls.update();
}

// ---------- sidebar rendering ----------
function renderActiveTab() {
  elTabs.forEach((t) => t.classList.toggle('active', t.dataset.tab === state.category));
  elPicker.innerHTML = '';
  for (const id of CATEGORIES[state.category]) {
    const def = SHAPES[id];
    const btn = document.createElement('button');
    btn.className = 'shape-btn' + (id === state.shapeId ? ' active' : '');
    btn.textContent = def.name;
    btn.dataset.id = id;
    btn.onclick = () => loadShape(id);
    elPicker.appendChild(btn);
  }
}

function renderDims() {
  const def = SHAPES[state.shapeId];
  elDims.innerHTML = '';
  for (const d of def.dims) {
    const row = document.createElement('div');
    row.className = 'dim-row';
    const label = document.createElement('div');
    label.className = 'dim-label';
    label.textContent = d.sym + ' =';
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0.1';
    input.step = '0.1';
    input.placeholder = String(d.def);
    if (state.dims[d.key] != null) input.value = state.dims[d.key];
    input.addEventListener('input', () => {
      const raw = input.value.trim();
      if (raw === '') {
        delete state.dims[d.key];
      } else {
        const n = parseFloat(raw);
        if (!isNaN(n) && n > 0) state.dims[d.key] = n;
      }
      rebuildGeometry();
      renderCalcs();
    });
    const unit = document.createElement('div');
    unit.className = 'dim-unit';
    unit.textContent = 'unit';
    row.appendChild(label);
    row.appendChild(input);
    row.appendChild(unit);
    elDims.appendChild(row);
  }
}

function renderCalcs() {
  const def = SHAPES[state.shapeId];
  const dims = activeDims();
  const rows = def.calc(dims);
  const userFilled = userHasAllValues();

  elCalcs.innerHTML = '';
  for (const r of rows) {
    const row = document.createElement('div');
    row.className = 'calc-row';
    const name = document.createElement('div');
    name.className = 'calc-name';
    name.textContent = r.name;
    const formula = document.createElement('div');
    formula.className = 'calc-formula';
    formula.textContent = r.formula;
    const value = document.createElement('div');
    value.className = 'calc-value' + (userFilled ? ' numeric' : '');
    const prefix = userFilled ? '= ' : '≈ ';
    value.textContent = `${prefix}${fmt(r.value)} unit${r.unit}`;
    row.appendChild(name);
    row.appendChild(formula);
    row.appendChild(value);
    if (!userFilled) {
      const note = document.createElement('div');
      note.style.color = 'var(--muted-2)';
      note.style.fontSize = '0.72rem';
      note.style.marginTop = '2px';
      note.textContent = 'using default values · type real numbers above';
      row.appendChild(note);
    }
    elCalcs.appendChild(row);
  }

  // Also show the primary formula in the viewport foot
  const primary = rows.find((r) => /Surface area|Area/i.test(r.name)) || rows[0];
  elFormula.textContent = primary ? `${primary.name}: ${primary.formula}` : '';
}

// ---------- label overlay ----------
function rebuildLabels() {
  elOverlay.innerHTML = '';
  labelDescriptors.forEach((lbl, i) => {
    const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('dominant-baseline', 'central');
    t.dataset.i = i;
    elOverlay.appendChild(t);
  });
  updateLabelText();
}

function updateLabelText() {
  const def = SHAPES[state.shapeId];
  document.querySelectorAll('#overlay text').forEach((t) => {
    const i = +t.dataset.i;
    const lbl = labelDescriptors[i];
    if (!lbl) return;
    const dimDef = def.dims.find((d) => d.sym === lbl.sym);
    const userVal = dimDef ? state.dims[dimDef.key] : null;
    const hasUserVal = userVal != null && !isNaN(userVal) && userVal > 0;
    const showNum = state.showNumeric || hasUserVal;
    if (showNum) {
      t.textContent = fmt(lbl.num);
      t.classList.add('numeric');
    } else {
      t.textContent = lbl.sym;
      t.classList.remove('numeric');
    }
  });
}

const tmpVec = new THREE.Vector3();
function projectLabels() {
  const w = elCanvas.clientWidth;
  const h = elCanvas.clientHeight;
  document.querySelectorAll('#overlay text').forEach((t) => {
    const i = +t.dataset.i;
    const lbl = labelDescriptors[i];
    if (!lbl) return;
    tmpVec.copy(lbl.pos);
    if (currentGroup) currentGroup.localToWorld(tmpVec);
    tmpVec.project(camera);
    const x = (tmpVec.x * 0.5 + 0.5) * w;
    const y = (-tmpVec.y * 0.5 + 0.5) * h;
    const visible = tmpVec.z > -1 && tmpVec.z < 1;
    t.setAttribute('x', x);
    t.setAttribute('y', y);
    t.setAttribute('opacity', visible ? '1' : '0');
  });
}

// ---------- controls ----------
btnRotate.addEventListener('click', () => {
  state.autoRotate = !state.autoRotate;
  controls.autoRotate = state.autoRotate;
  btnRotate.classList.toggle('btn-primary', state.autoRotate);
});
btnRotate.classList.add('btn-primary'); // start active

btnLabels.addEventListener('click', () => {
  state.showNumeric = !state.showNumeric;
  updateLabelText();
});

btnReset.addEventListener('click', () => {
  frameCamera();
});

elTabs.forEach((t) => {
  t.addEventListener('click', () => {
    state.category = t.dataset.tab;
    const ids = CATEGORIES[state.category];
    if (!ids.includes(state.shapeId)) loadShape(ids[0]);
    else renderActiveTab();
  });
});

// ---------- main loop ----------
function tick() {
  controls.update();
  renderer.render(scene, camera);
  projectLabels();
  requestAnimationFrame(tick);
}

// Deep link via hash, e.g. app.html#cylinder
const hashId = location.hash.replace(/^#/, '');
if (hashId && SHAPES[hashId]) state.shapeId = hashId;
state.category = SHAPES[state.shapeId].category;

window.addEventListener('hashchange', () => {
  const id = location.hash.replace(/^#/, '');
  if (id && SHAPES[id]) loadShape(id);
});

resize();
loadShape(state.shapeId);
tick();
