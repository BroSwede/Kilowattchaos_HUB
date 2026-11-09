// StarterBot viewer for the Kilowattchaos Hub preview.
// Loads the full-fidelity float32 GLB tessellated straight from goBILDA's STEP file
// (418 parts, 28,100,556 triangles drawn), nothing decimated, quantized or compressed.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export const SYSTEM_COLORS = {
  launcher: '#F07A2A', intake: '#0E8F9E', ballpath: '#B394FF', drivetrain: '#2340A8',
  power: '#C42D6B', structure: '#9A968A', hardware: '#4F5049',
};
const VOLT = '#E8F542';
// The GLB is gzipped and split into 4 binary files of at most 28 MB, so each stays under GitHub's file limit.
// A host with a smaller file limit can set window.KWC_MODEL = { parts, bytes, base64: true } to load base64 text parts instead.
const MODEL_CFG = window.KWC_MODEL || null;
const MODEL_PARTS = MODEL_CFG ? MODEL_CFG.parts : Array.from({ length: 4 }, (_, i) => `/hub/model/starterbot-full.glb.gz.part${i}.bin`);
const MODEL_TEXT_BYTES = MODEL_CFG ? MODEL_CFG.bytes : 107308093; // total download size, used for the progress bar
const unpack = (bytes) => (MODEL_CFG && MODEL_CFG.base64 ? decodeBase64(bytes) : bytes);
const GLB_BYTES = 186775304; // size of the unpacked float32 GLB
const EXPLODE = new THREE.Vector3(1.25, 1.0, 1.25);
const GHOSTED_BY_XRAY = new Set(['structure', 'hardware']);

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const easeInOutCubic = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const idle = (fn) => (window.requestIdleCallback ? requestIdleCallback(fn, { timeout: 300 }) : setTimeout(fn, 16));
const nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));

async function fetchText(url, onBytes) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`robot file returned HTTP ${res.status}`);
  if (!res.body || !res.body.getReader) {
    const all = new Uint8Array(await res.arrayBuffer());
    onBytes(all.length);
    return all;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    onBytes(value.length);
  }
  const all = new Uint8Array(got);
  let o = 0;
  for (const c of chunks) { all.set(c, o); o += c.length; }
  return all;
}

// Base64 straight from bytes, skipping whitespace and padding.
function decodeBase64(bytes) {
  const table = new Uint8Array(256).fill(255);
  const abc = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  for (let i = 0; i < 64; i++) table[abc.charCodeAt(i)] = i;
  const out = new Uint8Array(Math.floor((bytes.length * 3) / 4) + 3);
  let o = 0, acc = 0, n = 0;
  for (let i = 0; i < bytes.length; i++) {
    const v = table[bytes[i]];
    if (v === 255) continue;
    acc = (acc << 6) | v;
    if (++n === 4) {
      out[o++] = (acc >> 16) & 255; out[o++] = (acc >> 8) & 255; out[o++] = acc & 255;
      acc = 0; n = 0;
    }
  }
  if (n === 2) out[o++] = (acc >> 4) & 255;
  else if (n === 3) { out[o++] = (acc >> 10) & 255; out[o++] = (acc >> 2) & 255; }
  return out.subarray(0, o);
}

// Download the parts one after another and unzip as they arrive, so the phone never holds
// all the text, all the zipped bytes and the GLB at once.
async function loadModel(onProgress) {
  let got = 0;
  const onBytes = (n) => { got += n; onProgress('download', Math.min(got / MODEL_TEXT_BYTES, 0.999)); };
  if (typeof DecompressionStream === 'function') {
    const ds = new DecompressionStream('gzip');
    const writer = ds.writable.getWriter();
    const out = new Uint8Array(GLB_BYTES);
    let len = 0;
    const reading = (async () => {
      const reader = ds.readable.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (len + value.length > out.length) throw new Error('robot file is larger than expected');
        out.set(value, len);
        len += value.length;
      }
    })();
    reading.catch(() => {});
    for (const url of MODEL_PARTS) {
      const bytes = unpack(await fetchText(url, onBytes));
      await writer.ready;
      await writer.write(bytes);
    }
    await writer.close();
    await reading;
    onProgress('download', 1);
    return out.subarray(0, len);
  }
  const zipped = [];
  for (const url of MODEL_PARTS) zipped.push(unpack(await fetchText(url, onBytes)));
  const all = new Uint8Array(zipped.reduce((n, z) => n + z.length, 0));
  let o = 0;
  for (const z of zipped) { all.set(z, o); o += z.length; }
  zipped.length = 0;
  onProgress('download', 1);
  onProgress('unpack', 1);
  const { gunzipSync } = await import('https://cdn.jsdelivr.net/npm/fflate@0.8.2/esm/browser.js');
  return gunzipSync(all);
}

