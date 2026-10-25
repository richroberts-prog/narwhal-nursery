// The nursery's furniture as 3D pieces. Each builder fits a box w (across) x h (tall) x d (deep), sitting on y = 0.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export const mat = (color: string, o: Partial<THREE.MeshStandardMaterialParameters> = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...o });
export const fabric = (color: string) => new THREE.MeshStandardMaterial({ color, roughness: 0.88 });
export function shade<T extends THREE.Object3D>(o: T): T { o.traverse((c) => { if ((c as THREE.Mesh).isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; }
export function rbox(w: number, h: number, d: number, r: number, m: THREE.Material) { return shade(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)), m)); }
export const at = <T extends THREE.Object3D>(o: T, x: number, y: number, z: number) => { o.position.set(x, y, z); return o; };
const cyl = (r0: number, r1: number, h: number, m: THREE.Material, seg = 20) => shade(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, seg), m));
const sph = (r: number, m: THREE.Material) => shade(new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), m));

export const paint = mat('#fbf7f2', { roughness: 0.5 });
const wood = mat('#c98c55', { roughness: 0.55 });
const gold = mat('#e7c36a', { metalness: 0.6, roughness: 0.3 });

export function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry);
  return t;
}
export function starShape(r: number) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 + Math.PI / 2, rr = i % 2 ? r * 0.45 : r; if (i) s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); else s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  return s;
}
export function heartShape(k: number) {
  const s = new THREE.Shape();
  s.moveTo(0, -k); s.bezierCurveTo(-0.2 * k, -0.7 * k, -1.1 * k, -0.3 * k, -k, 0.35 * k); s.bezierCurveTo(-0.95 * k, 0.95 * k, -0.2 * k, k, 0, 0.45 * k);
  s.bezierCurveTo(0.2 * k, k, 0.95 * k, 0.95 * k, k, 0.35 * k); s.bezierCurveTo(1.1 * k, -0.3 * k, 0.2 * k, -0.7 * k, 0, -k);
  return s;
}
export const extrude = (shape: THREE.Shape, depth: number, bevel: number) => new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 12 }).center();

/** A cot about `len` long; its mattress top is at `cot.userData.bedY`. */
export function cot(len: number, blanket: string) {
  const g = new THREE.Group(), L = len, D = len * 0.52, H = len * 0.66;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(at(cyl(0.05, 0.06, H, paint, 12), sx * L / 2, H / 2, sz * D / 2));
    g.add(at(sph(0.07, paint), sx * L / 2, H + 0.04, sz * D / 2));
  }
  for (const sz of [-1, 1]) {
    g.add(at(rbox(L, 0.07, 0.08, 0.03, paint), 0, H * 0.93, sz * D / 2));
    g.add(at(rbox(L, 0.09, 0.08, 0.03, paint), 0, H * 0.34, sz * D / 2));
    if (sz < 0) for (let i = 1; i < 12; i++) g.add(at(cyl(0.02, 0.02, H * 0.58, paint, 8), -L / 2 + (i * L) / 12, H * 0.63, sz * D / 2));
  }
  // the front is low so the sleeping child shows
  for (let i = 1; i < 12; i++) g.add(at(cyl(0.02, 0.02, H * 0.2, paint, 8), -L / 2 + (i * L) / 12, H * 0.44, D / 2));
  for (const sx of [-1, 1]) g.add(at(rbox(0.06, H * 0.7, D, 0.03, paint), sx * L / 2, H * 0.66, 0));
  g.add(at(rbox(L - 0.08, 0.16, D - 0.08, 0.06, fabric('#cfeee0')), 0, H * 0.42, 0));
  g.add(at(rbox(L * 0.55, 0.08, D - 0.06, 0.04, fabric(blanket)), L * 0.2, H * 0.52, 0));
  g.userData.bedY = H * 0.5;
  return shade(g);
}

export function desk(w: number, h: number) {
  const g = new THREE.Group();
  g.add(at(rbox(w, h * 0.92, 0.7, 0.06, mat('#f6c2d2', { roughness: 0.5 })), 0, h * 0.46, 0));
  g.add(at(rbox(w + 0.12, 0.08, 0.86, 0.03, wood), 0, h * 0.94, 0));
  g.add(at(rbox(w * 0.7, h * 0.5, 0.04, 0.02, mat('#ffffff')), 0, h * 0.48, 0.36));
  const bell = new THREE.Group(); bell.add(sph(0.11, gold)); bell.children[0].scale.y = 0.7; bell.add(at(cyl(0.14, 0.14, 0.02, gold), 0, -0.06, 0));
  g.add(at(bell, w * 0.3, h * 0.94 + 0.12, 0.12));
  g.add(at(rbox(0.36, 0.26, 0.04, 0.02, mat('#ffffff')), -w * 0.25, h * 0.94 + 0.17, 0));
  return g;
}

