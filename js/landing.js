import * as THREE from 'three';

const canvas = document.getElementById('hero-canvas');
if (canvas) initHero(canvas);

function initHero(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(4, 3, 7);
  camera.lookAt(0, 0, 0);

  // Lights
  scene.add(new THREE.HemisphereLight(0xc4d0ff, 0x1a1f2e, 0.6));
  const key = new THREE.DirectionalLight(0xffffff, 1.4);
  key.position.set(5, 7, 4);
  scene.add(key);
  const accent = new THREE.DirectionalLight(0x4dd6ff, 0.8);
  accent.position.set(-6, 2, -4);
  scene.add(accent);
  const rim = new THREE.DirectionalLight(0xff7ab8, 0.45);
  rim.position.set(0, -6, -8);
  scene.add(rim);

  const wireMat = new THREE.LineBasicMaterial({ color: 0xeef1ff, transparent: true, opacity: 0.85 });
  const matA = new THREE.MeshPhysicalMaterial({
    color: 0x7c5cff, roughness: 0.4, metalness: 0.05,
    transparent: true, opacity: 0.9, clearcoat: 0.4,
  });
  const matB = matA.clone(); matB.color = new THREE.Color(0x4dd6ff);
  const matC = matA.clone(); matC.color = new THREE.Color(0xff7ab8);

  const group = new THREE.Group();
  scene.add(group);

  // Centerpiece: cube + pyramid on top (a composite). Sphere orbits.
  const cube = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.4), matA);
  group.add(cube);
  group.add(new THREE.LineSegments(new THREE.EdgesGeometry(cube.geometry), wireMat));

  const pyr = new THREE.Mesh(new THREE.ConeGeometry(2.4 / Math.SQRT2, 2, 4, 1), matB);
  pyr.rotation.y = Math.PI / 4;
  pyr.position.y = 2.4 / 2 + 1;
  group.add(pyr);
  const pyrEdges = new THREE.LineSegments(new THREE.EdgesGeometry(pyr.geometry), wireMat);
  pyrEdges.rotation.y = Math.PI / 4;
  pyrEdges.position.copy(pyr.position);
  group.add(pyrEdges);

  // Orbiting cylinder + sphere for interest
  const orbiter = new THREE.Group();
  const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.55, 32, 16), matC);
  sphere.position.set(3.4, -0.4, 0);
  orbiter.add(sphere);
  const cyl = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 1.4, 32), matB);
  cyl.position.set(-3.2, 0.6, 0);
  cyl.rotation.z = Math.PI / 4;
  orbiter.add(cyl);
  scene.add(orbiter);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h || 1;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  let mouseX = 0, mouseY = 0;
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouseY = ((e.clientY - r.top) / r.height) * 2 - 1;
  });

  function tick(t) {
    const dt = t * 0.001;
    group.rotation.y = dt * 0.4 + mouseX * 0.4;
    group.rotation.x = Math.sin(dt * 0.6) * 0.12 + mouseY * 0.2;
    orbiter.rotation.y = -dt * 0.5;
    orbiter.rotation.x = Math.sin(dt * 0.7) * 0.18;
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
}

// Smooth-scroll for shape tile clicks → app
document.querySelectorAll('.shape-tile').forEach((tile) => {
  tile.style.cursor = 'pointer';
  tile.addEventListener('click', () => {
    const id = tile.dataset.shape;
    if (id) location.href = `app.html#${id}`;
    else location.href = 'app.html';
  });
});