function makeContactShadow(size) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, 'rgba(0,0,0,0.62)');
  grd.addColorStop(0.35, 'rgba(0,0,0,0.38)');
  grd.addColorStop(0.7, 'rgba(0,0,0,0.1)');
  grd.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, toneMapped: false, opacity: 0.6 });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.scale.set(size.x * 1.55, size.z * 1.55, 1);
  mesh.position.y = 0.0004;
  mesh.renderOrder = -1;
  mesh.layers.set(1);
  return mesh;
}

export async function createViewer(opts) {
  const {
    container, canvas, data, poster = false, reducedMotion = false, dark = false,
    onProgress = () => {}, onHover = () => {}, onSelect = () => {}, onFocus = () => {},
    onXray = () => {}, onAnchor = () => {}, onFirstFrame = () => {},
    look = {},
  } = opts;
  const LOOK = { env: 0.55, key: 2.0, rim: 0.55, exposure: 0.95, fit: 0.78, dir: [1.1, 0.62, 1.0], ...look };

  // Create the renderer first so a machine without WebGL fails before the download.
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(poster ? 2 : Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = LOOK.exposure;

  onProgress('download', 0);
  const glb = await loadModel(onProgress);
  onProgress('build', 1);
  await nextFrame();
  const glbBuf = glb.byteOffset === 0 && glb.byteLength === glb.buffer.byteLength ? glb.buffer : glb.buffer.slice(glb.byteOffset, glb.byteOffset + glb.byteLength);
  const gltf = await new GLTFLoader().parseAsync(glbBuf, '');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = LOOK.env;
  pmrem.dispose();
  const key = new THREE.DirectionalLight(0xffffff, LOOK.key);
  key.position.set(1.4, 2.6, 1.1);
  const rim = new THREE.DirectionalLight(0xffffff, LOOK.rim);
  rim.position.set(-1.8, 1.1, -1.5);
  scene.add(key, rim);

  // ---- Model and parts ----
  const root = gltf.scene;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const modelRadius = box.getBoundingSphere(new THREE.Sphere()).radius;

  const parts = [];
  const byId = new Map();
  const skuCount = {};
  for (const v of Object.values(data.parts)) skuCount[v[0]] = (skuCount[v[0]] || 0) + 1;

  for (const node of [...root.children]) {
    const info = data.parts[node.name] || null;
    const c = new THREE.Box3().setFromObject(node).getCenter(new THREE.Vector3());
    const p = {
      id: node.name, node, info, sys: info ? info[1] : 'hardware', meshes: [], center: c,
      base: node.position.clone(),
      dir: new THREE.Vector3(c.x - center.x, c.y - box.min.y, c.z - center.z).multiply(EXPLODE),
    };
    node.traverse((o) => {
      if (o.isMesh) { o.userData.part = p; o.userData.orig = o.material; p.meshes.push(o); }
    });
    parts.push(p);
    byId.set(p.id, p);
  }
  root.position.set(-center.x, -box.min.y, -center.z);
  scene.add(root);

  const shadow = makeContactShadow(size);
  scene.add(shadow);

  // The sample "open issue" sits on the bearing closest to the flywheel.
  const fly = parts.find((p) => p.info && p.info[2] === 'Flywheel');
  let issuePart = null;
  if (fly) {
    let best = Infinity;
    for (const p of parts) {
      if (p.info && p.info[2] === 'Bearing / Collar') {
        const d = p.center.distanceTo(fly.center);
        if (d < best) { best = d; issuePart = p; }
      }
    }
  }

  // ---- Materials ----
  const sysMats = {};
  for (const [k, hex] of Object.entries(SYSTEM_COLORS)) {
    sysMats[k] = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.55, metalness: 0.05 });
  }
  const ghostMat = new THREE.MeshStandardMaterial({ color: '#A9ABA4', roughness: 0.7, metalness: 0, transparent: true, opacity: 0.18, depthWrite: false });
  const hoverMat = new THREE.MeshStandardMaterial({ color: VOLT, emissive: VOLT, emissiveIntensity: 0.12, roughness: 0.5, metalness: 0 });
  const selectMat = new THREE.MeshStandardMaterial({ color: VOLT, emissive: VOLT, emissiveIntensity: 0.3, roughness: 0.42, metalness: 0 });

  let colorMode = 'real', xray = false, focus = null, selected = null, hovered = null, explode = 0;

  function applyState() {
    for (const p of parts) {
      let ghost = false, pickable = true;
      if (focus && p.sys !== focus) { ghost = true; pickable = false; }
      else if (!focus && xray && GHOSTED_BY_XRAY.has(p.sys)) { ghost = true; pickable = false; }
      if (!ghost && selected && selected !== p.id) ghost = true; // selection fades the rest, still clickable
      for (const m of p.meshes) {
        if (p.id === selected) m.material = selectMat;
        else if (p.id === hovered) m.material = hoverMat;
        else if (ghost) m.material = ghostMat;
        else m.material = colorMode === 'subsystem' ? sysMats[p.sys] : m.userData.orig;
        m.layers.set(pickable || p.id === selected ? 0 : 1);
        m.renderOrder = ghost && p.id !== selected && p.id !== hovered ? 2 : 0;
      }
    }
    request();
  }

  function describe(p) {
    const [sku, sys, name, sx, sy, sz] = p.info || ['', p.sys, 'Part', 0, 0, 0];
    return { id: p.id, sku, sys, name, size: [sx, sy, sz], note: data.notes[name] || '', same: skuCount[sku] || 1, isIssue: p === issuePart };
  }

  // ---- Camera and controls ----
  const camera = new THREE.PerspectiveCamera(30, 1, 0.01, 30);
  camera.layers.enable(1);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 0.12;
  controls.maxDistance = 4;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.zoomToCursor = true;
  controls.autoRotate = !reducedMotion && !poster;
  controls.autoRotateSpeed = 1.1;
  const homeTarget = new THREE.Vector3(0, size.y * 0.4, 0);
  const homeDir = new THREE.Vector3(...LOOK.dir).normalize();

  function fitDistance(radius) {
    const vf = THREE.MathUtils.degToRad(camera.fov);
    const hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    return radius / Math.sin(Math.min(vf, hf) / 2);
  }
  // Wide stages can crop the bounding sphere; narrow phone stages need the whole sphere.
  const fitFactor = () => LOOK.fit + (1 - LOOK.fit) * clamp((1.6 - camera.aspect) / 0.8, 0, 1);
  function homePose() {
    const d = fitDistance(modelRadius) * fitFactor();
    return { pos: homeTarget.clone().addScaledVector(homeDir, d), target: homeTarget.clone() };
  }

  let camAnim = null, userMoved = false;
  function animateCamera(toPos, toTarget, ms = 700) {
    stopAutoRotate();
    userMoved = true;
    if (reducedMotion || ms <= 0) {
      camera.position.copy(toPos); controls.target.copy(toTarget); controls.update(); request();
      return;
    }
    camAnim = { p0: camera.position.clone(), t0: controls.target.clone(), p1: toPos, t1: toTarget, start: performance.now(), ms };
    request();
  }
  const tmpBox = new THREE.Box3(), tmpSphere = new THREE.Sphere();
  function frameParts(list, pad = 1.15, ms = 700) {
    tmpBox.makeEmpty();
    for (const p of list) tmpBox.expandByObject(p.node);
    if (tmpBox.isEmpty()) return;
    tmpBox.getBoundingSphere(tmpSphere);
    const dir = camera.position.clone().sub(controls.target).normalize();
    const d = clamp(fitDistance(Math.max(tmpSphere.radius, 0.012)) * pad, controls.minDistance, controls.maxDistance);
    animateCamera(tmpSphere.center.clone().addScaledVector(dir, d), tmpSphere.center.clone(), ms);
  }
  function orbitBy(dTheta, dPhi) {
    const off = camera.position.clone().sub(controls.target);
    const s = new THREE.Spherical().setFromVector3(off);
    s.theta += dTheta;
    s.phi = clamp(s.phi + dPhi, 0.12, controls.maxPolarAngle);
    animateCamera(controls.target.clone().add(new THREE.Vector3().setFromSpherical(s)), controls.target.clone(), 240);
  }
  function dolly(f) {
    const off = camera.position.clone().sub(controls.target);
    const len = clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    animateCamera(controls.target.clone().add(off.setLength(len)), controls.target.clone(), 240);
  }
  function stopAutoRotate() { controls.autoRotate = false; }

  // ---- Render loop: on demand, paused when hidden or off screen ----
  let ready = false, raf = 0, needs = true, visible = true, onScreen = true, hidden = document.hidden;
  let continuous = false, frames = 0, slow = 0, dprDropped = false;
  const clock = new THREE.Clock();
  function request() {
    needs = true;
    if (!raf && ready && visible) raf = requestAnimationFrame(tick);
  }
  function tick(now) {
    raf = 0;
    if (!visible) { continuous = false; return; }
    const dt = Math.min(clock.getDelta(), 0.1);
    let active = false;
    if (camAnim) {
      const k = clamp((now - camAnim.start) / camAnim.ms, 0, 1);
      const e = easeInOutCubic(k);
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
      controls.target.lerpVectors(camAnim.t0, camAnim.t1, e);
      if (k >= 1) camAnim = null;
      active = true;
    }
    if (controls.update(dt)) active = true;
    if (active || needs) {
      renderer.render(scene, camera);
      needs = false;
      updateAnchor();
      if (continuous) measure(dt);
    }
    continuous = active || controls.autoRotate;
    if (continuous) raf = requestAnimationFrame(tick);
  }
  function measure(dt) {
    if (dprDropped || poster) return;
    frames++;
    if (dt > 0.045) slow++;
    if (frames >= 45) {
      if (slow > 27 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); resize(); dprDropped = true; }
      frames = 0; slow = 0;
    }
  }
  function setVisible() {
    visible = onScreen && !hidden;
    if (visible) { clock.getDelta(); request(); }
  }
  document.addEventListener('visibilitychange', () => { hidden = document.hidden; setVisible(); });
  new IntersectionObserver((e) => { onScreen = e[e.length - 1].isIntersecting; setVisible(); }).observe(container);

  function resize() {
    const w = Math.max(1, container.clientWidth), h = Math.max(1, container.clientHeight);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (ready && !userMoved) {
      // Until someone moves the camera, keep the robot framed as the stage changes shape.
      const dir = camera.position.clone().sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(dir, fitDistance(modelRadius) * fitFactor());
    }
    request();
  }
  new ResizeObserver(resize).observe(container);

  // ---- Issue badge anchor ----
  const av = new THREE.Vector3(), ab = new THREE.Box3();
  function updateAnchor() {
    if (!issuePart) return;
    ab.setFromObject(issuePart.node).getCenter(av).project(camera);
    const vis = av.z < 1 && Math.abs(av.x) < 1 && Math.abs(av.y) < 1;
    onAnchor((av.x * 0.5 + 0.5) * canvas.clientWidth, (-av.y * 0.5 + 0.5) * canvas.clientHeight, vis);
  }

  // ---- Picking ----
  const raycaster = new THREE.Raycaster();
  raycaster.firstHitOnly = true;
  raycaster.layers.set(0);
  const ndc = new THREE.Vector2();
  function pick(x, y) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hit = raycaster.intersectObject(root, true)[0];
    return hit ? hit.object.userData.part || null : null;
  }
  function setHover(p, ev) {
    const id = p ? p.id : null;
    if (id !== hovered) { hovered = id; applyState(); }
    const r = canvas.getBoundingClientRect();
    onHover(p ? describe(p) : null, ev ? ev.clientX - r.left : 0, ev ? ev.clientY - r.top : 0);
    canvas.style.cursor = p ? 'pointer' : '';
  }
  let hoverTimer = 0, lastMove = null, down = null;
  function runHover() {
    hoverTimer = 0;
    if (!lastMove || !ready || down) return;
    setHover(pick(lastMove.clientX, lastMove.clientY), lastMove);
  }
  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (e.buttons) { if (hovered) setHover(null); return; }
    lastMove = e;
    if (!hoverTimer) hoverTimer = setTimeout(runHover, 45);
  });
  canvas.addEventListener('pointerleave', () => { lastMove = null; if (hovered) setHover(null); else onHover(null, 0, 0); });
  canvas.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
  canvas.addEventListener('pointerup', (e) => {
    if (!down) return;
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const quick = performance.now() - down.t < 500;
    down = null;
    if (moved < 6 && quick && ready) {
      const p = pick(e.clientX, e.clientY);
      select(p ? p.id : null);
    }
  });
  controls.addEventListener('start', () => { stopAutoRotate(); userMoved = true; });
  controls.addEventListener('change', request);

  canvas.addEventListener('keydown', (e) => {
    const k = e.key;
    const step = THREE.MathUtils.degToRad(e.shiftKey ? 30 : 12);
    if (k === 'ArrowLeft') orbitBy(-step, 0);
    else if (k === 'ArrowRight') orbitBy(step, 0);
    else if (k === 'ArrowUp') orbitBy(0, -step);
    else if (k === 'ArrowDown') orbitBy(0, step);
    else if (k === 'f' || k === 'F') frameCurrent();
    else if (k === 'x' || k === 'X') { setXray(!xray); onXray(xray); }
    else if (k === 'r' || k === 'R') resetView();
    else if (k === '+' || k === '=') dolly(0.8);
    else if (k === '-' || k === '_') dolly(1.25);
    else if (k === 'Escape' && (selected || focus)) {
      if (selected) select(null); else focusSystem(null);
    } else return;
    e.preventDefault();
    e.stopPropagation();
  });

  // ---- Public actions ----
  function setColorMode(m) { colorMode = m === 'subsystem' ? 'subsystem' : 'real'; applyState(); }
  function setXray(on) { xray = !!on; applyState(); }
  function setExplode(a) {
    explode = clamp(a, 0, 1);
    for (const p of parts) p.node.position.copy(p.base).addScaledVector(p.dir, explode);
    request();
  }
  function select(id, { frame = false } = {}) {
    const p = id ? byId.get(id) : null;
    if (p && focus && p.sys !== focus) { focus = null; onFocus(null); }
    selected = p ? p.id : null;
    applyState();
    onSelect(p ? describe(p) : null);
    if (p && frame) frameParts([p], 3.2);
  }
  function focusSystem(sys) {
    focus = sys || null;
    if (selected && focus && byId.get(selected).sys !== focus) { selected = null; onSelect(null); }
    applyState();
    onFocus(focus);
    frameParts(focus ? parts.filter((p) => p.sys === focus) : parts, focus ? 1.2 : 0.9);
  }
  function frameCurrent() {
    if (selected) frameParts([byId.get(selected)], 3.2);
    else if (focus) frameParts(parts.filter((p) => p.sys === focus), 1.2);
    else resetView();
  }
  function resetView() { const h = homePose(); animateCamera(h.pos, h.target); userMoved = false; }
  function setTheme(isDark) {
    ghostMat.color.set(isDark ? '#EFF0EB' : '#A9ABA4');
    ghostMat.opacity = isDark ? 0.13 : 0.18;
    shadow.material.opacity = isDark ? 0.95 : 0.6;
    request();
  }
  function findPart(name) {
    const p = parts.find((q) => q.info && q.info[2] === name);
    return p ? p.id : null;
  }

  // ---- First frame ----
  resize();
  const h = homePose();
  camera.position.copy(h.pos);
  controls.target.copy(h.target);
  controls.update();
  setTheme(dark);
  applyState();
  try { await renderer.compileAsync(scene, camera); } catch (e) { /* compile on first render instead */ }
  ready = true;
  renderer.render(scene, camera);
  updateAnchor();
  onFirstFrame();
  request();

  // Speed up hover picking with a BVH per geometry, built in idle time after the first frame.
  if (!poster) {
    idle(() => {
      import('three-mesh-bvh').then(({ computeBoundsTree, acceleratedRaycast }) => {
        THREE.Mesh.prototype.raycast = acceleratedRaycast;
        const geos = [...new Set(parts.flatMap((p) => p.meshes.map((m) => m.geometry)))];
        let i = 0;
        const step = () => {
          const t0 = performance.now();
          while (i < geos.length && performance.now() - t0 < 10) {
            const g = geos[i++];
            g.boundsTree = computeBoundsTree.call(g);
          }
          if (i < geos.length) idle(step);
        };
        idle(step);
      }).catch(() => { /* plain raycasting still works */ });
    });
  }

  return {
    setColorMode, setXray, setExplode, select, focusSystem, frameCurrent, resetView, setTheme, findPart, stopAutoRotate,
    issuePartId: issuePart ? issuePart.id : null,
    stats: { parts: parts.length, size },
    getState: () => ({ colorMode, xray, focus, selected, explode }),
  };
}