export function kitchen(w: number, h: number) {
  const g = new THREE.Group(), top = Math.min(h, 1.1);
  g.add(at(rbox(w, top, 0.75, 0.05, mat('#bfe6d4')), 0, top / 2, 0));
  g.add(at(rbox(w + 0.06, 0.07, 0.82, 0.03, mat('#ffffff')), 0, top, 0));
  for (let i = 0; i < 2; i++) { g.add(at(rbox(w * 0.42, top * 0.7, 0.04, 0.02, mat('#d6f2e4')), (i - 0.5) * w * 0.48, top * 0.45, 0.38)); g.add(at(sph(0.035, gold), (i - 0.5) * w * 0.48 + 0.12, top * 0.6, 0.41)); }
  const jar = new THREE.Group(); jar.add(cyl(0.16, 0.16, 0.32, new THREE.MeshStandardMaterial({ color: '#e8f4ff', transparent: true, opacity: 0.55, roughness: 0.1 })));
  for (let i = 0; i < 5; i++) jar.add(at(cyl(0.07, 0.07, 0.025, mat('#c98a4a')), (i % 2) * 0.05 - 0.02, -0.1 + i * 0.05, 0));
  jar.add(at(cyl(0.17, 0.17, 0.05, mat('#ff9eb5')), 0, 0.18, 0));
  g.add(at(jar, -w * 0.25, top + 0.2, 0));
  g.add(at(rbox(w * 0.6, 0.45, 0.04, 0.02, mat('#ffffff')), 0, top + 0.9, -0.3)); // a shelf
  for (let i = 0; i < 3; i++) g.add(at(cyl(0.07, 0.06, 0.14, mat(['#ff9eb5', '#8fd0ff', '#ffd27a'][i])), (i - 1) * 0.22, top + 0.8, -0.25));
  return g;
}

export function easel(w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 1.9);
  for (const s of [-1, 1]) { const leg = rbox(0.06, H, 0.06, 0.02, wood); leg.rotation.z = s * 0.12; g.add(at(leg, s * w * 0.28, H / 2, 0)); }
  const back = rbox(0.06, H * 0.95, 0.06, 0.02, wood); back.rotation.x = -0.25; g.add(at(back, 0, H * 0.47, -0.2));
  g.add(at(rbox(w * 0.75, 0.05, 0.12, 0.02, wood), 0, H * 0.38, 0.05));
  const art = canvasTex(256, 200, (c, cw, ch) => {
    c.fillStyle = '#fffdf6'; c.fillRect(0, 0, cw, ch);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(60, 55, 30, 0, 7); c.fill();
    c.lineWidth = 14; ['#ff6b6b', '#ffb347', '#7bd389', '#6ab7ff'].forEach((col, i) => { c.strokeStyle = col; c.beginPath(); c.arc(170, 190, 90 - i * 15, Math.PI, 0); c.stroke(); });
  });
  const board = new THREE.Group(); board.add(rbox(w * 0.72, H * 0.5, 0.04, 0.02, mat('#ffffff')));
  board.add(at(new THREE.Mesh(new THREE.PlaneGeometry(w * 0.66, H * 0.45), mat('#ffffff', { map: art })), 0, 0, 0.025));
  g.add(at(board, 0, H * 0.66, 0.06));
  for (let i = 0; i < 4; i++) g.add(at(cyl(0.04, 0.04, 0.05, mat(['#ff6b6b', '#ffd23f', '#6ab7ff', '#7bd389'][i])), -w * 0.25 + i * 0.12, H * 0.41, 0.08));
  return g;
}

export function bookshelf(w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 2.6), frame = mat('#fff3e0'), D = 0.45;
  g.add(at(rbox(w, H, 0.05, 0.02, frame), 0, H / 2, -D / 2 + 0.025));
  for (const s of [-1, 1]) g.add(at(rbox(0.07, H, D, 0.02, frame), s * (w / 2 - 0.035), H / 2, 0));
  const cols = ['#ff9eb5', '#8fd0ff', '#ffd27a', '#b5e8a0', '#c9a6ff', '#ffb38a'];
  const rows = 4;
  for (let r = 0; r <= rows; r++) {
    const y = 0.04 + (r * (H - 0.08)) / rows;
    g.add(at(rbox(w - 0.1, 0.05, D, 0.015, mat('#f2dcc0')), 0, y, 0));
    if (r === rows) break;
    let x = -w / 2 + 0.1, i = r * 3;
    while (x < w / 2 - 0.18) {
      const t = 0.07 + ((i * 37) % 5) * 0.012, bh = ((H - 0.08) / rows) * (0.62 + ((i * 13) % 4) * 0.07);
      const book = rbox(t, bh, 0.3, 0.012, mat(cols[i % cols.length], { roughness: 0.7 }));
      if (i % 9 === 4) book.rotation.z = 0.25;
      g.add(at(book, x + t / 2, y + bh / 2 + 0.03, 0.02));
      x += t + 0.012; i++;
    }
  }
  return g;
}

export function piano(w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 1.2);
  g.add(at(rbox(w, H, 0.5, 0.05, mat('#e86a8a', { roughness: 0.35 })), 0, H / 2, -0.1));
  g.add(at(rbox(w * 0.96, 0.08, 0.3, 0.02, mat('#ffffff', { roughness: 0.3 })), 0, H * 0.62, 0.22));
  for (let i = 0; i < 9; i++) if (i % 7 !== 2 && i % 7 !== 6) g.add(at(rbox(w * 0.05, 0.05, 0.16, 0.01, mat('#2a2a2a')), -w * 0.42 + i * w * 0.105 + w * 0.05, H * 0.66, 0.16));
  g.add(at(rbox(w * 0.5, 0.06, 0.4, 0.02, mat('#e86a8a')), 0, H * 0.3, 0.45));
  return g;
}

/** A doorway with something behind it (the potty room, the garden). */
export function doorway(w: number, h: number, inside: 'potty' | 'garden') {
  const g = new THREE.Group();
  const view = inside === 'garden'
    ? canvasTex(256, 384, (c, cw, ch) => { const gr = c.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, '#8ccff5'); gr.addColorStop(0.6, '#d6efff'); gr.addColorStop(0.6, '#9fd38a'); gr.addColorStop(1, '#79b865'); c.fillStyle = gr; c.fillRect(0, 0, cw, ch);
      c.fillStyle = '#6a4a2a'; c.fillRect(150, 150, 20, 110); c.fillStyle = '#5cae58'; c.beginPath(); c.arc(160, 140, 60, 0, 7); c.fill(); c.fillStyle = '#ff6b8b'; for (const [x, y] of [[40, 300], [80, 330], [200, 320], [230, 290]]) { c.beginPath(); c.arc(x, y, 9, 0, 7); c.fill(); } })
    : canvasTex(256, 384, (c, cw, ch) => { c.fillStyle = '#d6f0ff'; c.fillRect(0, 0, cw, ch); c.fillStyle = '#ffffff'; for (let y = 0; y < ch; y += 48) for (let x = (y / 48) % 2 * 24; x < cw; x += 48) c.fillRect(x, y, 22, 22); });
  g.add(at(new THREE.Mesh(new THREE.PlaneGeometry(w * 0.86, h * 0.92), new THREE.MeshBasicMaterial({ map: view, toneMapped: false })), 0, h * 0.46, -0.02));
  for (const s of [-1, 1]) g.add(at(rbox(0.12, h, 0.14, 0.03, paint), s * w * 0.46, h / 2, 0));
  g.add(at(rbox(w, 0.14, 0.14, 0.03, paint), 0, h, 0));
  if (inside === 'potty') {
    const p = new THREE.Group(); p.add(cyl(0.2, 0.16, 0.28, mat('#ffffff', { roughness: 0.3 }))); p.add(at(new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.05, 10, 24), mat('#8fd0ff')), 0, 0.15, 0)); p.children[1].rotation.x = Math.PI / 2;
    g.add(at(shade(p), 0, 0.14, 0.3));
  } else {
    for (const s of [-1, 1]) g.add(at(rbox(0.04, h * 0.92, 0.04, 0.01, paint), s * w * 0.2, h * 0.46, 0));
  }
  return g;
}

export function blocks(w: number) {
  const g = new THREE.Group(), cols = ['#ff8fab', '#7cc8ff', '#ffd166', '#90e0a0', '#c9a6ff'];
  const spots: [number, number, number, number][] = [[-0.35, 0, 0.1, 0.3], [0, 0, -0.1, -0.2], [0.35, 0, 0.12, 0.6], [-0.15, 1, 0, 0.1], [0.2, 1, -0.05, -0.3], [0.05, 2, -0.02, 0.4]];
  spots.forEach(([x, row, z, r], i) => { const b = rbox(0.3, 0.3, 0.3, 0.05, mat(cols[i % cols.length], { roughness: 0.5 })); b.rotation.y = r; g.add(at(b, x * w * 0.8, 0.15 + row * 0.3, z)); });
  const box = new THREE.Group(); box.add(rbox(0.8, 0.45, 0.55, 0.06, mat('#7cc8ff')));
  g.add(at(box, -w * 0.32, 0.22, -0.35));
  return g;
}

export function dressUp(w: number) {
  const g = new THREE.Group();
  g.add(at(rbox(w * 0.8, 0.5, 0.6, 0.07, mat('#c9a6ff')), 0, 0.25, 0));
  const lid = rbox(w * 0.82, 0.08, 0.62, 0.03, mat('#b58cf0')); lid.rotation.x = -0.35; g.add(at(lid, 0, 0.66, -0.12));
  g.add(at(rbox(0.6, 0.12, 0.4, 0.05, fabric('#ff8fb1')), -0.15, 0.62, 0.05));
  const crown = new THREE.Group(); for (let i = 0; i < 5; i++) { const c = shade(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.12, 4), gold)); c.position.set(Math.cos(i * 1.256) * 0.1, 0.06, Math.sin(i * 1.256) * 0.1); crown.add(c); }
  crown.add(cyl(0.12, 0.12, 0.06, gold)); g.add(at(crown, 0.2, 0.7, 0.05));
  return g;
}

export function stairs(w: number, up: boolean) {
  const g = new THREE.Group(), steps = 7;
  for (let i = 0; i < steps; i++) {
    const y = up ? (i + 1) * 0.28 : -i * 0.2;
    g.add(at(rbox(w * 0.7, 0.12, 0.34, 0.03, wood), w * 0.05 + i * 0.12, Math.max(0.06, y), -i * 0.34));
  }
  const rail = new THREE.Group();
  for (let i = 0; i < 6; i++) rail.add(at(cyl(0.03, 0.03, 1.0, paint, 8), 0, 0.5 + (up ? i * 0.3 : 0), -i * 0.4));
  const top = rbox(0.1, 0.1, 2.6, 0.04, wood); top.rotation.x = up ? 0.6 : 0; rail.add(at(top, 0, up ? 1.75 : 1.02, -1.05));
  g.add(at(rail, -w * 0.35, 0, 0));
  g.add(at(cyl(0.07, 0.07, 1.25, wood), -w * 0.35, 0.62, 0.15), at(sph(0.1, wood), -w * 0.35, 1.3, 0.15));
  return g;
}

export function changingTable(w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 1.05);
  g.add(at(rbox(w, H, 0.65, 0.06, paint), 0, H / 2, 0));
  for (let r = 0; r < 2; r++) for (let c = 0; c < 2; c++) { g.add(at(rbox(w * 0.44, H * 0.36, 0.05, 0.03, mat('#fffdf9')), (c - 0.5) * w * 0.48, H * 0.27 + r * H * 0.42, 0.33)); g.add(at(sph(0.035, gold), (c - 0.5) * w * 0.48, H * 0.27 + r * H * 0.42, 0.37)); }
  g.add(at(rbox(w * 0.85, 0.1, 0.55, 0.05, fabric('#ffc6d8')), -w * 0.05, H + 0.05, 0));
  for (let i = 0; i < 4; i++) g.add(at(cyl(0.13, 0.13, 0.06, fabric(i % 2 ? '#ffffff' : '#d5f1e6')), w * 0.36, H + 0.05 + i * 0.065, 0.05));
  return g;
}

export function milk(w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 1.3);
  g.add(at(rbox(w * 0.9, H, 0.6, 0.08, mat('#ffffff', { roughness: 0.3 })), 0, H / 2, 0));
  g.add(at(rbox(0.04, H * 0.3, 0.04, 0.015, mat('#c8c8d0')), w * 0.3, H * 0.6, 0.31));
  const bottle = new THREE.Group(); bottle.add(cyl(0.07, 0.07, 0.26, new THREE.MeshStandardMaterial({ color: '#fffaf0', roughness: 0.2 })));
  bottle.add(at(cyl(0.075, 0.075, 0.05, mat('#8fd0ff')), 0, 0.15, 0)); bottle.add(at(shade(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.09, 12), mat('#ffd6a0'))), 0, 0.22, 0));
  g.add(at(bottle, -w * 0.15, H + 0.13, 0), at(bottle.clone(), w * 0.12, H + 0.13, 0.05));
  return g;
}

export function wardrobe(w: number, h: number) {
  const g = new THREE.Group(), lilac = mat('#c8a6e3', { roughness: 0.5 }), H = Math.min(h, 2.7);
  g.add(at(rbox(w, H, 0.7, 0.06, lilac), 0, H / 2, 0));
  g.add(at(rbox(w + 0.14, 0.14, 0.8, 0.05, lilac), 0, H + 0.05, 0));
  for (const s of [-1, 1]) { g.add(at(rbox(w * 0.44, H * 0.85, 0.05, 0.03, mat('#d6b9ec', { roughness: 0.45 })), s * w * 0.24, H / 2, 0.36)); g.add(at(sph(0.045, gold), s * 0.08, H / 2, 0.4)); }
  return g;
}

export function armchair(w: number) {
  const g = new THREE.Group(), pink = fabric('#f4a7c0'), s = w / 1.3;
  g.add(at(rbox(1.3 * s, 0.45 * s, 1.05 * s, 0.18 * s, pink), 0, 0.42 * s, 0));
  const back = at(rbox(1.3 * s, 1.15 * s, 0.32 * s, 0.16 * s, pink), 0, 0.95 * s, -0.42 * s); back.rotation.x = -0.12; g.add(back);
  for (const sd of [-1, 1]) g.add(at(rbox(0.3 * s, 0.72 * s, 1.05 * s, 0.14 * s, pink), sd * 0.62 * s, 0.55 * s, 0));
  const h = shade(new THREE.Mesh(extrude(heartShape(0.22 * s), 0.1 * s, 0.06 * s), fabric('#ff8fb1'))); h.rotation.x = -0.25; g.add(at(h, 0.05, 0.92 * s, -0.18 * s));
  return g;
}

/** Rewards the player wins: placed like any other furniture. */
export function reward(id: string, w: number, h: number) {
  const g = new THREE.Group(), H = Math.min(h, 1.6);
  switch (id) {
    case 'slide': {
      g.add(at(rbox(0.5, H, 0.5, 0.06, mat('#ffd166')), -w * 0.3, H / 2, 0));
      const s = rbox(w * 0.8, 0.08, 0.5, 0.04, mat('#ff6b8b', { roughness: 0.3 })); s.rotation.z = -Math.atan2(H, w * 0.8); g.add(at(s, w * 0.12, H / 2, 0));
      for (let i = 0; i < 4; i++) g.add(at(rbox(0.5, 0.06, 0.12, 0.02, mat('#7cc8ff')), -w * 0.3, 0.2 + i * H * 0.24, 0.3));
      break;
    }
    case 'ballpit': {
      g.add(at(cyl(w * 0.45, w * 0.45, 0.5, mat('#7cc8ff'), 28), 0, 0.25, 0));
      const cols = ['#ff6b6b', '#ffd23f', '#6ab7ff', '#7bd389', '#ff9eb5'];
      for (let i = 0; i < 26; i++) { const a = i * 2.4, r = (i % 7) / 7 * w * 0.38; g.add(at(sph(0.09, mat(cols[i % 5], { roughness: 0.3 })), Math.cos(a) * r, 0.52 + (i % 3) * 0.05, Math.sin(a) * r)); }
      break;
    }
    case 'trampoline': {
      g.add(at(cyl(w * 0.45, w * 0.45, 0.08, mat('#3a3a4a', { roughness: 0.4 }), 32), 0, 0.42, 0));
      g.add(at(shade(new THREE.Mesh(new THREE.TorusGeometry(w * 0.46, 0.06, 10, 40), mat('#7cc8ff'))), 0, 0.44, 0)); g.children[1].rotation.x = Math.PI / 2;
      for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2 + 0.6; g.add(at(cyl(0.03, 0.03, 0.42, mat('#c8c8d0')), Math.cos(a) * w * 0.42, 0.21, Math.sin(a) * w * 0.42)); }
      break;
    }
    case 'fishtank': {
      g.add(at(rbox(w * 0.8, 0.6, 0.45, 0.04, mat('#c98c55')), 0, 0.3, 0));
      g.add(at(rbox(w * 0.8, H * 0.5, 0.45, 0.03, new THREE.MeshStandardMaterial({ color: '#8fd8ff', transparent: true, opacity: 0.45, roughness: 0.05 })), 0, 0.6 + H * 0.25, 0));
      for (const [x, y, c] of [[-0.2, 0.2, '#ff9a3c'], [0.15, 0.32, '#ffd23f'], [0.05, 0.12, '#ff6b8b']] as const) { const f = sph(0.07, mat(c)); f.scale.set(1.6, 1, 0.6); g.add(at(f, x * w, 0.6 + y * H, 0)); }
      break;
    }
    case 'teepee': {
      g.add(at(shade(new THREE.Mesh(new THREE.ConeGeometry(w * 0.45, H * 1.1, 6, 1, true), new THREE.MeshStandardMaterial({ color: '#fff1d6', side: THREE.DoubleSide, roughness: 0.9 }))), 0, H * 0.55, 0));
      for (let i = 0; i < 3; i++) g.add(at(cyl(0.02, 0.02, 0.4, wood), (i - 1) * 0.06, H * 1.15, 0));
      g.add(at(shade(new THREE.Mesh(new THREE.ConeGeometry(w * 0.3, 0.3, 6), mat('#ff9eb5'))), 0, H * 0.6, 0.01));
      break;
    }
    case 'bath': {
      const W = w * 0.95;
      g.add(at(rbox(W, 0.42, 0.75, 0.18, mat('#8ec5f0', { roughness: 0.3 })), 0, 0.33, 0));
      g.add(at(rbox(W * 0.86, 0.04, 0.58, 0.02, mat('#bfe6ff', { roughness: 0.1 })), 0, 0.52, 0));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(sph(0.07, gold), sx * W * 0.4, 0.07, sz * 0.28));
      const foam = mat('#ffffff', { roughness: 0.3 });
      for (let i = 0; i < 14; i++) g.add(at(sph(0.06 + (i % 3) * 0.025, foam), (((i * 7) % 13) / 12 - 0.5) * W * 0.75, 0.56 + (i % 2) * 0.03, (((i * 5) % 7) / 6 - 0.5) * 0.45));
      const duck = new THREE.Group(); duck.add(sph(0.08, mat('#ffd23f')), at(sph(0.055, mat('#ffd23f')), 0.06, 0.08, 0), at(sph(0.025, mat('#ff9a3c')), 0.11, 0.08, 0));
      g.add(at(duck, W * 0.2, 0.62, 0.1));
      break;
    }
    case 'sandpit': {
      const sand = rbox(w * 0.85, 0.12, 0.9, 0.04, mat('#f3d58a', { roughness: 1 }));
      g.add(at(sand, 0, 0.12, 0));
      for (const [x, z, sw, sd] of [[0, 0.47, w * 0.9, 0.1], [0, -0.47, w * 0.9, 0.1], [-w * 0.45, 0, 0.1, 0.95], [w * 0.45, 0, 0.1, 0.95]]) g.add(at(rbox(sw, 0.28, sd, 0.03, mat('#5fb0e8')), x, 0.14, z));
      g.add(at(cyl(0.12, 0.09, 0.2, mat('#ff6b6b')), -w * 0.18, 0.28, 0.1));
      g.add(at(sph(0.16, mat('#f3d58a', { roughness: 1 })), w * 0.15, 0.2, -0.1));
      break;
    }
    case 'bunny': {
      g.add(at(rbox(w * 0.75, 0.6, 0.55, 0.05, wood), 0, 0.3, -0.15));
      g.add(at(rbox(w * 0.78, 0.08, 0.6, 0.03, mat('#e86a6a')), 0, 0.64, -0.15));
      const fur = mat('#ffffff', { roughness: 0.95 });
      const b = new THREE.Group(), body = sph(0.17, fur); body.scale.set(1.2, 1, 1); b.add(at(body, 0, 0.17, 0));
      b.add(at(sph(0.11, fur), 0.17, 0.3, 0), at(sph(0.05, fur), -0.2, 0.2, 0), at(sph(0.02, mat('#ff8fb1')), 0.27, 0.3, 0.04));
      for (const sz of [-1, 1]) { const ear = sph(0.05, fur); ear.scale.set(0.8, 2.6, 0.6); b.add(at(ear, 0.15, 0.48, sz * 0.05)); }
      g.add(at(b, w * 0.05, 0, 0.3));
      break;
    }
    case 'teaparty': {
      g.add(at(cyl(0.38, 0.38, 0.05, mat('#ffffff')), 0, 0.45, 0), at(cyl(0.05, 0.08, 0.45, mat('#ff9eb5')), 0, 0.22, 0));
      const pot = sph(0.11, mat('#7cc8ff', { roughness: 0.3 })); pot.scale.set(1, 0.85, 1); g.add(at(pot, 0, 0.56, 0));
      for (const [x, z] of [[0.2, 0.12], [-0.2, 0.1], [0.05, -0.22]]) g.add(at(cyl(0.05, 0.04, 0.06, mat('#ffd23f')), x, 0.5, z));
      for (const sx of [-1, 1]) {
        const ch = new THREE.Group();
        ch.add(at(rbox(0.3, 0.06, 0.3, 0.02, mat('#b48cf0')), 0, 0.28, 0), at(rbox(0.06, 0.35, 0.3, 0.02, mat('#b48cf0')), sx * 0.13, 0.45, 0));
        for (const a of [-1, 1]) for (const b of [-1, 1]) ch.add(at(cyl(0.02, 0.02, 0.28, mat('#b48cf0')), a * 0.12, 0.14, b * 0.12));
        g.add(at(ch, sx * 0.62, 0, 0));
      }
      break;
    }
    case 'playhouse': {
      const W = w * 0.8, Hh = Math.min(1.2, H * 0.75);
      g.add(at(rbox(W, Hh, 0.9, 0.04, mat('#fff1d6')), 0, Hh / 2, 0));
      const roof = shade(new THREE.Mesh(new THREE.ConeGeometry(W * 0.78, 0.7, 4), mat('#ff7fa0'))); roof.rotation.y = Math.PI / 4; roof.scale.set(1, 1, 0.75); g.add(at(roof, 0, Hh + 0.35, 0));
      g.add(at(rbox(0.32, 0.6, 0.04, 0.03, mat('#7cc8ff')), -W * 0.2, 0.3, 0.46), at(sph(0.025, gold), -W * 0.2 + 0.1, 0.3, 0.49));
      g.add(at(rbox(0.3, 0.3, 0.04, 0.03, mat('#ffd23f')), W * 0.22, Hh * 0.6, 0.46));
      break;
    }
    default: { // rocking horse
      const body = sph(0.3, mat('#f2e2c8')); body.scale.set(1.7, 0.9, 0.8); g.add(at(body, 0, H * 0.55, 0));
      const head = sph(0.18, mat('#f2e2c8')); head.scale.set(1.3, 1, 0.8); g.add(at(head, w * 0.32, H * 0.82, 0));
      g.add(at(rbox(w * 0.2, 0.25, 0.1, 0.04, mat('#d86a8a')), w * 0.25, H * 0.95, 0));
      for (const s of [-1, 1]) { const rocker = shade(new THREE.Mesh(new THREE.TorusGeometry(w * 0.45, 0.04, 8, 24, Math.PI * 0.5), wood)); rocker.rotation.z = Math.PI * 1.25; g.add(at(rocker, 0, w * 0.48, s * 0.18)); }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) g.add(at(cyl(0.04, 0.04, H * 0.4, mat('#f2e2c8')), sx * 0.28, H * 0.3, sz * 0.15));
    }
  }
  return shade(g);
}

/** A special day's decorations, as a few small pieces; `spot(x, y, floor)` places them by room pixel. */
export function decoration(id: string, spot: (x: number, y: number, floor: 'down' | 'up') => THREE.Vector3): THREE.Group {
  const g = new THREE.Group();
  const put = (o: THREE.Object3D, x: number, y: number, floor: 'down' | 'up', lift = 0) => { const p = spot(x, y, floor); o.position.set(p.x, lift, p.z); g.add(shade(o)); };
  const pumpkin = (r: number) => {
    // Ribbed: a ring of round segments, a green stem, and a carved face.
    const p = new THREE.Group(), skin = mat('#ff8a1f', { roughness: 0.45, emissive: '#4a1800' });
    for (let i = 0; i < 8; i++) { const a = (i * Math.PI) / 4, seg = sph(r * 0.62, skin); seg.scale.set(0.75, 1.15, 1.1); seg.rotation.y = -a; p.add(at(seg, Math.cos(a) * r * 0.45, r * 0.72, Math.sin(a) * r * 0.45)); }
    const stem = cyl(r * 0.08, r * 0.12, r * 0.45, mat('#4f7a2a')); stem.rotation.z = 0.25; p.add(at(stem, 0, r * 1.5, 0));
    const face = mat('#3a1a08', { emissive: '#ffb020', emissiveIntensity: 0.6 });
    for (const sx of [-1, 1]) { const eye = shade(new THREE.Mesh(new THREE.ConeGeometry(r * 0.13, r * 0.2, 3), face)); p.add(at(eye, sx * r * 0.28, r * 0.95, r * 0.98)); }
    const grin = rbox(r * 0.55, r * 0.1, r * 0.1, r * 0.04, face); p.add(at(grin, 0, r * 0.55, r * 1.0));
    return p;
  };
  const tree = () => {
    const t = new THREE.Group(); t.add(at(cyl(0.1, 0.12, 0.4, wood), 0, 0.2, 0));
    for (let i = 0; i < 3; i++) t.add(at(shade(new THREE.Mesh(new THREE.ConeGeometry(0.75 - i * 0.18, 0.9, 18), mat('#3f9e5a', { roughness: 0.8 }))), 0, 0.7 + i * 0.5, 0));
    const cols = ['#ff4f6b', '#ffd23f', '#6ab7ff', '#ff9eb5'];
    for (let i = 0; i < 12; i++) { const a = i * 2.1, y = 0.5 + (i % 4) * 0.35, r = 0.62 - (i % 4) * 0.13; t.add(at(sph(0.06, mat(cols[i % 4], { metalness: 0.4, roughness: 0.3 })), Math.cos(a) * r, y, Math.sin(a) * r)); }
    const star = new THREE.Mesh(extrude(starShape(0.16), 0.05, 0.02), mat('#ffd54a', { emissive: '#7a5a00' })); t.add(at(star, 0, 2.05, 0));
    return t;
  };
  const egg = (c: string) => { const e = sph(0.09, mat(c, { roughness: 0.35 })); e.scale.set(1, 1.3, 1); return e; };
  const balloon = (c: string) => {
    const b = new THREE.Group(), ball = sph(0.22, mat(c, { roughness: 0.25 })); ball.scale.set(1, 1.15, 1);
    b.add(at(ball, 0, 0, 0), at(cyl(0.006, 0.006, 1.4, mat('#ffffff')), 0, -0.95, 0));
    return b;
  };
  const teddy = (c: string) => {
    const t = new THREE.Group(), fur = mat(c, { roughness: 0.95 });
    const body = sph(0.16, fur); body.scale.set(1, 1.15, 0.9); t.add(at(body, 0, 0.18, 0), at(sph(0.12, fur), 0, 0.42, 0));
    for (const sx of [-1, 1]) t.add(at(sph(0.05, fur), sx * 0.1, 0.52, 0), at(sph(0.06, fur), sx * 0.14, 0.06, 0.06));
    return t;
  };
  const cols = ['#ff6b8b', '#ffd23f', '#6ab7ff', '#7bd389', '#b48cf0', '#ffa552'];
  switch (id) {
    case 'halloween':
      for (const [x, y, f, r] of [[600, 545, 'down', 0.26], [1225, 560, 'down', 0.24], [200, 610, 'down', 0.32], [140, 670, 'down', 0.24], [600, 560, 'up', 0.26], [1020, 560, 'up', 0.22]] as const) put(pumpkin(r), x, y, f);
      break;
    case 'christmas':
      put(tree(), 1225, 545, 'down'); put(tree(), 1250, 560, 'up');
      for (let i = 0; i < 3; i++) put(rbox(0.3, 0.25, 0.3, 0.03, mat(cols[i])), 1150 + i * 40, 600, 'down', 0.12);
      break;
    case 'snow': {
      const s = new THREE.Group(), white = mat('#ffffff', { roughness: 0.9 });
      s.add(at(sph(0.55, white), 0, 0.5, 0), at(sph(0.4, white), 0, 1.2, 0), at(sph(0.28, white), 0, 1.75, 0));
      const nose = shade(new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.3, 10), mat('#ff8a1f'))); nose.rotation.x = Math.PI / 2; s.add(at(nose, 0, 1.75, 0.35));
      s.add(at(cyl(0.22, 0.22, 0.3, mat('#3a3a48')), 0, 2.08, 0));
      put(s, 335, 545, 'down');
      // Drifts along the pavement and the hedge, and snow on the cuddle-room window sill.
      for (let i = 0; i < 16; i++) { const lump = sph(0.25 + (i % 3) * 0.1, white); lump.scale.y = 0.35; put(lump, 210 + (i % 4) * 45, 530 + Math.floor(i / 4) * 55, 'down'); }
      break;
    }
    case 'eggs':
      for (let i = 0; i < 10; i++) put(egg(cols[i % 6]), 450 + i * 80, 575 + (i % 3) * 20, i % 2 ? 'down' : 'up', 0.11);
      break;
    case 'pyjamas':
      for (let i = 0; i < 6; i++) put(rbox(0.55, 0.22, 0.45, 0.1, fabric(cols[i])), 470 + i * 140, 575 + (i % 2) * 15, i < 3 ? 'down' : 'up', 0.11);
      break;
    case 'teddies': {
      const rug = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 1.2), new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (c) => { for (let x = 0; x < 8; x++) for (let y = 0; y < 8; y++) { c.fillStyle = (x + y) % 2 ? '#ff7f9f' : '#ffffff'; c.fillRect(x * 16, y * 16, 16, 16); } }), roughness: 1 }));
      rug.rotation.x = -Math.PI / 2; put(rug, 1150, 590, 'down', 0.015);
      for (const [x, c] of [[1110, '#b07a4a'], [1160, '#e0b07a'], [1205, '#8a5a34']] as const) put(teddy(c), x, 575, 'down');
      put(teddy('#e0b07a'), 1250, 560, 'up');
      break;
    }
    case 'parcel': {
      const p = new THREE.Group();
      p.add(at(rbox(0.6, 0.45, 0.5, 0.03, mat('#c98c55')), 0, 0.22, 0), at(rbox(0.62, 0.47, 0.1, 0.02, mat('#ff4f6b')), 0, 0.22, 0), at(rbox(0.1, 0.47, 0.52, 0.02, mat('#ff4f6b')), 0, 0.22, 0));
      for (const s of [-1, 1]) { const bow = sph(0.09, mat('#ff4f6b')); bow.scale.set(1.4, 0.7, 0.7); p.add(at(bow, s * 0.1, 0.5, 0)); }
      put(p, 420, 585, 'down', 1.2); // on the front desk
      break;
    }
    case 'balloons':
      for (let i = 0; i < 12; i++) put(balloon(cols[i % 6]), 430 + (i % 6) * 150, 540 + (i % 2) * 20, i < 6 ? 'down' : 'up', 2.4 + (i % 3) * 0.3);
      break;
  }
  return g;
}
